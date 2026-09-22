/*
 * Integration tests for student sign-in and the roster.
 *
 * These drive the REAL cloudflare/worker.js module: routing, the Durable Object
 * round trips, the session-token round trip and the Google verification step are
 * all exercised as deployed. Only three things are stubbed — Durable Object
 * storage (an in-memory Map), R2, and Google's tokeninfo endpoint.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
const TEACHER_PW = 'teacher-secret';

// Google accounts the stubbed tokeninfo endpoint knows about.
const GOOGLE_USERS = {
  'tok-nel': { email: 'neloru@iecomaruga.cat', name: 'Nel Oru', aud: GOOGLE_CLIENT_ID, email_verified: true },
  'tok-outsider': { email: 'random@gmail.com', name: 'Some One', aud: GOOGLE_CLIENT_ID, email_verified: true },
  'tok-wrongaud': { email: 'x@iecomaruga.cat', name: 'X', aud: 'other-app', email_verified: true },
  'tok-unverified': { email: 'y@iecomaruga.cat', name: 'Y', aud: GOOGLE_CLIENT_ID, email_verified: false },
  'tok-newkid': { email: 'newkid@iecomaruga.cat', name: 'New Kid', aud: GOOGLE_CLIENT_ID, email_verified: true },
  'tok-marta': { email: 'marta@iecomaruga.cat', name: 'Marta Vidal', aud: GOOGLE_CLIENT_ID, email_verified: true },
};

function makeStorage() {
  const map = new Map();
  return {
    async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { return map.delete(k); },
    async list({ prefix = '', limit } = {}) {
      const out = new Map();
      for (const [k, v] of [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        if (!k.startsWith(prefix)) continue;
        out.set(k, structuredClone(v));
        if (limit && out.size >= limit) break;
      }
      return out;
    },
  };
}

let env;
let call;
let post;
let tmpFile;

before(async () => {
  const src = fs.readFileSync(path.join(REPO, 'cloudflare', 'worker.js'), 'utf8');
  tmpFile = path.join(os.tmpdir(), `pinplay-worker-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmpFile, src);
  const mod = await import('file://' + tmpFile.replace(/\\/g, '/'));
  const worker = mod.default;
  const QuizRoom = mod.QuizRoom;

  const instances = new Map();
  const stubFor = (name) => {
    if (!instances.has(name)) instances.set(name, new QuizRoom({ storage: makeStorage() }, env));
    const inst = instances.get(name);
    return { fetch: (url, init) => inst.fetch(new Request(url, init)) };
  };

  env = {
    GOOGLE_CLIENT_ID,
    STUDENT_SESSION_KEY: 'a'.repeat(64),
    CREATE_PASSWORD_HASH: [...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TEACHER_PW)),
    )].map((b) => b.toString(16).padStart(2, '0')).join(''),
    ROOMS: { idFromName: (n) => n, get: (n) => stubFor(n) },
    QUIZ_MEDIA: null,
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
      const user = GOOGLE_USERS[new URL(u).searchParams.get('id_token')];
      if (!user) return new Response('bad', { status: 400 });
      return new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  };

  call = async (pathname, init = {}) => {
    const res = await worker.fetch(new Request('https://api.test' + pathname, init), env);
    const text = await res.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    return { status: res.status, body, headers: res.headers };
  };
  post = (p, obj, headers) => call(p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(obj),
  });

  process.on('exit', () => { try { fs.unlinkSync(tmpFile); } catch { /* already gone */ } });
});

const teacherSettings = (allowedDomains, policy) =>
  post('/api/students/settings', { password: TEACHER_PW, allowedDomains, policy });

describe('shared student identity endpoint', () => {
  let token;
  before(async () => {
    await teacherSettings(['iecomaruga.cat'], 'open');
    token = (await post('/api/student/login', { googleIdToken: 'tok-marta' })).body.studentToken;
  });

  it('returns only the verified student profile and never caches it', async () => {
    const r = await call('/api/student/me?email=impostor@iecomaruga.cat', { headers: { 'X-Student-Token': token } });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body.student).sort(), ['className', 'displayName', 'email', 'studentKey']);
    assert.equal(r.body.student.email, 'marta@iecomaruga.cat');
    assert.equal(r.body.student.studentKey, 'usr_marta@iecomaruga.cat');
    assert.equal(r.headers.get('cache-control'), 'no-store');
  });

  it('uses the current roster even when the session has an older class', async () => {
    await post('/api/students/upsert', { password: TEACHER_PW, email: 'marta@iecomaruga.cat', className: '3C' });
    const r = await call('/api/student/me', { headers: { 'X-Student-Token': token } });
    assert.equal(r.body.student.className, '3C');
    await post('/api/students/delete', { password: TEACHER_PW, email: 'marta@iecomaruga.cat' });
  });

  it('rejects missing, tampered and expired sessions', async () => {
    const payload = Buffer.from(JSON.stringify({ email: 'marta@iecomaruga.cat', exp: Math.floor(Date.now() / 1000) - 10 })).toString('base64url');
    const expired = `${payload}.${createHmac('sha256', env.STUDENT_SESSION_KEY).update(payload).digest('base64url')}`;
    for (const invalid of ['', `${token}tampered`, expired]) {
      const r = await call('/api/student/me', { headers: { 'X-Student-Token': invalid } });
      assert.equal(r.status, 401);
      assert.equal(r.body.reason, 'signin');
      assert.equal(r.headers.get('cache-control'), 'no-store');
    }
  });

  it('invalidates shared sessions when the PinPlay signing key is rotated', async () => {
    const originalKey = env.STUDENT_SESSION_KEY;
    try {
      env.STUDENT_SESSION_KEY = 'rotated-test-key';
      assert.equal((await call('/api/student/me', { headers: { 'X-Student-Token': token } })).status, 401);
    } finally {
      env.STUDENT_SESSION_KEY = originalKey;
    }
  });
});

describe('student sign-in configuration', () => {
  it('reports sign-in as available and names the client id', async () => {
    const r = await call('/api/student/config');
    assert.equal(r.body.loginEnabled, true);
    assert.equal(r.body.googleClientId, GOOGLE_CLIENT_ID);
  });

  it('allows the student token header through CORS', async () => {
    const r = await call('/api/student/config');
    assert.match(r.headers.get('access-control-allow-headers') || '', /X-Student-Token/);
  });

  it('refuses roster admin without the teacher password', async () => {
    assert.equal((await call('/api/students')).status, 400);
    assert.equal((await call('/api/students?password=wrong')).status, 401);
  });
});

describe('signing in with Google', () => {
  before(async () => { await teacherSettings(['iecomaruga.cat'], 'open'); });

  it('accepts a verified school account and auto-enrols it', async () => {
    const r = await post('/api/student/login', { googleIdToken: 'tok-nel' });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.enrolled, true);
    assert.equal(r.body.student.displayName, 'Nel Oru');
    assert.ok(r.body.studentToken.includes('.'));
  });

  it('refuses an account outside the allowed domain', async () => {
    const r = await post('/api/student/login', { googleIdToken: 'tok-outsider' });
    assert.equal(r.status, 403);
    assert.equal(r.body.reason, 'domain');
  });

  it('refuses a token minted for a different app', async () => {
    assert.equal((await post('/api/student/login', { googleIdToken: 'tok-wrongaud' })).status, 401);
  });

  it('refuses an unverified email', async () => {
    assert.equal((await post('/api/student/login', { googleIdToken: 'tok-unverified' })).status, 401);
  });

  it('refuses a token Google does not recognise', async () => {
    assert.equal((await post('/api/student/login', { googleIdToken: 'garbage' })).status, 401);
  });
});

describe('the roster', () => {
  it('shows a newly signed-in student with no class yet', async () => {
    const r = await call('/api/students?password=' + encodeURIComponent(TEACHER_PW));
    const nel = r.body.students.find((s) => s.email === 'neloru@iecomaruga.cat');
    assert.ok(nel);
    assert.equal(nel.className, '');
  });

  it('lets the teacher set a class', async () => {
    const r = await post('/api/students/upsert', { password: TEACHER_PW, email: 'neloru@iecomaruga.cat', className: '4B' });
    assert.equal(r.body.student.className, '4B');
  });

  it('imports a CSV with names, classes and old usernames', async () => {
    const r = await post('/api/students/import', {
      password: TEACHER_PW,
      csv: 'email,name,class,username\nmarta@iecomaruga.cat,Marta Vidal,4B,martav\njoan@iecomaruga.cat,Joan Puig,3A,joanp',
    });
    assert.equal(r.body.created, 2);
  });

  it('exports what it holds', async () => {
    const r = await call('/api/students/export.csv?password=' + encodeURIComponent(TEACHER_PW));
    assert.match(r.body.raw, /neloru@iecomaruga\.cat/);
    assert.match(r.body.raw, /Marta Vidal/);
  });

  it('carries the teacher-set class into the next sign-in', async () => {
    const r = await post('/api/student/login', { googleIdToken: 'tok-nel' });
    assert.equal(r.body.enrolled, false);
    assert.equal(r.body.student.className, '4B');
  });

  it('resolves historical names to emails and classes', async () => {
    const r = await post('/api/assignments/lookup-emails', {
      password: TEACHER_PW,
      usernames: ['martav', 'Joan Puig', 'nobody'],
    });
    const byName = Object.fromEntries(r.body.results.map((x) => [x.username, x]));
    assert.equal(byName.martav.email, 'marta@iecomaruga.cat');
    assert.equal(byName['joan puig'].class, '3A');
    assert.equal(byName.nobody, undefined);
  });

  it('removes a student on request', async () => {
    await post('/api/students/delete', { password: TEACHER_PW, email: 'joan@iecomaruga.cat' });
    const r = await call('/api/students?password=' + encodeURIComponent(TEACHER_PW));
    assert.equal(r.body.students.some((s) => s.email === 'joan@iecomaruga.cat'), false);
  });
});

describe('assignments identify students by their session', () => {
  let code;
  let token;

  before(async () => {
    token = (await post('/api/student/login', { googleIdToken: 'tok-nel' })).body.studentToken;
    const r = await post('/api/assignments/create', {
      password: TEACHER_PW,
      title: 'Unit 1',
      className: '4B',
      randomNames: false,
      attemptsLimit: 0,
      quiz: { title: 'Unit 1', questions: [{ type: 'tf', prompt: 'Is this on?', answers: ['True', 'False'], correctIndex: 0 }] },
    });
    code = r.body.assignment.code;
  });

  it('refuses to start without a session', async () => {
    const r = await post('/api/assignment/start', { code, studentName: 'ignored' });
    assert.equal(r.status, 401);
    assert.equal(r.body.reason, 'signin');
  });

  it('refuses a forged session token', async () => {
    const r = await post('/api/assignment/start', { code }, { 'X-Student-Token': 'forged.token' });
    assert.equal(r.status, 401);
  });

  it('stamps the roster name, verified email and class on the attempt', async () => {
    const r = await post('/api/assignment/start', { code }, { 'X-Student-Token': token });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.attempt.studentName, 'Nel Oru');
    assert.equal(r.body.attempt.studentEmail, 'neloru@iecomaruga.cat');
    assert.equal(r.body.attempt.className, '4B');
  });

  it('ignores a studentKey the client tries to supply', async () => {
    // A student must not be able to file work under someone else's key.
    const r = await post('/api/assignment/check-status',
      { code, studentKey: 'usr_someoneelse@iecomaruga.cat' },
      { 'X-Student-Token': token });
    assert.equal(r.body.hasOpenAttempt, true);
  });

  it('shows the teacher the class and email on the attempt', async () => {
    const r = await post('/api/assignments/results', { password: TEACHER_PW, code });
    const att = r.body.attempts.find((a) => a.studentEmail === 'neloru@iecomaruga.cat');
    assert.ok(att);
    assert.equal(att.className, '4B');
  });

  it('keeps attempt history private to its owner', async () => {
    assert.equal((await call(`/api/assignment/attempts?code=${code}`)).status, 401);
    const mine = await call(`/api/assignment/attempts?code=${code}`, { headers: { 'X-Student-Token': token } });
    assert.equal(mine.body.ok, true);
  });

  it('does not let one student read another student\'s history', async () => {
    const other = (await post('/api/student/login', { googleIdToken: 'tok-marta' })).body.studentToken;
    const r = await call(`/api/assignment/attempts?code=${code}`, { headers: { 'X-Student-Token': other } });
    assert.equal(r.body.attempts.length, 0);
  });
});

describe('roster-only sign-in policy', () => {
  before(async () => { await teacherSettings(['iecomaruga.cat'], 'roster'); });

  it('refuses a school account that is not on the list', async () => {
    const r = await post('/api/student/login', { googleIdToken: 'tok-newkid' });
    assert.equal(r.status, 403);
    assert.equal(r.body.reason, 'not-listed');
  });

  it('still admits a student who is on the list', async () => {
    assert.equal((await post('/api/student/login', { googleIdToken: 'tok-nel' })).body.ok, true);
  });
});

describe('random-name assignments stay anonymous', () => {
  let code;

  before(async () => {
    const r = await post('/api/assignments/create', {
      password: TEACHER_PW,
      title: 'Anonymous round',
      randomNames: true,
      attemptsLimit: 0,
      quiz: { title: 'Anon', questions: [{ type: 'tf', prompt: 'Ok?', answers: ['True', 'False'], correctIndex: 0 }] },
    });
    code = r.body.assignment.code;
  });

  it('starts with only a client-supplied key and no sign-in', async () => {
    const r = await post('/api/assignment/start', { code, studentKey: 'usr_pikachu', studentName: 'Pikachu' });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.attempt.studentName, 'Pikachu');
  });

  it('records no email for an anonymous attempt', async () => {
    const r = await post('/api/assignments/results', { password: TEACHER_PW, code });
    assert.equal(r.body.attempts[0].studentEmail, '');
  });

  it('still returns attempt history for that key', async () => {
    const r = await post('/api/assignment/check-status', { code, studentKey: 'usr_pikachu' });
    assert.equal(r.body.hasOpenAttempt, true);
  });
});

describe('live games identify players by their session', () => {
  let pin;
  let token;

  before(async () => {
    await teacherSettings(['iecomaruga.cat'], 'open');
    token = (await post('/api/student/login', { googleIdToken: 'tok-nel' })).body.studentToken;
    const r = await post('/api/create', {
      password: TEACHER_PW,
      options: { randomNames: false },
      quiz: { title: 'Live', questions: [{ type: 'tf', prompt: 'Ready?', answers: ['True', 'False'], correctIndex: 0 }] },
    });
    pin = r.body.pin;
  });

  it('refuses to join a login-required game without a session', async () => {
    const r = await post('/api/join', { pin, name: 'Nel Oru', clientId: 'c_one' });
    assert.equal(r.status, 401);
    assert.equal(r.body.reason, 'signin');
  });

  it('admits a signed-in student with the identity their assignments use', async () => {
    const r = await post('/api/join', { pin, clientId: 'c_two', studentToken: token });
    assert.equal(r.body.name, 'Nel Oru');
    // The key matches makeStudentKeyFromEmail, so a snapshotted live game and
    // the student's homework join up instead of landing under two identities.
    assert.equal(r.body.identity.studentKey, 'usr_neloru@iecomaruga.cat');
    assert.equal(r.body.identity.email, 'neloru@iecomaruga.cat');
    // The class travels with the player, so the host list can show "(4B)".
    assert.equal(r.body.identity.className, '4B');
  });

  it('returns the same player when the same device rejoins', async () => {
    const r = await post('/api/join', { pin, clientId: 'c_two', studentToken: token });
    assert.equal(r.body.alreadyJoined, true);
    assert.equal(r.body.name, 'Nel Oru');
  });

  it('stops the same student joining again from another device', async () => {
    const again = await post('/api/join', { pin, clientId: 'c_other_device', studentToken: token });
    assert.equal(again.status, 409);
  });

  it('lets a random-name game run with no session at all', async () => {
    const created = await post('/api/create', {
      password: TEACHER_PW,
      options: { randomNames: true },
      quiz: { title: 'Anon live', questions: [{ type: 'tf', prompt: 'Ok?', answers: ['True', 'False'], correctIndex: 0 }] },
    });
    const r = await post('/api/join', { pin: created.body.pin, clientId: 'c_anon' });
    assert.ok(r.body.playerId);
    assert.equal(r.body.identity.email, '');
  });
});
