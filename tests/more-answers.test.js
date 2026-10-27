const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// ✅ More answers (app.js): the second AI pass that adds correct answers the
// accepted lists miss. The prompt, reading the reply, what it would add and
// adding it, then the server grading the added answers. Runs the REAL code.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));
const interpolate = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

let A;
let W;
before(() => {
  A = loadDeclarations(read('app.js'), [
    'MORE_ANSWERS_TYPES', 'MORE_ANSWERS_LIMITS', 'MORE_ANSWERS_ANGLES', 'moreAnswersCurrent', 'moreAnswersRecordingText', 'moreAnswersEdits', 'moreAnswersHeard', 'moreAnswersPromptEntry',
    'buildMoreAnswersPrompt', 'parseMoreAnswersReply', 'planMoreAnswers', 'applyMoreAnswers',
    'contextGapList', 'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'tokenizeWords', 'normalizeTextAnswer', 'toSafeFilename',
  ], { t: interpolate, ...(({ isListeningScript, cleanListeningTranscript }) => ({ isListeningScript, cleanListeningTranscript }))(require('../listening-script.js')) });
  W = loadDeclarations(read('cloudflare/worker.js'), [
    'CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', 'round', 'randomId', 'normalizeTimeLimitValue', 'minTimeByType',
    'normalizeQuestionMedia', 'normalizeTextAnswer', 'stripDiacritics', 'tokenizeWords', 'tokenEditDistance', 'getCorrectedVariantsList',
    'countErrorHuntRequiredTokens', 'normalizeWordle', 'LISTENING_SECTION_TYPES', 'LISTENING_MAX_SECTIONS', 'LISTENING_DEFAULT_PLAYS', 'LISTENING_MAX_TRANSCRIPT', 'sanitizeListeningSectionId', 'normalizeListeningAudio', 'normalizeListeningSectionList', 'LISTENING_MAX_CUES', 'LISTENING_MAX_CUE_TEXT', 'normalizeListeningCues', 'normalizeListeningHeard', 'assignListeningMembership', 'stripListeningQuestionMedia', 'normalizeListeningSections', 'normalizeQuiz', 'BUILDUP_MAX_STEPS', 'normalizeClimbStep', 'STEPS_PLAN_LEVELS', 'normalizeStepsPlan', 'detectQuestionMediaProvider', 'contextGapList',
    'parseAcceptedGapOptions', 'contextGapExpectedOptions', 'gradeContextGap', 'evaluate',
  ], { crypto: require('node:crypto').webcrypto });
});

const errorHunt = () => ({ id: 'q1-error', type: 'error_hunt', prompt: "He don't usually walk to school.", corrected: "He doesn't usually walk to school.", correctedVariants: ["He doesn't usually walk to school."] });
const typed = () => ({ id: 'q2-text', type: 'text', prompt: 'Another word for big?', accepted: ['large', '', ''] });
const gaps = () => ({ id: 'q3-gap', type: 'context_gap', prompt: 'I ____ (live) here ____ 2010.', gaps: ['have lived', 'since', '', ''] });
const voice = () => ({ id: 'q4-voice', type: 'voice_text', prompt: 'How many days are in a week?', accepted: ['seven'], answerLanguage: 'en-GB' });
const mcq = () => ({ id: 'q5-mcq', type: 'mcq', prompt: 'Pick one', answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] });

const block = (text, heading) => {
  const start = text.indexOf(`## ${heading}\n`);
  const body = text.slice(start, text.indexOf('\n## ', start + 3) >>> 0);
  const from = body.indexOf('\n```json\n') + 9;
  return JSON.parse(body.slice(from, body.indexOf('\n```', from)));
};

describe('the prompt', () => {
  it('lists each picked question by number with what is already accepted', () => {
    const items = [{ q: errorHunt(), n: 1 }, { q: typed(), n: 2 }, { q: gaps(), n: 3 }, { q: voice(), n: 4 }];
    const { text, filename } = A.buildMoreAnswersPrompt({ items, title: 'Present simple' });
    assert.deepEqual(plain(block(text, 'Questions')), [
      { n: 1, type: 'error_hunt', prompt: "He don't usually walk to school.", accepted: ["He doesn't usually walk to school."], edits: 1 },
      { n: 2, type: 'text', prompt: 'Another word for big?', accepted: ['large'] },
      { n: 3, type: 'context_gap', prompt: 'I ____ (live) here ____ 2010.', gaps: [['have lived'], ['since']] },
      { n: 4, type: 'voice_text', prompt: 'How many days are in a week?', accepted: ['seven'], answerLanguage: 'en-GB' },
    ]);
    assert.equal(filename, 'prompt-more-answers-present-simple.md');
    assert.match(text, /quiz "Present simple"/);
  });

  it('gives the angles of the picked types only', () => {
    const only = (q) => A.buildMoreAnswersPrompt({ items: [{ q, n: 1 }] }).text;
    const hunt = only(errorHunt());
    assert.match(hunt, /fixes the other word/);
    assert.match(hunt, /We don't usually walk to school\./);
    assert.doesNotMatch(hunt, /speech recognition/);
    assert.doesNotMatch(hunt, /context_gap/);
    const spoken = only(voice());
    assert.match(spoken, /speech recognition/);
    assert.doesNotMatch(spoken, /fixes the other word/);
    assert.doesNotMatch(spoken, /"edits"/);
    assert.match(only(gaps()), /under "gaps", by gap number/);
    assert.match(only(gaps()), /fills the gaps in the other order/);
    assert.match(only(gaps()), /gaps whose answers can swap places .* each take the other's answers/);
    assert.doesNotMatch(hunt, /- \(error_hunt/);
    const both = A.buildMoreAnswersPrompt({ items: [{ q: errorHunt(), n: 1 }, { q: typed(), n: 2 }] }).text;
    assert.match(both, /- \(error_hunt, language mistake\) The one who fixes the other word/);
    assert.match(both, /- \(error_hunt, wrong fact\) The one who makes it true with "not"/);
    assert.match(both, /- \(text\) The one who writes the full form/);
  });

  it('has angles for every type it works on', () => {
    A.MORE_ANSWERS_TYPES.forEach((type) => assert.ok(A.MORE_ANSWERS_ANGLES.some((a) => a.types.includes(type)), type));
  });

  it('gives a listening error hunt the wrong-fact angles only', () => {
    const sections = [{ id: 'ls1', transcript: 'Riyo: I was talking to my grandma.' }];
    const q = { ...errorHunt(), prompt: 'Riyo was talking to her dad on the phone earlier.', corrected: 'Riyo was talking to her grandma on the phone earlier.', correctedVariants: [], listeningSection: 'ls1' };
    const text = A.buildMoreAnswersPrompt({ items: [{ q, n: 6 }], sections }).text;
    ['says the right fact in other words', 'makes it true with "not"', 'corrects another part'].forEach((angle) => assert.ok(text.includes(angle), angle));
    ['fixes the other word', 'removes a word', 'picks another small word', 'language mistake', '(wrong fact)'].forEach((angle) => assert.ok(!text.includes(angle), angle));
    assert.match(text, /- error_hunt: the result is true, by its recording/);
    assert.match(text, /and so is an added "not"/);
  });

  it('lets the AI tell a language mistake from a wrong fact when there is no recording', () => {
    const text = A.buildMoreAnswersPrompt({ items: [{ q: errorHunt(), n: 1 }] }).text;
    assert.match(text, /An error_hunt sentence has a language mistake .* or a wrong fact/);
    assert.match(text, /- \(language mistake\) The one who fixes the other word/);
    assert.match(text, /- \(wrong fact\) The one who says the right fact in other words/);
    assert.match(text, /- error_hunt with a language mistake: the result is a correct, natural sentence/);
    assert.match(text, /- error_hunt with a wrong fact: the result is true/);
  });

  it('shows the reply on the real question numbers, with both shapes', () => {
    const items = [{ q: typed(), n: 2 }, { q: gaps(), n: 5 }, { q: errorHunt(), n: 9 }];
    const sample = block(A.buildMoreAnswersPrompt({ items }).text, 'Reply');
    assert.deepEqual(plain(sample.answers.map((e) => [e.n, Object.keys(e).sort().join()])), [[2, 'add,n'], [5, 'gaps,n'], [9, 'add,n']]);
    assert.deepEqual(plain(sample.answers[2].add), []);
  });

  it('keeps the gaps shape when the gap question is the last one', () => {
    const sample = block(A.buildMoreAnswersPrompt({ items: [{ q: typed(), n: 1 }, { q: gaps(), n: 2 }] }).text, 'Reply');
    assert.ok(sample.answers.find((e) => e.n === 2).gaps);
  });

  it('puts the teacher note first, only when there is one', () => {
    const items = [{ q: typed(), n: 1 }];
    assert.doesNotMatch(A.buildMoreAnswersPrompt({ items }).text, /teacher's note/);
    const text = A.buildMoreAnswersPrompt({ items, note: 'No American spellings.' }).text;
    assert.ok(text.indexOf('"No American spellings."') < text.indexOf('## Think like'));
  });

  it('passes on the reading text and what is heard', () => {
    const q = { ...typed(), readingText: 'Tom lives in a big house.', heard: { quote: 'a really big house', from: 1, to: 1 } };
    const [entry] = block(A.buildMoreAnswersPrompt({ items: [{ q, n: 1 }] }).text, 'Questions');
    assert.equal(entry.readingText, 'Tom lives in a big house.');
    assert.equal(entry.heard, 'a really big house');
    assert.doesNotMatch(A.buildMoreAnswersPrompt({ items: [{ q, n: 1 }] }).text, /## Recordings/);
  });

  it('sends a listening section\'s recording once, and the lines the teacher linked', () => {
    const sections = [{ id: 'ls1', title: 'Part 1', transcript: 'Anna: Can we do Sunday at half past ten?\nTom: Sure. At the library.', cues: [
      { s: 0, e: 2, who: 'Anna', text: 'Can we do Sunday at half past ten?' },
      { s: 2, e: 4, who: 'Tom', text: 'Sure. At the library.' },
    ] }];
    const when = { ...typed(), prompt: 'What time will they meet?', accepted: ['10:30'], listeningSection: 'ls1', heard: { from: 0, to: 0, by: 'teacher' } };
    const where = { ...typed(), prompt: 'Where will they meet?', accepted: ['the library'], listeningSection: 'ls1', heard: { quote: 'At the library.' } };
    const { text } = A.buildMoreAnswersPrompt({ items: [{ q: when, n: 3 }, { q: where, n: 4 }], sections });
    assert.equal(text.split('### R1: Part 1').length, 2);
    assert.match(text, /```text\nAnna: Can we do Sunday at half past ten\?\nTom: Sure\. At the library\.\n```/);
    assert.ok(text.indexOf('## Recordings') < text.indexOf('## Questions'));
    assert.deepEqual(plain(block(text, 'Questions').map((e) => [e.recording, e.heard])), [
      ['R1', 'Anna: Can we do Sunday at half past ten?'], ['R1', 'At the library.'],
    ]);
    assert.match(text, /agrees with what is said in the recording/);
  });

  it('sends only the spoken lines of a studio script, else the subtitles', () => {
    const script = 'TITLE: Change of plan\nVOICE Anna: A calm woman in her twenties.\nVOICE Tom [phone]: A relaxed man.\n\n[ring]\nAnna (pleased): Hi Tom!\nTom: Not Saturday, sorry.';
    const sections = [
      { id: 'studio', title: 'Phone call', transcript: script },
      { id: 'subs', cues: [{ s: 0, e: 1, who: '', text: 'The train to Leeds leaves from platform two.' }] },
      { id: 'silent', title: 'Nothing yet' },
      { id: 'fenced', transcript: '```\nMia: See you at nine.\n```' },
    ];
    const items = ['studio', 'subs', 'silent', 'fenced'].map((id, i) => ({ q: { ...typed(), listeningSection: id }, n: i + 1 }));
    const { text } = A.buildMoreAnswersPrompt({ items, sections });
    assert.match(text, /### R1: Phone call\n```text\nAnna: Hi Tom!\nTom: Not Saturday, sorry\.\n```/);
    assert.doesNotMatch(text, /VOICE|calm woman|\[ring\]/);
    assert.match(text, /### R2\n```text\nThe train to Leeds leaves from platform two\.\n```/);
    assert.match(text, /### R3\n```text\nMia: See you at nine\.\n```/);
    assert.deepEqual(plain(block(text, 'Questions').map((e) => e.recording || '')), ['R1', 'R2', '', 'R3']);
  });
});

describe('reading the reply', () => {
  it('finds the JSON in a code block with text around it', () => {
    const reply = 'Here you go:\n```json\n{"answers": [{"n": 1, "add": [{"answer": "We don\'t usually walk to school.", "why": "the subject"}]}, {"n": 2, "add": []}]}\n```\nHope it helps!';
    assert.deepEqual(plain(A.parseMoreAnswersReply(reply)), [
      { key: '1', add: [{ answer: "We don't usually walk to school.", why: 'the subject' }], gaps: [] },
      { key: '2', add: [], gaps: [] },
    ]);
  });

  it('takes a bare list, plain strings and ids', () => {
    const entries = A.parseMoreAnswersReply('[{"id": "q2-text", "add": ["huge", " "]}, {"n": 3, "gaps": [{"gap": "2", "add": ["for"]}]}]');
    assert.deepEqual(plain(entries), [
      { key: 'q2-text', add: [{ answer: 'huge', why: '' }], gaps: [] },
      { key: '3', add: [], gaps: [{ gap: 2, add: [{ answer: 'for', why: '' }] }] },
    ]);
  });

  it('says so when there is no JSON', () => {
    assert.throws(() => A.parseMoreAnswersReply('Sorry, I cannot help.'), /No JSON found/);
  });
});

describe('what a reply would add', () => {
  const quiz = () => [errorHunt(), typed(), gaps(), voice(), mcq()];
  const plan = (questions, reply, snapshot = null) => A.planMoreAnswers(questions, snapshot, A.parseMoreAnswersReply(JSON.stringify(reply)));

  it('leaves out what the grader already accepts', () => {
    const questions = quiz();
    const { rows, known } = plan(questions, { answers: [
      { n: 1, add: [{ answer: "he doesn't usually walk to school", why: 'same' }, { answer: "We don't usually walk to school.", why: 'subject' }, { answer: "WE DON'T usually walk to school!", why: 'again' }] },
      { n: 2, add: ['Large.', 'huge'] },
    ] });
    assert.deepEqual(plain(rows.map((r) => [r.n, r.answer])), [[1, "We don't usually walk to school."], [2, 'huge']]);
    assert.equal(rows[0].q, questions[0]);
    assert.equal(rows[0].why, 'subject');
    assert.equal(known, 3);
  });

  it('adds by gap, one answer per comma, and reads a one-gap question without "gaps"', () => {
    const questions = [...quiz(), { id: 'q6-gap', type: 'context_gap', prompt: 'It is very ____ today.', gaps: ['cold'] }];
    const { rows } = plan(questions, { answers: [
      { n: 3, gaps: [{ gap: 1, add: [{ answer: 'have been living, Have lived', why: 'tense' }] }, { gap: 2, add: ['from'] }, { gap: 7, add: ['x'] }] },
      { n: 6, add: ['chilly'] },
    ] });
    assert.deepEqual(plain(rows.map((r) => [r.n, r.gap, r.answer, r.why])), [
      [3, 0, 'have been living', 'tense'], [3, 1, 'from', ''], [6, 0, 'chilly', ''],
    ]);
  });

  it('finds questions moved since the prompt was copied, and names what it cannot find', () => {
    const questions = quiz();
    const snapshot = { 1: 'q1-error', 2: 'q2-text', 5: 'q5-mcq', 8: 'q-gone' };
    const moved = [questions[1], questions[0], ...questions.slice(2)];
    const { rows, unknown } = plan(moved, { answers: [
      { n: 2, add: ['huge'] }, { n: 5, add: ['c'] }, { n: 8, add: ['x'] }, { n: 40, add: ['y'] }, { n: 9, add: [] },
    ] }, snapshot);
    assert.deepEqual(plain(rows.map((r) => [r.n, r.answer])), [[1, 'huge']]);
    assert.equal(rows[0].q, questions[1]);
    assert.deepEqual(plain(unknown), ['5', '8', '40']);
  });
});

describe('adding the answers', () => {
  it('adds to each list and removes nothing', () => {
    const [hunt, text, gap] = [errorHunt(), typed(), gaps()];
    const rows = [
      { q: hunt, gap: null, answer: "We don't usually walk to school." },
      { q: text, gap: null, answer: 'huge' },
      { q: gap, gap: 0, answer: 'have been living' },
      { q: gap, gap: 1, answer: 'from' },
    ];
    assert.deepEqual(plain(A.applyMoreAnswers(rows)), { added: 4, questions: 3, full: [] });
    assert.equal(hunt.corrected, "He doesn't usually walk to school.");
    assert.deepEqual(plain(hunt.correctedVariants), ["He doesn't usually walk to school.", "We don't usually walk to school."]);
    assert.equal(hunt.requiredErrors, 1);
    assert.deepEqual(plain(text.accepted), ['large', 'huge']);
    assert.deepEqual(plain(gap.gaps), ['have lived, have been living', 'since, from']);
  });

  it('keeps to what the server keeps', () => {
    const L = A.MORE_ANSWERS_LIMITS;
    const text = { type: 'text', accepted: Array.from({ length: L.accepted - 1 }, (_, i) => `a${i}`) };
    const gap = { type: 'context_gap', prompt: 'A ____.', gaps: ['x'.repeat(L.gapLength - 5)] };
    const hunt = { type: 'error_hunt', prompt: 'He go.', corrected: 'He goes.', correctedVariants: Array.from({ length: L.corrections }, (_, i) => `He goes ${i}.`) };
    const rows = [
      { q: text, answer: 'fits' }, { q: text, answer: 'full' }, { q: text, answer: 'y'.repeat(L.acceptedLength + 1) },
      { q: gap, gap: 0, answer: 'too long' }, { q: hunt, answer: 'He went.' },
    ];
    const { added, full } = A.applyMoreAnswers(rows);
    assert.equal(added, 1);
    assert.deepEqual(plain(full.map((r) => r.answer.slice(0, 8))), ['full', 'yyyyyyyy', 'too long', 'He went.']);
    assert.equal(text.accepted.length, L.accepted);
  });
});

describe('the added answers in a real game', () => {
  it('are graded right by the server after a save', () => {
    const questions = [errorHunt(), typed(), gaps(), voice()];
    const reply = { answers: [
      { n: 1, add: ["He does not usually walk to school.", "We don't usually walk to school.", "You don't usually walk to school.", "They don't usually walk to school.", "I don't usually walk to school."] },
      { n: 2, add: ['huge'] },
      { n: 3, gaps: [{ gap: 1, add: ['have been living'] }] },
      { n: 4, add: ['7'] },
    ] };
    const { rows } = A.planMoreAnswers(questions, null, A.parseMoreAnswersReply(JSON.stringify(reply)));
    A.applyMoreAnswers(rows);
    const saved = W.normalizeQuiz({ title: 'Q', questions: plain(questions) }).questions;
    const right = (i, answer) => W.evaluate(saved[i], answer).correct;
    reply.answers[0].add.forEach((rewrite) => assert.equal(right(0, { rewrite, selectedTokens: [1] }), true, rewrite));
    assert.equal(right(0, { rewrite: "He don't usually walk to school.", selectedTokens: [1] }), false);
    assert.equal(right(1, 'Huge'), true);
    assert.equal(right(2, ['have been living', 'since']), true);
    assert.equal(right(3, '7'), true);
  });

  it('accept gaps in either order when the AI swaps them', () => {
    const q = { id: 'q11', type: 'context_gap', prompt: 'Saskia teaches the others that the Dutch word "leuk" translates to ____ or ____.', gaps: ['nice', 'fun'] };
    const reply = { answers: [{ n: 1, gaps: [{ gap: 1, add: [{ answer: 'fun', why: 'either order' }] }, { gap: 2, add: [{ answer: 'nice', why: 'either order' }] }] }] };
    A.applyMoreAnswers(A.planMoreAnswers([q], null, A.parseMoreAnswersReply(JSON.stringify(reply))).rows);
    assert.deepEqual(plain(q.gaps), ['nice, fun', 'fun, nice']);
    const [saved] = W.normalizeQuiz({ title: 'Q', questions: plain([q]) }).questions;
    assert.equal(W.evaluate(saved, ['fun', 'nice']).correct, true);
    assert.equal(W.evaluate(saved, ['nice', 'fun']).correct, true);
  });
});
