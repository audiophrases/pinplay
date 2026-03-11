const STORAGE_KEY = 'pinplay.quiz.v1';
const STORAGE_LIBRARY_KEY = 'pinplay.quiz.library.v1';
const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CREATE_UNLOCK_KEY = 'pinplay.create.unlocked.v1';
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
const addSpeakingBtn = document.getElementById('addSpeakingBtn');
const addImageOpenBtn = document.getElementById('addImageOpenBtn');
const addContextGapBtn = document.getElementById('addContextGapBtn');
const addMatchPairsBtn = document.getElementById('addMatchPairsBtn');
const addErrorHuntBtn = document.getElementById('addErrorHuntBtn');
const addPuzzleBtn = document.getElementById('addPuzzleBtn');
const addPuzzleAudioBtn = document.getElementById('addPuzzleAudioBtn');
const addSliderBtn = document.getElementById('addSliderBtn');
const addPinBtn = document.getElementById('addPinBtn');
const saveBtn = document.getElementById('saveBtn');
const openLocalBtn = document.getElementById('openLocalBtn');
const exportBtn = document.getElementById('exportBtn');
const publishDriveBtn = document.getElementById('publishDriveBtn');
const openDriveBtn = document.getElementById('openDriveBtn');
const importBtn = document.getElementById('importBtn');
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
const previewUnifiedBtn = document.getElementById('previewUnifiedBtn');
const previewRerollBtn = document.getElementById('previewRerollBtn');
const previewResimBtn = document.getElementById('previewResimBtn');
const previewJumpInputEl = document.getElementById('previewJumpInput');
const previewJumpBtn = document.getElementById('previewJumpBtn');
const previewExitBtn = document.getElementById('previewExitBtn');
const studentPreviewStackCardEl = document.getElementById('studentPreviewStackCard');
const studentPreviewSummaryEl = document.getElementById('studentPreviewSummary');
const studentPreviewStackEl = document.getElementById('studentPreviewStack');
const hostJoinPinEl = document.getElementById('hostJoinPin');
const hostJoinBtn = document.getElementById('hostJoinBtn');
const livePinEl = document.getElementById('livePin');
const livePhaseEl = document.getElementById('livePhase');
const liveProgressEl = document.getElementById('liveProgress');
const liveResponsesEl = document.getElementById('liveResponses');
const liveReactionsEl = document.getElementById('liveReactions');
const hostPlayersEl = document.getElementById('hostPlayers');
const hostAnswerHistoryEl = document.getElementById('hostAnswerHistory');
const hostStatusEl = document.getElementById('hostStatus');
const hostQuestionWrap = document.getElementById('hostQuestionWrap');
const hostQuestionPromptEl = document.getElementById('hostQuestionPrompt');
const hostQuestionAnswersEl = document.getElementById('hostQuestionAnswers');
const hostQuestionHintEl = document.getElementById('hostQuestionHint');
const randomNamesToggleEl = document.getElementById('randomNamesToggle');
const hallCardEl = document.getElementById('hallCard');
const hostQuestionCardEl = document.getElementById('hostQuestionCard');
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
collapseAllQuestions(quiz);
let soloGame = null;
let pendingScrollQuestionIndex = null;
let dragQuestionIndex = null;
let previewMode = {
  active: false,
  index: 0,
  showReveal: false,
  score: 0,
  answeredCurrent: false,
  revealedResult: null,
  simStudentCount: 10,
  simProfile: 'balanced',
  simTimingProfile: 'staggered',
  simTextQualityProfile: 'acceptable',
  simEdgeCaseProfile: 'none',
  simNames: [],
  simClassSeed: 0,
  simQuestionSeed: 0,
  simTeacherByQ: {},
  prevPrimaryAudioHost: null,
};

const hostTimerBarFill = ensureTimerProgressBar(hostQuestionCardEl, 'hostTimerBar');

const live = {
  host: {
    pin: null,
    token: null,
    pollTimer: null,
    timerTicker: null,
    timerDeadlineMs: null,
    timerForIndex: null,
    timerStartedAtMs: null,
    timerLimitSec: null,
    timerAnchorAtMs: null,
    timerInitialRemainingMs: null,
    isPrimaryAudioHost: false,
    lastPhase: null,
    lastIndex: null,
    lastResponseCount: 0,
    lastAllAnsweredKey: null,
    lastRevealKey: null,
    lastQuestionRenderKey: null,
    state: null,
    pollViewMode: 'bar',
    rankingMode: false,
    rankingAnimStartAt: 0,
    rankingAnimDurationMs: 3800,
    rankingAnimFrom: {},
    rankingAnimTo: {},
    rankingAnimRafId: null,
    lastScoresByPlayer: {},
    currentAnsweringFx: null,
    lastAnsweringFxIndex: -1,
    seenReactionKeys: new Set(),
    lastHostAudioKey: null,
    finalRevealKey: null,
    finalRevealStartedAt: 0,
    finalRevealStagePlayed: {
      third: false,
      second: false,
      drumroll: false,
      winner: false,
    },
    questionIntroKey: null,
    questionIntroStartedAt: 0,
    questionIntroDone: false,
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
    pinSelections: [],
  },
};

const answeringFxPool = [
  '../music/answering.mp3',
  ...Array.from({ length: 10 }, (_, i) => `../music/answering${i + 2}.mp3`),
].map((src) => createAudio(src, { loop: true, volume: 0.7 }));

const audioFx = {
  hall: createAudio('../music/hall.mp3', { loop: true, volume: 0.35 }),
  answered: createAudio('../music/answered.mp3', { loop: false, volume: 1 }),
  counter: createAudio('../music/counter.mp3', { loop: true, volume: 1 }),
  drumrollwinner: createAudio('../music/drumrollwinner.mp3', { loop: false, volume: 1 }),
  final: createAudio('../music/final.mp3', { loop: false, volume: 1 }),
};

init();

function init() {
  setupImageLightbox();
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
  let pendingDeadAcute = false;

  const unlock = async () => {
    try {
      let value = String(createPasswordEl?.value || '');
      if (pendingDeadAcute && value && !value.endsWith('´')) {
        value += '´';
        if (createPasswordEl) createPasswordEl.value = value;
      }
      pendingDeadAcute = false;
      if (!value) {
        setStatus(createAuthStatusEl, 'Enter password', 'bad');
        return;
      }

      if (unlockCreateBtn) unlockCreateBtn.disabled = true;
      setStatus(createAuthStatusEl, 'Checking password…', 'ok');

      await api('/api/create/auth', {
        method: 'POST',
        body: { password: value },
      });

      sessionStorage.setItem(CREATE_UNLOCK_KEY, '1');
      if (createWorkspace) createWorkspace.classList.remove('hidden');
      if (createAuthCard) createAuthCard.classList.add('hidden');
      setStatus(createAuthStatusEl, 'Unlocked ✅', 'ok');
      if (createPasswordEl) createPasswordEl.value = '';
    } catch (err) {
      setStatus(createAuthStatusEl, err?.message || 'Wrong password', 'bad');
    } finally {
      if (unlockCreateBtn) unlockCreateBtn.disabled = false;
    }
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
      if (e.key === 'Dead') {
        pendingDeadAcute = true;
        return;
      }
      if (e.key === 'Enter') {
        if (pendingDeadAcute && createPasswordEl.value && !createPasswordEl.value.endsWith('´')) {
          createPasswordEl.value = `${createPasswordEl.value}´`;
        }
        pendingDeadAcute = false;
        unlock();
      }
    });
    createPasswordEl.addEventListener('input', () => {
      pendingDeadAcute = false;
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

  if (addSpeakingBtn) {
    addSpeakingBtn.addEventListener('click', () => {
      addQuestionToBuilder(makeSpeakingQuestion());
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

    const fallback = String(quiz.title || 'Untitled quiz').trim() || 'Untitled quiz';
    const autoName = `${fallback} (${new Date().toLocaleString()})`;
    const saved = saveQuizToLibrary(autoName, quiz);
    setStatus(hostStatusEl, `Saved locally: ${saved.name}`, 'ok');
    openLocalLibraryDialog({ highlightId: saved.id });
  });

  if (openLocalBtn) {
    openLocalBtn.addEventListener('click', () => openLocalLibraryDialog());
  }
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
  }

  exportBtn.addEventListener('click', () => {
    syncQuizFromUI();
    downloadJson(quiz, `${toSafeFilename(quiz.title || 'pinplay-quiz')}.json`);
  });

  if (publishDriveBtn) {
    publishDriveBtn.addEventListener('click', publishQuizToDrive);
  }

  if (openDriveBtn) {
    openDriveBtn.addEventListener('click', () => openQuizFromDrive());
  }

  // delete actions are integrated into open dialogs

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      validateImportedQuiz(parsed);
      quiz = parsed;
      collapseAllQuestions(quiz);
      renderBuilder();
      const savedOk = saveQuiz(quiz);
      if (savedOk) {
        alert('Quiz imported ✅');
      } else {
        alert('Quiz imported ✅ (local autosave skipped: browser storage is full). Use Save Drive or Export to keep a backup.');
      }
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

    const removeBtn = e.target.closest('[data-remove-question]');
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.removeQuestion);
      quiz.questions.splice(idx, 1);
      renderBuilder();
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

    const imageSearchBtn = e.target.closest('[data-image-search]');
    if (imageSearchBtn) {
      const idx = Number(imageSearchBtn.dataset.imageSearch);
      openImageSearchDialog(idx);
      return;
    }

    const clearImageBtn = e.target.closest('[data-clear-image]');
    if (clearImageBtn) {
      const idx = Number(clearImageBtn.dataset.clearImage);
      const q = quiz.questions[idx];
      if (!q) return;
      q.imageData = '';
      renderBuilder();
      setStatus(hostStatusEl, `Image cleared from Q${idx + 1}.`, 'ok');
      return;
    }

    const addPinZoneBtn = e.target.closest('[data-add-pin-zone]');
    if (addPinZoneBtn) {
      const idx = Number(addPinZoneBtn.dataset.addPinZone);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;
      const zones = normalizePinZones(q);
      if (zones.length >= 12) return;
      zones.push({ x: 50, y: 50, r: zones[0]?.r || 15 });
      q.zones = zones;
      renderBuilder();
      return;
    }

    const removePinZoneBtn = e.target.closest('[data-remove-pin-zone]');
    if (removePinZoneBtn) {
      const idx = Number(removePinZoneBtn.dataset.removePinZone);
      const zi = Number(removePinZoneBtn.dataset.zoneIndex);
      const q = quiz.questions[idx];
      if (!q || q.type !== 'pin') return;
      const zones = normalizePinZones(q).filter((_, i) => i !== zi);
      q.zones = zones.length ? zones : [{ x: 50, y: 50, r: 15 }];
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
      const zones = normalizePinZones(q);
      if (zones.length < 12) {
        zones.push({ x: round(clamp(x, 0, 100), 1), y: round(clamp(y, 0, 100), 1), r: zones[0]?.r || 15 });
      } else {
        zones[zones.length - 1] = { ...zones[zones.length - 1], x: round(clamp(x, 0, 100), 1), y: round(clamp(y, 0, 100), 1) };
      }
      q.zones = zones;
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

  questionListEl.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => String(it.type || '').startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile?.();
    if (!file) return;

    const idx = findQuestionIndexFromBuilderEventTarget(e.target);
    if (!Number.isInteger(idx) || idx < 0 || idx >= quiz.questions.length) return;

    e.preventDefault();
    const q = quiz.questions[idx];

    try {
      q.imageData = await fileToDataUrl(file);
      renderBuilder();
      setStatus(hostStatusEl, `Image pasted into Q${idx + 1}.`, 'ok');
    } catch (err) {
      setStatus(hostStatusEl, err.message || 'Could not paste image.', 'bad');
    }
  });

  questionListEl.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el || !el.dataset) return;

    const idxRaw = el.dataset.q;
    if (idxRaw == null) return;
    const idx = Number(idxRaw);
    if (!Number.isInteger(idx) || !quiz.questions[idx]) return;

    const q = quiz.questions[idx];
    const value = String(el.value || '').trim();
    if (!value) return;

    let shouldExpand = false;
    let nextSelector = '';

    if ((el.dataset.acceptedIndex != null) && q.type === 'text') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-accepted-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 20) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-accepted-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.gapIndex != null) && q.type === 'context_gap') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-gap-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-gap-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.puzzleIndex != null) && q.type === 'puzzle') {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-puzzle-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 12) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-puzzle-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.answerIndex != null) && ['mcq', 'multi', 'audio'].includes(q.type)) {
      const fields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-answer-index]`)];
      const last = fields[fields.length - 1];
      if (el === last && fields.length < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-answer-index="${fields.length}"]`;
      }
    }

    if ((el.dataset.pairLeft != null || el.dataset.pairRight != null) && q.type === 'match_pairs') {
      const leftFields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pair-left]`)];
      const rightFields = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pair-right]`)];
      const pairCount = Math.min(leftFields.length, rightFields.length);
      const lastLeft = leftFields[pairCount - 1];
      const lastRight = rightFields[pairCount - 1];
      if ((el === lastLeft || el === lastRight) && pairCount < 10) {
        shouldExpand = true;
        nextSelector = `[data-q="${idx}"][data-pair-left="${pairCount}"]`;
      }
    }

    if (!shouldExpand) return;

    syncQuizFromUI();
    renderBuilder();
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
      if (!q || q.type === 'pin') return;

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

function findQuestionIndexFromBuilderEventTarget(target) {
  if (!target) return null;
  const el = target.nodeType === 1 ? target : target.parentElement;
  if (!el || !questionListEl?.contains(el)) return null;

  const withQ = el.closest('[data-q]');
  if (withQ && Number.isInteger(Number(withQ.dataset.q))) return Number(withQ.dataset.q);

  const withBody = el.closest('[data-image-upload],[data-pin-upload],[data-audio-upload],[data-image-search],[data-remove-question],[data-toggle-question],[data-toggle-question-header],[data-move-up-question],[data-move-down-question],[data-add-pin-zone],[data-remove-pin-zone],[data-pin-preview]');
  if (!withBody) return null;

  const ds = withBody.dataset || {};
  const raw = ds.q ?? ds.imageUpload ?? ds.pinUpload ?? ds.audioUpload ?? ds.imageSearch ?? ds.removeQuestion ?? ds.toggleQuestion ?? ds.toggleQuestionHeader ?? ds.moveUpQuestion ?? ds.moveDownQuestion ?? ds.addPinZone ?? ds.removePinZone ?? ds.pinPreview;
  const idx = Number(raw);
  return Number.isInteger(idx) ? idx : null;
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
      <label>Question (max 1200 chars)</label>
      <textarea data-q="${idx}" data-field="prompt" maxlength="1200">${escapeHtml(q.prompt || '')}</textarea>
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
          <input data-q="${idx}" data-field="timeLimit" type="number" min="0" max="240" value="${Number.isFinite(Number(q.timeLimit)) ? Number(q.timeLimit) : 20}" />
        </div>
        <label style="display:flex; align-items:center; gap:.4rem; margin-top:1.4rem; font-weight:600;">
          <input data-q="${idx}" data-field="isPoll" type="checkbox" ${q.isPoll ? 'checked' : ''} /> Poll mode
        </label>
      </div>
    `;

    let specific = '';

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      const isMulti = q.type === 'multi';
      const maxAnswers = q.type === 'tf' ? 2 : 10;
      const baseMin = q.type === 'tf' ? 2 : 4;
      const source = (Array.isArray(q.answers) ? q.answers : []).slice(0, maxAnswers).map((a) => ({
        text: String(a?.text || ''),
        correct: !!a?.correct,
      }));
      const answers = source.length ? source : [{ text: '', correct: true }, { text: '', correct: false }];
      while (answers.length < baseMin) answers.push({ text: '', correct: false });
      const lastFilled = String(answers[answers.length - 1]?.text || '').trim().length > 0;
      if (q.type !== 'tf' && lastFilled && answers.length < maxAnswers) answers.push({ text: '', correct: false });

      specific += `
        <label class="top-space">Answers</label>
        <div class="answers-grid">
          ${answers
            .map(
              (a, aIdx) => `
            <div class="answer-row">
              <input type="${isMulti ? 'checkbox' : 'radio'}" ${isMulti ? '' : `name="correct-${idx}"`} ${a.correct ? 'checked' : ''} data-q="${idx}" data-correct-index="${aIdx}" />
              <input data-q="${idx}" data-answer-index="${aIdx}" maxlength="90" value="${escapeHtml(a.text || '')}" ${q.type === 'tf' ? 'disabled' : ''}/>
              <span class="small">${q.type === 'tf' ? '' : 'max 90'}</span>
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
      const maxAccepted = 20;
      const acceptedRaw = (Array.isArray(q.accepted) ? q.accepted : []).slice(0, maxAccepted).map((x) => String(x || '').slice(0, 120));
      const acceptedNonEmpty = acceptedRaw.filter((x) => x.trim().length > 0);
      const accepted = acceptedNonEmpty.length ? [...acceptedNonEmpty] : [];
      while (accepted.length < Math.min(4, maxAccepted)) accepted.push('');
      const acceptedLastFilled = String(accepted[accepted.length - 1] || '').trim().length > 0;
      if (acceptedLastFilled && accepted.length < maxAccepted) accepted.push('');
      specific += `
        <label class="top-space">Accepted answers (dynamic, max 20)</label>
        <div class="answers-grid">
          ${accepted
            .slice(0, maxAccepted)
            .map(
              (ans, aIdx) => `
            <input data-q="${idx}" data-accepted-index="${aIdx}" maxlength="120" value="${escapeHtml(ans || '')}" placeholder="Accepted answer ${aIdx + 1}" />
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
        <p class="small top-space">Students write 1-2 sentences from the image. Teacher grades live.</p>
      `;
    }

    if (q.type === 'speaking') {
      specific += `
        <p class="small top-space">In-class speaking round: students tap submit when they have answered orally. Teacher grades participation/performance live.</p>
      `;
    }

    if (q.type === 'context_gap') {
      const maxGaps = 10;
      const gapRaw = (Array.isArray(q.gaps) ? q.gaps : []).slice(0, maxGaps).map((x) => String(x || '').slice(0, 120));
      const gapNonEmpty = gapRaw.filter((x) => x.trim().length > 0);
      const gaps = gapNonEmpty.length ? [...gapNonEmpty] : [''];
      while (gaps.length < Math.min(2, maxGaps)) gaps.push('');
      const gapLastFilled = String(gaps[gaps.length - 1] || '').trim().length > 0;
      if (gapLastFilled && gaps.length < maxGaps) gaps.push('');
      specific += `
        <p class="small top-space">How to create blanks: write your text and add <strong>____</strong> or <strong>[]</strong> where gaps should appear.</p>
        <p class="small">Then set expected answers below (dynamic, max 10). Keep order aligned with blanks. For alternatives, separate with commas (example: <em>big, large, huge</em>).</p>
        <label class="top-space">Expected words for blanks</label>
        <div class="answers-grid">
          ${gaps
            .slice(0, maxGaps)
            .map((ans, aIdx) => `
            <input data-q="${idx}" data-gap-index="${aIdx}" maxlength="120" value="${escapeHtml(ans || '')}" placeholder="Blank ${aIdx + 1}" />
          `)
            .join('')}
        </div>
      `;
    }

    if (q.type === 'match_pairs') {
      const maxPairs = 10;
      const pairsRaw = (Array.isArray(q.pairs) ? q.pairs : []).slice(0, maxPairs).map((p) => ({
        left: String(p?.left || '').slice(0, 60),
        right: String(p?.right || '').slice(0, 60),
      }));
      const pairsNonEmpty = pairsRaw.filter((p) => p.left.trim() || p.right.trim());
      const normalizedPairs = pairsNonEmpty.length ? [...pairsNonEmpty] : [{ left: '', right: '' }];
      while (normalizedPairs.length < Math.min(2, maxPairs)) normalizedPairs.push({ left: '', right: '' });
      const lastPair = normalizedPairs[normalizedPairs.length - 1] || { left: '', right: '' };
      const lastPairFilled = String(lastPair.left || '').trim() || String(lastPair.right || '').trim();
      if (lastPairFilled && normalizedPairs.length < maxPairs) normalizedPairs.push({ left: '', right: '' });
      specific += `
        <p class="small top-space">Set matching pairs (left → right). Dynamic rows, max 10.</p>
        <div class="answers-grid">
          ${normalizedPairs
            .slice(0, maxPairs)
            .map(
              (p, i) => `
              <input data-q="${idx}" data-pair-left="${i}" maxlength="60" value="${escapeHtml(p?.left || '')}" placeholder="Left ${i + 1}" />
              <input data-q="${idx}" data-pair-right="${i}" maxlength="60" value="${escapeHtml(p?.right || '')}" placeholder="Right ${i + 1}" />
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
      const maxItems = 12;
      const itemsRaw = (Array.isArray(q.items) ? q.items : []).slice(0, maxItems).map((x) => String(x || '').slice(0, 75));
      const itemsNonEmpty = itemsRaw.filter((x) => x.trim().length > 0);
      const items = itemsNonEmpty.length ? [...itemsNonEmpty] : [''];
      while (items.length < Math.min(4, maxItems)) items.push('');
      const itemsLastFilled = String(items[items.length - 1] || '').trim().length > 0;
      if (itemsLastFilled && items.length < maxItems) items.push('');
      specific += `
        <label class="top-space">Correct order items (dynamic, max 12)</label>
        <div class="answers-grid">
          ${items
            .slice(0, maxItems)
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
      const zones = normalizePinZones(q);
      specific += `
        <label class="top-space">Image</label>
        <input data-pin-upload="${idx}" type="file" accept="image/*" />
        <div class="row gap top-space">
          <button type="button" class="btn" data-image-search="${idx}">Search web image</button>
          <button type="button" class="btn" data-clear-image="${idx}">Clear image</button>
        </div>
        <div class="row gap top-space">
          <button type="button" class="btn" data-add-pin-zone="${idx}">+ Add correct point</button>
          <div style="min-width:220px;">
            <label>Correct rule</label>
            <select data-q="${idx}" data-field="pinMode">
              <option value="all" ${String(q.pinMode || 'all') === 'all' ? 'selected' : ''}>All spots must be pinned</option>
              <option value="any" ${String(q.pinMode || 'all') === 'any' ? 'selected' : ''}>Any one spot is enough</option>
            </select>
          </div>
        </div>
        <p class="small">Up to 12 correct points. Click preview to add a point at clicked location.</p>
        <div class="answers-grid">
          ${zones.map((z, zi) => `
            <input data-q="${idx}" data-pin-zone-x="${zi}" type="number" min="0" max="100" value="${Number(z.x)}" placeholder="X ${zi + 1}" />
            <input data-q="${idx}" data-pin-zone-y="${zi}" type="number" min="0" max="100" value="${Number(z.y)}" placeholder="Y ${zi + 1}" />
            <input data-q="${idx}" data-pin-zone-r="${zi}" type="number" min="1" max="100" value="${Number(z.r)}" placeholder="R ${zi + 1}" />
            <button type="button" class="btn" data-remove-pin-zone="${idx}" data-zone-index="${zi}">Remove</button>
          `).join('')}
        </div>
      `;

      if (q.imageData) {
        specific += `
          <div class="pin-preview" data-pin-preview="${idx}">
            <img src="${q.imageData}" alt="Pin question image" />
            ${zones.map((z) => {
              const left = clamp(z.x, 0, 100);
              const top = clamp(z.y, 0, 100);
              const size = clamp(z.r * 2, 2, 100);
              return `<div class="pin-zone" style="left:${left}%; top:${top}%; width:${size}%; height:${size}%;"></div><div class="pin-dot" style="left:${left}%; top:${top}%;"></div>`;
            }).join('')}
          </div>
        `;
      }
    }

    if (q.type !== 'pin') {
      specific += `
        <label class="top-space">Question image (optional)</label>
        <input data-image-upload="${idx}" type="file" accept="image/*" />
        <div class="row gap top-space"><button type="button" class="btn" data-image-search="${idx}">Search web image</button><button type="button" class="btn" data-clear-image="${idx}">Clear image</button></div>
      `;
      if (q.imageData) {
        specific += `
          <div class="pin-preview question-image-preview">
            <img src="${q.imageData}" alt="Question image" data-zoomable="1" />
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
  const mode = q.audioMode || (q.audioData ? 'file' : 'tts');
  const lang = String(q.language || 'en-US-Wave');
  return `
    <div class="top-space" style="padding:.55rem; border:1px dashed var(--line); border-radius:.55rem;">
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
      <input data-q="${idx}" data-field="audioText" maxlength="1200" value="${escapeHtml(q.audioText || '')}" placeholder="This is a sample text." />
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
    const pollEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="isPoll"]`);

    if (promptEl) q.prompt = String(promptEl.value || '').slice(0, 1200);
    if (pointsEl) q.points = Number(pointsEl.value || 1000);
    if (timeEl) q.timeLimit = normalizeTimeLimitValue(timeEl.value, q.type);
    q.isPoll = !!pollEl?.checked;

    if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
      q.answers = q.answers || [];
      const answerSlots = q.type === 'tf' ? 2 : 10;
      while (q.answers.length < answerSlots) q.answers.push({ text: '', correct: false });

      q.answers.slice(0, answerSlots).forEach((a, aIdx) => {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-answer-index="${aIdx}"]`);
        if (aEl) a.text = String(aEl.value || '').slice(0, 90);
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
        const tfTrue = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'true');
        const tfFalse = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'false');
        const trueCorrect = tfTrue ? !!tfTrue.correct : !!q.answers?.[0]?.correct;
        const falseCorrect = tfFalse ? !!tfFalse.correct : !!q.answers?.[1]?.correct;
        q.answers[0] = { text: 'True', correct: trueCorrect };
        q.answers[1] = { text: 'False', correct: falseCorrect };
      }

    }

    if (supportsQuestionAudio(q.type)) {
      const audioModeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioMode"]`);
      const audioTextEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioText"]`);
      const languageEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="language"]`);

      q.audioMode = ['tts', 'file'].includes(String(audioModeEl?.value || '')) ? String(audioModeEl.value) : (q.audioData ? 'file' : 'tts');
      q.audioText = String(audioTextEl?.value || '').slice(0, 1200);
      q.language = String(languageEl?.value || 'en-US-Wave').slice(0, 32) || 'en-US-Wave';
      if (q.audioMode !== 'file') q.audioData = q.audioData || '';

      // New rule: no checkbox.
      // TTS is enabled when text exists; file mode enabled when audioData exists.
      q.audioEnabled = q.type === 'audio'
        ? true
        : (q.audioMode === 'file' ? !!q.audioData : !!String(q.audioText || '').trim());
    }

    if (q.type === 'text') {
      const accepted = [];
      for (let aIdx = 0; aIdx < 20; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-accepted-index="${aIdx}"]`);
        accepted.push(String(aEl?.value || '').slice(0, 120));
      }
      q.accepted = accepted;
    }

    if (q.type === 'context_gap') {
      const gaps = [];
      for (let aIdx = 0; aIdx < 10; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-gap-index="${aIdx}"]`);
        gaps.push(String(aEl?.value || '').slice(0, 120));
      }
      q.gaps = gaps;
    }

    if (q.type === 'match_pairs') {
      const pairs = [];
      for (let i = 0; i < 10; i++) {
        const leftEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-left="${i}"]`);
        const rightEl = questionListEl.querySelector(`[data-q="${idx}"][data-pair-right="${i}"]`);
        const left = String(leftEl?.value || '').slice(0, 60).trim();
        const right = String(rightEl?.value || '').slice(0, 60).trim();
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
      for (let i = 0; i < 12; i++) {
        const itemEl = questionListEl.querySelector(`[data-q="${idx}"][data-puzzle-index="${i}"]`);
        items.push(String(itemEl?.value || '').slice(0, 90));
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
      const xEls = [...questionListEl.querySelectorAll(`[data-q="${idx}"][data-pin-zone-x]`)];
      const zones = xEls.map((xEl) => {
        const zi = Number(xEl.dataset.pinZoneX);
        const yEl = questionListEl.querySelector(`[data-q="${idx}"][data-pin-zone-y="${zi}"]`);
        const rEl = questionListEl.querySelector(`[data-q="${idx}"][data-pin-zone-r="${zi}"]`);
        return {
          x: round(clamp(Number(xEl?.value ?? 50), 0, 100), 1),
          y: round(clamp(Number(yEl?.value ?? 50), 0, 100), 1),
          r: round(clamp(Number(rEl?.value ?? 15), 1, 100), 1),
        };
      }).slice(0, 12);
      q.zones = zones.length ? zones : [{ x: 50, y: 50, r: 15 }];
      q.zone = q.zones[0];
      q.pinMode = String(questionListEl.querySelector(`[data-q="${idx}"][data-field="pinMode"]`)?.value || q.pinMode || 'all') === 'any' ? 'any' : 'all';
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
    const fileId = data?.file?.id || null;

    setStatus(hostStatusEl, `Published to Drive: ${fileName}`, 'ok');
    await openQuizFromDrive({ highlightId: fileId });
  } catch (err) {
    setStatus(hostStatusEl, `Drive publish failed: ${err.message}`, 'bad');
  }
}

async function openImageSearchDialog(questionIdx) {
  const q = quiz.questions?.[Number(questionIdx)];
  if (!q) return;

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog-card';

  const head = document.createElement('div');
  head.className = 'row spread gap';
  const h = document.createElement('h3');
  h.textContent = 'Search web images';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());
  head.append(h, closeBtn);

  const row = document.createElement('div');
  row.className = 'row gap top-space';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search query';
  input.value = String(q.prompt || q.type || '').slice(0, 140);
  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn primary';
  searchBtn.textContent = 'Search';
  row.append(input, searchBtn);

  const status = document.createElement('p');
  status.className = 'small top-space';

  const results = document.createElement('div');
  results.className = 'answers-grid top-space';
  results.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
  results.style.gap = '.45rem';

  const runSearch = async () => {
    const query = String(input.value || '').trim();
    if (!query) {
      status.textContent = 'Enter a search query.';
      return;
    }
    status.textContent = 'Searching images...';
    results.innerHTML = '';

    try {
      const allItems = [];
      const seen = new Set();
      const targetTotal = 60;
      const openverseFirstLimit = Math.min(20, targetTotal);

      // 1) Openverse direct from browser first (small curated slice)
      try {
        const ovUrl = new URL('https://api.openverse.org/v1/images/');
        ovUrl.searchParams.set('q', query);
        ovUrl.searchParams.set('page_size', String(openverseFirstLimit));
        ovUrl.searchParams.set('page', '1');
        ovUrl.searchParams.set('mature', 'false');

        const ovRes = await fetch(ovUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8' },
        });
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          const ovItems = (Array.isArray(ovData?.results) ? ovData.results : []).map((it) => ({
            url: String(it?.url || ''),
            thumb: String(it?.thumbnail || it?.url || ''),
            title: String(it?.title || it?.foreign_landing_url || 'Openverse image'),
            source: 'Openverse',
          }));
          ovItems.forEach((it) => {
            if (it.url && !seen.has(it.url)) {
              seen.add(it.url);
              allItems.push(it);
            }
          });
        }
      } catch {
        // Openverse optional; continue with Pexels
      }

      // 2) Fill rest from backend Pexels search
      const need = Math.max(0, targetTotal - allItems.length);
      if (need > 0) {
        const data = await api(`/api/images/search?q=${encodeURIComponent(query)}&count=${need}`, { method: 'GET' });
        const pxItems = Array.isArray(data.items) ? data.items : [];
        pxItems.forEach((it) => {
          const url = String(it?.url || '');
          if (url && !seen.has(url)) {
            seen.add(url);
            allItems.push(it);
          }
        });
      }

      const items = allItems;
      if (!items.length) {
        status.textContent = 'No images found.';
        return;
      }
      status.textContent = `Found ${items.length} images. Click an image to import.`;

      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '.2rem';
        card.style.cursor = 'pointer';

        const img = document.createElement('img');
        img.src = item.thumb || item.url;
        img.alt = String(item.title || 'Image result');
        img.style.width = '100%';
        img.style.borderRadius = '.4rem';
        img.style.maxHeight = '78px';
        img.style.objectFit = 'cover';

        const importImage = async () => {
          try {
            card.style.opacity = '.55';
            card.style.pointerEvents = 'none';
            const imported = await api('/api/images/fetch', { method: 'POST', body: { url: item.url } });
            if (!imported?.dataUrl) throw new Error('Image import failed.');
            q.imageData = imported.dataUrl;
            renderBuilder();
            setStatus(hostStatusEl, 'Image added from web search.', 'ok');
            overlay.remove();
          } catch (err) {
            setStatus(hostStatusEl, err.message || 'Could not import image.', 'bad');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
          }
        };

        card.addEventListener('click', importImage);
        card.append(img);
        results.appendChild(card);
      });
    } catch (err) {
      status.textContent = String(err?.message || 'Image search failed.');
    }
  };

  searchBtn.addEventListener('click', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  dialog.append(head, row, status, results);
  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function showQuizManagerDialog({ title, items, onOpen, onDelete, highlightId = null }) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog-card';

  const head = document.createElement('div');
  head.className = 'row spread gap';
  const h = document.createElement('strong');
  h.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());
  head.append(h, closeBtn);

  const list = document.createElement('div');
  list.className = 'dialog-list top-space';

  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'small';
    p.textContent = 'No saved quizzes found.';
    list.appendChild(p);
  } else {
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'dialog-row';
      if (highlightId && String(item.id || '') === String(highlightId)) {
        row.classList.add('recent');
      }

      const openBtn = document.createElement('button');
      openBtn.className = 'btn dialog-open';
      openBtn.textContent = item.label;
      openBtn.title = item.label;
      openBtn.addEventListener('click', async () => {
        await onOpen(item);
        overlay.remove();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn dialog-delete';
      delBtn.textContent = '✕';
      delBtn.title = `Delete ${item.label}`;
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete "${item.label}"?`)) return;
        await onDelete(item);
        row.remove();
      });

      row.append(openBtn, delBtn);
      list.appendChild(row);
    });
  }

  dialog.append(head, list);
  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function openLocalLibraryDialog(opts = {}) {
  const items = loadQuizLibrary().slice().reverse();
  showQuizManagerDialog({
    title: 'Local quizzes',
    items: items.map((item) => ({
      id: item.id,
      raw: item,
      label: `${item.name} — ${new Date(item.updatedAt || Date.now()).toLocaleString()}`,
    })),
    onOpen: async (item) => {
      const chosen = item.raw;
      validateImportedQuiz(chosen.quiz);
      quiz = chosen.quiz;
      collapseAllQuestions(quiz);
      renderBuilder();
      saveQuiz(quiz);
      setStatus(hostStatusEl, `Loaded local save: ${chosen.name}`, 'ok');
    },
    onDelete: async (item) => {
      const next = loadQuizLibrary().filter((x) => x.id !== item.id);
      saveQuizLibrary(next);
      setStatus(hostStatusEl, `Deleted local save: ${item.raw.name}`, 'ok');
    },
    highlightId: opts.highlightId || null,
  });
}

async function openQuizFromDrive(opts = {}) {
  try {
    const list = await api('/api/drive/list', { method: 'GET' });
    const files = Array.isArray(list?.files) ? list.files : [];
    showQuizManagerDialog({
      title: 'Drive quizzes',
      items: files.map((f) => ({ id: f.id, raw: f, label: String(f.name || f.id) })),
      onOpen: async (item) => {
        const chosen = item.raw;
        const openData = await api(`/api/drive/open?fileId=${encodeURIComponent(chosen.id)}`, { method: 'GET' });
        const loadedQuiz = openData?.quiz;
        validateImportedQuiz(loadedQuiz);
        quiz = loadedQuiz;
        collapseAllQuestions(quiz);
        renderBuilder();
        saveQuiz(quiz);
        setStatus(hostStatusEl, `Loaded from Drive: ${chosen.name || chosen.id}`, 'ok');
      },
      onDelete: async (item) => {
        const chosen = item.raw;
        await api('/api/drive/delete', {
          method: 'POST',
          body: { fileId: chosen.id },
        });
        setStatus(hostStatusEl, `Deleted from Drive: ${chosen.name || chosen.id}`, 'ok');
      },
      highlightId: opts.highlightId || null,
    });
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

  if (previewUnifiedBtn) previewUnifiedBtn.addEventListener('click', () => startPreviewMode());
  if (previewRerollBtn) {
    previewRerollBtn.addEventListener('click', () => {
      if (!previewMode.active) return;
      previewMode.simNames = randomPreviewNames(14);
      previewMode.simClassSeed = Date.now();
      previewMode.simTeacherByQ = {};
      renderPreviewFrame();
      setStatus(hostStatusEl, 'Unified preview class re-rolled (local grading reset).', 'ok');
    });
  }
  if (previewResimBtn) {
    previewResimBtn.addEventListener('click', () => {
      if (!previewMode.active) return;
      previewMode.simClassSeed = Date.now();
      const qKey = String(Number(previewMode.index || 0));
      delete previewMode.simTeacherByQ[qKey];
      renderPreviewFrame();
      setStatus(hostStatusEl, 'Unified preview current question re-simulated.', 'ok');
    });
  }
  const jumpPreviewQuestion = () => {
    if (!previewMode.active) return;
    const total = Number(quiz?.questions?.length || 0);
    if (!total) return;
    const wanted = Number(previewJumpInputEl?.value || 1);
    const idx = Math.max(0, Math.min(total - 1, (Number.isFinite(wanted) ? wanted : 1) - 1));
    previewMode.index = idx;
    renderPreviewFrame();
    setStatus(hostStatusEl, `Unified preview jumped to Q${idx + 1}.`, 'ok');
  };
  if (previewJumpBtn) previewJumpBtn.addEventListener('click', jumpPreviewQuestion);
  if (previewJumpInputEl) {
    previewJumpInputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      jumpPreviewQuestion();
    });
  }
  if (previewExitBtn) previewExitBtn.addEventListener('click', stopPreviewMode);

  if (randomNamesToggleEl) {
    randomNamesToggleEl.addEventListener('click', hostUpdateRandomNames);
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
          randomNames: isRandomNamesEnabled(),
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

function cancelRankingAnimationFrame() {
  if (live.host.rankingAnimRafId != null) {
    cancelAnimationFrame(live.host.rankingAnimRafId);
    live.host.rankingAnimRafId = null;
  }
}

function scheduleRankingAnimationFrame() {
  if (live.host.rankingAnimRafId != null) return;
  live.host.rankingAnimRafId = requestAnimationFrame(() => {
    live.host.rankingAnimRafId = null;
    if (!live.host.rankingMode) return;
    renderHostState(live.host.state || {});
  });
}

function startRankingAnimationMode() {
  cancelRankingAnimationFrame();

  const state = live.host.state;
  if (!state || !Array.isArray(state.players) || !state.players.length) return;

  const toMap = {};
  state.players.forEach((p) => { toMap[p.id] = Number(p.score || 0); });

  const fromMap = {};
  state.players.forEach((p) => {
    const prev = Number(live.host.lastScoresByPlayer?.[p.id]);
    const end = Number(toMap[p.id] || 0);
    // If we don't have a reliable previous score (or it equals current),
    // fall back to 0 so R always produces a visible count-up effect.
    if (!Number.isFinite(prev) || prev === end) {
      fromMap[p.id] = 0;
    } else {
      fromMap[p.id] = prev;
    }
  });

  live.host.rankingAnimFrom = fromMap;
  live.host.rankingAnimTo = toMap;
  live.host.rankingAnimStartAt = Date.now();
  live.host.rankingMode = true;
  playFx('counter');
  renderHostState(state);
}

function stopRankingAnimationMode() {
  if (!live.host.rankingMode) return;
  live.host.rankingMode = false;
  cancelRankingAnimationFrame();
  stopFx('counter');
  if (live.host.state) renderHostState(live.host.state);
}

async function hostNextQuestion() {
  if (live.host.rankingMode) {
    stopRankingAnimationMode();
  }

  if (previewMode.active) {
    previewMode.index = Math.min(quiz.questions.length - 1, previewMode.index + 1);
    previewMode.showReveal = false;
    previewMode.answeredCurrent = false;
    previewMode.revealedResult = null;
    renderPreviewFrame();
    return;
  }

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
  if (live.host.rankingMode) {
    stopRankingAnimationMode();
    return;
  }

  if (previewMode.active) {
    previewMode.index = Math.max(0, previewMode.index - 1);
    previewMode.showReveal = false;
    previewMode.answeredCurrent = false;
    previewMode.revealedResult = null;
    renderPreviewFrame();
    return;
  }

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
  if (previewMode.active) {
    previewMode.showReveal = !previewMode.showReveal;
    renderPreviewFrame();
    return;
  }

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

function isRandomNamesEnabled() {
  return !!randomNamesToggleEl?.classList.contains('active');
}

function setRandomNamesToggleState(enabled) {
  if (!randomNamesToggleEl) return;
  randomNamesToggleEl.classList.toggle('active', !!enabled);
  randomNamesToggleEl.textContent = 'Random names';
}

async function hostUpdateRandomNames() {
  if (!randomNamesToggleEl) return;
  const prev = isRandomNamesEnabled();
  const next = !prev;
  setRandomNamesToggleState(next);

  try {
    if (!live.host.pin || !live.host.token) return;
    await api('/api/host/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        randomNames: next,
      },
    });
    await pollHostState();
  } catch (err) {
    setRandomNamesToggleState(prev);
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

function shouldIgnoreHostHotkey(e) {
  if (!createWorkspace || createWorkspace.classList.contains('hidden')) return true;

  const el = e.target;
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (el.isContentEditable) return true;
  return ['input', 'textarea', 'select'].includes(tag);
}

function handleHostHotkeys(e) {
  if (shouldIgnoreHostHotkey(e)) return;

  if (e.key === 'l' || e.key === 'L') {
    e.preventDefault();
    createLiveGame();
    return;
  }

  if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    openLocalLibraryDialog();
    return;
  }

  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    openQuizFromDrive();
    return;
  }

  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    hostStartGame();
    return;
  }

  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    hostApplyBuilderToLive();
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    startRankingAnimationMode();
    return;
  }

  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (previewMode.active) stopPreviewMode();
    else startPreviewMode();
    return;
  }

  if (previewMode.active) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      hostNextQuestion();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      hostPrevQuestion();
      return;
    }
  }

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

async function gradeOpenAnswer(playerId, points) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      const max = Number(live.host.state?.question?.points || 1000);
      const value = Number(points);
      const safePoints = Math.max(0, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)));
      setPreviewTeacherPatch(previewMode.index, playerId, {
        graded: true,
        pointsAwarded: safePoints,
      });
      setStatus(hostStatusEl, `Preview grade applied: ${safePoints} pts.`, 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    const max = Number(live.host.state?.question?.points || 1000);
    const value = Number(points);
    if (!Number.isFinite(value)) throw new Error('Points must be a number.');
    const safePoints = Math.max(0, Math.min(max, Math.round(value)));

    await api('/api/host/grade-open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        points: safePoints,
      },
    });

    setStatus(hostStatusEl, `Open answer graded: ${safePoints} pts.`, 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostHidePollResponse(playerId) {
  try {
    if (!playerId) return;
    ensureHostReady();

    await api('/api/host/poll/hide', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });

    setStatus(hostStatusEl, 'Poll response hidden (moved to Other).', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostHideOpenResponse(playerId) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      setPreviewTeacherPatch(previewMode.index, playerId, { hidden: true });
      setStatus(hostStatusEl, 'Preview hide applied.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    await api('/api/host/open/hide', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
      },
    });

    setStatus(hostStatusEl, 'Open response hidden.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostSetOpenCorrection(playerId, currentText = '', studentAnswer = '') {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      const seed = String(currentText || '').trim() || String(studentAnswer || '').trim();
      const text = prompt('Preview correction/feedback for student:', seed);
      if (text == null) return;
      setPreviewTeacherPatch(previewMode.index, playerId, { correction: String(text || '').slice(0, 280) });
      setStatus(hostStatusEl, 'Preview correction saved.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    const seed = String(currentText || '').trim() || String(studentAnswer || '').trim();
    const text = prompt('Correction/feedback for student:', seed);
    if (text == null) return;

    await api('/api/host/open/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        correction: String(text || '').slice(0, 280),
      },
    });

    setStatus(hostStatusEl, 'Correction saved.', 'ok');
    await pollHostState();
  } catch (err) {
    setStatus(hostStatusEl, err.message, 'bad');
  }
}

async function hostToggleModelAnswer(playerId, nextValue) {
  try {
    if (!playerId) return;
    if (previewMode.active) {
      setPreviewTeacherPatch(previewMode.index, playerId, { modelAnswer: !!nextValue });
      setStatus(hostStatusEl, nextValue ? 'Preview: marked model answer.' : 'Preview: unmarked model answer.', 'ok');
      renderPreviewFrame();
      return;
    }
    ensureHostReady();

    await api('/api/host/open/model', {
      method: 'POST',
      headers: { Authorization: `Bearer ${live.host.token}` },
      body: {
        pin: live.host.pin,
        playerId,
        modelAnswer: !!nextValue,
      },
    });

    setStatus(hostStatusEl, nextValue ? 'Marked as model answer.' : 'Removed from model answers.', 'ok');
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

function formatHistoryAnswer(entry) {
  if (!entry) return '(no answer)';
  if (Array.isArray(entry.answerText)) return entry.answerText.join(' | ');
  return String(entry.answerText || '(no answer)');
}

function renderHostAnswerHistory(state) {
  if (!hostAnswerHistoryEl) return;
  hostAnswerHistoryEl.innerHTML = '';

  const blocks = Array.isArray(state?.answerHistory) ? state.answerHistory : [];
  if (!blocks.length) {
    const li = document.createElement('li');
    li.textContent = 'No answers yet.';
    hostAnswerHistoryEl.appendChild(li);
    return;
  }

  blocks.forEach((block) => {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.className = 'small';
    title.innerHTML = `<strong>Q${Number(block.qIndex) + 1}</strong> - ${escapeHtml(String(block.prompt || '').slice(0, 90) || '(no prompt)' )}`;
    li.appendChild(title);

    const entries = Array.isArray(block.entries) ? block.entries : [];
    if (!entries.length) {
      const muted = document.createElement('div');
      muted.className = 'small muted';
      muted.textContent = 'No submissions on this question.';
      li.appendChild(muted);
    } else {
      const sub = document.createElement('ul');
      sub.className = 'list';
      entries.forEach((entry) => {
        const row = document.createElement('li');
        const verdict = entry.graded ? (entry.correct ? '✅' : '❌') : '⏳';
        const line = document.createElement('div');
        line.textContent = `${entry.name}: ${formatHistoryAnswer(entry)} ${verdict}${entry.graded ? ` (${Number(entry.pointsAwarded || 0)} pts)` : ''}`;
        row.appendChild(line);

        const isCurrent = Number(block.qIndex) === Number(state?.currentIndex);
        const currentQ = state?.question || null;
        const teacherGradedCurrent = isCurrent && currentQ && (currentQ.type === 'open' || currentQ.type === 'image_open' || currentQ.type === 'speaking' || (currentQ.type === 'text' && !(currentQ.accepted || []).filter((x) => String(x || '').trim()).length));

        if (teacherGradedCurrent) {
          const actions = document.createElement('div');
          actions.className = 'row gap top-space';

          const maxPoints = Number(currentQ?.points || 1000);

          const gradeBtn = document.createElement('button');
          gradeBtn.className = 'btn';
          gradeBtn.textContent = `+${maxPoints}`;
          gradeBtn.title = `Award full points (${maxPoints})`;
          gradeBtn.addEventListener('click', () => gradeOpenAnswer(entry.playerId, maxPoints));

          const zeroBtn = document.createElement('button');
          zeroBtn.className = 'btn';
          zeroBtn.textContent = '0';
          zeroBtn.title = 'Set 0 points';
          zeroBtn.addEventListener('click', () => gradeOpenAnswer(entry.playerId, 0));

          const corrBtn = document.createElement('button');
          corrBtn.className = 'btn';
          corrBtn.textContent = entry.correction ? 'Edit correction' : 'Add correction';
          corrBtn.addEventListener('click', () => hostSetOpenCorrection(entry.playerId, entry.correction || '', formatHistoryAnswer(entry)));

          const modelBtn = document.createElement('button');
          modelBtn.className = 'btn';
          modelBtn.textContent = entry.modelAnswer ? 'Unshow model' : 'Show as model';
          modelBtn.addEventListener('click', () => hostToggleModelAnswer(entry.playerId, !entry.modelAnswer));

          const hideBtn = document.createElement('button');
          hideBtn.className = 'btn';
          hideBtn.textContent = 'Hide';
          hideBtn.addEventListener('click', () => hostHideOpenResponse(entry.playerId));

          actions.append(gradeBtn, zeroBtn, corrBtn, modelBtn, hideBtn);
          row.appendChild(actions);
        }

        sub.appendChild(row);
      });
      li.appendChild(sub);
    }

    hostAnswerHistoryEl.appendChild(li);
  });
}

function renderHostState(state) {
  const prevState = live.host.state;
  // Keep a stable "previous question" score snapshot for R count-up.
  // Important: do not keep overwriting while already in results, otherwise from==to and animation looks static.
  if (prevState && Array.isArray(prevState.players) && state?.phase !== 'results') {
    const snap = {};
    prevState.players.forEach((p) => { snap[p.id] = Number(p.score || 0); });
    live.host.lastScoresByPlayer = snap;
  }
  live.host.state = state;

  const phaseChanged = live.host.lastPhase !== state.phase || live.host.lastIndex !== state.currentIndex;

  if (phaseChanged) {
    live.host.seenReactionKeys = new Set();
    if (liveReactionsEl) liveReactionsEl.innerHTML = '';
    if (projectorReactionsEl) projectorReactionsEl.innerHTML = '';
    if (state.phase !== 'results') {
      live.host.finalRevealKey = null;
      live.host.finalRevealStartedAt = 0;
      live.host.finalRevealStagePlayed = { drumroll: false, final: false };
      stopFx('drumrollwinner');
    }
  }

  if (livePhaseEl) livePhaseEl.textContent = `Phase: ${state.phase}`;
  if (liveProgressEl) liveProgressEl.textContent = `Progress: ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (liveResponsesEl) liveResponsesEl.textContent = `Answers this round: ${state.responseCount} / ${state.playerCount}`;
  renderReactionPop(state.reactions || []);
  if (livePinEl) livePinEl.textContent = state.pin || '-';
  if (livePinBigEl) livePinBigEl.textContent = state.pin || '-';

  if (projectorAnswersEl) projectorAnswersEl.textContent = `👥 Answers: ${state.responseCount} / ${state.playerCount}`;
  if (projectorScoresEl) {
    const showScores = state.phase === 'results' || live.host.rankingMode;
    renderProjectorScores(showScores ? (state.players || []) : [], { animate: live.host.rankingMode });
  }

  if (randomNamesToggleEl && state.settings && typeof state.settings.randomNames === 'boolean') {
    setRandomNamesToggleState(!!state.settings.randomNames);
  }

  if (hostPlayersEl) {
    hostPlayersEl.innerHTML = '';

    let hostPlayersView = [...(state.players || [])];
    if (live.host.rankingMode) {
      const t = Date.now();
      const d = Math.max(200, Number(live.host.rankingAnimDurationMs || 2600));
      const elapsedMs = t - Number(live.host.rankingAnimStartAt || t);
      const p = Math.max(0, Math.min(1, elapsedMs / d));

      hostPlayersView = hostPlayersView.map((pl) => {
        const from = Number(live.host.rankingAnimFrom?.[pl.id] ?? pl.score ?? 0);
        const to = Number(live.host.rankingAnimTo?.[pl.id] ?? pl.score ?? 0);
        const score = computeCrazyCountScore(to, p, elapsedMs);
        return { ...pl, score, _from: from, _to: to };
      });

      const climbWindowMs = 1000;
      if (elapsedMs >= d - climbWindowMs) {
        hostPlayersView.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      } else {
        hostPlayersView.sort((a, b) => Number(b._from || 0) - Number(a._from || 0));
      }

      if (p < 1) {
        scheduleRankingAnimationFrame();
      } else {
        stopFx('counter');
      }
    }

    hostPlayersView.forEach((p) => {
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

  renderHostAnswerHistory(state);

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

  const openSig = Array.isArray(state.openResponses)
    ? state.openResponses
      .map((r) => `${r.playerId}:${r.modelAnswer ? 1 : 0}:${String(r.correction || '').trim()}`)
      .join('|')
    : '';
  const modelSig = Array.isArray(state.modelResponses)
    ? state.modelResponses
      .map((r) => `${r.playerId}:${String(r.correction || '').trim()}`)
      .join('|')
    : '';

  const questionRenderKey = [
    state.phase,
    state.currentIndex,
    state.questionClosed ? 1 : 0,
    state.questionClosedAt || 0,
    state.responseCount || 0,
    state.playerCount || 0,
    state.question?.type || '',
    state.question?.prompt || '',
    state.question?.isPoll ? 1 : 0,
    Array.isArray(state.openResponses) ? state.openResponses.length : 0,
    Array.isArray(state.pollResponses) ? state.pollResponses.length : 0,
    Array.isArray(state.modelResponses) ? state.modelResponses.length : 0,
    openSig,
    modelSig,
  ].join(':');

  if (live.host.lastQuestionRenderKey !== questionRenderKey) {
    renderHostQuestion(state);
    live.host.lastQuestionRenderKey = questionRenderKey;
  }

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

  if (state.phase === 'results' && live.host.lastPhase !== 'results') {
    stopFx('answering');
    stopFx('answered');
    // final.mp3 is now triggered by the staged final reveal sequence (after drumroll + winner reveal)
    stopFx('final');
  }

  if (state.phase !== 'results') {
    stopFx('final');
  }

  if (revealKey && live.host.lastRevealKey !== revealKey) {
    stopFx('answering');
    playFx('answered');
    live.host.lastRevealKey = revealKey;
  }

  if (state.phase === 'question' && !state.questionClosed && hasQuestionAudio(state.question)) {
    const hostAudioKey = `${state.currentIndex}:${state.questionStartedAt || 0}`;
    if (live.host.lastHostAudioKey !== hostAudioKey) {
      playQuestionAudio(state.question);
      live.host.lastHostAudioKey = hostAudioKey;
    }
  }

  if (state.phase !== 'question') {
    live.host.lastHostAudioKey = null;
  }

  live.host.lastPhase = state.phase;
  live.host.lastIndex = state.currentIndex;
  live.host.lastResponseCount = state.responseCount;
}

function renderHostQuestion(state) {
  const phase = state.phase;
  const question = state.question;
  const showReveal = !!state.questionClosed && (phase === 'question' || phase === 'results');

  const renderPollSummary = () => {
    const summary = state.pollSummary;
    if (!summary || !Array.isArray(summary.items) || !summary.items.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No poll answers submitted.';
      hostQuestionAnswersEl.appendChild(p);
      return;
    }

    const max = Math.max(1, ...summary.items.map((x) => Number(x.count || 0)));

    const textLikeTypes = new Set(['text', 'open', 'image_open', 'error_hunt', 'context_gap', 'match_pairs', 'puzzle']);
    const isTextLike = textLikeTypes.has(String(summary.type || ''));
    const mode = isTextLike ? String(live.host.pollViewMode || 'bar') : 'bar';

    if (isTextLike) {
      const toggle = document.createElement('div');
      toggle.className = 'row gap top-space';
      const barBtn = document.createElement('button');
      barBtn.type = 'button';
      barBtn.className = `btn ${mode === 'bar' ? 'active' : ''}`;
      barBtn.textContent = 'Bar view';
      barBtn.addEventListener('click', () => {
        live.host.pollViewMode = 'bar';
        renderHostQuestion(state);
      });

      const cloudBtn = document.createElement('button');
      cloudBtn.type = 'button';
      cloudBtn.className = `btn ${mode === 'cloud' ? 'active' : ''}`;
      cloudBtn.textContent = 'Cloud view';
      cloudBtn.addEventListener('click', () => {
        live.host.pollViewMode = 'cloud';
        renderHostQuestion(state);
      });

      toggle.append(barBtn, cloudBtn);
      hostQuestionAnswersEl.appendChild(toggle);
    }

    if (isTextLike && mode === 'cloud') {
      const cloud = document.createElement('div');
      cloud.className = 'poll-word-cloud';
      summary.items.slice(0, 20).forEach((item) => {
        const chip = document.createElement('span');
        chip.className = 'poll-word-chip';
        chip.textContent = String(item.label || '(blank)');
        const weight = Number(item.count || 0) / max;
        const size = Math.round(14 + weight * 20);
        chip.style.fontSize = `${size}px`;
        chip.title = `${item.count} vote(s)`;
        cloud.appendChild(chip);
      });
      hostQuestionAnswersEl.appendChild(cloud);
    }

    if (mode === 'bar') {
      const list = document.createElement('div');
      list.className = 'answers-grid';

      summary.items.slice(0, 15).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'answer-row';
        const label = document.createElement('span');
        label.textContent = String(item.label || '(blank)');
        const barWrap = document.createElement('div');
        barWrap.style.height = '10px';
        barWrap.style.borderRadius = '999px';
        barWrap.style.background = 'rgba(96,93,255,.14)';
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.borderRadius = '999px';
        bar.style.background = 'linear-gradient(90deg,#605dff,#8b5cf6)';
        bar.style.width = `${Math.max(6, (Number(item.count || 0) / max) * 100)}%`;
        barWrap.appendChild(bar);
        const count = document.createElement('strong');
        count.textContent = String(item.count || 0);
        row.append(label, barWrap, count);
        list.appendChild(row);
      });

      if (Number(summary.otherCount || 0) > 0) {
        const row = document.createElement('div');
        row.className = 'answer-row';
        const label = document.createElement('span');
        label.textContent = 'Other';
        const barWrap = document.createElement('div');
        barWrap.style.height = '10px';
        barWrap.style.borderRadius = '999px';
        barWrap.style.background = 'rgba(156,163,175,.2)';
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.borderRadius = '999px';
        bar.style.background = 'linear-gradient(90deg,#6b7280,#4b5563)';
        bar.style.width = `${Math.max(6, (Number(summary.otherCount || 0) / max) * 100)}%`;
        barWrap.appendChild(bar);
        const count = document.createElement('strong');
        count.textContent = String(summary.otherCount || 0);
        row.append(label, barWrap, count);
        list.appendChild(row);
      }

      hostQuestionAnswersEl.appendChild(list);
    }

    const raw = Array.isArray(state.pollResponses) ? state.pollResponses : [];
    if (raw.length) {
      const modTitle = document.createElement('p');
      modTitle.className = 'small top-space';
      modTitle.textContent = 'Moderation (host only):';
      hostQuestionAnswersEl.appendChild(modTitle);

      raw.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'row spread gap';
        row.style.border = '1px solid var(--line)';
        row.style.borderRadius = '.5rem';
        row.style.padding = '.35rem .45rem';

        const txt = document.createElement('span');
        txt.textContent = `${r.name}: ${formatPollAnswerForHost(r.answer)}`;

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = r.hidden ? 'Hidden' : 'Hide';
        btn.disabled = !!r.hidden;
        btn.addEventListener('click', () => hostHidePollResponse(r.playerId));

        row.append(txt, btn);
        hostQuestionAnswersEl.appendChild(row);
      });
    }
  };

  if (!hostQuestionWrap || !hostQuestionPromptEl || !hostQuestionAnswersEl || !hostQuestionHintEl) return;

  const appendBigReveal = (text) => {
    const value = String(text || '').trim();
    if (!value) return;
    const ans = document.createElement('div');
    ans.className = 'project-text-reveal';
    ans.textContent = value;
    hostQuestionAnswersEl.appendChild(ans);
  };

  if (phase === 'results') {
    hostQuestionWrap.classList.remove('hidden');
    hostQuestionPromptEl.textContent = '🏁 Final ranking reveal';
    hostQuestionAnswersEl.innerHTML = '';
    hostQuestionHintEl.textContent = 'Final reveal mode.';
    return;
  }

  const inQuestionIntro = phase === 'question' && !showReveal;
  if (!inQuestionIntro) {
    live.host.questionIntroKey = null;
    live.host.questionIntroStartedAt = 0;
    live.host.questionIntroDone = false;
  }

  if (!question) {
    hostQuestionWrap.classList.add('hidden');
    hostQuestionPromptEl.textContent = '';
    hostQuestionAnswersEl.innerHTML = '';
    hostQuestionHintEl.textContent = 'Question will appear here when game starts.';
    return;
  }

  hostQuestionWrap.classList.remove('hidden');
  const qIcon = iconForType(question.type);
  const qPrompt = question.prompt || '(No question text)';

  if (inQuestionIntro) {
    // Use index-only key for intro stability: some backends/relays may jitter questionStartedAt,
    // which can repeatedly reset the intro and leave the splash stuck forever.
    const introKey = `${state.currentIndex}`;
    if (live.host.questionIntroKey !== introKey) {
      live.host.questionIntroKey = introKey;
      live.host.questionIntroStartedAt = Date.now();
      live.host.questionIntroDone = false;
    }

    if (!live.host.questionIntroDone) {
      const elapsed = Date.now() - Number(live.host.questionIntroStartedAt || Date.now());
      if (elapsed < 1000) {
        hostQuestionPromptEl.textContent = '';
        hostQuestionHintEl.textContent = '';
        hostQuestionAnswersEl.innerHTML = '';

        const points = Number(question.points || 0).toLocaleString('en-US');
        const splash = document.createElement('div');
        splash.className = 'question-intro-points';
        splash.textContent = `🎯 ${points} points`;
        hostQuestionAnswersEl.appendChild(splash);
        requestAnimationFrame(() => {
          // Force one more render pass during intro even when host state payload is unchanged.
          live.host.lastQuestionRenderKey = null;
          renderHostState(live.host.state || {});
        });
        return;
      }

      if (elapsed < 2000) {
        hostQuestionPromptEl.textContent = qIcon ? `${qIcon} ${qPrompt}` : qPrompt;
        hostQuestionHintEl.textContent = '';
        hostQuestionAnswersEl.innerHTML = '';
        requestAnimationFrame(() => {
          // Force one more render pass during intro even when host state payload is unchanged.
          live.host.lastQuestionRenderKey = null;
          renderHostState(live.host.state || {});
        });
        return;
      }

      live.host.questionIntroDone = true;
    }
  }

  hostQuestionPromptEl.textContent = qIcon ? `${qIcon} ${qPrompt}` : qPrompt;
  hostQuestionAnswersEl.innerHTML = '';

  if (hasQuestionAudio(question)) {
    const audioBtn = document.createElement('button');
    audioBtn.type = 'button';
    audioBtn.className = 'btn top-space';
    audioBtn.textContent = '🔊 Play audio';
    audioBtn.addEventListener('click', () => playQuestionAudio(question));
    hostQuestionAnswersEl.appendChild(audioBtn);
  }

  const hasSharedImage = question.type !== 'pin' && !!question.imageData;
  hostQuestionAnswersEl.classList.toggle('has-question-image', hasSharedImage);

  if (question.type !== 'pin' && question.type !== 'image_open' && question.imageData) {
    const preview = document.createElement('div');
    preview.className = 'pin-preview question-image-preview';
    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Question image';
    img.dataset.zoomable = '1';
    preview.appendChild(img);
    hostQuestionAnswersEl.appendChild(preview);
  }

  if (question.isPoll) {
    hostQuestionHintEl.textContent = showReveal ? 'Poll results (anonymous)' : 'Poll mode: no points, no correct answer.';
    if (showReveal) renderPollSummary();
    return;
  }

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

  const isTeacherGradedText = question.type === 'text' && !(question.accepted || []).filter((x) => String(x || '').trim()).length;

  if (question.type === 'text' && !isTeacherGradedText) {
    hostQuestionHintEl.textContent = showReveal ? '' : 'Type-answer question.';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedText) {
    hostQuestionHintEl.textContent = '';

    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      hostQuestionAnswersEl.appendChild(preview);
    }

    const models = Array.isArray(state.modelResponses) && state.modelResponses.length
      ? state.modelResponses
      : (Array.isArray(state.openResponses) ? state.openResponses.filter((r) => !!r.modelAnswer) : []);

    // Do not mirror model answers into projectorCorrectEl here.
    // Keep only the standard visible model list below (prevents duplicate model rendering).
    if (projectorCorrectEl) {
      projectorCorrectEl.textContent = '';
    }

    if (!models.length) return;

    // Fallback visible list (same behavior as the prior working state)
    models.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'answer-row';
      const text = document.createElement('span');
      const corr = String(r.correction || '').trim();
      text.textContent = corr || `${r.answer}`;
      row.append(text);
      hostQuestionAnswersEl.appendChild(row);
    });
    return;
  }

  if (question.type === 'context_gap') {
    hostQuestionHintEl.textContent = '';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'match_pairs') {
    hostQuestionHintEl.textContent = showReveal ? '' : 'Match pairs question.';
    if (!showReveal) {
      renderMatchPairsPreview(hostQuestionAnswersEl, question.leftItems || [], question.rightOptions || []);
    } else {
      renderMatchPairsReveal(hostQuestionAnswersEl, question.pairs || []);
    }
    return;
  }

  if (question.type === 'error_hunt') {
    hostQuestionHintEl.textContent = showReveal ? '' : 'Error hunt: click wrong token(s), rewrite sentence.';
    if (showReveal) appendBigReveal(state.correctAnswer);
    return;
  }

  if (question.type === 'puzzle') {
    hostQuestionHintEl.textContent = showReveal ? '' : 'Puzzle question.';
    if (question.options?.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = `Items: ${question.options.join(' • ')}`;
      hostQuestionAnswersEl.appendChild(p);
    }
    if (showReveal) {
      const items = Array.isArray(question.items)
        ? question.items.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
      if (items.length) {
        renderPuzzleRevealTokens(hostQuestionAnswersEl, items);
      } else {
        appendBigReveal(state.correctAnswer);
      }
    }
    if (projectorCorrectEl) projectorCorrectEl.textContent = '';
    return;
  }

  if (question.type === 'slider') {
    hostQuestionHintEl.textContent = showReveal ? '' : `Slider range: ${question.min} to ${question.max}${question.unit ? ` ${question.unit}` : ''}`;
    if (showReveal) appendBigReveal(state.correctAnswer);
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

      if (showReveal) {
        const zones = Array.isArray(question.zones) && question.zones.length
          ? question.zones
          : (question.zone ? [question.zone] : []);
        zones.slice(0, 12).forEach((z) => {
          const zone = document.createElement('div');
          zone.className = 'pin-zone';
          zone.style.left = `${Number(z.x || 50)}%`;
          zone.style.top = `${Number(z.y || 50)}%`;
          zone.style.width = `${Math.max(2, Number(z.r || 15) * 2)}%`;
          zone.style.height = `${Math.max(2, Number(z.r || 15) * 2)}%`;
          wrap.appendChild(zone);

          const arrow = document.createElement('div');
          arrow.className = 'pin-arrow';
          arrow.style.left = `${Number(z.x || 50)}%`;
          arrow.style.top = `${Math.max(0, Number(z.y || 50) - Number(z.r || 15) - 6)}%`;
          arrow.textContent = '↓';
          wrap.appendChild(arrow);
        });
      }

      hostQuestionAnswersEl.appendChild(wrap);
    }
    return;
  }

  hostQuestionHintEl.textContent = '';
}

function computeCrazyCountScore(toScore, p, elapsedMs) {
  const target = Math.max(0, Math.round(Number(toScore || 0)));
  if (p >= 1) return target;

  const targetStr = String(target);
  const len = targetStr.length;
  const chars = targetStr.split('');

  for (let posFromRight = 0; posFromRight < len; posFromRight++) {
    const idx = len - 1 - posFromRight;
    const stopAt = 0.5 + (posFromRight * (0.45 / Math.max(1, len - 1))); // right -> left stop
    if (p < stopAt) {
      chars[idx] = String(Math.floor((elapsedMs / 22 + (idx + 1) * 3) % 10));
    }
  }

  const n = Number(chars.join(''));
  return Number.isFinite(n) ? n : target;
}

function buildProjectorScoreItem(rank, name, score, medal = '🏅') {
  const li = document.createElement('li');
  li.classList.add('projector-score-item', `rank-${Math.min(rank, 4)}`);

  const left = document.createElement('span');
  left.className = 'projector-score-left';
  left.textContent = `${medal} ${rank}. ${name}`;

  const right = document.createElement('span');
  right.className = 'projector-score-value';
  right.textContent = `${score} pts`;

  li.append(left, right);
  return li;
}

function renderProjectorScores(players, opts = {}) {
  if (!projectorScoresEl) return;
  projectorScoresEl.innerHTML = '';

  if (!players.length) {
    const li = document.createElement('li');
    li.textContent = 'No players yet.';
    projectorScoresEl.appendChild(li);
    return;
  }

  const inFinalResults = live.host.state?.phase === 'results' && !live.host.rankingMode;
  if (inFinalResults) {
    const sorted = [...players].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const revealCount = Math.min(7, sorted.length);
    const revealSlice = sorted.slice(0, revealCount);
    const revealKey = revealSlice.map((p) => `${p.id}:${Number(p.score || 0)}`).join('|');

    if (live.host.finalRevealKey !== revealKey) {
      live.host.finalRevealKey = revealKey;
      live.host.finalRevealStartedAt = Date.now();
      live.host.finalRevealStagePlayed = { drumroll: false, final: false };
      stopFx('counter');
      stopFx('answered');
      stopFx('final');
      stopFx('drumrollwinner');
    }

    const revealTiming = {
      winnerHornMs: 7000,
      drumrollTotalMs: 10000,
    };

    const elapsed = Date.now() - Number(live.host.finalRevealStartedAt || Date.now());
    const firstRevealMs = revealCount > 1 ? 1000 : revealTiming.winnerHornMs;
    const stepMs = revealCount > 1
      ? (revealTiming.winnerHornMs - firstRevealMs) / (revealCount - 1)
      : 0;

    if (!live.host.finalRevealStagePlayed.drumroll) {
      playFx('drumrollwinner');
      live.host.finalRevealStagePlayed.drumroll = true;
    }

    const title = document.createElement('li');
    title.textContent = '🏁 FINAL RANKING REVEAL';
    title.classList.add('projector-score-item', 'rank-1');
    projectorScoresEl.appendChild(title);

    const medalForRank = (rank) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return '🏅';
    };

    // Reveal from 7 -> 1 in time, but render as 1..N so new better ranks appear above previous ones.
    for (let rank = 1; rank <= revealCount; rank++) {
      const revealAt = firstRevealMs + (revealCount - rank) * stepMs;
      if (elapsed < revealAt) continue;
      const p = revealSlice[rank - 1];
      if (!p) continue;
      projectorScoresEl.appendChild(buildProjectorScoreItem(rank, p.name, p.score, medalForRank(rank)));
    }

    const finalStartMs = revealTiming.drumrollTotalMs;
    if (elapsed >= finalStartMs && !live.host.finalRevealStagePlayed.final) {
      stopFx('drumrollwinner');
      playFx('final');
      live.host.finalRevealStagePlayed.final = true;
    }

    if (elapsed < finalStartMs) {
      scheduleRankingAnimationFrame();
    }
    return;
  }

  let viewPlayers = [...players];
  if (opts.animate && live.host.rankingMode) {
    const t = Date.now();
    const d = Math.max(200, Number(live.host.rankingAnimDurationMs || 2600));
    const elapsedMs = t - Number(live.host.rankingAnimStartAt || t);
    const p = Math.max(0, Math.min(1, elapsedMs / d));

    viewPlayers = viewPlayers.map((pl) => {
      const from = Number(live.host.rankingAnimFrom?.[pl.id] ?? pl.score ?? 0);
      const to = Number(live.host.rankingAnimTo?.[pl.id] ?? pl.score ?? 0);
      const score = computeCrazyCountScore(to, p, elapsedMs);
      return { ...pl, score, _from: from, _to: to };
    });

    const climbWindowMs = 1000;
    if (elapsedMs >= d - climbWindowMs) {
      viewPlayers.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    } else {
      viewPlayers.sort((a, b) => Number(b._from || 0) - Number(a._from || 0));
    }

    if (p < 1) {
      scheduleRankingAnimationFrame();
    } else {
      stopFx('counter');
    }
  }

  viewPlayers.slice(0, 10).forEach((p, i) => {
    const medals = ['🥇','🥈','🥉'];
    const prefix = medals[i] || '🏅';
    projectorScoresEl.appendChild(buildProjectorScoreItem(i + 1, p.name, p.score, prefix));
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

  const setHostTimerBar = (remainingSec, limitSec, active = true) => {
    if (!hostTimerBarFill) return;
    const limit = Math.max(1, Number(limitSec || 1));
    const remaining = Math.max(0, Number(remainingSec || 0));
    const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
    hostTimerBarFill.style.width = `${pct}%`;
    hostTimerBarFill.parentElement?.classList.toggle('active', !!active && pct > 0);
  };

  if (state.phase !== 'question' || !state.question) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = null;
    live.host.timerStartedAtMs = null;
    live.host.timerAnchorAtMs = null;
    live.host.timerInitialRemainingMs = null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = '⏱️ Time: -';
    setHostTimerBar(0, 1, false);
    return;
  }

  const rawLimitSec = Number(state.question.timeLimit);
  const hasTimeLimit = Number.isFinite(rawLimitSec) ? rawLimitSec > 0 : true;
  const limitSec = hasTimeLimit ? Math.max(1, rawLimitSec || 20) : null;

  if (state.questionClosed) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = Number(state.currentIndex || 0);
    live.host.timerStartedAtMs = Number(state.questionStartedAt || 0) || null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = hasTimeLimit ? '⏱️ Time: 0s' : '⏱️ Time: No limit';
    setHostTimerBar(0, limitSec || 1, false);
    return;
  }

  if (!hasTimeLimit) {
    live.host.timerDeadlineMs = null;
    live.host.timerForIndex = Number(state.currentIndex || 0);
    live.host.timerStartedAtMs = Number(state.questionStartedAt || 0) || null;
    stopHostTimerTicker();
    projectorTimerEl.textContent = '⏱️ Time: No limit';
    setHostTimerBar(0, 1, false);
    return;
  }

  const questionIndex = Number(state.currentIndex || 0);
  const startedAt = Number(state.questionStartedAt || 0);
  const deadlineFromState = Number(state.questionDeadlineAt || 0);
  const serverNow = Number(state.serverNow || 0);
  const now = Date.now();

  live.host.timerForIndex = questionIndex;
  live.host.timerStartedAtMs = startedAt || null;

  if (deadlineFromState > 0) {
    const driftMs = serverNow > 0 ? (now - serverNow) : 0;
    live.host.timerDeadlineMs = deadlineFromState + driftMs;
  } else {
    live.host.timerDeadlineMs = (startedAt > 0 ? startedAt : now) + limitSec * 1000;
  }

  live.host.timerLimitSec = limitSec;

  const deadlineMs = Number(live.host.timerDeadlineMs || 0);
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
    projectorTimerEl.textContent = `⏱️ Time: ${limitSec}s`;
    setHostTimerBar(limitSec, limitSec, true);
    return;
  }

  const capMs = limitSec * 1000;
  const remainingMsRaw = Math.max(0, deadlineMs - Date.now());
  const remainingMs = Math.min(capMs, remainingMsRaw);
  const remaining = Math.ceil(remainingMs / 1000);
  projectorTimerEl.textContent = `⏱️ Time: ${remaining}s`;
  setHostTimerBar(remainingMs / 1000, limitSec, true);
  startHostTimerTicker();
}

function startHostTimerTicker() {
  if (live.host.timerTicker) return;
  live.host.timerTicker = setInterval(() => {
    if (!projectorTimerEl) return;
    const deadlineMs = Number(live.host.timerDeadlineMs || 0);
    const limitSec = Math.max(1, Number(live.host.timerLimitSec || 20));
    if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) return;

    const capMs = limitSec * 1000;
    const remainingMsRaw = Math.max(0, deadlineMs - Date.now());
    const remainingMs = Math.min(capMs, remainingMsRaw);
    const remaining = Math.ceil(remainingMs / 1000);
    projectorTimerEl.textContent = `⏱️ Time: ${remaining}s`;

    if (hostTimerBarFill) {
      const pct = Math.max(0, Math.min(100, (remainingMs / capMs) * 100));
      hostTimerBarFill.style.width = `${pct}%`;
      hostTimerBarFill.parentElement?.classList.toggle('active', pct > 0);
    }
  }, 200);
}

function stopHostTimerTicker() {
  if (live.host.timerTicker) clearInterval(live.host.timerTicker);
  live.host.timerTicker = null;
  live.host.timerLimitSec = null;
  live.host.timerAnchorAtMs = null;
  live.host.timerInitialRemainingMs = null;
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
  projectorFullscreenBtn.textContent = document.fullscreenElement ? '🗗 Exit fullscreen' : '🖥️ Fullscreen';
}

function updateHallScene(state) {
  if (!hallCardEl || !hallHintEl) return;

  if (state.phase === 'lobby') {
    hallCardEl.classList.add('hall-live');
    hallHintEl.textContent = '';
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
    hallHintEl.textContent = '';
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

function playFxWithVolume(name, volume = 1) {
  if (!live.host.isPrimaryAudioHost) return;
  const a = audioFx[name];
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, Number(volume || 0)));
    a.play().catch(() => {});
  } catch {
    // ignore missing files/autoplay errors
  }
}

function playFx(name) {
  if (!live.host.isPrimaryAudioHost) return;

  if (name === 'answering') {
    if (!answeringFxPool.length) return;
    let idx = Math.floor(Math.random() * answeringFxPool.length);
    if (answeringFxPool.length > 1 && idx === live.host.lastAnsweringFxIndex) {
      idx = (idx + 1) % answeringFxPool.length;
    }
    live.host.lastAnsweringFxIndex = idx;
    const a = answeringFxPool[idx];
    live.host.currentAnsweringFx = a;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {
      // ignore missing files or autoplay errors
    }
    return;
  }

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
  if (name === 'answering') {
    const a = live.host.currentAnsweringFx;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      // ignore
    }
    live.host.currentAnsweringFx = null;
    return;
  }

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
    live.player.pinSelections = [];

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

  const renderJoinReveal = () => {
    if (!joinAnswersEl) return;
    joinAnswersEl.querySelectorAll('[data-join-correct-reveal="1"]').forEach((el) => el.remove());

    const isPoll = !!state.question?.isPoll;
    const show = !!state.questionClosed && !isPoll;
    const text = String(state.correctAnswer || '').trim();
    if (!show || !text) return;

    const reveal = document.createElement('div');
    reveal.className = 'project-text-reveal';
    reveal.dataset.joinCorrectReveal = '1';
    reveal.textContent = text;
    joinAnswersEl.appendChild(reveal);
  };

  if (state.phase !== 'question' || !state.question) {
    joinQuestionWrap.classList.add('hidden');

    if (state.phase === 'lobby') {
      setStatus(joinStatusEl, 'Waiting for teacher to start…', 'ok');
    } else if (state.phase === 'results') {
      setStatus(joinStatusEl, 'Game finished 🎉', 'ok');
      renderLeaderboardInJoin(state.leaderboard || []);
    }
    renderJoinReveal();
    return;
  }

  joinQuestionWrap.classList.remove('hidden');

  const key = `${state.phase}:${state.currentIndex}:${Number(state.questionStartedAt || 0)}`;
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    live.player.pinSelections = [];
    renderJoinQuestion(state.question);
    setStatus(joinFeedbackEl, '', '');
  }

  const questionClosed = !!state.questionClosed;
  const isPoll = !!state.question?.isPoll;
  joinSubmitBtn.disabled = questionClosed || state.answeredCurrent;

  if (questionClosed) {
    const closeReason = String(state.questionCloseReason || '').trim();
    const closedMsg = closeReason === 'all_answered'
      ? 'Everyone answered. Waiting for next question…'
      : (closeReason === 'manual_reveal' ? 'Teacher closed the question. Waiting for next question…' : 'Time is up. Waiting for next question…');

    const rr = state.revealedResult || null;
    if (!isPoll && rr && String(rr.correction || '').trim()) {
      setStatus(joinFeedbackEl, `Teacher correction: ${String(rr.correction).trim()}`, rr.correct ? 'ok' : 'bad');
    } else if (!isPoll && rr && rr.graded === true) {
      setStatus(joinFeedbackEl, rr.correct ? `Graded ✓ (+${Number(rr.pointsAwarded || 0)})` : `Graded ✗ (+${Number(rr.pointsAwarded || 0)})`, rr.correct ? 'ok' : 'bad');
    } else {
      setStatus(joinFeedbackEl, isPoll ? '🗳️ Poll closed. Results on projector.' : closedMsg, 'ok');
    }
    setStatus(joinStatusEl, isPoll ? 'Poll closed.' : 'Question closed.', 'ok');
  } else if (joinSubmitBtn.disabled) {
    const rr = state.revealedResult || null;
    if (!isPoll && rr && String(rr.correction || '').trim()) {
      setStatus(joinFeedbackEl, `Teacher correction: ${String(rr.correction).trim()}`, rr.correct ? 'ok' : 'bad');
    } else if (!isPoll && rr && rr.graded === true) {
      setStatus(joinFeedbackEl, rr.correct ? `Graded ✓ (+${Number(rr.pointsAwarded || 0)})` : `Graded ✗ (+${Number(rr.pointsAwarded || 0)})`, rr.correct ? 'ok' : 'bad');
    } else {
      setStatus(joinFeedbackEl, 'Answer submitted. Waiting for next question…', 'ok');
    }
    setStatus(joinStatusEl, 'Answer received.', 'ok');
  } else {
    setStatus(joinStatusEl, 'Question live!', 'ok');
  }

  renderJoinReveal();
}

function renderJoinQuestion(question) {
  joinPromptEl.textContent = question.prompt || '(No question text)';
  joinAnswersEl.innerHTML = '';

  const hasSharedImage = question.type !== 'pin' && !!question.imageData;
  const hasAnyImage = hasSharedImage || ((question.type === 'image_open' || question.type === 'pin') && !!question.imageData);
  joinAnswersEl.classList.toggle('has-question-image', hasSharedImage);
  if (joinPromptEl) joinPromptEl.classList.toggle('with-image', hasAnyImage);

  if (question.isPoll) {
    const note = document.createElement('p');
    note.className = 'small';
    note.textContent = 'Poll mode: anonymous results, no points.';
    joinAnswersEl.appendChild(note);
  }

  if (question.type !== 'pin' && question.type !== 'image_open' && question.imageData) {
    const preview = document.createElement('div');
    preview.className = 'pin-preview question-image-preview';
    const img = document.createElement('img');
    img.src = question.imageData;
    img.alt = 'Question image';
    img.dataset.zoomable = '1';
    preview.appendChild(img);
    joinAnswersEl.appendChild(preview);
  }

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
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
    }
    return;
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
    if (question.type === 'image_open' && question.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      joinAnswersEl.appendChild(preview);
    }

      if (question.type === 'context_gap') {
      const count = Math.max(1, Math.min(10, Number(question.gapCount || 1)));
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
      renderMatchPairsColumns(joinAnswersEl, leftItems, rightOptions, 'joinPair');
    } else if (question.type === 'speaking') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Speak your answer in class, then tap Submit answer so teacher can grade you.';
      joinAnswersEl.appendChild(note);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinTextAnswer';
      input.maxLength = 120;
      input.placeholder = (question.type === 'open' || question.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (joinSubmitBtn?.disabled) return;
        submitLiveAnswer();
      });
      joinAnswersEl.appendChild(input);
    }

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
    }
    return;
  }

  if (question.type === 'puzzle') {
    const options = (question.options || []).slice(0, 12);
    createPuzzleDnd(joinAnswersEl, options, 'joinPuzzlePieces');

    if (hasQuestionAudio(question)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '▶ Play audio';
      btn.addEventListener('click', () => playQuestionAudio(question));
      joinAnswersEl.appendChild(btn);
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

    const picksLayer = document.createElement('div');
    picksLayer.className = 'pin-picks-layer';

    const zones = Array.isArray(question.zones) && question.zones.length ? question.zones : [question.zone || { x: 50, y: 50, r: 15 }];
    const pinMode = String(question.pinMode || 'all') === 'any' ? 'any' : 'all';
    const required = pinMode === 'all' ? Math.max(1, Math.min(12, zones.length)) : 1;

    const countLabel = document.createElement('p');
    countLabel.className = 'small';
    countLabel.textContent = `Pin all correct spots: 0 / ${required}`;

    wrap.append(img, picksLayer);
    joinAnswersEl.appendChild(wrap);
    joinAnswersEl.appendChild(countLabel);

    const renderPicks = () => {
      picksLayer.innerHTML = '';
      const picks = live.player.pinSelections || [];
      countLabel.textContent = pinMode === 'all'
        ? `Pin all correct spots: ${picks.length} / ${required}`
        : `Pin one correct spot: ${Math.min(1, picks.length)} / 1`;
      picks.forEach((p) => {
        const dot = document.createElement('div');
        dot.className = 'pin-dot';
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
        picksLayer.appendChild(dot);
      });
    };

    attachPinPicker(wrap, (point) => {
      const picks = live.player.pinSelections || [];
      const nearIdx = picks.findIndex((p) => distance2D(p.x, p.y, point.x, point.y) <= 4);
      if (nearIdx >= 0) picks.splice(nearIdx, 1);
      else if (picks.length < required) picks.push(point);
      live.player.pinSelections = picks;
      live.player.pinSelection = picks[0] || null;
      renderPicks();
    });

    renderPicks();
    return;
  }
}

async function submitLiveAnswer() {
  try {
    if (previewMode.active) {
      setStatus(joinFeedbackEl, 'Unified preview: use teacher controls to move/reveal rounds.', 'ok');
      return;
    }

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

  if (q.type === 'speaking') {
    return '__spoken__';
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
    const picks = Array.isArray(live.player.pinSelections) ? live.player.pinSelections : [];
    return picks.length ? picks : null;
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
    li.textContent = `${i + 1}. ${p.name} - ${p.score} pts`;
    ul.appendChild(li);
  });

  joinAnswersEl.appendChild(ul);
}

function startPreviewMode() {
  syncQuizFromUI();
  if (!quiz.questions?.length) {
    setStatus(hostStatusEl, 'Add at least 1 question first.', 'bad');
    return;
  }

  previewMode.active = true;
  previewMode.prevPrimaryAudioHost = live.host.isPrimaryAudioHost;
  // Preview runs locally, so allow audio even when not the primary live host.
  live.host.isPrimaryAudioHost = true;
  previewMode.simStudentCount = 14;
  previewMode.simNames = randomPreviewNames(14);
  previewMode.simClassSeed = Date.now();
  previewMode.index = Math.max(0, Math.min(previewMode.index, quiz.questions.length - 1));
  previewMode.showReveal = false;
  previewMode.answeredCurrent = false;
  previewMode.revealedResult = null;
  previewMode.simStudentCount = 14;
  previewMode.simProfile = 'balanced';
  previewMode.simTimingProfile = 'staggered';
  previewMode.simTextQualityProfile = 'acceptable';
  previewMode.simEdgeCaseProfile = 'none';
  live.player.renderKey = null;
  live.player.currentQuestion = null;
  live.player.pinSelection = null;
  live.player.pinSelections = [];

  if (previewExitBtn) previewExitBtn.classList.remove('hidden');
  if (previewRerollBtn) previewRerollBtn.classList.remove('hidden');
  if (previewResimBtn) previewResimBtn.classList.remove('hidden');
  if (previewJumpInputEl) {
    previewJumpInputEl.classList.remove('hidden');
    previewJumpInputEl.value = String(Number(previewMode.index || 0) + 1);
  }
  if (previewJumpBtn) previewJumpBtn.classList.remove('hidden');

  renderPreviewFrame();
  setStatus(hostStatusEl, 'Unified preview active: fixed baseline (14 mixed simulated students).', 'ok');
  hostQuestionCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stopPreviewMode() {
  previewMode.active = false;
  if (previewMode.prevPrimaryAudioHost != null) {
    live.host.isPrimaryAudioHost = !!previewMode.prevPrimaryAudioHost;
    previewMode.prevPrimaryAudioHost = null;
  }
  previewMode.showReveal = false;
  previewMode.answeredCurrent = false;
  previewMode.revealedResult = null;
  if (previewExitBtn) previewExitBtn.classList.add('hidden');
  if (previewRerollBtn) previewRerollBtn.classList.add('hidden');
  if (previewResimBtn) previewResimBtn.classList.add('hidden');
  if (previewJumpInputEl) previewJumpInputEl.classList.add('hidden');
  if (previewJumpBtn) previewJumpBtn.classList.add('hidden');
  if (studentPreviewStackCardEl) studentPreviewStackCardEl.classList.add('hidden');
  setStatus(joinFeedbackEl, '', '');
  setStatus(hostStatusEl, 'Preview mode closed.', 'ok');
}

function buildPreviewHostQuestion(q) {
  if (!q) return null;
  const base = {
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    timeLimit: q.timeLimit,
    isPoll: !!q.isPoll,
    imageData: String(q.imageData || '') || undefined,
    zones: q.type === 'pin' ? normalizePinZones(q) : undefined,
    zone: q.type === 'pin' ? normalizePinZones(q)[0] : undefined,
    pinMode: q.type === 'pin' ? (String(q.pinMode || 'all') === 'any' ? 'any' : 'all') : undefined,
  };

  if (['mcq', 'multi', 'tf', 'audio'].includes(q.type)) {
    const answers = (q.answers || []).map((a) => ({ text: String(a.text || ''), isCorrect: !!a.correct }));
    return { ...base, answers, correctIndexes: answers.map((a, i) => (a.isCorrect ? i : null)).filter((x) => x !== null) };
  }

  if (q.type === 'text') return { ...base, accepted: q.accepted || [] };
  if (q.type === 'puzzle') return { ...base, options: q.items || [], items: q.items || [] };
  if (q.type === 'slider') return { ...base, min: q.min, max: q.max, target: q.target, margin: q.margin, unit: q.unit };
  if (q.type === 'context_gap') return { ...base, gapCount: Number((q.gaps || []).filter(Boolean).length || 0) };
  if (q.type === 'match_pairs') {
    return {
      ...base,
      leftItems: (q.pairs || []).map((p) => String(p.left || '')).filter(Boolean),
      rightOptions: (q.pairs || []).map((p) => String(p.right || '')).filter(Boolean),
      pairs: q.pairs || [],
    };
  }
  if (q.type === 'error_hunt') return { ...base, corrected: q.corrected, requiredErrors: q.requiredErrors };
  return base;
}

function evaluatePreviewAnswer(q, answer) {
  if (!q) return { correct: false };
  if (['mcq', 'tf', 'audio'].includes(q.type)) {
    const selected = Number(answer);
    const correctIndex = (q.answers || []).findIndex((a) => !!a.correct);
    return { correct: Number.isFinite(selected) && selected === correctIndex };
  }
  if (q.type === 'multi') {
    const selected = Array.isArray(answer) ? answer.map(Number).filter(Number.isFinite) : [];
    const expected = (q.answers || []).map((a, i) => (a.correct ? i : null)).filter((x) => x !== null);
    return { correct: selected.length === expected.length && selected.every((i) => expected.includes(i)) };
  }
  if (q.type === 'text') {
    const guess = normalizeTextAnswer(answer);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    return { correct: accepted.length ? accepted.includes(guess) : false };
  }
  if (q.type === 'open' || q.type === 'image_open' || q.type === 'speaking') return { correct: false, graded: false };
  if (q.type === 'context_gap') {
    return { correct: isContextGapCorrect(answer, q.gaps || []) };
  }
  if (q.type === 'match_pairs') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    return { correct: isMatchPairsCorrect(guess, q.pairs || []) };
  }
  if (q.type === 'error_hunt') {
    const rewrite = normalizeTextAnswer(answer?.rewrite || '');
    const corrected = normalizeTextAnswer(q.corrected || '');
    return { correct: rewrite && rewrite === corrected };
  }
  if (q.type === 'puzzle') {
    const expected = (q.items || []).map(normalizeTextAnswer).filter(Boolean);
    const got = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
    return { correct: got.length === expected.length && JSON.stringify(got) === JSON.stringify(expected) };
  }
  if (q.type === 'slider') {
    const value = Number(answer);
    const tol = sliderTolerance(q.margin, q.min, q.max);
    return { correct: Number.isFinite(value) && Math.abs(value - Number(q.target)) <= tol };
  }
  if (q.type === 'pin') {
    const zones = normalizePinZones(q);
    const picksRaw = Array.isArray(answer) ? answer : (answer && Number.isFinite(Number(answer.x)) && Number.isFinite(Number(answer.y)) ? [answer] : []);
    const picks = picksRaw
      .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!picks.length) return { correct: false };
    const pinMode = String(q.pinMode || 'all') === 'any' ? 'any' : 'all';
    const coveredCount = zones.filter((z) => picks.some((p) => distance2D(p.x, p.y, Number(z.x), Number(z.y)) <= Number(z.r))).length;
    const ok = pinMode === 'any' ? coveredCount >= 1 : coveredCount >= zones.length;
    return { correct: ok };
  }
  return { correct: false };
}

function hashStringInt(text = '') {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

function seededUnit(key = '') {
  return (hashStringInt(key) % 10000) / 10000;
}

function previewCorrectRatio(profile) {
  if (profile === 'mostly_correct') return 0.75;
  if (profile === 'mostly_wrong') return 0.25;
  return 0.5;
}

function previewAnsweredRatio(timingProfile) {
  if (timingProfile === 'instant') return 1;
  if (timingProfile === 'last_second') return 0.4;
  if (timingProfile === 'mixed_late') return 0.55;
  return 0.7;
}

function applyPreviewEdgeCase(players, edgeCase = 'none') {
  const next = (players || []).map((p) => ({ ...p }));
  if (edgeCase === 'no_submissions') {
    next.forEach((p) => {
      p.answeredCurrent = false;
      p.previewResult = 'none';
      p.previewBet = 0;
    });
    return next;
  }
  if (edgeCase === 'all_correct') {
    next.forEach((p, i) => {
      p.answeredCurrent = true;
      p.score = Math.max(0, 1000 - (i * 20));
      p.previewResult = 'correct';
      p.previewBet = p.previewBet || 1;
    });
    return next;
  }
  if (edgeCase === 'all_wrong') {
    next.forEach((p) => {
      p.answeredCurrent = true;
      p.score = 0;
      p.previewResult = 'wrong';
      p.previewBet = p.previewBet || 1;
    });
    return next;
  }
  return next;
}

function randomPreviewNames(count = 14) {
  const first = ['Nova','Leo','Mia','Kai','Iris','Nora','Adam','Luna','Eric','Sara','Dani','Pol','Aina','Hugo','Noa','Jan','Laia','Marc','Clara','Pau'];
  const last = ['Orion','Vega','Cosmo','Stellar','Comet','Nebula','Meteor','Pulse','Quantum','Drift','Ray','Orbit'];
  const out = [];
  const used = new Set();
  const target = Math.max(1, Math.min(60, Number(count || 14)));
  while (out.length < target) {
    const name = `${first[Math.floor(Math.random()*first.length)]} ${last[Math.floor(Math.random()*last.length)]}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push(name);
  }
  return out;
}

function buildPreviewPlayersSim(count, profile, timingProfile, points = 1000) {
  const total = Math.max(1, Math.min(60, Number(count || 10)));
  const ratio = previewCorrectRatio(profile);
  const answeredRatio = previewAnsweredRatio(timingProfile);
  const answeredCut = Math.max(1, Math.round(total * answeredRatio));
  const players = [];
  for (let i = 0; i < total; i++) {
    const rank = i + 1;
    const answeredCurrent = rank <= answeredCut;
    const roll = seededUnit(`${previewMode.simQuestionSeed}:${rank}:roll`);
    const correct = answeredCurrent && (roll < ratio);
    const hasBet = answeredCurrent && seededUnit(`${previewMode.simQuestionSeed}:${rank}:bet`) < 0.4;
    const betPool = [1, 2, 3];
    const bet = hasBet ? betPool[Math.floor(seededUnit(`${previewMode.simQuestionSeed}:${rank}:betv`) * betPool.length)] : 0;
    players.push({
      id: `p${rank}`,
      name: previewMode.simNames?.[i] || `Student ${rank}`,
      score: correct ? Math.max(0, points - (rank * 20)) : Math.max(0, Math.round(points * 0.1)),
      answeredCurrent,
      previewResult: answeredCurrent ? (correct ? 'correct' : 'wrong') : 'none',
      previewBet: bet,
    });
  }
  return players;
}

function buildPreviewTextAnswer(name, quality, prompt = '') {
  const topic = String(prompt || 'the topic').split(/[.?!]/)[0].trim() || 'the topic';
  if (quality === 'excellent') return `${name}: Clear, accurate answer with strong example about ${topic}.`;
  if (quality === 'weak') return `${name}: maybe about ${topic}, not sure...`;
  if (quality === 'empty') return '';
  return `${name}: Correct idea with simple explanation about ${topic}.`;
}

function getPreviewTeacherPatch(qIndex, playerId) {
  const byQ = previewMode.simTeacherByQ || {};
  const qKey = String(Number(qIndex || 0));
  return byQ?.[qKey]?.[String(playerId || '')] || null;
}

function setPreviewTeacherPatch(qIndex, playerId, patch) {
  const qKey = String(Number(qIndex || 0));
  const pKey = String(playerId || '');
  if (!previewMode.simTeacherByQ[qKey]) previewMode.simTeacherByQ[qKey] = {};
  previewMode.simTeacherByQ[qKey][pKey] = {
    ...(previewMode.simTeacherByQ[qKey][pKey] || {}),
    ...(patch || {}),
  };
}

function buildPreviewOpenResponses(question, simPlayers, quality) {
  const teacherGraded = question && (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || (question.type === 'text' && !(question.accepted || []).filter((x) => String(x || '').trim()).length));
  if (!teacherGraded) return [];

  return simPlayers
    .filter((p) => p.answeredCurrent)
    .map((p, idx) => {
      const q = quality === 'acceptable' && idx % 4 === 0 ? 'excellent' : quality;
      const answer = question.type === 'speaking'
        ? '__spoken__'
        : buildPreviewTextAnswer(p.name, q, question.prompt || '');
      const base = {
        playerId: p.id,
        name: p.name,
        answer,
        graded: false,
        pointsAwarded: 0,
        hidden: false,
        correction: '',
        modelAnswer: false,
      };
      const patch = getPreviewTeacherPatch(previewMode.index, p.id);
      return patch ? { ...base, ...patch } : base;
    });
}

function summarizePreviewStudentAnswer(question, player, openResponseMap = null) {
  if (!question || !player?.answeredCurrent) return '(no submission)';

  if (openResponseMap && (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'text')) {
    const txt = String(openResponseMap.get(player.id) || '').trim();
    if (txt) return txt;
  }

  const ok = player.previewResult === 'correct';
  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const correctIdx = Math.max(0, answers.findIndex((a) => !!a.isCorrect));
    const wrongIdx = Math.max(0, answers.findIndex((a, i) => !a.isCorrect && i !== correctIdx));
    const idx = ok ? correctIdx : wrongIdx;
    return `option ${idx + 1}: ${String(answers[idx]?.text || '').trim() || '(blank option)'}`;
  }
  if (question.type === 'multi') return ok ? 'multi: full correct set' : 'multi: partial/wrong set';
  if (question.type === 'context_gap') return ok ? 'gaps: all correct' : 'gaps: one or more wrong';
  if (question.type === 'match_pairs') return ok ? 'pairs: all matched' : 'pairs: mismatched pairs';
  if (question.type === 'error_hunt') return ok ? 'rewrite: corrected sentence' : 'rewrite: needs fixes';
  if (question.type === 'open' || question.type === 'image_open') return ok ? 'open: strong response' : 'open: basic response';
  if (question.type === 'speaking') return ok ? 'speaking: clear oral response' : 'speaking: oral response needs improvement';
  if (question.type === 'slider') {
    const min = Number(question.min || 0);
    const max = Number(question.max || 100);
    const target = Number(question.target || ((min + max) / 2));
    const spread = Math.max(1, Math.round((max - min) * 0.12));
    const value = ok ? target : Math.min(max, target + spread);
    return `slider value: ${value}${question.unit ? ` ${question.unit}` : ''}`;
  }
  if (question.type === 'pin') return ok ? 'pin: inside valid zone' : 'pin: outside valid zone';
  if (question.type === 'puzzle') return ok ? 'puzzle: correct order' : 'puzzle: wrong order';
  return ok ? 'correct submission' : 'incorrect submission';
}

function renderPreviewStudentStack(sim) {
  if (!studentPreviewStackEl) return;
  studentPreviewStackEl.innerHTML = '';
  const list = sim?.hostState?.players || [];
  const openResponseMap = new Map((sim?.hostState?.openResponses || []).map((r) => [String(r.playerId || ''), String(r.answer || '')]));

  if (studentPreviewSummaryEl) {
    const correct = list.filter((p) => p.previewResult === 'correct').length;
    const wrong = list.filter((p) => p.previewResult === 'wrong').length;
    const none = list.filter((p) => p.previewResult === 'none').length;
    const bets = list.filter((p) => Number(p.previewBet || 0) > 0).length;
    const submitted = list.length - none;
    const phase = previewMode.showReveal ? 'reveal' : 'question';
    const qSeed = String(previewMode.simQuestionSeed || 0).slice(-6);
    studentPreviewSummaryEl.textContent = `Summary: ${submitted}/${list.length} submitted · ${correct} correct · ${wrong} wrong · ${none} no submission · ${bets} with bet · phase: ${phase} · seed:${qSeed}`;
  }

  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card top-space';
    const status = p.previewResult === 'correct'
      ? 'submitted ✅'
      : (p.previewResult === 'wrong' ? 'submitted ❌' : 'no submission');
    const bet = Number(p.previewBet || 0);
    const betTxt = bet > 0 ? ` · bet x${bet}` : '';
    const answerText = summarizePreviewStudentAnswer(sim?.hostState?.question, p, openResponseMap);
    const stateChip = p.previewResult === 'correct'
      ? '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#e8f8ee;color:#0f5e26;">correct</span>'
      : (p.previewResult === 'wrong'
        ? '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#fdeaea;color:#8b1e1e;">wrong</span>'
        : '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#f1f5f9;color:#334155;">no submit</span>');
    const betChip = bet > 0
      ? `<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#fef3c7;color:#7c2d12;">bet x${bet}</span>`
      : '<span class="small" style="padding:.1rem .4rem;border-radius:999px;background:#f1f5f9;color:#334155;">no bet</span>';
    card.innerHTML = `<div class="row spread gap"><strong>${escapeHtml(p.name)}</strong><span class="small">#${i + 1}</span></div><div class="row gap top-space">${stateChip}${betChip}</div><div class="small">Score: ${Number(p.score || 0)} · ${status}${betTxt}</div><div class="small muted">Answer: ${escapeHtml(answerText)}</div>`;
    studentPreviewStackEl.appendChild(card);
  });
}

function buildPreviewAnswerHistory(question, simPlayers, openResponses) {
  const q = question || {};
  const openMap = new Map((openResponses || []).map((r) => [String(r.playerId || ''), r]));
  const entries = (simPlayers || []).map((p) => {
    const r = openMap.get(String(p.id || ''));
    const graded = !!r?.graded;
    const pointsAwarded = Number(r?.pointsAwarded || 0);
    const answerText = r ? String(r.answer || '') : summarizePreviewStudentAnswer(q, p, new Map((openResponses || []).map((x) => [String(x.playerId || ''), String(x.answer || '')])));
    return {
      playerId: p.id,
      name: p.name,
      answerText,
      correct: p.previewResult === 'correct',
      graded,
      pointsAwarded,
      hidden: false,
      correction: String(r?.correction || ''),
      modelAnswer: !!r?.modelAnswer,
    };
  });

  return [{
    qIndex: Number(previewMode.index || 0),
    prompt: String(q.prompt || ''),
    type: String(q.type || ''),
    entries,
  }];
}

function previewCloseReasonForSeed(seed) {
  const n = Number(seed || 0) % 3;
  if (n === 0) return 'manual_reveal';
  if (n === 1) return 'all_answered';
  return 'timeout';
}

function buildPreviewSimulationState(question) {
  const safeQuestion = buildPreviewHostQuestion(question);
  previewMode.simQuestionSeed = hashStringInt(`${previewMode.simClassSeed}:${previewMode.index}:${question?.id || question?.prompt || ''}`);
  const simPlayersBase = buildPreviewPlayersSim(
    previewMode.simStudentCount,
    previewMode.simProfile,
    previewMode.simTimingProfile,
    Number(question?.points || 1000),
  );
  const simPlayers = applyPreviewEdgeCase(simPlayersBase, previewMode.simEdgeCaseProfile);
  const answeredCount = simPlayers.filter((p) => p.answeredCurrent).length;
  const me = simPlayers[0] || { name: 'Preview Student', score: 0, answeredCurrent: false };

  const openResponses = buildPreviewOpenResponses(question, simPlayers, previewMode.simTextQualityProfile);
  const now = Date.now();
  const qLimit = Number(question?.timeLimit || 0);
  const startedAt = now - 4000;
  const deadlineAt = qLimit > 0 ? (startedAt + (qLimit * 1000)) : null;
  const closeReason = previewMode.showReveal ? previewCloseReasonForSeed(previewMode.simQuestionSeed) : null;
  const hostState = {
    phase: 'question',
    currentIndex: previewMode.index,
    totalQuestions: quiz.questions.length,
    responseCount: answeredCount,
    playerCount: simPlayers.length,
    question: safeQuestion,
    questionStartedAt: startedAt,
    questionDeadlineAt: deadlineAt,
    questionClosed: !!previewMode.showReveal,
    questionClosedAt: previewMode.showReveal ? now : null,
    questionCloseReason: closeReason,
    correctAnswer: '',
    pollSummary: null,
    openResponses,
    answerHistory: buildPreviewAnswerHistory(question, simPlayers, openResponses),
    players: simPlayers,
    reactions: [],
  };

  const studentState = {
    phase: 'question',
    name: me.name,
    currentIndex: previewMode.index,
    totalQuestions: quiz.questions.length,
    score: Number(me.score || 0),
    answeredCurrent: previewMode.answeredCurrent || !!me.answeredCurrent,
    question: safeQuestion,
    questionClosed: !!previewMode.showReveal,
    questionStartedAt: startedAt,
    questionDeadlineAt: deadlineAt,
    questionClosedAt: previewMode.showReveal ? now : null,
    questionCloseReason: closeReason,
    correctAnswer: '',
    revealedResult: previewMode.revealedResult,
    leaderboard: simPlayers.slice(0, 10).map((p) => ({ name: p.name, score: p.score })),
  };

  return { hostState, studentState };
}

function renderPreviewFrame() {
  if (!previewMode.active) return;
  const q = quiz.questions[previewMode.index];
  if (!q) return;

  const sim = buildPreviewSimulationState(q);

  if (studentPreviewStackCardEl) studentPreviewStackCardEl.classList.remove('hidden');
  if (liveProgressEl) liveProgressEl.textContent = `Progress: ${previewMode.index + 1} / ${quiz.questions.length}`;
  if (livePhaseEl) {
    const reason = sim.hostState.questionClosed ? ` · close=${sim.hostState.questionCloseReason || 'manual_reveal'}` : '';
    livePhaseEl.textContent = `Phase: question${reason}`;
  }
  if (liveResponsesEl) liveResponsesEl.textContent = `Answers this round: ${sim.hostState.responseCount} / ${sim.hostState.playerCount}`;
  if (projectorAnswersEl) projectorAnswersEl.textContent = `👥 Answers: ${sim.hostState.responseCount} / ${sim.hostState.playerCount}`;
  renderProjectorScores(sim.hostState.players || []);
  renderHostQuestion(sim.hostState);
  renderHostAnswerHistory(sim.hostState);
  renderPreviewStudentStack(sim);
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

  if (q.type === 'text' || q.type === 'open' || q.type === 'image_open' || q.type === 'speaking' || q.type === 'context_gap' || q.type === 'error_hunt') {
    if (q.type === 'image_open' && q.imageData) {
      const preview = document.createElement('div');
      preview.className = 'pin-preview question-image-preview';
      const img = document.createElement('img');
      img.src = q.imageData;
      img.alt = 'Image prompt';
      img.dataset.zoomable = '1';
      preview.appendChild(img);
      answersEl.appendChild(preview);
    }

    if (q.type === 'context_gap') {
      const count = Math.max(1, Math.min(10, Number((q.gaps || []).filter(Boolean).length || 1)));
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
      renderMatchPairsColumns(answersEl, leftItems, rightOptions, 'soloPair');
    } else if (q.type === 'speaking') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Speaking question: answer orally and get graded by teacher in live mode.';
      answersEl.appendChild(note);
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
    const options = (q.options || shuffle([...(q.items || []).filter(Boolean)])).slice(0, 12);
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

  if (q.type === 'speaking') {
    return { correct: false, hint: 'Speaking answer is teacher-graded in live mode.' };
  }

  if (q.type === 'context_gap') {
    const guess = [...answersEl.querySelectorAll('[data-solo-gap]')].map((el) => String(el.value || ''));
    const expectedOptions = contextGapExpectedOptions(q.gaps || []);
    if (!guess.length || guess.filter((x) => normalizeTextAnswer(x)).length !== expectedOptions.length) {
      return { correct: false, hint: 'Complete all blanks.' };
    }
    const expectedHint = expectedOptions.map((opts) => opts.join(' / ')).join(' | ');
    return { correct: isContextGapCorrect(guess, q.gaps || []), hint: `Expected: ${expectedHint}` };
  }

  if (q.type === 'match_pairs') {
    const guess = [...answersEl.querySelectorAll('[data-solo-pair]')].map((el) => normalizeTextAnswer(el.value)).filter(Boolean);
    const expected = (q.pairs || []).map((p) => normalizeTextAnswer(p.right)).filter(Boolean);
    if (!guess.length || guess.length !== expected.length) return { correct: false, hint: 'Match all pairs first.' };
    return { correct: isMatchPairsCorrect(guess, q.pairs || []), hint: `Expected: ${expected.join(' | ')}` };
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
    const zones = Array.isArray(q.zones) && q.zones.length ? q.zones : [q.zone || { x: 50, y: 50, r: 15 }];
    const hits = zones.filter((z) => {
      const d = distance2D(soloGame.pinSelection.x, soloGame.pinSelection.y, Number(z.x || 50), Number(z.y || 50));
      return d <= Number(z.r || 15);
    }).length;
    const pinMode = String(q.pinMode || 'all') === 'any' ? 'any' : 'all';
    const ok = pinMode === 'any' ? hits >= 1 : hits >= zones.length;
    return { correct: ok, hint: ok ? '' : (pinMode === 'all' ? 'Try closer to all target areas.' : 'Try closer to a target area.') };
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

function collapseAllQuestions(targetQuiz) {
  if (!targetQuiz || !Array.isArray(targetQuiz.questions)) return;
  targetQuiz.questions.forEach((q) => {
    if (!q) return;
    q.collapsed = true;
  });
}

function makeMcqQuestion(opts = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'mcq',
    prompt: '',
    points: 1000,
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
    audioEnabled: !!opts.withAudio,
    audioMode: 'tts',
    audioText: '',
    language: 'en-US-Wave',
    audioData: '',
  };
}

function makeSpeakingQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'speaking',
    prompt: 'Speak your answer when called by the teacher.',
    points: 1000,
    timeLimit: 0,
    audioEnabled: false,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
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
    timeLimit: 0,
    imageData: '',
    zones: [{ x: 50, y: 50, r: 15 }],
    pinMode: 'all',
  };
}

function normalizePinZones(question) {
  const source = Array.isArray(question?.zones) && question.zones.length
    ? question.zones
    : (question?.zone ? [question.zone] : [{ x: 50, y: 50, r: 15 }]);

  return source
    .slice(0, 12)
    .map((z) => ({
      x: round(clamp(Number(z?.x ?? 50), 0, 100), 1),
      y: round(clamp(Number(z?.y ?? 50), 0, 100), 1),
      r: round(clamp(Number(z?.r ?? 15), 1, 100), 1),
    }));
}

function normalizeQuizForLive(raw) {
  const normalized = {
    version: 1,
    title: String(raw.title || '').slice(0, 1200),
    questions: [],
  };

  (raw.questions || []).forEach((q) => {
    const base = {
      id: String(q.id || crypto.randomUUID()),
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 1200),
      points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
      timeLimit: normalizeTimeLimitValue(q.timeLimit, q.type),
      isPoll: !!q.isPoll,
      audioEnabled: !!q.audioEnabled || q.type === 'audio',
      audioMode: ['tts', 'file'].includes(String(q.audioMode || '')) ? String(q.audioMode) : 'tts',
      audioText: String(q.audioText || '').slice(0, 1200),
      language: String(q.language || 'en-US-Wave').slice(0, 32) || 'en-US-Wave',
      audioData: String(q.audioData || ''),
      imageData: String(q.imageData || ''),
    };

    if (['mcq', 'multi', 'audio'].includes(q.type)) {
      const answers = (q.answers || [])
        .slice(0, 10)
        .map((a) => ({ text: String(a.text || '').slice(0, 90), correct: !!a.correct }))
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
      const tfTrue = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'true');
      const tfFalse = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'false');
      const answers = [
        { text: 'True', correct: tfTrue ? !!tfTrue.correct : !!q.answers?.[0]?.correct },
        { text: 'False', correct: tfFalse ? !!tfFalse.correct : !!q.answers?.[1]?.correct },
      ];
      if (!answers.some((a) => a.correct)) answers[0].correct = true;
      normalized.questions.push({ ...base, answers });
      return;
    }

    if (q.type === 'text') {
      const accepted = (q.accepted || []).slice(0, 20).map((x) => String(x || '').slice(0, 120));
      normalized.questions.push({ ...base, accepted });
      return;
    }

    if (q.type === 'open') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'speaking') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'image_open') {
      if (!q.imageData) return;
      normalized.questions.push({ ...base, imageData: String(q.imageData || '') });
      return;
    }

    if (q.type === 'context_gap') {
      const gaps = (q.gaps || []).map((x) => String(x || '').slice(0, 120)).filter(Boolean).slice(0, 10);
      if (gaps.length < 1) return;
      normalized.questions.push({ ...base, gaps });
      return;
    }

    if (q.type === 'match_pairs') {
      const pairs = (q.pairs || [])
        .map((p) => ({ left: String(p?.left || '').slice(0, 72).trim(), right: String(p?.right || '').slice(0, 72).trim() }))
        .filter((p) => p.left && p.right)
        .slice(0, 10);
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
      const items = (q.items || []).map((x) => String(x || '').slice(0, 90)).filter(Boolean).slice(0, 12);
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
      const zones = normalizePinZones(q);
      normalized.questions.push({
        ...base,
        imageData: String(q.imageData || ''),
        zones,
        zone: zones[0],
        pinMode: String(q.pinMode || 'all') === 'any' ? 'any' : 'all',
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

function isStorageQuotaError(err) {
  if (!err) return false;
  const name = String(err.name || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  return name.includes('quota') || msg.includes('exceeded the quota') || msg.includes('quota exceeded');
}

function saveQuiz(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    if (isStorageQuotaError(err)) return false;
    throw err;
  }
}

function loadQuizLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_LIBRARY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQuizLibrary(items) {
  localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(items));
}

function saveQuizToLibrary(name, data) {
  const label = String(name || '').trim().slice(0, 140) || 'Untitled quiz';
  const items = loadQuizLibrary();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next = {
    id,
    name: label,
    updatedAt: Date.now(),
    quiz: JSON.parse(JSON.stringify(data || createEmptyQuiz())),
  };

  items.push(next);
  const trimmed = items.slice(-50);
  saveQuizLibrary(trimmed);
  return next;
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
      speaking: 'Speaking answer (teacher-graded)',
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

function iconForType(type) {
  return (
    {
      mcq: '🔘',
      multi: '☑️',
      tf: '✅❌',
      text: '⌨️',
      open: '💬',
      speaking: '🗣️',
      image_open: '🖼️',
      context_gap: '🕳️',
      match_pairs: '🔗',
      error_hunt: '🕵️',
      puzzle: '🧩',
      audio: '🔊',
      slider: '📐',
      pin: '📍',
    }[type] || ''
  );
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'open', 'speaking', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'pin'].includes(type)) return 20;
  return 5;
}

function normalizeTimeLimitValue(value, type) {
  const raw = String(value ?? '').trim();
  if (raw === '') return 20;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  if (n <= 0) return 0;
  return clamp(n, minTimeByType(type), 240);
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

function parseAcceptedGapOptions(value) {
  return String(value || '')
    .split(',')
    .map((x) => normalizeTextAnswer(x))
    .filter(Boolean);
}

function contextGapExpectedOptions(gaps) {
  return (Array.isArray(gaps) ? gaps : [])
    .map((g) => {
      const opts = parseAcceptedGapOptions(g);
      return opts.length ? opts : [normalizeTextAnswer(g)];
    })
    .filter((opts) => opts.some(Boolean));
}

function isContextGapCorrect(guessRaw, gaps) {
  const guess = Array.isArray(guessRaw) ? guessRaw.map(normalizeTextAnswer).filter(Boolean) : [];
  const expected = contextGapExpectedOptions(gaps);
  if (!guess.length || guess.length !== expected.length) return false;
  return guess.every((g, i) => expected[i].includes(g));
}

function isMatchPairsCorrect(guessRaw, pairsRaw) {
  const pairs = (Array.isArray(pairsRaw) ? pairsRaw : [])
    .map((p) => ({ left: normalizeTextAnswer(p?.left), right: normalizeTextAnswer(p?.right) }))
    .filter((p) => p.left && p.right);
  const guess = Array.isArray(guessRaw) ? guessRaw.map(normalizeTextAnswer).filter(Boolean) : [];
  if (!pairs.length || guess.length !== pairs.length) return false;

  const groups = new Map();
  pairs.forEach((p, idx) => {
    if (!groups.has(p.left)) groups.set(p.left, []);
    groups.get(p.left).push({ idx, right: p.right });
  });

  for (const entries of groups.values()) {
    const expected = entries.map((x) => x.right).sort();
    const got = entries.map((x) => guess[x.idx] || '').sort();
    if (JSON.stringify(expected) !== JSON.stringify(got)) return false;
  }
  return true;
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
    const startEdit = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
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
    };

    chip.addEventListener('dblclick', startEdit);
    chip.addEventListener('click', (event) => {
      if (!chip.classList.contains('active')) return;
      startEdit(event);
    });
  });
}

function ensureTimerProgressBar(cardEl, id) {
  if (!cardEl) return null;
  let bar = cardEl.querySelector(`[data-timer-bar="${id}"]`);
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'timer-progress-bar';
    bar.dataset.timerBar = id;
    const fill = document.createElement('div');
    fill.className = 'timer-progress-fill';
    bar.appendChild(fill);
    cardEl.prepend(bar);
  }
  return bar.querySelector('.timer-progress-fill');
}

function formatPollAnswerForHost(answer) {
  if (Array.isArray(answer)) return answer.join(' | ') || '(blank)';
  if (answer && typeof answer === 'object') {
    if (typeof answer.rewrite === 'string') return answer.rewrite || '(blank)';
    if (Number.isFinite(answer.x) || Number.isFinite(answer.y)) {
      return `(${Math.round(Number(answer.x || 0))}%, ${Math.round(Number(answer.y || 0))}%)`;
    }
    return JSON.stringify(answer);
  }
  const s = String(answer || '').trim();
  return s || '(blank)';
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

function renderMatchPairsColumns(container, leftItems, rightOptions, datasetKey) {
  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap match-pairs-wrap-interactive';

  const svgNs = 'http://www.w3.org/2000/svg';
  const lineLayer = document.createElementNS(svgNs, 'svg');
  lineLayer.classList.add('match-pairs-lines');

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  const rightButtonsByValue = new Map();

  let selectedLeft = -1;
  let selectedRight = '';
  const rows = [];

  const clearDropTargets = () => {
    leftCol.querySelectorAll('.match-drop-target').forEach((el) => el.classList.remove('match-drop-target'));
  };

  const assignPair = (leftIdx, rightValue) => {
    const value = String(rightValue || '').trim();
    if (leftIdx < 0 || !value) return;
    rows.forEach((r) => {
      if (String(r.hidden.value || '') === value) r.hidden.value = '';
    });
    rows[leftIdx].hidden.value = value;
    selectedLeft = -1;
    selectedRight = '';
    refreshUi();
  };

  const drawConnections = () => {
    lineLayer.innerHTML = '';
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;

    lineLayer.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    lineLayer.setAttribute('width', String(wrapRect.width));
    lineLayer.setAttribute('height', String(wrapRect.height));

    rows.forEach((row) => {
      const value = String(row.hidden.value || '').trim();
      if (!value) return;
      const target = rightButtonsByValue.get(value);
      if (!target) return;

      const leftRect = row.container.getBoundingClientRect();
      const rightRect = target.getBoundingClientRect();

      const x1 = leftRect.right - wrapRect.left;
      const y1 = leftRect.top + (leftRect.height / 2) - wrapRect.top;
      const x2 = rightRect.left - wrapRect.left;
      const y2 = rightRect.top + (rightRect.height / 2) - wrapRect.top;

      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(Math.max(0, x1)));
      line.setAttribute('y1', String(Math.max(0, y1)));
      line.setAttribute('x2', String(Math.max(0, x2)));
      line.setAttribute('y2', String(Math.max(0, y2)));
      line.classList.add('match-connection-line');
      lineLayer.appendChild(line);
    });
  };

  const refreshUi = () => {
    rows.forEach((row, idx) => {
      row.container.classList.toggle('active', idx === selectedLeft);
      const val = String(row.hidden.value || '').trim();
      row.container.classList.toggle('filled', !!val);
    });

    const used = new Set(rows.map((r) => String(r.hidden.value || '').trim()).filter(Boolean));
    rightCol.querySelectorAll('[data-match-right]').forEach((btn) => {
      const value = String(btn.dataset.matchRight || '');
      const isUsed = used.has(value);
      btn.classList.toggle('active', isUsed || value === selectedRight);
      btn.disabled = false;
    });

    requestAnimationFrame(drawConnections);
  };

  leftItems.forEach((left, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'match-pair-left';

    const leftText = document.createElement('span');
    leftText.className = 'match-left-text';
    leftText.textContent = left;

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.dataset[datasetKey] = String(i);

    row.append(leftText, hidden);
    row.addEventListener('click', () => {
      if (selectedRight) {
        assignPair(i, selectedRight);
        return;
      }
      selectedLeft = selectedLeft === i ? -1 : i;
      refreshUi();
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hidden.value = '';
      refreshUi();
    });

    row.addEventListener('dragover', (e) => {
      const value = e.dataTransfer?.getData('text/match-right');
      if (!value) return;
      e.preventDefault();
      clearDropTargets();
      row.classList.add('match-drop-target');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('match-drop-target');
    });

    row.addEventListener('drop', (e) => {
      const value = e.dataTransfer?.getData('text/match-right');
      if (!value) return;
      e.preventDefault();
      clearDropTargets();
      assignPair(i, value);
    });

    rows.push({ container: row, hidden });
    leftCol.appendChild(row);
  });

  rightOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.matchRight = String(opt || '');
    btn.textContent = String(opt || '');
    btn.draggable = true;

    btn.addEventListener('click', () => {
      const value = btn.dataset.matchRight || '';
      if (selectedLeft >= 0) {
        assignPair(selectedLeft, value);
        return;
      }
      selectedRight = selectedRight === value ? '' : value;
      refreshUi();
    });

    btn.addEventListener('dragstart', (e) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.setData('text/match-right', btn.dataset.matchRight || '');
      e.dataTransfer.effectAllowed = 'move';
    });

    rightButtonsByValue.set(String(opt || ''), btn);
    rightCol.appendChild(btn);
  });

  wrap.append(leftCol, rightCol, lineLayer);
  container.appendChild(wrap);
  window.addEventListener('resize', drawConnections);
  refreshUi();
}

function renderMatchPairsPreview(container, leftItems, rightOptions) {
  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap';

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  leftItems.forEach((left) => {
    const row = document.createElement('div');
    row.className = 'match-pair-left';

    const leftText = document.createElement('span');
    leftText.className = 'match-left-text';
    leftText.textContent = left;

    row.append(leftText);
    leftCol.appendChild(row);
  });

  rightOptions.forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'btn';
    item.textContent = String(opt || '');
    rightCol.appendChild(item);
  });

  wrap.append(leftCol, rightCol);
  container.appendChild(wrap);
}

function renderMatchPairsReveal(container, pairs) {
  const rows = Array.isArray(pairs)
    ? pairs
      .map((p) => ({ left: String(p?.left || '').trim(), right: String(p?.right || '').trim() }))
      .filter((p) => p.left && p.right)
    : [];

  if (!rows.length) {
    appendBigReveal('No pairs to reveal.');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'match-pairs-wrap match-pairs-wrap-interactive';

  const svgNs = 'http://www.w3.org/2000/svg';
  const lineLayer = document.createElementNS(svgNs, 'svg');
  lineLayer.classList.add('match-pairs-lines');

  const leftCol = document.createElement('div');
  leftCol.className = 'match-pairs-col match-pairs-col-left';
  const rightCol = document.createElement('div');
  rightCol.className = 'match-pairs-col match-pairs-col-right';

  const leftEls = [];
  const rightEls = [];

  rows.forEach((pair) => {
    const left = document.createElement('div');
    left.className = 'match-pair-left filled';
    left.textContent = pair.left;
    leftCol.appendChild(left);
    leftEls.push(left);

    const right = document.createElement('div');
    right.className = 'btn';
    right.textContent = pair.right;
    rightCol.appendChild(right);
    rightEls.push(right);
  });

  const draw = () => {
    lineLayer.innerHTML = '';
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;

    lineLayer.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    lineLayer.setAttribute('width', String(wrapRect.width));
    lineLayer.setAttribute('height', String(wrapRect.height));

    leftEls.forEach((leftEl, i) => {
      const rightEl = rightEls[i];
      if (!rightEl) return;
      const l = leftEl.getBoundingClientRect();
      const r = rightEl.getBoundingClientRect();

      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(Math.max(0, l.right - wrapRect.left)));
      line.setAttribute('y1', String(Math.max(0, l.top + (l.height / 2) - wrapRect.top)));
      line.setAttribute('x2', String(Math.max(0, r.left - wrapRect.left)));
      line.setAttribute('y2', String(Math.max(0, r.top + (r.height / 2) - wrapRect.top)));
      line.classList.add('match-connection-line');
      lineLayer.appendChild(line);
    });
  };

  wrap.append(leftCol, rightCol, lineLayer);
  container.appendChild(wrap);
  requestAnimationFrame(draw);
}

function renderPuzzleRevealTokens(container, items) {
  const wrap = document.createElement('div');
  wrap.className = 'puzzle-reveal-wrap';

  items.forEach((token) => {
    const chip = document.createElement('span');
    chip.className = 'puzzle-reveal-token';
    chip.textContent = String(token || '').trim();
    wrap.appendChild(chip);
  });

  container.appendChild(wrap);
}

function createPuzzleDnd(container, options, listId = 'puzzlePieces') {
  container.innerHTML = '';

  const bank = document.createElement('div');
  bank.className = 'row gap';
  bank.style.flexWrap = 'wrap';

  const selected = document.createElement('div');
  selected.className = 'answers-grid top-space';
  selected.dataset.puzzleList = listId;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn top-space';
  resetBtn.textContent = 'Reset order';

  let draggedRow = null;

  const refreshSelectedIndexes = () => {
    [...selected.querySelectorAll('[data-puzzle-piece]')].forEach((el, i) => {
      el.dataset.puzzleIndex = String(i);
      const n = el.querySelector('strong');
      if (n) n.textContent = `${i + 1}.`;
    });
  };

  const clearDropHints = () => {
    selected.querySelectorAll('.puzzle-drop-before, .puzzle-drop-after').forEach((el) => {
      el.classList.remove('puzzle-drop-before', 'puzzle-drop-after');
    });
  };

  const setupRowDnD = (row) => {
    row.draggable = true;
    row.style.cursor = 'grab';

    row.addEventListener('dragstart', () => {
      draggedRow = row;
      row.classList.add('puzzle-dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('puzzle-dragging');
      clearDropHints();
      draggedRow = null;
      refreshSelectedIndexes();
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      clearDropHints();
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      row.classList.add(before ? 'puzzle-drop-before' : 'puzzle-drop-after');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) selected.insertBefore(draggedRow, row);
      else selected.insertBefore(draggedRow, row.nextSibling);
      clearDropHints();
      refreshSelectedIndexes();
    });
  };

  const refreshBankButtons = () => {
    const pickedIds = new Set(
      [...selected.querySelectorAll('[data-puzzle-piece-id]')].map((el) => String(el.dataset.puzzlePieceId || '')),
    );

    [...bank.querySelectorAll('[data-puzzle-bank-id]')].forEach((btn) => {
      const id = String(btn.dataset.puzzleBankId || '');
      const picked = pickedIds.has(id);
      btn.disabled = picked;
      btn.classList.toggle('puzzle-picked', picked);
      btn.classList.toggle('hidden', picked);
      if (picked) btn.setAttribute('aria-label', `${btn.dataset.puzzleBankPiece || btn.textContent} (selected)`);
      else btn.removeAttribute('aria-label');
    });
  };

  const unpickRow = (rowEl) => {
    if (!rowEl) return;
    rowEl.remove();
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  const buildBankButton = (value, pieceId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.puzzleBankPiece = value;
    btn.dataset.puzzleBankId = String(pieceId);
    btn.textContent = value;
    btn.draggable = true;

    btn.addEventListener('click', () => pickPiece(btn));
    btn.addEventListener('dragstart', (e) => {
      if (btn.disabled) {
        e.preventDefault();
        return;
      }
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/puzzle-bank-id', String(pieceId));
        e.dataTransfer.effectAllowed = 'copy';
      }
    });
    return btn;
  };

  const resetSelection = () => {
    selected.querySelectorAll('[data-puzzle-piece]').forEach((el) => el.remove());
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  selected.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    resetSelection();
  });
  resetBtn.addEventListener('click', () => resetSelection());

  selected.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  selected.addEventListener('drop', (e) => {
    e.preventDefault();
    const pieceId = e.dataTransfer?.getData('text/puzzle-bank-id');
    if (!pieceId) return;
    const btn = bank.querySelector(`[data-puzzle-bank-id="${CSS.escape(pieceId)}"]`);
    if (btn) pickPiece(btn);
  });

  const pickPiece = (bankBtn) => {
    if (!bankBtn || bankBtn.disabled) return;
    const text = String(bankBtn.dataset.puzzleBankPiece || bankBtn.textContent || '').trim();
    const pieceId = String(bankBtn.dataset.puzzleBankId || '').trim();
    if (!text || !pieceId) return;
    if (selected.querySelector(`[data-puzzle-piece-id="${CSS.escape(pieceId)}"]`)) return;

    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.puzzlePiece = text;
    row.dataset.puzzlePieceId = pieceId;

    const pos = document.createElement('strong');
    const label = document.createElement('span');
    label.textContent = text;
    row.append(pos, label);

    row.addEventListener('click', () => unpickRow(row));

    setupRowDnD(row);
    selected.appendChild(row);
    refreshSelectedIndexes();
    refreshBankButtons();
  };

  [...options].forEach((text, i) => {
    bank.appendChild(buildBankButton(String(text || ''), i));
  });
  refreshBankButtons();

  container.append(bank, resetBtn, selected);
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

function setupImageLightbox() {
  if (document.getElementById('imageLightbox')) return;

  const modal = document.createElement('div');
  modal.id = 'imageLightbox';
  modal.className = 'image-lightbox hidden';
  modal.innerHTML = '<img alt="Zoomed question image" />';
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('img');

  const close = () => {
    modal.classList.add('hidden');
    if (modalImg) modalImg.src = '';
  };

  modal.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  document.addEventListener('click', (e) => {
    const img = e.target?.closest?.('img[data-zoomable="1"]');
    if (!img) return;
    if (!(img instanceof HTMLImageElement)) return;
    modalImg.src = img.src;
    modal.classList.remove('hidden');
  });
}

