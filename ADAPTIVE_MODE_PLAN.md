# Adaptive mode: one multilevel quiz, a different path per student

Status: **phase 1 (data + authoring) implemented 2026-09-25**, not yet committed
or deployed. Phases 2–4 are still a plan. Design decisions settled with the
owner on 2026-09-25 (section 8).

Phase 1 as built (some details differ from section 3):

- `cefr` is kept by both normalizers (`normalizeQuizForLive` in `app.js`, `normalizeQuiz` in the worker). Import also accepts `cefrLevel`, `level` and lowercase values. Cloud save stores the raw quiz, so the tag was never at risk there.
- Editor: Level dropdown next to Points, a level chip in each question header, and a **🎯 Levels** panel above the question list. The panel shows per-level counts in its header line and has two tools: a "From question … to … → level" range setter, which replaces the multi-select bulk tag idea, and the AI tagging round trip (copy prompt → paste reply → apply). The thin-band hint was dropped: the counts are enough information.
- The AI creation form has an **🎯 Adaptive quiz (all levels A1–C2)** checkbox, which locks the Level field, and a **Level mix** text box. Default mix A1 22 / A2 22 / B1 18 / B2 15 / C1 12 / C2 11 %.
- Question bank: `cefr` is stored in `pinplay_data` on ingest. A bank quiz whose level is a CEFR value seeds that level on imported questions.
- Tests: `tests/adaptive-levels.test.js`. The `tests/` folder is gitignored, so add it with `git add -f`.

In one line: Cup and assignments adapt in the same way, using the same engine.
Only the stopping rule differs. **Cup stops when the timer runs out. An
assignment stops after N questions**, e.g. a 50-question quiz where each student
answers 15, with the engine choosing harder or easier questions as they go.

## 0. Why

A class of ~30 mixes A1 beginners and near-bilingual C1/C2 students. A single
quiz level bores some and frustrates others, and making parallel quizzes for
sub-groups of the same class is too much work. Instead: one quiz whose questions
cover the whole CEFR ladder, each tagged with its level, and an engine that
moves each student up or down the ladder based on how they answer.

The tag means **question difficulty**. It does not say "this student is B1".
PinPlay estimates a working level for the session. It does not diagnose.

## 1. Where we are today

| Area | Current behaviour | File |
|---|---|---|
| Question level | None. No level field exists on questions or quizzes. | — |
| AI prompt "Level" | Free-text input (`promptLevel`, "e.g. B1, Grade 5"). Only goes into the prompt ("pitched at B1"). Not stored on the quiz. | `create/index.html:105`, `app.js` `exportCreationPrompt` / `buildAgentArtifacts` |
| Client normalizer | Whitelists question fields, so any unknown field (e.g. a level tag) is **dropped on import**. | `app.js` ~15735 |
| Worker normalizer | Same whitelist, so the field would also be **dropped on cloud save**. | `cloudflare/worker.js` `normalizeQuiz` |
| Cup question feed | Per-student deck. Pass 1 is every eligible question in a per-student shuffle. Later passes are 60% last-wrong / 40% last-right, and never the same question twice in a row. | `worker.js` `arenaBuildDeck`, `arenaDeal`, `ARENA_REPEAT_WRONG_SHARE` |
| Assignment model | Fixed question list with free navigation. One answer per question in `attempt.answersByQ[qIndex]`. Deferred-feedback submit requires every question answered. Accuracy denominator = all gradable questions. | `worker.js` `evaluateAssignmentAttempt`, `/assignments/submit` |
| Feedback / exam | `assignment.feedbackMode` (`none`/`instant`/`end`) and `examMode`, independent of each other | worker + `play.js` |

Keep the Cup shuffle-per-student behaviour. Adaptive mode extends it and does
not replace it.

## 2. Data model

Question field, one of `A1 A2 B1 B2 C1 C2` or empty:

```json
{ "id": "q_12", "type": "mcq", "prompt": "…", "cefr": "B1", "answers": [ … ] }
```

- Add `cefr` to **both** normalizers (client import and worker `normalizeQuiz`). Accept case-insensitive input. Anything else becomes `''`.
- Nothing is stored at quiz level. Whether a quiz is "adaptive-ready" is derived from its questions (section 3).
- Untagged questions are **left out** of adaptive play. They still play normally in non-adaptive mode, so existing quizzes are unaffected.
- The Question Bank (`bridge.py` / `pinplay_data`) keeps the whole question object, so `cefr` travels with it. Later, the bank's `level` filter could also match per-question tags.

## 3. Authoring

### 3a. Editor

- **Per-question "Level" dropdown** next to Points / Time limit (`app.js` ~2355): `— A1 A2 B1 B2 C1 C2`. When the question is collapsed, show a small level chip in its header.
- **Coverage bar** at the top of the question list: `A1 4 · A2 5 · B1 5 · B2 3 · C1 2 · C2 0 · untagged 1`. It gives information only and never blocks anything: a thin band gets a soft hint (fewer questions means more repeats), and untagged gradable questions are flagged because adaptive play skips them. How many questions to write per level is the teacher's call.
- **Bulk tag:** select several questions, then "Set level → B1". This makes retro-tagging old quizzes by hand quick.

### 3b. Tagging existing quizzes with AI

Same copy/paste pattern as the creation prompt, so no API key is needed:

1. "Tag levels with AI" copies a prompt to the clipboard. It contains the quiz language plus a compact list `{ id, type, prompt, answers }` (no media), and asks for `{ "levels": { "<id>": "A1", … } }` only.
2. The teacher pastes the reply into an import box. PinPlay merges by `id`, overwrites only questions that are empty (with an "overwrite all" checkbox), and shows the new coverage bar.

Because the reply only changes the level map, the AI can't rewrite or damage the questions.

### 3c. AI creation prompt

- Replace the free-text `promptLevel` with a select: `(none) · A1 · A2 · B1 · B2 · C1 · C2 · Adaptive A1–C2`. Keep a way to type free text such as "Grade 5", because the field isn't only used for CEFR.
- With **Adaptive** selected, the prompt stops saying "pitched at X". Instead it says:
  - every question MUST carry `cefr`
  - spread the requested question count across all six levels, **leaning toward the easy end by default**. Harder questions often involve writing and take longer to answer, even for strong students, so a session serves more easy questions than hard ones. Default target shares: A1 22%, A2 22%, B1 18%, B2 15%, C1 12%, C2 11% (so 50 questions ≈ 11/11/9/8/6/5)
  - an optional **"Level mix"** text box next to the Level select (e.g. "mostly A2–B1, only a couple of C2", "even across all levels") **replaces** the default mix when filled in. It's free text so the teacher can describe any balance.
  - the same skill/topic should appear at several levels where possible, so a student who moves up keeps practising the same thing at a harder level
  - the question count stays exactly what the teacher typed. Nothing raises it automatically.
- Add `cefr` to `exampleTemplate` and the output contract in both prompt builders (chatbot and agent).

## 4. The engine (shared, runs in the worker)

One pure module is used by both Cup and assignments. The worker decides every
next question, so the client never sees the level logic or the answer key early.

**Bands = the levels this quiz actually contains**, in CEFR order. A full quiz
has six bands (A1…C2). A quiz tagged only A2, B1, B2 has three. A quiz with gaps
(A1, B1, C1) also has three, so moving up from A1 goes straight to B1. The
engine works entirely in band indexes, so it adapts to whatever each quiz covers.

State per student (fresh every session; nothing carries over):

```
adaptive: {
  bands: ['A2','B1','B2'],  // levels present in the quiz, fixed at start
  score: 0.8,          // continuous 0..bands.length-0.01; band = bands[floor(score)]
  answered: 0,
  streak: 0,           // +n correct run / -n wrong run
  retry: [{ qi, dueIn }],   // missed questions waiting to come back
  seen: { [qi]: { n, lastCorrect } },
  path: [{ qi, band, correct, at }]   // for the teacher report
}
```

Rules. All numbers are constants to tune after a real class:

| Situation | Effect |
|---|---|
| Start | `score = 0.8`, the top of the **lowest band present** (A1 on a full quiz): start easy |
| Warm-up (first ~6 answers), correct | `+0.6`, so on a full quiz a strong student reaches B2 within about 6 questions |
| After warm-up, correct | `+0.34` (about 3 in a row to go up one band) |
| Wrong | `−0.5` (two misses drop a band) |
| 3rd consecutive wrong | extra `−0.5` |
| Floor / ceiling | Clamped to the first/last band present |

Picking the next question:

1. If a `retry` item is due (after 2–3 other questions), serve it. Missed questions come back with spacing, not straight away.
2. Otherwise draw from the current band. Prefer questions not yet seen, then ones seen least often. Never repeat the one just answered (same rule as today).
3. If the band has run out, reuse its questions and weight the ones the student missed (today's 60/40 rule, applied within the band). If the band is empty, use the nearest band, going down first.
4. A student stuck at the floor who keeps missing questions naturally keeps getting the same A1 questions again. That is the consolidation loop from the discussion.

The engine only needs `correct: true/false`. It doesn't care whether the
student is *shown* the result, so it works with instant feedback, end-of-quiz
feedback and exam mode.

**Students never see levels on screen.** Only the teacher's views show `cefr`
and the band path. No student screen shows a level or a level change: no badge,
no "level up" message, and nothing in the review or results after submitting.
This is a display rule only. Payloads are not stripped, so a student who
inspects the page code can find the tag, and that's fine.

## 5. PinPlay Cup (live)

- **Limit = time.** The existing Cup duration (2–10 min) is the only stopping rule. The engine keeps serving questions until the clock runs out, repeating within bands as needed.
- Host setup gets an **Adaptive** toggle next to duration. It is enabled only when the quiz has at least 2 tagged bands, and shows the coverage bar.
- `arenaDeal` calls the engine instead of `arenaBuildDeck` when `room.arena.adaptive` is on. The non-adaptive path is unchanged.
- **Equal points at every level (decided).** Difficulty and scoring stay separate: an A1 correct answer and a C2 correct answer earn the same `ARENA_BASE_POINTS`, and chests/powers work as they do today.
- **No levels on the board or on student phones.** Only the host sees them, after the game.
- After the game, the host results show each student's highest band reached, final band, and accuracy per band.

## 6. Assignments

This is the biggest change, because assignments today are a fixed list that
students browse freely.

- New assignment option **Adaptive**, off by default. Turning it on:
  - replaces free navigation with a **served sequence**: `/assignments/next` returns the next question the engine picks, and the student can't skip or go back
  - asks for **"Questions per student" (N)**. This is the stopping rule. Example: a 50-question quiz with N = 15. Each student answers exactly 15, the engine picks each one according to how they're doing, and the attempt ends at question 15. A missed question that comes back counts toward the 15. N defaults to 15 and is capped at the number of eligible tagged questions.
  - shows the student progress as "7 / 15" (never the level)
  - finishes the attempt automatically after the Nth answer, replacing the "every quiz question answered" submit rule
- The engine state lives on the attempt in the Durable Object, so a student who reloads or changes device continues from the same point and level.
- Storage: `attempt.adaptive` (section 4) holds the served log. `answersByQ[qi]` still keeps the **latest** answer per question, so grading, review and the teacher's view keep working. Repeats are recorded in `path`.
- Metrics: when adaptive is on, `evaluateAssignmentAttempt` uses the served questions as the denominator (not the whole quiz), and adds `finalBand`, `peakBand` and per-band accuracy.
- Feedback: **Instant** is pre-selected when Adaptive is turned on, but the teacher can change it. Exam mode + adaptive works: the engine still adapts, the student just doesn't see verdicts.
- Teacher-graded types (open, speaking, voice) are excluded from adaptive serving, the same as Cup's `arenaEligibleIndexes` does today.

## 7. Phasing

1. **Data + authoring:** `cefr` in both normalizers, editor dropdown, coverage bar, bulk tag, AI tag-existing round-trip, AI creation "Adaptive A1–C2". This is useful on its own: you can start tagging quizzes straight away.
2. **Engine + Cup:** shared module, Cup toggle, host results. Cup is the lower-risk place to tune the numbers, because a game lasts 5 minutes and nothing gets graded.
3. **Adaptive assignments:** served sequence, new submit rule, metrics.
4. **Reports:** per-student level path in the results views, and a class band histogram.

Every phase also needs: i18n strings (EN in `i18n.js`, FR in `i18n-fr.js`), and a QA pass in `QA_CHECKLIST.md`.

## 8. Decisions (2026-09-25)

| Question | Decision |
|---|---|
| Name | Adaptive mode |
| Starting level | Everyone starts easy (lowest band present) and climbs fast. The teacher does not assign levels to students. |
| Stopping rule | Cup: time. Assignment: N questions per student (e.g. 15 of 50). |
| Cup points by level | Equal points at every level |
| Questions per level | Up to the teacher. The app shows coverage but never forces a count. The AI prompt leans toward easier questions by default (hard ones take longer), and the optional "Level mix" text overrides that. |
| Students see their level? | Not shown anywhere on the board or student screens. No need to hide it from the page code. |
| Partial quizzes (e.g. A2–B2 only) | Allowed. The engine adapts to whichever levels each quiz contains (full A1–C2 is the ideal) |
| Level carries over to next session? | No. Every session starts fresh. |
| Feedback mode | Independent of adaptive. Instant is pre-selected but any mode works, including exam mode. |
| Cup question order | Keep the current per-student shuffle and missed-question recycling (non-adaptive path unchanged) |

Nothing is left open that blocks phase 1.
