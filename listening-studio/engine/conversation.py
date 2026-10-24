"""A conversation recorded on the phone (Convo Recorder, Phone-Mirror repo)
as a studio recording: the teacher reviews its lines, edits them, and every
line keeps its real audio unless its words changed.

Convo Recorder gives a 48 kHz stereo WAV (left = the teacher's microphone,
right = ChatGPT) and a .json of utterances with exact times. On import each
utterance becomes a line with its own clip (cut from its speaker's channel),
and each speaker gets a voice sample made of their own clips, so a changed
line can be said in the same voice by the copy model.

A line is { id, ch (1 or 2), text, said (what its clip says), start, end,
mode }, mode being
  'original'  its clip from the conversation (the default; fixing a
              misheard word keeps it),
  'record'    the teacher's own take, recorded in the studio (until one is
              recorded, the copied voice stands in),
  'voice'     the speaker's voice copied by the studio.
A take belongs to the words it says: editing the line again needs a new one."""
import hashlib
import json
import math
import os
import uuid

import numpy as np
import soundfile as sf

from . import audio

PAD_BEFORE = 0.12  # the phone's speech detector cuts close to the first sound
PAD_AFTER = 0.2
SAMPLE_MIN, SAMPLE_GOOD, SAMPLE_MAX = 5.0, 8.0, 15.0  # seconds of a speaker's voice sample
DEFAULT_SPEAKERS = {'1': 'Me', '2': 'ChatGPT'}


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
        if line['ch'] == ch:
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
    return {'from': [line['id'] for line, _ in chosen], 'words': {line['id']: line['text'] for line, _ in chosen},
            'text': ' '.join(line['text'] for line, _ in chosen)}


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


def clean(conv, lines, speakers=None):
    """The teacher's edited lines and names, checked: ids are kept, a new
    line gets one, only known modes and speakers."""
    known = {line['id']: line for line in conv['lines']}
    out = []
    for raw in lines or []:
        text = ' '.join(str(raw.get('text') or '').split())[:600]
        if not text:
            continue
        old = known.get(str(raw.get('id') or ''))
        ch = int(raw.get('ch') or (old or {}).get('ch') or 1)
        line = {'id': old['id'] if old else uuid.uuid4().hex[:8], 'ch': ch if ch in (1, 2) else 1, 'text': text,
                'mode': raw.get('mode') if raw.get('mode') in ('original', 'record', 'voice') else 'record'}
        if old and old.get('start') is not None:
            line['start'], line['end'] = old['start'], old['end']
            # What the clip says: corrected while the line uses its clip.
            line['said'] = text if line['mode'] == 'original' else old.get('said') or old['text']
        elif line['mode'] == 'original':
            line['mode'] = 'record'  # a new line has no clip
        out.append(line)
    names = dict(conv.get('speakers') or DEFAULT_SPEAKERS)
    for ch, name in (speakers or {}).items():
        name = ' '.join(str(name or '').split())[:40]
        if str(ch) in ('1', '2') and name and name not in [v for k, v in names.items() if k != str(ch)]:
            names[str(ch)] = name
    # A voice sample says its clips' words: a misheard word corrected in a
    # line that still uses its clip is corrected in the sample too.
    by_id = {line['id']: line for line in out}
    for voice in (conv.get('voices') or {}).values():
        for i in voice['from']:
            if i in by_id and by_id[i]['mode'] == 'original':
                voice['words'][i] = by_id[i]['text']
        voice['text'] = ' '.join(voice['words'][i] for i in voice['from'])
    return {**conv, 'lines': out, 'speakers': names}


def script_of(conv, title):
    """The parsed-script shape the engine makes recordings from; each line
    knows its conversation line ('convo')."""
    items = [{'type': 'line', 'speakers': [speaker_name(conv, line['ch'])], 'direction': '', 'effect': '',
              'text': line['text'], 'overlap': False, 'convo': line['id']} for line in conv['lines']]
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
