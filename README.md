# PinPlay

Free, no-ads classroom quiz web app. Built for teachers who want to play, engage, and assess without subscriptions or corporate tech stacks.

## Why this exists

- ✅ 100% free hosting (GitHub Pages + optional Cloudflare Worker)
- ✅ No ads, no tracking, no paywall
- ✅ No student accounts needed (PIN + username, optional email for results)
- ✅ Teacher can create quiz in-app or import from JSON
- ✅ Assignment mode with due dates, attempt limits, exam mode, and deferred-feedback
- ✅ Full audio support with Edge TTS neural voices in multiple languages
- ✅ Built-in grading workflow (per-question and per-student focus modes)
- ✅ PDF export, GIF/image search, Google Drive publish, email notify
- ✅ Teacher password + rate-limited auth — safe to share quiz PINs publicly

## Features

### Question Types
- Multiple choice (MCQ)
- Multi-select (select all correct options)
- True / False
- Type answer (auto-checked, multiple accepted answers)
- Voice answer (auto-checked via Web Speech API; per-question recognition language with BCP-47 autocomplete, e.g. `es-ES`, `ca-ES`)
- Voice record (student-recorded audio, teacher-graded by playback)
- Open answer (teacher-graded)
- Speaking answer (teacher-graded oral mode)
- Image answer (student uploads or photographs an image as their answer; teacher-graded)
- Context gap (fill blanks, multiple accepted answers per blank)
- Match pairs (drag-and-drop matching)
- Error hunt (find and fix errors in text)
- Puzzle (rearrange pieces)
- Slider (numeric range selection)
- Pin answer (click on image, multiple correct zones supported)
- Poll mode (anonymous, no points, per-question toggle)

Audio (file upload or Edge TTS) is a per-question feature available on every type above — not a question type of its own.

### Quiz Builder (`/create/`)
- Visual builder with inline editing and per-question type icons
- Per-question points (0, 1000, 2000) and per-question time limit (0 = no limit)
- Per-question audio (upload MP3 or use TTS with language selection)
- Image support (upload, search web, or **auto-fill by keyword**)
  - Each question has an **Image keyword** field (e.g. "rubber band", "volcano")
  - Keep keywords to **3 words max** for best search results
  - On save/export, questions with a keyword and no image are auto-searched (Openverse + Pexels)
  - Leave the keyword empty to skip auto-image for that question
- GIF support via **GIPHY** integration (per-question GIF keyword + search; requires GIPHY API key)
- **Reading-text passages** (📖 button per question): paste a passage of up to 10,000 characters that appears centered in place of the image/GIF. Scrollable, non-selectable, non-copyable — designed for reading-comprehension prompts and as a soft anti-cheat surface against translation/AI tools. Mutually exclusive with image/GIF on the same question. Not available on `pin`.
- Large media (base64 images/audio) auto-extracted into Cloudflare R2 on save to avoid SQLite size limits
- **Drag-and-drop** files onto question rows; **batch attach** media files across multiple questions
- Local save via localStorage + JSON import/export (`.json` and `.txt` accepted)
- Multiple-file import with **append or replace** prompt, sorted by name
- Goal selection + batch-size input when generating quizzes from prompts
- Google Drive publish/open/delete (optional, via Apps Script bridge); cloud save skipped when quiz unchanged
- **PDF export** of the whole quiz (voice-record items rendered as written answers; pin questions skipped)
- Unified preview with simulated students, re-roll, and jump-to-question
- **Live preview** and **student preview** modes that auto-join in a new tab via URL parameter; auto-cleanup when tab closes
- Inline editing of answer choices with instant preview, poll mode toggle per question

### Live Game (Teacher → Projector Screen)
- Real-time game hosting via Cloudflare Worker + Durable Objects
- **Teacher password required** to create a live game and to host control (rate-limited; brute-force protected)
- Live hall with big PIN display + auto-updating player list
- **QR code** in the hall with auto-join parameter so students don't type the PIN
- Random student name mode (teacher can toggle before game starts; falls back to male names if female pool is empty)
- Teacher can remove/kick students from the lobby
- Full-screen projected question view with automatic scaling and staged question-intro animations
- Question audio with speed control (80%–100%) and YouTube video state preserved across re-renders
- Reaction emoji popups from students displayed on projector
- Immediate answer reveal for auto-graded questions in live mode
- Answer reveal with correct answer highlight and **structured diff** with visual indicators
- Drumroll → winner reveal sequence with animations
- Leaderboard with points, bet bonuses, and ranking
- Question timer with progress bar (visible on projector + student devices)
- Background ambient tracks (randomized answering music, hall loop, counter, drumroll, final fanfare)
- Ambient tracks stop/resume around question audio playback automatically
- **Mute music** toggle that pauses/resumes the current track seamlessly

### Student UI (`/`)
- Two-step join: validate 6-digit PIN → enter username (or random name) + password
- Compact single-line header: player name · mode · progress · time · score
- Header disappears when game starts for maximum screen space
- Questions and answer options displayed large and centered
- **Replay** button for question audio with VU-meter / equalizer animation while playing
- Press **P** key to play question audio (Edge TTS neural voice in quiz language, or uploaded audio file)
- Record buttons auto-lock during audio playback to prevent mic interference
- Voice-record questions get **silent speech recognition** with transcript stored alongside audio
- Reaction emojis (👍👏🔥😂🤯🙌☕🤔👀🧠😎🫶6️⃣7️⃣) next to submit button (live mode only, not assignments)
- Bet system: selectable +40% bonus/penalty toggle (live mode only, hidden in assignments)
- Question feedback as inline text with ✅/❌ emoji and correct answer reveal
- Live scoring + leaderboard at game end with "Game finished 🎉" header
- **Self-service login lookup**: students who forget their username/password can recover via email link

### Assignment Mode (`/?assignment=CODE`)
- Self-paced quiz with due date set by teacher
- Attempt limits (1–10), or 0 = unlimited (stays open until teacher closes)
- Password protection for assignment access
- **Exam mode** toggle: tracks focus-loss (tab switching / Alt-Tab) with styled count display and configurable notice
- **Deferred feedback** mode: hides score and correct answers until the student submits
- **Dirty answer tracking** in deferred mode (warns before navigating away from unsaved changes)
- **Review & edit** submitted answers: per-question navigator strip, sticky exit chip, read-only answer bar
- Keyboard navigation: Left/Right arrows or Spacebar to move between questions
- Random answering ambient tracks change with each question navigation (auto-pauses during voice recording)
- Submitted banner and unanswered navigation helper
- Students can **delete their own attempts** (when teacher permits)
- Closed assignments stay openable in review mode (no new attempts)
- Teacher attempt review with individual answer details and grading

### Grading Workflow
- **Grade by question** or **grade by student** focused modal with keyboard shortcuts
- Auto-play audio for voice-record answers; transcript shown side-by-side
- Per-question grading with onSavedRefresh; pending grading badge on each assignment title
- Teacher feedback overlay with student answer + structured correction diff
- Class filter, best-attempt filter, notified / not-notified filters, sortable results
- Roster cache for fast username lookups; host attempts enriched with class data
- Archived assignments toggle to keep the list clean

### Notify Students
- One-click selection of attempts → opens a pre-filled **Gmail compose** window per recipient
- Roster email lookup (single-call verified) so addresses come from the trusted student list
- Notify state stored on the attempt so you can filter "still needs notifying" next time
- Email-based **rekeying** for migrating attempts when a student username changes (with dry-run)

### Apply Quiz to Existing Assignment
- "Apply to Assignment" button updates the quiz behind a live assignment code without invalidating attempts already submitted

### Optional Classroom Audio Files
Put these in `/music/` (git-tracked with placeholders):
- `hall.mp3` → lobby background loop (teacher/projector only)
- `answering.mp3` → plays during question (teacher/projector only) — randomized with `answering2.mp3` through `answering11.mp3` if present
- `answered.mp3` → answer received sound (teacher/projector only)
- `counter.mp3` → countdown tick sound
- `drumrollwinner.mp3` → winner reveal drumroll
- `final.mp3` → game over fanfare

## Deploy Frontend (GitHub Pages)

1. Push repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from branch**
4. Branch: `main`, folder `/ (root)`

Frontend URLs (adjust for your repo):
- Student play: `https://<user>.github.io/pinplay/`
- Teacher create/host: `https://<user>.github.io/pinplay/create/`

## Deploy Backend (Cloudflare Worker + Durable Objects)

The live mode and assignment features need a backend. A ready Worker is included in `cloudflare/`.

### 1) Install & Login

```bash
npm i -g wrangler
wrangler login
```

### 2) Deploy

```bash
cd cloudflare
wrangler deploy
```

This prints a URL like `https://pinplay-api.<your-subdomain>.workers.dev`.

### 3) Connect Frontend

Update `DEFAULT_BACKEND_URL` in `app.js` if deploying to a different Worker URL than the preconfigured one.

### Required Environment Variables / Secrets

```bash
wrangler secret put EDGE_TTS_URL        # Edge TTS bridge URL (e.g. https://your-host/tts)
wrangler secret put EDGE_TTS_SECRET     # Shared secret for Edge TTS auth (optional)
```

### Optional Secrets

```bash
wrangler secret put DRIVE_SHARED_SECRET   # For Google Drive integration
wrangler secret put DRIVE_PUBLISH_URL     # Apps Script Web App URL for Drive bridge
wrangler secret put GOOGLE_CSE_KEY        # Google Custom Search API key (image search)
wrangler secret put GOOGLE_CSE_CX         # Google Custom Search Engine ID
wrangler secret put GIPHY_API_KEY         # GIPHY API key (per-question GIF search)
wrangler secret put TEACHER_PASSWORD      # Required to create live games / host
wrangler secret put LOGIN_LOOKUP_URL      # Self-service username/password lookup endpoint
wrangler secret put ROSTER_LOOKUP_URL     # Student roster email lookup (for notify flow)
wrangler secret put ROSTER_LOOKUP_SECRET  # Shared secret for roster lookup
```

The Worker also binds:

- **R2 bucket** for auto-extracted base64 media (images / audio) — keeps quiz JSON under the SQLite row limit
- **AUTH_RL** rate-limit binding for teacher password verification (IP-tracked, brute-force protected)

## Edge TTS Setup

PinPlay uses Microsoft Edge TTS neural voices for question audio in multiple languages. Students hear the quiz in the language set per-question (e.g., `ca-ES` for Catalan, `es-ES` for Spanish, `en-US` for English).

### Run a Bridge Service

A minimal bridge is at `cloudflare/edge_tts_bridge.py`:

```bash
pip install edge-tts fastapi uvicorn
export EDGE_TTS_SECRET="your_shared_secret"   # Windows: $env:EDGE_TTS_SECRET="..."
uvicorn cloudflare.edge_tts_bridge:app --host 0.0.0.0 --port 8788
```

It exposes `POST /tts` with body:

```json
{ "text": "Hello class", "voice": "en-US-AriaNeural", "rate": "0%" }
```

Then configure the Worker secrets (`EDGE_TTS_URL` and `EDGE_TTS_SECRET`) and redeploy.

## Google Drive Integration (Optional)

Enables **Publish to Drive**, **Open from Drive**, and **Delete from Drive** buttons in the quiz builder.

### 1) Create Apps Script Bridge

1. Go to https://script.google.com and create a new project.
2. Paste the script from `cloudflare/drive-bridge.gs`.
3. Set constants: `FOLDER_ID` (your Drive folder ID), `SHARED_SECRET` (long random string).
4. Deploy as **Web app** (Execute as: Me, Access: Anyone).

### 2) Configure Worker Secrets

```bash
wrangler secret put DRIVE_SHARED_SECRET  # paste same SHARED_SECRET
wrangler secret put DRIVE_PUBLISH_URL    # paste Apps Script Web app URL
wrangler deploy
```

## Keyboard Shortcuts

### Student UI
| Key | Action |
|-----|--------|
| **P** | Play question audio (TTS or uploaded file) |
| **←** | Previous question (assignment mode) |
| **→** | Next question (assignment mode) |
| **Space** | Next question (assignment mode) |

### Teacher UI
| Key | Action |
|-----|--------|
| **F** | Fullscreen projector view |

## Quiz JSON Format

```json
{
  "version": 1,
  "title": "Animals",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "prompt": "Which one is a vertebrate?",
      "points": 1000,
      "timeLimit": 20,
      "audioEnabled": true,
      "audioMode": "tts",
      "audioText": "",
      "language": "en-US-AriaNeural",
      "answers": [
        { "text": "Octopus", "correct": false },
        { "text": "Dog", "correct": true },
        { "text": "Snail", "correct": false }
      ],
      "isPoll": false
    },
    {
      "id": "q2",
      "type": "mcq",
      "prompt": "According to the passage, what is the main reason for the migration?",
      "points": 1000,
      "timeLimit": 0,
      "readingText": "Each autumn, monarch butterflies travel up to 4,800 km from Canada and the United States to central Mexico. The trigger is not a single weather event but a combination of shorter day length, falling temperatures, and the aging of milkweed — their only food plant. The trip takes one generation of butterflies several weeks; the return north is staged across three or four successive generations.",
      "answers": [
        { "text": "Shorter daylight and food-plant decline", "correct": true },
        { "text": "Predator pressure", "correct": false },
        { "text": "Magnetic field shifts", "correct": false }
      ],
      "isPoll": false
    }
  ]
}
```

## File Structure

```
pinplay/
├── index.html              # Student UI (join + play)
├── play.js                 # Student game logic (91 KB)
├── app.js                  # Teacher UI logic (285 KB)
├── styles.css              # Shared styles (43 KB)
├── favicon.svg             # 📌 favicon
├── create/
│   └── index.html          # Teacher builder + live host UI
├── music/                  # Ambient sound files (git-tracked placeholders)
├── cloudflare/
│   ├── worker.js           # Cloudflare Worker backend (~2,500 lines)
│   ├── wrangler.jsonc      # Wrangler deployment config
│   ├── edge_tts_bridge.py  # Edge TTS bridge service
│   ├── drive-bridge.gs     # Google Drive Apps Script bridge
│   └── deploy.cmd          # One-click deploy script
├── pinplay-template.json   # Starter quiz template (all question types)
├── quiz-template-all-question-types.json  # Reference template with all features
├── TASK_BOARD.md           # Development task tracking
├── TEACHER_GUIDE_BATCHES.md  # Teacher usage guide
├── QA_CHECKLIST.md         # Testing checklist
└── README.md               # This file
```

## Version History

### v0.6 (May 2026) — Grading, Notify, Exam Mode & Auth
- **Exam mode** for assignments: focus-loss tracking with styled count display and configurable start notice (audio gated until notice dismissed)
- **Teacher password** required for live game creation and host control, with IP-based rate limiting for failed attempts; token-based API authorization
- **Self-service login lookup**: students can recover their username/password via email link
- **Notify flow**: select attempts → opens pre-filled Gmail compose; roster email lookup; notified / not-notified filters
- **Email-based rekeying** for migrating attempts when a student's username changes (with dry-run)
- **Grading focus modal**: grade by question or by student with keyboard shortcuts and autoplay audio
- Pending-grading badge on assignment titles; archived assignments toggle; class filter; best-attempt filter; sortable results
- **Review & edit** submitted answers with per-question navigator strip and sticky exit chip
- **Deferred-feedback** assignments (hide score until submission) with dirty-answer warnings
- **Student-delete-own-attempt** and teacher delete-attempt endpoints
- **PDF export** of quizzes (voice-record items as written answers; pin questions skipped)
- **GIPHY** GIF search per question; **R2** auto-extraction of base64 media to avoid SQLite size limits
- **Drag-and-drop** files onto question rows; batch media attach across questions; multi-file import with append/replace
- **Live preview** + **student preview** in a new tab via auto-join URL parameter
- **Replay button** with VU-meter / equalizer animation; record buttons lock during playback
- **Mute music** button for ambient/game tracks (pause/resume, not stop)
- **QR code** with auto-join parameter in the live hall
- Voice-record questions get silent speech recognition with stored transcripts
- Voice-answer question type with BCP-47 recognition language and "or" alternatives in answer evaluation
- Error-hunt: live diff, textarea input, minimum-mistake variant tracking
- Context-gap: generic cue with gap count, enhanced grading
- YouTube iframe state preserved across re-renders; staged question-intro animations
- "Apply quiz to existing assignment" without invalidating prior attempts
- New Worker secrets: `GIPHY_API_KEY`, `TEACHER_PASSWORD`, `LOGIN_LOOKUP_URL`, `ROSTER_LOOKUP_URL`, `ROSTER_LOOKUP_SECRET`; new R2 + AUTH_RL bindings

### v0.5 (March 2026) — Student UI & Audio Overhaul
- Redesigned student UI: compact header, maximum screen space for questions
- Edge TTS neural voice playback in quiz language (student-side, press P key)
- Audio file support (student-side plays uploaded MP3 if present)
- Bet system simplified: toggle +40% bonus/penalty
- Reaction emojis sent to projector (live mode only, not assignments)
- Assignment mode: keyboard navigation, random ambient tracks per question, unlimited attempts (0 = unlimited)
- Live mode: ambient tracks play after question audio ends, randomized per question
- Answer feedback with correct answer reveal and ✅/❌ emoji
- Layout: header top, content centered, submit bottom

### v0.4 (February 2026) — Core Release
- 14 question types including poll mode, slider, pin answer
- Live game hosting via Cloudflare Worker + Durable Objects
- Assignment mode with due dates and attempt limits
- Google Drive integration for quiz publishing
- Edge TTS integration for teacher audio playback
- Real-time reactions, leaderboard, timer system
- Full-screen projector view with animations

## License

Free to use. No ads, no tracking, no paywall.

Built for classrooms. 🎯
