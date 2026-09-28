const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Public games (/play): anonymous plays live in a signed play token, graded on
// the server with nothing stored. These run the real worker functions.
// See PUBLIC_GAMES_PLAN.md.
const NAMES = [
  'publicGameCard', 'signPublicPlay', 'verifyPublicPlay', 'publicPlayAttempt', 'newPublicPlayAttempt', 'applyPublicPlayAnswer',
  'publicPlayResponse', 'publicGameAssignment', 'isPublicGame', 'publicQuizVersion', 'publicPlaySecret', 'PUBLIC_PLAY_TTL_MS',
  'PUBLIC_PLAY_TOKEN_MAX', 'assignmentAdaptiveCount', 'assignmentAdaptivePool', 'adaptivePool', 'CEFR_LEVELS', 'normalizeCefrLevel',
  'isAssignmentTeacherGradedQuestion', 'isTeacherGradedTextQuestion', 'sanitizeAssignmentCode', 'randomId', 'pickRandomName',
  'RANDOM_NAME_ADJECTIVES', 'RANDOM_NAME_PEOPLE', 'FEMALE_NAME_HINTS', 'adaptiveAttemptInit', 'adaptiveInit', 'ADAPTIVE_START',
  'adaptiveNext', 'adaptiveBand', 'clamp', 'sanitizeBet', 'sanitizeAssignmentAnswer', 'adaptiveRecord', 'adaptiveRecordPending',
  'adaptiveOutcome', 'evaluate', 'adaptivePathOk', 'ADAPTIVE_PATH_MAX', 'adaptiveTally', 'adaptiveStepScale', 'ADAPTIVE_STEP_SETTLED',
  'ADAPTIVE_STEP_NEW', 'ADAPTIVE_SETTLE_HALF', 'ADAPTIVE_UP', 'adaptiveAttemptAdvance', 'adaptiveRebase', 'evaluateAssignmentAttempt',
  'adaptiveAttemptView', 'verdictScoreFraction', 'applyBetScore', 'round', 'studentSessionSecret', 'sha256Hex', 'b64urlEncodeBytes',
  'b64urlDecodeBytes', 'constantTimeEqual', 'hmacSignBytes', 'publicAssignmentAttempt', 'hostCorrectSummary',
  'sanitizeAssignmentAttemptId', 'sanitizeAssignmentStudentKey', 'normalizeStudentKeyInput', 'sanitizeName', 'sanitizeEmail',
  'sanitizeClassName', 'publicAssignment', 'normalizeQuiz', 'normalizeTimeLimitValue', 'minTimeByType', 'normalizeQuestionMedia',
  'detectQuestionMediaProvider', 'publicQuestion', 'publicQuestionMediaPayload', 'publicAudioPayload', 'normalizeTextAnswer',
  'gradeContextGap', 'contextGapExpectedOptions', 'parseAcceptedGapOptions', 'dedupeAcceptedForDisplay', 'stripDiacritics',
  'stableShuffle', 'tokenizeWords', 'tokenEditDistance', 'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'normalizeWordle',
];

let W;
const env = { STUDENT_SESSION_KEY: 'test-student-key' };
before(() => {
  W = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8'), NAMES, {
    crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, btoa, atob,
  });
});

const tf = (id, cefr, correct = 0) => ({
  id, type: 'tf', cefr, prompt: `${id} statement`, points: 1000, timeLimit: 0,
  answers: [{ text: 'True', correct: correct === 0 }, { text: 'False', correct: correct === 1 }],
});
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const adaptiveGame = () => ({
  code: 'ADAPT1', title: 'Adaptive', public: true, adaptive: { count: 6 },
  quiz: { questions: LEVELS.flatMap((lv) => [0, 1, 2].map((i) => tf(`${lv}-${i}`, lv))) },
});
const plainGame = () => ({
  code: 'PLAIN1', title: 'Verbs', public: true, randomNames: false, examMode: true, feedbackMode: 'none', attemptsLimit: 1, dueAt: 1,
  quiz: {
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'yo (hablar)', points: 1000, answers: [{ text: 'hablo', correct: true }, { text: 'hablas', correct: false }] },
      { id: 'q2', type: 'text', prompt: 'nosotros (vivir)', points: 1000, accepted: ['vivimos'], imageData: 'https://example.com/a.jpg' },
      { id: 'q3', type: 'open', prompt: 'Describe your day', points: 1000 },
    ],
  },
});
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const claimOf = (token) => JSON.parse(Buffer.from(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
// Checked on the data as sent: JSON drops fields that are undefined.
const hasAnswerKey = (q) => { const w = JSON.parse(JSON.stringify(q)); return (w.answers || []).some((a) => 'correct' in a) || 'accepted' in w; };

describe('play token', () => {
  it('round-trips the attempt', async () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 0, 0), null);
    const { token } = await W.publicPlayResponse(env, game, attempt);
    const back = W.publicPlayAttempt(await W.verifyPublicPlay(env, token));
    assert.equal(back.studentName, attempt.studentName);
    assert.deepEqual(JSON.parse(JSON.stringify(back.answersByQ)), JSON.parse(JSON.stringify(attempt.answersByQ)));
    assert.equal(back.guest, true);
  });

  it('refuses an edited, re-signed-with-another-key, expired or oversized token', async () => {
    const game = plainGame();
    const { token } = await W.publicPlayResponse(env, game, W.newPublicPlayAttempt(game));
    const [, sig] = token.split('.');
    const claim = claimOf(token);
    assert.equal(await W.verifyPublicPlay(env, `${b64({ ...claim, a: { 0: { answer: 0 } } })}.${sig}`), null);
    assert.equal(await W.verifyPublicPlay({ STUDENT_SESSION_KEY: 'other' }, token), null);
    assert.equal(await W.verifyPublicPlay(env, token, Date.now() + W.PUBLIC_PLAY_TTL_MS + 1000), null);
    assert.equal(await W.verifyPublicPlay(env, `${token}${'x'.repeat(W.PUBLIC_PLAY_TOKEN_MAX)}`), null);
    assert.equal(await W.verifyPublicPlay({}, token), null);
  });

  it('is signed with its own key, not the student-session key', async () => {
    assert.notEqual(W.publicPlaySecret(env), W.studentSessionSecret(env));
  });

  it('carries a quiz version that changes when the questions do', async () => {
    const game = plainGame();
    const before = await W.publicQuizVersion(game);
    game.quiz.questions[0].prompt = 'changed';
    assert.notEqual(await W.publicQuizVersion(game), before);
  });
});

describe('anonymous play', () => {
  it('ignores the assignment\'s own strict settings', () => {
    const view = W.publicGameAssignment(plainGame());
    assert.deepEqual(
      [view.feedbackMode, view.examMode, view.attemptsLimit, view.dueAt, view.randomNames, view.active],
      ['instant', false, 0, null, true, true],
    );
  });

  it('grades each answer, once, and scores teacher-graded ones as pending', async () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 0, 0), null);
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 1, 0).code, 'ALREADY_ANSWERED');
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 1, 'vivo', 0), null);
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 2, 'I got up early.', 0), null);
    const { attempt: view } = await W.publicPlayResponse(env, game, attempt);
    const byQ = Object.fromEntries(view.answersWithCorrectness.map((a) => [a.qIndex, a]));
    assert.equal(byQ[0].correct, true);
    assert.equal(byQ[1].correct, false);
    assert.equal(byQ[1].correctAnswer, 'vivimos');
    assert.equal(byQ[2], undefined);
    assert.equal(view.metrics.autoScore, 1000);
    assert.equal(view.metrics.pendingTeacherGradeCount, 1);
  });

  it('never sends the answer key, only the answers to questions already answered', async () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    W.applyPublicPlayAnswer(game, attempt, 0, 1, 0);
    const { attempt: view } = await W.publicPlayResponse(env, game, attempt);
    assert.ok(!view.assignment.quiz.questions.some(hasAnswerKey));
    assert.equal(JSON.stringify(view.answersWithCorrectness.map((a) => a.qIndex)), '[0]');
  });

  it('refuses answers after the game is finished', () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    attempt.submitted = true;
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 0, 0).code, 'PLAY_DONE');
  });

  it('adaptive: starts at the bottom, climbs, keeps levels hidden and stops at the count', async () => {
    const game = adaptiveGame();
    let attempt = W.newPublicPlayAttempt(game);
    const served = [];
    for (let step = 0; step < 6; step += 1) {
      served.push(game.quiz.questions[attempt.adaptive.current].cefr);
      assert.equal(W.applyPublicPlayAnswer(game, attempt, step, 0, 0), null);
      // Through the token each time, as the browser would.
      const { token, attempt: view } = await W.publicPlayResponse(env, game, attempt);
      assert.ok(view.assignment.quiz.questions.every((q) => !('cefr' in q) && !hasAnswerKey(q)));
      attempt = W.publicPlayAttempt(await W.verifyPublicPlay(env, token));
    }
    assert.equal(served[0], 'A1');
    assert.ok(LEVELS.indexOf(served[5]) >= 3, served.join(' '));
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 6, 0, 0).code, 'ADAPTIVE_DONE');
    assert.equal(W.applyPublicPlayAnswer(adaptiveGame(), W.newPublicPlayAttempt(adaptiveGame()), 3, 0, 0).code, 'NOT_CURRENT');
  });
});

describe('game card', () => {
  it('shows title, first picture, count and whether some questions are teacher-graded', () => {
    const card = W.publicGameCard(plainGame(), { plays: 4, likes: 2 });
    assert.deepEqual(
      [card.title, card.cover, card.questionCount, card.teacherGraded, card.adaptive, card.levels, card.plays, card.likes],
      ['Verbs', 'https://example.com/a.jpg', 3, true, false, null, 4, 2],
    );
  });

  it('adaptive: the pill, the levels the quiz contains, and questions per player', () => {
    const game = adaptiveGame();
    game.quiz.questions = game.quiz.questions.filter((q) => ['A1', 'A2', 'B1'].includes(q.cefr));
    const card = W.publicGameCard(game, null);
    assert.equal(card.adaptive, true);
    assert.equal(JSON.stringify(card.levels), JSON.stringify({ from: 'A1', to: 'B1' }));
    assert.equal(card.questionCount, 6);
    assert.equal(card.plays, 0);
  });

  it('never contains answers', () => {
    assert.doesNotMatch(JSON.stringify(W.publicGameCard(plainGame(), {})), /hablo|vivimos/);
  });

  it('only public, non-archived assignments are games', () => {
    assert.equal(W.isPublicGame({ ...plainGame(), public: false }), false);
    assert.equal(W.isPublicGame({ ...plainGame(), archived: true }), false);
    assert.equal(W.isPublicGame(plainGame()), true);
  });
});
