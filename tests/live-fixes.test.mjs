/*
 * Classic live fixes (2026-10-08):
 * - /api/media/ answers byte ranges, so a recording can be sought (dragging
 *   the bar used to jump back to 0:00);
 * - students edit their avatar in the classic lobby (/api/avatar);
 * - a listening sheet's options are shuffled, the same way on the phones and
 *   in the projector's correction, and the sheet's "Answer:" uses its letters.
 * Drives the REAL cloudflare/worker.js (DO storage and R2 stubbed).
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
const { loadDeclarations } = require('./helpers/extract-declaration');
const TEACHER_PW = 'teacher-secret';

function makeStorage() {
  const map = new Map();
  return {
    async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { return map.delete(k); },
    async list({ prefix = '' } = {}) {
      const out = new Map();
      for (const [k, v] of map) if (k.startsWith(prefix)) out.set(k, structuredClone(v));
      return out;
    },
    async setAlarm() { },
    async deleteAlarm() { },
    async getAlarm() { return null; },
  };
}

// R2's get(key, { range: Headers }) as Cloudflare documents it: a range
// object { offset, length } or { suffix }, and a body of just those bytes.
function makeBucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value) { objects.set(key, new Uint8Array(value)); },
    async get(key, opts) {
      const bytes = objects.get(key);
      if (!bytes) return null;
      let range;
      const header = opts?.range?.get?.('range');
      if (header) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(header);
        if (m[1] === '') range = { suffix: Number(m[2]) };
        else {
          const offset = Number(m[1]);
          if (offset >= bytes.length) throw new Error('InvalidRange');
          const end = m[2] === '' ? bytes.length - 1 : Math.min(bytes.length - 1, Number(m[2]));
          range = { offset, length: end - offset + 1 };
        }
      }
      const slice = !range ? bytes : (range.suffix != null ? bytes.slice(bytes.length - range.suffix) : bytes.slice(range.offset, range.offset + range.length));
      return { body: slice, size: bytes.length, range, httpMetadata: { contentType: 'audio/mpeg' } };
    },
    async delete(key) { objects.delete(key); },
    async list() { return { objects: [], truncated: false }; },
  };
}

let call;
let post;
let bucket;

before(async () => {
  const src = fs.readFileSync(path.join(REPO, 'cloudflare', 'worker.js'), 'utf8');
  const tmpFile = path.join(os.tmpdir(), `pinplay-worker-livefix-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, src);
  process.on('exit', () => { try { fs.unlinkSync(tmpFile); } catch { /* already gone */ } });
  const mod = await import('file://' + tmpFile.replace(/\\/g, '/'));
  bucket = makeBucket();
  const instances = new Map();
  let env;
  const stubFor = (name) => {
    if (!instances.has(name)) instances.set(name, new mod.QuizRoom({ storage: makeStorage(), getWebSockets: () => [] }, env));
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
    const res = await mod.default.fetch(new Request('https://api.test' + pathname, init), env);
    const buf = new Uint8Array(await res.arrayBuffer());
    let body = {};
    try { body = JSON.parse(new TextDecoder().decode(buf)); } catch { body = {}; }
    return { status: res.status, body, bytes: buf, headers: res.headers };
  };
  post = (p, obj, headers = {}) => call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(obj) });
});

describe('recordings can be sought', () => {
  const KEY = 'quiz-1/listening/ls1-a.mp3';
  before(() => { bucket.objects.set(KEY, Uint8Array.from({ length: 1000 }, (_, i) => i % 251)); });

  it('a whole file says it accepts ranges', async () => {
    const r = await call(`/api/media/${KEY}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('accept-ranges'), 'bytes');
    assert.equal(r.headers.get('content-length'), '1000');
    assert.equal(r.bytes.length, 1000);
  });

  it('a range gets 206 with just those bytes', async () => {
    const r = await call(`/api/media/${KEY}`, { headers: { Range: 'bytes=100-199' } });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), 'bytes 100-199/1000');
    assert.equal(r.headers.get('content-length'), '100');
    assert.equal(r.bytes[0], 100);
    const open = await call(`/api/media/${KEY}`, { headers: { Range: 'bytes=900-' } });
    assert.equal(open.headers.get('content-range'), 'bytes 900-999/1000');
    const tail = await call(`/api/media/${KEY}`, { headers: { Range: 'bytes=-50' } });
    assert.equal(tail.headers.get('content-range'), 'bytes 950-999/1000');
    assert.equal(tail.bytes.length, 50);
  });

  it('a range past the end gets the whole file', async () => {
    const r = await call(`/api/media/${KEY}`, { headers: { Range: 'bytes=5000-' } });
    assert.equal(r.status, 200);
    assert.equal(r.bytes.length, 1000);
  });
});

describe('classic live lobby avatars', () => {
  let pin;
  let host;
  let player;
  const AV = { head: 1, skin: 2, hair: 3, hairColor: 1, eyes: 2, mouth: 1, glasses: 0, hat: 0, shirt: 4 };
  before(async () => {
    const r = await post('/api/create', {
      password: TEACHER_PW,
      options: { randomNames: true },
      quiz: { title: 'Live', questions: [{ type: 'tf', prompt: 'Ready?', answers: ['True', 'False'], correctIndex: 0 }] },
    });
    pin = r.body.pin;
    host = r.body.hostToken;
    player = (await post('/api/join', { pin, clientId: 'c_one' })).body;
  });

  it('a student changes theirs and the live screen shows it', async () => {
    const r = await post('/api/avatar', { pin, playerId: player.playerId, avatar: AV }, { 'X-Player-Token': player.playerToken });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.avatar, AV);
    const state = (await call(`/api/host/state?pin=${pin}`, { headers: { Authorization: `Bearer ${host}` } })).body;
    assert.deepEqual(state.players.find((p) => p.id === player.playerId).avatar, AV);
  });

  it('needs the player token and a real avatar', async () => {
    assert.equal((await post('/api/avatar', { pin, playerId: player.playerId, avatar: AV }, { 'X-Player-Token': 'nope' })).status, 401);
    assert.equal((await post('/api/avatar', { pin, playerId: player.playerId, avatar: { ...AV, hat: 999 } }, { 'X-Player-Token': player.playerToken })).status, 400);
  });
});

describe('listening options are shuffled', () => {
  let P;
  let A;
  before(() => {
    P = loadDeclarations(fs.readFileSync(path.join(REPO, 'play.js'), 'utf8'),
      ['questionShuffleSeed', 'seededShuffleIndices', 'listeningOptionOrder', 'listeningAnswerLabel'], { live: { player: { mode: 'live' } } });
    A = loadDeclarations(fs.readFileSync(path.join(REPO, 'app.js'), 'utf8'), ['questionShuffleSeed', 'seededShuffleIndices', 'listeningOptionOrder']);
  });

  // Like an AI-written section: the right answer always written first, and
  // the same prompt on every question.
  const section = Array.from({ length: 12 }, (_, i) => ({
    type: 'mcq',
    prompt: 'Choose the correct answer.',
    answers: [`right ${i}`, `wrong a ${i}`, `wrong b ${i}`].map((text) => ({ text })),
  }));

  it('the right answer is not always A', () => {
    const letters = section.map((q) => P.listeningOptionOrder(q).indexOf(0));
    assert.ok(new Set(letters).size >= 2, `positions ${letters}`);
    assert.ok(letters.filter((x) => x === 0).length < section.length / 2 + 2, `A too often: ${letters}`);
  });

  it('the phones and the projector letter them the same way', () => {
    section.forEach((q) => assert.deepEqual([...P.listeningOptionOrder(q)], [...A.listeningOptionOrder(q)]));
  });

  it('true / false stays in order', () => {
    const tf = { type: 'tf', prompt: 'x', answers: [{ text: 'True' }, { text: 'False' }] };
    assert.deepEqual([...P.listeningOptionOrder(tf)], [0, 1]);
  });

  it('the sheet\'s "Answer:" uses the letter the student saw', () => {
    const q = section[3];
    const letter = String.fromCharCode(65 + P.listeningOptionOrder(q).indexOf(0));
    assert.equal(P.listeningAnswerLabel(q, '1. right 3'), `${letter}. right 3`);
    assert.equal(P.listeningAnswerLabel({ type: 'tf', answers: [{ text: 'True' }, { text: 'False' }] }, '1. True'), 'True');
    assert.equal(P.listeningAnswerLabel({ type: 'text' }, '1. not a choice'), '1. not a choice');
  });
});
