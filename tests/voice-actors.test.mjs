/*
 * Voice actors (VOICE_ACTORS_PLAN.md): volunteers upload one take per line,
 * the teacher reviews, trims and approves. Drives the REAL cloudflare/worker.js
 * module (like cloud-quizzes.test.mjs): only Durable Object storage and R2 are
 * stubbed. Also the teacher panel's script reading and automatic trim.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TEACHER_PW = 'teacher-secret';

function makeStorage() {
  const map = new Map();
  return {
    async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { return map.delete(k); },
    async list({ prefix = '' } = {}) {
      const out = new Map();
      for (const [k, v] of [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) if (k.startsWith(prefix)) out.set(k, structuredClone(v));
      return out;
    },
  };
}

function makeBucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value, opts) { objects.set(key, { bytes: value.byteLength ?? String(value).length, type: opts?.httpMetadata?.contentType }); },
    async get(key) { return objects.has(key) ? { body: 'x', httpMetadata: { contentType: objects.get(key).type } } : null; },
    async delete(key) { objects.delete(key); },
    async list({ prefix = '' } = {}) {
      return { objects: [...objects.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false };
    },
  };
}

let call;
let post;
let take;
let bucket;

before(async () => {
  const src = fs.readFileSync(path.join(REPO, 'cloudflare', 'worker.js'), 'utf8');
  const tmpFile = path.join(os.tmpdir(), `pinplay-worker-voices-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, src.replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.join(REPO, 'cloudflare/taskflow-auth.mjs')).href)));
  process.on('exit', () => { try { fs.unlinkSync(tmpFile); } catch { /* already gone */ } });
  const mod = await import('file://' + tmpFile.replace(/\\/g, '/'));
  const worker = mod.default;
  bucket = makeBucket();
  const instances = new Map();
  let env;
  const stubFor = (name) => {
    if (!instances.has(name)) instances.set(name, new mod.QuizRoom({ storage: makeStorage() }, env));
    const inst = instances.get(name);
    return { fetch: (url, init) => inst.fetch(new Request(url, init)) };
  };
  env = {
    STUDENT_SESSION_KEY: 'a'.repeat(64),
    CREATE_PASSWORD_HASH: [...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TEACHER_PW)),
    )].map((b) => b.toString(16).padStart(2, '0')).join(''),
    ROOMS: { idFromName: (n) => n, get: (n) => stubFor(n) },
    QUIZ_MEDIA: bucket,
  };
  call = async (pathname, init = {}) => {
    const res = await worker.fetch(new Request('https://api.test' + pathname, init), env);
    const text = await res.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    return { status: res.status, body, headers: res.headers };
  };
  post = (route, obj) => call(`/api/rec/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: TEACHER_PW, ...obj }),
  });
  take = (id, line, { type = 'audio/webm;codecs=opus', bytes = 2000, ms = 2500 } = {}) => call(
    `/api/rec/take?s=${id}&line=${line}&ms=${ms}`,
    { method: 'POST', headers: { 'Content-Type': type }, body: new Uint8Array(bytes) },
  );
});

const LINES = [
  { speaker: 'Mia', direction: 'surprised', text: 'Forty minutes? You are joking!' },
  { speaker: 'Tom', text: 'I know, I know.' },
  { speaker: 'Mia + Tom', text: 'Let us go.' },
  { speaker: 'Nobody', text: '   ' },
];
const create = async () => (await post('create', { title: 'At the station', sectionId: 'ls-1', lines: LINES })).body.session;

describe('teacher routes', () => {
  it('need the teacher password', async () => {
    const r = await call('/api/rec/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'nope' }) });
    assert.equal(r.status, 401);
  });

  it('create a session from the script lines, dropping empty ones', async () => {
    const s = await create();
    assert.match(s.id, /^[a-z0-9]{10}$/);
    assert.equal(s.title, 'At the station');
    assert.equal(s.defaultGap, 0.6);
    assert.deepEqual(s.lines.map((l) => [l.id, l.speaker, l.status, l.take]), [
      ['l1', 'Mia', 'todo', null], ['l2', 'Tom', 'todo', null], ['l3', 'Mia + Tom', 'todo', null],
    ]);
    const list = (await post('list')).body.sessions;
    assert.ok(list.some((x) => x.id === s.id && x.total === 3 && x.recorded === 0));
  });

  it('refuse a script with nothing to record', async () => {
    const r = await post('create', { title: 'Empty', lines: [{ speaker: 'A', text: ' ' }] });
    assert.equal(r.status, 400);
  });
});

describe('volunteers', () => {
  it('see the lines without the teacher\'s trims or pauses', async () => {
    const s = await create();
    const r = await call(`/api/rec/actor?s=${s.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.session.lines.length, 3);
    assert.deepEqual(Object.keys(r.body.session.lines[0]).sort(), ['direction', 'id', 'n', 'original', 'speaker', 'status', 'take', 'text']);
    assert.equal(r.body.session.allowEdits, true, 'changing the words is on by default');
  });

  it('upload a take per line; a new take replaces the old object', async () => {
    const s = await create();
    const first = await take(s.id, 'l1');
    assert.equal(first.status, 200);
    assert.equal(first.body.line.status, 'recorded');
    const key1 = first.body.line.take.key;
    assert.match(key1, new RegExp(`^voice-actors/${s.id}/l1-[a-z0-9]+\\.webm$`));
    assert.equal(bucket.objects.get(key1).type, 'audio/webm');
    assert.equal('previousKey' in first.body, true);
    await new Promise((r) => setTimeout(r, 5));
    const second = await take(s.id, 'l1', { type: 'audio/mp4' });
    const key2 = second.body.line.take.key;
    assert.match(key2, /\.m4a$/);
    assert.ok(!bucket.objects.has(key1), 'the old take is deleted');
    assert.ok(bucket.objects.has(key2));
    const full = (await post('get', { id: s.id })).body.session;
    assert.equal(full.lines[0].take.durMs, 2500);
    assert.equal(full.lines[0].take.mime, 'audio/mp4');
  });

  it('cannot replace a line the teacher approved', async () => {
    const s = await create();
    const ok = await take(s.id, 'l2');
    await post('save', { id: s.id, lines: [{ id: 'l2', status: 'ok' }] });
    const before = bucket.objects.size;
    const r = await take(s.id, 'l2');
    assert.equal(r.status, 409);
    assert.equal(r.body.reason, 'approved');
    assert.equal(bucket.objects.size, before, 'the refused upload is removed');
    assert.ok(bucket.objects.has(ok.body.line.take.key), 'the approved take stays');
  });

  it('are refused bad formats, empty or oversized takes, unknown sessions and lines', async () => {
    const s = await create();
    assert.equal((await take(s.id, 'l1', { type: 'text/html' })).status, 415);
    assert.equal((await take(s.id, 'l1', { bytes: 0 })).status, 400);
    assert.equal((await take(s.id, 'l1', { bytes: 3 * 1024 * 1024 + 1 })).status, 413);
    assert.equal((await take('zzzzzzzzzz', 'l1')).status, 404);
    assert.equal((await take(s.id, 'l99')).status, 404);
    assert.equal((await take(s.id, '../x')).status, 400);
    assert.equal((await call('/api/rec/actor?s=nope')).status, 404);
    assert.ok(![...bucket.objects.keys()].some((k) => k.includes('l99') || k.includes('zzzz')), 'refused takes leave nothing behind');
  });
});

describe('changing the words', () => {
  const edit = (s, line, text) => call('/api/rec/edit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ s, line, text }),
  });

  it("keeps the script's words so the teacher sees the change", async () => {
    const s = await create();
    const r = await edit(s.id, 'l2', '  I know,   I really know. ');
    assert.equal(r.status, 200);
    assert.equal(r.body.line.text, 'I know, I really know.');
    assert.equal(r.body.line.original, 'I know, I know.');
    // A second change keeps the first original.
    await edit(s.id, 'l2', 'Yes, I know.');
    const full = (await post('get', { id: s.id })).body.session;
    assert.equal(full.lines[1].text, 'Yes, I know.');
    assert.equal(full.lines[1].original, 'I know, I know.');
    assert.ok((await post('list')).body.sessions.some((x) => x.id === s.id && x.edited === 1));
    // Back to the original words clears the mark.
    const back = await edit(s.id, 'l2', 'I know, I know.');
    assert.equal(back.body.line.original, null);
  });

  it("the teacher can go back to the script's words", async () => {
    const s = await create();
    await edit(s.id, 'l1', 'Forty minutes? No way!');
    const r = await post('save', { id: s.id, lines: [{ id: 'l1', revert: true }] });
    assert.equal(r.body.session.lines[0].text, 'Forty minutes? You are joking!');
    assert.equal(r.body.session.lines[0].original, null);
  });

  it('is refused when the teacher turned it off, on approved lines and for empty words', async () => {
    const s = await create();
    assert.equal((await edit(s.id, 'l1', '   ')).status, 400);
    await take(s.id, 'l1');
    await post('save', { id: s.id, lines: [{ id: 'l1', status: 'ok' }] });
    const approved = await edit(s.id, 'l1', 'New words');
    assert.equal(approved.status, 409);
    assert.equal(approved.body.reason, 'approved');
    await post('save', { id: s.id, allowEdits: false });
    assert.equal((await call(`/api/rec/actor?s=${s.id}`)).body.session.allowEdits, false);
    const locked = await edit(s.id, 'l2', 'New words');
    assert.equal(locked.status, 403);
    assert.equal(locked.body.reason, 'locked');
    assert.equal((await edit('zzzzzzzzzz', 'l2', 'x')).status, 404);
    assert.equal((await edit(s.id, '../x', 'x')).status, 400);
    const off = (await post('create', { title: 'Off', lines: LINES, allowEdits: false })).body.session;
    assert.equal(off.allowEdits, false);
  });
});

describe('review', () => {
  it('saves trims, statuses and pauses in one batch', async () => {
    const s = await create();
    await take(s.id, 'l1');
    const r = await post('save', {
      id: s.id,
      defaultGap: 0.8,
      title: 'Station',
      lines: [
        { id: 'l1', trim: { s: 120.4, e: 2300 }, status: 'ok', gap: 99 },
        { id: 'l2', status: 'ok', gap: 1.25 }, // no take: can't be OK
        { id: 'l3', status: 'bogus', gap: null },
        { id: 'l9', status: 'ok' },
      ],
    });
    assert.equal(r.status, 200);
    const [l1, l2, l3] = r.body.session.lines;
    assert.deepEqual(l1.trim, { s: 120, e: 2300 });
    assert.equal(l1.status, 'ok');
    assert.equal(l1.gap, 10);
    assert.equal(l2.status, 'todo');
    assert.equal(l2.gap, 1.25);
    assert.equal(l3.status, 'todo');
    assert.equal(l3.gap, null);
    assert.equal(r.body.session.defaultGap, 0.8);
    assert.equal(r.body.session.title, 'Station');
    // Back to automatic trim; a redo goes back to the volunteer.
    const r2 = await post('save', { id: s.id, lines: [{ id: 'l1', trim: null, status: 'redo' }] });
    assert.equal(r2.body.session.lines[0].trim, null);
    assert.equal((await call(`/api/rec/actor?s=${s.id}`)).body.session.lines[0].status, 'redo');
    // A new take clears the trim and goes back to review.
    await post('save', { id: s.id, lines: [{ id: 'l1', trim: { s: 10, e: 20 } }] });
    const again = await take(s.id, 'l1');
    assert.equal(again.body.line.status, 'recorded');
    assert.equal((await post('get', { id: s.id })).body.session.lines[0].trim, null);
  });

  it('deleting a session deletes its takes', async () => {
    const s = await create();
    await take(s.id, 'l1');
    await take(s.id, 'l2');
    assert.ok([...bucket.objects.keys()].some((k) => k.startsWith(`voice-actors/${s.id}/`)));
    assert.equal((await post('delete', { id: s.id })).status, 200);
    assert.ok(![...bucket.objects.keys()].some((k) => k.startsWith(`voice-actors/${s.id}/`)));
    assert.equal((await post('get', { id: s.id })).status, 404);
  });

  it('takes are served with their audio type', async () => {
    const s = await create();
    const key = (await take(s.id, 'l1', { type: 'audio/ogg' })).body.line.take.key;
    const r = await call(`/api/media/${key}`);
    assert.equal(r.headers.get('content-type'), 'audio/ogg');
  });
});

describe('teacher panel helpers', () => {
  const g = globalThis;
  let va;
  before(() => {
    const { parseListeningScript } = require(path.join(REPO, 'listening-script.js'));
    g.parseListeningScript = parseListeningScript;
    g.window = g.window || { addEventListener() { } };
    va = require(path.join(REPO, 'voice-actors.js'));
  });

  it('reads the spoken lines of a script, in order', () => {
    const lines = va.vaLinesFromScript([
      'TITLE: Late again', 'VOICE Mia: calm woman', 'Mia (surprised): Forty minutes?', '[pause 2]',
      '--- Part 2', 'Mia + Tom: Let us go.', 'and quickly.',
    ].join('\n'));
    assert.deepEqual(lines, [
      { speaker: 'Mia', direction: 'surprised', text: 'Forty minutes?' },
      { speaker: 'Mia + Tom', direction: '', text: 'Let us go. and quickly.' },
    ]);
  });

  it("writes the script back, with the volunteers' changes", () => {
    const lines = [
      { speaker: 'Mia', direction: 'surprised', text: 'Forty minutes? No way!', original: 'Forty minutes?' },
      { speaker: 'Mia + Tom', direction: '', text: 'Let us go.', original: null },
    ];
    assert.equal(va.vaScriptText(lines), 'Mia (surprised): Forty minutes? No way!\nMia + Tom: Let us go.');
    assert.deepEqual(va.vaLinesFromScript(va.vaScriptText(lines)).map((l) => l.text), ['Forty minutes? No way!', 'Let us go.']);
    assert.deepEqual(va.vaCharacters(lines), ['Mia', 'Tom']);
    const section = 'TITLE: Late\nMia (surprised): Forty minutes?\n[pause 2]\nMia + Tom: Let us go.';
    assert.deepEqual(va.vaApplyEdits(section, lines), {
      text: 'TITLE: Late\nMia (surprised): Forty minutes? No way!\n[pause 2]\nMia + Tom: Let us go.', missed: 0,
    });
    assert.equal(va.vaApplyEdits('Mia: Something else', lines).missed, 1);
  });

  it('puts each change into the section script once, however often the recording goes in', () => {
    const added = [
      { speaker: 'Mia', direction: 'surprised', text: 'Forty minutes? No way!', original: 'Forty minutes?' },
      { speaker: 'Mia + Tom', direction: '', text: 'Let us go.', original: null },
    ];
    const once = va.vaApplyEdits('TITLE: Late\nMia (surprised): Forty minutes?\n[pause 2]\nMia + Tom: Let us go.', added);
    assert.equal(once.text, 'TITLE: Late\nMia (surprised): Forty minutes? No way!\n[pause 2]\nMia + Tom: Let us go.');
    assert.deepEqual(va.vaApplyEdits(once.text, added), { text: once.text, missed: 0 });
    // Reworded: the script's words are gone after the first time, and nothing is asked again.
    const reworded = [{ speaker: 'Anna', direction: '', text: 'Sure, see you then.', original: 'OK, see you.' }];
    const first = va.vaApplyEdits('[ring]\nAnna: OK, see you.\n[pause 2]', reworded);
    assert.deepEqual(first, { text: '[ring]\nAnna: Sure, see you then.\n[pause 2]', missed: 0 });
    assert.deepEqual(va.vaApplyEdits(first.text, reworded), { text: first.text, missed: 0 });
  });

  it('changes the changed line only, never the same words inside another line', () => {
    const lines = [
      { speaker: 'Mia', direction: '', text: 'Sorry. Are you coming?', original: null },
      { speaker: 'Tom', direction: '', text: "Sorry, I can't today.", original: 'Sorry.' },
      { speaker: 'Mia', direction: '', text: 'OK, see you later.', original: null },
    ];
    // Typed by hand with two spaces: still Mia's line, and left as it is.
    const section = 'Mia: Sorry.  Are you coming?\nTom: Sorry.\nMia: OK, see you later.';
    assert.deepEqual(va.vaApplyEdits(section, lines), {
      text: "Mia: Sorry.  Are you coming?\nTom: Sorry, I can't today.\nMia: OK, see you later.", missed: 0,
    });
  });

  it("matches the speaker too: another character's same words stay", () => {
    const lines = [{ speaker: 'Tom', direction: '', text: 'Yes, of course.', original: 'Yes.' }];
    assert.deepEqual(va.vaApplyEdits('Mia: Yes.\nTom: Yes.', lines), { text: 'Mia: Yes.\nTom: Yes, of course.', missed: 0 });
  });

  it('keeps voices, sounds, directions, effects and interruptions, and joins a wrapped line it changes', () => {
    const lines = [
      { speaker: 'Anna', direction: 'surprised', text: 'The library? On Sunday?', original: 'The library? On a Sunday?' },
      { speaker: 'Tom', direction: '', text: 'It opens at ten, trust me.', original: 'It opens at ten. Trust me, it does.' },
    ];
    const section = 'VOICE Tom [phone]: A calm voice.\n[ring]\n>> Anna (surprised): The library? On a Sunday?\nTom [phone]: It opens at ten.\n  Trust me, it does.\n--- Part 2\n[pause 2]';
    assert.deepEqual(va.vaApplyEdits(section, lines), {
      text: 'VOICE Tom [phone]: A calm voice.\n[ring]\n>> Anna (surprised): The library? On Sunday?\nTom [phone]: It opens at ten, trust me.\n--- Part 2\n[pause 2]',
      missed: 0,
    });
  });

  it('counts a changed line that is in the section script neither way', () => {
    const lines = [{ speaker: 'Mia', direction: '', text: 'Forty minutes? No way!', original: 'Forty minutes?' }];
    assert.deepEqual(va.vaApplyEdits('Tom: Forty minutes?', lines), { text: 'Tom: Forty minutes?', missed: 1 });
  });

  it('gives each character a link of their own', () => {
    assert.match(va.vaLink('abcdefgh23', 'Mia + Tom'), /\?s=abcdefgh23&c=Mia%20%2B%20Tom$/);
    assert.match(va.vaLink('abcdefgh23'), /\?s=abcdefgh23$/);
  });

  it('trims the silence around speech, keeping a little air', () => {
    const rate = 8000;
    const data = new Float32Array(rate * 3); // 3 s: speech from 1.0 s to 2.0 s
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() - 0.5) * 0.002;
    for (let i = rate; i < rate * 2; i += 1) data[i] = Math.sin(i / 5) * 0.5;
    const trim = va.vaAutoTrim({ sampleRate: rate, duration: 3, getChannelData: () => data });
    assert.ok(trim.s >= 840 && trim.s <= 900, `start ${trim.s}`);
    assert.ok(trim.e >= 2180 && trim.e <= 2240, `end ${trim.e}`);
  });
});


describe('shared script editing', () => {
  const change = (s, action, payload = {}) => call('/api/rec/script', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, action, ...payload }),
  });
  it('renames every occurrence including shared lines, retaining recordings', async () => {
    const s = await create();
    await take(s.id, 'l1');
    const r = await change(s.id, 'rename', { speaker: 'Mia', name: 'Anna' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.session.lines.map((l) => l.speaker), ['Anna', 'Tom', 'Anna + Tom']);
    assert.ok(r.body.session.lines[0].take);
    assert.equal((await change(s.id, 'rename', { speaker: 'Anna', name: 'Tom' })).status, 400);
    assert.equal((await change(s.id, 'rename', { speaker: 'Anna', name: 'A + B' })).status, 400);
  });
  it('inserts and removes lines without reusing recording IDs', async () => {
    const s = await create();
    await take(s.id, 'l2');
    let r = await change(s.id, 'add', { line: 'l1', speaker: 'Tom', text: 'A new line.' });
    assert.deepEqual(r.body.session.lines.map((l) => l.id), ['l1', 'l4', 'l2', 'l3']);
    assert.deepEqual(r.body.session.lines.map((l) => l.n), [1, 2, 3, 4]);
    assert.ok(r.body.session.lines[2].take);
    await change(s.id, 'remove', { line: 'l4' });
    r = await change(s.id, 'add', { speaker: 'Mia', text: 'Another line.' });
    assert.equal(r.body.session.lines.at(-1).id, 'l5');
    for (const l of r.body.session.lines) await change(s.id, 'remove', { line: l.id });
    r = await change(s.id, 'add', { speaker: 'Tom', text: 'Start again.' });
    assert.equal(r.body.session.lines[0].id, 'l6');
    assert.equal(r.body.session.lines[0].n, 1);
    assert.equal((await change(s.id, 'remove', { line: 'l999' })).status, 400);
  });
  it('lets teachers edit locked sessions and reopens approved text for recording', async () => {
    const s = await create();
    await take(s.id, 'l1');
    await post('save', { id: s.id, allowEdits: false, lines: [{ id: 'l1', status: 'ok' }] });
    assert.equal((await change(s.id, 'text', { line: 'l1', text: 'New words.' })).status, 403);
    assert.equal((await change(s.id, 'rename', { speaker: 'Mia', name: 'Anna', password: 'bad' })).status, 401);
    const r = await post('script', { id: s.id, action: 'text', line: 'l1', text: 'New words.' });
    assert.equal(r.status, 200);
    assert.equal(r.body.session.lines[0].status, 'redo');
    assert.ok(r.body.session.lines[0].take);
    assert.equal(r.body.session.lines[0].original, LINES[0].text);
    await post('save', { id: s.id, allowEdits: true });
    assert.equal((await change(s.id, 'text', { line: 'l1', text: '   ' })).status, 400);
    assert.equal((await change('zzzzzzzzzz', 'add', { speaker: 'Mia', text: 'Hi' })).status, 404);
  });
});
