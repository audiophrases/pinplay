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
    'normalizeCefr',
    'isAdaptiveEligibleQuestion',
    'cefrCoverage',
    'BUILDUP_MAX_STEPS', 'SCAFFOLD_ORDER', 'buildAdaptiveLevelRules',
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
  it('counts every question but polls (teacher-graded ones included)', () => {
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
    assert.equal(counts.C1, 1);
    assert.equal(counts.C2, 1);
    assert.equal(untagged, 1);
    assert.equal(tagged, 5);
  });
});

describe('AI step progression', () => {
  it('covers the chosen steps without imposing a CEFR range', () => {
    const rules = A.buildAdaptiveLevelRules({ steps: 8, questionCount: 40 }).join('\n');
    assert.match(rules, /Use exactly 8 difficulty steps/);
    assert.match(rules, /Spread the questions as evenly as possible across all 8 steps/);
    assert.doesNotMatch(rules, /Level mix: all six|A1 22|C2 11/);
  });

  it('uses a gradual numbered progression and follows the existing teacher notes', () => {
    const def = A.buildAdaptiveLevelRules({ questionCount: 50 }).join('\n');
    assert.match(def, /"cefr"/);
    assert.match(def, /exactly 12 difficulty steps/);
    assert.match(def, /More steps mean smaller changes, not a higher final target/);
    assert.doesNotMatch(def, /Default target:|Level mix: all six/);

    // Teacher notes can set the endpoint and pace, as well as the question mix.
    const notes = A.buildAdaptiveLevelRules({ questionCount: 50, levelNotes: 'more typing at higher levels' }).join('\n');
    assert.match(notes, /Follow the teacher's notes on levels \(above\)/);
    assert.match(notes, /including their endpoint, pace and question balance/);

    const brief = A.buildAdaptiveLevelRules({ questionCount: 'about 50 minutes' }).join('\n');
    assert.match(brief, /Spread the questions as evenly as possible/);
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

describe('Cup level summary on saved live attempts', () => {
  let S;
  before(() => { S = loadDeclarations(WORKER_SRC, ['CEFR_LEVELS', 'BUILDUP_MAX_STEPS', 'normalizeClimbStep', 'sanitizeCupLevels']); });

  it('keeps a valid summary and drops bad levels and counts', () => {
    const out = plain(S.sanitizeCupLevels({
      answered: 12, usualLevel: 'B1', finalLevel: 'B2', peakLevel: 'Z9', path: 'A2✓ B1✗',
      perLevel: { A2: { right: 3, answered: 4 }, B1: { right: 9, answered: 2 }, X1: { right: 1, answered: 1 }, C1: { right: 0, answered: 0 } },
    }));
    assert.deepEqual(out, {
      answered: 12, usualLevel: 'B1', finalLevel: 'B2', peakLevel: '', path: 'A2✓ B1✗',
      perLevel: { A2: { right: 3, answered: 4 }, B1: { right: 2, answered: 2 } },
    });
  });

  it('returns null without a usual level', () => {
    assert.equal(S.sanitizeCupLevels(null), null);
    assert.equal(S.sanitizeCupLevels({ usualLevel: '' }), null);
  });

  it('keeps all 12 numbered bands in saved Cup summaries', () => {
    const out = S.sanitizeCupLevels({ bands: Array.from({ length: 12 }, (_, i) => i + 1), usualLevel: 10, finalLevel: 11, peakLevel: 12, answered: 8, perLevel: { 10: { right: 3, answered: 4 }, 12: { right: 1, answered: 4 } } });
    assert.equal(out.usualLevel, 10);
    assert.equal(out.finalLevel, 11);
    assert.equal(out.peakLevel, 12);
    assert.equal(out.perLevel[12].answered, 4);
    assert.equal(out.bands.length, 12);
  });
});
