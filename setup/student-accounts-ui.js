/*
 * PinPlay self-service student accounts — frontend enhancement (teacher deploys only).
 *
 * Loaded only on wizard-provisioned teacher sites (the wizard injects the <script>
 * and sets window.__PINPLAY_API). It self-gates: if the worker isn't in self mode,
 * it does nothing. It NEVER ships in the owner's build.
 *
 * It adds, on the student join page:
 *   - "Create a student account" — email (verified via Google, or typed + confirmed)
 *     + username + password -> POST /api/students/signup
 *   - "Forgotten login?" — Sign in with Google -> POST /api/students/recover ->
 *     shows the username and lets them set a new password (-> /api/students/reset-password)
 * On success it fills the existing username/password fields so the student just clicks Join.
 */
(function () {
  'use strict';

  var API = String(window.__PINPLAY_API || '').replace(/\/+$/, '');
  if (!API) return;

  var clientId = '';
  var gsiResolve = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    var cfg = await getJson('/api/students/config');
    if (!cfg || cfg.mode !== 'self') return; // not a self-service teacher site
    clientId = String(cfg.googleClientId || '');
    injectEntryPoints();
  }

  // ---- API helpers ----
  async function getJson(path) {
    try {
      var r = await fetch(API + path, { method: 'GET' });
      return await r.json();
    } catch (e) { return null; }
  }
  async function postJson(path, body) {
    try {
      var r = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      var data = await r.json();
      return { ok: r.ok && data && data.ok !== false, data: data || {} };
    } catch (e) { return { ok: false, data: { error: 'Network error.' } }; }
  }

  // ---- Google Identity Services ----
  function loadGsi() {
    return new Promise(function (resolve) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  async function renderGoogleButton(targetEl) {
    if (!clientId) return false;
    var ok = await loadGsi();
    if (!ok) return false;
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: function (resp) { if (gsiResolve) { var f = gsiResolve; gsiResolve = null; f(resp && resp.credential); } },
      });
      window.google.accounts.id.renderButton(targetEl, { theme: 'filled_blue', size: 'large', text: 'continue_with', width: 260 });
      return true;
    } catch (e) { return false; }
  }
  function awaitCredential() { return new Promise(function (res) { gsiResolve = res; }); }
  function emailFromToken(t) {
    try {
      var p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return String(JSON.parse(decodeURIComponent(escape(atob(p)))).email || '').toLowerCase();
    } catch (e) { return ''; }
  }

  // ---- UI: entry points on the join page ----
  function injectEntryPoints() {
    // Self-service mode supplies its own signup + recovery below, so drop the
    // hardcoded "No account? Sign up · Forgot…" hint: it points at the OWNER's
    // Google Form / lookup URL and is wrong for any other teacher's site.
    // Removed (not just hidden) because play.js re-toggles its visibility after
    // load; its `if (joinSignupHintEl)` guards stay safe on the detached node.
    var ownerHint = document.getElementById('joinSignupHint');
    if (ownerHint) ownerHint.remove();

    var anchor = document.getElementById('joinStepIdentity')
      || (document.getElementById('joinPassword') || {}).parentElement
      || document.getElementById('joinNameWrap')
      || document.body;
    if (document.getElementById('paStudentBox')) return;
    var box = el('div', { id: 'paStudentBox', style: 'margin-top:.6rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;font-size:.95rem;' });
    var signup = el('button', { type: 'button', id: 'paSignupBtn', class: 'btn', style: btnStyle('#3b82f6') }, '🆕 Create a student account');
    var forgot = el('a', { href: '#', id: 'paForgotBtn', style: 'color:#3b82f6;text-decoration:underline;cursor:pointer;' }, 'Forgotten your login?');
    signup.addEventListener('click', function (e) { e.preventDefault(); openSignup(); });
    forgot.addEventListener('click', function (e) { e.preventDefault(); openForgot(); });
    box.appendChild(signup); box.appendChild(forgot);
    anchor.appendChild(box);
  }

  // ---- Sign up ----
  function openSignup() {
    var state = { idToken: '', email: '' };
    var emailRow = el('div', {});
    var unameInput = input('Username (you log in with this)', 'text');
    var pwInput = input('Password (min 6 characters)', 'password');
    var status = el('div', { style: 'min-height:1.2em;color:#b91c1c;font-size:.9rem;margin-top:.4rem;' });
    var submit = el('button', { type: 'button', class: 'btn', style: btnStyle('#16a34a') }, 'Create account');

    function renderEmail() {
      emailRow.innerHTML = '';
      emailRow.appendChild(el('div', { style: 'font-weight:600;margin-bottom:.3rem;' }, '1. Your email (this is your permanent ID)'));
      if (state.email) {
        emailRow.appendChild(el('div', { style: 'color:#16a34a;' }, '✓ ' + state.email + (state.idToken ? ' (verified by Google)' : '')));
        return;
      }
      if (clientId) {
        var gbtn = el('div', { style: 'margin:.3rem 0;' });
        emailRow.appendChild(gbtn);
        renderGoogleButton(gbtn).then(function (rendered) {
          if (rendered) {
            awaitCredential().then(function (cred) {
              if (!cred) return;
              state.idToken = cred; state.email = emailFromToken(cred); renderEmail();
            });
          }
          emailRow.appendChild(typedEmailFallback(rendered ? 'or use another email' : ''));
        });
      } else {
        emailRow.appendChild(typedEmailFallback(''));
      }
    }
    function typedEmailFallback(label) {
      var wrap = el('div', { style: 'margin-top:.4rem;' });
      if (label) wrap.appendChild(el('div', { style: 'color:#6b7280;font-size:.85rem;margin:.2rem 0;' }, label));
      var e1 = input('Email', 'email');
      var e2 = input('Confirm email', 'email');
      var use = el('button', { type: 'button', class: 'btn', style: btnStyle('#3b82f6') }, 'Use this email');
      use.addEventListener('click', function () {
        var a = e1.value.trim().toLowerCase(), b = e2.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) { status.textContent = 'Enter a valid email.'; return; }
        if (a !== b) { status.textContent = 'The two emails do not match.'; return; }
        state.idToken = ''; state.email = a; status.textContent = ''; renderEmail();
      });
      wrap.appendChild(e1); wrap.appendChild(e2); wrap.appendChild(use);
      return wrap;
    }

    submit.addEventListener('click', async function () {
      status.style.color = '#b91c1c';
      if (!state.email) { status.textContent = 'Choose your email first (step 1).'; return; }
      if (!/^[A-Za-z0-9._-]{2,40}$/.test(unameInput.value.trim())) { status.textContent = 'Username: 2-40 letters, numbers, . _ -'; return; }
      if (pwInput.value.length < 6) { status.textContent = 'Password must be at least 6 characters.'; return; }
      submit.disabled = true; status.style.color = '#6b7280'; status.textContent = 'Creating…';
      var payload = { username: unameInput.value.trim(), password: pwInput.value };
      if (state.idToken) payload.googleIdToken = state.idToken; else payload.email = state.email;
      var res = await postJson('/api/students/signup', payload);
      submit.disabled = false;
      if (!res.ok) { status.style.color = '#b91c1c'; status.textContent = res.data.error || 'Could not create account.'; return; }
      fillLogin(unameInput.value.trim(), pwInput.value);
      closeModal();
    });

    renderEmail();
    showModal('Create a student account', [
      emailRow,
      el('div', { style: 'font-weight:600;margin:.8rem 0 .3rem;' }, '2. Pick a username & password'),
      unameInput, pwInput, submit, status,
    ]);
  }

  // ---- Forgotten login ----
  function openForgot() {
    var status = el('div', { style: 'min-height:1.2em;color:#6b7280;font-size:.9rem;margin-top:.4rem;' });
    var area = el('div', {});
    if (!clientId) {
      status.style.color = '#b91c1c';
      status.textContent = 'Ask your teacher to reset your password (Google recovery is not set up).';
      showModal('Forgotten login', [area, status]);
      return;
    }
    var gbtn = el('div', { style: 'margin:.3rem 0;' });
    area.appendChild(el('div', { style: 'margin-bottom:.4rem;' }, 'Sign in with the Google account you registered with:'));
    area.appendChild(gbtn);
    showModal('Forgotten login', [area, status]);
    renderGoogleButton(gbtn).then(function (rendered) {
      if (!rendered) { status.style.color = '#b91c1c'; status.textContent = 'Google sign-in unavailable.'; return; }
      awaitCredential().then(async function (cred) {
        if (!cred) return;
        status.style.color = '#6b7280'; status.textContent = 'Checking…';
        var res = await postJson('/api/students/recover', { googleIdToken: cred });
        if (!res.ok) { status.style.color = '#b91c1c'; status.textContent = res.data.error || 'No account found.'; return; }
        showReset(res.data.username, res.data.resetToken);
      });
    });
  }
  function showReset(username, resetToken) {
    var pw = input('New password (min 6 characters)', 'password');
    var status = el('div', { style: 'min-height:1.2em;color:#b91c1c;font-size:.9rem;margin-top:.4rem;' });
    var save = el('button', { type: 'button', class: 'btn', style: btnStyle('#16a34a') }, 'Set new password & log in');
    save.addEventListener('click', async function () {
      if (pw.value.length < 6) { status.textContent = 'Password must be at least 6 characters.'; return; }
      save.disabled = true; status.style.color = '#6b7280'; status.textContent = 'Saving…';
      var res = await postJson('/api/students/reset-password', { resetToken: resetToken, newPassword: pw.value });
      save.disabled = false;
      if (!res.ok) { status.style.color = '#b91c1c'; status.textContent = res.data.error || 'Could not reset.'; return; }
      fillLogin(username, pw.value);
      closeModal();
    });
    showModal('Welcome back, ' + username, [
      el('div', { style: 'margin-bottom:.5rem;font-weight:600;' }, 'Your username: ' + username),
      el('div', { style: 'margin-bottom:.5rem;color:#6b7280;font-size:.9rem;' }, 'Set a new password to finish signing in:'),
      pw, save, status,
    ]);
  }

  // ---- Fill the existing join fields ----
  function fillLogin(username, password) {
    setField('joinName', username);
    setField('joinPassword', password);
    var hud = document.getElementById('joinStatus');
    if (hud) { hud.textContent = '✓ Logged in as ' + username + ' — click Join.'; hud.style.color = '#16a34a'; }
  }
  function setField(id, value) {
    var el2 = document.getElementById(id);
    if (!el2) return;
    el2.value = value;
    el2.dispatchEvent(new Event('input', { bubbles: true }));
    el2.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- Tiny DOM + modal helpers ----
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function input(placeholder, type) {
    var i = el('input', { type: type || 'text', placeholder: placeholder, style: 'display:block;width:100%;box-sizing:border-box;margin:.25rem 0;padding:.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;' });
    return i;
  }
  function btnStyle(bg) {
    return 'background:' + bg + ';color:#fff;border:none;padding:.5rem .9rem;border-radius:8px;font-weight:600;cursor:pointer;';
  }
  var overlayEl = null;
  function showModal(title, children) {
    closeModal();
    overlayEl = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:99999;padding:1rem;' });
    var card = el('div', { style: 'background:#fff;color:#111;max-width:420px;width:100%;border-radius:14px;padding:1.2rem;box-shadow:0 10px 40px rgba(0,0,0,.3);max-height:90vh;overflow:auto;' });
    var head = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;' });
    head.appendChild(el('h3', { style: 'margin:0;font-size:1.15rem;' }, title));
    var x = el('button', { type: 'button', style: 'background:none;border:none;font-size:1.4rem;cursor:pointer;line-height:1;' }, '×');
    x.addEventListener('click', closeModal);
    head.appendChild(x);
    card.appendChild(head);
    (children || []).forEach(function (c) { if (c) card.appendChild(c); });
    overlayEl.appendChild(card);
    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) closeModal(); });
    document.body.appendChild(overlayEl);
  }
  function closeModal() { if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl); overlayEl = null; }
})();
