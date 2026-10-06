'use strict';
// PinPlay Listening Studio page (LISTENING_STUDIO_PLAN.md section 6b).
// Talks to server.py on this computer; scripts are read with PinPlay's own
// listening-script.js.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const base = (p) => String(p || '').split(/[\\/]/).pop();

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  return data;
}

let currentId = null;
let current = null; // { recording, lines, voices, result }
let voicesDirty = false;
let watching = null; // the job we saw running
let polls = 0;
let voiceLibrary = []; // engine/library.py: samples any character can use

function toast(msg, ms = 3500) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

function ding() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch { /* no sound: fine */ }
}

function notesHtml(text) {
  const script = parseListeningScript(text);
  const lines = script.parts.reduce((n, p) => n + p.items.filter((it) => it.type === 'line').length, 0);
  if (!lines && text.trim()) return 'Nothing to say yet: write lines such as "Mia (happy): Hello!", or plain text.';
  return script.notes.map((n) => `⚠ ${esc(n)}`).join('<br>');
}

// ---------------------------------------------------------------- the list
async function loadList() {
  const { recordings } = await api('/api/recordings');
  $('list').innerHTML = recordings.map((r) => `<li data-id="${r.id}" class="${r.id === currentId ? 'active' : ''}">${esc(r.title)}
    <span class="sub">${new Date((r.updated || 0) * 1000).toLocaleString()}${r.parts ? ' · ✅ made' : ''}</span></li>`).join('')
    || '<li class="muted small" style="cursor:default">No recordings yet.</li>';
  return recordings;
}

function showWelcome() {
  currentId = null;
  current = null;
  $('editor').hidden = true;
  $('welcome').hidden = false;
  document.querySelectorAll('#list li').forEach((li) => li.classList.remove('active'));
  $('newText').focus();
}

async function loadLibrary() {
  voiceLibrary = (await api('/api/library').catch(() => ({ voices: [] }))).voices || [];
  return voiceLibrary;
}

async function openRecording(id, { keepText = false } = {}) {
  currentId = id;
  [current] = await Promise.all([api(`/api/recordings/${id}`), loadLibrary()]);
  $('welcome').hidden = true;
  $('editor').hidden = false;
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('active', li.dataset.id === id));
  renderAll(keepText);
}

// ---------------------------------------------------------------- the editor
function settings() {
  const s = current.recording.settings || (current.recording.settings = {});
  ['modes', 'descriptions', 'sampleTakes', 'lineTakes', 'ownVoices'].forEach((k) => { s[k] = s[k] || {}; });
  return s;
}

function renderAll(keepText) {
  const rec = current.recording;
  if (document.activeElement !== $('titleInput')) $('titleInput').value = rec.title || 'Untitled';
  const nLines = current.lines.length;
  $('summary').textContent = `${Object.keys(current.voices).length} voices · ${nLines} lines`;
  if (!keepText) {
    $('text').value = rec.text || '';
    $('notes').innerHTML = notesHtml(rec.text || '');
  }
  const s = settings();
  $('setAmbience').value = s.ambience || '';
  $('setSpacing').value = s.spacing || 'natural';
  $('setMode').value = s.mode || 'fixed';
  $('setBatch').checked = s.batch !== false;
  $('setCheck').checked = s.check !== false;
  voicesDirty = false;
  $('applyBtn').textContent = '🎙️ Apply and make again';
  renderStage();
  renderVoices();
  renderLines();
  renderParts();
}

const approved = () => current?.recording?.stage === 'approved';

// Step 1: the voices are made first and the teacher approves them; step 2,
// the long part, starts only then (a wrong voice is fixed in minutes, not
// after the whole recording).
function renderStage() {
  const el = $('voiceStage');
  const job = renderParts.job;
  const makingVoices = job && job.id === currentId && job.kind === 'voices';
  const names = Object.keys(current.voices);
  const ready = names.length > 0 && names.every((n) => current.voices[n].sample);
  if (approved()) {
    el.className = 'stage';
    el.innerHTML = '✅ Voices approved. To change one, edit its description and press <b>↻ Remake voice</b>: you will listen and approve again, and only that character\'s lines are made again.';
    return;
  }
  el.className = 'stage todo';
  let action;
  if (makingVoices) action = '<span class="muted">⏳ Making the voices… (the first one takes longest: the voice model loads)</span>';
  else if (ready) action = '<button class="btn primary" id="approveBtn" type="button">✅ Approve the voices and make the recording</button>';
  else action = '<button class="btn" id="makeVoicesBtn" type="button">🎭 Make the voices</button>';
  el.innerHTML = `<b>Step 1 of 2: listen to each voice.</b> If one doesn't sound right (too young, wrong accent…), change its description and press <b>↻ Remake voice</b>. When they all sound right, approve them: then the lines are made (the long part).
    <div class="row">${action}</div>`;
}

function audioUrl(kind, name) {
  return `/api/recordings/${currentId}/audio/${kind}/${encodeURIComponent(name)}?t=${Date.now()}`;
}

function renderParts() {
  const parts = current.result?.parts || [];
  const job = renderParts.job;
  const making = job && job.id === currentId;
  $('parts').innerHTML = parts.length
    ? parts.map((p) => `<div class="part"><b>${esc(p.label || current.recording.title)}</b> <span class="muted small">${Math.round(p.seconds)} s</span>
        <audio controls preload="none" src="${audioUrl('out', base(p.mp3))}"></audio>
        <a class="btn primary" href="${audioUrl('out', base(p.mp3))}" download="${esc(base(p.mp3))}">💾 Save MP3</a></div>`).join('')
      + (making ? '<p class="muted small">Being made again: this is the previous version.</p>' : '')
    : `<p class="muted">${!approved() ? 'Step 2: the recording is made after you approve the voices.' : making ? 'Being made… you can listen to each line below as soon as it is ready.' : 'Not made yet.'}</p>`;
}

const libraryAudioUrl = (id) => `/api/library/${encodeURIComponent(id)}/audio?t=${Date.now()}`;

// Each card: where the voice comes from (designed from its description, or a
// library sample), then that voice.
function renderVoices() {
  const s = settings();
  const result = { ...(current.result?.voices || {}), ...(current.voiceReport || {}) };
  $('voices').innerHTML = Object.entries(current.voices).map(([name, v]) => {
    const r = result[name];
    const own = v.own;
    const warning = !own && r && base(r.sample) === `${v.sampleKey}.wav` ? r.warning : '';
    const source = `<select data-source title="Where this voice comes from">
        <option value="">✨ Designed from a description</option>
        ${voiceLibrary.map((lv) => `<option value="${esc(lv.id)}" ${own?.id === lv.id ? 'selected' : ''}>📚 ${esc(lv.name)}</option>`).join('')}
      </select>`;
    const body = own
      ? `<div class="own">
          <audio controls preload="none" src="${libraryAudioUrl(own.id)}"></audio>
          <label class="muted small">What the sample says (exactly: correct Whisper if needed)
            <textarea data-own-text data-id="${esc(own.id)}">${esc(own.text)}</textarea></label>
          <span class="muted small">Every line is copied from this sample: its accent, pitch, pace and manner.</span>
        </div>`
      : `<textarea data-desc>${esc(s.descriptions[name] || v.description)}</textarea>
      ${v.sample ? `<audio controls preload="none" src="${audioUrl('voices', `${v.sampleKey}.wav`)}"></audio>` : '<span class="muted small">Voice not made yet.</span>'}
      ${v.mode === 'acted' ? '<span class="muted small">Acted: each line is performed from its direction, in a voice like this one.</span>' : ''}
      ${warning ? `<div class="warning">⚠ ${esc(warning)} Describe an adult voice (e.g. "a young woman of about twenty with a calm, mid-range voice") and press ↻ Remake voice, or use a sample of a real voice (🎙 below).</div>` : ''}`;
    const buttons = [
      own ? '' : '<button class="btn small" data-remake title="Make this voice again (with the description above)">↻ Remake voice</button>',
      '<button class="btn small" data-find title="Choose a real voice from open recordings (American and other native readers, English with an accent)">🌍 Find a voice</button>',
      '<button class="btn small" data-mic title="Record someone reading this character\'s lines, here and now">🎤 Record</button>',
      '<button class="btn small" data-upload title="A recording of one person talking calmly, 5–15 seconds (MP3, WAV, a phone recording…)">🎙 Use my own sample…</button>',
      !own && v.sample ? '<button class="btn small" data-keep-voice title="Keep this voice to use it in other recordings">📚 Save to library</button>' : '',
    ].join('');
    return `<div class="voice" data-name="${esc(name)}">
      <div class="voice-head"><b>${esc(name)}</b>${v.effect ? `<span class="chip">${esc(v.effect === 'pa' ? 'PA' : v.effect)}</span>` : ''}
        ${own ? '<span class="chip" style="margin-left:auto">Fixed voice</span>' : `<select data-mode style="margin-left:auto">
          <option value="fixed" ${v.mode === 'fixed' ? 'selected' : ''}>Fixed voice</option>
          <option value="acted" ${v.mode === 'acted' ? 'selected' : ''}>Acted</option>
        </select>`}</div>
      ${source}
      ${body}
      <div class="row" style="margin-top:0">${buttons}</div>
    </div>`;
  }).join('') || '<p class="muted">No voices yet.</p>';
}

function renderLines() {
  const byId = Object.fromEntries(current.lines.map((l) => [l.id, l]));
  const script = current.recording.script || { parts: [] };
  const rows = [];
  let n = 0;
  script.parts.forEach((part, p) => {
    if (script.parts.length > 1) rows.push(`<div class="line sound"><span></span><b>${esc(part.label || `Part ${p + 1}`)}</b></div>`);
    part.items.forEach((it, k) => {
      if (it.type !== 'line') {
        rows.push(`<div class="line sound"><span></span><span>${it.type === 'pause' ? `⏸ pause ${it.seconds} s` : `🔔 ${esc(it.sound)}`}</span></div>`);
        return;
      }
      it.speakers.forEach((speaker) => {
        n += 1;
        const l = byId[`${p}:${k}:${speaker}`] || {};
        let chip = '<span class="chip">waiting</span>';
        if (l.ready && l.level === 'ok') chip = '<span class="chip ok">✓ words</span>';
        else if (l.ready && l.level === 'minor') chip = '<span class="chip warn" title="A small difference: often just how Whisper spelled what it heard. Listen to be sure.">≈ check by ear</span>';
        else if (l.ready && l.level === 'differs') chip = '<span class="chip bad">⚠ words differ</span>';
        else if (l.ready) chip = '<span class="chip">ready</span>';
        rows.push(`<div class="line" data-task="${esc(l.id || '')}">
          <span class="muted">${n}</span>
          <span class="who" title="${esc(speaker)}">${it.overlap ? '↪ ' : ''}${esc(speaker)}</span>
          <div class="say">${esc(it.text)}${it.direction ? ` <span class="how">(${esc(it.direction)})</span>` : ''}
            ${l.level === 'minor' || l.level === 'differs' ? `<div class="heard ${l.level}">Heard: “${esc(l.heard)}” · ${esc((l.diffs || []).join('; '))}</div>` : ''}</div>
          <div class="acts">${chip}
            ${l.ready ? `<audio controls preload="none" src="${audioUrl('lines', `${l.key}.wav`)}"></audio>` : ''}
            <button class="btn small" data-retake title="Make this line again, differently">↻ Try again</button></div>
        </div>`);
      });
    });
  });
  const wait = approved() ? '' : '<p class="muted small">The lines are made after you approve the voices.</p>';
  $('lines').innerHTML = wait + (rows.join('') || '<p class="muted">No lines yet.</p>');
}

// make: 'voices' (back to step 1), 'all' (approved: make the recording) or false.
async function saveSettings(make, message) {
  await api(`/api/recordings/${currentId}`, { method: 'PUT', body: { settings: settings(), make } });
  askToNotify();
  toast(message || (make === 'voices' ? 'Saved. Making the voices: listen, then approve.' : make ? 'Saved. Making what changed…' : 'Saved.'));
  await openRecording(currentId, { keepText: true });
}

function readVoiceCards() {
  const s = settings();
  document.querySelectorAll('#voices .voice').forEach((card) => {
    const name = card.dataset.name;
    if (!card.querySelector('[data-desc]')) return; // a library voice: nothing to read
    const desc = card.querySelector('[data-desc]').value.trim();
    const original = (current.recording.script.voices[name] || {}).description || '';
    if (desc && desc !== original) s.descriptions[name] = desc;
    else delete s.descriptions[name];
    const mode = card.querySelector('[data-mode]').value;
    if (mode !== (s.mode || 'fixed')) s.modes[name] = mode;
    else delete s.modes[name];
  });
}

// Asking to show "ready" notifications must never stop a button: some
// browsers answer this differently (or throw).
function askToNotify() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      const asked = Notification.requestPermission();
      if (asked && typeof asked.catch === 'function') asked.catch(() => {});
    }
  } catch { /* no notifications: fine */ }
}

// Every button: an error is shown, never swallowed.
function guarded(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      toast(`❌ ${err?.message || err}. Is the studio still running? If not, double-click its desktop icon.`, 9000);
    }
  };
}

// ---------------------------------------------------------------- progress
const STAGES = { start: ['Starting…', 0, 0], voices: ['Making voices', 0, 15], lines: ['Making lines', 15, 85], checks: ['Checking words', 85, 94], retry: ['Trying lines again', 94, 97], mix: ['Mixing', 97, 100], done: ['Finishing', 100, 100] };

function eta(job) {
  const startedLines = job.stages?.lines;
  if (job.stage !== 'lines' || !startedLines || !job.done) return '';
  const per = ((job.at || Date.now() / 1000) - startedLines) / job.done;
  const left = Math.max(0, Math.round((per * (job.total - job.done)) / 60));
  return left >= 1 ? ` · about ${left} min left` : ' · almost done';
}

async function poll() {
  let status;
  try {
    status = await api('/api/status');
  } catch {
    $('progress').hidden = false;
    $('progressText').textContent = 'The studio is not running. Double-click "PinPlay Listening Studio" on the desktop.';
    return;
  }
  polls += 1;
  const job = status.job;
  renderParts.job = job;
  if (job) {
    const [label, from, to] = STAGES[job.stage] || ['Working', 0, 100];
    const frac = job.total ? job.done / job.total : 0;
    const pct = Math.round(from + (to - from) * frac);
    $('progress').hidden = false;
    $('stopBtn').hidden = false;
    $('progressFill').style.width = `${pct}%`;
    const who = job.id === currentId ? '' : ' (another recording)';
    $('progressText').textContent = `${label}${job.total ? ` ${job.done}/${job.total}` : ''}${eta(job)}${who}${job.text ? ` · ${job.text}` : ''}${status.queue.length ? ` · ${status.queue.length} waiting` : ''}`;
    document.title = `${pct}% · Listening Studio`;
    watching = job;
    if (job.id === currentId && polls % 3 === 0) refreshQuietly();
  } else {
    $('progress').hidden = true;
    $('stopBtn').hidden = true;
    document.title = 'PinPlay Listening Studio';
    if (watching && status.last && status.last.id === watching.id) {
      const last = status.last;
      watching = null;
      ding();
      let msg = '✅ The recording is ready.';
      if (last.stopped) msg = '⏹ Stopped. Nothing finished is lost: making it again continues from there.';
      else if (!last.ok) msg = `❌ Something went wrong: ${last.error}`;
      else if (last.kind === 'voices') msg = '🎭 The voices are ready: listen to each one, then approve them.';
      toast(msg, 9000);
      if (last.ok && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('PinPlay Listening Studio', { body: last.kind === 'voices' ? 'The voices are ready to approve.' : 'The recording is ready.' });
      }
      await loadList();
      if (currentId === last.id) await openRecording(currentId, { keepText: true });
    }
  }
}

async function refreshQuietly() {
  const id = currentId;
  const data = await api(`/api/recordings/${id}`).catch(() => null);
  if (!data || id !== currentId) return;
  current = data;
  renderStage();
  renderLines();
  renderParts();
  const typing = document.activeElement && $('voices').contains(document.activeElement);
  if (!voicesDirty && !typing) renderVoices();
}

// ---------------------------------------------------------------- the script prompt
const SCRIPT_EXAMPLE = `TITLE: Sunday plans
LANGUAGE: English
AMBIENCE: room
VOICE Anna: A young British woman of about twenty with a warm, clear, mid-range voice, friendly and quick.
VOICE Tom [phone]: A young British man of about twenty with a relaxed, slightly deep voice, easy-going.

[ring]
Anna (cheerful): Hi Tom! Are we still meeting on Saturday?
Tom (apologetic): Not Saturday, sorry, I'm working. Can we do Sunday at half past ten?
Anna: Sure. At the café on Bridge Street?
Tom: It's closed for repairs. Let's meet at the library instead.
>> Anna (surprised): The library? On a Sunday?
Tom (laughing): It opens at ten. Trust me.`;

function buildScriptPrompt(o) {
  const minutes = Number(o.length) || 2;
  const words = { 1: '120–160', 2: '250–320', 3: '380–450', 4: '500–600' }[minutes] || '250–320';
  const lines = [
    '# Write a listening recording script',
    '',
    `Write the script of a recording for a listening exercise${o.level ? ` at level ${o.level}` : ''}, in ${o.language}.`,
    o.topic ? `- Topic: "${o.topic}"` : '- Topic: an everyday situation that suits the level.',
    o.characters ? `- Characters: "${o.characters}"` : '- Characters: two to four people, easy to tell apart.',
    `- Length: about ${minutes} minute${minutes > 1 ? 's' : ''} of speech (${words} words).`,
    o.notes ? `- Also: "${o.notes}"` : null,
    '',
    'Reply with the script only, in one ```text code block, in this format:',
    '```text',
    'TITLE: A short name',
    `LANGUAGE: ${o.language}`,
    'AMBIENCE: station',
    'VOICE Name: what their everyday voice is like',
    'VOICE Name [effect]: …',
    '[sound]',
    'Name (direction): what they say',
    '>> Name (direction): an interruption',
    'Name + Name: said together',
    '[pause 2]',
    '```',
    '',
    '## Rules',
    ...LISTENING_SCRIPT_RULES.map((r, i) => `${i + 1}. ${r}`),
    '',
    'Example (shape only):',
    '```text',
    SCRIPT_EXAMPLE,
    '```',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

// ---------------------------------------------------------------- events
$('newBtn').addEventListener('click', showWelcome);
$('list').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (li) openRecording(li.dataset.id).catch((err) => toast(err.message));
});
$('newText').addEventListener('input', () => { $('newNotes').innerHTML = notesHtml($('newText').value); });
$('text').addEventListener('input', () => { $('notes').innerHTML = notesHtml($('text').value); });

$('createBtn').addEventListener('click', guarded(async () => {
  let text = $('newText').value;
  if (!$('setup').hidden) {
    const missing = scriptSpeakers(parseListeningScript(text))
      .filter((n) => setup.keep[n] !== false && !(setup.desc[n] || '').trim() && !parseListeningScript(text).voices[n]);
    if (missing.length && !confirm(`No voice described for ${missing.join(', ')}: the studio will choose one. Continue?`)) return;
    text = textWithSetup(text);
  }
  const script = parseListeningScript(text);
  if (!script.parts.some((p) => p.items.some((it) => it.type === 'line'))) {
    toast('Paste a script or some text first.');
    return;
  }
  askToNotify();
  const btn = $('createBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Starting…';
  let id;
  try {
    ({ id } = await api('/api/recordings', { method: 'POST', body: { text, script, make: true } }));
  } finally {
    btn.disabled = false;
    btn.textContent = '🎙️ Make the recording';
  }
  $('newText').value = '';
  $('newNotes').innerHTML = '';
  $('setup').hidden = true;
  Object.assign(setup, { desc: {}, keep: {}, touched: {} });
  await loadList();
  await openRecording(id);
  toast('Started: the voices come first (a few minutes). Listen to them and approve them, then the recording is made.', 9000);
}));

$('saveBtn').addEventListener('click', guarded(async () => {
  const text = $('text').value;
  await api(`/api/recordings/${currentId}`, { method: 'PUT', body: { text, script: parseListeningScript(text), make: 'voices' } });
  askToNotify();
  toast('Saved. Check the voices (new characters get one), then approve.');
  await loadList();
  await openRecording(currentId);
}));

$('applyBtn').addEventListener('click', guarded(async () => {
  const s = settings();
  s.ambience = $('setAmbience').value || null;
  s.spacing = $('setSpacing').value;
  s.mode = $('setMode').value;
  s.batch = $('setBatch').checked;
  s.check = $('setCheck').checked;
  const changedVoices = voicesDirty;
  readVoiceCards();
  await saveSettings(changedVoices ? 'voices' : approved() ? 'all' : false);
}));

$('voices').addEventListener('input', (e) => {
  if (e.target.matches('[data-own-text]')) return; // saved on its own (change)
  voicesDirty = true;
  $('applyBtn').textContent = '🎙️ Apply and make again (voices changed)';
});
$('voices').addEventListener('change', guarded(async (e) => {
  if (e.target.matches('[data-mode]')) { voicesDirty = true; $('applyBtn').textContent = '🎙️ Apply and make again (voices changed)'; }
  const name = e.target.closest('.voice')?.dataset.name;
  if (e.target.matches('[data-source]')) {
    readVoiceCards();
    const s = settings();
    if (e.target.value) s.ownVoices[name] = e.target.value;
    else delete s.ownVoices[name];
    await saveSettings('voices', e.target.value ? `${name} now uses that library voice. Listen, then approve.` : `${name}'s voice is designed from its description again. Listen, then approve.`);
  } else if (e.target.matches('[data-own-text]')) {
    const text = e.target.value.trim();
    if (!text) { toast('Write what the sample says.'); return; }
    await api(`/api/library/${encodeURIComponent(e.target.dataset.id)}`, { method: 'PUT', body: { text } });
    readVoiceCards();
    await saveSettings('voices', 'Words saved. The lines in this voice will be made again after you approve.');
  }
}));

// 🎙 Use my own sample: the file goes to the library (trimmed, its words
// written down), and the character uses it.
let uploadFor = null;
async function uploadSample(file, name, ext = (file.name.split('.').pop() || 'audio').toLowerCase()) {
  const voiceName = prompt('A name for this voice in your library (e.g. "Calm man, 40s, Spanish accent"):', `${name}'s voice`);
  if (voiceName === null) return;
  const language = current.recording.script?.language || 'English';
  toast('⏳ Preparing the sample: trimming it and writing down its words (about a minute)…', 120000);
  const res = await fetch(`/api/library?name=${encodeURIComponent(voiceName)}&language=${encodeURIComponent(language)}&ext=${encodeURIComponent(ext)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  readVoiceCards();
  settings().ownVoices[name] = data.voice.id;
  await saveSettings('voices', `✅ Sample added for ${name}. Check the words under it (they must match exactly), listen, then approve.`);
}
$('sampleFile').addEventListener('change', guarded(async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file && uploadFor) await uploadSample(file, uploadFor);
}));

// 🎤 Record: the teacher (or a colleague) reads the character's own lines;
// the recording then goes the same way as a sample file.
const mic = { name: '', stream: null, recorder: null, chunks: [], blob: null, timer: null, meter: null, ctx: null };

function micReadingText(name) {
  const words = [];
  current.lines.filter((l) => l.speaker === name).some((l) => { words.push(...l.text.split(/\s+/)); return words.length >= 30; });
  return words.slice(0, 45).join(' ') || 'Hello! It\'s nice to meet you. I usually get up at about seven, have a coffee, and walk to work. What about you?';
}

function micStopAll() {
  clearInterval(mic.timer);
  cancelAnimationFrame(mic.meter);
  if (mic.recorder && mic.recorder.state !== 'inactive') mic.recorder.stop();
  mic.stream?.getTracks().forEach((t) => t.stop());
  mic.ctx?.close().catch(() => {});
  Object.assign(mic, { stream: null, ctx: null, timer: null, meter: null });
  $('micRecord').classList.remove('recording');
  $('micRecord').textContent = mic.blob ? '● Record again' : '● Record';
  $('micLevel').style.width = '0';
}

function openMic(name) {
  Object.assign(mic, { name, blob: null, chunks: [] });
  $('micTitle').textContent = `🎤 Record a voice for ${name}`;
  $('micText').textContent = micReadingText(name);
  $('micTime').textContent = '0 s';
  $('micPreview').hidden = true;
  $('micPreview').removeAttribute('src');
  $('micUse').disabled = true;
  $('micStatus').textContent = '';
  $('micRecord').textContent = '● Record';
  $('micDialog').showModal();
}

async function micStart() {
  try {
    mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false, channelCount: 1 } });
  } catch {
    $('micStatus').textContent = '❌ The microphone could not be used. Allow it when the browser asks (or in the 🔒 menu left of the address), and check one is plugged in.';
    return;
  }
  const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
  mic.recorder = new MediaRecorder(mic.stream, type ? { mimeType: type, audioBitsPerSecond: 128000 } : {});
  mic.chunks = [];
  mic.recorder.ondataavailable = (e) => { if (e.data.size) mic.chunks.push(e.data); };
  mic.recorder.onstop = () => {
    mic.blob = new Blob(mic.chunks, { type: mic.recorder.mimeType || 'audio/webm' });
    $('micPreview').src = URL.createObjectURL(mic.blob);
    $('micPreview').hidden = false;
    $('micUse').disabled = false;
    $('micRecord').textContent = '● Record again';
    $('micStatus').textContent = 'Listen to it: calm and clear, no noise? Then use it, or record again.';
  };
  mic.recorder.start();
  // A level meter, so a silent or too-quiet microphone shows at once.
  try {
    mic.ctx = new AudioContext();
    const analyser = mic.ctx.createAnalyser();
    analyser.fftSize = 1024;
    mic.ctx.createMediaStreamSource(mic.stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const draw = () => {
      analyser.getFloatTimeDomainData(buf);
      const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      $('micLevel').style.width = `${Math.min(100, peak * 140)}%`;
      $('micLevel').style.background = peak > 0.95 ? 'var(--bad)' : 'var(--ok)';
      mic.meter = requestAnimationFrame(draw);
    };
    draw();
  } catch { /* no meter: fine */ }
  const started = Date.now();
  $('micRecord').classList.add('recording');
  $('micRecord').textContent = '■ Stop';
  $('micUse').disabled = true;
  $('micPreview').hidden = true;
  $('micStatus').textContent = 'Recording… read the text above, then press Stop.';
  mic.timer = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    $('micTime').textContent = `${s} s`;
    if (s >= 25) micStopAll(); // more is cut anyway
  }, 250);
}

$('micRecord').addEventListener('click', guarded(async () => {
  if (mic.recorder && mic.recorder.state === 'recording') micStopAll();
  else await micStart();
}));
$('micDialog').addEventListener('close', micStopAll);
$('micUse').addEventListener('click', guarded(async () => {
  if (!mic.blob) return;
  const blob = mic.blob;
  const ext = /ogg/.test(blob.type) ? 'ogg' : /mp4/.test(blob.type) ? 'm4a' : 'webm';
  $('micDialog').close();
  await uploadSample(blob, mic.name, ext);
}));

$('voices').addEventListener('click', guarded(async (e) => {
  if (e.target.closest('[data-find]')) {
    await openFinder(e.target.closest('.voice').dataset.name);
    return;
  }
  if (e.target.closest('[data-mic]')) {
    openMic(e.target.closest('.voice').dataset.name);
    return;
  }
  if (e.target.closest('[data-upload]')) {
    uploadFor = e.target.closest('.voice').dataset.name;
    $('sampleFile').click();
    return;
  }
  if (e.target.closest('[data-keep-voice]')) {
    const name = e.target.closest('.voice').dataset.name;
    const voiceName = prompt('A name for this voice in your library:', `${name} (${current.recording.title || 'recording'})`);
    if (voiceName === null) return;
    await api('/api/library/from-recording', { method: 'POST', body: { id: currentId, character: name, name: voiceName } });
    await loadLibrary();
    renderVoices();
    toast(`📚 Saved to the library as “${voiceName}”.`);
    return;
  }
  const btn = e.target.closest('[data-remake]');
  if (!btn) return;
  const card = btn.closest('.voice');
  const name = card.dataset.name;
  const s = settings();
  const before = s.descriptions[name] || current.voices[name].description;
  readVoiceCards();
  const after = s.descriptions[name] || (current.recording.script.voices[name] || {}).description || '';
  // Same description: a different voice from it. New description: a voice from that.
  if (after.trim() === String(before).trim()) s.sampleTakes[name] = (Number(s.sampleTakes[name]) || 0) + 1;
  await saveSettings('voices', `Remaking ${name}'s voice (about 2 minutes). Listen, then approve.`);
}));
$('voiceStage').addEventListener('click', guarded(async (e) => {
  if (e.target.closest('#approveBtn')) {
    if (voicesDirty) {
      readVoiceCards();
      await saveSettings('voices', 'You changed a voice: remaking it first. Listen, then approve.');
      return;
    }
    readVoiceCards();
    await saveSettings('all', 'Voices approved. Making the recording: this is the long part.');
  } else if (e.target.closest('#makeVoicesBtn')) {
    readVoiceCards();
    await saveSettings('voices');
  }
}));
$('titleInput').addEventListener('change', guarded(async () => {
  const title = $('titleInput').value.trim() || 'Untitled';
  await api(`/api/recordings/${currentId}`, { method: 'PUT', body: { title } });
  current.recording.title = title;
  await loadList();
  toast('Title saved.');
}));
$('titleInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('stopBtn').addEventListener('click', guarded(async () => {
  await api('/api/stop', { method: 'POST' });
  toast('⏹ Stopping… every line already made is kept.', 6000);
}));
$('lines').addEventListener('click', guarded(async (e) => {
  const btn = e.target.closest('[data-retake]');
  if (!btn) return;
  const id = btn.closest('.line').dataset.task;
  if (!id) return;
  const s = settings();
  if (!approved()) {
    toast('Approve the voices first: the lines are made after that.');
    return;
  }
  s.lineTakes[id] = (Number(s.lineTakes[id]) || 0) + 1;
  await saveSettings('all', 'Making that line again…');
}));

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`📋 ${what} copied.`);
  } catch {
    toast('Could not copy. Select the text and copy it instead.');
  }
}
$('copyScriptBtn').addEventListener('click', () => copy($('text').value, 'Script'));
$('copyCleanBtn').addEventListener('click', () => copy(cleanListeningTranscript($('text').value), 'Clean transcript'));

$('deleteBtn').addEventListener('click', guarded(async () => {
  if (!confirm('Delete this recording and everything made for it?')) return;
  try {
    await api(`/api/recordings/${currentId}`, { method: 'DELETE' });
  } catch (err) {
    toast(err.message);
    return;
  }
  await loadList();
  showWelcome();
}));

$('quitBtn').addEventListener('click', guarded(async () => {
  const busy = !$('progress').hidden;
  if (!confirm(busy ? 'A recording is being made. Quit anyway? It stops, and continues from where it was next time you make it.' : 'Close the studio? This frees the computer\'s memory. Double-click the desktop icon to start it again.')) return;
  await api('/api/quit', { method: 'POST' }).catch(() => {});
  document.body.innerHTML = '<div class="card" style="max-width:520px;margin:15vh auto;text-align:center"><h1>🎙️ The studio is closed</h1><p class="muted">Double-click <b>PinPlay Listening Studio</b> on the desktop to start it again.</p></div>';
}));

// ---------------------------------------------------------------- the library dialog
async function renderLibrary() {
  await loadLibrary();
  $('libraryList').innerHTML = voiceLibrary.map((v) => `<div class="item" data-id="${esc(v.id)}">
      <div class="row"><input data-lib-name value="${esc(v.name)}" title="Its name" />
        <span class="muted small">${v.seconds} s · ${v.source === 'designed' ? 'designed' : 'own sample'}</span>
        <button class="btn small danger" type="button" data-lib-delete>🗑 Delete</button></div>
      <audio controls preload="none" src="${libraryAudioUrl(v.id)}"></audio>
      <textarea data-lib-text title="What the sample says, exactly">${esc(v.text)}</textarea>
      ${v.credit ? `<span class="muted small">From ${esc(v.credit)}</span>` : ''}
    </div>`).join('') || '<p class="muted">No voices yet.</p>';
}
$('libraryBtn').addEventListener('click', guarded(async () => {
  await renderLibrary();
  $('libraryDialog').showModal();
}));
$('libraryDialog').addEventListener('close', () => { if (currentId) openRecording(currentId, { keepText: true }).catch(() => {}); });
$('libraryList').addEventListener('change', guarded(async (e) => {
  const id = e.target.closest('.item')?.dataset.id;
  if (!id) return;
  if (e.target.matches('[data-lib-name]')) await api(`/api/library/${id}`, { method: 'PUT', body: { name: e.target.value } });
  else if (e.target.matches('[data-lib-text]')) await api(`/api/library/${id}`, { method: 'PUT', body: { text: e.target.value } });
  else return;
  toast('Saved.');
}));
$('libraryList').addEventListener('click', guarded(async (e) => {
  if (!e.target.closest('[data-lib-delete]')) return;
  const item = e.target.closest('.item');
  const name = item.querySelector('[data-lib-name]').value;
  if (!confirm(`Delete “${name}” from the library? Characters using it go back to a voice designed from their description.`)) return;
  await api(`/api/library/${item.dataset.id}`, { method: 'DELETE' });
  await renderLibrary();
}));

// ---------------------------------------------------------------- 🌍 find a voice
// Real voices from open recordings (catalog/voices.json): listen, then add
// to the library or give to a character at once.
const finder = { tab: 'readers', catalog: null, forName: null, shown: 40,
  f: { readerLanguage: 'English', accent: 'American', gender: '', pitch: '', manner: 'calm', pace: '', language: 'Spanish', age: '' } };
const PITCH_GROUP = { 'very low': 'low', low: 'low', 'slightly low': 'low', moderate: 'moderate', 'slightly high': 'high', high: 'high', 'very high': 'high' };
const PACE_GROUP = { 'very slow': 'slow', slow: 'slow', 'slightly slow': 'slow', moderate: 'moderate', 'slightly fast': 'fast', fast: 'fast', 'very fast': 'fast' };
const FINDER_ABOUT = {
  readers: 'LibriVox volunteers reading audiobooks, cleaned in a studio (free to use with credit). Labelled by pitch, pace and manner: "calm" voices copy best.',
  accentarchive: 'People from all over the world reading the same English paragraph (Speech Accent Archive, George Mason University; free for teaching, not for selling). Choose their first language.',
};
const READER_SOURCES = ['librittsr', 'cmltts', 'mls'];

async function openFinder(forName) {
  finder.forName = forName || null;
  if (!finder.catalog) finder.catalog = await api('/api/catalog');
  $('findTitle').textContent = forName ? `🌍 Find a voice for ${forName}` : '🌍 Find a voice';
  finder.shown = 40;
  renderFinder();
  if (!$('findDialog').open) $('findDialog').showModal();
}

function finderOptions(list, value, labels = {}) {
  return list.map(([v, n]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(labels[v] || v || 'Any')}${n ? ` (${n})` : ''}</option>`).join('');
}

function counted(voices, field) {
  const counts = {};
  voices.forEach((v) => { if (v[field]) counts[v[field]] = (counts[v[field]] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function finderMatches() {
  const { f, tab } = finder;
  const sel = (key, val) => !val || key === val;
  if (tab === 'readers') {
    const all = finder.catalog.voices.filter((v) => READER_SOURCES.includes(v.source) && v.language === f.readerLanguage);
    const rank = { calm: 0, mixed: 1, lively: 2 };
    return all.filter((v) => sel(v.accent, f.accent) && sel(v.gender, f.gender) && sel(PITCH_GROUP[v.pitch], f.pitch)
        && sel(PACE_GROUP[v.pace], f.pace) && (f.manner === 'any' || v.manner === 'calm' || (f.manner === 'mixed' && v.manner === 'mixed')))
      .sort((a, b) => rank[a.manner] - rank[b.manner] || a.gender.localeCompare(b.gender) || a.hz - b.hz);
  }
  const all = finder.catalog.voices.filter((v) => v.source === 'accentarchive');
  const ageOk = (a) => !f.age || (a && (f.age === 'young' ? a < 30 : f.age === 'middle' ? a >= 30 && a < 50 : a >= 50));
  return all.filter((v) => sel(v.language, f.language) && sel(v.gender, f.gender) && ageOk(v.age))
    .sort((a, b) => (a.gender ? 0 : 1) - (b.gender ? 0 : 1) || (a.age || 99) - (b.age || 99));
}

function finderLabel(v) {
  const who = { female: 'Woman', male: 'Man' }[v.gender] || 'Speaker';
  if (READER_SOURCES.includes(v.source)) {
    return [`<b>${who}${v.accent ? ` · ${esc(v.accent)}` : ''}</b>`, `<span class="muted small">${esc(v.pitch)} voice · ${esc(v.manner)} · ${esc(v.pace)} pace · reader ${esc(v.speaker)}</span>`];
  }
  return [`<b>${who}${v.age ? `, ${v.age}` : ''} · first language ${esc(v.language)}</b>`,
    `<span class="muted small">${v.birthplace ? `born in ${esc(v.birthplace)} · ` : ''}${esc(v.speaker)}</span>`];
}

function finderName(v) {
  const who = { female: 'woman', male: 'man' }[v.gender] || 'speaker';
  return READER_SOURCES.includes(v.source)
    ? `${v.accent ? `${v.accent} ` : `${v.language} `}${who}, ${v.pitch}, ${v.manner} (reader ${v.speaker})`
    : `${v.language} accent, ${who}${v.age ? ` ${v.age}` : ''} (${v.speaker})`;
}

function renderFinder() {
  const { f, tab } = finder;
  document.querySelectorAll('#findDialog [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('findAbout').textContent = FINDER_ABOUT[tab];
  const gender = finderOptions([['', ''], ['female', ''], ['male', '']], f.gender, { '': 'Any', female: 'Woman', male: 'Man' });
  if (tab === 'readers') {
    const readerLangs = counted(finder.catalog.voices.filter((v) => READER_SOURCES.includes(v.source)), 'language');
    const all = finder.catalog.voices.filter((v) => READER_SOURCES.includes(v.source) && v.language === f.readerLanguage);
    $('findFilters').innerHTML = `<label>Language<select data-f="readerLanguage">${finderOptions(readerLangs, f.readerLanguage)}</select></label>
       ${all.some((v) => v.accent) ? `<label>Accent<select data-f="accent">${finderOptions(counted(all, 'accent'), f.accent)}</select></label>` : ''}
       <label>Man or woman<select data-f="gender">${gender}</select></label>
       <label>Pitch<select data-f="pitch">${finderOptions([['', ''], ['low', ''], ['moderate', ''], ['high', '']], f.pitch, { '': 'Any', low: 'Low', moderate: 'Moderate', high: 'High' })}</select></label>
       <label>Manner<select data-f="manner">${finderOptions([['calm', ''], ['mixed', ''], ['any', '']], f.manner, { calm: 'Calm only (copies best)', mixed: 'Calm or a little lively', any: 'Any' })}</select></label>
       <label>Pace<select data-f="pace">${finderOptions([['', ''], ['slow', ''], ['moderate', ''], ['fast', '']], f.pace, { '': 'Any', slow: 'Slow', moderate: 'Moderate', fast: 'Fast' })}</select></label>`;
  } else {
    const all = finder.catalog.voices.filter((v) => v.source === 'accentarchive');
    $('findFilters').innerHTML = `<label>First language<select data-f="language">${finderOptions(counted(all, 'language'), f.language)}</select></label>
       <label>Man or woman<select data-f="gender">${gender}</select></label>
       <label>Age<select data-f="age">${finderOptions([['', ''], ['young', ''], ['middle', ''], ['older', '']], f.age, { '': 'Any', young: 'Under 30', middle: '30–49', older: '50 or more' })}</select></label>`;
  }
  const found = finderMatches();
  const action = finder.forName ? `✅ Use for ${esc(finder.forName)}` : '➕ Add to library';
  $('findList').innerHTML = found.slice(0, finder.shown).map((v) => {
    const [title, sub] = finderLabel(v);
    return `<div class="find-item" data-key="${esc(v.key)}"><div>${title}<br>${sub}</div>
      <div class="acts"><button type="button" class="btn small" data-listen>▶ Listen</button>
        <button type="button" class="btn small primary" data-take>${action}</button></div></div>`;
  }).join('') + (found.length > finder.shown ? `<button type="button" class="btn" data-more>Show more (${found.length - finder.shown} left)</button>` : '')
    + (found.length ? '' : '<p class="muted">No voice matches: change a filter.</p>');
}

$('findDialog').addEventListener('click', guarded(async (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    finder.tab = tab.dataset.tab;
    finder.f.gender = '';
    finder.f.accent = '';
    finder.shown = 40;
    renderFinder();
    return;
  }
  if (e.target.closest('[data-more]')) {
    finder.shown += 40;
    renderFinder();
    return;
  }
  const item = e.target.closest('.find-item');
  if (!item) return;
  const key = item.dataset.key;
  if (e.target.closest('[data-listen]')) {
    const btn = e.target.closest('[data-listen]');
    item.querySelector('.err')?.remove();
    let player = item.querySelector('audio');
    if (player) { player.play().catch(() => {}); return; }
    btn.disabled = true;
    btn.textContent = '⏳ Fetching…';
    try {
      const res = await fetch(`/api/catalog/${encodeURIComponent(key)}/audio`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
      player = document.createElement('audio');
      player.controls = true;
      player.src = URL.createObjectURL(await res.blob());
      item.appendChild(player);
      player.play().catch(() => {});
    } catch (err) {
      item.insertAdjacentHTML('beforeend', `<div class="err">❌ ${esc(err.message)}</div>`);
    } finally {
      btn.disabled = false;
      btn.textContent = '▶ Listen';
    }
    return;
  }
  if (e.target.closest('[data-take]')) {
    const v = finder.catalog.voices.find((x) => x.key === key);
    const name = prompt('A name for this voice in your library:', finderName(v));
    if (name === null) return;
    const btn = e.target.closest('[data-take]');
    btn.disabled = true;
    btn.textContent = v.text ? '⏳ Adding…' : '⏳ Adding (about a minute)…';
    let voice;
    try {
      ({ voice } = await api(`/api/catalog/${encodeURIComponent(key)}/add`, { method: 'POST', body: { name } }));
    } finally {
      btn.disabled = false;
      btn.textContent = finder.forName ? `✅ Use for ${finder.forName}` : '➕ Add to library';
    }
    await loadLibrary();
    if (finder.forName && currentId) {
      const forName = finder.forName;
      $('findDialog').close();
      readVoiceCards();
      settings().ownVoices[forName] = voice.id;
      await saveSettings('voices', `✅ ${forName} now has the voice “${name}”. Listen, then approve.`);
    } else {
      toast(`📚 “${name}” added to the library.`);
      if ($('libraryDialog').open) await renderLibrary();
    }
  }
}));
$('findDialog').addEventListener('change', (e) => {
  const key = e.target.dataset.f;
  if (!key) return;
  finder.f[key] = e.target.value;
  finder.shown = 40;
  renderFinder();
});
$('libraryFindBtn').addEventListener('click', guarded(() => openFinder(null)));

$('promptBtn').addEventListener('click', () => {
  const sel = $('pLanguage');
  if (!sel.options.length) sel.innerHTML = LISTENING_SCRIPT_LANGUAGES.map((l) => `<option>${l}</option>`).join('');
  $('pStatus').textContent = '';
  syncPromptMode();
  $('promptDialog').showModal();
});
$('pCopy').addEventListener('click', guarded(async () => {
  if ($('pMode').value === 'own' && !$('pScript').value.trim()) {
    $('pStatus').textContent = 'Paste your script into the box first.';
    return;
  }
  const text = $('pMode').value === 'own'
    ? buildOwnScriptPrompt({ script: $('pScript').value.trim(), notes: $('pNotes').value.trim() })
    : buildScriptPrompt({ topic: $('pTopic').value.trim(), level: $('pLevel').value.trim(), language: $('pLanguage').value,
      characters: $('pCharacters').value.trim(), length: $('pLength').value, notes: $('pNotes').value.trim() });
  try {
    await navigator.clipboard.writeText(text);
    $('pStatus').textContent = '✅ Copied: paste it into your AI chat.';
  } catch {
    $('pStatus').textContent = 'Could not copy.';
  }
}));

// ---------------------------------------------------------------- setting up a plain script
// A script pasted without settings (a teacher's own dialogue): the form adds
// TITLE, LANGUAGE, AMBIENCE and VOICE lines to the top; the words stay.
const ACCENT = { English: 'British', French: 'French', Spanish: 'Spanish', German: 'German', Italian: 'Italian',
  Portuguese: 'Portuguese', Russian: 'Russian', Chinese: 'Mandarin-speaking Chinese', Japanese: 'Japanese', Korean: 'Korean' };
const VOICE_TYPES = [
  ['Young woman', (a) => `A young ${a} woman of about twenty with a clear, natural, mid-range voice.`],
  ['Young man', (a) => `A young ${a} man of about twenty with a relaxed, slightly deep voice.`],
  ['Woman, 40s', (a) => `A ${a} woman in her forties with a warm, calm voice.`],
  ['Man, 40s', (a) => `A ${a} man in his forties with a calm, fairly deep voice.`],
  ['Older woman', (a) => `A ${a} woman in her sixties with a soft, slightly low voice.`],
  ['Older man', (a) => `A ${a} man in his sixties with a slow, low, gravelly voice.`],
  ['Narrator', (a) => `A calm, clear ${a} narrator in their forties, neutral and measured.`],
];
const HEADING_NAMES = /^(dialogue|dialog|diálogo|dialogo|titre|title|título|titolo|scène|scene|escena|escenario|situation|context|contexte)$/i;
const LANG_WORDS = {
  English: 'the and is you are to of it that with yes thank very what this have',
  French: "le la les est et je tu vous nous une pas avec pour c'est ça très merci oui qui des du",
  Spanish: 'el los las es y que pero muy gracias sí está con para una yo tú del por',
  German: 'der die das und ist ich du nicht mit sehr danke ja ein eine wir auch',
  Italian: 'il che è sono non per molto grazie sì una io tu con della gli',
  Portuguese: 'não você obrigado obrigada muito sim uma com para eu está é os',
};
const setup = { desc: {}, keep: {}, touched: {} };

function guessLanguage(text) {
  if (/[\u3040-\u30ff]/.test(text)) return 'Japanese';
  if (/[\uac00-\ud7af]/.test(text)) return 'Korean';
  if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
  if (/[\u0400-\u04ff]/.test(text)) return 'Russian';
  const words = String(text).toLowerCase().match(/[\p{L}']+/gu) || [];
  let best = 'English';
  let bestScore = 0;
  Object.entries(LANG_WORDS).forEach(([lang, list]) => {
    const set = new Set(list.split(' '));
    const score = words.filter((w) => set.has(w)).length;
    if (score > bestScore) { best = lang; bestScore = score; }
  });
  return best;
}

function scriptSpeakers(script) {
  const names = [];
  script.parts.forEach((p) => p.items.forEach((it) => {
    if (it.type === 'line') it.speakers.forEach((s) => { if (!names.includes(s)) names.push(s); });
  }));
  return names;
}

function needsSetup(script) {
  const names = scriptSpeakers(script);
  return names.length > 0 && (!script.language || names.some((n) => !script.voices[n]));
}

function renderSetup() {
  const text = $('newText').value;
  const script = parseListeningScript(text);
  const show = needsSetup(script);
  $('setup').hidden = !show;
  if (!show) return;
  const lang = $('suLanguage');
  if (!lang.options.length) lang.innerHTML = LISTENING_SCRIPT_LANGUAGES.map((l) => `<option>${l}</option>`).join('');
  if (!setup.touched.language) lang.value = script.language && LISTENING_SCRIPT_LANGUAGES.includes(script.language) ? script.language : guessLanguage(text);
  if (!setup.touched.ambience) $('suAmbience').value = LISTENING_SCRIPT_AMBIENCES.includes(script.ambience) ? script.ambience : 'room';
  const names = scriptSpeakers(script);
  if (!setup.touched.title) {
    // "Dialogue : Chloé et Paul au café" → the text of that one line.
    const heading = text.split(/[\r\n]+/).map((l) => /^\s*([^:]{1,30}?)\s*:\s*(.+)$/.exec(l)).find((m) => m && HEADING_NAMES.test(m[1].trim()));
    $('suTitle').value = script.title || (heading ? heading[2].trim().slice(0, 80) : '');
  }
  $('suVoices').innerHTML = names.map((name) => {
    if (setup.keep[name] === undefined) setup.keep[name] = !HEADING_NAMES.test(name);
    const keep = setup.keep[name];
    const desc = setup.desc[name] ?? (script.voices[name]?.description || '');
    const first = script.parts.flatMap((p) => p.items).find((it) => it.type === 'line' && it.speakers.includes(name));
    return `<div class="voice ${keep ? '' : 'skipped'}" data-name="${esc(name)}">
      <div class="voice-head"><b>${esc(name)}</b>
        <label><input type="checkbox" data-keep ${keep ? 'checked' : ''} /> it's a character</label></div>
      <span class="muted small">“${esc((first?.text || '').slice(0, 70))}”</span>
      <div class="types">${VOICE_TYPES.map(([label], i) => `<button type="button" class="btn small" data-type="${i}">${label}</button>`).join('')}</div>
      <textarea data-sudesc placeholder="Click a type above, or describe the voice: gender, age, accent, voice quality…">${esc(desc)}</textarea>
    </div>`;
  }).join('');
}

function serializeScript(script, keep) {
  const out = [];
  script.parts.forEach((p, i) => {
    if (p.label || i > 0) out.push(`--- ${p.label || `Part ${i + 1}`}`);
    p.items.forEach((it) => {
      if (it.type === 'sound') out.push(`[${it.sound}]`);
      else if (it.type === 'pause') out.push(`[pause ${it.seconds}]`);
      else {
        const speakers = it.speakers.filter((s) => keep[s] !== false);
        if (!speakers.length) return;
        const fx = it.effect ? ` [${it.effect === 'pa' ? 'PA' : it.effect}]` : '';
        out.push(`${it.overlap ? '>> ' : ''}${speakers.join(' + ')}${fx}${it.direction ? ` (${it.direction})` : ''}: ${it.text}`);
      }
    });
  });
  return out.join('\n');
}

// The pasted text plus the form's settings, as one complete script.
function textWithSetup(raw) {
  const script = parseListeningScript(raw);
  const header = [];
  const title = $('suTitle').value.trim();
  if (title) header.push(`TITLE: ${title}`);
  header.push(`LANGUAGE: ${$('suLanguage').value}`, `AMBIENCE: ${$('suAmbience').value}`);
  scriptSpeakers(script).filter((n) => setup.keep[n] !== false).forEach((n) => {
    const desc = (setup.desc[n] ?? script.voices[n]?.description ?? '').trim();
    const effect = script.voices[n]?.effect;
    if (desc) header.push(`VOICE ${n}${effect ? ` [${effect === 'pa' ? 'PA' : effect}]` : ''}: ${desc}`);
  });
  return `${header.join('\n')}\n\n${serializeScript(script, setup.keep)}`;
}

$('suVoices').addEventListener('change', (e) => {
  if (!e.target.matches('[data-keep]')) return;
  setup.keep[e.target.closest('.voice').dataset.name] = e.target.checked;
  renderSetup();
});
$('suVoices').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  const card = btn.closest('.voice');
  const accent = ACCENT[$('suLanguage').value] || '';
  setup.desc[card.dataset.name] = VOICE_TYPES[Number(btn.dataset.type)][1](accent).replace(/\s+/g, ' ');
  card.querySelector('[data-sudesc]').value = setup.desc[card.dataset.name];
});
$('suVoices').addEventListener('input', (e) => {
  if (e.target.matches('[data-sudesc]')) setup.desc[e.target.closest('.voice').dataset.name] = e.target.value;
});
['suTitle', 'suLanguage', 'suAmbience'].forEach((id) => $(id).addEventListener('input', () => {
  setup.touched[{ suTitle: 'title', suLanguage: 'language', suAmbience: 'ambience' }[id]] = true;
}));
$('newText').addEventListener('input', renderSetup);

// ---------------------------------------------------------------- the prompt for a teacher's own script
function buildOwnScriptPrompt(o) {
  return [
    '# Turn my script into a recording script',
    '',
    'Below is my script for a listening recording. Rewrite it in the recording-script format below, so a voice studio can record it with no further changes.',
    '- Keep every spoken word exactly as it is: don\'t add, remove, correct or translate anything that is said. Each speech turn stays a line of its own (split it into several lines of the same speaker only if it is longer than about 30 words).',
    '- Headings, titles and scene descriptions are not said aloud: use them for TITLE and AMBIENCE instead.',
    '- Add what the studio needs: TITLE, LANGUAGE (the script\'s own language), AMBIENCE, a VOICE line for every character, a direction for every line that isn\'t neutral, and effects or sounds where the scene calls for them.',
    o.notes ? `- Also: "${o.notes}"` : null,
    '',
    'Reply with the script only, in one ```text code block, in this format:',
    '```text',
    'TITLE: A short name',
    'LANGUAGE: …',
    'AMBIENCE: room',
    'VOICE Name: what their everyday voice is like',
    'VOICE Name [effect]: …',
    '[sound]',
    'Name (direction): what they say',
    '```',
    '',
    '## Rules for the voices, directions, effects and sounds',
    'The rules about writing the dialogue itself don\'t apply here: the words are mine and stay as they are.',
    ...LISTENING_SCRIPT_RULES.map((r, i) => `${i + 1}. ${r}`),
    '',
    '## My script',
    '```text',
    o.script,
    '```',
  ].filter((l) => l !== null).join('\n');
}

function syncPromptMode() {
  const own = $('pMode').value === 'own';
  $('pScriptWrap').hidden = !own;
  ['pTopicWrap', 'pRowA', 'pRowB'].forEach((id) => { $(id).hidden = own; });
  if (own && !$('pScript').value.trim()) $('pScript').value = $('newText').value;
}
$('pMode').addEventListener('change', syncPromptMode);

// ---------------------------------------------------------------- start
(async () => {
  const recordings = await loadList().catch(() => []);
  if (recordings.length) await openRecording(recordings[0].id).catch(() => showWelcome());
  else showWelcome();
  await poll();
  setInterval(poll, 2000);
})();
