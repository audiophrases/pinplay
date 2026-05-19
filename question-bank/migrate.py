#!/usr/bin/env python3
"""
One-shot migration for the PinPlay question bank (esl_quizzes.db).

Run:
    py question-bank/migrate.py
    py question-bank/migrate.py --dry-run
    py question-bank/migrate.py --db "C:/path/to/esl_quizzes.db"

What it does (idempotent — safe to re-run):
    1. Copies the .db to <name>.<YYYY-MM-DD>.bak.db in the same folder.
    2. Adds nullable columns to quizzes and questions for editing/provenance/quality.
    3. Adds a VIRTUAL generated column `content_key` on questions for dedup.
       (VIRTUAL because SQLite disallows ALTER TABLE ADD COLUMN ... STORED.)
    4. Creates an index on content_key.
    5. Creates dedup_conflicts table and populates it with existing duplicates
       (no deletions — manual review required).
    6. Creates FTS5 mirror table on questions + sync triggers.
    7. Creates BEFORE INSERT trigger on questions that silently IGNOREs duplicates.
    8. Reports row counts and dedup stats.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import date
from pathlib import Path

DEFAULT_DB = r"C:\Users\Admin\.hermes\workspace\esl_quizzes\esl_quizzes.db"

PUNCT_CHARS = ['.', ',', '?', '!', ';', ':', '"', "'", '(', ')']
SPACE_COLLAPSE_PASSES = 2  # 4 → 2 → 1 spaces (kept shallow to stay under SQLite parser stack)


def _sql_escape(s: str) -> str:
    return s.replace("'", "''")


def norm_expr(col_ref: str) -> str:
    """Build a pure-SQL expression that normalizes col_ref for dedup.

    Kept intentionally shallow: SQLite parser stack overflows around ~30 nested
    function calls in a generated-column or trigger context. The chars below
    cover the high-impact ESL dedup cases (sentence punctuation, quotes,
    parentheses); rarer chars (brackets, em-dashes, etc.) are tolerated.
    """
    expr = f"COALESCE({col_ref}, '')"
    for c in PUNCT_CHARS:
        expr = f"REPLACE({expr}, '{_sql_escape(c)}', '')"
    for _ in range(SPACE_COLLAPSE_PASSES):
        expr = f"REPLACE({expr}, '  ', ' ')"
    return f"LOWER(TRIM({expr}))"


def content_key_expr(prefix: str = "") -> str:
    """Build the full content-key expression. prefix='NEW.' for trigger context."""
    stem = norm_expr(f"{prefix}question_text")
    correct = norm_expr(f"{prefix}correct_answer")
    options = norm_expr(f"{prefix}options")
    return f"({stem} || '|' || {correct} || '|' || {options})"


def column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    # table_xinfo lists generated/hidden columns; table_info doesn't on some SQLite builds.
    try:
        cur = conn.execute(f"PRAGMA table_xinfo({table})")
    except sqlite3.OperationalError:
        cur = conn.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cur.fetchall())


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
        (table,),
    )
    return cur.fetchone() is not None


def index_exists(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        (name,),
    )
    return cur.fetchone() is not None


def trigger_exists(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = ?",
        (name,),
    )
    return cur.fetchone() is not None


def add_column_if_missing(conn: sqlite3.Connection, table: str, ddl_fragment: str, column: str) -> bool:
    if column_exists(conn, table, column):
        return False
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl_fragment}")
    return True


def backup(db_path: Path) -> Path:
    stamp = date.today().isoformat()
    bak = db_path.with_name(f"{db_path.stem}.{stamp}.bak{db_path.suffix}")
    if bak.exists():
        i = 2
        while True:
            candidate = db_path.with_name(f"{db_path.stem}.{stamp}-{i}.bak{db_path.suffix}")
            if not candidate.exists():
                bak = candidate
                break
            i += 1
    shutil.copy2(db_path, bak)
    return bak


def migrate(db_path: Path, dry_run: bool = False) -> None:
    print(f"[migrate] db: {db_path}")
    if not db_path.exists():
        print(f"[migrate] ERROR: not found: {db_path}", file=sys.stderr)
        sys.exit(2)

    if not dry_run:
        bak = backup(db_path)
        print(f"[migrate] backup: {bak.name}")
    else:
        print("[migrate] dry-run: skipping backup")

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")

    if dry_run:
        conn.execute("BEGIN")
    try:
        _run_migration(conn)
        _stats(conn)
        if dry_run:
            conn.execute("ROLLBACK")
            print("[migrate] dry-run: rolled back, no changes persisted")
        else:
            conn.commit()
            print("[migrate] committed")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _run_migration(conn: sqlite3.Connection) -> None:
    print("[migrate] step 1: adding columns to quizzes")
    quiz_cols = [
        ("updated_at", "updated_at TEXT"),
        ("deleted_at", "deleted_at TEXT"),
        ("quality",    "quality INTEGER DEFAULT 0"),
    ]
    for col, ddl in quiz_cols:
        added = add_column_if_missing(conn, "quizzes", ddl, col)
        print(f"  quizzes.{col}: {'added' if added else 'present'}")

    print("[migrate] step 2: adding columns to questions")
    q_cols = [
        ("updated_at",              "updated_at TEXT"),
        ("deleted_at",              "deleted_at TEXT"),
        ("quality",                 "quality INTEGER DEFAULT 0"),
        ("pinplay_assignment_code", "pinplay_assignment_code TEXT"),
        ("pinplay_question_id",     "pinplay_question_id TEXT"),
        ("pinplay_data",            "pinplay_data TEXT"),
    ]
    for col, ddl in q_cols:
        added = add_column_if_missing(conn, "questions", ddl, col)
        print(f"  questions.{col}: {'added' if added else 'present'}")

    if not index_exists(conn, "idx_questions_pinplay_qid"):
        conn.execute(
            "CREATE INDEX idx_questions_pinplay_qid "
            "ON questions(pinplay_assignment_code, pinplay_question_id) "
            "WHERE pinplay_question_id IS NOT NULL"
        )
        print("  idx_questions_pinplay_qid: created (partial)")
    else:
        print("  idx_questions_pinplay_qid: present")

    print("[migrate] step 3: adding VIRTUAL generated column content_key")
    if not column_exists(conn, "questions", "content_key"):
        expr = content_key_expr()
        conn.execute(
            f"ALTER TABLE questions ADD COLUMN content_key TEXT "
            f"GENERATED ALWAYS AS {expr} VIRTUAL"
        )
        print("  questions.content_key: added")
    else:
        print("  questions.content_key: present")

    print("[migrate] step 4: creating index on content_key")
    if not index_exists(conn, "idx_questions_content_key"):
        conn.execute(
            "CREATE INDEX idx_questions_content_key "
            "ON questions(content_key) "
            "WHERE deleted_at IS NULL"
        )
        print("  idx_questions_content_key: created (partial, active rows only)")
    else:
        print("  idx_questions_content_key: present")

    print("[migrate] step 5: dedup_conflicts table")
    if not table_exists(conn, "dedup_conflicts"):
        conn.execute("""
            CREATE TABLE dedup_conflicts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                content_key  TEXT NOT NULL,
                question_ids TEXT NOT NULL,
                quiz_ids     TEXT NOT NULL,
                sample_text  TEXT,
                hit_count    INTEGER NOT NULL,
                found_at     TEXT DEFAULT (datetime('now')),
                resolved_at  TEXT,
                resolution   TEXT
            )
        """)
        conn.execute("CREATE INDEX idx_dedup_conflicts_unresolved "
                     "ON dedup_conflicts(resolved_at) WHERE resolved_at IS NULL")
        print("  dedup_conflicts: created")
    else:
        print("  dedup_conflicts: present")

    print("[migrate] step 6: scanning for existing duplicates")
    cur = conn.execute("""
        SELECT content_key,
               GROUP_CONCAT(id) AS q_ids,
               GROUP_CONCAT(DISTINCT quiz_id) AS qz_ids,
               MIN(question_text) AS sample,
               COUNT(*) AS cnt
        FROM questions
        WHERE COALESCE(deleted_at, '') = ''
          AND content_key <> ''
        GROUP BY content_key
        HAVING cnt > 1
    """)
    rows = cur.fetchall()
    inserted = 0
    for content_key, q_ids, qz_ids, sample, cnt in rows:
        existing = conn.execute(
            "SELECT 1 FROM dedup_conflicts "
            "WHERE content_key = ? AND resolved_at IS NULL",
            (content_key,),
        ).fetchone()
        if existing:
            continue
        conn.execute(
            "INSERT INTO dedup_conflicts(content_key, question_ids, quiz_ids, sample_text, hit_count) "
            "VALUES (?, ?, ?, ?, ?)",
            (content_key, q_ids, qz_ids, (sample or "")[:500], cnt),
        )
        inserted += 1
    print(f"  duplicate groups found: {len(rows)} (newly flagged: {inserted})")

    print("[migrate] step 7: FTS5 mirror table on questions")
    if not table_exists(conn, "questions_fts"):
        conn.execute("""
            CREATE VIRTUAL TABLE questions_fts USING fts5(
                question_text,
                correct_answer,
                options,
                explanation,
                content='questions',
                content_rowid='id',
                tokenize='unicode61 remove_diacritics 2'
            )
        """)
        print("  questions_fts: created (rebuilding index, this takes a moment)")
        conn.execute("INSERT INTO questions_fts(questions_fts) VALUES ('rebuild')")
        print("  questions_fts: rebuilt")
    else:
        print("  questions_fts: present")

    print("[migrate] step 8: FTS sync triggers")
    fts_triggers = {
        "questions_fts_ai": """
            CREATE TRIGGER questions_fts_ai AFTER INSERT ON questions BEGIN
                INSERT INTO questions_fts(rowid, question_text, correct_answer, options, explanation)
                VALUES (new.id, new.question_text, new.correct_answer, new.options, new.explanation);
            END
        """,
        "questions_fts_ad": """
            CREATE TRIGGER questions_fts_ad AFTER DELETE ON questions BEGIN
                INSERT INTO questions_fts(questions_fts, rowid, question_text, correct_answer, options, explanation)
                VALUES('delete', old.id, old.question_text, old.correct_answer, old.options, old.explanation);
            END
        """,
        "questions_fts_au": """
            CREATE TRIGGER questions_fts_au AFTER UPDATE ON questions BEGIN
                INSERT INTO questions_fts(questions_fts, rowid, question_text, correct_answer, options, explanation)
                VALUES('delete', old.id, old.question_text, old.correct_answer, old.options, old.explanation);
                INSERT INTO questions_fts(rowid, question_text, correct_answer, options, explanation)
                VALUES (new.id, new.question_text, new.correct_answer, new.options, new.explanation);
            END
        """,
    }
    for name, ddl in fts_triggers.items():
        if trigger_exists(conn, name):
            print(f"  {name}: present")
        else:
            conn.execute(ddl)
            print(f"  {name}: created")

    print("[migrate] step 9: BEFORE INSERT dedup trigger")
    if trigger_exists(conn, "questions_dedup_before_insert"):
        conn.execute("DROP TRIGGER questions_dedup_before_insert")
    conn.execute("""
        CREATE TRIGGER questions_dedup_before_insert
        BEFORE INSERT ON questions
        FOR EACH ROW
        WHEN EXISTS (
            SELECT 1 FROM questions
            WHERE content_key = NEW.content_key
              AND COALESCE(deleted_at, '') = ''
        )
        BEGIN
            SELECT RAISE(IGNORE);
        END
    """)
    print("  questions_dedup_before_insert: created")

    print("[migrate] step 10: updated_at touch triggers")
    touch_triggers = {
        "quizzes_touch_updated_at": """
            CREATE TRIGGER quizzes_touch_updated_at
            AFTER UPDATE ON quizzes
            FOR EACH ROW
            WHEN NEW.updated_at IS OLD.updated_at OR NEW.updated_at IS NULL
            BEGIN
                UPDATE quizzes SET updated_at = datetime('now') WHERE id = NEW.id;
            END
        """,
        "questions_touch_updated_at": """
            CREATE TRIGGER questions_touch_updated_at
            AFTER UPDATE ON questions
            FOR EACH ROW
            WHEN NEW.updated_at IS OLD.updated_at OR NEW.updated_at IS NULL
            BEGIN
                UPDATE questions SET updated_at = datetime('now') WHERE id = NEW.id;
            END
        """,
    }
    for name, ddl in touch_triggers.items():
        if trigger_exists(conn, name):
            print(f"  {name}: present")
        else:
            conn.execute(ddl)
            print(f"  {name}: created")


def _stats(conn: sqlite3.Connection) -> None:
    print("[stats]")
    q_count = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    qz_count = conn.execute("SELECT COUNT(*) FROM quizzes").fetchone()[0]
    fts_count = conn.execute("SELECT COUNT(*) FROM questions_fts").fetchone()[0]
    conflict_groups = conn.execute(
        "SELECT COUNT(*) FROM dedup_conflicts WHERE resolved_at IS NULL"
    ).fetchone()[0]
    conflict_rows = conn.execute(
        "SELECT COALESCE(SUM(hit_count), 0) FROM dedup_conflicts WHERE resolved_at IS NULL"
    ).fetchone()[0]
    print(f"  quizzes:                  {qz_count}")
    print(f"  questions:                {q_count}")
    print(f"  questions_fts:            {fts_count}")
    print(f"  unresolved dup groups:    {conflict_groups}")
    print(f"  rows involved in dups:    {conflict_rows}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default=DEFAULT_DB, help="path to esl_quizzes.db")
    ap.add_argument("--dry-run", action="store_true", help="run inside a rolled-back transaction")
    args = ap.parse_args()
    migrate(Path(args.db), dry_run=args.dry_run)


if __name__ == "__main__":
    main()
