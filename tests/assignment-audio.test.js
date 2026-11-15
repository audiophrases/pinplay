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

test('navigation to a silent question stops playback and queued autoplay immediately', async () => {
  const { context, api, clips, timers, navigate } = setup();
  const playback = api.playAssignmentQuestionAudio(question);
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
  navigate();
  const current = api.playAssignmentQuestionAudio(question);
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
  speech.resolve(true);
  await Promise.resolve();
  assert.equal(context.playing, true);
  clips[0].events.ended();
  assert.equal(await current, true);
});
