/*
 * PinPlay student-roster admin — create-dashboard enhancement (teacher deploys only).
 *
 * The new-teacher equivalent of editing the roster spreadsheet. Injected only on
 * wizard-provisioned teacher sites with self-service accounts enabled (self-gates on
 * /api/students/config). Adds a "Students" panel to manage accounts:
 *   - list (email + username), rename username, reset password, remove
 * All calls are authenticated with the teacher's create password (Bearer), verified
 * server-side exactly like every other create endpoint. Renaming is safe: attempts
 * key to the email, so a new username never orphans past work.
 */
(function () {
  'use strict';

  var API = String(window.__PINPLAY_API || '').replace(/\/+$/, '');
  if (!API) return;
  var teacherPw = '';

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    var cfg = await getJson('/api/students/config');
    if (!cfg || cfg.mode !== 'self') return;
    addButton();
  }

  function addButton() {
    if (document.getElementById('paStudentsBtn')) return;
    var b = el('button', {
      id: 'paStudentsBtn', type: 'button', title: 'Manage student accounts',
      style: 'position:fixed;right:14px;bottom:14px;z-index:99998;background:#3b82f6;color:#fff;border:none;padding:.6rem .95rem;border-radius:999px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);',
    }, '👥 Students');
    b.addEventListener('click', openPanel);
    document.body.appendChild(b);
  }

  async function openPanel() {
    if (!teacherPw) {
      var pw = await promptModal('Teacher password', 'Enter your teacher password to manage students:', 'password');
      if (pw == null) return;
      teacherPw = pw;
    }
    var res = await api('/api/students/admin/list', 'GET');
    if (res.status === 401) { teacherPw = ''; await infoModal('Wrong password', 'That teacher password was not accepted. Open the panel again to retry.'); return; }
    if (!res.ok) { await infoModal('Error', res.data.error || 'Could not load students.'); return; }
    renderRoster(res.data.students || []);
  }

  function renderRoster(students) {
    var body = el('div', {});
    if (!students.length) {
      body.appendChild(el('div', { style: 'color:#6b7280;' }, 'No student accounts yet. Students create their own from the join page.'));
    } else {
      var table = el('table', { style: 'width:100%;border-collapse:collapse;font-size:.92rem;' });
      var thead = el('tr', {});
      ['Username', 'Email', ''].forEach(function (h) { thead.appendChild(el('th', { style: 'text-align:left;border-bottom:1px solid #e5e7eb;padding:.35rem .3rem;color:#374151;' }, h)); });
      table.appendChild(thead);
      students.forEach(function (s) { table.appendChild(rosterRow(s)); });
      body.appendChild(table);
    }
    body.appendChild(el('div', { style: 'margin-top:.7rem;color:#6b7280;font-size:.85rem;' }, 'Renaming a username never affects a student\'s past work (records are keyed to the email).'));
    showModal('👥 Students (' + students.length + ')', [body], 560);
  }

  function rosterRow(s) {
    var tr = el('tr', {});
    var nameCell = el('td', { style: 'padding:.35rem .3rem;border-bottom:1px solid #f1f5f9;font-weight:600;' }, s.username);
    var emailCell = el('td', { style: 'padding:.35rem .3rem;border-bottom:1px solid #f1f5f9;color:#374151;' }, s.email + (s.emailVerified ? ' ✓' : ''));
    var actions = el('td', { style: 'padding:.35rem .3rem;border-bottom:1px solid #f1f5f9;white-space:nowrap;text-align:right;' });
    actions.appendChild(linkBtn('Rename', async function () {
      var nu = await promptModal('Rename', 'New username for ' + s.email + ':', 'text', s.username);
      if (!nu) return;
      var r = await api('/api/students/admin/rename', 'POST', { email: s.email, newUsername: nu.trim() });
      if (!r.ok) { await infoModal('Could not rename', r.data.error || 'Failed.'); return; }
      s.username = r.data.username; nameCell.textContent = s.username;
    }));
    actions.appendChild(linkBtn('Reset password', async function () {
      var np = await promptModal('Reset password', 'New password for ' + s.username + ' (min 6):', 'password');
      if (!np) return;
      var r = await api('/api/students/admin/reset', 'POST', { email: s.email, newPassword: np });
      await infoModal(r.ok ? 'Done' : 'Could not reset', r.ok ? 'Password updated for ' + s.username + '.' : (r.data.error || 'Failed.'));
    }));
    actions.appendChild(linkBtn('Remove', async function () {
      if (!await confirmModal('Remove ' + s.username + '?', 'This deletes the account. Their past attempts stay (keyed to email). Continue?')) return;
      var r = await api('/api/students/admin/delete', 'POST', { email: s.email });
      if (r.ok && tr.parentNode) tr.parentNode.removeChild(tr);
    }, '#b91c1c'));
    tr.appendChild(nameCell); tr.appendChild(emailCell); tr.appendChild(actions);
    return tr;
  }

  // ---- API ----
  async function getJson(path) { try { return await (await fetch(API + path)).json(); } catch (e) { return null; } }
  async function api(path, method, body) {
    try {
      var r = await fetch(API + path, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + teacherPw },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      var data = await r.json().catch(function () { return {}; });
      return { ok: r.ok && data && data.ok !== false, status: r.status, data: data || {} };
    } catch (e) { return { ok: false, status: 0, data: { error: 'Network error.' } }; }
  }

  // ---- Tiny DOM + modal helpers ----
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function linkBtn(label, fn, color) {
    var a = el('button', { type: 'button', style: 'background:none;border:none;color:' + (color || '#3b82f6') + ';cursor:pointer;text-decoration:underline;margin-left:.5rem;font-size:.9rem;' }, label);
    a.addEventListener('click', fn);
    return a;
  }
  function inputEl(type, value) {
    var i = el('input', { type: type || 'text', style: 'display:block;width:100%;box-sizing:border-box;margin:.5rem 0;padding:.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;' });
    if (value != null) i.value = value;
    return i;
  }
  var overlayEl = null;
  function showModal(title, children, maxW) {
    closeModal();
    overlayEl = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100000;padding:1rem;' });
    var card = el('div', { style: 'background:#fff;color:#111;max-width:' + (maxW || 420) + 'px;width:100%;border-radius:14px;padding:1.2rem;box-shadow:0 10px 40px rgba(0,0,0,.3);max-height:90vh;overflow:auto;' });
    var head = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;' });
    head.appendChild(el('h3', { style: 'margin:0;font-size:1.15rem;' }, title));
    var x = el('button', { type: 'button', style: 'background:none;border:none;font-size:1.4rem;cursor:pointer;line-height:1;' }, '×');
    x.addEventListener('click', closeModal);
    head.appendChild(x); card.appendChild(head);
    (children || []).forEach(function (c) { if (c) card.appendChild(c); });
    overlayEl.appendChild(card);
    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) closeModal(); });
    document.body.appendChild(overlayEl);
    return card;
  }
  function closeModal() { if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl); overlayEl = null; }
  function promptModal(title, label, type, value) {
    return new Promise(function (resolve) {
      var inp = inputEl(type, value);
      var ok = el('button', { type: 'button', style: 'background:#16a34a;color:#fff;border:none;padding:.5rem .9rem;border-radius:8px;font-weight:600;cursor:pointer;' }, 'OK');
      var done = function (v) { closeModal(); resolve(v); };
      ok.addEventListener('click', function () { done(inp.value); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(inp.value); });
      var card = showModal(title, [el('div', { style: 'margin-bottom:.2rem;' }, label), inp, ok]);
      var prevClose = overlayEl; void card;
      overlayEl.addEventListener('click', function (e) { if (e.target === prevClose) resolve(null); });
      setTimeout(function () { inp.focus(); }, 30);
    });
  }
  function infoModal(title, msg) {
    return new Promise(function (resolve) {
      var ok = el('button', { type: 'button', style: 'background:#3b82f6;color:#fff;border:none;padding:.5rem .9rem;border-radius:8px;font-weight:600;cursor:pointer;' }, 'OK');
      ok.addEventListener('click', function () { closeModal(); resolve(); });
      showModal(title, [el('div', { style: 'margin-bottom:.6rem;' }, msg), ok]);
    });
  }
  function confirmModal(title, msg) {
    return new Promise(function (resolve) {
      var yes = el('button', { type: 'button', style: 'background:#b91c1c;color:#fff;border:none;padding:.5rem .9rem;border-radius:8px;font-weight:600;cursor:pointer;margin-right:.5rem;' }, 'Yes');
      var no = el('button', { type: 'button', style: 'background:#e5e7eb;color:#111;border:none;padding:.5rem .9rem;border-radius:8px;font-weight:600;cursor:pointer;' }, 'Cancel');
      yes.addEventListener('click', function () { closeModal(); resolve(true); });
      no.addEventListener('click', function () { closeModal(); resolve(false); });
      var row = el('div', {}); row.appendChild(yes); row.appendChild(no);
      showModal(title, [el('div', { style: 'margin-bottom:.6rem;' }, msg), row]);
    });
  }
})();
