"""Automatic checks (LISTENING_STUDIO_PLAN.md 6c):
- words: Whisper hears each line and compares it with the script, treating
  Whisper's own habits as equal (digits and number words, British and
  American spellings, fillers), so only real changes are flagged;
- voice age: a voice sample whose pitch is far above an adult's for the
  gender described gets a "sounds very young" warning."""
import difflib
import re

import numpy as np

WHISPER_LANG = {'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it',
                'Portuguese': 'pt', 'Russian': 'ru', 'Chinese': 'zh', 'Japanese': 'ja', 'Korean': 'ko'}

UNITS = {w: n for n, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen '
                                    'fourteen fifteen sixteen seventeen eighteen nineteen'.split())}
TENS = {w: 10 * (n + 2) for n, w in enumerate('twenty thirty forty fifty sixty seventy eighty ninety'.split())}
SPELLING = {'mom': 'mum', 'moms': 'mums', 'canceled': 'cancelled', 'color': 'colour', 'favorite': 'favourite',
            'center': 'centre', 'theater': 'theatre', 'gray': 'grey', 'apologize': 'apologise', 'realize': 'realise',
            'signaling': 'signalling', 'traveling': 'travelling', 'okay': 'ok', 'organize': 'organise'}
FILLERS = {'um', 'uh', 'er', 'erm', 'hmm', 'mm', 'ah'}


def normalise(text, english=True):
    s = text.lower().replace('’', "'").replace('alright', 'all right')
    tokens = re.findall(r"[^\W_]+(?:'[^\W_]+)*", s)
    if not english:
        return tokens
    out, i = [], 0
    while i < len(tokens):
        t = tokens[i]
        if t in TENS:
            v = TENS[t]
            if i + 1 < len(tokens) and tokens[i + 1] in UNITS and UNITS[tokens[i + 1]] < 10:
                v += UNITS[tokens[i + 1]]
                i += 1
            out.append(str(v))
        elif t in UNITS:
            out.append(str(UNITS[t]))
        elif t not in FILLERS:
            out.append(SPELLING.get(t, t))
        i += 1
    joined = []
    for t in out:  # "10 15" and "1015" are the same time
        if t.isdigit() and joined and joined[-1].isdigit():
            joined[-1] += t
        else:
            joined.append(t)
    return joined


def compare(script_text, heard, language='English'):
    """(ok, differences). Outside English only case and punctuation are
    ignored, so a small difference is tolerated there."""
    english = language == 'English'
    a, b = normalise(script_text, english), normalise(heard, english)
    if a == b:
        return True, []
    matcher = difflib.SequenceMatcher(None, a, b)
    diffs = [f"'{' '.join(a[i1:i2])}' → '{' '.join(b[j1:j2])}'"
             for op, i1, i2, j1, j2 in matcher.get_opcodes() if op != 'equal']
    return (not english and matcher.ratio() >= 0.9), diffs


class WordChecker:
    def __init__(self):
        from faster_whisper import WhisperModel
        self.model = WhisperModel('small', device='cpu', compute_type='int8')

    def hear(self, audio, language='English'):
        segs, _info = self.model.transcribe(audio, language=WHISPER_LANG.get(language, 'en'), beam_size=5)
        return ' '.join(s.text.strip() for s in segs)


FEMALE = re.compile(r'\b(woman|women|female|lady|girl|mother|mum|mom|grandmother|gran|she|her)\b', re.I)
MALE = re.compile(r'\b(man|men|male|gentleman|boy|father|dad|grandfather|grandad|he|his)\b', re.I)
CHILD = re.compile(r'\b(child|kid|little|boy|girl|toddler|aged? (?:[2-9]|1[0-2])\b)', re.I)


def median_pitch(audio, sr):
    import librosa
    y = librosa.resample(audio, orig_sr=sr, target_sr=16000) if sr != 16000 else audio
    f0, voiced, _ = librosa.pyin(y, fmin=60, fmax=600, sr=16000)
    f0 = f0[voiced & ~np.isnan(f0)]
    return float(np.median(f0)) if len(f0) else None


def age_warning(description, pitch):
    """A plain-language warning when an adult voice sounds like a child's."""
    if not pitch or CHILD.search(description or ''):
        return ''
    if FEMALE.search(description or '') and pitch > 290:
        return f'Sounds very young ({pitch:.0f} Hz; adult women usually speak at about 165–255 Hz).'
    if MALE.search(description or '') and not FEMALE.search(description or '') and pitch > 190:
        return f'Sounds very young or high ({pitch:.0f} Hz; adult men usually speak at about 85–155 Hz).'
    return ''
