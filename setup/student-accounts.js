/**
 * PinPlay self-service student accounts (teacher deployments only).
 *
 * This module is ADDITIVE and owner-safe: it is wired in by the setup wizard via a
 * thin wrapper worker that calls handleStudentRoutes() first and falls through to
 * the owner's UNMODIFIED worker for everything else. The owner's own deployment
 * never sets STUDENT_ACCOUNTS=self, so none of this runs for the owner.
 *
 * Identity model (matches the existing email-keyed attempt logic in worker.js):
 *   - email      = stable primary key (renaming a username never orphans attempts)
 *   - username   = mutable handle students log in with
 *   - password   = PBKDF2-hashed (never stored or returned in clear)
 * Email is captured verified via "Sign in with Google" (or typed + confirmed).
 *
 * It exposes the SAME roster-lookup contract the owner's lookupAndVerifyStudent()
 * already speaks, so the wizard just points STUDENT_ROSTER_LOOKUP_URL at this
 * worker's own /api/students/lookup — zero changes to worker.js.
 *
 * Storage (in the teacher's own R2 bucket, env.QUIZ_MEDIA):
 *   students/accounts/<sha256(email)>.json  = { email, username, passwordHash, emailVerified, createdAt }
 *   students/usernames/<lower(username)>.json = { email }   (login + uniqueness index)
 */

const PREFIX = '/api/students/';

export async function handleStudentRoutes(request, env, ctx) { // eslint-disable-line no-unused-vars
  // Only active for wizard-provisioned teacher workers.
  if (String(env.STUDENT_ACCOUNTS || '') !== 'self') return null;

  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;

  if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (!env.QUIZ_MEDIA) return jres({ ok: false, error: 'Storage not configured.' }, 501);

  const route = url.pathname.slice(PREFIX.length);
  try {
    if (route === 'config' && request.method === 'GET') return await routeConfig(env);
    if (route === 'lookup' && request.method === 'POST') return await routeLookup(request, env);
    if (route === 'signup' && request.method === 'POST') return await routeSignup(request, env);
    if (route === 'recover' && request.method === 'POST') return await routeRecover(request, env);
    if (route === 'reset-password' && request.method === 'POST') return await routeReset(request, env);
    return jres({ ok: false, error: 'Unknown student route.' }, 404);
  } catch (e) {
    return jres({ ok: false, error: 'Server error.', detail: String(e && e.message || e) }, 500);
  }
}

// ---------- Routes ----------

async function routeConfig(env) {
  return jres({ ok: true, mode: 'self', googleClientId: String(env.GOOGLE_CLIENT_ID || '') });
}

// Roster-lookup contract used by the owner worker's lookupAndVerifyStudent().
//   in : { usernames:[name,...], secret, password? }
//   out: { ok:true, results:[ { email, passwordOk }, ... ] }
async function routeLookup(request, env) {
  const body = await safeJson(request);
  const secret = String(env.STUDENT_ROSTER_LOOKUP_SECRET || '');
  if (secret && String(body?.secret || '') !== secret) return jres({ ok: false, error: 'Unauthorized.' }, 401);

  const usernames = Array.isArray(body?.usernames) ? body.usernames : [];
  const password = typeof body?.password === 'string' ? body.password : null;
  const results = [];
  for (const raw of usernames) {
    const acct = await loadAccountByUsername(env, raw);
    if (!acct) { results.push({ email: '', passwordOk: password != null ? false : null }); continue; }
    const passwordOk = password != null ? await verifyPassword(password, acct.passwordHash) : null;
    results.push({ email: acct.email, passwordOk });
  }
  return jres({ ok: true, results });
}

async function routeSignup(request, env) {
  const body = await safeJson(request);
  const username = sanitizeUsername(body?.username);
  const password = String(body?.password || '');
  if (!username) return jres({ ok: false, error: 'Choose a username (2-40 letters/numbers).' }, 400);
  if (password.length < 6) return jres({ ok: false, error: 'Password must be at least 6 characters.' }, 400);

  // Email: verified via Google when a token is supplied; otherwise the typed value.
  let email = '';
  let emailVerified = false;
  if (body?.googleIdToken) {
    email = await verifyGoogleEmail(body.googleIdToken, env.GOOGLE_CLIENT_ID);
    if (!email) return jres({ ok: false, error: 'Google sign-in could not be verified.' }, 401);
    emailVerified = true;
  } else {
    email = normalizeEmail(body?.email);
    if (!email) return jres({ ok: false, error: 'A valid email is required.' }, 400);
  }

  if (await loadAccountByEmail(env, email)) {
    return jres({ ok: false, error: 'That email already has an account — log in or use "Forgotten login".' }, 409);
  }
  if (await loadUsernameIndex(env, username)) {
    return jres({ ok: false, error: 'That username is taken — pick another.' }, 409);
  }

  const acct = { email, username, passwordHash: await hashPassword(password), emailVerified, createdAt: Date.now() };
  await putJson(env, accountKeyForEmail(await sha256hex(email)), acct);
  await putJson(env, usernameKey(username), { email });
  return jres({ ok: true, username, email });
}

async function routeRecover(request, env) {
  const body = await safeJson(request);
  const email = await verifyGoogleEmail(body?.googleIdToken, env.GOOGLE_CLIENT_ID);
  if (!email) return jres({ ok: false, error: 'Sign in with the Google account you used to register.' }, 401);
  const acct = await loadAccountByEmail(env, email);
  if (!acct) return jres({ ok: false, error: 'No account is registered to this Google email yet.' }, 404);
  const resetToken = await signToken(env, { email, exp: Math.floor(Date.now() / 1000) + 900 });
  return jres({ ok: true, username: acct.username, resetToken });
}

async function routeReset(request, env) {
  const body = await safeJson(request);
  const newPassword = String(body?.newPassword || '');
  if (newPassword.length < 6) return jres({ ok: false, error: 'Password must be at least 6 characters.' }, 400);
  const claim = await verifyToken(env, String(body?.resetToken || ''));
  if (!claim?.email) return jres({ ok: false, error: 'This reset link has expired — request a new one.' }, 401);
  const acct = await loadAccountByEmail(env, claim.email);
  if (!acct) return jres({ ok: false, error: 'Account not found.' }, 404);
  acct.passwordHash = await hashPassword(newPassword);
  await putJson(env, accountKeyForEmail(await sha256hex(acct.email)), acct);
  return jres({ ok: true, username: acct.username });
}

// ---------- Storage ----------

const accountKeyForEmail = (emailHash) => `students/accounts/${emailHash}.json`;
const usernameKey = (username) => `students/usernames/${String(username).toLowerCase()}.json`;

async function loadAccountByEmail(env, email) {
  return await getJson(env, accountKeyForEmail(await sha256hex(normalizeEmail(email))));
}
async function loadUsernameIndex(env, username) {
  return await getJson(env, usernameKey(sanitizeUsername(username)));
}
async function loadAccountByUsername(env, username) {
  const u = sanitizeUsername(username);
  if (!u) return null;
  const idx = await getJson(env, usernameKey(u));
  if (!idx?.email) return null;
  return await loadAccountByEmail(env, idx.email);
}
async function getJson(env, key) {
  const obj = await env.QUIZ_MEDIA.get(key);
  if (!obj) return null;
  try { return JSON.parse(await obj.text()); } catch { return null; }
}
async function putJson(env, key, value) {
  await env.QUIZ_MEDIA.put(key, JSON.stringify(value), { httpMetadata: { contentType: 'application/json' } });
}

// ---------- Crypto ----------

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const bits = await pbkdf2Bits(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10) || 100000;
  const salt = unb64(parts[2]);
  const bits = await pbkdf2Bits(password, salt, iterations);
  return timingEqual(b64(new Uint8Array(bits)), parts[3]);
}
async function pbkdf2Bits(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
}

async function signToken(env, claim) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claim)));
  const sig = await hmac(tokenSecret(env), payload);
  return `${payload}.${sig}`;
}
async function verifyToken(env, token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  if (!timingEqual(sig, await hmac(tokenSecret(env), payload))) return null;
  let claim;
  try { claim = JSON.parse(new TextDecoder().decode(unb64url(payload))); } catch { return null; }
  if (!claim?.exp || claim.exp < Math.floor(Date.now() / 1000)) return null;
  return claim;
}
function tokenSecret(env) {
  return String(env.CREATOR_SIGNING_KEY || env.STUDENT_ROSTER_LOOKUP_SECRET || 'pinplay-student');
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return b64url(new Uint8Array(sig));
}

async function verifyGoogleEmail(idToken, clientId) {
  if (!idToken) return '';
  try {
    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(idToken)));
    if (!res.ok) return '';
    const p = await res.json();
    if (clientId && String(p.aud || '') !== String(clientId)) return '';
    if (p.email_verified !== true && p.email_verified !== 'true') return '';
    return normalizeEmail(p.email);
  } catch { return ''; }
}

// ---------- Helpers ----------

async function sha256hex(str) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str || '')));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}
function sanitizeUsername(name) {
  const u = String(name || '').trim();
  return /^[A-Za-z0-9._-]{2,40}$/.test(u) ? u : '';
}
function timingEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function b64(bytes) { let s = ''; for (const x of bytes) s += String.fromCharCode(x); return btoa(s); }
function unb64(str) { const s = atob(String(str)); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
function b64url(bytes) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(str) { let s = String(str).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return unb64(s); }
async function safeJson(request) { try { return await request.json(); } catch { return {}; } }
function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
function jres(obj, status = 200) {
  return cors(new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }));
}
