/*
 * The cloud quiz list (☁️ Open / ☁️ Save) and what feeds it.
 *
 * Drives the REAL cloudflare/worker.js module, like student-login.test.mjs:
 * only Durable Object storage, R2 and Google's tokeninfo endpoint are stubbed.
 * Live games, Cup games and assignments never add their own copy of the quiz
 * to the list; assignments and live results remember the cloud quiz they were
 * made from, so opening one in the builder and saving updates that quiz.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
const TEACHER_PW = 'teacher-secret';
const AUTH = { Authorization: `Bearer ${TEACHER_PW}` };
const QUESTION = { type: 'tf', prompt: 'Ready?', answers: ['True', 'False'], correctIndex: 0 };
const QUIZ = { title: 'Verbs', questions: [QUESTION] };

function makeStorage() {
  const map = new Map();
  return {
    async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { return map.delete(k); },
    async list({ prefix = '', limit } = {}) {
      const out = new Map();
      for (const [k, v] of [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        if (!k.startsWith(prefix)) continue;
        out.set(k, structuredClone(v));
        if (limit && out.size >= limit) break;
      }
      return out;
    },
  };
}

// The R2 calls the worker makes on env.QUIZ_MEDIA, over a Map.
function makeBucket() {
  const objects = new Map();
  const store = (key, text, uploaded = new Date()) => objects.set(key, { text, uploaded });
  return {
    objects,
    seed: (key, value, uploaded) => store(key, typeof value === 'string' ? value : JSON.stringify(value), uploaded),
    async put(key, value) { store(key, typeof value === 'string' ? value : '<binary>'); },
    async get(key) {
      const o = objects.get(key);
      return o ? { body: o.text, text: async () => o.text, json: async () => JSON.parse(o.text) } : null;
    },
    async head(key) { return objects.has(key) ? {} : null; },
    async delete(key) { objects.delete(key); },
    async list({ prefix = '' } = {}) {
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix)).sort();
      return {
        objects: keys.map((key) => ({ key, size: objects.get(key).text.length, uploaded: objects.get(key).uploaded })),
        truncated: false,
        delimitedPrefixes: [],
      };
    },
  };
}

let call;
let post;
let bucket;

before(async () => {
  const src = fs.readFileSync(path.join(REPO, 'cloudflare', 'worker.js'), 'utf8');
  const tmpFile = path.join(os.tmpdir(), `pinplay-worker-cloud-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, src);
  process.on('exit', () => { try { fs.unlinkSync(tmpFile); } catch { /* already gone */ } });
  const mod = await import('file://' + tmpFile.replace(/\\/g, '/'));
  const worker = mod.default;
  const QuizRoom = mod.QuizRoom;

  bucket = makeBucket();
  const instances = new Map();
  let env;
  const stubFor = (name) => {
    if (!instances.has(name)) instances.set(name, new QuizRoom({ storage: makeStorage() }, env));
    const inst = instances.get(name);
    return { fetch: (url, init) => inst.fetch(new Request(url, init)) };
  };
  env = {
    GOOGLE_CLIENT_ID,
    STUDENT_SESSION_KEY: 'a'.repeat(64),
    CREATE_PASSWORD_HASH: [...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TEACHER_PW)),
    )].map((b) => b.toString(16).padStart(2, '0')).join(''),
    ROOMS: { idFromName: (n) => n, get: (n) => stubFor(n) },
    QUIZ_MEDIA: bucket,
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
      if (new URL(u).searchParams.get('id_token') !== 'tok-nel') return new Response('bad', { status: 400 });
      const user = { email: 'neloru@iecomaruga.cat', name: 'Nel Oru', aud: GOOGLE_CLIENT_ID, email_verified: true };
      return new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  };

  call = async (pathname, init = {}) => {
    const res = await worker.fetch(new Request('https://api.test' + pathname, init), env);
    const text = await res.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    return { status: res.status, body, text };
  };
  post = (p, obj, headers) => call(p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(obj),
  });
});

const cloudKeys = () => [...bucket.objects.keys()].filter((k) => k.startsWith('quizzes/')).sort();
const cloudList = async () => (await call('/api/quizzes', { headers: AUTH })).body.quizzes;
const getQuiz = async (code) => (await post('/api/assignments/get-quiz', { password: TEACHER_PW, code })).body;
const createAssignment = async (extra = {}) =>
  (await post('/api/assignments/create', { password: TEACHER_PW, title: 'Verbs', quiz: QUIZ, ...extra })).body.assignment.code;

describe('live games and Cup games', () => {
  it('add nothing to the cloud list', async () => {
    const before = cloudKeys();
    for (const gameMode of ['classic', 'arena']) {
      const r = await post('/api/create', { password: TEACHER_PW, options: { gameMode, cloudQuizId: 'quiz-1' }, quiz: QUIZ });
      assert.equal(r.status, 201);
      assert.match(r.body.pin, /^\d{6}$/);
    }
    assert.deepEqual(cloudKeys(), before);
  });
});

describe('the cloud list', () => {
  before(() => {
    // The teacher's own save, an untouched copy an old live game made, and an
    // old copy the teacher opened and saved again (☁️ Save adds _r2QuizId).
    bucket.seed('quizzes/quiz-1.json', { ...QUIZ, _r2QuizId: 'quiz-1' }, new Date('2026-09-01'));
    bucket.seed('quizzes/123456.json', { version: 1, ...QUIZ }, new Date('2026-09-20'));
    bucket.seed('quizzes/654321.json', { ...QUIZ, title: 'Verbs v2', _r2QuizId: '654321' }, new Date('2026-09-10'));
    bucket.seed('quiz-1/images/q0.jpg', 'jpg');
    bucket.seed('123456/images/q1.jpg', 'jpg');
  });

  it('marks old live-game copies and lists them after the teacher\'s own saves', async () => {
    const list = await cloudList();
    assert.deepEqual(list.map((q) => [q.key, !!q.liveCopy]), [
      ['quizzes/654321.json', false],
      ['quizzes/quiz-1.json', false],
      ['quizzes/123456.json', true],
    ]);
  });

  it('deleting a live-game copy keeps the pictures under its PIN', async () => {
    const r = await call('/api/quizzes/quizzes/123456.json', { method: 'DELETE', headers: AUTH });
    assert.equal(r.body.deletedMedia, 0);
    assert.ok(!bucket.objects.has('quizzes/123456.json'));
    assert.ok(bucket.objects.has('123456/images/q1.jpg'));
  });

  it('deleting a saved quiz still removes its pictures', async () => {
    const r = await call('/api/quizzes/quizzes/quiz-1.json', { method: 'DELETE', headers: AUTH });
    assert.equal(r.body.deletedMedia, 1);
    assert.ok(!bucket.objects.has('quizzes/quiz-1.json'));
    assert.ok(!bucket.objects.has('quiz-1/images/q0.jpg'));
  });
});

describe('assignments remember their cloud quiz', () => {
  it('give it back to the teacher, never to students', async () => {
    const before = cloudKeys();
    const code = await createAssignment({ cloudQuizId: 'quiz-1727000000000-ab12', randomNames: true });
    assert.deepEqual(cloudKeys(), before);

    const teacher = await getQuiz(code);
    assert.equal(teacher.cloudQuizId, 'quiz-1727000000000-ab12');
    assert.equal(teacher.assignment.cloudQuizId, undefined);

    const student = await call(`/api/assignment/get?code=${code}`);
    assert.equal(student.status, 200);
    assert.doesNotMatch(student.text, /quiz-1727000000000-ab12/);
  });

  it('link an older assignment once its quiz is applied from the builder', async () => {
    const code = await createAssignment();
    assert.equal((await getQuiz(code)).cloudQuizId, '');

    const apply = (extra) => post('/api/assignments/update-quiz', { password: TEACHER_PW, code, quiz: QUIZ, ...extra });
    assert.equal((await apply({ cloudQuizId: 'quiz-2' })).status, 200);
    assert.equal((await getQuiz(code)).cloudQuizId, 'quiz-2');

    // A bad id or none leaves the link alone.
    await apply({ cloudQuizId: '../quizzes/x' });
    await apply({});
    assert.equal((await getQuiz(code)).cloudQuizId, 'quiz-2');
  });

  it('ignore an id that is not a cloud quiz id', async () => {
    const code = await createAssignment({ cloudQuizId: 'quizzes/../x' });
    assert.equal((await getQuiz(code)).cloudQuizId, '');
  });
});

describe('live results remember their cloud quiz', () => {
  it('a finished login-required game files them under the quiz it was started from', async () => {
    await post('/api/students/settings', { password: TEACHER_PW, allowedDomains: ['iecomaruga.cat'], policy: 'open' });
    const studentToken = (await post('/api/student/login', { googleIdToken: 'tok-nel' })).body.studentToken;
    assert.ok(studentToken);

    const before = cloudKeys();
    const game = (await post('/api/create', {
      password: TEACHER_PW, options: { randomNames: false, cloudQuizId: 'quiz-live-1' }, quiz: QUIZ,
    })).body;
    const host = { Authorization: `Bearer ${game.hostToken}` };
    const player = (await post('/api/join', { pin: game.pin, clientId: 'c_nel', studentToken })).body;
    assert.ok(player.playerToken);

    await post('/api/host/next', { pin: game.pin }, host);
    const answered = await post('/api/answer', { pin: game.pin, playerId: player.playerId, answer: 0 }, { 'X-Player-Token': player.playerToken });
    assert.equal(answered.status, 200);
    const finished = await post('/api/host/next', { pin: game.pin }, host);
    assert.equal(finished.body.phase, 'results');

    const { assignments } = (await post('/api/assignments/list', { password: TEACHER_PW })).body;
    const results = assignments.find((a) => a.origin === 'live' && a.liveMediaPin === game.pin);
    assert.ok(results, 'the finished game was saved as an assignment');
    assert.equal((await getQuiz(results.code)).cloudQuizId, 'quiz-live-1');
    assert.deepEqual(cloudKeys(), before);
  });
});
