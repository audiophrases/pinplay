// Pure handler, tested without a Cloudflare-specific import. It is reachable only
// through the named Worker entrypoint in classroom-entry.mjs.
export function classroomHandler(helpers) {
  const encoder = new TextEncoder();
  const encode = (data) => btoa(String.fromCharCode(...new Uint8Array(data))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decode = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const digest = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const failure = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
  async function key(env) {
    const secret = helpers.studentSessionSecret(env);
    if (!secret) failure(503, 'Classroom sessions need a signing key in PinPlay.');
    // Legacy PinPlay token verifiers predate an audience claim. A separate,
    // derived key prevents Singing credentials being accepted as those tokens.
    const root = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const derived = await crypto.subtle.sign('HMAC', root, encoder.encode('singing:classroom-session:v1'));
    return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  async function sign(env, principal) {
    const claim = { aud: 'singing', sub: principal.id, role: principal.role, email: principal.email || '', wsid: principal.wsid || '', exp: Math.floor(Date.now() / 1000) + 8 * 3600, nonce: crypto.randomUUID() };
    const payload = encode(encoder.encode(JSON.stringify(claim)));
    return `${payload}.${encode(await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)))}`;
  }
  async function directory(env, action, data = {}) {
    const stub = env.ROOMS.get(env.ROOMS.idFromName('__assignments_registry__'));
    const res = await stub.fetch(new Request(`https://room/classroom/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }));
    if (!res.ok) failure(503, 'The shared directory is unavailable.');
    return res.json();
  }
  async function classes(env) {
    const result = await helpers.rosterCall(env, 'list', { method: 'GET' });
    if (!result.ok) failure(503, 'The shared roster is unavailable.');
    const names = [...new Set((result.data.students || []).map((s) => s.className).filter(Boolean))];
    return Promise.all(names.sort().map(async (name) => ({ id: `class_${(await digest(name)).slice(0, 24)}`, name })));
  }
  async function current(env, credential) {
    let claim;
    try {
      const [payload, sig, extra] = String(credential || '').split('.');
      if (!payload || !sig || extra || !(await crypto.subtle.verify('HMAC', await key(env), decode(sig), encoder.encode(payload)))) failure(401, 'Invalid session.');
      claim = JSON.parse(new TextDecoder().decode(decode(payload)));
    } catch (e) { failure(e.status === 503 ? 503 : 401, e.status === 503 ? e.message : 'Invalid session.'); }
    if (claim.aud !== 'singing' || !Number.isFinite(claim.exp) || claim.exp <= Date.now() / 1000) failure(401, 'Your session expired.');
    if (claim.role === 'owner' && claim.sub === 'owner') return { id: 'owner', role: 'owner', displayName: 'Teacher administrator' };
    if (claim.role === 'teacher' && claim.wsid) {
      if (!(await env.QUIZ_MEDIA.head(`workspaces/${claim.wsid}/_meta.json`))) failure(401, 'This workspace was revoked.');
      return { id: `workspace_${claim.wsid}`, role: 'teacher', displayName: 'Teacher workspace', classIds: [] };
    }
    if (claim.role === 'teacher') {
      const { teacher } = await directory(env, 'teacher', { email: claim.email });
      if (!teacher?.active || teacher.id !== claim.sub) failure(403, 'Teacher access was revoked.');
      return { ...teacher, role: 'teacher' };
    }
    if (claim.role === 'student') {
      // Never fall back to stale claims for private classroom resources.
      const row = await helpers.rosterGetStudent(env, claim.email);
      const settings = await helpers.rosterGetSettings(env);
      if (!row || !helpers.isEmailAllowed(claim.email, settings.allowedDomains)) failure(403, 'You are no longer enrolled.');
      const list = await classes(env);
      return { id: claim.sub, role: 'student', email: row.email, displayName: row.displayName, classIds: list.filter((c) => c.name === row.className).map((c) => c.id) };
    }
    failure(401, 'Invalid session.');
  }
  return async function fetch(request, env) {
    try {
      if (request.method !== 'POST') failure(405, 'POST required.');
      const raw = await request.text();
      if (raw.length > 16384) failure(413, 'Request too large.');
      const body = JSON.parse(raw); const path = new URL(request.url).pathname;
      if (path === '/config') return reply({ googleClientId: String(env.GOOGLE_CLIENT_ID || '') });
      if (path === '/login') {
        let principal;
        if (body.password || body.workspaceToken) {
          const authRequest = new Request('https://identity/login', { headers: { 'CF-Connecting-IP': String(body.ip || 'unknown'), 'Authorization': `Bearer ${body.workspaceToken || body.password}` } });
          const auth = await helpers.resolveAuth(env, authRequest);
          if (!auth) failure(401, 'Sign-in could not be verified.');
          principal = auth.role === 'owner'
            ? { id: 'owner', role: 'owner', displayName: 'Teacher administrator' }
            : { id: `workspace_${auth.wsid}`, wsid: auth.wsid, role: 'teacher', displayName: 'Teacher workspace', classIds: [] };
        } else {
          let profile;
          if (body.googleIdToken) profile = await helpers.verifyGoogleIdToken(body.googleIdToken, env.GOOGLE_CLIENT_ID);
          else if (body.studentToken) profile = await helpers.verifyStudentToken(env, body.studentToken);
          if (!profile?.email) failure(401, 'Google sign-in could not be verified.');
          const { teacher } = await directory(env, 'teacher', { email: profile.email });
          if (teacher?.active) principal = { ...teacher, role: 'teacher' };
          else {
            const settings = await helpers.rosterGetSettings(env);
            if (!helpers.isEmailAllowed(profile.email, settings.allowedDomains)) failure(403, 'That account is not allowed here.');
            const login = await helpers.rosterCall(env, 'login', { method: 'POST', body: JSON.stringify({ email: profile.email, name: profile.name }) });
            if (!login.ok) failure(login.status || 403, login.data?.error || 'Enrollment required.');
            principal = { id: `usr_${profile.email}`, email: profile.email, role: 'student' };
          }
        }
        const credential = await sign(env, principal);
        return reply({ credential, principal: await current(env, credential) });
      }
      const principal = await current(env, body.credential);
      if (path === '/verify') return reply({ principal });
      if (!['owner', 'teacher'].includes(principal.role)) failure(403, 'Teacher access required.');
      if (path === '/classes') {
        const list = await classes(env);
        return reply({ classes: principal.role === 'owner' ? list : list.filter((c) => principal.classIds?.includes(c.id)) });
      }
      if (path === '/roster') {
        const list = await classes(env);
        const allowed = new Set(list.filter((c) => principal.role === 'owner' || principal.classIds?.includes(c.id)).map((c) => c.name));
        const roster = await helpers.rosterCall(env, 'list', { method: 'GET' });
        if (!roster.ok) failure(503, 'The shared roster is unavailable.');
        return reply({ students: (roster.data.students || []).filter((s) => principal.role === 'owner' || allowed.has(s.className)).map(({ email, displayName, className }) => ({ id: `usr_${email}`, email, displayName, className })) });
      }
      if (principal.role !== 'owner') failure(403, 'Administrator access required.');
      if (path === '/teachers') return reply(await directory(env, 'teachers'));
      if (path === '/teachers/save') return reply(await directory(env, 'save-teacher', body));
      failure(404, 'Unknown identity operation.');
    } catch (error) {
      return reply({ error: error.status ? error.message : 'The shared identity service is unavailable.' }, error.status || 503);
    }
  };
}
