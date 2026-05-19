#!/usr/bin/env python3
"""
Local question-bank bridge for PinPlay.

Easiest run on Windows:
    question-bank\\run.cmd

Manual run:
    pip install fastapi uvicorn
    py -m uvicorn bridge:app --host 127.0.0.1 --port 8789

Config (all optional — sensible defaults baked in):
    BANK_DB_PATH        path to esl_quizzes.db          (default: known location)
    BANK_BRIDGE_SECRET  shared token for auth           (default: read or generate .bridge.secret)
    BANK_BRIDGE_PORT    listen port                     (default: 8789)

Auth: every request (except /ping) requires  Authorization: Bearer <secret>.
The first run creates question-bank/.bridge.secret and prints the value — paste
that into PinPlay's bank-bridge settings.

P1 endpoints (read-only):
    GET  /ping                       -> {ok, service, db_questions, db_quizzes}
    GET  /facets                     -> distinct values for filter rails
    GET  /search?q=&level=&...       -> faceted + FTS search over questions
    GET  /quiz/{quiz_id}             -> quiz row + its questions

P2/P3 endpoints (stubbed 501 until implemented):
    PATCH /question/{id}
    PATCH /quiz/{id}
    POST  /ingest                    -> push from PinPlay into the bank
"""

from __future__ import annotations

import os
import secrets
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json as _json

DEFAULT_DB_PATH = r"C:\Users\Admin\.hermes\workspace\esl_quizzes\esl_quizzes.db"
SECRET_FILE = Path(__file__).resolve().parent / ".bridge.secret"


def _resolve_db_path() -> str:
    path = os.getenv("BANK_DB_PATH", "").strip() or DEFAULT_DB_PATH
    if not os.path.exists(path):
        raise SystemExit(f"DB not found: {path}\nSet BANK_DB_PATH or fix DEFAULT_DB_PATH in bridge.py.")
    return path


def _resolve_secret() -> str:
    env_val = os.getenv("BANK_BRIDGE_SECRET", "").strip()
    if env_val:
        return env_val
    if SECRET_FILE.exists():
        return SECRET_FILE.read_text(encoding="utf-8").strip()
    new_secret = secrets.token_urlsafe(32)
    SECRET_FILE.write_text(new_secret, encoding="utf-8")
    print("=" * 70, file=sys.stderr)
    print("Generated new bridge secret at:", SECRET_FILE, file=sys.stderr)
    print("Secret value:", new_secret, file=sys.stderr)
    print("Paste this into PinPlay's bank-bridge settings (one-time setup).", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    return new_secret


DB_PATH = _resolve_db_path()
SECRET = _resolve_secret()

app = FastAPI(title="pinplay-bank-bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def require_auth(authorization: str | None) -> None:
    token = (authorization or "").replace("Bearer", "").strip()
    if token != SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _rows(cur: sqlite3.Cursor) -> list[dict]:
    return [dict(r) for r in cur.fetchall()]


def _split_tags(blob: str | None) -> list[str]:
    if not blob:
        return []
    s = blob.strip()
    if s.startswith("[") and s.endswith("]"):
        import json
        try:
            v = json.loads(s)
            if isinstance(v, list):
                return [str(x).strip() for x in v if str(x).strip()]
        except Exception:
            pass
    return [t.strip() for t in s.replace(";", ",").split(",") if t.strip()]


@app.get("/ping")
async def ping():
    """Cheap unauthenticated handshake so the PinPlay UI can detect the bridge."""
    try:
        with db() as conn:
            qc = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
            zc = conn.execute("SELECT COUNT(*) FROM quizzes").fetchone()[0]
        return {"ok": True, "service": "pinplay-bank-bridge", "questions": qc, "quizzes": zc}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.get("/facets")
async def facets(authorization: str | None = Header(default=None)):
    require_auth(authorization)
    with db() as conn:
        def distinct(col: str, table: str = "quizzes") -> list[str]:
            cur = conn.execute(
                f"SELECT DISTINCT {col} FROM {table} "
                f"WHERE {col} IS NOT NULL AND TRIM({col}) <> '' "
                f"  AND COALESCE(deleted_at, '') = '' "
                f"ORDER BY {col}"
            )
            return [r[0] for r in cur.fetchall()]

        return {
            "source":         distinct("source"),
            "level":          distinct("level"),
            "skill_type":     distinct("skill_type"),
            "topic":          distinct("topic"),
            "question_type":  [r[0] for r in conn.execute(
                "SELECT DISTINCT question_type FROM questions "
                "WHERE question_type IS NOT NULL "
                "  AND COALESCE(deleted_at, '') = '' "
                "ORDER BY question_type"
            )],
        }


FTS_FIELDS = {"question_text", "correct_answer", "options", "explanation"}
MEDIA_FILTERS = {"any", "image", "audio", "none"}

# SQL fragment matching audio URLs (mirrors the JS AUDIO_EXT_RE).
_AUDIO_SQL = (
    "(LOWER(qu.media_url) LIKE '%.mp3%' "
    " OR LOWER(qu.media_url) LIKE '%.wav%' "
    " OR LOWER(qu.media_url) LIKE '%.ogg%' "
    " OR LOWER(qu.media_url) LIKE '%.m4a%' "
    " OR LOWER(qu.media_url) LIKE '%.aac%' "
    " OR LOWER(qu.media_url) LIKE '%.flac%')"
)
_HAS_MEDIA_SQL = "(qu.media_url IS NOT NULL AND TRIM(qu.media_url) <> '')"


@app.get("/search")
async def search(
    q: str | None = Query(default=None, description="text search (FTS5)"),
    field: str | None = Query(default=None, description="restrict search to one FTS column"),
    source: str | None = None,
    level: str | None = None,
    skill_type: str | None = None,
    topic: str | None = None,
    question_type: str | None = None,
    has_media: str | None = Query(default=None, description="any | image | audio | none"),
    min_quality: int = -1,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = Header(default=None),
):
    require_auth(authorization)
    if field and field not in FTS_FIELDS:
        raise HTTPException(status_code=400, detail=f"invalid field; must be one of {sorted(FTS_FIELDS)}")
    if has_media and has_media not in MEDIA_FILTERS:
        raise HTTPException(status_code=400, detail=f"invalid has_media; must be one of {sorted(MEDIA_FILTERS)}")

    where: list[str] = [
        "COALESCE(qu.deleted_at,'') = ''",
        "COALESCE(qz.deleted_at,'') = ''",
        "TRIM(COALESCE(qu.question_text,'')) <> ''",
    ]
    params: list = []

    if source:
        where.append("qz.source = ?");        params.append(source)
    if level:
        where.append("qz.level = ?");         params.append(level)
    if skill_type:
        where.append("qz.skill_type = ?");    params.append(skill_type)
    if topic:
        where.append("qz.topic = ?");         params.append(topic)
    if question_type:
        where.append("qu.question_type = ?"); params.append(question_type)
    if has_media == "any":
        where.append(_HAS_MEDIA_SQL)
    elif has_media == "audio":
        where.append(f"{_HAS_MEDIA_SQL} AND {_AUDIO_SQL}")
    elif has_media == "image":
        where.append(f"{_HAS_MEDIA_SQL} AND NOT {_AUDIO_SQL}")
    elif has_media == "none":
        where.append(f"NOT {_HAS_MEDIA_SQL}")
    where.append("qu.quality >= ?");          params.append(min_quality)

    fts_join = ""
    if q and q.strip():
        fts_join = "JOIN questions_fts fts ON fts.rowid = qu.id"
        where.append("questions_fts MATCH ?")
        params.append(_fts_query(q.strip(), field))

    sql = f"""
        SELECT qu.id, qu.quiz_id, qu.question_text, qu.question_type,
               qu.options, qu.correct_answer, qu.explanation, qu.media_url,
               qu.quality, qu.updated_at,
               qz.title AS quiz_title, qz.source, qz.level,
               qz.skill_type, qz.topic
        FROM questions qu
        JOIN quizzes  qz ON qz.id = qu.quiz_id
        {fts_join}
        WHERE {' AND '.join(where)}
        ORDER BY qu.quality DESC, qu.id
        LIMIT ? OFFSET ?
    """
    params_with_paging = params + [limit, offset]

    count_sql = f"""
        SELECT COUNT(*)
        FROM questions qu
        JOIN quizzes  qz ON qz.id = qu.quiz_id
        {fts_join}
        WHERE {' AND '.join(where)}
    """

    with db() as conn:
        try:
            total = conn.execute(count_sql, params).fetchone()[0]
            results = _rows(conn.execute(sql, params_with_paging))
        except sqlite3.OperationalError as e:
            raise HTTPException(status_code=400, detail=f"bad query: {e}")

    return {"total": total, "limit": limit, "offset": offset, "results": results}


@app.get("/quiz/{quiz_id}")
async def quiz_detail(quiz_id: int, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM quizzes WHERE id = ? AND COALESCE(deleted_at,'') = ''",
            (quiz_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="quiz not found")
        quiz = dict(row)
        quiz["tags"] = _split_tags(quiz.get("tags"))
        questions = _rows(conn.execute(
            "SELECT * FROM questions "
            "WHERE quiz_id = ? AND COALESCE(deleted_at,'') = '' "
            "ORDER BY COALESCE(question_num, id)",
            (quiz_id,),
        ))
        return {"quiz": quiz, "questions": questions}


class QuestionPatch(BaseModel):
    question_text:  str | None = None
    options:        str | None = None
    correct_answer: str | None = None
    explanation:    str | None = None
    media_url:      str | None = None
    quality:        int | None = None
    deleted:        bool | None = None


class QuizPatch(BaseModel):
    title:       str | None = None
    level:       str | None = None
    skill_type:  str | None = None
    topic:       str | None = None
    description: str | None = None
    tags:        str | None = None
    quality:     int | None = None
    deleted:     bool | None = None


_Q_EDITABLE = {"question_text", "options", "correct_answer", "explanation", "media_url", "quality"}
_Z_EDITABLE = {"title", "level", "skill_type", "topic", "description", "tags", "quality"}


def _apply_patch(table: str, row_id: int, patch_dump: dict, editable: set[str]) -> dict:
    sets: list[str] = []
    params: list = []
    for k, v in patch_dump.items():
        if k == "deleted":
            if v is True:
                sets.append("deleted_at = datetime('now')")
            elif v is False:
                sets.append("deleted_at = NULL")
            continue
        if k in editable:
            sets.append(f"{k} = ?")
            params.append(v)
    if not sets:
        raise HTTPException(status_code=400, detail="no editable fields supplied")
    params.append(row_id)
    sql = f"UPDATE {table} SET {', '.join(sets)} WHERE id = ?"
    with db() as conn:
        cur = conn.execute(sql, params)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"{table[:-1]} not found")
        conn.commit()
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (row_id,)).fetchone()
    return dict(row)


@app.patch("/question/{question_id}")
async def patch_question(
    question_id: int,
    patch: QuestionPatch,
    authorization: str | None = Header(default=None),
):
    require_auth(authorization)
    updated = _apply_patch("questions", question_id, patch.model_dump(exclude_unset=True), _Q_EDITABLE)
    return {"ok": True, "question": updated}


@app.patch("/quiz/{quiz_id}")
async def patch_quiz(
    quiz_id: int,
    patch: QuizPatch,
    authorization: str | None = Header(default=None),
):
    require_auth(authorization)
    updated = _apply_patch("quizzes", quiz_id, patch.model_dump(exclude_unset=True), _Z_EDITABLE)
    if "tags" in updated:
        updated["tags"] = _split_tags(updated["tags"])
    return {"ok": True, "quiz": updated}


class IngestQuestion(BaseModel):
    pinplay_question_id: str
    question_text:       str
    question_type:       str
    options:             list | str | None = None
    correct_answer:      list | str | None = None
    explanation:         str | None = None
    media_url:           str | None = None
    pinplay_data:        dict | None = None


class IngestPayload(BaseModel):
    assignment_code: str
    title:           str | None = None
    level:           str | None = None
    skill_type:      str | None = None
    topic:           str | None = None
    questions:       list[IngestQuestion]


def _serialize_blob(v):
    """JSON-stringify lists/dicts; pass strings through; empty otherwise."""
    if v is None:
        return ''
    if isinstance(v, (list, dict)):
        return _json.dumps(v, ensure_ascii=False)
    return str(v)


@app.post("/ingest")
async def ingest(payload: IngestPayload, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    if not payload.assignment_code.strip():
        raise HTTPException(status_code=400, detail="assignment_code is required")
    if not payload.questions:
        return {"ok": True, "quiz_id": None, "inserted": 0, "updated": 0, "skipped_duplicates": 0}

    inserted = 0
    updated = 0
    skipped_dup = 0

    with db() as conn:
        # Upsert parent quiz (source='pinplay', source_id=assignment_code).
        row = conn.execute(
            "SELECT id FROM quizzes WHERE source = 'pinplay' AND source_id = ?",
            (payload.assignment_code,),
        ).fetchone()
        title      = (payload.title      or '').strip()
        level      = (payload.level      or '').strip()
        skill_type = (payload.skill_type or '').strip()
        topic      = (payload.topic      or '').strip()
        qcount     = len(payload.questions)
        if row:
            quiz_id = row[0]
            conn.execute(
                "UPDATE quizzes SET title=?, level=?, skill_type=?, topic=?, "
                "question_count=?, deleted_at=NULL WHERE id=?",
                (title, level, skill_type, topic, qcount, quiz_id),
            )
        else:
            cur = conn.execute(
                "INSERT INTO quizzes (source, source_id, title, level, skill_type, topic, question_count) "
                "VALUES ('pinplay', ?, ?, ?, ?, ?, ?)",
                (payload.assignment_code, title, level, skill_type, topic, qcount),
            )
            quiz_id = cur.lastrowid

        for idx, q in enumerate(payload.questions):
            qid = (q.pinplay_question_id or '').strip()
            if not qid:
                continue  # skip questions with no stable id (we can't dedup them)

            options_blob = _serialize_blob(q.options)
            correct_blob = _serialize_blob(q.correct_answer)
            pinplay_blob = _serialize_blob(q.pinplay_data) if q.pinplay_data else ''
            stem         = (q.question_text or '').strip()
            qtype        = (q.question_type or '').strip()
            explanation  = q.explanation or ''
            media_url    = q.media_url or ''

            existing = conn.execute(
                "SELECT id FROM questions "
                "WHERE pinplay_assignment_code = ? AND pinplay_question_id = ? "
                "LIMIT 1",
                (payload.assignment_code, qid),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE questions SET "
                    "  quiz_id = ?, question_num = ?, question_text = ?, question_type = ?, "
                    "  options = ?, correct_answer = ?, explanation = ?, media_url = ?, "
                    "  pinplay_data = ?, deleted_at = NULL "
                    "WHERE id = ?",
                    (quiz_id, idx + 1, stem, qtype, options_blob, correct_blob,
                     explanation, media_url, pinplay_blob, existing[0]),
                )
                updated += 1
            else:
                cur = conn.execute(
                    "INSERT INTO questions ("
                    "  quiz_id, question_num, question_text, question_type, "
                    "  options, correct_answer, explanation, media_url, "
                    "  pinplay_assignment_code, pinplay_question_id, pinplay_data"
                    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (quiz_id, idx + 1, stem, qtype, options_blob, correct_blob,
                     explanation, media_url, payload.assignment_code, qid, pinplay_blob),
                )
                if cur.rowcount > 0:
                    inserted += 1
                else:
                    # BEFORE INSERT dedup trigger fired RAISE(IGNORE) — exact-content dup of another row.
                    skipped_dup += 1

        conn.commit()

    return {
        "ok": True,
        "quiz_id": quiz_id,
        "inserted": inserted,
        "updated": updated,
        "skipped_duplicates": skipped_dup,
    }


def _fts_query(raw: str, field: str | None = None) -> str:
    """Sanitize user text into an FTS5 MATCH expression. Quote every token to make
    bare punctuation safe and force prefix matching for richer hit counts. When
    `field` is set, restrict each token to that FTS column."""
    tokens: list[str] = []
    for chunk in raw.split():
        cleaned = chunk.replace('"', '').strip()
        if not cleaned:
            continue
        token = f'"{cleaned}"*'
        if field:
            token = f"{field}:{token}"
        tokens.append(token)
    return " AND ".join(tokens) if tokens else '""'
