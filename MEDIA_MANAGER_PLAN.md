# Media Manager (quiz editor)

Adaptive quizzes are large, e.g. 120 questions spread over A1–C2. Checking and
fixing question media one question at a time in the builder takes too long. This
adds a **🗂 Media** panel to the quiz editor: one table row per question, with
filters and sorting, file-manager selection, and bulk actions that apply to the
selected rows.

Discussed with the owner on 2026-09-28. Status: **steps 1–2 built** (see "Built"
at the end): the panel with filters, sorting and selection. Bulk actions (steps
3–4) are not built yet.

## Decisions (from the discussion)

| Topic | Decision |
|---|---|
| Where | Inside the quiz editor, opened from a **🗂 Media** button next to the 🎯 Levels panel. It works on the quiz currently open in the editor. |
| View | A table, one row per question: #, level, question type, prompt (shortened), image/GIF/video cell with a thumbnail, audio cell, status. |
| Summary | A line at the top, e.g. "120 questions · 27 missing · 4 failed · 18 GIFs · 96 with audio". Each number is a link that applies that filter. |
| Filters | Level (A1–C2, untagged), media type (image, GIF, video, TTS audio, audio file, none), status (see below), question type, and a text search on the prompt and keywords. Filters combine. |
| Sorting | By #, level, status, media type, last changed. Click a column header; click again to reverse. |
| Selection | Works like a file manager: click selects one row; **Ctrl/⌘+click** adds or removes a row; **Shift+click** selects the range from the last clicked row; **Ctrl/⌘+A** selects every row in the current filter; **Esc** clears. A checkbox column does the same for touch screens. |
| Bulk actions | A sticky bar that stays visible while rows are selected: **Generate missing**, **Regenerate**, **Remove**, **Replace**. Plus a **Generate all missing** button in the summary line that needs no selection. |

## What the panel reads (existing question fields)

Nothing new is stored for images, GIFs, video or audio. The panel reads the fields
the builder and `ensureQuizMediaReady` already use:

- **Image / GIF**: `imageData` (a `data:` URL before upload, an R2 `/api/media/…`
  URL after, or a GIPHY CDN URL for GIFs), with `imageKeyword` and `gifKeyword`
  as the search terms. A GIF is recognised by a GIPHY host or a `.gif` URL.
- **Video**: `media` (`normalizeQuestionMedia`) and `videoKeyword`. Not available
  on `pin` questions.
- **Audio**: `audioMode` (`tts` / `file`), `audioText` (or `prompt` when the quiz
  reads all questions aloud), `language` (voice), `ttsAudioKey`, `audioData`.
  Only for types where `supportsQuestionAudio` is true.
- **Reading text** questions (`readingText`) have no image or video, as today.
- **Last changed**: `_imageVersion` / `_audioVersion` start with `Date.now()` in
  base 36, so the time can be read back without a new field. Media set before
  those tokens existed sort as "unknown".

## Status per question

| Status | Meaning |
|---|---|
| ✅ Ready | Media present and uploaded (R2 or GIPHY URL; TTS key computed). |
| ⏳ Missing | A keyword or TTS text is set but no media yet. "Generate missing" fills these. |
| — None | No media and no keyword. Not an error: the teacher chose no media. |
| ⬆ Not uploaded | `imageData` or `audioData` is still a `data:` URL. It uploads on the next save/publish. |
| ⚠️ Failed | The last generate/regenerate in this panel failed for this row (no results, search error, TTS error). Kept only for the editing session; the reason shows on hover. |

A question can have both a picture status and an audio status; the table shows
both cells, and the status filter matches either.

## Bulk actions

All actions run on the selected rows only (or on every row with **Generate all
missing**), show progress per row in the table, and can be cancelled. They run a
few rows at a time (about 3 in parallel), not all 120 at once, and follow the
service limits below. When they finish, the builder is re-rendered
and the quiz saved as it is after any other builder edit.

- **Generate missing**: the existing auto-fill logic (`autoFillImages`,
  `autoFillVideos`, and TTS preparation from `ensureQuizMediaReady`) restricted to
  the selected questions. Refactor those functions to take a list of questions
  instead of always walking the whole quiz; the publish path keeps calling them
  with every question.
- **Regenerate**: take the **next** result for the same keyword that is not the
  current one, from the session cache when there is one (images: Openverse, then
  Pexels; GIFs: GIPHY). For
  TTS audio, the mp3 is keyed by voice + text, so regenerating with the same text
  and voice gives the same file. Here the action is **Change voice…** (pick a voice,
  applied to all selected TTS questions), which produces new keys.
- **Remove**: clears the picture/GIF, video, or audio of the selected rows (asks
  which, and confirms). Keywords stay, so "Generate missing" can refill later.
  The old R2 objects are left for the existing orphan-media purge.
- **Replace**: with one row selected, opens the existing picker for that question
  (`openImageSearchDialog` / `openGifSearchDialog`, audio settings). With several
  selected, it offers **Set keyword…** (image or GIF keyword for all selected, then
  Generate), which is how a teacher switches a batch from pictures to GIFs.

## Other details

- Selection is kept per question object, not by index, so it survives sorting,
  filtering and reordering in the builder.
- A row's **↗ Open** button closes the panel, expands that question in the
  builder and scrolls to it.
- Hovering a thumbnail shows it larger; ▶ plays the audio preview (the existing
  `data-play-audio-preview` behaviour).
- The panel follows the editor's language setting (`t()` strings) like the rest
  of the builder.

## Service limits

**GIPHY: 100 calls per hour, confirmed.** GIPHY emailed on 2026-09-28: the
"PinPlay" key is a **Beta key**, it went over 100 calls/hour and was blocked for
the rest of that hour, and it stays limited while it remains a Beta key. Beta keys
are meant for development only. The alternative is applying for a production key
(no rate limit) in the GIPHY Dev Portal.

Searches go through the worker (`giphySearch` → `/api/gifs/search`), so all
teachers on one installation share that one key and its hourly limit.

**Why the limit is already being hit (existing code):** `ensureQuizMediaReady` runs
`autoFillImages` on every save/publish. Each question with a `gifKeyword` and no
`imageData` makes its own GIPHY search, even when several questions share a
keyword. When GIPHY refuses, nothing is stored, so the next save searches for all
of them again. Once the key is blocked, every remaining question still makes its
call. One publish of a 120-question adaptive quiz can use up the hour.

Fix in step 1 (shared by the publish path and the panel):

- Stop GIF searches for the rest of the run at the first 429 or limit error.
- One search per distinct keyword per run.
- After a limit refusal, don't search again on save for a while (~15 min, kept in
  memory). Publish goes ahead without the GIFs, with a notice.

Panel behaviour:

- **One search per distinct keyword**, asking for ~25 results (auto-fill asks for
  5 today). Questions with the same `gifKeyword` share the search.
- **Results are cached for the editing session**, keyed by keyword. Regenerate
  takes the next unused result from the cache and only searches again when the
  cached list is used up. Regenerating a GIF usually makes no request at all.
- **Before a run**, the confirm step says how many GIF searches it needs, e.g.
  "Generate 40 GIFs: 12 searches". Above ~50, it warns that searches are limited
  to about 100 per hour for the whole installation.
- **When GIPHY refuses** (HTTP 429, or the worker's error for it), the run stops
  its GIF searches, carries on with pictures and audio, and marks the rest
  "⚠️ GIF search limit reached — try again later". It does not retry in a loop.

**TTS: probably no limit** (owner's understanding, not 100% sure). Audio stays in
the existing batched request (`ensureTtsAudioBatchOnR2`), sent in chunks of ~25
items so one slow or failed request doesn't hold up the whole quiz, and the worker
skips clips that already exist. If a chunk fails, its rows are marked ⚠️ Failed
and the rest continue.

**Pictures** (Openverse from the browser, then Pexels through the worker): same
approach as GIFs, one search per distinct keyword with cached results, ~3 at a
time.

## To check before building

- ~~GIPHY: what the worker returns on a 429.~~ It returned a 502 with "HTTP 429" in
  the message; it now returns a 429 with `rateLimited: true` (step 1). The editor
  handles both, so it works before the worker is redeployed.
- ~~TTS batch cap.~~ `/api/tts/ensure-batch` takes up to 300 items per request, has
  no rate limit of its own, and synthesises one item after another.
- GIPHY production key: owner's decision whether to apply. Check GIPHY's current
  requirements for production approval first (e.g. attribution in the picker).
  Wizard-installed teacher instances each use their own key, so they keep Beta
  limits unless each teacher applies too.
- Performance of thumbnails for 120 rows: load lazily (`loading="lazy"`), and
  never render `data:` images at full size in the table.

## Steps

1. Refactor the auto-fill functions to accept a list of questions; add status
   detection helpers; add the GIPHY limit handling above (also fixes publish
   today). No other visible change.
2. The panel: table, summary line, filters, sorting, selection.
3. Bulk actions and progress, with cancel.
4. Replace / Set keyword / Change voice.

## Tests

- Status detection for each media combination (GIPHY vs R2 vs `data:` image,
  TTS vs file audio, reading-text and `pin` questions).
- Selection: Ctrl/⌘, Shift range across a filtered list, Ctrl+A only selects
  visible rows, selection survives sort.
- Generate missing on a selection touches only those questions.
- Regenerate never returns the current URL when another result exists.
- 40 GIF questions sharing 12 keywords make 12 searches; regenerating them again
  makes none.
- A 429 from GIF search stops further GIF searches, marks those rows, and lets
  pictures and audio finish.

## Built

### Step 1: search cache, GIPHY limit, status helpers (2026-09-28)

- `app.js`: `cachedMediaSearch` keeps one search per kind + keyword for the session
  (the promise is shared by concurrent callers; empty results are kept, failures
  dropped). `searchGifsForKeyword`, `searchImagesForKeyword` (Openverse, then
  Pexels) and `searchVideosForKeyword` use it and ask for 25 results.
- `giphySearch` marks a refusal (`rateLimited`, from a 429 or an older worker's
  "HTTP 429" message) and pauses automatic GIF searches for 15 minutes
  (`mediaSearchState.gifPausedUntil`); a successful search clears the pause.
- `autoFillImages(questions, onProgress)` and `autoFillVideos(questions, onProgress)`
  take a list of questions and return `outcomes` (question → `filled` / `failed` /
  `limited` + reason) for the panel. A GIF question held back by the limit is left
  empty, not given a picture instead. A GIF keyword with no results still falls
  back to the picture keyword, as before.
- `ensureQuizMediaReady` passes the quiz's questions and, when GIFs were held back,
  shows "⚠️ GIF search limit reached: N GIF(s) not added yet…" for 10 s.
- The GIF picker dialog explains the limit instead of showing the raw error.
- `questionMediaStatus(q, quiz)`, `isGifMediaUrl`, `mediaVersionTime`: the status
  the table will show (see "Status per question").
- `cloudflare/worker.js`: `/api/gifs/search` returns 429 `{ rateLimited: true }`
  when GIPHY does. Takes effect when the worker is next deployed.
- Tests: `tests/media-manager.test.js` (real `app.js` code, `fetch` stubbed).

### Step 2: the panel (2026-09-28)

- **🗂 Media** button next to "Collapse all" (`create/index.html`) opens
  `openMediaManager()`: a large dialog whose table scrolls while the summary line,
  filters and selection bar stay in view.
- Pure helpers (tested): `buildMediaRows` (one status per row: failed > missing >
  not uploaded > ready > none; a failure only shows while something is still
  missing), `filterMediaRows`, `sortMediaRows` (ties keep question order),
  `mediaSummaryCounts`, `nextMediaSelection` (click / Ctrl-⌘ / Shift / Ctrl-⌘+Shift
  over the visible order).
- Filters: level (incl. untagged), media (GIFs, pictures, videos, any audio, TTS,
  audio files, no media), status, question type, text (prompt + keywords + audio
  text). Summary counts are buttons that apply their filter. Column headers sort.
- Selection: rows and checkboxes; Ctrl/⌘+A selects every row shown; Esc clears the
  selection, then closes. Selection is held by question object and pruned when
  questions are deleted. The bar notes selected rows hidden by filters.
- Row: thumbnail (lazy, enlarges on hover), audio with ▶ preview (the builder's
  `previewBuilderQuestionAudio`), status with the failure reason on hover, last
  changed, ↗ to open the question in the builder.
- `mediaManagerState` keeps filters, sort, selection and this session's failures
  while the panel is closed; a language switch rebuilds it.
- The bulk action buttons come in step 3; the selection bar is where they go.
