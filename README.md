# PinPlay

Free, no-ads classroom quiz web app.

## Why this exists

- ✅ 100% free hosting (GitHub Pages + optional Cloudflare Worker)
- ✅ No ads
- ✅ No student accounts needed
- ✅ Teacher can create quiz in-app
- ✅ Import/export quiz as JSON

## Current features (v0.3)

### Builder
- Multiple choice
- Multi-select (more than one correct answer; students must select all correct options)
- True / False
- Type answer
- Puzzle
- Quiz + Audio (browser speech synthesis)
- Slider
- Pin answer (image + target zone)
- Per-question points: `0`, `1000`, `2000`
- Per-question time limit field
- Local save (`localStorage`)
- JSON import/export

### Classroom flow
- **Create side (teacher)** — `.../pinplay/create/`
  - Protected with password: `1234.`
  - Build quiz and host live game
  - Live hall with big PIN + auto-updating player list
  - Option to force random acceptable student names
  - Teacher can remove/kick students (e.g., inappropriate nicknames)
  - Projected question view (question + options)
- **Play side (students only)** — `.../pinplay/`
  - Two-step join: validate 6-digit PIN, then join
  - Open-name mode OR random-name mode (set by teacher before creating game)
  - Same browser/device client rejoins the same player (no duplicate join)
  - Students answer on their devices
  - Live scoring + leaderboard

### Optional classroom audio files
Put these in `/music` (already git-tracked with placeholders):
- `hall.mp3` → hall/lobby background loop (teacher page only)
- `answering.mp3` → question appears (teacher page only)
- `answered.mp3` → answer submitted/received (teacher page only)

## What is still planned

- Real timer enforcement (currently informational)
- Better reports / exports
- Optional cloud quiz bank sync
- Higher polish for anti-cheat / host controls

## Deploy frontend (GitHub Pages)

1. Push repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from branch**
4. Branch: `main`, folder `/ (root)`

Frontend URLs:

- Student play: `https://audiophrases.github.io/pinplay/`
- Teacher create/host: `https://audiophrases.github.io/pinplay/create/`

## Deploy free backend (Cloudflare Worker + Durable Objects)

The live mode needs a backend. A ready Worker is included in `cloudflare/`.

### 1) Install Wrangler

```bash
npm i -g wrangler
```

### 2) Login to Cloudflare

```bash
wrangler login
```

### 3) Deploy

```bash
cd cloudflare
wrangler deploy
```

This prints a URL like:

`https://pinplay-api.<your-subdomain>.workers.dev`

### 4) Connect app to backend

The frontend is preconfigured to use:

`https://pinplay-api.eugenime.workers.dev`

If you deploy to a different Worker URL, update `DEFAULT_BACKEND_URL` in `app.js`.

## Optional: Publish quizzes directly to Google Drive

This adds a **Publish to Drive** button in Teacher Create.

### A) Create Google Apps Script bridge

1. Go to https://script.google.com and create a new project.
2. Paste the script from `cloudflare/drive-bridge.gs`.
3. Set these constants inside the script:
   - `FOLDER_ID` = your Drive folder ID (`1NKH51CDu2rGeOB1VCyTA8NtkvLuf1STZ`)
   - `SHARED_SECRET` = any long random string
4. Deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web app URL.

### B) Set Worker env vars and redeploy

From `cloudflare/`:

```bash
wrangler secret put DRIVE_SHARED_SECRET
# paste same value as SHARED_SECRET

wrangler secret put DRIVE_PUBLISH_URL
# paste Apps Script Web app URL

wrangler deploy
```

After that, Teacher Create supports:
- **Publish to Drive** (save current quiz JSON)
- **Open from Drive** (list recent JSON files and load one into builder)

> If you update `drive-bridge.gs`, redeploy the Apps Script Web App so new endpoints are active.

## Quiz JSON format (example)

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
      "answers": [
        { "text": "Octopus", "correct": false },
        { "text": "Dog", "correct": true },
        { "text": "Snail", "correct": false },
        { "text": "Spider", "correct": false }
      ]
    }
  ]
}
```
