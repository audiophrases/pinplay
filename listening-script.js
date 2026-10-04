// Listening recording scripts (LISTENING_STUDIO_PLAN.md section 4): the
// format an AI writes for a listening section's recording, read by the
// create page (clean transcript, checks) and later by the Listening Studio,
// which turns it into one MP3 with Qwen3-TTS voices. Plain browser globals;
// also loadable in Node for the tests.

const LISTENING_SCRIPT_SOUNDS = ['chime', 'ring', 'beep'];
const LISTENING_SCRIPT_EFFECTS = ['phone', 'pa', 'far', 'radio'];
const LISTENING_SCRIPT_AMBIENCES = ['none', 'room', 'hall', 'station', 'outdoors'];
const LISTENING_SCRIPT_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean'];

// A speaker name: letters only (no digits, so "at 10:30" is never a name), up
// to three words; "Mia + Tom" for two people speaking together.
const LISTENING_NAME = "[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.-]*(?: [A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.-]*){0,2}";
const LISTENING_SPEECH_RE = new RegExp(`^(>>\\s*)?(${LISTENING_NAME}(?:\\s*\\+\\s*${LISTENING_NAME})*)\\s*(?:\\[([^\\]]+)\\])?\\s*(?:\\(([^)]*)\\))?\\s*:\\s*(.+)$`);

function listeningScriptEffect(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return LISTENING_SCRIPT_EFFECTS.includes(v) ? v : '';
}

// The script, read forgivingly: a line that is nothing else continues the
// previous line (this also mends line breaks from PDF copies), and a text
// with no speaker names at all is read by one voice. Returns
// { title, language, ambience, voices: { Name: { description, effect } },
//   parts: [{ label, items }], notes } where an item is
// { type: 'line', speakers, direction, effect, text, overlap },
// { type: 'sound', sound } or { type: 'pause', seconds }.
function parseListeningScript(text) {
  const script = { title: '', language: '', ambience: '', voices: {}, parts: [], notes: [] };
  let part = { label: '', items: [] };
  let last = null; // the line a wrapped line continues
  const voiceKey = (name) => Object.keys(script.voices).find((k) => k.toLowerCase() === name.toLowerCase()) || name;
  String(text || '').replace(/\r\n?/g, '\n').split('\n').forEach((rawLine, n) => {
    const line = rawLine.trim();
    if (!line) {
      last = null;
      return;
    }
    // AI chats wrap their answer in a code block: "```text" … "```".
    if (/^```/.test(line)) return;
    let m;
    if ((m = /^-{3,}\s*(.*?)\s*-*$/.exec(line))) {
      if (part.items.length || part.label) script.parts.push(part);
      part = { label: m[1], items: [] };
      last = null;
    } else if ((m = /^(LANGUAGE|AMBIENCE|TITLE)\s*:\s*(.+)$/i.exec(line))) {
      const key = m[1].toLowerCase();
      script[key] = key === 'ambience' ? m[2].trim().toLowerCase() : m[2].trim();
      if (key === 'ambience' && !LISTENING_SCRIPT_AMBIENCES.includes(script.ambience)) {
        script.notes.push(`Line ${n + 1}: unknown background "${m[2].trim()}" (use ${LISTENING_SCRIPT_AMBIENCES.join(', ')}).`);
      }
      last = null;
    } else if ((m = new RegExp(`^VOICE\\s+(${LISTENING_NAME})\\s*(?:\\[([^\\]]+)\\])?\\s*:\\s*(.+)$`, 'i').exec(line))) {
      script.voices[m[1].trim()] = { description: m[3].trim(), effect: listeningScriptEffect(m[2]) };
      last = null;
    } else if ((m = /^\[([^\]]+)\]$/.exec(line))) {
      const inner = m[1].trim().toLowerCase();
      const pause = /^pause(?:\s+(\d+(?:\.\d+)?))?\s*s?$/.exec(inner);
      if (pause) part.items.push({ type: 'pause', seconds: Math.min(30, Number(pause[1] || 1.5)) });
      else if (LISTENING_SCRIPT_SOUNDS.includes(inner)) part.items.push({ type: 'sound', sound: inner });
      else script.notes.push(`Line ${n + 1}: unknown sound [${m[1]}] (use ${LISTENING_SCRIPT_SOUNDS.map((s) => `[${s}]`).join(', ')}, [pause N]).`);
      last = null;
    } else if ((m = LISTENING_SPEECH_RE.exec(line))) {
      const speakers = m[2].split('+').map((s) => voiceKey(s.trim()));
      last = { type: 'line', speakers, direction: (m[4] || '').trim(), effect: listeningScriptEffect(m[3]), text: m[5].trim(), overlap: !!m[1] };
      part.items.push(last);
    } else if (last) {
      last.text += ` ${line}`;
    } else {
      last = { type: 'line', speakers: ['Narrator'], direction: '', effect: '', text: line, overlap: false };
      part.items.push(last);
    }
  });
  if (part.items.length || part.label) script.parts.push(part);
  // Everyone who speaks needs a voice; the studio invents one otherwise.
  const speaking = new Set();
  script.parts.forEach((p) => p.items.forEach((it) => { if (it.type === 'line') it.speakers.forEach((s) => speaking.add(s)); }));
  speaking.forEach((s) => {
    if (!script.voices[s]) script.notes.push(`${s} has no VOICE line: a voice will be chosen automatically.`);
  });
  return script;
}

// A script, as opposed to a plain transcript: it describes its voices.
function isListeningScript(text) {
  return /^\s*VOICE\s+\S/im.test(String(text || ''));
}

// What is said, without directions, effects, sounds or settings:
// "Mia: Forty minutes? You're joking!" (parts keep their "--- Part 2" line).
function cleanListeningTranscript(text) {
  const script = parseListeningScript(text);
  const out = [];
  script.parts.forEach((p, i) => {
    if (p.label || i > 0) out.push(`--- ${p.label || `Part ${i + 1}`}`);
    p.items.forEach((it) => {
      if (it.type === 'line') out.push(`${it.speakers.join(' and ')}: ${it.text}`);
    });
  });
  return out.join('\n');
}

// What the AI must know to write a script the studio can produce with no
// further work (used by the listening prompt's "The AI writes the script").
const LISTENING_SCRIPT_RULES = [
  'The recording is made from your script by Qwen3-TTS, with no human help: everything the studio needs must be in the script. Each voice is made from its VOICE description and says exactly the words written. Voices stay the same from line to line, so the words themselves must carry the emotion (directions add to it). It can\'t laugh, sigh, cough or make sound effects by itself: the studio adds only the sounds and effects listed here.',
  `Start with the settings: "TITLE: …" (a short, catchy name for the recording, 2–5 words, in the language of the recording: it names the MP3), "LANGUAGE: …" (one of ${LISTENING_SCRIPT_LANGUAGES.join(', ')}), and "AMBIENCE: …" for the background that fits the place (${LISTENING_SCRIPT_AMBIENCES.join(', ')}).`,
  'Then one "VOICE Name: description" line for every character, before their first line: gender, age, accent, voice quality (deep, warm, husky, clear), pace and personality, describing their everyday speaking voice (calm, not an emotion). Adults as adults; teenagers as "a young woman / a young man of about 18–19", never "girl", "boy", "child", "little", "cute" or "youthful" unless the character is a child. Make the voices easy to tell apart: mix genders, ages, accents and pitch (a deep older man, a bright young woman…).',
  'Add an effect to a VOICE line when that character is always heard through it: "VOICE Mum [phone]: …" for the other end of a phone call, "[PA]" for a station, airport or shop announcer, "[radio]" for a radio presenter, "[far]" for someone calling from a distance. Use it on a single line instead when only that line is affected: "Tom [far] (shouting): Over here!".',
  'Speech lines: "Name (direction): text". The direction is short, in English, about delivery only: emotion, manner, pace or volume ("surprised, voice rising", "whispering", "out of breath", "heavy sarcasm, slow", "laughing as she speaks"). Give one whenever the line isn\'t neutral; never describe actions ("opens the door").',
  'Make it sound like real people: fillers ("um", "well...", "I mean"), "..." for hesitation, short reactions, people interrupting and finishing each other\'s sentences. Start a line with ">>" when it interrupts the previous one; write "Mia + Tom: …" when two people say the same thing at once. Laughter goes in the direction ("(laughing)"), never as text ("haha") or a tag.',
  'Sounds, each on its own line: [chime] before an announcement, [ring] before a phone call, [beep] for a signal, [pause N] for N seconds of silence (a scene change). No other sounds or tags exist.',
  'At most about 30 words per line: split a longer speech into several lines of the same speaker.',
  'Write numbers, times, prices, dates and spellings as they are said: "ten fifteen", "four pounds fifty", "the twenty-third of May", "that\'s S-M-I-T-H". The questions\' accepted answers include the digits too.',
  'Every answer must be said clearly: never in an interrupted (">>") or simultaneous line, never under an effect that hides it ([far], [radio]), and never only in a sound.',
  'Only the recording itself: no title or instruction read aloud ("Part two. You will hear…": PinPlay can read the section\'s instruction itself), no "Now listen again", no repeated passage, no questions read aloud.',
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LISTENING_SCRIPT_SOUNDS, LISTENING_SCRIPT_EFFECTS, LISTENING_SCRIPT_AMBIENCES, LISTENING_SCRIPT_LANGUAGES,
    parseListeningScript, isListeningScript, cleanListeningTranscript, LISTENING_SCRIPT_RULES,
  };
}
