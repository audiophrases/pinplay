const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Runs the REAL pack-builder and importer functions out of app.js. They are
// pure (no DOM), so we lift just those declarations into a sandbox.
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// The prompt is one long template, too long a literal for the extractor.
const PROMPT = APP_SRC.slice(APP_SRC.indexOf('const AI_GRADE_PROMPT_TEMPLATE'), APP_SRC.indexOf('function aiGradePackResolveMediaUrl'));

const NEEDED = [
  'AI_GRADE_PACK_MAX_AUDIO_MS',
  'AI_GRADE_PACK_MAX_ANSWERS',
  'aiGradePackEntryFromItem',
  'aiGradePackIsToGrade',
  'assignmentAttemptToGrade',
  'assignmentToGradeTotals',
  'aiGradePackNextBatch',
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

describe('pack: what the prompt tells the AI', () => {
  it('no longer tells it to hold back answers from unfinished attempts', () => {
    assert.match(PROMPT, /Grade both the same\s+way/);
    assert.doesNotMatch(PROMPT, /draft/i);
    const reviewRules = PROMPT.slice(PROMPT.indexOf('## When to use'), PROMPT.indexOf('## Feedback style'));
    assert.doesNotMatch(reviewRules, /in_progress/);
  });

  it('asks for packBuiltAt back and explains listening sections', () => {
    assert.match(PROMPT, /"packBuiltAt": <copy from data\.json>/);
    assert.match(PROMPT, /listeningSections\[\]/);
  });
});

describe('pack: which answers count', () => {
  it('takes ungraded answers from attempts that count, and nothing else', () => {
    assert.equal(A.aiGradePackIsToGrade({ grade: null }), true);
    assert.equal(A.aiGradePackIsToGrade({ grade: { graded: false } }), true);
    assert.equal(A.aiGradePackIsToGrade({ grade: { graded: true } }), false);
    assert.equal(A.aiGradePackIsToGrade({ grade: null, setAside: true }), false);
  });

  it('adds attempts up the same way the card counts them', () => {
    const pending = (n, over = {}) => ({ metrics: { pendingTeacherGradeCount: n }, ...over });
    const totals = A.assignmentToGradeTotals([pending(2), pending(0), pending(3), pending(4, { setAside: true })]);
    assert.equal(totals.answers, 5);
    assert.equal(totals.attempts, 2);
  });
});

describe('pack: one chat at a time', () => {
  const answer = (attemptId, minutes, over = {}) => ({ attemptId, answerDurationMs: minutes * 60000, submitted: true, submittedAt: 1, ...over });

  it('keeps everything when it fits', () => {
    const entries = [answer('a', 5), answer('b', 5)];
    assert.deepEqual(Array.from(A.aiGradePackNextBatch(entries), (e) => e.attemptId), ['a', 'b']);
  });

  it('stops at the recordings limit and never splits a student', () => {
    const entries = [answer('a', 8), answer('a', 8), answer('b', 3), answer('b', 3)];
    assert.deepEqual(Array.from(A.aiGradePackNextBatch(entries), (e) => e.attemptId), ['a', 'a']);
  });

  it('stops at the answers limit for packs without recordings', () => {
    const entries = Array.from({ length: A.AI_GRADE_PACK_MAX_ANSWERS + 5 }, (_, i) => answer(`at${i}`, 0));
    assert.equal(A.aiGradePackNextBatch(entries).length, A.AI_GRADE_PACK_MAX_ANSWERS);
  });

  it('still sends a student too big for one pack, rather than sending nothing', () => {
    const entries = [answer('a', 15), answer('a', 15), answer('b', 1)];
    assert.deepEqual(Array.from(A.aiGradePackNextBatch(entries), (e) => e.attemptId), ['a', 'a']);
  });

  it('puts finished work first, oldest first', () => {
    const entries = [
      answer('open', 8, { submitted: false, submittedAt: null }),
      answer('late', 8, { submittedAt: 20 }),
      answer('early', 8, { submittedAt: 10 }),
    ];
    assert.deepEqual(Array.from(A.aiGradePackNextBatch(entries), (e) => e.attemptId), ['early', 'late']);
  });
});

describe('pack: reading and listening', () => {
  const entry = (over) => A.aiGradePackEntryFromItem(item({ answerSavedAt: 500, ...over }));
  const sections = [
    { id: 'ls_a', title: 'Station', instruction: 'Listen.', script: 'The train leaves at nine.' },
    { id: 'ls_other', title: 'Unused', instruction: '', script: 'Not in this pack.' },
  ];

  it('sends each section once, as words, and only the ones in the pack', () => {
    const data = A.aiGradePackBuildData({
      entries: [entry({ qIndex: 2, listeningSection: 'ls_a' }), entry({ qIndex: 3, listeningSection: 'ls_a', qId: 'q2' })],
      meta: { code: 'ABC123', listeningSections: sections },
      scope: 'pending',
    });
    assert.deepEqual(data.listeningSections.map((s) => s.id), ['ls_a']);
    assert.equal(data.questions[0].listeningSection, 'ls_a');
    assert.equal(data.questions[1].media.audio, null);
  });

  it('leaves the field out of a pack with no listening', () => {
    const data = A.aiGradePackBuildData({ entries: [entry()], meta: { code: 'ABC123' }, scope: 'pending' });
    assert.equal('listeningSections' in data, false);
  });

  it('carries the reading passage with its question', () => {
    const data = A.aiGradePackBuildData({ entries: [entry({ readingText: 'Once upon a time.' })], meta: { code: 'ABC123' }, scope: 'pending' });
    assert.equal(data.questions[0].readingText, 'Once upon a time.');
  });

  it('stamps the pack with its newest answer, by the server clock', () => {
    const data = A.aiGradePackBuildData({
      entries: [entry({ answerSavedAt: 500 }), entry({ attemptId: 'at_2', answerSavedAt: 700 })],
      meta: { code: 'ABC123' },
      scope: 'pending',
    });
    assert.equal(data.packBuiltAt, 700);
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

  it('applies rows for unfinished attempts like any other, tagged so the teacher can see', () => {
    const row = A.aiGradeImportBucketRow(result(), ctx({ attemptSubmitted: new Map([['at_1', false]]) }));
    assert.equal(row.bucket, 'apply');
    assert.equal(row.unfinished, true);
    assert.equal(A.aiGradeImportBucketRow(result(), ctx()).unfinished, false);
  });

  it('parks an answer the student changed after the pack was built', () => {
    const changed = { answerData: new Map([['at_1::2', { qType: 'open', answerText: 'New words.', savedAt: 501 }]]), packBuiltAt: 500 };
    const row = A.aiGradeImportBucketRow(result(), ctx(changed));
    assert.equal(row.bucket, 'skip');
    assert.equal(row.skipReason, 'changed');
  });

  it('keeps an answer saved up to the moment the pack was built', () => {
    const same = { answerData: new Map([['at_1::2', { qType: 'open', answerText: 'I go.', savedAt: 500 }]]), packBuiltAt: 500 };
    assert.equal(A.aiGradeImportBucketRow(result(), ctx(same)).bucket, 'apply');
  });

  it('does not mistake a teacher grade for a student change: that is an overwrite', () => {
    const graded = {
      answerData: new Map([['at_1::2', { qType: 'open', answerText: 'I go.', savedAt: 900 }]]),
      currentGrades: new Map([['at_1::2', { graded: true, pointsAwarded: 500, correction: '' }]]),
      packBuiltAt: 500,
    };
    const row = A.aiGradeImportBucketRow(result(), ctx(graded));
    assert.equal(row.bucket, 'apply');
    assert.equal(row.isOverwrite, true);
  });

  it('skips the check for a response without packBuiltAt', () => {
    const old = { answerData: new Map([['at_1::2', { qType: 'open', answerText: 'I go.', savedAt: 900 }]]) };
    assert.equal(A.aiGradeImportBucketRow(result(), ctx(old)).bucket, 'apply');
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
