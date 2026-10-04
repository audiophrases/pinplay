"""One recording project: a parsed script (listening-script.js) and its
settings become voice samples, lines, checks and one MP3 per part.

Everything is cached by what it depends on (voice, mode, text, direction,
take), so a change only redoes what changed. Lines whose words don't match
the script are tried once more with a new take (LISTENING_STUDIO_PLAN.md 6c).
The teacher's settings (all optional):
  mode         'fixed' (default) or 'acted', for every character
  modes        { Name: 'fixed' | 'acted' } per character
  descriptions { Name: description } overriding the script's VOICE line
  sampleTakes  { Name: n } "New voice sample"
  lineTakes    { 'part:item:Name': n } "Try again" on one line
  batch        True (default): several lines per call
  spacing      'tight' | 'natural' | 'relaxed'
  ambience     a background overriding the script's AMBIENCE
  check        True (default): the word check and automatic retry"""
import hashlib
import json
import os
import re
import time

import numpy as np
import soundfile as sf

from . import audio
from .checks import WordChecker, age_warning, compare, median_pitch
from .voices import NEUTRAL, Stopped, Voices  # noqa: F401 (Stopped is used by the server)

DEFAULTS = {'mode': 'fixed', 'modes': {}, 'descriptions': {}, 'sampleTakes': {}, 'lineTakes': {},
            'batch': True, 'spacing': 'natural', 'ambience': None, 'check': True}
# More lines per call is faster, but a batch of 8 ran out of memory (16 GB)
# when copying a voice: 4 is the safe size on this PC.
MAX_BATCH = 4
# For a speaker the script gave no VOICE line: clearly different voices.
AUTO_VOICES = [
    'An adult woman in her thirties with a clear, warm, mid-range voice.',
    'An adult man in his forties with a calm, fairly deep voice.',
    'A young woman of about twenty with a bright, friendly voice.',
    'A man in his sixties with a slow, low, gravelly voice.',
]


def _key(*parts):
    return hashlib.sha1(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:16]


def _resample(x, sr):
    if sr == audio.SR:
        return x
    import librosa
    return librosa.resample(x, orig_sr=sr, target_sr=audio.SR).astype(np.float32)


def _write_wav(path, data):
    """All or nothing: a stopped job never leaves a half-written file that
    would then be taken as finished."""
    tmp = f'{path[:-4]}.part.wav'
    sf.write(tmp, data, audio.SR)
    os.replace(tmp, path)


def _write_bytes(path, data):
    with open(path + '.part', 'wb') as fh:
        fh.write(data)
    os.replace(path + '.part', path)


def _safe(name):
    return re.sub(r'[^\w-]+', '-', name).strip('-').lower() or 'part'


class Project:
    def __init__(self, folder, script, settings=None, progress=None, should_stop=None):
        self.folder = folder
        self.should_stop = should_stop or (lambda: False)
        self.script = script
        self.settings = {**DEFAULTS, **(settings or {})}
        self.say = progress or (lambda event: None)
        self.language = script.get('language') or 'English'
        for sub in ('voices', 'lines', 'out'):
            os.makedirs(os.path.join(folder, sub), exist_ok=True)
        self.checks_path = os.path.join(folder, 'checks.json')
        self.checks = {}
        if os.path.exists(self.checks_path):
            try:
                with open(self.checks_path, encoding='utf-8') as fh:
                    self.checks = json.load(fh)
            except (OSError, ValueError):  # being written right now: read it next time
                self.checks = {}
        self.voices = Voices(should_stop=self.should_stop)
        self.checker = None

    # ------------------------------------------------------------ the plan
    def speakers(self):
        names = []
        for part in self.script['parts']:
            for it in part['items']:
                if it['type'] == 'line':
                    names += [s for s in it['speakers'] if s not in names]
        return names

    def description(self, name):
        own = (self.settings['descriptions'] or {}).get(name) or (self.script['voices'].get(name) or {}).get('description')
        if own:
            return own
        unknown = [s for s in self.speakers() if not self.script['voices'].get(s)]
        return AUTO_VOICES[unknown.index(name) % len(AUTO_VOICES)]

    def mode(self, name):
        return (self.settings['modes'] or {}).get(name) or self.settings['mode']

    def tasks(self):
        """One task per speaker per line: what to say, how and in which voice."""
        out = []
        for p, part in enumerate(self.script['parts']):
            for k, it in enumerate(part['items']):
                if it['type'] != 'line':
                    continue
                for s in it['speakers']:
                    tid = f'{p}:{k}:{s}'
                    out.append({'id': tid, 'part': p, 'item': k, 'speaker': s, 'text': it['text'],
                                'direction': it.get('direction') or '', 'mode': self.mode(s),
                                'take': int((self.settings['lineTakes'] or {}).get(tid, 0))})
        return out

    def sample_text(self, name):
        """The voice sample says the character's own first lines (right
        language, right vocabulary), about 15–40 words."""
        words = []
        for t in self.tasks():
            if t['speaker'] == name:
                words += t['text'].split()
                if len(words) >= 15:
                    break
        return ' '.join(words[:40])

    def sample_key(self, name):
        take = int((self.settings['sampleTakes'] or {}).get(name, 0))
        return _key('sample', self.description(name), self.language, self.sample_text(name), take)

    def line_key(self, t, take=None):
        take = t['take'] if take is None else take
        if t['mode'] == 'acted':
            return _key('acted', self.description(t['speaker']), self.language, t['text'], t['direction'], take)
        return _key('fixed', self.sample_key(t['speaker']), self.language, t['text'], take)

    def line_file(self, key):
        return os.path.join(self.folder, 'lines', f'{key}.wav')

    def sample_file(self, name):
        return os.path.join(self.folder, 'voices', f'{self.sample_key(name)}.wav')

    # ------------------------------------------------------------ making
    def _stop_point(self):
        if self.should_stop():
            raise Stopped()

    def make_samples(self):
        """A voice sample for every character, with the age check: fixed
        voices are copied from it, and for acted ones it previews the voice.
        The report is saved at once, so the page can show it while the
        teacher approves the voices."""
        report = {}
        need = self.speakers()
        for i, name in enumerate(need):
            path = self.sample_file(name)
            if not os.path.exists(path):
                self._stop_point()
                self.say({'stage': 'voices', 'done': i, 'total': len(need), 'text': f'Making a voice for {name}…'})
                take = int((self.settings['sampleTakes'] or {}).get(name, 0))
                wavs, sr = self.voices.design([self.sample_text(name)], [f'{self.description(name)} {NEUTRAL}'],
                                              self.language, name, take)
                _write_wav(path, _resample(wavs[0], sr))
            clip, _ = sf.read(path, dtype='float32')
            pitch = median_pitch(clip, audio.SR)
            report[name] = {'sample': path, 'pitch': round(pitch) if pitch else None,
                            'warning': age_warning(self.description(name), pitch)}
            self._save_report(report)
        self.say({'stage': 'voices', 'done': len(need), 'total': len(need)})
        return report

    def _save_report(self, report):
        path = os.path.join(self.folder, 'voices.json')
        with open(path + '.tmp', 'w', encoding='utf-8') as fh:
            json.dump(report, fh, ensure_ascii=False, indent=1)
        os.replace(path + '.tmp', path)

    def make_lines(self, tasks, takes=None):
        """Makes the lines not made yet, a character's lines in batches.
        takes: {task id: take} to make other takes (automatic retry)."""
        takes = takes or {}
        todo = [t for t in tasks if not os.path.exists(self.line_file(self.line_key(t, takes.get(t['id']))))]
        # Acted lines need the design model, fixed ones the copy model: one
        # model at a time, design first (it also made the samples).
        todo.sort(key=lambda t: (t['mode'] != 'acted', t['speaker']))
        size = MAX_BATCH if self.settings['batch'] else 1
        groups, current = [], []
        for t in todo:
            if current and (len(current) >= size or (current[0]['mode'], current[0]['speaker']) != (t['mode'], t['speaker'])):
                groups.append(current)
                current = []
            current.append(t)
        if current:
            groups.append(current)
        done, start = 0, time.time()
        for group in groups:
            self._stop_point()
            first = group[0]
            name, take = first['speaker'], takes.get(first['id'], first['take'])
            self.say({'stage': 'lines', 'done': done, 'total': len(todo), 'elapsed': round(time.time() - start),
                      'text': f'{name}: {first["text"][:60]}'})
            texts = [t['text'] for t in group]
            if first['mode'] == 'acted':
                instructs = [f"{self.description(name)} {t['direction']}".strip() for t in group]
                wavs, sr = self.voices.design(texts, instructs, self.language, name, take)
            else:
                sample, _ = sf.read(self.sample_file(name), dtype='float32')
                wavs, sr = self.voices.copy(texts, self.sample_key(name), sample, audio.SR, self.sample_text(name),
                                            self.language, name, take)
            for t, w in zip(group, wavs):
                _write_wav(self.line_file(self.line_key(t, takes.get(t['id']))), _resample(w, sr))
            done += len(group)
        self.say({'stage': 'lines', 'done': len(todo), 'total': len(todo), 'elapsed': round(time.time() - start)})

    # ------------------------------------------------------------ checking
    def verdict(self, t, key):
        """The word check of a line made already, judged again from what
        Whisper heard (cheap: better judging also applies to old lines).
        None while the line hasn't been heard."""
        heard = (self.checks.get(key) or {}).get('heard')
        if heard is None:
            return None
        v = compare(t['text'], heard, self.language)
        return {**v, 'ok': v['level'] != 'differs', 'heard': heard}

    def check(self, t, take=None):
        key = self.line_key(t, take)
        if key not in self.checks:
            if self.checker is None:
                self.checker = WordChecker()
            clip, _ = sf.read(self.line_file(key), dtype='float32')
            self.checks[key] = {'heard': self.checker.hear(clip, self.language)}
            with open(self.checks_path + '.tmp', 'w', encoding='utf-8') as fh:
                json.dump(self.checks, fh, ensure_ascii=False, indent=1)
            os.replace(self.checks_path + '.tmp', self.checks_path)
        return self.verdict(t, key)

    def check_all(self, tasks):
        """Checks every line; a line whose words really differ gets one new
        take, and the better of the two is used ("check by ear" lines are
        only shown to the teacher). Returns {task id: chosen take}."""
        chosen, retry = {}, {}
        for i, t in enumerate(tasks):
            self._stop_point()
            self.say({'stage': 'checks', 'done': i, 'total': len(tasks), 'text': t['text'][:60]})
            if self.check(t)['level'] == 'differs':
                retry[t['id']] = t['take'] + 1
        if retry:
            self.say({'stage': 'retry', 'done': 0, 'total': len(retry), 'text': f'{len(retry)} line(s) again'})
            self.make_lines([t for t in tasks if t['id'] in retry], retry)
            for t in tasks:
                if t['id'] in retry:
                    first, second = self.check(t), self.check(t, retry[t['id']])
                    if second['similarity'] > first['similarity']:
                        chosen[t['id']] = retry[t['id']]
        self.say({'stage': 'checks', 'done': len(tasks), 'total': len(tasks)})
        return chosen

    # ------------------------------------------------------------ all of it
    def run(self, kind='all'):
        """kind 'voices': only the voice samples, for the teacher to approve
        before the long part; 'all': everything."""
        started = time.time()
        if kind == 'voices':
            try:
                voices = self.make_samples()
            finally:
                self.voices.unload()
            self.say({'stage': 'done', 'done': 1, 'total': 1})
            return {'voices': voices, 'seconds': round(time.time() - started)}
        tasks = self.tasks()
        voices = self.make_samples()
        self.make_lines(tasks)
        chosen = self.check_all(tasks) if self.settings['check'] else {}
        self.voices.unload()
        lines = []
        for t in tasks:
            key = self.line_key(t, chosen.get(t['id']))
            check = self.verdict(t, key) or {}
            lines.append({**t, 'take': chosen.get(t['id'], t['take']), 'file': self.line_file(key),
                          'ok': check.get('ok'), 'level': check.get('level'), 'diffs': check.get('diffs', []),
                          'heard': check.get('heard', '')})
        parts = self.mix(lines)
        result = {'voices': voices, 'lines': lines, 'parts': parts, 'seconds': round(time.time() - started)}
        _write_bytes(os.path.join(self.folder, 'result.json'), json.dumps(result, ensure_ascii=False, indent=1).encode('utf-8'))
        self.say({'stage': 'done', 'done': 1, 'total': 1})
        return result

    def mix(self, lines):
        """One MP3 per part of the script."""
        self.say({'stage': 'mix', 'done': 0, 'total': len(self.script['parts'])})
        by_item = {}
        for line in lines:
            by_item.setdefault((line['part'], line['item']), {})[line['speaker']] = line['file']
        voices = {n: {'effect': v.get('effect', '')} for n, v in self.script['voices'].items()}
        kind = self.settings['ambience'] or self.script.get('ambience') or 'none'
        title = _safe(self.script.get('title') or 'recording')
        parts = []
        for p, part in enumerate(self.script['parts']):
            clips = {}
            for k, it in enumerate(part['items']):
                if it['type'] == 'line':
                    files = by_item[(p, k)]
                    clips[k] = [sf.read(files[s], dtype='float32')[0] for s in it['speakers']]
            mixed = audio.build_part(part['items'], voices, clips, self.settings['spacing'], kind)
            label = part.get('label') or (f'part {p + 1}' if len(self.script['parts']) > 1 else '')
            path = os.path.join(self.folder, 'out', f'{title}{"-" + _safe(label) if label else ""}.mp3')
            _write_bytes(path, audio.to_mp3(mixed))
            parts.append({'label': label, 'mp3': path, 'seconds': round(len(mixed) / audio.SR, 1)})
        return parts
