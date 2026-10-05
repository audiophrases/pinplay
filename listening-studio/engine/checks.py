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


# Number words outside English (0-20 and the tens), so "deux" = "2".
NUMBER_WORDS = {
    'French': 'zero un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt',
    'Spanish': 'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte',
    'Italian': 'zero uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici quattordici quindici sedici diciassette diciotto diciannove venti',
    'Portuguese': 'zero um dois tres quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete dezoito dezenove vinte',
    'German': 'null eins zwei drei vier funf sechs sieben acht neun zehn elf zwolf dreizehn vierzehn funfzehn sechzehn siebzehn achtzehn neunzehn zwanzig',
}
NUMBER_TENS = {
    'French': {'trente': 30, 'quarante': 40, 'cinquante': 50, 'soixante': 60},
    'Spanish': {'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90},
    'Italian': {'trenta': 30, 'quaranta': 40, 'cinquanta': 50, 'sessanta': 60, 'settanta': 70, 'ottanta': 80, 'novanta': 90},
    'Portuguese': {'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90},
    'German': {'dreissig': 30, 'vierzig': 40, 'funfzig': 50, 'sechzig': 60, 'siebzig': 70, 'achtzig': 80, 'neunzig': 90},
}
FILLERS_ANY = FILLERS | {'euh', 'heu', 'bah', 'ben', 'eh', 'eeh', 'mmm', 'pues', 'ehm', 'ahm'}


def _plain(text):
    """Lower case, no accents, ligatures spelled out, apostrophes split words."""
    import unicodedata
    s = text.lower().replace('\u2019', "'").replace('œ', 'oe').replace('æ', 'ae').replace('ß', 'ss')
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return re.findall(r'[a-z0-9]+', s.replace('-', ' '))


def _sound(word, language):
    """A rough "how it sounds" form, so spellings that sound the same match
    (Whisper picks a spelling): silent letters, doubles, a few equivalences."""
    w = re.sub(r'(.)\1+', r'\1', word)
    if language == 'French':
        w = w.replace('ph', 'f').replace('qu', 'k').replace('h', '').replace('eau', 'o').replace('au', 'o')
        w = re.sub(r'(?<=.)(es|e|s|x|t|d|z)$', '', w)
        w = re.sub(r'(?<=.)(s|t|d|x)$', '', w)
    elif language == 'Spanish':
        w = w.replace('h', '').replace('v', 'b').replace('ll', 'y').replace('z', 's')
        w = re.sub(r'c(?=[ei])', 's', w)
    elif language in ('Italian', 'Portuguese'):
        w = w.replace('h', '')
    elif language == 'German':
        w = w.replace('ph', 'f').replace('dt', 't')
    return w


def _words(text, language):
    """Words as heard: numbers as digits, fillers out, spellings evened out."""
    if language == 'English':
        return normalise(text, True)
    units = {w: n for n, w in enumerate(NUMBER_WORDS.get(language, '').split())}
    tens = NUMBER_TENS.get(language, {})
    words = _plain(text)
    out, i = [], 0
    while i < len(words):
        w = words[i]
        if w in tens:
            v = tens[w]
            if i + 1 < len(words) and words[i + 1] in units and units[words[i + 1]] < 10:
                v += units[words[i + 1]]
                i += 1
            if i + 1 < len(words) and words[i + 1] == 'et' and i + 2 < len(words) and words[i + 2] in ('un', 'onze'):
                v += units[words[i + 2]]
                i += 2
            out.append(str(v))
        elif w in units and w not in ('un', 'uno', 'um', 'eins'):  # "un/uno" are also "a"
            out.append(str(units[w]))
        elif w not in FILLERS_ANY:
            out.append(w)
        i += 1
    joined = []
    for w in out:
        if w.isdigit() and joined and joined[-1].isdigit():
            joined[-1] += w
        else:
            joined.append(w)
    return joined


# How close the sound of the whole line must be: above OK it counts as the
# same; between MINOR and OK it is shown "check by ear" (not remade
# automatically); below MINOR the words really differ.
OK_SIMILARITY = 0.93
MINOR_SIMILARITY = 0.8


def compare(script_text, heard, language='English'):
    """{'level': 'ok' | 'minor' | 'differs', 'similarity', 'diffs'}.
    Lines are compared by sound, not spelling: Whisper chooses a spelling
    ("tu as" / "tu a", "le Louvre" / "l'ouvre"), which says nothing about
    the recording."""
    a, b = _words(script_text, language), _words(heard, language)
    sa = ''.join(a if language == 'English' else (_sound(w, language) for w in a))
    sb = ''.join(b if language == 'English' else (_sound(w, language) for w in b))
    similarity = difflib.SequenceMatcher(None, sa, sb).ratio() if (sa or sb) else 1.0
    matcher = difflib.SequenceMatcher(None, a, b)
    diffs = [f"'{' '.join(a[i1:i2])}' → '{' '.join(b[j1:j2])}'"
             for op, i1, i2, j1, j2 in matcher.get_opcodes() if op != 'equal']
    # Whisper is reliable in English: there a changed word is a real difference.
    ok_at, minor_at = (1.01, 0.9) if language == 'English' else (OK_SIMILARITY, MINOR_SIMILARITY)
    if a == b or similarity >= ok_at:
        level = 'ok'
    elif similarity >= minor_at:
        level = 'minor'
    else:
        level = 'differs'
    return {'level': level, 'similarity': round(similarity, 3), 'diffs': [] if level == 'ok' else diffs}


class WordChecker:
    def __init__(self):
        from faster_whisper import WhisperModel
        self.model = WhisperModel('small', device='cpu', compute_type='int8')

    def hear(self, clip, language='English', sr=24000):
        """What Whisper hears in a clip (sr: its sample rate). Whisper takes
        16 kHz audio: a 24 kHz line given as it is would be heard 1.5 times
        too slow and too low, and its words misheard."""
        if sr != 16000:
            import librosa
            clip = librosa.resample(np.asarray(clip, dtype=np.float32), orig_sr=sr, target_sr=16000)
        segs, _info = self.model.transcribe(clip, language=WHISPER_LANG.get(language, 'en'), beam_size=5)
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
