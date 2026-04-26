const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CLIENT_ID_KEY = 'pinplay.client.v1';
const REACTION_EMOJIS = ['👍', '😅', '🔥', '🤯', '🙌', '☕', '👀', '🧠', '❤️', '6️⃣', '7️⃣'];

const QUESTION_TYPE_ICONS = {
  mcq: '🔘',
  multi: '☑️',
  tf: '✅❌',
  audio: '🎧',
  text: '⌨️',
  context_gap: '🕳️',
  match_pairs: '🔗',
  error_hunt: '🕵️',
  open: '💬',
  speaking: '🗣️',
  voice_record: '🎙️',
  image_open: '🖼️',
  puzzle: '🧩',
  slider: '📐',
  pin: '📍',
};
function questionTypeIcon(type) {
  return QUESTION_TYPE_ICONS[String(type || '').toLowerCase()] || '❓';
}

const joinStepPinEl = document.getElementById('joinStepPin');
const joinStepIdentityEl = document.getElementById('joinStepIdentity');
const joinModeHintEl = document.getElementById('joinModeHint');
const joinNameWrapEl = document.getElementById('joinNameWrap');
const joinPasswordWrapEl = document.getElementById('joinPasswordWrap');
const joinSignupHintEl = document.getElementById('joinSignupHint');

const joinPinEl = document.getElementById('joinPin');
const validatePinBtn = document.getElementById('validatePinBtn');
const joinNameEl = document.getElementById('joinName');
const joinPasswordEl = document.getElementById('joinPassword');
const joinBtn = document.getElementById('joinBtn');
const joinStatusEl = document.getElementById('joinStatus');
const rerollNameBtn = document.getElementById('rerollNameBtn');
const joinTitleEl = document.getElementById('joinTitle');
const joinQuestionWrap = document.getElementById('joinQuestionWrap');
const joinProgressEl = document.getElementById('joinProgress');
const joinTimerEl = document.getElementById('joinTimer');
const joinScoreEl = document.getElementById('joinScore');
const joinPromptEl = document.getElementById('joinPrompt');
const joinAnswersEl = document.getElementById('joinAnswers');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinFinalizeBtn = document.getElementById('joinFinalizeBtn');
const assignmentPrevBtn = document.getElementById('assignmentPrevBtn');
const assignmentNextBtn = document.getElementById('assignmentNextBtn');
const assignmentNextPendingBtn = document.getElementById('assignmentNextPendingBtn');
const assignmentBannerEl = document.getElementById('assignmentBanner');
const joinStatusHudEl = document.getElementById('joinStatusHud');
const joinFeedbackEl = document.getElementById('joinStatusHud');
const joinCardEl = document.getElementById('joinCard');
const joinTimerBarFill = ensureTimerProgressBar(joinCardEl, 'joinTimerBar');

const live = {
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
    randomNamesMode: false,
    displayName: null,
    clientId: getOrCreateClientId(),
    selectedBet: 0,
    timerTicker: null,
    timerStartedAt: null,
    timerLimitSec: null,
    timerDeadlineAt: null,
    timerAnchorAt: null,
    timerInitialRemainingMs: null,
    adaptiveFitRaf: null,
    mode: 'live',
    liveRevealApplied: false, // true when immediate answer reveal is showing in live mode
    liveRevealForIndex: -1,   // question index the reveal corresponds to
    assignment: {
      code: null,
      attemptId: null,
      state: null,
      currentIndex: 0,
      pollingTimer: null,
      forceAutoAdvance: false,
      pendingComplete: false,
      resultsListCollapsed: false,
    },
  },
};

init();

function init() {
  setupImageLightbox();
  pingEdgeTtsBridgeWarmup();
  initAssignmentSfx();
  initBetControl();
  initReactionRow();
  window.addEventListener('resize', scheduleJoinAdaptiveFit);
  document.addEventListener('fullscreenchange', () => {
    if (!joinSubmitBtn) return;
    if (isAnswerFullscreenLocked()) {
      joinSubmitBtn.disabled = true;
      setJoinStatusHud('Exit fullscreen to answer.', 'bad');
    }
  });
  initAssignmentFromUrl();
  initLivePreviewFromUrl();
  if (validatePinBtn) validatePinBtn.addEventListener('click', validatePin);
  if (joinBtn) joinBtn.addEventListener('click', joinLiveGame);
  if (joinSubmitBtn) joinSubmitBtn.addEventListener('click', submitLiveAnswer);
  if (rerollNameBtn) rerollNameBtn.addEventListener('click', rerollRandomName);
  if (joinFinalizeBtn) joinFinalizeBtn.addEventListener('click', finalizeAssignmentAttempt);
  if (assignmentPrevBtn) assignmentPrevBtn.addEventListener('click', () => moveAssignmentIndex(-1));
  if (assignmentNextBtn) assignmentNextBtn.addEventListener('click', () => moveAssignmentIndex(1));
  if (assignmentNextPendingBtn) assignmentNextPendingBtn.addEventListener('click', moveAssignmentToNextUnanswered);

  // Keyboard nav for assignment mode (arrow keys + space)
  document.addEventListener('keydown', (e) => {
    if (live.player.mode !== 'assignment') return;
    if (!joinQuestionWrap || joinQuestionWrap.classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      moveAssignmentIndex(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveAssignmentIndex(-1);
    }
  });

  // Press 'p' to play question audio
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const q = live.player.currentQuestion;
      if (!q) return;
      // Play recorded audio file if available
      if (q.audioMode === 'file' && q.audioData) {
        try {
          // Support relative paths - prepend Worker API base URL
          let audioUrl = q.audioData;
          if (!audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
            const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
            audioUrl = `${base}/api/media/${audioUrl}`;
          }
          const audio = new Audio(audioUrl);
          audio.play();
        } catch (e) { console.warn('Audio playback failed:', e); }
        return;
      }
      // Otherwise use Edge TTS
      const text = q.audioText || q.prompt || '';
      const lang = q.language || 'en-US-AndrewMultilingualNeural';
      speakText(text, lang);
    }
  });

  if (joinPinEl) {
    joinPinEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') validatePin();
    });
  }

  if (joinNameEl) {
    joinNameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinLiveGame();
    });
  }

  if (joinPasswordEl) {
    joinPasswordEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinLiveGame();
    });
  }

  if (joinAnswersEl) {
    joinAnswersEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const tag = t.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'select') return;
      if (!joinSubmitBtn || joinSubmitBtn.disabled || joinSubmitBtn.classList.contains('hidden')) return;
      e.preventDefault();
      submitLiveAnswer();
    });
  }
}

function pingEdgeTtsBridgeWarmup() {
  // Student-side best-effort wake ping so TTS bridge is warm before playback is needed.
  // Same wake pattern as teacher/create side.
  const url = 'https://edge-tts-bridge.onrender.com/health';
  const ping = () => {
    try {
      fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => { });
    } catch { }
  };
  ping();
  setTimeout(ping, 3500);
}

function initAssignmentFromUrl() {
  const params = new URLSearchParams(window.location.search || '');
  const code = String(params.get('assignment') || params.get('code') || '').trim().toUpperCase();
  if (!code) return;

  live.player.mode = 'assignment';
  live.player.assignment.code = code;
  if (joinPinEl) joinPinEl.value = code;
  if (validatePinBtn) validatePinBtn.textContent = 'Open assignment';
  if (joinTitleEl) joinTitleEl.textContent = 'Assignment mode';
  document.body.classList.add('assignment-mode');

  // Assignment links should behave like a direct entry point:
  // open the assignment immediately and reveal the correct identity mode
  // instead of leaving the generic PIN/login screen visible.
  setTimeout(() => {
    validatePin().catch(() => { });
  }, 0);
}

function initLivePreviewFromUrl() {
  const params = new URLSearchParams(window.location.search || '');
  const pin = String(params.get('pin') || '').trim();
  const autojoin = params.get('autojoin') === '1';
  if (!pin || !/^\d{6}$/.test(pin)) return;
  if (!autojoin) return;

  if (joinPinEl) joinPinEl.value = pin;
  if (joinTitleEl) joinTitleEl.textContent = 'Live preview';

  setTimeout(async () => {
    try {
      await validatePin();
      await joinLiveGame();
    } catch { }
  }, 0);
}

async function validatePin() {
  try {
    const raw = String(joinPinEl?.value || '').trim();

    if (!/^\d{6}$/.test(raw)) {
      const code = String(raw || live.player.assignment.code || '').trim().toUpperCase();
      if (!code) throw new Error('Enter PIN or assignment code.');

      const info = await api(`/api/assignment/get?code=${encodeURIComponent(code)}`, { method: 'GET' });
      live.player.mode = 'assignment';
      live.player.assignment.code = code;

      const a = info?.assignment || {};
      live.player.randomNamesMode = !!a?.randomNames;

      if (joinStepPinEl) joinStepPinEl.classList.add('hidden');
      if (joinStepIdentityEl) joinStepIdentityEl.classList.remove('hidden');

      // Show dice button in assignment mode before attempt starts (if random names enabled)
      if (rerollNameBtn) {
        const show = live.player.mode === 'assignment' && live.player.randomNamesMode && !live.player.assignment.attemptId;
        rerollNameBtn.classList.toggle('hidden', !show);
      }

      if (live.player.randomNamesMode) {
        if (joinNameWrapEl) joinNameWrapEl.classList.add('hidden');
        if (joinPasswordWrapEl) joinPasswordWrapEl.classList.add('hidden');
        if (joinSignupHintEl) joinSignupHintEl.classList.add('hidden');
        if (joinModeHintEl) {
          const dueAt = Number(a?.dueAt || 0);
          const dueText = dueAt ? ` · Due: ${new Date(dueAt).toLocaleString()}` : '';
          joinModeHintEl.textContent = `Assignment: ${a?.title || code}${dueText} · Random names mode`;
        }
        // Fetch and display a random name immediately so the student sees it
        if (!live.player.displayName) {
          try {
            const res = await api('/api/player/random-name', { method: 'GET' });
            live.player.displayName = String(res?.name || '').trim() || `Player${Math.floor(Math.random() * 999)}`;
          } catch {
            live.player.displayName = `Player${Math.floor(Math.random() * 999)}`;
          }
        }
        setJoinTitle(live.player.displayName);
      } else {
        if (joinNameWrapEl) joinNameWrapEl.classList.remove('hidden');
        if (joinPasswordWrapEl) joinPasswordWrapEl.classList.remove('hidden');
        if (joinSignupHintEl) joinSignupHintEl.classList.remove('hidden');
        if (joinModeHintEl) {
          const dueAt = Number(a?.dueAt || 0);
          const dueText = dueAt ? ` · Due: ${new Date(dueAt).toLocaleString()}` : '';
          joinModeHintEl.textContent = `Assignment: ${a?.title || code}${dueText} · Login required`;
        }
      }
      if (joinBtn) joinBtn.textContent = 'Start assignment';
      setStatus(joinStatusEl, 'Assignment code valid ✅', 'ok');
      return;
    }

    const pin = raw;
    const data = await api(
      `/api/pin/check?pin=${encodeURIComponent(pin)}&clientId=${encodeURIComponent(live.player.clientId)}`,
      { method: 'GET' },
    );

    live.player.mode = 'live';
    live.player.pin = pin;
    live.player.randomNamesMode = !!data?.settings?.randomNames;

    if (joinStepPinEl) joinStepPinEl.classList.add('hidden');
    if (joinStepIdentityEl) joinStepIdentityEl.classList.remove('hidden');

    if (live.player.randomNamesMode) {
      if (joinNameWrapEl) joinNameWrapEl.classList.add('hidden');
      if (joinPasswordWrapEl) joinPasswordWrapEl.classList.add('hidden');
      if (joinSignupHintEl) joinSignupHintEl.classList.add('hidden');
      if (joinModeHintEl) {
        joinModeHintEl.textContent = 'Random names mode: your nickname is assigned automatically.';
      }
    } else {
      if (joinNameWrapEl) joinNameWrapEl.classList.remove('hidden');
      if (joinPasswordWrapEl) joinPasswordWrapEl.classList.remove('hidden');
      if (joinSignupHintEl) joinSignupHintEl.classList.remove('hidden');
      if (joinModeHintEl) {
        joinModeHintEl.textContent = 'Login required mode: enter valid username and password.';
      }
      if (data.alreadyJoined && data.joinedPlayer?.name && joinNameEl && !joinNameEl.value.trim()) {
        joinNameEl.value = data.joinedPlayer.name;
      }
    }

    if (joinBtn) joinBtn.textContent = data.alreadyJoined ? 'Rejoin game' : 'Join live game';
    if (joinFinalizeBtn) joinFinalizeBtn.classList.add('hidden');
    setStatus(joinStatusEl, 'PIN valid ✅', 'ok');
  } catch (err) {
    setStatus(joinStatusEl, err.message, 'bad');
    showLoginError(err.message);
  }
}

async function joinLiveGame() {
  const originalLabel = joinBtn ? joinBtn.textContent : '';
  let busyApplied = false;
  const setBusyState = () => {
    if (busyApplied || !joinBtn) return;
    busyApplied = true;
    joinBtn.disabled = true;
    joinBtn.dataset.originalLabel = originalLabel;
    joinBtn.textContent = '⏳ Please wait…';
    if (!live.player.randomNamesMode) {
      setStatus(joinStatusEl, '⏳ Checking your login… please wait, do not click again.', 'ok');
    } else {
      setStatus(joinStatusEl, '⏳ Joining… please wait.', 'ok');
    }
  };
  const clearBusyState = () => {
    if (!joinBtn) return;
    joinBtn.disabled = false;
    if (joinBtn.dataset.originalLabel) {
      joinBtn.textContent = joinBtn.dataset.originalLabel;
      delete joinBtn.dataset.originalLabel;
    }
  };

  try {
    if (live.player.mode === 'assignment') {
      if (!live.player.assignment.code) {
        await validatePin();
        if (!live.player.assignment.code) return;
      }
      setBusyState();
      await startAssignmentAttempt();
      return;
    }

    if (!live.player.pin) {
      await validatePin();
      if (!live.player.pin) return;
    }

    const username = String(joinNameEl?.value || '').trim();
    const password = String(joinPasswordEl?.value || '').trim();

    if (!live.player.randomNamesMode) {
      if (!username || !password) throw new Error('Enter valid username and password.');
      if (username.length < 2 || password.length < 4) throw new Error('Enter valid username and password.');
    }

    setBusyState();

    const data = await api('/api/join', {
      method: 'POST',
      body: {
        pin: live.player.pin,
        name: username,
        password,
        clientId: live.player.clientId,
      },
    });

    live.player.id = data.playerId;
    live.player.token = data.playerToken;
    live.player.renderKey = null;
    live.player.submittedForIndex = null;
    live.player.currentQuestion = null;
    live.player.pinSelection = null;
    live.player.pinSelections = [];

    const shownName = data.name || username || 'Student';
    live.player.displayName = shownName;
    setJoinTitle(shownName);

    const prefix = data.alreadyJoined ? 'Rejoined' : 'Joined';
    setStatus(joinStatusEl, `${prefix} as ${shownName} ✅`, 'ok');
    hideLoginError();

    if (joinStepIdentityEl) joinStepIdentityEl.classList.add('hidden');

    startPlayerPolling();
    await pollPlayerState();
  } catch (err) {
    setStatus(joinStatusEl, err.message, 'bad');
    showLoginError(err.message);
  } finally {
    clearBusyState();
  }
}

function makeAssignmentStudentKey(name) {
  const base = String(name || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '');
  return base ? `usr_${base}`.slice(0, 96) : '';
}

function deriveAssignmentCurrentIndex(state) {
  const total = Number(state?.attempt?.assignment?.totalQuestions || state?.attempt?.assignment?.quiz?.questions?.length || 0);
  if (total <= 0) return 0;
  const answered = new Set(Array.isArray(state?.attempt?.answeredQIndexes) ? state.attempt.answeredQIndexes.map((x) => Number(x)) : []);
  for (let i = 0; i < total; i += 1) {
    if (!answered.has(i)) return i;
  }
  return total - 1;
}

function clampAssignmentIndex(index, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(Math.round(Number(index || 0)), total - 1));
}

function moveAssignmentIndex(delta) {
  if (live.player.mode !== 'assignment') return;
  const total = Number(live.player.assignment.state?.attempt?.assignment?.totalQuestions || live.player.assignment.state?.attempt?.assignment?.quiz?.questions?.length || 0);
  if (total <= 0) return;
  live.player.assignment.currentIndex = clampAssignmentIndex(Number(live.player.assignment.currentIndex || 0) + Number(delta || 0), total);
  pickNewAnsweringTrack();
  playAssignmentSfx('answering');
  const mapped = mapAssignmentStateToPlayerState();
  if (mapped) renderPlayerState(mapped);
}

function moveAssignmentToNextUnanswered() {
  if (live.player.mode !== 'assignment') return;
  const state = live.player.assignment.state;
  const total = Number(state?.attempt?.assignment?.totalQuestions || state?.attempt?.assignment?.quiz?.questions?.length || 0);
  if (total <= 0) return;

  const answered = new Set(Array.isArray(state?.attempt?.answeredQIndexes) ? state.attempt.answeredQIndexes.map((x) => Number(x)) : []);
  const current = clampAssignmentIndex(live.player.assignment.currentIndex || 0, total);

  for (let step = 1; step <= total; step += 1) {
    const idx = (current + step) % total;
    if (!answered.has(idx)) {
      live.player.assignment.currentIndex = idx;
      pickNewAnsweringTrack();
      playAssignmentSfx('answering');
      const mapped = mapAssignmentStateToPlayerState();
      if (mapped) renderPlayerState(mapped);
      return;
    }
  }
}

function mapAssignmentStateToPlayerState() {
  const as = live.player.assignment.state;
  if (!as?.attempt?.assignment) return null;

  const attempt = as.attempt;
  const assignment = attempt.assignment;
  const quiz = assignment.quiz || {};
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const idx = Math.max(0, Math.min(live.player.assignment.currentIndex, Math.max(0, questions.length - 1)));
  const question = questions[idx] || null;

  const answeredCurrent = (attempt.answeredQIndexes || []).includes(idx);
  const isInstantFeedback = assignment.feedbackMode === 'instant';
  const isReviewMode = !!live.player.assignment.reviewMode;
  const isShowResults = isInstantFeedback || isReviewMode || (assignment.feedbackMode === 'end' && attempt.submitted);

  let questionClosed = false;
  let revealedResult = null;
  let correctAnswer = null;
  let correctZones = undefined;

  if (isShowResults && answeredCurrent) {
    questionClosed = true;

    // First, try to find teacher grading or auto-grading result
    const rawAnswers = attempt?.answersByQ || {};
    const rawItem = rawAnswers[String(idx)];
    const teacherGrade = rawItem?.teacherGrade;

    const autoResults = Array.isArray(attempt?.answersWithCorrectness) ? attempt.answersWithCorrectness : [];
    const autoResult = autoResults.find(a => Number(a.qIndex) === idx);

    if (teacherGrade && teacherGrade.graded) {
      revealedResult = {
        correct: Number(teacherGrade.pointsAwarded || 0) > 0,
        pointsAwarded: Number(teacherGrade.pointsAwarded || 0),
        correction: String(teacherGrade.correction || ''),
        correctionAudioKey: String(teacherGrade.correctionAudioKey || ''),
        graded: true,
        teacherGrade: teacherGrade,
      };
      // For open questions, there is no single "correct answer" to reveal usually, 
      // but we might show the expected answer if the quiz data has it.
      correctAnswer = autoResult?.correctAnswer || null;
    } else if (autoResult) {
      revealedResult = {
        correct: autoResult.correct,
        pointsAwarded: autoResult.points || 0,
        correction: '',
        graded: true,
      };
      correctAnswer = autoResult.correctAnswer;
      correctZones = autoResult.correctZones;
    } else {
      // If we are in review mode but no result found yet, maybe it's pending grading
      if (isReviewMode) {
        revealedResult = {
          graded: false,
          correction: '',
        };
      } else {
        questionClosed = false;
      }
    }
  }

  return {
    phase: question ? 'question' : 'results',
    pin: assignment.code,
    name: attempt.studentName || live.player.displayName || 'Student',
    currentIndex: idx,
    totalQuestions: Number(assignment.totalQuestions || questions.length || 0),
    score: Number(attempt?.metrics?.totalScore ?? attempt?.metrics?.autoScore ?? 0),
    questionStartedAt: attempt.startedAt || assignment.startedAt || 0,
    questionDeadlineAt: assignment.dueAt || null,
    questionClosed,
    questionCloseReason: questionClosed ? 'manual_reveal' : null,
    answeredCurrent,
    assignmentSubmitted: !!attempt?.submitted,
    answeredQIndexes: Array.isArray(attempt?.answeredQIndexes) ? attempt.answeredQIndexes : [],
    question,
    correction: '',
    revealedResult,
    correctAnswer,
    correctZones: correctZones || undefined,
  };
}

async function loadAssignmentState() {
  const code = String(live.player.assignment.code || '').trim();
  const attemptId = String(live.player.assignment.attemptId || '').trim();
  if (!code || !attemptId) return;

  const data = await api(`/api/assignment/state?code=${encodeURIComponent(code)}&attemptId=${encodeURIComponent(attemptId)}`, { method: 'GET' });
  live.player.assignment.state = data;

  const total = Number(data?.attempt?.assignment?.totalQuestions || data?.attempt?.assignment?.quiz?.questions?.length || 0);
  const autoIdx = deriveAssignmentCurrentIndex(data);
  if (live.player.assignment.forceAutoAdvance || !Number.isFinite(Number(live.player.assignment.currentIndex))) {
    live.player.assignment.currentIndex = autoIdx;
    live.player.assignment.forceAutoAdvance = false;
    pickNewAnsweringTrack();
    playAssignmentSfx('answering');
  } else {
    live.player.assignment.currentIndex = clampAssignmentIndex(live.player.assignment.currentIndex, total);
  }

  const mapped = mapAssignmentStateToPlayerState();
  if (mapped) renderPlayerState(mapped);
  renderInstantFeedbackFromState();
}

// Load and display previous attempts for a student (disabled: requested removal of history panel)
async function loadAttemptHistory(code, studentKey) {
  // Remove any existing panels and exit
  const historyPanel = document.getElementById('joinHistoryPanel');
  if (historyPanel) historyPanel.remove();
  const feedbackPanel = document.getElementById('joinFeedbackPanel');
  if (feedbackPanel) feedbackPanel.remove();
  return;
}

// Show teacher feedback for graded open answers
async function showTeacherFeedback(code, attemptId) {
  try {
    const data = await api(`/api/assignment/state?code=${encodeURIComponent(code)}&attemptId=${encodeURIComponent(attemptId)}`, { method: 'GET' });
    const answers = data?.attempt?.answersByQ || {};
    const questions = data?.attempt?.assignment?.quiz?.questions || [];

    const feedbackItems = [];
    for (const [qIdx, answer] of Object.entries(answers)) {
      const question = questions[Number(qIdx)];
      if (!question) continue;
      const grade = answer?.teacherGrade;
      if (grade?.graded && (grade?.correction || grade?.correctionAudioKey)) {
        feedbackItems.push({
          qIndex: Number(qIdx),
          question: question.prompt?.slice(0, 80) || `Question ${Number(qIdx) + 1}`,
          correction: grade.correction || '',
          correctionAudioKey: grade.correctionAudioKey || '',
          gradedAt: grade.gradedAt,
        });
      }
    }

    if (feedbackItems.length === 0) return;

    let feedbackPanel = document.getElementById('joinFeedbackPanel');
    if (!feedbackPanel) {
      feedbackPanel = document.createElement('div');
      feedbackPanel.id = 'joinFeedbackPanel';
      feedbackPanel.style.cssText = 'background:rgba(63,185,80,0.1);border:1px solid rgba(63,185,80,0.3);border-radius:8px;padding:12px 16px;margin-top:12px;';
      const historyPanel = document.getElementById('joinHistoryPanel');
      if (historyPanel) historyPanel.parentNode.insertBefore(feedbackPanel, historyPanel.nextSibling);
    }

    const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
    const feedbackHtml = feedbackItems.map(item => {
      let audioHtml = '';
      if (item.correctionAudioKey) {
        let src = item.correctionAudioKey;
        if (!src.startsWith('http')) src = `${base}/api/media/${src}`;
        audioHtml = `<div style="margin-top:6px;"><audio controls src="${src}" style="height:28px;"></audio></div>`;
      }
      return `
        <div style="padding:8px 0;border-bottom:1px solid rgba(63,185,80,0.2);font-size:13px;">
          <div style="color:#8b949e;margin-bottom:4px;font-style:italic;">"${esc(item.question)}..."</div>
          <div style="color:#3fb950; display:flex; flex-direction:column;">
            <span>💬 Teacher: ${esc(item.correction)}</span>
            ${audioHtml}
          </div>
        </div>
      `;
    }).join('');

    feedbackPanel.innerHTML = `
      <div style="font-weight:bold;color:#3fb950;margin-bottom:8px;">💬 Teacher Feedback (${feedbackItems.length})</div>
      ${feedbackHtml}
    `;
    feedbackPanel.style.display = 'block';
  } catch (e) {
    console.log('Could not load teacher feedback:', e);
  }
}

async function startAssignmentAttempt(skipCheck) {
  const code = String(live.player.assignment.code || '').trim();
  if (!code) throw new Error('Assignment code required.');

  let username = String(joinNameEl?.value || '').trim();

  if (live.player.randomNamesMode) {
    if (!live.player.displayName) {
      try {
        const res = await api('/api/player/random-name', { method: 'GET' });
        live.player.displayName = String(res?.name || '').trim() || `Player${Math.floor(Math.random() * 999)}`;
      } catch {
        live.player.displayName = `Player${Math.floor(Math.random() * 999)}`;
      }
    }
    username = live.player.displayName;
  }

  if (!username || username.length < 2) throw new Error('Enter your username.');

  const password = live.player.randomNamesMode ? '' : String(joinPasswordEl?.value || '').trim();
  if (!live.player.randomNamesMode && !password) throw new Error('Enter your password.');

  const studentKey = makeAssignmentStudentKey(username);
  if (!studentKey) throw new Error('Invalid username.');

  // Check if student has previous attempts (unless skipping check for retake)
  if (!skipCheck) {
    try {
      const checkData = await api('/api/assignment/check-status', {
        method: 'POST',
        body: { code, studentKey },
      });

      if (checkData?.hasSubmittedAttempts) {
        // Student has at least one completed attempt — always show choice modal
        // to allow them to "Review" past work even if they have an "Open" one to continue.
        showReviewRetakeChoice(checkData, code, studentKey, username, password);
        return;
      }
      // If there's an open (unsubmitted) attempt, fall through to /start which will resume it
    } catch (e) {
      // If check-status fails (e.g. old backend), just continue silently
      console.warn('check-status failed, continuing:', e?.message);
    }
  }

  await proceedWithAssignmentStart(code, studentKey, username, password);
}

async function proceedWithAssignmentStart(code, studentKey, username, password) {
  const data = await api('/api/assignment/start', {
    method: 'POST',
    body: {
      code,
      studentKey,
      studentName: username,
      password,
    },
  });

  live.player.assignment.attemptId = data?.attempt?.id || null;
  live.player.displayName = data?.attempt?.studentName || username;
  setJoinTitle(`${live.player.displayName} · ${code}`);
  // Reset ambient state for new assignment
  cancelPendingAssignmentQuestionAutoplay();
  stopAssignmentQuestionAudioPlayback();
  lastRenderedQuestionIndex = -1;
  lastClosedQuestionIndex = -1;
  assignmentFinalPlayed = false;
  lastAssignmentAudioKey = '';
  if (joinStepIdentityEl) joinStepIdentityEl.classList.add('hidden');
  hideLoginError();
  if (joinStepPinEl) joinStepPinEl.classList.add('hidden');
  if (rerollNameBtn) rerollNameBtn.classList.add('hidden');
  if (joinSubmitBtn) joinSubmitBtn.textContent = 'Save answer';
  if (joinFinalizeBtn) joinFinalizeBtn.classList.remove('hidden');

  // Show attempt number info
  if (data?.alreadyStarted) {
    setStatus(joinStatusEl, 'Resumed previous attempt ✅', 'ok');
  } else {
    setStatus(joinStatusEl, 'New attempt started ✅', 'ok');
    if (data?.attempt?.attemptNumber) {
      const num = data.attempt.attemptNumber;
      const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
      setStatus(joinStatusEl, `Attempt ${num}${suffix} started ✅`, 'ok');
    }
  }

  // Load attempt history and teacher feedback
  loadAttemptHistory(code, studentKey).catch(() => { });

  if (live.player.assignment.pollingTimer) clearInterval(live.player.assignment.pollingTimer);
  live.player.assignment.pollingTimer = setInterval(() => {
    loadAssignmentState().catch((err) => {
      const msg = String(err?.message || 'Could not refresh assignment state.');
      setStatus(joinStatusEl, msg, 'bad');
    });
  }, 5000);

  await loadAssignmentState();
}

function dismissReviewRetakeModal() {
  const overlay = document.getElementById('reviewRetakeOverlay');
  if (overlay) overlay.remove();
}

function showReviewRetakeChoice(checkData, code, studentKey, username, password) {
  dismissReviewRetakeModal();

  const overlay = document.createElement('div');
  overlay.id = 'reviewRetakeOverlay';
  overlay.className = 'review-retake-overlay';

  const card = document.createElement('div');
  card.className = 'review-retake-card';

  // Title
  const h3 = document.createElement('h3');
  h3.textContent = checkData.assignmentTitle || 'Assignment';
  card.appendChild(h3);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'review-retake-subtitle';
  const used = Number(checkData.attemptsUsed || 0);
  const limit = Number(checkData.attemptsLimit || 0);
  const limitText = limit === 0 ? 'unlimited' : `${limit}`;
  sub.textContent = `${used} attempt${used !== 1 ? 's' : ''} completed · Limit: ${limitText}`;
  card.appendChild(sub);

  // Previous attempts list
  const attempts = Array.isArray(checkData.previousAttempts) ? checkData.previousAttempts : [];
  if (attempts.length > 0) {
    const list = document.createElement('ul');
    list.className = 'review-retake-attempts';

    attempts.slice(0, 5).forEach((a) => {
      // Changed to button to make it explicitly interactive
      const row = document.createElement('button');
      row.className = 'review-retake-attempt-row rr-btn-review-inline';
      row.type = 'button';

      const gradedCount = Number(a.teacherGradedCount || 0);
      const feedbackCount = Number(a.teacherFeedbackCount || 0);
      const hasNew = !!a.hasNewTeacherActivity;
      const totalTeacher = gradedCount;

      if (totalTeacher > 0) {
        const parts = [];
        if (gradedCount > 0) parts.push(`${gradedCount} graded`);
        if (feedbackCount > 0) parts.push(`${feedbackCount} with feedback`);
        row.title = `${hasNew ? 'New from teacher · ' : ''}${parts.join(' · ')}. Click to review.`;
      } else {
        row.title = 'Click to review this attempt';
      }

      row.addEventListener('click', () => {
        dismissReviewRetakeModal();
        enterAssignmentReviewMode(code, a.id, username, checkData);
      });

      const label = document.createElement('span');
      label.className = 'rr-attempt-label';
      label.textContent = `Attempt ${a.attemptNumber || '?'}`;

      const score = document.createElement('span');
      score.className = 'rr-attempt-score';
      score.textContent = `${Number(a.totalScore || 0)} pts`;

      const date = document.createElement('span');
      date.className = 'rr-attempt-date';
      date.textContent = a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '';

      row.append(label, score, date);

      if (totalTeacher > 0) {
        const badge = document.createElement('span');
        badge.className = 'rr-attempt-badge' + (hasNew ? ' is-new' : '');
        const icon = feedbackCount > 0 ? '💬' : '📝';
        badge.textContent = `${icon} ${totalTeacher}`;
        if (hasNew) {
          const dot = document.createElement('span');
          dot.className = 'rr-attempt-badge-dot';
          dot.setAttribute('aria-hidden', 'true');
          badge.appendChild(dot);
        }
        row.appendChild(badge);
      }

      list.appendChild(row);
    });

    card.appendChild(list);
  }

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'review-retake-actions';
  if (!checkData.canRetake) actions.classList.add('single-action');

  // Review button — only available if the list implies we need a generic fallback
  if (attempts.length === 0) {
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'rr-btn rr-btn-review';
    reviewBtn.type = 'button';
    reviewBtn.innerHTML = `
      <span class="rr-btn-icon">📖</span>
      <span class="rr-btn-label">Review</span>
      <span class="rr-btn-hint">View your answers</span>
    `;
    reviewBtn.addEventListener('click', () => {
      const latestAttempt = checkData.pastAttempts?.[0]; // Fallback to raw array
      if (!latestAttempt?.id) return;
      dismissReviewRetakeModal();
      enterAssignmentReviewMode(code, latestAttempt.id, username, checkData);
    });
    actions.appendChild(reviewBtn);
  } else {
    actions.classList.add('single-action'); // Retake/Continue takes full width
  }

  // Retake or Continue button
  if (checkData.canRetake || checkData.hasOpenAttempt) {
    const isContinue = !!checkData.hasOpenAttempt;
    const actionBtn = document.createElement('button');
    actionBtn.className = isContinue ? 'rr-btn rr-btn-continue' : 'rr-btn rr-btn-retake';
    actionBtn.type = 'button';
    actionBtn.innerHTML = `
      <span class="rr-btn-icon">${isContinue ? '▶️' : '🔄'}</span>
      <span class="rr-btn-label">${isContinue ? 'Continue' : 'Retake'}</span>
      <span class="rr-btn-hint">${isContinue ? 'Resume your current attempt' : 'Start a new attempt'}</span>
    `;
    actionBtn.addEventListener('click', async () => {
      dismissReviewRetakeModal();
      try {
        await proceedWithAssignmentStart(code, studentKey, username, password);
      } catch (err) {
        setStatus(joinStatusEl, err.message, 'bad');
        showLoginError(err.message);
      }
    });
    actions.appendChild(actionBtn);
  } else {
    const msg = document.createElement('div');
    msg.className = 'rr-exhausted-msg';
    msg.textContent = 'All attempts have been used. You can review your answers.';
    card.appendChild(msg);
  }

  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Close on overlay click (outside card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissReviewRetakeModal();
  });
}

async function enterAssignmentReviewMode(code, attemptId, username, checkData) {
  try {
    // Set up assignment state for review
    live.player.assignment.attemptId = attemptId;
    live.player.assignment.currentIndex = 0;
    live.player.displayName = username;
    setJoinTitle(`${username} · ${code} · Review`);

    if (joinStepIdentityEl) joinStepIdentityEl.classList.add('hidden');
    if (joinStepPinEl) joinStepPinEl.classList.add('hidden');
    if (rerollNameBtn) rerollNameBtn.classList.add('hidden');
    hideLoginError();

    // Explicit review mode flag
    live.player.assignment.reviewMode = true;

    // Hide submit/finalize — this is read-only
    if (joinSubmitBtn) { joinSubmitBtn.disabled = true; joinSubmitBtn.classList.add('hidden'); }
    if (joinFinalizeBtn) joinFinalizeBtn.classList.add('hidden');

    // Load the attempt state
    await loadAssignmentState();

    // Notify backend that attempt was reviewed (fire and forget)
    api('/api/assignment/mark-reviewed', {
      method: 'POST',
      body: { code, attemptId }
    }).catch(err => console.warn('Failed to mark reviewed:', err));

    // Force show all questions as closed (read-only)
    const state = live.player.assignment.state;
    if (state?.attempt) state.attempt.submitted = true;

    // Render
    const mapped = mapAssignmentStateToPlayerState();
    if (mapped) {
      mapped.assignmentSubmitted = true;
      mapped.questionClosed = true;
      renderPlayerState(mapped);
    }

    // Show end-feedback results panel if applicable
    renderInstantFeedbackFromState();

    // Show teacher feedback if available
    showTeacherFeedback(code, attemptId).catch(() => { });

    // Add review mode bar at top
    let bar = document.getElementById('reviewModeBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'reviewModeBar';
      bar.className = 'review-mode-bar';

      const label = document.createElement('span');
      label.textContent = '📖 Review Mode — viewing your submitted answers';
      bar.appendChild(label);

      const exitBtn = document.createElement('button');
      exitBtn.className = 'rr-exit-btn';
      exitBtn.type = 'button';
      exitBtn.textContent = 'Exit Review';
      exitBtn.addEventListener('click', () => {
        exitAssignmentReviewMode(code, checkData);
      });
      bar.appendChild(exitBtn);

      document.body.appendChild(bar);
    }

    setStatus(joinStatusEl, 'Reviewing submitted attempt ✅', 'ok');
  } catch (err) {
    setStatus(joinStatusEl, `Review error: ${err.message}`, 'bad');
  }
}

function exitAssignmentReviewMode(code, checkData) {
  live.player.assignment.reviewMode = false;
  // Remove review bar
  const bar = document.getElementById('reviewModeBar');
  if (bar) bar.remove();

  // Remove results panel
  const panel = document.getElementById('assignmentResultsPanel');
  if (panel) panel.remove();

  // Remove feedback panel
  const fp = document.getElementById('joinFeedbackPanel');
  if (fp) fp.remove();

  // Reset attempt state
  live.player.assignment.attemptId = null;
  live.player.assignment.state = null;
  live.player.assignment.currentIndex = 0;
  live.player.assignment.resultsListCollapsed = false;

  // Re-show submit button
  if (joinSubmitBtn) { joinSubmitBtn.disabled = false; joinSubmitBtn.classList.remove('hidden'); }

  // Clear the question area
  if (joinQuestionWrap) joinQuestionWrap.classList.add('hidden');
  hideAssignmentCompleteMessage();

  // Show the choice modal again if we have check data
  if (checkData) {
    const studentKey = makeAssignmentStudentKey(live.player.displayName || '');
    const password = live.player.randomNamesMode ? '' : String(joinPasswordEl?.value || '').trim();
    showReviewRetakeChoice(checkData, code, studentKey, live.player.displayName || '', password);
  } else {
    // Fallback — show identity step
    if (joinStepIdentityEl) joinStepIdentityEl.classList.remove('hidden');
  }
}

async function finalizeAssignmentAttempt() {
  try {
    if (live.player.mode !== 'assignment') return;
    const code = String(live.player.assignment.code || '').trim();
    const attemptId = String(live.player.assignment.attemptId || '').trim();
    if (!code || !attemptId) throw new Error('Start assignment first.');
    cancelPendingAssignmentQuestionAutoplay();
    stopAssignmentQuestionAudioPlayback();

    if (joinFinalizeBtn) joinFinalizeBtn.disabled = true;
    const data = await api('/api/assignment/submit', {
      method: 'POST',
      body: { code, attemptId },
    });

    live.player.assignment.state = { attempt: data?.attempt || live.player.assignment.state?.attempt || null };
    const submittedText = data?.alreadySubmitted ? 'Assignment was already submitted.' : 'Assignment submitted ✅';
    setJoinStatusHud(submittedText, 'ok');
    setStatus(joinStatusEl, submittedText, 'ok');
    showAssignmentCompleteMessage(submittedText, {
      title: 'Assignment submitted 🎉',
      submitted: true,
    });
    await loadAssignmentState();
    renderInstantFeedbackFromState();
  } catch (err) {
    setJoinStatusHud(String(err?.message || 'Could not submit assignment.'), 'bad');
  } finally {
    if (joinFinalizeBtn) joinFinalizeBtn.disabled = false;
  }
}

function hideAssignmentCompleteMessage() {
  const existing = document.getElementById('assignmentCompleteMessage');
  if (existing) existing.remove();
  if (joinSubmitBtn) joinSubmitBtn.classList.remove('hidden');
}

function showAssignmentCompleteMessage(text, opts = {}) {
  const wrap = joinQuestionWrap || joinCardEl;
  if (!wrap) return;

  const {
    title = '',
    showFinishButton = false,
    finishLabel = 'Submit assignment',
    submitted = false,
  } = opts || {};

  const submissionWrap = document.getElementById('joinSubmission');
  if (submissionWrap) submissionWrap.classList.remove('hidden');
  if (joinSubmitBtn) {
    joinSubmitBtn.disabled = true;
    joinSubmitBtn.classList.add('hidden');
  }

  let box = document.getElementById('assignmentCompleteMessage');
  if (!box) {
    box = document.createElement('div');
    box.id = 'assignmentCompleteMessage';
    box.className = 'assignment-complete';
    wrap.appendChild(box);
  }
  box.classList.remove('hidden');
  box.innerHTML = '';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.style.fontSize = '1.08rem';
    titleEl.style.marginBottom = '0.35rem';
    titleEl.textContent = title;
    box.appendChild(titleEl);
  }

  const bodyEl = document.createElement('div');
  bodyEl.textContent = text || 'Assignment submitted. You have completed this attempt.';
  box.appendChild(bodyEl);

  if (showFinishButton && !submitted) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn primary top-space';
    btn.textContent = finishLabel;
    btn.addEventListener('click', () => {
      finalizeAssignmentAttempt().catch(() => { });
    });
    box.appendChild(btn);
  }
}

function renderInstantFeedbackFromState() {
  const state = live.player.assignment.state;
  const attempt = state?.attempt;
  const assignment = attempt?.assignment;
  const autoAnswers = Array.isArray(attempt?.answersWithCorrectness) ? attempt.answersWithCorrectness : [];
  const rawAnswersByQ = attempt?.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
  const feedbackMode = assignment?.feedbackMode || 'none';
  const currentQIndex = live.player.assignment.currentIndex || 0;

  // Determine if we should show feedback and what to show
  let shouldShowFeedback = false;

  if (feedbackMode !== 'none') {
    const totalQuestions = Number(assignment?.totalQuestions || assignment?.quiz?.questions?.length || 0);
    const answeredCount = Array.isArray(attempt?.answeredQIndexes) ? attempt.answeredQIndexes.length : 0;
    const anyAnswered = autoAnswers.length > 0 || Object.keys(rawAnswersByQ).length > 0;
    shouldShowFeedback = !!attempt?.submitted && anyAnswered && answeredCount >= totalQuestions;
  }

  if (!shouldShowFeedback) { document.getElementById('assignmentResultsPanel')?.remove(); return; }

  const wrap = joinQuestionWrap || joinCardEl;
  if (!wrap) return;

  const existing = document.getElementById('assignmentResultsPanel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'assignmentResultsPanel';
  panel.className = 'assignment-results';

  const questions = Array.isArray(assignment?.quiz?.questions) ? assignment.quiz.questions : [];

  // Build a unified row per answered question: auto-graded + teacher-graded (graded or pending).
  const autoByQ = new Map();
  autoAnswers.forEach((a) => { autoByQ.set(Number(a.qIndex), a); });

  const answeredIndexes = Object.keys(rawAnswersByQ)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && questions[n])
    .sort((a, b) => a - b);

  const rows = answeredIndexes.map((qIndex) => {
    const q = questions[qIndex] || {};
    const rawItem = rawAnswersByQ[String(qIndex)] || {};
    const auto = autoByQ.get(qIndex);
    const teacherGrade = rawItem.teacherGrade || null;

    if (auto) {
      return {
        qIndex,
        q,
        status: auto.correct ? 'correct' : 'incorrect',
        statusIcon: auto.correct ? '✅' : '❌',
        points: Number(auto.points || 0),
        liClass: auto.correct ? 'ok' : 'bad',
      };
    }
    if (teacherGrade && teacherGrade.graded) {
      const pts = Number(teacherGrade.pointsAwarded || 0);
      const isCorrect = pts > 0;
      return {
        qIndex,
        q,
        status: isCorrect ? 'correct' : 'incorrect',
        statusIcon: isCorrect ? '✅' : '❌',
        points: pts,
        liClass: isCorrect ? 'ok' : 'bad',
      };
    }
    // Teacher-graded but not yet graded (open / image_open / speaking / voice_record / text fallback)
    return {
      qIndex,
      q,
      status: 'pending',
      statusIcon: '⏳',
      points: 0,
      liClass: 'pending',
    };
  });

  // --- Score summary header ---
  const correctCount = rows.filter((r) => r.status === 'correct').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const totalCount = rows.length;
  const totalPoints = rows.reduce((sum, r) => sum + Number(r.points || 0), 0);

  const header = document.createElement('div');
  header.className = 'assignment-results-header';

  const title = document.createElement('div');
  title.className = 'assignment-results-title';
  title.textContent = 'Final Results';
  header.appendChild(title);

  const scoreSummary = document.createElement('div');
  scoreSummary.className = 'assignment-results-score';
  const pendingTxt = pendingCount > 0 ? ` · ${pendingCount} pending ⏳` : '';
  scoreSummary.textContent = `${correctCount}/${totalCount} correct${pendingTxt} · ${totalPoints} points`;
  header.appendChild(scoreSummary);

  panel.appendChild(header);

  // --- Collapsible toggle ---
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'assignment-results-toggle';
  let listCollapsed = !!live.player.assignment.resultsListCollapsed;
  toggleBtn.innerHTML = `<span class="toggle-arrow">${listCollapsed ? '▸' : '▾'}</span> 📋 Question Summary`;
  toggleBtn.addEventListener('click', () => {
    listCollapsed = !listCollapsed;
    live.player.assignment.resultsListCollapsed = listCollapsed;
    listWrap.classList.toggle('collapsed', listCollapsed);
    toggleBtn.querySelector('.toggle-arrow').textContent = listCollapsed ? '▸' : '▾';
  });
  panel.appendChild(toggleBtn);

  // --- Scrollable, clickable question list ---
  const listWrap = document.createElement('div');
  listWrap.className = 'assignment-results-list-wrap';
  if (listCollapsed) listWrap.classList.add('collapsed');

  const list = document.createElement('ul');
  list.className = 'assignment-results-list';

  const isReview = !!live.player.assignment.reviewMode;

  rows.forEach((r) => {
    const li = document.createElement('li');
    li.className = `${r.liClass} clickable`;
    if (Number(r.qIndex) === currentQIndex) li.classList.add('active');

    const qNum = document.createElement('span');
    qNum.className = 'result-q-num';
    qNum.textContent = `Q${Number(r.qIndex) + 1}`;
    li.appendChild(qNum);

    const typeIcon = document.createElement('span');
    typeIcon.className = 'result-type-icon';
    typeIcon.textContent = questionTypeIcon(r.q.type);
    typeIcon.title = String(r.q.type || '');
    li.appendChild(typeIcon);

    const icon = document.createElement('span');
    icon.className = 'result-icon';
    icon.textContent = r.statusIcon;
    if (r.status === 'pending') icon.title = 'Waiting for teacher grading';
    li.appendChild(icon);

    let pointsText = '';
    if (r.points > 0) pointsText = `+${r.points}`;
    else if (r.points < 0) pointsText = `${r.points}`;

    if (pointsText) {
      const ptsEl = document.createElement('span');
      ptsEl.className = 'result-pts';
      ptsEl.textContent = pointsText;
      li.appendChild(ptsEl);
    }

    const prompt = r.q.prompt ? String(r.q.prompt).slice(0, 55) : `Question ${Number(r.qIndex) + 1}`;
    const promptEl = document.createElement('span');
    promptEl.className = 'result-prompt';
    promptEl.textContent = prompt;
    li.appendChild(promptEl);

    // Click to navigate to question
    const qIndex = Number(r.qIndex);
    li.addEventListener('click', () => {
      live.player.assignment.currentIndex = qIndex;
      const mapped = mapAssignmentStateToPlayerState();
      if (mapped) {
        if (isReview) {
          mapped.assignmentSubmitted = true;
          mapped.questionClosed = true;
        }
        renderPlayerState(mapped);
      }
    });

    list.appendChild(li);
  });

  listWrap.appendChild(list);
  panel.appendChild(listWrap);
  wrap.appendChild(panel);
}



async function pollPlayerState() {
  if (live.player.mode !== 'live') return;
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

async function rerollRandomName() {
  try {
    if (!live.player.randomNamesMode) return;
    if (rerollNameBtn) rerollNameBtn.disabled = true;

    let nextName;
    if (live.player.mode === 'assignment') {
      const res = await api('/api/player/random-name', { method: 'GET' });
      nextName = String(res?.name || '').trim();
    } else if (live.player.pin && live.player.id && live.player.token) {
      const data = await api('/api/player/reroll-name', {
        method: 'POST',
        headers: { 'X-Player-Token': live.player.token },
        body: {
          pin: live.player.pin,
          playerId: live.player.id,
        },
      });
      nextName = String(data?.name || '').trim();
    }

    if (nextName) {
      live.player.displayName = nextName;
      setJoinTitle(nextName);
      setStatus(joinStatusEl, `New random name: ${nextName} ✅`, 'ok');
    }
  } catch (err) {
    setStatus(joinStatusEl, String(err?.message || 'Could not change name.'), 'bad');
  } finally {
    if (rerollNameBtn) rerollNameBtn.disabled = false;
  }
}

function renderPlayerState(state) {
  // Clear liveRevealApplied when the question changes (different index)
  if (live.player.liveRevealApplied && state.currentIndex !== live.player.liveRevealForIndex) {
    live.player.liveRevealApplied = false;
    live.player.liveRevealForIndex = -1;
  }
  // Also clear when the teacher closes the question (full server-driven reveal takes over)
  if (live.player.liveRevealApplied && !!state.questionClosed) {
    live.player.liveRevealApplied = false;
    live.player.liveRevealForIndex = -1;
  }

  const renderJoinReveal = () => {
    // Target the broader container to avoid flex-wrap collisions
    const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
    if (!wrap) return;
    let revealEl = wrap.querySelector('[data-join-correct-reveal="1"]');

    const question = state.question;
    const isPoll = !!question?.isPoll;
    const show = !!state.questionClosed && !isPoll;
    const needsReveal = question && ['text', 'puzzle', 'error_hunt', 'match_pairs', 'context_gap'].includes(question.type);

    if (!show || !needsReveal) {
      // Preserve reveal box placed by immediate live-mode answer reveal
      if (revealEl && !live.player.liveRevealApplied) revealEl.remove();
      return;
    }

    let correctText = String(state.correctAnswer || '').trim();

    if (!correctText) {
      if (question.type === 'text') correctText = (question.accepted || []).join(' | ');
      if (question.type === 'puzzle') correctText = (question.items || []).join(' ➔ ');
      if (question.type === 'match_pairs') correctText = (question.pairs || []).map(p => `${p.left} ➔ ${p.right}`).join(' | ');
      if (question.type === 'error_hunt') correctText = question.corrected || '';
      if (question.type === 'context_gap') correctText = (question.gaps || []).map((g, i) => `Gap ${i + 1}: ${g}`).join(' | ');
    }

    if (!correctText) {
      if (revealEl) revealEl.remove();
      return;
    }

    // If it doesn't exist, create it once
    if (!revealEl) {
      revealEl = document.createElement('div');
      revealEl.className = 'student-answer-reveal';
      revealEl.dataset.joinCorrectReveal = '1';

      const title = document.createElement('div');
      title.className = 'student-answer-reveal-title';
      title.textContent = 'Correct Answer';

      const content = document.createElement('div');
      content.className = 'student-answer-reveal-content';

      revealEl.append(title, content);

      // Better placement: drop it right above the submit button section
      const submissionWrap = document.getElementById('joinSubmission');
      if (wrap.id === 'joinQuestionInteractive' && submissionWrap) {
        wrap.insertBefore(revealEl, submissionWrap);
      } else {
        wrap.appendChild(revealEl);
      }
    }

    // Only update DOM if text actually changed
    const contentEl = revealEl.querySelector('.student-answer-reveal-content');
    if (contentEl && contentEl.textContent !== correctText) {
      contentEl.textContent = correctText;
    }
  };

  const latestName = String(state?.name || '').trim();
  if (latestName && latestName !== live.player.displayName) {
    live.player.displayName = latestName;
    setJoinTitle(latestName);
  }

  if (joinProgressEl) joinProgressEl.textContent = `${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (joinScoreEl) joinScoreEl.textContent = `Score: ${state.score}`;

  // Clear previous feedback to avoid carryover between questions
  // (but preserve immediate live-mode answer reveal HUD)
  if (!live.player.liveRevealApplied) {
    setJoinStatusHud('', '');
  }

  const renderInlinePoints = (_points) => {
    // Removed by request: do not show separate inline "+X pts" row.
    if (!joinAnswersEl) return;
    joinAnswersEl.querySelectorAll('[data-join-points-inline="1"]').forEach((el) => el.remove());
  };

  const renderInlineCorrection = (rrNow = null) => {
    const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
    if (!wrap) return;
    wrap.querySelectorAll('[data-join-correction-inline="1"]').forEach((el) => el.remove());
    const corr = String(rrNow?.correction || '').trim();
    const audioKey = String(rrNow?.correctionAudioKey || '').trim();
    if (!corr && !audioKey) return;

    const studentText = getStudentAnswerTextFromUI();
    const p = document.createElement('div');
    p.dataset.joinCorrectionInline = '1';

    // Reuse the modern block, but color it for a teacher correction (red)
    p.className = 'student-answer-reveal';
    p.style.background = '#fef2f2';
    p.style.borderColor = '#fca5a5';
    p.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.06)';

    const title = document.createElement('div');
    title.className = 'student-answer-reveal-title';
    title.style.color = '#dc2626';
    title.textContent = 'Teacher Feedback';

    const content = document.createElement('div');
    content.className = 'student-answer-reveal-content';
    content.style.color = '#7f1d1d';

    if (corr) {
      content.innerHTML = `${buildCorrectionDiffHtml(corr, studentText)}`;
    } else {
      content.textContent = '(Voice comment only)';
    }

    p.append(title, content);

    // Audio feedback
    if (rrNow?.correctionAudioKey) {
      const audioKey = rrNow.correctionAudioKey;
      const audioWrap = document.createElement('div');
      audioWrap.style.marginTop = '0.75rem';
      audioWrap.style.display = 'flex';
      audioWrap.style.alignItems = 'center';
      audioWrap.style.gap = '0.5rem';

      const audioBtn = document.createElement('button');
      audioBtn.className = 'btn';
      audioBtn.type = 'button';
      audioBtn.style.padding = '0.4rem 0.8rem';
      audioBtn.style.fontSize = '0.9rem';
      audioBtn.innerHTML = '🔊 Play Voice Comment';

      const audioEl = new Audio();
      const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
      audioEl.src = `${base}/api/media/${audioKey}`;

      audioBtn.onclick = () => {
        if (audioEl.paused) {
          audioEl.play().catch(err => console.warn('Audio playback failed:', err));
          audioBtn.innerHTML = '⏸️ Pause';
        } else {
          audioEl.pause();
          audioBtn.innerHTML = '🔊 Play Voice Comment';
        }
      };

      audioEl.onended = () => {
        audioBtn.innerHTML = '🔊 Play Voice Comment';
      };

      audioWrap.appendChild(audioBtn);
      p.appendChild(audioWrap);
    }

    const submissionWrap = document.getElementById('joinSubmission');
    if (wrap.id === 'joinQuestionInteractive' && submissionWrap) {
      wrap.insertBefore(p, submissionWrap);
    } else {
      wrap.appendChild(p);
    }
  };

  if (state.phase !== 'question' || !state.question) {
    cancelPendingAssignmentQuestionAutoplay();
    stopAssignmentQuestionAudioPlayback();
    const oldOverlay = document.getElementById('matchPairsCenterOverlay');
    if (oldOverlay) oldOverlay.remove();

    applyJoinLayoutMode(false, null);
    stopJoinTimer();
    if (joinTimerEl) joinTimerEl.textContent = 'Time: -';
    if (joinQuestionWrap) joinQuestionWrap.classList.add('hidden');

    const canReroll = (state.phase === 'lobby' && !!live.player.randomNamesMode)
      || (live.player.mode === 'assignment' && !!live.player.randomNamesMode && !live.player.assignment.attemptId);
    if (rerollNameBtn) rerollNameBtn.classList.toggle('hidden', !canReroll);

    if (state.phase === 'lobby') {
      setStatus(joinStatusEl, 'Waiting for teacher to start…', 'ok');
    } else if (state.phase === 'results') {
      if (!assignmentFinalPlayed) {
        playAssignmentSfx('final');
        assignmentFinalPlayed = true;
      }
      // Update header for finished state
      const modeLabel = document.getElementById('joinModeLabel');
      if (modeLabel) modeLabel.textContent = 'Game finished 🎉';
      // Clear status (shown in header now)
      renderLeaderboardInJoin(state.leaderboard || [], {
        answerText: live?.player?.lastAnswerText || '',
        isCorrect: live?.player?.lastAnswerCorrect,
        correctText: live?.player?.correctAnswerText || state.correctAnswer || ''
      });
    }
    renderJoinReveal();
    scheduleJoinAdaptiveFit();
    return;
  }

  if (joinQuestionWrap) joinQuestionWrap.classList.remove('hidden');
  if (rerollNameBtn) rerollNameBtn.classList.add('hidden');

  // Add body class to hide topbar
  document.body.classList.add('question-active');
  initReactionRow(); // Re-init to set correct mode

  // Update mode label in header row
  const modeLabel = document.getElementById('joinModeLabel');
  if (modeLabel) {
    modeLabel.textContent = live.player.mode === 'assignment' ? 'Assignment' : '';
  }

  const assignmentSubmitted = live.player.mode === 'assignment' && !!state.assignmentSubmitted;
  const assignmentTotal = Number(state.totalQuestions || 0);
  const answeredSet = new Set(Array.isArray(state.answeredQIndexes) ? state.answeredQIndexes.map((x) => Number(x)) : []);
  const allAssignmentAnswersSaved = live.player.mode === 'assignment' && assignmentTotal > 0 && answeredSet.size >= assignmentTotal;

  if (allAssignmentAnswersSaved && !assignmentSubmitted && !live.player.assignment.pendingComplete) {
    cancelPendingAssignmentQuestionAutoplay();
    stopAssignmentQuestionAudioPlayback();
    stopJoinTimer();
    if (joinTimerEl) joinTimerEl.textContent = 'Time: —';
    if (joinProgressEl) joinProgressEl.textContent = `Completed ${answeredSet.size} / ${assignmentTotal}`;
    if (joinPromptEl) joinPromptEl.textContent = 'End of quiz 🎉';
    if (joinAnswersEl) joinAnswersEl.innerHTML = '';
    if (assignmentPrevBtn) assignmentPrevBtn.classList.add('hidden');
    if (assignmentNextBtn) assignmentNextBtn.classList.add('hidden');
    if (assignmentNextPendingBtn) assignmentNextPendingBtn.classList.add('hidden');
    if (assignmentBannerEl) {
      assignmentBannerEl.classList.remove('hidden');
      assignmentBannerEl.textContent = 'All answers saved. Submit assignment to finish.';
    }
    setJoinStatusHud('All answers saved ✅', 'ok');
    setStatus(joinStatusEl, 'End of quiz reached. Submit assignment to finish.', 'ok');
    showAssignmentCompleteMessage('All answers are saved. You reached the end of the quiz.', {
      title: 'End of quiz 🎉',
      showFinishButton: true,
      finishLabel: 'Submit assignment',
    });
    scheduleJoinAdaptiveFit();
    return;
  }

  hideAssignmentCompleteMessage();

  const key = `${state.phase}:${state.currentIndex}:${Number(state.questionStartedAt || 0)}`;
  const isAssignmentQuestionPhase = live.player.mode === 'assignment' && state.phase === 'question' && !state.assignmentSubmitted;
  const assignmentQuestionChanged = isAssignmentQuestionPhase
    && (state.currentIndex !== lastRenderedQuestionIndex || live.player.renderKey !== key);

  // Play answering ambient when entering a new question in assignment mode
  if (assignmentQuestionChanged) {
    cancelPendingAssignmentQuestionAutoplay();
    lastRenderedQuestionIndex = state.currentIndex;
    pickNewAnsweringTrack();
    playAssignmentSfx('answering');
  } else if (!isAssignmentQuestionPhase) {
    cancelPendingAssignmentQuestionAutoplay();
  }
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    live.player.pinSelections = [];

    // --- NEW: Reset Bet UI state for the new question ---
    live.player.selectedBet = 0;
    betSelected = false;
    const betBtn = document.getElementById('betIndicator');
    if (betBtn) {
      betBtn.classList.remove('selected');
    }

    renderJoinQuestion(state.question);
    setJoinStatusHud('', '');
    animatePulse(joinQuestionWrap);
  }

  const questionClosed = !!state.questionClosed;
  const isPoll = !!state.question?.isPoll;

  if (!isAssignmentQuestionPhase || questionClosed) {
    cancelPendingAssignmentQuestionAutoplay();
  }

  if (assignmentQuestionChanged && !questionClosed && hasAssignmentQuestionAudio(state.question)) {
    const assignmentAudioKey = `${state.currentIndex}:${Number(state.questionStartedAt || 0)}`;
    if (lastAssignmentAudioKey !== assignmentAudioKey) {
      lastAssignmentAudioKey = assignmentAudioKey;
      cancelPendingAssignmentQuestionAutoplay();
      assignmentPromptAutoplayTimer = setTimeout(() => {
        assignmentPromptAutoplayTimer = null;
        runAssignmentQuestionMediaSequence(state.question, assignmentAudioKey).catch(() => { });
      }, 350);
    }
  }

  if (questionClosed) {
    stopJoinTimer();
    if (joinTimerEl) joinTimerEl.textContent = 'Time: 0s';
  } else {
    startJoinTimer(state);
  }

  // Play hall sound when question just closed (once per question)
  if (questionClosed && state.currentIndex !== lastClosedQuestionIndex) {
    playAssignmentSfx('hall');
    lastClosedQuestionIndex = state.currentIndex;
  }

  // Update shouldDisable to include answeredCurrent for both modes
  const shouldDisable = questionClosed || assignmentSubmitted || !!state.answeredCurrent || isAnswerFullscreenLocked();

  if (joinSubmitBtn) {
    const isAssignment = live.player.mode === 'assignment';
    // Change to Continue if the question is closed OR if the student has already answered
    const isContinueMode = isAssignment && (questionClosed || state.answeredCurrent) && !assignmentSubmitted;

    if (isContinueMode) {
      joinSubmitBtn.textContent = live.player.assignment.pendingComplete ? 'Finish quiz' : 'Continue';
      joinSubmitBtn.disabled = false;
    } else {
      joinSubmitBtn.textContent = isAssignment ? 'Save answer' : 'Submit';
      joinSubmitBtn.disabled = shouldDisable;
    }

    const pts = Number(state.question?.points || 0).toLocaleString('en-US');
    joinSubmitBtn.title = isPoll ? 'Poll question (no points)' : `${pts} points`;
    if (isAnswerFullscreenLocked()) {
      setJoinStatusHud('Exit fullscreen to answer.', 'bad');
    } else if (!questionClosed && joinSubmitBtn.disabled && live.player.mode === 'live' && !live.player.liveRevealApplied) {
      setJoinStatusHud('Answer submitted. Waiting for reveal…', 'ok');
    }
  }

  // --- NEW: Lock the bet button if the question is closed or answered ---
  const betBtn = document.getElementById('betIndicator');
  if (betBtn) {
    betBtn.disabled = shouldDisable;
  }

  if (joinFinalizeBtn) {
    const showFinalize = live.player.mode === 'assignment';
    joinFinalizeBtn.classList.toggle('hidden', !showFinalize);
    joinFinalizeBtn.disabled = assignmentSubmitted;
    joinFinalizeBtn.textContent = assignmentSubmitted ? 'Assignment submitted' : 'Submit assignment';
  }

  if (live.player.mode === 'assignment') {
    const total = Number(state.totalQuestions || 0);
    const idx = Number(state.currentIndex || 0);
    const answered = new Set(Array.isArray(state.answeredQIndexes) ? state.answeredQIndexes.map((x) => Number(x)) : []);
    const hasUnanswered = [...Array(Math.max(0, total)).keys()].some((i) => !answered.has(i));

    const isReview = !!live.player.assignment.reviewMode;

    if (assignmentPrevBtn) {
      assignmentPrevBtn.classList.remove('hidden');
      assignmentPrevBtn.disabled = idx <= 0 || (assignmentSubmitted && !isReview);
    }
    if (assignmentNextBtn) {
      assignmentNextBtn.classList.remove('hidden');
      assignmentNextBtn.disabled = idx >= Math.max(0, total - 1) || (assignmentSubmitted && !isReview);
    }
    if (assignmentNextPendingBtn) {
      assignmentNextPendingBtn.classList.remove('hidden');
      assignmentNextPendingBtn.disabled = !hasUnanswered || assignmentSubmitted;
    }

    if (assignmentBannerEl) {
      assignmentBannerEl.classList.remove('hidden');
      assignmentBannerEl.textContent = isReview
        ? `Reviewing question ${idx + 1} of ${total}`
        : assignmentSubmitted
          ? 'Assignment submitted. Waiting for teacher review.'
          : `Answered ${answered.size}/${total}. Use Next unanswered to continue.`;
    }
  } else {
    if (assignmentPrevBtn) assignmentPrevBtn.classList.add('hidden');
    if (assignmentNextBtn) assignmentNextBtn.classList.add('hidden');
    if (assignmentNextPendingBtn) assignmentNextPendingBtn.classList.add('hidden');
    if (assignmentBannerEl) {
      assignmentBannerEl.classList.add('hidden');
      assignmentBannerEl.textContent = '';
    }
  }

  const rrNow = state.revealedResult;
  renderInlineCorrection(rrNow);
  if (rrNow && rrNow.graded !== false) renderInlinePoints(rrNow.pointsAwarded);

  if (questionClosed) {
    if (isPoll) {
      setJoinStatusHud('🗳️ Poll closed. Results on projector.', 'ok');
      setStatus(joinStatusEl, 'Poll closed.', 'ok');
    } else {
      const rr = state.revealedResult;
      const closeReason = String(state.questionCloseReason || '').trim();
      const closedMsg = closeReason === 'all_answered'
        ? 'Everyone answered. Waiting for next question…'
        : (closeReason === 'manual_reveal' ? 'Teacher closed the question. Waiting for next question…' : 'Question closed.');
      if (rr) {
        const corr = String(rr.correction || '').trim();
        if (corr) {
          setJoinStatusHud('', '');
        } else if (rr.graded === false) {
          setJoinStatusHud('📝 Waiting for teacher grading.', 'ok');
        } else {
          // Highlight items: green for correct, red for student's wrong answer
          const resultText = rr.correct ? '✅ Correct' : '❌ Incorrect';
          const pts = Number(rr.pointsAwarded || 0);

          // FIX: Show negative deductions properly
          let pointsText = '';
          if (pts > 0) pointsText = ` · +${pts} points`;
          else if (pts < 0) pointsText = ` · ${pts} points`;

          let feedback = `${resultText}${pointsText}`;
          if (state.question.type === 'error_hunt' && state.correctAnswer) {
            feedback += ` · Correct: ${state.correctAnswer}`;
          }
          setJoinStatusHud(feedback, rr.correct ? 'ok' : 'bad');
          highlightAnswerItems(rr.correct, state);

          // Disable all choice inputs and interactivity
          if (joinAnswersEl) {
            joinAnswersEl.querySelectorAll('input, select, button, textarea').forEach((el) => {
              el.disabled = true;
            });
            joinAnswersEl.style.pointerEvents = 'none'; // Prevent any further clicks
          }
        }
      } else {
        setJoinStatusHud(closedMsg, 'ok');
      }
    }
  } else if (assignmentSubmitted) {
    setStatus(joinStatusEl, 'Assignment submitted.', 'ok');
  } else if (state.answeredCurrent) {
    const rr = state.revealedResult;
    const corr = String(rr?.correction || '').trim();
    if (corr) {
      setJoinStatusHud('', '');
    } else if (!live.player.liveRevealApplied) {
      // Only set generic status if immediate live reveal is not showing
    }
    if (!live.player.liveRevealApplied) {
      setStatus(joinStatusEl, live.player.mode === 'assignment' ? 'Answer saved.' : 'Answer received.', 'ok');
    }
  } else {
    // Status shown in header row now, no need for separate status line
    setStatus(joinStatusEl, '', '');
  }

  renderJoinReveal();
  scheduleJoinAdaptiveFit();
}

function scheduleJoinAdaptiveFit() {
  if (live.player.adaptiveFitRaf) return;
  live.player.adaptiveFitRaf = requestAnimationFrame(() => {
    live.player.adaptiveFitRaf = null;
    applyAdaptiveFitJoin();
  });
}

function applyAdaptiveFitJoin() {
  if (!joinCardEl || !joinQuestionWrap) return;

  const active = !joinQuestionWrap.classList.contains('hidden');
  joinCardEl.classList.toggle('adaptive-active', active);
  joinCardEl.classList.remove('fit-l1', 'fit-l2', 'fit-l3', 'fit-l4', 'overflow-risk');
  joinQuestionWrap.classList.remove('adaptive-scaled');
  joinQuestionWrap.style.removeProperty('--adaptive-scale');

  if (!active) {
    joinCardEl.style.removeProperty('max-height');
    return;
  }

  const rect = joinCardEl.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 900;
  const available = Math.max(220, Math.floor(viewportH - rect.top - 8));
  joinCardEl.style.maxHeight = `${available}px`;

  const isOverflowing = () => (
    joinCardEl.scrollHeight > joinCardEl.clientHeight + 2
    || joinCardEl.scrollWidth > joinCardEl.clientWidth + 2
  );

  if (!isOverflowing()) return;
  joinCardEl.classList.add('fit-l1');
  if (!isOverflowing()) return;
  joinCardEl.classList.add('fit-l2');
  if (!isOverflowing()) return;
  joinCardEl.classList.add('fit-l3');
  if (!isOverflowing()) return;
  joinCardEl.classList.add('fit-l4');
  if (!isOverflowing()) return;

  const contentH = Math.max(1, joinQuestionWrap.scrollHeight);
  const scale = Math.max(0.68, Math.min(1, (available - 6) / contentH));
  if (scale < 0.995) {
    joinQuestionWrap.classList.add('adaptive-scaled');
    joinQuestionWrap.style.setProperty('--adaptive-scale', scale.toFixed(3));
  }

  if (isOverflowing()) {
    joinCardEl.classList.add('overflow-risk');
    console.warn('[PinPlay][fit][student] Overflow risk remains', {
      qType: live.player.currentQuestion?.type || null,
      qPromptLen: String(live.player.currentQuestion?.prompt || '').length,
      scrollH: joinCardEl.scrollHeight,
      clientH: joinCardEl.clientHeight,
    });
  }
}

function applyJoinLayoutMode(active, question = null) {
  if (!joinCardEl) return;
  const isActive = !!active;
  joinCardEl.classList.toggle('question-active', isActive);
  document.body.classList.toggle('question-active', isActive);
  const qType = String(question?.type || '').trim();
  if (qType) joinCardEl.dataset.qtype = qType;
  else delete joinCardEl.dataset.qtype;
  joinCardEl.classList.toggle('has-image', !!question?.imageData);
}

function renderJoinQuestion(question) {
  const oldOverlay = document.getElementById('matchPairsCenterOverlay');
  if (oldOverlay) oldOverlay.remove();
  joinQuestionWrap?.querySelectorAll('.question-video-wrap').forEach((el) => el.remove());

  applyJoinLayoutMode(true, question);
  if (joinSubmitBtn) {
    if (live.player.assignment.reviewMode) {
      joinSubmitBtn.classList.add('hidden');
    } else {
      joinSubmitBtn.classList.remove('hidden');
    }
  }
  if (joinPromptEl) {
    const icon = questionTypeIcon(question.type);
    const promptText = question.prompt || '(No question text)';
    joinPromptEl.textContent = icon ? `${icon} ${promptText}` : promptText;
  }

  // Store current question for keyboard shortcut
  live.player.currentQuestion = question;

  if (joinAnswersEl) {
    joinAnswersEl.innerHTML = '';
    joinAnswersEl.style.pointerEvents = 'auto';
    joinAnswersEl.classList.remove('two-col', 'answers-locked');
  }
  if (!joinAnswersEl) return;

  const preVideoCfg = assignmentVideoEmbedConfig(question.media);
  const hasQuestionVideo = live.player.mode === 'assignment' && preVideoCfg.kind === 'video' && !!preVideoCfg.src;
  const hasSharedImage = !hasQuestionVideo && question.type !== 'pin' && !!question.imageData;
  const hasAnyImage = !hasQuestionVideo && !!question.imageData;
  joinAnswersEl.classList.toggle('has-question-image', hasSharedImage);
  if (joinPromptEl) joinPromptEl.classList.toggle('with-image', hasAnyImage);

  // Clear background first
  if (joinQuestionWrap) {
    joinQuestionWrap.style.backgroundImage = '';
    joinQuestionWrap.style.backgroundSize = 'contain';
    joinQuestionWrap.style.backgroundPosition = 'center';
    joinQuestionWrap.style.backgroundRepeat = 'no-repeat';
  }
  const interactiveOverlay = document.getElementById('joinQuestionInteractive');
  if (interactiveOverlay) interactiveOverlay.classList.toggle('interactive-overlay', hasAnyImage);

  if (hasAnyImage) {
    let imgSrc = question.imageData;
    if (!imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) {
      const base = loadBackendUrl() || "https://pinplay-api.eugenime.workers.dev";
      imgSrc = `${base}/api/media/${imgSrc}`;
    }
    if (joinQuestionWrap) {
      if (question.type !== 'match_pairs') {
        joinQuestionWrap.style.backgroundImage = `url("${imgSrc}")`;
      }
    }
  }

  if (question.isPoll) {
    const note = document.createElement('p');
    note.className = 'small';
    note.textContent = 'Poll mode: anonymous results, no points.';
    joinAnswersEl.appendChild(note);
  }

  const videoCfg = assignmentVideoEmbedConfig(question.media);
  const hasVideo = videoCfg.kind === 'video' && !!videoCfg.src;
  const allowVideoForStudent = live.player.mode === 'assignment';
  const shouldRenderImage = !allowVideoForStudent || !hasVideo;
  if (!shouldRenderImage && joinQuestionWrap) {
    joinQuestionWrap.style.backgroundImage = '';
  }
  if (allowVideoForStudent && hasVideo && joinQuestionWrap) {
    const wrap = document.createElement('div');
    wrap.className = 'top-space question-video-wrap';
    if (videoCfg.provider === 'direct') {
      const v = document.createElement('video');
      v.src = videoCfg.src;
      v.controls = true;
      v.preload = 'metadata';
      v.className = 'question-video-el';
      v.addEventListener('loadedmetadata', () => { v.currentTime = videoCfg.startAt || 0; }, { once: true });
      v.addEventListener('timeupdate', () => {
        if (videoCfg.endAt != null && v.currentTime >= videoCfg.endAt) v.pause();
      });
      wrap.appendChild(v);
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = videoCfg.src;
      iframe.allowFullscreen = true;
      iframe.className = 'question-video-el';
      wrap.appendChild(iframe);
    }
    joinQuestionWrap.insertBefore(wrap, document.getElementById('joinQuestionInteractive') || null);
  }

  // Remove the old inline image preview logic for generic questions

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const isMulti = question.type === 'multi';

    // Shuffle answer order for presentation (seeded Fisher-Yates for consistent order across host/student)
    const seed = Math.abs([...((question.prompt || '') + (question.id || ''))].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) || 1;
    const indices = question.answers.map((_, i) => i);
    let sr = seed;
    for (let s = indices.length - 1; s > 0; s--) {
      sr = (sr * 16807) % 2147483647;
      const j = sr % (s + 1);
      [indices[s], indices[j]] = [indices[j], indices[s]];
    }

    indices.forEach((origIdx, displayNum) => {
      const a = question.answers[origIdx];
      const row = document.createElement('label');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      if (!isMulti) input.name = 'join-answer';
      input.value = String(origIdx);
      input.dataset.joinAnswer = '1';

      const text = document.createElement('span');
      text.textContent = a.text;

      // --- NEW: Pre-fill answer ---
      const state = live.player.assignment.state;
      const rawAnswers = state?.attempt?.answersByQ || {};
      const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
      const studentAnswer = String(answerObj?.answer || '');
      if (studentAnswer) {
        if (isMulti) {
          const selected = studentAnswer.split('|').map(s => s.trim());
          if (selected.includes(String(origIdx + 1)) || selected.includes(a.text)) input.checked = true;
        } else {
          if (studentAnswer === String(origIdx + 1) || studentAnswer === a.text) input.checked = true;
        }
      }
      if (live.player.assignment.reviewMode) {
        input.disabled = true;
        row.classList.add('join-answer-locked');
      }

      row.append(text, input);
      joinAnswersEl.appendChild(row);
    });

    // Two-column layout for 4+ answer items
    if (indices.length >= 4) {
      joinAnswersEl.classList.add('two-col');
    }



    if (question.type === 'audio') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '🔊 Play audio';
      btn.addEventListener('click', () => {
        // Prefer pre-recorded audio file if available
        if (question.audioMode === 'file' && question.audioData) {
          let audioUrl = question.audioData;
          if (!audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
            const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
            audioUrl = `${base}/api/media/${audioUrl}`;
          }
          const audio = new Audio(audioUrl);
          audio.play().catch(() => speakText(question.audioText || question.prompt || '', question.language || 'en-US-Wave'));
        } else {
          speakText(question.audioText || question.prompt || '', question.language || 'en-US-Wave');
        }
      });
      joinAnswersEl.appendChild(btn);
    }
    appendRiskBetBar();
    appendReactionBar();
    return;
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'voice_record' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
    if (question.type === 'image_open' && question.imageData) {
      const wrap = document.createElement('div');
      wrap.className = 'pin-preview question-image-preview';
      let bgSrc = question.imageData; if (!bgSrc.StartsWith("http") && !bgSrc.StartsWith("data:")) { const base = loadBackendUrl() || "https://pinplay-api.eugenime.workers.dev"; bgSrc = `${base}/api/media/${bgSrc}`; } wrap.style.backgroundImage = `url(${bgSrc})`;
      wrap.style.backgroundRepeat = 'no-repeat';
      wrap.style.backgroundPosition = 'center';
      wrap.style.backgroundSize = 'contain';
      wrap.dataset.zoomable = '1';
      wrap.dataset.bgImageSrc = question.imageData; // for lightbox
      joinAnswersEl.appendChild(wrap);
    }

    if (question.type === 'context_gap') {
      const gapCount = Number(question.gapCount || (question.gaps || []).length || 1);
      const count = Math.max(1, Math.min(10, gapCount));
      renderInlineContextGapInputs(joinAnswersEl, question.prompt, count, 'joinGap');
    } else if (question.type === 'match_pairs') {
      const leftItems = Array.isArray(question.leftItems) ? question.leftItems : [];
      const rightOptions = Array.isArray(question.rightOptions) ? question.rightOptions : [];

      // --- NEW: Pre-fill Match Pairs ---
      const state = live.player.assignment.state;
      const rawAnswers = state?.attempt?.answersByQ || {};
      const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
      const initialValues = Array.isArray(answerObj?.answer) ? answerObj.answer : null;

      if (question.imageData) {
        const overlay = document.createElement('div');
        overlay.id = 'matchPairsCenterOverlay';
        overlay.className = 'match-pairs-center-overlay'; // Removed host-mode to allow full-screen overlay

        const imgWrap = document.createElement('div');
        imgWrap.className = 'match-pairs-img-wrap';
        const img = document.createElement('img');
        let imgSrc = question.imageData;
        if (!imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) {
          const base = loadBackendUrl() || "https://pinplay-api.eugenime.workers.dev";
          imgSrc = `${base}/api/media/${imgSrc}`;
        }
        img.src = imgSrc;
        img.dataset.zoomable = '1';
        imgWrap.appendChild(img);

        const pairsWrap = document.createElement('div');
        pairsWrap.className = 'match-pairs-content-wrap';
        renderMatchPairsColumns(pairsWrap, leftItems, rightOptions, 'joinPair', initialValues);

        overlay.append(imgWrap, pairsWrap);

        // Insert into the background wrap behind the interactive sticky bar
        const interactiveSection = document.getElementById('joinQuestionInteractive');
        if (joinQuestionWrap && interactiveSection) {
          joinQuestionWrap.insertBefore(overlay, interactiveSection);
        } else {
          joinAnswersEl.appendChild(overlay);
        }
      } else {
        renderMatchPairsColumns(joinAnswersEl, leftItems, rightOptions, 'joinPair', initialValues);
      }
    } else if (question.type === 'error_hunt') {
      const required = Number(question.requiredErrors) || Math.max(1, countErrorHuntRequiredTokens(question.prompt, question.correctedVariants || [question.corrected]));
      const promptEl = document.getElementById('joinPrompt');
      if (promptEl) {
        promptEl.innerHTML = '';
        const pref = document.createElement('span');
        pref.className = 'prompt-prefix';
        pref.textContent = `Correct ${required} mistake${required > 1 ? 's' : ''}: `;
        promptEl.append(pref);
      }

      // Single textarea pre-loaded with the sentence for students to edit
      const ta = document.createElement('textarea');
      ta.id = 'joinErrorHuntRewrite';
      ta.className = 'join-answer-input error-hunt-textarea';
      ta.rows = 3;
      ta.maxLength = 300;
      ta.dataset.originalPrompt = String(question.prompt || '').trim();

      // Pre-fill from saved answer or original prompt
      const state = live.player.assignment.state;
      const rawAnswers = state?.attempt?.answersByQ || {};
      const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
      const savedRewrite = answerObj?.answer?.rewrite;
      ta.value = savedRewrite ? String(savedRewrite) : String(question.prompt || '').trim();

      if (live.player.assignment.reviewMode) {
        ta.disabled = true;
        ta.classList.add('join-answer-locked');
      }

      joinAnswersEl.appendChild(ta);
    } else if (question.type === 'speaking') {
      // No instruction text as requested
    } else if (question.type === 'voice_record') {
      renderVoiceRecorder(joinAnswersEl, question);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinTextAnswer';
      input.className = 'join-answer-input';
      input.maxLength = 120;
      input.placeholder = (question.type === 'open' || question.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';

      // --- NEW: Pre-fill answer if available ---
      const state = live.player.assignment.state;
      const rawAnswers = state?.attempt?.answersByQ || {};
      const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
      if (answerObj?.answer) {
        input.value = String(answerObj.answer);
      }
      if (live.player.assignment.reviewMode) {
        input.disabled = true;
        input.classList.add('join-answer-locked');
      }

      const row = document.createElement('div');
      row.className = 'join-answer-inline-row';
      row.appendChild(input);
      joinAnswersEl.appendChild(row);
    }
    appendRiskBetBar();
    appendReactionBar();
    return;
  }

  if (question.type === 'puzzle') {
    let options = Array.isArray(question.options) ? [...question.options] : [];

    // --- NEW: Pre-fill Puzzle ---
    const state = live.player.assignment.state;
    const rawAnswers = state?.attempt?.answersByQ || {};
    const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
    const savedOrder = String(answerObj?.answer || '').split('|').map(s => s.trim()).filter(Boolean);
    if (savedOrder.length > 0) {
      // Reorder options to match the student's saved answer
      const reordered = [];
      savedOrder.forEach(text => {
        const found = options.find(o => o.text === text);
        if (found) reordered.push(found);
      });
      // Add any missing ones if necessary (fallback)
      options.forEach(opt => {
        if (!reordered.includes(opt)) reordered.push(opt);
      });
      options = reordered;
    }

    createPuzzleDnd(joinAnswersEl, options, 'joinPuzzlePieces');

    if (live.player.assignment.reviewMode) {
      joinAnswersEl.querySelectorAll('.puzzle-piece').forEach(p => {
        p.draggable = false;
        p.classList.add('join-answer-locked');
      });
      const reset = joinAnswersEl.querySelector('.puzzle-reset');
      if (reset) reset.remove();
    }

    appendRiskBetBar();
    appendReactionBar();
    return;
  }

  if (question.type === 'slider') {
    const wrap = document.createElement('div');
    wrap.className = 'slider-inline-wrap';
    const value = Number(question.min || 0);
    wrap.innerHTML = `
      <input id="joinSlider" type="range" min="${question.min}" max="${question.max}" step="1" value="${value}" />
      <div id="joinSliderValue" class="slider-big-val">${value}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}</div>
    `;
    joinAnswersEl.appendChild(wrap);

    const slider = document.getElementById('joinSlider');
    const out = document.getElementById('joinSliderValue');

    // --- NEW: Pre-fill slider ---
    const state = live.player.assignment.state;
    const rawAnswers = state?.attempt?.answersByQ || {};
    const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
    if (answerObj?.answer != null && slider) {
      slider.value = answerObj.answer;
      if (out) out.textContent = `${slider.value}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}`;
    }
    if (live.player.assignment.reviewMode && slider) {
      slider.disabled = true;
    }

    slider?.addEventListener('input', () => {
      out.textContent = `${slider.value}${question.unit ? ` ${escapeHtml(question.unit)}` : ''}`;
    });
    appendRiskBetBar();
    appendReactionBar();
    return;
  }

  if (question.type === 'pin') {
    if (!question.imageData) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'No image set for this question.';
      joinAnswersEl.appendChild(p);
      appendRiskBetBar();
      appendReactionBar();
      return;
    }

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '.4rem';

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';
    wrap.style.margin = '0 auto';

    const img = document.createElement('img');
    let imgSrc = question.imageData; if (!imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) { const base = loadBackendUrl() || "https://pinplay-api.eugenime.workers.dev"; imgSrc = `${base}/api/media/${imgSrc}`; } img.src = imgSrc;
    img.alt = 'Pin question image';

    const picksLayer = document.createElement('div');
    picksLayer.className = 'pin-picks-layer';

    syncPicksLayerBounds(wrap, picksLayer, img);

    const zonesCount = question.zoneCount || (Array.isArray(question.zones) && question.zones.length ? question.zones.length : 1);
    const pinMode = String(question.pinMode || 'all');
    let required = 1;
    if (pinMode === 'all') required = Math.max(1, Math.min(12, zonesCount));
    else if (pinMode === 'any') required = 1;
    else { const n = parseInt(pinMode, 10); if (n >= 1) required = Math.max(1, Math.min(zonesCount, n)); }

    const countLabel = document.createElement('div');
    countLabel.className = 'pin-count-big';
    countLabel.textContent = `0 / ${required}`;

    wrap.append(img, picksLayer);
    container.append(countLabel, wrap);
    joinAnswersEl.appendChild(container);

    const renderPicks = () => {
      picksLayer.innerHTML = '';
      const picks = live.player.pinSelections || [];
      countLabel.textContent = `${Math.min(picks.length, required)} / ${required}`;
      picks.forEach((p) => {
        const dot = document.createElement('div');
        dot.className = 'pin-dot';
        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
        picksLayer.appendChild(dot);
      });
    };

    attachPinPicker(wrap, (point) => {
      // Ensure pinSelections is an array before using it
      const picks = Array.isArray(live.player.pinSelections) ? [...live.player.pinSelections] : [];
      console.debug('pin click', point, 'existing picks', picks, 'required', required);

      const nearIdx = picks.findIndex((p) => distance2D(p.x, p.y, point.x, point.y) <= 4);
      if (nearIdx >= 0) {
        // Toggle-remove existing nearby pick
        picks.splice(nearIdx, 1);
      } else if (picks.length < required) {
        // Add a new pick if under the required limit
        picks.push(point);
      } else {
        // Reached allowed number of picks; log for diagnostics
        console.info('pin limit reached', { current: picks.length, required });
      }

      live.player.pinSelections = picks;
      live.player.pinSelection = picks[0] || null;
      renderPicks();
    });

    renderPicks();
    appendRiskBetBar();
    appendReactionBar();
  }
}

function isAnswerFullscreenLocked() {
  const fsEl = document.fullscreenElement;
  if (!fsEl) return false;
  return fsEl.tagName === 'IFRAME' || fsEl.tagName === 'VIDEO' || !!fsEl.closest?.('#joinAnswers');
}

function appendRiskBetBar() {
  // Show +40% bet button only in live mode (not assignment)
  const betInd = document.getElementById('betIndicator');
  if (betInd) {
    if (live.player.mode === 'assignment') {
      betInd.style.display = 'none';
    } else {
      betInd.style.display = 'inline-flex';
      const btn = betInd.querySelector('.bet-btn');
      if (btn) btn.textContent = '+40%';
    }
  }
  return; // Skip full bet bar

  // Old code preserved for reference:
  if (!joinAnswersEl) return;

  const wrap = document.createElement('div');
  wrap.className = 'top-space risk-bet-wrap';

  const bg = document.createElement('div');
  bg.className = 'risk-danger-bg';
  bg.textContent = 'Danger';
  wrap.appendChild(bg);

  const controls = document.createElement('div');
  controls.className = 'row gap risk-bet-controls';

  const row = document.createElement('div');
  row.className = 'row gap risk-bet-row';

  const legend = document.createElement('p');
  legend.className = 'small risk-bet-legend';
  legend.innerHTML = '<span>🤔</span><span>😬</span><span>🔥</span>';

  const bets = [
    { value: 1, emoji: '🤔', bonus: '+15%', penalty: '-5%' },
    { value: 2, emoji: '😬', bonus: '+25%', penalty: '-15%' },
    { value: 3, emoji: '🔥', bonus: '+40%', penalty: '-40%' }, // <-- FIXED: Displays -40% accurately now instead of 30%
  ];

  bets.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn risk-bet-btn';
    btn.dataset.bet = String(b.value);
    btn.textContent = b.bonus;
    btn.dataset.bonus = b.bonus;
    btn.dataset.emoji = b.emoji;
    btn.removeAttribute('title');
    btn.setAttribute('aria-label', `${b.bonus} / ${b.penalty}`);
    if (Number(live.player.selectedBet || 0) === b.value) btn.classList.add('active');

    const showEmoji = () => { btn.textContent = b.emoji; btn.classList.add('is-emoji'); };
    const showBonus = () => { btn.textContent = b.bonus; btn.classList.remove('is-emoji'); };
    btn.addEventListener('mouseenter', showEmoji);
    btn.addEventListener('mouseleave', showBonus);
    btn.addEventListener('focus', showEmoji);
    btn.addEventListener('blur', showBonus);

    btn.addEventListener('click', () => {
      live.player.selectedBet = b.value;
      row.querySelectorAll('.risk-bet-btn').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
    });
    row.appendChild(btn);
  });

  if (joinSubmitBtn) {
    joinSubmitBtn.classList.remove('top-space');
    joinSubmitBtn.classList.add('risk-submit-btn');
    controls.appendChild(joinSubmitBtn);
  }

  controls.appendChild(row);

  wrap.appendChild(controls);
  joinAnswersEl.appendChild(wrap);
}

function getStudentAnswerTextFromUI() {
  const textInput = joinAnswersEl?.querySelector('input[type="text"], textarea');
  if (textInput && typeof textInput.value === 'string') return String(textInput.value || '').trim();

  const errorHuntChips = joinAnswersEl?.querySelectorAll('[data-error-token]');
  if (errorHuntChips && errorHuntChips.length > 0) {
    return [...errorHuntChips].map(el => el.dataset.tokenText || el.textContent || '').join(' ').trim();
  }

  const selected = [...(joinAnswersEl?.querySelectorAll('[data-puzzle-piece], input:checked + span') || [])]
    .map((el) => String(el.textContent || '').trim())
    .filter(Boolean)
    .join(' ');
  return selected;
}

function escapeHtmlText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildCorrectionDiffHtml(correction, original) {
  const origWords = new Set(String(original || '').toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
  const tokens = String(correction || '').match(/\s+|[^\s]+/g) || [];
  return tokens.map((tok) => {
    const safe = escapeHtmlText(tok);
    const core = (tok.match(/[\p{L}\p{N}']+/u) || [null])[0];
    const word = core ? String(core).toLowerCase() : null;
    if (!word || origWords.has(word)) return safe;
    return `<span class="join-correction-diff">${safe}</span>`;
  }).join('');
}

function appendReactionBar() {
  // Disabled - reactions are now in the submission row
  return;

  const host = joinAnswersEl;
  if (!host) return;

  const old = host.querySelector('#joinReactionBar');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'joinReactionBar';
  wrap.className = 'join-reaction-row';

  const row = document.createElement('div');
  row.className = 'row gap';

  REACTION_EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = emoji;
    btn.style.padding = '.3rem .5rem';
    btn.addEventListener('click', () => sendReaction(emoji));
    row.appendChild(btn);
  });

  wrap.appendChild(row);

  host.appendChild(wrap);
}

async function sendReaction(emoji) {
  try {
    if (!live.player.pin || !live.player.id || !live.player.token) return;
    await api('/api/react', {
      method: 'POST',
      headers: { 'X-Player-Token': live.player.token },
      body: {
        pin: live.player.pin,
        playerId: live.player.id,
        emoji,
      },
    });
  } catch {
    // ignore reaction failures silently
  }
}

async function submitLiveAnswer() {
  try {
    if (joinSubmitBtn && (joinSubmitBtn.textContent === 'Continue' || joinSubmitBtn.textContent === 'Finish quiz')) {
      if (live.player.assignment.pendingComplete) {
        live.player.assignment.pendingComplete = false;
        const mapped = mapAssignmentStateToPlayerState();
        if (mapped) renderPlayerState(mapped);
        return;
      }
      moveAssignmentIndex(1);
      return;
    }

    const answer = readJoinAnswer();
    if (answer === null || answer === '') throw new Error('Choose/type an answer first.');

    if (live.player.mode === 'assignment') {
      const code = String(live.player.assignment.code || '').trim();
      const attemptId = String(live.player.assignment.attemptId || '').trim();
      if (!code || !attemptId) throw new Error('Start assignment first.');

      const qIndex = Number(live.player.assignment.currentIndex || 0);
      const data = await api('/api/assignment/answer', {
        method: 'POST',
        body: {
          code,
          attemptId,
          qIndex,
          answer,
          bet: Number(live.player.selectedBet || 0), // <--- FIX: Sends bet to server
        },
      });

      const mode = data?.attempt?.assignment?.feedbackMode || 'none';
      if (mode !== 'instant') {
        live.player.assignment.forceAutoAdvance = true;
      }

      // Check if this was the last answer and feedback is instant
      const totalQs = Number(data?.attempt?.assignment?.totalQuestions || data?.attempt?.assignment?.quiz?.questions?.length || 0);
      const answeredQs = Array.isArray(data?.attempt?.answeredQIndexes) ? data.attempt.answeredQIndexes.length : 0;
      if (mode === 'instant' && totalQs > 0 && answeredQs >= totalQs) {
        live.player.assignment.pendingComplete = true;
        live.player.assignment.forceAutoAdvance = false;
      }

      setJoinStatusHud('Answer saved ✅', 'ok');
      await loadAssignmentState();
      renderInstantFeedbackFromState();
      return;
    }

    if (!live.player.pin || !live.player.id || !live.player.token) throw new Error('Join first.');

    const data = await api('/api/answer', {
      method: 'POST',
      headers: { 'X-Player-Token': live.player.token },
      body: {
        pin: live.player.pin,
        playerId: live.player.id,
        answer,
        bet: Number(live.player.selectedBet || 0), // <--- FIX: Sends bet to server
      },
    });

    live.player.submittedForIndex = data.currentIndex;
    if (joinSubmitBtn) joinSubmitBtn.disabled = true;

    // Store answer info for leaderboard feedback
    const question = live.player.currentQuestion;
    const correctIdx = (question?.answers || []).findIndex(a => a.correct);
    live.player.correctAnswerText = correctIdx >= 0 ? (question?.answers?.[correctIdx]?.text || '') : '';
    const answerIdx = Number(answer);
    live.player.lastAnswerText = (question?.answers?.[answerIdx]?.text || '');
    live.player.lastAnswerCorrect = !!data.correct;

    if (joinScoreEl) joinScoreEl.textContent = `Score: ${data.score}`;

    // --- Immediate answer reveal (clone assignment-mode behavior) ---
    const isPoll = !!question?.isPoll;
    const isAutoGraded = !!data.graded;
    if (!isPoll && isAutoGraded) {
      const pts = Number(data.pointsAwarded || 0);
      const resultText = data.correct ? '✅ Correct' : '❌ Incorrect';
      let pointsText = '';
      if (pts > 0) pointsText = ` · +${pts} points`;
      else if (pts < 0) pointsText = ` · ${pts} points`;
      let feedback = `${resultText}${pointsText}`;
      if (question?.type === 'error_hunt' && data.correctAnswer) {
        feedback += ` · Correct: ${data.correctAnswer}`;
      }
      setJoinStatusHud(feedback, data.correct ? 'ok' : 'bad');

      // Apply color-coded highlighting + text reveal (same as assignment mode)
      const syntheticState = {
        question,
        correctAnswer: String(data.correctAnswer || ''),
        correctZones: Array.isArray(data.correctZones) ? data.correctZones : undefined,
      };
      highlightAnswerItems(data.correct, syntheticState);

      // Disable all answer inputs (same as assignment-mode questionClosed path)
      if (joinAnswersEl) {
        joinAnswersEl.querySelectorAll('input, select, button, textarea').forEach((el) => {
          el.disabled = true;
        });
        joinAnswersEl.style.pointerEvents = 'none';
      }

      // Show correct-answer text reveal box for text-based question types
      const needsReveal = question && ['text', 'puzzle', 'error_hunt', 'match_pairs', 'context_gap'].includes(question.type);
      const correctText = String(data.correctAnswer || '').trim();
      if (needsReveal && correctText) {
        const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
        if (wrap) {
          let revealEl = wrap.querySelector('[data-join-correct-reveal="1"]');
          if (!revealEl) {
            revealEl = document.createElement('div');
            revealEl.className = 'student-answer-reveal';
            revealEl.dataset.joinCorrectReveal = '1';
            const title = document.createElement('div');
            title.className = 'student-answer-reveal-title';
            title.textContent = 'Correct Answer';
            const content = document.createElement('div');
            content.className = 'student-answer-reveal-content';
            revealEl.append(title, content);
            const submissionWrap = document.getElementById('joinSubmission');
            if (wrap.id === 'joinQuestionInteractive' && submissionWrap) {
              wrap.insertBefore(revealEl, submissionWrap);
            } else {
              wrap.appendChild(revealEl);
            }
          }
          const contentEl = revealEl.querySelector('.student-answer-reveal-content');
          if (contentEl && contentEl.textContent !== correctText) {
            contentEl.textContent = correctText;
          }
        }
      }
    } else {
      setJoinStatusHud('Answer submitted. Waiting for reveal…', 'ok');
    }

    // Mark that immediate reveal is active for this question index
    // so polling renderPlayerState doesn't overwrite it before teacher closes
    if (!isPoll && isAutoGraded) {
      live.player.liveRevealApplied = true;
      live.player.liveRevealForIndex = data.currentIndex;
    }
  } catch (err) {
    const msg = String(err?.message || 'Could not submit answer.');
    if (msg.includes('Question is closed') || msg.includes('Question is not active')) {
      if (joinSubmitBtn) joinSubmitBtn.disabled = true;
      setJoinStatusHud('Question is closed. Waiting for next one…', 'ok');
      return;
    }
    setJoinStatusHud(msg, 'bad');
  }
}

function readJoinAnswer() {
  const q = live.player.currentQuestion;
  if (!q || !joinAnswersEl) return null;

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

  if (q.type === 'voice_record') {
    if (!_voiceRecordUpload || _voiceRecordUpload.uploading || _voiceRecordUpload.error) return null;
    return { audioUrl: _voiceRecordUpload.url, durationMs: _voiceRecordUpload.durationMs, mimeType: _voiceRecordUpload.mimeType };
  }

  if (q.type === 'context_gap') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-gap]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'match_pairs') {
    const fields = [...document.querySelectorAll('[data-join-pair]')]; // Scope broadened to catch elements in the overlay
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'error_hunt') {
    const ta = document.getElementById('joinErrorHuntRewrite');
    const rewrite = String(ta?.value || '').trim();
    if (!rewrite) return null;
    const originalPrompt = String(ta?.dataset.originalPrompt || q.prompt || '').trim();
    const required = Number(q.requiredErrors) || countErrorHuntRequiredTokens(q.prompt, q.correctedVariants || [q.corrected]);
    // Compute selectedTokens by diffing original prompt tokens vs student's rewrite tokens
    const origTokens = tokenizeWords(originalPrompt);
    const rewriteTokens = tokenizeWords(rewrite);
    const selected = [];
    const maxLen = Math.max(origTokens.length, rewriteTokens.length);
    for (let i = 0; i < maxLen; i++) {
      if ((origTokens[i] || '') !== (rewriteTokens[i] || '')) {
        if (i < origTokens.length) selected.push(i);
        else selected.push(origTokens.length - 1);
      }
    }
    if (required === 0) {
      const normalizedPrompt = normalizeTextAnswer(originalPrompt);
      const normalizedRewrite = normalizeTextAnswer(rewrite);
      return normalizedRewrite === normalizedPrompt ? { rewrite, selectedTokens: [] } : null;
    }
    if (selected.length === 0) return null;
    return { rewrite, selectedTokens: selected };
  }

  if (q.type === 'puzzle') {
    const pieces = [...joinAnswersEl.querySelectorAll('[data-puzzle-piece]')]
      .map((el) => String(el.dataset.puzzlePiece || '').trim())
      .filter(Boolean);
    const expected = Number(q.length || (q.options || []).length || 0);
    return pieces.length === expected ? pieces : null;
  }

  if (q.type === 'slider') {
    const slider = document.getElementById('joinSlider');
    return slider ? Number(slider.value) : null;
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
  if (live.player.assignment.pollingTimer) clearInterval(live.player.assignment.pollingTimer);
  live.player.assignment.pollingTimer = null;
  stopJoinTimer();
}

function startJoinTimer(state) {
  if (!joinTimerEl) return;

  const setJoinTimerBar = (remainingSec, limitSec, active = true) => {
    if (!joinTimerBarFill) return;
    const limit = Math.max(1, Number(limitSec || 1));
    const remaining = Math.max(0, Number(remainingSec || 0));
    const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
    joinTimerBarFill.style.width = `${pct}%`;
    joinTimerBarFill.parentElement?.classList.toggle('active', !!active && pct > 0);
  };

  const startedAt = Number(state?.questionStartedAt || live.player.timerStartedAt || Date.now());
  const rawLimitSec = Number(state?.question?.timeLimit);
  const hasTimeLimit = Number.isFinite(rawLimitSec) ? rawLimitSec > 0 : true;
  const limitSec = hasTimeLimit ? Math.max(1, rawLimitSec || 20) : null;

  if (!hasTimeLimit) {
    stopJoinTimer();
    live.player.timerStartedAt = startedAt;
    live.player.timerLimitSec = 0;
    live.player.timerDeadlineAt = null;
    joinTimerEl.textContent = 'Time: No limit';
    setJoinTimerBar(0, 1, false);
    return;
  }

  const capMs = limitSec * 1000;
  const deadlineFromState = Number(state?.questionDeadlineAt || 0);
  const deadlineAt = Number.isFinite(deadlineFromState) && deadlineFromState > 0
    ? deadlineFromState
    : (startedAt + capMs);

  if (
    live.player.timerStartedAt === startedAt
    && live.player.timerLimitSec === limitSec
    && live.player.timerDeadlineAt === deadlineAt
    && live.player.timerTicker
  ) {
    return;
  }

  const serverNow = Number(state?.serverNow || 0);
  const initialRemainingMs = Number.isFinite(serverNow) && serverNow > 0
    ? Math.max(0, deadlineAt - serverNow)
    : Math.max(0, deadlineAt - Date.now());

  stopJoinTimer();

  live.player.timerStartedAt = startedAt;
  live.player.timerLimitSec = limitSec;
  live.player.timerDeadlineAt = deadlineAt;
  live.player.timerAnchorAt = Date.now();
  live.player.timerInitialRemainingMs = initialRemainingMs;

  const paint = () => {
    const elapsedMs = Math.max(0, Date.now() - Number(live.player.timerAnchorAt || Date.now()));
    const remainingMsRaw = Math.max(0, Number(live.player.timerInitialRemainingMs || 0) - elapsedMs);
    const remainingMs = Math.min(capMs, remainingMsRaw);
    const sec = Math.ceil(remainingMs / 1000);
    joinTimerEl.textContent = `Time: ${sec}s`;
    setJoinTimerBar(remainingMs / 1000, limitSec, true);
  };

  paint();
  live.player.timerTicker = setInterval(paint, 250);
}

function stopJoinTimer() {
  if (live.player.timerTicker) clearInterval(live.player.timerTicker);
  live.player.timerTicker = null;
  live.player.timerDeadlineAt = null;
  live.player.timerAnchorAt = null;
  live.player.timerInitialRemainingMs = null;
  if (joinTimerBarFill) {
    joinTimerBarFill.style.width = '0%';
    joinTimerBarFill.parentElement?.classList.remove('active');
  }
}

function renderLeaderboardInJoin(leaderboard, lastQuestionState) {
  if (!joinQuestionWrap || !joinPromptEl || !joinAnswersEl) return;

  joinQuestionWrap.classList.remove('hidden');
  document.body.classList.add('question-active');
  joinPromptEl.textContent = 'Final leaderboard';
  joinAnswersEl.innerHTML = '';
  if (joinSubmitBtn) joinSubmitBtn.classList.add('hidden');

  if (leaderboard?.length) {
    const ul = document.createElement('ul');
    ul.className = 'list';

    leaderboard.forEach((p, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${p.name} - ${p.score} pts`;
      ul.appendChild(li);
    });

    joinAnswersEl.appendChild(ul);
  }

  const hint = document.createElement('p');
  hint.className = 'small';
  hint.textContent = 'React to the final result 👇';
  joinAnswersEl.appendChild(hint);
  appendReactionBar();
}

function renderMatchPairsColumns(container, leftItems, rightOptions, datasetKey, initialValues = null) {
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

    rows.forEach((row, idx) => {
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

      const colorList = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];
      const lineColor = colorList[idx % colorList.length];

      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(Math.max(0, x1)));
      line.setAttribute('y1', String(Math.max(0, y1)));
      line.setAttribute('x2', String(Math.max(0, x2)));
      line.setAttribute('y2', String(Math.max(0, y2)));
      line.setAttribute('stroke', lineColor);
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

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.dataset[datasetKey] = String(i);

    const item = document.createElement('div');
    item.className = 'match-pairs-item match-pairs-item-left';
    item.textContent = String(left || '').trim();
    item.dataset.index = String(i);

    // Support pre-filling
    if (Array.isArray(initialValues) && initialValues[i]) {
      hidden.value = String(initialValues[i]);
    }

    if (!live.player.assignment.reviewMode) {
      item.addEventListener('click', () => {
        if (selectedLeft === i) {
          selectedLeft = -1;
        } else {
          selectedLeft = i;
          if (selectedRight) {
            assignPair(i, selectedRight);
            return;
          }
        }
        refreshUi();
      });
    } else {
      item.classList.add('join-answer-locked');
    }

    row.append(item, hidden);
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (live.player.assignment.reviewMode) return;
      hidden.value = '';
      refreshUi();
    });

    row.addEventListener('dragover', (e) => {
      if (live.player.assignment.reviewMode) return;
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
      if (live.player.assignment.reviewMode) return;
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
    btn.className = 'match-pairs-item match-pairs-item-right';
    btn.textContent = String(opt || '').trim();
    btn.dataset.matchRight = String(opt || '').trim();
    btn.draggable = !live.player.assignment.reviewMode;

    if (!live.player.assignment.reviewMode) {
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
    } else {
      btn.disabled = true;
      btn.classList.add('join-answer-locked');
    }

    rightButtonsByValue.set(String(opt || ''), btn);
    rightCol.appendChild(btn);
  });

  wrap.append(leftCol, rightCol, lineLayer);
  container.appendChild(wrap);
  window.addEventListener('resize', drawConnections);
  refreshUi();
}

function createPuzzleDnd(container, options, listId = 'puzzlePieces') {
  const wrap = document.createElement('div');
  wrap.className = 'puzzle-wrap';

  const bank = document.createElement('div');
  bank.className = 'puzzle-bank';

  const selected = document.createElement('div');
  selected.className = 'answers-grid puzzle-selected top-space';
  selected.dataset.puzzleList = listId;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn puzzle-reset';
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
    btn.className = 'btn puzzle-bank-btn';
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

  options.forEach((text, i) => {
    bank.appendChild(buildBankButton(String(text || ''), i));
  });
  bank.appendChild(resetBtn);
  refreshBankButtons();

  wrap.append(bank, selected);
  container.appendChild(wrap);
}

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

function loadBackendUrl() {
  return localStorage.getItem(BACKEND_KEY) || '';
}

function getOrCreateClientId() {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  let id = '';
  try {
    id = `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  } catch {
    id = `c_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
  }

  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

function animatePulse(el) {
  if (!el) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
}

// Highlight answer items with visual feedback
// Dispatches by question type for appropriate feedback
function highlightAnswerItems(isCorrect, state) {
  if (!joinAnswersEl) return;
  const question = state?.question;
  if (!question) return;

  // MCQ / TF / Multi-select
  if (['mcq', 'tf', 'multi'].includes(question.type)) {
    highlightChoiceAnswers(question, state.correctAnswer);
    return;
  }

  // Match pairs
  if (question.type === 'match_pairs') {
    highlightMatchPairs(question);
    return;
  }

  // Error hunt
  if (question.type === 'error_hunt') {
    highlightErrorHunt(question, isCorrect);
    return;
  }

  // Context gap
  // Context gap
  if (question.type === 'context_gap') {
    highlightContextGap(question);
    return; // Text reveal handled inline
  }

  // Slider: show correct value
  if (question.type === 'slider') {
    showSliderFeedback(question, state);
    return;
  }

  // Pin: show correct zone on image
  if (question.type === 'pin') {
    showPinFeedback(question, state);
    return;
  }

  // Puzzle: highlight items in correct/incorrect positions
  if (question.type === 'puzzle') {
    highlightPuzzle(question);
    return;
  }
}

// MCQ/TF/Multi highlighting
function highlightChoiceAnswers(question, correctAnswerStr) {
  const rows = joinAnswersEl.querySelectorAll('.answer-row');
  if (!rows.length) return;
  const isMulti = question.type === 'multi';
  const correctIndexes = new Set();

  // Parse correct answer index from server's correctAnswer string
  if (correctAnswerStr && typeof correctAnswerStr === 'string') {
    if (isMulti) {
      correctAnswerStr.split('|').forEach(part => {
        const match = part.trim().match(/^(\d+)\./);
        if (match) correctIndexes.add(Number(match[1]) - 1);
      });
    } else {
      const match = correctAnswerStr.trim().match(/^(\d+)\./);
      if (match) correctIndexes.add(Number(match[1]) - 1);
    }
  }

  // Fallback: use question.answers[].correct if available
  if (correctIndexes.size === 0) {
    question.answers.forEach((a, idx) => { if (a.correct) correctIndexes.add(idx); });
  }

  const selectedIndexes = new Set();
  joinAnswersEl.querySelectorAll('input:checked').forEach(input => {
    selectedIndexes.add(Number(input.value));
  });

  rows.forEach((row) => {
    const origIdx = Number(row.querySelector('input')?.value ?? -1);
    const isCorrect = correctIndexes.has(origIdx);
    const isSelected = selectedIndexes.has(origIdx);

    // Reset any previous states
    row.classList.remove('correct-highlight', 'incorrect-highlight', 'correct-missed', 'ignored-option');

    if (isCorrect && isSelected) {
      row.classList.add('correct-highlight');         // Option 2 (True Positive)
    } else if (!isCorrect && isSelected) {
      row.classList.add('incorrect-highlight');       // Option 1 (False Positive)
    } else if (isCorrect && !isSelected) {
      row.classList.add('correct-missed'); // Option 4 (Missed)
    } else {
      row.classList.add('ignored-option');            // Option 3 (True Negative)
    }
  });
}

// Match pairs: highlight each pair row
function highlightMatchPairs(question) {
  const pairs = question.pairs || [];
  const fields = document.querySelectorAll('[data-join-pair]'); // Scope broadened to catch elements in the overlay
  fields.forEach((field, idx) => {
    const val = String(field.value || '').trim();
    if (!val) return;
    const correct = pairs[idx]?.[1] || '';
    const row = field.closest('.answer-row') || field.parentElement;
    if (!row) return;
    if (val.toLowerCase() === correct.toLowerCase()) {
      row.classList.add('correct-highlight');
    } else {
      row.classList.add('incorrect-highlight');
    }
  });
}

// Error hunt: highlight selected tokens
function highlightErrorHunt(question, isCorrect) {
  const ta = document.getElementById('joinErrorHuntRewrite');
  if (ta) {
    ta.disabled = true;
    ta.classList.add('join-answer-locked');
  }

  if (isCorrect === false) {
    const correctText = question.corrected || '';
    if (!correctText) return;

    const wrap = document.getElementById('joinQuestionInteractive') || joinAnswersEl;
    if (wrap) {
      let revealEl = wrap.querySelector('.student-answer-reveal[data-join-correct-reveal="1"]');
      if (revealEl) revealEl.remove();

      revealEl = document.createElement('div');
      revealEl.className = 'student-answer-reveal';
      revealEl.dataset.joinCorrectReveal = '1';

      const title = document.createElement('div');
      title.className = 'student-answer-reveal-title';
      title.textContent = 'Correct Answer';
      revealEl.appendChild(title);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'student-answer-reveal-content';
      contentDiv.textContent = correctText;
      revealEl.appendChild(contentDiv);

      const submissionBox = document.getElementById('joinSubmission');
      if (wrap.id === 'joinQuestionInteractive' && submissionBox) {
        wrap.insertBefore(revealEl, submissionBox);
      } else {
        wrap.appendChild(revealEl);
      }
    }
  }
}

// Slider: show correct value with visual indicator
function showSliderFeedback(question, state) {
  const slider = document.getElementById('joinSlider');
  const out = document.getElementById('joinSliderValue');
  if (!slider) return;
  slider.disabled = true;
  let correctVal = parseFloat(state.correctAnswer);
  if (isNaN(correctVal)) {
    correctVal = Number(question.target ?? question.correctSliderValue ?? question.correctAnswer);
  }
  const studentVal = Number(slider.value);
  if (!isNaN(correctVal)) {
    const unit = question.unit ? ` ${escapeHtml(question.unit)}` : '';
    if (out) out.innerHTML = `<span style="color:var(--muted);font-size:1.5rem;margin-right:12px;">${studentVal}</span> <strong>${correctVal}${unit}</strong>`;
  }
}

// Pin: show correct zone marker on the image
function showPinFeedback(question, state) {
  const preview = joinAnswersEl.querySelector('.pin-preview');
  if (!preview) return;
  // Disable further picks
  preview.style.pointerEvents = 'none';

  const picksLayer = preview.querySelector('.pin-picks-layer');
  const targetContainer = picksLayer || preview;

  // Show correct zone(s) as green circles — prefer zones from state (server response) over question
  const zones = Array.isArray(state?.correctZones) && state.correctZones.length
    ? state.correctZones
    : (Array.isArray(question.zones) ? question.zones : []);
  zones.forEach(zone => {
    const marker = document.createElement('div');
    marker.className = 'pin-correct-marker';
    const r = (zone.r || 15);
    marker.style.cssText = `position:absolute;left:${zone.x}%;top:${zone.y}%;width:${r * 2}%;height:${r * 2}%;border:3px solid var(--ok);background:rgba(19,138,54,0.15);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:50;`;
    targetContainer.appendChild(marker);
  });
}



// Context gap: highlight each input
function highlightContextGap(question) {
  // Answer reveal is handled by renderJoinReveal using state.correctAnswer
  // (question.gaps is not available on the student side).
  // Only reset highlight styles on the input rows.
  const fields = joinAnswersEl.querySelectorAll('[data-join-gap]');
  fields.forEach((field) => {
    const row = field.closest('.answer-row') || field.parentElement;
    if (row) row.classList.remove('correct-highlight', 'incorrect-highlight');
  });
}

function highlightPuzzle(question) {
  // Puzzle answer buttons are intentionally not highlighted per request.
  // The correct/incorrect status is shown via HUD and correct answer reveal.
}

function setStatus(el, text, mode = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'feedback';
  if (mode === 'ok') el.classList.add('ok');
  if (mode === 'bad') el.classList.add('bad');
}

// Condensed status messages for the student HUD (top row, right of Score)
function setJoinStatusHud(text, mode = '') {
  if (!joinStatusHudEl) return;
  const condensed = condenseStatusText(text);
  const prevText = joinStatusHudEl.dataset.prevText ?? '';
  const prevMode = joinStatusHudEl.dataset.prevMode ?? '';
  const changed = prevText !== condensed || prevMode !== mode;

  joinStatusHudEl.textContent = condensed;
  joinStatusHudEl.className = 'join-hud-status';
  if (mode === 'ok') joinStatusHudEl.classList.add('ok');
  if (mode === 'bad') joinStatusHudEl.classList.add('bad');

  joinStatusHudEl.dataset.prevText = condensed;
  joinStatusHudEl.dataset.prevMode = mode;

  if (!changed) return;

  joinStatusHudEl.classList.remove('status-pop');
  void joinStatusHudEl.offsetWidth;
  joinStatusHudEl.classList.add('status-pop');

  if (joinStatusHudEl._statusPopTimeout) {
    clearTimeout(joinStatusHudEl._statusPopTimeout);
  }
  joinStatusHudEl._statusPopTimeout = setTimeout(() => {
    joinStatusHudEl.classList.remove('status-pop');
    joinStatusHudEl._statusPopTimeout = null;
  }, 900);
}

function condenseStatusText(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  // Waiting states
  if (/Waiting for next question/i.test(t)) return 'Waiting…';
  if (/Waiting for teacher grading/i.test(t)) return 'Grading…';
  if (/Waiting for reveal/i.test(t)) return 'Waiting…';
  if (/Teacher closed.*Waiting/i.test(t)) return 'Waiting…';
  if (/Question is closed.*Waiting/i.test(t)) return 'Waiting…';
  // Submitted states
  if (/Answer submitted/i.test(t)) return 'Submitted ✓';
  if (/Assignment submitted/i.test(t)) return 'Submitted ✓';
  if (/Assignment was already submitted/i.test(t)) return 'Already submitted';
  if (/Could not submit/i.test(t)) return 'Submit failed';
  // Poll
  if (/Poll closed/i.test(t)) return 'Poll closed ✓';
  // Saved
  if (/Answer saved/i.test(t)) return 'Saved ✓';
  // Default: return first 30 chars
  return t.length > 30 ? t.slice(0, 27) + '…' : t;
}

function showLoginError(msg) {
  const panel = document.getElementById('loginErrorPanel');
  const text = document.getElementById('loginErrorText');
  if (panel && text) {
    text.textContent = '❌ ' + msg;
    panel.classList.remove('hidden');
  }
}

function hideLoginError() {
  const panel = document.getElementById('loginErrorPanel');
  if (panel) panel.classList.add('hidden');
}

function setJoinTitle(name = '') {
  if (!joinTitleEl) return;
  const safe = String(name || '').trim();
  joinTitleEl.textContent = safe ? safe : '';
  // Also update player name in header row
  const playerNameEl = document.getElementById('joinPlayerName');
  if (playerNameEl) playerNameEl.textContent = safe ? safe : '';
}

// Bet selection toggle
let betSelected = false;
function initBetControl() {
  const betBtn = document.getElementById('betIndicator');
  if (!betBtn) return;
  betBtn.addEventListener('click', () => {
    if (betBtn.disabled) return; // Prevent toggling if already answered
    betSelected = !betSelected;
    betBtn.classList.toggle('selected', betSelected);
    live.player.selectedBet = betSelected ? 3 : 0; // 3 = +40%
  });
}

// Reaction emojis (live mode only) - defined at top of file
function initReactionRow() {
  const row = document.getElementById('reactionRow');
  if (!row) return;
  // Only show in live mode (not assignment)
  if (live.player.mode === 'assignment') {
    row.style.display = 'none';
    return;
  }
  row.innerHTML = '';
  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reaction-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => sendReaction(emoji));
    row.appendChild(btn);
  });
}

// Ambient sounds for assignment mode (like live mode)
const assignmentAmbient = {
  hall: null,
  final: null,
  answering: [],
};
let currentAnsweringIdx = -1; // Track current answering track per question
let lastRenderedQuestionIndex = -1; // Track last rendered question to play ambient on change
let lastClosedQuestionIndex = -1; // Track last question where hall sound was played
let assignmentFinalPlayed = false; // Track final sound for completed assignment
let assignmentPromptAutoplayTimer = null;
let lastAssignmentAudioKey = '';
let activeAssignmentQuestionAudioEl = null;

function initAssignmentSfx() {
  try {
    assignmentAmbient.hall = new Audio('music/hall.mp3');
    assignmentAmbient.final = new Audio('music/final.mp3');
    // All answering sounds
    assignmentAmbient.answering = [
      new Audio('music/answering.mp3'),
      new Audio('music/answering2.mp3'),
      new Audio('music/answering3.mp3'),
      new Audio('music/answering4.mp3'),
      new Audio('music/answering5.mp3'),
      new Audio('music/answering6.mp3'),
      new Audio('music/answering7.mp3'),
      new Audio('music/answering8.mp3'),
      new Audio('music/answering9.mp3'),
      new Audio('music/answering10.mp3'),
      new Audio('music/answering11.mp3'),
    ];
    Object.values(assignmentAmbient).flat().forEach(a => { if (a) a.volume = 0.7; });
  } catch { }
}

function stopAllAssignmentAmbient() {
  try {
    if (assignmentAmbient.hall) { assignmentAmbient.hall.pause(); assignmentAmbient.hall.currentTime = 0; }
    if (assignmentAmbient.final) { assignmentAmbient.final.pause(); assignmentAmbient.final.currentTime = 0; }
    assignmentAmbient.answering.forEach(a => { a.pause(); a.currentTime = 0; });
  } catch { }
}

function cancelPendingAssignmentQuestionAutoplay() {
  if (assignmentPromptAutoplayTimer) {
    clearTimeout(assignmentPromptAutoplayTimer);
    assignmentPromptAutoplayTimer = null;
  }
}

function supportsAssignmentQuestionAudio(type) {
  return ['mcq', 'multi', 'tf', 'text', 'open', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'slider', 'pin', 'audio', 'speaking', 'voice_record'].includes(String(type || ''));
}

function normalizeAssignmentQuestionMedia(rawMedia) {
  const raw = rawMedia && typeof rawMedia === 'object' ? rawMedia : {};
  const rawUrl = String(raw.url || '').trim();
  const rawEmbedUrl = String(raw.embedUrl || '').trim();
  const kind = (raw.kind === 'video' || rawUrl || rawEmbedUrl) ? 'video' : 'none';
  const detectProvider = (src) => {
    const value = String(src || '').toLowerCase();
    if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
    if (value.includes('vimeo.com')) return 'vimeo';
    return 'direct';
  };
  const provider = ['youtube', 'vimeo', 'direct'].includes(String(raw.provider || ''))
    ? String(raw.provider)
    : detectProvider(rawUrl || rawEmbedUrl || '');
  const startAt = Math.max(0, Number(raw.startAt || 0) || 0);
  let endAt = raw.endAt == null || raw.endAt === '' ? null : Number(raw.endAt);
  if (!Number.isFinite(endAt) || endAt <= startAt) endAt = null;
  return { kind, provider, url: rawUrl, embedUrl: rawEmbedUrl, startAt, endAt };
}

function assignmentVideoEmbedConfig(media) {
  const m = normalizeAssignmentQuestionMedia(media);
  let src = m.url || m.embedUrl || '';
  if (!src) return { ...m, src: '' };
  try {
    const u = new URL(src);
    if (m.provider === 'youtube' && u.hostname.includes('youtu')) {
      let id = u.searchParams.get('v') || '';
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      if (!id) return { ...m, src: '' };
      const e = new URL(`https://www.youtube.com/embed/${id}`);
      if (m.startAt > 0) e.searchParams.set('start', String(Math.floor(m.startAt)));
      if (m.endAt != null) e.searchParams.set('end', String(Math.floor(m.endAt)));
      src = e.toString();
    }
    if (m.provider === 'vimeo' && u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).find((x) => /^\d+$/.test(x));
      if (id) {
        const e = new URL(`https://player.vimeo.com/video/${id}`);
        src = e.toString();
      }
    }
    return { ...m, src };
  } catch { return { ...m, src: '' }; }
}

function hasAssignmentQuestionAudio(question) {
  if (!question) return false;
  if (question.type === 'audio') return true;
  if (!supportsAssignmentQuestionAudio(question.type)) return false;
  return !!question.audioEnabled;
}

function stopAssignmentQuestionAudioPlayback() {
  try {
    if (activeAssignmentQuestionAudioEl) {
      activeAssignmentQuestionAudioEl.pause();
      activeAssignmentQuestionAudioEl.currentTime = 0;
      activeAssignmentQuestionAudioEl = null;
    }
  } catch { }

  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch { }
}

async function playAssignmentQuestionAudio(question, opts = {}) {
  if (!hasAssignmentQuestionAudio(question)) return false;

  const audioKey = String(opts?.audioKey || '');
  stopAllAssignmentAmbient();
  stopAssignmentQuestionAudioPlayback();

  const playAudioEl = (audioEl) => new Promise((resolve) => {
    activeAssignmentQuestionAudioEl = audioEl;
    const onFinish = () => {
      if (activeAssignmentQuestionAudioEl === audioEl) activeAssignmentQuestionAudioEl = null;
      resolve(true);
    };
    audioEl.addEventListener('ended', onFinish, { once: true });
    audioEl.addEventListener('error', onFinish, { once: true });
    audioEl.play().catch(() => onFinish());
  });

  if (question.audioMode === 'file' && question.audioData) {
    try {
      let audioUrl = question.audioData;
      if (!audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
        const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
        audioUrl = `${base}/api/media/${audioUrl}`;
      }
      await playAudioEl(new Audio(audioUrl));
    } catch {
      return false;
    }
    return true;
  }

  const text = String(question.audioText || question.prompt || '').trim();
  if (!text) {
    return false;
  }

  try {
    const base = normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL;
    const voice = question.language?.includes('Neural')
      ? question.language
      : ((question.language || 'en-US').replace('-Wave', '') + '-JennyNeural');
    const key = `${voice}::${text}`;
    let audioUrl = studentEdgeTtsCache.get(key);
    if (!audioUrl) {
      const res = await fetch(`${base}/api/tts/edge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) throw new Error(`Edge TTS failed (${res.status})`);
      const blob = await res.blob();
      audioUrl = URL.createObjectURL(blob);
      studentEdgeTtsCache.set(key, audioUrl);
    }
    await playAudioEl(new Audio(audioUrl));
    return true;
  } catch {
    if (!('speechSynthesis' in window)) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = question.language || 'en-US';
      utterance.addEventListener('end', () => { }, { once: true });
      utterance.addEventListener('error', () => { }, { once: true });
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }
}

async function playAssignmentQuestionVideo(question) {
  const media = normalizeAssignmentQuestionMedia(question?.media);
  if (media.kind !== 'video' || media.provider !== 'direct' || !media.url) return true;
  return await new Promise((resolve) => {
    const v = document.createElement('video');
    v.src = media.url;
    v.onloadedmetadata = () => {
      v.currentTime = media.startAt || 0;
      v.play().catch(() => resolve(false));
    };
    v.ontimeupdate = () => {
      if (media.endAt != null && v.currentTime >= media.endAt) {
        v.pause(); resolve(true);
      }
    };
    v.onended = () => resolve(true);
    v.onerror = () => resolve(false);
  });
}

async function runAssignmentQuestionMediaSequence(question, audioKey) {
  await playAssignmentQuestionAudio(question, { audioKey });
  await playAssignmentQuestionVideo(question);
  const s = live.player.assignment.state;
  const attempt = s?.attempt;
  if (live.player.mode !== 'assignment') return;
  if (!attempt || attempt.submitted) return;
  if (audioKey && audioKey !== lastAssignmentAudioKey) return;

  // ensure we don't play ambient if another sequence took over

  playAssignmentSfx('answering');
}

function playAssignmentSfx(name) {
  try {
    // Stop any currently playing ambient first
    stopAllAssignmentAmbient();
    if (name === 'answering') {
      // Use pre-selected track for current question
      if (currentAnsweringIdx < 0) pickNewAnsweringTrack();
      const a = assignmentAmbient.answering[currentAnsweringIdx];
      if (a) { a.currentTime = 0; a.play().catch(() => { }); }
    } else {
      const a = assignmentAmbient[name];
      if (a) { a.currentTime = 0; a.play().catch(() => { }); }
    }
  } catch { }
}

function pickNewAnsweringTrack() {
  currentAnsweringIdx = Math.floor(Math.random() * assignmentAmbient.answering.length);
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

// Edge TTS cache for student UI
const studentEdgeTtsCache = new Map();

async function speakText(text, lang = 'en-US-Wave') {
  const value = String(text || '').trim();
  if (!value) return;

  // Use Edge TTS via backend API (same as teacher UI)
  try {
    const base = 'https://pinplay-api.eugenime.workers.dev';
    // Map lang to Edge TTS voice format (e.g., 'en-US' -> 'en-US-JennyNeural')
    const voice = lang?.includes('Neural') ? lang : (lang?.replace('-Wave', '') || 'en-US') + '-JennyNeural';
    const key = `${voice}::${value}`;

    let audioUrl = studentEdgeTtsCache.get(key);
    if (!audioUrl) {
      const res = await fetch(`${base}/api/tts/edge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, voice }),
      });
      if (!res.ok) {
        console.warn('Edge TTS failed, falling back to browser TTS');
        speakTextBrowser(value, lang);
        return;
      }
      const blob = await res.blob();
      audioUrl = URL.createObjectURL(blob);
      studentEdgeTtsCache.set(key, audioUrl);
    }

    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      // Fallback to browser TTS if Edge fails
      speakTextBrowser(value, lang);
    });
  } catch (e) {
    console.warn('Edge TTS error:', e);
    speakTextBrowser(value, lang);
  }
}

// Browser TTS fallback
function speakTextBrowser(text, lang = 'en-US-Wave') {
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

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Removed mergeJoinTokens as it caused inconsistent error counting and behavior.


function countErrorHuntRequiredTokens(prompt, corrected) {
  // 1. Support both single strings and arrays of multiple acceptable variants
  const variants = Array.isArray(corrected) ? corrected : [corrected];
  const validVariants = variants.map(v => String(v || '').trim()).filter(Boolean);
  if (!validVariants.length) return 1;

  let maxErrors = 1;

  // 2. Calculate the required errors for each variant and take the maximum
  for (const correctedStr of validVariants) {
    const source = tokenizeWords(prompt).map(normalizeTextAnswer);
    const target = tokenizeWords(correctedStr).map(normalizeTextAnswer);

    if (!source.length || !target.length) continue;
    if (source.join(' ') === target.join(' ')) continue;

    const rows = source.length + 1;
    const cols = target.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    // Initialize DP table
    for (let i = 0; i < rows; i++) dp[i][0] = i;
    for (let j = 0; j < cols; j++) dp[0][j] = j;

    // Fill DP table
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        if (source[i - 1] === target[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],       // Deletion
            dp[i][j - 1],       // Insertion
            dp[i - 1][j - 1]    // Substitution
          );
        }
      }
    }

    // Backtrack to count contiguous blocks of edits
    let i = source.length;
    let j = target.length;
    const errorIndexes = new Set();

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && source[i - 1] === target[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
        i--; j--;
      } else {
        if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
          errorIndexes.add(i - 1);
          i--; j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
          errorIndexes.add(i - 1);
          i--;
        } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
          errorIndexes.add(Math.max(0, i - 1));
          j--;
        } else {
          if (i > 0) i--;
          else j--;
        }
      }
    }

    // Track the highest number of mistakes found across all valid sentence variations
    if (errorIndexes.size > maxErrors) {
      maxErrors = errorIndexes.size;
    }
  }

  return Math.max(1, maxErrors);
}

// ===== Voice Record =====
let _voiceRecordUpload = null; // { url, durationMs, mimeType, uploading, error }
let _voiceRecordStream = null;
let _voiceRecordRecorder = null;
let _voiceRecordTimerId = null;

function _cleanupVoiceRecordStream() {
  if (_voiceRecordTimerId) { clearInterval(_voiceRecordTimerId); _voiceRecordTimerId = null; }
  if (_voiceRecordRecorder && _voiceRecordRecorder.state !== 'inactive') {
    try { _voiceRecordRecorder.stop(); } catch (_) { }
  }
  _voiceRecordRecorder = null;
  if (_voiceRecordStream) {
    _voiceRecordStream.getTracks().forEach((t) => t.stop());
    _voiceRecordStream = null;
  }
}

function renderVoiceRecorder(container, question) {
  _cleanupVoiceRecordStream();
  _voiceRecordUpload = null;

  const wrap = document.createElement('div');
  wrap.className = 'voice-recorder';

  const recordBtn = document.createElement('button');
  recordBtn.type = 'button';
  recordBtn.className = 'btn voice-record-btn';
  recordBtn.textContent = '🎙️ Record';

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'btn voice-record-stop-btn hidden';
  stopBtn.textContent = '⏹ Stop';

  const timerEl = document.createElement('div');
  timerEl.className = 'voice-record-status hidden';
  timerEl.textContent = '0:00';

  const previewWrap = document.createElement('div');
  previewWrap.className = 'voice-record-preview hidden';

  const statusEl = document.createElement('div');
  statusEl.className = 'voice-record-upload-status';

  wrap.append(recordBtn, stopBtn, timerEl, previewWrap, statusEl);
  container.appendChild(wrap);

  // --- NEW: Pre-fill student recording ---
  const state = live.player.assignment.state;
  const rawAnswers = state?.attempt?.answersByQ || {};
  const answerObj = rawAnswers[String(live.player.assignment.currentIndex)];
  const savedAudio = answerObj?.answer; // { audioUrl, durationMs, ... }

  if (savedAudio?.audioUrl) {
    const audio = document.createElement('audio');
    audio.controls = true;
    let src = savedAudio.audioUrl;
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const base = loadBackendUrl() || 'https://pinplay-api.eugenime.workers.dev';
      src = `${base}/api/media/${src}`;
    }
    audio.src = src;
    previewWrap.innerHTML = '';
    previewWrap.appendChild(audio);
    previewWrap.classList.remove('hidden');

    if (!live.player.assignment.reviewMode) {
      // Allow re-recording if not in review mode
      const rerecordBtn = document.createElement('button');
      rerecordBtn.type = 'button';
      rerecordBtn.className = 'btn';
      rerecordBtn.textContent = '🔄 Re-record';
      rerecordBtn.onclick = () => {
        previewWrap.classList.add('hidden');
        recordBtn.classList.remove('hidden');
        _voiceRecordUpload = null;
      };
      previewWrap.appendChild(rerecordBtn);
      recordBtn.classList.add('hidden');
    } else {
      recordBtn.classList.add('hidden');
    }
  } else if (live.player.assignment.reviewMode) {
    recordBtn.classList.add('hidden');
    statusEl.textContent = '(No recording provided)';
  }

  const MAX_DURATION_SEC = 120;
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;

  function showPreview(blob, durationMs) {
    previewWrap.innerHTML = '';
    previewWrap.classList.remove('hidden');
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(blob);

    const rerecordBtn = document.createElement('button');
    rerecordBtn.type = 'button';
    rerecordBtn.className = 'btn';
    rerecordBtn.textContent = '🔄 Re-record';
    rerecordBtn.addEventListener('click', () => {
      _cleanupVoiceRecordStream();
      _voiceRecordUpload = null;
      previewWrap.classList.add('hidden');
      previewWrap.innerHTML = '';
      statusEl.textContent = '';
      statusEl.className = 'voice-record-upload-status';
      recordBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      timerEl.classList.add('hidden');
    });

    const durLabel = document.createElement('span');
    durLabel.className = 'small muted';
    durLabel.textContent = ` ${Math.round(durationMs / 1000)}s`;

    previewWrap.append(audio, durLabel, rerecordBtn);
  }

  async function uploadBlob(blob, durationMs) {
    const mimeType = blob.type || 'audio/webm';
    _voiceRecordUpload = { url: null, durationMs, mimeType, uploading: true, error: null };
    statusEl.textContent = 'Uploading…';
    statusEl.className = 'voice-record-upload-status uploading';

    try {
      const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('ogg') ? '.ogg' : '.webm';
      const fileName = `voice_${Date.now()}${ext}`;
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('path', `voice_records/${fileName}`);

      const base = loadBackendUrl() || DEFAULT_BACKEND_URL;
      const resp = await fetch(`${base}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
      const data = await resp.json();
      const mediaKey = data?.path || data?.key || data?.url || '';
      if (!mediaKey) throw new Error('No media key returned');

      _voiceRecordUpload = { url: mediaKey, durationMs, mimeType, uploading: false, error: null };
      statusEl.textContent = '✓ Uploaded';
      statusEl.className = 'voice-record-upload-status uploaded';
    } catch (err) {
      _voiceRecordUpload = { url: null, durationMs, mimeType, uploading: false, error: err.message };
      statusEl.textContent = `⚠ ${err.message}. Tap to retry.`;
      statusEl.className = 'voice-record-upload-status error';
      statusEl.style.cursor = 'pointer';
      statusEl.onclick = () => { statusEl.onclick = null; uploadBlob(blob, durationMs); };
    }
  }

  recordBtn.addEventListener('click', async () => {
    try {
      _voiceRecordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      statusEl.textContent = 'Mic access denied. Check browser settings.';
      statusEl.className = 'voice-record-upload-status error';
      return;
    }

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    _voiceRecordRecorder = mimeType
      ? new MediaRecorder(_voiceRecordStream, { mimeType })
      : new MediaRecorder(_voiceRecordStream);

    const startTime = Date.now();

    _voiceRecordRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    _voiceRecordRecorder.onstop = () => {
      const durationMs = Date.now() - startTime;
      const blob = new Blob(chunks, { type: _voiceRecordRecorder.mimeType || 'audio/webm' });

      if (_voiceRecordTimerId) { clearInterval(_voiceRecordTimerId); _voiceRecordTimerId = null; }
      timerEl.classList.add('hidden');
      recordBtn.classList.remove('hidden');
      recordBtn.classList.add('hidden'); // keep hidden — show re-record in preview
      stopBtn.classList.add('hidden');

      if (blob.size > MAX_SIZE_BYTES) {
        statusEl.textContent = `Recording too large (${(blob.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_SIZE_BYTES / 1024 / 1024} MB). Try again.`;
        statusEl.className = 'voice-record-upload-status error';
        recordBtn.classList.remove('hidden');
        _voiceRecordStream?.getTracks().forEach((t) => t.stop());
        _voiceRecordStream = null;
        return;
      }

      showPreview(blob, durationMs);
      uploadBlob(blob, durationMs);
      _voiceRecordStream?.getTracks().forEach((t) => t.stop());
      _voiceRecordStream = null;
    };

    _voiceRecordRecorder.start(1000); // collect chunks every 1s

    recordBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    timerEl.classList.remove('hidden');
    timerEl.textContent = '0:00';
    statusEl.textContent = '';
    statusEl.className = 'voice-record-upload-status';

    let elapsed = 0;
    _voiceRecordTimerId = setInterval(() => {
      elapsed++;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      timerEl.textContent = `${m}:${String(s).padStart(2, '0')} / ${Math.floor(MAX_DURATION_SEC / 60)}:${String(MAX_DURATION_SEC % 60).padStart(2, '0')}`;
      if (elapsed >= MAX_DURATION_SEC) {
        if (_voiceRecordRecorder && _voiceRecordRecorder.state === 'recording') {
          _voiceRecordRecorder.stop();
        }
      }
    }, 1000);
  });

  stopBtn.addEventListener('click', () => {
    if (_voiceRecordRecorder && _voiceRecordRecorder.state === 'recording') {
      _voiceRecordRecorder.stop();
    }
  });
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

      // Ensure chip is marked active when editing begins
      chip.classList.add('active');

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
        // Auto-set active state: active if text differs from original prompt token
        const origToken = String(chip.dataset.originalText || '').trim();
        if (origToken && text !== origToken) {
          chip.classList.add('active');
        } else if (origToken && text === origToken) {
          chip.classList.remove('active');
        }
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

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function syncPicksLayerBounds(container, picksLayer, img) {
  const update = () => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !img.naturalWidth) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const rectRatio = rect.width / rect.height;

    let actualW = rect.width;
    let actualH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (Math.abs(imgRatio - rectRatio) > 0.01) {
      if (imgRatio > rectRatio) {
        actualW = rect.width;
        actualH = rect.width / imgRatio;
        offsetY = (rect.height - actualH) / 2;
      } else {
        actualH = rect.height;
        actualW = rect.height * imgRatio;
        offsetX = (rect.width - actualW) / 2;
      }
    }

    picksLayer.style.width = `${actualW}px`;
    picksLayer.style.height = `${actualH}px`;
    picksLayer.style.left = `${offsetX}px`;
    picksLayer.style.top = `${offsetY}px`;
    picksLayer.style.right = 'auto';
    picksLayer.style.bottom = 'auto';
  };

  update();
  img.addEventListener('load', update);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe(container);
  }
}

function attachPinPicker(container, onPick) {
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    let renderW = rect.width;
    let renderH = rect.height;

    const img = container.querySelector('img');
    if (img && img.naturalWidth && img.naturalHeight) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const rectRatio = rect.width / rect.height;

      let actualW = rect.width;
      let actualH = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (Math.abs(imgRatio - rectRatio) > 0.01) {
        if (imgRatio > rectRatio) {
          actualW = rect.width;
          actualH = rect.width / imgRatio;
          offsetY = (rect.height - actualH) / 2;
        } else {
          actualH = rect.height;
          actualW = rect.height * imgRatio;
          offsetX = (rect.width - actualW) / 2;
        }
      }

      clickX -= offsetX;
      clickY -= offsetY;
      renderW = actualW;
      renderH = actualH;
    }

    const x = (clickX / renderW) * 100;
    const y = (clickY / renderH) * 100;

    // Ignore clicks outside the actual image
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    onPick({
      x: round(clamp(x, 0, 100), 1),
      y: round(clamp(y, 0, 100), 1),
    });
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

// Computes Euclidean distance between two 2D points (x/y are percent coordinates)
function distance2D(x1, y1, x2, y2) {
  const dx = Number(x1) - Number(x2);
  const dy = Number(y1) - Number(y2);
  return Math.sqrt(dx * dx + dy * dy);
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
    const zoomableEl = e.target?.closest?.('[data-zoomable="1"]');
    if (!zoomableEl) return;
    const src = zoomableEl.dataset.bgImageSrc || (zoomableEl instanceof HTMLImageElement ? zoomableEl.src : null);
    if (!src) return;
    modalImg.src = src;
    modal.classList.remove('hidden');
  });
}

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}
