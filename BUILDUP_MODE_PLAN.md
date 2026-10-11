# Build up: an adaptive quiz assigned as an Everest climb

Status: **built 2026-10-11** (worker, assignment toggle, student trail, teacher
results, FR strings, tests). The Build up AI prompt and a finer `step` tag are
the next steps (section 8). Decisions settled with the owner on 2026-10-10/11.

## 1. Why

Adaptive mode (ADAPTIVE_MODE_PLAN.md) fits one quiz to every level: breadth, and
a level estimate per student. Build up is the opposite, for students who need to
**build one skill step by step** (a grammar point, mechanical practice): small
steps, always from the bottom, a wrong answer drops one step. It is assigned to a
class of students who need it; stronger students use Adaptive.

It reuses an adaptive quiz as it is: the levels the quiz holds (A1 to C2 tags)
are the steps. Students never see CEFR levels: they climb an Everest trail.

## 2. Rules (`buildup*` in `cloudflare/worker.js`)

- Everyone starts at the lowest step. No saved level is read, none is written
  (`adaptiveAttemptSaveLevel` returns early for a build up attempt).
- A right answer fills a pip. **Base Camp needs 1** right answer, other steps **2
  in a row**, a step already cleared (the student climbed out of it) needs **1**,
  so a drop costs about two answers.
- A wrong answer drops one step and empties the pips. On the first step it stays.
  A neutral (partial) answer moves nothing.
- Three wrong answers in a row open the guide's tip for the student and a
  "stuck" flag for the teacher.
- Two right answers on the top step reach the **Summit**, which ends the
  attempt. The cap (`assignment.adaptive.count`, default 4 per step, up to 100)
  also ends it. The total shown is what was answered.
- Questions: single, auto-graded, tagged ones (no listening sections, no
  teacher-graded types). From the current step, least seen first, a missed one
  before one answered right, never the same one twice in a row. No retry queue.
- Instant feedback is forced and exam mode off when the assignment is created.
- Public games (/play) and PinPlay Cup ignore Build up.

Data: `assignment.adaptive = { count, mode: 'buildup' }`; the attempt's
`adaptive.bu = { rung, pips, best, cleared, wrongRun, moved, flag, summit }`.
`adaptive.score` is kept equal to the step so the shared adaptive bookkeeping
(path, per-level tallies, summaries, quiz-edit remap) works unchanged.

## 3. What the student gets

`attempt.climb = { n, rung, pips, need, best, moved, flag, tip, summit, done }`,
with `n` = levels + 1 (the Summit). No levels, no questions.

## 4. The trail (`buildup.js`, styles at the end of `styles.css`)

- Camps: Base Camp, Camp 1.., Summit, with altitudes from Everest's real ones
  (5,364 m to 8,849 m) interpolated for any number of camps.
- Wide screens (Chromebook): a fixed side panel; the question screen shifts right.
  Narrow screens: a strip under the header; the question makes room (`--climb-h`).
- The student's avatar is the token (the Cup avatar if this browser has one, else
  a preset picked by name; tap it to choose another with the Cup editor).
- Pips, a gold trail and planted flags for camps reached (never lost on a drop),
  a gentle line after every move ("Climb high, sleep low: back to Camp 2 to get
  used to the air"), the guide's tip after three misses, the summit glow, and an
  end screen with the altitude reached.
- Sounds: the assignment's own (verdict stingers, ambient loop, mute button).

## 5. Teacher

- Assignments row: the Adaptive box has a mode picker (Adaptive / Build up),
  count 4 per level by default, note under the row. A Cup started with Build up
  chosen plays as usual.
- List badge "⛰️ Build up · up to N questions per student"; results: a badge with
  the highest camp (⚠️ when stuck), a line "highest camp (level) · now", the
  ✓/✗ path.

## 6. Tests

`tests/buildup.test.js`: the pure rules, simulated students (strong, average,
weak), and real assignments on the real worker (create, climb, drop, summit, cap,
tip, results, plain adaptive unchanged, saved level untouched).

## 7. Decisions

| Topic | Decision |
|---|---|
| Name | Build up |
| Theme | Everest path: camps, altitude, flags; "climb high, sleep low" for a drop |
| Targeting | By class, as any assignment |
| Cap | 4 answers per step, editable |
| Climb rule | 1 right on Base Camp and on cleared steps, 2 elsewhere |
| Steps | The adaptive levels of the quiz (a finer tag later if six is too few) |
| Sounds | Reuse the assignment ones |

## 8. Next

1. **The Build up AI prompt**: one skill, tiny steps (one new thing per step),
   equivalent items per step, fixed simple vocabulary, real student errors as
   distractors, one defensible answer, a plan the teacher can read.
2. A finer `step` tag (1 to N) if six levels are too few.
3. Per-step hint cards and a "bridge with AI" prompt for the step where the
   class gets stuck; a live-class version (counts per camp on the projector).
