import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker, { QuizRoom, verifyCreatePassword, resolveAuth, verifyGoogleIdToken, verifyStudentToken,
  studentSessionSecret, rosterCall, rosterGetStudent, rosterGetSettings, isEmailAllowed } from '../cloudflare/worker.js';
import { classroomHandler } from '../cloudflare/classroom-identity.mjs';

const handle = classroomHandler({ verifyCreatePassword, resolveAuth, verifyGoogleIdToken, verifyStudentToken,
  studentSessionSecret, rosterCall, rosterGetStudent, rosterGetSettings, isEmailAllowed });
const rows = new Map(); const workspaces = new Map();
const storage = {
  get: async (key) => structuredClone(rows.get(key)),
  put: async (key, value) => { rows.set(key, structuredClone(value)); },
  delete: async (key) => rows.delete(key),
  list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([key]) => key.startsWith(prefix))),
};
const env = { GOOGLE_CLIENT_ID: 'test-client', STUDENT_SESSION_KEY: 'test-only-session-key',
  CREATE_PASSWORD_HASH: createHash('sha256').update('test-password').digest('hex'),
  QUIZ_MEDIA: { head: async (key) => workspaces.get(key) || null },
};
const room = new QuizRoom({ storage }, env);
env.ROOMS = { idFromName: (id) => id, get: () => ({ fetch: (url, init) => room.fetch(url instanceof Request ? url : new Request(url, init)) }) };
let realFetch;
before(() => {
  rows.set('rs:student@school.test', { email: 'student@school.test', displayName: 'Student', className: 'Class A' });
  rows.set('rsettings', { allowedDomains: ['school.test'], policy: 'roster' });
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /^https:\/\/oauth2.googleapis.com\/tokeninfo/);
    const id = new URL(url).searchParams.get('id_token');
    return Response.json({ aud: env.GOOGLE_CLIENT_ID, email_verified: true, email: id, name: id.split('@')[0] });
  };
});
after(() => { globalThis.fetch = realFetch; });
async function call(path, body = {}) {
  const response = await handle(new Request(`https://identity.test/${path}`, { method: 'POST', body: JSON.stringify(body) }), env);
  return { status: response.status, body: await response.json() };
}
async function owner() {
  const result = await call('login', { password: 'test-password' });
  assert.equal(result.status, 200); return result.body.credential;
}

test('teacher password is verified in PinPlay; tokens are scoped and public PinPlay routes stay separate', async () => {
  assert.equal((await call('login', { password: 'wrong' })).status, 401);
  const credential = await owner();
  const checked = await call('verify', { credential });
  assert.equal(checked.body.principal.id, 'owner');
  assert.equal((await call('verify', { credential: credential + 'x' })).status, 401);
  const publicRoute = await worker.fetch(new Request('https://pinplay.test/classroom/teachers', { method: 'POST', body: '{}' }), env);
  assert.equal(publicRoute.status, 404, 'directory methods are not exposed by the public Worker');
});

test('student enrollment and current classes are checked for every shared session', async () => {
  const signed = await call('login', { googleIdToken: 'student@school.test' });
  assert.equal(signed.status, 200);
  const credential = signed.body.credential;
  assert.equal(signed.body.principal.role, 'student');
  assert.match(signed.body.principal.classIds[0], /^class_[a-f0-9]{24}$/);
  const row = rows.get('rs:student@school.test');
  rows.set('rs:student@school.test', { ...row, className: 'Class B' });
  assert.notEqual((await call('verify', { credential })).body.principal.classIds[0], signed.body.principal.classIds[0]);
  rows.delete('rs:student@school.test');
  assert.equal((await call('verify', { credential })).status, 403, 'deleted students cannot fall back to old claims');
  rows.set('rs:student@school.test', row);
});

test('named teachers receive only granted classes; teacher revocation is immediate', async () => {
  const admin = await owner();
  const classes = (await call('classes', { credential: admin })).body.classes;
  const created = await call('teachers/save', { credential: admin, email: 'teacher@school.test', displayName: 'Teacher', classIds: classes.map((c) => c.id), active: true });
  assert.equal(created.status, 200);
  const signed = await call('login', { googleIdToken: 'teacher@school.test' });
  assert.equal(signed.body.principal.role, 'teacher');
  assert.deepEqual((await call('classes', { credential: signed.body.credential })).body.classes, classes);
  assert.equal((await call('teachers', { credential: signed.body.credential })).status, 403);
  assert.equal((await call('roster', { credential: signed.body.credential })).body.students.length, 1);
  await call('teachers/save', { credential: admin, email: 'teacher@school.test', active: false });
  assert.equal((await call('verify', { credential: signed.body.credential })).status, 403);
});

test('Singing credentials cannot be replayed as legacy PinPlay tokens or exchanged for new sessions', async () => {
  const signed = await call('login', { googleIdToken: 'student@school.test' });
  const credential = signed.body.credential;
  assert.equal(await verifyStudentToken(env, credential), null);
  assert.equal((await call('login', { studentToken: credential })).status, 401);
  const savedCreatorKey = env.CREATOR_SIGNING_KEY;
  // Exercise the deployment where student sessions fall back to the guest key.
  env.CREATOR_SIGNING_KEY = env.STUDENT_SESSION_KEY;
  workspaces.set('workspaces/workspace_test/_meta.json', {});
  try {
    const payload = Buffer.from(JSON.stringify({ wsid: 'workspace_test', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const { createHmac } = await import('node:crypto');
    const invitation = `${payload}.${createHmac('sha256', env.CREATOR_SIGNING_KEY).update(payload).digest('base64url')}`;
    const guest = await call('login', { workspaceToken: invitation });
    assert.equal(guest.status, 200);
    assert.equal(guest.body.principal.id, 'workspace_workspace_test');
    assert.equal(await resolveAuth(env, new Request('https://pinplay.test', { headers: { Authorization: `Bearer ${guest.body.credential}` } })), null);
    assert.equal((await call('login', { workspaceToken: guest.body.credential })).status, 401);
    workspaces.delete('workspaces/workspace_test/_meta.json');
    assert.equal((await call('verify', { credential: guest.body.credential })).status, 401);
  } finally { env.CREATOR_SIGNING_KEY = savedCreatorKey; }
});

test('roster outage refuses private access and changing PinPlay signing key invalidates sessions', async () => {
  const signed = await call('login', { googleIdToken: 'student@school.test' });
  const originalGet = env.ROOMS.get;
  env.ROOMS.get = () => ({ fetch: async () => { throw new Error('offline'); } });
  assert.equal((await call('verify', { credential: signed.body.credential })).status, 503);
  env.ROOMS.get = originalGet;
  const originalKey = env.STUDENT_SESSION_KEY;
  env.STUDENT_SESSION_KEY = 'rotated-test-key';
  assert.equal((await call('verify', { credential: signed.body.credential })).status, 401);
  env.STUDENT_SESSION_KEY = originalKey;
});
