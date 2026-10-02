# Listening mode: a scrollable exam sheet with one recording

Status: **plan, 2026-10-02.** Nothing built yet. Decisions settled with the
owner on 2026-10-02 (section 2).

In one line: a listening task shows **all its questions on one calm, scrolling
page, like an exam paper**, while one recording plays. Homework first (audio on
the student's screen), live later (audio or video on the projector, questions
on the phones).

## 1. Why

Listening practice and exams happen today in Google Forms, outside PinPlay's
classes, roster and results. PinPlay's screens are built for one question at a
time with big buttons, which is wrong for a listening: once the recording
ends, students must have answered everything, so they need to see the whole
sheet and move their eyes up and down freely, as on paper.

Real listening sessions: about two minutes to read the questions, the
recording twice, then a little time to check and change answers. PinPlay adds
no timer and no extra pressure; it removes friction.

## 2. Decisions (owner, 2026-10-02)

| Question | Decision |
|---|---|
| Layout | One long page, all questions stacked, compact, like a sheet of paper. No Next button, no jump-to-question navigation, no cards that look like an app. |
| Progress | A thin, quiet sticky strip: "8 of 10 answered". |
| Saving | Every change saves in the background; students never think about it. "Hand in" at the bottom. |
| Media | **None inside the questions**: no images, GIFs, video, reading texts or per-question audio. The whole screen is for the questions and answers. |
| The recording | Mostly an uploaded **audio file**. Keep the door open for **TTS-made audio, with several voices** (dialogues). |
| Homework | Audio player above the sheet, on the student's screen. Never video (too much on one screen). |
| Live | Questions on the phones only; the projector plays **audio or video** (a video link is fine there). |
| Plays allowed | A **per-assignment setting**: e.g. 2 or unlimited. When limited, no scrubbing or seeking. |
| Counting | Same as a normal PinPlay quiz: one question counts as one, a matching question included (scored with partial credit as today). |
| Adaptive | Off: a listening paper has a fixed order. |
| Section headings | Optional heading / instruction line between groups ("Part 1 — Questions 1–6. You will hear…"). *(Proposed; owner to confirm.)* |

## 3. Question types

| Type | On the sheet |
|---|---|
| `mcq`, `tf` | Prompt, then A/B/C options as small radio rows |
| `multi` | Same with checkboxes |
| `text`, `error_hunt` | One-line text input under the prompt |
| `context_gap` | The text with inline gap inputs: note/form completion, the classic listening task |
| `match_pairs` | One row per left item with a dropdown of the right items ("Speaker 1 → [A–F ▾]") |
| `open` | Small text area; teacher-graded as today |

Left out: speaking, voice record, voice text, image upload, pin, spelling bee,
word guess, puzzle, slider. The editor and the AI prompt only offer the types
above for a listening task.

## 4. Data model

- Quiz level: `listening: { audio, video? }`.
  - `audio`: `{ kind: 'file', url }` (uploaded to R2 like other media) or,
    later, `{ kind: 'tts', lines: [{ voice, text }] }` (several voices).
  - `video`: optional, **live only** (a link played on the projector).
- A quiz with `listening` set is a listening task. The editor hides, and both
  normalizers drop, every per-question media field (`imageData`,
  `imageKeyword`, `gifKeyword`, `media`, `videoKeyword`, `readingText`,
  question audio) for it.
- Optional section heading on a question: `sectionTitle` (and
  `sectionText` for the instruction line), shown above that question. Fields on
  a question rather than a new "heading" item, so numbering, scoring and every
  existing view stay untouched.
- Assignment level: `playsAllowed`: a number (1–3) or `0` = unlimited.

## 5. Homework (phase 2)

**The sheet**
- Sticky top strip: the audio player and "8 of 10 answered".
- Below: questions numbered 1…N, compact spacing, A4-width column on a
  laptop/tablet, one column on a phone.
- Each change saves through the existing per-question answer route
  (`/api/assignment/answer`); text inputs save after a short pause in typing.
- "Hand in" at the bottom: if anything is unanswered, a quiet "2 questions
  unanswered: hand in anyway?".
- After handing in: the same sheet with marks and corrections (feedback mode
  `end`). **Instant feedback is not offered**: it would give answers away
  while the recording plays.

**The player**
- Unlimited: a normal player (play, pause, seek).
- Limited: play/pause and a progress bar you can't drag; "Play 1 of 2". The
  count is kept **on the attempt on the server**, so reloading the page doesn't
  reset it. A play counts when it starts.
- *Open detail:* pause allowed when limited? Proposed yes (a cough, a phone
  ringing); no seeking either way.

**Reused as is:** assignment codes, classes, sign-in, attempts limit, exam
mode, results, grading of open answers, the Students list.

**New:** compact per-type renderers that can sit many to a page (today each
type draws into one shared area, one question at a time), the sheet page, the
player with the play count, the `playsAllowed` setting.

## 6. Building it in the editor (phase 1)

- Create page: a **🎧 Listening task** switch. When on: the type picker shows
  only section 3's types, per-question media fields disappear, a **Recording**
  panel appears (upload an audio file; later a TTS script with voices).
- Optional heading fields on a question.
- Assignments row: **Plays allowed: 1 / 2 / 3 / unlimited**; adaptive and
  instant feedback disabled for listening tasks.

## 7. TTS recordings with several voices (phase 3)

A script of lines, each with a voice ("A: …", "B: …"), generated through the
existing TTS bridge into one MP3 per line and played back to back as one
recording (a play = the whole script). Optional pauses between lines.

## 8. Live (phase 4, to design in detail later)

A new live game mode, closest to PinPlay Cup (phones move independently over
the live connection) rather than classic (all phones on one question).

- Projector: the recording (audio or video) and a few stages the teacher moves
  through: *Look at the questions → Playing → Check your answers → Closed*.
- Phones: the same sheet as homework, open the whole time until the teacher
  closes it.
- Results as for a snapshotted live game.

## 9. AI prompt (phase 5)

A listening variant of the creation prompt: section 3's types only, no media,
optional section headings, and questions written **from a transcript the
teacher pastes** (so answers match what is actually said).

## 10. Order of work

1. Data model + editor (switch, recording upload, filtered types, headings,
   Plays allowed). Tests: normalizers drop per-question media; settings saved.
2. Homework sheet + player + play count. Test end to end on a local worker
   with a phone-sized and a Chromebook-sized screen.
3. Multi-voice TTS recordings.
4. Live mode.
5. AI prompt variant.
