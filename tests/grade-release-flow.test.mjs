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
it('unfinished and pending attempts reject the selection without releasing other students', async () => {
  const pending = { ...attempt('pending'), answersByQ: { 0: { answer: 'essay' } } };
  const pendingAssignment = structuredClone(assignment);
  pendingAssignment.quiz.questions[0] = { type: 'open', prompt: 'Essay', points: 1000 };
  await storage.put(`ab:${code}`, pendingAssignment);
  await storage.put(`a:${code}:t:pending`, pending);
  const r = await call('/api/assignments/release-grades', { code, password: teacherPassword, attemptIds: ['other', 'pending'] });
  assert.equal(r.status, 409);
  assert.equal((await storage.get(`a:${code}:t:other`)).gradeReleasedAt, undefined);
  await storage.put(`ab:${code}`, assignment);
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
it('release button shows a visible explanation for unsubmitted attempts', async () => {
  const ui = teacherUi([{ id: 'a', studentName: 'Alex', submitted: false }], () => { throw new Error('Must not call API'); });
  await ui.button.listeners.click();
  assert.match(ui.document.getElementById('assignmentGradeReleaseStatus').textContent, /must be submitted and fully graded: Alex/);
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
