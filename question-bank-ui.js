// PinPlay Question Bank UI
// Loaded after app.js. Adds a "Search bank" button to the question-builder toolbar
// and opens a modal that talks to the local Python bridge (question-bank/bridge.py)
// to search a SQLite-backed ESL question bank and import rows into the current quiz.

(function () {
  'use strict';

  const STORAGE_KEY = 'pinplayBankBridge';
  const BRIDGE_DEFAULT_URL = 'http://127.0.0.1:8789';
  const SEARCH_DEBOUNCE_MS = 280;
  const PAGE_SIZE = 50;

  // ---------- bridge config ----------

  function loadBridgeConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { url: BRIDGE_DEFAULT_URL, secret: '' };
      const obj = JSON.parse(raw);
      return {
        url: (obj.url || BRIDGE_DEFAULT_URL).replace(/\/+$/, ''),
        secret: obj.secret || '',
      };
    } catch {
      return { url: BRIDGE_DEFAULT_URL, secret: '' };
    }
  }

  function saveBridgeConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      url: (cfg.url || BRIDGE_DEFAULT_URL).replace(/\/+$/, ''),
      secret: cfg.secret || '',
    }));
  }

  let bridgeCfg = loadBridgeConfig();

  // ---------- low-level API ----------

  async function pingBridge() {
    try {
      const r = await fetch(`${bridgeCfg.url}/ping`, { method: 'GET' });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function bankFetch(path, params, opts = {}) {
    const url = new URL(bridgeCfg.url + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') continue;
        url.searchParams.set(k, String(v));
      }
    }
    const init = {
      method: opts.method || 'GET',
      headers: { Authorization: `Bearer ${bridgeCfg.secret}` },
    };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    const r = await fetch(url.toString(), init);
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).detail || ''; } catch { /* ignore */ }
      throw new Error(`HTTP ${r.status} ${detail}`);
    }
    return r.json();
  }

  function bankPatch(path, body) {
    return bankFetch(path, null, { method: 'PATCH', body });
  }

  // ---------- bank row → PinPlay question mapping ----------

  function parseOptions(blob) {
    if (!blob) return [];
    if (Array.isArray(blob)) return blob.map(String);
    const s = String(blob).trim();
    if (!s) return [];
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const v = JSON.parse(s);
        if (Array.isArray(v)) return v.map(String);
      } catch { /* fall through */ }
    }
    return s.split('|').map((t) => t.trim()).filter(Boolean);
  }

  function parseCorrectAnswer(blob, options) {
    if (!blob) return [];
    const s = String(blob).trim();
    if (!s) return [];
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const v = JSON.parse(s);
        if (Array.isArray(v)) return v.map(String);
      } catch { /* fall through */ }
    }
    if (s.includes('|')) return s.split('|').map((t) => t.trim()).filter(Boolean);
    return [s];
  }

  const SAFE_PREVIEW_TAGS = new Set(['B', 'I', 'U', 'SUP', 'SUB', 'BR', 'EM', 'STRONG']);

  function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(`<div>${String(html)}</div>`, 'text/html');
    return (doc.body.firstChild?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeHtmlPreview(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(`<div>${String(html)}</div>`, 'text/html');
    const root = doc.body.firstChild;
    if (!root) return '';
    function clean(node) {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType !== 1) continue;
        if (!SAFE_PREVIEW_TAGS.has(child.tagName)) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
        } else {
          while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
          clean(child);
        }
      }
    }
    clean(root);
    return root.innerHTML;
  }

  const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i;

  function classifyMedia(url) {
    if (!url) return 'none';
    return AUDIO_EXT_RE.test(url) ? 'audio' : 'image';
  }

  function attachMedia(q, row) {
    const url = (row.media_url || '').trim();
    if (!url) return;
    if (classifyMedia(url) === 'audio') {
      q.audioMode = 'url';
      q.audioData = url;
      q.audioEnabled = true;
    } else {
      q.imageData = url;
    }
  }

  function bankToPinPlay(row) {
    const stem = stripHtml(row.question_text || '');
    const opts = parseOptions(row.options).map(stripHtml);
    const corrects = parseCorrectAnswer(row.correct_answer, opts).map(stripHtml);
    const type = String(row.question_type || '').toLowerCase();

    if (type === 'quiz' || type === 'multiple_choice') {
      const q = window.makeMcqQuestion ? window.makeMcqQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      const answers = opts.length ? opts.map((t) => ({ text: t, correct: false })) : [
        { text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false },
      ];
      let marked = false;
      for (const a of answers) {
        if (corrects.some((c) => c && a.text && c.trim().toLowerCase() === a.text.trim().toLowerCase())) {
          a.correct = true; marked = true;
        }
      }
      if (!marked && answers.length) answers[0].correct = true;
      q.answers = answers;
      attachMedia(q, row); return q;
    }

    if (type === 'multiple_select_quiz') {
      const q = window.makeMultiQuestion ? window.makeMultiQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      const answers = opts.length ? opts.map((t) => ({ text: t, correct: false })) : [];
      for (const a of answers) {
        if (corrects.some((c) => c && a.text && c.trim().toLowerCase() === a.text.trim().toLowerCase())) {
          a.correct = true;
        }
      }
      if (!answers.some((a) => a.correct) && answers.length) answers[0].correct = true;
      q.answers = answers;
      attachMedia(q, row); return q;
    }

    if (type === 'true_false' || type === 'tf') {
      const q = window.makeTfQuestion ? window.makeTfQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      const c0 = (corrects[0] || '').trim().toLowerCase();
      const trueWord = c0 === 'true' || c0 === 't' || c0 === '1' || c0 === 'yes';
      q.answers = [
        { text: 'True', correct: trueWord },
        { text: 'False', correct: !trueWord },
      ];
      attachMedia(q, row); return q;
    }

    if (type === 'fill_blank') {
      const q = window.makeContextGapQuestion ? window.makeContextGapQuestion() : null;
      if (!q) return null;
      q.prompt = stem || 'Complete the sentence:';
      q.gaps = corrects.length ? corrects : [''];
      attachMedia(q, row); return q;
    }

    if (type === 'open_ended' || type === 'open') {
      const q = window.makeTextQuestion ? window.makeTextQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      q.accepted = corrects.length ? corrects.slice(0, 8) : ['', '', ''];
      attachMedia(q, row); return q;
    }

    if (type === 'jumble' || type === 'puzzle') {
      const q = window.makePuzzleQuestion ? window.makePuzzleQuestion() : null;
      if (!q) return null;
      q.prompt = stem || 'Put the items in the correct order:';
      const items = corrects.length ? corrects : opts;
      q.items = items.length ? items : ['', '', ''];
      attachMedia(q, row); return q;
    }

    if (type === 'slider') {
      const q = window.makeSliderQuestion ? window.makeSliderQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      const num = parseFloat(corrects[0] || '');
      if (Number.isFinite(num)) q.target = num;
      attachMedia(q, row); return q;
    }

    if (type === 'survey') {
      const baseFactory = opts.length > 4 ? window.makeMultiQuestion : window.makeMcqQuestion;
      const q = baseFactory ? baseFactory() : null;
      if (!q) return null;
      q.prompt = stem;
      q.answers = opts.length
        ? opts.map((t) => ({ text: t, correct: true }))
        : [{ text: '', correct: true }, { text: '', correct: true }];
      q.isPoll = true;
      q.points = 0;
      attachMedia(q, row); return q;
    }

    if (type === 'pin_it' || type === 'drop_pin' || type === 'pin') {
      const q = window.makePinQuestion ? window.makePinQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      q.zones = [];
      attachMedia(q, row); return q;
    }

    if (type === 'multiple_select_poll') {
      const q = window.makeMultiQuestion ? window.makeMultiQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      q.answers = opts.length
        ? opts.map((t) => ({ text: t, correct: true }))
        : [{ text: '', correct: true }, { text: '', correct: true }];
      q.isPoll = true;
      q.points = 0;
      attachMedia(q, row); return q;
    }

    if (type === 'feedback') {
      const q = window.makeTextQuestion ? window.makeTextQuestion() : null;
      if (!q) return null;
      q.prompt = stem || 'How did this lesson go?';
      q.accepted = [];
      q.isPoll = true;
      q.points = 0;
      attachMedia(q, row); return q;
    }

    if (type === 'word_cloud') {
      const q = window.makeTextQuestion ? window.makeTextQuestion() : null;
      if (!q) return null;
      q.prompt = stem;
      q.accepted = [];
      q.isPoll = true;
      q.points = 0;
      attachMedia(q, row); return q;
    }

    return null;
  }

  // ---------- DOM helpers ----------

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  // ---------- modal state ----------

  const SEARCH_FIELDS = [
    { value: '',               label: 'Anywhere' },
    { value: 'question_text',  label: 'Question text' },
    { value: 'correct_answer', label: 'Answer' },
    { value: 'options',        label: 'Options' },
    { value: 'explanation',    label: 'Explanation' },
  ];

  const MEDIA_OPTIONS = [
    { value: '',      label: 'Any (no filter)' },
    { value: 'image', label: 'Has image' },
    { value: 'audio', label: 'Has audio' },
    { value: 'any',   label: 'Has any media' },
    { value: 'none',  label: 'No media' },
  ];

  const state = {
    facets: null,
    filters: { source: '', level: '', skill_type: '', topic: '', question_type: '' },
    hasMedia: '',
    query: '',
    searchField: '',
    minQuality: -1,
    limit: PAGE_SIZE,
    offset: 0,
    results: [],
    total: 0,
    selected: new Map(),    // id → row
    focused: null,          // currently previewed row
    editing: false,         // true when editing the focused question
    editDraft: null,        // {question_text, options_lines, correct_answer, explanation, media_url}
    loading: false,
    error: '',
  };

  let modalEl = null;
  let searchDebounce = 0;
  let searchSeq = 0;

  // ---------- modal builders ----------

  function openModal() {
    if (!modalEl) modalEl = buildModal();
    document.body.appendChild(modalEl);
    requestAnimationFrame(() => modalEl.classList.add('visible'));
    document.addEventListener('keydown', onEscKey);
    if (!bridgeCfg.secret) {
      renderConnectView();
    } else {
      enterSearchMode();
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('visible');
    document.removeEventListener('keydown', onEscKey);
    setTimeout(() => {
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    }, 250);
  }

  function onEscKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function buildModal() {
    const overlay = el('div', { id: 'bankModal', class: 'bank-modal' });
    // Only close on backdrop click if BOTH mousedown and mouseup happened on the
    // backdrop. A drag-select that starts inside the modal and ends over the
    // backdrop would otherwise fire a `click` with target === overlay.
    let pressedOnBackdrop = false;
    overlay.addEventListener('mousedown', (e) => {
      pressedOnBackdrop = (e.target === overlay);
    });
    overlay.addEventListener('mouseup', (e) => {
      if (pressedOnBackdrop && e.target === overlay) closeModal();
      pressedOnBackdrop = false;
    });
    const content = el('div', { class: 'bank-modal-content' });
    overlay.appendChild(content);
    return overlay;
  }

  function modalBody() {
    return modalEl.querySelector('.bank-modal-content');
  }

  // ---------- connect view ----------

  function renderConnectView() {
    const body = modalBody();
    body.innerHTML = '';
    body.appendChild(el('div', { class: 'bank-header' },
      el('h2', { class: 'bank-title' }, '🔌 Connect to question bank'),
      el('button', { class: 'btn bank-close', onClick: closeModal, title: 'Close' }, '×'),
    ));

    const intro = el('p', { class: 'small muted' });
    intro.innerHTML = `Start the bridge by running <code>question-bank\\run.cmd</code>. The first start prints a secret into <code>question-bank\\.bridge.secret</code> — paste it below.`;
    body.appendChild(intro);

    const form = el('div', { class: 'bank-connect-form' });
    const urlInput = el('input', { type: 'text', value: bridgeCfg.url, placeholder: BRIDGE_DEFAULT_URL });
    const secretInput = el('input', { type: 'password', value: bridgeCfg.secret, placeholder: 'paste secret here' });
    const status = el('p', { class: 'small muted bank-connect-status' }, '');

    form.appendChild(el('label', {}, 'Bridge URL', urlInput));
    form.appendChild(el('label', {}, 'Bridge secret', secretInput));

    const connectBtn = el('button', { class: 'btn primary', onClick: async () => {
      status.textContent = 'Testing connection…';
      status.className = 'small muted bank-connect-status';
      const next = { url: urlInput.value.trim() || BRIDGE_DEFAULT_URL, secret: secretInput.value.trim() };
      const previous = bridgeCfg;
      bridgeCfg = next;
      try {
        const ping = await pingBridge();
        if (!ping || !ping.ok) {
          throw new Error('Bridge did not respond at that URL. Is run.cmd running?');
        }
        await bankFetch('/facets');
        saveBridgeConfig(bridgeCfg);
        bridgeAvailable = true;
        status.textContent = `Connected. ${ping.questions} questions in bank.`;
        status.className = 'small bank-connect-status bank-ok';
        if (!backfilledThisSession) {
          backfillFromPinPlay({ status: (m) => console.info('[bank][sync]', m) });
        }
        setTimeout(enterSearchMode, 400);
      } catch (err) {
        bridgeCfg = previous;
        status.textContent = err.message === 'UNAUTHORIZED'
          ? 'Secret rejected. Check question-bank\\.bridge.secret on the server machine.'
          : `Connection failed: ${err.message}`;
        status.className = 'small bank-connect-status bank-bad';
      }
    } }, 'Connect');

    form.appendChild(el('div', { class: 'row gap' }, connectBtn));
    body.appendChild(form);
    body.appendChild(status);
  }

  // ---------- search view ----------

  async function enterSearchMode() {
    const body = modalBody();
    body.innerHTML = '';
    body.classList.add('bank-search-mode');

    body.appendChild(buildHeader());
    const main = el('div', { class: 'bank-main' });
    body.appendChild(main);
    main.appendChild(buildFiltersRail());
    const center = el('div', { class: 'bank-center' });
    main.appendChild(center);
    center.appendChild(buildSearchBar());
    center.appendChild(buildResultsList());
    main.appendChild(buildPreviewPane());
    body.appendChild(buildFooter());

    try {
      state.facets = await bankFetch('/facets');
      renderFacetDropdowns();
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        bridgeCfg.secret = '';
        renderConnectView();
        return;
      }
      showError(err.message);
    }
    runSearch();
  }

  function buildHeader() {
    const syncBtn = el('button', {
      class: 'btn bank-sync',
      title: 'Pull every PinPlay assignment + cloud-saved quiz into the bank (re-ingests known ones too)',
      onClick: async () => {
        syncBtn.disabled = true;
        const origText = syncBtn.textContent;
        syncBtn.textContent = '⏳';
        const result = await backfillFromPinPlay({ force: true, status: (m) => flashOk(m) });
        syncBtn.disabled = false;
        syncBtn.textContent = origText;
        if (!result && !_getPassword()) {
          flashOk('Unlock teacher access first, then try Sync again.');
        }
      },
    }, '🔄 Sync');
    return el('div', { class: 'bank-header' },
      el('h2', { class: 'bank-title' }, '🔍 Question bank'),
      syncBtn,
      el('button', {
        class: 'btn bank-reconnect',
        title: 'Change bridge URL or secret',
        onClick: () => renderConnectView(),
      }, '⚙'),
      el('button', { class: 'btn bank-close', onClick: closeModal, title: 'Close' }, '×'),
    );
  }

  function buildFiltersRail() {
    const rail = el('div', { class: 'bank-filters' });
    rail.id = 'bankFilters';
    rail.appendChild(el('h3', { class: 'bank-filters-title' }, 'Filters'));
    return rail;
  }

  function renderFacetDropdowns() {
    const rail = modalEl.querySelector('#bankFilters');
    if (!rail || !state.facets) return;
    Array.from(rail.querySelectorAll('label, button')).forEach((n) => n.remove());

    const fields = [
      { key: 'source',        label: 'Source' },
      { key: 'level',         label: 'Level' },
      { key: 'skill_type',    label: 'Skill type' },
      { key: 'topic',         label: 'Topic' },
      { key: 'question_type', label: 'Question type' },
    ];

    for (const f of fields) {
      const values = state.facets[f.key] || [];
      const sel = el('select', {
        onChange: (e) => {
          state.filters[f.key] = e.target.value;
          state.offset = 0;
          runSearch();
        },
      });
      sel.appendChild(el('option', { value: '' }, `All ${f.label.toLowerCase()}s`));
      for (const v of values) sel.appendChild(el('option', { value: v }, v));
      sel.value = state.filters[f.key] || '';
      rail.appendChild(el('label', {}, f.label, sel));
    }

    const mediaSel = el('select', {
      id: 'bankMediaFilter',
      onChange: (e) => {
        state.hasMedia = e.target.value;
        state.offset = 0;
        runSearch();
      },
    });
    for (const o of MEDIA_OPTIONS) mediaSel.appendChild(el('option', { value: o.value }, o.label));
    mediaSel.value = state.hasMedia || '';
    rail.appendChild(el('label', {}, 'Media', mediaSel));

    const clear = el('button', {
      class: 'btn bank-clear',
      onClick: () => {
        for (const k of Object.keys(state.filters)) state.filters[k] = '';
        state.hasMedia = '';
        state.query = '';
        state.searchField = '';
        state.offset = 0;
        const q = modalEl.querySelector('#bankSearchInput');
        if (q) q.value = '';
        const fs = modalEl.querySelector('#bankSearchField');
        if (fs) fs.value = '';
        Array.from(rail.querySelectorAll('select')).forEach((s) => { s.value = ''; });
        runSearch();
      },
    }, 'Clear filters');
    rail.appendChild(clear);
  }

  function buildSearchBar() {
    const wrap = el('div', { class: 'bank-search-bar' });

    const fieldSel = el('select', {
      id: 'bankSearchField',
      title: 'Restrict the text search to a specific column',
      onChange: (e) => {
        state.searchField = e.target.value;
        state.offset = 0;
        if (state.query) runSearch();
      },
    });
    for (const f of SEARCH_FIELDS) {
      fieldSel.appendChild(el('option', { value: f.value }, f.label));
    }
    fieldSel.value = state.searchField;
    wrap.appendChild(el('label', { class: 'bank-search-field-label' }, 'Search in', fieldSel));

    const input = el('input', {
      id: 'bankSearchInput',
      type: 'text',
      placeholder: 'Search question text, answers, options…',
      value: state.query,
    });
    input.addEventListener('input', (e) => {
      state.query = e.target.value;
      state.offset = 0;
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
    });
    wrap.appendChild(input);
    wrap.appendChild(el('div', { id: 'bankCount', class: 'small muted' }, ''));
    return wrap;
  }

  function buildResultsList() {
    const wrap = el('div', { class: 'bank-results' });
    wrap.id = 'bankResults';
    wrap.appendChild(el('div', { class: 'bank-results-empty' }, 'Type a search or pick a filter to begin.'));
    return wrap;
  }

  function buildPreviewPane() {
    const pane = el('div', { class: 'bank-preview' });
    pane.id = 'bankPreview';
    pane.appendChild(el('p', { class: 'small muted' }, 'Click a row to preview. ⌘/Ctrl-click to select multiple.'));
    return pane;
  }

  function buildFooter() {
    const footer = el('div', { class: 'bank-footer' });
    footer.id = 'bankFooter';
    renderFooter(footer);
    return footer;
  }

  function renderFooter(footerEl) {
    const footer = footerEl || modalEl.querySelector('#bankFooter');
    if (!footer) return;
    footer.innerHTML = '';
    const n = state.selected.size;
    footer.appendChild(el('span', { class: 'bank-selected-count' }, `Selected: ${n}`));
    footer.appendChild(el('button', {
      class: 'btn primary',
      disabled: n === 0,
      onClick: importSelected,
    }, n === 0 ? 'Add selected to current quiz' : `Add ${n} to current quiz`));
    footer.appendChild(el('button', { class: 'btn', onClick: closeModal }, 'Close'));
  }

  function showError(msg) {
    state.error = msg;
    const r = modalEl.querySelector('#bankResults');
    if (r) {
      r.innerHTML = '';
      r.appendChild(el('div', { class: 'bank-error' }, `Error: ${msg}`));
    }
  }

  async function runSearch() {
    const mySeq = ++searchSeq;
    state.loading = true;
    const params = {
      q: state.query || undefined,
      field: state.searchField || undefined,
      source: state.filters.source || undefined,
      level: state.filters.level || undefined,
      skill_type: state.filters.skill_type || undefined,
      topic: state.filters.topic || undefined,
      question_type: state.filters.question_type || undefined,
      has_media: state.hasMedia || undefined,
      min_quality: state.minQuality,
      limit: state.limit,
      offset: state.offset,
    };
    const wrap = modalEl.querySelector('#bankResults');
    if (wrap && !state.offset) {
      wrap.innerHTML = '';
      wrap.appendChild(el('div', { class: 'bank-loading small muted' }, 'Searching…'));
    }
    try {
      const data = await bankFetch('/search', params);
      if (mySeq !== searchSeq) return;  // a newer search superseded this one
      if (state.offset === 0) {
        state.results = data.results || [];
      } else {
        state.results = state.results.concat(data.results || []);
      }
      state.total = data.total || 0;
      renderResults();
    } catch (err) {
      if (mySeq !== searchSeq) return;
      if (err.message === 'UNAUTHORIZED') {
        bridgeCfg.secret = '';
        renderConnectView();
        return;
      }
      showError(err.message);
    } finally {
      if (mySeq === searchSeq) state.loading = false;
    }
  }

  function renderResults() {
    const wrap = modalEl.querySelector('#bankResults');
    const count = modalEl.querySelector('#bankCount');
    if (count) count.textContent = state.total ? `${state.total.toLocaleString()} results` : '';
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!state.results.length) {
      wrap.appendChild(el('div', { class: 'bank-results-empty' }, 'No matches. Try a broader search or clear filters.'));
      return;
    }
    for (const row of state.results) {
      const isSel = state.selected.has(row.id);
      const isFocused = state.focused && state.focused.id === row.id;
      const li = el('div', {
        class: 'bank-row' + (isSel ? ' selected' : '') + (isFocused ? ' focused' : ''),
        onClick: (e) => {
          if (e.target.tagName === 'INPUT') return;
          if (state.focused?.id !== row.id) {
            state.editing = false;
            state.editDraft = null;
          }
          state.focused = row;
          renderResults();
          renderPreview();
        },
      });
      const cb = el('input', {
        type: 'checkbox',
        checked: isSel,
        onChange: (e) => {
          if (e.target.checked) state.selected.set(row.id, row);
          else state.selected.delete(row.id);
          renderFooter();
          li.classList.toggle('selected', e.target.checked);
        },
      });
      const meta = el('div', { class: 'bank-row-meta' });
      meta.appendChild(el('span', { class: 'bank-badge bank-badge-' + (row.question_type || 'unk') }, row.question_type || '?'));
      if (row.level) meta.appendChild(el('span', { class: 'bank-badge bank-badge-level' }, row.level));
      if (row.source) meta.appendChild(el('span', { class: 'bank-badge bank-badge-source' }, row.source));
      if (row.media_url) {
        const kind = classifyMedia(row.media_url);
        meta.appendChild(el('span', { class: 'bank-badge bank-badge-media', title: row.media_url }, kind === 'audio' ? '🔊' : '🖼'));
      }
      const stem = el('div', { class: 'bank-row-stem' }, truncate(stripHtml(row.question_text) || '(no stem)', 180));
      li.appendChild(cb);
      const right = el('div', { class: 'bank-row-body' });
      right.appendChild(meta);
      right.appendChild(stem);
      li.appendChild(right);
      wrap.appendChild(li);
    }
    if (state.results.length < state.total) {
      wrap.appendChild(el('button', {
        class: 'btn bank-load-more',
        onClick: () => { state.offset = state.results.length; runSearch(); },
      }, `Load ${Math.min(PAGE_SIZE, state.total - state.results.length)} more`));
    }
  }

  function renderPreview() {
    const pane = modalEl.querySelector('#bankPreview');
    if (!pane) return;
    pane.innerHTML = '';
    if (!state.focused) {
      pane.appendChild(el('p', { class: 'small muted' }, 'Click a row to preview.'));
      return;
    }
    if (state.editing) {
      renderEditForm(pane);
      return;
    }
    const row = state.focused;
    const opts = parseOptions(row.options);
    const corrects = parseCorrectAnswer(row.correct_answer, opts);

    pane.appendChild(el('div', { class: 'bank-preview-meta' },
      el('strong', {}, row.quiz_title || '(untitled)'),
      el('span', { class: 'small muted' }, ` · ${row.source || '?'} · ${row.level || '–'} · ${row.skill_type || '–'} · ${row.topic || '–'}`),
    ));

    if (row.media_url) {
      const kind = classifyMedia(row.media_url);
      if (kind === 'image') {
        const img = el('img', {
          class: 'bank-preview-media',
          src: row.media_url,
          alt: 'Question media',
          loading: 'lazy',
        });
        img.addEventListener('error', () => { img.style.display = 'none'; });
        pane.appendChild(img);
      } else if (kind === 'audio') {
        const audio = el('audio', { class: 'bank-preview-media', controls: 'true', src: row.media_url });
        pane.appendChild(audio);
      }
    }

    const stemEl = el('div', { class: 'bank-preview-stem' });
    stemEl.innerHTML = sanitizeHtmlPreview(row.question_text) || '(no stem)';
    pane.appendChild(stemEl);

    if (opts.length) {
      const ol = el('ol', { class: 'bank-preview-opts' });
      for (const o of opts) {
        const isCorrect = corrects.some((c) => {
          const cs = stripHtml(c).toLowerCase();
          const os = stripHtml(o).toLowerCase();
          return cs && os && cs === os;
        });
        const li = el('li', { class: isCorrect ? 'is-correct' : '' });
        li.innerHTML = sanitizeHtmlPreview(o) + (isCorrect ? '  ✓' : '');
        ol.appendChild(li);
      }
      pane.appendChild(ol);
    } else if (corrects.length) {
      const ansEl = el('div', { class: 'bank-preview-answer' });
      ansEl.innerHTML = 'Answer: ' + corrects.map((c) => sanitizeHtmlPreview(c)).join(' · ');
      pane.appendChild(ansEl);
    }

    if (row.explanation) pane.appendChild(el('div', { class: 'bank-preview-explain small muted' }, stripHtml(row.explanation)));

    const rtype = String(row.question_type || '').toLowerCase();
    if (rtype === 'slider' && !corrects.length) {
      pane.appendChild(el('div', { class: 'bank-preview-warning small' },
        '⚠ Slider has no stored target value (scraper limitation). Import will use defaults (min 0, max 100, target 50) — set the actual range/target in the builder after importing.'));
    }
    if ((rtype === 'pin_it' || rtype === 'drop_pin') && !row.media_url) {
      pane.appendChild(el('div', { class: 'bank-preview-warning small' },
        '⚠ Pin question has no image stored. Import will create an empty pin question — add an image and hot-spots in the builder after importing.'));
    } else if (rtype === 'pin_it' || rtype === 'drop_pin') {
      pane.appendChild(el('div', { class: 'bank-preview-warning small' },
        '⚠ Pin question has no stored hot-spot zones (scraper limitation). Image will import; you need to set the click zones in the builder after importing.'));
    }

    const mappingType = mappedTypeLabel(row.question_type);
    pane.appendChild(el('div', { class: 'bank-preview-mapping small muted' }, `Imports as PinPlay type: ${mappingType}`));

    const actions = el('div', { class: 'bank-preview-actions row gap' });
    actions.appendChild(el('button', {
      class: 'btn primary',
      onClick: () => importQuestion(row),
    }, '+ Add this question'));
    actions.appendChild(el('button', {
      class: 'btn',
      onClick: () => importWholeQuiz(row.quiz_id, row.quiz_title),
    }, '+ Add all from this source quiz'));
    pane.appendChild(actions);

    const editRow = el('div', { class: 'bank-preview-edit-row row gap' });
    editRow.appendChild(el('button', {
      class: 'btn',
      title: 'Edit this question in the bank',
      onClick: () => beginEdit(row),
    }, '✎ Edit'));
    const qStar = Number(row.quality || 0);
    editRow.appendChild(el('button', {
      class: 'btn' + (qStar > 0 ? ' bank-quality-on' : ''),
      title: qStar > 0 ? 'Starred — click to unstar' : 'Star this question (push it to the top of search)',
      onClick: () => setQuality(row, qStar > 0 ? 0 : 1),
    }, qStar > 0 ? '★ Starred' : '☆ Star'));
    editRow.appendChild(el('button', {
      class: 'btn' + (qStar < 0 ? ' bank-quality-off' : ''),
      title: qStar < 0 ? 'Hidden — click to unhide' : 'Hide this question from default search results',
      onClick: () => setQuality(row, qStar < 0 ? 0 : -1),
    }, qStar < 0 ? '🚫 Hidden' : 'Hide'));
    editRow.appendChild(el('button', {
      class: 'btn bank-danger',
      title: 'Soft-delete (recoverable). Removes from search; FTS index updates automatically.',
      onClick: () => softDelete(row),
    }, '🗑 Delete'));
    pane.appendChild(editRow);
  }

  function beginEdit(row) {
    state.editing = true;
    state.editDraft = {
      question_text: row.question_text || '',
      options_lines: parseOptions(row.options).join('\n'),
      correct_answer: row.correct_answer || '',
      explanation: row.explanation || '',
      media_url: row.media_url || '',
    };
    renderPreview();
  }

  function renderEditForm(pane) {
    const row = state.focused;
    const d = state.editDraft;

    pane.appendChild(el('div', { class: 'bank-preview-meta' },
      el('strong', {}, row.quiz_title || '(untitled)'),
      el('span', { class: 'small muted' }, ` · editing question #${row.id}`),
    ));

    const stemTA = el('textarea', { rows: 4, class: 'bank-edit-input' });
    stemTA.value = d.question_text;
    stemTA.addEventListener('input', () => { d.question_text = stemTA.value; });
    pane.appendChild(el('label', { class: 'bank-edit-label' }, 'Question text', stemTA));

    const optsTA = el('textarea', { rows: 4, class: 'bank-edit-input', placeholder: 'One option per line' });
    optsTA.value = d.options_lines;
    optsTA.addEventListener('input', () => { d.options_lines = optsTA.value; });
    pane.appendChild(el('label', { class: 'bank-edit-label' }, 'Options (one per line)', optsTA));

    const ansTA = el('textarea', { rows: 2, class: 'bank-edit-input', placeholder: 'For multiple correct answers: one per line' });
    ansTA.value = d.correct_answer;
    ansTA.addEventListener('input', () => { d.correct_answer = ansTA.value; });
    pane.appendChild(el('label', { class: 'bank-edit-label' }, 'Correct answer', ansTA));

    const explTA = el('textarea', { rows: 2, class: 'bank-edit-input' });
    explTA.value = d.explanation;
    explTA.addEventListener('input', () => { d.explanation = explTA.value; });
    pane.appendChild(el('label', { class: 'bank-edit-label' }, 'Explanation (optional)', explTA));

    const mediaInput = el('input', { type: 'text', class: 'bank-edit-input', placeholder: 'https://… or empty to clear' });
    mediaInput.value = d.media_url;
    mediaInput.addEventListener('input', () => { d.media_url = mediaInput.value; });
    pane.appendChild(el('label', { class: 'bank-edit-label' }, 'Media URL', mediaInput));

    const actions = el('div', { class: 'bank-preview-actions row gap' });
    actions.appendChild(el('button', { class: 'btn primary', onClick: () => saveEdit(row) }, '💾 Save'));
    actions.appendChild(el('button', { class: 'btn', onClick: () => { state.editing = false; state.editDraft = null; renderPreview(); } }, 'Cancel'));
    pane.appendChild(actions);
  }

  function _optionsLinesToBlob(lines) {
    const arr = String(lines || '').split('\n').map((t) => t.trim()).filter(Boolean);
    return arr.length ? JSON.stringify(arr) : '';
  }

  async function saveEdit(row) {
    const d = state.editDraft;
    const patch = {
      question_text: d.question_text.trim(),
      options: _optionsLinesToBlob(d.options_lines),
      correct_answer: d.correct_answer.trim(),
      explanation: d.explanation.trim(),
      media_url: d.media_url.trim(),
    };
    try {
      const resp = await bankPatch(`/question/${row.id}`, patch);
      _mergeUpdatedQuestion(resp.question);
      state.editing = false;
      state.editDraft = null;
      renderResults();
      renderPreview();
      flashOk('Saved.');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  }

  function _mergeUpdatedQuestion(updated) {
    if (!updated) return;
    const idx = state.results.findIndex((r) => r.id === updated.id);
    if (idx >= 0) {
      state.results[idx] = { ...state.results[idx], ...updated };
      if (state.focused && state.focused.id === updated.id) state.focused = state.results[idx];
    } else if (state.focused && state.focused.id === updated.id) {
      state.focused = { ...state.focused, ...updated };
    }
  }

  async function setQuality(row, quality) {
    try {
      const resp = await bankPatch(`/question/${row.id}`, { quality });
      _mergeUpdatedQuestion(resp.question);
      renderResults();
      renderPreview();
      flashOk(quality > 0 ? 'Starred.' : quality < 0 ? 'Hidden from default search.' : 'Quality reset.');
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  }

  async function softDelete(row) {
    if (!confirm(`Soft-delete question #${row.id}?\n\nIt'll be hidden from search but the row is kept (recoverable later).`)) return;
    try {
      await bankPatch(`/question/${row.id}`, { deleted: true });
      state.results = state.results.filter((r) => r.id !== row.id);
      state.total = Math.max(0, state.total - 1);
      state.focused = null;
      state.editing = false;
      state.editDraft = null;
      renderResults();
      renderPreview();
      flashOk('Question soft-deleted.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function mappedTypeLabel(bankType) {
    const map = {
      quiz: 'mcq', multiple_choice: 'mcq',
      multiple_select_quiz: 'multi',
      true_false: 'tf',
      fill_blank: 'context_gap',
      open_ended: 'text',
      jumble: 'puzzle',
      slider: 'slider',
      survey: 'mcq (poll)',
      word_cloud: 'text (poll)',
      pin_it: 'pin (image needed; zones manual)',
      drop_pin: 'pin (image needed; zones manual)',
      multiple_select_poll: 'multi (poll)',
      feedback: 'text (poll)',
    };
    return map[String(bankType || '').toLowerCase()] || '(no mapping — will be skipped)';
  }

  // ---------- import actions ----------

  function importQuestion(row) {
    const mapped = bankToPinPlay(row);
    if (!mapped) {
      alert(`Could not map bank type "${row.question_type}" to a PinPlay type. Skipped.`);
      return;
    }
    if (typeof window.addQuestionToBuilder !== 'function') {
      alert('PinPlay builder not ready (window.addQuestionToBuilder missing).');
      return;
    }
    window.addQuestionToBuilder(mapped);
    flashOk(`Added 1 question.`);
  }

  async function importWholeQuiz(quizId, quizTitle) {
    try {
      const data = await bankFetch(`/quiz/${quizId}`);
      const questions = data.questions || [];
      let added = 0, skipped = 0;
      for (const q of questions) {
        const mapped = bankToPinPlay(q);
        if (mapped) { window.addQuestionToBuilder(mapped); added++; }
        else skipped++;
      }
      flashOk(`Added ${added} questions from "${quizTitle || quizId}"${skipped ? ` (${skipped} skipped: unmappable types)` : ''}.`);
    } catch (err) {
      alert('Quiz import failed: ' + err.message);
    }
  }

  function importSelected() {
    if (!state.selected.size) return;
    let added = 0, skipped = 0;
    for (const row of state.selected.values()) {
      const mapped = bankToPinPlay(row);
      if (mapped) { window.addQuestionToBuilder(mapped); added++; }
      else skipped++;
    }
    state.selected.clear();
    renderFooter();
    renderResults();
    flashOk(`Added ${added} questions${skipped ? ` (${skipped} skipped)` : ''}.`);
  }

  function flashOk(msg) {
    const body = modalBody();
    const flash = el('div', { class: 'bank-flash' }, msg);
    body.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('visible'));
    setTimeout(() => {
      flash.classList.remove('visible');
      setTimeout(() => flash.remove(), 300);
    }, 1800);
  }

  // ---------- bootstrap ----------

  // ---------- PinPlay → bank reverse mapping (P3 ingest) ----------

  function pinPlayToBank(q) {
    if (!q || typeof q !== 'object') return null;
    const t = String(q.type || '').toLowerCase();
    const stem = String(q.prompt || '').trim();
    if (!stem) return null;

    const media = String(q.imageData || q.audioData || '').trim();
    const base = {
      pinplay_question_id: String(q.id || ''),
      question_text: stem,
      question_type: t,
      options: null,
      correct_answer: null,
      explanation: '',
      media_url: media,
      pinplay_data: null,
    };

    if (t === 'mcq' || t === 'multi' || t === 'tf' || t === 'audio') {
      const answers = Array.isArray(q.answers) ? q.answers : [];
      base.options = answers.map((a) => String(a?.text || ''));
      const correct = answers.filter((a) => a?.correct).map((a) => String(a?.text || ''));
      base.correct_answer = correct.length === 1 ? correct[0] : correct;
    } else if (t === 'text' || t === 'voice_text') {
      const accepted = Array.isArray(q.accepted) ? q.accepted.filter(Boolean) : [];
      base.correct_answer = accepted.length === 1 ? accepted[0] : accepted;
    } else if (t === 'context_gap') {
      base.correct_answer = Array.isArray(q.gaps) ? q.gaps.filter(Boolean) : [];
    } else if (t === 'puzzle') {
      base.options = Array.isArray(q.items) ? q.items : [];
      base.correct_answer = base.options;
    } else if (t === 'slider') {
      base.correct_answer = q.target != null ? String(q.target) : '';
      base.pinplay_data = { min: q.min, max: q.max, target: q.target, margin: q.margin, unit: q.unit };
    } else if (t === 'pin') {
      base.pinplay_data = { zones: q.zones || [], pinMode: q.pinMode };
    } else if (t === 'match_pairs') {
      base.pinplay_data = { pairs: q.pairs || [] };
    } else if (t === 'error_hunt') {
      base.pinplay_data = { corrected: q.corrected, correctedVariants: q.correctedVariants };
    }
    // For 'open', 'speaking', 'voice_record', 'image_open': stem + media is all we need.

    if (q.isPoll) base.pinplay_data = Object.assign({}, base.pinplay_data, { isPoll: true });
    return base;
  }

  // ---------- backfill: pull assignments + cloud quizzes from PinPlay → bank ----------

  let backfilledThisSession = false;
  let backfillInFlight = false;

  function _getPassword() {
    return (window.pinplayInternals && window.pinplayInternals.getCreateSessionPassword && window.pinplayInternals.getCreateSessionPassword()) || '';
  }

  function _getBackendUrl() {
    if (typeof window.loadBackendUrl === 'function') {
      return window.loadBackendUrl() || 'https://api.pinplay.win';
    }
    return 'https://api.pinplay.win';
  }

  async function _ingestPinPlayQuiz(sourceId, quizObj) {
    if (!quizObj || !Array.isArray(quizObj.questions) || !quizObj.questions.length) return null;
    const payload = {
      assignment_code: String(sourceId),
      title: quizObj.title || '',
      level: quizObj.level || '',
      skill_type: quizObj.skillType || '',
      topic: quizObj.topic || '',
      questions: quizObj.questions.map(pinPlayToBank).filter(Boolean),
    };
    if (!payload.questions.length) return null;
    return bankFetch('/ingest', null, { method: 'POST', body: payload });
  }

  async function backfillFromPinPlay({ force = false, status = null } = {}) {
    if (backfillInFlight) return;
    const password = _getPassword();
    if (!password) {
      if (status) status('Bank sync skipped — teacher password not entered yet.', 'muted');
      return;
    }
    // bridgeAvailable can be a stale `false` from page-load if the user started
    // the bridge after the create page loaded. Re-ping to confirm before bailing.
    if (!bridgeAvailable) {
      const ping = await pingBridge();
      if (!ping || !ping.ok) {
        if (status) status('Bank sync skipped — bridge not reachable.', 'bad');
        return;
      }
      bridgeAvailable = true;
    }
    backfillInFlight = true;

    let known = new Set();
    if (!force) {
      try {
        const r = await bankFetch('/known-codes', { source: 'pinplay' });
        known = new Set((r.codes || []).map(String));
      } catch (err) {
        if (status) status(`Couldn't read known codes: ${err.message}`, 'bad');
        backfillInFlight = false;
        return;
      }
    }

    const stats = { assignments: { tried: 0, ingested: 0, errors: 0 },
                    cloud:       { tried: 0, ingested: 0, errors: 0 } };
    if (status) status('Listing PinPlay assignments…', 'muted');

    // 1. Assignments
    try {
      const data = await window.api('/api/assignments/list', {
        method: 'POST',
        body: { password, limit: 500 },
      });
      const list = Array.isArray(data?.assignments) ? data.assignments : [];
      for (const a of list) {
        const code = String(a?.code || '').trim();
        if (!code || (a?.className === '__preview__')) continue;
        if (!force && known.has(code)) continue;
        stats.assignments.tried++;
        try {
          const qd = await window.api('/api/assignments/get-quiz', {
            method: 'POST',
            body: { password, code },
          });
          const result = await _ingestPinPlayQuiz(code, qd?.quiz);
          if (result) stats.assignments.ingested++;
        } catch {
          stats.assignments.errors++;
        }
      }
    } catch (err) {
      if (status) status(`Couldn't list assignments: ${err.message}`, 'bad');
    }

    if (status) status('Listing cloud-saved quizzes…', 'muted');

    // 2. Cloud-saved quizzes (R2)
    try {
      const data = await window.api('/api/quizzes', {
        method: 'GET',
        headers: { Authorization: `Bearer ${password}` },
      });
      const list = Array.isArray(data?.quizzes) ? data.quizzes : [];
      const base = _getBackendUrl();
      for (const cq of list) {
        const key = String(cq?.key || '').trim();
        if (!key) continue;
        const r2Id = key.replace(/^quizzes\//, '').replace(/\.json$/, '');
        if (!r2Id) continue;
        if (!force && known.has(r2Id)) continue;
        stats.cloud.tried++;
        try {
          const res = await fetch(`${base}/api/media/${key}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const loaded = await res.json();
          const result = await _ingestPinPlayQuiz(r2Id, loaded);
          if (result) stats.cloud.ingested++;
        } catch {
          stats.cloud.errors++;
        }
      }
    } catch (err) {
      if (status) status(`Couldn't list cloud quizzes: ${err.message}`, 'bad');
    }

    backfilledThisSession = true;
    backfillInFlight = false;

    const summary =
      `Synced: ${stats.assignments.ingested} assignment(s)` +
      ` + ${stats.cloud.ingested} cloud quiz(zes)` +
      ((stats.assignments.errors + stats.cloud.errors)
        ? ` · ${stats.assignments.errors + stats.cloud.errors} skipped (errors)` : '');
    if (status) status(summary, 'ok');
    console.info('[bank] backfill complete:', stats);
    return stats;
  }

  async function ingestQuiz(detail) {
    if (!detail || !detail.source_id || !detail.quiz) return;
    if (!bridgeCfg.secret) return;  // user hasn't connected to bank yet
    const quiz = detail.quiz;
    const questions = (quiz.questions || []).map(pinPlayToBank).filter(Boolean);
    if (!questions.length) return;

    const payload = {
      assignment_code: String(detail.source_id),
      title: quiz.title || '',
      level: quiz.level || '',
      skill_type: quiz.skillType || '',
      topic: quiz.topic || '',
      questions,
    };
    try {
      const resp = await bankFetch('/ingest', null, { method: 'POST', body: payload });
      // Silent unless the user has the modal open and wants to see it.
      console.info(`[bank] ingest ${detail.source_id}:`, resp);
    } catch (err) {
      console.warn('[bank] ingest failed:', err && err.message);
    }
  }

  async function showOrHideButton() {
    const btn = document.getElementById('bankSearchBtn');
    if (!btn) return;
    const ping = await pingBridge();
    if (ping && ping.ok) {
      btn.hidden = false;
      btn.title = `Search ${ping.questions.toLocaleString()} questions in the local bank`;
    } else {
      btn.hidden = true;
    }
  }

  let bridgeAvailable = false;

  async function refreshBridgeAvailability() {
    const wasAvailable = bridgeAvailable;
    const ping = await pingBridge();
    bridgeAvailable = !!(ping && ping.ok);
    if (bridgeAvailable && !wasAvailable && !backfilledThisSession) {
      // Fire-and-forget once-per-session backfill on first successful ping.
      backfillFromPinPlay({ status: (m, kind) => console.info('[bank][sync]', kind || '', m) });
    }
    return bridgeAvailable;
  }

  function bootstrap() {
    const btn = document.getElementById('bankSearchBtn');
    if (btn) btn.addEventListener('click', openModal);
    showOrHideButton();
    window.addEventListener('pinplay:quiz-persisted', (e) => {
      if (bridgeAvailable) ingestQuiz(e.detail);
    });
    refreshBridgeAvailability();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
