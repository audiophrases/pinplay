# PinPlay neural-voice (Edge TTS) bridge

This tiny service lets PinPlay read questions aloud in natural-sounding voices.
Each teacher hosts **their own** copy on a free [Render](https://render.com)
account, so it never shares anyone else's limits. If you skip it, audio still
works using the device's built-in voice.

The PinPlay setup wizard walks you through this automatically.

## One-click deploy (easiest)

Click this button (or open the link), sign in to Render, and **Apply** the Blueprint —
Render reads `render.yaml` at the repo root and provisions everything:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/audiophrases/pinplay)

```text
https://render.com/deploy?repo=https://github.com/audiophrases/pinplay
```

When it shows **Live**, copy the service URL and paste it back into the wizard.

## Deploy by hand (fallback)

1. Create a free account / log in at <https://render.com> (no credit card needed).
2. Click **New ➜ Web Service**.
3. Open the **"Public Git Repository"** tab and paste:

   ```text
   https://github.com/audiophrases/pinplay
   ```

4. Click **Connect**, then set:

   - **Root Directory:** `setup/tts-bridge`
   - **Language:** Python 3 (auto-detected)
   - **Build Command:** `pip install -r requirements.txt` (auto-filled)
   - **Start Command:** `uvicorn edge_tts_bridge:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** **Free**

5. Click **Deploy Web Service** and wait until it says **Live**.
6. Copy the service URL (looks like `https://pinplay-tts-bridge.onrender.com`) and
   paste it back into the wizard.

**Optional:** set an `EDGE_TTS_SECRET` environment variable in Render to require a
shared bearer token; if you do, set the same value as the worker's `EDGE_TTS_SECRET`
secret. Leaving it unset is fine for classroom use.

> Note: Render's free tier spins the service down after inactivity, so the first
> question read aloud after an idle period may take ~30–50s to wake. After that it
> is fast.
