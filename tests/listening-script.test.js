const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../listening-script.js');

// Listening recording scripts (LISTENING_STUDIO_PLAN.md section 4): the
// format the AI writes and the studio reads.
const STATION = `LANGUAGE: English
AMBIENCE: station
VOICE Announcer [PA]: A British woman in her thirties, formal railway announcer.
VOICE Mia: A young British woman of about nineteen.
VOICE Tom: A young British man of about nineteen.

[chime]
Announcer: The ten fifteen service to Edinburgh is delayed
by approximately forty minutes.
Mia (shocked, voice rising): Forty minutes? You're joking!
>> tom (suddenly worried): Wait, did you bring the tickets?
Mia + Tom (shouting in disbelief): What?!
[pause 2]
--- Part 2
Mia [phone]: Hi, Mum! The train leaves at 10:30.`;

describe('reading a recording script', () => {
  const script = S.parseListeningScript(STATION);
  const items = script.parts[0].items;

  it('reads the settings and the voices with their effects', () => {
    assert.equal(script.language, 'English');
    assert.equal(script.ambience, 'station');
    assert.deepEqual(Object.keys(script.voices), ['Announcer', 'Mia', 'Tom']);
    assert.equal(script.voices.Announcer.effect, 'pa');
    assert.equal(script.voices.Mia.effect, '');
    assert.deepEqual(script.notes, []);
  });

  it('reads sounds, directions, interruptions, people speaking together and pauses', () => {
    assert.deepEqual(items.map((it) => it.type), ['sound', 'line', 'line', 'line', 'line', 'pause']);
    assert.equal(items[0].sound, 'chime');
    assert.equal(items[2].direction, 'shocked, voice rising');
    assert.equal(items[3].overlap, true);
    assert.deepEqual(items[3].speakers, ['Tom'], 'names match their VOICE line whatever the case');
    assert.deepEqual(items[4].speakers, ['Mia', 'Tom']);
    assert.equal(items[5].seconds, 2);
  });

  it('joins a wrapped line to the line it belongs to (PDF copies)', () => {
    assert.equal(items[1].text, 'The ten fifteen service to Edinburgh is delayed by approximately forty minutes.');
  });

  it('splits parts, and an effect can be given to a single line', () => {
    assert.equal(script.parts.length, 2);
    assert.equal(script.parts[1].label, 'Part 2');
    assert.equal(script.parts[1].items[0].effect, 'phone');
    assert.equal(script.parts[1].items[0].text, 'Hi, Mum! The train leaves at 10:30.', 'a time is never a speaker name');
  });

  it('notes what the studio would have to guess or can\'t make', () => {
    const notes = S.parseListeningScript('AMBIENCE: jungle\n[laugh]\nJake: Hi!').notes.join(' | ');
    assert.match(notes, /unknown background "jungle"/);
    assert.match(notes, /unknown sound \[laugh\]/);
    assert.match(notes, /Jake has no VOICE line/);
  });

  it('ignores the code block an AI chat wraps its answer in, and reads accented names', () => {
    const pasted = "```text\nLANGUAGE: French\nVOICE Chloé: A young French woman.\nVOICE Léa: A young French woman.\n\nLéa (welcoming): Salut Chloé ! Ça va ?\nChloé: Je vais faire ma valise.\n```";
    const s = S.parseListeningScript(pasted);
    assert.deepEqual(s.notes, []);
    assert.deepEqual(s.parts[0].items.map((it) => `${it.speakers[0]}: ${it.text}`), ['Léa: Salut Chloé ! Ça va ?', 'Chloé: Je vais faire ma valise.']);
  });

  it('reads plain text as one voice, joining its lines', () => {
    const prose = S.parseListeningScript('I got my first job when I was 15, working at a car wash in the\nsummertime. A friend of mine, Rob, worked there.');
    assert.equal(prose.parts[0].items.length, 1);
    assert.equal(prose.parts[0].items[0].speakers[0], 'Narrator');
    assert.match(prose.parts[0].items[0].text, /in the summertime\./);
  });
});

describe('the clean transcript', () => {
  it('keeps only who says what, and the parts', () => {
    assert.equal(S.cleanListeningTranscript(STATION), [
      'Announcer: The ten fifteen service to Edinburgh is delayed by approximately forty minutes.',
      "Mia: Forty minutes? You're joking!",
      'Tom: Wait, did you bring the tickets?',
      'Mia and Tom: What?!',
      '--- Part 2',
      'Mia: Hi, Mum! The train leaves at 10:30.',
    ].join('\n'));
  });

  it('tells a script from a plain transcript', () => {
    assert.equal(S.isListeningScript(STATION), true);
    assert.equal(S.isListeningScript('Anna: Hi Tom!\nTom: Hi.'), false);
  });
});

describe('the rules the AI gets', () => {
  const rules = S.LISTENING_SCRIPT_RULES.join('\n');

  it('cover what the studio needs, so no one has to fix the script', () => {
    [/LANGUAGE/, /AMBIENCE/, /VOICE Name: description/, /never "girl", "boy"/, /\[phone\]/, /\[PA\]/, /\(direction\)/,
      />>/, /Mia \+ Tom/, /\[chime\]/, /\[pause N\]/, /30 words/, /ten fifteen/, /Every answer must be said clearly/,
      /no "Now listen again"/].forEach((re) => assert.match(rules, re));
  });

  it('only offer settings, sounds and effects the parser knows', () => {
    S.LISTENING_SCRIPT_AMBIENCES.forEach((a) => assert.match(rules, new RegExp(`\\b${a}\\b`)));
    S.LISTENING_SCRIPT_SOUNDS.forEach((s) => assert.match(rules, new RegExp(`\\[${s}\\]`)));
    ['phone', 'PA', 'radio', 'far'].forEach((e) => assert.match(rules, new RegExp(`\\[${e}\\]`)));
  });
});
