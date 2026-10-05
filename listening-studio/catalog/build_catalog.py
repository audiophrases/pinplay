"""Builds catalog/voices.json, the list behind the studio's "🌍 Find a voice"
(engine/catalog.py). Run once by a developer, not by the studio: it needs
pandas, pyarrow and huggingface_hub, and reads only small metadata files and
single parquet columns (no audio), about 60 MB in all.

Sources (each voice keeps its credit in the library):
- LibriTTS-R (CC BY 4.0): LibriVox audiobook readers, studio-cleaned, with
  per-clip labels (accent, gender, pitch, pace, monotone/expressive, quality)
  from parler-tts/libritts-r-filtered-speaker-descriptions. Audio:
  mythicinfinity/libritts_r. For each reader: a few consecutive clean
  sentences of one chapter, 8–14 s together, as the voice sample.
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


# ---------------------------------------------------------------- LibriTTS-R
def libritts():
    voices = []
    for split in ('train.clean.100',):
        path = hf_hub_download('parler-tts/libritts-r-filtered-speaker-descriptions', f'clean/{split}-00000-of-00001.parquet',
                               repo_type='dataset')
        d = pd.read_parquet(path)
        offsets = ids_with_offsets('mythicinfinity/libritts_r', 'clean', split)
        print(split, len(d), 'clips,', len(offsets), 'offsets', flush=True)
        good = d[d.pesq_speech_quality.isin(['wonderful speech quality', 'great speech quality'])
                 & d.reverberation.isin(['very close-sounding', 'slightly close-sounding'])
                 & ~d.noise.isin(['noisy', 'very noisy'])
                 & d.speech_duration.between(1.5, 9.0)
                 & d.id.isin(offsets.keys())]
        for speaker, rows in d.groupby('speaker_id'):
            g = good[good.speaker_id == speaker].sort_values('id')
            sample = []
            for _chapter, ch in g.groupby('chapter_id'):
                picked, total = [], 0.0
                for _, r in ch.iterrows():
                    if total + r.speech_duration + 0.4 > 14:
                        break
                    picked.append(r)
                    total += r.speech_duration + 0.4
                if total >= 8 and (not sample or total > sum(r.speech_duration for r in sample)):
                    sample = picked
                if total >= 12:
                    break
            if not sample:
                continue
            calm = rows.speech_monotony.isin(['monotone', 'very monotone', 'slightly expressive and animated']).mean()
            voices.append({
                'key': f'lt-{speaker}', 'source': 'librittsr', 'speaker': str(speaker),
                'gender': mode(rows.gender), 'accent': mode(rows.accent).replace('Unindentified', 'Unidentified').capitalize(),
                'pitch': mode(rows.pitch).replace('-pitch', '').replace(' pitch', ''),
                'pace': mode(rows.speaking_rate).replace(' speed', '').replace('slightly slowly', 'slightly slow').replace('slowly', 'slow'),
                'manner': 'calm' if calm >= 0.85 else 'lively' if calm < 0.6 else 'mixed',
                'hz': round(float(rows.utterance_pitch_mean.astype(float).median())),
                'config': 'clean', 'split': split, 'offsets': [offsets[r.id] for r in sample],
                'text': ' '.join(str(r.text_original).strip() for r in sample),
                'seconds': round(sum(r.speech_duration for r in sample), 1),
            })
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
            'accentarchive': {'name': 'Speech Accent Archive', 'dataset': 'changelinglab/speechaccentarchive-pr', 'license': 'CC BY-NC-SA 2.0',
                              'credit': 'Speech Accent Archive, George Mason University (Weinberger); CC BY-NC-SA 2.0'},
        },
        'voices': libritts() + accents(),
    }
    with open(os.path.join(HERE, 'voices.json'), 'w', encoding='utf-8') as fh:
        json.dump(catalog, fh, ensure_ascii=False, separators=(',', ':'))
    print('voices.json:', len(catalog['voices']), 'voices')
