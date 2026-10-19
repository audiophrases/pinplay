/*
 * PinPlay voice actors page (/record/?s=ID): volunteers record the lines of a
 * listening script, one take per line, on any device with a microphone. The
 * whole script in order, or one character's lines (&c=NAME in the link goes
 * straight to them). Each take is one upload; the page never polls (↻ reloads
 * the lines). When the teacher allows it, a volunteer can change the words of
 * a line: the server keeps the script's own words so the teacher sees every
 * change. 📜 Whole script shows every line at once (the volunteer's own
 * highlighted), with ✏️ to change words in place and 🎙 to record a line.
 * See VOICE_ACTORS_PLAN.md.
 */
(() => {
  const BACKEND_KEY = 'pinplay.backend.v1';
  const DEFAULT_BACKEND_URL = 'https://api.pinplay.win';
  const MAX_TAKE_MS = 60 * 1000;
  const TAKE_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];

  const t = (s, p) => (typeof window.t === 'function' ? window.t(s, p) : String(s).replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? p[k] : m)));
  const $ = (id) => document.getElementById(id);
  const el = {
    title: $('recTitle'), status: $('recStatus'),
    choose: $('recChoose'), characters: $('recCharacters'),
    studio: $('recStudio'), done: $('recDone'),
    progress: $('recProgress'), prev: $('recPrev'),
    speaker: $('recSpeaker'), direction: $('recDirection'), badge: $('recBadge'), text: $('recText'),
    level: $('recLevel'), hint: $('recHint'),
    record: $('recRecord'), listen: $('recListen'), save: $('recSave'),
    prevBtn: $('recPrevBtn'), nextBtn: $('recNextBtn'),
    back: $('recBack'), refresh: $('recRefresh'), doneBack: $('recDoneBack'),
    original: $('recOriginal'), editBtn: $('recEditBtn'), editBox: $('recEditBox'), editText: $('recEditText'),
    editSave: $('recEditSave'), editCancel: $('recEditCancel'), editOriginal: $('recEditOriginal'),
    script: $('recScript'), scriptList: $('recScriptList'), scriptInfo: $('recScriptInfo'), scriptHint: $('recScriptHint'),
    scriptBtn: $('recScriptBtn'), chooseScript: $('recChooseScript'), scriptBack: $('recScriptBack'),
    scriptRefresh: $('recScriptRefresh'), scriptRecord: $('recScriptRecord'),
  };

  const params = new URLSearchParams(location.search);
  const sessionId = (params.get('s') || '').trim().toLowerCase();
  const linkCharacter = (params.get('c') || '').trim();
  let session = null;
  let mode = 'all'; // 'all', or a character's name
  let queue = []; // the lines being recorded, in script order
  let idx = 0;
  let stream = null;
  let recorder = null;
  let recordStartedAt = 0;
  let stopTimer = null;
  let pending = null; // { blob, url, durMs } — the take not saved yet
  let player = null;
  let busy = false;
  let editing = false;
  let scriptEditing = null; // the line being edited in 📜 Whole script (its id)
  let scriptDraft = '';
  let scriptFrom = 'choose'; // where 📜 Whole script goes back to: 'choose' or 'studio'

  function backendUrl() {
    let raw = '';
    try { raw = localStorage.getItem(BACKEND_KEY) || ''; } catch { /* storage off */ }
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
    } catch { /* not set */ }
    return DEFAULT_BACKEND_URL;
  }

  function setStatus(msg, cls = '') {
    el.status.textContent = msg;
    el.status.className = `small ${cls || 'muted'}`;
  }

  function show(section) {
    [el.choose, el.studio, el.done, el.script].forEach((s) => { s.hidden = s !== section; });
  }

  // "Mia + Tom" speaks for both Mia and Tom.
  const speakersOf = (line) => String(line.speaker || '').split('+').map((s) => s.trim()).filter(Boolean);
  const needsWork = (line) => line.status === 'redo' || line.status === 'todo';

  async function loadSession() {
    const res = await fetch(`${backendUrl()}/api/rec/actor?s=${encodeURIComponent(sessionId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${res.status}`);
    session = data.session;
    el.title.textContent = session.title || '';
    document.title = `PinPlay · ${session.title || t('Record your lines')}`; // i18n-ignore (already in t())
  }

  function renderChoose() {
    const names = [];
    session.lines.forEach((l) => speakersOf(l).forEach((n) => { if (!names.includes(n)) names.push(n); }));
    el.characters.innerHTML = '';
    names.forEach((name) => {
      const mine = session.lines.filter((l) => speakersOf(l).includes(name));
      const done = mine.filter((l) => l.take).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn rec-choice';
      btn.dataset.recMode = name;
      btn.textContent = `🎭 ${name} · ${t('{done}/{n} recorded', { done, n: mine.length })}`; // i18n-ignore (already in t())
      el.characters.appendChild(btn);
    });
    const done = session.lines.filter((l) => l.take).length;
    setStatus(t('{done} of {n} lines recorded', { done, n: session.lines.length }));
    show(el.choose);
  }

  function buildQueue() {
    queue = mode === 'all' ? session.lines.slice() : session.lines.filter((l) => speakersOf(l).includes(mode));
  }

  // The next line to record: one the teacher sent back first, then the next
  // line not recorded yet (after the current one, then from the top).
  function nextIndex(from) {
    const redo = queue.findIndex((l) => l.status === 'redo');
    if (redo >= 0) return redo;
    for (let i = 1; i <= queue.length; i += 1) {
      const j = (from + i) % queue.length;
      if (needsWork(queue[j])) return j;
    }
    return -1;
  }

  function startMode(m) {
    if (!confirmLeaveEdits()) return;
    editing = false;
    scriptEditing = null;
    mode = m;
    buildQueue();
    if (!queue.length) return;
    const first = queue.findIndex((l) => l.status === 'redo');
    idx = first >= 0 ? first : Math.max(0, queue.findIndex(needsWork));
    show(el.studio);
    renderLine();
  }

  function dropPending() {
    if (pending?.url) URL.revokeObjectURL(pending.url);
    pending = null;
  }

  function stopPlayer() {
    if (player) { player.pause(); player = null; }
  }

  // Only when the server says so (an older API has no /api/rec/edit).
  const canEdit = (line) => session.allowEdits === true;

  function hasUnsavedWords() {
    const clean = text => String(text || '').replace(/\s+/g, ' ').trim();
    if (editing && clean(el.editText.value) !== clean(queue[idx]?.text)) return true;
    const line = scriptEditing && session?.lines.find(line => line.id === scriptEditing);
    return !!line && clean(scriptDraft) !== clean(line.text);
  }

  function confirmLeaveEdits() {
    if (busy) return false;
    return !hasUnsavedWords() || confirm(t('Your changes to this line are not saved. Discard them and continue?'));
  }

  const badgeText = (status) => ({
    ok: t('✓ Approved'),
    redo: t('↻ Please record again'),
    recorded: t('Recorded'),
  }[status] || '');

  // Re-draws whichever view is showing.
  function renderViews() {
    if (!el.studio.hidden) renderLine();
    if (!el.script.hidden) renderScript();
  }

  function renderLine() {
    const line = queue[idx];
    if (!line) return;
    if (!canEdit(line)) editing = false;
    const pos = session.lines.indexOf(line);
    const before = pos > 0 ? session.lines[pos - 1] : null;
    el.prev.textContent = before ? `${before.speaker}: ${before.text}` : '';
    el.prev.hidden = !before;
    el.speaker.textContent = line.speaker;
    el.direction.textContent = line.direction ? `(${line.direction})` : '';
    el.text.textContent = line.text;
    el.text.hidden = editing;
    el.original.hidden = editing || !line.original;
    el.original.textContent = line.original ? t('✏️ You changed this line. The script said: “{text}”', { text: line.original }) : '';
    el.editBox.hidden = !editing;
    el.editOriginal.hidden = !line.original;
    el.editBtn.hidden = editing || !canEdit(line);
    el.editBtn.disabled = !!recorder || busy;
    el.editText.disabled = busy;
    el.editSave.disabled = busy;
    el.editCancel.disabled = busy;
    el.editOriginal.disabled = busy;
    el.badge.textContent = badgeText(line.status);
    el.badge.className = `rec-badge rec-badge-${line.status}`;
    const done = queue.filter((l) => l.take).length;
    el.progress.textContent = t('Line {i} of {n} · {done} recorded', { i: idx + 1, n: queue.length, done });
    el.prevBtn.disabled = busy || !!recorder || idx === 0;
    el.nextBtn.disabled = busy || !!recorder || idx >= queue.length - 1;
    const approved = line.status === 'ok';
    el.record.disabled = approved || busy || editing;
    el.record.textContent = recorder ? t('■ Stop') : (pending || line.take ? t('● Record again') : t('● Record'));
    el.record.classList.toggle('rec-on', !!recorder);
    el.listen.disabled = !!recorder || editing || !(pending || line.take);
    el.save.disabled = !!recorder || !pending || busy || editing;
    if (approved) el.hint.textContent = t('Your teacher has approved this line.');
    else if (recorder) el.hint.textContent = t('Recording… press ■ Stop when you finish the line.');
    else if (pending) el.hint.textContent = t('Listen to your take. Happy? ✓ Save & next. If not, record again.');
    else if (line.status === 'redo') el.hint.textContent = t('Your teacher asked for a new take of this line.');
    else el.hint.textContent = t('Read the line once to yourself, then press ● Record. Leave a second of silence before you start.');
  }

  // ---------- 📜 the whole script ----------
  // Every line in order, so a volunteer can read the whole scene, not one line
  // at a time. Their own lines stand out; ✏️ changes the words in place (when
  // the teacher allows it) and 🎙 opens the line to record it.
  const isMine = (line) => mode === 'all' || speakersOf(line).includes(mode);

  function scriptButton(label, data, cls = 'btn btn-sm') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    Object.entries(data).forEach(([k, v]) => { b.dataset[k] = v; });
    return b;
  }

  function scriptLineEl(line) {
    const mine = isMine(line);
    const li = document.createElement('li');
    const current = scriptFrom === 'studio' && queue[idx] === line;
    li.className = `rec-script-line${mine ? ' mine' : ''}${current ? ' current' : ''}`;
    li.dataset.line = line.id;
    const who = document.createElement('div');
    who.className = 'rec-who';
    const name = document.createElement('strong');
    name.textContent = line.speaker;
    who.append(name);
    if (canEdit(line)) speakersOf(line).forEach((speaker) => {
      who.append(scriptButton(t('Rename {name}', { name: speaker }), { scriptRename: speaker }));
    });
    if (line.direction) {
      const dir = document.createElement('span');
      dir.className = 'muted';
      dir.textContent = `(${line.direction})`;
      who.append(dir);
    }
    const badge = document.createElement('span');
    badge.className = `rec-badge rec-badge-${line.status}`;
    badge.textContent = badgeText(line.status);
    who.append(badge);
    li.append(who);

    if (scriptEditing === line.id) {
      const box = document.createElement('div');
      box.className = 'rec-edit';
      const area = document.createElement('textarea');
      area.rows = 3;
      area.maxLength = 600;
      area.value = scriptDraft;
      area.disabled = busy;
      area.dataset.scriptText = line.id;
      area.setAttribute('aria-label', t('The words of this line'));
      const actions = document.createElement('div');
      actions.className = 'rec-edit-actions';
      actions.append(
        scriptButton(t('✓ Save the words'), { scriptSave: line.id }, 'btn btn-sm primary'),
        scriptButton(t('Cancel'), { scriptCancel: line.id }),
      );
      if (line.original) actions.append(scriptButton(t('↩ Back to the original'), { scriptOriginal: line.id }));
      box.append(area, actions);
      li.append(box);
      return li;
    }

    const text = document.createElement('p');
    text.className = 'rec-script-text';
    text.textContent = line.text;
    li.append(text);
    if (line.original) {
      const was = document.createElement('p');
      was.className = 'rec-original small muted';
      was.textContent = t('✏️ Changed. The script said: “{text}”', { text: line.original });
      li.append(was);
    }
    if (mine || canEdit(line)) {
      const actions = document.createElement('div');
      actions.className = 'rec-edit-actions';
      if (mine && line.status !== 'ok') actions.append(scriptButton(line.take ? t('🎙 Record again') : t('🎙 Record'), { scriptRecord: line.id }));
      if (canEdit(line)) actions.append(scriptButton(t('✏️ Change the words'), { scriptEdit: line.id }));
      if (canEdit(line)) actions.append(
        scriptButton(t('Add line after'), { scriptAdd: line.id }),
        scriptButton(t('Remove line'), { scriptRemove: line.id }));
      if (actions.childElementCount) li.append(actions);
    }
    return li;
  }

  function renderScript() {
    const done = session.lines.filter((l) => l.take).length;
    el.scriptInfo.textContent = t('{done} of {n} lines recorded', { done, n: session.lines.length });
    const hints = [];
    if (mode !== 'all') hints.push(t('Your lines ({name}) are highlighted.', { name: mode }));
    hints.push(session.allowEdits === true
      ? t('Edit any line, rename characters across the script, or add and remove lines. 🎙 records a line.')
      : t('🎙 records a line.'));
    el.scriptHint.textContent = hints.join(' ');
    el.scriptList.replaceChildren(...session.lines.map(scriptLineEl));
    if (session.allowEdits) {
      const li = document.createElement('li');
      li.append(scriptButton(t('Add line'), { scriptAdd: '' }));
      el.scriptList.append(li);
    }
  }

  function openScript() {
    if (recorder || !confirmLeaveEdits()) return;
    stopPlayer();
    scriptFrom = el.studio.hidden ? 'choose' : 'studio';
    if (scriptFrom === 'choose') {
      mode = 'all';
      buildQueue();
    }
    editing = false;
    scriptEditing = null;
    renderScript();
    show(el.script);
    const current = scriptFrom === 'studio' ? el.scriptList.querySelector('.rec-script-line.current') : null;
    if (current) current.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, 0);
  }

  function closeScript() {
    if (!confirmLeaveEdits()) return;
    scriptEditing = null;
    if (scriptFrom === 'studio') {
      show(el.studio);
      renderLine();
    } else {
      renderChoose();
    }
    window.scrollTo(0, 0);
  }

  // 🎙 on a line: open it in the recorder.
  function recordLine(line) {
    if (!line || recorder || !confirmLeaveEdits()) return;
    if (!queue.includes(line)) {
      mode = 'all';
      buildQueue();
    }
    if (line !== queue[idx]) {
      if (pending && !confirm(t('Your last take is not saved yet. Leave it and go to this line?'))) return;
      stopPlayer();
      dropPending();
    }
    editing = false;
    scriptEditing = null;
    idx = queue.indexOf(line);
    show(el.studio);
    renderLine();
    window.scrollTo(0, 0);
  }

  function startScriptEdit(line) {
    if (!line || !canEdit(line) || busy) return;
    if (scriptEditing === line.id || !confirmLeaveEdits()) return;
    scriptEditing = line.id;
    scriptDraft = line.text;
    renderScript();
    const area = el.scriptList.querySelector('[data-script-text]');
    if (area) {
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    }
  }

  function goTo(i) {
    if (recorder || i === idx || i < 0 || i >= queue.length || !confirmLeaveEdits()) return;
    stopPlayer();
    dropPending();
    editing = false;
    idx = i;
    renderLine();
  }

  // ---------- microphone ----------
  let meterRaf = 0;
  async function ensureStream() {
    if (stream) return stream;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error(t('This browser can\'t record. Try Chrome, Edge, Firefox or Safari.'));
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i += 1) peak = Math.max(peak, Math.abs(buf[i] - 128));
        el.level.style.width = `${Math.min(100, Math.round((peak / 128) * 160))}%`;
        meterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* the meter is only a help */ }
    return stream;
  }

  async function startRecording() {
    let s;
    try {
      s = await ensureStream();
    } catch (err) {
      setStatus(err?.name === 'NotAllowedError' ? t('The microphone is blocked. Allow it in the browser (the icon next to the address) and try again.') : String(err.message || err), 'bad'); // i18n-ignore (already in t())
      return;
    }
    stopPlayer();
    dropPending();
    const mimeType = TAKE_TYPES.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
    const rec = new MediaRecorder(s, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearTimeout(stopTimer);
      const durMs = Date.now() - recordStartedAt;
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
      recorder = null;
      if (blob.size) pending = { blob, url: URL.createObjectURL(blob), durMs };
      renderLine();
    };
    recorder = rec;
    recordStartedAt = Date.now();
    rec.start();
    stopTimer = setTimeout(() => { if (recorder === rec) rec.stop(); }, MAX_TAKE_MS);
    setStatus('');
    renderLine();
  }

  function toggleRecording() {
    if (recorder) recorder.stop();
    else if (!el.record.disabled) startRecording();
  }

  function listen() {
    const line = queue[idx];
    if (player) { stopPlayer(); return; }
    const src = pending?.url || (line?.take ? `${backendUrl()}/api/media/${line.take.key}` : '');
    if (!src) return;
    player = new Audio(src);
    player.onended = () => { player = null; };
    player.play().catch(() => { player = null; });
  }

  async function saveTake() {
    const line = queue[idx];
    if (!pending || !line || busy) return;
    busy = true;
    renderLine();
    setStatus(t('⏳ Saving…'));
    try {
      const type = String(pending.blob.type || 'audio/webm').split(';')[0];
      const url = `${backendUrl()}/api/rec/take?s=${encodeURIComponent(sessionId)}&line=${encodeURIComponent(line.id)}&ms=${Math.round(pending.durMs)}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body: pending.blob });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.reason === 'approved') {
        line.status = 'ok';
        dropPending();
        setStatus(t('Your teacher has already approved this line.'), 'ok'); // i18n-ignore (already in t())
      } else if (!res.ok) {
        throw new Error(data.error || `${res.status}`);
      } else {
        Object.assign(line, data.session.lines.find((l) => l.id === line.id));
        dropPending();
        setStatus(t('✅ Saved.'), 'ok'); // i18n-ignore (already in t())
        const next = nextIndex(idx);
        busy = false;
        if (next < 0) { show(el.done); return; }
        idx = next;
      }
    } catch (err) {
      setStatus(t('Not saved ({msg}). Check the connection and press ✓ Save & next again.', { msg: err.message }), 'bad');
    }
    busy = false;
    renderLine();
  }

  // ---------- changing the words ----------
  function startEdit() {
    const line = queue[idx];
    if (!line || recorder || busy || editing || !canEdit(line)) return;
    editing = true;
    el.editText.value = line.text;
    renderLine();
    el.editText.focus();
  }

  function cancelEdit() {
    if (!confirmLeaveEdits()) return;
    editing = false;
    scriptEditing = null;
    renderViews();
  }

  // The words of a line: the current line (line view) or any line (📜 Whole script).
  async function saveEdit(text, line = queue[idx]) {
    if (!line || busy) return;
    const words = String(text || '').replace(/\s+/g, ' ').trim();
    if (!words) { setStatus(t('A line can\'t be empty.'), 'bad'); return; } // i18n-ignore (already in t())
    if (words === line.text) { cancelEdit(); return; }
    busy = true;
    renderViews();
    setStatus(t('⏳ Saving…'));
    try {
      const res = await fetch(`${backendUrl()}/api/rec/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s: sessionId, action: 'text', line: line.id, text: words }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.reason === 'approved') {
        line.status = 'ok';
        editing = false;
        scriptEditing = null;
        setStatus(t('Your teacher has already approved this line.'), 'ok'); // i18n-ignore (already in t())
      } else if (res.status === 403 && data.reason === 'locked') {
        session.allowEdits = false;
        editing = false;
        scriptEditing = null;
        setStatus(t('Your teacher has turned off changing the lines.'), 'bad'); // i18n-ignore (already in t())
      } else if (!res.ok) {
        throw new Error(data.error || `${res.status}`);
      } else {
        Object.assign(line, data.session.lines.find((l) => l.id === line.id));
        editing = false;
        scriptEditing = null;
        setStatus(line.take || (pending && line === queue[idx])
          ? t('✅ Words saved. Record the line again so your take matches them.')
          : t('✅ Words saved.'), 'ok');
      }
    } catch (err) {
      setStatus(t('Not saved ({msg}). Check the connection and try again.', { msg: err.message }), 'bad');
    }
    busy = false;
    renderViews();
  }

  async function changeScript(action, lineId, speaker) {
    if (recorder || !session.allowEdits || !confirmLeaveEdits()) return;
    const body = { s: sessionId, action, line: lineId, speaker };
    if (action === 'rename') {
      body.name = prompt(t('New character name (updates every line):'), speaker);
      if (body.name === null) return;
    } else if (action === 'add') {
      body.speaker = prompt(t('Character name:'), mode === 'all' ? '' : mode);
      if (body.speaker === null) return;
      body.text = prompt(t('The words of this line:'));
      if (body.text === null) return;
    } else if (!confirm(t('Remove this line and its recording from the script?'))) return;
    if (pending && !confirm(t('Your last take is not saved yet. Leave it and edit the script?'))) return;
    busy = true;
    try {
      const res = await fetch(`${backendUrl()}/api/rec/script`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || String(res.status));
      const currentId = queue[idx]?.id;
      session = data.session;
      if (action === 'rename' && mode === speaker) mode = body.name.replace(/\s+/g, ' ').trim();
      if (mode !== 'all' && !session.lines.some((l) => speakersOf(l).includes(mode))) mode = 'all';
      buildQueue();
      idx = Math.max(0, queue.findIndex((l) => l.id === currentId));
      stopPlayer();
      dropPending();
      editing = false;
      scriptEditing = null;
      if (!queue.length) scriptFrom = 'choose';
      renderScript();
      setStatus(t('Saved.'), 'ok'); // i18n-ignore (message already in t())
    } catch (err) { setStatus(err.message, 'bad'); } // i18n-ignore (API error)
    finally { busy = false; }
  }

  async function refresh() {
    if (recorder || !confirmLeaveEdits()) return;
    busy = true;
    renderViews();
    const inScript = !el.script.hidden;
    setStatus(t('Loading…'));
    const currentId = queue[idx]?.id;
    try {
      await loadSession();
    } catch (err) {
      busy = false;
      renderViews();
      setStatus(t('Could not load the lines ({msg}).', { msg: err.message }), 'bad');
      return;
    }
    busy = false;
    buildQueue();
    const redo = queue.findIndex((l) => l.status === 'redo');
    const same = queue.findIndex((l) => l.id === currentId);
    idx = redo >= 0 ? redo : Math.max(0, same);
    dropPending();
    editing = false;
    scriptEditing = null;
    setStatus(redo >= 0 ? t('Lines to record again: {n}.', { n: queue.filter((l) => l.status === 'redo').length }) : t('Up to date.'));
    if (inScript) {
      renderScript();
      return;
    }
    if (!queue.length) { renderChoose(); return; }
    show(el.studio);
    renderLine();
  }

  // ---------- events ----------
  el.characters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rec-mode]');
    if (btn) startMode(btn.dataset.recMode);
  });
  el.choose.querySelector('[data-rec-mode="all"]').addEventListener('click', () => startMode('all'));
  el.record.addEventListener('click', toggleRecording);
  el.listen.addEventListener('click', listen);
  el.save.addEventListener('click', saveTake);
  el.editBtn.addEventListener('click', startEdit);
  el.editCancel.addEventListener('click', cancelEdit);
  el.editSave.addEventListener('click', () => saveEdit(el.editText.value));
  el.editOriginal.addEventListener('click', () => { const line = queue[idx]; if (line?.original) saveEdit(line.original); });
  el.editText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(el.editText.value); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });
  el.prevBtn.addEventListener('click', () => goTo(idx - 1));
  el.nextBtn.addEventListener('click', () => goTo(idx + 1));
  el.refresh.addEventListener('click', refresh);
  el.back.addEventListener('click', () => {
    if (recorder || !confirmLeaveEdits()) return;
    stopPlayer();
    dropPending();
    editing = false;
    renderChoose();
  });
  el.doneBack.addEventListener('click', () => { show(el.studio); renderLine(); });
  el.scriptBtn.addEventListener('click', openScript);
  el.chooseScript.addEventListener('click', openScript);
  el.scriptBack.addEventListener('click', closeScript);
  el.scriptRefresh.addEventListener('click', refresh);
  el.scriptRecord.addEventListener('click', () => {
    if (scriptFrom === 'studio') closeScript();
    else startMode(mode);
  });
  const scriptLine = (id) => session.lines.find((l) => l.id === id);
  el.scriptList.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || busy) return;
    const d = b.dataset;
    if (d.scriptRename) changeScript('rename', null, d.scriptRename);
    else if (d.scriptAdd !== undefined) changeScript('add', d.scriptAdd);
    else if (d.scriptRemove) changeScript('remove', d.scriptRemove);
    else if (d.scriptRecord) recordLine(scriptLine(d.scriptRecord));
    else if (d.scriptEdit) startScriptEdit(scriptLine(d.scriptEdit));
    else if (d.scriptCancel) cancelEdit();
    else if (d.scriptSave) saveEdit(scriptDraft, scriptLine(d.scriptSave));
    else if (d.scriptOriginal) {
      const line = scriptLine(d.scriptOriginal);
      if (line?.original) saveEdit(line.original, line);
    }
  });
  el.scriptList.addEventListener('input', (e) => {
    if (e.target.matches('[data-script-text]')) scriptDraft = e.target.value;
  });
  el.scriptList.addEventListener('keydown', (e) => {
    if (!e.target.matches('[data-script-text]')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(scriptDraft, scriptLine(e.target.dataset.scriptText)); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });
  // On a computer: Space records / stops, Enter saves.
  document.addEventListener('keydown', (e) => {
    if (el.studio.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.code === 'Space') { e.preventDefault(); toggleRecording(); }
    else if (e.key === 'Enter' && !el.save.disabled) { e.preventDefault(); saveTake(); }
  });
  window.addEventListener('beforeunload', (e) => {
    if (pending || recorder || busy || hasUnsavedWords()) { e.preventDefault(); e.returnValue = ''; }
  });

  (async () => {
    if (!/^[a-z0-9]{8,16}$/.test(sessionId)) {
      setStatus(t('This link is incomplete. Ask your teacher for the recording link.'), 'bad'); // i18n-ignore (already in t())
      return;
    }
    setStatus(t('Loading…'));
    try {
      await loadSession();
    } catch (err) {
      setStatus(t('Could not load the lines ({msg}).', { msg: err.message }), 'bad');
      return;
    }
    renderChoose();
    // A link for one character (&c=NAME) opens their lines straight away.
    const mine = session.lines.flatMap(speakersOf).find((n) => n.toLowerCase() === linkCharacter.toLowerCase());
    if (linkCharacter && mine) startMode(mine);
  })();
})();
