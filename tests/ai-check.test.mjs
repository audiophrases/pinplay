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

it('open answers get task and language feedback once per text, only with feedback after each answer', async () => {
  reply = (input, body) => {
    assert.equal(body.max_output_tokens, 120);
    return { task: 'partly', feedback: 'Add a second sentence. Use "she is" for "she are".' };
  };
  const text = 'My friend Ana she are very kind.';
  const res = await answer('s1', 3, text);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, { task: 'Describe your best friend in two sentences.', answer: text });
  const note = res.body.attempt.answersByQ['3'].ai;
  assert.equal(note.task, 'partly');
  assert.match(note.feedback, /she is/);
  // Still the teacher's to grade.
  assert.equal(res.body.attempt.metrics.pendingTeacherGradeCount, 1);
  // The same text saved again keeps its feedback, with no call.
  const same = await answer('s1', 3, `  ${text} `);
  assert.equal(calls.length, 1);
  assert.equal(same.body.attempt.answersByQ['3'].ai.task, 'partly');
  // Too short to look at.
  await answer('s2', 3, 'Ana kind.');
  assert.equal(calls.length, 1);
  // No instant feedback: no call.
  await storage.put(`ab:${code}`, assignment({ feedbackMode: 'end' }));
  await answer('s3', 3, 'My friend Ana is very kind and funny.');
  assert.equal(calls.length, 1);
});

it('open answers: at most three feedback calls per question per attempt', async () => {
  reply = () => ({ task: 'done', feedback: 'Well done.' });
  for (let i = 0; i < 5; i += 1) await answer('s1', 3, `My friend is kind number ${i}.`);
  assert.equal(calls.length, 3);
  const saved = await storage.get(`a:${code}:t:s1`);
  assert.equal(saved.answersByQ['3'].ai, undefined, 'feedback about an older text is not kept');
  assert.deepEqual(saved.aiUse, { calls: 3, open: { q4: 3 } });
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
  saved.aiUse = { calls: 25 };
  await storage.put(`a:${code}:t:s1`, saved);
  await answer('s1', 0, 'little');
  assert.equal(calls.length, 0);
});
