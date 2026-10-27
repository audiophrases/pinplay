# Build up: an adaptive quiz assigned as an Everest climb

Status: **built 2026-10-11** (worker, assignment toggle, student trail, teacher
results, FR strings, tests); **the AI prompt built 2026-10-11** (section 8);
**Climb steps 1 to 12 built 2026-10-27** (section 10: a `step` number on each
question instead of levels, prompt batches of 60). Decisions settled with the
owner on 2026-10-10/11 and 2026-10-27.

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

## 8. The AI prompt and the steps plan (built 2026-10-11)

"Kind of quiz" in the AI Creation Prompt has a third choice, **⛰️ Build up (one
skill, small steps)** (`buildBuildupPrompt` in `app.js`). The teacher gives the
skill (Theme), language, the students, their first language, the mistakes seen in
class, steps (2 to 6, default 5), questions per step (3 to 10, default 5), the
question types (mcq, tf, text, context_gap; error_hunt off by default) and notes.

What the prompt makes the AI do:
1. Write `stepsPlan` first: per step a tag, a title, **the ONE thing that is new**
   compared with the step before (teacher only) and a one-sentence **rule**.
2. One new thing per step; demand grows slowly (two options, three, a gap, typed);
   the last step mixes the rest; step 1 cannot be got wrong after reading its rule.
3. Fixed, very basic vocabulary reused across steps, so grammar is the only difficulty.
4. Equivalent questions inside a step (a student sent back meets a new one).
5. Exactly one defensible answer; every correct typed form listed; distractors are
   the students' real mistakes (the teacher's list, plus first-language ones).
6. Tags are only step numbers ("A1" = step 1), not a language level.

Data: `quiz.stepsPlan = [{ cefr, title, change, rule }]`, kept by both
normalizers through one shared function (`normalizeStepsPlan`, identical in
`app.js` and `worker.js`; a test checks it) and by cloud save. It is **never sent
to students whole**: the climb view carries only the current step's `rule`.

The rule is the **guide's tip**: shown at the very start, on arriving at a camp
for the first time, and after three wrong answers in a row (the general advice
shows when a quiz has no plan). The editor's Levels panel lists the plan with the
question count per step and a warning under three.

Quizzes made this way are ordinary level-tagged quizzes: they also play as Adaptive.
(Until 2026-10-27. Since then the prompt numbers the steps with `step` and
writes no levels, and the plan is keyed by step: section 10.)

## 9. Next

1. ~~A finer `step` tag (1 to N) if six levels are too few.~~ Built: section 10.
2. A "bridge with AI" prompt for the step where the class gets stuck (its
   questions and most common wrong answers go into the prompt).
3. A live-class version (counts per camp on the projector).
4. Maybe: an assignment option "1 right answer per step", for climbs of many
   small steps (today 12 steps take at least 23 answers).

## 10. Climb steps 1 to 12 (built 2026-10-27)

Why: six levels were too few steps, and a climb quiz's levels were fake ("A1"
= step 1) while the rest of PinPlay read them as real: Assignments preselected
🎯 Adaptive for any levelled quiz (which saves each student's level), AI level
tagging could re-tag the steps, and Live Pin and Cup filtered by them. Extra
level names (A3, A4…) were considered and dropped: saved levels are positions
on the A1–C2 list, and every level feature would have had to ignore them.

The model:
- A question's **`step`**, a whole number 1 to 12 (`BUILDUP_MAX_STEPS`;
  `normalizeClimbStep`, identical in `app.js` and `worker.js`). Steps are
  ordered by number; gaps are fine. Both quiz normalizers keep it; students
  never get it (`publicQuestion` leaves it out); the question bank doesn't keep
  it (it means something only in its quiz).
- **A quiz with any step climbs by its steps** (`buildupPool`); its questions
  without a step stay out of the climb. **A quiz without steps climbs by its
  levels**, as before, so every older quiz and every real levelled quiz still
  works. Levels and steps are independent: a quiz can carry both, either or
  neither.
- `stepsPlan` entries are keyed by `step` (`{ step, title, change, rule }`);
  older entries keyed by `cefr` still work (`climbPlanEntry`).

Engine (`cloudflare/worker.js`): `buildupPool` gives the bands (step numbers,
or levels) for creation, attempt start, every answer (`buildupBandOf`), the
format options and settings change. A quiz edit follows each step by its
questions' ids (`buildupKeyMap` in update-quiz, then `buildupRebase` with the
map), so a new step 1 with the others renumbered keeps every climber on their
own questions; the highest camp and the cleared steps follow too. Results carry
`bands` (step numbers) and the plan's `titles`: "Camp 3 (step 4: Verbs ending
in -ch) · 6,820 m".

Builder (`app.js`, `create/index.html`):
- A **Step** field next to Level on each question once the quiz uses steps,
  and a 🏔️ chip in the header.
- 🎯 Levels panel: **Climb step** + **Set step** on the same question range as
  Set level; the steps list (each step, its plan entry, its count, a warning
  under three, the questions left out); **🏔️ Turn the levels into steps** for
  an older climb quiz (its levels become steps 1, 2, 3… and its plan too; the
  teacher says whether the levels go or stay).
- Import → Append of a file with steps into a quiz with steps: numbers that
  don't overlap are kept (the next batch of the same climb); overlapping ones
  ask: new steps **before** (easier) or **after** (harder), or **merge** into the
  same numbers (`placeAppendedClimbSteps`). Plans merge, the quiz's own entries
  win. More than 12 steps is refused.
- Assignments: Climb is offered with two steps even when the quiz has no levels
  (then Adaptive is greyed out); a quiz made to climb (steps or a plan) starts
  on Climb; default cap 4 per step (48 for 12). The setup wizard's wording says
  steps or levels.

The trail (`buildup.js`, `styles.css`): up to 7 camps it looks as before; past
that (`is-crowded`) the camps are smaller and only the student's camp keeps
its label, so 13 camps fit the Chromebook panel and the phone strip.

The AI prompts:
- Climb: 2 to 12 steps, `"step"` numbers and no `"cefr"`, plan keyed by step.
- **Batches of 60** (`PROMPT_BATCH_MAX`): past 60 questions a Climb comes in
  batches of whole steps, as even as possible (`buildupPromptBatches`; 12 × 10
  is steps 1–6, then 7–12). Batch 1 carries the whole plan; one batch per reply,
  the next when the teacher asks; files `-part1.json`, `-part2.json`. The
  Standard prompt does the same past 60 questions (or the teacher's smaller
  batch size; the field goes up to 60), and a brief in words asks the AI to
  batch if it needs more than 60.
- Both forms warn before the prompt is made when the request passes 60
  questions, and say how it will come.

Tests: `tests/buildup.test.js` (steps on the real worker: 12 steps and 13
camps, unstepped questions left out, results with titles, a renumbering edit;
the pure rules; appending; the prompt and its batches), `tests/ai-prompt.test.js`
(Standard batches).
