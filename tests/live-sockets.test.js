const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Classic live games over a live connection (LIVE_SOCKETS_PLAN.md): when the
// room's alarm fires, which answers are rejected, and what counts as a change
// worth pushing. These run the real worker functions.
let W;
before(() => {
  W = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8'), [
    'ROOM_TTL_MS', 'LIVE_SNAPSHOT_RETRY_MS', 'LIVE_SNAPSHOT_MAX_RETRIES', 'getQuestionTimeLimitSec', 'normalizeTimeLimitValue',
    'minTimeByType', 'clamp', 'liveQuestionDeadline', 'needsLiveSnapshotRetry', 'nextRoomAlarmAt', 'answerIsForAnotherQuestion',
    'liveStateKey',
  ]);
});

const NOW = 1_800_000_000_000;
const room = (over = {}) => ({
  pin: '123456',
  phase: 'question',
  currentIndex: 1,
  questionStartedAt: NOW - 5000,
  questionClosed: false,
  updatedAt: NOW,
  settings: { randomNames: true },
  players: {},
  quiz: { questions: [{ type: 'mcq', timeLimit: 20 }, { type: 'mcq', timeLimit: 20 }, { type: 'mcq', timeLimit: 0 }] },
  ...over,
});

describe('question deadline', () => {
  it('is the start plus the time limit while a question is open', () => {
    assert.equal(W.liveQuestionDeadline(room()), NOW - 5000 + 20000);
  });
  it('is null when closed, between questions, or without a time limit', () => {
    assert.equal(W.liveQuestionDeadline(room({ questionClosed: true })), null);
    assert.equal(W.liveQuestionDeadline(room({ phase: 'results' })), null);
    assert.equal(W.liveQuestionDeadline(room({ phase: 'lobby' })), null);
    assert.equal(W.liveQuestionDeadline(room({ currentIndex: 2 })), null);
  });
});

describe('room alarm', () => {
  it('fires at the question deadline (just after it) when that is sooner than the cleanup', () => {
    assert.equal(W.nextRoomAlarmAt(room(), NOW), NOW + 15000 + 250);
  });
  it('an overdue question closes at once', () => {
    assert.equal(W.nextRoomAlarmAt(room({ questionStartedAt: NOW - 60000 }), NOW), NOW + 250);
  });
  it('otherwise it is the 24-hour cleanup after the last change', () => {
    assert.equal(W.nextRoomAlarmAt(room({ questionClosed: true, updatedAt: NOW - 1000 }), NOW), NOW - 1000 + W.ROOM_TTL_MS);
  });
  it('retries saving a login-required game a limited number of times', () => {
    const login = { phase: 'results', settings: { randomNames: false }, players: { a: { identity: { studentKey: 'usr_a@x' } } } };
    assert.equal(W.needsLiveSnapshotRetry(room(login)), true);
    assert.equal(W.nextRoomAlarmAt(room(login), NOW), NOW + W.LIVE_SNAPSHOT_RETRY_MS);
    assert.equal(W.needsLiveSnapshotRetry(room({ ...login, snapshotted: true })), false);
    assert.equal(W.needsLiveSnapshotRetry(room({ ...login, snapshotRetries: W.LIVE_SNAPSHOT_MAX_RETRIES })), false);
    assert.equal(W.needsLiveSnapshotRetry(room({ ...login, settings: { randomNames: true } })), false);
    assert.equal(W.needsLiveSnapshotRetry(room({ ...login, players: { a: {} } })), false);
  });
});

describe('answers name their question', () => {
  it('rejects an answer for another question or an earlier run of the same one', () => {
    assert.equal(W.answerIsForAnotherQuestion(room(), { qIndex: 0 }), true);
    assert.equal(W.answerIsForAnotherQuestion(room(), { qIndex: 1, questionStartedAt: NOW - 99999 }), true);
  });
  it('accepts the current question, and pages that send neither', () => {
    assert.equal(W.answerIsForAnotherQuestion(room(), { qIndex: 1, questionStartedAt: NOW - 5000 }), false);
    assert.equal(W.answerIsForAnotherQuestion(room(), { qIndex: '1' }), false);
    assert.equal(W.answerIsForAnotherQuestion(room(), {}), false);
    assert.equal(W.answerIsForAnotherQuestion(room(), { qIndex: null, questionStartedAt: null }), false);
  });
});

describe('what counts as a change to push', () => {
  it('ignores the server clock and the revision number', () => {
    const a = W.liveStateKey({ t: 'state', state: { phase: 'question', score: 10, serverNow: 1, rev: 4 } });
    const b = W.liveStateKey({ t: 'state', state: { phase: 'question', score: 10, serverNow: 2, rev: 9 } });
    assert.equal(a, b);
  });
  it('sees a real change, including the host attempts summary', () => {
    const base = { t: 'state', state: { phase: 'question', score: 10 } };
    assert.notEqual(W.liveStateKey(base), W.liveStateKey({ ...base, state: { phase: 'question', score: 11 } }));
    assert.notEqual(W.liveStateKey(base), W.liveStateKey({ ...base, attempts: { rows: 1 } }));
  });
});
