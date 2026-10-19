const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadDeclarations } = require('./helpers/extract-declaration');
const source = fs.readFileSync('app.js', 'utf8');
function app() {
  const nodes = Object.fromEntries(['assignmentAdaptive', 'assignmentAdaptiveMode', 'assignmentAdaptiveCount', 'assignmentAdaptiveWrap'].map(id => [id, { value: '8', checked: true, dataset: {}, classList: { contains: () => false } }]));
  const el = value => ({ value });
  const requests = [];
  let options;
  const sandbox = {
    quiz: { title: 'Tenses', questions: [{ type: 'tf' }] }, createSessionPassword: 'teacher',
    document: { getElementById: id => nodes[id] || null },
    window: { PinAssignmentSetup: { open: value => { options = value; } }, dispatchEvent() {} },
    CustomEvent: class {},
    assignmentClassEl: el('4B'), assignmentDueAtEl: el(''), assignmentAttemptsEl: el('0'), assignmentSignInEl: el('random'),
    assignmentFeedbackMode: 'instant', assignmentExamMode: false, assignmentStatusEl: {}, hostStatusEl: {},
    studentsCache: [{ className: '4B' }], assignmentsListCache: [{ className: '4A' }],
    syncQuizFromUI() {}, requireQuizTitle() {}, syncAssignmentAdaptiveControl() {},
    assignmentAdaptiveSettings: () => ({ adaptive: nodes.assignmentAdaptive.checked, buildup: nodes.assignmentAdaptiveMode.value === 'buildup', adaptiveCount: Number(nodes.assignmentAdaptiveCount.value) }),
    assignmentRandomNames: () => sandbox.assignmentSignInEl.value !== 'signin',
    buildupAvailableLevels: () => ['A1', 'B1'], adaptiveSingleQuestionCount: () => 20, quizHasListeningSections: () => false,
    buildupDefaultCount: () => 20, loadAssignmentClassSuggestions: async () => {},
    setAssignmentFeedbackMode: value => { sandbox.assignmentFeedbackMode = value; },
    setAssignmentExamMode: value => { sandbox.assignmentExamMode = value; }, syncSignInRulesLine() {},
    ensureQuizMediaReady: async () => {}, normalizeQuizForLive: value => value,
    api: async (route, opts) => { requests.push({ route, ...opts }); return { assignment: { code: 'NEW123' } }; },
    buildAssignmentJoinLink: code => `https://example.com/?assignment=${code}`, refreshAssignmentsList: async () => {},
    setStatus: (el, text) => { el.textContent = text; }, t: (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? '')),
  };
  const functions = loadDeclarations(source, ['openAssignmentCreationDialog', 'createAssignmentFromCurrentQuiz'], sandbox);
  return { ...functions, sandbox, requests, get options() { return options; } };
}
it('opening setup reads current settings without creating or changing the assignment', async () => {
  const a = app();
  await a.openAssignmentCreationDialog();
  assert.equal(a.requests.length, 0);
  assert.equal(a.options.initial.className, '4B');
  assert.equal(a.options.initial.feedbackMode, 'instant');
  assert.equal(a.options.initial.signIn, 'random');
  assert.equal(a.sandbox.assignmentAttemptsEl.value, '0');
  assert.deepEqual(Array.from(a.options.classes), ['4A', '4B']);
});
it('confirmed dialog settings reach the existing creation API', async () => {
  const a = app();
  await a.openAssignmentCreationDialog();
  const result = await a.options.onCreate({ className: '4C', dueAt: '2026-12-20T17:00', attemptsLimit: 1,
    signIn: 'signin', feedbackMode: 'none', examMode: true, format: 'all', adaptiveCount: 8 });
  assert.equal(result.code, 'NEW123');
  assert.equal(a.requests.length, 1);
  const request = a.requests[0];
  assert.equal(request.route, '/api/assignments/create');
  assert.equal(request.body.className, '4C');
  assert.equal(request.body.attemptsLimit, 1);
  assert.equal(request.body.randomNames, false);
  assert.equal(request.body.feedbackMode, 'none');
  assert.equal(request.body.examMode, true);
  assert.equal(request.body.adaptive, false);
  assert.equal(request.body.dueAt, new Date('2026-12-20T17:00').getTime());
});
it('creation failures propagate to the setup dialog for retry', async () => {
  const a = app();
  a.sandbox.ensureQuizMediaReady = async () => { throw new Error('Audio could not be prepared'); };
  await a.openAssignmentCreationDialog();
  await assert.rejects(a.options.onCreate({ ...a.options.initial, format: 'all' }), /Audio could not be prepared/);
  assert.equal(a.requests.length, 0);
});
