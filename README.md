# PinPlay

Free, no-ads classroom quiz web app.

## Why this exists

- ✅ 100% free hosting (GitHub Pages + optional Cloudflare Worker)
- ✅ No ads
- ✅ No student accounts needed
- ✅ Teacher can create quiz in-app
- ✅ Import/export quiz as JSON

## Current features (v0.2)

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
- **Create side (teacher)**
  - Protected with password: `1234.`
  - Build quiz and host live game
  - Shows projected question view (question + options)
- **Play side (students only)**
  - Join by 6-digit PIN and name
  - Students answer on their devices
  - Live scoring + leaderboard

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

Frontend URL:

`https://audiophrases.github.io/pinplay/`

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
