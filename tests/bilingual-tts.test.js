const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractDeclaration, loadDeclarations } = require('./helpers/extract-declaration');

// Bilingual question audio (BILINGUAL_TTS_PLAN.md): "[ca] Escolta. [en] She has
// lived here." is said in two voices. One splitter on the teacher page, the
// student page and the server; the server joins one Edge clip per segment.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SHARED = ['TTS_TAG_VOICES', 'splitTtsSegments'];
const plain = (v) => JSON.parse(JSON.stringify(v));
const split = (text, voice) => plain(W.splitTtsSegments(text, voice));

let W;
let A;
// The server's sandbox: its `fetch` is swapped per test.
const server = { fetch: null, TextEncoder, TextDecoder };
before(() => {
  W = loadDeclarations(read('cloudflare/worker.js'), [...SHARED, 'synthesizeEdgeMp3'], server);
  A = loadDeclarations(read('app.js'), [
    'QUESTION_TYPE_CATALOG', 'CANONICAL_QUESTION_TYPES', 'TEMPLATE_ALL_13_TYPES',
    'CEFR_LEVELS', 'BUILDUP_MAX_STEPS', 'SCAFFOLD_ORDER', 'buildAdaptiveLevelRules',
    'pickPromptExamples', 'TEACHER_GRADED_TYPES', 'PROMPT_VOICE', 'PROMPT_BILINGUAL_AUDIO', 'PROMPT_TYPE_FIELDS', 'PROMPT_EXAMPLE_FIELDS', 'PROMPT_EXAMPLE_CEFR',
    'shapePromptExample', 'promptAudioRules', 'promptMediaRules', 'PROMPT_BATCH_MAX', 'buildCreationPrompt', 'toSafeFilename', 'normalizeCefr', 'normalizeClimbStep', 'climbStepsOf',
    'BUILDUP_PROMPT_TYPES', 'BUILDUP_PROMPT_DEFAULT_STEPS', 'BUILDUP_PROMPT_DEFAULT_ITEMS', 'BUILDUP_PROMPT_MAX_ITEMS', 'buildupPromptBatches', 'buildupPromptSize',
    'BUILDUP_PROMPT_TYPE_FIELDS', 'BUILDUP_PROMPT_EXAMPLE', 'buildupPromptNumber', 'buildBuildupPrompt', 'STEPS_PLAN_LEVELS', 'normalizeStepsPlan',
  ]);
});

describe('one splitter everywhere', () => {
  it('is identical on the teacher page, the student page and the server', () => {
    const app = read('app.js');
    const play = read('play.js');
    const worker = read('cloudflare/worker.js');
    SHARED.forEach((name) => {
      assert.equal(extractDeclaration(app, name), extractDeclaration(worker, name), name);
      assert.equal(extractDeclaration(play, name), extractDeclaration(worker, name), name);
    });
  });
});

describe('splitTtsSegments', () => {
  it('leaves a text without tags in the question\'s voice', () => {
    assert.deepEqual(split('She has lived here.', 'en-GB-SoniaNeural'),
      [{ text: 'She has lived here.', voice: 'en-GB-SoniaNeural' }]);
  });

  it('switches the voice at each tag and keeps the untagged start in the question\'s voice', () => {
    assert.deepEqual(split('Listen. [ca] Escolta i tria. [en] She has lived here since 2010.', 'en-US-AriaNeural'), [
      { text: 'Listen.', voice: 'en-US-AriaNeural' },
      { text: 'Escolta i tria.', voice: 'ca-ES-JoanaNeural' },
      { text: 'She has lived here since 2010.', voice: 'en-US-AriaNeural' },
    ]);
  });

  it('a tag of the question\'s own language keeps the question\'s own voice', () => {
    const segs = split('[ca] Escolta. [en] She goes to school.', 'en-GB-SoniaNeural');
    assert.deepEqual(segs.map((s) => s.voice), ['ca-ES-JoanaNeural', 'en-GB-SoniaNeural']);
  });

  it('takes a voice id as a tag, and keeps the voice on a tag it does not know', () => {
    const segs = split('[es-ES-ElviraNeural] Hola. [zz] Hello.', 'en-US-AriaNeural');
    assert.deepEqual(segs, [{ text: 'Hola.', voice: 'es-ES-ElviraNeural' }, { text: 'Hello.', voice: 'en-US-AriaNeural' }]);
  });

  it('is not fooled by tags in any case, drops empty segments and tidies spaces', () => {
    const segs = split('  [CA]  Escolta.\n[en] [fr] Bonjour.  ', 'en-US-AriaNeural');
    assert.deepEqual(segs, [{ text: 'Escolta.', voice: 'ca-ES-JoanaNeural' }, { text: 'Bonjour.', voice: 'fr-FR-DeniseNeural' }]);
    assert.deepEqual(split('   ', 'en-US-AriaNeural'), []);
  });

  it('does not read brackets that are not language tags as tags', () => {
    assert.deepEqual(split('Choose [1] or [two].', 'en-US-AriaNeural'),
      [{ text: 'Choose [1] or [two].', voice: 'en-US-AriaNeural' }]);
  });
});

describe('the server joins one Edge clip per segment', () => {
  const env = { EDGE_TTS_URL: 'https://bridge.test/tts', EDGE_TTS_SECRET: 's3' };
  const bytes = (s) => new TextEncoder().encode(s);
  const fakeFetch = (calls, fail) => async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, auth: init.headers.Authorization, ...body });
    if (fail && body.voice === fail) return { ok: false, status: 502, text: async () => '{"detail":"down"}' };
    return { ok: true, status: 200, headers: { get: () => 'audio/mpeg' }, arrayBuffer: async () => bytes(`<${body.voice}:${body.text}>`).buffer };
  };

  it('asks the bridge once per segment, in order, and returns the bytes joined', async () => {
    const calls = [];
    server.fetch = fakeFetch(calls);
    const made = await W.synthesizeEdgeMp3(env, '[ca] Escolta. [en] Listen.', 'en-US-AriaNeural', '+0%');
    assert.equal(made.ok, true);
    assert.deepEqual(calls.map((c) => [c.voice, c.text, c.rate, c.auth]), [
      ['ca-ES-JoanaNeural', 'Escolta.', '+0%', 'Bearer s3'],
      ['en-US-AriaNeural', 'Listen.', '+0%', 'Bearer s3'],
    ]);
    assert.equal(new TextDecoder().decode(made.audio), '<ca-ES-JoanaNeural:Escolta.><en-US-AriaNeural:Listen.>');
    assert.equal(made.contentType, 'audio/mpeg');
  });

  it('a plain text is one call, as before', async () => {
    const calls = [];
    server.fetch = fakeFetch(calls);
    const made = await W.synthesizeEdgeMp3(env, 'Listen.', 'en-GB-SoniaNeural', '-10%');
    assert.equal(made.ok, true);
    assert.deepEqual(calls.map((c) => [c.voice, c.text, c.rate]), [['en-GB-SoniaNeural', 'Listen.', '-10%']]);
    assert.equal(new TextDecoder().decode(made.audio), '<en-GB-SoniaNeural:Listen.>');
  });

  it('reports a failed segment with the bridge\'s reason, and a missing bridge', async () => {
    server.fetch = fakeFetch([], 'en-US-AriaNeural');
    const made = await W.synthesizeEdgeMp3(env, '[ca] Escolta. [en] Listen.', 'en-US-AriaNeural', '+0%');
    assert.deepEqual(plain(made), { ok: false, status: 502, error: 'down' });
    const none = await W.synthesizeEdgeMp3({}, 'Listen.', 'en-US-AriaNeural', '+0%');
    assert.equal(none.ok, false);
    assert.equal(none.status, 501);
    const empty = await W.synthesizeEdgeMp3(env, '  ', 'en-US-AriaNeural', '+0%');
    assert.equal(empty.status, 400);
  });
});

describe('the AI prompts ask for bilingual audio only when the teacher does', () => {
  const base = { theme: 'Present perfect', language: 'English', level: 'A2', goal: '', timeLimit: 0, questionCount: 10, images: 'no', video: 'no', readingText: 'no', typesMode: 'all', selectedTypes: [], aiMode: 'chatbot' };
  const climb = { skill: 'third person -s', language: 'English', level: 'A1', firstLanguage: 'Catalan', errors: '', steps: 4, itemsPerStep: 4, selectedTypes: ['mcq'], notes: 'short sentences', aiMode: 'chatbot' };

  it('standard prompt: the rule, the example and the teacher\'s instructions', () => {
    const { text } = A.buildCreationPrompt({ ...base, audio: 'bilingual', audioInstructions: 'ask in Catalan, read the sentence in English' });
    assert.match(text, /Audio, bilingual: every question has "audioEnabled": true and "audioText"/);
    assert.ok(text.includes('[ca] Escolta la frase i tria el temps verbal correcte. [en] She has lived in Girona since 2010.'));
    assert.match(text, /- Audio instructions: "ask in Catalan, read the sentence in English"/);
    assert.match(text, /"ttsLanguage": "EN", "CA" or "FR"/);
  });

  it('every word of the quiz language is tagged, even one inside an explanation', () => {
    [A.buildCreationPrompt({ ...base, audio: 'bilingual' }).text, A.buildBuildupPrompt({ ...climb, audio: 'bilingual' }).text].forEach((text) => {
      assert.match(text, /EVERY word of the quiz language gets its own tag, even one word quoted inside an explanation/);
      assert.ok(text.includes('Wrong: "[ca] Amb I fem servir am." Right: "[ca] Amb [en] I [ca] fem servir [en] am."'));
      assert.match(text, /reread every "audioText" and tag any quiz-language word/);
      assert.ok(text.includes('it never says the answer: read a gap as "blank", never ___ ("[en] I blank happy.")'));
    });
  });

  it('the rule\'s own examples split as it says', () => {
    const voices = (t) => split(t, 'en-US-AriaNeural').map((x) => [x.voice.slice(0, 2), x.text]);
    assert.deepEqual(voices('[ca] Amb [en] I [ca] fem servir [en] am.'), [['ca', 'Amb'], ['en', 'I'], ['ca', 'fem servir'], ['en', 'am.']]);
    assert.deepEqual(voices('[ca] Amb I fem servir am.'), [['ca', 'Amb I fem servir am.']]);
  });

  it('standard prompt: without instructions, no quoted line', () => {
    const { text } = A.buildCreationPrompt({ ...base, audio: 'bilingual' });
    assert.match(text, /Audio, bilingual:/);
    assert.doesNotMatch(text, /- Audio instructions:/);
  });

  it('prompts without it say nothing about tags; the adaptive one carries it', () => {
    ['no', 'quiz'].forEach((audio) => {
      const { text } = A.buildCreationPrompt({ ...base, audio });
      assert.doesNotMatch(text, /bilingual/i);
      assert.ok(!text.includes('[ca]'));
    });
    const { text } = A.buildCreationPrompt({ ...base, adaptive: true, steps: 4, audio: 'bilingual' });
    assert.match(text, /Audio, bilingual:/);
  });

  it('climb prompt: no audio unless asked, then the same rule', () => {
    const off = A.buildBuildupPrompt(climb).text;
    assert.match(off, /No generated audio on any question or teaching slide/);
    assert.doesNotMatch(off, /bilingual/i);
    ['audio', 'bilingualAudio'].forEach((key) => {
      const on = A.buildBuildupPrompt({ ...climb, [key]: key === 'audio' ? 'bilingual' : true }).text;
      assert.match(on, /Audio, bilingual: every question has "audioEnabled": true/);
      assert.match(on, /Use the students' first language specified by the teacher\./);
      assert.match(on, /- The students' first language: "Catalan"/);
    });
  });
});

describe('the pages', () => {
  it('the create page offers Bilingual audio, and the French is there', () => {
    const html = read('create/index.html');
    assert.match(html, /<select id="promptAudio">[\s\S]*?value="bilingual"/);
    const vm = require('node:vm');
    const dict = (() => { const w = {}; vm.runInNewContext(read('i18n-fr.js'), { window: w }); return w.PINPLAY_FR_DICT; })();
    [...html.matchAll(/<option value="bilingual" data-i18n>([^<]+)<\/option>/g)].forEach((m) => assert.ok(dict[m[1]], `no French for: ${m[1]}`));
  });

  it('the student page speaks the segments in order as its last resort', () => {
    const play = read('play.js');
    assert.match(play, /function speakTtsSegmentsInBrowser\(text, voice\)/);
    assert.match(play, /speakTtsSegmentsInBrowser\(text, question\.language \|\| 'en-US'\)/);
  });
});
