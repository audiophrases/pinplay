const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractDeclaration, loadDeclarations } = require('./helpers/extract-declaration');

// Listening sections, phase 1 (LISTENING_MODE_PLAN.md): the data model as the
// server and the page clean it, recordings in cloud storage, no adaptive.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SHARED = ['LISTENING_SECTION_TYPES', 'LISTENING_MAX_SECTIONS', 'LISTENING_DEFAULT_PLAYS', 'LISTENING_MAX_TRANSCRIPT',
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
    assert.equal(quiz.listeningSections[0].speedAllowed, true, 'speed is on unless turned off');
    const off = W.normalizeQuiz({ title: 'L', listeningSections: [section('s1', { speedAllowed: false })], questions: [mcq('q1', { listeningSection: 's1' })] });
    assert.equal(off.listeningSections[0].speedAllowed, false);
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

  it('keeps the teacher\'s transcript, trimmed and capped, and leaves no empty one', () => {
    const quiz = W.normalizeQuiz({ title: 'L', listeningSections: [
      section('s1', { transcript: '  Anna: Hi Tom!  ' }), section('s2', { transcript: 'x'.repeat(W.LISTENING_MAX_TRANSCRIPT + 50) }), section('s3', { transcript: '   ' }),
    ], questions: [mcq('q1', { listeningSection: 's1' }), mcq('q2', { listeningSection: 's2' }), mcq('q3', { listeningSection: 's3' })] });
    assert.equal(quiz.listeningSections[0].transcript, 'Anna: Hi Tom!');
    assert.equal(quiz.listeningSections[1].transcript.length, W.LISTENING_MAX_TRANSCRIPT);
    assert.equal('transcript' in quiz.listeningSections[2], false);
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

describe('adaptive listening: blocks and ladders', () => {
  let E;
  before(() => {
    const src = read('cloudflare/worker.js');
    const consts = [...src.matchAll(/^const (ADAPTIVE_[A-Z_]+) =/gm)].map((m) => m[1]);
    E = loadDeclarations(src, ['CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', ...consts, 'adaptiveInit', 'adaptiveBand', 'adaptiveStepScale',
      'adaptiveTally', 'adaptivePathOk', 'adaptiveRecord', 'listeningSectionMoments', 'listeningSectionBlock', 'adaptiveSectionPlan']);
  });
  const q = (id, cefr, s = 'p1') => ({ id, type: 'mcq', listeningSection: s, ...(cefr ? { cefr } : {}) });
  // Grouped by level: 6 moments at every level A1–C2.
  const full = () => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].flatMap((l) => [1, 2, 3, 4, 5, 6].map((m) => q(`${l}-${m}`, l)));
  const idsOf = (questions, block) => plain(block.qis.map((i) => questions[i].id));

  it('a ladder climbs one level per moment, and a known level stays on its level', () => {
    const qs = full();
    assert.deepEqual(idsOf(qs, E.listeningSectionBlock(qs, 'p1', null)), ['A1-1', 'A2-2', 'B1-3', 'B2-4', 'C1-5', 'C2-6']);
    const b1 = E.listeningSectionBlock(qs, 'p1', 2.4);
    assert.deepEqual(idsOf(qs, b1), ['B1-1', 'B1-2', 'B1-3', 'B1-4', 'B1-5', 'B1-6']);
    assert.equal(b1.level, 'B1');
    assert.equal(b1.ladder, false);
  });

  it('spreads fewer levels over the moments, and maps a level the section lacks to the nearest (easier on a tie)', () => {
    const qs = ['A2', 'B1', 'B2'].flatMap((l) => [1, 2, 3, 4, 5, 6].map((m) => q(`${l}-${m}`, l)));
    assert.deepEqual(plain(E.listeningSectionBlock(qs, 'p1', null).qLevels), ['A2', 'A2', 'B1', 'B1', 'B2', 'B2']);
    assert.equal(E.listeningSectionBlock(qs, 'p1', 0.5).level, 'A2'); // A1 -> A2
    assert.equal(E.listeningSectionBlock(qs, 'p1', 5.2).level, 'B2'); // C2 -> B2
    const gap = [...['A2', 'B2'].flatMap((l) => [1, 2].map((m) => q(`${l}-${m}`, l)))];
    assert.equal(E.listeningSectionBlock(gap, 'p1', 2.0).level, 'A2'); // B1: A2 and B2 tie
  });

  it('works grouped by level or by moment, and keeps shared questions in place', () => {
    const byMoment = [q('intro'), q('A1-1', 'A1'), q('A2-1', 'A2'), q('mid'), q('A1-2', 'A1'), q('A2-2', 'A2'), q('outro')];
    assert.deepEqual(idsOf(byMoment, E.listeningSectionBlock(byMoment, 'p1', null)), ['intro', 'A1-1', 'mid', 'A2-2', 'outro']);
    assert.deepEqual(idsOf(byMoment, E.listeningSectionBlock(byMoment, 'p1', 1.5)), ['intro', 'A2-1', 'mid', 'A2-2', 'outro']);
    const grouped = [q('intro'), q('A1-1', 'A1'), q('A1-2', 'A1'), q('A2-1', 'A2'), q('A2-2', 'A2')];
    assert.deepEqual(idsOf(grouped, E.listeningSectionBlock(grouped, 'p1', null)), ['intro', 'A1-1', 'A2-2']);
  });

  it('a level with a missing moment borrows the nearest level\'s question', () => {
    const qs = [q('A1-1', 'A1'), q('A1-2', 'A1'), q('B1-1', 'B1')];
    assert.deepEqual(idsOf(qs, E.listeningSectionBlock(qs, 'p1', 2)), ['B1-1', 'A1-2']);
  });

  it('places each section after the single questions before it', () => {
    const quiz = { listeningSections: [{ id: 'p1' }, { id: 'p2' }], questions: [
      { id: 's1' }, q('a', 'A1'), q('b', 'A2'), { id: 's2' }, { id: 's3' }, q('c', 'A1', 'p2'), q('d', null, 'p2'), { id: 's4', isPoll: true },
    ] };
    assert.deepEqual(JSON.parse(JSON.stringify(E.adaptiveSectionPlan(quiz))), [{ id: 'p1', after: 1, size: 1 }, { id: 'p2', after: 3, size: 2 }]);
  });

  it('on a ladder, a miss above the current level leaves the level alone', () => {
    const L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const run = (results, ladder) => {
      const st = E.adaptiveInit(L, null);
      results.forEach((ok, i) => E.adaptiveRecord(st, i, i, ok, () => 0, { ladder, noRetry: true }));
      return { level: L[E.adaptiveBand(st)], st };
    };
    const truth = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    Object.entries(truth).forEach(([level, n]) => {
      const results = L.map((_, i) => i < n);
      assert.equal(run(results, true).level, level, `ladder, true level ${level}`);
    });
    assert.equal(run([true, true, true, false, false, false], false).level, 'A1', 'without the rule a B1 student ends at A1');
    const { st } = run([true, true, true, false, false, false], true);
    assert.equal(st.retry.length, 0, 'section questions never come back as retries');
    assert.ok(st.path.some((p) => p.held), 'held misses are marked for the report');
  });
});

describe('live levels: a classic game at the ticked levels', () => {
  let E;
  before(() => {
    E = loadDeclarations(read('cloudflare/worker.js'), ['CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', 'listeningSectionMoments',
      'liveLevelList', 'liveLevelSectionPick', 'liveLevelQuiz']);
  });
  const single = (id, cefr) => ({ id, type: 'mcq', ...(cefr ? { cefr } : {}) });
  const sq = (id, cefr) => ({ id, type: 'mcq', listeningSection: 'p1', ...(cefr ? { cefr } : {}) });
  // Untagged and A2–B2 single questions, then a section with 3 moments at A2, B1 and B2 (grouped by level) and a shared intro.
  const quiz = () => ({
    title: 'Levels',
    listeningSections: [{ id: 'p1' }],
    questions: [single('u'), single('a2', 'A2'), single('b1', 'B1'), single('b2', 'B2'), sq('intro'),
      ...['A2', 'B1', 'B2'].flatMap((l) => [1, 2, 3].map((m) => sq(`${l}-${m}`, l))), single('end')],
  });
  const ids = (levels) => plain(E.liveLevelQuiz(quiz(), levels).questions.map((q) => q.id));

  it('keeps the ticked levels\' single questions and every untagged one', () => {
    assert.deepEqual(ids(['B1']), ['u', 'b1', 'intro', 'B1-1', 'B1-2', 'B1-3', 'end']);
  });

  it('gives a section one question per moment: one level, or easy to hard over several', () => {
    assert.deepEqual(ids(['A2', 'B2']), ['u', 'a2', 'b2', 'intro', 'A2-1', 'B2-2', 'B2-3', 'end']);
  });

  it('with every level of the section ticked, keeps all its questions, by moment then easiest level first', () => {
    assert.deepEqual(ids(['A2', 'B1', 'B2']), ['u', 'a2', 'b1', 'b2', 'intro',
      'A2-1', 'B1-1', 'B2-1', 'A2-2', 'B1-2', 'B2-2', 'A2-3', 'B1-3', 'B2-3', 'end']);
  });

  it('keeps every section, at the nearest level it has (easier on a tie)', () => {
    assert.deepEqual(ids(['A1']), ['u', 'intro', 'A2-1', 'A2-2', 'A2-3', 'end']);
    assert.deepEqual(ids(['C2']), ['u', 'intro', 'B2-1', 'B2-2', 'B2-3', 'end']);
    const gap = { listeningSections: [{ id: 'p1' }], questions: [sq('A2-1', 'A2'), sq('B2-1', 'B2')] };
    assert.deepEqual(plain(E.liveLevelQuiz(gap, ['B1']).questions.map((q) => q.id)), ['A2-1']);
  });

  it('leaves the quiz alone without levels, and ignores unknown ones', () => {
    const q = quiz();
    assert.equal(E.liveLevelQuiz(q, []), q);
    assert.equal(E.liveLevelQuiz(q, ['Z9', '']), q);
    assert.deepEqual(plain(E.liveLevelList(['b2', 'A2', 'x'])), ['A2', 'B2']);
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
    post = async (p, body, headers = {}) => {
      const res = await mod.default.fetch(new Request(`https://api.test${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), env);
      return { status: res.status, body: await res.json() };
    };
  });

  const levelled = () => ({
    title: 'Listening + levels',
    listeningSections: [section('s1', { transcript: 'SECRET TRANSCRIPT' })],
    questions: [mcq('q1', { cefr: 'A1' }), mcq('q2', { cefr: 'B1', listeningSection: 's1' }), mcq('q3', { cefr: 'B2', listeningSection: 's1' })],
  });

  // Two parts, each with a shared opener and 3 moments at A1, A2 and B1
  // (grouped by level). Every mcq's first option is right.
  const exam = () => {
    const part = (s) => [
      mcq(`${s}-shared`, { listeningSection: s }),
      ...['A1', 'A2', 'B1'].flatMap((lvl) => [1, 2, 3].map((m) => mcq(`${s}-${lvl}-m${m}`, { cefr: lvl, listeningSection: s }))),
    ];
    return { title: 'Adaptive listening', listeningSections: [section('p1'), section('p2')], questions: [...part('p1'), ...part('p2')] };
  };
  // Students' questions carry no id: the prompt names it ("Q p1-A1-m1?").
  const ids = (body) => body.attempt.assignment.quiz.questions.map((q) => q.prompt.slice(2, -1));

  it('adaptive: a quiz of sections only, a ladder first, then a level block', async () => {
    const created = await post('/api/assignments/create', { password: PW, quiz: exam(), adaptive: true, adaptiveCount: 0, randomNames: true, feedbackMode: 'instant' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const code = created.body.assignment.code;
    const started = await post('/api/assignment/start', { code, studentKey: 'anon-ladder', studentName: 'Lea' });
    assert.ok(started.status < 300, JSON.stringify(started.body));
    const attemptId = started.body.attempt.id;
    assert.equal(started.body.attempt.assignment.totalQuestions, 8);
    assert.deepEqual(plain(started.body.attempt.adaptive), { step: 0, total: 8, done: false });
    // No level yet: shared opener, then moment 1 at A1, 2 at A2, 3 at B1.
    assert.deepEqual(plain(ids(started.body)), ['p1-shared', 'p1-A1-m1', 'p1-A2-m2', 'p1-B1-m3']);

    // Drafts for any question of the open block; nothing beyond it.
    for (const [qIndex, answer] of [[0, 0], [1, 0], [2, 0], [3, 1]]) {
      const r = await post('/api/assignment/answer', { code, attemptId, qIndex, answer });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    const beyond = await post('/api/assignment/answer', { code, attemptId, qIndex: 4, answer: 0 });
    assert.equal(beyond.body.code, 'NOT_CURRENT');
    assert.equal((await post('/api/assignment/submit-section', { code, attemptId, sectionId: 'p2' })).body.code, 'NOT_CURRENT');

    const sub = await post('/api/assignment/submit-section', { code, attemptId, sectionId: 'p1' });
    assert.equal(sub.status, 200, JSON.stringify(sub.body));
    const attempt = sub.body.attempt;
    assert.equal(attempt.adaptive.step, 4);
    assert.deepEqual(plain(attempt.answersWithCorrectness.map((a) => [a.qIndex, a.correct])), [[0, true], [1, true], [2, true], [3, false]]);
    // Part 2 comes as one level's block: right at A1 and A2, wrong at B1 -> A2.
    assert.deepEqual(plain(ids(sub.body).slice(4)), ['p2-shared', 'p2-A2-m1', 'p2-A2-m2', 'p2-A2-m3']);

    await post('/api/assignment/answer', { code, attemptId, qIndex: 5, answer: 0 });
    const done = await post('/api/assignment/submit-section', { code, attemptId, sectionId: 'p2' });
    assert.equal(done.body.attempt.adaptive.done, true);
    const fin = await post('/api/assignment/submit', { code, attemptId });
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
  });

  it('adaptive: a section comes where it sits, on top of the N single questions', async () => {
    const quiz = exam();
    quiz.listeningSections = [section('p1')];
    quiz.questions = [mcq('s1', { cefr: 'A1' }), mcq('s2', { cefr: 'B1' }), ...quiz.questions.filter((q) => q.listeningSection === 'p1'), mcq('s3', { cefr: 'A2' })];
    const created = await post('/api/assignments/create', { password: PW, quiz, adaptiveCount: 3, randomNames: true });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const code = created.body.assignment.code;
    const started = await post('/api/assignment/start', { code, studentKey: 'anon-mixed', studentName: 'Max' });
    const attemptId = started.body.attempt.id;
    assert.equal(started.body.attempt.assignment.totalQuestions, 3 + 4);
    let state = started.body;
    // Two single questions come before the section in the quiz.
    for (let i = 0; i < 2; i += 1) {
      assert.ok(!state.attempt.assignment.quiz.questions[i].listeningSection, `question ${i + 1} is a single one`);
      state = (await post('/api/assignment/answer', { code, attemptId, qIndex: i, answer: 0 })).body;
    }
    // Answers already given: a level block, not a ladder.
    const block = state.attempt.assignment.quiz.questions.slice(2);
    assert.equal(block.length, 4);
    const levels = block.map((q) => q.prompt.match(/-(A1|A2|B1)-/)?.[1]).filter(Boolean);
    assert.equal(levels.length, 3);
    assert.equal(new Set(levels).size, 1, JSON.stringify(block.map((q) => q.prompt)));
    state = (await post('/api/assignment/submit-section', { code, attemptId, sectionId: 'p1' })).body;
    assert.equal(state.attempt.adaptive.step, 6);
    assert.ok(!state.attempt.assignment.quiz.questions[6].listeningSection, 'the third single question comes last');
  });

  it('adaptive: submitting the whole attempt takes an open section\'s drafts', async () => {
    const created = await post('/api/assignments/create', { password: PW, quiz: exam(), adaptive: true, randomNames: true });
    const code = created.body.assignment.code;
    const attemptId = (await post('/api/assignment/start', { code, studentKey: 'anon-stop', studentName: 'Sam' })).body.attempt.id;
    await post('/api/assignment/answer', { code, attemptId, qIndex: 1, answer: 0 });
    const early = await post('/api/assignment/submit', { code, attemptId });
    assert.equal(early.body.code, 'UNANSWERED_REMAINING');
    const fin = await post('/api/assignment/submit', { code, attemptId, force: true });
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
    assert.ok(fin.body.attempt.sectionsSubmitted.p1 > 0);
  });

  it('keeps the sections on a normal assignment', async () => {
    const r = await post('/api/assignments/create', { password: PW, quiz: levelled() });
    assert.equal(r.status, 201);
    const got = await post('/api/assignments/get-quiz', { password: PW, code: r.body.assignment.code });
    assert.equal(got.status, 200, JSON.stringify(got.body));
    assert.deepEqual(plain(got.body.quiz.listeningSections.map((s) => s.id)), ['s1']);
    assert.deepEqual(plain(got.body.quiz.questions.map((q) => q.listeningSection || '')), ['', 's1', 's1']);
    assert.equal(got.body.quiz.listeningSections[0].transcript, 'SECRET TRANSCRIPT', 'the teacher gets the transcript back');
  });

  it('counts plays on the attempt, locks a submitted section and only then shows its marks', async () => {
    const created = await post('/api/assignments/create', { password: PW, quiz: levelled(), randomNames: true, feedbackMode: 'instant' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const code = created.body.assignment.code;
    const started = await post('/api/assignment/start', { code, studentKey: 'anon-1', studentName: 'Ann' });
    assert.ok(started.status < 300, JSON.stringify(started.body));
    const attemptId = started.body.attempt.id;
    const pubQuiz = started.body.attempt.assignment.quiz;
    assert.deepEqual(plain(pubQuiz.listeningSections), [{ id: 's1', title: 'Part 1', text: 'You will hear…', audioUrl: 'https://api.pinplay.win/api/media/quiz-1/listening/a.mp3', playsAllowed: 2, pauseAllowed: true, speedAllowed: true }]);
    assert.deepEqual(plain(pubQuiz.questions.map((q) => q.listeningSection || '')), ['', 's1', 's1']);

    const p1 = await post('/api/assignment/listen', { code, attemptId, sectionId: 's1' });
    const p2 = await post('/api/assignment/listen', { code, attemptId, sectionId: 's1' });
    const p3 = await post('/api/assignment/listen', { code, attemptId, sectionId: 's1' });
    assert.deepEqual([p1.body.plays, p2.body.plays, p3.status, p3.body.code], [1, 2, 409, 'NO_PLAYS_LEFT']);
    assert.equal((await post('/api/assignment/listen', { code, attemptId, sectionId: 'nope' })).status, 404);

    const a1 = await post('/api/assignment/answer', { code, attemptId, qIndex: 1, answer: 0 });
    assert.equal(a1.status, 200, JSON.stringify(a1.body));
    assert.equal(a1.body.attempt.answersWithCorrectness.length, 0, 'no marks while the section is open');
    assert.equal(a1.body.attempt.listeningPlays.s1, 2);

    const sub = await post('/api/assignment/submit-section', { code, attemptId, sectionId: 's1' });
    assert.equal(sub.status, 200, JSON.stringify(sub.body));
    assert.ok(sub.body.attempt.sectionsSubmitted.s1 > 0);
    assert.deepEqual(plain(sub.body.attempt.answersWithCorrectness.map((a) => [a.qIndex, a.correct])), [[1, true]]);

    const late = await post('/api/assignment/answer', { code, attemptId, qIndex: 2, answer: 0 });
    assert.deepEqual([late.status, late.body.code], [409, 'SECTION_SUBMITTED']);
    const outside = await post('/api/assignment/answer', { code, attemptId, qIndex: 0, answer: 0 });
    assert.equal(outside.status, 200);
  });

  it('live: a section is one step, drafts autosave, and count when the teacher moves on', async () => {
    const quiz = {
      title: 'Live listening',
      listeningSections: [section('s1', { transcript: 'SECRET TRANSCRIPT' })],
      questions: [mcq('q1'), mcq('q2', { listeningSection: 's1' }), { id: 'q3', type: 'text', prompt: 'Order?', accepted: ['coffee'], listeningSection: 's1' }, mcq('q4')],
    };
    const game = (await post('/api/create', { password: PW, options: { randomNames: true }, quiz })).body;
    assert.ok(game.hostToken, JSON.stringify(game));
    const host = { Authorization: `Bearer ${game.hostToken}` };
    const join = async (n) => (await post('/api/join', { pin: game.pin, clientId: `c_${n}`, name: n })).body;
    const ann = await join('ann');
    const bob = await join('bob');
    const as = (pl) => ({ 'X-Player-Token': pl.playerToken });
    const sec = (path, pl, extra) => post(`/api/section/${path}`, { pin: game.pin, playerId: pl.playerId, sectionId: 's1', ...extra }, as(pl));

    await post('/api/host/next', { pin: game.pin }, host); // q1
    const atSection = await post('/api/host/next', { pin: game.pin }, host);
    assert.equal(atSection.body.currentIndex, 1);
    assert.equal(atSection.body.questionDeadlineAt, null, 'no timer on a section');
    assert.deepEqual(plain([atSection.body.listening.first, atSection.body.listening.last, atSection.body.listening.questions.length]), [1, 2, 2]);

    const wrongQ = await sec('answer', ann, { qIndex: 3, answer: 0 });
    assert.equal(wrongQ.status, 400);
    assert.equal((await post('/api/answer', { pin: game.pin, playerId: ann.playerId, answer: 0 }, as(ann))).body.code, 'LISTENING_SECTION');

    const saved = await sec('answer', ann, { qIndex: 1, answer: 0 });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.ok(!JSON.stringify(saved.body).includes('SECRET TRANSCRIPT'), 'phones never get the transcript');
    assert.equal(saved.body.state.listening.answers['1'], 0);
    assert.equal(saved.body.state.listening.marks, null);
    await sec('answer', ann, { qIndex: 2, answer: 'coffee' });
    assert.equal((await sec('submit', ann)).status, 200);
    assert.equal((await sec('answer', ann, { qIndex: 2, answer: 'tea' })).body.code, 'SECTION_SUBMITTED');
    // Bob never submits: his autosaved answer still counts.
    await sec('answer', bob, { qIndex: 1, answer: 1 });

    const hs = (await post('/api/host/reveal', { pin: game.pin }, host)).body;
    assert.equal(hs.listening.submittedCount, 1);
    assert.equal(hs.listening.finalized, true);
    const scores = Object.fromEntries(hs.players.map((p) => [p.id, p.score]));
    assert.ok(scores[ann.playerId] === 2000 && scores[bob.playerId] === 0, JSON.stringify(scores));
    assert.equal((await sec('answer', bob, { qIndex: 2, answer: 'coffee' })).body.code, 'QUESTION_ENDED');

    const after = await post('/api/host/next', { pin: game.pin }, host);
    assert.equal(after.body.currentIndex, 3, 'next leaves the whole section');
    assert.equal(after.body.listening, undefined);
    const back = await post('/api/host/prev', { pin: game.pin }, host);
    assert.equal(back.body.currentIndex, 1, 'going back re-enters the section at its start');
    assert.equal(Object.fromEntries(back.body.players.map((p) => [p.id, p.score]))[ann.playerId], 0, 're-entering takes the points back');
  });

  it('live: a classic game plays the ticked levels, also after Apply live; PinPlay Cup ignores them', async () => {
    const quiz = {
      title: 'Live levels',
      listeningSections: [section('s1')],
      questions: [
        mcq('u'), mcq('a2', { cefr: 'A2' }), mcq('b1', { cefr: 'B1' }),
        mcq('s-a2', { cefr: 'A2', listeningSection: 's1' }), mcq('s-b1', { cefr: 'B1', listeningSection: 's1' }),
      ],
    };
    const game = (await post('/api/create', { password: PW, options: { randomNames: true, levels: ['B1'] }, quiz })).body;
    assert.ok(game.hostToken, JSON.stringify(game));
    assert.deepEqual(plain(game.settings.levels), ['B1']);
    const host = { Authorization: `Bearer ${game.hostToken}` };
    const first = (await post('/api/host/next', { pin: game.pin }, host)).body;
    assert.equal(first.totalQuestions, 3, 'u, b1 and the section at B1');
    await post('/api/host/next', { pin: game.pin }, host);
    const atSection = (await post('/api/host/next', { pin: game.pin }, host)).body;
    assert.deepEqual(plain(atSection.listening.questions.map((q) => q.prompt)), ['Q s-b1?']);

    const applied = (await post('/api/host/quiz/update', { pin: game.pin, quiz: { ...quiz, questions: [...quiz.questions, mcq('b1-new', { cefr: 'B1' }), mcq('a2-new', { cefr: 'A2' })] } }, host)).body;
    assert.equal(applied.totalQuestions, 4, 'Apply live keeps the game at B1');

    const cup = (await post('/api/create', { password: PW, options: { randomNames: true, gameMode: 'arena', levels: ['B1'] }, quiz })).body;
    assert.equal(cup.settings.levels, undefined, 'PinPlay Cup has its own adaptive mode');
  });
});
