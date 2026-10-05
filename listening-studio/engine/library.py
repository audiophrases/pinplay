"""The voice library: voice samples any character of any recording can use
in fixed-voice mode (the copy model copies them like a designed sample).
A sample comes from outside (a person reading, a free recording, another
voice program) or is saved from a recording's designed voice.

Each voice is two files in the library folder: <id>.wav (mono, audio.SR,
trimmed, levelled) and <id>.json {id, name, text, seconds, created, source}.
"text" must be exactly what the sample says: the copy model needs it.

Adding an outside sample loads Whisper (to write its words down), so the
server runs it in a process of its own:
  python -m engine.library add LIBRARY SOURCE LANGUAGE NAME
prints the new voice as JSON."""
import json
import os
import re
import sys
import time
import uuid

import numpy as np
import soundfile as sf

from . import audio

MAX_SECONDS = 15   # longer samples are cut at a pause: more adds nothing
MIN_SECONDS = 3    # shorter ones copy badly


def library_of(recording_folder):
    """The library next to the recordings: <data>/recordings/<id> → <data>/library."""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(recording_folder))), 'library')


def _valid(vid):
    return bool(re.fullmatch(r'[a-z0-9]{8,32}', vid or ''))


def wav_path(lib, vid):
    return os.path.join(lib, f'{vid}.wav')


def get(lib, vid):
    """The voice, or None if it isn't (or no longer) in the library."""
    if not _valid(vid) or not os.path.exists(wav_path(lib, vid)):
        return None
    try:
        with open(os.path.join(lib, f'{vid}.json'), encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def all_voices(lib):
    if not os.path.isdir(lib):
        return []
    out = [get(lib, f[:-5]) for f in os.listdir(lib) if f.endswith('.json')]
    return sorted([v for v in out if v], key=lambda v: (v.get('name') or '').lower())


def _save_meta(lib, meta):
    path = os.path.join(lib, f"{meta['id']}.json")
    with open(path + '.tmp', 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    os.replace(path + '.tmp', path)


def update(lib, vid, name=None, text=None):
    meta = get(lib, vid)
    if not meta:
        return None
    if name is not None and str(name).strip():
        meta['name'] = str(name).strip()[:80]
    if text is not None and str(text).strip():
        meta['text'] = ' '.join(str(text).split())[:600]
    _save_meta(lib, meta)
    return meta


def delete(lib, vid):
    if not _valid(vid):
        return
    for ext in ('.wav', '.json'):
        try:
            os.remove(os.path.join(lib, vid + ext))
        except OSError:
            pass


def _new(lib, clip, name, text, source, **extra):
    os.makedirs(lib, exist_ok=True)
    vid = uuid.uuid4().hex[:12]
    tmp = os.path.join(lib, f'{vid}.part.wav')
    sf.write(tmp, clip, audio.SR)
    os.replace(tmp, wav_path(lib, vid))
    meta = {'id': vid, 'name': (str(name or '').strip() or 'My voice')[:80], 'text': ' '.join(str(text).split()),
            'seconds': round(len(clip) / audio.SR, 1), 'created': time.time(), 'source': source, **extra}
    _save_meta(lib, meta)
    return meta


def save_designed(lib, sample_file, text, name):
    """A recording's designed voice sample, kept for other recordings."""
    clip, sr = sf.read(sample_file, dtype='float32')
    if clip.ndim > 1:
        clip = clip.mean(axis=1)
    return _new(lib, clip, name, text, 'designed')


def prepare(source):
    """Any audio file (MP3, WAV, M4A from a phone, OGG, WebM…) → a clean
    sample: mono at audio.SR, silence trimmed, at most MAX_SECONDS (cut at
    the quietest moment near the end, not in the middle of a word), levelled."""
    import librosa
    from faster_whisper import decode_audio
    try:
        clip = np.asarray(decode_audio(source, sampling_rate=audio.SR), dtype=np.float32)
    except Exception:
        raise ValueError('This file could not be opened as a recording: use an MP3, WAV or phone recording (M4A).')
    clip, _ = librosa.effects.trim(clip, top_db=35)
    if len(clip) > MAX_SECONDS * audio.SR:
        hop = int(0.05 * audio.SR)
        start, end = int(10 * audio.SR), int(MAX_SECONDS * audio.SR)
        rms = librosa.feature.rms(y=clip[start:end], frame_length=hop * 2, hop_length=hop)[0]
        clip = clip[:start + int(np.argmin(rms)) * hop]
        clip, _ = librosa.effects.trim(clip, top_db=35)
    if len(clip) < MIN_SECONDS * audio.SR:
        raise ValueError(f'The sample is too short ({len(clip) / audio.SR:.1f} s of speech): use 5–15 seconds of one person talking.')
    clip = audio.level(clip)
    peak = float(np.max(np.abs(clip))) or 1.0
    if peak > 0.95:
        clip = clip * (0.95 / peak)
    fade = int(0.01 * audio.SR)
    clip[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
    clip[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    return clip.astype(np.float32)


def set_extra(lib, vid, **fields):
    """Adds details (where a voice came from, its credit) to a voice."""
    meta = get(lib, vid)
    if meta:
        meta.update(fields)
        _save_meta(lib, meta)
    return meta


def add_known(lib, wav, name, text, **extra):
    """A sample whose words are known exactly (a catalog voice made of whole
    sentences): prepared like a file, never cut, no Whisper needed."""
    clip, sr = sf.read(wav, dtype='float32')
    if clip.ndim > 1:
        clip = clip.mean(axis=1)
    clip = audio.level(clip)
    peak = float(np.max(np.abs(clip))) or 1.0
    if peak > 0.95:
        clip = clip * (0.95 / peak)
    return _new(lib, clip.astype(np.float32), name, text, 'catalog', **extra)


def add_file(lib, source, language, name):
    """An outside sample: prepared, its words written down by Whisper (the
    teacher can correct them), added to the library."""
    from .checks import WordChecker
    clip = prepare(source)
    text = WordChecker().hear(clip, language, audio.SR).strip()
    if not text:
        raise ValueError('No speech was heard in this file.')
    return _new(lib, clip, name, text, 'file')


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if len(sys.argv) != 6 or sys.argv[1] != 'add':
        sys.exit('Usage: python -m engine.library add LIBRARY SOURCE LANGUAGE NAME')
    try:
        print('@@' + json.dumps(add_file(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]), ensure_ascii=False), flush=True)
    except ValueError as err:  # shown to the teacher as it is
        print('@@' + json.dumps({'error': str(err)}, ensure_ascii=False), flush=True)
    except Exception as err:
        print('@@' + json.dumps({'error': f'This file could not be used as a voice sample ({err.__class__.__name__}: {err}).'}), flush=True)

