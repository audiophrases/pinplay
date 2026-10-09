/*
 * Voice actors (VOICE_ACTORS_PLAN.md): the teacher's side. Sessions made from
 * a listening section's script (or a pasted one), the link for volunteers,
 * and the review: each take with its waveform, the silence at both ends
 * trimmed automatically (two handles adjust it), ✓ OK / ↻ Redo, the pause
 * before each line, ▶ from any line, and the put-together recording as an
 * MP3 for download or for the listening section. All audio work happens here,
 * in the browser; edits are saved in batches. Uses app.js globals (api, t,
 * escapeHtml, createSessionPassword, quiz, attachListeningRecording…).
 */

const VA_RECORD_PAGE = 'https://audiophrases.github.io/pinplay/record/';
const VA_LAME_URL = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
const VA_RATE = 44100;
const VA_SAVE_DELAY_MS = 1500;
// Scripts are in the language being learnt, so the example stays English.
const VA_SCRIPT_EXAMPLE = 'Mia (surprised): Forty minutes? You\'re joking!\nTom: I know, I know…'; // i18n-ignore

const va = {
  view: 'list', // 'list' | 'session'
  sessions: [],
  session: null,
  buffers: new Map(), // take key -> AudioBuffer
  auto: new Map(), // take key -> { s, e } automatic trim (ms)
  edits: new Map(), // line id -> pending edit
  saveTimer: null,
  ctx: null,
  playing: null, // { sources, timers }
  filter: '',
  newFrom: '', // listening section id the new-session form starts from
};

function vaApi(route, body = {}) {
  return api(`/api/rec/${route}`, { method: 'POST', body: { ...body, password: createSessionPassword } });
}

function vaAudioCtx() {
  if (!va.ctx) va.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (va.ctx.state === 'suspended') va.ctx.resume().catch(() => { });
  return va.ctx;
}

function vaLink(id) {
  return `${VA_RECORD_PAGE}?s=${encodeURIComponent(id)}`;
}

// The script's spoken lines, in order: { speaker, direction, text }.
function vaLinesFromScript(text) {
  const script = parseListeningScript(text);
  const lines = [];
  script.parts.forEach((p) => p.items.forEach((it) => {
    if (it.type === 'line') lines.push({ speaker: it.speakers.join(' + '), direction: it.direction || '', text: it.text });
  }));
  return lines;
}

function vaListeningSections() {
  return (Array.isArray(quiz?.listeningSections) ? quiz.listeningSections : []);
}

function vaSectionLabel(sec, i) {
  return sec.title ? `${i + 1}. ${sec.title}` : t('Listening section {n}', { n: i + 1 });
}

// ---------------------------------------------------------------- panel --
function openVoiceActors(opts = {}) {
  if (!createSessionPassword) { alert(t('Unlock the teacher page first.')); return; }
  document.getElementById('voiceActorsOverlay')?.remove();
  va.newFrom = opts.sectionId || '';
  const overlay = document.createElement('div');
  overlay.id = 'voiceActorsOverlay';
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog-card va-panel" role="dialog" aria-modal="true" aria-labelledby="vaTitle" tabindex="-1">
      <div class="row spread gap">
        <h3 id="vaTitle">${escapeHtml(t('🎙 Voice actors'))}</h3>
        <button type="button" class="btn" data-va-close>${escapeHtml(t('Close'))}</button>
      </div>
      <div class="small" data-va-status role="status"></div>
      <div data-va-body></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('pointerdown', (e) => { overlay.dataset.pressedOnBackdrop = e.target === overlay ? '1' : ''; });
  overlay.addEventListener('click', vaOnClick);
  overlay.addEventListener('change', vaOnChange);
  overlay.addEventListener('input', vaOnInput);
  vaBindWaveDrag(overlay);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeVoiceActors(); } });
  overlay.querySelector('.va-panel').focus();
  if (opts.sessionId) vaOpenSession(opts.sessionId);
  else vaLoadList();
}

function closeVoiceActors() {
  vaStop();
  vaFlushSave();
  document.getElementById('voiceActorsOverlay')?.remove();
}

function vaEl(sel) {
  return document.querySelector(`#voiceActorsOverlay ${sel}`);
}

function vaStatus(msg, cls = '') {
  const el = vaEl('[data-va-status]');
  if (el) { el.textContent = msg || ''; el.className = `small ${cls}`; }
}

// ---------------------------------------------------------------- list ---
async function vaLoadList() {
  va.view = 'list';
  va.session = null;
  vaStatus(t('Loading…'));
  try {
    const data = await vaApi('list');
    va.sessions = data.sessions || [];
    vaStatus('');
  } catch (err) {
    vaStatus(t('Could not load the sessions ({msg}).', { msg: err.message }), 'bad');
  }
  vaRenderList();
}

function vaRenderList() {
  const body = vaEl('[data-va-body]');
  if (!body) return;
  const sections = vaListeningSections();
  const fromSec = sections.find((s) => s.id === va.newFrom);
  const sourceOptions = sections
    .map((s, i) => (String(s.transcript || '').trim() ? `<option value="${escapeHtml(s.id)}" ${s.id === va.newFrom ? 'selected' : ''}>${escapeHtml(vaSectionLabel(s, i))}</option>` : ''))
    .join('');
  const rows = va.sessions.map((s) => `
    <li class="va-session">
      <button type="button" class="btn va-session-open" data-va-open="${escapeHtml(s.id)}">
        <strong>${escapeHtml(s.title)}</strong>
        <span class="small muted">${escapeHtml(t('{rec}/{n} recorded · {ok} approved', { rec: s.recorded, n: s.total, ok: s.approved }))}${s.redo ? ` · ${escapeHtml(t('{n} to redo', { n: s.redo }))}` : ''}</span>
      </button>
      <button type="button" class="btn btn-sm" data-va-delete="${escapeHtml(s.id)}" title="${escapeHtml(t('Delete the session and its recordings'))}">🗑</button>
    </li>`).join('');
  body.innerHTML = `
    <p class="small muted">${escapeHtml(t('Volunteers record the lines of a script on their own phone or computer, from one link. You review each take, trim the silence and build one recording.'))}</p>
    ${rows ? `<ul class="va-sessions">${rows}</ul>` : `<p class="small muted">${escapeHtml(t('No sessions yet.'))}</p>`}
    <details class="va-new" ${va.newFrom || !rows ? 'open' : ''}>
      <summary><strong>${escapeHtml(t('+ New session'))}</strong></summary>
      <label>${escapeHtml(t('Title'))}
        <input type="text" maxlength="120" data-va-new-title value="${escapeHtml(fromSec?.title || quiz?.title || '')}" />
      </label>
      <label>${escapeHtml(t('Script'))}
        <select data-va-new-source>
          ${sourceOptions}
          <option value="" ${fromSec ? '' : 'selected'}>${escapeHtml(t('Paste a script'))}</option>
        </select>
      </label>
      <textarea rows="8" data-va-new-script placeholder="${escapeHtml(VA_SCRIPT_EXAMPLE)}" ${fromSec ? 'hidden' : ''}></textarea>
      <div class="small muted" data-va-new-info></div>
      <button type="button" class="btn primary" data-va-create>${escapeHtml(t('Create the session'))}</button>
    </details>`;
  vaUpdateNewInfo();
}

function vaNewScriptText() {
  const source = vaEl('[data-va-new-source]')?.value || '';
  if (source) return String(vaListeningSections().find((s) => s.id === source)?.transcript || '');
  return String(vaEl('[data-va-new-script]')?.value || '');
}

function vaUpdateNewInfo() {
  const info = vaEl('[data-va-new-info]');
  if (!info) return;
  const lines = vaLinesFromScript(vaNewScriptText());
  const names = new Set();
  lines.forEach((l) => l.speaker.split('+').forEach((n) => names.add(n.trim())));
  info.textContent = lines.length ? t('{n} lines · characters: {names}', { n: lines.length, names: [...names].join(', ') }) : '';
}

async function vaCreate() {
  const source = vaEl('[data-va-new-source]')?.value || '';
  const lines = vaLinesFromScript(vaNewScriptText());
  if (!lines.length) { vaStatus(t('The script has no lines to record.'), 'bad'); return; }
  vaStatus(t('⏳ Creating…'));
  try {
    const data = await vaApi('create', { title: vaEl('[data-va-new-title]')?.value || '', sectionId: source, lines });
    va.newFrom = '';
    vaShowSession(data.session);
  } catch (err) {
    vaStatus(t('Could not create the session ({msg}).', { msg: err.message }), 'bad');
  }
}

async function vaDelete(id) {
  const s = va.sessions.find((x) => x.id === id);
  if (!confirm(t('Delete "{title}" and all its recordings? This can\'t be undone.', { title: s?.title || '' }))) return;
  try {
    await vaApi('delete', { id });
    await vaLoadList();
  } catch (err) {
    vaStatus(t('Could not delete ({msg}).', { msg: err.message }), 'bad');
  }
}

// ---------------------------------------------------------------- session -
async function vaOpenSession(id) {
  vaStatus(t('Loading…'));
  try {
    const data = await vaApi('get', { id });
    vaShowSession(data.session);
  } catch (err) {
    vaStatus(t('Could not load the session ({msg}).', { msg: err.message }), 'bad');
  }
}

function vaShowSession(session) {
  va.view = 'session';
  va.session = session;
  va.edits.clear();
  vaStatus('');
  vaRenderSession();
  vaLoadTakes();
}

const vaLineGap = (line) => (line.gap ?? va.session.defaultGap ?? 0.6);

function vaLineMatches(line) {
  if (va.filter === 'review') return line.status === 'recorded';
  if (va.filter === 'redo') return line.status === 'redo';
  if (va.filter === 'missing') return !line.take;
  return true;
}

function vaRenderSession() {
  const body = vaEl('[data-va-body]');
  const s = va.session;
  if (!body || !s) return;
  const link = vaLink(s.id);
  const count = (fn) => s.lines.filter(fn).length;
  const sections = vaListeningSections();
  const target = sections.find((x) => x.id === s.sectionId) ? s.sectionId : (sections[0]?.id || '');
  const opt = (v, label) => `<option value="${v}" ${va.filter === v ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  body.innerHTML = `
    <div class="va-head">
      <button type="button" class="btn btn-sm" data-va-back>${escapeHtml(t('◀ Sessions'))}</button>
      <input type="text" class="va-title-input" maxlength="120" data-va-title value="${escapeHtml(s.title)}" aria-label="${escapeHtml(t('Title'))}" />
      <button type="button" class="btn btn-sm" data-va-reload title="${escapeHtml(t('Load new takes'))}">↻</button>
    </div>
    <div class="va-link">
      <img alt="" width="96" height="96" src="https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(link)}" />
      <div>
        <p class="small">${escapeHtml(t('Volunteers open this link on their phone or computer:'))}</p>
        <div class="row gap">
          <input type="text" readonly value="${escapeHtml(link)}" data-va-link />
          <button type="button" class="btn btn-sm" data-va-copy>${escapeHtml(t('📋 Copy'))}</button>
        </div>
        <p class="small muted">${escapeHtml(t('{rec}/{n} recorded · {ok} approved · {redo} to redo', { rec: count((l) => l.take), n: s.lines.length, ok: count((l) => l.status === 'ok'), redo: count((l) => l.status === 'redo') }))}</p>
      </div>
    </div>
    <div class="va-tools">
      <select data-va-filter aria-label="${escapeHtml(t('Show'))}">
        ${opt('', t('All lines'))}${opt('review', t('To review'))}${opt('redo', t('To redo'))}${opt('missing', t('Not recorded'))}
      </select>
      <label class="small">${escapeHtml(t('Pause between lines (s)'))}
        <input type="number" min="0" max="5" step="0.1" value="${vaLineGapDefault()}" data-va-default-gap />
      </label>
      <button type="button" class="btn btn-sm" data-va-play-from="0">${escapeHtml(t('▶ Play all'))}</button>
      <button type="button" class="btn btn-sm" data-va-stop>${escapeHtml(t('■ Stop'))}</button>
    </div>
    <ol class="va-lines">
      ${s.lines.map((line, i) => (vaLineMatches(line) ? vaLineHtml(line, i) : '')).join('')}
    </ol>
    <div class="va-build">
      <button type="button" class="btn" data-va-build="download">${escapeHtml(t('⬇ Download MP3'))}</button>
      ${sections.length ? `
        <select data-va-target aria-label="${escapeHtml(t('Listening section'))}">
          ${sections.map((x, i) => `<option value="${escapeHtml(x.id)}" ${x.id === target ? 'selected' : ''}>${escapeHtml(vaSectionLabel(x, i))}</option>`).join('')}
        </select>
        <button type="button" class="btn primary" data-va-build="section">${escapeHtml(t('🎧 Use in the listening section'))}</button>` : ''}
      <span class="small muted">${escapeHtml(t('Joins the takes in script order, trimmed, with their pauses. Lines not recorded are left out.'))}</span>
    </div>`;
  vaDrawAll();
}

function vaLineGapDefault() {
  return Number(va.session?.defaultGap ?? 0.6);
}

function vaLineHtml(line, i) {
  const status = {
    todo: t('Not recorded'), recorded: t('To review'), ok: t('✓ OK'), redo: t('↻ Redo'),
  }[line.status] || '';
  const gap = i > 0 ? `
      <label class="va-gap small" title="${escapeHtml(t('Pause before this line, in seconds (empty = the session pause)'))}">⏱
        <input type="number" min="0" max="10" step="0.1" value="${line.gap ?? ''}" placeholder="${vaLineGapDefault()}" data-va-gap="${line.id}" />
      </label>` : '';
  return `
    <li class="va-line va-${line.status}" data-va-line="${line.id}">
      <div class="va-line-head">
        <span class="va-n">${line.n}</span>
        <strong>${escapeHtml(line.speaker)}</strong>
        ${line.direction ? `<span class="small muted">(${escapeHtml(line.direction)})</span>` : ''}
        <span class="va-status small">${escapeHtml(status)}</span>
        ${gap}
      </div>
      <p class="va-text">${escapeHtml(line.text)}</p>
      ${line.take ? `
        <canvas class="va-wave" height="56" data-va-wave="${line.id}" title="${escapeHtml(t('Drag the handles to trim · double-click: automatic trim'))}"></canvas>
        <div class="va-line-actions">
          <button type="button" class="btn btn-sm" data-va-play="${line.id}">${escapeHtml(t('▶ Line'))}</button>
          <button type="button" class="btn btn-sm" data-va-play-from="${i}">${escapeHtml(t('▶ From here'))}</button>
          <button type="button" class="btn btn-sm ${line.status === 'ok' ? 'success' : ''}" data-va-status-set="${line.id}:ok" aria-pressed="${line.status === 'ok'}">${escapeHtml(t('✓ OK'))}</button>
          <button type="button" class="btn btn-sm ${line.status === 'redo' ? 'bad' : ''}" data-va-status-set="${line.id}:redo" aria-pressed="${line.status === 'redo'}">${escapeHtml(t('↻ Redo'))}</button>
          <span class="small muted" data-va-trim-info="${line.id}"></span>
        </div>` : ''}
    </li>`;
}

// ---------------------------------------------------------------- audio ---
async function vaLoadTakes() {
  const lines = (va.session?.lines || []).filter((l) => l.take && !va.buffers.has(l.take.key));
  const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < lines.length) {
      const line = lines[next++];
      try {
        const res = await fetch(`${base}/api/media/${line.take.key}`);
        if (!res.ok) throw new Error(String(res.status));
        const buffer = await vaAudioCtx().decodeAudioData(await res.arrayBuffer());
        va.buffers.set(line.take.key, buffer);
        va.auto.set(line.take.key, vaAutoTrim(buffer));
        vaDrawLine(line);
      } catch {
        failed += 1;
      }
    }
  };
  await Promise.all([0, 1, 2, 3].map(worker));
  if (failed) vaStatus(t('{n} takes could not be loaded.', { n: failed }), 'bad');
}

// The speech in a take, in ms: the RMS of 20 ms windows against the take's
// own noise floor, with a little air kept at both ends.
function vaAutoTrim(buffer) {
  const data = buffer.getChannelData(0);
  const win = Math.max(1, Math.round(buffer.sampleRate * 0.02));
  const rms = [];
  for (let i = 0; i < data.length; i += win) {
    let sum = 0;
    const end = Math.min(data.length, i + win);
    for (let j = i; j < end; j += 1) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / (end - i)));
  }
  const total = Math.round(buffer.duration * 1000);
  if (!rms.length) return { s: 0, e: total };
  const sorted = rms.slice().sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  const threshold = Math.max(floor * 3, peak * 0.1, 0.003);
  const first = rms.findIndex((v) => v > threshold);
  let last = -1;
  for (let i = rms.length - 1; i >= 0; i -= 1) if (rms[i] > threshold) { last = i; break; }
  if (first < 0) return { s: 0, e: total };
  const s = Math.max(0, first * 20 - 120);
  const e = Math.min(total, (last + 1) * 20 + 200);
  return { s, e };
}

function vaTrimOf(line) {
  const buffer = va.buffers.get(line.take?.key);
  if (!buffer) return null;
  const total = Math.round(buffer.duration * 1000);
  const trim = line.trim || va.auto.get(line.take.key) || { s: 0, e: total };
  const s = Math.max(0, Math.min(trim.s, total));
  return { s, e: Math.max(s + 20, Math.min(trim.e, total)), total };
}

// Gain that brings a trimmed take to an even speaking level, never clipping.
function vaGainOf(line) {
  const buffer = va.buffers.get(line.take?.key);
  const trim = vaTrimOf(line);
  if (!buffer || !trim) return 1;
  const data = buffer.getChannelData(0);
  const from = Math.floor((trim.s / 1000) * buffer.sampleRate);
  const to = Math.min(data.length, Math.floor((trim.e / 1000) * buffer.sampleRate));
  let sum = 0;
  let peak = 0;
  for (let i = from; i < to; i += 1) { sum += data[i] * data[i]; peak = Math.max(peak, Math.abs(data[i])); }
  const rms = Math.sqrt(sum / Math.max(1, to - from));
  if (!rms || !peak) return 1;
  return Math.min(0.1 / rms, 0.95 / peak, 6);
}

function vaDrawAll() {
  (va.session?.lines || []).forEach(vaDrawLine);
}

function vaDrawLine(line) {
  const canvas = vaEl(`[data-va-wave="${line.id}"]`);
  const buffer = va.buffers.get(line.take?.key);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(100, canvas.clientWidth);
  const h = 56;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (!buffer) {
    g.fillStyle = '#8a94a3';
    g.font = '12px system-ui, sans-serif';
    g.fillText(t('Loading…'), 8, h / 2 + 4);
    return;
  }
  const trim = vaTrimOf(line);
  const data = buffer.getChannelData(0);
  const step = data.length / w;
  const xs = (trim.s / trim.total) * w;
  const xe = (trim.e / trim.total) * w;
  for (let x = 0; x < w; x += 1) {
    let min = 1;
    let max = -1;
    const from = Math.floor(x * step);
    const to = Math.min(data.length, Math.floor((x + 1) * step));
    for (let i = from; i < to; i += 1) { if (data[i] < min) min = data[i]; if (data[i] > max) max = data[i]; }
    if (max < min) continue;
    g.fillStyle = x >= xs && x <= xe ? '#605dff' : '#c3c8d2';
    g.fillRect(x, h / 2 + min * (h / 2), 1, Math.max(1, (max - min) * (h / 2)));
  }
  g.fillStyle = 'rgba(28, 36, 48, 0.08)';
  g.fillRect(0, 0, xs, h);
  g.fillRect(xe, 0, w - xe, h);
  g.fillStyle = '#d04a02';
  [xs, xe].forEach((x) => {
    g.fillRect(Math.round(x) - 1, 0, 2, h);
    g.fillRect(Math.round(x) - 5, 0, 10, 6);
  });
  const info = vaEl(`[data-va-trim-info="${line.id}"]`);
  if (info) info.textContent = `${((trim.e - trim.s) / 1000).toFixed(1)} s${line.trim ? '' : ` · ${t('auto trim')}`}`; // i18n-ignore (already in t())
}

function vaBindWaveDrag(overlay) {
  let drag = null;
  overlay.addEventListener('pointerdown', (e) => {
    const canvas = e.target.closest('[data-va-wave]');
    if (!canvas) return;
    const line = va.session?.lines.find((l) => l.id === canvas.dataset.vaWave);
    const trim = line && vaTrimOf(line);
    if (!trim) return;
    const rect = canvas.getBoundingClientRect();
    const ms = ((e.clientX - rect.left) / rect.width) * trim.total;
    const edge = Math.abs(ms - trim.s) <= Math.abs(ms - trim.e) ? 's' : 'e';
    drag = { line, canvas, edge, rect, total: trim.total };
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    vaMoveHandle(drag, e.clientX);
  });
  overlay.addEventListener('pointermove', (e) => { if (drag) vaMoveHandle(drag, e.clientX); });
  const end = () => {
    if (!drag) return;
    const { line } = drag;
    drag = null;
    vaQueueEdit(line.id, { trim: line.trim });
    vaPlayLine(line);
  };
  overlay.addEventListener('pointerup', end);
  overlay.addEventListener('pointercancel', end);
  overlay.addEventListener('dblclick', (e) => {
    const canvas = e.target.closest('[data-va-wave]');
    const line = canvas && va.session?.lines.find((l) => l.id === canvas.dataset.vaWave);
    if (!line) return;
    line.trim = null;
    vaQueueEdit(line.id, { trim: null });
    vaDrawLine(line);
  });
}

function vaMoveHandle(drag, clientX) {
  const { line, rect, total, edge } = drag;
  const cur = vaTrimOf(line);
  const ms = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * total);
  line.trim = edge === 's' ? { s: Math.min(ms, cur.e - 50), e: cur.e } : { s: cur.s, e: Math.max(ms, cur.s + 50) };
  vaDrawLine(line);
}

// ---------------------------------------------------------------- playback -
function vaStop() {
  if (!va.playing) return;
  va.playing.sources.forEach((src) => { try { src.stop(); } catch { /* already stopped */ } });
  va.playing.timers.forEach(clearTimeout);
  va.playing = null;
  document.querySelectorAll('#voiceActorsOverlay .va-line.is-playing').forEach((el) => el.classList.remove('is-playing'));
}

function vaPlayLine(line) {
  vaPlaySequence([line]);
}

// Plays lines back to back with their pauses, as the recording will sound.
function vaPlaySequence(lines) {
  vaStop();
  const ctx = vaAudioCtx();
  const playing = { sources: [], timers: [] };
  va.playing = playing;
  let at = ctx.currentTime + 0.1;
  const startAt = at;
  lines.forEach((line, i) => {
    const buffer = va.buffers.get(line.take?.key);
    const trim = vaTrimOf(line);
    if (!buffer || !trim) return;
    if (i > 0) at += vaLineGap(line);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vaGainOf(line);
    src.connect(gain).connect(ctx.destination);
    const dur = (trim.e - trim.s) / 1000;
    src.start(at, trim.s / 1000, dur);
    playing.sources.push(src);
    const el = () => vaEl(`[data-va-line="${line.id}"]`);
    playing.timers.push(setTimeout(() => {
      document.querySelectorAll('#voiceActorsOverlay .va-line.is-playing').forEach((x) => x.classList.remove('is-playing'));
      el()?.classList.add('is-playing');
      if (lines.length > 1) el()?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, (at - startAt) * 1000 + 100));
    at += dur;
  });
  playing.timers.push(setTimeout(() => { if (va.playing === playing) vaStop(); }, (at - startAt) * 1000 + 300));
}

// ---------------------------------------------------------------- saving --
function vaQueueEdit(lineId, edit) {
  va.edits.set(lineId, { ...(va.edits.get(lineId) || {}), id: lineId, ...edit });
  clearTimeout(va.saveTimer);
  va.saveTimer = setTimeout(vaFlushSave, VA_SAVE_DELAY_MS);
}

async function vaFlushSave(extra = {}) {
  clearTimeout(va.saveTimer);
  const s = va.session;
  if (!s || (!va.edits.size && !Object.keys(extra).length)) return;
  const lines = [...va.edits.values()];
  va.edits.clear();
  try {
    await vaApi('save', { id: s.id, lines, ...extra });
    vaStatus(t('✅ Saved'), 'ok');
  } catch (err) {
    lines.forEach((l) => { if (!va.edits.has(l.id)) va.edits.set(l.id, l); });
    vaStatus(t('Not saved ({msg}). Changes will be retried.', { msg: err.message }), 'bad');
    va.saveTimer = setTimeout(vaFlushSave, 10000);
  }
}

// ---------------------------------------------------------------- build ---
function vaLoadLame() {
  if (window.lamejs) return Promise.resolve(window.lamejs);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = VA_LAME_URL;
    s.onload = () => (window.lamejs ? resolve(window.lamejs) : reject(new Error('lamejs')));
    s.onerror = () => reject(new Error('lamejs'));
    document.head.appendChild(s);
  });
}

async function vaRender() {
  const lines = va.session.lines.filter((l) => va.buffers.has(l.take?.key));
  if (!lines.length) throw new Error(t('No takes to put together yet.'));
  const lead = 0.3;
  let total = lead;
  lines.forEach((line, i) => {
    const trim = vaTrimOf(line);
    if (i > 0) total += vaLineGap(line);
    total += (trim.e - trim.s) / 1000;
  });
  total += lead;
  const off = new OfflineAudioContext(1, Math.ceil(total * VA_RATE), VA_RATE);
  let at = lead;
  // Where each line lands: the section's timings (LISTENING_MODE_PLAN.md 12c).
  const cues = [];
  lines.forEach((line, i) => {
    const trim = vaTrimOf(line);
    if (i > 0) at += vaLineGap(line);
    cues.push({ s: at, e: at + (trim.e - trim.s) / 1000, who: line.speaker, text: line.text });
    const src = off.createBufferSource();
    src.buffer = va.buffers.get(line.take.key);
    const gain = off.createGain();
    gain.gain.value = vaGainOf(line);
    src.connect(gain).connect(off.destination);
    const dur = (trim.e - trim.s) / 1000;
    src.start(at, trim.s / 1000, dur);
    at += dur;
  });
  return { rendered: await off.startRendering(), skipped: va.session.lines.length - lines.length, cues };
}

function vaToInt16(floats) {
  const out = new Int16Array(floats.length);
  for (let i = 0; i < floats.length; i += 1) {
    const v = Math.max(-1, Math.min(1, floats[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

async function vaEncode(rendered) {
  const pcm = vaToInt16(rendered.getChannelData(0));
  try {
    const lame = await vaLoadLame();
    const enc = new lame.Mp3Encoder(1, VA_RATE, 96);
    const parts = [];
    for (let i = 0; i < pcm.length; i += 1152) {
      const chunk = enc.encodeBuffer(pcm.subarray(i, i + 1152));
      if (chunk.length) parts.push(new Uint8Array(chunk));
    }
    const tail = enc.flush();
    if (tail.length) parts.push(new Uint8Array(tail));
    return { blob: new Blob(parts, { type: 'audio/mpeg' }), ext: 'mp3' };
  } catch {
    // No MP3 encoder (offline?): a WAV works everywhere, only bigger.
    const header = new DataView(new ArrayBuffer(44));
    const w = (o, str) => [...str].forEach((c, i) => header.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); header.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); header.setUint32(16, 16, true); header.setUint16(20, 1, true); header.setUint16(22, 1, true);
    header.setUint32(24, VA_RATE, true); header.setUint32(28, VA_RATE * 2, true); header.setUint16(32, 2, true); header.setUint16(34, 16, true);
    w(36, 'data'); header.setUint32(40, pcm.length * 2, true);
    return { blob: new Blob([header, pcm], { type: 'audio/wav' }), ext: 'wav' };
  }
}

async function vaBuild(kind) {
  vaStop();
  vaStatus(t('⏳ Putting the recording together…'));
  try {
    const { rendered, skipped, cues } = await vaRender();
    const { blob, ext } = await vaEncode(rendered);
    const name = `${String(va.session.title || 'recording').replace(/[\\/:*?"<>|]+/g, '').trim() || 'recording'}.${ext}`;
    const note = skipped ? ` ${t('({n} lines not recorded were left out.)', { n: skipped })}` : '';
    if (kind === 'download') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      vaStatus(t('✅ Downloaded {name}.', { name }) + note, 'ok');
      return;
    }
    const secId = vaEl('[data-va-target]')?.value;
    if (!secId) return;
    await attachListeningRecording(secId, new File([blob], name, { type: blob.type }), { cues });
    vaStatus(t('✅ The recording is in the listening section.') + note, 'ok');
  } catch (err) {
    vaStatus(t('Could not build the recording ({msg}).', { msg: err.message }), 'bad');
  }
}

// ---------------------------------------------------------------- events --
function vaOnClick(e) {
  const overlay = document.getElementById('voiceActorsOverlay');
  const backdropClick = e.target === overlay && overlay.dataset.pressedOnBackdrop === '1';
  if (backdropClick || e.target.closest('[data-va-close]')) { closeVoiceActors(); return; }
  const btn = e.target.closest('button');
  if (!btn) return;
  const d = btn.dataset;
  if (d.vaOpen) vaOpenSession(d.vaOpen);
  else if (d.vaDelete) vaDelete(d.vaDelete);
  else if (d.vaCreate !== undefined) vaCreate();
  else if (d.vaBack !== undefined) { vaStop(); vaFlushSave(); vaLoadList(); }
  else if (d.vaReload !== undefined) { vaStop(); vaFlushSave().then(() => vaOpenSession(va.session.id)); }
  else if (d.vaCopy !== undefined) {
    const link = vaLink(va.session.id);
    navigator.clipboard?.writeText(link).then(() => vaStatus(t('✅ Copied'), 'ok'), () => vaEl('[data-va-link]')?.select());
  } else if (d.vaPlay) {
    const line = va.session.lines.find((l) => l.id === d.vaPlay);
    if (line) vaPlayLine(line);
  } else if (d.vaPlayFrom !== undefined) {
    vaPlaySequence(va.session.lines.slice(Number(d.vaPlayFrom)).filter((l) => va.buffers.has(l.take?.key)));
  } else if (d.vaStop !== undefined) vaStop();
  else if (d.vaStatusSet) {
    const [id, status] = d.vaStatusSet.split(':');
    const line = va.session.lines.find((l) => l.id === id);
    if (!line) return;
    line.status = line.status === status ? 'recorded' : status;
    vaQueueEdit(id, { status: line.status });
    const li = vaEl(`[data-va-line="${id}"]`);
    if (li) {
      const i = va.session.lines.indexOf(line);
      li.outerHTML = vaLineHtml(line, i);
      vaDrawLine(line);
    }
  } else if (d.vaBuild) vaBuild(d.vaBuild);
}

function vaOnChange(e) {
  const el = e.target;
  if (el.matches('[data-va-new-source]')) {
    const ta = vaEl('[data-va-new-script]');
    if (ta) ta.hidden = !!el.value;
    const sec = vaListeningSections().find((s) => s.id === el.value);
    const title = vaEl('[data-va-new-title]');
    if (sec?.title && title) title.value = sec.title;
    vaUpdateNewInfo();
  } else if (el.matches('[data-va-filter]')) {
    va.filter = el.value;
    vaRenderSession();
  } else if (el.matches('[data-va-default-gap]')) {
    const v = Math.max(0, Math.min(5, Number(el.value) || 0));
    va.session.defaultGap = v;
    document.querySelectorAll('#voiceActorsOverlay [data-va-gap]').forEach((x) => { x.placeholder = String(v); });
    vaFlushSave({ defaultGap: v });
  } else if (el.matches('[data-va-gap]')) {
    const line = va.session.lines.find((l) => l.id === el.dataset.vaGap);
    if (!line) return;
    line.gap = el.value === '' ? null : Math.max(0, Math.min(10, Number(el.value) || 0));
    vaQueueEdit(line.id, { gap: line.gap });
  } else if (el.matches('[data-va-title]')) {
    const title = String(el.value || '').trim();
    if (title) { va.session.title = title; vaFlushSave({ title }); }
  }
}

function vaOnInput(e) {
  if (e.target.matches('[data-va-new-script]')) vaUpdateNewInfo();
}

window.addEventListener('resize', () => { if (va.view === 'session' && document.getElementById('voiceActorsOverlay')) vaDrawAll(); });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { vaLinesFromScript, vaAutoTrim };
}
