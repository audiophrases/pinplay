"""Sound production for the Listening Studio (LISTENING_STUDIO_PLAN.md 6d):
levels, the four effects (phone, PA, far, radio), sounds (chime, ring,
beep), backgrounds, the timeline of one recording, and MP3 export.
Plain numpy/scipy: no ffmpeg needed. Everything is mono float32 at SR."""
import json
import math

import numpy as np
from scipy.signal import butter, sosfilt

SR = 24000  # Qwen3-TTS output rate

SPACING = {'tight': 0.15, 'natural': 0.3, 'relaxed': 0.6}  # seconds between lines
SOUND_GAP = 0.6  # before a chime, ring or beep
OVERLAP = 0.45   # a ">>" line starts this long before the previous one ends
TOGETHER = 0.06  # second voice of "Mia + Tom" joins this much later
SPEECH_DB = -20.0
WHISPER_DB = -25.0


def db_gain(db):
    return 10 ** (db / 20)


def rms_db(x):
    return 20 * math.log10(max(float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0, 1e-9))


def level(x, target_db=SPEECH_DB):
    return (x * db_gain(target_db - rms_db(x))).astype(np.float32) if len(x) else x


def silence(seconds):
    return np.zeros(int(round(seconds * SR)), dtype=np.float32)


def _band(x, lo=None, hi=None, order=4):
    if lo and hi:
        sos = butter(order, [lo, hi], btype='bandpass', fs=SR, output='sos')
    elif hi:
        sos = butter(order, hi, btype='lowpass', fs=SR, output='sos')
    else:
        sos = butter(order, lo, btype='highpass', fs=SR, output='sos')
    return sosfilt(sos, x).astype(np.float32)


def _echoes(dry, taps, tail=0.7):
    out = np.concatenate([dry, silence(tail)])
    for delay_ms, db in taps:
        start = int(delay_ms / 1000 * SR)
        out[start:start + len(dry)] += dry * db_gain(db)
    return out


# ---------------------------------------------------------------- effects
def phone(x):
    """The other end of a phone call: only 300-3400 Hz, a little louder."""
    return _band(x, 300, 3400) * db_gain(3)


def pa(x):
    """Station / airport announcer: a thin speaker in a big echoing hall."""
    return _echoes(_band(x, 250, 4500), [(90, -9), (180, -14), (300, -19), (450, -25)])


def far(x):
    """Someone calling from a distance: muffled, quieter, a little room."""
    return _echoes(_band(x, hi=2000) * db_gain(-6), [(70, -10), (150, -16), (260, -22)], tail=0.4)


def radio(x, rng=None):
    """A radio presenter: narrow band, slightly driven, a faint hiss."""
    rng = rng or np.random.default_rng(7)
    y = np.tanh(2.0 * _band(x, 400, 3200)) / np.tanh(2.0)
    return (y + rng.standard_normal(len(y)).astype(np.float32) * db_gain(-55)).astype(np.float32)


EFFECTS = {'phone': phone, 'pa': pa, 'far': far, 'radio': radio}


# ---------------------------------------------------------------- sounds
def _tone(freqs, seconds, db, fade_out=None):
    t = np.arange(int(seconds * SR)) / SR
    y = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    env = np.ones_like(y)
    fi = int(0.01 * SR)
    env[:fi] = np.linspace(0, 1, fi)
    fo = int((fade_out if fade_out is not None else seconds * 0.85) * SR)
    env[-fo:] = np.linspace(1, 0, fo)
    return (y * env * db_gain(db)).astype(np.float32)


def chime():
    return np.concatenate([_tone([f], 0.45, -14) for f in (659, 523, 784)] + [silence(0.2)])


def ring():
    burst = _tone([400, 450], 0.4, -20, fade_out=0.02)
    one = np.concatenate([burst, silence(0.2), burst, silence(1.4)])
    return np.concatenate([one, one])


def beep():
    return np.concatenate([_tone([1000], 0.3, -18, fade_out=0.03), silence(0.1)])


SOUNDS = {'chime': chime, 'ring': ring, 'beep': beep}


# ---------------------------------------------------------------- backgrounds
def ambience(seconds, kind, rng=None):
    n = int(seconds * SR)
    rng = rng or np.random.default_rng(11)
    if kind in ('', 'none') or n <= 0:
        return np.zeros(n, dtype=np.float32)
    noise = rng.standard_normal(n).astype(np.float32)
    if kind == 'room':
        out = level(_band(noise, hi=2000), -56)
    elif kind in ('hall', 'station'):
        out = level(_band(noise, hi=400), -42) + level(rng.standard_normal(n).astype(np.float32), -62)
    elif kind == 'outdoors':
        t = np.arange(n) / SR
        gust = 0.65 + 0.35 * np.sin(2 * np.pi * 0.13 * t) * np.sin(2 * np.pi * 0.05 * t + 1.0)
        out = level(_band(noise, hi=1200), -42) * gust.astype(np.float32)
    else:
        return np.zeros(n, dtype=np.float32)
    fade = min(int(1.5 * SR), n // 2)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out.astype(np.float32)


# ---------------------------------------------------------------- the timeline
def build_part(items, voices, clips, spacing='natural', ambience_kind='none', cues=None):
    """One recording from one part of a parsed script.
    items: the part's items (listening-script.js). voices: { Name: {effect} }.
    clips: for line number k (index in items) a list of float arrays, one per
    speaker. Returns a float32 array. If a list is given as cues, each spoken
    line is added to it as {s, e, who, text} (seconds): PinPlay's timings."""
    gap = SPACING.get(spacing, SPACING['natural'])
    placed = []  # (start_seconds, audio)
    cursor = 0.4
    for k, it in enumerate(items):
        if it['type'] == 'pause':
            cursor += float(it.get('seconds', 1.5))
            continue
        if it['type'] == 'sound':
            seg = SOUNDS[it['sound']]()
            start = cursor + SOUND_GAP
            placed.append((start, seg))
            cursor = start + len(seg) / SR
            continue
        segs = []
        quiet = 'whisper' in (it.get('direction') or '').lower()
        for speaker, clip in zip(it['speakers'], clips[k]):
            effect = it.get('effect') or (voices.get(speaker) or {}).get('effect') or ''
            seg = level(clip, WHISPER_DB if quiet else SPEECH_DB)
            if effect in EFFECTS:
                seg = EFFECTS[effect](seg)
            segs.append(seg)
        start = max(0.4, cursor - OVERLAP) if it.get('overlap') else cursor + gap
        end = start
        for j, seg in enumerate(segs):
            placed.append((start + j * TOGETHER, seg))
            end = max(end, start + j * TOGETHER + len(seg) / SR)
            cursor = max(cursor, start + j * TOGETHER + len(seg) / SR)
        if cues is not None:
            cues.append({'s': round(start, 2), 'e': round(end, 2), 'who': ' + '.join(it['speakers']), 'text': it['text']})
    total = cursor + 0.6
    out = np.zeros(int(total * SR) + 1, dtype=np.float32)
    for start, seg in placed:
        a = int(start * SR)
        out[a:a + len(seg)] += seg[:len(out) - a]
    out += ambience(len(out) / SR, ambience_kind)
    peak = float(np.max(np.abs(out))) if len(out) else 0
    if peak > 0.98:
        out *= 0.98 / peak
    return out


def timings_tag(cues):
    """An ID3v2.3 tag with the timings in a TXXX frame named "PinPlay timings"
    (JSON, ASCII only). PinPlay reads it when the MP3 is added to a listening
    section, then uploads the audio without it."""
    rows = [[c['s'], c['e'], c.get('who', ''), c['text']] for c in cues]
    value = json.dumps({'v': 1, 'cues': rows}, ensure_ascii=True, separators=(',', ':')).encode('ascii')
    body = b'\x00' + b'PinPlay timings\x00' + value
    frame = b'TXXX' + len(body).to_bytes(4, 'big') + b'\x00\x00' + body
    size = len(frame)
    syncsafe = bytes([(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f])
    return b'ID3\x03\x00\x00' + syncsafe + frame


def to_vtt(cues):
    """The same timings as WebVTT subtitles, for PinPlay or any player."""
    def clock(t):
        ms = int(round(t * 1000))
        return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}'
    out = ['WEBVTT', '']
    for c in cues:
        out.append(f"{clock(c['s'])} --> {clock(c['e'])}")
        text = c['text'].replace('-->', '->')
        out.append(f"<v {c['who']}>{text}" if c.get('who') else text)
        out.append('')
    return '\n'.join(out)


def to_mp3(x, kbps=96):
    """Mono MP3 (24 kHz) bytes, for PinPlay's section recording."""
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    return bytes(enc.encode(pcm) + enc.flush())
