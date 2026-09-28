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
  'isRateLimitError', 'isGifSearchPaused', 'cachedMediaSearch',
  'searchGifsForKeyword', 'searchImagesForKeyword', 'giphySearch', 'autoFillImages',
];

const interpolate = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

// A fresh sandbox per test: the cache and the GIF pause are module state.
function load(fetchImpl) {
  const calls = [];
  const sandbox = {
    t: interpolate,
    URL,
    URLSearchParams,
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
  return { A, calls };
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
