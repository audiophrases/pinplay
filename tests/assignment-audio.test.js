const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadDeclarations } = require('./helpers/extract-declaration');

const source = fs.readFileSync(path.join(__dirname, '..', 'play.js'), 'utf8');
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

function setup() {
  const clips = [];
  const timers = new Set();
  const context = {
    assignmentQuestionAudioStopGen: 0,
    activeAssignmentQuestionAudioEl: null,
    activeAssignmentQuestionAudioFinish: null,
    assignmentPromptAutoplayTimer: null,
    lastAssignmentAudioKey: 'old',
    lastRenderedQuestionIndex: 0,
    assignmentQuestionChanged: true,
    isAssignmentQuestionPhase: true,
    state: { currentIndex: 1, question: { audioEnabled: false } },
    live: { player: { assignment: {} } },
    pickNewAnsweringTrack() {},
    playAssignmentSfx() {},
    window: { speechSynthesis: { cancel() {} } },
    setAssignmentAudioPlayingUi(value) { context.playing = value; },
    hideAssignmentAudioBarsEarly() {},
    hasAssignmentQuestionAudio: (q) => !!q.audioEnabled,
    pauseAssignmentAnsweringAmbient() {},
    stopAllAssignmentAmbient() {},
    questionSpeechText: (q) => q.prompt,
    // The silence that wakes the sound output (tested on its own below).
    wakeAudioOutput: async () => {},
    TTS_GAP: /___/,
    loadBackendUrl: () => 'https://example.test',
    normalizeBackendUrl: (url) => url,
    DEFAULT_BACKEND_URL: 'https://example.test',
    studentEdgeTtsCache: new Map(),
    URL: { createObjectURL: () => 'blob:tts' },
    fetch: async () => ({ ok: true, blob: async () => ({}) }),
    setTimeout(fn) { timers.add(fn); return fn; },
    clearTimeout(fn) { timers.delete(fn); },
    Audio: class {
      constructor(url) { this.url = url; this.events = {}; clips.push(this); }
      addEventListener(event, fn) { this.events[event] = fn; }
      play() { this.playing = true; return Promise.resolve(); }
      pause() { this.playing = false; }
    },
  };
  const api = loadDeclarations(source, [
    'cancelPendingAssignmentQuestionAutoplay',
    'stopAssignmentQuestionAudioPlayback', 'playAssignmentQuestionAudio',
  ], context);
  // Execute the actual render transition without constructing the unrelated UI.
  const start = source.indexOf('  if (assignmentQuestionChanged) {');
  const end = source.indexOf('  const shouldRenderQuestion', start);
  const navigate = () => vm.runInContext(source.slice(start, end), context);
  return { context, api, clips, timers, navigate };
}

const question = { audioEnabled: true, prompt: 'Question', ttsAudioKey: 'tts/prompt.mp3' };
// Lets a clip start: question audio first waits for the silence that wakes the output.
const flush = () => new Promise((r) => setImmediate(r));

test('navigation to a silent question stops playback and queued autoplay immediately', async () => {
  const { context, api, clips, timers, navigate } = setup();
  const playback = api.playAssignmentQuestionAudio(question);
  await flush();
  context.assignmentPromptAutoplayTimer = context.setTimeout(() => {});
  assert.equal(clips[0].playing, true);
  navigate();
  assert.equal(clips[0].playing, false);
  assert.equal(await playback, 'aborted');
  assert.equal(timers.size, 0);
  assert.equal(context.lastAssignmentAudioKey, '');
  assert.equal(context.playing, false);
});

test('a late TTS response cannot play over the next question', async () => {
  const { context, api, clips, navigate } = setup();
  const response = deferred();
  context.fetch = () => response.promise;
  const old = api.playAssignmentQuestionAudio({ ...question, ttsAudioKey: '' });
  await flush();
  navigate();
  const current = api.playAssignmentQuestionAudio(question);
  await flush();
  response.resolve({ ok: true, blob: async () => ({}) });
  assert.equal(await old, 'aborted');
  assert.equal(clips.length, 1);
  assert.equal(clips[0].playing, true);
  clips[0].events.ended();
  assert.equal(await current, true);
});

test('rapid navigation cancels each prompt without restarting a fallback', async () => {
  const { api, clips, navigate } = setup();
  for (let i = 0; i < 4; i += 1) {
    const playback = api.playAssignmentQuestionAudio(question);
    await flush();
    navigate();
    assert.equal(await playback, 'aborted');
  }
  assert.equal(clips.length, 4);
  assert.ok(clips.every((clip) => !clip.playing));
});

test('browser speech cancellation settles playback and late completion preserves the new indicator', async () => {
  const { context, api, clips, navigate } = setup();
  const speech = deferred();
  const started = deferred();
  context.fetch = async () => { throw new Error('offline'); };
  context.speakTtsSegmentsInBrowser = () => { started.resolve(); return speech.promise; };
  const old = api.playAssignmentQuestionAudio({ ...question, ttsAudioKey: '' });
  await started.promise;
  navigate();
  assert.equal(await old, 'aborted');
  const current = api.playAssignmentQuestionAudio(question);
  await flush();
  speech.resolve(true);
  await Promise.resolve();
  assert.equal(context.playing, true);
  clips[0].events.ended();
  assert.equal(await current, true);
});

// A file that does not play is not replaced by reading the question aloud:
// the teacher chose the file. Only a script stored beside it (an old
// assignment whose read-aloud became a generated file) is read instead.
function failingFileSetup() {
  const env = setup();
  const fetched = [];
  env.context.fetch = async (url) => { fetched.push(url); return { ok: true, blob: async () => ({}) }; };
  env.context.questionSpeechText = (q) => String(q.audioText || '').trim() || q.prompt;
  env.context.Audio = class {
    constructor(url) { this.url = url; this.events = {}; env.clips.push(this); }
    addEventListener(event, fn) { this.events[event] = fn; }
    play() {
      if (this.url.endsWith('.mp3') && this.url.includes('/files/')) return Promise.reject(new Error('404'));
      this.playing = true;
      setImmediate(() => this.events.ended && this.events.ended());
      return Promise.resolve();
    }
    pause() { this.playing = false; }
  };
  return { ...env, fetched };
}

test('a missing audio file plays nothing in its place', async () => {
  const { api, clips, fetched } = failingFileSetup();
  const result = await api.playAssignmentQuestionAudio({
    audioEnabled: true, audioMode: 'file', audioData: 'https://example.test/files/a.mp3', prompt: 'Question', language: 'en-US-AriaNeural',
  });
  assert.equal(result, false);
  assert.equal(clips.length, 1);
  assert.deepEqual(fetched, [], 'no live read-aloud of the question');
});

test('a missing generated file from an old assignment reads its script', async () => {
  const { api, fetched } = failingFileSetup();
  const result = await api.playAssignmentQuestionAudio({
    audioEnabled: true, audioMode: 'file', audioData: 'https://example.test/files/a.mp3', audioText: 'Listen carefully.', prompt: 'Question', language: 'en-US-AriaNeural',
  });
  assert.equal(result, true);
  assert.deepEqual(fetched, ['https://example.test/api/tts/edge']);
});

// A live Edge clip the browser refuses to play is not a success: the
// browser's own voice reads the question instead.
test('a live clip the browser will not play falls back to the browser voice', async () => {
  const { context, api } = setup();
  context.Audio = class {
    constructor(url) { this.url = url; this.events = {}; }
    addEventListener(event, fn) { this.events[event] = fn; }
    play() { return Promise.reject(new Error('NotAllowedError')); }
    pause() {}
  };
  const spoken = [];
  context.speakTtsSegmentsInBrowser = async (text, lang) => { spoken.push([text, lang]); return true; };
  const result = await api.playAssignmentQuestionAudio({ audioEnabled: true, prompt: 'Question', ttsAudioKey: '', language: 'en-US-AriaNeural' });
  assert.equal(result, true);
  assert.deepEqual(spoken, [['Question', 'en-US-AriaNeural']]);
});

// Before a question's audio, 0.3 s of silence wakes the sound output (a
// projector, Bluetooth headphones or a Chromebook lost the first syllable).
const { extractDeclaration } = require('./helpers/extract-declaration');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('the wake-up silence is the same in both players', () => {
  for (const name of ['AUDIO_WAKE_MS', 'wakeAudioOutput']) {
    assert.equal(extractDeclaration(appSource, name), extractDeclaration(source, name), name);
  }
});

test('the wake-up silence is 0.3 s of silent WAV, played whole, and made once', async () => {
  const blobs = [];
  const played = [];
  const context = {
    audioWakeUrl: '',
    URL: { createObjectURL: (blob) => { blobs.push(blob); return `blob:silence${blobs.length}`; } },
    Blob,
    setTimeout: () => 0,
    Audio: class {
      constructor(url) { this.url = url; this.events = {}; }
      addEventListener(event, fn) { this.events[event] = fn; }
      play() { played.push(this.url); setImmediate(() => this.events.ended()); return Promise.resolve(); }
    },
  };
  const { wakeAudioOutput } = loadDeclarations(source, ['AUDIO_WAKE_MS', 'wakeAudioOutput'], context);
  await wakeAudioOutput();
  await wakeAudioOutput();
  assert.equal(blobs.length, 1, 'the silence is made once');
  assert.deepEqual(played, ['blob:silence1', 'blob:silence1']);
  const bytes = new Uint8Array(await blobs[0].arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (at, n) => String.fromCharCode(...bytes.slice(at, at + n));
  assert.deepEqual([text(0, 4), text(8, 4), text(12, 4), text(36, 4)], ['RIFF', 'WAVE', 'fmt ', 'data']);
  assert.equal(view.getUint32(4, true), bytes.length - 8);
  const [channels, rate, byteRate, bits, size] = [view.getUint16(22, true), view.getUint32(24, true), view.getUint32(28, true), view.getUint16(34, true), view.getUint32(40, true)];
  assert.deepEqual([channels, bits, byteRate], [1, 16, rate * 2]);
  assert.equal(size / byteRate, 0.3, 'seconds of silence');
  assert.ok(bytes.slice(44).every((b) => b === 0), 'every sample is silent');
});

test('the silence plays before the clip, and a stop during it keeps the clip from starting', async () => {
  const { context, api, clips, navigate } = setup();
  const order = [];
  let wake = deferred();
  context.wakeAudioOutput = () => { order.push('silence'); return wake.promise; };
  const AudioBase = context.Audio;
  context.Audio = class extends AudioBase { constructor(url) { super(url); order.push(url); } };
  const first = api.playAssignmentQuestionAudio(question);
  await flush();
  assert.equal(clips.length, 0, 'nothing plays during the silence');
  wake.resolve();
  await flush();
  assert.deepEqual(order, ['silence', 'https://example.test/api/media/tts/prompt.mp3']);
  clips[0].events.ended();
  assert.equal(await first, true);
  // The student moves on while the silence plays: the old question's clip never starts.
  wake = deferred();
  const stopped = api.playAssignmentQuestionAudio(question);
  await flush();
  navigate();
  wake.resolve();
  assert.equal(await stopped, 'aborted');
  assert.equal(clips.length, 1);
});
