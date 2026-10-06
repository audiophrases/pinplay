"""Builds catalog/voices.json, the list behind the studio's "🌍 Find a voice"
(engine/catalog.py). Run once by a developer, not by the studio: it needs
pandas, pyarrow and huggingface_hub, and reads only label files (no audio)
and the dataset viewer's row lists (cached in .cache, so a second run is quick).

Sources (each voice keeps its credit in the library):
- LibriTTS-R (CC BY 4.0): LibriVox audiobook readers, studio-cleaned, with
  per-clip labels (accent, gender, pitch, pace, monotone/expressive, quality)
  from parler-tts/libritts-r-filtered-speaker-descriptions. Audio:
  mythicinfinity/libritts_r. For each reader: a few consecutive clean
  sentences of one chapter, 8–14 s together, as the voice sample.
- French, CML-TTS (CC BY 4.0): LibriVox readers, labelled the same way in
  PHBJT/cml-tts-20percent-subset-description (rows aligned with the audio
  set PHBJT/cml-tts-20percent-subset).
- French, Multilingual LibriSpeech (CC BY 4.0): LibriVox readers; labels
  PHBJT/mls-annotated, audio facebook/multilingual_librispeech (the small
  dev, test and 9_hours splits).
- Speech Accent Archive (CC BY-NC-SA 2.0, George Mason University): speakers
  of many native languages reading the same English paragraph. Audio:
  changelinglab/speechaccentarchive-pr; speaker details:
  HamdanXI/speech-accent-archive.

Audio is fetched by the studio one clip at a time through the Hugging Face
dataset viewer (/rows?offset=…), so each voice stores its row offsets.

Usage: python build_catalog.py   (writes voices.json next to this file)"""
import json
import os
import re

import pandas as pd

from huggingface_hub import HfFileSystem, hf_hub_download

HERE = os.path.dirname(os.path.abspath(__file__))
fs = HfFileSystem()


def _page(dataset, config, split, offset):
    """One page of 100 rows ({id: row index}), kept in .cache so that running
    the script again continues where it stopped."""
    import time
    import urllib.parse
    import urllib.request
    cache = os.path.join(HERE, '.cache')
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, f"{dataset.replace('/', '_')}-{split}-{offset}.json")
    if os.path.exists(path):
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    q = urllib.parse.urlencode({'dataset': dataset, 'config': config, 'split': split, 'offset': offset, 'length': 100})
    for attempt in range(30):
        try:
            with urllib.request.urlopen(f'https://datasets-server.huggingface.co/rows?{q}', timeout=120) as res:
                data = json.loads(res.read())
            page = {'total': data['num_rows_total'], 'ids': {r['row']['id']: r['row_idx'] for r in data['rows']}}
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump(page, fh)
            return page
        except Exception:
            time.sleep(min(30, 3 + 3 * attempt))
    raise RuntimeError(f'could not read {dataset} rows at {offset}')


def ids_with_offsets(dataset, config, split, column='id'):
    """{id: row offset} as the dataset viewer numbers its rows, read 100 at a
    time (the viewer's /rows, which has no download limit), 6 pages at once."""
    from concurrent.futures import ThreadPoolExecutor
    first = _page(dataset, config, split, 0)
    total = first['total']
    out = dict(first['ids'])
    with ThreadPoolExecutor(4) as pool:
        for n, page in enumerate(pool.map(lambda o: _page(dataset, config, split, o), range(100, total, 100))):
            out.update(page['ids'])
            if n % 50 == 0:
                print(f'  {dataset} {split}: {len(out)}/{total}', flush=True)
    return out


def mode(series):
    m = series.mode()
    return m.iloc[0] if len(m) else ''


# ---------------------------------------------------------------- labelled readers
GOOD_QUALITY = ['wonderful speech quality', 'great speech quality']
CLOSE = ['very close-sounding', 'slightly close-sounding']


def readers(d, source, language, config, split, key_prefix, max_clip=14.5):
    """One voice per reader from per-clip labels (parler-tts style: gender,
    pitch, speaking_rate, speech_monotony, quality...). d needs the columns
    offset, speaker_id, chapter, dur, text (and accent, if known). The sample:
    consecutive clean clips of one chapter, 8-14.5 s together."""
    good = d[d.pesq_speech_quality.isin(GOOD_QUALITY) & d.reverberation.isin(CLOSE)
             & ~d.noise.isin(['noisy', 'very noisy']) & d.dur.between(1.5, max_clip)]
    voices = []
    for speaker, rows in d.groupby('speaker_id'):
        g = good[good.speaker_id == speaker].sort_values('offset')
        sample = []
        for _chapter, ch in g.groupby('chapter'):
            picked, total = [], 0.0
            for _, r in ch.iterrows():
                if total + r.dur + 0.4 > 14.5:
                    if total >= 8:
                        break
                    picked, total = [], 0.0  # start again from this clip
                picked.append(r)
                total += r.dur + 0.4
            if total >= 8 and (not sample or total > sum(r.dur for r in sample)):
                sample = picked
            if total >= 12:
                break
        if not sample:
            continue
        calm = rows.speech_monotony.isin(['monotone', 'very monotone', 'slightly expressive and animated']).mean()
        accent = mode(rows.accent) if 'accent' in rows else ''
        voices.append({
            'key': f'{key_prefix}-{speaker}', 'source': source, 'speaker': str(speaker), 'language': language,
            'gender': mode(rows.gender), 'accent': str(accent).replace('Unindentified', 'Unidentified').capitalize(),
            'pitch': mode(rows.pitch).replace('-pitch', '').replace(' pitch', ''),
            'pace': mode(rows.speaking_rate).replace(' speed', '').replace('slightly slowly', 'slightly slow').replace('slowly', 'slow'),
            'manner': 'calm' if calm >= 0.85 else 'lively' if calm < 0.6 else 'mixed',
            'hz': round(float(rows.utterance_pitch_mean.astype(float).median())),
            'config': config, 'split': split, 'offsets': [int(r.offset) for r in sample],
            'text': ' '.join(str(r.text).strip() for r in sample),
            'seconds': round(sum(r.dur for r in sample), 1),
        })
    print(f'{source} {language} {split}: {len(voices)} readers', flush=True)
    return voices


def libritts():
    """English: LibriTTS-R (accent labels: American, Canadian, Irish...)."""
    split = 'train.clean.100'
    path = hf_hub_download('parler-tts/libritts-r-filtered-speaker-descriptions', f'clean/{split}-00000-of-00001.parquet',
                           repo_type='dataset')
    d = pd.read_parquet(path)
    offsets = ids_with_offsets('mythicinfinity/libritts_r', 'clean', split)
    d = d[d.id.isin(offsets.keys())].copy()
    d['offset'] = d.id.map(offsets)
    d['chapter'] = d.chapter_id
    d['dur'] = d.speech_duration.astype(float)
    d['text'] = d.text_original
    return readers(d, 'librittsr', 'English', 'clean', split, 'lt', max_clip=9.0)  # as first published


def cml_french():
    """French: CML-TTS (LibriVox), the labelled 20 % subset. Its rows are in
    the same order as the audio set's (checked), so the row index is the offset."""
    path = hf_hub_download('PHBJT/cml-tts-20percent-subset-description', 'data/train-00000-of-00001.parquet', repo_type='dataset')
    d = pd.read_parquet(path).reset_index(drop=True)
    d['offset'] = d.index
    d['chapter'] = 'all'  # no chapters: consecutive rows of a reader
    d['dur'] = d.duration.astype(float)
    return readers(d, 'cmltts', 'French', 'default', 'train', 'cml')


def mls_french(skip_speakers):
    """French: Multilingual LibriSpeech (LibriVox), its small labelled splits;
    readers already taken from CML-TTS are skipped."""
    voices = []
    for split in ('dev', 'test', '9_hours'):
        path = hf_hub_download('PHBJT/mls-annotated', f'french/{split}-00000-of-00001.parquet', repo_type='dataset')
        d = pd.read_parquet(path)
        offsets = ids_with_offsets('facebook/multilingual_librispeech', 'french', split)
        d = d[d.id.isin(offsets.keys()) & ~d.speaker_id.astype(str).isin(skip_speakers)].copy()
        d['offset'] = d.id.map(offsets)
        d['chapter'] = d.chapter_id
        d['dur'] = d.audio_duration.astype(float)
        d['text'] = d.original_text if 'original_text' in d else d.text
        found = readers(d, 'mls', 'French', 'french', split, f'mls-{split}')
        voices += found
        skip_speakers |= {v['speaker'] for v in found}
    return voices


# ---------------------------------------------------------------- Speech Accent Archive
def accents():
    info = pd.read_parquet(fs.open('datasets/HamdanXI/speech-accent-archive@~parquet/default/train/0000.parquet', 'rb'))
    info['filename'] = info.filename.str.replace(r'\.mp3$', '', regex=True)
    info = info.drop_duplicates('filename').set_index('filename')
    offsets = ids_with_offsets('changelinglab/speechaccentarchive-pr', 'default', 'test')
    voices = []
    for fid, off in offsets.items():
        lang = re.sub(r'\d+$', '', fid)
        row = info.loc[fid] if fid in info.index else None
        sex = (row['sex'] if row is not None else '') or ''
        age = row['age'] if row is not None else None
        voices.append({
            'key': f'saa-{fid}', 'source': 'accentarchive', 'speaker': fid,
            'language': (row['native_language'] if row is not None and row['native_language'] else lang).strip().title(),
            'gender': {'male': 'male', 'female': 'female'}.get(str(sex).strip().lower(), ''),
            'age': int(age) if age == age and age is not None else None,
            'birthplace': (row['birthplace'] if row is not None else '') or '',
            'config': 'default', 'split': 'test', 'offsets': [off],
        })
    print('accent archive', len(voices), 'speakers;', sum(1 for v in voices if v['gender']), 'with details', flush=True)
    return voices


if __name__ == '__main__':
    catalog = {
        'sources': {
            'librittsr': {'name': 'LibriTTS-R (LibriVox readers)', 'dataset': 'mythicinfinity/libritts_r', 'license': 'CC BY 4.0',
                          'credit': 'LibriTTS-R (Koizumi et al., 2023), from LibriVox recordings; CC BY 4.0'},
            'cmltts': {'name': 'CML-TTS (LibriVox readers)', 'dataset': 'PHBJT/cml-tts-20percent-subset', 'license': 'CC BY 4.0',
                       'credit': 'CML-TTS (Oliveira et al., 2023), from LibriVox recordings; CC BY 4.0'},
            'mls': {'name': 'Multilingual LibriSpeech (LibriVox readers)', 'dataset': 'facebook/multilingual_librispeech', 'license': 'CC BY 4.0',
                    'credit': 'Multilingual LibriSpeech (Pratap et al., 2020), from LibriVox recordings; CC BY 4.0'},
            'accentarchive': {'name': 'Speech Accent Archive', 'dataset': 'changelinglab/speechaccentarchive-pr', 'license': 'CC BY-NC-SA 2.0',
                              'credit': 'Speech Accent Archive, George Mason University (Weinberger); CC BY-NC-SA 2.0'},
        },
        'voices': [],
    }
    english = libritts()
    french = cml_french()
    french += mls_french({v['speaker'] for v in french})
    catalog['voices'] = english + french + accents()
    with open(os.path.join(HERE, 'voices.json'), 'w', encoding='utf-8') as fh:
        json.dump(catalog, fh, ensure_ascii=False, separators=(',', ':'))
    print('voices.json:', len(catalog['voices']), 'voices')
