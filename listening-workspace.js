/* Listening activity navigation and local drafts. Recording sessions remain
   authoritative: fetch their latest words before preparing questions. */
const lrWorkspace = {
  started: false, tab: 'script', method: 'people', sessionId: '', sessionTitle: '',
  file: null, audioUrl: '', saveTimer: null, loading: false,
};
const LR_DRAFT_FIELDS = ['lrDraftTitle', 'lrScript', 'lrTopic', 'lrLevel', 'lrLanguage', 'lrCharacters', 'lrLength', 'lrRecordedBy', 'lrNotes'];

function lrDraftKey() {
  return `pinplay.listening-draft.v1:${loadBackendUrl() || 'https://api.pinplay.win'}`;
}

function lrSaveDraft() {
  clearTimeout(lrWorkspace.saveTimer);
  const status = lrEl('lrDraftStatus');
  try {
    const fields = Object.fromEntries(LR_DRAFT_FIELDS.map(id => [id, lrEl(id)?.value || '']));
    localStorage.setItem(lrDraftKey(), JSON.stringify({ fields, started: lrWorkspace.started,
      tab: lrWorkspace.tab, method: lrWorkspace.method, sessionId: lrWorkspace.sessionId, sessionTitle: lrWorkspace.sessionTitle }));
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
}

function lrSelectMethod(method) {
  if (!['people', 'studio', 'upload'].includes(method)) return;
  lrWorkspace.method = method;
  document.querySelectorAll('[data-lr-method]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lrMethod === method)));
  document.querySelectorAll('[data-lr-method-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.lrMethodPanel !== method));
  if (method !== 'upload') lrEl('lrRecordedBy').value = method === 'studio' ? 'studio' : 'students';
  lrRefreshWorkspace();
  lrSaveDraft();
}

function lrRefreshWorkspace() {
  lrUpdateInfo();
  const linked = !!lrWorkspace.sessionId;
  const script = lrValue('lrScript');
  lrEl('lrScript').readOnly = linked;
  lrEl('lrDraftTitle').readOnly = linked;
  lrEl('lrGenerator').classList.toggle('hidden', linked);
  lrEl('lrLinkedActions').classList.toggle('hidden', !linked);
  lrEl('lrManageSession').classList.toggle('hidden', !linked);
  lrEl('lrUseSessionAudio').classList.toggle('hidden', !linked);
  lrEl('lrSessionSource').textContent = linked ? t('Recording session: {title}', { title: lrWorkspace.sessionTitle }) : '';
  lrEl('lrScriptState').textContent = script ? t('Script ready') : t('Start here');
  lrEl('lrRecordingState').textContent = linked ? t('Session selected') : lrWorkspace.file ? t('Audio selected') : t('Choose a method');
  lrEl('lrQuestionsState').textContent = t('Create or connect');
  lrEl('lrQuestionSource').textContent = linked
    ? t('Questions will use the latest words from the selected recording session, including edits.')
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
  try {
    const draft = JSON.parse(localStorage.getItem(lrDraftKey()) || 'null');
    if (draft?.fields) {
      LR_DRAFT_FIELDS.forEach(id => { if (typeof draft.fields[id] === 'string') lrEl(id).value = draft.fields[id]; });
      lrWorkspace.sessionId = /^[a-z0-9]{8,16}$/.test(draft.sessionId || '') ? draft.sessionId : '';
      lrWorkspace.sessionTitle = String(draft.sessionTitle || '');
      if (draft.started) lrSelectTab(draft.tab || 'script');
      lrSelectMethod(draft.method || 'people');
      lrEl('lrDraftStatus').textContent = t('Draft restored from this device');
    }
  } catch { /* An unavailable or invalid local draft must not block the tools. */ }
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
    lrSelectTab(start === 'upload' ? 'recording' : 'script');
    if (start === 'upload') { lrSelectMethod('upload'); lrEl('lrAudioFile').focus(); }
    else { lrEl('lrGenerator').open = start === 'generate'; lrEl(start === 'generate' ? 'lrTopic' : 'lrScript').focus(); }
  }));
  lrEl('lrChangeStart').addEventListener('click', () => lrEl('lrStartChoices').classList.toggle('hidden'));
  lrEl('lrDetachSession').addEventListener('click', () => { lrWorkspace.sessionId = ''; lrWorkspace.sessionTitle = ''; lrRefreshWorkspace(); lrSaveDraft(); });
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
  lrEl('lrStudioBtn').addEventListener('click', async () => {
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
