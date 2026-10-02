const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// The AI creation prompt (app.js buildCreationPrompt): lean, complete for every
// allowed question type, consistent with the request, and with examples the
// server's own quiz cleaner (worker.js normalizeQuiz) keeps.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

let A;
let W;
before(() => {
  A = loadDeclarations(read('app.js'), [
    'QUESTION_TYPE_CATALOG', 'CANONICAL_QUESTION_TYPES', 'TEMPLATE_ALL_13_TYPES',
    'CEFR_LEVELS', 'ADAPTIVE_DEFAULT_LEVEL_SHARES', 'adaptiveDefaultLevelCounts', 'SCAFFOLD_ORDER', 'buildAdaptiveLevelRules',
    'pickPromptExamples', 'TEACHER_GRADED_TYPES', 'PROMPT_VOICE', 'PROMPT_TYPE_FIELDS', 'PROMPT_EXAMPLE_FIELDS', 'PROMPT_EXAMPLE_CEFR',
    'shapePromptExample', 'promptMediaRules', 'buildCreationPrompt', 'toSafeFilename',
  ]);
  W = loadDeclarations(read('cloudflare/worker.js'), [
    'CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', 'round', 'randomId', 'normalizeTimeLimitValue', 'minTimeByType',
    'normalizeQuestionMedia', 'normalizeTextAnswer', 'tokenizeWords', 'tokenEditDistance', 'getCorrectedVariantsList',
    'countErrorHuntRequiredTokens', 'normalizeWordle', 'LISTENING_SECTION_TYPES', 'LISTENING_MAX_SECTIONS', 'LISTENING_DEFAULT_PLAYS', 'sanitizeListeningSectionId', 'normalizeListeningAudio', 'normalizeListeningSectionList', 'assignListeningMembership', 'stripListeningQuestionMedia', 'normalizeListeningSections', 'normalizeQuiz', 'detectQuestionMediaProvider', 'contextGapList',
  ], { crypto: require('node:crypto').webcrypto });
});

const base = {
  theme: 'Spanish verbs: present tense', language: 'Spanish', goal: 'More learning (scaffolded)',
  timeLimit: 0, questionCount: 20, batchSize: 0,
  images: 'gifs', audio: 'some', video: 'no', readingText: 'no',
  typesMode: 'exclude_teacher_graded', selectedTypes: [], aiMode: 'chatbot',
};
const build = (over = {}) => A.buildCreationPrompt({ ...base, ...over }).text;
const section = (text, name) => {
  const start = text.indexOf(`## ${name}\n`);
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 3);
  return text.slice(start, next < 0 ? undefined : next);
};
const examplesOf = (text) => {
  const block = section(text, 'Examples');
  return JSON.parse(block.slice(block.indexOf('```json') + 7, block.lastIndexOf('```')));
};
const fieldTypes = (text) => section(text, 'Question fields').split('\n')
  .filter((l) => l.startsWith('- ')).map((l) => l.slice(2, l.indexOf(':')));

describe('question types', () => {
  const allTypes = () => [...A.CANONICAL_QUESTION_TYPES];

  it('names the fields of every allowed type, and only those', () => {
    const cases = [
      [{ typesMode: 'exclude_teacher_graded' }, allTypes().filter((t) => !A.TEACHER_GRADED_TYPES.includes(t))],
      [{ typesMode: 'all' }, allTypes()],
      [{ typesMode: 'include', selectedTypes: ['text', 'context_gap'] }, ['text', 'context_gap']],
      [{ typesMode: 'ai_choice' }, allTypes()],
    ];
    cases.forEach(([over, expected]) => {
      const types = fieldTypes(build(over));
      assert.deepEqual(types.slice().sort(), expected.slice().sort(), JSON.stringify(over));
      types.forEach((t) => assert.ok(A.PROMPT_TYPE_FIELDS[t], `no field line for ${t}`));
    });
  });

  it('"Exclude teacher-corrected" leaves out every teacher-graded type, image_open included', () => {
    const types = fieldTypes(build({ typesMode: 'exclude_teacher_graded' }));
    ['open', 'speaking', 'voice_record', 'image_open'].forEach((t) => assert.ok(!types.includes(t), t));
  });

  it('says how many types to use for each mode', () => {
    assert.match(build({ typesMode: 'ai_choice' }), /choose the ones that best fit the goal, from/);
    assert.match(build({ typesMode: 'include', selectedTypes: ['text', 'tf'] }), /use each of these at least once, and no others: tf, text/);
    assert.match(build({ typesMode: 'all', questionCount: 5 }), /fewer questions than types/);
    assert.match(build({ typesMode: 'all' }), /\(pin only if something in the theme fits it\)/);
    assert.match(build({ typesMode: 'exclude_teacher_graded' }), /use only mcq, multi/);
  });

  it('gets the shapes bots got wrong right', () => {
    const f = A.PROMPT_TYPE_FIELDS;
    assert.match(f.puzzle, /CORRECT order/);
    assert.match(f.text, /"accepted"/);
    assert.match(f.text, /not "answers"/);
    assert.match(f.error_hunt, /"correctedVariants"/);
    assert.match(f.error_hunt, /Always list the alternatives/);
    assert.match(f.error_hunt, /"They don't see it\.", "He doesn't see it\.", "She doesn't see it\."/);
    assert.match(f.slider, /"min", "max", "target"/);
    assert.match(f.match_pairs, /"pairs": \[\{"left"/);
    assert.match(f.wordle, /exactly "Guess the word\."/);
  });
});

describe('rules follow the request', () => {
  it('GIF mode asks for gifKeyword, and pin still gets a still picture', () => {
    const text = build({ images: 'gifs' });
    assert.match(section(text, 'Rules'), /"gifKeyword"/);
    assert.match(section(text, 'Rules'), /Pin questions use "imageKeyword" instead/);
    examplesOf(text).forEach((ex) => {
      if (ex.type !== 'pin') assert.equal(ex.imageKeyword, undefined, `${ex.id} has an imageKeyword in GIF mode`);
    });
  });

  it('no pictures, no audio, no video: none of those fields or rules', () => {
    const text = build({ images: 'no', audio: 'no', video: 'no', typesMode: 'include', selectedTypes: ['mcq', 'text'] });
    assert.doesNotMatch(text, /videoKeyword|audioText|readingText/);
    assert.match(section(text, 'Rules'), /No pictures: leave out "imageKeyword" and "gifKeyword"\./);
    examplesOf(text).forEach((ex) => {
      assert.equal(ex.imageKeyword, undefined);
      assert.equal(ex.audioEnabled, undefined);
    });
  });

  it('audio: one rule with the voice format, and matching examples', () => {
    const text = build({ audio: 'some' });
    const rules = section(text, 'Rules');
    assert.equal((rules.match(/Audio:/g) || []).length, 1);
    assert.match(rules, /es-ES-ElviraNeural/);
    assert.match(rules, /"blank"/);
    assert.ok(examplesOf(text).some((ex) => ex.audioEnabled === true && ex.audioText));
  });

  it('every question gets the requested time limit (a missing one would default to 20 s)', () => {
    const text = build({ timeLimit: 30 });
    assert.match(section(text, 'Rules'), /"timeLimit": 30/);
    examplesOf(text).forEach((ex) => assert.equal(ex.timeLimit, 30));
  });

  it('adaptive: a Levels section and a level on every example', () => {
    const text = build({ adaptive: true, levelNotes: 'more typing at higher levels' });
    assert.match(section(text, 'Levels'), /"cefr"/);
    assert.match(section(text, 'Levels'), /Follow the teacher's notes on levels \(above\)/);
    assert.match(section(text, "The teacher's own words"), /- Notes on levels: "more typing at higher levels"/);
    assert.match(section(text, 'Question fields'), /"timeLimit", "cefr"/);
    examplesOf(text).forEach((ex) => assert.ok(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(ex.cefr)));
    assert.equal(section(build(), 'Levels'), '');
  });

  it('adaptive: says what each language level means and forbids easy C1/C2', () => {
    const levels = section(build({ adaptive: true }), 'Levels');
    assert.match(levels, /Make the difficulty real, not just the label/);
    assert.match(levels, /producing language \(typing an answer, correcting errors, filling gaps from memory\) suits higher levels/);
    assert.match(levels, /A1 = very common words/);
    // A grammar point can be taught at any level: no tense is tied to one.
    assert.match(levels, /any tense or structure the quiz works on can appear at every level/);
    assert.doesNotMatch(levels, /present simple|present perfect|conditional|reported speech|passive,/);
    assert.match(levels, /C2 = rare words/);
    assert.match(levels, /Never tag an easy question C1 or C2/);
  });

  it('adaptive: ranks every question type by scaffolding', () => {
    assert.deepEqual([...A.SCAFFOLD_ORDER].sort(), [...A.CANONICAL_QUESTION_TYPES].sort());
  });

  it('adaptive: lists only this quiz\'s types, most scaffolded first, as a tendency', () => {
    const levels = section(build({ adaptive: true, typesMode: 'include', selectedTypes: ['open', 'mcq', 'context_gap', 'tf'] }), 'Levels');
    assert.match(levels, /most to least scaffolded: tf, mcq, context_gap, open\. Lean towards the first ones at lower levels/);
    assert.match(levels, /a tendency, not a rule/);
    // One type: nothing to rank.
    assert.doesNotMatch(section(build({ adaptive: true, typesMode: 'include', selectedTypes: ['mcq'] }), 'Levels'), /scaffolded/);
  });

  it('adaptive: every example is tagged at its real level, never above B1', () => {
    // The template questions are all easy; tagging them by position once showed
    // "I went to the ____" as B2, and bots copied that.
    A.TEMPLATE_ALL_13_TYPES.questions.forEach((q) => {
      assert.ok(A.PROMPT_EXAMPLE_CEFR[q.id], `${q.id} has no real level`);
      assert.ok(['A1', 'A2', 'B1'].includes(A.shapePromptExample(q, { ...base, adaptive: true }, 1).cefr), q.id);
    });
  });

  it('asks for a downloadable .json file, or else one json code block', () => {
    const text = build();
    assert.match(text, /downloadable file named "spanish-verbs-present-tense\.json"/);
    assert.match(text, /otherwise put it in one ```json code block/);
    assert.doesNotMatch(text, /no code fences/);
    assert.match(build({ questionCount: 40, batchSize: 10 }), /-part1\.json" \(part2, part3/);
  });

  it('batches and brief counts', () => {
    assert.match(build({ questionCount: 40, batchSize: 10 }), /in batches of 10, one JSON object per batch/);
    const brief = build({ questionCount: 'about 50 minutes' });
    assert.match(section(brief, 'Task'), /decide how many from the teacher's brief \(above\)/);
    assert.match(section(brief, "The teacher's own words"), /- How many questions: "about 50 minutes"/);
  });

  it('agent mode: check facts, embed the real picture, same fields and examples', () => {
    const text = build({ aiMode: 'agent', images: 'some' });
    assert.match(section(text, 'Rules'), /reliable source/);
    assert.match(section(text, 'Rules'), /base64 "imageData"/);
    assert.deepEqual(fieldTypes(text), fieldTypes(build()));
    assert.match(A.buildCreationPrompt({ ...base, aiMode: 'agent' }).filename, /^prompt-agent-/);
  });

  it('what the teacher typed wins over the rest, except the JSON format', () => {
    for (const mode of ['chatbot', 'agent']) {
      const first = section(build({ aiMode: mode }), 'Rules').split('\n').find((l) => /^\d+\. /.test(l));
      assert.match(first, /^1\. The teacher's own words \(the section above\) come first/, mode);
      assert.match(first, /\(the section above\) come first: if they contradict anything else in these instructions, follow the teacher/);
      assert.match(first, /Only the JSON format and the field names below stay fixed/);
    }
  });

  it('puts only what the teacher typed, quoted, in its own section', () => {
    const typed = build({ goal: 'Past simple at A1, lots of speaking', goalIsCustom: true, level: 'Grade 5' });
    const own = section(typed, "The teacher's own words");
    assert.match(own, /- Theme: "Spanish verbs: present tense"/);
    assert.match(own, /- Language of the quiz: "Spanish"/);
    assert.match(own, /- Goal: "Past simple at A1, lots of speaking"/);
    assert.match(own, /- Level: "Grade 5"/);
    assert.doesNotMatch(section(typed, 'Task'), /Goal:|Theme:/);
    // A goal picked from the dropdown is PinPlay's wording: it stays in Task.
    const picked = build();
    assert.doesNotMatch(section(picked, "The teacher's own words"), /Goal:/);
    assert.match(section(picked, 'Task'), /- Goal: More learning \(scaffolded\)/);
    // The section comes before Task and Rules.
    assert.ok(picked.indexOf("## The teacher's own words") < picked.indexOf('## Task'));
  });

  it('custom media: the teacher\'s wording goes in their section, the widest field format in Rules', () => {
    const text = build({
      images: 'custom', readingText: 'custom', audio: 'no',
      mediaCustom: { images: 'mostly images, a GIF here and there', readingText: 'the grammar rule needed, on every A1–A2 question' },
    });
    const own = section(text, "The teacher's own words");
    assert.match(own, /- Images: "mostly images, a GIF here and there"/);
    assert.match(own, /- Reading text: "the grammar rule needed, on every A1–A2 question"/);
    const rules = section(text, 'Rules');
    assert.match(rules, /"imageKeyword"/);
    assert.match(rules, /"gifKeyword"/);
    assert.match(rules, /"readingText"/);
    assert.match(rules, /For pictures, reading text: how much and on which questions is what the teacher typed \(above\)/);
    assert.doesNotMatch(rules, /Audio:/);
  });

  it('marks where the teacher\'s words end, and repeats their priority at the very end', () => {
    const text = build();
    assert.match(section(text, "The teacher's own words"), /Everything after this section is PinPlay's general instructions/);
    const last = text.trim().split('\n').pop();
    assert.match(last, /^Before you write: re-read "The teacher's own words" at the top\..*follow the teacher/);
  });

  it('custom media with nothing typed, or text left behind by another choice, is ignored', () => {
    const empty = build({ images: 'custom', mediaCustom: { images: '  ' } });
    assert.match(section(empty, 'Rules'), /No pictures/);
    const stale = build({ images: 'some', mediaCustom: { images: 'old text' } });
    assert.doesNotMatch(stale, /old text/);
    assert.doesNotMatch(section(stale, 'Rules'), /how much and on which questions/);
  });

  it('states each rule once', () => {
    const rules = section(build({ audio: 'some', video: 'some', readingText: 'some', images: 'mix' }), 'Rules')
      .split('\n').filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, '').split(':')[0]);
    assert.equal(new Set(rules).size, rules.length, rules.join(' | '));
  });
});

describe('size', () => {
  it('stays short even with every question type', () => {
    const sizes = {
      default: build().length,
      allTypes: build({ typesMode: 'all' }).length,
      adaptiveAll: build({ typesMode: 'all', adaptive: true, audio: 'some', video: 'some', readingText: 'some', images: 'mix' }).length,
      twoTypes: build({ typesMode: 'include', selectedTypes: ['text', 'context_gap'] }).length,
    };
    assert.ok(sizes.default < 9000, JSON.stringify(sizes));
    assert.ok(sizes.allTypes < 10000, JSON.stringify(sizes));
    assert.ok(sizes.adaptiveAll < 12000, JSON.stringify(sizes));
    assert.ok(sizes.twoTypes < 5000, JSON.stringify(sizes));
  });
});

// What each auto-graded type needs to be gradable once the server has cleaned it.
const GRADABLE = {
  mcq: (q) => q.answers.filter((a) => a.correct).length === 1,
  multi: (q) => q.answers.filter((a) => a.correct).length >= 2,
  tf: (q) => q.answers.filter((a) => a.correct).length === 1,
  text: (q) => q.accepted.length > 0,
  voice_text: (q) => q.accepted.length > 0,
  context_gap: (q) => q.gaps.length === (q.prompt.match(/_{3,}/g) || []).length,
  match_pairs: (q) => q.pairs.length >= 2,
  error_hunt: (q) => !!q.corrected && q.correctedVariants.includes(q.corrected),
  puzzle: (q) => q.items.length >= 3,
  slider: (q) => Number.isFinite(q.target) && q.min < q.max,
  pin: (q) => q.zones.length > 0,
  spellingbee: (q) => q.words.length > 0,
  wordle: (q) => q.word.length >= 5,
};

describe('examples are valid PinPlay questions', () => {
  it('the server keeps every example and each one is gradable', () => {
    const req = { ...base, typesMode: 'all', images: 'some', adaptive: true };
    const all = A.TEMPLATE_ALL_13_TYPES.questions.map((q, i) => A.shapePromptExample(q, req, i));
    const picked = examplesOf(A.buildCreationPrompt(req).text);
    // pin is only kept with a picture; the app fills imageData from imageKeyword on save.
    const withPicture = (q) => (q.type === 'pin' ? { ...q, imageData: 'data:image/png;base64,AAAA' } : q);
    const quiz = W.normalizeQuiz({ title: 'Examples', questions: [...all, ...picked].map(withPicture) });
    assert.equal(quiz.questions.length, all.length + picked.length);
    assert.deepEqual(new Set(quiz.questions.map((q) => q.type)), new Set(A.CANONICAL_QUESTION_TYPES));
    quiz.questions.forEach((q) => {
      assert.ok(A.CEFR_LEVELS.includes(q.cefr), `${q.id} level`);
      if (GRADABLE[q.type]) assert.ok(GRADABLE[q.type](q), `${q.id} is not gradable: ${JSON.stringify(q)}`);
    });
  });
});
