# Listening sections: a scrollable exam sheet with one recording

Status: **phase 1 (data model + editor) built 2026-10-02.** Phases 2–5 are
still a plan. Decisions settled with the owner on 2026-10-02 (section 2).

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
- The Adaptive box is hidden for a quiz with sections; the server refuses an
  adaptive assignment for one. PinPlay Cup never deals section questions.
- Until phase 2, students still get section questions one at a time (without
  media); the recording isn't played yet.
- Tests: `tests/listening-sections.test.js`.

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
| The recording | Mostly an uploaded **audio file**. Keep the door open for **TTS-made audio, with several voices** (dialogues). |
| Homework | Audio player at the top of the sheet. Never video. |
| Live | Phones show the section's sheet; the projector plays **audio or video**. The sheet **stays open until the teacher moves on**; whatever each student has entered is autosaved and counts even if they never submitted. |
| Plays allowed | **Per section**: 1, 2, 3 or unlimited. When limited, no rewinding or skipping. |
| Pausing | **Per section**: allowed / not allowed. |
| Counting | Same as a normal PinPlay quiz: one question counts as one, a matching question included (partial credit as today). |
| Adaptive | A quiz with listening sections can't be adaptive (fixed order). |

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

- Quiz: `listeningSections: [{ id, title, text, audio, video?, playsAllowed, pauseAllowed }]`
  - `audio`: `{ kind: 'file', url }` (uploaded to R2 like other media) or,
    later, `{ kind: 'tts', lines: [{ voice, text }] }`.
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
- A quiz with a section turns the Adaptive box off and disables it.

## 7. TTS recordings with several voices (phase 3)

A script of lines, each with a voice ("A: …", "B: …"), generated through the
existing TTS bridge into one MP3 per line and played back to back as one
recording (a play = the whole script). Optional pauses between lines.

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

## 10. Order of work

1. Data model + editor (sections, recording upload, filtered types, plays and
   pause settings). Tests: normalizers keep sections consecutive and drop
   per-question media and disallowed types.
2. Homework: the sheet, player and play count, section submit and lock,
   feedback. Test end to end on a local worker with a phone-sized and a
   Chromebook-sized screen.
3. Multi-voice TTS recordings.
4. Live.
5. AI prompt variant.
