/*
 * Timed moments (LISTENING_MODE_PLAN.md section 12): a section's timings, each
 * question's link to the line its answer is heard in, the live correction
 * (the moment after the reveal, the words only when the teacher shows them,
 * "You heard" for those who missed it), and nothing of it reaching students
 * before then. Also the editor's readers (subtitles, the Studio's MP3 tag) and
 * the automatic guess. The worker parts drive the REAL cloudflare/worker.js.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { loadDeclarations } = require('./helpers/extract-declaration');
const TEACHER_PW = 'teacher-secret';

// A Studio-like script: one cue per spoken line.
const CUES = [
  ['Mia', 'Morning, Tom! Have you seen the board?'],
  ['Tom', 'Yes. The train to Leeds is forty minutes late.'],
  ['Mia', "Forty minutes? You're joking!"],
  ['Tom', "I'm afraid not. There's a problem with the signals near York."],
  ['Mia', "Well, we can't just stand here. Shall we get a coffee?"],
  ['Tom', 'Good idea. The café on platform two is open.'],
  ['Mia', "I'll have a hot chocolate, actually. It's freezing."],
  ['Tom', "Fine. And I'll buy a sandwich for the journey."],
  ['Announcer', 'The ten fifteen service to Leeds will now depart from platform four.'],
  ['Mia', "Platform four? We'd better hurry."],
  ['Tom', "Don't worry, we've still got twenty minutes."],
  ['Mia', "Can you call Grandma and tell her we'll be late?"],
  ['Tom', "Sure. I'll text her the new arrival time."],
].map(([who, text], i) => ({ s: 0.4 + i * 3, e: 0.4 + i * 3 + 2.5, who, text }));

const mcq = (right, a, b, extra = {}) => ({
  type: 'mcq', prompt: 'Choose the correct answer.', listeningSection: 'ls1', points: 1000, timeLimit: 20,
  answers: [{ text: right, correct: true }, { text: a, correct: false }, { text: b, correct: false }], ...extra,
});
const SECTION = { id: 'ls1', title: 'At the station', text: 'Listen.', audio: { kind: 'file', url: 'https://api.pinplay.win/api/media/q/listening/a.mp3' }, playsAllowed: 2, pauseAllowed: true, cues: CUES };

// ---------------------------------------------------------------- the worker
function makeStorage() {
  const map = new Map();
  return {
    async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { return map.delete(k); },
    async list({ prefix = '' } = {}) {
      const out = new Map();
      for (const [k, v] of map) if (k.startsWith(prefix)) out.set(k, structuredClone(v));
      return out;
    },
    async setAlarm() { }, async deleteAlarm() { }, async getAlarm() { return null; },
  };
}

let call;
let post;
let W;
before(async () => {
  const src = fs.readFileSync(path.join(REPO, 'cloudflare', 'worker.js'), 'utf8');
  const tmpFile = path.join(os.tmpdir(), `pinplay-worker-moments-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, src);
  process.on('exit', () => { try { fs.unlinkSync(tmpFile); } catch { /* already gone */ } });
  const mod = await import('file://' + tmpFile.replace(/\\/g, '/'));
  const instances = new Map();
  let env;
  const stubFor = (name) => {
    if (!instances.has(name)) instances.set(name, new mod.QuizRoom({ storage: makeStorage(), getWebSockets: () => [] }, env));
    const inst = instances.get(name);
    return { fetch: (url, init) => inst.fetch(new Request(url, init)) };
  };
  const objects = new Map();
  env = {
    STUDENT_SESSION_KEY: 'a'.repeat(64),
    CREATE_PASSWORD_HASH: [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TEACHER_PW)))]
      .map((b) => b.toString(16).padStart(2, '0')).join(''),
    ROOMS: { idFromName: (n) => n, get: (n) => stubFor(n) },
    QUIZ_MEDIA: {
      async put(k, v) { objects.set(k, v); }, async get(k) { return objects.has(k) ? { body: '', text: async () => String(objects.get(k)), json: async () => JSON.parse(objects.get(k)) } : null; },
      async head(k) { return objects.has(k) ? {} : null; }, async delete(k) { objects.delete(k); },
      async list() { return { objects: [], truncated: false, delimitedPrefixes: [] }; },
    },
  };
  call = async (pathname, init = {}) => {
    const res = await mod.default.fetch(new Request('https://api.test' + pathname, init), env);
    const text = await res.text();
    let body = {};
    try { body = JSON.parse(text); } catch { body = {}; }
    return { status: res.status, body, text };
  };
  post = (p, obj, headers = {}) => call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(obj) });
  W = loadDeclarations(src, ['LISTENING_MAX_CUES', 'LISTENING_MAX_CUE_TEXT', 'normalizeListeningCues', 'normalizeListeningHeard']);
});

const QUIZ = () => ({
  title: 'Station',
  listeningSections: [SECTION],
  questions: [
    mcq('forty minutes', 'fourteen minutes', 'four minutes', { heard: { from: 1, to: 2, by: 'teacher' } }),
    mcq('a problem with the signals', 'a strike', 'bad weather', { heard: { from: 3, to: 3, quote: "There's a problem with the signals near York." } }),
    { type: 'tf', prompt: 'Ready?', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }], points: 1000, timeLimit: 20 },
  ],
});

describe('stored and cleaned', () => {
  it('cues are cleaned and sorted, heard links checked against them', () => {
    const cues = W.normalizeListeningCues([
      { s: 5.555, e: 4, who: '  Tom ', text: '  Two  spaces ' },
      { s: 1, e: 2, text: 'First' },
      { s: 'x', e: 2, text: 'bad time' },
      { s: 3, e: 4, text: '' },
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(cues)), [{ s: 1, e: 2, text: 'First' }, { s: 5.56, e: 5.56, who: 'Tom', text: 'Two spaces' }]);
    assert.deepEqual({ ...W.normalizeListeningHeard({ from: 2 }) }, { from: 2, to: 2, by: 'auto' });
    assert.equal(W.normalizeListeningHeard({ from: 3, to: 1 }), null);
    assert.equal(W.normalizeListeningHeard({ from: 0, to: 9 }), null, 'at most six lines');
    // An AI quiz's "heard" is the AI's quote: kept, linked or not.
    assert.deepEqual({ ...W.normalizeListeningHeard('  Forty   minutes? ') }, { quote: 'Forty minutes?' });
    assert.deepEqual({ ...W.normalizeListeningHeard({ from: 2, quote: 'x' }) }, { from: 2, to: 2, by: 'auto', quote: 'x' });
    assert.deepEqual({ ...W.normalizeListeningHeard({ from: 0, to: 9, quote: 'x' }) }, { quote: 'x' }, 'a bad link leaves the quote');
  });

  it('a teacher\'s quiz keeps them; a link past the cues goes', async () => {
    const quiz = QUIZ();
    quiz.questions[1].heard = { ...quiz.questions[1].heard, from: 40, to: 40 };
    const r = await post('/api/assignments/create', { password: TEACHER_PW, title: 'Station', quiz, randomNames: true });
    const code = r.body.assignment.code;
    const full = (await post('/api/assignments/get-quiz', { password: TEACHER_PW, code })).body.quiz;
    assert.equal(full.listeningSections[0].cues.length, CUES.length);
    assert.deepEqual(full.questions[0].heard, { from: 1, to: 2, by: 'teacher' });
    assert.deepEqual(full.questions[1].heard, { quote: "There's a problem with the signals near York." }, 'the link past the cues goes, the quote stays');
  });

  it('an AI quiz\'s quote is kept without timings, and only inside a section', async () => {
    const quiz = { title: 'AI', listeningSections: [{ ...SECTION, cues: undefined }], questions: [
      mcq('the train is late', 'she is hungry', 'it is cold', { heard: "Forty minutes? You're joking!" }),
      { type: 'tf', prompt: 'Ready?', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }], heard: 'not in a section' },
    ] };
    const r = await post('/api/assignments/create', { password: TEACHER_PW, title: 'AI', quiz, randomNames: true });
    const full = (await post('/api/assignments/get-quiz', { password: TEACHER_PW, code: r.body.assignment.code })).body.quiz;
    assert.deepEqual(full.questions[0].heard, { quote: "Forty minutes? You're joking!" });
    assert.equal('heard' in full.questions[1], false);
  });
});

describe('never reaches students before the teacher shows it', () => {
  it('homework: nothing of the timings in what a student gets', async () => {
    const r = await post('/api/assignments/create', { password: TEACHER_PW, title: 'Station', quiz: QUIZ(), randomNames: true });
    const code = r.body.assignment.code;
    const got = await call(`/api/assignment/get?code=${code}`);
    const start = await post('/api/assignment/start', { code, studentKey: 'anon_abc123', studentName: 'Kim' });
    for (const res of [got, start]) {
      assert.ok(res.status < 400, res.text);
      assert.ok(!/"cues"|"heard"|signals near York|forty minutes late/.test(res.text), res.text.slice(0, 300));
    }
  });

  describe('live correction', () => {
    let pin;
    let host;
    let right;
    let wrong;
    const hostState = async () => (await call(`/api/host/state?pin=${pin}`, { headers: { Authorization: `Bearer ${host}` } })).body;
    const playerText = async (p) => (await call(`/api/player/state?pin=${pin}&playerId=${p.playerId}`, { headers: { 'X-Player-Token': p.playerToken } }));
    const hostPost = (route) => post(route, { pin }, { Authorization: `Bearer ${host}` });

    before(async () => {
      const r = await post('/api/create', { password: TEACHER_PW, options: { randomNames: true }, quiz: QUIZ() });
      pin = r.body.pin;
      host = r.body.hostToken;
      right = (await post('/api/join', { pin, clientId: 'c_right' })).body;
      wrong = (await post('/api/join', { pin, clientId: 'c_wrong' })).body;
      await hostPost('/api/host/next'); // the section
      const answer = (p, qIndex, a) => post('/api/section/answer', { pin, playerId: p.playerId, sectionId: 'ls1', qIndex, answer: a }, { 'X-Player-Token': p.playerToken });
      await answer(right, 0, 0);
      await answer(wrong, 0, 1);
    });

    it('while answering: no moment, no words anywhere', async () => {
      assert.ok(!/forty minutes late|"moment"/.test(JSON.stringify(await hostState())));
      assert.ok(!/forty minutes late|"heard"/.test((await playerText(wrong)).text));
    });

    it('marked, not yet revealed: still nothing', async () => {
      await hostPost('/api/host/reveal'); // marks the section, correction at question 1
      const s = await hostState();
      assert.equal(s.listening.review.revealed, false);
      assert.equal(s.listening.review.moment, null);
    });

    it('revealed: the moment, without the words', async () => {
      await hostPost('/api/host/reveal');
      const review = (await hostState()).listening.review;
      assert.equal(review.revealed, true);
      assert.deepEqual(review.moment, { start: CUES[1].s - 1, end: Math.round((CUES[2].e + 0.4) * 100) / 100 });
      assert.equal(review.wordsShown, false);
      assert.ok(!/forty minutes late/.test((await playerText(wrong)).text));
    });

    it('words shown: on the projector, and "You heard" only for the wrong answer', async () => {
      const r = await hostPost('/api/host/listening/words');
      assert.equal(r.status, 200);
      const review = (await hostState()).listening.review;
      assert.equal(review.wordsShown, true);
      assert.deepEqual(review.moment.lines.map((l) => l.text), [CUES[1].text, CUES[2].text]);
      const w = (await playerText(wrong)).body;
      assert.deepEqual(w.listening.heard['0'].map((l) => l.who), ['Tom', 'Mia']);
      const ok = (await playerText(right)).body;
      assert.equal(ok.listening.heard, undefined);
    });

    it('the next question starts without its words; the host needs its token', async () => {
      await hostPost('/api/host/next');
      const review = (await hostState()).listening.review;
      assert.equal(review.qIndex, 1);
      assert.equal(review.moment, null, 'not revealed yet');
      assert.equal((await post('/api/host/listening/words', { pin }, { Authorization: 'Bearer nope' })).status, 401);
    });
  });
});

// ---------------------------------------------------------------- the editor
describe('timings in (editor)', () => {
  let A;
  const sandbox = { TextDecoder, quiz: { questions: [] } };
  before(() => {
    A = loadDeclarations(fs.readFileSync(path.join(REPO, 'app.js'), 'utf8'), [
      'LISTENING_MAX_CUES', 'LISTENING_MAX_CUE_TEXT', 'normalizeListeningCues', 'parseCueTime', 'parseSubtitleCues', 'readMp3Cues',
      'normalizeListeningHeard', 'contextGapList', 'normalizeImportedQuestion',
    ], sandbox);
  });

  it('an imported AI quiz\'s "heard" becomes the quote', () => {
    const q = A.normalizeImportedQuestion({ type: 'mcq', prompt: 'How does Mia feel?', answers: [], heard: "  Forty minutes? You're joking! " });
    assert.deepEqual({ ...q.heard }, { quote: "Forty minutes? You're joking!" });
    assert.equal('heard' in A.normalizeImportedQuestion({ type: 'mcq', prompt: 'x', heard: '' }), false);
  });

  it('reads the Studio\'s MP3 tag and finds where the audio starts', () => {
    const bytes = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'studio-timings.mp3'));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
    const tag = A.readMp3Cues(buffer);
    assert.equal(tag.cues.length, 3);
    assert.deepEqual({ ...tag.cues[1] }, { s: 3.1, e: 5.02, who: 'Tom', text: 'I know, the train is late again — sorry.' });
    assert.equal(tag.cues[2].who, 'Mia + Tom');
    assert.deepEqual([...bytes.subarray(tag.end, tag.end + 2)], [0xff, 0xfb], 'the audio starts right after the tag');
    assert.equal(A.readMp3Cues(new Uint8Array([0xff, 0xfb, 0x90, 0x64]).buffer), null, 'a plain MP3 has none');
  });

  it('reads the Studio\'s .vtt the same way', () => {
    const cues = A.parseSubtitleCues(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'studio-timings.vtt'), 'utf8'));
    assert.deepEqual(JSON.parse(JSON.stringify(cues.map((c) => [c.s, c.e, c.who]))), [[0.4, 2.73, 'Mia'], [3.1, 5.02, 'Tom'], [5.5, 7, 'Mia + Tom']]);
  });

  it('reads SubRip with "Name:" speakers and two-line cues', () => {
    const srt = '1\r\n00:00:01,500 --> 00:00:03,250\r\nAnna: Hi Tom!\r\n\r\n2\r\n00:01:02,000 --> 00:01:05,000\r\nAre we still meeting\r\non Saturday?\r\n';
    const cues = A.parseSubtitleCues(srt);
    assert.deepEqual(JSON.parse(JSON.stringify(cues.map((c) => [c.s, c.e, c.who, c.text]))), [[1.5, 3.25, 'Anna', 'Hi Tom!'], [62, 65, '', 'Are we still meeting on Saturday?']]);
  });
});

describe('the automatic guess', () => {
  let A;
  const sandbox = { quiz: { questions: [] }, CEFR_LEVELS: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] };
  before(() => {
    A = loadDeclarations(fs.readFileSync(path.join(REPO, 'app.js'), 'utf8'), [
      'normalizeCefr', 'contextGapList', 'listeningSectionQuestions', 'LISTENING_STOPWORDS', 'LISTENING_NUMBER_WORDS', 'LISTENING_TENS',
      'listeningNumberWords', 'listeningStem', 'listeningMatchTokens', 'listeningMatchKeys', 'listeningHeardLinked', 'setListeningHeard', 'guessListeningMoments',
    ], sandbox);
  });

  // As an AI writes them: the right answer first, the same prompt everywhere.
  const questions = () => [
    mcq('forty minutes', 'fourteen minutes', 'four minutes'),
    mcq('a problem with the signals', 'a strike', 'bad weather'),
    { type: 'text', prompt: 'Where is the café?', accepted: ['platform 2', 'platform two'], listeningSection: 'ls1' },
    mcq('a hot chocolate', 'a coffee', 'a tea'),
    { type: 'context_gap', prompt: 'The train will leave from platform ____.', gaps: ['four'], listeningSection: 'ls1' },
    { type: 'tf', prompt: 'They still have twenty minutes.', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }], listeningSection: 'ls1' },
    mcq('send Grandma a message', 'phone Grandma', 'buy a ticket', { prompt: 'What will Tom do?' }),
  ];
  const run = (qs) => {
    sandbox.quiz.questions = qs;
    A.guessListeningMoments({ id: 'ls1', cues: CUES });
    return qs.map((q) => (q.heard ? q.heard.from : null));
  };

  it('finds each answer\'s line, in order', () => {
    const at = run(questions());
    assert.ok([1, 2].includes(at[0]), `Q1 ${at[0]}`);
    assert.equal(at[1], 3, 'Q2: the signals');
    assert.equal(at[2], 5, 'Q3: "platform 2" heard as "platform two"');
    assert.equal(at[3], 6, 'Q4: the hot chocolate, not the coffee');
    assert.ok([8, 9].includes(at[4]), `Q5 ${at[4]}`);
    assert.equal(at[5], 10, 'Q6: twenty minutes');
    const linked = at.filter((x) => x != null);
    assert.deepEqual(linked, [...linked].sort((a, b) => a - b), 'never backwards');
    assert.ok(at[6] == null || at[6] >= 10, `Q7 (a paraphrase) is left or after Q6: ${at[6]}`);
  });

  it('keeps the teacher\'s choice and guesses around it', () => {
    const qs = questions();
    qs[1].heard = { from: 4, to: 4, by: 'teacher' };
    const at = run(qs);
    assert.equal(at[1], 4);
    assert.equal(qs[1].heard.by, 'teacher');
    assert.ok(at[0] <= 4 && at[2] >= 4, `around it: ${at}`);
  });

  it('the AI\'s quote links a reworded question, and stays with the link', () => {
    const qs = questions();
    // "How does Mia feel? → surprised": no word of it in the line.
    qs[1] = mcq('surprised', 'angry', 'bored', { prompt: 'How does Mia feel?' });
    let at = run(qs.map((q) => ({ ...q })));
    assert.equal(at[1], null, 'without a quote: left for the teacher');
    qs[1].heard = { quote: "Forty minutes? You're joking!" };
    at = run(qs);
    assert.equal(at[1], 2);
    assert.deepEqual({ ...qs[1].heard }, { from: 2, to: 2, by: 'auto', quote: "Forty minutes? You're joking!" });
    // A quote never forces a line: one that isn't in the recording is just a hint.
    const lost = questions();
    lost[3].heard = { quote: 'Words nobody says.' };
    assert.equal(run(lost)[3], 6);
    assert.equal(lost[3].heard.quote, 'Words nobody says.');
  });

  it('levelled sections are guessed level by level', () => {
    const qs = [
      mcq('forty minutes', 'fourteen minutes', 'four minutes', { cefr: 'A2' }),
      mcq('a hot chocolate', 'a coffee', 'a tea', { cefr: 'A2' }),
      mcq('a problem with the signals', 'a strike', 'bad weather', { cefr: 'B1' }),
      mcq('twenty minutes', 'ten minutes', 'an hour', { cefr: 'B1' }),
    ];
    const at = run(qs);
    assert.ok([1, 2].includes(at[0]));
    assert.equal(at[1], 6);
    assert.equal(at[2], 3, 'B1 starts again from the top');
    assert.equal(at[3], 10);
  });
});
