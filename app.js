const STORAGE_KEY = 'pinplay.quiz.v1';
const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CREATE_UNLOCK_KEY = 'pinplay.create.unlocked.v1';
const CREATE_PASSWORD = '1234.';
const DRIVE_PUBLISH_ENDPOINT = '/api/drive/publish';

// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Builder
const quizTitleEl = document.getElementById('quizTitle');
const questionListEl = document.getElementById('questionList');
const addMcqBtn = document.getElementById('addMcqBtn');
const addMcqAudioBtn = document.getElementById('addMcqAudioBtn');
const addMultiBtn = document.getElementById('addMultiBtn');
const addMultiAudioBtn = document.getElementById('addMultiAudioBtn');
const addTfBtn = document.getElementById('addTfBtn');
const addTfAudioBtn = document.getElementById('addTfAudioBtn');
const addTextBtn = document.getElementById('addTextBtn');
const addTextAudioBtn = document.getElementById('addTextAudioBtn');
const addOpenBtn = document.getElementById('addOpenBtn');
const addImageOpenBtn = document.getElementById('addImageOpenBtn');
const addContextGapBtn = document.getElementById('addContextGapBtn');
const addMatchPairsBtn = document.getElementById('addMatchPairsBtn');
const addErrorHuntBtn = document.getElementById('addErrorHuntBtn');
const addPuzzleBtn = document.getElementById('addPuzzleBtn');
const addPuzzleAudioBtn = document.getElementById('addPuzzleAudioBtn');
const addSliderBtn = document.getElementById('addSliderBtn');
const addPinBtn = document.getElementById('addPinBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const publishDriveBtn = document.getElementById('publishDriveBtn');
const openDriveBtn = document.getElementById('openDriveBtn');
const importInput = document.getElementById('importInput');
const collapseAllBtn = document.getElementById('collapseAllBtn');

// Create-side auth
const createAuthCard = document.getElementById('createAuthCard');
const createWorkspace = document.getElementById('createWorkspace');
const createPasswordEl = document.getElementById('createPassword');
const unlockCreateBtn = document.getElementById('unlockCreateBtn');
const createAuthStatusEl = document.getElementById('createAuthStatus');
const backendStatusEl = document.getElementById('backendStatus');

// Host controls (create side)
const hostCardEl = document.getElementById('hostCard');
const createLiveBtn = document.getElementById('createLiveBtn');
const hostApplyBuilderBtn = document.getElementById('hostApplyBuilderBtn');
const hostRefreshBtn = document.getElementById('hostRefreshBtn');
const hostStartBtn = document.getElementById('hostStartBtn');
const hostPrevBtn = document.getElementById('hostPrevBtn');
const hostNextBtn = document.getElementById('hostNextBtn');
const hostJoinPinEl = document.getElementById('hostJoinPin');
const hostJoinBtn = document.getElementById('hostJoinBtn');
const livePinEl = document.getElementById('livePin');
const livePhaseEl = document.getElementById('livePhase');
const liveProgressEl = document.getElementById('liveProgress');
const liveResponsesEl = document.getElementById('liveResponses');
const liveReactionsEl = document.getElementById('liveReactions');
const hostPlayersEl = document.getElementById('hostPlayers');
const hostStatusEl = document.getElementById('hostStatus');
const hostQuestionWrap = document.getElementById('hostQuestionWrap');
const hostQuestionPromptEl = document.getElementById('hostQuestionPrompt');
const hostQuestionAnswersEl = document.getElementById('hostQuestionAnswers');
const hostQuestionHintEl = document.getElementById('hostQuestionHint');
const randomNamesToggleEl = document.getElementById('randomNamesToggle');
const hallCardEl = document.getElementById('hallCard');
const livePinBigEl = document.getElementById('livePinBig');
const hallHintEl = document.getElementById('hallHint');
const projectorFullscreenBtn = document.getElementById('projectorFullscreenBtn');
const projectorTimerEl = document.getElementById('projectorTimer');
const projectorAnswersEl = document.getElementById('projectorAnswers');
const projectorCorrectEl = document.getElementById('projectorCorrect');
const projectorScoresEl = document.getElementById('projectorScores');
const projectorReactionsEl = document.getElementById('projectorReactions');

// Join controls
const joinPinEl = document.getElementById('joinPin');
const joinNameEl = document.getElementById('joinName');
const joinBtn = document.getElementById('joinBtn');
const joinStatusEl = document.getElementById('joinStatus');
const joinQuestionWrap = document.getElementById('joinQuestionWrap');
const joinProgressEl = document.getElementById('joinProgress');
const joinScoreEl = document.getElementById('joinScore');
const joinPromptEl = document.getElementById('joinPrompt');
const joinAnswersEl = document.getElementById('joinAnswers');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinFeedbackEl = document.getElementById('joinFeedback');

// Solo mode
const pinValueEl = document.getElementById('pinValue');
const studentNameEl = document.getElementById('studentName');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const feedbackEl = document.getElementById('feedback');
const progressEl = document.getElementById('progress');
const scoreEl = document.getElementById('score');
const qPromptEl = document.getElementById('qPrompt');
const answersEl = document.getElementById('answers');
const finalScoreEl = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');

const lobbyCard = document.getElementById('lobbyCard');
const gameCard = document.getElementById('gameCard');
const resultCard = document.getElementById('resultCard');

const shouldAutoloadQuiz = !window.location.pathname.includes('/create/');
let quiz = shouldAutoloadQuiz ? (loadQuiz() || createEmptyQuiz()) : createEmptyQuiz();
let soloGame = null;
let pendingScrollQuestionIndex = null;
let dragQuestionIndex = null;

const live = {
  host: {
    pin: null,
    token: null,
    pollTimer: null,
    timerTicker: null,
    timerDeadlineMs: null,
    timerForIndex: null,
    timerStartedAtMs: null,
    isPrimaryAudioHost: false,
    lastPhase: null,
    lastIndex: null,
    lastResponseCount: 0,
    lastAllAnsweredKey: null,
    lastRevealKey: null,
    state: null,
    seenReactionKeys: new Set(),
  },
  player: {
    pin: null,
    id: null,
    token: null,
    pollTimer: null,
    renderKey: null,
    submittedForIndex: null,
    currentQuestion: null,
    pinSelection: null,
  },
};

const audioFx = {
  hall: createAudio('../music/hall.mp3', { loop: true, volume: 0.35 }),
  answering: createAudio('../music/answering.mp3', { loop: true, volume: 0.7 }),
  answered: createAudio('../music/answered.mp3', { loop: false, volume: 1 }),
};

init();

function init() {
  bindTabs();
  bindBuilderEvents();
  bindLiveEvents();
  bindSoloEvents();

  renderBuilder();
  refreshLocalPin();

  const savedBackend = loadBackendUrl();
  const initialBackend = normalizeBackendUrl(savedBackend) || DEFAULT_BACKEND_URL;
  if (!normalizeBackendUrl(savedBackend)) {
    saveBackendUrl(initialBackend);
  }

  setupCreateAccess();
}

function setupCreateAccess() {
  const unlock = () => {
    const value = String(createPasswordEl?.value || '');
    if (value === CREATE_PASSWORD) {
      sessionStorage.setItem(CREATE_UNLOCK_KEY, '1');
      if (createWorkspace) createWorkspace.classList.remove('hidden');
      if (createAuthCard) createAuthCard.classList.add('hidden');
      setStatus(createAuthStatusEl, 'Unlocked ✅', 'ok');
      if (createPasswordEl) createPasswordEl.value = '';
      return;
    }
    setStatus(createAuthStatusEl, 'Wrong password', 'bad');
  };

  if (sessionStorage.getItem(CREATE_UNLOCK_KEY) === '1') {
    if (createWorkspace) createWorkspace.classList.remove('hidden');
    if (createAuthCard) createAuthCard.classList.add('hidden');
    return;
  }

  if (createWorkspace) createWorkspace.classList.add('hidden');
  if (createAuthCard) createAuthCard.classList.remove('hidden');
  if (unlockCreateBtn) unlockCreateBtn.addEventListener('click', unlock);
  if (createPasswordEl) {
    createPasswordEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock();
    });
  }
}

// ---------- Tabs ----------
function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// ---------- Builder ----------
function addQuestionToBuilder(question) {
  quiz.questions.push(question);
  pendingScrollQuestionIndex = quiz.questions.length - 1;
  renderBuilder();
}

function bindBuilderEvents() {
  addMcqBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeMcqQuestion());
  });
  if (addMcqAudioBtn) {
    addMcqAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMcqQuestion({ withAudio: true }));
    });
  }

  addMultiBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeMultiQuestion());
  });
  if (addMultiAudioBtn) {
    addMultiAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMultiQuestion({ withAudio: true }));
    });
  }

  addTfBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeTfQuestion());
  });
  if (addTfAudioBtn) {
    addTfAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeTfQuestion({ withAudio: true }));
    });
  }

  addTextBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeTextQuestion());
  });
  if (addTextAudioBtn) {
    addTextAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeTextQuestion({ withAudio: true }));
    });
  }

  if (addOpenBtn) {
    addOpenBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeOpenQuestion());
    });
  }

  if (addImageOpenBtn) {
    addImageOpenBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeImageOpenQuestion());
    });
  }

  if (addContextGapBtn) {
    addContextGapBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeContextGapQuestion());
    });
  }

  if (addMatchPairsBtn) {
    addMatchPairsBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeMatchPairsQuestion());
    });
  }

  if (addErrorHuntBtn) {
    addErrorHuntBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeErrorHuntQuestion());
    });
  }

  addPuzzleBtn.addEventListener('click', () => {
    addQuestionToBuilder(makePuzzleQuestion());
  });
  if (addPuzzleAudioBtn) {
    addPuzzleAudioBtn.addEventListener('click', () => {
      addQuestionToBuilder(makePuzzleQuestion({ withAudio: true }));
    });
  }

  addSliderBtn.addEventListener('click', () => {
    addQuestionToBuilder(makeSliderQuestion());
  });

  addPinBtn.addEventListener('click', () => {
    addQuestionToBuilder(makePinQuestion());
  });

  saveBtn.addEventListener('click', () => {
    syncQuizFromUI();
    saveQuiz(quiz);
    alert('Saved locally ✅');
  });

  exportBtn.addEventListener('click', () => {
    syncQuizFromUI();
    downloadJson(quiz, `${toSafeFilename(quiz.title || 'pinplay-quiz')}.json`);
  });

  if (publishDriveBtn) {
    publishDriveBtn.addEventListener('click', publishQuizToDrive);
  }

  if (openDriveBtn) {
    openDriveBtn.addEventListener('click', openQuizFromDrive);
  }

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      validateImportedQuiz(parsed);
      quiz = parsed;
      renderBuilder();
      saveQuiz(quiz);
      alert('Quiz imported ✅');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
    importInput.value = '';
  });

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      const shouldCollapse = quiz.questions.some((q) => !q.collapsed);
      quiz.questions.forEach((q) => { q.collapsed = shouldCollapse; });
      collapseAllBtn.textContent = shouldCollapse ? 'Expand all' : 'Collapse all';
      renderBuilder();
    });
  }

  questionListEl.addEventListener('click', async (e) => {
    const moveUpBtn = e.target.closest('[data-move-up-question]');
    if (moveUpBtn) {
      const idx = Number(moveUpBtn.dataset.moveUpQuestion);
      if (idx > 0) {
        [quiz.questions[idx - 1], quiz.questions[idx]] = [quiz.questions[idx], quiz.questions[idx - 1]];
        renderBuilder();
      }
      return;
    }

    const moveDownBtn = e.target.closest('[data-move-down-question]');
    if (moveDownBtn) {
      const idx = Number(moveDownBtn.dataset.moveDownQuestion);
      if (idx >= 0 && idx < quiz.questions.length - 1) {
        [quiz.questions[idx], quiz.questions[idx + 1]] = [quiz.questions[idx + 1], quiz.questions[idx]];
        renderBuilder();
      }
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle-question]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggleQuestion);
      if (quiz.questions[idx]) {
        quiz.questions[idx].collapsed = !quiz.questions[idx].collapsed;
        renderBuilder();
      }
      return;
    }

    const toggleHeader = e.target.closest('[data-toggle-question-header]');
    if (toggleHeader) {
      const idx = Number(toggleHeader.dataset.toggleQuestionHeader);
      if (quiz.questions[idx]) {
        quiz.questions[idx].collapsed = !quiz.questions[idx].collapsed;
        renderBuilder();
      }
      return;
    }

    const removeBtn = e.target.closest('[data-remove-question]');
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.removeQuestion);
      quiz.questions.splice(idx, 1);
      renderBuilder();
      return;
    }

    const preview = e.target.closest('[data-pin-preview]');
    if (preview) {
      const idx = Number(preview.dataset.pinPreview);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;

      const rect = preview.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      q.zone.x = round(clamp(x, 0, 100), 1);
      q.zone.y = round(clamp(y, 0, 100), 1);
      renderBuilder();
      return;
    }

    const audioBtn = e.target.closest('[data-play-audio-preview]');
    if (audioBtn) {
      const idx = Number(audioBtn.dataset.playAudioPreview);
      const q = quiz.questions[idx];
      if (!q || !hasQuestionAudio(q)) return;
      playQuestionAudio(q);
    }
  });

  questionListEl.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('[data-drag-question]');
    if (!handle) return;
    const item = handle.closest('.question-item');
    if (!item) return;
    dragQuestionIndex = Number(item.dataset.questionIndex);
    item.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragQuestionIndex));
    }
  });

  questionListEl.addEventListener('dragover', (e) => {
    const overItem = e.target.closest('.question-item');
    if (!overItem) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  });

  questionListEl.addEventListener('drop', (e) => {
    const overItem = e.target.closest('.question-item');
    if (!overItem) return;
    e.preventDefault();

    const to = Number(overItem.dataset.questionIndex);
    const from = Number.isFinite(dragQuestionIndex) ? dragQuestionIndex : Number(e.dataTransfer?.getData('text/plain'));

    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < 0 || from === to) return;

    const [moved] = quiz.questions.splice(from, 1);
    quiz.questions.splice(to, 0, moved);
    pendingScrollQuestionIndex = to;
    dragQuestionIndex = null;
    renderBuilder();
  });

  questionListEl.addEventListener('dragend', () => {
    dragQuestionIndex = null;
    questionListEl.querySelectorAll('.question-item.dragging').forEach((el) => el.classList.remove('dragging'));
  });

  questionListEl.addEventListener('change', async (e) => {
    const pinUpload = e.target.closest('[data-pin-upload]');
    if (pinUpload) {
      const idx = Number(pinUpload.dataset.pinUpload);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;

      const file = pinUpload.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        return;
      }

      try {
        q.imageData = await fileToDataUrl(file);
        renderBuilder();
      } catch (err) {
        alert(`Image load failed: ${err.message}`);
      }
      return;
    }

    const imageUpload = e.target.closest('[data-image-upload]');
    if (imageUpload) {
      const idx = Number(imageUpload.dataset.imageUpload);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'image_open') return;

      const file = imageUpload.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        return;
      }

      try {
        q.imageData = await fileToDataUrl(file);
        renderBuilder();
      } catch (err) {
        alert(`Image load failed: ${err.message}`);
      }
      return;
    }


    const audioUpload = e.target.closest('[data-audio-upload]');
    if (audioUpload) {
      const idx = Number(audioUpload.dataset.audioUpload);
      const q = quiz.questions[idx];
      if (!q) return;

      const file = audioUpload.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        alert('Please choose an audio file.');
        return;
      }

      try {
        q.audioData = await fileToDataUrl(file);
        q.audioMode = 'file';
        q.audioEnabled = true;
        renderBuilder();
      } catch (err) {
        alert(`Audio load failed: ${err.message}`);
      }
    }
  });
}

function renderBuilder() {
  quizTitleEl.value = quiz.title || '';
  questionListEl.innerHTML = '';

  if (!quiz.questions.length) {
    questionListEl.innerHTML = '<p class="muted">No questions yet. Add one above.</p>';
    return;
  }

  quiz.questions.forEach((q, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'question-item';

    const common = `
      <div class="question-header" data-toggle-question-header="${idx}" data-drag-question="${idx}" draggable="true" title="Click to collapse/expand · Drag header to reorder">
        <strong>Q${idx + 1} · ${labelForType(q.type)}</strong>
        <div class="question-actions">
          <button class="btn" data-move-up-question="${idx}" title="Move up">↑</button>
          <button class="btn" data-move-down-question="${idx}" title="Move down">↓</button>
          <button class="btn" data-toggle-question="${idx}">${q.collapsed ? 'Expand' : 'Collapse'}</button>
          <button class="btn" data-remove-question="${idx}">Remove</button>
        </div>
      </div>
      <div class="${q.collapsed ? 'question-body-collapsed' : ''}">
      <label>Question (max 120 chars)</label>
      <textarea data-q="${idx}" data-field="prompt" maxlength="120">${escapeHtml(q.prompt || '')}</textarea>
      <div class="row gap top-space">
        <div style="min-width:120px;">
          <label>Points</label>
          <select data-q="${idx}" data-field="points">
            <option value="0" ${Number(q.points) === 0 ? 'selected' : ''}>0</option>
            <option value="1000" ${Number(q.points) === 1000 ? 'selected' : ''}>1000</option>
            <option value="2000" ${Number(q.points) === 2000 ? 'selected' : ''}>2000</option>
          </select>
        </div>
        <div style="min-width:160px;">
          <label>Time limit (sec)</label>
          <input data-q="${idx}" data-field="timeLimit" type="number" min="${minTimeByType(q.type)}" max="240" value="${Number(q.timeLimit || 20)}" />
        </div>
      </div>
    `;

    let specific = '';

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      const answers = q.answers || [];
      const isMulti = q.type === 'multi';

      specific += `
        <label class="top-space">Answers</label>
        <div class="answers-grid">
          ${answers
            .map(
              (a, aIdx) => `
            <div class="answer-row">
              <input type="${isMulti ? 'checkbox' : 'radio'}" ${isMulti ? '' : `name="correct-${idx}"`} ${a.correct ? 'checked' : ''} data-q="${idx}" data-correct-index="${aIdx}" />
              <input data-q="${idx}" data-answer-index="${aIdx}" maxlength="75" value="${escapeHtml(a.text || '')}" ${q.type === 'tf' ? 'disabled' : ''}/>
              <span class="small">${q.type === 'tf' ? '' : 'max 75'}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      `;

      if (q.type === 'multi') {
        specific += `<p class="small">Students must select all correct answers.</p>`;
      }

      if (supportsQuestionAudio(q.type)) {
        specific += buildAudioSettingsMarkup(idx, q);
      }
    }

    if (q.type === 'text') {
      const accepted = q.accepted || ['', '', '', ''];
      specific += `
        <label class="top-space">Accepted answers (1-4, max 20 chars each)</label>
        <div class="answers-grid">
          ${accepted
            .map(
              (ans, aIdx) => `
            <input data-q="${idx}" data-accepted-index="${aIdx}" maxlength="20" value="${escapeHtml(ans || '')}" placeholder="Accepted answer ${aIdx + 1}" />
          `,
            )
            .join('')}
        </div>
      `;
    }

    if (q.type === 'open') {
      specific += `
        <p class="small top-space">Students submit short text answers. Teacher grades responses live.</p>
      `;
    }

    if (q.type === 'image_open') {
      specific += `
        <label class="top-space">Prompt image</label>
        <input data-image-upload="${idx}" type="file" accept="image/*" />
        <p class="small top-space">Students write 1-2 sentences from the image. Teacher grades live.</p>
      `;
      if (q.imageData) {
        specific += `
          <div class="pin-preview">
            <img src="${q.imageData}" alt="Image prompt" />
          </div>
        `;
      }
    }

    if (q.type === 'context_gap') {
      const gaps = q.gaps || ['', '', '', ''];
      specific += `
        <p class="small top-space">Write the paragraph in the question and set expected words for each blank.</p>
        <label class="top-space">Expected words for blanks (1-4)</label>
        <div class="answers-grid">
          ${gaps
            .map((ans, aIdx) => `
            <input data-q="${idx}" data-gap-index="${aIdx}" maxlength="20" value="${escapeHtml(ans || '')}" placeholder="Blank ${aIdx + 1}" />
          `)
            .join('')}
        </div>
      `;
    }

    if (q.type === 'match_pairs') {
      const pairs = Array.isArray(q.pairs) ? q.pairs : [];
      const normalizedPairs = [...pairs];
      while (normalizedPairs.length < 4) normalizedPairs.push({ left: '', right: '' });
      specific += `
        <p class="small top-space">Set matching pairs (left → right). Min 2 pairs.</p>
        <div class="answers-grid">
          ${normalizedPairs
            .slice(0, 6)
            .map(
              (p, i) => `
              <input data-q="${idx}" data-pair-left="${i}" maxlength="40" value="${escapeHtml(p?.left || '')}" placeholder="Left ${i + 1}" />
              <input data-q="${idx}" data-pair-right="${i}" maxlength="40" value="${escapeHtml(p?.right || '')}" placeholder="Right ${i + 1}" />
            `,
            )
            .join('')}
        </div>
      `;
    }

    if (q.type === 'error_hunt') {
      specific += `
        <label class="top-space">Corrected sentence (target)</label>
        <textarea data-q="${idx}" data-field="corrected" maxlength="160">${escapeHtml(q.corrected || '')}</textarea>
        <p class="small">Error count is auto-calculated from token differences between prompt and corrected sentence.</p>
      `;
    }

    if (q.type === 'puzzle') {
      const items = [...(q.items || [])];
      while (items.length < 9) items.push('');
      specific += `
        <label class="top-space">Correct order items (min 3, max 9)</label>
        <div class="answers-grid">
          ${items
            .map(
              (item, i) => `
            <input data-q="${idx}" data-puzzle-index="${i}" maxlength="75" value="${escapeHtml(item || '')}" placeholder="Position ${i + 1}" />
          `,
            )
            .join('')}
        </div>
        <p class="small">Students will drag pieces into order on their screen.</p>
      `;
    }

    if (q.type === 'slider') {
      specific += `
        <div class="row gap top-space">
          <div style="min-width:120px;">
            <label>Min</label>
            <input data-q="${idx}" data-field="sliderMin" type="number" value="${Number(q.min ?? 0)}" />
          </div>
          <div style="min-width:120px;">
            <label>Max</label>
            <input data-q="${idx}" data-field="sliderMax" type="number" value="${Number(q.max ?? 100)}" />
          </div>
          <div style="min-width:120px;">
            <label>Correct value</label>
            <input data-q="${idx}" data-field="sliderTarget" type="number" value="${Number(q.target ?? 50)}" />
          </div>
          <div style="min-width:150px;">
            <label>Margin</label>
            <select data-q="${idx}" data-field="sliderMargin">
              ${['none', 'low', 'medium', 'high', 'maximum']
                .map((m) => `<option value="${m}" ${q.margin === m ? 'selected' : ''}>${m}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <label>Unit (optional)</label>
        <input data-q="${idx}" data-field="sliderUnit" maxlength="20" value="${escapeHtml(q.unit || '')}" placeholder="e.g. kg, €, years" />
      `;
    }

    if (q.type === 'pin') {
      const zone = q.zone || { x: 50, y: 50, r: 15 };
      specific += `
        <label class="top-space">Image</label>
        <input data-pin-upload="${idx}" type="file" accept="image/*" />
        <div class="row gap top-space">
          <div style="min-width:110px;">
            <label>X %</label>
            <input data-q="${idx}" data-field="pinX" type="number" min="0" max="100" value="${Number(zone.x ?? 50)}" />
          </div>
          <div style="min-width:110px;">
            <label>Y %</label>
            <input data-q="${idx}" data-field="pinY" type="number" min="0" max="100" value="${Number(zone.y ?? 50)}" />
          </div>
          <div style="min-width:110px;">
            <label>Radius %</label>
            <input data-q="${idx}" data-field="pinR" type="number" min="1" max="100" value="${Number(zone.r ?? 15)}" />
          </div>
        </div>
        <p class="small">Tip: click image preview to set X/Y center.</p>
      `;

      if (q.imageData) {
        const left = clamp(zone.x, 0, 100);
        const top = clamp(zone.y, 0, 100);
        const size = clamp(zone.r * 2, 2, 100);

        specific += `
          <div class="pin-preview" data-pin-preview="${idx}">
            <img src="${q.imageData}" alt="Pin question image" />
            <div class="pin-zone" style="left:${left}%; top:${top}%; width:${size}%; height:${size}%;"></div>
            <div class="pin-dot" style="left:${left}%; top:${top}%;"></div>
          </div>
        `;
      }
    }

    if (supportsQuestionAudio(q.type) && !['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      specific += buildAudioSettingsMarkup(idx, q);
    }

    wrap.innerHTML = common + specific + '</div>';
    wrap.dataset.questionIndex = String(idx);
    questionListEl.appendChild(wrap);
  });

  questionListEl.querySelectorAll('[data-q]').forEach((el) => {
    el.addEventListener('input', syncQuizFromUI);
    el.addEventListener('change', syncQuizFromUI);
  });

  if (collapseAllBtn) {
    const allCollapsed = quiz.questions.length > 0 && quiz.questions.every((q) => !!q.collapsed);
    collapseAllBtn.textContent = allCollapsed ? 'Expand all' : 'Collapse all';
  }

  if (pendingScrollQuestionIndex != null) {
    const target = questionListEl.querySelector(`[data-question-index="${pendingScrollQuestionIndex}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pendingScrollQuestionIndex = null;
  }
}

function buildAudioSettingsMarkup(idx, q) {
  const enabled = !!q.audioEnabled || q.type === 'audio';
  const mode = q.audioMode || (q.audioData ? 'file' : 'tts');
  const lang = String(q.language || 'en-US-Wave');
  return `
    <div class="top-space" style="padding:.55rem; border:1px dashed var(--line); border-radius:.55rem;">
      <label style="display:flex; align-items:center; gap:.45rem; margin:0; font-weight:500;">
        <input data-q="${idx}" data-field="audioEnabled" type="checkbox" ${enabled ? 'checked' : ''} style="width:auto;" />
        Audio for this question
      </label>
      <div class="row gap top-space">
        <div style="min-width:170px;">
          <label>Audio source</label>
          <select data-q="${idx}" data-field="audioMode">
            <option value="tts" ${mode === 'tts' ? 'selected' : ''}>Text-to-speech</option>
            <option value="file" ${mode === 'file' ? 'selected' : ''}>Audio file</option>
          </select>
        </div>
        <div style="min-width:220px;">
          <label>Audio file</label>
          <input data-audio-upload="${idx}" type="file" accept="audio/*" />
        </div>
      </div>
      <label class="top-space">Text to read aloud (max 1000 chars)</label>
      <input data-q="${idx}" data-field="audioText" maxlength="1000" value="${escapeHtml(q.audioText || '')}" placeholder="This is a sample text." />
      <label>Language code (e.g. en-US, en-US-Wave)</label>
      <input data-q="${idx}" data-field="language" maxlength="32" value="${escapeHtml(lang)}" />
      <div class="small top-space">${q.audioData ? 'Audio file uploaded ✅' : 'No audio file uploaded yet.'}</div>
      <div class="top-space"><button type="button" class="btn" data-play-audio-preview="${idx}">▶ Play preview</button></div>
    </div>
  `;
}

function syncQuizFromUI() {
  quiz.title = quizTitleEl.value.trim();

  quiz.questions.forEach((q, idx) => {
    const promptEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="prompt"]`);
    const pointsEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="points"]`);
    const timeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="timeLimit"]`);

    if (promptEl) q.prompt = String(promptEl.value || '').slice(0, 120);
    if (pointsEl) q.points = Number(pointsEl.value || 1000);
    if (timeEl) q.timeLimit = clamp(Number(timeEl.value || 20), minTimeByType(q.type), 240);

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      q.answers = q.answers || [];

      q.answers.forEach((a, aIdx) => {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-answer-index="${aIdx}"]`);
        if (aEl) a.text = String(aEl.value || '').slice(0, 75);
      });

      if (q.type === 'multi') {
        q.answers.forEach((a, aIdx) => {
          const cEl = questionListEl.querySelector(`[data-q="${idx}"][data-correct-index="${aIdx}"]`);
          a.correct = !!cEl?.checked;
        });
      } else {
        const selectedCorrect = questionListEl.querySelector(`[data-q="${idx}"][data-correct-index]:checked`);
        const correctIndex = selectedCorrect ? Number(selectedCorrect.dataset.correctIndex) : 0;
        q.answers.forEach((a, aIdx) => {
          a.correct = aIdx === correctIndex;
        });
      }

      if (q.type === 'tf') {
        q.answers[0] = { text: 'True', correct: !!q.answers[0]?.correct };
        q.answers[1] = { text: 'False', correct: !!q.answers[1]?.correct };
      }

    }

    if (supportsQuestionAudio(q.type)) {
      const audioEnabledEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioEnabled"]`);
      const audioModeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioMode"]`);
      const audioTextEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioText"]`);
      const languageEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="language"]`);

      q.audioEnabled = !!audioEnabledEl?.checked || q.type === 'audio';
      q.audioMode = ['tts', 'file'].includes(String(audioModeEl?.value || '')) ? String(audioModeEl.value) : (q.audioData ? 'file' : 'tts');
      q.audioText = String(audioTextEl?.value || '').slice(0, 1000);
      q.language = String(languageEl?.value || 'en-US-Wave').slice(0, 32) || 'en-US-Wave';
      if (q.audioMode !== 'file') q.audioData = q.audioData || '';
    }

    if (q.type === 'text') {
      const accepted = [];
      for (let aIdx = 0; aIdx < 4; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-accepted-index="${aIdx}"]`);
        accepted.push(String(aEl?.value || '').slice(0, 20));
      }
      q.accepted = accepted;
    }

    if (q.type === 'context_gap') {
      const gaps = [];
      for (let aIdx = 0; aIdx < 4; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-gap-index="${aIdx}"]`);
        gaps.push(String(aEl?.value || '').slice(0, 20));
      }
      q.gaps = gaps;
    }

    if (q.type === 'match_pairs') {
      const pairs = [];
      for (let i = 0; i < 6; i++) {
        const leftEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-left="${i}"]`);
        const rightEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-right="${i}"]`);
        const left = String(leftEl?.value || '').slice(0, 40).trim();
        const right = String(rightEl?.value || '').slice(0, 40).trim();
        if (left || right) pairs.push({ left, right });
      }
      q.pairs = pairs;
    }

    if (q.type === 'error_hunt') {
      const correctedEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="corrected"]`);
      q.corrected = String(correctedEl?.value || '').slice(0, 160);
    }

    if (q.type === 'puzzle') {
      const items = [];
      for (let i = 0; i < 9; i++) {
        const itemEl = questionListEl.querySelector(`[data-q="${idx}"][data-puzzle-index="${i}"]`);
        items.push(String(itemEl?.value || '').slice(0, 75));
      }
      q.items = items;
    }

    if (q.type === 'slider') {
      const minEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMin"]`);
      const maxEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMax"]`);
      const targetEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderTarget"]`);
      const marginEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderMargin"]`);
      const unitEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="sliderUnit"]`);

      const min = Number(minEl?.value ?? 0);
      const max = Number(maxEl?.value ?? 100);
      const fixedMin = Number.isFinite(min) ? min : 0;
      const fixedMax = Number.isFinite(max) ? max : 100;

      q.min = Math.min(fixedMin, fixedMax);
      q.max = Math.max(fixedMin, fixedMax);
      q.target = clamp(Number(targetEl?.value ?? q.min), q.min, q.max);
      q.margin = ['none', 'low', 'medium', 'high', 'maximum'].includes(marginEl?.value)
        ? marginEl.value
        : 'medium';
      q.unit = String(unitEl?.value || '').slice(0, 20);
    }

    if (q.type === 'pin') {
      q.zone = q.zone || { x: 50, y: 50, r: 15 };

      const xEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="pinX"]`);
      const yEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="pinY"]`);
      const rEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="pinR"]`);

      q.zone.x = round(clamp(Number(xEl?.value ?? 50), 0, 100), 1);
      q.zone.y = round(clamp(Number(yEl?.value ?? 50), 0, 100), 1);
      q.zone.r = round(clamp(Number(rEl?.value ?? 15), 1, 100), 1);
    }
  });
}

async function publishQuizToDrive() {
  try {
    syncQuizFromUI();

    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    const payload = normalizeQuizForLive(quiz);
    const data = await api(DRIVE_PUBLISH_ENDPOINT, {
      method: 'POST',
      body: {
        quiz: payload,
      },
    });

    const fileName = data?.file?.name || 'quiz.json';
    const fileUrl = data?.file?.webViewLink || data?.file?.url || '';
    const folderUrl = data?.folder?.webViewLink || data?.folder?.url || '';

    if (fileUrl) {
      setStatus(hostStatusEl, `Published to Drive: ${fileName}`, 'ok');
      if (confirm(`Published to Drive: ${fileName}\n\nOpen file now?`)) {
        window.open(fileUrl, '_blank', 'noopener');
      }
      return;
    }

    if (folderUrl) {
      setStatus(hostStatusEl, `Published to Drive: ${fileName}`, 'ok');
      if (confirm(`Published to Drive.\n\nOpen folder now?`)) {
        window.open(folderUrl, '_blank', 'noopener');
      }
      return;
    }

    setStatus(hostStatusEl, `Published to Drive: ${fileName}`, 'ok');
  } catch (err) {
    setStatus(hostStatusEl, `Drive publish failed: ${err.message}`, 'bad');
  }
}

async function openQuizFromDrive() {
  try {
    const list = await api('/api/drive/list', { method: 'GET' });
    const files = Array.isArray(list?.files) ? list.files : [];
    if (!files.length) throw new Error('No quiz files found in Drive folder.');

    const preview = files
      .slice(0, 12)
      .map((f, i) => `${i + 1}. ${f.name || f.id}`)
      .join('\n');

    const pickRaw = prompt(`Open from Drive\n\nChoose file number:\n${preview}`);
    if (pickRaw == null) return;

    const pick = Number(String(pickRaw).trim());
    if (!Number.isFinite(pick) || pick < 1 || pick > Math.min(files.length, 12)) {
      throw new Error('Invalid file number.');
    }

    const chosen = files[pick - 1];
    const openData = await api(`/api/drive/open?fileId=${encodeURIComponent(chosen.id)}`, { method: 'GET' });
    const loadedQuiz = openData?.quiz;

    validateImportedQuiz(loadedQuiz);
    quiz = loadedQuiz;
    renderBuilder();
    saveQuiz(quiz);

    setStatus(hostStatusEl, `Loaded from Drive: ${chosen.name}`, 'ok');
  } catch (err) {
    setStatus(hostStatusEl, `Open from Drive failed: ${err.message}`, 'bad');
  }
}

// ---------- Live mode ----------
function bindLiveEvents() {
  if (createLiveBtn) createLiveBtn.addEventListener('click', createLiveGame);
  if (hostApplyBuilderBtn) hostApplyBuilderBtn.addEventListener('click', hostApplyBuilderToLive);
  if (hostRefreshBtn) hostRefreshBtn.addEventListener('click', pollHostState);
  if (hostStartBtn) hostStartBtn.addEventListener('click', hostStartGame);
  if (hostPrevBtn) hostPrevBtn.addEventListener('click', hostPrevQuestion);
  if (hostNextBtn) hostNextBtn.addEventListener('click', hostNextQuestion);
  if (hostJoinBtn) hostJoinBtn.addEventListener('click', joinLiveGameAsHostByPin);
  if (hostJoinPinEl) {
    hostJoinPinEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinLiveGameAsHostByPin();
    });
  }

  if (hostPlayersEl) {
    hostPlayersEl.addEventListener('click', (e) => {
      const renameBtn = e.target.closest('[data-rename-player]');
      if (renameBtn) {
        renamePlayer(renameBtn.dataset.renamePlayer, renameBtn.dataset.currentName || '');
        return;
      }

      const adjustBtn = e.target.closest('[data-adjust-player]');
      if (adjustBtn) {
        adjustPlayerScore(adjustBtn.dataset.adjustPlayer, adjustBtn.dataset.currentName || '');
        return;
      }

      const btn = e.target.closest('[data-kick-player]');
      if (!btn) return;
      kickPlayer(btn.dataset.kickPlayer);
    });
  }

  if (projectorFullscreenBtn) {
    projectorFullscreenBtn.addEventListener('click', toggleProjectorFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenButtonLabel);
    syncFullscreenButtonLabel();
  }

  if (joinBtn) joinBtn.addEventListener('click', joinLiveGame);
  if (joinSubmitBtn) joinSubmitBtn.addEventListener('click', submitLiveAnswer);

  if (randomNamesToggleEl) {
    randomNamesToggleEl.addEventListener('change', hostUpdateRandomNames);
  }

  document.addEventListener('keydown', handleHostHotkeys);
}

async function createLiveGame() {
  try {
    syncQuizFromUI();

    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    const payload = normalizeQuizForLive(quiz);
    const data = await api('/api/create', {
      method: 'POST',
      body: {
        quiz: payload,
        options: {
          randomNames: !!randomNamesToggleEl?.checked,
        },
      },
    });

    live.host.pin = data.pin;
    live.host.token = data.hostToken;
    live.host.lastPhase = null;
    live.host.lastIndex = null;
    live.host.lastResponseCount = 0;
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.state = null;
    live.host.isPrimaryAudioHost = true;

    stopFx('answering');
    if (livePinEl) livePinEl.textContent = data.pin;
    if (livePinBigEl) livePinBigEl.textContent = data.pin;
    setStatus(hostStatusEl, 'Live game created. Share the PIN with students.', 'ok');

    startHostPolling();
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostStartGame() {
  try {
    ensureHostReady();
    await api('/api/host/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostApplyBuilderToLive() {
  try {
    ensureHostReady();
    syncQuizFromUI();
    const payload = normalizeQuizForLive(quiz);

    await api('/api/host/quiz/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin, quiz: payload },
    });

    setStatus(hostStatusEl, 'Live game updated from builder ✅', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function joinLiveGameAsHostByPin() {
  try {
    const pin = String(hostJoinPinEl?.value || '').trim();
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

    const data = await api('/api/host/join', {
      method: 'POST',
      body: { pin },
    });

    live.host.pin = data.pin;
    live.host.token = data.hostToken;
    live.host.lastPhase = null;
    live.host.lastIndex = null;
    live.host.lastResponseCount = 0;
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.state = null;
    live.host.isPrimaryAudioHost = false;

    if (livePinEl) livePinEl.textContent = data.pin;
    if (livePinBigEl) livePinBigEl.textContent = data.pin;
    setStatus(hostStatusEl, 'Joined as host by PIN. Controls are live.', 'ok');

    startHostPolling();
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostNextQuestion() {
  try {
    ensureHostReady();
    await api('/api/host/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostPrevQuestion() {
  try {
    ensureHostReady();
    await api('/api/host/prev', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostRevealQuestion() {
  try {
    ensureHostReady();
    await api('/api/host/reveal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: { pin: live.host.pin },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostUpdateRandomNames() {
  try {
    if (!live.host.pin || !live.host.token) return;
    await api('/api/host/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        randomNames: !!randomNamesToggleEl?.checked,
      },
    });
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

function shouldIgnoreHostHotkey(e) {
  if (!createWorkspace || createWorkspace.classList.contains('hidden')) return true;
  if (!live.host.pin || !live.host.token) return true;

  const el = e.target;
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (el.isContentEditable) return true;
  return ['input', 'textarea', 'select', 'button'].includes(tag);
}

function handleHostHotkeys(e) {
  if (shouldIgnoreHostHotkey(e)) return;

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleProjectorFullscreen();
    return;
  }

  const state = live.host.state;
  if (!state) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    hostPrevQuestion();
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    hostNextQuestion();
    return;
  }

  if (e.key === ' ' || e.code === 'Space') {
    if (state.phase !== 'question' || state.questionClosed) return;
    e.preventDefault();
    hostRevealQuestion();
  }
}

async function kickPlayer(playerId) {
  try {
    if (!playerId) return;
    ensureHostReady();
    await api('/api/host/kick', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });
    setStatus(hostStatusEl, 'Player removed.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function renamePlayer(playerId, currentName = '') {
  try {
    if (!playerId) return;
    ensureHostReady();

    const next = prompt('New student name:', String(currentName || '').trim());
    if (next == null) return;

    const name = String(next || '').trim();
    if (!name) throw new Error('Name cannot be empty.');

    await api('/api/host/rename', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        name,
      },
    });

    setStatus(hostStatusEl, `Renamed to ${name}.`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function adjustPlayerScore(playerId, currentName = '') {
  try {
    if (!playerId) return;
    ensureHostReady();

    const raw = prompt(`Adjust score for ${currentName || 'student'} (use + or -, e.g. +1000, -500):`, '+1000');
    if (raw == null) return;

    const delta = Number(String(raw).trim());
    if (!Number.isFinite(delta) || delta === 0) throw new Error('Please enter a non-zero number.');

    await api('/api/host/adjust-score', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        delta,
      },
    });

    setStatus(hostStatusEl, `Score adjusted (${delta > 0 ? '+' : ''}${Math.round(delta)}).`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function gradeOpenAnswer(playerId, currentPoints = 0) {
  try {
    if (!playerId) return;
    ensureHostReady();
    const max = Number(live.host.state?.question?.points || 1000);
    const raw = prompt(`Grade this answer (0-${max}):`, String(currentPoints || max));
    if (raw == null) return;

    const points = Number(String(raw).trim());
    if (!Number.isFinite(points)) throw new Error('Points must be a number.');

    await api('/api/host/grade-open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        points,
      },
    });

    setStatus(hostStatusEl, `Open answer graded: ${Math.round(points)} pts.`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function pollHostState() {
  if (!live.host.pin || !live.host.token) return;
  try {
    const data = await api(`/api/host/state?pin=${encodeURIComponent(live.host.pin)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${live.host.token}` },
    });
    renderHostState(data);
  } catch (err) {
    setStatus(hostStatusEl, `Host poll failed: ${err.message}`, 'bad');
    stopHostPolling();
  }
}

function renderHostState(state) {
  live.host.state = state;

  const phaseChanged = live.host.lastPhase !== state.phase || live.host.lastIndex !== state.currentIndex;

  if (phaseChanged) {
    live.host.seenReactionKeys = new Set();
    if (liveReactionsEl) liveReactionsEl.innerHTML = '';
    if (projectorReactionsEl) projectorReactionsEl.innerHTML = '';
  }

  if (livePhaseEl) livePhaseEl.textContent = `Phase: ${state.phase}`;
  if (liveProgressEl) liveProgressEl.textContent = `Progress: ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (liveResponsesEl) liveResponsesEl.textContent = `Answers this round: ${state.responseCount} / ${state.playerCount}`;
  renderReactionPop(state.reactions || []);
  if (livePinEl) livePinEl.textContent = state.pin || '-';
  if (livePinBigEl) livePinBigEl.textContent = state.pin || '-';

  if (projectorAnswersEl) projectorAnswersEl.textContent = `Answers: ${state.responseCount} / ${state.playerCount}`;
  if (projectorScoresEl) renderProjectorScores(state.players || []);

  if (randomNamesToggleEl && state.settings && typeof state.settings.randomNames === 'boolean') {
    randomNamesToggleEl.checked = !!state.settings.randomNames;
  }

  if (hostPlayersEl) {
    hostPlayersEl.innerHTML = '';
    (state.players || []).forEach((p) => {
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'row spread';

      const name = document.createElement('span');
      name.textContent = `${p.name} - ${p.score} pts${p.answeredCurrent ? ' [answered]' : ''}`;

      const actions = document.createElement('div');
      actions.className = 'row gap';

      const rename = document.createElement('button');
      rename.className = 'btn';
      rename.dataset.renamePlayer = p.id;
      rename.dataset.currentName = p.name || '';
      rename.textContent = 'Rename';

      const points = document.createElement('button');
      points.className = 'btn';
      points.dataset.adjustPlayer = p.id;
      points.dataset.currentName = p.name || '';
      points.textContent = 'Points';

      const kick = document.createElement('button');
      kick.className = 'btn';
      kick.dataset.kickPlayer = p.id;
      kick.textContent = 'Remove';

      actions.append(rename, points, kick);
      row.append(name, actions);
      li.appendChild(row);
      hostPlayersEl.appendChild(li);
    });

    if (!state.players?.length) {
      const li = document.createElement('li');
      li.textContent = 'No students joined yet.';
      hostPlayersEl.appendChild(li);
    }
  }

  let actionHint = 'Game finished.';
  if (state.phase === 'lobby') {
    actionHint = 'Lobby open. Students can join with PIN.';
  } else if (state.phase === 'question') {
    if (state.questionClosed) {
      if (state.questionCloseReason === 'all_answered') actionHint = 'Everyone answered. Reveal shown.';
      else if (state.questionCloseReason === 'timeout') actionHint = 'Time up. Reveal shown.';
      else actionHint = 'Question closed. Reveal shown.';
    } else {
      actionHint = 'Question running.';
    }
  }

  setStatus(hostStatusEl, actionHint, 'ok');
  renderHostQuestion(state);
  updateHallScene(state);
  updateHostTimer(state);

  if (phaseChanged && state.phase === 'question' && !state.questionClosed) {
    stopFx('answering');
    playFx('answering');
    animatePulse(hostQuestionWrap || hostCardEl || hallCardEl);
    live.host.lastAllAnsweredKey = null;
    live.host.lastRevealKey = null;
  }

  const revealKey =
    state.phase === 'question' && state.questionClosed
      ? `${state.currentIndex}:${state.questionClosedAt || 0}:${state.questionCloseReason || ''}`
      : null;

  if (state.phase !== 'question' || state.questionClosed) {
    stopFx('answering');
  }

  if (revealKey && live.host.lastRevealKey !== revealKey) {
    stopFx('answering');
    playFx('answered');
    live.host.lastRevealKey = revealKey;
  }

  if (projectorCorrectEl) {
    projectorCorrectEl.textContent = '';
  }

  live.host.lastPhase = state.phase;
  live.host.lastIndex = state.currentIndex;
  live.host.lastResponseCount = state.responseCount;
}

function renderHostQuestion(state) {
  const phase = state.phase;
  const question = state.question;
  const showReveal = phase === 'question' && !!state.questionClosed;

  if (!hostQuestionWrap || !hostQuestionPromptEl || !hostQuestionAnswersEl || !hostQuestionHintEl) return;

  if (phase !== 'question' || !question) {
    hostQuestionWrap.classList.add('hidden');
    hostQuestionPromptEl.textContent = '';
    hostQuestionAnswersEl.innerHTML = '';
    hostQuestionHintEl.textContent =
      phase === 'results' ? 'Game finished. Final ranking shown above.' : 'Question will appear here when game starts.';
    return;
  }

  hostQuestionWrap.classList.remove('hidden');
  hostQuestionPromptEl.textContent = question.prompt || '(No question text)';
  hostQuestionAnswersEl.innerHTML = '';

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const correctSet = new Set(Array.isArray(question.correctIndexes) ? question.correctIndexes : []);

    (question.answers || []).forEach((a, idx) => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      if (showReveal && correctSet.has(idx)) row.classList.add('answer-row-correct');

      const tag = document.createElement('strong');
      tag.textContent = `${idx + 1}.`;
      const txt = document.createElement('span');
      txt.textContent = a.text;
      row.append(tag, txt);
      hostQuestionAnswersEl.appendChild(row);
    });

    if (question.type === 'multi') {
      const hint = document.createElement('p');
      hint.className = 'small';
      hint.textContent = 'Students must select all correct answers.';
      hostQuestionAnswersEl.appendChild(hint);
    }

    hostQuestionHintEl.textContent = question.type === 'audio' ? 'Audio question.' : '';
    return;
  }

  if (question.type === 'text') {
    hostQuestionHintEl.textContent = showReveal ? '' : 'Type-answer question.';

    if (showReveal && state.correctAnswer) {
      const ans = document.createElement('div');
      ans.className = 'project-text-reveal';
      ans.textContent = state.correctAnswer;
      hostQuestionAnswersEl.appendChild(ans);
    }
    return;
  }

  if (question.type === 'open' || question.type === 'image_open') {
    hostQuestionHintEl.textContent = 'Open short answer: grade live answers below.';

    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      preview.appendChild(img);
      hostQuestionAnswersEl.appendChild(preview);
    }

    const list = Array.isArray(state.openResponses) ? state.openResponses : [];
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No student answers yet.';
      hostQuestionAnswersEl.appendChild(p);
      return;
    }

    list.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'row spread gap';
      row.style.border = '1px solid var(--line)';
      row.style.borderRadius = '.5rem';
      row.style.padding = '.4rem .5rem';

      const text = document.createElement('span');
      text.textContent = `${r.name}: ${r.answer}`;

      const gradeBtn = document.createElement('button');
      gradeBtn.className = 'btn';
      gradeBtn.textContent = r.graded ? `Regrade (${r.pointsAwarded})` : 'Grade';
      gradeBtn.addEventListener('click', () => gradeOpenAnswer(r.playerId, r.pointsAwarded));

      row.append(text, gradeBtn);
      hostQuestionAnswersEl.appendChild(row);
    });
    return;
  }

  if (question.type === 'context_gap') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Expected: ${state.correctAnswer}` : 'Context gap fill.';
    return;
  }

  if (question.type === 'match_pairs') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Expected pairs: ${state.correctAnswer}` : 'Match pairs question.';
    return;
  }

  if (question.type === 'error_hunt') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Corrected: ${state.correctAnswer}` : 'Error hunt: click wrong token(s), rewrite sentence.';
    return;
  }

  if (question.type === 'puzzle') {
    hostQuestionHintEl.textContent = 'Puzzle question.';
    if (question.options?.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = `Items: ${question.options.join(' • ')}`;
      hostQuestionAnswersEl.appendChild(p);
    }
    return;
  }

  if (question.type === 'slider') {
    hostQuestionHintEl.textContent = `Slider range: ${question.min} to ${question.max}${question.unit ? ` ${question.unit}` : ''}`;
    return;
  }

  if (question.type === 'pin') {
    hostQuestionHintEl.textContent = showReveal ? 'Correct zone highlighted.' : 'Pin answer question.';
    if (question.imageData) {
      const wrap = document.createElement('div');
      wrap.className = 'pin-preview';
      wrap.style.maxWidth = '680px';
      wrap.style.margin = '0 auto';

      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Pin question image';

      wrap.appendChild(img);

      if (showReveal && question.zone) {
        const zone = document.createElement('div');
        zone.className = 'pin-zone';
        zone.style.left = `${Number(question.zone.x || 50)}%`;
        zone.style.top = `${Number(question.zone.y || 50)}%`;
        zone.style.width = `${Math.max(2, Number(question.zone.r || 15) * 2)}%`;
        zone.style.height = `${Math.max(2, Number(question.zone.r || 15) * 2)}%`;
        wrap.appendChild(zone);
      }

      hostQuestionAnswersEl.appendChild(wrap);
    }
    return;
  }

  hostQuestionHintEl.textContent = '';
}

function renderProjectorScores(players) {
  if (!projectorScoresEl) return;
  projectorScoresEl.innerHTML = '';

  if (!players.length) {
    const li = document.createElement('li');
    li.textContent = 'No players yet.';
    projectorScoresEl.appendChild(li);
    return;
  }

  players.slice(0, 10).forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${p.name} - ${p.score} pts`;
    projectorScoresEl.appendChild(li);
  });
}

function renderReactionPop(reactions) {
  if (!Array.isArray(reactions) || !reactions.length) return;

  reactions.forEach((r) => {
    const emoji = String(r?.emoji || '').trim();
    if (!emoji) return;

    const key = `${r.playerId || 'p'}:${r.at || 0}:${emoji}`;
    if (live.host.seenReactionKeys.has(key)) return;
    live.host.seenReactionKeys.add(key);

    [liveReactionsEl, projectorReactionsEl].forEach((container) => {
      if (!container) return;
      const pop = document.createElement('span');
      pop.className = 'reaction-pop-item';
      pop.textContent = emoji;
      pop.style.left = `${Math.round(10 + Math.random() * 80)}%`;
      pop.style.animationDelay = `${Math.round(Math.random() * 120)}ms`;
      container.appendChild(pop);
      setTimeout(() => pop.remove(), 1800);
    });
  });
}

function updateHostTimer(state) {
  if (!projectorTimerEl) return;

  if (state.phase !== 'question' || !state.question) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = 'Time: -';
    return;
  }

  if (state.questionClosed) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = Number(state.currentIndex || 0);
    live.host.timerStartedAtMs = Number(state.questionStartedAt || 0) || null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = 'Time: 0s';
    return;
  }

  const questionIndex = Number(state.currentIndex || 0);
  const limitSec = Math.max(1, Number(state.question.timeLimit || 20));
  const startedAt = Number(state.questionStartedAt || Date.now());

  const deadlineFromState = Number(state.questionDeadlineAt || 0);
  const computedDeadline = startedAt + limitSec * 1000;
  const deadlineMs = Number.isFinite(deadlineFromState) && deadlineFromState > 0 ? deadlineFromState : computedDeadline;

  if (live.host.timerForIndex !== questionIndex || live.host.timerStartedAtMs !== startedAt) {
    live.host.timerDeadlineMs = deadlineMs;
    live.host.timerForIndex = questionIndex;
    live.host.timerStartedAtMs = startedAt;
    startHostTimerTicker();
  }

  const capMs = limitSec * 1000;
  const remainingMsRaw = Math.max(0, Number(live.host.timerDeadlineMs || Date.now()) - Date.now());
  const remainingMs = Math.min(capMs, remainingMsRaw);
  const remaining = Math.ceil(remainingMs / 1000);
  projectorTimerEl.textContent = `Time: ${remaining}s`;
}

function startHostTimerTicker() {
  stopHostTimerTicker();
  live.host.timerTicker = setInterval(() => {
    if (!projectorTimerEl) return;

    const state = live.host.state;
    const limitSec = Math.max(1, Number(state?.question?.timeLimit || 20));
    const capMs = limitSec * 1000;
    const startedAt = Number(live.host.timerStartedAtMs || state?.questionStartedAt || 0);

    let remainingMsRaw;
    if (live.host.timerDeadlineMs) {
      remainingMsRaw = Math.max(0, Number(live.host.timerDeadlineMs) - Date.now());
    } else if (startedAt > 0) {
      const expectedDeadline = startedAt + capMs;
      remainingMsRaw = Math.max(0, expectedDeadline - Date.now());
    } else {
      remainingMsRaw = capMs;
    }

    const remainingMs = Math.min(capMs, remainingMsRaw);
    const remaining = Math.ceil(remainingMs / 1000);
    projectorTimerEl.textContent = `Time: ${remaining}s`;
  }, 250);
}

function stopHostTimerTicker() {
  if (live.host.timerTicker) clearInterval(live.host.timerTicker);
  live.host.timerTicker = null;
}

function toggleProjectorFullscreen() {
  const target = hostQuestionWrap?.closest('.card') || document.getElementById('hostQuestionCard');
  if (!target) return;

  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    target.requestFullscreen?.().catch(() => {});
  }
}

function syncFullscreenButtonLabel() {
  if (!projectorFullscreenBtn) return;
  projectorFullscreenBtn.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
}

function updateHallScene(state) {
  if (!hallCardEl || !hallHintEl) return;

  if (state.phase === 'lobby') {
    hallCardEl.classList.add('hall-live');
    hallHintEl.textContent = `Players joined: ${state.playerCount}. Waiting for teacher to start.`;
    playHallMusic();
    return;
  }

  hallCardEl.classList.remove('hall-live');
  stopHallMusic();

  if (state.phase === 'question') {
    hallHintEl.textContent = 'Question in progress.';
  } else if (state.phase === 'results') {
    hallHintEl.textContent = 'Game finished.';
  } else {
    hallHintEl.textContent = 'Create a live game to open the hall.';
  }
}

function playHallMusic() {
  if (!live.host.isPrimaryAudioHost) return;
  if (!audioFx.hall) return;
  if (!audioFx.hall.paused) return;
  audioFx.hall.currentTime = 0;
  audioFx.hall.play().catch(() => {});
}

function stopHallMusic() {
  if (!audioFx.hall) return;
  audioFx.hall.pause();
}

function playFx(name) {
  if (!live.host.isPrimaryAudioHost) return;
  const a = audioFx[name];
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {
    // ignore missing files or autoplay errors
  }
}

function stopFx(name) {
  const a = audioFx[name];
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
  } catch {
    // ignore
  }
}

function animatePulse(el) {
  if (!el) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
}

function startHostPolling() {
  stopHostPolling();
  live.host.pollTimer = setInterval(pollHostState, 1000);
}

function stopHostPolling() {
  if (live.host.pollTimer) clearInterval(live.host.pollTimer);
  live.host.pollTimer = null;
  live.host.state = null;
  live.host.timerStartedAtMs = null;
  stopHostTimerTicker();
}
async function joinLiveGame() {
  try {
    const pin = String(joinPinEl.value || '').trim();
    const name = String(joinNameEl.value || '').trim() || 'Student';
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

    const data = await api('/api/join', {
      method: 'POST',
      body: { pin, name },
    });

    live.player.pin = pin;
    live.player.id = data.playerId;
    live.player.token = data.playerToken;
    live.player.renderKey = null;
    live.player.submittedForIndex = null;
    live.player.currentQuestion = null;
    live.player.pinSelection = null;

    setStatus(joinStatusEl, `Joined as ${data.name || name} ✅`, 'ok');
    startPlayerPolling();
    await pollPlayerState();
  } catch (err) {
    setStatus(joinStatusEl, err.message, 'bad');
  }
}

async function pollPlayerState() {
  if (!live.player.pin || !live.player.id || !live.player.token) return;

  try {
    const data = await api(
      `/api/player/state?pin=${encodeURIComponent(live.player.pin)}&playerId=${encodeURIComponent(live.player.id)}`,
      {
        method: 'GET',
        headers: { 'X-Player-Token': live.player.token },
      },
    );

    renderPlayerState(data);
  } catch (err) {
    setStatus(joinStatusEl, `Join poll failed: ${err.message}`, 'bad');
    stopPlayerPolling();
  }
}

function renderPlayerState(state) {
  joinProgressEl.textContent = `Question ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  joinScoreEl.textContent = `Score: ${state.score}`;

  if (state.phase !== 'question' || !state.question) {
    joinQuestionWrap.classList.add('hidden');

    if (state.phase === 'lobby') {
      setStatus(joinStatusEl, 'Waiting for teacher to start…', 'ok');
    } else if (state.phase === 'results') {
      setStatus(joinStatusEl, 'Game finished 🎉', 'ok');
      renderLeaderboardInJoin(state.leaderboard || []);
    }
    return;
  }

  joinQuestionWrap.classList.remove('hidden');

  const key = `${state.phase}:${state.currentIndex}`;
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    renderJoinQuestion(state.question);
    setStatus(joinFeedbackEl, '', '');
  }

  const questionClosed = !!state.questionClosed;
  joinSubmitBtn.disabled = questionClosed || state.answeredCurrent || live.player.submittedForIndex === state.currentIndex;

  if (questionClosed) {
    setStatus(joinFeedbackEl, 'Time is up. Waiting for next question…', 'ok');
    setStatus(joinStatusEl, 'Question closed.', 'ok');
  } else if (joinSubmitBtn.disabled) {
    setStatus(joinFeedbackEl, 'Answer submitted. Waiting for next question…', 'ok');
    setStatus(joinStatusEl, 'Answer received.', 'ok');
  } else {
    setStatus(joinStatusEl, 'Question live!', 'ok');
  }
}

function renderJoinQuestion(question) {
  joinPromptEl.textContent = question.prompt || '(No question text)';
  joinAnswersEl.innerHTML = '';

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const isMulti = question.type === 'multi';

    question.answers.forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      if (!isMulti) input.name = 'join-answer';
      input.value = String(idx);
      input.dataset.joinAnswer = '1';

      const text = document.createElement('span');
      text.textContent = a.text;

      row.append(input, text);
      joinAnswersEl.appendChild(row);
    });

    if (question.type === 'multi') {
      const hint = document.createElement('p');
      hint.className = 'small';
      hint.textContent = 'Select all correct answers.';
      joinAnswersEl.appendChild(hint);
    }

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
      playQuestionAudio(question);
    }
    return;
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'context_gap' || question.type === 'error_hunt') {
    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      preview.appendChild(img);
      joinAnswersEl.appendChild(preview);
    }

      if (question.type === 'context_gap') {
      const count = Math.max(2, Math.min(4, Number(question.gapCount || 2)));
      renderInlineContextGapInputs(joinAnswersEl, question.prompt, count, 'joinGap');
    } else if (question.type === 'error_hunt') {
      const required = Math.max(1, Number(question.requiredErrors || countErrorHuntRequiredTokens(question.prompt, question.corrected)));
      const info = document.createElement('p');
      info.className = 'small';
      info.textContent = `Find ${required} wrong token(s), then rewrite.`;
      joinAnswersEl.appendChild(info);

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'row gap';
      tokenWrap.style.flexWrap = 'wrap';
      const tokens = String(question.prompt || '').split(/\s+/).filter(Boolean);
      tokens.forEach((tok, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn error-token-chip';
        b.dataset.errorToken = String(i);
        b.dataset.tokenText = tok;
        b.textContent = tok;
        b.addEventListener('click', () => {
          const isActive = b.classList.contains('active');
          if (isActive) {
            b.classList.remove('active');
            return;
          }
          const activeCount = tokenWrap.querySelectorAll('[data-error-token].active').length;
          if (activeCount >= required) return;
          b.classList.add('active');
        });
        tokenWrap.appendChild(b);
      });
      joinAnswersEl.appendChild(tokenWrap);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinErrorRewrite';
      input.maxLength = 160;
      input.placeholder = 'Rewrite the corrected sentence';
      input.className = 'top-space';
      input.addEventListener('input', () => { input.dataset.fromTokens = '0'; });
      joinAnswersEl.appendChild(input);
      enableInlineErrorTokenEditing(tokenWrap, '[data-error-token]', input);
    } else if (question.type === 'match_pairs') {
      const leftItems = Array.isArray(question.leftItems) ? question.leftItems : [];
      const rightOptions = Array.isArray(question.rightOptions) ? question.rightOptions : [];
      leftItems.forEach((left, i) => {
        const row = document.createElement('div');
        row.className = 'row gap';
        const label = document.createElement('span');
        label.className = 'small';
        label.textContent = left;
        const select = document.createElement('select');
        select.dataset.joinPair = String(i);
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'Choose...';
        select.appendChild(empty);
        rightOptions.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        });
        row.append(label, select);
        joinAnswersEl.appendChild(row);
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinTextAnswer';
      input.maxLength = 120;
      input.placeholder = (question.type === 'open' || question.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';
      joinAnswersEl.appendChild(input);
    }

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
      playQuestionAudio(question);
    }
    return;
  }

  if (question.type === 'puzzle') {
    const options = (question.options || []).slice(0, 9);
    createPuzzleDnd(joinAnswersEl, options, 'joinPuzzlePieces');

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
      playQuestionAudio(question);
    }
    return;
  }

  if (question.type === 'slider') {
    const wrap = document.createElement('div');

    const value = Number(question.min || 0);
    wrap.innerHTML = `
      <p class="small">Range: ${question.min} to ${question.max}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}</p>
      <input id="joinSlider" type="range" min="${question.min}" max="${question.max}" step="1" value="${value}" />
      <p id="joinSliderValue" class="small">Selected: ${value}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}</p>
    `;
    joinAnswersEl.appendChild(wrap);

    const slider = document.getElementById('joinSlider');
    const out = document.getElementById('joinSliderValue');
    slider.addEventListener('input', () => {
      out.textContent = `Selected: ${slider.value}${question.unit ? ` ${question.unit}` : ''}`;
    });
    return;
  }

  if (question.type === 'pin') {
    if (!question.imageData) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No image set for this question.';
      joinAnswersEl.appendChild(p);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';
    wrap.dataset.livePinSelect = 'join';

    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Pin question image';

    const dot = document.createElement('div');
    dot.className = 'pin-dot hidden';

    wrap.append(img, dot);
    joinAnswersEl.appendChild(wrap);

    attachPinPicker(wrap, (point) => {
      live.player.pinSelection = point;
      dot.classList.remove('hidden');
      dot.style.left = `${point.x}%`;
      dot.style.top = `${point.y}%`;
    });

    return;
  }
}

async function submitLiveAnswer() {
  try {
    if (!live.player.pin || !live.player.id || !live.player.token) throw new Error('Join first.');

    const answer = readJoinAnswer();
    if (answer === null || answer === '') throw new Error('Choose/type an answer first.');

    const data = await api('/api/answer', {
      method: 'POST',
      headers: { 'X-Player-Token': live.player.token },
      body: {
        pin: live.player.pin,
        playerId: live.player.id,
        answer,
      },
    });

    live.player.submittedForIndex = data.currentIndex;
    joinSubmitBtn.disabled = true;

    if (data.correct) {
      setStatus(joinFeedbackEl, `Correct ✅ (+${data.pointsAwarded})`, 'ok');
    } else {
      setStatus(joinFeedbackEl, 'Not correct ❌', 'bad');
    }

    joinScoreEl.textContent = `Score: ${data.score}`;
  } catch (err) {
    const msg = String(err?.message || 'Could not submit answer.');
    if (msg.includes('Question is closed') || msg.includes('Question is not active')) {
      setStatus(joinFeedbackEl, 'Question is closed. Waiting for next one…', 'ok');
      if (joinSubmitBtn) joinSubmitBtn.disabled = true;
      return;
    }
    setStatus(joinFeedbackEl, msg, 'bad');
  }
}

function readJoinAnswer() {
  const q = live.player.currentQuestion;
  if (!q) return null;

  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const checked = joinAnswersEl.querySelector('input[name="join-answer"]:checked');
    return checked ? Number(checked.value) : null;
  }

  if (q.type === 'multi') {
    const selected = [...joinAnswersEl.querySelectorAll('input[data-join-answer]:checked')].map((el) => Number(el.value));
    return selected.length ? selected : null;
  }

  if (q.type === 'text' || q.type === 'open' || q.type === 'image_open') {
    const text = document.getElementById('joinTextAnswer');
    return text ? text.value : '';
  }

  if (q.type === 'context_gap') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-gap]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'error_hunt') {
    const rewrite = String(document.getElementById('joinErrorRewrite')?.value || '').trim();
    if (!rewrite) return null;
    const selected = [...joinAnswersEl.querySelectorAll('[data-error-token].active')].map((el) => Number(el.dataset.errorToken));
    const required = Math.max(1, Number(q.requiredErrors || countErrorHuntRequiredTokens(q.prompt, q.corrected)));
    if (selected.length !== required) return null;
    return { rewrite, selectedTokens: selected };
  }

  if (q.type === 'match_pairs') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-pair]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'puzzle') {
    const pieces = [...joinAnswersEl.querySelectorAll('[data-puzzle-piece]')].map((el) => String(el.dataset.puzzlePiece || '').trim()).filter(Boolean);
    return pieces.length ? pieces : null;
  }

  if (q.type === 'slider') {
    const slider = document.getElementById('joinSlider');
    if (!slider) return null;
    return Number(slider.value);
  }

  if (q.type === 'pin') {
    return live.player.pinSelection;
  }

  return null;
}

function startPlayerPolling() {
  stopPlayerPolling();
  live.player.pollTimer = setInterval(pollPlayerState, 2000);
}

function stopPlayerPolling() {
  if (live.player.pollTimer) clearInterval(live.player.pollTimer);
  live.player.pollTimer = null;
}

function renderLeaderboardInJoin(leaderboard) {
  joinQuestionWrap.classList.add('hidden');
  joinAnswersEl.innerHTML = '';
  joinPromptEl.textContent = '';

  if (!leaderboard?.length) return;

  const ul = document.createElement('ul');
  ul.className = 'list';

  leaderboard.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${p.name} — ${p.score} pts`;
    ul.appendChild(li);
  });

  joinAnswersEl.appendChild(ul);
}

function ensureHostReady() {
  if (!live.host.pin || !live.host.token) throw new Error('Create a live game first.');
}

// ---------- Solo mode ----------
function bindSoloEvents() {
  if (!startBtn || !submitBtn || !nextBtn || !playAgainBtn || !lobbyCard || !gameCard || !resultCard) {
    return;
  }

  startBtn.addEventListener('click', () => {
    syncQuizFromUI();
    if (!quiz.title?.trim()) return alert('Add a quiz title first.');
    if (!quiz.questions.length) return alert('Add at least 1 question.');

    soloGame = {
      student: studentNameEl.value.trim() || 'Student',
      index: 0,
      score: 0,
      answered: false,
      pinSelection: null,
      puzzleOptions: null,
    };

    lobbyCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    gameCard.classList.remove('hidden');
    renderSoloQuestion();
  });

  submitBtn.addEventListener('click', () => {
    if (!soloGame || soloGame.answered) return;

    const q = quiz.questions[soloGame.index];
    const result = evaluateSoloQuestion(q);

    if (result.correct) {
      soloGame.score += Number(q.points || 1000);
      setStatus(feedbackEl, 'Correct ✅', 'ok');
    } else {
      setStatus(feedbackEl, `Not quite ❌ ${result.hint || ''}`.trim(), 'bad');
    }

    soloGame.answered = true;
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    scoreEl.textContent = `Score: ${soloGame.score}`;
  });

  nextBtn.addEventListener('click', () => {
    if (!soloGame) return;
    soloGame.index += 1;
    soloGame.answered = false;

    if (soloGame.index >= quiz.questions.length) {
      finishSoloGame();
      return;
    }

    renderSoloQuestion();
  });

  playAgainBtn.addEventListener('click', () => {
    soloGame = null;
    resultCard.classList.add('hidden');
    gameCard.classList.add('hidden');
    lobbyCard.classList.remove('hidden');
    refreshLocalPin();
  });
}

function renderSoloQuestion() {
  const q = quiz.questions[soloGame.index];
  progressEl.textContent = `Question ${soloGame.index + 1} / ${quiz.questions.length}`;
  scoreEl.textContent = `Score: ${soloGame.score}`;
  qPromptEl.textContent = q.prompt || '(No question text)';

  soloGame.pinSelection = null;
  soloGame.puzzleOptions = null;

  setStatus(feedbackEl, '', '');
  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');

  answersEl.innerHTML = '';

  if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
    const isMulti = q.type === 'multi';

    (q.answers || []).forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      if (!isMulti) input.name = 'solo-answer';
      input.value = String(idx);
      input.dataset.soloAnswer = '1';

      const text = document.createElement('span');
      text.textContent = a.text || '(blank)';

      row.append(input, text);
      answersEl.appendChild(row);
    });

    if (q.type === 'multi') {
      const hint = document.createElement('p');
      hint.className = 'small';
      hint.textContent = 'Select all correct answers.';
      answersEl.appendChild(hint);
    }

    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'text' || q.type === 'open' || q.type === 'image_open' || q.type === 'context_gap' || q.type === 'error_hunt') {
    if (q.type === 'image_open' && q.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview';
      const img = document.createElement('img');
      img.src = q.imageData;
      img.alt = 'Image prompt';
      preview.appendChild(img);
      answersEl.appendChild(preview);
    }

    if (q.type === 'context_gap') {
      const count = Math.max(2, Math.min(4, Number((q.gaps || []).filter(Boolean).length || 2)));
      renderInlineContextGapInputs(answersEl, q.prompt, count, 'soloGap');
    } else if (q.type === 'error_hunt') {
      const required = Math.max(1, Number(q.requiredErrors || countErrorHuntRequiredTokens(q.prompt, q.corrected)));
      const info = document.createElement('p');
      info.className = 'small';
      info.textContent = `Find ${required} wrong token(s), then rewrite.`;
      answersEl.appendChild(info);

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'row gap';
      tokenWrap.style.flexWrap = 'wrap';
      const tokens = String(q.prompt || '').split(/\s+/).filter(Boolean);
      tokens.forEach((tok, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn error-token-chip';
        b.dataset.soloErrorToken = String(i);
        b.dataset.tokenText = tok;
        b.textContent = tok;
        b.addEventListener('click', () => {
          const isActive = b.classList.contains('active');
          if (isActive) {
            b.classList.remove('active');
            return;
          }
          const activeCount = tokenWrap.querySelectorAll('[data-solo-error-token].active').length;
          if (activeCount >= required) return;
          b.classList.add('active');
        });
        tokenWrap.appendChild(b);
      });
      answersEl.appendChild(tokenWrap);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'soloErrorRewrite';
      input.maxLength = 160;
      input.placeholder = 'Rewrite the corrected sentence';
      input.className = 'top-space';
      input.addEventListener('input', () => { input.dataset.fromTokens = '0'; });
      answersEl.appendChild(input);
      enableInlineErrorTokenEditing(tokenWrap, '[data-solo-error-token]', input);
    } else if (q.type === 'match_pairs') {
      const leftItems = (q.pairs || []).map((p) => String(p.left || '').trim()).filter(Boolean);
      const rightOptions = shuffle((q.pairs || []).map((p) => String(p.right || '').trim()).filter(Boolean));
      leftItems.forEach((left, i) => {
        const row = document.createElement('div');
        row.className = 'row gap';
        const label = document.createElement('span');
        label.className = 'small';
        label.textContent = left;
        const select = document.createElement('select');
        select.dataset.soloPair = String(i);
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'Choose...';
        select.appendChild(empty);
        rightOptions.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        });
        row.append(label, select);
        answersEl.appendChild(row);
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'soloTextAnswer';
      input.maxLength = 120;
      input.placeholder = (q.type === 'open' || q.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';
      answersEl.appendChild(input);
    }

    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'puzzle') {
    const options = (q.options || shuffle([...(q.items || []).filter(Boolean)])).slice(0, 9);
    soloGame.puzzleOptions = options;
    createPuzzleDnd(answersEl, options, 'soloPuzzlePieces');

    if (hasQuestionAudio(q)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '? Play audio';
      btn.addEventListener('click', () => playQuestionAudio(q));
      answersEl.appendChild(btn);
      playQuestionAudio(q);
    }
    return;
  }

  if (q.type === 'slider') {
    const wrap = document.createElement('div');
    const value = Number(q.min || 0);
    wrap.innerHTML = `
      <p class="small">Range: ${q.min} to ${q.max}${q.unit ? ` ${escapeHtml(q.unit)}` : ''}</p>
      <input id="soloSlider" type="range" min="${q.min}" max="${q.max}" step="1" value="${value}" />
      <p id="soloSliderValue" class="small">Selected: ${value}${q.unit ? ` ${escapeHtml(q.unit)}` : ''}</p>
    `;
    answersEl.appendChild(wrap);

    const slider = document.getElementById('soloSlider');
    const out = document.getElementById('soloSliderValue');
    slider.addEventListener('input', () => {
      out.textContent = `Selected: ${slider.value}${q.unit ? ` ${q.unit}` : ''}`;
    });
    return;
  }

  if (q.type === 'pin') {
    if (!q.imageData) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No image set for this question.';
      answersEl.appendChild(p);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';

    const img = document.createElement('img');
    img.src = q.imageData;
    img.alt = 'Pin question image';

    const dot = document.createElement('div');
    dot.className = 'pin-dot hidden';

    wrap.append(img, dot);
    answersEl.appendChild(wrap);

    attachPinPicker(wrap, (point) => {
      soloGame.pinSelection = point;
      dot.classList.remove('hidden');
      dot.style.left = `${point.x}%`;
      dot.style.top = `${point.y}%`;
    });
  }
}
function evaluateSoloQuestion(q) {
  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const checked = answersEl.querySelector('input[name="solo-answer"]:checked');
    if (!checked) return { correct: false, hint: 'Select an answer first.' };

    const selected = Number(checked.value);
    const correctIndex = (q.answers || []).findIndex((a) => !!a.correct);
    return { correct: selected === correctIndex };
  }

  if (q.type === 'multi') {
    const selected = [...answersEl.querySelectorAll('input[data-solo-answer]:checked')].map((el) => Number(el.value));
    if (!selected.length) return { correct: false, hint: 'Select at least one answer.' };

    const expected = (q.answers || [])
      .map((a, idx) => (a.correct ? idx : null))
      .filter((x) => x !== null);

    const sameLength = selected.length === expected.length;
    const sameSet = sameLength && selected.every((idx) => expected.includes(idx));
    return { correct: sameSet, hint: sameSet ? '' : 'You must select all correct answers (and no wrong ones).' };
  }

  if (q.type === 'text') {
    const val = document.getElementById('soloTextAnswer')?.value || '';
    const guess = normalizeTextAnswer(val);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);

    if (!accepted.length) return { correct: false, hint: 'No accepted answers set.' };
    return { correct: accepted.includes(guess), hint: `Accepted: ${accepted.slice(0, 2).join(' / ')}` };
  }

  if (q.type === 'open' || q.type === 'image_open') {
    const val = String(document.getElementById('soloTextAnswer')?.value || '').trim();
    if (!val) return { correct: false, hint: 'Type an answer first.' };
    return { correct: false, hint: 'Open answer needs teacher grading in live mode.' };
  }

  if (q.type === 'context_gap') {
    const guess = [...answersEl.querySelectorAll('[data-solo-gap]')].map((el) => normalizeTextAnswer(el.value)).filter(Boolean);
    const expected = (q.gaps || []).map(normalizeTextAnswer).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false, hint: 'Complete all blanks.' };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected), hint: `Expected: ${expected.join(' | ')}` };
  }

  if (q.type === 'match_pairs') {
    const guess = [...answersEl.querySelectorAll('[data-solo-pair]')].map((el) => normalizeTextAnswer(el.value)).filter(Boolean);
    const expected = (q.pairs || []).map((p) => normalizeTextAnswer(p.right)).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false, hint: 'Match all pairs first.' };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected), hint: `Expected: ${expected.join(' | ')}` };
  }

  if (q.type === 'error_hunt') {
    const rewrite = String(document.getElementById('soloErrorRewrite')?.value || '').trim();
    if (!rewrite) return { correct: false, hint: 'Rewrite the sentence first.' };
    const selected = [...answersEl.querySelectorAll('[data-solo-error-token].active')];
    const required = Math.max(1, Number(q.requiredErrors || countErrorHuntRequiredTokens(q.prompt, q.corrected)));
    if (selected.length !== required) return { correct: false, hint: `Select exactly ${required} token(s).` };
    return { correct: normalizeTextAnswer(rewrite) === normalizeTextAnswer(q.corrected || ''), hint: `Corrected: ${q.corrected || ''}` };
  }

  if (q.type === 'puzzle') {
    const pieces = [...answersEl.querySelectorAll('[data-puzzle-piece]')].map((el) => String(el.dataset.puzzlePiece || '').trim()).filter(Boolean);
    if (!pieces.length) return { correct: false, hint: 'Arrange the pieces first.' };

    const expected = (q.items || []).map(normalizeTextAnswer).filter(Boolean);
    const got = pieces.map(normalizeTextAnswer);
    return { correct: JSON.stringify(expected) === JSON.stringify(got) };
  }

  if (q.type === 'slider') {
    const slider = document.getElementById('soloSlider');
    if (!slider) return { correct: false, hint: 'Move the slider first.' };

    const value = Number(slider.value);
    const tol = sliderTolerance(q.margin, q.min, q.max);
    const diff = Math.abs(value - Number(q.target));
    const ok = diff <= tol;
    return {
      correct: ok,
      hint: ok ? '' : `Correct around ${q.target}${q.unit ? ` ${q.unit}` : ''} (±${round(tol, 2)})`,
    };
  }

  if (q.type === 'pin') {
    if (!soloGame.pinSelection) return { correct: false, hint: 'Tap/click the image first.' };
    const zone = q.zone || { x: 50, y: 50, r: 15 };
    const d = distance2D(soloGame.pinSelection.x, soloGame.pinSelection.y, zone.x, zone.y);
    const ok = d <= zone.r;
    return { correct: ok, hint: ok ? '' : 'Try closer to the target area.' };
  }

  return { correct: false };
}

function finishSoloGame() {
  gameCard.classList.add('hidden');
  resultCard.classList.remove('hidden');

  const totalPossible = quiz.questions.reduce((sum, q) => sum + Number(q.points || 1000), 0);
  finalScoreEl.textContent = `${soloGame.student}, you scored ${soloGame.score} / ${totalPossible}.`;
}

function refreshLocalPin() {
  if (!pinValueEl) return;
  pinValueEl.textContent = String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- API ----------
async function api(path, opts = {}) {
  const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
  if (!base) throw new Error('Backend URL is not configured.');

  const method = opts.method || 'GET';
  const headers = {
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

// ---------- Data ----------
function createEmptyQuiz() {
  return {
    version: 1,
    title: '',
    questions: [],
  };
}

function makeMcqQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'mcq',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    answers: [
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ],
  };
}

function makeMultiQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'multi',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    answers: [
      { text: '', correct: true },
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
    ],
  };
}

function makeTfQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'tf',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    answers: [
      { text: 'True', correct: true },
      { text: 'False', correct: false },
    ],
  };
}

function makeTextQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    prompt: '',
    points: 1000,
    timeLimit: 30,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    accepted: ['', '', '', ''],
  };
}

function makeOpenQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'open',
    prompt: '',
    points: 1000,
    timeLimit: 45,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makeImageOpenQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'image_open',
    prompt: '',
    points: 1000,
    timeLimit: 60,
    imageData: '',
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makeContextGapQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'context_gap',
    prompt: 'Complete the paragraph: ...',
    points: 1000,
    timeLimit: 45,
    gaps: ['', '', '', ''],
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makeMatchPairsQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'match_pairs',
    prompt: 'Match each item with the correct pair.',
    points: 1000,
    timeLimit: 45,
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makeErrorHuntQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'error_hunt',
    prompt: 'She say that she go to school yesterday.',
    corrected: 'She said that she went to school yesterday.',
    points: 1000,
    timeLimit: 45,
    audioEnabled: false,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makePuzzleQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'puzzle',
    prompt: '',
    points: 1000,
    timeLimit: 30,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    items: Array.from({ length: 9 }, () => ''),
  };
}

function makeAudioQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'audio',
    prompt: '',
    audioEnabled: true,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
    points: 1000,
    timeLimit: 20,
    answers: [
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ],
  };
}

function makeSliderQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'slider',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    min: 0,
    max: 100,
    target: 50,
    margin: 'medium',
    unit: '',
  };
}

function makePinQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'pin',
    prompt: '',
    points: 1000,
    timeLimit: 30,
    imageData: '',
    zone: { x: 50, y: 50, r: 15 },
  };
}

function normalizeQuizForLive(raw) {
  const normalized = {
    version: 1,
    title: String(raw.title || '').slice(0, 120),
    questions: [],
  };

  (raw.questions || []).forEach((q) => {
    const base = {
      id: String(q.id || crypto.randomUUID()),
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 120),
      points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
      timeLimit: clamp(Number(q.timeLimit || 20), minTimeByType(q.type), 240),
      audioEnabled: !!q.audioEnabled || q.type === 'audio',
      audioMode: ['tts', 'file'].includes(String(q.audioMode || '')) ? String(q.audioMode) : 'tts',
      audioText: String(q.audioText || '').slice(0, 1000),
      language: String(q.language || 'en-US-Wave').slice(0, 32) || 'en-US-Wave',
      audioData: String(q.audioData || ''),
    };

    if (['mcq', 'multi', 'audio'].includes(q.type)) {
      const answers = (q.answers || [])
        .slice(0, 6)
        .map((a) => ({ text: String(a.text || '').slice(0, 75), correct: !!a.correct }))
        .filter((a) => a.text.trim().length > 0);
      if (answers.length < 2) return;

      if (q.type === 'multi') {
        let correctCount = answers.filter((a) => a.correct).length;
        if (correctCount < 2) {
          for (let i = 0; i < answers.length && correctCount < 2; i++) {
            if (!answers[i].correct) {
              answers[i].correct = true;
              correctCount++;
            }
          }
        }
      } else if (!answers.some((a) => a.correct)) {
        answers[0].correct = true;
      }

      normalized.questions.push({
        ...base,
        answers,
      });
      return;
    }

    if (q.type === 'tf') {
      const answers = [
        { text: 'True', correct: !!q.answers?.[0]?.correct },
        { text: 'False', correct: !!q.answers?.[1]?.correct },
      ];
      if (!answers.some((a) => a.correct)) answers[0].correct = true;
      normalized.questions.push({ ...base, answers });
      return;
    }

    if (q.type === 'text') {
      const accepted = (q.accepted || []).map((x) => String(x || '').slice(0, 20));
      normalized.questions.push({ ...base, accepted });
      return;
    }

    if (q.type === 'open') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'image_open') {
      if (!q.imageData) return;
      normalized.questions.push({ ...base, imageData: String(q.imageData || '') });
      return;
    }

    if (q.type === 'context_gap') {
      const gaps = (q.gaps || []).map((x) => String(x || '').slice(0, 20)).filter(Boolean).slice(0, 4);
      if (gaps.length < 2) return;
      normalized.questions.push({ ...base, gaps });
      return;
    }

    if (q.type === 'match_pairs') {
      const pairs = (q.pairs || [])
        .map((p) => ({ left: String(p?.left || '').slice(0, 40).trim(), right: String(p?.right || '').slice(0, 40).trim() }))
        .filter((p) => p.left && p.right)
        .slice(0, 6);
      if (pairs.length < 2) return;
      normalized.questions.push({ ...base, pairs });
      return;
    }

    if (q.type === 'error_hunt') {
      const corrected = String(q.corrected || '').slice(0, 160).trim();
      if (!corrected) return;
      normalized.questions.push({ ...base, corrected });
      return;
    }

    if (q.type === 'puzzle') {
      const items = (q.items || []).map((x) => String(x || '').slice(0, 75)).filter(Boolean).slice(0, 9);
      if (items.length < 3) return;
      normalized.questions.push({ ...base, items });
      return;
    }

    if (q.type === 'slider') {
      const min = Number(q.min ?? 0);
      const max = Number(q.max ?? 100);
      const fixedMin = Math.min(min, max);
      const fixedMax = Math.max(min, max);

      normalized.questions.push({
        ...base,
        min: fixedMin,
        max: fixedMax,
        target: clamp(Number(q.target ?? fixedMin), fixedMin, fixedMax),
        margin: ['none', 'low', 'medium', 'high', 'maximum'].includes(q.margin) ? q.margin : 'medium',
        unit: String(q.unit || '').slice(0, 20),
      });
      return;
    }

    if (q.type === 'pin') {
      if (!q.imageData) return;
      const zone = q.zone || {};
      normalized.questions.push({
        ...base,
        imageData: String(q.imageData || ''),
        zone: {
          x: round(clamp(Number(zone.x ?? 50), 0, 100), 1),
          y: round(clamp(Number(zone.y ?? 50), 0, 100), 1),
          r: round(clamp(Number(zone.r ?? 15), 1, 100), 1),
        },
      });
      return;
    }
  });

  if (!normalized.questions.length) {
    throw new Error('No valid questions for live game.');
  }

  return normalized;
}

function loadQuiz() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveQuiz(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadBackendUrl() {
  return localStorage.getItem(BACKEND_KEY) || '';
}

function saveBackendUrl(url) {
  localStorage.setItem(BACKEND_KEY, url);
}

// ---------- Helpers ----------
function createAudio(src, opts = {}) {
  try {
    const a = new Audio(src);
    a.loop = !!opts.loop;
    if (typeof opts.volume === 'number') a.volume = clamp(opts.volume, 0, 1);
    a.preload = 'auto';
    return a;
  } catch {
    return null;
  }
}

function setStatus(el, text, mode = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'feedback';
  if (mode === 'ok') el.classList.add('ok');
  if (mode === 'bad') el.classList.add('bad');
}

function setBackendStatus(text, mode = '') {
  if (!backendStatusEl) return;
  backendStatusEl.textContent = text;
  backendStatusEl.className = 'small';
  if (mode === 'ok') backendStatusEl.classList.add('ok');
  if (mode === 'bad') backendStatusEl.classList.add('bad');
}

function labelForType(type) {
  return (
    {
      mcq: 'Multiple choice',
      multi: 'Multi-select',
      tf: 'True / False',
      text: 'Type answer',
      open: 'Open short answer',
      image_open: 'Image prompt writing',
      context_gap: 'Context gap fill',
      match_pairs: 'Match pairs',
      error_hunt: 'Error hunt',
      puzzle: 'Puzzle',
      audio: 'Quiz + Audio',
      slider: 'Slider',
      pin: 'Pin answer',
    }[type] || type
  );
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'pin'].includes(type)) return 20;
  return 5;
}

function validateImportedQuiz(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON root.');
  if (!Array.isArray(data.questions)) throw new Error('Missing questions array.');
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function countErrorHuntRequiredTokens(prompt, corrected) {
  const source = tokenizeWords(prompt);
  const target = tokenizeWords(corrected);
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = normalizeTextAnswer(source[i - 1]) === normalizeTextAnswer(target[j - 1]);
      if (same) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return dp[source.length][target.length];
}

function renderInlineContextGapInputs(container, prompt, count, datasetKey) {
  const text = String(prompt || '').trim();
  const markerRe = /^(_{2,}|\[\s*\])$/;
  const parts = text ? text.split(/(\_{2,}|\[\s*\])/g).filter((x) => x !== '') : [];
  const hasMarkers = parts.some((part) => markerRe.test(String(part).trim()));

  const wrap = document.createElement('div');
  wrap.className = 'context-gap-inline';
  let blankIndex = 0;

  const addBlank = () => {
    if (blankIndex >= count) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = '____';
    input.className = 'context-gap-inline-input';
    input.dataset[datasetKey] = String(blankIndex);
    input.readOnly = true;
    input.addEventListener('click', () => {
      input.readOnly = false;
      input.focus();
    });
    input.addEventListener('focus', () => {
      input.readOnly = false;
    });
    input.addEventListener('blur', () => {
      if (!String(input.value || '').trim()) input.readOnly = true;
    });
    wrap.appendChild(input);
    blankIndex += 1;
  };

  if (hasMarkers) {
    parts.forEach((part) => {
      if (markerRe.test(String(part).trim()) && blankIndex < count) {
        addBlank();
      } else if (String(part).trim()) {
        const span = document.createElement('span');
        span.className = 'context-gap-word';
        span.textContent = part;
        wrap.appendChild(span);
      }
    });
  }

  while (blankIndex < count) addBlank();
  container.appendChild(wrap);
}

function enableInlineErrorTokenEditing(tokenWrap, tokenSelector, rewriteInput) {
  if (!tokenWrap) return;

  const syncRewriteFromTokens = () => {
    if (!rewriteInput) return;
    if (String(rewriteInput.dataset.fromTokens || '0') !== '1' && String(rewriteInput.value || '').trim()) return;
    const sentence = [...tokenWrap.querySelectorAll(tokenSelector)]
      .map((el) => String(el.dataset.tokenText || el.textContent || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    rewriteInput.value = sentence;
    rewriteInput.dataset.fromTokens = '1';
  };

  tokenWrap.querySelectorAll(tokenSelector).forEach((chip) => {
    chip.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (chip.dataset.editing === '1') return;

      const original = String(chip.dataset.tokenText || chip.textContent || '').trim();
      chip.dataset.editing = '1';
      chip.classList.add('editing');
      chip.innerHTML = '';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'error-token-editor';
      input.maxLength = 30;
      input.value = original;
      chip.appendChild(input);
      input.focus();
      input.select();

      const finish = (save) => {
        const next = save ? String(input.value || '').trim() : original;
        const text = next || original;
        chip.dataset.tokenText = text;
        chip.textContent = text;
        chip.dataset.editing = '0';
        chip.classList.remove('editing');
        if (save) syncRewriteFromTokens();
      };

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      });
      input.addEventListener('blur', () => finish(true), { once: true });
    });
  });
}

function normalizeBackendUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.origin;
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function distance2D(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function sliderTolerance(margin, min, max) {
  const range = Math.max(0, Number(max) - Number(min));
  const map = {
    none: 0,
    low: range * 0.05,
    medium: range * 0.1,
    high: range * 0.2,
    maximum: range,
  };
  return map[margin] ?? map.medium;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function supportsQuestionAudio(type) {
  return ['mcq', 'multi', 'tf', 'text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'slider', 'pin', 'audio'].includes(String(type || ''));
}

function hasQuestionAudio(question) {
  if (!question) return false;
  if (question.type === 'audio') return true;
  if (!supportsQuestionAudio(question.type)) return false;
  return !!question.audioEnabled;
}

function playQuestionAudio(question) {
  if (!hasQuestionAudio(question)) return;
  if (question.audioMode === 'file' && question.audioData) {
    try {
      const a = new Audio(question.audioData);
      a.play().catch(() => {});
    } catch {}
    return;
  }
  speakText(question.audioText || question.prompt || '', question.language || 'en-US-Wave');
}

function createPuzzleDnd(container, options, listId = 'puzzlePieces') {
  container.innerHTML = '';
  const hint = document.createElement('p');
  hint.className = 'small';
  hint.textContent = 'Drag pieces to reorder.';
  container.appendChild(hint);

  const list = document.createElement('div');
  list.className = 'answers-grid';
  list.dataset.puzzleList = listId;

  const items = [...options];
  let dragIndex = -1;

  items.forEach((text, index) => {
    const item = document.createElement('div');
    item.className = 'answer-row';
    item.draggable = true;
    item.dataset.puzzlePiece = String(text || '');
    item.dataset.puzzleIndex = String(index);
    item.style.cursor = 'grab';

    const handle = document.createElement('strong');
    handle.textContent = '?';
    const label = document.createElement('span');
    label.textContent = text;
    item.append(handle, label);

    item.addEventListener('dragstart', () => { dragIndex = index; item.style.opacity = '.5'; });
    item.addEventListener('dragend', () => { item.style.opacity = '1'; dragIndex = -1; });
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(dragIndex);
      const to = Number(item.dataset.puzzleIndex);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
      const arr = [...list.querySelectorAll('[data-puzzle-piece]')];
      const moved = arr[from];
      const target = arr[to];
      if (!moved || !target) return;
      if (from < to) list.insertBefore(moved, target.nextSibling);
      else list.insertBefore(moved, target);
      [...list.querySelectorAll('[data-puzzle-piece]')].forEach((el, i) => { el.dataset.puzzleIndex = String(i); });
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}
function speakText(text, lang = 'en-US-Wave') {
  const value = String(text || '').trim();
  if (!value || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = lang || 'en-US-Wave';
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech errors silently
  }
}

function attachPinPicker(container, onPick) {
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onPick({
      x: round(clamp(x, 0, 100), 1),
      y: round(clamp(y, 0, 100), 1),
    });
  });
}

function toSafeFilename(s) {
  return String(s || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Read error'));
    reader.readAsDataURL(file);
  });
}






