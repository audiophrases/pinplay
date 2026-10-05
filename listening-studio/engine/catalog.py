"""🌍 Find a voice: ready-made voices from open recordings, listed in
catalog/voices.json (made by catalog/build_catalog.py, which explains the
sources and licences). A voice's clips are fetched only when the teacher
listens to it or adds it, one row at a time from the Hugging Face dataset
viewer, joined into one sample and kept in <data>/catalog-cache."""
import io
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import numpy as np
import soundfile as sf

from . import audio

CATALOG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'catalog', 'voices.json')
ROWS = 'https://datasets-server.huggingface.co/rows'
GAP = 0.35  # seconds between a voice's sentences
_cache = {}


class Busy(Exception):
    """The online source can't be reached right now: the teacher tries later."""


def load():
    mtime = os.path.getmtime(CATALOG)
    if _cache.get('mtime') != mtime:
        with open(CATALOG, encoding='utf-8') as fh:
            data = json.load(fh)
        _cache.update(mtime=mtime, data=data, by_key={v['key']: v for v in data['voices']})
    return _cache['data']


def voice(key):
    load()
    return _cache['by_key'].get(key)


def _get(url, timeout=60):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'PinPlay-Listening-Studio'})
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.read()
        except urllib.error.HTTPError as err:
            last = err
            if err.code < 500 and err.code != 429:
                break
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            last = err
        time.sleep(2 + 3 * attempt)
    raise Busy(f'The voice collection online is busy or out of reach right now ({last}). Try again in a minute.')


def _clip_urls(v):
    """The audio file of each of the voice's rows (the viewer's links expire
    after a while, so they are asked for each time)."""
    src = load()['sources'][v['source']]
    offsets = v['offsets']
    first, count = min(offsets), max(offsets) - min(offsets) + 1
    query = urllib.parse.urlencode({'dataset': src['dataset'], 'config': v['config'], 'split': v['split'],
                                    'offset': first, 'length': min(count, 100)})
    data = json.loads(_get(f'{ROWS}?{query}'))
    if data.get('error'):
        raise Busy(f"The voice collection online answered: {data['error']} Try again in a minute.")
    rows = {first + i: r['row'] for i, r in enumerate(data.get('rows') or [])}
    urls = []
    for off in offsets:
        audio_cell = (rows.get(off) or {}).get('audio')
        if isinstance(audio_cell, list):
            audio_cell = audio_cell[0] if audio_cell else None
        if not audio_cell or not audio_cell.get('src'):
            raise Busy('This voice could not be found online any more. Choose another one.')
        urls.append(audio_cell['src'])
    return urls


def _decode(data):
    try:
        clip, sr = sf.read(io.BytesIO(data), dtype='float32')
    except Exception:
        from faster_whisper import decode_audio
        return np.asarray(decode_audio(io.BytesIO(data), sampling_rate=audio.SR), dtype=np.float32)
    if clip.ndim > 1:
        clip = clip.mean(axis=1)
    if sr != audio.SR:
        import librosa
        clip = librosa.resample(clip, orig_sr=sr, target_sr=audio.SR).astype(np.float32)
    return clip


def sample(key, cache_dir):
    """The voice's sample (its clips joined) as a WAV file path: fetched once."""
    v = voice(key)
    if not v:
        raise KeyError(key)
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{key.replace('/', '-')}.wav")
    if os.path.exists(path):
        return path
    import librosa
    pieces = []
    for url in _clip_urls(v):
        clip, _ = librosa.effects.trim(_decode(_get(url)), top_db=35)
        if pieces:
            pieces.append(np.zeros(int(GAP * audio.SR), dtype=np.float32))
        pieces.append(clip)
    joined = audio.level(np.concatenate(pieces).astype(np.float32))
    tmp = path[:-4] + '.part.wav'
    sf.write(tmp, joined, audio.SR)
    os.replace(tmp, path)
    return path
