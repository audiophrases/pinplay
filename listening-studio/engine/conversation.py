"""A conversation recorded on the phone (Convo Recorder, Phone-Mirror repo)
as a studio recording: the teacher reviews its lines, edits them, and every
line keeps its real audio unless its words changed. A PinPlay recording
session (volunteers' takes, VOICE_ACTORS_PLAN.md) comes in the same way
(kind 'session', from_session below): any number of speakers, one take per
line, and the lines nobody recorded said by the studio.

Convo Recorder gives a 48 kHz stereo WAV (left = the teacher's microphone,
right = ChatGPT) and a .json of utterances with exact times. On import each
utterance becomes a line with its own clip (cut from its speaker's channel),
and each speaker gets a voice sample made of their own clips, so a changed
line can be said in the same voice by the copy model.

A line is { id, ch (1 or 2; 1..n in a session), text, said (what its clip
says), start, end (where its clip is in the source), gap (a session's pause
before it, seconds), mode }, mode being
  'original'  its clip from the conversation (the default; fixing a
              misheard word keeps it),
  'record'    the teacher's own take, recorded in the studio (until one is
              recorded, the copied voice stands in),
  'voice'     the speaker's voice copied by the studio.
A take belongs to the words it says: editing the line again needs a new one."""
import hashlib
import io
import json
import math
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import numpy as np
import soundfile as sf

from . import audio

PAD_BEFORE = 0.12  # the phone's speech detector cuts close to the first sound
PAD_AFTER = 0.2
SAMPLE_MIN, SAMPLE_GOOD, SAMPLE_MAX = 5.0, 8.0, 15.0  # seconds of a speaker's voice sample
DEFAULT_SPEAKERS = {'1': 'Me', '2': 'ChatGPT'}
LANGUAGES = ('English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean')
MAX_TAKE_BYTES = 10 * 1024 * 1024  # PinPlay keeps takes under 3 MB


def _key(*parts):
    return hashlib.sha1(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:16]


def _write(path, clip):
    tmp = f'{path[:-4]}.part.wav'
    sf.write(tmp, clip, audio.SR)
    os.replace(tmp, path)


def _fade(clip, seconds=0.01):
    n = min(int(seconds * audio.SR), len(clip) // 2)
    if n:
        clip[:n] *= np.linspace(0, 1, n, dtype=np.float32)
        clip[-n:] *= np.linspace(1, 0, n, dtype=np.float32)
    return clip


def _resample(x, sr):
    if sr == audio.SR:
        return x.astype(np.float32)
    from scipy.signal import resample_poly
    g = math.gcd(audio.SR, sr)
    return resample_poly(x, audio.SR // g, sr // g).astype(np.float32)


def original_file(folder, lid):
    return os.path.join(folder, 'original', f'{lid}.wav')


def take_file(folder, line):
    return os.path.join(folder, 'takes', f"{line['id']}-{_key(line['text'])}.wav")


def voice_file(folder, ch):
    return os.path.join(folder, 'voices', f'convo-{ch}.wav')


# ---------------------------------------------------------------- import
def read_segments(path):
    """Convo Recorder's .json: [{speaker, start, end, text}] in time order."""
    with open(path, encoding='utf-8') as fh:
        data = json.load(fh)
    segs = data.get('segments') if isinstance(data, dict) else None
    if not isinstance(segs, list):
        raise ValueError('This is not a Convo Recorder transcript (.json).')
    return sorted(segs, key=lambda s: float(s.get('start') or 0))


def build(folder, wav, segments):
    """Cuts every utterance from its speaker's channel and makes each
    speaker's voice sample. Returns the recording's 'conversation'."""
    info = sf.info(wav)
    if info.channels != 2:
        raise ValueError('This is not a Convo Recorder recording (it needs two channels: you and ChatGPT).')
    sr, length = info.samplerate, info.frames / info.samplerate
    os.makedirs(os.path.join(folder, 'original'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'voices'), exist_ok=True)
    lines = []
    with sf.SoundFile(wav) as f:
        for seg in segments:
            text = ' '.join(str(seg.get('text') or '').split())
            ch = int(seg.get('speaker') or 0)
            if not text or ch not in (1, 2):
                continue
            a = max(0.0, float(seg['start']) - PAD_BEFORE)
            b = min(length, float(seg['end']) + PAD_AFTER)
            if b - a < 0.2:
                continue
            f.seek(int(a * sr))
            data = f.read(int((b - a) * sr), dtype='float32', always_2d=True)
            lid = uuid.uuid4().hex[:8]
            _write(original_file(folder, lid), _fade(_resample(data[:, ch - 1], sr)))
            lines.append({'id': lid, 'ch': ch, 'text': text, 'said': text, 'start': round(a, 3), 'end': round(b, 3),
                          'mode': 'original'})
    if not lines:
        raise ValueError('No speech was found in this conversation\'s transcript.')
    conv = {'speakers': dict(DEFAULT_SPEAKERS), 'lines': lines, 'voices': {}, 'language': 'English'}
    for ch in (1, 2):
        voice = _make_voice(folder, ch, lines)
        if voice:
            conv['voices'][str(ch)] = voice
    return conv


def _make_voice(folder, ch, lines):
    """A speaker's voice sample from their own clips: one clip of 8-15 s if
    there is one, else consecutive clips joined. None with too little speech."""
    clips = []
    for line in lines:
        if line['ch'] == ch and os.path.exists(original_file(folder, line['id'])):
            clip, _ = sf.read(original_file(folder, line['id']), dtype='float32')
            clips.append((line, clip))
    if not clips:
        return None
    seconds = lambda c: len(c) / audio.SR  # noqa: E731
    single = [lc for lc in clips if SAMPLE_GOOD <= seconds(lc[1]) <= SAMPLE_MAX]
    if single:
        chosen = [max(single, key=lambda lc: seconds(lc[1]))]
    else:
        best, run = [], []
        for lc in clips:  # the longest run of clips that fits
            run.append(lc)
            while sum(seconds(c) for _, c in run) > SAMPLE_MAX and len(run) > 1:
                run.pop(0)
            if sum(seconds(c) for _, c in run) > sum(seconds(c) for _, c in best):
                best = list(run)
        chosen = best
    gap = audio.silence(0.3)
    joined = np.concatenate([part for _, c in chosen for part in (c, gap)][:-1])
    if len(joined) / audio.SR < SAMPLE_MIN * 0.6:
        return None
    joined = audio.level(joined)
    peak = float(np.max(np.abs(joined))) or 1.0
    if peak > 0.95:
        joined *= 0.95 / peak
    _write(voice_file(folder, ch), joined.astype(np.float32))
    said = lambda line: line.get('said') or line['text']  # noqa: E731
    return {'from': [line['id'] for line, _ in chosen], 'words': {line['id']: said(line) for line, _ in chosen},
            'text': ' '.join(said(line) for line, _ in chosen)}


# ---------------------------------------------------------------- from a PinPlay recording session
def _download(url):
    req = Request(url, headers={'User-Agent': 'PinPlay-Listening-Studio'})
    with urlopen(req, timeout=30) as res:
        data = res.read(MAX_TAKE_BYTES + 1)
    if len(data) > MAX_TAKE_BYTES:
        raise ValueError('This take is far too big.')
    return data


def auto_trim(clip):
    """The speech in a take, in ms, as PinPlay's review finds it (voice-actors.js
    vaAutoTrim): 20 ms windows against the take's own noise floor, with a
    little air kept at both ends."""
    win = max(1, round(audio.SR * 0.02))
    total = round(len(clip) / audio.SR * 1000)
    n = len(clip) // win + (1 if len(clip) % win else 0)
    if not n:
        return 0, total
    padded = np.zeros(n * win, dtype=np.float32)
    padded[:len(clip)] = clip
    counts = np.full(n, win)
    counts[-1] = len(clip) - (n - 1) * win
    rms = np.sqrt((padded.reshape(n, win) ** 2).sum(axis=1) / counts)
    ordered = np.sort(rms)
    threshold = max(ordered[int(n * 0.1)] * 3, ordered[-1] * 0.1, 0.003)
    loud = np.nonzero(rms > threshold)[0]
    if not len(loud):
        return 0, total
    return max(0, int(loud[0]) * 20 - 120), min(total, (int(loud[-1]) + 1) * 20 + 200)


def session_clip(url, trim, hosts, fetch=_download):
    """A volunteer's take, from PinPlay's media only, as a clip: mono at
    audio.SR, cut at the teacher's trim ({s, e} in ms) or the automatic one.
    Returns (clip, (start, end) in seconds)."""
    from faster_whisper import decode_audio  # PyAV: reads the browsers' WebM, MP4 and Ogg
    u = urlparse(str(url))
    if u.scheme != 'https' or u.hostname not in hosts or not u.path.startswith('/api/media/voice-actors/'):
        raise ValueError('Not a take from PinPlay.')
    try:
        clip = np.asarray(decode_audio(io.BytesIO(fetch(url)), sampling_rate=audio.SR), dtype=np.float32)
    except ValueError:
        raise
    except Exception:
        raise ValueError('This take could not be downloaded or opened.')
    total = len(clip) / audio.SR * 1000
    if isinstance(trim, dict) and isinstance(trim.get('s'), (int, float)) and isinstance(trim.get('e'), (int, float)):
        s = max(0.0, min(float(trim['s']), total))
        e = max(s + 20, min(float(trim['e']), total))
    else:
        s, e = auto_trim(clip)
    piece = clip[int(s / 1000 * audio.SR):int(e / 1000 * audio.SR)]
    if len(piece) < 0.2 * audio.SR:
        raise ValueError('This take is too short.')
    return _fade(piece.copy()), (round(s / 1000, 3), round(e / 1000, 3))


def from_session(folder, raw_lines, hosts, language=None, fetch=_download):
    """A PinPlay recording session as a conversation: every line with a take
    (one the teacher didn't send back with Redo) keeps it as its clip, the
    others are said by the studio. The script's characters are the speakers.
    Voices are never copied from a volunteer's takes here: only when the
    teacher chooses it for that person (copy_voice)."""
    os.makedirs(os.path.join(folder, 'original'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'voices'), exist_ok=True)
    speakers, lines, jobs = {}, [], []
    for raw in list(raw_lines or [])[:400]:
        text = ' '.join(str(raw.get('text') or '').split())[:600]
        if not text:
            continue
        name = ' '.join(str(raw.get('speaker') or '').split())[:40] or 'Speaker'
        ch = speakers.setdefault(name, len(speakers) + 1)
        line = {'id': uuid.uuid4().hex[:8], 'ch': ch, 'text': text, 'mode': 'voice',
                'sessionLine': str(raw.get('id') or '')[:40]}
        gap = raw.get('gap')
        if isinstance(gap, (int, float)) and not isinstance(gap, bool) and 0 <= gap <= 10:
            line['gap'] = round(float(gap), 2)
        lines.append(line)
        if raw.get('take') and raw.get('status') != 'redo':
            jobs.append((line, raw['take'], raw.get('trim')))
    if not lines:
        raise ValueError('This recording session has no lines.')

    def one(job):
        line, url, trim = job
        try:
            clip, (a, b) = session_clip(url, trim, hosts, fetch)
        except ValueError:
            return False
        _write(original_file(folder, line['id']), clip)
        line.update({'mode': 'original', 'said': line['text'], 'start': a, 'end': b})
        return True

    with ThreadPoolExecutor(4) as pool:
        failed = sum(1 for ok in pool.map(one, jobs) if not ok)
    return {'kind': 'session', 'speakers': {str(ch): name for name, ch in speakers.items()}, 'lines': lines,
            'voices': {}, 'language': language if language in LANGUAGES else 'English', 'failed': failed}


def copy_voice(folder, conv, ch, copy):
    """A session speaker's voice copied from their own takes (only when the
    teacher chooses it: the student must agree), or back to a designed voice.
    Returns the conversation."""
    voices = dict(conv.get('voices') or {})
    if copy:
        voice = _make_voice(folder, int(ch), conv['lines'])
        if not voice:
            raise ValueError('There is not enough of their recorded speech to copy (at least about 3 seconds).')
        voices[str(ch)] = voice
    else:
        voices.pop(str(ch), None)
        if os.path.exists(voice_file(folder, ch)):
            os.remove(voice_file(folder, ch))
    return {**conv, 'voices': voices}


# ---------------------------------------------------------------- the lines
def source(folder, line):
    """Where a line's audio comes from: ('original' | 'take', file) for real
    audio, or ('voice', None) when the studio says it (also for a 'record'
    line that has no take yet)."""
    if line.get('mode', 'original') == 'original' and os.path.exists(original_file(folder, line['id'])):
        return 'original', original_file(folder, line['id'])
    if line.get('mode') == 'record' and os.path.exists(take_file(folder, line)):
        return 'take', take_file(folder, line)
    return 'voice', None


def speaker_name(conv, ch):
    return (conv.get('speakers') or {}).get(str(ch)) or DEFAULT_SPEAKERS.get(str(ch), f'Speaker {ch}')


def voice_of(folder, conv, name):
    """{ch, file, text} for the voice copied from this speaker's clips, or None."""
    for ch, voice in (conv.get('voices') or {}).items():
        if speaker_name(conv, ch) == name and os.path.exists(voice_file(folder, ch)):
            return {'ch': ch, 'file': voice_file(folder, ch), 'text': voice['text']}
    return None


def clean(conv, lines, speakers=None, language=None):
    """The teacher's edited lines and names, checked: ids are kept, a new
    line gets one, only known modes and speakers."""
    known = {line['id']: line for line in conv['lines']}
    names = dict(conv.get('speakers') or DEFAULT_SPEAKERS)
    out = []
    for raw in lines or []:
        text = ' '.join(str(raw.get('text') or '').split())[:600]
        if not text:
            continue
        old = known.get(str(raw.get('id') or ''))
        ch = int(raw.get('ch') or (old or {}).get('ch') or 1)
        line = {'id': old['id'] if old else uuid.uuid4().hex[:8], 'ch': ch if str(ch) in names else 1, 'text': text,
                'mode': raw.get('mode') if raw.get('mode') in ('original', 'record', 'voice') else 'record'}
        for key in ('gap', 'sessionLine'):  # from a recording session
            if old and key in old:
                line[key] = old[key]
        if old and old.get('start') is not None:
            line['start'], line['end'] = old['start'], old['end']
            # What the clip says: corrected while the line uses its clip.
            line['said'] = text if line['mode'] == 'original' else old.get('said') or old['text']
        elif line['mode'] == 'original':
            line['mode'] = 'record'  # a new line has no clip
        out.append(line)
    for ch, name in (speakers or {}).items():
        name = ' '.join(str(name or '').split())[:40]
        if str(ch) in names and name and name not in [v for k, v in names.items() if k != str(ch)]:
            names[str(ch)] = name
    # A voice sample says its clips' words: a misheard word corrected in a
    # line that still uses its clip is corrected in the sample too.
    by_id = {line['id']: line for line in out}
    for voice in (conv.get('voices') or {}).values():
        for i in voice['from']:
            if i in by_id and by_id[i]['mode'] == 'original':
                voice['words'][i] = by_id[i]['text']
        voice['text'] = ' '.join(voice['words'][i] for i in voice['from'])
    cleaned = {**conv, 'lines': out, 'speakers': names}
    if language in LANGUAGES:
        cleaned['language'] = language
    return cleaned


def script_of(conv, title):
    """The parsed-script shape the engine makes recordings from; each line
    knows its conversation line ('convo')."""
    items = [{'type': 'line', 'speakers': [speaker_name(conv, line['ch'])], 'direction': '', 'effect': '',
              'text': line['text'], 'overlap': False, 'convo': line['id'],
              **({'gap': line['gap']} if line.get('gap') is not None else {})} for line in conv['lines']]
    return {'title': title, 'language': conv.get('language') or 'English', 'ambience': 'none', 'voices': {},
            'parts': [{'label': '', 'items': items}], 'notes': []}


def text_of(script):
    """The same as a script text (shown, and copied as a transcript)."""
    head = [f"TITLE: {script['title']}", f"LANGUAGE: {script['language']}", '']
    return '\n'.join(head + [f"{it['speakers'][0]}: {it['text']}" for p in script['parts'] for it in p['items']])


def save_take(folder, line, upload):
    """The teacher's own take of a line (any browser recording): mono at
    audio.SR, silence trimmed, a short fade."""
    import librosa
    from faster_whisper import decode_audio
    try:
        clip = np.asarray(decode_audio(upload, sampling_rate=audio.SR), dtype=np.float32)
    except Exception:
        raise ValueError('The recording could not be opened. Record it again.')
    clip, _ = librosa.effects.trim(clip, top_db=35)
    if len(clip) < 0.3 * audio.SR:
        raise ValueError('Nothing was heard in the recording: check the microphone and record it again.')
    clip = np.concatenate([audio.silence(0.05), _fade(clip.astype(np.float32)), audio.silence(0.05)])
    os.makedirs(os.path.join(folder, 'takes'), exist_ok=True)
    _write(take_file(folder, line), clip)
