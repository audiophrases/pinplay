import { it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadDeclarations } = require('./helpers/extract-declaration');
let worker, QuizRoom, env, room, storage, temp;
const code = 'GRADE123';
const teacherPassword = 'grade-release-test';
const clone = x => x === undefined ? x : structuredClone(x);
const assignment = {
  code, title: 'Exam', active: true, examMode: true, feedbackMode: 'none', randomNames: true, attemptsLimit: 1,
  quiz: { title: 'Exam', questions: [
    { id: 'q1', type: 'tf', prompt: 'One', points: 1000, answers: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }] },
    { id: 'q2', type: 'tf', prompt: 'Two', points: 1000, answers: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }] },
  ] },
};
const attempt = id => ({ id, studentKey: `student_${id}`, studentName: id, submitted: true, submittedAt: 100,
  answersByQ: { '0': { answer: 0 }, '1': { answer: 1 } },
});
function newRoom() { room = new QuizRoom({ storage }, env); }
async function call(route, body) {
  const response = await worker.fetch(new Request(`https://api.test${route}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  return { status: response.status, body: await response.json() };
}
before(async () => {
  // Keep the real Worker and routing; resolve its local import from this
  // temporary ESM entry point, without altering the production source.
  const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
  temp = path.join(os.tmpdir(), `pinplay-grade-release-${process.pid}.mjs`);
  fs.writeFileSync(temp, src);
  ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
  const rows = new Map();
  storage = {
    get: async k => clone(rows.get(k)),
    put: async (k, v) => rows.set(k, clone(v)),
    delete: async k => rows.delete(k),
    list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, clone(v)])),
  };
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teacherPassword))).toString('hex');
  env = { CREATE_PASSWORD_HASH: hash, ROOMS: { idFromName: n => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
  newRoom();
  await storage.put(`ab:${code}`, assignment);
  await storage.put(`a:${code}:t:selected`, attempt('selected'));
  await storage.put(`a:${code}:t:other`, attempt('other'));
});
after(() => { if (temp) fs.unlinkSync(temp); });
it('teacher authentication is enforced for releasing grades', async () => {
  const r = await call('/api/assignments/release-grades', { code, password: 'wrong', attemptIds: ['selected'] });
  assert.equal(r.status, 401);
  assert.equal((await storage.get(`a:${code}:t:selected`)).gradeReleasedAt, undefined);
});
it('release survives a fresh server instance and appears in student check-status, state and teacher results', async () => {
  const before = await call('/api/assignment/check-status', { code, studentKey: 'student_selected' });
  assert.equal(before.status, 200);
  assert.equal(before.body.previousAttempts[0].releasedGrade, null);
  const released = await call('/api/assignments/release-grades', { code, password: teacherPassword, attemptIds: ['selected'] });
  assert.equal(released.status, 200, JSON.stringify(released.body));
  assert.equal(released.body.grades[0].releasedGrade, 50);
  newRoom();
  const status = await call('/api/assignment/check-status', { code, studentKey: 'student_selected' });
  assert.equal(status.body.feedbackMode, 'none');
  assert.equal(status.body.previousAttempts[0].releasedGrade, 50);
  assert.ok(status.body.previousAttempts[0].gradeReleasedAt);
  const state = await call(`/api/assignment/state?code=${code}&attemptId=selected`);
  assert.equal(state.body.attempt.releasedGrade, 50);
  assert.equal(state.body.attempt.assignment.feedbackMode, 'none');
  assert.equal(state.body.attempt.answersWithCorrectness, null);
  assert.ok(state.body.attempt.assignment.quiz.questions.every(q => !q.answers?.some(a => a.correct)));
  const results = await call('/api/assignments/results', { code, password: teacherPassword });
  assert.equal(results.body.attempts.find(a => a.id === 'selected').releasedGrade, 50);
  const other = await call('/api/assignment/check-status', { code, studentKey: 'student_other' });
  assert.equal(other.body.previousAttempts[0].releasedGrade, null);
});
it('pending teacher grades reject the selection without submitting or releasing other students', async () => {
  const pending = { ...attempt('pending'), answersByQ: { 0: { answer: 'essay' } } };
  const pendingAssignment = structuredClone(assignment);
  pendingAssignment.quiz.questions[0] = { type: 'open', prompt: 'Essay', points: 1000 };
  await storage.put(`ab:${code}`, pendingAssignment);
  await storage.put(`a:${code}:t:pending`, pending);
  await storage.put(`a:${code}:t:other`, { ...attempt('other'), submitted: false, submittedAt: null, answersByQ: {} });
  const r = await call('/api/assignments/release-grades', { code, password: teacherPassword, attemptIds: ['other', 'pending'] });
  assert.equal(r.status, 409);
  assert.equal((await storage.get(`a:${code}:t:other`)).gradeReleasedAt, undefined);
  assert.equal((await storage.get(`a:${code}:t:other`)).submitted, false);
  await storage.put(`ab:${code}`, assignment);
});

it('release force-submits selected unfinished and empty attempts, preserves submitted timestamps, and rejects late answers', async () => {
  const partial = { ...attempt('partial'), submitted: false, submittedAt: null, answersByQ: { 0: { answer: 0 } } };
  const empty = { ...attempt('empty'), submitted: false, submittedAt: null, answersByQ: {} };
  await storage.put(`a:${code}:t:partial`, partial);
  await storage.put(`a:${code}:t:empty`, empty);
  const release = await call('/api/assignments/release-grades', { code, password: teacherPassword, attemptIds: ['partial', 'empty', 'selected'] });
  assert.equal(release.status, 200, JSON.stringify(release.body));
  assert.equal(release.body.submitted, 2);
  assert.equal(release.body.released, 3);
  assert.equal((await storage.get(`a:${code}:t:selected`)).submittedAt, 100);
  assert.equal((await storage.get(`a:${code}:t:other`)).submitted, false);
  newRoom();
  for (const [id, grade] of [['partial', 50], ['empty', 0]]) {
    const stored = await storage.get(`a:${code}:t:${id}`);
    assert.equal(stored.submitted, true);
    assert.ok(stored.submittedAt > 0);
    const state = await call(`/api/assignment/state?code=${code}&attemptId=${id}`);
    assert.equal(state.body.attempt.releasedGrade, grade);
    assert.equal(state.body.attempt.answersWithCorrectness, null);
    const status = await call('/api/assignment/check-status', { code, studentKey: `student_${id}` });
    assert.equal(status.body.hasOpenAttempt, false);
    assert.equal(status.body.previousAttempts[0].releasedGrade, grade);
    for (const qIndex of [0, 1]) {
      const late = await call('/api/assignment/answer', { code, attemptId: id, qIndex, answer: 1 });
      assert.equal(late.status, 409);
      assert.equal(late.body.error, 'Attempt already submitted.');
    }
    assert.deepEqual((await storage.get(`a:${code}:t:${id}`)).answersByQ, stored.answersByQ);
  }
  const timestamp = (await storage.get(`a:${code}:t:partial`)).submittedAt;
  const again = await call('/api/assignments/release-grades', { code, password: teacherPassword, attemptIds: ['partial'] });
  assert.equal(again.body.submitted, 0);
  assert.equal((await storage.get(`a:${code}:t:partial`)).submittedAt, timestamp);
});
it('release includes autosaved answers from an unfinished adaptive listening block', async () => {
  const section = { id: 's1', title: 'Listening', audio: { kind: 'file', url: 'https://example.com/audio.mp3' } };
  const questions = ['A1', 'A2'].flatMap(cefr => [1, 2].map(n => ({
    ...assignment.quiz.questions[0], id: `${cefr}-${n}`, prompt: `${cefr}-${n}`, cefr, listeningSection: 's1',
  })));
  const created = await call('/api/assignments/create', { password: teacherPassword, randomNames: true,
    feedbackMode: 'none', examMode: true, adaptive: true, adaptiveCount: 0,
    quiz: { title: 'Listening exam', listeningSections: [section], questions },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const adaptiveCode = created.body.assignment.code;
  const started = await call('/api/assignment/start', { code: adaptiveCode, studentKey: 'listener', studentName: 'Listener' });
  assert.equal(started.status, 201, JSON.stringify(started.body));
  const attemptId = started.body.attempt.id;
  const draft = await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 0, answer: 0 });
  assert.equal(draft.status, 200);
  const released = await call('/api/assignments/release-grades', { password: teacherPassword, code: adaptiveCode, attemptIds: [attemptId] });
  assert.equal(released.status, 200, JSON.stringify(released.body));
  assert.equal(released.body.submitted, 1);
  assert.equal(released.body.grades[0].releasedGrade, 50);
  const stored = await storage.get(`a:${adaptiveCode}:t:${attemptId}`);
  assert.equal(stored.submitted, true);
  assert.equal(stored.adaptive.block, null);
  assert.equal(stored.adaptive.items.length, 2);
  assert.ok(stored.sectionsSubmitted.s1);
  const late = await call('/api/assignment/answer', { code: adaptiveCode, attemptId, qIndex: 1, answer: 0 });
  assert.equal(late.status, 409);
});

// Small DOM harness: run the shipped renderers and click their handlers.
function dom() {
  const nodes = [];
  class El {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.style = {}; this.listeners = {}; this.classList = { add() {}, remove() {}, toggle() {} }; nodes.push(this); }
    append(...els) { for (const el of els) this.appendChild(el); }
    appendChild(el) { this.children.push(el); el.parent = this; return el; }
    setAttribute() {}
    addEventListener(name, fn) { this.listeners[name] = fn; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.removed = true; }
    set innerHTML(value) { this.html = value; for (const child of this.children) child.remove(); this.children = []; }
    get innerHTML() { return this.html || ''; }
  }
  const document = { createElement: tag => new El(tag), getElementById: id => nodes.findLast(n => n.id === id && !n.removed) || null };
  return { document, nodes, El };
}
const t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? ''));
const appSource = fs.readFileSync('app.js', 'utf8');
function teacherUi(attempts, api) {
  const d = dom();
  const sandbox = { document: d.document, t, api, createSessionPassword: teacherPassword,
    assignmentResultsFilterEl: null, assignmentResultsClassFilterEl: null, assignmentResultsSortEl: null, assignmentResultsBestOnlyEl: null,
    assignmentResultsSummaryEl: new d.El(), assignmentResultsListEl: new d.El(),
    notifySelection: { code, ids: new Set(attempts.map(a => a.id)) }, escapeHtml: String,
    setStatus: (el, text) => { el.textContent = text; },
  };
  const { renderAssignmentResults } = loadDeclarations(appSource, ['renderAssignmentResults'], sandbox);
  renderAssignmentResults(code, { assignment, attempts });
  const button = d.nodes.find(n => n.textContent === 'Release selected grades');
  return { ...d, button };
}
it('release button explains pending teacher marking', async () => {
  const ui = teacherUi([{ id: 'a', studentName: 'Alex', submitted: false, metrics: { pendingTeacherGradeCount: 1 } }], () => { throw new Error('Must not call API'); });
  await ui.button.listeners.click();
  assert.match(ui.document.getElementById('assignmentGradeReleaseStatus').textContent, /finish teacher marking for these attempts: Alex/);
});
it('release button accepts unfinished attempts and updates their submitted state', async () => {
  const a = { id: 'a', studentName: 'Alex', submitted: false };
  const ui = teacherUi([a], async () => ({ ok: true, released: 1, submitted: 1,
    grades: [{ attemptId: 'a', submitted: true, submittedAt: 456, updatedAt: 456, releasedGrade: 50, gradeReleasedAt: 456 }],
  }));
  await ui.button.listeners.click();
  assert.equal(a.submitted, true);
  assert.equal(a.submittedAt, 456);
  assert.match(ui.document.getElementById('assignmentGradeReleaseStatus').textContent, /submitted 1 unfinished attempts/);
  assert.ok(ui.nodes.some(n => n.innerHTML.includes('Grade released: 50\/100')));
});
it('release button displays server failures beside itself and re-enables retry', async () => {
  const ui = teacherUi([{ id: 'a', submitted: true }], async () => { throw new Error('Network unavailable'); });
  await ui.button.listeners.click();
  assert.match(ui.document.getElementById('assignmentGradeReleaseStatus').textContent, /Grades were not released: Network unavailable/);
  assert.equal(ui.button.disabled, false);
});
it('release button preserves visible confirmation and updates the grade badge', async () => {
  const ui = teacherUi([{ id: 'a', submitted: true }], async () => ({ ok: true, released: 1, grades: [{ attemptId: 'a', releasedGrade: 75, gradeReleasedAt: 123 }] }));
  await ui.button.listeners.click();
  assert.match(ui.document.getElementById('assignmentGradeReleaseStatus').textContent, /Released 1 grades/);
  assert.ok(ui.nodes.some(n => n.innerHTML.includes('Grade released: 75/100')));
});
it('student grade stays outside the hidden question area, includes zero, and clears on a new attempt', () => {
  const ui = dom();
  const live = { player: { mode: 'assignment', assignment: { state: { attempt: { submitted: true, gradeReleasedAt: 123, releasedGrade: 0 } } } } };
  const joinCardEl = new ui.El(), joinQuestionWrap = new ui.El();
  const { renderReleasedAssignmentGrade } = loadDeclarations(fs.readFileSync('play.js', 'utf8'), ['renderReleasedAssignmentGrade'], { document: ui.document, live, joinCardEl, joinQuestionWrap, t });
  renderReleasedAssignmentGrade();
  assert.equal(joinCardEl.children[0].textContent, 'Your grade: 0/100');
  assert.equal(joinQuestionWrap.children.length, 0);
  live.player.assignment.state = null;
  renderReleasedAssignmentGrade();
  assert.equal(joinCardEl.children.length, 0);
});
it('reopening the assignment shows the released grade in the completed-attempt choice', () => {
  const ui = dom();
  ui.document.body = new ui.El();
  const { showReviewRetakeChoice } = loadDeclarations(fs.readFileSync('play.js', 'utf8'), ['showReviewRetakeChoice'], {
    document: ui.document, t, dismissReviewRetakeModal() {},
  });
  showReviewRetakeChoice({ examMode: true, attemptsLimit: 1, attemptsUsed: 1, feedbackMode: 'none',
    previousAttempts: [{ id: 'released', attemptNumber: 1, gradeReleasedAt: 123, releasedGrade: 50 }, { id: 'unreleased', attemptNumber: 2, totalScore: 2000 }],
  }, code, 'student_selected', 'Selected');
  const scores = ui.nodes.filter(n => n.className === 'rr-attempt-score');
  assert.equal(scores[0].textContent, 'Grade: 50/100');
  assert.equal(scores[1].textContent, 'Grade not released');
});

let reviewNumber = 0;
async function reviewFixture({ released = true, feedbackMode = 'none', submitted = true } = {}) {
  const reviewCode = `REVIEW${++reviewNumber}`;
  await storage.put(`ab:${reviewCode}`, { ...clone(assignment), code: reviewCode, feedbackMode,
    quiz: { ...clone(assignment.quiz), questions: [...clone(assignment.quiz.questions),
      { ...clone(assignment.quiz.questions[0]), id: 'poll', prompt: 'Poll', isPoll: true },
    ] },
  });
  await storage.put(`a:${reviewCode}:t:reviewer`, { ...attempt('reviewer'), submitted,
    submittedAt: submitted ? 100 : null, notifiedAt: 50,
    answersByQ: { 0: { answer: 0 }, 1: { answer: 1 }, 2: { answer: 0 } },
  });
  if (released) assert.equal((await call('/api/assignments/release-grades', {
    code: reviewCode, password: teacherPassword, attemptIds: ['reviewer'],
  })).status, 200);
  return { code: reviewCode, password: teacherPassword, attemptId: 'reviewer' };
}
it('auto-grades are reviewable and manual changes update a released exam across restart without revealing answers', async () => {
  const input = await reviewFixture();
  const overview = await call('/api/assignments/grading-overview', input);
  assert.equal(overview.body.questions[0].teacherGraded, false);
  assert.equal(overview.body.questions[0].gradedCount, 1);
  assert.equal(overview.body.questions[1].pendingCount, 0);
  assert.equal(overview.body.questions[2].isPoll, true);
  const question = await call('/api/assignments/question-grading', { ...input, qIndex: 0 });
  assert.equal(question.body.items[0].grade.pointsAwarded, 1000);
  assert.equal(question.body.question.correctAnswer, '1. Yes');
  const before = await call('/api/assignments/attempt', input);
  assert.equal(before.body.gradingItems[1].grade.pointsAwarded, 0);
  const releasedAt = before.body.attempt.gradeReleasedAt;
  const denied = await call('/api/assignments/grade', { ...input, password: 'wrong', qIndex: 1, points: 500 });
  assert.equal(denied.status, 401);
  const changed = await call('/api/assignments/grade', { ...input, qIndex: 1, points: 500, correction: 'Accept this alternative.' });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.equal(changed.body.attempt.metrics.totalScore, 1500);
  assert.equal(changed.body.attempt.metrics.pendingTeacherGradeCount, 0);
  assert.equal(changed.body.attempt.releasedGrade, 75);
  assert.equal(changed.body.attempt.gradeReleasedAt, releasedAt);
  newRoom();
  const reviewed = await call('/api/assignments/question-grading', { ...input, qIndex: 1 });
  assert.equal(reviewed.body.items[0].grade.pointsAwarded, 500);
  assert.equal(reviewed.body.items[0].grade.correction, 'Accept this alternative.');
  const state = await call(`/api/assignment/state?code=${input.code}&attemptId=reviewer`);
  assert.equal(state.body.attempt.releasedGrade, 75);
  assert.equal(state.body.attempt.answersWithCorrectness, null);
  assert.ok(state.body.attempt.assignment.quiz.questions.every(q => !q.answers?.some(a => a.correct)));
  const status = await call('/api/assignment/check-status', { code: input.code, studentKey: 'student_reviewer' });
  assert.equal(status.body.previousAttempts[0].releasedGrade, 75);
  assert.equal(status.body.previousAttempts[0].hasNewTeacherActivity, true);
  const stored = await storage.get(`a:${input.code}:t:reviewer`);
  assert.equal(stored.notifiedAt, 0);
  assert.equal(stored.submittedAt, 100);
  const updated = await call('/api/assignments/grade', { ...input, qIndex: 0, points: 0 });
  assert.equal(updated.body.attempt.releasedGrade, 25);
  const results = await call('/api/assignments/results', input);
  assert.equal(results.body.attempts[0].releasedGrade, 25);
  assert.equal((await call('/api/assignments/grade', { ...input, qIndex: 2, points: 1000 })).status, 409);
});
it('unreleased grades stay unreleased, and changing an answer clears its old override', async () => {
  const input = await reviewFixture({ released: false, submitted: false, feedbackMode: 'end' });
  const graded = await call('/api/assignments/grade', { ...input, qIndex: 1, points: 1000 });
  assert.equal(graded.body.attempt.metrics.totalScore, 2000);
  assert.equal(graded.body.attempt.releasedGrade, null);
  const answered = await call('/api/assignment/answer', { code: input.code, attemptId: input.attemptId, qIndex: 1, answer: 1 });
  assert.equal(answered.status, 200, JSON.stringify(answered.body));
  assert.equal(answered.body.attempt.metrics.totalScore, 1000);
  assert.equal((await storage.get(`a:${input.code}:t:reviewer`)).answersByQ[1].teacherGrade, null);
  const released = await call('/api/assignments/release-grades', { ...input, attemptIds: ['reviewer'] });
  assert.equal(released.body.grades[0].releasedGrade, 50);
});
it('student answer review uses the teacher override when feedback is visible', async () => {
  const input = await reviewFixture({ feedbackMode: 'end' });
  await call('/api/assignments/grade', { ...input, qIndex: 1, points: 500, correction: 'Partial credit.' });
  const state = await call(`/api/assignment/state?code=${input.code}&attemptId=reviewer`);
  const answer = state.body.attempt.answersWithCorrectness.find(a => a.qIndex === 1);
  assert.equal(answer.points, 500);
  assert.equal(answer.correct, true);
  assert.equal(answer.teacherGrade.correction, 'Partial credit.');
});
it('an adaptive repeat can be regraded independently without moving the saved level again', async () => {
  const input = await reviewFixture({ released: false });
  const stored = await storage.get(`a:${input.code}:t:reviewer`);
  stored.adaptive = { bands: ['A1', 'A2'], score: 1, answered: 2, count: 2, done: true, current: null, path: [],
    items: [{ qi: 0, answer: 1, band: 0, qBand: 0 }, { qi: 0, answer: 0, band: 0, qBand: 0 }],
  };
  await storage.put(`a:${input.code}:t:reviewer`, stored);
  const question = await call('/api/assignments/question-grading', { ...input, qIndex: 0 });
  assert.equal(question.body.items.length, 2);
  assert.deepEqual(question.body.items.map(item => item.servedIndex), [0, 1]);
  assert.equal((await call('/api/assignments/grade', { ...input, qIndex: 0, points: 500 })).status, 409);
  const graded = await call('/api/assignments/grade', { ...input, qIndex: 0, servedIndex: 0, points: 500 });
  assert.equal(graded.status, 200, JSON.stringify(graded.body));
  assert.equal(graded.body.attempt.metrics.totalScore, 1500);
  const updated = await storage.get(`a:${input.code}:t:reviewer`);
  assert.equal(updated.adaptive.score, 1);
  assert.equal(updated.adaptive.answered, 2);
  assert.equal(updated.adaptive.items[1].teacherGrade, undefined);
});
