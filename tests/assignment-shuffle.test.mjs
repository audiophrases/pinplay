import { it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { loadDeclarations } = createRequire(import.meta.url)('./helpers/extract-declaration');
const workerSource = fs.readFileSync('cloudflare/worker.js', 'utf8');
const playerSource = fs.readFileSync('play.js', 'utf8');
const password = 'shuffle-test';
let worker, QuizRoom, env, room, storage, temp;
const clone = value => value === undefined ? value : structuredClone(value);
const quiz = {
  title: 'Shuffled exam',
  questions: [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, type: 'tf', prompt: `Question ${i}`, points: 1000,
      cefr: i % 2 ? 'A2' : 'A1', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }] })),
    { id: 'essay', type: 'open', prompt: 'Explain', points: 1000 },
    ...[0, 1].map(i => ({ id: `listen${i}`, type: 'tf', prompt: `Listen ${i}`, points: 1000,
      listeningSection: 'section1', answers: [{ text: 'True', correct: true }, { text: 'False', correct: false }] })),
  ],
  listeningSections: [{ id: 'section1', title: 'Audio', audio: { kind: 'file', url: 'https://example.com/audio.mp3' } }],
};
async function call(route, body) {
  const response = await worker.fetch(new Request(`https://api.test${route}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  const data = await response.json();
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function create(extra = {}) {
  return (await call('/api/assignments/create', { password, quiz, randomNames: true,
    attemptsLimit: 0, feedbackMode: 'none', examMode: true, shuffleQuestions: true, ...extra })).assignment.code;
}
function client() {
  const live = { player: { assignment: {} } };
  const functions = loadDeclarations(playerSource, ['api', 'assignmentAttemptDisplayView'], {
    live, apiFetch: (route, opts = {}) => call(route, opts.body),
  });
  return { ...functions, live, remember(data) { live.player.assignment.state = data; return data.attempt; } };
}
before(async () => {
  temp = path.join(os.tmpdir(), `pinplay-shuffle-${process.pid}.mjs`);
  fs.writeFileSync(temp, workerSource.replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href)));
  ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
  const rows = new Map();
  storage = {
    get: async key => clone(rows.get(key)), put: async (key, value) => rows.set(key, clone(value)),
    delete: async key => rows.delete(key),
    list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, clone(value)])),
  };
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))).toString('hex');
  env = { CREATE_PASSWORD_HASH: hash, ROOMS: { idFromName: name => name,
    get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
  room = new QuizRoom({ storage }, env);
});
after(() => { if (temp) fs.unlinkSync(temp); });

it('shuffles every question once and keeps listening blocks together, including after quiz edits', () => {
  const W = loadDeclarations(workerSource, ['assignmentQuestionOrder'], { Math: Object.assign(Object.create(Math), { random: () => 0 }) });
  const order = Array.from(W.assignmentQuestionOrder(quiz.questions));
  assert.deepEqual([...order].sort((a, b) => a - b), quiz.questions.map((_, i) => i));
  assert.notDeepEqual(order, quiz.questions.map((_, i) => i));
  assert.equal(order.indexOf(10), order.indexOf(9) + 1);
  const edited = [...quiz.questions, { id: 'new' }];
  assert.deepEqual(Array.from(W.assignmentQuestionOrder(edited, order)), [...order, 11]);
});

it('saves per-attempt orders, resumes after a restart, and toggles only affect new attempts', async () => {
  const code = await create();
  const first = (await call('/api/assignment/start', { code, studentKey: 'student1' })).attempt;
  assert.equal(first.assignment.shuffleQuestions, true);
  assert.equal(first.questionOrder.length, quiz.questions.length);
  assert.deepEqual((await storage.get(`a:${code}:t:${first.id}`)).questionOrder, first.questionOrder);
  room = new QuizRoom({ storage }, env);
  const resumed = await call('/api/assignment/start', { code, studentKey: 'student1' });
  assert.equal(resumed.alreadyStarted, true);
  assert.deepEqual(resumed.attempt.questionOrder, first.questionOrder);
  const orders = new Set([JSON.stringify(first.questionOrder)]);
  for (let i = 2; i <= 6; i++) orders.add(JSON.stringify((await call('/api/assignment/start', { code, studentKey: `student${i}` })).attempt.questionOrder));
  assert.ok(orders.size > 1);
  await call('/api/assignments/update-settings', { password, code, shuffleQuestions: false });
  assert.deepEqual((await call(`/api/assignment/state?code=${code}&attemptId=${first.id}`)).attempt.questionOrder, first.questionOrder);
  const unshuffled = (await call('/api/assignment/start', { code, studentKey: 'later' })).attempt;
  assert.equal(unshuffled.questionOrder, undefined);
  await call('/api/assignments/update-settings', { password, code, shuffleQuestions: true });
  assert.equal((await call('/api/assignment/start', { code, studentKey: 'later' })).attempt.questionOrder, undefined);
});

it('player answers, listening drafts, review and teacher grading all address the right questions', async () => {
  const code = await create({ feedbackMode: 'instant' });
  const C = client();
  const started = C.remember(await C.api('/api/assignment/start', { method: 'POST', body: { code, studentKey: 'mapping' } }));
  const order = started.questionOrder;
  const attemptId = started.id;
  assert.deepEqual(Array.from(started.assignment.quiz.questions, q => q.prompt), order.map(i => quiz.questions[i].prompt));
  const displayIndex = order.indexOf(3);
  const answered = await C.api('/api/assignment/answer', { method: 'POST', body: { code, attemptId, qIndex: displayIndex, answer: 0 } });
  C.remember(answered);
  assert.equal(answered.qIndex, displayIndex);
  assert.equal(answered.attempt.answersByQ[displayIndex].answer, 0);
  assert.equal(answered.attempt.answersWithCorrectness[0].qIndex, displayIndex);
  assert.equal(answered.attempt.answersWithCorrectness[0].correct, true);
  assert.equal((await storage.get(`a:${code}:t:${attemptId}`)).answersByQ[3].answer, 0);
  for (const canonical of [8, 9, 10]) {
    const qIndex = order.indexOf(canonical);
    C.remember(await C.api('/api/assignment/answer', { method: 'POST', body: { code, attemptId, qIndex, answer: canonical === 8 ? 'Explanation' : 0 } }));
  }
  C.remember(await C.api('/api/assignment/submit-section', { method: 'POST', body: { code, attemptId, sectionId: 'section1' } }));
  const grade = await call('/api/assignments/grade', { password, code, attemptId, qIndex: 8, points: 750, correction: 'Good' });
  assert.ok(grade.ok);
  const state = C.remember(await C.api(`/api/assignment/state?code=${code}&attemptId=${attemptId}`));
  assert.equal(state.answersByQ[order.indexOf(8)].teacherGrade.pointsAwarded, 750);
  assert.equal(state.answersByQ[order.indexOf(8)].answer, 'Explanation');
  assert.equal(state.sectionsSubmitted.section1 > 0, true);
  assert.equal(state.metrics.totalScore, 3750);
  C.remember(await C.api('/api/assignment/submit', { method: 'POST', body: { code, attemptId, force: true } }));
  const reviewed = C.remember(await C.api(`/api/assignment/state?code=${code}&attemptId=${attemptId}`));
  assert.equal(reviewed.submitted, true);
  assert.deepEqual(Array.from(reviewed.questionOrder), order);
  assert.equal(reviewed.answersByQ[order.indexOf(8)].teacherGrade.correction, 'Good');
});

it('quiz edits retain the order of existing questions and append new ones safely', async () => {
  const code = await create();
  const started = (await call('/api/assignment/start', { code, studentKey: 'edit' })).attempt;
  const promptsBefore = started.questionOrder.map(i => quiz.questions[i].prompt);
  const edited = { ...quiz, questions: [...quiz.questions.slice(1).reverse(), { ...quiz.questions[0], id: 'added', prompt: 'Added' }] };
  await call('/api/assignments/update-quiz', { password, code, quiz: edited });
  const C = client();
  const attempt = (await C.api(`/api/assignment/state?code=${code}&attemptId=${started.id}`)).attempt;
  const prompts = Array.from(attempt.assignment.quiz.questions, q => q.prompt);
  // Inside a listening block the current authored order takes precedence.
  assert.deepEqual(prompts.filter(prompt => !prompt.startsWith('Listen')), [...promptsBefore.filter(prompt => prompt !== 'Question 0' && !prompt.startsWith('Listen')), 'Added']);
  assert.equal(Math.abs(prompts.indexOf('Listen 0') - prompts.indexOf('Listen 1')), 1);
});

it('Adaptive uses its engine even if shuffle is selected, and defaults leave ordinary quizzes in authored order', async () => {
  const adaptiveCode = await create({ adaptive: true, adaptiveCount: 3 });
  const adaptive = (await call('/api/assignment/start', { code: adaptiveCode, studentKey: 'adaptive' })).attempt;
  assert.ok(adaptive.adaptive);
  assert.equal(adaptive.questionOrder, undefined);
  const code = await create({ shuffleQuestions: undefined });
  const normal = (await call('/api/assignment/start', { code, studentKey: 'normal' })).attempt;
  assert.equal(normal.questionOrder, undefined);
  assert.deepEqual(normal.assignment.quiz.questions.map(q => q.prompt), quiz.questions.map(q => q.prompt));
});

it('display conversion tolerates legacy attempts and rejects malformed permutations', () => {
  const C = client();
  const base = { assignment: { quiz }, answersByQ: {} };
  assert.equal(C.assignmentAttemptDisplayView(base), base);
  for (const order of [[0, 0], [100], [1.5], Array(quiz.questions.length).fill(0)]) {
    const attempt = { ...base, questionOrder: order };
    assert.equal(C.assignmentAttemptDisplayView(attempt), attempt);
  }
});
