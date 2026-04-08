const EDGE_TTS_LANGUAGE_DEFAULTS = {
  NONE: '',
  EN: 'en-US-AriaNeural',
  CA: 'ca-ES-JoanaNeural',
  FR: 'fr-FR-DeniseNeural',
  OTHER: 'en-US-AriaNeural',
};

const EDGE_TTS_VOICE_OPTIONS = ['fr-FR-DeniseNeural', 'es-ES-ElviraNeural', 'en-US-AriaNeural', ''];

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
  if (raw && EDGE_TTS_VOICE_OPTIONS.includes(raw)) return raw;
  return getVoiceForTtsLanguage(fallbackLanguage);
}

const quizLanguage = "EN";
let q = { ttsLanguage: "FR", language: undefined };
const langForQuestion = normalizeTtsLanguage(q.ttsLanguage || quizLanguage);
q.language = normalizeTtsVoice(q.language, langForQuestion);

console.log("Q2 voice evaluation:", q.language);

// Test video backend logic fallback
function loadBackendUrl() { return ''; }

const beUrl = (loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev').replace(/\/+$/, '');
console.log("Video autoFill backend URL:", beUrl);

