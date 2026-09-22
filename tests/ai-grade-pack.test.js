const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Runs the REAL pack-builder and importer functions out of app.js. They are
// pure (no DOM), so we lift just those declarations into a sandbox.
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const NEEDED = [
  'aiGradePackEntryFromItem',
  'aiGradePackBuildData',
  'aiGradeImportBucketRow',
  'aiGradeImportDedupe',
  'aiGradeImportIsTextDiffType',
  'aiGradeImportComposeNote',
  'aiGradeImportResolveCorrection',
  'CORRECTION_DIFF_PREFIX',
  'CORRECTION_NOTE_PREFIX',
  'joinCorrectionNote',
  'splitCorrectionNote',
  'computeWordDiff',
];

let A;
before(() => {
  // `t()` is the app's i18n helper; in tests the English source is the answer.
  A = loadDeclarations(APP_SRC, NEEDED, { t: (k) => k });
});

const item = (over = {}) => ({
  teacherGraded: true,
  qIndex: 2,
  qId: 'q_abc',
  qType: 'open',
  maxPoints: 1000,
  prompt: 'What did you do last weekend?',
  attemptId: 'at_1',
  studentName: 'Nel Oru',
  answerText: 'I go to beach.',
  answer: {},
  grade: null,
  submitted: true,
  submittedAt: 1700000000000,
  ...over,
});

describe('pack: unfinished vs submitted attempts', () => {
  it('keeps the attempt-level submitted flag on each entry', () => {
    assert.equal(A.aiGradePackEntryFromItem(item()).submitted, true);
    assert.equal(A.aiGradePackEntryFromItem(item({ submitted: false, submittedAt: null })).submitted, false);
  });

  it('writes status on the attempt, not a timestamp on every answer', () => {
    const entries = [
      A.aiGradePackEntryFromItem(item()),
      A.aiGradePackEntryFromItem(item({ attemptId: 'at_2', studentName: 'Marta', submitted: false, submittedAt: null })),
    ];
    const data = A.aiGradePackBuildData({ entries, meta: { code: 'ABC123' }, scope: 'assignment' });
    const [done, draft] = data.attempts;
    assert.equal(done.status, 'submitted');
    assert.equal(done.submittedAt, 1700000000000);
    assert.equal(draft.status, 'in_progress');
    assert.equal(draft.submittedAt, null);
    // The old per-answer field was attempt-level data in disguise; it is gone.
    assert.equal('submittedAt' in done.answers[0], false);
  });

  it('emits null for a question with no id, matching what the prompt promises', () => {
    const entries = [A.aiGradePackEntryFromItem(item({ qId: '' }))];
    const data = A.aiGradePackBuildData({ entries, meta: { code: 'ABC123' }, scope: 'question' });
    assert.equal(data.questions[0].id, null);
    assert.equal(data.attempts[0].answers[0].qId, null);
  });
});

const ctx = (over = {}) => ({
  questionMap: new Map([[2, { qIndex: 2, qId: 'q_abc', qType: 'open', maxPoints: 1000, teacherGraded: true, prompt: 'p' }]]),
  currentGrades: new Map([['at_1::2', { graded: false, pointsAwarded: 0, correction: '' }]]),
  studentNames: new Map([['at_1', 'Nel Oru']]),
  answerData: new Map([['at_1::2', { qType: 'open', answerText: 'I go to beach.' }]]),
  attemptSubmitted: new Map([['at_1', true]]),
  ...over,
});

const result = (over = {}) => ({
  attemptId: 'at_1', qIndex: 2, qId: 'q_abc', points: 1000, verdict: 'correct', confidence: 0.9,
  correction: '', correctedText: '', rationale: '', flags: [], ...over,
});

describe('importer: bucketing', () => {
  it('applies a clean row for a submitted attempt', () => {
    const row = A.aiGradeImportBucketRow(result(), ctx());
    assert.equal(row.bucket, 'apply');
  });

  it('parks rows for in-progress attempts even when the model graded them', () => {
    const row = A.aiGradeImportBucketRow(result(), ctx({ attemptSubmitted: new Map([['at_1', false]]) }));
    assert.equal(row.bucket, 'skip');
    assert.equal(row.skipReason, 'in_progress');
  });

  it('parks needs_review rows with their own reason', () => {
    const row = A.aiGradeImportBucketRow(result({ verdict: 'needs_review', points: 0 }), ctx());
    assert.equal(row.bucket, 'skip');
    assert.equal(row.skipReason, 'needs_review');
  });

  it('accepts qId: null and rejects a contradicting qId', () => {
    assert.equal(A.aiGradeImportBucketRow(result({ qId: null }), ctx()).bucket, 'apply');
    const bad = A.aiGradeImportBucketRow(result({ qId: 'q_other' }), ctx());
    assert.equal(bad.bucket, 'rejected');
    assert.match(bad.rejectionReason, /qId mismatch/);
  });

  it('rejects, rather than clamps, out-of-range points and unknown verdicts', () => {
    assert.equal(A.aiGradeImportBucketRow(result({ points: 1500 }), ctx()).bucket, 'rejected');
    assert.equal(A.aiGradeImportBucketRow(result({ points: -1 }), ctx()).bucket, 'rejected');
    assert.equal(A.aiGradeImportBucketRow(result({ verdict: 'meh' }), ctx()).bucket, 'rejected');
  });

  it('rejects a pair that is not in the pack', () => {
    const row = A.aiGradeImportBucketRow(result({ attemptId: 'at_ghost' }), ctx());
    assert.equal(row.bucket, 'rejected');
    assert.match(row.rejectionReason, /attempt not found/);
  });

  it('keeps the highest-confidence duplicate', () => {
    const rows = A.aiGradeImportDedupe([
      { attemptId: 'at_1', qIndex: 2, confidence: 0.4, points: 500 },
      { attemptId: 'at_1', qIndex: 2, confidence: 0.9, points: 1000 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].points, 1000);
  });
});

describe('corrections vs sample answers', () => {
  const openRow = (over = {}) => ({
    qType: 'open',
    answer: { answerText: 'I go to beach.' },
    correction: '',
    correctedText: '',
    sampleAnswer: '',
    comment: '',
    ...over,
  });

  it('puts a real correction in the diff body, where the student reads it as their own words', () => {
    const stored = A.aiGradeImportResolveCorrection(openRow({ correctedText: 'I went to the beach.' }));
    const { body, note } = A.splitCorrectionNote(stored);
    assert.ok(body.startsWith(A.CORRECTION_DIFF_PREFIX));
    assert.equal(note, '');
  });

  it('keeps a sample answer out of the diff and in the note channel', () => {
    const stored = A.aiGradeImportResolveCorrection(openRow({
      answer: { answerText: '' },
      sampleAnswer: 'Last weekend I visited my grandmother.',
    }));
    const { body, note } = A.splitCorrectionNote(stored);
    // Nothing of the student's to correct, so no diff is fabricated.
    assert.equal(body, '');
    assert.match(note, /Example answer:/);
    assert.match(note, /visited my grandmother/);
  });

  it('carries a correction and an example at once, comment first', () => {
    const stored = A.aiGradeImportResolveCorrection(openRow({
      correctedText: 'I went to the beach.',
      sampleAnswer: 'I went to the beach with my family and we swam.',
      comment: 'Watch your past tenses.',
    }));
    const { body, note } = A.splitCorrectionNote(stored);
    assert.ok(body.startsWith(A.CORRECTION_DIFF_PREFIX));
    assert.ok(note.indexOf('Watch your past tenses.') < note.indexOf('Example answer:'));
  });

  it('composes an empty note when there is neither comment nor example', () => {
    assert.equal(A.aiGradeImportComposeNote('', ''), '');
    assert.equal(A.aiGradeImportComposeNote('  ', '  '), '');
  });

  it('reads sampleAnswer off the model response into the row', () => {
    const row = A.aiGradeImportBucketRow(result({ sampleAnswer: 'A model answer.' }), ctx());
    assert.equal(row.sampleAnswer, 'A model answer.');
  });

  it('defaults sampleAnswer to empty when the model omits it', () => {
    assert.equal(A.aiGradeImportBucketRow(result(), ctx()).sampleAnswer, '');
  });
});
