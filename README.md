# PinPlay

Free, no-ads classroom quiz web app. Built for teachers who want to play, engage, and assess without subscriptions or corporate tech stacks.

## Why this exists

- ✅ 100% free hosting (GitHub Pages + optional Cloudflare Worker)
- ✅ No ads
- ✅ No student accounts needed
- ✅ Teacher can create quiz in-app
- ✅ Import/export quiz as JSON
- ✅ Assignment mode with due dates and attempt limits
- ✅ Full audio support with Edge TTS neural voices in multiple languages

## Features

### Question Types
- Multiple choice (MCQ)
- Multi-select (select all correct options)
- True / False
- Type answer (auto-checked, multiple accepted answers)
- Open answer (teacher-graded)
- Speaking answer (teacher-graded oral mode)
- Image open answer (teacher-graded)
- Context gap (fill blanks, multiple accepted answers per blank)
- Match pairs (drag-and-drop matching)
- Error hunt (find and fix errors in text)
- Puzzle (rearrange pieces)
- Audio question (per-question audio file or TTS)
- Slider (numeric range selection)
- Pin answer (click on image, multiple correct zones supported)
- Poll mode (anonymous, no points, per-question toggle)

### Quiz Builder (`/create/`)
- Visual builder with inline editing
- Per-question points (0, 1000, 2000)
- Per-question time limit (0 = no limit)
- Per-question audio (upload MP3 or use TTS with language selection)
- Image support (upload, search web, or **auto-fill by keyword**)
  - Each question has an **Image keyword** field (e.g. "rubber band", "volcano")
  - Keep keywords to **3 words max** for best search results
  - On save/export, questions with a keyword and no image are auto-searched (Openverse + Pexels)
  - Leave the keyword empty to skip auto-image for that question
  - New quizzes default to "Don't hear questions" in the audio/language dropdown at the top
- Local save via localStorage + JSON import/export
- Hybrid cloud storage: ☁️ Open/Save uses a shared Google Drive folder while live/assignment media stays on Cloudflare R2
- Unified preview with simulated students, re-roll, and jump-to-question
- Inline editing of answer choices with instant preview
- Poll mode toggle per question

### Live Game (Teacher → Projector Screen)
- Real-time game hosting via Cloudflare Worker + Durable Objects
- Live hall with big PIN display + auto-updating player list
- Random student name mode (teacher can toggle before game starts)
- Teacher can remove/kick students from the lobby
- Full-screen projected question view with automatic scaling
- Question audio with speed control (80%–100%)
- Reaction emoji popups from students displayed on projector
- Answer reveal with correct answer highlight and inline correction diff
- Drumroll → winner reveal sequence with animations
- Leaderboard with points, bet bonuses, and ranking
- Question timer with progress bar (visible on projector + student devices)
- Background ambient tracks (randomized answering music, hall loop, counter, drumroll, final fanfare)
- Ambient tracks stop/resume around question audio playback automatically

### Student UI (`/`)
- Two-step join: validate 6-digit PIN → enter username (or random name) + password
- Compact single-line header: player name · mode · progress · time · score
- Header disappears when game starts for maximum screen space
- Questions and answer options displayed large and centered
- Play button removed; press **P** key to play question audio (Edge TTS neural voice in quiz language, or uploaded audio file)
- Reaction emojis (👍👏🔥😂🤯🙌☕🤔👀🧠😎🫶6️⃣7️⃣) next to submit button (live mode only, not assignments)
- Bet system: selectable +40% bonus/penalty toggle (live mode only, hidden in assignments)
- Question feedback as inline text with ✅/❌ emoji and correct answer reveal
- Live scoring + leaderboard at game end with "Game finished 🎉" header

### Assignment Mode (`/?assignment=CODE`)
- Self-paced quiz with due date set by teacher
- Attempt limits (1–10), or 0 = unlimited (stays open until teacher closes)
- Password protection for assignment access
- Keyboard navigation: Left/Right arrows or Spacebar to move between questions
- Random answering ambient tracks change with each question navigation
- Submitted banner and unanswered navigation helper
- Teacher attempt review with individual answer details and grading

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
wrangler secret put DRIVE_SHARED_SECRET # For Google Drive integration
wrangler secret put DRIVE_PUBLISH_URL   # Apps Script Web App URL for Drive bridge
wrangler secret put GOOGLE_CSE_KEY      # Google Custom Search API key (image search)
wrangler secret put GOOGLE_CSE_CX       # Google Custom Search Engine ID
```

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

Enables the quiz builder's shared **☁️ Open (Drive)** / **☁️ Save (Drive)** workflow. In hybrid mode, quiz JSON lives in the configured Drive folder while live games and assignments still use the Worker + R2 backend for media delivery. The worker now treats Drive as the only cloud library for quiz open/save, and the Drive bridge supports reopening, updating, and deleting files directly from the configured folder.

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
