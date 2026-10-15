const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Voice answers (voice_text) and voice records: the recognition language the
// teacher sets (e.g. ca-ES) must reach the student's browser. normalizeQuizForLive
// builds the quiz sent for assignments, live games, the Cup and previews; it
// used to drop answerLanguage, so students were recognised in the question
// voice's language (often English). Runs the REAL function out of app.js; only
// helpers unrelated to voices are stubbed.
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function load() {
  const sandbox = {
    crypto: { randomUUID: () => 'id-1' },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    normalizeTimeLimitValue: (v) => Number(v) || 0,
    normalizeListeningSections: () => [],
    normalizeListeningHeard: () => null,
    sanitizeListeningSectionId: () => '',
    normalizeStepsPlan: () => [],
    normalizePinZones: () => [],
    contextGapList: () => [],
    getCorrectedVariantsList: () => [],
    splitList: () => [],
  };
  return loadDeclarations(APP_SRC, [
    'SPEECH_RECOGNITION_LANGS', 'SPEECH_RECOGNITION_LANG_DEFAULTS', 'normalizeRecognitionLang',
    'EDGE_TTS_LANGUAGE_DEFAULTS', 'EDGE_TTS_VOICE_INDEX', 'EDGE_TTS_VOICE_OPTIONS', 'EDGE_TTS_LANGUAGE_OPTIONS',
    'DEFAULT_EDGE_TTS_LANGUAGE', 'DEFAULT_EDGE_TTS_VOICE', 'normalizeTtsLanguage', 'getVoiceForTtsLanguage',
    'normalizeTtsVoice', 'guessTtsLanguageFromVoice',
    'round', 'detectVideoProvider', 'makeDefaultQuestionMedia', 'normalizeQuestionMedia',
    'CEFR_LEVELS', 'normalizeCefr', 'normalizeQuizForLive',
  ], sandbox);
}

const voiceText = (extra = {}) => ({
  id: 'v1', type: 'voice_text', prompt: 'Com es diu?', accepted: ['gat'], points: 1000, timeLimit: 30,
  ttsLanguage: 'EN', language: 'en-US-AriaNeural', ...extra,
});

describe('the recognition language reaches the published quiz', () => {
  const A = load();

  it('keeps a voice answer\'s recognition language', () => {
    const out = A.normalizeQuizForLive({ title: 'T', ttsLanguage: 'EN', questions: [voiceText({ answerLanguage: 'ca-ES' })] });
    assert.equal(out.questions[0].answerLanguage, 'ca-ES');
    assert.deepEqual(out.questions[0].accepted, ['gat']);
  });

  it('completes a two-letter language and keeps it for voice records too', () => {
    const out = A.normalizeQuizForLive({
      title: 'T',
      ttsLanguage: 'NONE',
      questions: [voiceText({ answerLanguage: 'ca' }), { id: 'r1', type: 'voice_record', prompt: 'Parla', answerLanguage: 'es-ES' }],
    });
    assert.equal(out.questions[0].answerLanguage, 'ca-ES');
    assert.equal(out.questions[1].answerLanguage, 'es-ES');
  });

  it('leaves it out when blank or not a language, so the question voice decides', () => {
    const out = A.normalizeQuizForLive({
      title: 'T',
      ttsLanguage: 'EN',
      questions: [voiceText(), voiceText({ id: 'v2', answerLanguage: 'Catalan' }), { id: 't1', type: 'text', prompt: 'x', accepted: ['y'], answerLanguage: 'ca-ES' }],
    });
    assert.equal('answerLanguage' in out.questions[0], false);
    assert.equal('answerLanguage' in out.questions[1], false);
    assert.equal('answerLanguage' in out.questions[2], false);
    assert.equal(out.questions[0].language, 'en-US-AriaNeural');
  });
});
