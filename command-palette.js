/*
 * Teacher command palette (Ctrl+K, or ? outside a text field).
 *
 * One search box over everything on the teacher page: actions (the page's own
 * buttons, a few game controls and the sections), quizzes (local and cloud),
 * assignments, classes, students and the questions of the open quiz. Each
 * action shows its keyboard shortcut, so using the palette teaches the keys;
 * with nothing typed it lists every action available right now.
 *
 * Loaded after app.js and uses its globals (quiz, live, api, studentsCache…).
 * Button-backed actions take their label from the button itself, so they read
 * exactly as on screen, in the teacher's language.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const RECENT_KEY = 'pinplay.palette.recent.v1';
  const MAX_ROWS = 60;

  // Collapsible sections: [toggle id, body id]. Revealing something inside a
  // collapsed body opens it first (outermost first).
  const SECTIONS = [
    ['builderSectionToggle', 'builderCardBody'],
    ['creationPromptToggle', 'creationPromptBody'],
    ['builderSettingsToggle', 'builderSettingsBody'],
    ['builderTypesToggle', 'builderTypesBody'],
    ['builderQuestionsToggle', 'builderQuestionsBody'],
    ['builderMaintenanceToggle', 'builderMaintenanceBody'],
    ['liveScreenSectionToggle', 'liveScreenCardBody'],
    ['gameControlsSectionToggle', 'gameControlsCardBody'],
    ['assignmentSectionToggle', 'assignmentSectionBody'],
    ['studentsSectionToggle', 'studentsSectionBody'],
    ['workspacesSectionToggle', 'workspacesCardBody'],
  ];
  const SECTION_BODIES = new Set(SECTIONS.map(([, body]) => body));

  // Shown on the page, not counting sections that are merely collapsed (the
  // palette opens those) — so owner-only, hidden and display:none stay out.
  function available(el) {
    if (!el || el.disabled || el.hidden) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (SECTION_BODIES.has(n.id)) continue;
      if (getComputedStyle(n).display === 'none') return false;
    }
    return true;
  }

  // Open every collapsed section around el. lazy: click the toggle, so panels
  // that load on open (assignments, students) do; otherwise just expand.
  function reveal(el, { lazy = true } = {}) {
    if (!el) return;
    SECTIONS
      .map(([toggleId, bodyId]) => [$(toggleId), $(bodyId)])
      .filter(([toggle, body]) => toggle && body && body.contains(el) && body.classList.contains('hidden'))
      .sort(([, a], [, b]) => (a.contains(b) ? -1 : b.contains(a) ? 1 : 0))
      .forEach(([toggle, body]) => {
        if (lazy) toggle.click();
        else setSectionCollapsed(toggle, body, false);
      });
  }

  function flash(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('cmdp-flash');
    void el.offsetWidth;
    el.classList.add('cmdp-flash');
    setTimeout(() => el.classList.remove('cmdp-flash'), 1600);
  }

  const cleanText = (el) => String(el?.textContent || '').replace(/[▸▾▼►▶︎]/g, '').replace(/\s+/g, ' ').trim();

  // ------------------------------------------------------------- actions --
  // kind 'button': runs the button (or, with go: true, takes you to it —
  // for buttons that act on a form you fill in first). kind 'section': opens
  // and scrolls to a section. Otherwise: label/run/avail given directly.
  const B = (id, area, kw, extra = {}) => ({ kind: 'button', id: `btn:${id}`, btn: id, area, kw, ...extra });
  const S = (toggle, area, kw, extra = {}) => ({ kind: 'section', id: `sec:${toggle}`, toggle, area, kw, ...extra });

  const QUIZ = () => t('Quiz');
  const LIVE = () => t('Live game');
  const ASSIGN = () => t('Assignments');
  const STUDENTS = () => t('Students');
  const WORKSPACE = () => t('Workspace');
  const PAGE = () => t('Page');

  const ACTIONS = [
    // Quiz editor
    B('saveBtn', QUIZ, 'save quiz local', { key: 'Ctrl+S' }),
    B('saveCloudBtn', QUIZ, 'save cloud upload'),
    B('openLocalBtn', QUIZ, 'open quiz local library load'),
    B('openCloudBtn', QUIZ, 'open quiz cloud library load'),
    B('importBtn', QUIZ, 'import quiz json file'),
    B('exportBtn', QUIZ, 'export quiz json download'),
    B('exportPdfBtn', QUIZ, 'export pdf print paper'),
    B('hostApplyBuilderBtn', QUIZ, 'apply live game editor push update'),
    B('applyAssignmentBtn', QUIZ, 'apply assignment editor push update'),
    S('creationPromptToggle', QUIZ, 'ai prompt create quiz generate chatgpt gemini', { focus: 'promptTheme' }),
    S('builderSettingsToggle', QUIZ, 'quiz settings title audio voice language'),
    S('builderTypesToggle', QUIZ, 'add question types new'),
    S('builderQuestionsToggle', QUIZ, 'questions list edit'),
    S('builderMaintenanceToggle', QUIZ, 'maintenance purge cleanup'),
    B('collapseAllBtn', QUIZ, 'collapse expand all questions'),
    B('addMediaBatchBtn', QUIZ, 'add media batch images audio files'),
    B('bankSearchBtn', QUIZ, 'search question bank import'),
    B('levelAiCopyBtn', QUIZ, 'levels cefr adaptive ai tagging prompt copy'),
    B('purgePreviewsBtn', QUIZ, 'purge preview backlog cleanup', { go: true }),
    B('purgeOrphanMediaBtn', QUIZ, 'purge orphan media cleanup r2', { go: true }),
    {
      id: 'fn:mediaCheck', area: QUIZ, kw: 'media check manual audio images', key: 'M',
      label: () => t('Check media'),
      avail: () => !live.host.isPrimaryAudioHost,
      run: () => runManualMediaCheck(),
    },

    // Live game
    B('createLiveBtn', LIVE, 'start new live game pin host'),
    B('createArenaBtn', LIVE, 'start new cup arena pinplay cup game'),
    B('randomNamesToggle', LIVE, 'login random names sign in mode'),
    B('hostStartBtn', LIVE, 'start game begin'),
    B('hostNextBtn', LIVE, 'next question forward', { key: '→', label: () => t('Next question') }),
    B('hostPrevBtn', LIVE, 'previous question back', { key: '←', label: () => t('Previous question') }),
    {
      id: 'fn:reveal', area: LIVE, kw: 'reveal answer close question', key: 'Space',
      label: () => t('Reveal answer'),
      avail: () => live.host.state?.phase === 'question' && !live.host.state?.questionClosed,
      run: () => hostRevealQuestion(),
    },
    {
      id: 'fn:ranking', area: LIVE, kw: 'ranking scoreboard leaderboard podium', key: 'R',
      label: () => t('Show ranking'),
      avail: () => !!live.host.state,
      run: () => startRankingAnimationMode(),
    },
    B('projectorFullscreenBtn', LIVE, 'projector fullscreen live screen', { key: 'F' }),
    {
      id: 'fn:playAudio', area: LIVE, kw: 'play question audio read aloud', key: 'P',
      label: () => t('Play question audio'),
      avail: () => { const q = live.host.state?.question; return !!q && hasQuestionAudio(q); },
      run: () => { playQuestionAudio(live.host.state.question).catch(() => { }); },
    },
    {
      id: 'fn:emojis', area: LIVE, kw: 'emojis reactions pause resume stop distraction', key: 'E',
      label: () => (live.host.state?.reactionsPaused ? t('Turn emojis back on') : t('Pause emojis')),
      avail: () => !!live.host.state && !!live.host.token,
      run: () => toggleReactionsPaused(),
    },
    {
      id: 'fn:mute', area: LIVE, kw: 'mute unmute music sound', key: 'M',
      label: () => t('Mute or unmute game music'),
      avail: () => !!live.host.isPrimaryAudioHost,
      run: () => toggleHostMusicMute(),
    },
    B('hostRefreshBtn', LIVE, 'refresh game'),
    B('studentPreviewBtn', LIVE, 'student preview test'),
    B('livePreviewBtn', LIVE, 'live preview test'),
    B('hostJoinBtn', LIVE, 'join as host pin'),
    B('hostAttemptsExportBtn', LIVE, 'export results csv attempts'),
    S('liveScreenSectionToggle', LIVE, 'live screen projector', { label: () => t('Live screen') }),
    S('gameControlsSectionToggle', LIVE, 'game controls live'),

    // Assignments
    S('assignmentSectionToggle', ASSIGN, 'assignments homework list results'),
    B('createAssignmentBtn', ASSIGN, 'create new assignment homework assign', { go: true }),
    B('assignmentInstantFeedbackBtn', ASSIGN, 'assignment feedback instant end'),
    B('assignmentExamModeBtn', ASSIGN, 'assignment exam mode fullscreen'),
    B('toggleArchivedAssignmentsBtn', ASSIGN, 'archived assignments show hide'),
    B('refreshAssignmentsBtn', ASSIGN, 'refresh assignments reload'),
    B('gradeByQuestionBtn', ASSIGN, 'grade by question marking'),
    B('gradeByStudentBtn', ASSIGN, 'grade by student marking'),
    B('aiGradePackAssignmentBtn', ASSIGN, 'grade with ai marking'),

    // Students
    S('studentsSectionToggle', STUDENTS, 'students roster classes'),
    B('studentAddBtn', STUDENTS, 'add new student', { go: true }),
    B('studentsImportBtn', STUDENTS, 'import students csv'),
    B('studentsExportBtn', STUDENTS, 'export students csv'),
    B('studentsSettingsBtn', STUDENTS, 'sign in rules accounts login'),

    // Workspaces and page
    S('workspacesSectionToggle', WORKSPACE, 'workspaces guest teachers'),
    B('createWorkspaceBtn', WORKSPACE, 'create new workspace guest invite', { go: true }),
    {
      id: 'fn:collapseSections', area: PAGE, kw: 'collapse expand all sections',
      label: () => t('Collapse or expand all sections'),
      avail: () => true,
      run: () => toggleTeacherSectionCollapseAll(),
    },
  ];

  // "Add question: MCQ" for every type button in the editor.
  function addQuestionActions() {
    return [...document.querySelectorAll('#questionTypeGrid button[id^="add"]')].map((btn) => ({
      kind: 'button', id: `btn:${btn.id}`, btn: btn.id, area: QUIZ,
      kw: `add new question ${btn.id.replace(/^add|Btn$/g, '')}`,
      // Icon and name sit in separate spans with no space between them.
      label: () => t('Add question: {type}', { type: [...btn.children].map(cleanText).filter(Boolean).join(' ') || cleanText(btn) }),
    }));
  }

  function actionItems() {
    return [...ACTIONS, ...addQuestionActions()].flatMap((a) => {
      if (a.kind === 'button') {
        const btn = $(a.btn);
        if (!available(btn)) return [];
        return [{
          ...a,
          label: a.label ? a.label() : cleanText(btn),
          tag: a.area(),
          run: () => {
            reveal(btn);
            if (a.go) { flash(btn); btn.focus({ preventScroll: true }); } else btn.click();
          },
        }];
      }
      if (a.kind === 'section') {
        const toggle = $(a.toggle);
        if (!available(toggle)) return [];
        return [{
          ...a,
          label: t('Go to: {section}', { section: a.label ? a.label() : cleanText(toggle) }),
          tag: a.area(),
          run: () => {
            const body = SECTIONS.find(([tg]) => tg === a.toggle)?.[1];
            reveal(toggle);
            if (body && $(body)?.classList.contains('hidden')) toggle.click();
            flash(toggle);
            if (a.focus) setTimeout(() => $(a.focus)?.focus({ preventScroll: true }), 50);
          },
        }];
      }
      if (!a.avail()) return [];
      return [{ ...a, label: a.label(), tag: a.area() }];
    });
  }

  // ---------------------------------------------------------------- data --
  let cloudQuizzes = [];
  const loading = new Set();

  function load(name, fn) {
    if (loading.has(name)) return;
    loading.add(name);
    fn().catch(() => { }).finally(() => { loading.delete(name); if (isOpen()) refresh(); });
  }

  // Fetch what the palette searches but the page may not have loaded yet.
  function loadData() {
    if (!createSessionPassword) return;
    load('cloud', async () => {
      const data = await api('/api/quizzes', { method: 'GET', headers: { Authorization: `Bearer ${createSessionPassword}` } });
      cloudQuizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
    });
    if (available($('assignmentSectionToggle')) && !assignmentsListCache.length) {
      load('assignments', async () => {
        const data = await api('/api/assignments/list', { method: 'POST', body: { password: createSessionPassword, limit: 50 } });
        const list = Array.isArray(data?.assignments) ? data.assignments : [];
        assignmentsListCache = list.filter((a) => a?.className !== '__preview__');
      });
    }
    if (available($('studentsSectionToggle')) && !studentsCache.length) {
      load('students', async () => {
        const data = await studentsApi('/api/students', { method: 'GET' });
        studentsCache = Array.isArray(data?.students) ? data.students : [];
      });
    }
  }

  function showBuilder() {
    reveal($('builderQuestionsBody'), { lazy: false });
    flash($('builderCard'));
  }

  function openAssignment(a) {
    const toggle = $('assignmentSectionToggle');
    const body = $('assignmentSectionBody');
    if (body.classList.contains('hidden')) setSectionCollapsed(toggle, body, false);
    if (a.archived) showArchivedAssignments = true;
    renderAssignmentsList();
    const li = [...document.querySelectorAll('#assignmentList .assignment-item')].find((x) => x.dataset.code === a.code);
    const header = li?.querySelector('.assignment-header');
    if (header && header.getAttribute('aria-expanded') !== 'true') header.click();
    flash(li || toggle);
  }

  function showStudents({ className = '', search = '' }) {
    const toggle = $('studentsSectionToggle');
    const body = $('studentsSectionBody');
    if (body.classList.contains('hidden')) setSectionCollapsed(toggle, body, false);
    if (studentsNoClassOnlyEl) studentsNoClassOnlyEl.checked = false;
    if (studentsFilterEl) studentsFilterEl.value = search;
    renderStudentsList();
    if (studentsClassFilterEl) studentsClassFilterEl.value = className;
    renderStudentsList();
    flash(search ? studentsListEl?.querySelector('li') || toggle : toggle);
  }

  function dataItems() {
    const items = [];
    loadQuizLibrary().slice().reverse().forEach((entry) => {
      const n = Array.isArray(entry.quiz?.questions) ? entry.quiz.questions.length : 0;
      items.push({
        id: `quiz:local:${entry.id}`, label: entry.name || t('Quiz'), sub: `${t('Local')} · ${n} Q`, tag: t('Quiz'),
        kw: 'open quiz local',
        run: () => { openLocalLibraryItem(entry); showBuilder(); },
      });
    });
    cloudQuizzes.forEach((q) => {
      const label = q.title || q.pin || q.key;
      items.push({
        id: `quiz:cloud:${q.key}`, label, sub: `${t('Cloud')} · ${q.questionCount || '?'} Q`, tag: t('Quiz'),
        kw: 'open quiz cloud',
        run: async () => {
          try { await openCloudQuizByKey(q.key, label); showBuilder(); } catch (err) {
            setStatus(hostStatusEl, t('Cloud load failed: {msg}', { msg: err.message }), 'bad');
          }
        },
      });
    });
    if (available($('assignmentSectionToggle'))) {
      assignmentsListCache.forEach((a) => {
        const code = String(a?.code || '').trim();
        if (!code) return;
        items.push({
          id: `assignment:${code}`, label: String(a?.title || t('Assignment')),
          sub: `${String(a?.className || '').trim() || t('All classes')} · ${code}${a?.archived ? ` · ${t('archived')}` : ''}`,
          tag: t('Assignment'), kw: 'assignment results open',
          run: () => openAssignment(a),
        });
      });
    }
    if (available($('studentsSectionToggle'))) {
      const classes = new Map();
      studentsCache.forEach((s) => {
        const c = String(s?.className || '').trim();
        if (c) classes.set(c, (classes.get(c) || 0) + 1);
      });
      [...classes].sort(([a], [b]) => a.localeCompare(b)).forEach(([c, n]) => {
        items.push({
          id: `class:${c}`, label: c, sub: t('{n} student(s)', { n }), tag: t('Class'), kw: 'class group',
          run: () => showStudents({ className: c }),
        });
      });
      studentsCache.forEach((s) => {
        const email = String(s?.email || '').trim();
        const name = String(s?.displayName || email || s?.legacyUsername || '').trim();
        if (!name) return;
        items.push({
          id: `student:${email || name}`, label: name,
          sub: [String(s?.className || '').trim(), email].filter(Boolean).join(' · '),
          tag: t('Student'), kw: `student ${s?.legacyUsername || ''}`,
          run: () => showStudents({ search: email || name }),
        });
      });
    }
    (quiz?.questions || []).forEach((q, i) => {
      const prompt = String(q?.prompt || '').replace(/\s+/g, ' ').trim();
      items.push({
        id: `question:${i}`, label: `Q${i + 1} · ${prompt.length > 70 ? `${prompt.slice(0, 70)}…` : prompt}`, // i18n-ignore
        sub: String(q?.type || ''), tag: t('Question'), kw: `q${i + 1} question ${q?.type || ''}`,
        noRecent: true,
        run: () => {
          quiz.questions[i].collapsed = false;
          renderBuilder();
          reveal($('builderQuestionsBody'), { lazy: false });
          flash(document.querySelectorAll('#questionList .question-item')[i]);
        },
      });
    });
    return items;
  }

  // -------------------------------------------------------------- search --
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((x) => typeof x === 'string'); } catch { return []; }
  }
  function remember(id) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...loadRecent().filter((x) => x !== id)].slice(0, 8))); } catch { /* storage off */ }
  }

  function score(item, tokens, recent) {
    let s = 0;
    for (const tk of tokens) {
      const i = item.hay.indexOf(tk);
      if (i < 0) return -1;
      s += i === 0 || item.hay[i - 1] === ' ' ? 3 : 1;
      if (item.labelFold.startsWith(tk)) s += 3;
    }
    // Recent picks break ties; they don't beat a better name match.
    const r = recent.indexOf(item.id);
    if (r >= 0) s += 1.5 - r * 0.15;
    if (!item.id.startsWith('student:') && !item.id.startsWith('question:')) s += 0.5;
    return s;
  }

  // ------------------------------------------------------------------ UI --
  let root = null;
  let input = null;
  let list = null;
  let rows = [];
  let selected = 0;

  const isOpen = () => !!root && !root.classList.contains('hidden');

  function build() {
    root = document.createElement('div');
    root.id = 'cmdPalette';
    root.className = 'cmdp hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', t('Search'));
    const box = document.createElement('div');
    box.className = 'cmdp-box';
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'cmdp-input';
    input.placeholder = t('Search actions, quizzes, assignments, classes, students…');
    input.setAttribute('aria-controls', 'cmdPaletteList');
    list = document.createElement('ul');
    list.id = 'cmdPaletteList';
    list.className = 'cmdp-list';
    list.setAttribute('role', 'listbox');
    const foot = document.createElement('div');
    foot.className = 'cmdp-foot';
    foot.textContent = t('↑↓ move · Enter open · Esc close · Ctrl+K search');
    box.append(input, list, foot);
    root.append(box);
    document.body.append(root);

    root.addEventListener('mousedown', (e) => { if (e.target === root) close(); });
    input.addEventListener('input', () => { selected = 0; refresh(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (!rows.length) return;
        selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        paint();
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runSelected(); }
    });
    list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('[data-row]');
      if (li && Number(li.dataset.row) !== selected) { selected = Number(li.dataset.row); paint(); }
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[data-row]');
      if (li) { selected = Number(li.dataset.row); runSelected(); }
    });
  }

  function refresh() {
    const query = fold(input.value).trim();
    const tokens = query.split(/\s+/).filter(Boolean);
    const recent = loadRecent();
    const actions = actionItems();
    const all = [...actions, ...dataItems()].map((it) => ({
      ...it,
      labelFold: fold(it.label),
      hay: fold(`${it.label} ${it.sub || ''} ${it.kw || ''} ${it.tag || ''}`),
    }));

    const sections = [];
    if (tokens.length) {
      const found = all
        .map((it) => ({ it, s: score(it, tokens, recent) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, MAX_ROWS)
        .map((x) => x.it);
      sections.push({ title: '', items: found });
    } else {
      // Nothing typed: the recent picks, then every action available now,
      // grouped by area with its shortcut — the cheat sheet.
      const byId = new Map(all.map((it) => [it.id, it]));
      const recentItems = recent.map((id) => byId.get(id)).filter(Boolean).slice(0, 5);
      if (recentItems.length) sections.push({ title: t('Recent'), items: recentItems });
      const groups = new Map();
      actions.forEach((a) => { if (!groups.has(a.tag)) groups.set(a.tag, []); groups.get(a.tag).push(a); });
      groups.forEach((items, title) => sections.push({ title, items: items.map((a) => byId.get(a.id)) }));
    }

    rows = [];
    list.innerHTML = '';
    sections.forEach(({ title, items }) => {
      if (title) {
        const head = document.createElement('li');
        head.className = 'cmdp-head';
        head.setAttribute('role', 'presentation');
        head.textContent = title;
        list.append(head);
      }
      items.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'cmdp-row';
        li.setAttribute('role', 'option');
        li.dataset.row = String(rows.length);
        const main = document.createElement('span');
        main.className = 'cmdp-main';
        const label = document.createElement('span');
        label.className = 'cmdp-label';
        label.textContent = it.label;
        main.append(label);
        if (it.sub) {
          const sub = document.createElement('span');
          sub.className = 'cmdp-sub';
          sub.textContent = it.sub;
          main.append(sub);
        }
        li.append(main);
        if (it.tag && tokens.length) {
          const tag = document.createElement('span');
          tag.className = 'cmdp-tag';
          tag.textContent = it.tag;
          li.append(tag);
        }
        if (it.key) {
          const kbd = document.createElement('kbd');
          kbd.className = 'cmdp-key';
          kbd.textContent = it.key;
          li.append(kbd);
        }
        list.append(li);
        rows.push(it);
      });
    });
    if (!rows.length) {
      const empty = document.createElement('li');
      empty.className = 'cmdp-empty';
      empty.textContent = loading.size ? t('Loading…') : t('No matches.');
      list.append(empty);
    } else if (!tokens.length) {
      const hint = document.createElement('li');
      hint.className = 'cmdp-empty';
      hint.textContent = t('Type to search quizzes, assignments, classes, students and questions too.');
      list.append(hint);
    }
    if (selected >= rows.length) selected = 0;
    paint();
  }

  function paint() {
    list.querySelectorAll('[data-row]').forEach((li) => {
      const on = Number(li.dataset.row) === selected;
      li.classList.toggle('active', on);
      li.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function runSelected() {
    const item = rows[selected];
    if (!item) return;
    if (!item.noRecent) remember(item.id);
    close();
    Promise.resolve().then(() => item.run()).catch((err) => {
      setStatus(hostStatusEl, err?.message || String(err), 'bad');
    });
  }

  function open() {
    if (!root) build();
    if (isOpen()) { close(); return; }
    root.classList.remove('hidden');
    input.value = '';
    selected = 0;
    loadData();
    refresh();
    input.focus();
  }

  function close() {
    root?.classList.add('hidden');
  }

  window.PinPlayPalette = { open, close };
})();
