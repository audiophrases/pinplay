const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Media Manager, step 1 (MEDIA_MANAGER_PLAN.md): per-question media status,
// per-keyword search cache and GIPHY limit handling in the auto-fill used by
// every save/publish. Runs the REAL functions out of app.js with fetch stubbed.
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const NAMES = [
  'DEFAULT_BACKEND_URL', 'QUESTION_TYPE_CATALOG', 'AUDIO_CAPABLE_QUESTION_TYPES', 'supportsQuestionAudio',
  'round', 'detectVideoProvider', 'normalizeQuestionMedia', 'makeDefaultQuestionMedia',
  'makeImageRevisionToken', 'replaceQuestionImageData',
  'isGifMediaUrl', 'mediaVersionTime', 'questionMediaStatus',
  'MEDIA_SEARCH_RESULTS', 'MEDIA_SEARCH_CACHE_LIMIT', 'GIF_LIMIT_PAUSE_MS', 'mediaSearchState',
  'isRateLimitError', 'isGifSearchPaused', 'cachedMediaSearch', 'isGifKeywordBlocked',
  'searchGifsForKeyword', 'searchImagesForKeyword', 'giphySearch', 'importPictureAsDataUrl', 'autoFillImages',
  'CEFR_LEVELS', 'normalizeCefr',
  'MEDIA_ROW_STATUS_ORDER', 'MEDIA_VISUAL_KIND_ORDER', 'MEDIA_AUDIO_KIND_ORDER',
  'buildMediaRows', 'filterMediaRows', 'sortMediaRows', 'mediaSummaryCounts', 'nextMediaSelection',
  'nextMediaResult', 'MEDIA_OUTCOME_RANK', 'worseMediaOutcome', 'applyMediaJobOutcomes',
  'videoBackendCandidates', 'videoProviderPreferenceOf', 'applyFoundVideo', 'searchVideosForKeyword', 'autoFillVideos',
  'generateMissingVisualFor', 'regenerateVisualFor', 'removeMediaFrom', 'mediaManagerState',
  'EDGE_TTS_LANGUAGE_DEFAULTS', 'EDGE_TTS_VOICE_INDEX', 'EDGE_TTS_VOICE_OPTIONS', 'DEFAULT_EDGE_TTS_LANGUAGE', 'DEFAULT_EDGE_TTS_VOICE',
  'normalizeTtsLanguage', 'getVoiceForTtsLanguage', 'normalizeTtsVoice', 'prepareQuestionTts',
  'sha256HexClient', 'computeTtsAudioKey', 'ensureTtsAudioBatchOnR2', 'MEDIA_TTS_CHUNK', 'generateMissingTtsFor',
  'setMediaKeywordOn', 'setTtsVoiceOn', 'EDGE_TTS_LANGUAGE_OPTIONS', 'guessTtsLanguageFromVoice', 'formatVoiceIndexLabel', 'escapeHtml', 'buildAudioSettingsMarkup',
];

const interpolate = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

// A fresh sandbox per test: the cache and the GIF pause are module state.
function load(fetchImpl) {
  const calls = [];
  const sandbox = {
    t: interpolate,
    URL,
    URLSearchParams,
    TextEncoder,
    crypto: globalThis.crypto,
    quiz: { questions: [], ttsLanguage: 'EN', readAllQuestionsAloud: false },
    createSessionPassword: '',
    console: { warn() {}, error() {}, log() {} },
    loadBackendUrl: () => 'https://be.test',
    normalizeBackendUrl: (u) => String(u || '').replace(/\/+$/, ''),
    dataUrlToBlob: (d) => ({ blob: d }),
    imageFileToOptimizedDataUrl: async (b) => `data:image/jpeg;base64,${Buffer.from(String(b.blob)).toString('base64')}`,
    fetch: async (url, opts) => {
      calls.push(String(url));
      return fetchImpl(String(url), opts);
    },
  };
  const A = loadDeclarations(APP_SRC, NAMES, sandbox);
  return { A, calls, sandbox };
}

const jsonRes = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const gifItems = (kw, n = 3) => Array.from({ length: n }, (_, i) => ({ url: `https://media.giphy.com/${encodeURIComponent(kw)}/${i}.gif` }));

describe('isGifMediaUrl', () => {
  it('recognises GIPHY hosts, .gif URLs and gif data URLs', () => {
    const { A } = load(() => jsonRes(200, {}));
    assert.equal(A.isGifMediaUrl('https://media2.giphy.com/media/abc/200.gif?cid=1'), true);
    assert.equal(A.isGifMediaUrl('https://giphy.com/gifs/abc'), true);
    assert.equal(A.isGifMediaUrl('https://api.pinplay.win/api/media/quiz-1/images/q3-k.gif?v=k'), true);
    assert.equal(A.isGifMediaUrl('data:image/gif;base64,R0lG'), true);
    assert.equal(A.isGifMediaUrl('data:image/jpeg;base64,/9j/'), false);
    assert.equal(A.isGifMediaUrl('https://api.pinplay.win/api/media/quiz-1/images/q3-k.jpg?v=k'), false);
    assert.equal(A.isGifMediaUrl('https://notgiphy.example/x.png'), false);
    assert.equal(A.isGifMediaUrl(''), false);
  });
});

describe('mediaVersionTime', () => {
  it('reads the time back out of a revision token', () => {
    const { A } = load(() => jsonRes(200, {}));
    const before = Date.now();
    const ms = A.mediaVersionTime(A.makeImageRevisionToken());
    assert.ok(ms >= before && ms <= Date.now());
  });

  it('is 0 for empty or foreign tokens', () => {
    const { A } = load(() => jsonRes(200, {}));
    assert.equal(A.mediaVersionTime(''), 0);
    assert.equal(A.mediaVersionTime(undefined), 0);
    assert.equal(A.mediaVersionTime('v2'), 0);
    assert.equal(A.mediaVersionTime('zzzzzzzzzzzz-abc'), 0);
  });
});

describe('questionMediaStatus', () => {
  const EN = { ttsLanguage: 'EN', readAllQuestionsAloud: false };
  let A;
  beforeEach(() => { ({ A } = load(() => jsonRes(200, {}))); });
  const st = (q, ctx = EN) => JSON.parse(JSON.stringify(A.questionMediaStatus(q, ctx)));

  it('pictures and GIFs: uploaded, not uploaded, keyword only, none', () => {
    assert.deepEqual(st({ type: 'mcq', imageData: 'https://media.giphy.com/x/1.gif' }).visual, { kind: 'gif', status: 'ready' });
    assert.deepEqual(st({ type: 'mcq', imageData: 'https://api.pinplay.win/api/media/q/images/q0-a.jpg' }).visual, { kind: 'image', status: 'ready' });
    assert.deepEqual(st({ type: 'mcq', imageData: 'data:image/png;base64,AA' }).visual, { kind: 'image', status: 'local' });
    assert.deepEqual(st({ type: 'mcq', gifKeyword: 'happy dog' }).visual, { kind: 'gif', status: 'missing' });
    assert.deepEqual(st({ type: 'mcq', imageKeyword: 'apple' }).visual, { kind: 'image', status: 'missing' });
    assert.deepEqual(st({ type: 'mcq' }).visual, { kind: 'none', status: 'none' });
  });

  it('videos come first, as in ensureQuizMediaReady, but never on pin questions', () => {
    assert.deepEqual(st({ type: 'mcq', media: { url: 'https://youtu.be/abc' } }).visual, { kind: 'video', status: 'ready' });
    assert.deepEqual(st({ type: 'mcq', videoKeyword: 'cats', gifKeyword: 'cats' }).visual, { kind: 'video', status: 'missing' });
    assert.deepEqual(st({ type: 'pin', videoKeyword: 'cats', gifKeyword: 'cats' }).visual, { kind: 'gif', status: 'missing' });
  });

  it('reading-text questions have no picture', () => {
    assert.deepEqual(st({ type: 'mcq', readingText: 'Once upon a time', gifKeyword: 'x' }).visual, { kind: 'na', status: 'na' });
  });

  it('audio: TTS ready or missing, uploaded file, quiz-wide read-aloud, hearing off', () => {
    assert.deepEqual(st({ type: 'mcq', audioMode: 'tts', prompt: 'Hi', ttsAudioKey: 'tts/a.mp3' }).audio, { kind: 'tts', status: 'ready' });
    assert.deepEqual(st({ type: 'mcq', audioMode: 'tts', prompt: 'Hi' }).audio, { kind: 'tts', status: 'missing' });
    assert.deepEqual(st({ type: 'mcq', audioMode: 'file', audioData: 'https://x/a.mp3' }).audio, { kind: 'file', status: 'ready' });
    assert.deepEqual(st({ type: 'mcq', audioMode: 'file', audioData: 'data:audio/webm;base64,AA' }).audio, { kind: 'file', status: 'local' });
    assert.deepEqual(st({ type: 'mcq', prompt: 'Hi' }).audio, { kind: 'none', status: 'none' });
    assert.deepEqual(st({ type: 'mcq', prompt: 'Hi' }, { ttsLanguage: 'EN', readAllQuestionsAloud: true }).audio, { kind: 'tts', status: 'missing' });
    assert.deepEqual(st({ type: 'mcq', audioMode: 'tts', prompt: 'Hi' }, { ttsLanguage: 'NONE' }).audio, { kind: 'none', status: 'none' });
  });

  it('changedAt is the later of the picture and audio revisions', () => {
    const img = A.makeImageRevisionToken();
    const s = st({ type: 'mcq', _imageVersion: img, _audioVersion: '' });
    assert.equal(s.changedAt, A.mediaVersionTime(img));
    assert.equal(st({ type: 'mcq' }).changedAt, 0);
  });
});

describe('cachedMediaSearch', () => {
  it('shares one search between concurrent callers and keeps empty results', async () => {
    const { A } = load(() => jsonRes(200, {}));
    let runs = 0;
    const search = async () => { runs += 1; return []; };
    const [a, b] = await Promise.all([A.cachedMediaSearch('gif', 'Dog', search), A.cachedMediaSearch('gif', ' dog ', search)]);
    assert.equal(runs, 1);
    assert.equal(a.length + b.length, 0);
    await A.cachedMediaSearch('gif', 'dog', search);
    assert.equal(runs, 1, 'an empty result is not searched again');
  });

  it('forgets failures so a later run can try again', async () => {
    const { A } = load(() => jsonRes(200, {}));
    let runs = 0;
    const failing = async () => { runs += 1; throw new Error('boom'); };
    await assert.rejects(A.cachedMediaSearch('image', 'cat', failing));
    await assert.rejects(A.cachedMediaSearch('image', 'cat', failing));
    assert.equal(runs, 2);
  });
});

describe('autoFillImages: GIF searches and the GIPHY limit', () => {
  it('makes one search per distinct keyword', async () => {
    const { A, calls } = load((url) => jsonRes(200, { items: gifItems(new URL(url).searchParams.get('q')) }));
    const qs = [
      { type: 'mcq', gifKeyword: 'happy' },
      { type: 'mcq', gifKeyword: 'Happy' },
      { type: 'mcq', gifKeyword: 'sad' },
      { type: 'mcq', gifKeyword: 'happy' },
    ];
    const r = await A.autoFillImages(qs, null);
    assert.equal(r.filled, 4);
    assert.equal(calls.filter((u) => u.includes('/api/gifs/search')).length, 2);
    assert.ok(qs.every((q) => q.imageData.includes('giphy.com')));

    // A second save with more "happy" questions searches nothing.
    const more = [{ type: 'mcq', gifKeyword: 'happy' }];
    await A.autoFillImages(more, null);
    assert.equal(calls.filter((u) => u.includes('/api/gifs/search')).length, 2);
  });

  for (const [label, res] of [
    ['a 429 from an updated worker', jsonRes(429, { error: 'GIPHY search limit reached (HTTP 429). Try again later.', rateLimited: true })],
    ['a 502 "HTTP 429" from an older worker', jsonRes(502, { error: 'GIPHY search failed (HTTP 429): {"message":"rate limited"}' })],
  ]) {
    it(`stops GIF searches after ${label}, keeps pictures going, and pauses later saves`, async () => {
      const { A, calls } = load((url) => {
        if (url.includes('/api/gifs/search')) return res;
        if (url.includes('openverse')) return jsonRes(200, { results: [{ url: 'https://img.test/apple.jpg' }] });
        if (url.includes('/api/images/fetch')) return jsonRes(200, { dataUrl: 'data:image/jpeg;base64,AA' });
        return jsonRes(404, {});
      });
      const qs = [
        { type: 'mcq', gifKeyword: 'one' },
        { type: 'mcq', gifKeyword: 'two', imageKeyword: 'pear' },
        { type: 'mcq', imageKeyword: 'apple' },
        { type: 'mcq', gifKeyword: 'three' },
      ];
      const r = await A.autoFillImages(qs, null);
      assert.equal(calls.filter((u) => u.includes('/api/gifs/search')).length, 1, 'no search after the refusal');
      assert.equal(r.gifLimited, 3);
      assert.equal(r.filled, 1);
      assert.equal(qs[2].imageData.startsWith('data:image/jpeg'), true, 'pictures still filled');
      assert.equal(qs[1].imageData || '', '', 'a GIF question is not given a picture instead');
      assert.equal(r.outcomes.get(qs[0]).status, 'limited');
      assert.equal(r.outcomes.get(qs[3]).status, 'limited');
      assert.equal(A.isGifSearchPaused(), true);

      // The next save doesn't call GIPHY while paused.
      const next = await A.autoFillImages([{ type: 'mcq', gifKeyword: 'four' }], null);
      assert.equal(next.gifLimited, 1);
      assert.equal(calls.filter((u) => u.includes('/api/gifs/search')).length, 1);

      // After the pause, searching resumes.
      A.mediaSearchState.gifPausedUntil = Date.now() - 1;
      assert.equal(A.isGifSearchPaused(), false);
    });
  }

  it('a GIF keyword with no results falls back to the picture keyword, as before', async () => {
    const { A } = load((url) => {
      if (url.includes('/api/gifs/search')) return jsonRes(200, { items: [] });
      if (url.includes('openverse')) return jsonRes(200, { results: [{ url: 'https://img.test/pear.jpg' }] });
      if (url.includes('/api/images/fetch')) return jsonRes(200, { dataUrl: 'data:image/jpeg;base64,AA' });
      return jsonRes(404, {});
    });
    const qs = [{ type: 'mcq', gifKeyword: 'zzz', imageKeyword: 'pear' }, { type: 'mcq', gifKeyword: 'zzz' }];
    const r = await A.autoFillImages(qs, null);
    assert.equal(r.filled, 1);
    assert.ok(qs[0].imageData.startsWith('data:image/jpeg'));
    assert.equal(r.outcomes.get(qs[1]).status, 'failed');
    assert.match(r.outcomes.get(qs[1]).reason, /No GIFs found for "zzz"/);
  });

  it('only touches the questions it is given', async () => {
    const { A } = load((url) => jsonRes(200, { items: gifItems(new URL(url).searchParams.get('q')) }));
    const quiz = [{ type: 'mcq', gifKeyword: 'a' }, { type: 'mcq', gifKeyword: 'b' }, { type: 'mcq', gifKeyword: 'c' }];
    await A.autoFillImages([quiz[1]], null);
    assert.equal(quiz[0].imageData, undefined);
    assert.ok(quiz[1].imageData);
    assert.equal(quiz[2].imageData, undefined);
  });
});

describe('Media Manager rows, filters and sorting', () => {
  const EN = { ttsLanguage: 'EN', readAllQuestionsAloud: false };
  let A;
  let qs;
  let rows;
  beforeEach(() => {
    ({ A } = load(() => jsonRes(200, {})));
    qs = [
      { type: 'mcq', cefr: 'B1', prompt: 'Past of go?', imageData: 'https://media.giphy.com/a/1.gif' },       // Q1 gif ready
      { type: 'mcq', cefr: 'A1', prompt: 'Colour of the sky', gifKeyword: 'blue sky' },                     // Q2 gif missing
      { type: 'text', prompt: 'Spell it', audioMode: 'tts', ttsAudioKey: 'tts/x.mp3' },                     // Q3 tts ready, untagged
      { type: 'mcq', cefr: 'C2', prompt: 'Nuance', imageData: 'data:image/png;base64,AA' },                  // Q4 image local
      { type: 'mcq', cefr: 'A1', prompt: 'Nothing here' },                                                   // Q5 none
      { type: 'mcq', cefr: 'B1', prompt: 'Apple', imageKeyword: 'apple' },                                   // Q6 image missing
    ];
    rows = A.buildMediaRows(qs, EN, new Map([[qs[5], { status: 'failed', reason: 'No pictures found' }], [qs[0], { status: 'failed', reason: 'old' }]]));
  });
  const ns = (list) => list.map((r) => r.n);

  it('gives each row one status; a failure only counts while something is missing', () => {
    assert.deepEqual(rows.map((r) => r.status), ['ready', 'missing', 'ready', 'local', 'none', 'failed']);
    assert.equal(rows[5].failure.reason, 'No pictures found');
    assert.equal(rows[0].failure, null, 'a filled question drops its old failure');
  });

  it('filters by level, media, status, type and text, combined', () => {
    assert.deepEqual(ns(A.filterMediaRows(rows, { level: 'A1' })), [2, 5]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { level: 'untagged' })), [3]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { media: 'gif' })), [1, 2]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { media: 'image' })), [4, 6]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { media: 'audio' })), [3]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { media: 'nomedia' })), [5]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { status: 'missing' })), [2]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { type: 'text' })), [3]);
    assert.deepEqual(ns(A.filterMediaRows(rows, { text: 'SKY' })), [2], 'matches the GIF keyword too, any case');
    assert.deepEqual(ns(A.filterMediaRows(rows, { level: 'B1', media: 'image' })), [6]);
  });

  it('sorts by level (untagged last), status, media type and back; ties keep question order', () => {
    assert.deepEqual(ns(A.sortMediaRows(rows, { key: 'level', dir: 'asc' })), [2, 5, 1, 6, 4, 3]);
    assert.deepEqual(ns(A.sortMediaRows(rows, { key: 'status', dir: 'asc' })), [6, 2, 4, 1, 3, 5]);
    assert.deepEqual(ns(A.sortMediaRows(rows, { key: 'visual', dir: 'asc' })), [1, 2, 4, 6, 3, 5]);
    assert.deepEqual(ns(A.sortMediaRows(rows, { key: 'n', dir: 'desc' })), [6, 5, 4, 3, 2, 1]);
    assert.deepEqual(ns(rows), [1, 2, 3, 4, 5, 6], 'the input is not reordered');
  });

  it('summary counts present media, not keywords waiting', () => {
    const c = A.mediaSummaryCounts(rows);
    assert.equal(c.total, 6);
    assert.equal(c.missing, 1);
    assert.equal(c.failed, 1);
    assert.equal(c.local, 1);
    assert.equal(c.gif, 1);
    assert.equal(c.image, 1);
    assert.equal(c.audio, 1);
  });
});

describe('Media Manager selection', () => {
  let A;
  beforeEach(() => { ({ A } = load(() => jsonRes(200, {}))); });
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const visible = [a, b, c, d, e];
  const ids = (set) => [...set].map((q) => q.id).sort().join('');

  it('plain click selects only that question and sets the anchor', () => {
    const r = A.nextMediaSelection(new Set([a, b]), visible, c, {}, a);
    assert.equal(ids(r.selected), 'c');
    assert.equal(r.anchor, c);
  });

  it('Ctrl/⌘ toggles one question', () => {
    let r = A.nextMediaSelection(new Set([a]), visible, c, { ctrl: true }, a);
    assert.equal(ids(r.selected), 'ac');
    r = A.nextMediaSelection(r.selected, visible, a, { ctrl: true }, r.anchor);
    assert.equal(ids(r.selected), 'c');
  });

  it('Shift selects the range from the anchor, either direction, keeping the anchor', () => {
    let r = A.nextMediaSelection(new Set([b]), visible, d, { shift: true }, b);
    assert.equal(ids(r.selected), 'bcd');
    assert.equal(r.anchor, b);
    r = A.nextMediaSelection(r.selected, visible, a, { shift: true }, b);
    assert.equal(ids(r.selected), 'ab', 'a new Shift range replaces the last one');
  });

  it('Ctrl/⌘+Shift adds a range to the selection', () => {
    const r = A.nextMediaSelection(new Set([a]), visible, e, { ctrl: true, shift: true }, d);
    assert.equal(ids(r.selected), 'ade');
  });

  it('ranges follow the visible (filtered, sorted) order', () => {
    const sorted = [e, c, a];
    const r = A.nextMediaSelection(new Set([e]), sorted, a, { shift: true }, e);
    assert.equal(ids(r.selected), 'ace');
  });

  it('Shift with the anchor filtered out acts as a plain click', () => {
    const r = A.nextMediaSelection(new Set([b]), [c, d, e], d, { shift: true }, b);
    assert.equal(ids(r.selected), 'd');
    assert.equal(r.anchor, d);
  });
});

describe('nextMediaResult (Regenerate)', () => {
  let A;
  beforeEach(() => { ({ A } = load(() => jsonRes(200, {}))); });
  const items = [{ url: 'u0' }, { url: 'u1' }, { url: 'u2' }];

  it('takes the result after the current one and wraps around', () => {
    assert.equal(A.nextMediaResult(items, 'u0').item.url, 'u1');
    assert.equal(A.nextMediaResult(items, 'u2').item.url, 'u0');
  });

  it('uses the remembered index when the current media is not in the list', () => {
    assert.equal(A.nextMediaResult(items, 'data:image/jpeg;base64,AA', 0).item.url, 'u1');
    assert.equal(A.nextMediaResult(items, 'data:x', 2).index, 0);
    assert.equal(A.nextMediaResult(items, 'elsewhere').item.url, 'u0', 'unknown origin starts at the first result');
  });

  it('never returns the current media; none when it is the only result', () => {
    assert.equal(A.nextMediaResult([{ url: 'u0' }], 'u0'), null);
    assert.equal(A.nextMediaResult([], 'u0'), null);
  });
});

describe('job outcomes', () => {
  let A;
  beforeEach(() => { ({ A } = load(() => jsonRes(200, {}))); });

  it('keeps the worst outcome per question', () => {
    const filled = { status: 'filled' };
    const failed = { status: 'failed', reason: 'x' };
    assert.equal(A.worseMediaOutcome(filled, failed), failed);
    assert.equal(A.worseMediaOutcome(failed, filled), failed);
    assert.equal(A.worseMediaOutcome({ status: 'skipped' }, filled), filled);
    assert.equal(A.worseMediaOutcome(undefined, filled), filled);
  });

  it('records failures and clears them when a question is filled', () => {
    const [a, b, c, d] = [{}, {}, {}, {}];
    const failures = new Map([[a, { status: 'failed', reason: 'old' }], [d, { status: 'failed', reason: 'keep' }]]);
    const counts = A.applyMediaJobOutcomes(failures, new Map([
      [a, { status: 'filled' }],
      [b, { status: 'limited', reason: 'GIF limit' }],
      [c, { status: 'skipped' }],
      [d, { status: 'skipped' }],
    ]));
    assert.deepEqual({ ...counts }, { filled: 1, failed: 0, limited: 1, skipped: 2 });
    assert.equal(failures.has(a), false);
    assert.equal(failures.get(b).reason, 'GIF limit');
    assert.equal(failures.get(d).reason, 'keep', 'skipping a question leaves its failure');
  });
});

describe('Regenerate and Generate missing on single questions', () => {
  it('Regenerate walks through the GIF results of the keyword with one search', async () => {
    const { A, calls, sandbox } = load((url) => jsonRes(200, { items: gifItems(new URL(url).searchParams.get('q'), 3) }));
    const q = { type: 'mcq', gifKeyword: 'cat' };
    sandbox.quiz = { questions: [q], ttsLanguage: 'EN' };
    await A.generateMissingVisualFor(q);
    const first = q.imageData;
    assert.match(first, /cat\/0\.gif$/);
    const seen = [];
    for (let i = 0; i < 3; i++) {
      const r = await A.regenerateVisualFor(q);
      assert.equal(r.status, 'filled');
      seen.push(q.imageData.split('/').pop());
    }
    assert.deepEqual(seen, ['1.gif', '2.gif', '0.gif']);
    assert.equal(calls.filter((u) => u.includes('/api/gifs/search')).length, 1);
  });

  it('Regenerate imports the next picture, not the first again', async () => {
    const imported = [];
    const { A, sandbox } = load((url, opts) => {
      if (url.includes('openverse')) return jsonRes(200, { results: [{ url: 'https://img.test/p0.jpg' }, { url: 'https://img.test/p1.jpg' }] });
      if (url.includes('/api/images/fetch')) {
        imported.push(JSON.parse(opts.body).url);
        return jsonRes(200, { dataUrl: 'data:image/jpeg;base64,AA' });
      }
      return jsonRes(404, {});
    });
    const q = { type: 'mcq', imageKeyword: 'pear', imageData: 'https://api.pinplay.win/api/media/q/images/q0-a.jpg' };
    sandbox.quiz = { questions: [q], ttsLanguage: 'EN' };
    const r = await A.regenerateVisualFor(q);
    assert.equal(r.status, 'filled');
    assert.ok(q.imageData.startsWith('data:image/jpeg'));
    assert.deepEqual(imported, ['https://img.test/p1.jpg']);
    assert.equal(A.mediaManagerState.picks.get(q), 1);
  });

  it('Regenerate without a keyword fails with a hint, and is held back while GIFs are paused', async () => {
    const { A, sandbox } = load(() => jsonRes(200, { items: [] }));
    const noKeyword = { type: 'mcq', imageData: 'https://media.giphy.com/x/1.gif' };
    const paused = { type: 'mcq', gifKeyword: 'dog', imageData: 'https://media.giphy.com/dog/0.gif' };
    sandbox.quiz = { questions: [noKeyword, paused], ttsLanguage: 'EN' };
    assert.match((await A.regenerateVisualFor(noKeyword)).reason, /No GIF keyword/);
    A.mediaSearchState.gifPausedUntil = Date.now() + 60000;
    assert.equal((await A.regenerateVisualFor(paused)).status, 'limited');
  });

  it('Generate missing falls back from a video keyword to the GIF keyword', async () => {
    const { A, sandbox } = load((url) => {
      if (url.includes('/api/videos/search')) return jsonRes(200, { items: [] });
      if (url.includes('/api/gifs/search')) return jsonRes(200, { items: gifItems('wave', 1) });
      return jsonRes(404, {});
    });
    const q = { type: 'mcq', videoKeyword: 'waving', gifKeyword: 'wave' };
    sandbox.quiz = { questions: [q], ttsLanguage: 'EN' };
    const r = await A.generateMissingVisualFor(q);
    assert.equal(r.status, 'filled');
    assert.match(q.imageData, /giphy/);
  });

  it('Generate missing leaves questions that are not missing anything alone', async () => {
    const { A, calls, sandbox } = load(() => jsonRes(200, { items: gifItems('x') }));
    const q = { type: 'mcq', gifKeyword: 'x', imageData: 'https://media.giphy.com/keep.gif' };
    sandbox.quiz = { questions: [q], ttsLanguage: 'EN' };
    assert.equal((await A.generateMissingVisualFor(q)).status, 'skipped');
    assert.equal(q.imageData, 'https://media.giphy.com/keep.gif');
    assert.equal(calls.length, 0);
  });
});

describe('generateMissingTtsFor', () => {
  it('prepares keys for missing TTS and puts them on R2 in chunks of 25 when signed in', async () => {
    const batches = [];
    const { A, sandbox } = load((url, opts) => {
      const items = JSON.parse(opts.body).items;
      batches.push(items.length);
      return jsonRes(200, { results: items.map((it, i) => (it.text === 'Q7' ? { ok: false } : { ok: true, key: `ws/tts/${i}.mp3` })) });
    });
    const questions = Array.from({ length: 30 }, (_, i) => ({ type: 'mcq', audioMode: 'tts', prompt: `Q${i}` }));
    questions.push({ type: 'mcq', audioMode: 'tts', prompt: 'ready', ttsAudioKey: 'tts/done.mp3' });
    sandbox.quiz = { questions, ttsLanguage: 'EN', readAllQuestionsAloud: false };
    sandbox.createSessionPassword = 'secret';
    const outcomes = await A.generateMissingTtsFor(questions, { cancelled: false });
    assert.deepEqual(batches, [25, 5]);
    assert.equal(outcomes.size, 30, 'the question that already had audio is left out');
    assert.equal(outcomes.get(questions[7]).status, 'failed');
    assert.equal(questions[7].ttsAudioKey, '');
    assert.equal(outcomes.get(questions[8]).status, 'filled');
    assert.match(questions[8].ttsAudioKey, /^ws\/tts\//);
  });

  it('when not signed in, computes the keys and leaves R2 to the next publish', async () => {
    const { A, calls, sandbox } = load(() => jsonRes(500, {}));
    const q = { type: 'mcq', audioMode: 'tts', prompt: 'Hello' };
    sandbox.quiz = { questions: [q], ttsLanguage: 'EN' };
    const outcomes = await A.generateMissingTtsFor([q], { cancelled: false });
    assert.equal(outcomes.get(q).status, 'filled');
    assert.match(q.ttsAudioKey, /^tts\/[0-9a-f]{64}\.mp3$/);
    assert.equal(calls.length, 0);
  });
});

describe('removeMediaFrom', () => {
  let A;
  beforeEach(() => { ({ A } = load(() => jsonRes(200, {}))); });

  it('removes pictures/GIFs with their keywords, but not a pin question\'s map', () => {
    const gif = { type: 'mcq', imageData: 'https://media.giphy.com/a.gif', gifKeyword: 'a', _imageVersion: 'x' };
    const pin = { type: 'pin', imageData: 'data:image/png;base64,MAP' };
    const none = { type: 'mcq' };
    assert.equal(A.removeMediaFrom([gif, pin, none], 'visual'), 1);
    assert.equal(gif.imageData, '');
    assert.equal(gif.gifKeyword, '');
    assert.equal(pin.imageData, 'data:image/png;base64,MAP');
  });

  it('removes videos and audio with what would bring them back', () => {
    const v = { type: 'mcq', media: { kind: 'video', url: 'https://youtu.be/x' }, videoKeyword: 'x' };
    const a = { type: 'mcq', audioMode: 'tts', audioText: 'Say it', ttsAudioKey: 'tts/a.mp3' };
    assert.equal(A.removeMediaFrom([v], 'video'), 1);
    assert.equal(v.media.kind, 'none');
    assert.equal(v.videoKeyword, '');
    assert.equal(A.removeMediaFrom([a], 'audio'), 1);
    assert.deepEqual([a.audioMode, a.audioText, a.ttsAudioKey], ['tts', '', ''], 'back to reading the question, as the builder would');
    assert.equal(A.removeMediaFrom([{ type: 'mcq', audioMode: 'tts', prompt: 'x' }], 'audio'), 0, 'nothing to remove from plain read-aloud');
  });
});
describe('GIF pause and the cache', () => {
  it('while paused, keywords already searched still fill from the cache', async () => {
    const { A, calls } = load((url) => {
      const kw = new URL(url).searchParams.get('q');
      if (kw === 'wow') return jsonRes(429, { error: 'GIPHY search limit reached (HTTP 429).', rateLimited: true });
      return jsonRes(200, { items: gifItems(kw) });
    });
    const qs = [
      { type: 'mcq', gifKeyword: 'happy' },
      { type: 'mcq', gifKeyword: 'wow' },
      { type: 'mcq', gifKeyword: 'happy' },
      { type: 'mcq', gifKeyword: 'new' },
    ];
    const r = await A.autoFillImages(qs, null);
    assert.ok(qs[0].imageData && qs[2].imageData, 'both "happy" questions filled');
    assert.equal(r.outcomes.get(qs[1]).status, 'limited');
    assert.equal(r.outcomes.get(qs[3]).status, 'limited', 'a new keyword waits');
    assert.equal(calls.length, 2);
    assert.equal(A.isGifKeywordBlocked('Happy'), false);
    assert.equal(A.isGifKeywordBlocked('new'), true);
  });
});
describe('Replace: setMediaKeywordOn', () => {
  it('drops the current media and other keywords and sets the new one', () => {
    const { A } = load(() => jsonRes(200, {}));
    const img = { type: 'mcq', imageData: 'data:image/png;base64,AA', imageKeyword: 'apple', gifKeyword: 'old' };
    const vid = { type: 'mcq', media: { kind: 'video', url: 'https://youtu.be/x' }, videoKeyword: 'x' };
    const reading = { type: 'mcq', readingText: 'A story' };
    const pin = { type: 'pin', imageData: 'data:image/png;base64,MAP' };
    const changed = A.setMediaKeywordOn([img, vid, reading, pin], 'gif', ' dancing cat ');
    assert.equal(changed.length, 2);
    assert.deepEqual([img.imageData, img.imageKeyword, img.gifKeyword, img.videoKeyword], ['', '', 'dancing cat', '']);
    assert.equal(vid.media.kind, 'none');
    assert.equal(vid.gifKeyword, 'dancing cat');
    assert.equal(pin.imageData, 'data:image/png;base64,MAP');
    assert.equal(A.questionMediaStatus(img, {}).visual.status, 'missing', 'ready for Generate missing');
  });

  it('ignores an empty keyword or unknown kind', () => {
    const { A } = load(() => jsonRes(200, {}));
    const q = { type: 'mcq', imageData: 'https://x/a.jpg' };
    assert.equal(A.setMediaKeywordOn([q], 'gif', '  ').length, 0);
    assert.equal(A.setMediaKeywordOn([q], 'audio', 'x').length, 0);
    assert.equal(q.imageData, 'https://x/a.jpg');
  });
});

describe('Change voice', () => {
  const EN = { ttsLanguage: 'EN', readAllQuestionsAloud: false };

  it('sets the voice on TTS questions only and drops the old clip key', () => {
    const { A } = load(() => jsonRes(200, {}));
    const tts = { type: 'mcq', audioMode: 'tts', prompt: 'Hi', ttsAudioKey: 'tts/old.mp3', language: 'en-US-AriaNeural' };
    const file = { type: 'mcq', audioMode: 'file', audioData: 'https://x/a.mp3', language: 'en-US-AriaNeural' };
    const voice = A.EDGE_TTS_VOICE_INDEX.find((v) => !Object.values(A.EDGE_TTS_LANGUAGE_DEFAULTS).includes(v.code)).code;
    const changed = A.setTtsVoiceOn([tts, file], voice, EN);
    assert.equal(changed.length, 1);
    assert.equal(tts.language, voice);
    assert.equal(tts.ttsAudioKey, '');
    assert.equal(file.language, 'en-US-AriaNeural');
    assert.equal(A.setTtsVoiceOn([tts], 'xx-Not-A-Voice', EN).length, 0);
  });

  it('the voice survives the publish preparation and the builder dropdown', () => {
    const { A } = load(() => jsonRes(200, {}));
    const voice = A.EDGE_TTS_VOICE_INDEX.find((v) => !Object.values(A.EDGE_TTS_LANGUAGE_DEFAULTS).includes(v.code)).code;
    const q = { type: 'mcq', audioMode: 'tts', prompt: 'Hi', language: voice };
    const clip = A.prepareQuestionTts(q, 'EN', false);
    assert.equal(clip.voice, voice);
    // The builder's voice <select> must list it, or syncing would fall back to the first default.
    const html = A.buildAudioSettingsMarkup(0, q);
    assert.match(html, new RegExp(`<option value="${voice}" selected>`));
  });
});