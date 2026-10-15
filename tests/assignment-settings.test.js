const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// ⚙️ on an assignment's row: the settings a teacher may change after creating
// it. Runs the REAL cleaner out of cloudflare/worker.js.
const WORKER_SRC = fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8');

const plain = (v) => JSON.parse(JSON.stringify(v));

let W;
before(() => {
  W = loadDeclarations(WORKER_SRC, ['clamp', 'sanitizeClassName', 'ASSIGNMENT_FEEDBACK_MODES', 'assignmentSettingsUpdate']);
});

describe('assignmentSettingsUpdate', () => {
  it('takes every setting the dialog sends, cleaned', () => {
    const next = W.assignmentSettingsUpdate({}, {
      className: '  4B   maths ', dueAt: 1767225600000, attemptsLimit: '3',
      randomNames: false, feedbackMode: 'end', examMode: true,
    });
    assert.deepEqual(plain(next), {
      className: '4B maths', dueAt: 1767225600000, attemptsLimit: 3,
      randomNames: false, feedbackMode: 'end', examMode: true,
    });
  });

  it('changes only the fields the request carries', () => {
    assert.deepEqual(plain(W.assignmentSettingsUpdate({}, { examMode: false })), { examMode: false });
    assert.deepEqual(plain(W.assignmentSettingsUpdate({}, {})), {});
  });

  it('clears the due date with null, 0 or an empty value', () => {
    for (const dueAt of [null, 0, '', -5]) {
      assert.deepEqual(plain(W.assignmentSettingsUpdate({}, { dueAt })), { dueAt: null }, String(dueAt));
    }
  });

  it('keeps attempts between 0 (unlimited) and 10', () => {
    assert.equal(W.assignmentSettingsUpdate({}, { attemptsLimit: 0 }).attemptsLimit, 0);
    assert.equal(W.assignmentSettingsUpdate({}, { attemptsLimit: 25 }).attemptsLimit, 10);
    assert.equal(W.assignmentSettingsUpdate({}, { attemptsLimit: -2 }).attemptsLimit, 0);
    assert.equal('attemptsLimit' in W.assignmentSettingsUpdate({}, { attemptsLimit: 'lots' }), false);
  });

  it('ignores unknown feedback modes and non-boolean switches', () => {
    const next = W.assignmentSettingsUpdate({}, { feedbackMode: 'always', randomNames: 'yes', examMode: 1 });
    assert.deepEqual(plain(next), {});
  });

  it('never touches what it does not own (questions, title, adaptive size)', () => {
    const next = W.assignmentSettingsUpdate({}, { title: 'X', quiz: {}, adaptive: { count: 3 }, active: false });
    assert.deepEqual(plain(next), {});
  });

  it('keeps a Climb on instant feedback with no exam mode', () => {
    const climb = { adaptive: { count: 20, mode: 'buildup' } };
    const next = W.assignmentSettingsUpdate(climb, { feedbackMode: 'none', examMode: true, attemptsLimit: 2 });
    assert.deepEqual(plain(next), { attemptsLimit: 2, feedbackMode: 'instant', examMode: false });
  });

  it('lets an Adaptive (not Climb) assignment change feedback and exam mode', () => {
    const adaptive = { adaptive: { count: 20 } };
    const next = W.assignmentSettingsUpdate(adaptive, { feedbackMode: 'end', examMode: true });
    assert.deepEqual(plain(next), { feedbackMode: 'end', examMode: true });
  });
});
