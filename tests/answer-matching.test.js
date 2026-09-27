const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Typed-answer matching, error-hunt corrections, the import step for
// AI-written quizzes and the AI prompt's example choice. Runs the REAL code
// from app.js, play.js and cloudflare/worker.js.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));

let APP;
let PLAY;
let W;
before(() => {
  APP = loadDeclarations(read('app.js'), [
    'TEMPLATE_ALL_13_TYPES', 'normalizeTextAnswer', 'tokenizeWords', 'tokenEditDistance',
    'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'normalizeImportedQuestion', 'pickPromptExamples',
  ]);
  PLAY = loadDeclarations(read('play.js'), ['normalizeTextAnswer']);
  W = loadDeclarations(read('cloudflare/worker.js'), [
    'normalizeTextAnswer', 'stripDiacritics', 'tokenizeWords', 'tokenEditDistance',
    'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'evaluate',
  ]);
});

describe('typed-answer matching', () => {
  const same = [
    ['2.ª', '2ª', '2a', '2 ª', '2A'],
    ['1.º', '1º', '1o'],
    ['¿Qué?', 'qué', '¡QUÉ!'],
    ['it’s', "it's", 'it s'],
    ['«hola»', '“hola”', 'hola…', '— hola —'],
  ];

  it('ignores case, Spanish and typographic punctuation, and how ordinals are written', () => {
    same.forEach((group) => {
      const norm = group.map((s) => W.normalizeTextAnswer(s));
      assert.equal(new Set(norm).size, 1, `${group.join(' | ')} -> ${norm.join(' | ')}`);
    });
  });

  it('keeps words apart and accents intact', () => {
    assert.notEqual(W.normalizeTextAnswer('segunda'), W.normalizeTextAnswer('segundo'));
    assert.notEqual(W.normalizeTextAnswer('más'), W.normalizeTextAnswer('mas'));
    assert.equal(W.normalizeTextAnswer('well-known'), 'well known');
  });

  it('is identical on the teacher page, the student page and the server', () => {
    const samples = [...same.flat(), 'Ellos hablan mucho.', 'He had flown away', 'Mª José', '30º'];
    samples.forEach((s) => {
      assert.equal(APP.normalizeTextAnswer(s), W.normalizeTextAnswer(s), s);
      assert.equal(PLAY.normalizeTextAnswer(s), W.normalizeTextAnswer(s), s);
    });
  });

  it('grades typed answers written any of those ways', () => {
    const q = { type: 'text', accepted: ['segunda', '2.ª'] };
    ['2ª', '2a', '2.ª', 'Segunda', 'segunda.'].forEach((a) => assert.equal(W.evaluate(q, a).correct, true, a));
    assert.equal(W.evaluate(q, 'tercera').correct, false);
    // An accent-only mistake still gets half credit.
    assert.equal(W.evaluate({ type: 'text', accepted: ['más'] }, 'mas').partialScore, 0.5);
  });
});

describe('error-hunt corrections', () => {
  const question = {
    type: 'error_hunt',
    prompt: 'Ellos habla mucho.',
    corrected: 'Ellos hablan mucho.',
    correctedVariants: ['Él habla mucho.'],
  };

  it('treats corrected and correctedVariants as one accepted set', () => {
    for (const fn of [APP.getCorrectedVariantsList, W.getCorrectedVariantsList]) {
      assert.deepEqual(plain(fn(question.corrected, question.correctedVariants)), ['Ellos hablan mucho.', 'Él habla mucho.']);
      assert.deepEqual(plain(fn('A.', ['A.', 'B.'])), ['A.', 'B.']);
      assert.deepEqual(plain(fn('A.\nB.', undefined)), ['A.', 'B.']);
      assert.deepEqual(plain(fn('', [])), []);
    }
  });

  it('grades both fixes as correct, whichever word was tapped', () => {
    assert.equal(W.evaluate(question, { rewrite: 'Ellos hablan mucho.', selectedTokens: [1] }).correct, true);
    assert.equal(W.evaluate(question, { rewrite: 'Él habla mucho.', selectedTokens: [0] }).correct, true);
    assert.equal(W.evaluate(question, { rewrite: 'Ellos habla mucho.', selectedTokens: [1] }).correct, false);
  });
});

describe('importing an AI-written question', () => {
  it('turns an mcq-style answers list on a typed answer into accepted answers', () => {
    const q = APP.normalizeImportedQuestion({
      type: 'text',
      prompt: '¿A qué conjugación pertenece creer?',
      answers: [{ text: 'segunda', correct: true }, { text: '2', correct: true }, { text: 'tercera', correct: false }],
    });
    assert.deepEqual(plain(q.accepted), ['segunda', '2']);
    assert.equal(q.answers, undefined);
  });

  it('keeps an accepted list that is already there', () => {
    const q = APP.normalizeImportedQuestion({ type: 'text', accepted: ['went'], answers: [{ text: 'go', correct: true }] });
    assert.deepEqual(plain(q.accepted), ['went']);
  });

  it('merges the main fix into the corrections list, so the editor keeps it', () => {
    const q = APP.normalizeImportedQuestion({
      type: 'error_hunt',
      prompt: 'Ellos habla mucho.',
      corrected: 'Ellos hablan mucho.',
      correctedVariants: ['Él habla mucho.'],
    });
    assert.deepEqual(plain(q.correctedVariants), ['Ellos hablan mucho.', 'Él habla mucho.']);
    assert.equal(q.corrected, 'Ellos hablan mucho.');
    assert.equal(q.requiredErrors, 1);
  });

  it('fills corrected from the list when only the list is given', () => {
    const q = APP.normalizeImportedQuestion({ type: 'error_hunt', prompt: 'He go home.', correctedVariants: ['He goes home.', 'They go home.'] });
    assert.equal(q.corrected, 'He goes home.');
  });
});

describe('AI prompt examples', () => {
  const pick = (allowed) => APP.pickPromptExamples(APP.TEMPLATE_ALL_13_TYPES.questions.filter((q) => allowed.includes(q.type)))
    .map((q) => q.type);
  const allTypes = () => [...new Set(APP.TEMPLATE_ALL_13_TYPES.questions.map((q) => q.type))];

  it('always shows a typed-answer and an error-hunt example when those types are allowed', () => {
    const cases = [
      ['text', 'context_gap'],
      ['mcq', 'text', 'error_hunt'],
      ['tf', 'text'],
      allTypes().filter((t) => !['open', 'speaking', 'voice_record'].includes(t)),
    ];
    cases.forEach((allowed) => {
      const shown = pick(allowed);
      ['text', 'error_hunt'].forEach((t) => {
        if (allowed.includes(t)) assert.ok(shown.includes(t), `${allowed.join(',')} -> ${shown.join(',')}`);
      });
      assert.equal(new Set(shown).size, shown.length, 'no duplicate examples');
    });
  });

  it('stays short: at most one simple, one complex, plus those two', () => {
    assert.deepEqual(plain(pick(['mcq', 'context_gap'])), ['mcq', 'context_gap']);
    assert.ok(pick(allTypes()).length <= 4);
  });
});

describe('error_hunt answer reveal', () => {
  it('lists every accepted fix, in the worker and in play.js', () => {
    const W = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'cloudflare/worker.js'), 'utf8'),
      ['getCorrectedVariantsList', 'isTeacherGradedTextQuestion', 'dedupeAcceptedForDisplay', 'hostCorrectSummary']);
    const P = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'play.js'), 'utf8'), ['errorHuntAcceptedText']);
    const q = { type: 'error_hunt', prompt: 'Ellos habla mucho.', corrected: 'Ellos hablan mucho.', correctedVariants: ['Ellos hablan mucho.', 'Él habla mucho.'] };
    assert.equal(W.hostCorrectSummary(q), 'Ellos hablan mucho. | Él habla mucho.');
    assert.equal(P.errorHuntAcceptedText(q), 'Ellos hablan mucho. | Él habla mucho.');
  });
});
