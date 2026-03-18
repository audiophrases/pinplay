const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ---- Extracted pure functions from app.js/play.js ----

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
  if (mode === 'NONE') {
    targetQuiz.ttsLanguage = 'NONE';
    targetQuiz.readAllQuestionsAloud = false;
    return;
  }
  if (mode === 'READ') {
    targetQuiz.ttsLanguage = 'EN';
    targetQuiz.readAllQuestionsAloud = false;
    return;
  }
  targetQuiz.ttsLanguage = normalizeTtsLanguage(mode);
  targetQuiz.readAllQuestionsAloud = true;
}

function createEmptyQuiz() {
  return {
    version: 1,
    title: '',
    ttsLanguage: 'NONE',
    readAllQuestionsAloud: false,
    questions: [],
  };
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

// ---- Tests ----

describe('normalizeTtsLanguage', () => {
  it('returns known language as-is', () => {
    assert.equal(normalizeTtsLanguage('EN'), 'EN');
    assert.equal(normalizeTtsLanguage('CA'), 'CA');
    assert.equal(normalizeTtsLanguage('FR'), 'FR');
  });

  it('returns EN for unknown language', () => {
    assert.equal(normalizeTtsLanguage('DE'), 'EN');
    assert.equal(normalizeTtsLanguage('bogus'), 'EN');
  });

  it('handles empty/null/undefined', () => {
    assert.equal(normalizeTtsLanguage(''), 'EN');
    assert.equal(normalizeTtsLanguage(null), 'EN');
    assert.equal(normalizeTtsLanguage(undefined), 'EN');
  });

  it('is case-insensitive', () => {
    assert.equal(normalizeTtsLanguage('en'), 'EN');
    assert.equal(normalizeTtsLanguage('En'), 'EN');
    assert.equal(normalizeTtsLanguage('ca'), 'CA');
  });
});

describe('normalizeQuizAudioDefaults', () => {
  it('defaults to NONE for missing/invalid language', () => {
    const q1 = {};
    normalizeQuizAudioDefaults(q1);
    assert.equal(q1.ttsLanguage, 'NONE');
    assert.equal(q1.readAllQuestionsAloud, false);

    const q2 = { ttsLanguage: '' };
    normalizeQuizAudioDefaults(q2);
    assert.equal(q2.ttsLanguage, 'NONE');

    const q3 = { ttsLanguage: 'bogus' };
    normalizeQuizAudioDefaults(q3);
    assert.equal(q3.ttsLanguage, 'NONE');
  });

  it('sets readAllQuestionsAloud=true for known language', () => {
    const q = { ttsLanguage: 'EN' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'EN');
    assert.equal(q.readAllQuestionsAloud, true);
  });

  it('keeps readAllQuestionsAloud=false when explicitly disabled', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: false };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'EN');
    assert.equal(q.readAllQuestionsAloud, false);
  });

  it('forces readAllQuestionsAloud=false when NONE', () => {
    const q = { ttsLanguage: 'NONE', readAllQuestionsAloud: true };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.readAllQuestionsAloud, false);
  });

  it('converts legacy READ mode', () => {
    const q = { ttsLanguage: 'READ' };
    normalizeQuizAudioDefaults(q);
    assert.equal(q.ttsLanguage, 'NONE');
  });

  it('handles null quiz', () => {
    assert.doesNotThrow(() => normalizeQuizAudioDefaults(null));
  });
});

describe('getHearQuestionsMode', () => {
  it('returns NONE for empty/undefined ttsLanguage', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: '' }), 'NONE');
    assert.equal(getHearQuestionsMode({}), 'NONE');
    assert.equal(getHearQuestionsMode(null), 'NONE');
  });

  it('returns NONE when ttsLanguage is NONE', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'NONE' }), 'NONE');
  });

  it('returns language code for known languages', () => {
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'EN', readAllQuestionsAloud: true }), 'EN');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'CA', readAllQuestionsAloud: true }), 'CA');
    assert.equal(getHearQuestionsMode({ ttsLanguage: 'FR', readAllQuestionsAloud: true }), 'FR');
  });
});

describe('applyHearQuestionsMode', () => {
  it('sets NONE mode correctly', () => {
    const q = { ttsLanguage: 'EN', readAllQuestionsAloud: true };
    applyHearQuestionsMode(q, 'NONE');
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
  });

  it('converts legacy READ mode', () => {
    const q = {};
    applyHearQuestionsMode(q, 'READ');
    assert.equal(q.ttsLanguage, 'EN');
    assert.equal(q.readAllQuestionsAloud, false);
  });

  it('sets known language with readAllQuestionsAloud=true', () => {
    const q = {};
    applyHearQuestionsMode(q, 'CA');
    assert.equal(q.ttsLanguage, 'CA');
    assert.equal(q.readAllQuestionsAloud, true);
  });

  it('handles null quiz', () => {
    assert.doesNotThrow(() => applyHearQuestionsMode(null, 'EN'));
  });
});

describe('createEmptyQuiz', () => {
  it('defaults to NONE and false', () => {
    const q = createEmptyQuiz();
    assert.equal(q.ttsLanguage, 'NONE');
    assert.equal(q.readAllQuestionsAloud, false);
    assert.equal(q.questions.length, 0);
    assert.equal(q.version, 1);
    assert.equal(q.title, '');
  });
});

describe('mimeToExt', () => {
  it('returns correct extensions', () => {
    assert.equal(mimeToExt('data:image/jpeg;base64,abc'), '.jpg');
    assert.equal(mimeToExt('data:image/png;base64,abc'), '.png');
    assert.equal(mimeToExt('data:image/webp;base64,abc'), '.webp');
    assert.equal(mimeToExt('data:image/gif;base64,abc'), '.gif');
    assert.equal(mimeToExt('data:audio/mpeg;base64,abc'), '.mp3');
  });

  it('returns .bin for unknown mime', () => {
    assert.equal(mimeToExt('data:application/octet-stream;base64,abc'), '.bin');
  });

  it('returns .bin for non-data URL', () => {
    assert.equal(mimeToExt('https://example.com/img.jpg'), '.bin');
  });
});

describe('Seeded shuffle', () => {
  it('produces identical order for same prompt/id', () => {
    const answers = ['A', 'B', 'C', 'D'];
    const host = shuffleSeeded('What is 2+2?', 'q1', answers);
    const student = shuffleSeeded('What is 2+2?', 'q1', answers);
    assert.deepEqual(host, student);
  });

  it('produces different order for different prompts', () => {
    const answers = ['A', 'B', 'C', 'D'];
    const r1 = shuffleSeeded('Question A', '', answers);
    const r2 = shuffleSeeded('Question B', '', answers);
    // Very unlikely to be the same with 4 items
    assert.notDeepEqual(r1, r2);
  });

  it('handles single answer', () => {
    const result = shuffleSeeded('test', '', ['only']);
    assert.deepEqual(result, ['only']);
  });

  it('handles empty answers', () => {
    const result = shuffleSeeded('test', '', []);
    assert.deepEqual(result, []);
  });

  it('handles null/empty prompt and id', () => {
    const r1 = shuffleSeeded(null, null, ['X', 'Y']);
    const r2 = shuffleSeeded('', '', ['X', 'Y']);
    assert.deepEqual(r1, r2);
  });

  it('handles unicode prompts', () => {
    const answers = ['a', 'b', 'c'];
    const host = shuffleSeeded('Català, gràcies', '', answers);
    const student = shuffleSeeded('Català, gràcies', '', answers);
    assert.deepEqual(host, student);
  });

  it('preserves all items', () => {
    const answers = ['Red', 'Green', 'Blue', 'Yellow'];
    const result = shuffleSeeded('test', '', answers);
    assert.deepEqual(result.sort(), answers.sort());
  });
});

describe('Auto-fill image detection', () => {
  it('identifies questions needing images', () => {
    const questions = [
      { prompt: 'Q1', imageKeyword: '', imageData: null },
      { prompt: 'Q2', imageKeyword: 'volcano', imageData: null },
      { prompt: 'Q3', imageKeyword: 'rubber band', imageData: 'data:image/jpeg;base64,abc' },
      { prompt: 'Q4', imageKeyword: 'Eiffel tower', imageData: 'https://pub-xxx.r2.dev/img.jpg' },
    ];
    const needs = questions.filter(q => !q.imageData && q.imageKeyword);
    assert.equal(needs.length, 1);
    assert.equal(needs[0].prompt, 'Q2');
  });

  it('skips questions without keyword', () => {
    const questions = [
      { prompt: 'Q1', imageKeyword: '', imageData: null },
      { prompt: 'Q2', imageKeyword: undefined, imageData: null },
    ];
    const needs = questions.filter(q => !q.imageData && q.imageKeyword);
    assert.equal(needs.length, 0);
  });
});
