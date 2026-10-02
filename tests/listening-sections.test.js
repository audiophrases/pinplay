const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractDeclaration, loadDeclarations } = require('./helpers/extract-declaration');

// Listening sections, phase 1 (LISTENING_MODE_PLAN.md): the data model as the
// server and the page clean it, recordings in cloud storage, no adaptive.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SHARED = ['LISTENING_SECTION_TYPES', 'LISTENING_MAX_SECTIONS', 'LISTENING_DEFAULT_PLAYS',
  'sanitizeListeningSectionId', 'normalizeListeningAudio', 'normalizeListeningSectionList',
  'assignListeningMembership', 'stripListeningQuestionMedia', 'normalizeListeningSections'];

let W;
before(() => {
  W = loadDeclarations(read('cloudflare/worker.js'), [
    'CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', 'round', 'randomId', 'normalizeTimeLimitValue', 'minTimeByType',
    'normalizeQuestionMedia', 'normalizeTextAnswer', 'tokenizeWords', 'tokenEditDistance', 'getCorrectedVariantsList',
    'countErrorHuntRequiredTokens', 'normalizeWordle', 'detectQuestionMediaProvider', ...SHARED, 'normalizeQuiz',
    'extractMediaPrefixesFromQuiz', 'extractBase64MediaToR2', 'arenaEligibleIndexes', 'autoGradedQuestionIndexes',
    'isAssignmentTeacherGradedQuestion', 'isTeacherGradedTextQuestion',
  ], { crypto: require('node:crypto').webcrypto, atob, btoa });
});

const plain = (v) => JSON.parse(JSON.stringify(v));
const mcq = (id, extra = {}) => ({ id, type: 'mcq', prompt: `Q ${id}?`, answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }], ...extra });
const section = (id, extra = {}) => ({ id, title: 'Part 1', text: 'You will hear…', audio: { kind: 'file', url: 'https://api.pinplay.win/api/media/quiz-1/listening/a.mp3' }, playsAllowed: 2, pauseAllowed: true, ...extra });

describe('the page and the server clean sections the same way', () => {
  it('uses one identical copy of every section function in app.js and worker.js', () => {
    const app = read('app.js');
    const worker = read('cloudflare/worker.js');
    SHARED.forEach((name) => assert.equal(extractDeclaration(app, name), extractDeclaration(worker, name), name));
  });
});

describe('server: normalizeQuiz', () => {
  it('keeps a section and its questions, and the settings', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [section('s1', { playsAllowed: 0, pauseAllowed: false })],
      questions: [mcq('q1'), mcq('q2', { listeningSection: 's1' }), mcq('q3', { listeningSection: 's1' }), mcq('q4')] });
    assert.deepEqual(plain(quiz.questions.map((q) => q.listeningSection || '')), ['', 's1', 's1', '']);
    assert.equal(quiz.listeningSections.length, 1);
    assert.equal(quiz.listeningSections[0].playsAllowed, 0);
    assert.equal(quiz.listeningSections[0].pauseAllowed, false);
    assert.equal(quiz.listeningSections[0].title, 'Part 1');
  });

  it('leaves no trace on a quiz without sections', () => {
    const quiz = W.normalizeQuiz({ title: 'Plain', questions: [mcq('q1')] });
    assert.equal('listeningSections' in quiz, false);
    assert.equal('listeningSection' in quiz.questions[0], false);
  });

  it('keeps each section in one unbroken run: a question cut off from it leaves', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [section('s1')],
      questions: [mcq('q1', { listeningSection: 's1' }), mcq('q2', { listeningSection: 's1' }), mcq('q3'), mcq('q4', { listeningSection: 's1' })] });
    assert.deepEqual(plain(quiz.questions.map((q) => q.listeningSection || '')), ['s1', 's1', '', '']);
  });

  it('keeps two sections next to each other apart', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [section('a'), section('b')],
      questions: [mcq('q1', { listeningSection: 'a' }), mcq('q2', { listeningSection: 'b' }), mcq('q3', { listeningSection: 'b' })] });
    assert.deepEqual(plain(quiz.questions.map((q) => q.listeningSection)), ['a', 'b', 'b']);
    assert.equal(quiz.listeningSections.length, 2);
  });

  it('takes out types that do not fit a listening sheet, and unknown sections', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [section('s1')], questions: [
      mcq('q1', { listeningSection: 's1' }),
      { id: 'sp', type: 'speaking', prompt: 'Talk', listeningSection: 's1' },
      mcq('q3', { listeningSection: 'nope' }),
    ] });
    assert.deepEqual(plain(quiz.questions.map((q) => q.listeningSection || '')), ['s1', '', '']);
  });

  it('removes every picture, GIF, video, reading text and question audio inside a section', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [section('s1')], questions: [
      mcq('in', { listeningSection: 's1', imageData: 'https://x/y.png', readingText: 'passage', audioEnabled: true, audioData: 'https://x/a.mp3', media: { url: 'https://youtu.be/abc' } }),
      mcq('out', { imageData: 'https://x/y.png', readingText: 'passage' }),
    ] });
    const [inside, outside] = quiz.questions;
    assert.equal(inside.imageData, '');
    assert.equal(inside.readingText, '');
    assert.equal(inside.audioEnabled, false);
    assert.equal(inside.audioData, '');
    assert.equal(inside.media.kind, 'none');
    assert.equal(outside.imageData, 'https://x/y.png');
    assert.equal(outside.readingText, 'passage');
  });

  it('drops sections with no questions, bad ids, duplicates, and bad recordings', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [
      section('empty'), section('bad id!'), section('s1', { audio: { kind: 'file', url: 'javascript:alert(1)' }, playsAllowed: 9 }), section('s1'),
    ], questions: [mcq('q1', { listeningSection: 's1' })] });
    assert.deepEqual(quiz.listeningSections.map((s) => s.id), ['s1']);
    assert.equal(quiz.listeningSections[0].audio, null);
    assert.equal(quiz.listeningSections[0].playsAllowed, 2);
  });
});

describe('recordings in cloud storage', () => {
  it('the media clean-up job sees a section recording as in use', () => {
    const prefixes = W.extractMediaPrefixesFromQuiz({ questions: [mcq('q1')], listeningSections: [section('s1')] });
    assert.ok(prefixes.has('quiz-1'));
  });

  it('an embedded recording is uploaded when the quiz is assigned', async () => {
    const puts = [];
    const env = { QUIZ_MEDIA: { put: async (key, bytes, meta) => { puts.push({ key, size: bytes.length, type: meta.httpMetadata.contentType }); } } };
    const quiz = { questions: [mcq('q1', { listeningSection: 's1' })], listeningSections: [section('s1', { audio: { kind: 'file', url: `data:audio/mpeg;base64,${btoa('ID3fake')}` } })] };
    const out = await W.extractBase64MediaToR2(quiz, env, 'assign-test');
    assert.equal(puts.length, 1);
    assert.equal(puts[0].key, 'assign-test/listening/s1.mp3');
    assert.equal(puts[0].type, 'audio/mpeg');
    assert.match(out.listeningSections[0].audio.url, /\/api\/media\/assign-test\/listening\/s1\.mp3$/);
  });
});

describe('PinPlay Cup', () => {
  it('never deals a listening-section question', () => {
    const room = { quiz: { questions: [mcq('q1'), mcq('q2', { listeningSection: 's1' }), mcq('q3')] } };
    assert.deepEqual(Array.from(W.arenaEligibleIndexes(room)), [0, 2]);
  });
});

describe('assignments with listening sections (real worker, in-memory storage)', () => {
  let post;
  const PW = 'teacher-secret';
  before(async () => {
    const os = require('node:os');
    const tmp = path.join(os.tmpdir(), `pinplay-worker-listening-${process.pid}-${Date.now()}.mjs`);
    fs.writeFileSync(tmp, read('cloudflare/worker.js'));
    const mod = await import(`file://${tmp.replace(/\\/g, '/')}`);
    fs.unlinkSync(tmp);
    const storage = () => {
      const map = new Map();
      return {
        async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
        async put(k, v) { map.set(k, structuredClone(v)); },
        async delete(k) { return map.delete(k); },
        async list({ prefix = '' } = {}) { return new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])); },
      };
    };
    const rooms = new Map();
    const env = {
      CREATE_PASSWORD_HASH: require('node:crypto').createHash('sha256').update(PW).digest('hex'),
      ROOMS: { idFromName: (n) => n, get: (n) => { if (!rooms.has(n)) rooms.set(n, new mod.QuizRoom({ storage: storage() }, env)); const r = rooms.get(n); return { fetch: (u, i) => r.fetch(new Request(u, i)) }; } },
      QUIZ_MEDIA: null,
    };
    post = async (p, body) => {
      const res = await mod.default.fetch(new Request(`https://api.test${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
      return { status: res.status, body: await res.json() };
    };
  });

  const levelled = () => ({
    title: 'Listening + levels',
    listeningSections: [section('s1')],
    questions: [mcq('q1', { cefr: 'A1' }), mcq('q2', { cefr: 'B1', listeningSection: 's1' }), mcq('q3', { cefr: 'B2', listeningSection: 's1' })],
  });

  it('refuses an adaptive assignment for a quiz with sections', async () => {
    const r = await post('/api/assignments/create', { password: PW, quiz: levelled(), adaptiveCount: 3 });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /listening sections can't be adaptive/);
  });

  it('keeps the sections on a normal assignment', async () => {
    const r = await post('/api/assignments/create', { password: PW, quiz: levelled() });
    assert.equal(r.status, 201);
    const got = await post('/api/assignments/get-quiz', { password: PW, code: r.body.assignment.code });
    assert.equal(got.status, 200, JSON.stringify(got.body));
    assert.deepEqual(plain(got.body.quiz.listeningSections.map((s) => s.id)), ['s1']);
    assert.deepEqual(plain(got.body.quiz.questions.map((q) => q.listeningSection || '')), ['', 's1', 's1']);
  });
});
