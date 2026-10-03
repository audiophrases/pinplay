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

async function openRecording(id, { keepText = false } = {}) {
  currentId = id;
  current = await api(`/api/recordings/${id}`);
  $('welcome').hidden = true;
  $('editor').hidden = false;
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('active', li.dataset.id === id));
  renderAll(keepText);
}

// ---------------------------------------------------------------- the editor
function settings() {
  const s = current.recording.settings || (current.recording.settings = {});
  ['modes', 'descriptions', 'sampleTakes', 'lineTakes'].forEach((k) => { s[k] = s[k] || {}; });
  return s;
}

function renderAll(keepText) {
  const rec = current.recording;
  $('title').textContent = rec.title || 'Untitled';
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
  renderVoices();
  renderLines();
  renderParts();
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
    : `<p class="muted">${making ? 'Being made… you can listen to each line below as soon as it is ready.' : 'Not made yet.'}</p>`;
}

function renderVoices() {
  const s = settings();
  const result = current.result?.voices || {};
  $('voices').innerHTML = Object.entries(current.voices).map(([name, v]) => {
    const r = result[name];
    const warning = r && base(r.sample) === `${v.sampleKey}.wav` ? r.warning : '';
    return `<div class="voice" data-name="${esc(name)}">
      <div class="voice-head"><b>${esc(name)}</b>${v.effect ? `<span class="chip">${esc(v.effect === 'pa' ? 'PA' : v.effect)}</span>` : ''}
        <select data-mode style="margin-left:auto">
          <option value="fixed" ${v.mode === 'fixed' ? 'selected' : ''}>Fixed voice</option>
          <option value="acted" ${v.mode === 'acted' ? 'selected' : ''}>Acted</option>
        </select></div>
      <textarea data-desc>${esc(s.descriptions[name] || v.description)}</textarea>
      ${v.mode === 'fixed' ? (v.sample ? `<audio controls preload="none" src="${audioUrl('voices', `${v.sampleKey}.wav`)}"></audio>` : '<span class="muted small">Voice sample not made yet.</span>') : '<span class="muted small">Acted: each line is performed from its direction.</span>'}
      ${warning ? `<div class="warning">⚠ ${esc(warning)} Describe an adult voice (e.g. "a young woman of about twenty with a calm, mid-range voice") or try a new voice.</div>` : ''}
      <div class="row" style="margin-top:0"><button class="btn small" data-newvoice ${v.mode === 'fixed' ? '' : 'disabled'}>↻ New voice sample</button></div>
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
        if (l.ready && l.ok === true) chip = '<span class="chip ok">✓ words</span>';
        else if (l.ready && l.ok === false) chip = '<span class="chip bad">⚠ words differ</span>';
        else if (l.ready) chip = '<span class="chip">ready</span>';
        rows.push(`<div class="line" data-task="${esc(l.id || '')}">
          <span class="muted">${n}</span>
          <span class="who" title="${esc(speaker)}">${it.overlap ? '↪ ' : ''}${esc(speaker)}</span>
          <div class="say">${esc(it.text)}${it.direction ? ` <span class="how">(${esc(it.direction)})</span>` : ''}
            ${l.ok === false ? `<div class="heard">Heard: “${esc(l.heard)}” · ${esc((l.diffs || []).join('; '))}</div>` : ''}</div>
          <div class="acts">${chip}
            ${l.ready ? `<audio controls preload="none" src="${audioUrl('lines', `${l.key}.wav`)}"></audio>` : ''}
            <button class="btn small" data-retake title="Make this line again, differently">↻ Try again</button></div>
        </div>`);
      });
    });
  });
  $('lines').innerHTML = rows.join('') || '<p class="muted">No lines yet.</p>';
}

async function saveSettings(make = true) {
  await api(`/api/recordings/${currentId}`, { method: 'PUT', body: { settings: settings(), make } });
  askToNotify();
  toast(make ? 'Saved. Making what changed…' : 'Saved.');
  await openRecording(currentId, { keepText: true });
}

function readVoiceCards() {
  const s = settings();
  document.querySelectorAll('#voices .voice').forEach((card) => {
    const name = card.dataset.name;
    const desc = card.querySelector('[data-desc]').value.trim();
    const original = (current.recording.script.voices[name] || {}).description || '';
    if (desc && desc !== original) s.descriptions[name] = desc;
    else delete s.descriptions[name];
    const mode = card.querySelector('[data-mode]').value;
    if (mode !== (s.mode || 'fixed')) s.modes[name] = mode;
    else delete s.modes[name];
  });
}

function askToNotify() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
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
    $('progressFill').style.width = `${pct}%`;
    const who = job.id === currentId ? '' : ' (another recording)';
    $('progressText').textContent = `${label}${job.total ? ` ${job.done}/${job.total}` : ''}${eta(job)}${who}${job.text ? ` · ${job.text}` : ''}${status.queue.length ? ` · ${status.queue.length} waiting` : ''}`;
    document.title = `${pct}% · Listening Studio`;
    watching = job;
    if (job.id === currentId && polls % 3 === 0) refreshQuietly();
  } else {
    $('progress').hidden = true;
    document.title = 'PinPlay Listening Studio';
    if (watching && status.last && status.last.id === watching.id) {
      const last = status.last;
      watching = null;
      ding();
      const msg = last.ok ? '✅ The recording is ready.' : `❌ Something went wrong: ${last.error}`;
      toast(msg, 8000);
      if (last.ok && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('PinPlay Listening Studio', { body: 'The recording is ready.' });
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
  renderLines();
  renderParts();
  const typing = document.activeElement && $('voices').contains(document.activeElement);
  if (!voicesDirty && !typing) renderVoices();
}

// ---------------------------------------------------------------- the script prompt
const SCRIPT_EXAMPLE = `LANGUAGE: English
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

$('createBtn').addEventListener('click', async () => {
  const text = $('newText').value;
  const script = parseListeningScript(text);
  if (!script.parts.some((p) => p.items.some((it) => it.type === 'line'))) {
    toast('Paste a script or some text first.');
    return;
  }
  askToNotify();
  const { id } = await api('/api/recordings', { method: 'POST', body: { text, script, make: true } });
  $('newText').value = '';
  $('newNotes').innerHTML = '';
  await loadList();
  await openRecording(id);
  toast('Started. You can listen to each line as soon as it is ready.');
});

$('saveBtn').addEventListener('click', async () => {
  const text = $('text').value;
  await api(`/api/recordings/${currentId}`, { method: 'PUT', body: { text, script: parseListeningScript(text), make: true } });
  askToNotify();
  toast('Saved. Making what changed…');
  await loadList();
  await openRecording(currentId);
});

$('applyBtn').addEventListener('click', async () => {
  const s = settings();
  s.ambience = $('setAmbience').value || null;
  s.spacing = $('setSpacing').value;
  s.mode = $('setMode').value;
  s.batch = $('setBatch').checked;
  s.check = $('setCheck').checked;
  readVoiceCards();
  await saveSettings(true);
});

$('voices').addEventListener('input', () => { voicesDirty = true; $('applyBtn').textContent = '🎙️ Apply and make again (voices changed)'; });
$('voices').addEventListener('change', (e) => {
  if (e.target.matches('[data-mode]')) { voicesDirty = true; $('applyBtn').textContent = '🎙️ Apply and make again (voices changed)'; }
});
$('voices').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-newvoice]');
  if (!btn) return;
  const name = btn.closest('.voice').dataset.name;
  if (!confirm(`Make a new voice for ${name}? All of ${name}'s lines will be made again with it.`)) return;
  readVoiceCards();
  const s = settings();
  s.sampleTakes[name] = (Number(s.sampleTakes[name]) || 0) + 1;
  await saveSettings(true);
});
$('lines').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-retake]');
  if (!btn) return;
  const id = btn.closest('.line').dataset.task;
  if (!id) return;
  const s = settings();
  s.lineTakes[id] = (Number(s.lineTakes[id]) || 0) + 1;
  await saveSettings(true);
});

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

$('deleteBtn').addEventListener('click', async () => {
  if (!confirm('Delete this recording and everything made for it?')) return;
  try {
    await api(`/api/recordings/${currentId}`, { method: 'DELETE' });
  } catch (err) {
    toast(err.message);
    return;
  }
  await loadList();
  showWelcome();
});

$('quitBtn').addEventListener('click', async () => {
  const busy = !$('progress').hidden;
  if (!confirm(busy ? 'A recording is being made. Quit anyway? It stops, and continues from where it was next time you make it.' : 'Close the studio? This frees the computer\'s memory. Double-click the desktop icon to start it again.')) return;
  await api('/api/quit', { method: 'POST' }).catch(() => {});
  document.body.innerHTML = '<div class="card" style="max-width:520px;margin:15vh auto;text-align:center"><h1>🎙️ The studio is closed</h1><p class="muted">Double-click <b>PinPlay Listening Studio</b> on the desktop to start it again.</p></div>';
});

$('promptBtn').addEventListener('click', () => {
  const sel = $('pLanguage');
  if (!sel.options.length) sel.innerHTML = LISTENING_SCRIPT_LANGUAGES.map((l) => `<option>${l}</option>`).join('');
  $('pStatus').textContent = '';
  $('promptDialog').showModal();
});
$('pCopy').addEventListener('click', async () => {
  const text = buildScriptPrompt({ topic: $('pTopic').value.trim(), level: $('pLevel').value.trim(), language: $('pLanguage').value,
    characters: $('pCharacters').value.trim(), length: $('pLength').value, notes: $('pNotes').value.trim() });
  try {
    await navigator.clipboard.writeText(text);
    $('pStatus').textContent = '✅ Copied: paste it into your AI chat.';
  } catch {
    $('pStatus').textContent = 'Could not copy.';
  }
});

// ---------------------------------------------------------------- start
(async () => {
  const recordings = await loadList().catch(() => []);
  if (recordings.length) await openRecording(recordings[0].id).catch(() => showWelcome());
  else showWelcome();
  await poll();
  setInterval(poll, 2000);
})();
