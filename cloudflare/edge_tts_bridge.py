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
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import edge_tts


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: str = "0%"


app = FastAPI()
SECRET = os.getenv("EDGE_TTS_SECRET", "").strip()


@app.post("/tts")
async def tts(req: TTSRequest, authorization: str | None = Header(default=None)):
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
        communicate = edge_tts.Communicate(text=text, voice=req.voice, rate=req.rate)
        await communicate.save(out_path)
        return FileResponse(out_path, media_type="audio/mpeg", filename="tts.mp3")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Edge TTS failed: {e}")
