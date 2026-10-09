# Listening sections: a scrollable exam sheet with one recording

Status: **phases 1 (data model + editor), 2 (homework sheet) and 4 (live)
built 2026-10-02; phase 5 (AI prompt) built 2026-10-03.** Phase 3 is planned as a
local studio (LISTENING_STUDIO_PLAN.md, 2026-10-03);
phase 6 (adaptive listening, section 10) planned 2026-10-03; phase 7 (timed
moments: hear the answer in the correction, section 12) planned 2026-10-09,
steps 1-4 (live) built 2026-10-09.
Decisions settled with the owner on 2026-10-02 (section 2).

Phase 1 as built:
- `listeningSections` on the quiz and `listeningSection` on each question, kept
  by both normalizers through one shared block of functions (identical in
  `app.js` and `worker.js`; a test checks they stay the same). Membership needs
  a known section, a section 3 type and one unbroken run; media is stripped.
- Editor: a **🎧 Listening sections** panel next to Levels ("From question … to
  … → Make listening section"); each section shows as a blue panel above its
  first question (title, instruction, recording, Plays allowed, Pausing,
  question range, remove). Questions with pictures etc. get a warning before
  their media is removed; unsuitable types stay outside with a message.
- The recording uploads to cloud storage as soon as it is picked (too big for
  the browser's local copy); if that fails it stays embedded and the server
  uploads it when the quiz is assigned. The media clean-up job counts section
  recordings as in use.
- ~~The Adaptive box is hidden for a quiz with sections; the server refuses an
  adaptive assignment for one.~~ Changed 2026-10-03: sections are level blocks
  in adaptive assignments (section 10). PinPlay Cup never deals section questions.
- Tests: `tests/listening-sections.test.js`.

Phase 2 as built:
- Students reaching any question of a section get the section's sheet (a
  full-page overlay in `play.js`): sticky strip with title, player and
  "N of M answered", the instruction, then every question compactly (radio /
  checkbox rows, one-line inputs, inline gaps, one dropdown per matching row,
  a small text area for open). "← Previous question" and "Submit section".
- Each change autosaves through `/api/assignment/answer` (typing after a short
  pause); the 5-second state refresh never rebuilds the sheet while it is open.
- Player: unlimited plays = the browser's player. Limited = our player, bar
  not draggable, "Play 1 of 2", pause only if allowed. `/api/assignment/listen`
  counts a play when it starts (`attempt.listeningPlays`), refusing past the
  limit, so reloading doesn't reset it.
- `/api/assignment/submit-section` locks it (`attempt.sectionsSubmitted`); the
  answer route then refuses that section (409 `SECTION_SUBMITTED`). Instant
  marks for section questions are held back until the section is submitted,
  then show on the locked sheet; once locked the recording replays freely.
- Blanks in a submitted section count as done for navigation and the final
  submit. Submitting the whole assignment keeps autosaved answers as they are.
- /play games: plays and the lock are kept in the page only (nothing stored).

In one line: a quiz can contain **listening sections**: a run of consecutive
questions that share one recording and show **all together on one calm,
scrolling page, like an exam paper**. Everything outside a section stays a
normal PinPlay question, one at a time. A full listening exam is simply a quiz
made of sections (Part 1, Part 2…).

## 1. Why

Listening practice and exams happen today in Google Forms, outside PinPlay's
classes, roster and results. PinPlay's screens are built for one question at a
time with big buttons, which is wrong for a listening: once the recording
ends, students must have answered everything, so they need to see the whole
sheet and move their eyes up and down freely, as on paper.

Real listening sessions: about two minutes to read the questions, the
recording twice, then a little time to check and change answers. Real papers
come in parts, each with its own recording, instruction and often task type.
PinPlay adds no timer and no extra pressure; it removes friction.

## 2. Decisions (owner, 2026-10-02)

| Question | Decision |
|---|---|
| Structure | **Listening sections inside any quiz** (e.g. questions 6–12), as many as needed. Each has its own recording, an optional title ("Part 1 — Questions 6–12") and instruction line ("You will hear…"). |
| Layout | One long page per section, all its questions stacked, compact, like a sheet of paper. No Next button, no jump-to-question navigation, no cards that look like an app. |
| Progress | A thin, quiet sticky strip: "8 of 10 answered" (for the section). |
| Saving | Every change saves in the background (autosave), so nothing is lost if the student never presses the button. "Submit section" at the bottom. |
| After submitting | **A submitted section is locked**: it can be reviewed but not edited. |
| Feedback | Any mode, **instant included**: with instant feedback the section shows its marks the moment it is submitted (the lock makes that safe). |
| Media | **None inside a section's questions**: no images, GIFs, video, reading texts or per-question audio. Questions outside sections keep everything. |
| The recording | Mostly an uploaded **audio file**. Keep the door open for **TTS-made audio, with several voices** (dialogues). **2026-10-03:** made by a local studio into one MP3 that the teacher checks and uploads (LISTENING_STUDIO_PLAN.md). |
| Spoken instruction | **2026-10-03:** optional per section, "🔊 Read the instruction aloud", with PinPlay's own TTS before the recording. Never part of the recording script. |
| Homework | Audio player at the top of the sheet. Never video. |
| Live | Phones show the section's sheet; the projector plays **audio or video**. The sheet **stays open until the teacher moves on**; whatever each student has entered is autosaved and counts even if they never submitted. |
| Plays allowed | **Per section**: 1, 2, 3 or unlimited. When limited, no rewinding or skipping. |
| Pausing | **Per section**: allowed / not allowed. |
| Counting | Same as a normal PinPlay quiz: one question counts as one, a matching question included (partial credit as today). |
| Adaptive | A quiz with listening sections can't be adaptive (fixed order). **Changed 2026-10-03:** sections become level blocks in adaptive assignments (section 10). |

Phase 4 as built (live):
- The room treats a section as one step: entering it from either side lands on
  its first question. No timer. (Since 2026-10-06 Next and Prev move through
  its correction once it is marked, and a marked section comes back as it
  was left; see below.)
- Phones show the same sheet (no player: "Listen to the recording in class").
  Each change saves as a draft on the room (`/api/section/answer`), "Submit
  section" locks it for that student (`/api/section/submit`). The sheet is
  never rebuilt by the live pushes while the student types.
- Reveal or Next grades everyone's drafts, submitted or not
  (`finalizeListeningSection`): flat points per question (no speed bonus, no
  bets), open answers wait for the teacher as usual.
- Projector: title, instruction, the recording's player (kept outside the
  redrawn area so pushes never stop it), "N of M submitted · K started". The
  Answers counter counts submitted sheets. Video on the projector is not
  built yet.
- Checked 2026-10-06 (owner's questions):
  - No answering music during a section, on the projector or on a homework
    sheet (it used to start as for any question); it comes back with the
    next normal question.
  - The projector no longer lists the questions while the recording plays:
    they are on the phones, as on an exam paper, and a list of bare prompts
    only crowded the screen.
  - With Plays allowed set, the projector counts plays ("Play it twice",
    then "Play 1 of 2"). **P** plays or pauses the recording. Space on the
    player just clicked plays or pauses it instead of revealing, which would
    close every sheet.
  - Classic games of a levelled quiz: the teacher ticks the levels
    (section 10b, Live).
- **The class correction (owner, 2026-10-06).** Once the recording has been
  played and the students have answered, the projector becomes the
  correction screen, which a normal live question doesn't need:
  - **Reveal** (Space) marks everyone and starts the correction at the
    section's first question: the question large, with its options lettered
    as on the sheet. **Space** shows its answer and how the class answered
    (options: how many chose each; written answers: "15 of 25 right · 4
    partly right"; a gap text shown filled in; match pairs listed). **→**
    goes to the next question, **←** back; after the last question → moves
    on in the game. **Next** on an open section still marks it and moves on
    without a correction.
  - The phones show each question's mark only when its answer is revealed;
    the question being corrected is highlighted and scrolled into view, and
    the sheet says "Correction: your teacher shows the answers one by one."
  - The room's current question is the one being corrected, so the
    projector's "❓ 7 / 20" follows it and an open answer is graded from the
    Answers panel while it is on screen (before, only a section's first
    question could be). The panel shows the eight questions up to the
    current one (it showed the quiz's last eight, so long quizzes had none).
  - Coming back to a marked section (← from the next question) reopens its
    correction as it was left, at its last question, answers, marks and
    points kept; it is never answered twice (before, it restarted empty and
    took the points back). ← at its first question goes on back as usual.
  - Server: `room.listeningDone[sectionId]` (`revealed` positions,
    `submitted`), `revealListeningAnswer`, `reopenListeningCorrection`,
    `listeningQuestionStats`; `listening.review` in the host state and the
    phones' state. Tests in `tests/listening-sections.test.js`.

## 3. Question types inside a section

| Type | On the sheet |
|---|---|
| `mcq`, `tf` | Prompt, then A/B/C options as small radio rows |
| `multi` | Same with checkboxes |
| `text`, `error_hunt` | One-line text input under the prompt |
| `context_gap` | The text with inline gap inputs: note/form completion, the classic listening task |
| `match_pairs` | One row per left item with a dropdown of the right items ("Speaker 1 → [A–F ▾]") |
| `open` | Small text area; teacher-graded as today |

Not allowed inside a section: speaking, voice record, voice text, image upload,
pin, spelling bee, word guess, puzzle, slider. The editor and the AI prompt
only offer the types above for questions in a section.

## 4. Data model

- Quiz: `listeningSections: [{ id, title, text, audio, video?, playsAllowed, pauseAllowed, transcript? }]`
  - `transcript`: what is said, for the teacher only (up to 20,000 characters;
    left out when empty). The student payloads (homework, live, public games)
    list section fields one by one and never include it. Phase 3 can turn its
    "Name: …" lines into voices.
  - `audio`: `{ kind: 'file', url }` (uploaded to R2 like other media) or,
    later, `{ kind: 'tts', lines: [{ voice, text }] }`. (Superseded 2026-10-03:
    TTS recordings are made by the studio into one MP3 and stored as `'file'`.)
  - `video`: optional, **live only** (played on the projector instead of the audio).
  - `playsAllowed`: 1–3, or 0 = unlimited. `pauseAllowed`: true/false.
- Question: `listeningSection: '<id>'` marks it as part of that section.
  Questions of one section must be consecutive; the editor keeps them together
  and both normalizers enforce it (a stray question leaves the section).
- Both normalizers drop every per-question media field (`imageData`,
  `imageKeyword`, `gifKeyword`, `media`, `videoKeyword`, `readingText`,
  question audio) and disallowed types from section questions.
- Sections live on the quiz, so the same quiz plays the same way as homework
  and live; the plays/pause settings travel with it.

## 5. Homework (phase 2)

**Flow:** normal questions one at a time as today. On reaching a section's
first question, the student sees the section's sheet; after submitting it,
they carry on with the next normal question. Free navigation between questions
still works, but a submitted section only opens for review.

**The sheet**
- Sticky top strip: the section title, the audio player and "8 of 10 answered".
- The instruction line, then the questions with their quiz numbers (6, 7, …
  12), compact spacing, A4-width column on a laptop/tablet, one column on a phone.
- Each change autosaves through the existing per-question answer route
  (`/api/assignment/answer`); text inputs save after a short pause in typing.
- "Submit section" at the bottom; if anything is unanswered, a quiet
  "2 questions unanswered: submit anyway?". The server then rejects further
  answers to that section's questions on this attempt.
- Instant feedback: marks and corrections appear on the locked sheet right
  after submitting. Feedback at the end: as today, after the whole assignment.
- Submitting the whole assignment also locks any open section, with its
  autosaved answers.

**The player**
- Unlimited plays: play, pause, seek.
- Limited: a progress bar you can't drag; "Play 1 of 2"; pause only if the
  section allows it. The count is kept **on the attempt on the server**, so
  reloading doesn't reset it. A play counts when it starts.

**Reused as is:** assignment codes, classes, sign-in, attempts limit, exam
mode, results, grading of open answers, the Students list.

**New:** compact per-type renderers that can sit many to a page (today each
type draws into one shared area, one question at a time), the sheet, the
player with the play count, section submit and lock.

## 6. Building it in the editor (phase 1)

- In the question list: **Make listening section** on a selection of
  consecutive questions (or "Add listening section"). The section shows as one
  framed block with its title, instruction, recording upload, Plays allowed and
  Pausing.
- Questions inside a section: the type picker shows only section 3's types,
  per-question media fields disappear.
- ~~A quiz with a section turns the Adaptive box off and disables it.~~
  Since 2026-10-03 the box stays (section 10f).

## 7. TTS recordings with several voices (phase 3)

~~A script of lines, each with a voice ("A: …", "B: …"), generated through the
existing TTS bridge into one MP3 per line and played back to back as one
recording (a play = the whole script). Optional pauses between lines.~~

**Replaced 2026-10-03** by **LISTENING_STUDIO_PLAN.md**. After a bake-off of
engines (Edge, Kokoro, Chatterbox, Qwen3-TTS, Dia2), the owner chose
Qwen3-TTS. It runs in a local studio app on the owner's PC (double-click,
browser page, no terminal), which turns a recording script (voices, lines
with acting directions, phone/PA effects, sounds) into one checked MP3. The
teacher listens to it and uploads it with the section's Recording button: the
studio stays detached from PinPlay for now.

Also decided (owner, 2026-10-03): scripts never include the spoken exam
rubric. Instead, a section option **🔊 Read the instruction aloud** makes
PinPlay read the section's instruction with its own TTS just before the
recording (on the first play; it isn't counted as a play). In live games the
projector plays it. See LISTENING_STUDIO_PLAN.md section 7.

## 8. Live (phase 4)

In a classic live game the class moves question by question as today. On
reaching a section:
- the projector shows the section title and instruction and plays the
  recording (audio, or the section's video);
- every phone shows the section's sheet; answers autosave as students go;
- the sheet stays open until the teacher moves on; then whatever each student
  entered is final and scored, submitted or not;
- the game continues with the next normal question.

Needs on the server: a room phase where all the section's questions accept
answers at once, pushed over the live connection. Detail to design when phase
2 is done. PinPlay Cup doesn't serve section questions.

## 9. AI prompt (phase 5)

A listening variant of the creation prompt: section 3's types only, no media,
section titles and instructions, and questions written **from a transcript the
teacher pastes** (so answers match what is actually said).

As built (2026-10-03):
- The ✨ AI Creation Prompt form has a **Kind of quiz** switch: Standard /
  🎧 Listening. Listening hides goal, adaptive, time limit, batches, media and
  the general type list, and shows its own fields: **Transcript** (I paste it
  here / I attach the recording to the AI chat, which transcribes it first /
  the AI writes the script, with a number of recordings), **Questions per
  part** (a number, or words such as "5 in part 1, 8 in part 2"), **Plays
  allowed** and **Pausing**, **Instructions for the AI**, and the section 3
  types as pills (all on except error hunt and open). Theme, language, level
  and AI mode are shared with the standard form.
- A pasted transcript is split into parts by lines such as `--- Part 2`; the
  form shows "N parts found", and each part becomes its own section.
- `buildListeningPrompt` (pure, tested in `tests/ai-prompt.test.js`) writes:
  the teacher's words, the task, listening rules (every answer is said in the
  recording; questions in the order heard; prompts paraphrase but written
  answers are the words heard, with their variants; wrong options are near
  misses from the recording; no media, `timeLimit` 0; section ids, titles
  numbered across the quiz, exam-style instruction), the transcript, the
  fields of each chosen type (gap fill, match, error hunt and open reworded
  for a recording) and one worked example: a short dialogue with a question
  of each chosen type, which the server's cleaner keeps as one section.
- The AI copies each transcript (or writes its transcription or script) into
  the section's `transcript`. In the editor it shows, collapsed, as
  "Transcript (only you see it)" and can be edited.
- Import → Append already renames clashing section ids, so separate prompts
  can be joined into one exam.

## 10. Adaptive listening (phase 6, plan)

Decided with the owner on 2026-10-03. This replaces the earlier rule that a
quiz with listening sections can't be adaptive.

### 10a. The idea

A student sees a section's questions all at once, so the level can't change
within a section. A section is therefore a **level block**: the student gets
the questions of one level, or a ladder of levels if PinPlay doesn't know
their level yet. Once the section is submitted, its answers count towards the
student's level, like any other adaptive answer. A quiz made only of sections
(Part 1, Part 2, Part 3) is the main use: each part comes at the level the
earlier parts point to.

### 10b. Decisions (owner, 2026-10-03)

| Question | Decision |
|---|---|
| Level of a block | The student's current level when they reach the section, mapped to the nearest level the section has (easier on a tie, as for saved levels). Fixed on the attempt, so a reload doesn't change it. |
| Student with no level | Gets a **ladder**: one level per moment, from the easiest to the hardest (10d). Applies when the student has no saved level, no level set by the teacher and no answers yet in this attempt. Random-name students always start with a ladder. |
| Moving the level | Only when the section is submitted (or the whole assignment is): its answers go through the normal engine, one by one, in the order shown. Autosave never moves the level. Blanks count as wrong; `open` answers wait for the teacher's grade, as today. |
| Ladder misses | On a ladder, a miss on a question **above** the student's current level doesn't lower it and doesn't count as a miss in a row. Without this rule, a B1 student who rightly fails B2, C1 and C2 ends at A1 (checked with the real engine on 2026-10-03; with the rule, A1 to C2 students all land on their own level). |
| Counting | Section questions come **on top of** the N questions per student. Every student does every section once. |
| Questions with no level | **Shared**: everyone gets them, at every level and in the ladder. They earn points but don't move the level. |
| Where a section comes | **Where it sits**: a section with k normal questions before it in the quiz comes after the student's k-th served question (capped at N). Sections that follow each other come back to back. In a quiz made only of sections, the parts come in order. |
| Live | Classic live isn't adaptive, PinPlay Cup never deals sections. **2026-10-06:** a classic game of a levelled quiz plays the levels the teacher ticks; a section then keeps those levels' questions, moment by moment, easiest level first (ADAPTIVE_MODE_PLAN.md 5b). |

### 10c. How a section is written: moments

- A section's questions are about **moments** of the recording, in the order
  they are heard. Every level present in the section has **one question per
  moment**: question k of each level is about moment k. All levels cover the
  whole recording in parallel.
- No new field: a question's moment is its rank among the section's questions
  of the same level (the 1st B1 question is moment 1). So the editor can
  either group the questions by level (all A2, then all B1) or by moment
  (moment 1 at A2, B1, B2, then moment 2…); both work.
- Every level must have the same number of questions. Because of this, every
  student gets a block of the same size, whatever their level.
- Shared (untagged) questions keep their place: each goes before the moment of
  the next tagged question after it in the section. Grouped by level, put them
  at the start or the end of the section.
- Played without adaptive, a multilevel section shows every question of every
  level. The editor says so.

### 10d. The block a student gets

- **Known level:** the shared questions and the chosen level's questions,
  moments 1…S, in order.
- **Ladder:** with S moments and L levels in the section, moment k (0-based)
  is asked at level `round(k × (L − 1) / (S − 1))`: 6 moments over A1–C2 give
  A1, A2, B1, B2, C1, C2; 6 moments over A2–B2 give A2, A2, B1, B1, B2, B2.
  With one moment, the easiest level.
- The sheet numbers the block's questions as usual; the student never sees a
  level (same display rule as adaptive mode).

### 10e. Engine and assignments

- The assignment's levels (engine bands) are the levels found in the single
  questions **and** the sections, so a quiz made only of sections can be
  adaptive. Adaptive still needs at least two levels in the quiz. N can be 0
  when the quiz has no single questions.
- Section questions are never served one at a time and never come back as
  retries.
- Serving: when the student reaches a section's place, its whole block is
  served at once; its questions appear in the attempt's served list as one
  run. The sheet's answer route takes any question of the open block
  (autosave); Submit section locks it, feeds the answers to the engine (with
  the ladder rule when it was a ladder) and serves what comes next. There is
  no "← Previous question" on the sheet in adaptive mode.
- The attempt is finished when N single questions are answered and every
  section is submitted. The level is saved as today.
- Plays allowed, pausing, instant marks after submitting: as in phase 2.
- Teacher results: one line per section, e.g. "Part 1 · B1 · 5/6" or
  "Part 1 · ladder A1→C2 · 4/6", and the level path marks ladder misses that
  didn't move the level.

### 10f. Editor

- The section panel shows its counts per level ("A2 6 · B1 6 · B2 6 · shared
  1") and warns when the levels don't have the same number of questions.
- The assignment row's 🎯 Adaptive box is offered for quizzes with sections
  (no longer hidden). For a quiz made only of sections, the "N questions per
  student" field is hidden.

### 10g. AI prompt (listening, with levels)

- The listening form gets a **Levels** choice (none, or a range such as A2–B2
  or A1–C2). With levels, the prompt asks for each recording: choose the
  moments (as many as the questions per part), then write **one question per
  level for every moment**, tagged with `cefr`; all levels cover the same
  moments, in the order heard.
- What makes a level harder, written into the prompt: the question type and
  how open it is (true/false and choosing → gap fill → a short written answer
  → open), how far the wording is from the recording (exact words → synonyms
  and paraphrase), how close the wrong options are (several things that are
  all mentioned, a detail that gets corrected), and asking for what is meant
  rather than what is said. Never a longer question.
- Already in the listening prompt (2026-10-03) for every level: questions and
  options are short, because students listen, read the current question and
  glance at the others at the same time. Short doesn't mean easy.

### 10h. Order of work

1. Authoring: the AI prompt's Levels option and the editor's counts per level.
   This lets the owner make real multilevel listening quizzes to test with.
   **Built 2026-10-03:** the listening form has "🎯 Several levels
   (adaptive)" with a From/To range (it locks the single Level field, as the
   standard adaptive box does). The prompt then counts moments ("6 moments,
   with one question per level for each moment (18 questions)"), adds a
   Levels section (moments, one question per level per moment written moment
   by moment, what makes a level harder, titles count moments, scripts
   pitched at the middle of the range) and shows a worked example of two
   moments at every requested level (`LISTENING_PROMPT_LEVEL_EXAMPLE`). The
   section panel shows "🎯 A2 6 · B1 6 · shared 1", warns when the levels
   have different counts, and notes that without adaptive students see every
   level's questions.
2. Engine and assignments: bands from sections, blocks and ladders, the ladder
   rule, where sections come, section submit feeding the engine, finishing
   the attempt, results. Tests with the real worker, as in phase 2.
   **Built 2026-10-03** (`worker.js`, "adaptive listening"):
   - `listeningSectionMoments` / `listeningSectionBlock` pick a block: one
     level (nearest the student's, easier on a tie) or the ladder; a level
     missing a moment borrows the nearest level's question.
     `adaptiveSectionPlan` places each section after the single questions
     before it. Single questions are drawn only from outside sections; the
     engine's levels include the sections'.
   - The attempt keeps `adaptive.sections` (place, size, done) and, while a
     section is open, `adaptive.block` (its questions, their levels, the
     drafts). The answer route takes drafts for any question of the open
     block (one attempt write, nothing graded). Submit section
     (`adaptiveAttemptCloseBlock`) feeds the answers in order with the
     ladder rule (`adaptiveRecord(…, { ladder, noRetry })`), keeps a result
     line per section and serves what comes next. Submitting the whole
     attempt closes an open block that has drafts.
   - Ladder or level block: a ladder only for a student with no saved level
     (and no level set by the teacher) who hasn't answered anything yet.
   - Totals: N singles plus every block (`adaptiveAttemptTotal`); the
     assignment list shows that number. `adaptive: true` with N = 0 makes a
     quiz of sections only adaptive.
   - Teacher grades: shared questions never move the level; a ladder's
     teacher-graded miss above its level doesn't either.
   - Pages: the student sheet works in adaptive attempts, without
     "← Previous". The create page offers 🎯 Adaptive for quizzes with
     sections ("+ listening sections at each student's level"; the N box is
     hidden when there are no single questions). Results show one line per
     section: "🎧 Part 1 · ladder A1→B1 · 2/3" or "🎧 Part 2 · A2 · 3/3".
   - Tests: `tests/listening-sections.test.js` (blocks, ladders, placement,
     the ladder rule, and full attempts on the real worker). Checked in a
     browser on a phone-sized screen: ladder sheet, submit, Part 2 at A2.
   - **Public /play games (owner, 2026-10-03): adaptive like assignments.**
     Single questions before a section level the player first; the player
     only picks the number of single questions (suggested a third of them);
     sections come on top. Signed-in players use the assignment routes.
     Anonymous players' attempt lives in the signed play token, which takes
     each answer once, so the page keeps a section's answers until Submit
     section, which sends them all (`/api/public/game/section`,
     `applyPublicSectionAnswers`); Finish also sends an open section's
     answers. The token now carries the submitted sections (`ss`).
     Anonymous play leaves teacher-graded questions out of the blocks, as it
     does elsewhere. The start screen says "Plus a listening section at your
     level", or "🎯 Adaptive listening · N questions…" for a game of sections
     only (no number to pick). This also fixes non-adaptive /play sections,
     whose sheet couldn't change an answer once saved.

### 10i. Details to settle while building

- A student whose saved level rests on very few answers: level block or
  ladder? (Default: level block; any saved level counts.)
- A ladder with an `open` question: the next part uses the level without it
  until the teacher grades it.
- "Apply to assignment" removing the level a block was fixed at: the block
  moves to the nearest level the section still has.

## 11. Order of work

1. Data model + editor (sections, recording upload, filtered types, plays and
   pause settings). Tests: normalizers keep sections consecutive and drop
   per-question media and disallowed types.
2. Homework: the sheet, player and play count, section submit and lock,
   feedback. Test end to end on a local worker with a phone-sized and a
   Chromebook-sized screen.
3. Multi-voice TTS recordings.
4. Live.
5. AI prompt variant.
6. Adaptive listening (section 10).
7. Timed moments (section 12).

## 12. Timed moments: hear the answer in the correction (phase 7, plan)

Planned with the owner on 2026-10-09. When the class corrects a section, each
question's answer comes with **the moment of the recording it is based on**:
the projector plays just that bit, so everyone hears the answer being said,
and only then, when the teacher chooses, shows the words: on the projector,
and on the sheet of each student who got it wrong. **Hear first, then
read.** The same later for homework, after a section is submitted.

### 12a. Decisions (owner, 2026-10-09)

| Topic | Decision |
|---|---|
| Where timings come from | The **Listening Studio** (exact: it places every line itself), **voice actors** (exact: the builder places every take), or a **subtitle file** (`.vtt` / `.srt`) uploaded with any other recording. Plain transcripts without timings: later, Whisper alignment in the Studio (desktop only). |
| Question → line | An **automatic first guess**, then the **teacher checks** it (▶ to hear each moment, click another line to change it). Later the AI prompt names the line for each question. |
| Live correction | **The words are not shown by default**: hearing comes first. Two ways to run it, switched on the projector (remembered on that device): **Auto**: Space reveals the answer, the moment plays (about 1 s before the line to just after it), and when it ends the words appear. **Manual**: Space reveals the answer only; the teacher plays the moment and shows the words when they choose, in either order. In both: **P** plays / replays the moment, **T** (or "Show the words") shows the line(s) with the answer words highlighted; the full player stays for anything else; the speed setting applies. |
| Phones in class | When the words show on the projector (T, the button, or Auto), a student whose answer was wrong, partly right or blank sees **"You heard: …"** with the line under their mark. Not before. No sound on phones in class (the projector plays it). |
| Homework (step 2) | Once a section is submitted and the assignment shows answers, each mark has **▶ Hear it** (the student's own device); the words come after, with "Show the words". |
| Privacy | Timings, lines and links are **teacher-only** until a question is revealed / its marks are shown: they give the answers away. |

### 12b. Data

- Section: `cues: [{ s, e, who, text }]`: start and end in seconds (2
  decimals), the speaker if known, what is said (≤ 300 characters). Up to
  400 cues. Left out when empty.
- Question: `heard: { from, to, by }`: the first and last cue of its moment
  (indexes into the section's cues), `by: 'auto' | 'teacher'`. A teacher's
  choice is never overwritten by a new guess. Step 2 adds `heard.quote` (the
  AI's words, used to find the line).
- Both normalizers keep `cues` and `heard` (the shared section functions,
  identical in app.js and worker.js) and drop a `heard` that points past the
  cues. The student payloads list fields one by one, so neither reaches a
  phone unless added on purpose (12e); a test checks every student payload.

### 12c. Timings in

- **Studio**: `build_part` records each line's start and end as it places it
  (overlaps and "Mia + Tom" included) and writes them **inside the MP3** (an
  ID3 tag with the cues) and as a `.vtt` next to it. One file to upload, so
  the timings can't be forgotten.
- **Section panel**: picking a recording reads the tag if there is one, then
  **uploads the audio without it** (the public file never carries the lines).
  A "🕒 Timings…" button takes a `.vtt` / `.srt` (also accepted together with
  the audio in the same picker).
- **Voice actors**: "Use in the listening section" passes one cue per line
  (where the trimmed take lands in the built MP3).
- A new recording replaces the cues (or clears them if it has none). Links
  stay; any past the new cue count are dropped; if the line texts changed the
  panel asks to check the links.

### 12d. The automatic guess and the check (editor)

- Runs in the teacher's browser when timings arrive, or on "↻ Guess again".
- What it looks for, by type: the right option(s) (mcq, multi); the accepted
  answers (text, voice_text, error_hunt); the gap answers **and** the gap
  sentence without its blanks (gap sentences often follow the script); the
  right-hand items (match_pairs); the prompt for every type (a weaker clue);
  open questions: the prompt only, usually left for the teacher.
- Score per line, and per pair of neighbouring lines (an answer split over two
  lines): share of the content words found, a bonus for the exact phrase,
  numbers compared both as digits and as words.
- Order: a section's questions follow the recording, so the guesses never go
  backwards (best non-decreasing choice over the section; for levelled
  sections, per level, moment by moment).
- Below a threshold: not linked, shown as "⚠ choose the line".
- The panel line: "🕒 42 lines timed · 9 of 10 questions linked · Check".
  **Check** opens a dialog: each question with its answer and its line(s), ▶
  to hear the moment, **Change** (click a line, shift-click to extend), "↻
  Guess again" (only `by: 'auto'` links change).

### 12e. Live correction

- Server: `hostListeningReview` adds `moment: { start, end }` for the current
  question **once it is revealed** (start = first cue − 1 s, never before 0;
  end = last cue + 0.4 s), and `moment.lines: [{ who, text }]` only once the
  teacher has shown the words. Showing them is one host request
  (`/api/host/listening/words`) that marks the question in the room
  (`listeningWordsShown`); moving on keeps it marked, so going back shows them
  again.
- Projector: under a revealed answer, "▶ Hear it" and "Show the words", and a
  small **Auto / Manual** switch for the correction (kept in the browser).
  - Auto: the reveal plays the moment at once; when it ends (not when it is
    stopped) the words show by themselves.
  - Manual: nothing plays on reveal; the teacher uses the buttons or keys.
  - Both: **P** plays / replays the moment (the section's player jumps there
    and stops at the end: needs the byte ranges added 2026-10-08); **T** or
    the button shows the line(s) as a caption under the answer, the answer
    words highlighted. → / ← move on as now and stop it.
  - A question without a linked line: no buttons, nothing plays; P plays the
    whole recording as before.
- Phones: `playerListeningState` marks add `heard: "Tom: It's forty minutes
  late."` for questions whose words the teacher has shown, when the answer
  was wrong, partly right or blank. Shown under the mark as "You heard: …".
- A section video (live only) works the same when it has timings.

### 12f. Homework (step 2)

- Marks shown after a section is submitted (and only when the assignment
  shows answers) add ▶ Hear it, played from the section's recording on the
  student's device (it replays freely once submitted), then "Show the words"
  for the line. /play games too.
- AI prompt: each section question gets `"heard": "the exact words from the
  script where the answer is"`; the guess matches that quote first.
  **Built 2026-10-09**, ahead of the homework part: the prompt's rule and
  every example (single-level and levelled) carry a quote; an imported string
  becomes `heard.quote`, kept with or without a link (both normalizers), only
  inside a section, never in a student payload. The guess gives the quote the
  strongest weight but never forces a line it can't find; the Check dialog
  shows it ("AI: …") under each question.

### 12g. Quota

Nothing new to speak of: the cues ride inside the quiz (a few KB for a 40-line
script) and in the review state the projector already receives; phones get a
line of text in the marks they already get. Jumping to a moment is one or two
range requests to the media route (about a dozen per correction).

### 12h. Order of work

1. Data: `cues`, `heard`, both normalizers, student payloads leak test.
2. Timings in: `.vtt` / `.srt` parser, Studio cues (ID3 tag + `.vtt`), tag
   read and stripped on upload, voice actors cues.
3. The guess and the Check dialog.
4. Live correction: the moment plays on reveal, then T / "Show the words"
   shows the line on the projector and the phones' "You heard".
   Tests: parser, matcher on AI-written fixtures (right answer first, same
   prompt everywhere), review payload only after reveal, end to end in Chrome
   with a projector and a phone.
5. Step 2: homework ▶ Hear it (AI prompt `heard`: built 2026-10-09).

### 12i. Details to settle while building

- Lead-in and tail lengths (1 s / 0.4 s to start); "one line earlier" if a
  moment needs more context.
- A question whose answer is heard twice (said, then corrected by another
  speaker): the moment covers both lines.
- Subtitle files cut differently from the script lines (two lines in one cue):
  the caption shows the cue as it is.

### 12j. Built (2026-10-09): steps 1-4

- Data: `normalizeListeningCues` / `normalizeListeningHeard` in the shared
  section functions (app.js = worker.js); `heard` kept by both question
  normalizers. Student payloads list their fields, so neither reaches a
  student; `tests/timed-moments.test.mjs` checks the homework and live
  payloads.
- Timings in: the Studio's `build_part` records each line; `project.mix`
  writes an ID3v2.3 tag (TXXX "PinPlay timings", JSON `{ v: 1, cues: [[s, e,
  who, text]] }`) before the MP3 frames, and a `.vtt` next to it. The section
  panel reads the tag (`readMp3Cues`) and uploads the audio without it; the
  recording picker also takes a `.vtt` / `.srt` with it, and "🕒 Timings…"
  adds one later (`parseSubtitleCues`). Voice actors pass where each take
  lands.
- The guess (`guessListeningMoments`): the keys of 12d, words weighted by how
  rare they are in the recording, numbers as words ("platform 2" finds
  "platform two"), the speaker's name counts as a word of the line. Best
  non-decreasing choice per level; teacher links fixed.
- Live: `hostListeningReview.moment` once revealed (`lines` once shown);
  `/api/host/listening/words` (one host request) records the question in
  `listeningDone[section].words`; `playerListeningState.heard` for wrong,
  partly right or blank answers. Projector: Auto / Manual button (a button,
  not a checkbox, so the keys keep working), "▶ Hear it", "Show the words",
  P and T; the caption highlights the answer words.
- Checked in Chrome with a projector and a phone: the Studio MP3's tag read
  and stripped, the guess (4 of 4 linked), Check → Change, Auto (moment 5.0 →
  9.4 s, then the words, then "You heard" on the wrong phone only) and Manual
  (nothing on reveal, P plays, T shows).
