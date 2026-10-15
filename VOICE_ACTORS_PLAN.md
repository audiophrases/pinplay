# Voice actors: volunteers record a listening script, line by line

Volunteer students record the lines of a listening script on any phone or
computer with a browser and a microphone. The teacher reviews each take, trims
the silence at the start and end, sets the pauses, and builds one recording for
a listening section. Decided with the owner on 2026-10-08.

## Decisions

| Topic | Decision |
|---|---|
| Devices | Any browser with a microphone (students' own phones are fine). Nothing heavy runs on the device. |
| Access | **One link** (and QR code) per session. No login: the volunteer picks how to record. |
| Recording order | Either **the whole script in order** (one reader, or a group passing the phone) or **one character's lines** in a batch. |
| Script | The listening script format (`listening-script.js`): `Marc (cheerful): Hello…`. A session starts from pasted text or from a listening section's transcript. |
| Review | The teacher's page lists every line in script order with its take, a waveform and the silence at both ends trimmed automatically; two handles adjust the trim; ✓ OK or ↻ Redo (the line goes back to the volunteer's list). Trimming never changes the take. |
| Pauses | A fixed short pause between lines (0.6 s by default, changeable for the session), adjustable per line while listening to the put-together recording. |
| Output | **Build recording** joins the trimmed takes in script order with their pauses into one MP3: download it, or put it straight into the listening section the session came from. |

## Quota

- A take is one upload: one Worker request, one Durable Object request (one
  row write) and one R2 write. Re-recording a line stores the new take and
  deletes the old one, so a session never holds more than one take per line.
- The volunteer page loads the session once; an upload's reply carries the
  updated line. No polling (a ↻ button refreshes when needed).
- The teacher page loads the session once; trims, statuses and pauses are
  saved in batches (one request for a burst of edits). Takes are fetched once
  each per visit to draw the waveforms.
- Trimming, putting the recording together and encoding the MP3 all happen in
  the teacher's browser. The server never processes audio.
- A 40-line script: ~40 uploads + a handful of saves, plus ~40 take fetches per
  review visit.

## Pieces

- **Worker / assignments registry DO**: one row per session (`vs:<id>`), routes
  `/api/rec/create | list | get | save | delete` (teacher password) and
  `/api/rec/actor` (GET) and `/api/rec/take` (POST raw audio) for volunteers.
  Takes live in R2 under `voice-actors/<id>/<line>-<stamp>.<ext>` (≤ 3 MB,
  ≤ 60 s); deleting a session deletes that folder. The orphan-media purge only
  looks at `assign-*`/`preview-*`, so it never touches takes.
- **Volunteer page** `record/` (+ `record.js`): choose "whole script" or a
  character; one line at a time with the previous line for context; ● Record,
  ■ Stop, ▶ Listen, Redo, Save & next; progress; lines marked ↻ by the teacher
  come first.
- **Teacher panel** in the create page (🎙 Voice actors): sessions list, new
  session from pasted script or from a listening section, the link and QR,
  review (waveform + trim handles, ✓ / ↻), and the put-together recording
  (pauses per line, ▶ from any line, MP3 download, use in the section).

## Built (2026-10-08)

- `cloudflare/worker.js`: `/api/rec/*` routes and the `vs:<id>` rows in the
  assignments registry DO (`newRecSession`, `recActorView`, `recApplySave`…).
  A take for a line the teacher approved is refused (409) and its upload
  removed. `/api/media/` now serves a take with its stored audio type.
- `record/` + `record.js`: the volunteers' page. The whole script or one
  character; Space records / stops and Enter saves on a computer; a level
  meter shows the microphone works.
- `voice-actors.js` (create page, owner only): 🎙 Voice actors from a
  listening section's panel or Ctrl+K. Automatic trim (20 ms RMS windows
  against the take's noise floor, 120 ms kept before and 200 ms after);
  double-click a waveform to go back to it. Every take is brought to an even
  level when played or built. Built at 44.1 kHz mono, MP3 96 kbps (lamejs,
  loaded only when building; WAV if it can't load).
- Tests: `tests/voice-actors.test.mjs` (routes on the real worker, script
  reading, automatic trim); checked in Chrome with a fake microphone.

## Easier to find, and volunteers may change the words (2026-10-15)

The owner couldn't find the panel without a quiz open: they want students to
record first and write the questions afterwards.

| Topic | Decision |
|---|---|
| Entry point | A **🎙 Voice actors** card on the teacher page (owner only), right under Guest workspaces: **+ New recording session** and **Recording sessions**. No quiz needed: with no listening sections, the form says to paste the script and put the recording into a section later. The section's 🎙 button and Ctrl+K still work. |
| One link per character | The session view lists each character with **📋 Copy link** (`record/?s=ID&c=NAME`): the link opens only that character's lines. The link for the whole session stays. |
| Changing the words | A session setting, **on by default** ("Volunteers can change the words of their lines"), set in the new-session form and in the session view. The volunteer presses **✏️ Change the words**, edits the line and saves. Approved lines can't be changed. |
| Tracking | The server keeps the script's own words in `line.original` the first time a line changes (later changes keep that original; going back to it clears the mark). The teacher sees **✏️ Changed**, the script's words struck through, **↩ Script's words** to go back, a **Changed by volunteers** filter and the count in the sessions list. The volunteer sees what the script said, and **↩ Back to the original**. |
| A take after a change | The take stays. The volunteer is told to record the line again; the teacher can send it back with ↻ Redo. |
| Into the quiz | **📋 Copy the script** copies the script with the changes (listening script format). When the recording goes into a section: an empty section script becomes the session's; otherwise each changed line is replaced in the section's script, in order, keeping directions and sounds. If a changed line isn't found word for word, the teacher is asked before the whole script is replaced. |

- Worker: `POST /api/rec/edit` `{ s, line, text }` (volunteers; one DO
  write; 403 `locked` when the setting is off, 409 `approved`, 400 empty),
  `allowEdits` on the session (create and save), `revert` in a save,
  `original` in the volunteer's view, `edited` in the sessions list.
- The record page shows ✏️ only when the session says `allowEdits: true`,
  so the page is safe before the API is deployed.
