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
import { fileURLToPath } from 'node:url';

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
  fs.writeFileSync(tmpFile, src);
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
    assert.deepEqual(Object.keys(r.body.session.lines[0]).sort(), ['direction', 'id', 'n', 'speaker', 'status', 'take', 'text']);
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
