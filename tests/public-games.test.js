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
  'PUBLIC_PLAY_TOKEN_MAX', 'assignmentAdaptiveCount', 'listeningSectionMoments', 'listeningSectionBlock', 'adaptiveSectionPlan', 'adaptiveAttemptTotal', 'assignmentAdaptiveTotal', 'assignmentAdaptiveOn', 'adaptiveAttemptServe', 'adaptiveAttemptOpenBlock', 'adaptiveCefr', 'assignmentAdaptivePool', 'adaptivePool', 'CEFR_LEVELS', 'normalizeCefrLevel',
  'isAssignmentTeacherGradedQuestion', 'isTeacherGradedTextQuestion', 'sanitizeAssignmentCode', 'randomId', 'pickRandomName',
  'RANDOM_NAME_ADJECTIVES', 'RANDOM_NAME_PEOPLE', 'FEMALE_NAME_HINTS', 'adaptiveAttemptInit', 'adaptiveInit', 'ADAPTIVE_START',
  'adaptiveNext', 'adaptiveBand', 'clamp', 'sanitizeBet', 'sanitizeAssignmentAnswer', 'adaptiveRecord', 'adaptiveRecordPending',
  'adaptiveOutcome', 'evaluate', 'adaptivePathOk', 'ADAPTIVE_PATH_MAX', 'adaptiveTally', 'adaptiveStepScale', 'ADAPTIVE_STEP_SETTLED',
  'ADAPTIVE_STEP_NEW', 'ADAPTIVE_SETTLE_HALF', 'ADAPTIVE_UP', 'adaptiveAttemptAdvance', 'adaptiveRebase', 'evaluateAssignmentAttempt',
  'adaptiveAttemptView', 'verdictScoreFraction', 'applyBetScore', 'round', 'studentSessionSecret', 'sha256Hex', 'b64urlEncodeBytes',
  'b64urlDecodeBytes', 'constantTimeEqual', 'hmacSignBytes', 'publicAssignmentAttempt', 'hostCorrectSummary',
  'sanitizeAssignmentAttemptId', 'sanitizeAssignmentStudentKey', 'normalizeStudentKeyInput', 'sanitizeName', 'sanitizeEmail',
  'sanitizeClassName', 'publicAssignment', 'publicListeningSections', 'attemptSectionSubmitted', 'LISTENING_SECTION_TYPES', 'LISTENING_MAX_SECTIONS', 'LISTENING_DEFAULT_PLAYS', 'sanitizeListeningSectionId', 'normalizeListeningAudio', 'normalizeListeningSectionList', 'assignListeningMembership', 'stripListeningQuestionMedia', 'normalizeListeningSections', 'normalizeQuiz', 'normalizeTimeLimitValue', 'minTimeByType', 'normalizeQuestionMedia',
  'detectQuestionMediaProvider', 'publicQuestion', 'publicQuestionMediaPayload', 'publicAudioPayload', 'normalizeTextAnswer',
  'gradeContextGap', 'contextGapExpectedOptions', 'parseAcceptedGapOptions', 'dedupeAcceptedForDisplay', 'stripDiacritics',
  'stableShuffle', 'tokenizeWords', 'tokenEditDistance', 'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'normalizeWordle',
  'publicAdaptivePool', 'publicAdaptiveDefaultCount', 'publicAdaptiveAttemptInit', 'PUBLIC_ADAPTIVE_SHARE', 'PUBLIC_ADAPTIVE_MIN',
  'applyPublicSectionAnswers', 'adaptiveAttemptCloseBlock',
  'autoGradedQuestionIndexes', 'ADAPTIVE_REPEAT_DISCOUNT', 'ADAPTIVE_DOWN', 'ADAPTIVE_STREAK_DOWN', 'ADAPTIVE_UP_AFTER_DROP', 'ADAPTIVE_RETRY_GAPS',
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

  it('sends the whole answer key only once the game is finished', async () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    W.applyPublicPlayAnswer(game, attempt, 0, 0, 0);
    attempt.submitted = true;
    attempt.submittedAt = Date.now();
    const { attempt: view } = await W.publicPlayResponse(env, game, attempt);
    assert.ok(view.assignment.quiz.questions.some(hasAnswerKey));
  });

  it('refuses answers after the game is finished', () => {
    const game = plainGame();
    const attempt = W.newPublicPlayAttempt(game);
    attempt.submitted = true;
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 0, 0).code, 'PLAY_DONE');
  });

  it('adaptive: starts at the bottom, climbs, keeps levels hidden and stops at the count', async () => {
    const game = adaptiveGame();
    let attempt = W.newPublicPlayAttempt(game, 6);
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

  it('adaptive whenever the quiz is tagged with 2+ levels, even if the assignment is not', () => {
    const game = { ...adaptiveGame(), adaptive: undefined };
    assert.ok(W.newPublicPlayAttempt(game).adaptive);
    const oneLevel = { ...game, quiz: { questions: game.quiz.questions.filter((q) => q.cefr === 'A1') } };
    assert.equal(W.newPublicPlayAttempt(oneLevel).adaptive, undefined);
  });

  it('plays the number the player picks; suggests a third of the quiz, at least 10', () => {
    const big = (n) => ({ ...adaptiveGame(), quiz: { questions: Array.from({ length: n }, (_, i) => tf(`q${i}`, LEVELS[i % 6])) } });
    assert.equal(W.newPublicPlayAttempt(big(100)).adaptive.count, 33);
    assert.equal(W.newPublicPlayAttempt(big(120)).adaptive.count, 40);
    assert.equal(W.newPublicPlayAttempt(big(24)).adaptive.count, 10);
    assert.equal(W.newPublicPlayAttempt(big(8)).adaptive.count, 8);
    assert.equal(W.newPublicPlayAttempt(big(100), 40).adaptive.count, 40);
    assert.equal(W.newPublicPlayAttempt(big(100), 500).adaptive.count, 100);
    assert.equal(W.publicGameCard(big(100), null).recommended, 33);
  });

  it('anonymous adaptive play never serves teacher-graded questions', () => {
    const game = adaptiveGame();
    game.quiz.questions.push(...LEVELS.map((lv) => ({ id: `open-${lv}`, type: 'open', prompt: 'Write', cefr: lv, points: 1000 })));
    const attempt = W.newPublicPlayAttempt(game, 18);
    assert.equal(attempt.adaptive.count, 18, 'capped at the 18 auto-graded questions');
    for (let step = 0; step < 18; step += 1) {
      assert.notEqual(game.quiz.questions[attempt.adaptive.current].type, 'open');
      assert.equal(W.applyPublicPlayAnswer(game, attempt, step, 0, 0), null);
    }
  });
});

// Listening sections in /play (LISTENING_MODE_PLAN.md section 10): level
// blocks as in adaptive assignments; the page sends a section's answers with
// Submit section (or when the game is finished).
describe('anonymous adaptive play with listening sections', () => {
  const sectionQ = (id, cefr, s = 'p1') => ({ ...tf(id, cefr), listeningSection: s });
  const listeningGame = (singles = []) => ({
    code: 'LISTEN', title: 'Listening', public: true,
    quiz: {
      listeningSections: [{ id: 'p1', title: 'Part 1', text: '', audio: null, playsAllowed: 2, pauseAllowed: true }],
      questions: [
        ...singles,
        sectionQ('shared', null),
        ...['A1', 'A2', 'B1'].flatMap((lv) => [1, 2, 3].map((m) => sectionQ(`${lv}-${m}`, lv))),
        { id: 'essay', type: 'open', prompt: 'Why?', points: 1000, cefr: 'B1', listeningSection: 'p1' },
      ],
    },
  });
  const servedIds = (game, attempt) => attempt.adaptive.block.qis.map((qi) => game.quiz.questions[qi].id);

  it('a game of sections only: the ladder first, without teacher-graded questions', () => {
    const game = listeningGame();
    const card = W.publicGameCard(game, null);
    assert.equal(card.adaptive, true);
    assert.equal(card.questionCount, 0, 'no single questions: nothing to pick');
    assert.deepEqual(JSON.parse(JSON.stringify(card.listening)), { sections: 1, questions: 4 });
    const attempt = W.newPublicPlayAttempt(game);
    assert.equal(attempt.adaptive.count, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(servedIds(game, attempt))), ['shared', 'A1-1', 'A2-2', 'B1-3']);
    // A normal answer is refused while the section is open; Submit section takes its answers.
    assert.equal(W.applyPublicPlayAnswer(game, attempt, 0, 0, 0).code, 'LISTENING_SECTION');
    assert.equal(W.applyPublicSectionAnswers(game, attempt, 'p1', { 0: 0, 1: 0, 2: 0, 3: 1 }), null);
    assert.equal(attempt.adaptive.done, true);
    assert.ok(attempt.sectionsSubmitted.p1 > 0);
    assert.equal(attempt.adaptive.items.length, 4);
  });

  it('single questions before the section level the player first', () => {
    const game = listeningGame(LEVELS.map((lv) => tf(`single-${lv}`, lv)));
    const attempt = W.newPublicPlayAttempt(game, 3);
    assert.equal(attempt.adaptive.count, 3);
    for (let step = 0; step < 3; step += 1) assert.equal(W.applyPublicPlayAnswer(game, attempt, step, 0, 0), null);
    const ids = servedIds(game, attempt);
    assert.equal(ids[0], 'shared');
    assert.equal(new Set(ids.slice(1).map((id) => id.split('-')[0])).size, 1, `one level, not a ladder: ${ids}`);
  });

  it('finishing with the section open counts what was entered; the token keeps submitted sections', async () => {
    const game = listeningGame();
    const attempt = W.newPublicPlayAttempt(game);
    assert.equal(W.applyPublicSectionAnswers(game, attempt, 'p1', { 1: 0 }, Date.now(), { submit: false }), null);
    assert.equal(attempt.adaptive.items.length, 4, 'the open block was closed with its answers');
    const plain = listeningGame();
    const p = W.newPublicPlayAttempt({ ...plain, quiz: { ...plain.quiz, questions: plain.quiz.questions.map((q) => ({ ...q, cefr: undefined })) } });
    assert.equal(p.adaptive, undefined, 'one level or none: not adaptive');
    assert.equal(W.applyPublicSectionAnswers(plain, p, 'p1', { 0: 0, 1: 1 }), null);
    assert.deepEqual(Object.keys(p.answersByQ), ['0', '1']);
    const token = await W.signPublicPlay(env, plain, p);
    const back = W.publicPlayAttempt(await W.verifyPublicPlay(env, token));
    assert.ok(back.sectionsSubmitted.p1 > 0);
  });
});

describe('homework with instant feedback', () => {
  it('an open attempt gets verdicts for answered questions, never the answers ahead', () => {
    const homework = { ...plainGame(), public: false, feedbackMode: 'instant' };
    const attempt = { id: 'at_1', studentKey: 'usr_x', answersByQ: { 0: { answer: 1 } }, submitted: false };
    const open = W.publicAssignmentAttempt(homework, attempt, { includeAnswers: true });
    assert.ok(!open.assignment.quiz.questions.some(hasAnswerKey));
    assert.equal(JSON.stringify(open.answersWithCorrectness.map((a) => [a.qIndex, a.correct])), '[[0,false]]');
    const done = W.publicAssignmentAttempt(homework, { ...attempt, submitted: true, submittedAt: 1 }, { includeAnswers: true });
    assert.ok(done.assignment.quiz.questions.some(hasAnswerKey));
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
    assert.equal(card.questionCount, 9); // the questions it can draw from
    assert.equal(card.recommended, 9); // at least 10, but no more than there are
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
