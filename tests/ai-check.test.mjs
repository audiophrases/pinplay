import { it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// 🤖 AI check (assignment setting aiCheck): the real Worker and QuizRoom, with
// OpenAI replaced by a stub that records every request it gets.
let worker, QuizRoom, env, room, storage, temp, rows;
const code = 'AICHK1';
const teacherPassword = 'ai-check-test';
const clone = x => x === undefined ? x : structuredClone(x);
const realFetch = globalThis.fetch;
let calls = [];
let reply = () => ({ ok: [false], why: 'Not this time.' });
let openAiStatus = 200;
let duringCall = null;

const quiz = () => ({ title: 'Grammar', questions: [
  { id: 'q1', type: 'text', prompt: 'Opposite of "big"', points: 1000, accepted: ['small'] },
  { id: 'q2', type: 'error_hunt', prompt: "She don't speak English.", points: 1000,
    corrected: "She doesn't speak English.", correctedVariants: ["She does not speak English."] },
  { id: 'q3', type: 'context_gap', prompt: 'I ____ (go) home and ____ (eat).', points: 1000, gaps: ['went', 'ate'] },
  { id: 'q4', type: 'open', prompt: 'Describe your best friend in two sentences.', points: 1000 },
  { id: 'q5', type: 'mcq', prompt: 'Pick one', points: 1000, answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
] });
const assignment = (extra = {}) => ({
  code, title: 'Grammar', active: true, feedbackMode: 'instant', randomNames: true, attemptsLimit: 0,
  aiCheck: true, quiz: quiz(), pendingGradingCount: 0, pendingAttemptsCount: 0, attemptsCount: 0, ...extra,
});
const attempt = id => ({ id, studentKey: `student_${id}`, studentName: id, startedAt: 1, answersByQ: {} });

async function call(route, body) {
  const response = await worker.fetch(new Request(`https://api.test${route}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  return { status: response.status, body: await response.json() };
}
const answer = (attemptId, qIndex, value) => call('/api/assignment/answer', { code, attemptId, qIndex, answer: value });
const state = attemptId => call(`/api/assignment/state?code=${code}&attemptId=${attemptId}`);
const base = () => storage.get(`ab:${code}`);
const correctness = (res, qIndex) => res.body.attempt.answersWithCorrectness.find(a => a.qIndex === qIndex);

before(async () => {
  const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
  temp = path.join(os.tmpdir(), `pinplay-ai-check-${process.pid}.mjs`);
  fs.writeFileSync(temp, src);
  ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
  globalThis.fetch = async (url, init) => {
    if (!String(url).startsWith('https://api.openai.com/')) return realFetch(url, init);
    const body = JSON.parse(init.body);
    const input = JSON.parse(body.input);
    calls.push({ url: String(url), body, input, auth: init.headers.authorization });
    if (duringCall) { const run = duringCall; duringCall = null; await run(); }
    if (openAiStatus !== 200) return new Response('{}', { status: openAiStatus });
    const text = JSON.stringify(reply(input, body));
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }), { status: 200 });
  };
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teacherPassword))).toString('hex');
  env = {
    CREATE_PASSWORD_HASH: hash, OPENAI_API_KEY: 'sk-test',
    ROOMS: { idFromName: n => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) },
  };
});
after(() => { globalThis.fetch = realFetch; if (temp) fs.unlinkSync(temp); });
beforeEach(async () => {
  rows = new Map();
  storage = {
    get: async k => clone(rows.get(k)),
    put: async (k, v) => rows.set(k, clone(v)),
    delete: async k => { (Array.isArray(k) ? k : [k]).forEach(key => rows.delete(key)); },
    list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, clone(v)])),
  };
  room = new QuizRoom({ storage }, env);
  calls = [];
  openAiStatus = 200;
  duringCall = null;
  reply = () => ({ ok: [false], why: 'Not this time.' });
  await storage.put(`ab:${code}`, assignment());
  for (const id of ['s1', 's2', 's3']) await storage.put(`a:${code}:t:${id}`, attempt(id));
});

it('off by default: no OpenAI call, grading as usual', async () => {
  await storage.put(`ab:${code}`, assignment({ aiCheck: undefined }));
  const res = await answer('s1', 0, 'little');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 0);
  assert.equal(correctness(res, 0).correct, false);
});

it('no key on the API: no call even with the setting on', async () => {
  const key = env.OPENAI_API_KEY;
  delete env.OPENAI_API_KEY;
  try {
    const res = await answer('s1', 0, 'little');
    assert.equal(calls.length, 0);
    assert.equal(correctness(res, 0).correct, false);
  } finally { env.OPENAI_API_KEY = key; }
});

it('right answers and choice questions never reach the AI', async () => {
  await answer('s1', 0, 'small');
  await answer('s1', 4, 1);
  assert.equal(calls.length, 0);
});

it('a wrong typed answer the AI accepts counts right, joins the accepted answers, and the next student needs no call', async () => {
  reply = () => ({ ok: [true], why: '"Little" means the same as "small".' });
  const res = await answer('s1', 0, 'Little');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  const sent = calls[0];
  assert.equal(sent.url, 'https://api.openai.com/v1/responses');
  assert.equal(sent.auth, 'Bearer sk-test');
  assert.equal(sent.body.store, false);
  assert.deepEqual(sent.body.reasoning, { effort: 'none' });
  assert.equal(sent.body.max_output_tokens, 60);
  assert.equal(sent.body.text.format.strict, true);
  // Token frugal: only what the check needs.
  assert.deepEqual(sent.input, { type: 'text', question: 'Opposite of "big"', check: [{ accepted: ['small'], student: 'Little' }] });
  assert.equal(correctness(res, 0).correct, true);
  assert.deepEqual(res.body.attempt.answersByQ['0'].ai, { ok: true, why: '"Little" means the same as "small".' });
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['small', 'Little']);
  const next = await answer('s2', 0, 'little');
  assert.equal(calls.length, 1, 'the second student is graded by the accepted list');
  assert.equal(correctness(next, 0).correct, true);
  assert.equal(next.body.attempt.answersByQ['0'].ai, undefined);
});

it('a refused answer is remembered: the same wrong answer from another student is not asked again', async () => {
  reply = () => ({ ok: [false], why: '"Tiny" is not the opposite of "big"... wait, it is close but not accepted.' });
  const first = await answer('s1', 0, 'large');
  assert.equal(calls.length, 1);
  assert.equal(correctness(first, 0).correct, false);
  assert.equal(first.body.attempt.answersByQ['0'].ai.ok, false);
  const again = await answer('s2', 0, 'LARGE!');
  assert.equal(calls.length, 1);
  assert.equal(again.body.attempt.answersByQ['0'].ai.ok, false);
  assert.ok(again.body.attempt.answersByQ['0'].ai.why);
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['small']);
  assert.deepEqual(Object.keys((await storage.get(`ai:${code}`)).q.q1.refused), ['large']);
});

it('error hunt: another correct way to fix the mistake is accepted', async () => {
  reply = (input) => ({ ok: [input.check[0].student === "You don't speak English."], why: 'Changing "She" to "You" also fixes it.' });
  const res = await answer('s1', 1, { rewrite: "You don't speak English.", selectedTokens: [0] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.type, 'error_hunt');
  assert.equal(calls[0].input.question, "She don't speak English.");
  assert.deepEqual(calls[0].input.check[0].accepted, ["She doesn't speak English.", 'She does not speak English.']);
  assert.equal(correctness(res, 1).correct, true);
  assert.ok((await base()).quiz.questions[1].correctedVariants.includes("You don't speak English."));
});

it('error hunt: the sentence left unchanged, or no word picked, is not sent', async () => {
  await answer('s1', 1, { rewrite: "She don't speak English.", selectedTokens: [1] });
  await answer('s2', 1, { rewrite: "We don't speak English.", selectedTokens: [] });
  assert.equal(calls.length, 0);
});

it('gap fill: only the wrong gaps are asked about, each accepted gap on its own', async () => {
  reply = (input) => ({ ok: input.check.map(c => c.student === 'walked'), why: '"Walked" fits the first gap too.' });
  const res = await answer('s1', 2, ['walked', 'eated']);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input.check, [
    { gap: 1, accepted: ['went'], student: 'walked' },
    { gap: 2, accepted: ['ate'], student: 'eated' },
  ]);
  assert.deepEqual((await base()).quiz.questions[2].gaps, ['went, walked', 'ate']);
  const c = correctness(res, 2);
  assert.equal(c.correct, false);
  assert.equal(c.partialScore, 1);
  // Gap 2's refusal is remembered; gap 1 is now accepted: nothing to ask.
  const next = await answer('s2', 2, ['walked', 'eated']);
  assert.equal(calls.length, 1);
  assert.equal(correctness(next, 2).partialScore, 1);
  // A new wrong fill for gap 1 is asked about alone.
  await answer('s3', 2, ['ran', 'ate']);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].input.check, [{ gap: 1, accepted: ['went', 'walked'], student: 'ran' }]);
});

it('OpenAI trouble: grading as usual, nothing remembered, tried again next time', async () => {
  openAiStatus = 500;
  const res = await answer('s1', 0, 'little');
  assert.equal(res.status, 200);
  assert.equal(correctness(res, 0).correct, false);
  assert.equal(res.body.attempt.answersByQ['0'].ai, undefined);
  assert.equal(await storage.get(`ai:${code}`), undefined);
  openAiStatus = 200;
  reply = () => ({ ok: [true], why: 'Same meaning.' });
  const again = await answer('s2', 0, 'little');
  assert.equal(calls.length, 2);
  assert.equal(correctness(again, 0).correct, true);
});

it('a reply of the wrong shape changes nothing', async () => {
  reply = () => ({ ok: [true, true], why: 'Two answers for one item.' });
  const res = await answer('s1', 0, 'little');
  assert.equal(correctness(res, 0).correct, false);
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['small']);
});

it('an answer saved while OpenAI is answering is kept', async () => {
  reply = () => ({ ok: [true], why: 'Same meaning.' });
  duringCall = async () => {
    const other = await answer('s1', 3, 'Short.');
    assert.equal(other.status, 200);
  };
  const res = await answer('s1', 0, 'little');
  assert.equal(res.status, 200);
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.deepEqual(Object.keys(saved.answersByQ).sort(), ['0', '3']);
  assert.equal(saved.answersByQ['3'].answer, 'Short.');
  assert.equal(correctness(res, 0).correct, true);
});

it('with instant feedback an open answer is scored at once: the score counts, nothing waits for the teacher, and the student sees it', async () => {
  reply = (input, body) => {
    assert.equal(body.max_output_tokens, 140);
    assert.deepEqual(body.text.format.schema.required, ['task', 'score', 'feedback']);
    return { task: 'partly', score: 6, feedback: 'Add a second sentence. Use "she is" for "she are".' };
  };
  const text = 'My friend Ana she are very kind.';
  const res = await answer('s1', 3, text);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, { task: 'Describe your best friend in two sentences.', answer: text });
  const saved = res.body.attempt.answersByQ['3'];
  assert.equal(saved.ai.task, 'partly');
  assert.equal(saved.ai.score, 6);
  assert.match(saved.ai.feedback, /she is/);
  assert.equal(saved.teacherGrade.by, 'ai');
  assert.equal(saved.teacherGrade.graded, true);
  assert.equal(saved.teacherGrade.pointsAwarded, 600);
  assert.equal(saved.teacherGrade.correction, '');
  const { metrics } = res.body.attempt;
  assert.equal(metrics.pendingTeacherGradeCount, 0);
  assert.equal(metrics.teacherScore, 600);
  assert.equal(metrics.totalScore, 600);
  assert.equal((await base()).pendingGradingCount, 0);
  // The same text saved again keeps its feedback and score, with no call.
  const same = await answer('s1', 3, `  ${text} `);
  assert.equal(calls.length, 1);
  assert.equal(same.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 600);
  // Every open answer gets a score, however short.
  const short = await answer('s2', 3, 'Kind.');
  assert.equal(calls.length, 2);
  assert.equal(short.body.attempt.answersByQ['3'].teacherGrade.by, 'ai');
  await answer('s3', 3, '   ');
  assert.equal(calls.length, 2, 'nothing written, nothing to score');
});

it('scores follow the question\'s points: 10 is full marks, a score of 0 is a grade, and a 0-point question earns nothing', async () => {
  const practice = assignment();
  practice.quiz.questions[3].points = 0;
  await storage.put(`ab:${code}`, practice);
  reply = () => ({ task: 'done', score: 10, feedback: 'Well done.' });
  const free = await answer('s3', 3, 'A good answer too.');
  assert.equal(free.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 0);
  assert.equal(free.body.attempt.answersByQ['3'].ai.feedback, 'Well done.', 'the feedback is still worth having');
  assert.equal(free.body.attempt.metrics.pendingTeacherGradeCount, 0);
  const worth2000 = assignment();
  worth2000.quiz.questions[3].points = 2000;
  await storage.put(`ab:${code}`, worth2000);
  assert.equal((await answer('s1', 3, 'A good answer.')).body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 2000);
  reply = () => ({ task: 'not_done', score: 0, feedback: 'Describe your friend.' });
  const zero = await answer('s2', 3, 'I like pizza.');
  assert.equal(zero.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 0);
  assert.equal(zero.body.attempt.answersByQ['3'].teacherGrade.graded, true);
  assert.equal(zero.body.attempt.metrics.pendingTeacherGradeCount, 0);
});

it('a reply with no usable score changes nothing: the answer waits for the teacher', async () => {
  for (const bad of [{ task: 'done', feedback: 'Fine.' }, { task: 'done', score: 11, feedback: 'Fine.' }, { task: 'done', score: 7.5, feedback: 'Fine.' }, { task: 'done', score: '7', feedback: 'Fine.' }]) {
    reply = () => bad;
    const res = await answer('s1', 3, `An answer with ${JSON.stringify(bad)}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const saved = res.body.attempt.answersByQ['3'];
    assert.equal(saved.ai, undefined);
    assert.equal(saved.teacherGrade, null);
    assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 1);
    const stored = await storage.get(`a:${code}:t:s1`);
    delete stored.aiUse;
    await storage.put(`a:${code}:t:s1`, stored);
  }
});

it('OpenAI trouble on an open answer: it waits for the teacher, and submit tries again', async () => {
  openAiStatus = 500;
  const res = await answer('s1', 3, 'My friend is kind.');
  assert.equal(res.status, 200);
  assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 1);
  openAiStatus = 200;
  reply = () => ({ task: 'done', score: 8, feedback: 'Well done.' });
  const done = await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(calls.length, 2);
  assert.equal(done.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 800);
  assert.equal(done.body.attempt.metrics.pendingTeacherGradeCount, 0);
  assert.equal((await base()).pendingGradingCount, 0);
});

it('without instant feedback an open answer is scored once, at submit, on its final text', async () => {
  await storage.put(`ab:${code}`, assignment({ feedbackMode: 'end' }));
  reply = () => ({ task: 'done', score: 9, feedback: 'Well done.' });
  await answer('s1', 3, 'A first try.');
  const edited = await answer('s1', 3, 'My friend Ana is very kind.');
  assert.equal(calls.length, 0, 'it can still change');
  assert.equal(edited.body.attempt.metrics.pendingTeacherGradeCount, 1);
  assert.equal((await base()).pendingGradingCount, 1);
  const refused = await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal(refused.body.code, 'UNANSWERED_REMAINING');
  assert.equal(calls.length, 0, 'not handed in yet');
  const done = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.answer, 'My friend Ana is very kind.');
  assert.equal(done.body.attempt.answersByQ['3'].ai.score, 9);
  assert.equal(done.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 900);
  assert.equal((await base()).pendingGradingCount, 0);
  assert.equal(done.body.attempt.metrics.totalScore, 900);
});

it('no feedback: the score counts but stays off the student page, and Release needs no teacher marking', async () => {
  await storage.put(`ab:${code}`, assignment({ feedbackMode: 'none' }));
  reply = () => ({ task: 'done', score: 7, feedback: 'Well done.' });
  await answer('s1', 3, 'My friend is kind.');
  const done = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  const shown = done.body.attempt.answersByQ['3'];
  assert.equal(shown.ai, undefined);
  assert.equal(shown.teacherGrade, null);
  assert.equal((await state('s1')).body.attempt.answersByQ['3'].teacherGrade, null);
  const stored = await storage.get(`a:${code}:t:s1`);
  assert.equal(stored.answersByQ['3'].teacherGrade.pointsAwarded, 700);
  const released = await call('/api/assignments/release-grades', { password: teacherPassword, code, attemptIds: ['s1'] });
  assert.equal(released.status, 200, JSON.stringify(released.body));
  assert.equal(released.body.grades[0].releasedGrade, 14, '700 of 5000 points');
});

it('the teacher can change an AI score at any time, and it stays theirs', async () => {
  reply = () => ({ task: 'done', score: 7, feedback: 'Well done.' });
  await answer('s1', 3, 'My friend is kind.');
  const grading = await room.fetch(new Request(`https://room/assignments/question-grading?code=${code}&qIndex=3`));
  const item = (await grading.json()).items.find(i => i.attemptId === 's1');
  assert.equal(item.grade.graded, true);
  assert.equal(item.grade.pointsAwarded, 700);
  assert.equal(item.ai.score, 7);
  const changed = await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 3, points: 900 });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const st = (await state('s1')).body.attempt;
  assert.equal(st.answersByQ['3'].teacherGrade.pointsAwarded, 900);
  assert.equal(st.answersByQ['3'].teacherGrade.by, undefined);
  assert.equal(st.metrics.teacherScore, 900);
  assert.equal(st.metrics.pendingTeacherGradeCount, 0);
  // A later submit leaves the teacher's grade alone, with no call.
  const done = await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(calls.length, 1);
  assert.equal(done.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 900);
  // After Release too: the grade follows.
  const released = await call('/api/assignments/release-grades', { password: teacherPassword, code, attemptIds: ['s1'] });
  assert.equal(released.body.grades[0].releasedGrade, 18);
  await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 3, points: 500 });
  assert.equal((await storage.get(`a:${code}:t:s1`)).releasedGrade, 10);
});

it('a reopened attempt: unchanged scores stay, a changed answer is scored again, the teacher\'s grades are kept', async () => {
  reply = () => ({ task: 'done', score: 7, feedback: 'Well done.' });
  await answer('s1', 3, 'My friend is kind.');
  await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal((await room.fetch(new Request('https://room/assignments/reopen-attempt', { method: 'POST', body: JSON.stringify({ code, attemptId: 's1' }) }))).status, 200);
  assert.equal((await state('s1')).body.attempt.answersByQ['3'].teacherGrade, null, 'hidden while reopened');
  assert.equal((await storage.get(`a:${code}:t:s1`)).answersByQ['3'].teacherGrade.pointsAwarded, 700);
  await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(calls.length, 1, 'unchanged: no second call');
  await room.fetch(new Request('https://room/assignments/reopen-attempt', { method: 'POST', body: JSON.stringify({ code, attemptId: 's1' }) }));
  reply = () => ({ task: 'done', score: 10, feedback: 'Much better.' });
  await answer('s1', 3, 'My friend Ana is kind, funny and generous.');
  assert.equal(calls.length, 1, 'reopened: scored when handed in again');
  const done = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(calls.length, 2);
  assert.equal(done.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 1000);
  await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 3, points: 300 });
  await room.fetch(new Request('https://room/assignments/reopen-attempt', { method: 'POST', body: JSON.stringify({ code, attemptId: 's1' }) }));
  await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(calls.length, 2);
  assert.equal((await storage.get(`a:${code}:t:s1`)).answersByQ['3'].teacherGrade.pointsAwarded, 300);
});

it('a grade the teacher gives while the AI is reading stays', async () => {
  await storage.put(`ab:${code}`, assignment({ feedbackMode: 'end' }));
  reply = () => ({ task: 'done', score: 2, feedback: 'Too short.' });
  await answer('s1', 3, 'My friend is kind.');
  duringCall = async () => {
    const graded = await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 3, points: 800 });
    assert.equal(graded.status, 200, JSON.stringify(graded.body));
  };
  const done = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(calls.length, 1);
  const grade = (await storage.get(`a:${code}:t:s1`)).answersByQ['3'].teacherGrade;
  assert.equal(grade.pointsAwarded, 800);
  assert.equal(grade.by, undefined);
});

it('listening: an open answer the teacher has already graded is left alone at the lock', async () => {
  await useListening();
  reply = () => ({ task: 'done', score: 2, feedback: 'Too short.' });
  await answer('s1', 2, 'He bought a bike yesterday.');
  const graded = await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 2, points: 800 });
  assert.equal(graded.status, 200, JSON.stringify(graded.body));
  const res = await submitSection('s1');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 0);
  const saved = (await storage.get(`a:${code}:t:s1`)).answersByQ['2'];
  assert.equal(saved.teacherGrade.pointsAwarded, 800);
  assert.equal(saved.teacherGrade.by, undefined);
  assert.equal(saved.ai, undefined);
});

it('submit leaves a score it has already given alone', async () => {
  reply = () => ({ task: 'done', score: 7, feedback: 'Well done.' });
  await answer('s1', 3, 'My friend is kind.');
  const saved = await storage.get(`a:${code}:t:s1`);
  saved.answersByQ['3'].teacherGrade.gradedAt = 1;
  await storage.put(`a:${code}:t:s1`, saved);
  await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal(calls.length, 1);
  assert.equal((await storage.get(`a:${code}:t:s1`)).answersByQ['3'].teacherGrade.gradedAt, 1);
});

it('feedback saved before answers had scores is read again, so the answer gets one', async () => {
  const saved = attempt('s1');
  saved.answersByQ['3'] = { answer: 'My friend is kind.', teacherGrade: null, ai: { key: 'my friend is kind', task: 'done', feedback: 'Well done.' } };
  await storage.put(`a:${code}:t:s1`, saved);
  reply = () => ({ task: 'done', score: 8, feedback: 'Well done.' });
  const res = await answer('s1', 3, 'My friend is kind.');
  assert.equal(calls.length, 1);
  assert.equal(res.body.attempt.answersByQ['3'].teacherGrade.pointsAwarded, 800);
});

it('the teacher sees the AI score beside its feedback', async () => {
  const { createRequire } = await import('node:module');
  const { loadDeclarations } = createRequire(import.meta.url)('./helpers/extract-declaration');
  const t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
  const { aiNoteForTeacher } = loadDeclarations(fs.readFileSync('app.js', 'utf8'), ['aiNoteForTeacher'], { t });
  assert.equal(aiNoteForTeacher({ task: 'partly', score: 6, feedback: 'Add more.' }), '🤖 AI score 6/10 (part of the task missing): Add more.');
  assert.equal(aiNoteForTeacher({ task: 'not_done', score: 0, feedback: 'Off-task.' }), '🤖 AI score 0/10 (not the task): Off-task.');
  assert.equal(aiNoteForTeacher({ task: 'done', feedback: 'Older note.' }), '🤖 AI feedback (task done): Older note.');
});

it('an AI score is not teacher activity: the student is not told "new from teacher"', async () => {
  reply = () => ({ task: 'done', score: 7, feedback: 'Well done.' });
  await answer('s1', 3, 'My friend is kind.');
  await call('/api/assignment/submit', { code, attemptId: 's1' });
  const row = async () => (await call('/api/assignment/check-status', { code, studentKey: 'student_s1' })).body.previousAttempts[0];
  assert.equal((await row()).teacherGradedCount, 0);
  assert.equal((await row()).hasNewTeacherActivity, false);
  await call('/api/assignments/grade', { password: teacherPassword, code, attemptId: 's1', qIndex: 3, points: 900 });
  assert.equal((await row()).teacherGradedCount, 1);
});

it('open answers: at most three feedback calls per question per attempt, then the teacher grades it', async () => {
  reply = () => ({ task: 'done', score: 8, feedback: 'Well done.' });
  for (let i = 0; i < 5; i += 1) await answer('s1', 3, `My friend is kind number ${i}.`);
  assert.equal(calls.length, 3);
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.equal(saved.answersByQ['3'].ai, undefined, 'feedback about an older text is not kept');
  assert.equal(saved.answersByQ['3'].teacherGrade, null, 'nor its score');
  assert.deepEqual(saved.aiUse, { calls: 3, open: { q4: 3 } });
  assert.equal((await base()).pendingGradingCount, 1);
});

it('notes stay hidden where answers are hidden (no feedback before submitting)', async () => {
  await storage.put(`ab:${code}`, assignment({ feedbackMode: 'none' }));
  reply = () => ({ ok: [false], why: 'Not the opposite.' });
  const res = await answer('s1', 0, 'large');
  assert.equal(calls.length, 1, 'acceptance still applies without feedback');
  assert.equal(res.body.attempt.answersByQ['0'].ai, undefined);
  assert.equal(res.body.attempt.answersWithCorrectness, null);
  const st = await state('s1');
  assert.equal(st.body.attempt.answersByQ['0'].ai, undefined);
  assert.equal((await storage.get(`a:${code}:t:s1`)).answersByQ['0'].ai.ok, false);
});

it('the teacher sees the note in grading, and Apply keeps the answers the AI accepted', async () => {
  reply = () => ({ ok: [true], why: 'Same meaning.' });
  await answer('s1', 0, 'little');
  const grading = await room.fetch(new Request(`https://room/assignments/question-grading?code=${code}&qIndex=0`));
  const items = (await grading.json()).items;
  assert.deepEqual(items.find(i => i.attemptId === 's1').ai, { ok: true, why: 'Same meaning.' });
  // The editor's quiz never had "little".
  const apply = await call('/api/assignments/update-quiz', { password: teacherPassword, code, quiz: quiz() });
  assert.equal(apply.status, 200, JSON.stringify(apply.body));
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['small', 'little']);
  const st = await state('s1');
  assert.equal(correctness(st, 0).correct, true);
  // A rewritten question forgets what was accepted for the old one.
  const changed = quiz();
  changed.questions[0].prompt = 'Opposite of "tall"';
  changed.questions[0].accepted = ['short'];
  await call('/api/assignments/update-quiz', { password: teacherPassword, code, quiz: changed });
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['short']);
});

it('the setting is saved from ⚙️, reported to students, and the AI memory goes with the assignment', async () => {
  const off = await call('/api/assignments/update-settings', { password: teacherPassword, code, aiCheck: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal(off.body.assignment.aiCheck, false);
  const on = await call('/api/assignments/update-settings', { password: teacherPassword, code, aiCheck: true });
  assert.equal(on.body.assignment.aiCheck, true);
  const settings = await call('/api/assignments/get-quiz', { password: teacherPassword, code, includeSettings: true });
  assert.equal(settings.body.settings.aiAvailable, true);
  assert.equal((await state('s1')).body.attempt.assignment.aiCheck, true);
  await answer('s1', 0, 'large');
  assert.ok(await storage.get(`ai:${code}`));
  const del = await room.fetch(new Request('https://room/assignments/delete', { method: 'POST', body: JSON.stringify({ code }) }));
  assert.equal(del.status, 200);
  assert.equal(await storage.get(`ai:${code}`), undefined);
});

it('created assignments are off unless asked for', async () => {
  const create = async aiCheck => (await room.fetch(new Request('https://room/assignments/create', {
    method: 'POST', body: JSON.stringify({ title: 'New', quiz: quiz(), ...(aiCheck === undefined ? {} : { aiCheck }) }),
  }))).json();
  assert.equal((await create()).assignment.aiCheck, false);
  assert.equal((await create(true)).assignment.aiCheck, true);
});

it('a per-attempt ceiling stops the calls', async () => {
  const saved = attempt('s1');
  saved.aiUse = { calls: 40 };
  await storage.put(`a:${code}:t:s1`, saved);
  await answer('s1', 0, 'little');
  assert.equal(calls.length, 0);
});

// 🎧 Listening sections autosave, so the AI reads them once, as the section locks.
const transcript = 'Tom: I bought a bike.\nAna: A car? No, a van.';
const listeningQuiz = () => ({ title: 'Listening', questions: [
  { id: 'l1', type: 'text', prompt: 'What did Tom buy?', points: 1000, accepted: ['a bike'], listeningSection: 'p1', heard: { from: 0, to: 0 } },
  { id: 'l2', type: 'context_gap', prompt: 'Ana says a ____.', points: 1000, gaps: ['van'], listeningSection: 'p1' },
  { id: 'l3', type: 'open', prompt: 'What does Tom say?', points: 1000, listeningSection: 'p1', heard: { from: 0, to: 0 } },
  { id: 'l4', type: 'mcq', prompt: 'Pick one', points: 1000, answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }], listeningSection: 'p1' },
], listeningSections: [{
  id: 'p1', title: 'Part 1', text: 'Listen and answer.', audio: { kind: 'file', url: 'https://example.com/p1.mp3' }, playsAllowed: 0, pauseAllowed: true,
  transcript, cues: [{ s: 1, e: 2, who: 'Tom', text: 'I bought a bike.' }, { s: 3, e: 4, who: 'Ana', text: 'A car? No, a van.' }],
}] });
const useListening = (extra = {}) => storage.put(`ab:${code}`, assignment({ quiz: listeningQuiz(), ...extra }));
const submitSection = (attemptId, sectionId = 'p1') => call('/api/assignment/submit-section', { code, attemptId, sectionId });

it('listening: autosaves never reach the AI, whatever is typed', async () => {
  await useListening();
  const res = await answer('s1', 0, 'a bicycle');
  await answer('s1', 2, 'Tom says he bought a bike.');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 0);
  assert.equal(correctness(res, 0), undefined);
  assert.equal(res.body.attempt.answersByQ['0'].ai, undefined);
});

it('listening: Submit section accepts a synonym, with the recording to read, and the mark is right at once', async () => {
  await useListening();
  reply = () => ({ ok: [true], why: '"Bicycle" means the same as "bike".' });
  await answer('s1', 0, 'a bicycle');
  await answer('s1', 3, 0);
  assert.equal(calls.length, 0);
  const res = await submitSection('s1');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, {
    type: 'text', question: 'What did Tom buy?', instruction: 'Listen and answer.', recording: 'Tom: I bought a bike.',
    check: [{ accepted: ['a bike'], student: 'a bicycle' }],
  });
  assert.equal(correctness(res, 0).correct, true);
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['a bike', 'a bicycle']);
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.ok(saved.sectionsSubmitted.p1);
  assert.equal(saved.autoScore, 2000);
  assert.deepEqual(saved.aiUse, { calls: 1 });
  assert.equal((await answer('s1', 0, 'a car')).body.code, 'SECTION_SUBMITTED');
  // The next student is graded by the accepted list.
  await answer('s2', 0, 'A bicycle');
  await submitSection('s2');
  assert.equal(calls.length, 1);
});

it('the instructions keep accepted answers in charge of a listening answer', () => {
  const src = fs.readFileSync('cloudflare/worker.js', 'utf8');
  assert.match(src, /accepted answers still decide what is right/);
  assert.match(src, /so a synonym is fine, but anything else the recording mentions is wrong/);
  assert.match(src, /If the instruction asks for the exact words heard/);
});

it('listening: a refusal shows its reason only after the lock, is remembered, and the recording stays off the student page', async () => {
  await useListening();
  reply = () => ({ ok: [false], why: 'He did not say that.' });
  await answer('s1', 0, 'a car');
  const early = await state('s1');
  assert.equal(early.body.attempt.answersByQ['0'].ai, undefined);
  assert.equal(correctness(early, 0), undefined);
  const res = await submitSection('s1');
  assert.equal(correctness(res, 0).correct, false);
  assert.equal(res.body.attempt.answersByQ['0'].ai.why, 'He did not say that.');
  assert.equal((await state('s1')).body.attempt.answersByQ['0'].ai.ok, false);
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['a bike']);
  await answer('s2', 0, 'A car');
  const next = await submitSection('s2');
  assert.equal(calls.length, 1);
  assert.equal(next.body.attempt.answersByQ['0'].ai.ok, false);
  for (const text of [JSON.stringify(res.body), JSON.stringify(next.body), JSON.stringify((await state('s1')).body)]) {
    assert.ok(!text.includes('I bought a bike'), 'never the words of the recording');
  }
});

it('listening: one wrong gap is asked about alone, right answers and choices are not', async () => {
  await useListening();
  reply = () => ({ ok: [true], why: 'Same meaning here.' });
  await answer('s1', 0, 'a bike');
  await answer('s1', 1, ['truck']);
  await answer('s1', 3, 1);
  await submitSection('s1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input.check, [{ gap: 1, accepted: ['van'], student: 'truck' }]);
  assert.equal(calls[0].input.recording, transcript, 'no moment linked: the transcript');
});

it('listening: without a transcript the AI reads the cues; with no words at all it still checks', async () => {
  const noText = listeningQuiz();
  delete noText.listeningSections[0].transcript;
  await useListening({ quiz: noText });
  reply = () => ({ ok: [false], why: 'No.' });
  await answer('s1', 1, ['truck']);
  await submitSection('s1');
  assert.equal(calls[0].input.recording, transcript);
  const empty = listeningQuiz();
  delete empty.listeningSections[0].transcript;
  delete empty.listeningSections[0].cues;
  empty.listeningSections[0].text = '';
  await useListening({ quiz: empty });
  await answer('s2', 0, 'a bicycle');
  await submitSection('s2');
  assert.deepEqual(calls[1].input, { type: 'text', question: 'What did Tom buy?', check: [{ accepted: ['a bike'], student: 'a bicycle' }] });
});

it('listening: an open answer gets its score and feedback at the lock, with the whole transcript', async () => {
  await useListening();
  reply = () => ({ task: 'partly', score: 4, feedback: 'Say what Tom bought.' });
  const early = await answer('s1', 2, 'He talks about a car.');
  assert.equal(early.body.attempt.metrics.pendingTeacherGradeCount, 1);
  const res = await submitSection('s1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, {
    task: 'What does Tom say?', instruction: 'Listen and answer.', recording: transcript, answer: 'He talks about a car.',
  });
  const saved = res.body.attempt.answersByQ['2'];
  assert.equal(saved.ai.task, 'partly');
  assert.equal(saved.ai.feedback, 'Say what Tom bought.');
  assert.equal(saved.teacherGrade.by, 'ai');
  assert.equal(saved.teacherGrade.pointsAwarded, 400);
  assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 0);
  assert.equal((await base()).pendingGradingCount, 0);
  assert.equal(res.body.attempt.metrics.totalScore, 400);
});

it('listening: the whole section is looked at together, and one failure loses only its own question', async () => {
  await useListening();
  reply = input => ({ ok: input.check.map(() => true), why: 'Fine.' });
  await answer('s1', 0, 'a bicycle');
  await answer('s1', 1, ['truck']);
  await answer('s1', 2, 'He bought a bike yesterday.');
  let waiting = 0;
  let most = 0;
  const stub = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    waiting += 1;
    most = Math.max(most, waiting);
    await new Promise(resolve => setTimeout(resolve, 5));
    waiting -= 1;
    if (JSON.parse(JSON.parse(init.body).input).task) return new Response('{}', { status: 500 });
    return stub(url, init);
  };
  try {
    const res = await submitSection('s1');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(most, 3, 'all at once, not one after another');
    assert.equal(correctness(res, 0).correct, true);
    assert.equal(correctness(res, 1).correct, true);
    assert.equal(res.body.attempt.answersByQ['2'].ai, undefined);
    assert.equal((await storage.get(`a:${code}:t:s1`)).aiUse.calls, 3);
  } finally { globalThis.fetch = stub; }
});

it('listening: OpenAI trouble still locks the section, with the usual marks', async () => {
  await useListening();
  openAiStatus = 500;
  await answer('s1', 0, 'a bicycle');
  const res = await submitSection('s1');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(correctness(res, 0).correct, false);
  assert.equal(res.body.attempt.answersByQ['0'].ai, undefined);
  assert.ok((await storage.get(`a:${code}:t:s1`)).sectionsSubmitted.p1);
  assert.equal(await storage.get(`ai:${code}`), undefined);
});

it('listening: the setting off, no key, or a section already submitted: no call', async () => {
  await useListening({ aiCheck: undefined });
  await answer('s1', 0, 'a bicycle');
  await submitSection('s1');
  assert.equal(calls.length, 0);
  await useListening();
  await answer('s2', 0, 'a bicycle');
  const key = env.OPENAI_API_KEY;
  delete env.OPENAI_API_KEY;
  try { await submitSection('s2'); } finally { env.OPENAI_API_KEY = key; }
  assert.equal(calls.length, 0);
  await submitSection('s1');
  await submitSection('s2');
  assert.equal(calls.length, 0);
});

it('listening: an answer changed while OpenAI reads the section is kept, and gets no note about the old one', async () => {
  await useListening();
  reply = () => ({ ok: [false], why: 'Not a bike.' });
  await answer('s1', 0, 'a car');
  duringCall = async () => { assert.equal((await answer('s1', 0, 'a van')).status, 200); };
  const res = await submitSection('s1');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.equal(saved.answersByQ['0'].answer, 'a van');
  assert.equal(saved.answersByQ['0'].ai, undefined);
  assert.ok(saved.sectionsSubmitted.p1);
});

it('listening: the ceiling holds when a section asks about several answers at once', async () => {
  await useListening();
  const saved = attempt('s1');
  saved.aiUse = { calls: 39 };
  await storage.put(`a:${code}:t:s1`, saved);
  await answer('s1', 0, 'a bicycle');
  await answer('s1', 1, ['truck']);
  await submitSection('s1');
  assert.equal(calls.length, 1);
  assert.equal((await storage.get(`a:${code}:t:s1`)).aiUse.calls, 40);
});

it('listening: without instant feedback the section is read at the lock too, and notes and scores wait for the answers', async () => {
  await useListening({ feedbackMode: 'end' });
  reply = input => (input.task ? { task: 'done', score: 8, feedback: 'Well done.' } : { ok: [false], why: 'Not a bike.' });
  await answer('s1', 0, 'a car');
  await answer('s1', 2, 'He bought a bike yesterday.');
  const res = await submitSection('s1');
  assert.equal(calls.length, 2, 'the typed answer and the open one');
  assert.equal(res.body.attempt.answersByQ['0'].ai, undefined);
  assert.equal(res.body.attempt.answersByQ['2'].ai, undefined);
  assert.equal(res.body.attempt.answersByQ['2'].teacherGrade, null);
  const stored = await storage.get(`a:${code}:t:s1`);
  assert.equal(stored.answersByQ['0'].ai.ok, false);
  assert.equal(stored.answersByQ['2'].teacherGrade.pointsAwarded, 800);
  assert.equal((await base()).pendingGradingCount, 0);
  const done = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(calls.length, 2, 'already read: no second call');
  assert.equal(done.body.attempt.answersByQ['0'].ai.why, 'Not a bike.');
  assert.equal(done.body.attempt.answersByQ['2'].teacherGrade.pointsAwarded, 800);
});

it('listening: submitting the whole assignment reads a section left open, but only once it really goes through', async () => {
  await useListening({ feedbackMode: 'end' });
  reply = () => ({ ok: [true], why: 'Same meaning.' });
  await answer('s1', 0, 'a bicycle');
  const refused = await call('/api/assignment/submit', { code, attemptId: 's1' });
  assert.equal(refused.body.code, 'UNANSWERED_REMAINING');
  assert.equal(calls.length, 0);
  const res = await call('/api/assignment/submit', { code, attemptId: 's1', force: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  assert.equal(correctness(res, 0).correct, true);
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.equal(saved.submitted, true);
  assert.equal(saved.autoScore, 1000);
  assert.deepEqual((await base()).quiz.questions[0].accepted, ['a bike', 'a bicycle']);
});

it('listening: a reopened attempt hides its notes until it is submitted again', async () => {
  await useListening();
  reply = () => ({ ok: [false], why: 'Not a bike.' });
  await answer('s1', 0, 'a car');
  await submitSection('s1');
  const reopened = await room.fetch(new Request('https://room/assignments/reopen-attempt', { method: 'POST', body: JSON.stringify({ code, attemptId: 's1' }) }));
  assert.equal(reopened.status, 200);
  assert.equal((await state('s1')).body.attempt.answersByQ['0'].ai, undefined);
  const saved = await answer('s1', 3, 0);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.attempt.answersByQ['0'].ai, undefined);
  const again = await submitSection('s1');
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(calls.length, 1, 'the same wrong answer is not asked about again');
  assert.equal((await storage.get(`a:${code}:t:s1`)).answersByQ['0'].ai.ok, false);
});

it('listening: public games stay out', async () => {
  await useListening();
  const saved = attempt('s1');
  saved.via = 'play';
  await storage.put(`a:${code}:t:s1`, saved);
  await answer('s1', 0, 'a bicycle');
  assert.equal((await submitSection('s1')).status, 200);
  assert.equal(calls.length, 0);
});

// Adaptive: closing a block fixes its score and level, so the AI comes first.
async function adaptiveAttempt() {
  const section = { id: 's1', title: 'Listening', text: 'Listen.', transcript, audio: { kind: 'file', url: 'https://example.com/audio.mp3' } };
  const questions = ['A1', 'A2'].flatMap(cefr => [1, 2].map(n => ({
    id: `${cefr}-${n}`, type: 'text', prompt: `${cefr} question ${n}`, points: 1000, accepted: ['bike'], cefr, listeningSection: 's1',
  })));
  const created = await call('/api/assignments/create', { password: teacherPassword, randomNames: true,
    feedbackMode: 'instant', adaptive: true, adaptiveCount: 0, aiCheck: true,
    quiz: { title: 'Adaptive listening', listeningSections: [section], questions },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const adaptiveCode = created.body.assignment.code;
  const started = await call('/api/assignment/start', { code: adaptiveCode, studentKey: 'listener', studentName: 'Listener' });
  assert.equal(started.status, 201, JSON.stringify(started.body));
  return { adaptiveCode, attemptId: started.body.attempt.id };
}

it('adaptive listening: what the AI accepts counts in the section score, and its notes survive the close', async () => {
  const { adaptiveCode, attemptId } = await adaptiveAttempt();
  reply = input => ({ ok: [input.check[0].student === 'bicycle'], why: 'Not a bike.' });
  const save = (qIndex, value) => call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex, answer: value });
  assert.equal((await save(0, 'bicycle')).status, 200);
  assert.equal((await save(1, 'car')).status, 200);
  assert.equal(calls.length, 0);
  const res = await call('/api/assignment/submit-section', { code: adaptiveCode, attemptId, sectionId: 's1' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].input.recording, transcript);
  const saved = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  assert.equal(saved.adaptive.block, null);
  assert.equal(saved.adaptive.sectionResults[0].right, 1, 'the accepted synonym counts as right');
  assert.equal(saved.adaptive.items.find(it => it.answer === 'car').ai.why, 'Not a bike.');
  assert.equal(res.body.attempt.answersByQ['1'].ai.why, 'Not a bike.');
});

it('adaptive listening: submitting the whole assignment with the block open counts the AI too', async () => {
  const { adaptiveCode, attemptId } = await adaptiveAttempt();
  reply = () => ({ ok: [true], why: 'Same meaning.' });
  await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 0, answer: 'bicycle' });
  const res = await call('/api/assignment/submit', { code: adaptiveCode, attemptId, force: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  const saved = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  assert.equal(saved.submitted, true);
  assert.equal(saved.adaptive.block, null);
  assert.equal(saved.adaptive.sectionResults[0].right, 1);
});

it('adaptive: an open answer\'s score moves the level at once, and the teacher can change it later', async () => {
  const questions = ['A1', 'A2'].flatMap(cefr => [1, 2, 3].map(n => ({ id: `${cefr}-${n}`, type: 'open', prompt: `${cefr} task ${n}`, points: 1000, cefr })));
  const created = await call('/api/assignments/create', { password: teacherPassword, randomNames: true, feedbackMode: 'instant', adaptiveCount: 3, aiCheck: true, quiz: { title: 'Adaptive writing', questions } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const adaptiveCode = created.body.assignment.code;
  const started = await call('/api/assignment/start', { code: adaptiveCode, studentKey: 'writer', studentName: 'Writer' });
  const attemptId = started.body.attempt.id;
  reply = () => ({ task: 'done', score: 10, feedback: 'Well done.' });
  const res = await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 0, answer: 'A fine answer.' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  assert.equal(res.body.attempt.answersByQ['0'].teacherGrade.by, 'ai');
  assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 0);
  const saved = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  const [item] = saved.adaptive.items;
  assert.equal(item.teacherGrade.pointsAwarded, 1000);
  assert.equal(item.levelEffect.outcome, 'right');
  assert.equal(saved.adaptive.answered, 1);
  assert.equal(saved.adaptive.path.at(-1).pending, false);
  const moved = saved.adaptive.score;
  const changed = await call('/api/assignments/grade', { password: teacherPassword, code: adaptiveCode, attemptId, qIndex: item.qi, points: 0 });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const after = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  assert.equal(after.adaptive.items[0].levelEffect.outcome, 'wrong');
  assert.ok(after.adaptive.score < moved, 'the first effect is taken back');
});

it('adaptive listening: open answers are scored when the block closes, before the next question is chosen', async () => {
  const section = { id: 's1', title: 'Listening', text: 'Listen.', transcript, audio: { kind: 'file', url: 'https://example.com/audio.mp3' } };
  const questions = ['A1', 'A2'].flatMap(cefr => [1, 2].map(n => ({ id: `${cefr}-${n}`, type: 'open', prompt: `${cefr} task ${n}`, points: 1000, cefr, listeningSection: 's1' })));
  const created = await call('/api/assignments/create', { password: teacherPassword, randomNames: true, feedbackMode: 'instant', adaptive: true, adaptiveCount: 0, aiCheck: true, quiz: { title: 'Adaptive listening', listeningSections: [section], questions } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const adaptiveCode = created.body.assignment.code;
  const started = await call('/api/assignment/start', { code: adaptiveCode, studentKey: 'listener', studentName: 'Listener' });
  const attemptId = started.body.attempt.id;
  reply = () => ({ task: 'done', score: 10, feedback: 'Well done.' });
  await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 0, answer: 'One answer.' });
  await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 1, answer: 'Another answer.' });
  assert.equal(calls.length, 0);
  const res = await call('/api/assignment/submit-section', { code: adaptiveCode, attemptId, sectionId: 's1' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 2);
  const saved = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  assert.equal(saved.adaptive.items.filter(it => it.teacherGrade?.by === 'ai').length, 2);
  assert.equal(saved.adaptive.items.filter(it => it.levelEffect?.outcome === 'right').length, 2);
  assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 0);
  assert.equal(res.body.attempt.answersByQ['1'].teacherGrade.pointsAwarded, 1000);
});

// ☁️ The quiz an assignment was made from: what the AI accepts is kept per
// cloud quiz, and the editor adds it there (pullAiAcceptedAnswers in app.js).
it('accepted answers are kept for the cloud quiz, readable by the teacher only, and forgotten with the quiz', async () => {
  await storage.put(`ab:${code}`, assignment({ cloudQuizId: 'quiz-grammar' }));
  reply = (input) => ({ ok: input.check.map(c => ['Little', 'walked'].includes(c.student)), why: 'Fine.' });
  await answer('s1', 0, 'Little');
  await answer('s2', 0, 'large'); // refused: not kept
  await answer('s3', 2, ['walked', 'ate']);
  const saved = await storage.get('aiq:quiz-grammar');
  assert.equal(saved.q.q1.sig, 'text|opposite of big');
  assert.deepEqual(saved.q.q1.added.map(({ value }) => value), ['Little']);
  assert.deepEqual(saved.q.q3.added.map(({ value, gap }) => ({ value, gap })), [{ value: 'walked', gap: 0 }]);
  assert.ok(saved.q.q1.added[0].at > 0);
  const wrong = await call('/api/quizzes/ai-answers', { password: 'nope', quizId: 'quiz-grammar' });
  assert.equal(wrong.status, 401);
  const read = await call('/api/quizzes/ai-answers', { password: teacherPassword, quizId: 'quiz-grammar' });
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.deepEqual(read.body.questions, saved.q);
  const r2 = { delete: async () => {}, list: async () => ({ objects: [] }) };
  const deleted = await worker.fetch(new Request('https://api.test/api/quizzes/quizzes/quiz-grammar.json', {
    method: 'DELETE', headers: { Authorization: `Bearer ${teacherPassword}` },
  }), { ...env, QUIZ_MEDIA: r2 });
  assert.equal(deleted.status, 200);
  assert.equal(await storage.get('aiq:quiz-grammar'), undefined);
});

it('an assignment with no cloud quiz keeps nothing per quiz', async () => {
  reply = () => ({ ok: [true], why: 'Fine.' });
  await answer('s1', 0, 'Little');
  assert.deepEqual([...rows.keys()].filter(k => k.startsWith('aiq:')), []);
});

it('the editor adds them once: skipped when already there or on a changed question, and a deleted one stays deleted', async () => {
  const { createRequire } = await import('node:module');
  const { loadDeclarations } = createRequire(import.meta.url)('./helpers/extract-declaration');
  let served = {};
  let rendered = 0;
  const sandbox = {
    quiz: null, createSessionPassword: 'teacher',
    api: async (route, opts) => { assert.equal(route, '/api/quizzes/ai-answers'); assert.equal(opts.body.quizId, 'quiz-grammar'); return { ok: true, questions: served }; },
    renderBuilder: () => { rendered += 1; }, saveQuiz() {},
  };
  const app = loadDeclarations(fs.readFileSync('app.js', 'utf8'), [
    'pullAiAcceptedAnswers', 'aiQuestionSig', 'MORE_ANSWERS_TYPES', 'MORE_ANSWERS_LIMITS', 'moreAnswersCurrent', 'applyMoreAnswers',
    'normalizeTextAnswer', 'contextGapList', 'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'tokenizeWords',
  ], sandbox);
  const editor = quiz();
  editor._r2QuizId = 'quiz-grammar';
  sandbox.quiz = editor;
  served = {
    q1: { sig: 'text|opposite of big', added: [{ value: 'Little', at: 10 }, { value: 'SMALL', at: 11 }] },
    q2: { sig: "error_hunt|she don t speak english", added: [{ value: "You don't speak English.", at: 12 }] },
    q3: { sig: 'context_gap|i go home and eat', added: [{ value: 'walked', gap: 0, at: 13 }] },
    q4: { sig: 'open|something else', added: [{ value: 'x', at: 14 }] },
  };
  // The sigs above are what the server stores: check they match the editor's.
  assert.equal(app.aiQuestionSig(editor.questions[1]), served.q2.sig);
  assert.equal(app.aiQuestionSig(editor.questions[2]), served.q3.sig);
  assert.equal(await app.pullAiAcceptedAnswers(), 3);
  assert.deepEqual(Array.from(editor.questions[0].accepted), ['small', 'Little']);
  assert.ok(editor.questions[1].correctedVariants.includes("You don't speak English."));
  assert.deepEqual(Array.from(editor.questions[2].gaps), ['went, walked', 'ate']);
  assert.equal(editor.aiAnswersSeenAt, 13, 'only questions it could add to count as read');
  assert.equal(rendered, 1);
  // The teacher deletes one; a later pull does not bring it back, but a new one comes.
  editor.questions[0].accepted = ['small'];
  served.q1.added.push({ value: 'tiny', at: 20 });
  assert.equal(await app.pullAiAcceptedAnswers(), 1);
  assert.deepEqual(Array.from(editor.questions[0].accepted), ['small', 'tiny']);
  // A question whose prompt changed in the editor gets nothing.
  editor.questions[0].prompt = 'Opposite of "tall"';
  served.q1.added.push({ value: 'short', at: 30 });
  assert.equal(await app.pullAiAcceptedAnswers(), 0);
  assert.deepEqual(Array.from(editor.questions[0].accepted), ['small', 'tiny']);
  // Not a cloud quiz, or the API is down: nothing, no error.
  delete editor._r2QuizId;
  assert.equal(await app.pullAiAcceptedAnswers(), 0);
  editor._r2QuizId = 'quiz-grammar';
  sandbox.api = async () => { throw new Error('offline'); };
  assert.equal(await app.pullAiAcceptedAnswers(), 0);
});
