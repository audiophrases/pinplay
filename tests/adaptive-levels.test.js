const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Adaptive mode, phase 1: per-question CEFR tags (ADAPTIVE_MODE_PLAN.md).
// Runs the REAL helpers out of app.js and cloudflare/worker.js.
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const WORKER_SRC = fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8');

// vm-sandbox arrays have a foreign prototype; compare plain copies.
const plain = (v) => JSON.parse(JSON.stringify(v));

let A;
let W;
before(() => {
  A = loadDeclarations(APP_SRC, [
    'CEFR_LEVELS',
    'ADAPTIVE_DEFAULT_LEVEL_SHARES',
    'normalizeCefr',
    'isAdaptiveEligibleQuestion',
    'cefrCoverage',
    'adaptiveDefaultLevelCounts',
    'buildAdaptiveLevelRules',
    'compactQuestionForLevelTagging',
    'parseLevelTagReply',
  ], { t: (s) => s });
  W = loadDeclarations(WORKER_SRC, ['CEFR_LEVELS', 'normalizeCefrLevel']);
});

describe('CEFR tag normalization', () => {
  it('accepts the six levels in any case and rejects anything else', () => {
    assert.equal(A.normalizeCefr(' b1 '), 'B1');
    assert.equal(A.normalizeCefr('C2'), 'C2');
    assert.equal(A.normalizeCefr('B3'), '');
    assert.equal(A.normalizeCefr('Grade 5'), '');
    assert.equal(A.normalizeCefr(undefined), '');
  });

  it('matches between the editor and the worker', () => {
    ['a1', 'A2', 'b2 ', 'c1', 'X1', '', null].forEach((v) => {
      assert.equal(W.normalizeCefrLevel(v), A.normalizeCefr(v));
    });
  });
});

describe('level coverage', () => {
  it('counts only questions adaptive play can serve', () => {
    const questions = [
      { type: 'mcq', cefr: 'A1' },
      { type: 'mcq', cefr: 'A1' },
      { type: 'text', accepted: ['went'], cefr: 'B1' },
      { type: 'mcq' },
      { type: 'mcq', cefr: 'A2', isPoll: true },
      { type: 'open', cefr: 'C1' },
      { type: 'text', accepted: [''], cefr: 'C2' },
    ];
    const { counts, untagged, tagged } = A.cefrCoverage(questions);
    assert.equal(counts.A1, 2);
    assert.equal(counts.B1, 1);
    assert.equal(counts.A2, 0);
    assert.equal(counts.C1, 0);
    assert.equal(counts.C2, 0);
    assert.equal(untagged, 1);
    assert.equal(tagged, 3);
  });
});

describe('default AI level mix', () => {
  it('leans toward easy questions and always adds up to the total', () => {
    const c50 = A.adaptiveDefaultLevelCounts(50);
    assert.deepEqual({ ...c50 }, { A1: 11, A2: 11, B1: 9, B2: 8, C1: 6, C2: 5 });
    [1, 7, 15, 24, 37, 100].forEach((n) => {
      const c = A.adaptiveDefaultLevelCounts(n);
      assert.equal(Object.values(c).reduce((s, v) => s + v, 0), n, `total ${n}`);
      assert.ok(c.A1 >= c.C2, `easy >= hard for ${n}`);
    });
  });

  it('keeps the default mix alongside the teacher notes', () => {
    const def = A.buildAdaptiveLevelRules({ questionCount: 50 }).join('\n');
    assert.match(def, /"cefr"/);
    assert.match(def, /A1 11, A2 11, B1 9, B2 8, C1 6, C2 5/);
    assert.doesNotMatch(def, /Teacher's notes/);

    // Notes usually describe what each level looks like, not how many: the
    // default target stays, and the AI is told the notes win only on balance.
    const notes = A.buildAdaptiveLevelRules({ questionCount: 50, levelNotes: 'more typing at higher levels' }).join('\n');
    assert.match(notes, /Teacher's notes on the levels: "more typing at higher levels"/);
    assert.match(notes, /A1 11, A2 11, B1 9, B2 8, C1 6, C2 5/);
    assert.match(notes, /replaces the default target; otherwise keep the default target/);

    const brief = A.buildAdaptiveLevelRules({ questionCount: 'about 50 minutes' }).join('\n');
    assert.match(brief, /A1 ≈22%/);
  });
});

describe('AI level tagging round trip', () => {
  it('sends the question content without media or ids', () => {
    const compact = A.compactQuestionForLevelTagging({
      id: 'q_1',
      type: 'mcq',
      prompt: 'She ___ to school yesterday.',
      answers: [{ text: 'went', correct: true }, { text: 'goes', correct: false }],
      imageData: 'data:image/png;base64,AAAA',
      audioText: 'She went to school yesterday.',
      media: { url: 'https://example.com/v.mp4' },
      cefr: 'A2',
      _ttsGenerated: true,
    });
    assert.deepEqual(Object.keys(compact).sort(), ['answers', 'prompt', 'type']);
    assert.equal(compact.answers[0].text, 'went');
  });

  it('reads the reply shapes AIs actually return', () => {
    const fenced = 'Here you go:\n```json\n{"levels": {"1": "A2", "3": "b1"}}\n```';
    assert.deepEqual(plain(A.parseLevelTagReply(fenced)), [['1', 'A2'], ['3', 'b1']]);
    assert.deepEqual(plain(A.parseLevelTagReply('{"2": "C1"}')), [['2', 'C1']]);
    assert.deepEqual(
      plain(A.parseLevelTagReply('[{"n": 4, "cefr": "B2"}, {"n": 5, "level": "A1"}]')),
      [['4', 'B2'], ['5', 'A1']],
    );
    assert.throws(() => A.parseLevelTagReply('no json here'));
  });
});
