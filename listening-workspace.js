/* Listening activity navigation and local drafts. Recording sessions remain
   authoritative: fetch their latest words before preparing questions. A
   linked Listening Studio recording is too (when no session is linked). */
const lrWorkspace = {
  started: false, tab: 'script', method: 'people', sessionId: '', sessionTitle: '',
  studioId: '', studioTitle: '', studioSession: '', studio: null, studioOffline: false, studioTimer: null, studioFetching: false,
  file: null, audioUrl: '', saveTimer: null, loading: false,
};
const LR_STUDIO_TAB = 'pinplay-listening-studio';
const LR_DRAFT_FIELDS = ['lrDraftTitle', 'lrScript', 'lrTopic', 'lrLevel', 'lrLanguage', 'lrCharacters', 'lrLength', 'lrRecordedBy', 'lrNotes'];

function lrDraftKey() {
  return `pinplay.listening-draft.v1:${loadBackendUrl() || 'https://api.pinplay.win'}`;
}

function lrReadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(lrDraftKey()) || 'null');
    return draft?.fields && typeof draft.fields === 'object' ? draft : null;
  } catch { return null; }
}

function lrRestoreDraft() {
  const draft = lrReadDraft();
  if (!draft) return;
  LR_DRAFT_FIELDS.forEach(id => { if (typeof draft.fields[id] === 'string') lrEl(id).value = draft.fields[id]; });
  lrWorkspace.sessionId = /^[a-z0-9]{8,16}$/.test(draft.sessionId || '') ? draft.sessionId : '';
  lrWorkspace.sessionTitle = String(draft.sessionTitle || '');
  lrWorkspace.studioId = /^[a-z0-9]{8,32}$/.test(draft.studioId || '') ? draft.studioId : '';
  lrWorkspace.studioTitle = String(draft.studioTitle || '');
  lrWorkspace.studioSession = lrWorkspace.studioId && /^[a-z0-9]{8,16}$/.test(draft.studioSession || '') ? draft.studioSession : '';
  lrSelectMethod(['people', 'studio', 'upload'].includes(draft.method) ? draft.method : 'people', { keepWho: true });
  lrSelectTab(['script', 'recording', 'questions'].includes(draft.tab) ? draft.tab : 'script');
  lrEl('lrDraftStatus').textContent = t('Draft restored from this device');
}

function lrSaveDraft() {
  clearTimeout(lrWorkspace.saveTimer);
  const status = lrEl('lrDraftStatus');
  try {
    const fields = Object.fromEntries(LR_DRAFT_FIELDS.map(id => [id, lrEl(id)?.value || '']));
    localStorage.setItem(lrDraftKey(), JSON.stringify({ fields, started: lrWorkspace.started,
      tab: lrWorkspace.tab, method: lrWorkspace.method, sessionId: lrWorkspace.sessionId, sessionTitle: lrWorkspace.sessionTitle,
      studioId: lrWorkspace.studioId, studioTitle: lrWorkspace.studioTitle, studioSession: lrWorkspace.studioSession }));
    lrEl('lrRestoreDraft').classList.add('hidden');
    if (status) status.textContent = t('Draft saved on this device');
  } catch {
    if (status) status.textContent = t('Draft could not be saved on this device. Copy your script to keep it.');
  }
}

function lrQueueDraft() {
  lrEl('lrDraftStatus').textContent = t('Saving draft…');
  clearTimeout(lrWorkspace.saveTimer);
  lrWorkspace.saveTimer = setTimeout(lrSaveDraft, 300);
}

function lrSelectTab(tab, { focus = false } = {}) {
  if (!['script', 'recording', 'questions'].includes(tab)) return;
  lrWorkspace.started = true;
  lrWorkspace.tab = tab;
  lrEl('lrWorkspace').classList.remove('hidden');
  lrEl('lrStartChoices').classList.add('hidden');
  lrEl('lrChangeStart').classList.remove('hidden');
  document.querySelectorAll('[data-lr-tab]').forEach(button => {
    const selected = button.dataset.lrTab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    lrEl(button.getAttribute('aria-controls')).classList.toggle('hidden', !selected);
    if (selected && focus) button.focus();
  });
  lrRefreshWorkspace();
  lrSaveDraft();
  if (lrWorkspace.studioId) lrStudioTick();
}

function lrSelectMethod(method, { keepWho = false } = {}) {
  if (!['people', 'studio', 'upload'].includes(method)) return;
  lrWorkspace.method = method;
  document.querySelectorAll('[data-lr-method]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lrMethod === method)));
  document.querySelectorAll('[data-lr-method-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.lrMethodPanel !== method));
  if (method !== 'upload' && !keepWho) lrEl('lrRecordedBy').value = method === 'studio' ? 'studio' : 'students';
  lrRefreshWorkspace();
  lrSaveDraft();
}

function lrRefreshWorkspace() {
  lrUpdateInfo();
  const linked = !!lrWorkspace.sessionId;
  const studio = !!lrWorkspace.studioId;
  const script = lrValue('lrScript');
  lrEl('lrScript').readOnly = linked || studio;
  lrEl('lrDraftTitle').readOnly = linked || studio;
  lrEl('lrGenerator').classList.toggle('hidden', linked || studio);
  lrEl('lrLinkedActions').classList.toggle('hidden', !linked && !studio);
  lrEl('lrEditSession').classList.toggle('hidden', !linked);
  lrEl('lrEditStudio').classList.toggle('hidden', !studio);
  lrEl('lrManageSession').classList.toggle('hidden', !linked);
  lrEl('lrUseSessionAudio').classList.toggle('hidden', !linked);
  lrEl('lrSessionSource').textContent = [
    linked && t('Recording session: {title}', { title: lrWorkspace.sessionTitle }),
    studio && t('Listening Studio: {title}', { title: lrWorkspace.studioTitle }),
  ].filter(Boolean).join(' · ');
  lrEl('lrScriptState').textContent = script ? t('Script ready') : t('Start here');
  lrEl('lrRecordingState').textContent = studio ? t('In Listening Studio') : linked ? t('Session selected') : lrWorkspace.file ? t('Audio selected') : t('Choose a method');
  lrEl('lrQuestionsState').textContent = t('Create or connect');
  lrEl('lrQuestionSource').textContent = linked
    ? t('Questions will use the latest words from the selected recording session, including edits.')
    : studio ? t('Questions will use the latest script from Listening Studio, including edits made there.')
    : script ? t('Questions will use Your script.') : t('Have audio only? Attach the recording to your AI chat when using the question prompt.');
  lrEl('lrQuestionsBtn').textContent = script ? t('Generate questions from this script') : t('Generate questions from a recording');
  const target = lrEl('lrTargetSection');
  const selected = target.value;
  target.replaceChildren();
  const sections = vaListeningSections();
  if (!sections.length) target.add(new Option(t('No listening sections in the open quiz'), ''));
  sections.forEach((section, i) => target.add(new Option(vaSectionLabel(section, i), section.id)));
  if (sections.some(section => section.id === selected)) target.value = selected;
  target.disabled = !sections.length;
  lrEl('lrTargetContext').textContent = t('Open quiz: {title}', { title: quiz?.title || t('Untitled') });
  lrEl('lrAttachAudio').disabled = !sections.length || !lrWorkspace.file || lrWorkspace.loading;
  lrEl('lrUseSessionAudio').disabled = !sections.length || lrWorkspace.loading;
  lrEl('lrShowSection').disabled = !sections.length;
  lrRenderStudio();
}

// ------------------------------------------------------ Listening Studio --
// The studio (listening-studio/server.py) on this computer lets this page
// send a script, follow its recording and fetch the MP3, nothing else
// (LISTENING_STUDIO_PLAN.md, "The studio and the 🎧 Listening activity
// together"). Chrome asks once whether the site may reach this computer.
async function lrStudioApi(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${LR_STUDIO_URL}api/${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error(t('Listening Studio is not running on this computer.')), { offline: true });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.detail || data.error || res.statusText), { status: res.status }); // i18n-ignore (studio error)
  }
  return path.includes('/audio/') ? res.blob() : res.json();
}

function lrStudioProgress(job, now) {
  const counts = { done: job.done, total: job.total };
  if (job.stage === 'lines') {
    const started = job.stages?.lines;
    const min = started && job.done ? Math.round((((job.at || now) - started) / job.done) * (job.total - job.done) / 60) : 0;
    return min >= 1 ? t('Making lines {done}/{total} · about {min} min left', { ...counts, min }) : t('Making lines {done}/{total}', counts);
  }
  if (job.stage === 'voices') return t('Making the voices…');
  if (job.stage === 'checks') return t('Checking the words {done}/{total}', counts);
  if (job.stage === 'mix') return t('Mixing the recording…');
  return t('Working…');
}

// What the linked recording is waiting for. Only a finished recording whose
// voices were approved can go into a section (not the previous version
// while it is being made again).
function lrStudioDescribe(id, data, status) {
  const rec = data.recording || {};
  const job = status?.job?.id === id ? status.job : null;
  const queued = (status?.queue || []).some(([rid]) => rid === id);
  const parts = data.result?.parts || [];
  // stale: changed in the studio since the MP3 was made (server.py _changed).
  const ready = rec.stage === 'approved' && parts.length > 0 && !job && !queued && !data.stale;
  let text;
  if (job) text = lrStudioProgress(job, status.now);
  else if (queued) text = t('Waiting for Listening Studio to finish another recording…');
  else if (data.stale && parts.length) text = t('Changed since it was made: press Make the recording in Listening Studio again.');
  else if (rec.conversation && !ready) text = t('Next: check the lines and voices in Listening Studio, then press Make the recording there.');
  else if (rec.stage === 'setup') text = t('Next: describe the voices in Listening Studio, then press Make the recording there.');
  else if (rec.stage === 'voices') text = t('Next: listen to the voices in Listening Studio and approve them. Then the recording is made.');
  else if (ready) text = parts.length > 1
    ? t('Ready: {n} parts. Listen to them in Listening Studio, then add them to listening sections in Questions.', { n: parts.length })
    : t('Ready. Listen to it in Listening Studio, then add it to a listening section in Questions.');
  else text = t('Not made yet. Open it in Listening Studio.');
  return { busy: !!job || queued, ready, parts, text };
}

function lrStudioVisible() {
  return !document.hidden && !lrEl('listeningCardBody').classList.contains('hidden') && !lrEl('lrWorkspace').classList.contains('hidden');
}

async function lrStudioRefresh() {
  const id = lrWorkspace.studioId;
  try {
    const [data, status] = await Promise.all([lrStudioApi(`recordings/${id}`), lrStudioApi('status')]);
    if (lrWorkspace.studioId !== id) return;
    lrWorkspace.studio = lrStudioDescribe(id, data, status);
    const rec = data.recording || {};
    if (rec.title && rec.title !== 'Untitled') lrWorkspace.studioTitle = rec.title;
    // The script box follows the studio, where the script is edited now.
    if (!lrWorkspace.sessionId && typeof rec.text === 'string' && rec.text !== lrEl('lrScript').value) {
      lrEl('lrScript').value = rec.text;
      lrSaveDraft();
      lrRefreshWorkspace();
      return;
    }
  } catch (err) {
    if (lrWorkspace.studioId !== id) return;
    lrWorkspace.studio = { text: err.offline ? t('Listening Studio is not running. Start it from its desktop icon to follow this recording.')
      : err.status === 404 ? t('This recording is no longer in Listening Studio. Use a separate draft to unlink it.') : err.message };
  }
  lrRenderStudio();
}

// Asks the studio every few seconds while the card is open and the tab is
// visible (this computer only: no server cost).
async function lrStudioTick() {
  clearTimeout(lrWorkspace.studioTimer);
  if (!lrWorkspace.studioId) return;
  if (lrStudioVisible() && !lrWorkspace.studioFetching) {
    lrWorkspace.studioFetching = true;
    try { await lrStudioRefresh(); } finally { lrWorkspace.studioFetching = false; }
  }
  clearTimeout(lrWorkspace.studioTimer);
  if (lrWorkspace.studioId) lrWorkspace.studioTimer = setTimeout(lrStudioTick, lrWorkspace.studio?.busy ? 3000 : 10000);
}

// Only the studio's own parts of the card: it runs on every poll, so it
// never rebuilds the section list (an open dropdown would close).
function lrRenderStudio() {
  const studio = !!lrWorkspace.studioId;
  const state = lrWorkspace.studio;
  lrEl('lrStudioBtn').classList.toggle('hidden', studio);
  lrEl('lrStudioBtn').disabled = lrWorkspace.loading;
  lrEl('lrStudioOpen').classList.toggle('hidden', !studio);
  lrEl('lrStudioCopy').classList.toggle('hidden', studio || !lrWorkspace.studioOffline);
  lrEl('lrStudioState').textContent = studio ? state?.text || t('Checking Listening Studio…') : '';
  if (studio) lrEl('lrRecordingState').textContent = state?.ready ? t('Studio recording ready') : t('In Listening Studio');
  const parts = state?.ready ? state.parts : [];
  const select = lrEl('lrStudioPart');
  const labels = parts.map((p, i) => `${p.label || t('Part {n}', { n: i + 1 })} · ${Math.round(p.seconds)} s`);
  if ([...select.options].map(o => o.text).join('\n') !== labels.join('\n')) {
    select.replaceChildren(...labels.map((label, i) => new Option(label, String(i))));
    lrPickStudioPart();
  }
  lrEl('lrStudioPartWrap').classList.toggle('hidden', parts.length < 2);
  lrEl('lrUseStudioAudio').classList.toggle('hidden', !studio);
  lrEl('lrUseStudioAudio').disabled = !vaListeningSections().length || !state?.ready || lrWorkspace.loading;
}

// One MP3 per part, one part per section: the part at the section's position.
function lrPickStudioPart() {
  const select = lrEl('lrStudioPart');
  if (!select.options.length) return;
  const index = vaListeningSections().findIndex(section => section.id === lrEl('lrTargetSection').value);
  select.value = String(Math.min(Math.max(index, 0), select.options.length - 1));
}

function lrOpenStudio() {
  const opened = window.open(`${LR_STUDIO_URL}${lrWorkspace.studioId ? `#r=${lrWorkspace.studioId}` : ''}`, LR_STUDIO_TAB);
  if (!opened) lrStatus(t('The browser blocked the new tab. Press Open in Listening Studio.'), 'bad');
  return !!opened;
}

async function lrSendToStudio() {
  if (lrWorkspace.loading) return;
  lrWorkspace.loading = true;
  lrRenderStudio();
  let text;
  try {
    text = await lrLatestScript(); // a linked recording session's latest words
  } catch (err) {
    lrStatus(t('Could not load the latest script ({msg}). Try again.', { msg: err.message }), 'bad');
    lrWorkspace.loading = false;
    lrRenderStudio();
    return;
  }
  try {
    const script = parseListeningScript(text);
    if (!script.parts.some(part => part.items.some(item => item.type === 'line'))) {
      lrStatus(t('Write or paste a script first.'), 'bad');
      return;
    }
    const title = lrValue('lrDraftTitle') || script.title || lrValue('lrTopic');
    // A script without its language or voices opens on the studio's set-up form.
    const { id } = await lrStudioApi('recordings', { method: 'POST', body: { text, script, title, setup: listeningScriptNeedsSetup(script) } });
    Object.assign(lrWorkspace, { studioId: id, studioTitle: title || t('Untitled'), studioSession: '', studio: null, studioOffline: false });
    lrSaveDraft();
    lrRefreshWorkspace();
    if (lrOpenStudio()) lrStatus(t('Sent to Listening Studio. Continue there; this card shows how it is going.'), 'ok');
    lrStudioTick();
  } catch (err) {
    lrWorkspace.studioOffline = !!err.offline;
    lrStatus(err.offline
      ? t('Could not reach Listening Studio. Start it from its desktop icon, then press Send again. If Chrome asks whether this site may reach apps on this computer, choose Allow; if you blocked it, allow it again from the icon at the left of the address bar.')
      : t('Listening Studio could not take the script ({msg}).', { msg: err.message }), 'bad');
  } finally {
    lrWorkspace.loading = false;
    lrRenderStudio();
  }
}

// A recording session finished in the studio: recorded lines keep their
// takes, with the trims and pauses set in the review (the studio fetches the
// takes from PinPlay's media itself); lines nobody recorded are said there.
async function lrSendSessionToStudio(session, button) {
  if (!session || lrWorkspace.loading) return;
  lrWorkspace.loading = true;
  if (button) button.disabled = true;
  vaStatus(t('Sending the takes to Listening Studio…'));
  try {
    await vaFlushSave(); // trims, pauses and statuses not saved yet
    if (va.edits.size) throw new Error(t('Some changes are not saved yet. Try again in a moment.'));
    const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
    const lines = session.lines.map(line => ({ id: line.id, speaker: line.speaker, text: line.text, status: line.status || '',
      take: line.take ? `${base}/api/media/${line.take.key}` : '', trim: line.trim || null, gap: vaLineGap(line) }));
    const body = { title: session.title, language: lrValue('lrLanguage') || 'English', session: { id: session.id, lines } };
    let answer = null;
    if (lrWorkspace.studioId && lrWorkspace.studioSession === session.id) {
      // Made from this session before: the new takes go into that recording
      // (what the teacher changed in the studio stays).
      try {
        answer = await lrStudioApi('sessions', { method: 'POST', body: { ...body, into: lrWorkspace.studioId } });
      } catch (err) {
        if (err.status !== 404 && err.status !== 409) throw err; // deleted there, or not from this session: a new one
      }
    }
    answer = answer || await lrStudioApi('sessions', { method: 'POST', body });
    const { id, takes, failed } = answer;
    Object.assign(lrWorkspace, { studioId: id, studioTitle: session.title || t('Untitled'), studioSession: session.id, studio: null, studioOffline: false });
    lrSelectMethod('studio', { keepWho: true });
    lrOpenStudio();
    if (button) button.textContent = t('🔊 Update in Listening Studio');
    if (answer.updated) {
      vaStatus([
        answer.changed + answer.added + answer.removed
          ? t('Updated in Listening Studio: {changed} changed, {added} added, {removed} removed. Press Make the recording there.', answer)
          : t('Listening Studio already had everything from this session.'),
        answer.kept === 1 ? t('1 line you changed in the studio was left as it is.')
          : answer.kept ? t('{kept} lines you changed in the studio were left as they are.', answer) : '',
        failed ? t('{failed} takes could not be downloaded: try again later.', { failed }) : '',
      ].filter(Boolean).join(' '), failed ? 'bad' : 'ok');
    } else {
      vaStatus(failed
        ? t('Sent to Listening Studio with {takes} takes; {failed} could not be downloaded, so the studio says those lines.', { takes, failed })
        : takes === 1 ? t('Sent to Listening Studio with 1 take. Finish it there: the 🎧 Listening activity shows how it is going.')
        : t('Sent to Listening Studio with {takes} takes. Finish it there: the 🎧 Listening activity shows how it is going.', { takes }), failed ? 'bad' : 'ok');
    }
    lrStudioTick();
  } catch (err) {
    vaStatus(err.offline
      ? t('Could not reach Listening Studio. Start it from its desktop icon, then press Send again. If Chrome asks whether this site may reach apps on this computer, choose Allow; if you blocked it, allow it again from the icon at the left of the address bar.')
      : t('Listening Studio could not take the session ({msg}).', { msg: err.message }), 'bad');
  } finally {
    lrWorkspace.loading = false;
    if (button) button.disabled = false;
    lrRenderStudio();
  }
}

async function lrUseStudioRecording() {
  const id = lrEl('lrTargetSection').value;
  const studioId = lrWorkspace.studioId;
  if (!id || !studioId || lrWorkspace.loading) return;
  lrWorkspace.loading = true;
  lrRefreshWorkspace();
  try {
    // Fresh, not the last poll: it may be being made again since.
    const [data, status] = await Promise.all([lrStudioApi(`recordings/${studioId}`), lrStudioApi('status')]);
    lrWorkspace.studio = lrStudioDescribe(studioId, data, status);
    if (!lrWorkspace.studio.ready) { lrStatus(lrWorkspace.studio.text, 'bad'); return; }
    const part = lrWorkspace.studio.parts[Number(lrEl('lrStudioPart').value) || 0] || lrWorkspace.studio.parts[0];
    const name = String(part.mp3).split(/[\\/]/).pop();
    const blob = await lrStudioApi(`recordings/${studioId}/audio/out/${encodeURIComponent(name)}`);
    const previousAudio = findListeningSection(id)?.audio;
    // An upload like any other: attachListeningRecording keeps the MP3's timings.
    await attachListeningRecording(id, new File([blob], name, { type: 'audio/mpeg' }));
    const audio = findListeningSection(id)?.audio;
    if (audio && audio !== previousAudio) { lrStatus(t('Studio recording added to the selected listening section.'), 'ok'); lrShowTargetSection(); }
    else lrStatus(t('The recording was not added. Check the audio file and try again.'), 'bad');
  } catch (err) {
    lrStatus(err.offline ? t('Listening Studio is not running. Start it from its desktop icon, then try again.') : err.message, 'bad'); // i18n-ignore (studio error)
  } finally {
    lrWorkspace.loading = false;
    lrRefreshWorkspace();
  }
}

// Called when a session is opened, created or edited by the existing review UI.
function lrUseSession(session, { confirmReplace = false } = {}) {
  if (!lrEl('lrScript')) return true;
  const script = vaScriptText(session.lines || []);
  if (confirmReplace && lrWorkspace.sessionId !== session.id && lrValue('lrScript') && lrValue('lrScript') !== script
    && !confirm(t('Replace the current draft with this recording session’s script?'))) return false;
  lrWorkspace.sessionId = session.id;
  lrWorkspace.sessionTitle = session.title || '';
  lrEl('lrScript').value = script;
  lrEl('lrDraftTitle').value = session.title || '';
  lrSelectMethod('people');
  lrSelectTab('recording');
  return true;
}

async function lrLatestScript() {
  if (lrWorkspace.sessionId) {
    const sessionId = lrWorkspace.sessionId;
    if (va.session?.id === lrWorkspace.sessionId) {
      await vaFlushSave();
      if (va.edits.size) throw new Error(t('Save the pending changes before editing the script.'));
    }
    const { session } = await vaApi('get', { id: sessionId });
    if (lrWorkspace.sessionId !== sessionId) throw new Error(t('The selected session changed. Try again.'));
    // Refresh words without moving the selected tab or reopening an editor.
    lrWorkspace.sessionTitle = session.title || '';
    lrEl('lrScript').value = vaScriptText(session.lines || []);
    lrEl('lrDraftTitle').value = session.title || '';
    lrRefreshWorkspace();
    lrSaveDraft();
  } else if (lrWorkspace.studioId) {
    const studioId = lrWorkspace.studioId;
    try {
      const { recording } = await lrStudioApi(`recordings/${studioId}`);
      if (lrWorkspace.studioId !== studioId) throw new Error(t('The linked Studio recording changed. Try again.'));
      if (typeof recording?.text === 'string') lrEl('lrScript').value = recording.text;
      lrRefreshWorkspace();
      lrSaveDraft();
    } catch (err) {
      if (!err.offline || !confirm(t('Listening Studio is not running, so changes made there can’t be fetched. Use the script saved here?'))) throw err;
    }
  }
  return lrValue('lrScript');
}

async function lrMakeQuestions() {
  if (lrWorkspace.loading) return;
  lrWorkspace.loading = true;
  lrEl('lrQuestionsBtn').disabled = true;
  try {
    const script = await lrLatestScript();
    openListeningPrompt({ source: script ? 'paste' : 'attach', transcript: script,
      theme: lrValue('lrDraftTitle') || lrScriptTitle(script) || lrValue('lrTopic'), level: lrValue('lrLevel'), language: lrValue('lrLanguage') });
    if (!script) lrStatus(t('Attach your audio file to the AI chat together with the question prompt.'));
  } catch (err) {
    lrStatus(t('Could not load the latest script ({msg}). Try again before creating questions.', { msg: err.message }), 'bad');
  } finally {
    lrWorkspace.loading = false;
    lrEl('lrQuestionsBtn').disabled = false;
  }
}

function lrOpenSelectedSession({ section = false } = {}) {
  if (!lrWorkspace.sessionId) return;
  const target = lrEl('lrTargetSection').value;
  openVoiceActors({ sessionId: lrWorkspace.sessionId, ...(section ? { targetSectionId: target } : {}) });
}

function lrShowTargetSection() {
  const id = lrEl('lrTargetSection').value;
  if (!id) return;
  setSectionCollapsed(builderSectionToggleEl, builderCardBodyEl, false);
  setSectionCollapsed(builderQuestionsToggleEl, builderQuestionsBodyEl, false);
  const title = [...questionListEl.querySelectorAll('[data-ls-field="title"]')].find(input => input.dataset.lsId === id);
  title?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  title?.focus({ preventScroll: true });
}

function lrBindWorkspace() {
  if (!lrEl('lrLanguage')) return;
  lrEl('lrLanguage').innerHTML = LISTENING_SCRIPT_LANGUAGES.map(language => `<option>${escapeHtml(language)}</option>`).join('');
  // Every visit starts blank. Previous work is loaded only on request.
  lrEl('lrRestoreDraft').classList.toggle('hidden', !lrReadDraft());
  lrEl('lrRestoreDraft').addEventListener('click', lrRestoreDraft);
  lrEl('lrScriptPromptBtn').addEventListener('click', () => openListeningScriptStep());
  lrRefreshWorkspace();
  lrEl('listeningCard').addEventListener('input', event => {
    if (!LR_DRAFT_FIELDS.includes(event.target.id)) return;
    lrWorkspace.started = true;
    lrRefreshWorkspace();
    lrQueueDraft();
  });
  lrEl('listeningCard').addEventListener('change', event => {
    if (event.target.id === 'lrRecordedBy') lrSelectMethod(event.target.value === 'studio' ? 'studio' : 'people');
    else if (LR_DRAFT_FIELDS.includes(event.target.id)) lrSaveDraft();
  });
  document.querySelectorAll('[data-lr-tab], [data-lr-go]').forEach(button => button.addEventListener('click', () => lrSelectTab(button.dataset.lrTab || button.dataset.lrGo, { focus: true })));
  document.querySelectorAll('[data-lr-tab]').forEach(button => button.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-lr-tab]')];
    const index = tabs.indexOf(button);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
    if (next >= 0) { event.preventDefault(); lrSelectTab(tabs[next].dataset.lrTab, { focus: true }); }
  }));
  document.querySelectorAll('[data-lr-method]').forEach(button => button.addEventListener('click', () => lrSelectMethod(button.dataset.lrMethod)));
  document.querySelectorAll('[data-lr-start]').forEach(button => button.addEventListener('click', () => {
    const start = button.dataset.lrStart;
    if (start === 'sessions') { openVoiceActors(); return; }
    if (start === 'generate') { openListeningScriptStep(); return; }
    lrSelectTab(start === 'upload' ? 'recording' : 'script');
    if (start === 'upload') { lrSelectMethod('upload'); lrEl('lrAudioFile').focus(); }
    else { lrEl('lrGenerator').open = false; lrEl('lrScript').focus(); }
  }));
  lrEl('lrChangeStart').addEventListener('click', () => lrEl('lrStartChoices').classList.toggle('hidden'));
  lrEl('lrDetachSession').addEventListener('click', () => {
    clearTimeout(lrWorkspace.studioTimer);
    Object.assign(lrWorkspace, { sessionId: '', sessionTitle: '', studioId: '', studioTitle: '', studioSession: '', studio: null });
    lrRefreshWorkspace();
    lrSaveDraft();
  });
  ['lrEditSession', 'lrManageSession'].forEach(id => lrEl(id).addEventListener('click', () => lrOpenSelectedSession()));
  lrEl('lrUseSessionAudio').addEventListener('click', () => lrOpenSelectedSession({ section: true }));
  lrEl('lrShowSection').addEventListener('click', lrShowTargetSection);
  lrEl('lrQuestionsBtn').addEventListener('click', lrMakeQuestions);
  lrEl('lrCopyPromptBtn').addEventListener('click', async () => {
    const prompt = buildListeningScriptPrompt({ topic: lrValue('lrTopic'), level: lrValue('lrLevel'), language: lrValue('lrLanguage'),
      characters: lrValue('lrCharacters'), length: lrValue('lrLength'), notes: lrValue('lrNotes'), recordedBy: lrValue('lrRecordedBy') });
    if (await lrCopy(prompt, t('Paste the prompt into your AI chat, then paste its answer into Your script.'), 'prompt-listening-script.md')) lrEl('lrScript').focus();
  });
  lrEl('lrWriteBtn').addEventListener('click', () => openListeningPrompt({ source: 'write', theme: lrValue('lrDraftTitle') || lrValue('lrTopic'), level: lrValue('lrLevel'), language: lrValue('lrLanguage') }));
  lrEl('voiceActorsOpenBtn').addEventListener('click', () => openVoiceActors());
  lrEl('voiceActorsNewBtn').addEventListener('click', () => openVoiceActors({ newSession: true, script: lrValue('lrScript'), title: lrValue('lrDraftTitle') || lrScriptTitle(lrValue('lrScript')) || lrValue('lrTopic') }));
  lrEl('lrStudioBtn').addEventListener('click', lrSendToStudio);
  ['lrStudioOpen', 'lrEditStudio'].forEach(id => lrEl(id).addEventListener('click', lrOpenStudio));
  lrEl('lrUseStudioAudio').addEventListener('click', lrUseStudioRecording);
  lrEl('lrTargetSection').addEventListener('change', lrPickStudioPart);
  document.addEventListener('visibilitychange', () => { if (lrWorkspace.studioId && lrStudioVisible()) lrStudioTick(); });
  // The old way, when the studio can't be reached: copy the script and paste it there.
  lrEl('lrStudioCopy').addEventListener('click', async () => {
    // Open during the user gesture so clipboard permission cannot turn it into a blocked popup.
    window.open(LR_STUDIO_URL, '_blank', 'noopener');
    try {
      const script = await lrLatestScript();
      if (script) await lrCopy(script, t('Script copied. Paste it into a new recording in Listening Studio.'), 'listening-script.txt');
    } catch (err) { lrStatus(t('Could not load the latest script ({msg}). Try again before creating questions.', { msg: err.message }), 'bad'); }
  });
  lrEl('lrAudioFile').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { lrStatus(t('Please choose an audio file.'), 'bad'); return; }
    if (lrWorkspace.audioUrl) URL.revokeObjectURL(lrWorkspace.audioUrl);
    lrWorkspace.file = file;
    lrWorkspace.audioUrl = URL.createObjectURL(file);
    lrEl('lrAudioPreview').src = lrWorkspace.audioUrl;
    lrEl('lrAudioPreview').classList.remove('hidden');
    lrEl('lrAudioName').textContent = file.name;
    lrRefreshWorkspace();
  });
  lrEl('lrAttachAudio').addEventListener('click', async () => {
    const id = lrEl('lrTargetSection').value;
    if (!id || !lrWorkspace.file || lrWorkspace.loading) return;
    lrWorkspace.loading = true;
    lrRefreshWorkspace();
    try {
      const previousAudio = findListeningSection(id)?.audio;
      await attachListeningRecording(id, lrWorkspace.file);
      const audio = findListeningSection(id)?.audio;
      if (audio && audio !== previousAudio) { lrStatus(t('Recording added to the selected listening section.'), 'ok'); lrShowTargetSection(); }
      else lrStatus(t('The recording was not added. Check the audio file and try again.'), 'bad');
    } catch (err) { lrStatus(err.message, 'bad'); } // i18n-ignore (API error)
    finally { lrWorkspace.loading = false; lrRefreshWorkspace(); }
  });
  window.addEventListener('pagehide', () => { if (lrWorkspace.started) lrSaveDraft(); });
}

lrBindWorkspace();
