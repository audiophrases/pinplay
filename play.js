const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CLIENT_ID_KEY = 'pinplay.client.v1';
const REACTION_EMOJIS = ['👍','🔥','😂','🤯','🙌','☕','🤔','👀','🧠','❤️','😅','😎','6️⃣','7️⃣'];

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
    assignment: {
      code: null,
      attemptId: null,
      state: null,
      currentIndex: 0,
      pollingTimer: null,
      forceAutoAdvance: false,
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
  initAssignmentFromUrl();
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
      fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => {});
    } catch {}
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
    validatePin().catch(() => {});
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
  try {
    if (live.player.mode === 'assignment') {
      if (!live.player.assignment.code) {
        await validatePin();
        if (!live.player.assignment.code) return;
      }
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

  return {
    phase: question ? 'question' : 'results',
    pin: assignment.code,
    name: attempt.studentName || live.player.displayName || 'Student',
    currentIndex: idx,
    totalQuestions: Number(assignment.totalQuestions || questions.length || 0),
    score: Number(attempt?.metrics?.totalScore ?? attempt?.metrics?.autoScore ?? 0),
    questionStartedAt: attempt.startedAt || assignment.startedAt || 0,
    questionDeadlineAt: assignment.dueAt || null,
    questionClosed: false,
    questionCloseReason: null,
    answeredCurrent: (attempt.answeredQIndexes || []).includes(idx),
    assignmentSubmitted: !!attempt?.submitted,
    answeredQIndexes: Array.isArray(attempt?.answeredQIndexes) ? attempt.answeredQIndexes : [],
    question,
    correction: '',
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
      if (grade?.graded && grade?.correction) {
        feedbackItems.push({
          qIndex: Number(qIdx),
          question: question.prompt?.slice(0, 80) || `Question ${Number(qIdx) + 1}`,
          correction: grade.correction,
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

    const feedbackHtml = feedbackItems.map(item => `
      <div style="padding:8px 0;border-bottom:1px solid rgba(63,185,80,0.2);font-size:13px;">
        <div style="color:#8b949e;margin-bottom:4px;font-style:italic;">"${esc(item.question)}..."</div>
        <div style="color:#3fb950;">💬 Teacher: ${esc(item.correction)}</div>
      </div>
    `).join('');

    feedbackPanel.innerHTML = `
      <div style="font-weight:bold;color:#3fb950;margin-bottom:8px;">💬 Teacher Feedback (${feedbackItems.length})</div>
      ${feedbackHtml}
    `;
    feedbackPanel.style.display = 'block';
  } catch (e) {
    console.log('Could not load teacher feedback:', e);
  }
}

async function startAssignmentAttempt() {
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
  lastRenderedQuestionIndex = -1;
  lastClosedQuestionIndex = -1;
  assignmentFinalPlayed = false;
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
  loadAttemptHistory(code, studentKey).catch(() => {});

  if (live.player.assignment.pollingTimer) clearInterval(live.player.assignment.pollingTimer);
  live.player.assignment.pollingTimer = setInterval(() => {
    loadAssignmentState().catch((err) => {
      const msg = String(err?.message || 'Could not refresh assignment state.');
      setStatus(joinStatusEl, msg, 'bad');
    });
  }, 5000);

  await loadAssignmentState();
}

async function finalizeAssignmentAttempt() {
  try {
    if (live.player.mode !== 'assignment') return;
    const code = String(live.player.assignment.code || '').trim();
    const attemptId = String(live.player.assignment.attemptId || '').trim();
    if (!code || !attemptId) throw new Error('Start assignment first.');

    if (joinFinalizeBtn) joinFinalizeBtn.disabled = true;
    const data = await api('/api/assignment/submit', {
      method: 'POST',
      body: { code, attemptId },
    });

    live.player.assignment.state = { attempt: data?.attempt || live.player.assignment.state?.attempt || null };
    const submittedText = data?.alreadySubmitted ? 'Assignment was already submitted.' : 'Assignment submitted ✅';
    setJoinStatusHud(submittedText, 'ok');
    setStatus(joinStatusEl, submittedText, 'ok');
    showAssignmentCompleteMessage(submittedText);
    await loadAssignmentState();
  } catch (err) {
    setJoinStatusHud(String(err?.message || 'Could not submit assignment.'), 'bad');
  } finally {
    if (joinFinalizeBtn) joinFinalizeBtn.disabled = false;
  }
}

function showAssignmentCompleteMessage(text) {
  const wrap = joinQuestionWrap || joinCardEl;
  if (!wrap) return;
  const existing = document.getElementById('assignmentCompleteMessage');
  if (existing) {
    existing.textContent = text || 'Assignment submitted. You have completed this attempt.';
    existing.classList.remove('hidden');
    return;
  }
  const msg = document.createElement('div');
  msg.id = 'assignmentCompleteMessage';
  msg.className = 'assignment-complete';
  msg.textContent = text || 'Assignment submitted. You have completed this attempt.';
  wrap.appendChild(msg);
  if (joinSubmission) joinSubmission.classList.add('hidden');
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
  const renderJoinReveal = () => {
    // Removed - item highlighting replaces text reveal
    if (!joinAnswersEl) return;
    joinAnswersEl.querySelectorAll('[data-join-correct-reveal="1"]').forEach((el) => el.remove());
  };

  const latestName = String(state?.name || '').trim();
  if (latestName && latestName !== live.player.displayName) {
    live.player.displayName = latestName;
    setJoinTitle(latestName);
  }

  if (joinProgressEl) joinProgressEl.textContent = `${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (joinScoreEl) joinScoreEl.textContent = `Score: ${state.score}`;

  // Clear previous feedback to avoid carryover between questions
  setJoinStatusHud( '', '');

  const renderInlinePoints = (_points) => {
    // Removed by request: do not show separate inline "+X pts" row.
    if (!joinAnswersEl) return;
    joinAnswersEl.querySelectorAll('[data-join-points-inline="1"]').forEach((el) => el.remove());
  };

  const renderInlineCorrection = (text = '') => {
    const host = joinQuestionWrap || joinAnswersEl;
    if (!host) return;
    host.querySelectorAll('[data-join-correction-inline="1"]').forEach((el) => el.remove());
    const corr = String(text || '').trim();
    if (!corr) return;

    const studentText = getStudentAnswerTextFromUI();
    const p = document.createElement('p');
    p.dataset.joinCorrectionInline = '1';
    p.className = 'join-correction-inline top-space';
    p.innerHTML = `${buildCorrectionDiffHtml(corr, studentText)}`;

    if (joinAnswersEl) {
      joinAnswersEl.appendChild(p);
    } else {
      host.appendChild(p);
    }
  };

  if (state.phase !== 'question' || !state.question) {
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

  const key = `${state.phase}:${state.currentIndex}:${Number(state.questionStartedAt || 0)}`;

  // Play answering ambient when entering a new question in assignment mode
  if (live.player.mode === 'assignment' && state.phase === 'question') {
    if (state.currentIndex !== lastRenderedQuestionIndex) {
      lastRenderedQuestionIndex = state.currentIndex;
      pickNewAnsweringTrack();
      playAssignmentSfx('answering');
    }
  }
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    live.player.pinSelections = [];
    live.player.selectedBet = 0;
    renderJoinQuestion(state.question);
    setJoinStatusHud( '', '');
    animatePulse(joinQuestionWrap);
  }

  const questionClosed = !!state.questionClosed;
  const isPoll = !!state.question?.isPoll;

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

  const assignmentSubmitted = live.player.mode === 'assignment' && !!state.assignmentSubmitted;

  if (joinSubmitBtn) {
    const shouldDisable = questionClosed || assignmentSubmitted || (live.player.mode === 'live' ? !!state.answeredCurrent : false);
    joinSubmitBtn.disabled = shouldDisable;
    const pts = Number(state.question?.points || 0).toLocaleString('en-US');
    joinSubmitBtn.title = isPoll ? 'Poll question (no points)' : `${pts} points`;
    if (!questionClosed && shouldDisable && live.player.mode === 'live') {
      setJoinStatusHud( 'Answer submitted. Waiting for reveal…', 'ok');
    }
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

    if (assignmentPrevBtn) {
      assignmentPrevBtn.classList.remove('hidden');
      assignmentPrevBtn.disabled = idx <= 0 || assignmentSubmitted;
    }
    if (assignmentNextBtn) {
      assignmentNextBtn.classList.remove('hidden');
      assignmentNextBtn.disabled = idx >= Math.max(0, total - 1) || assignmentSubmitted;
    }
    if (assignmentNextPendingBtn) {
      assignmentNextPendingBtn.classList.remove('hidden');
      assignmentNextPendingBtn.disabled = !hasUnanswered || assignmentSubmitted;
    }

    if (assignmentBannerEl) {
      assignmentBannerEl.classList.remove('hidden');
      assignmentBannerEl.textContent = assignmentSubmitted
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
  renderInlineCorrection(String(rrNow?.correction || ''));
  if (rrNow && rrNow.graded !== false) renderInlinePoints(rrNow.pointsAwarded);

  if (questionClosed) {
    if (isPoll) {
      setJoinStatusHud( '🗳️ Poll closed. Results on projector.', 'ok');
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
          setJoinStatusHud( '', '');
        } else if (rr.graded === false) {
          setJoinStatusHud( '📝 Waiting for teacher grading.', 'ok');
        } else {
          // Highlight items: green for correct, red for student's wrong answer
          setJoinStatusHud( '', '');
          highlightAnswerItems(rr.correct, state);
        }
      } else {
        setJoinStatusHud( closedMsg, 'ok');
      }
    }
  } else if (assignmentSubmitted) {
    setStatus(joinStatusEl, 'Assignment submitted.', 'ok');
  } else if (state.answeredCurrent) {
    const rr = state.revealedResult;
    const corr = String(rr?.correction || '').trim();
    if (corr) {
      setJoinStatusHud( '', '');
    }
    setStatus(joinStatusEl, live.player.mode === 'assignment' ? 'Answer saved.' : 'Answer received.', 'ok');
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
  joinCardEl.classList.toggle('question-active', !!active);
  const qType = String(question?.type || '').trim();
  if (qType) joinCardEl.dataset.qtype = qType;
  else delete joinCardEl.dataset.qtype;
  joinCardEl.classList.toggle('has-image', !!question?.imageData);
}

function renderJoinQuestion(question) {
  applyJoinLayoutMode(true, question);
  if (joinSubmitBtn) joinSubmitBtn.classList.remove('hidden');
  if (joinPromptEl) joinPromptEl.textContent = question.prompt || '(No question text)';

  // Store current question for keyboard shortcut
  live.player.currentQuestion = question;

  if (joinAnswersEl) joinAnswersEl.innerHTML = '';
  if (!joinAnswersEl) return;

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
    preview.className = 'question-image-preview';
    const img = document.createElement('img');
    let imgSrc = question.imageData; if (!imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) { const base = loadBackendUrl() || "https://pinplay-api.eugenime.workers.dev"; imgSrc = `${base}/api/media/${imgSrc}`; } img.src = imgSrc;
    img.alt = 'Question image';
    img.dataset.zoomable = '1';
    preview.appendChild(img);
    preview.dataset.zoomable = '1';
    preview.dataset.bgImageSrc = imgSrc;
    joinAnswersEl.appendChild(preview);
  }

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

      row.append(text, input);
      joinAnswersEl.appendChild(row);
    });

    // Two-column layout for 4+ answer items
    if (indices.length >= 4) {
      joinAnswersEl.classList.add('two-col');
    }

    if (question.type === 'multi') {
      const badge = document.createElement('p');
      badge.className = 'multi-select-badge';
      badge.textContent = '☑️ Select ALL correct answers';
      joinAnswersEl.appendChild(badge);
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

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
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
      renderMatchPairsColumns(joinAnswersEl, leftItems, rightOptions, 'joinPair');
    } else if (question.type === 'error_hunt') {
      const required = Math.max(1, countErrorHuntRequiredTokens(question.prompt, question.correctedVariants || [question.corrected]));
      const promptEl = document.getElementById('joinPrompt');
      if (promptEl) {
        promptEl.innerHTML = '';
        const pref = document.createElement('span');
        pref.className = 'prompt-prefix';
        pref.textContent = `Correct ${required} mistake${required > 1 ? 's' : ''}: `;
        const main = document.createElement('span');
        main.className = 'prompt-main';
        main.textContent = String(question.prompt || '').trim();
        promptEl.append(pref, main);
      }

      const tokenWrap = document.createElement('div');
      tokenWrap.className = 'error-token-wrap';
      tokenWrap.style.flexWrap = 'wrap';
      tokenWrap.style.justifyContent = 'center';
      let tokens = String(question.prompt || '').split(/\s+/).filter(Boolean);
      // Merge common pairs like "every day" into a single token
      tokens = mergeJoinTokens(tokens);
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

      // Enable inline edits/merges; rewrite will be built from tokens on submit
      enableInlineErrorTokenEditing(tokenWrap, '[data-error-token]', null);
    } else if (question.type === 'speaking') {
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Speak your answer in class, then tap Submit answer so teacher can grade you.';
      joinAnswersEl.appendChild(note);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'joinTextAnswer';
      input.className = 'join-answer-input';
      input.maxLength = 120;
      input.placeholder = (question.type === 'open' || question.type === 'image_open') ? 'Type 1-2 short sentences' : 'Type your answer';

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
    const options = question.options || [];
    createPuzzleDnd(joinAnswersEl, options, 'joinPuzzlePieces');
    appendRiskBetBar();
    appendReactionBar();
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
    slider?.addEventListener('input', () => {
      out.textContent = `Selected: ${slider.value}${question.unit ? ` ${question.unit}` : ''}`;
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

    const zones = Array.isArray(question.zones) && question.zones.length ? question.zones : [question.zone || { x: 50, y: 50, r: 15 }];
    const pinMode = String(question.pinMode || 'all') === 'any' ? 'any' : 'all';
    const required = pinMode === 'all' ? Math.max(1, Math.min(12, zones.length)) : 1;

    const countLabel = document.createElement('p');
    countLabel.className = 'small';
    countLabel.textContent = pinMode === 'all' ? `Pin all correct spots: 0 / ${required}` : 'Pin one correct spot: 0 / 1';

    wrap.append(img, picksLayer);
    container.append(countLabel, wrap);
    joinAnswersEl.appendChild(container);

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
      if (nearIdx >= 0) {
        picks.splice(nearIdx, 1);
      } else if (picks.length < required) {
        picks.push(point);
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
    { value: 3, emoji: '🔥', bonus: '+40%', penalty: '-30%' },
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
    const answer = readJoinAnswer();
    if (answer === null || answer === '') throw new Error('Choose/type an answer first.');

    if (live.player.mode === 'assignment') {
      const code = String(live.player.assignment.code || '').trim();
      const attemptId = String(live.player.assignment.attemptId || '').trim();
      if (!code || !attemptId) throw new Error('Start assignment first.');

      const qIndex = Number(live.player.assignment.currentIndex || 0);
      await api('/api/assignment/answer', {
        method: 'POST',
        body: {
          code,
          attemptId,
          qIndex,
          answer,
        },
      });

      live.player.assignment.forceAutoAdvance = true;
      setJoinStatusHud( 'Answer saved ✅', 'ok');
      await loadAssignmentState();
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
        bet: Number(live.player.selectedBet || 0),
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

    setJoinStatusHud( 'Answer submitted. Waiting for reveal…', 'ok');

    if (joinScoreEl) joinScoreEl.textContent = `Score: ${data.score}`;
  } catch (err) {
    const msg = String(err?.message || 'Could not submit answer.');
    if (msg.includes('Question is closed') || msg.includes('Question is not active')) {
      if (joinSubmitBtn) joinSubmitBtn.disabled = true;
      setJoinStatusHud( 'Question is closed. Waiting for next one…', 'ok');
      return;
    }
    setJoinStatusHud( msg, 'bad');
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

  if (q.type === 'context_gap') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-gap]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'match_pairs') {
    const fields = [...joinAnswersEl.querySelectorAll('[data-join-pair]')];
    const values = fields.map((el) => String(el.value || '').trim());
    return values.every(Boolean) ? values : null;
  }

  if (q.type === 'error_hunt') {
    const selectedChips = [...joinAnswersEl.querySelectorAll('[data-error-token]')];
    const selected = selectedChips.filter((el) => el.classList.contains('active')).map((el) => Number(el.dataset.errorToken));
    const required = Math.max(1, countErrorHuntRequiredTokens(q.prompt, q.correctedVariants || [q.corrected]));
    if (selected.length !== required) return null;
    const rewrite = selectedChips
      .map((el) => String(el.dataset.tokenText || el.textContent || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!rewrite) return null;
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
  resetBtn.className = 'btn top-space puzzle-reset';
  resetBtn.textContent = 'Reset order';
  resetBtn.style.alignSelf = 'center';

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
  refreshBankButtons();

  wrap.append(bank, selected, resetBtn);
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
    highlightErrorHunt(question);
    return;
  }

  // Context gap
  if (question.type === 'context_gap') {
    highlightContextGap(question);
    return;
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

  // Open/Speaking/Image_open: show correct answer text
  if (['open', 'speaking', 'image_open', 'text'].includes(question.type)) {
    showTextAnswerFeedback(question, state);
    return;
  }
}

// MCQ/TF/Multi highlighting
function highlightChoiceAnswers(question, correctAnswerStr) {
  const rows = joinAnswersEl.querySelectorAll('.answer-row');
  if (!rows.length) return;
  const isMulti = question.type === 'multi';
  const correctIndexes = new Set();



  // Parse correct answer index from server's correctAnswer string (e.g. "1. Dog" → index 0)
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

  // Fallback: use question.answers[].correct if available (teacher/host side)
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
    if (isCorrect && isSelected) {
      row.classList.add('correct-highlight');
    } else if (isCorrect && !isSelected) {
      row.classList.add(isMulti ? 'correct-missed' : 'correct-highlight');
    } else if (!isCorrect && isSelected) {
      row.classList.add('incorrect-highlight');
    }
  });
}

// Match pairs: highlight each pair row
function highlightMatchPairs(question) {
  const pairs = question.pairs || [];
  const fields = joinAnswersEl.querySelectorAll('[data-join-pair]');
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
function highlightErrorHunt(question) {
  const tokens = joinAnswersEl.querySelectorAll('[data-error-token]');
  const promptWords = (question.prompt || '').split(/\s+/);
  const correctedWords = (question.corrected || '').split(/\s+/);
  // Build set of error token indexes (words that differ between prompt and corrected)
  const errorIndexes = new Set();
  let pi = 0, ci = 0;
  const pWords = tokenizeWords(question.prompt || '');
  const cWords = tokenizeWords(question.corrected || '');
  // Simple diff: mark positions where prompt word != corrected word
  for (let i = 0; i < pWords.length; i++) {
    if (!cWords[i] || pWords[i].toLowerCase() !== cWords[i].toLowerCase()) {
      errorIndexes.add(i);
    }
  }

  tokens.forEach((token, idx) => {
    const isActive = token.classList.contains('active');
    if (errorIndexes.has(idx) && isActive) {
      token.classList.add('correct-highlight');
    } else if (errorIndexes.has(idx) && !isActive) {
      token.classList.add('correct-missed');
    } else if (!errorIndexes.has(idx) && isActive) {
      token.classList.add('incorrect-highlight');
    }
  });
}

// Slider: show correct value with visual indicator
function showSliderFeedback(question, state) {
  const slider = document.getElementById('joinSlider');
  const out = document.getElementById('joinSliderValue');
  if (!slider) return;
  slider.disabled = true;
  const correctVal = Number(question.target ?? question.correctSliderValue ?? question.correctAnswer);
  const studentVal = Number(slider.value);
  if (!isNaN(correctVal)) {
    slider.value = correctVal;
    const unit = question.unit ? ` ${escapeHtml(question.unit)}` : '';
    if (out) out.innerHTML = `Your answer: ${studentVal}${unit} · Correct: <strong>${correctVal}${unit}</strong>`;
  }
}

// Pin: show correct zone marker on the image
function showPinFeedback(question, state) {
  const preview = joinAnswersEl.querySelector('.pin-preview');
  if (!preview) return;
  // Disable further picks
  preview.style.pointerEvents = 'none';
  // Show correct zone(s) as green circles
  const zones = Array.isArray(question.zones) ? question.zones : [];
  zones.forEach(zone => {
    const marker = document.createElement('div');
    marker.className = 'pin-correct-marker';
    const r = (zone.r || 15) / 100;
    marker.style.cssText = `position:absolute;left:${zone.x}%;top:${zone.y}%;width:${r * 200}%;height:${r * 200}%;border:3px solid var(--ok);background:rgba(19,138,54,0.15);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:50;`;
    preview.appendChild(marker);
  });
}

// Open/Speaking/Image_open/Text: show correct answer text
function showTextAnswerFeedback(question, state) {
  const el = joinFeedbackEl;
  if (!el) return;
  const correct = String(state.correctAnswer || question.correctAnswer || question.corrected || '').trim();
  if (correct) {
    el.innerHTML = `<span style="color:var(--ok)">✓</span> <strong>${escapeHtml(correct)}</strong>`;
  }
}

// Context gap: highlight each input
function highlightContextGap(question) {
  const fields = joinAnswersEl.querySelectorAll('[data-join-gap]');
  const gaps = question.gaps || [];
  fields.forEach((field, idx) => {
    const val = String(field.value || '').trim().toLowerCase();
    if (!val) return;
    const accepted = (gaps[idx] || '').split(',').map(s => s.trim().toLowerCase());
    const row = field.closest('.answer-row') || field.parentElement;
    if (!row) return;
    if (accepted.includes(val)) {
      row.classList.add('correct-highlight');
    } else {
      row.classList.add('incorrect-highlight');
    }
  });
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
  joinStatusHudEl.textContent = condensed;
  joinStatusHudEl.className = 'join-hud-status';
  if (mode === 'ok') joinStatusHudEl.classList.add('ok');
  if (mode === 'bad') joinStatusHudEl.classList.add('bad');
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
  } catch {}
}

function stopAllAssignmentAmbient() {
  try {
    if (assignmentAmbient.hall) { assignmentAmbient.hall.pause(); assignmentAmbient.hall.currentTime = 0; }
    if (assignmentAmbient.final) { assignmentAmbient.final.pause(); assignmentAmbient.final.currentTime = 0; }
    assignmentAmbient.answering.forEach(a => { a.pause(); a.currentTime = 0; });
  } catch {}
}

function playAssignmentSfx(name) {
  try {
    // Stop any currently playing ambient first
    stopAllAssignmentAmbient();
    if (name === 'answering') {
      // Use pre-selected track for current question
      if (currentAnsweringIdx < 0) pickNewAnsweringTrack();
      const a = assignmentAmbient.answering[currentAnsweringIdx];
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } else {
      const a = assignmentAmbient[name];
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    }
  } catch {}
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

function mergeJoinTokens(tokens) {
  const merged = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = String(tokens[i] || '').trim();
    const next = String(tokens[i + 1] || '').trim();
    const pair = `${cur} ${next}`.toLowerCase();
    if (cur && next && pair === 'every day') {
      merged.push(`${cur} ${next}`);
      i += 1;
    } else {
      if (cur) merged.push(cur);
    }
  }
  return merged;
}

function countErrorHuntRequiredTokens(prompt, corrected) {
  const correctedStr = Array.isArray(corrected) ? corrected.find((c) => !!c) : corrected;
  const source = mergeJoinTokens(tokenizeWords(prompt));
  const target = mergeJoinTokens(tokenizeWords(correctedStr));
  if (!source.length || !target.length) return 1;

  // If lengths match, count direct mismatches after normalization
  if (source.length === target.length) {
    let diff = 0;
    for (let i = 0; i < source.length; i++) {
      if (normalizeTextAnswer(source[i]) !== normalizeTextAnswer(target[i])) diff += 1;
    }
    return Math.max(1, diff);
  }

  // Otherwise use edit distance but clamp to avoid over-counting
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

  const dist = dp[source.length][target.length] || 1;
  const maxOps = Math.max(source.length, target.length);
  return Math.max(1, Math.min(dist, maxOps));
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

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attachPinPicker(container, onPick) {
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onPick({ x: round(clamp(x, 0, 100), 1), y: round(clamp(y, 0, 100), 1) });
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
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





