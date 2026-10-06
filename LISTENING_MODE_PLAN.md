# Listening sections: a scrollable exam sheet with one recording

Status: **phases 1 (data model + editor), 2 (homework sheet) and 4 (live)
built 2026-10-02; phase 5 (AI prompt) built 2026-10-03.** Phase 3 is planned as a
local studio (LISTENING_STUDIO_PLAN.md, 2026-10-03);
phase 6 (adaptive listening, section 10) planned 2026-10-03. Decisions settled with the owner on 2026-10-02 (section 2).

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
  its first question; Next leaves the whole section; Prev re-enters it at its
  start (points earned there are taken back and re-earned). No timer.
- Phones show the same sheet (no player: "Listen to the recording in class").
  Each change saves as a draft on the room (`/api/section/answer`), "Submit
  section" locks it for that student (`/api/section/submit`). The sheet is
  never rebuilt by the live pushes while the student types.
- Reveal or Next grades everyone's drafts, submitted or not
  (`finalizeListeningSection`): flat points per question (no speed bonus, no
  bets), open answers wait for the teacher as usual. Reveal shows the marks on
  each phone and the answers on the projector.
- Projector: title, instruction, the recording's player (kept outside the
  redrawn area so pushes never stop it), "N of M submitted · K started", the
  questions, and after reveal the correct answers. The Answers counter counts
  submitted sheets. Video on the projector is not built yet.
- Checked 2026-10-06 (owner's questions):
  - No answering music during a section, on the projector or on a homework
    sheet (it used to start as for any question); it comes back with the
    next normal question.
  - The projector no longer lists the questions while the recording plays:
    they are on the phones, as on an exam paper, and a list of bare prompts
    only crowded the screen. It shows title, instruction, the player, the
    count, and lists the questions with their answers after the reveal, for
    the class correction.
  - With Plays allowed set, the projector counts plays ("Play it twice",
    then "Play 1 of 2"). **P** plays or pauses the recording. Space on the
    player just clicked plays or pauses it instead of revealing, which would
    close every sheet.
  - Classic games of a levelled quiz: the teacher ticks the levels
    (section 10b, Live).

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
