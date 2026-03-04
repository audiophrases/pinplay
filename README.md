# PinPlay

Free, no-ads classroom quiz web app.

## Why this exists

- ✅ 100% free hosting (GitHub Pages)
- ✅ No ads
- ✅ No student accounts needed
- ✅ Teacher can create quiz in-app
- ✅ Import/export quiz as JSON

## Current MVP (v0.1)

- Quiz builder with:
  - Multiple choice
  - True / False
  - Type answer
- Per-question points: `0`, `1000`, `2000`
- Per-question time limit field (stored in quiz model)
- Local save (`localStorage`)
- JSON import/export
- Basic play mode + scoring

## Not yet (planned)

- Live multiplayer (real host + many devices)
- Real countdown timer enforcement
- Puzzle / slider / pin-on-image question types
- Teacher reports & exportable results
- Cloud sync (optional)

## Run locally

Just open `index.html` in your browser.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Source: **Deploy from branch**.
4. Branch: `main` / folder `/ (root)`.
5. Save.

Your app will be available at:

`https://audiophrases.github.io/pinplay/`

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
