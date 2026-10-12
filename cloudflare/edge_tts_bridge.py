#!/usr/bin/env python3
"""
Minimal Edge TTS bridge for PinPlay.

Run:
  pip install edge-tts fastapi uvicorn
  set EDGE_TTS_SECRET=your_shared_secret   (Windows)
  uvicorn edge_tts_bridge:app --host 0.0.0.0 --port 8788

Endpoint:
  POST /tts
  body: {"text":"...","voice":"en-US-AriaNeural","rate":"0%"}
  auth: Authorization: Bearer <EDGE_TTS_SECRET>   (optional if secret unset)
"""

import os
import tempfile
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import edge_tts
import edge_tts.communicate as _edge_comm
from aiohttp import WSServerHandshakeError

# Microsoft is moving Edge Read Aloud to a new host (2026-10, rany2/edge-tts#490);
# the legacy host now answers 403 for many regions. The new host still accepts the
# legacy Sec-MS-GEC token, so try it first and fall back to the legacy host.
_LEGACY_WSS = _edge_comm.WSS_URL
_TOKEN = _LEGACY_WSS.split("TrustedClientToken=")[-1]
_WSS_URLS = [
    f"wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key={_TOKEN}",
    _LEGACY_WSS,
]


async def synthesize_to_file(text, voice, rate, out_path):
    last = None
    for wss in _WSS_URLS:
        _edge_comm.WSS_URL = wss
        try:
            await edge_tts.Communicate(text=text, voice=voice, rate=rate).save(out_path)
            return
        except WSServerHandshakeError as e:
            last = e
    raise last


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: str = "+0%"


app = FastAPI()
SECRET = os.getenv("EDGE_TTS_SECRET", "").strip()


@app.get("/health")
async def health():
    return {"ok": True, "service": "edge-tts-bridge"}


@app.post("/tts")
async def tts(req: TTSRequest, background_tasks: BackgroundTasks, authorization: str | None = Header(default=None)):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")

    if SECRET:
        token = (authorization or "").replace("Bearer", "").strip()
        if token != SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized")

    fd, out_path = tempfile.mkstemp(suffix=".mp3", prefix="edge_tts_")
    os.close(fd)

    try:
        await synthesize_to_file(text, req.voice, req.rate, out_path)
        
        # Define a cleanup function to delete the file after response is sent
        def cleanup():
            try:
                if os.path.exists(out_path):
                    os.remove(out_path)
            except Exception:
                pass

        background_tasks.add_task(cleanup)

        return FileResponse(
            out_path, 
            media_type="audio/mpeg", 
            filename="tts.mp3",
            background=background_tasks
        )
    except Exception as e:
        # Cleanup in case of error too
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail={"error": f"Edge TTS failed: {e}"})
