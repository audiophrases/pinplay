# Adaptive mode: one multilevel quiz, a different path per student

Status: **phases 1–3 implemented 2026-09-25**: data + authoring, the engine +
PinPlay Cup, and adaptive assignments. Phase 4 (class-level reports) is still a
plan. Design decisions settled with the owner on 2026-09-25 (section 8).

Phase 1 as built (some details differ from section 3):

- `cefr` is kept by both normalizers (`normalizeQuizForLive` in `app.js`, `normalizeQuiz` in the worker). Import also accepts `cefrLevel`, `level` and lowercase values. Cloud save stores the raw quiz, so the tag was never at risk there.
- Editor: Level dropdown next to Points, a level chip in each question header, and a **🎯 Levels** panel above the question list. The panel shows per-level counts in its header line and has two tools: a "From question … to … → level" range setter, which replaces the multi-select bulk tag idea, and the AI tagging round trip (copy prompt → paste reply → apply). The thin-band hint was dropped: the counts are enough information.
- The AI creation form has an **🎯 Adaptive quiz (all levels A1–C2)** checkbox, which locks the Level field, and a **Notes on levels** text box. The default mix (A1 22 / A2 22 / B1 18 / B2 15 / C1 12 / C2 11 %) is always in the prompt. The notes add to it and only replace it when they ask for a different balance. The first version let any note replace the mix, so a note about task types gave an even split.
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
  - an optional **"Notes on levels"** text box (e.g. "more typing and Word Guess at higher levels, rarer verbs at C1–C2", or "even across all levels"). The default mix stays in the prompt; the notes replace it only when they ask for a different number or balance of questions per level.
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
| Warm-up (until the first miss, at most 4 answers), correct | `+1`, a whole band per right answer: a strong student reaches C1 after 4 answers |
| After warm-up, correct | `+0.34` (about 3 in a row to go up one band) |
| After dropping a band, correct (until back up) | `+0.28`: usually 2 right answers to climb back, sometimes 1. Added after the first class test: a student stuck between A1 and A2 was failing every other question (~43% of questions above their level; now ~38%) |
| Right answer on a question below the current band | half the gain |
| Wrong | `−0.5` (two misses drop a band); half that on a question above the current band |
| 3rd consecutive wrong | extra `−0.5` |
| Floor / ceiling | Clamped to the first/last band present |

Picking the next question:

1. If a `retry` item is due (after 2–3 other questions) **and the student is at or above that question's band**, serve it. Missed questions come back with spacing, not straight away, and a student who dropped isn't fed harder retries.
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
- **Turning it on:** the Assignments row's **🎯 Adaptive** checkbox on the create page also applies to PinPlay Cup: a Cup game started while it is ticked is adaptive (needs at least 2 tagged levels). The projected board has no toggle and never shows "Adaptive" or the level range (owner's choice, 2026-09-25; the first version had a lobby toggle on the board).
- `arenaDeal` calls the engine instead of `arenaBuildDeck` when `room.arena.adaptive` is on. The non-adaptive path is unchanged.
- **Equal points at every level (decided).** Difficulty and scoring stay separate: an A1 correct answer and a C2 correct answer earn the same `ARENA_BASE_POINTS`, and chests/powers work as they do today.
- **No levels on the board or on student phones.** Only the host sees them, after the game.
- After the game, the host board shows a **📥 Level report** button that downloads a CSV (never shown on the projector): questions answered, usual level (most answers in the second half), final and highest level, right/answered per level, and the level path. The history kept per student is capped at the last 200 answers; per-level totals are running counts.
- Success for level movement is `correct`, or a partial round (Spelling Bee, Word Guess…) at ≥ 70%. Cup's own "correct" for points and chests stays at 50%.

## 6. Assignments

As built (phase 3):

- **Creating:** the assignment row on the create page shows **🎯 Adaptive A1–C2 · N questions per student** when the quiz has auto-graded questions tagged with at least two levels. Ticking it switches feedback to Instant (the teacher can still change it). N defaults to 20 (owner's choice, 2026-09-25); the page lowers it to the quiz's tagged-question count when the quiz has fewer, and the server caps it at the number of questions it can serve and refuses Adaptive for a quiz with fewer than two levels. Stored as `assignment.adaptive = { count: N }`.
- **The attempt** carries the engine state (`attempt.adaptive`): section 4's fields plus `count`, `items` (served questions in order, with the answer), `current` (the question being served) and `done`. `answersByQ[qi]` still keeps the latest answer per real question for the per-question grading views.
- **The virtual quiz:** students and results views see a quiz made of the served questions (repeats included, plus the current one for students) with N as the total. The existing flow therefore works unchanged: progress "7 / 15", instant feedback, end screen, submit, review, self-correct. This happens inside `publicAssignmentAttempt`, `evaluateAssignmentAttempt`, `buildTeacherGradingItems` and `publicAssignmentAttemptSummary`, so no call site changes.
- **Answering:** the answer route accepts only the served question (virtual index = answers so far), records the result (70% rule for partial rounds), and serves the next one; after the Nth the attempt is `done`. Submitting needs all N answered unless the student confirmed stopping early (`force`, same as other assignments).
- **Student page:** no back/next arrows and no "Edit answers" while the attempt is open; arrow keys only move forward to the served question. In end-of-quiz/exam modes an empty answer offers **Skip question?**, which saves it as wrong (there is no "come back later"). A reload or another device resumes on the served question (signed-in students; random-name players get a new identity per visit, as before).
- **Teacher results:** each attempt shows a 🎯 level badge and a line with usual/final/highest level and right/answered per level; the detail view lists the served questions in order. Adaptive attempts can't be hand-graded (they only hold auto-graded questions).
- **Quiz edits** ("Apply to assignment") follow each question by id: answers to deleted questions are dropped (as for normal assignments), and a deleted current question is replaced by a new one. If the quiz's levels change, the student keeps their level (`adaptiveRebase`).
- Teacher-graded types (open, speaking, voice) and polls are never served.

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
| Questions per level | Up to the teacher. The app shows coverage but never forces a count. The AI prompt leans toward easier questions by default (hard ones take longer), and the optional "Notes on levels" text overrides that only when it asks for a different balance. |
| Students see their level? | Not shown anywhere on the board or student screens. No need to hide it from the page code. |
| Partial quizzes (e.g. A2–B2 only) | Allowed. The engine adapts to whichever levels each quiz contains (full A1–C2 is the ideal) |
| Level carries over to next session? | No. Every session starts fresh. |
| Feedback mode | Independent of adaptive. Instant is pre-selected but any mode works, including exam mode. |
| Cup question order | Keep the current per-student shuffle and missed-question recycling (non-adaptive path unchanged) |

Nothing is left open that blocks phase 1.
