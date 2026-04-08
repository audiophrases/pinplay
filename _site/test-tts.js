const EDGE_TTS_LANGUAGE_DEFAULTS = {
  NONE: '',
  EN: 'en-US-AriaNeural',
  CA: 'ca-ES-JoanaNeural',
  FR: 'fr-FR-DeniseNeural',
  OTHER: 'en-US-AriaNeural',
};

const EDGE_TTS_VOICE_OPTIONS = ['fr-FR-DeniseNeural', 'es-ES-ElviraNeural', 'en-US-AriaNeural'];

const DEFAULT_EDGE_TTS_LANGUAGE = 'EN';
const DEFAULT_EDGE_TTS_VOICE = EDGE_TTS_LANGUAGE_DEFAULTS[DEFAULT_EDGE_TTS_LANGUAGE];

function normalizeTtsLanguage(value) {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'NONE') return 'NONE';
  return EDGE_TTS_LANGUAGE_DEFAULTS[key] ? key : DEFAULT_EDGE_TTS_LANGUAGE;
}

function getVoiceForTtsLanguage(language) {
  const lang = normalizeTtsLanguage(language);
  if (lang === 'NONE') return '';
  return EDGE_TTS_LANGUAGE_DEFAULTS[lang] || DEFAULT_EDGE_TTS_VOICE;
}

function normalizeTtsVoice(voice, fallbackLanguage = DEFAULT_EDGE_TTS_LANGUAGE) {
  const raw = String(voice || '').trim();
  if (EDGE_TTS_VOICE_OPTIONS.includes(raw)) return raw;
  return getVoiceForTtsLanguage(fallbackLanguage);
}

// Emulate syncQuizFromUI for q2
let quizTtsLanguage = "EN";
let ttsLanguageQuestionEl_value = "FR";
let languageEl_value = ""; // Default empty string from select

const textLang = normalizeTtsLanguage(ttsLanguageQuestionEl_value || "FR" || quizTtsLanguage);
const pickedVoice = String(languageEl_value || '').slice(0, 64);
let resolvedVoice = normalizeTtsVoice(pickedVoice, textLang);

let q_language = normalizeTtsVoice(resolvedVoice, quizTtsLanguage);

console.log("Q2 syncQuizFromUI q.language:", q_language);

