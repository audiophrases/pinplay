const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Gap-fill questions: one entry in "gaps" per ____ blank, alternatives inside
// the entry ("haven't seen, have not seen"). An AI quiz listed alternatives as
// separate entries for a one-blank sentence, which drew an extra box after the
// sentence and graded right answers as wrong. Runs the real worker code on
// that quiz's gap questions.
const fixture = require('./fixtures/ai-gap-alternatives.json');
const src = fs.readFileSync(path.join(__dirname, 'public-games.test.js'), 'utf8');
// The worker functions public-games.test.js loads cover normalizeQuiz,
// publicQuestion, evaluate and hostCorrectSummary.
const NAMES = eval(src.slice(src.indexOf('const NAMES = ') + 14, src.indexOf('];', src.indexOf('const NAMES = ')) + 1));

let W;
let A;
before(() => {
  W = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8'), [...NAMES, 'contextGapList'], {
    crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, btoa, atob,
  });
  A = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), ['contextGapList']);
});

const byId = (id) => fixture.questions.find((q) => q.id === id);
const blanks = (q) => (q.prompt.match(/_{2,}/g) || []).length;

describe('gap alternatives written as separate entries', () => {
  it('one blank: merged into one entry (server and app agree)', () => {
    for (const id of ['q38', 'q39', 'q57', 'q73', 'q86']) {
      const q = byId(id);
      assert.equal(blanks(q), 1, id);
      assert.equal(W.contextGapList(q).length, 1, id);
      assert.equal(JSON.stringify(A.contextGapList(q)), JSON.stringify(W.contextGapList(q)), id);
    }
  });

  it('really two blanks: left as two gaps', () => {
    for (const id of ['q74', 'q94']) {
      const q = byId(id);
      assert.equal(blanks(q), 2, id);
      assert.equal(JSON.stringify(W.contextGapList(q)), JSON.stringify(q.gaps), id);
    }
  });

  it('every question in the quiz shows as many boxes as the sentence has blanks', () => {
    const quiz = W.normalizeQuiz({ title: 'AI quiz', questions: fixture.questions.map((q) => ({ ...q, type: 'context_gap', points: 1000 })) });
    for (const q of quiz.questions) {
      assert.equal(W.publicQuestion(q).gapCount, blanks(q), q.prompt);
    }
  });

  it('either alternative is right; the reveal lists both for the one gap', () => {
    const q38 = { ...byId('q38'), type: 'context_gap', points: 1000 };
    assert.equal(W.evaluate(q38, ['organised']).correct, true);
    assert.equal(W.evaluate(q38, ['organized']).correct, true);
    assert.equal(W.hostCorrectSummary(q38), 'organized, organised');
    const q39 = { ...byId('q39'), type: 'context_gap', points: 1000 };
    assert.equal(W.evaluate(q39, ['have not seen']).correct, true);
    assert.equal(W.evaluate(q39, ["haven't seen"]).correct, true);
  });

  it('an assignment saved before the fix is graded the same way (grading reads the rule too)', () => {
    const stored = { id: 'q57', type: 'context_gap', prompt: byId('q57').prompt, gaps: byId('q57').gaps, points: 1000 };
    assert.equal(W.evaluate(stored, ['have not decided']).correct, true);
  });
});
