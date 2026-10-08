/*
 * PinPlay voice actors page (/record/?s=ID): volunteers record the lines of a
 * listening script, one take per line, on any device with a microphone. The
 * whole script in order, or one character's lines. Each take is one upload;
 * the page never polls (↻ reloads the lines). See VOICE_ACTORS_PLAN.md.
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
  };

  const sessionId = (new URLSearchParams(location.search).get('s') || '').trim().toLowerCase();
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
    [el.choose, el.studio, el.done].forEach((s) => { s.hidden = s !== section; });
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

  function renderLine() {
    const line = queue[idx];
    if (!line) return;
    const pos = session.lines.indexOf(line);
    const before = pos > 0 ? session.lines[pos - 1] : null;
    el.prev.textContent = before ? `${before.speaker}: ${before.text}` : '';
    el.prev.hidden = !before;
    el.speaker.textContent = line.speaker;
    el.direction.textContent = line.direction ? `(${line.direction})` : '';
    el.text.textContent = line.text;
    const badges = {
      ok: t('✓ Approved'),
      redo: t('↻ Please record again'),
      recorded: t('Recorded'),
      todo: '',
    };
    el.badge.textContent = badges[line.status] || '';
    el.badge.className = `rec-badge rec-badge-${line.status}`;
    const done = queue.filter((l) => l.take).length;
    el.progress.textContent = t('Line {i} of {n} · {done} recorded', { i: idx + 1, n: queue.length, done });
    el.prevBtn.disabled = idx === 0;
    el.nextBtn.disabled = idx >= queue.length - 1;
    const approved = line.status === 'ok';
    el.record.disabled = approved || busy;
    el.record.textContent = recorder ? t('■ Stop') : (pending || line.take ? t('● Record again') : t('● Record'));
    el.record.classList.toggle('rec-on', !!recorder);
    el.listen.disabled = !!recorder || !(pending || line.take);
    el.save.disabled = !!recorder || !pending || busy;
    if (approved) el.hint.textContent = t('Your teacher has approved this line.');
    else if (recorder) el.hint.textContent = t('Recording… press ■ Stop when you finish the line.');
    else if (pending) el.hint.textContent = t('Listen to your take. Happy? ✓ Save & next. If not, record again.');
    else if (line.status === 'redo') el.hint.textContent = t('Your teacher asked for a new take of this line.');
    else el.hint.textContent = t('Read the line once to yourself, then press ● Record. Leave a second of silence before you start.');
  }

  function goTo(i) {
    if (recorder || i < 0 || i >= queue.length) return;
    stopPlayer();
    dropPending();
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
        Object.assign(line, data.line);
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

  async function refresh() {
    if (recorder) return;
    setStatus(t('Loading…'));
    const currentId = queue[idx]?.id;
    try {
      await loadSession();
    } catch (err) {
      setStatus(t('Could not load the lines ({msg}).', { msg: err.message }), 'bad');
      return;
    }
    buildQueue();
    const redo = queue.findIndex((l) => l.status === 'redo');
    const same = queue.findIndex((l) => l.id === currentId);
    idx = redo >= 0 ? redo : Math.max(0, same);
    dropPending();
    setStatus(redo >= 0 ? t('Lines to record again: {n}.', { n: queue.filter((l) => l.status === 'redo').length }) : t('Up to date.'));
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
  el.prevBtn.addEventListener('click', () => goTo(idx - 1));
  el.nextBtn.addEventListener('click', () => goTo(idx + 1));
  el.refresh.addEventListener('click', refresh);
  el.back.addEventListener('click', () => {
    if (recorder) return;
    stopPlayer();
    dropPending();
    renderChoose();
  });
  el.doneBack.addEventListener('click', () => { show(el.studio); renderLine(); });
  // On a computer: Space records / stops, Enter saves.
  document.addEventListener('keydown', (e) => {
    if (el.studio.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.code === 'Space') { e.preventDefault(); toggleRecording(); }
    else if (e.key === 'Enter' && !el.save.disabled) { e.preventDefault(); saveTake(); }
  });
  window.addEventListener('beforeunload', (e) => {
    if (pending || recorder) { e.preventDefault(); e.returnValue = ''; }
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
  })();
})();
