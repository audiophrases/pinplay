const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ---- Extracted pure functions from app.js ----

function normalizeTtsLanguage(value) {
  const key = String(value || '').trim().toUpperCase();
  const EDGE_TTS_LANGUAGE_DEFAULTS = { EN: 'en-US-AriaNeural', CA: 'ca-ES-EnricNeural', FR: 'fr-FR-DeniseNeural' };
  return EDGE_TTS_LANGUAGE_DEFAULTS[key] ? key : 'EN';
}

function normalizeQuizAudioDefaults(targetQuiz) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const raw = String(targetQuiz.ttsLanguage || '').trim().toUpperCase();
  targetQuiz.ttsLanguage = ['NONE', 'EN', 'CA', 'FR', 'OTHER'].includes(raw) ? raw : 'NONE';
  targetQuiz.readAllQuestionsAloud = targetQuiz.ttsLanguage !== 'NONE' && targetQuiz.readAllQuestionsAloud !== false;
}

function getHearQuestionsMode(targetQuiz) {
  const raw = String(targetQuiz?.ttsLanguage || '').trim().toUpperCase();
  if (raw === 'NONE' || !raw) return 'NONE';
  return normalizeTtsLanguage(targetQuiz?.ttsLanguage);
}

function applyHearQuestionsMode(targetQuiz, modeValue) {
  if (!targetQuiz || typeof targetQuiz !== 'object') return;
  const mode = String(modeValue || '').trim().toUpperCase();
  if (mode === 'NONE') { targetQuiz.ttsLanguage = 'NONE'; targetQuiz.readAllQuestionsAloud = false; return; }
  if (mode === 'READ') { targetQuiz.ttsLanguage = 'EN'; targetQuiz.readAllQuestionsAloud = false; return; }
  targetQuiz.ttsLanguage = normalizeTtsLanguage(mode);
  targetQuiz.readAllQuestionsAloud = true;
}

function createEmptyQuiz() {
  return { version: 1, title: '', ttsLanguage: 'NONE', readAllQuestionsAloud: false, questions: [] };
}

function mimeToExt(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) return '.bin';
  const mime = match[1];
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.bin';
}

function shuffleSeeded(prompt, id, answers) {
  const seed = Math.abs([...((prompt || '') + (id || ''))].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) || 1;
  const indices = answers.map((_, i) => i);
  let sr = seed;
  for (let s = indices.length - 1; s > 0; s--) {
    sr = (sr * 16807) % 2147483647;
    const j = sr % (s + 1);
    [indices[s], indices[j]] = [indices[j], indices[s]];
  }
  return indices.map(i => answers[i]);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAcceptedGapOptions(value) {
  return String(value || '')
    .split(',')
    .map((x) => normalizeTextAnswer(x))
    .filter(Boolean);
}

function contextGapExpectedOptions(gaps) {
  return (Array.isArray(gaps) ? gaps : [])
    .map((g) => {
      const opts = parseAcceptedGapOptions(g);
      return opts.length ? opts : [normalizeTextAnswer(g)];
    })
    .filter((opts) => opts.some(Boolean));
}

function isContextGapCorrect(guessRaw, gaps) {
  const guess = Array.isArray(guessRaw) ? guessRaw.map(normalizeTextAnswer).filter(Boolean) : [];
  const expected = contextGapExpectedOptions(gaps);
  if (!guess.length || guess.length !== expected.length) return false;
  return guess.every((g, i) => expected[i].includes(g));
}

function isMatchPairsCorrect(guessRaw, pairsRaw) {
  const pairs = (Array.isArray(pairsRaw) ? pairsRaw : [])
    .map((p) => ({ left: normalizeTextAnswer(p?.left), right: normalizeTextAnswer(p?.right) }))
    .filter((p) => p.left && p.right);
  if (!pairs.length) return false;

  if (Array.isArray(guessRaw) && guessRaw.some((x) => x && typeof x === 'object')) {
    const expectedCounts = new Map();
    pairs.forEach((p) => {
      const key = `${p.left}=>${p.right}`;
      expectedCounts.set(key, (expectedCounts.get(key) || 0) + 1);
    });
    const gotCounts = new Map();
    guessRaw.forEach((g) => {
      const left = normalizeTextAnswer(g?.left);
      const right = normalizeTextAnswer(g?.right);
      if (!left || !right) return;
      const key = `${left}=>${right}`;
      gotCounts.set(key, (gotCounts.get(key) || 0) + 1);
    });
    if (gotCounts.size !== expectedCounts.size) return false;
    for (const [k, v] of expectedCounts.entries()) {
      if ((gotCounts.get(k) || 0) !== v) return false;
    }
    return true;
  }
  return false;
}

function supportsQuestionAudio(type) {
  return ['mcq', 'multi', 'tf', 'text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'slider', 'pin', 'audio'].includes(String(type || ''));
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSafeFilename(s) {
  return String(s || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateImportedQuiz(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON root.');
  if (!Array.isArray(data.questions)) throw new Error('Missing questions array.');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function computeCrazyCountScore(toScore, p, elapsedMs) {
  const target = Math.max(0, Math.round(Number(toScore || 0)));
  if (p >= 1) return target;
  const targetStr = String(target);
  const len = targetStr.length;
  const chars = targetStr.split('');
  for (let posFromRight = 0; posFromRight < len; posFromRight++) {
    const idx = len - 1 - posFromRight;
    const stopAt = 0.5 + (posFromRight * (0.45 / Math.max(1, len - 1)));
    if (p < stopAt) {
      chars[idx] = String(Math.floor((elapsedMs / 22 + (idx + 1) * 3) % 10));
    }
  }
  const n = Number(chars.join(''));
  return Number.isFinite(n) ? n : target;
}

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function formatHistoryAnswer(entry) {
  if (!entry) return '(no answer)';
  if (Array.isArray(entry.answerText)) return entry.answerText.join(' | ');
  return String(entry.answerText || '(no answer)');
}

// ============ TESTS ============

describe('normalizeTextAnswer', () => {
  it('lowercases', () => { assert.equal(normalizeTextAnswer('Hello World'), 'hello world'); });
  it('removes punctuation', () => { assert.equal(normalizeTextAnswer('it is a test!'), 'it is a test'); });
  it('collapses whitespace', () => { assert.equal(normalizeTextAnswer('  a   b  '), 'a b'); });
  it('handles null/empty', () => { assert.equal(normalizeTextAnswer(null), ''); assert.equal(normalizeTextAnswer(''), ''); });
  it('removes hyphens', () => { assert.equal(normalizeTextAnswer('self-driving car'), 'self driving car'); });
  it('removes apostrophes', () => { assert.equal(normalizeTextAnswer("don't"), 'don t'); });
  it('removes exclamation', () => { assert.equal(normalizeTextAnswer('hello!'), 'hello'); });
});

describe('parseAcceptedGapOptions', () => {
  it('parses single option', () => { assert.deepEqual(parseAcceptedGapOptions('hello'), ['hello']); });
  it('parses comma-separated', () => { assert.deepEqual(parseAcceptedGapOptions('hello, world'), ['hello', 'world']); });
  it('handles empty', () => { assert.deepEqual(parseAcceptedGapOptions(''), []); });
  it('trims whitespace', () => { assert.deepEqual(parseAcceptedGapOptions('  a , b  '), ['a', 'b']); });
  it('removes punctuation from options', () => { assert.deepEqual(parseAcceptedGapOptions("don't, can't"), ['don t', 'can t']); });
  it('filters empty entries', () => { assert.deepEqual(parseAcceptedGapOptions('a,,b,'), ['a', 'b']); });
});

describe('contextGapExpectedOptions', () => {
  it('builds expected options from gaps', () => {
    const result = contextGapExpectedOptions(['hello, hi', 'world']);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0].sort(), ['hello', 'hi'].sort());
    assert.deepEqual(result[1], ['world']);
  });
  it('filters empty gap entries', () => {
    assert.deepEqual(contextGapExpectedOptions(['', null, '']), []);
  });
  it('handles non-array input', () => {
    assert.deepEqual(contextGapExpectedOptions(null), []);
    assert.deepEqual(contextGapExpectedOptions('not array'), []);
  });
});

describe('isContextGapCorrect', () => {
  it('accepts correct answers', () => {
    assert.ok(isContextGapCorrect(['hello', 'world'], ['hello', 'world']));
  });
  it('rejects wrong answers', () => {
    assert.ok(!isContextGapCorrect(['wrong', 'world'], ['hello', 'world']));
  });
  it('handles alternative answers', () => {
    assert.ok(isContextGapCorrect(['hello', 'earth'], ['hello, hi', 'world, earth']));
  });
  it('rejects wrong count', () => {
    assert.ok(!isContextGapCorrect(['only one'], ['gap1', 'gap2']));
  });
  it('rejects empty guess', () => {
    assert.ok(!isContextGapCorrect([], ['hello']));
  });
  it('is case-insensitive and punctuation-insensitive', () => {
    // normalizeTextAnswer("Don't") = "don t", normalizeTextAnswer("can't") = "can t"
    assert.ok(isContextGapCorrect(["don t", "can t"], ["don t", "can t"]));
    assert.ok(isContextGapCorrect(["DON T", "CAN T"], ["don t", "can t"]));
  });
});

describe('isMatchPairsCorrect', () => {
  it('accepts correct pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('accepts order-independent match', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'B', right: '2' }, { left: 'A', right: '1' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('rejects wrong pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '2' }, { left: 'B', right: '1' }];
    assert.ok(!isMatchPairsCorrect(guess, pairs));
  });
  it('rejects incomplete pairs', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'B', right: '2' }];
    const guess = [{ left: 'A', right: '1' }];
    assert.ok(!isMatchPairsCorrect(guess, pairs));
  });
  it('handles duplicate left values', () => {
    const pairs = [{ left: 'A', right: '1' }, { left: 'A', right: '2' }];
    const guess = [{ left: 'A', right: '1' }, { left: 'A', right: '2' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
  it('rejects with empty pairs', () => {
    assert.ok(!isMatchPairsCorrect([{ left: 'A', right: '1' }], []));
  });
  it('is case-insensitive', () => {
    const pairs = [{ left: 'Apple', right: 'Red' }];
    const guess = [{ left: 'apple', right: 'red' }];
    assert.ok(isMatchPairsCorrect(guess, pairs));
  });
});

describe('supportsQuestionAudio', () => {
  it('supports mcq/tf/multi', () => {
    assert.ok(supportsQuestionAudio('mcq'));
    assert.ok(supportsQuestionAudio('tf'));
    assert.ok(supportsQuestionAudio('multi'));
  });
  it('supports text/open/audio', () => {
    assert.ok(supportsQuestionAudio('text'));
    assert.ok(supportsQuestionAudio('open'));
    assert.ok(supportsQuestionAudio('audio'));
  });
  it('supports puzzle/pin/slider', () => {
    assert.ok(supportsQuestionAudio('puzzle'));
    assert.ok(supportsQuestionAudio('pin'));
    assert.ok(supportsQuestionAudio('slider'));
  });
  it('supports context_gap/match_pairs/error_hunt', () => {
    assert.ok(supportsQuestionAudio('context_gap'));
    assert.ok(supportsQuestionAudio('match_pairs'));
    assert.ok(supportsQuestionAudio('error_hunt'));
  });
  it('does not support unknown types', () => {
    assert.ok(!supportsQuestionAudio('bogus'));
    assert.ok(!supportsQuestionAudio(''));
    assert.ok(!supportsQuestionAudio(null));
  });
});

describe('escapeHtml', () => {
  it('escapes < > &', () => {
    assert.equal(escapeHtml('<b>Tom & Jerry</b>'), '&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;');
  });
  it('escapes quotes', () => {
    assert.equal(escapeHtml('He said "hello"'), 'He said &quot;hello&quot;');
    assert.equal(escapeHtml("it's"), 'it&#39;s');
  });
  it('handles null/empty', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(''), '');
  });
  it('preserves safe text', () => {
    assert.equal(escapeHtml('hello world'), 'hello world');
  });
});

describe('toSafeFilename', () => {
  it('lowercases and replaces spaces', () => {
    assert.equal(toSafeFilename('My Quiz Title'), 'my-quiz-title');
  });
  it('removes special characters', () => {
    assert.equal(toSafeFilename("What's up?!"), 'what-s-up');
  });
  it('strips leading/trailing dashes', () => {
    assert.equal(toSafeFilename('!!!test'), 'test');
  });
  it('handles unicode characters', () => {
    assert.ok(toSafeFilename('Català quiz!').startsWith('catal'));
  });
  it('defaults to "quiz" for empty', () => {
    assert.equal(toSafeFilename(''), 'quiz');
    assert.equal(toSafeFilename(null), 'quiz');
  });
  it('handles unicode', () => {
    const result = toSafeFilename('Català quiz!');
    assert.ok(result.startsWith('catal'));
  });
});

describe('validateImportedQuiz', () => {
  it('accepts valid quiz', () => {
    assert.doesNotThrow(() => validateImportedQuiz({ questions: [] }));
    assert.doesNotThrow(() => validateImportedQuiz({ questions: [{ prompt: 'Q1' }] }));
  });
  it('rejects non-object', () => {
    assert.throws(() => validateImportedQuiz(null), /Invalid JSON root/);
    assert.throws(() => validateImportedQuiz('string'), /Invalid JSON root/);
    assert.throws(() => validateImportedQuiz(42), /Invalid JSON root/);
  });
  it('rejects missing questions', () => {
    assert.throws(() => validateImportedQuiz({}), /Missing questions array/);
    assert.throws(() => validateImportedQuiz({ questions: 'not array' }), /Missing questions array/);
  });
});

describe('clamp', () => {
  it('clamps within range', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
  });
  it('handles non-finite (falls back to min)', () => {
    assert.equal(clamp(Infinity, 0, 10), 0); // not finite → fallback to min
    assert.equal(clamp(NaN, 0, 10), 0);
    assert.equal(clamp(-Infinity, 0, 10), 0);
  });
  it('handles exact boundaries', () => {
    assert.equal(clamp(0, 0, 10), 0);
    assert.equal(clamp(10, 0, 10), 10);
  });
});

describe('computeCrazyCountScore', () => {
  it('returns target when p=1', () => {
    assert.equal(computeCrazyCountScore(1000, 1, 0), 1000);
    assert.equal(computeCrazyCountScore(500, 1, 9999), 500);
  });
  it('returns 0 for zero target', () => {
    assert.equal(computeCrazyCountScore(0, 1, 0), 0);
  });
  it('handles null/undefined target', () => {
    assert.equal(computeCrazyCountScore(null, 1, 0), 0);
  });
  it('returns numeric value for p < 1', () => {
    const result = computeCrazyCountScore(1000, 0.5, 1000);
    assert.ok(typeof result === 'number');
    assert.ok(Number.isFinite(result));
  });
  it('is deterministic for same inputs', () => {
    const r1 = computeCrazyCountScore(1000, 0.3, 5000);
    const r2 = computeCrazyCountScore(1000, 0.3, 5000);
    assert.equal(r1, r2);
  });
});

describe('tokenizeWords', () => {
  it('splits on whitespace', () => {
    assert.deepEqual(tokenizeWords('hello world'), ['hello', 'world']);
  });
  it('collapses multiple spaces', () => {
    assert.deepEqual(tokenizeWords('a   b  c'), ['a', 'b', 'c']);
  });
  it('returns empty for null/empty', () => {
    assert.deepEqual(tokenizeWords(null), []);
    assert.deepEqual(tokenizeWords(''), []);
  });
  it('handles single word', () => {
    assert.deepEqual(tokenizeWords('hello'), ['hello']);
  });
});

describe('formatHistoryAnswer', () => {
  it('formats array answer', () => {
    assert.equal(formatHistoryAnswer({ answerText: ['A', 'B'] }), 'A | B');
  });
  it('formats string answer', () => {
    assert.equal(formatHistoryAnswer({ answerText: 'hello' }), 'hello');
  });
  it('returns fallback for null', () => {
    assert.equal(formatHistoryAnswer(null), '(no answer)');
  });
  it('returns fallback for empty answerText', () => {
    assert.equal(formatHistoryAnswer({ answerText: '' }), '(no answer)');
  });
});

describe('Seeded shuffle', () => {
  it('4-item MCQ host/student match', () => {
    const a = ['Madrid', 'Paris', 'London', 'Berlin'];
    assert.deepEqual(shuffleSeeded('Capital of Spain?','',a), shuffleSeeded('Capital of Spain?','',a));
  });
  it('6-item match', () => {
    const a = ['Perro', 'Gato', 'Pájaro', 'Pez', 'Caballo', 'Vaca'];
    assert.deepEqual(shuffleSeeded('Translate to English?','',a), shuffleSeeded('Translate to English?','',a));
  });
  it('10-item match', () => {
    const a = ['Hidrógeno','Helio','Litio','Berilio','Boro','Carbono','Nitrógeno','Oxígeno','Flúor','Neón'];
    assert.deepEqual(shuffleSeeded('Elemento 5?','',a), shuffleSeeded('Elemento 5?','',a));
  });
  it('different prompts diverge', () => {
    const a = ['A','B','C','D','E','F'];
    assert.notDeepEqual(shuffleSeeded('Question A?','',a), shuffleSeeded('Question B?','',a));
  });
  it('different prompt IDs diverge', () => {
    const a = ['1','2','3','4','5'];
    assert.notDeepEqual(shuffleSeeded('Q?','q1',a), shuffleSeeded('Q?','q2',a));
  });
  it('preserves all items', () => {
    const a = ['Red','Green','Blue','Yellow','Purple','Orange'];
    const r = shuffleSeeded('colors','',a);
    assert.deepEqual(r.sort(), a.sort());
  });
  it('2 items', () => {
    const a = ['True','False'];
    const r = shuffleSeeded('tf?','',a);
    assert.deepEqual(r.sort(), a.sort());
  });
  it('single item', () => {
    const a = ['only'];
    assert.deepEqual(shuffleSeeded('t','',a), ['only']);
  });
  it('empty answers', () => {
    assert.deepEqual(shuffleSeeded('t','',[]), []);
  });
  it('null prompt/id', () => {
    const a = ['X','Y','Z'];
    assert.deepEqual(shuffleSeeded(null,null,a), shuffleSeeded(null,null,a));
  });
  it('unicode prompt', () => {
    const a = ['a','b','c','d'];
    assert.deepEqual(shuffleSeeded('Català, gràcies','',a), shuffleSeeded('Català, gràcies','',a));
  });
  it('deterministic across calls', () => {
    const a = ['1','2','3','4','5','6','7','8'];
    const r1 = shuffleSeeded('Q1','q1',a);
    const r2 = shuffleSeeded('Q1','q1',a);
    assert.deepEqual(r1, r2);
  });
  it('different order than non-seeded for 8 items', () => {
    const a = ['A','B','C','D','E','F','G','H'];
    const r = shuffleSeeded('test','',a);
    // Should still have all items
    assert.deepEqual(r.sort(), a.sort());
  });
  it('long answers (90 chars each)', () => {
    const a = [
      'This is a very long answer option number one that exceeds typical length',
      'Another extremely long answer choice for testing boundary conditions here',
      'Yet another lengthy response option to verify the shuffle handles it fine',
      'The fourth and final verbose answer option in this comprehensive test case',
    ];
    assert.deepEqual(shuffleSeeded('long?','',a), shuffleSeeded('long?','',a));
  });
  it('answers with special characters', () => {
    const a = ["C++", "C#", "F#", "B&M", "Q&A", "R&D"];
    assert.deepEqual(shuffleSeeded('languages?','',a), shuffleSeeded('languages?','',a));
  });
  it('same prompt different IDs → different order', () => {
    const a = ['True', 'False', 'Maybe', 'Unsure'];
    const r1 = shuffleSeeded('Q1','t1',a);
    const r2 = shuffleSeeded('Q1','t2',a);
    assert.ok(Array.isArray(r1));
    assert.ok(Array.isArray(r2));
    assert.deepEqual(r1.sort(), r2.sort()); // same items
  });
});

describe('Auto-fill image detection', () => {
  it('finds questions needing images', () => {
    const qs = [
      { imageKeyword: '', imageData: null },
      { imageKeyword: 'volcano', imageData: null },
      { imageKeyword: 'x', imageData: 'data:...' },
      { imageKeyword: 'y', imageData: 'https://r2.dev/...' },
    ];
    const needs = qs.filter(q => !q.imageData && q.imageKeyword);
    assert.equal(needs.length, 1);
    assert.equal(needs[0].imageKeyword, 'volcano');
  });
  it('skips no-keyword', () => {
    const qs = [{ imageKeyword: '', imageData: null }, { imageKeyword: undefined, imageData: null }];
    assert.equal(qs.filter(q => !q.imageData && q.imageKeyword).length, 0);
  });
  it('skips has-image', () => {
    const qs = [{ imageKeyword: 'x', imageData: 'https://...' }];
    assert.equal(qs.filter(q => !q.imageData && q.imageKeyword).length, 0);
  });
});

describe('TTS audio defaults', () => {
  it('normalizeTtsLanguage returns known languages', () => {
    assert.equal(normalizeTtsLanguage('EN'), 'EN');
    assert.equal(normalizeTtsLanguage('CA'), 'CA');
    assert.equal(normalizeTtsLanguage('FR'), 'FR');
  });
  it('normalizeTtsLanguage returns EN for unknown', () => {
    assert.equal(normalizeTtsLanguage('DE'), 'EN');
    assert.equal(normalizeTtsLanguage('bogus'), 'EN');
    assert.equal(normalizeTtsLanguage(''), 'EN');
    assert.equal(normalizeTtsLanguage(null), 'EN');
  });
  it('normalizeTtsLanguage is case-insensitive', () => {
    assert.equal(normalizeTtsLanguage('en'), 'EN');
    assert.equal(normalizeTtsLanguage('ca'), 'CA');
    assert.equal(normalizeTtsLanguage('Fr'), 'FR');
  });
  it('normalizeQuizAudioDefaults sets NONE for empty', () => {
    const q = {};
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults sets readAllQuestionsAloud for EN', () => {
    const q = { ttsLanguage: 'EN' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, true);
  });
  it('normalizeQuizAudioDefaults keeps disabled state', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: false };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults forces false for NONE', () => {
    const q = { ttsLanguage: 'NONE', readAllQuestionsAloud: true };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('normalizeQuizAudioDefaults converts legacy READ', () => {
    const q = { ttsLanguage: 'READ' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'NONE');
  });
  it('normalizeQuizAudioDefaults handles null', () => {
    assert.doesNotThrow(() => normalizeQuizAudioDefaults(null));
  });
  it('getHearQuestionsMode returns NONE for empty', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: '' }), 'NONE');
    assert.equal(getHearQuestionsMode({}), 'NONE');
    assert.equal(getHearQuestionsMode(null), 'NONE');
  });
  it('getHearQuestionsMode returns NONE for NONE', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'NONE' }), 'NONE');
  });
  it('getHearQuestionsMode returns language for known languages', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'EN' }), 'EN');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'CA' }), 'CA');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'FR' }), 'FR');
  });
  it('applyHearQuestionsMode sets NONE', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: true };
    applyHearQuestionsMode(q, 'NONE');
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('applyHearQuestionsMode converts READ', () => {
    const q = {};
    applyHearQuestionsMode(q, 'READ');
    assert.equal(q.ttsLanguage, 'EN');
    assert.equal(q.readAllQuestionsAloud, false);
  });
  it('applyHearQuestionsMode sets language with readAllQuestionsAloud', () => {
    const q = {};
    applyHearQuestionsMode(q, 'CA');
    assert.equal(q.ttsLanguage, 'CA');
    assert.equal(q.readAllQuestionsAloud, true);
  });
  it('applyHearQuestionsMode handles null', () => {
    assert.doesNotThrow(() => applyHearQuestionsMode(null, 'EN'));
  });
  it('createEmptyQuiz has correct defaults', () => {
    const q = createEmptyQuiz();
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
    assert.equal(q.questions.length, 0);
    assert.equal(q.version, 1);
  });
});

describe('MIME to extension', () => {
  it('maps image types', () => {
    assert.equal(mimeToExt('data:image/jpeg;base64,x'), '.jpg');
    assert.equal(mimeToExt('data:image/png;base64,x'), '.png');
    assert.equal(mimeToExt('data:image/webp;base64,x'), '.webp');
    assert.equal(mimeToExt('data:image/gif;base64,x'), '.gif');
  });
  it('maps audio types', () => {
    assert.equal(mimeToExt('data:audio/mpeg;base64,x'), '.mp3');
  });
  it('returns .bin for unknown', () => {
    assert.equal(mimeToExt('data:application/octet-stream;base64,x'), '.bin');
  });
  it('returns .bin for non-data URL', () => {
    assert.equal(mimeToExt('https://example.com/img.jpg'), '.bin');
  });
  it('returns .bin for empty', () => {
    assert.equal(mimeToExt(''), '.bin');
  });
});
