const STORAGE_KEY = 'pinplay.quiz.v1';
const BACKEND_KEY = 'pinplay.backend.v1';

// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Builder
const quizTitleEl = document.getElementById('quizTitle');
const questionListEl = document.getElementById('questionList');
const addMcqBtn = document.getElementById('addMcqBtn');
const addTfBtn = document.getElementById('addTfBtn');
const addTextBtn = document.getElementById('addTextBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

// Live mode
const backendUrlEl = document.getElementById('backendUrl');
const saveBackendBtn = document.getElementById('saveBackendBtn');
const backendStatusEl = document.getElementById('backendStatus');

// Host controls
const createLiveBtn = document.getElementById('createLiveBtn');
const hostRefreshBtn = document.getElementById('hostRefreshBtn');
const hostStartBtn = document.getElementById('hostStartBtn');
const hostNextBtn = document.getElementById('hostNextBtn');
const livePinEl = document.getElementById('livePin');
const livePhaseEl = document.getElementById('livePhase');
const liveProgressEl = document.getElementById('liveProgress');
const liveResponsesEl = document.getElementById('liveResponses');
const hostPlayersEl = document.getElementById('hostPlayers');
const hostStatusEl = document.getElementById('hostStatus');

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

let quiz = loadQuiz() || createEmptyQuiz();
let soloGame = null;

const live = {
  host: {
    pin: null,
    token: null,
    pollTimer: null,
  },
  player: {
    pin: null,
    id: null,
    token: null,
    pollTimer: null,
    renderKey: null,
    submittedForIndex: null,
  },
};

init();

function init() {
  bindTabs();
  bindBuilderEvents();
  bindLiveEvents();
  bindSoloEvents();

  renderBuilder();
  refreshLocalPin();

  backendUrlEl.value = loadBackendUrl();
  setBackendStatus(loadBackendUrl() ? 'Backend URL loaded' : 'No backend URL yet');
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
function bindBuilderEvents() {
  addMcqBtn.addEventListener('click', () => {
    quiz.questions.push(makeMcqQuestion());
    renderBuilder();
  });

  addTfBtn.addEventListener('click', () => {
    quiz.questions.push(makeTfQuestion());
    renderBuilder();
  });

  addTextBtn.addEventListener('click', () => {
    quiz.questions.push(makeTextQuestion());
    renderBuilder();
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

  questionListEl.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove-question]');
    if (!removeBtn) return;

    const idx = Number(removeBtn.dataset.removeQuestion);
    quiz.questions.splice(idx, 1);
    renderBuilder();
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
      <div class="question-header">
        <strong>Q${idx + 1} · ${labelForType(q.type)}</strong>
        <button class="btn" data-remove-question="${idx}">Remove</button>
      </div>
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
          <input data-q="${idx}" data-field="timeLimit" type="number" min="5" max="240" value="${Number(q.timeLimit || 20)}" />
        </div>
      </div>
    `;

    let specific = '';
    if (q.type === 'mcq' || q.type === 'tf') {
      const correctIdx = q.answers.findIndex((a) => a.correct);
      specific = `
        <label class="top-space">Answers</label>
        <div class="answers-grid">
          ${q.answers
            .map(
              (a, aIdx) => `
            <div class="answer-row">
              <input type="radio" name="correct-${idx}" ${aIdx === correctIdx ? 'checked' : ''} data-q="${idx}" data-correct-index="${aIdx}" />
              <input data-q="${idx}" data-answer-index="${aIdx}" maxlength="75" value="${escapeHtml(a.text || '')}" ${q.type === 'tf' ? 'disabled' : ''}/>
              <span class="small">${q.type === 'tf' ? '' : 'max 75'}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      `;
    }

    if (q.type === 'text') {
      const accepted = q.accepted || ['', '', '', ''];
      specific = `
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

    wrap.innerHTML = common + specific;
    questionListEl.appendChild(wrap);
  });

  questionListEl.querySelectorAll('[data-q]').forEach((el) => {
    el.addEventListener('input', syncQuizFromUI);
    el.addEventListener('change', syncQuizFromUI);
  });
}

function syncQuizFromUI() {
  quiz.title = quizTitleEl.value.trim();

  quiz.questions.forEach((q, idx) => {
    const promptEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="prompt"]`);
    const pointsEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="points"]`);
    const timeEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="timeLimit"]`);

    if (promptEl) q.prompt = String(promptEl.value || '').slice(0, 120);
    if (pointsEl) q.points = Number(pointsEl.value || 1000);

    const minTime = q.type === 'text' ? 20 : 5;
    if (timeEl) q.timeLimit = clamp(Number(timeEl.value || 20), minTime, 240);

    if (q.type === 'mcq' || q.type === 'tf') {
      q.answers.forEach((a, aIdx) => {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-answer-index="${aIdx}"]`);
        if (aEl) a.text = String(aEl.value || '').slice(0, 75);
      });

      const selectedCorrect = questionListEl.querySelector(`[data-q="${idx}"][data-correct-index]:checked`);
      const correctIndex = selectedCorrect ? Number(selectedCorrect.dataset.correctIndex) : 0;
      q.answers.forEach((a, aIdx) => {
        a.correct = aIdx === correctIndex;
      });
    }

    if (q.type === 'text') {
      const accepted = [];
      for (let aIdx = 0; aIdx < 4; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-accepted-index="${aIdx}"]`);
        accepted.push(String(aEl?.value || '').slice(0, 20));
      }
      q.accepted = accepted;
    }
  });
}

// ---------- Live mode ----------
function bindLiveEvents() {
  saveBackendBtn.addEventListener('click', () => {
    const normalized = normalizeBackendUrl(backendUrlEl.value.trim());
    if (!normalized) {
      setBackendStatus('Invalid URL', 'bad');
      return;
    }
    saveBackendUrl(normalized);
    backendUrlEl.value = normalized;
    setBackendStatus('Backend URL saved ✅', 'ok');
  });

  createLiveBtn.addEventListener('click', createLiveGame);
  hostRefreshBtn.addEventListener('click', pollHostState);
  hostStartBtn.addEventListener('click', hostStartGame);
  hostNextBtn.addEventListener('click', hostNextQuestion);

  joinBtn.addEventListener('click', joinLiveGame);
  joinSubmitBtn.addEventListener('click', submitLiveAnswer);
}

async function createLiveGame() {
  try {
    syncQuizFromUI();

    if (!quiz.title?.trim()) throw new Error('Add quiz title first.');
    if (!quiz.questions?.length) throw new Error('Add at least 1 question first.');

    const payload = normalizeQuizForLive(quiz);
    const data = await api('/api/create', {
      method: 'POST',
      body: { quiz: payload },
    });

    live.host.pin = data.pin;
    live.host.token = data.hostToken;

    livePinEl.textContent = data.pin;
    setStatus(hostStatusEl, 'Live game created ✅ Share the PIN with students.', 'ok');

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
  livePhaseEl.textContent = `Phase: ${state.phase}`;
  liveProgressEl.textContent = `Progress: ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  liveResponsesEl.textContent = `Answers this round: ${state.responseCount} / ${state.playerCount}`;

  hostPlayersEl.innerHTML = '';
  (state.players || []).forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${p.score} pts${p.answeredCurrent ? ' ✅' : ''}`;
    hostPlayersEl.appendChild(li);
  });

  if (!state.players?.length) {
    const li = document.createElement('li');
    li.textContent = 'No students joined yet.';
    hostPlayersEl.appendChild(li);
  }

  const actionHint =
    state.phase === 'lobby'
      ? 'Ready to start.'
      : state.phase === 'question'
        ? 'Collect answers, then click Next question.'
        : 'Game finished.';

  setStatus(hostStatusEl, actionHint, 'ok');
}

function startHostPolling() {
  stopHostPolling();
  live.host.pollTimer = setInterval(pollHostState, 2000);
}

function stopHostPolling() {
  if (live.host.pollTimer) clearInterval(live.host.pollTimer);
  live.host.pollTimer = null;
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

    setStatus(joinStatusEl, `Joined as ${name} ✅`, 'ok');
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
    renderJoinQuestion(state.question);
    setStatus(joinFeedbackEl, '', '');
  }

  joinSubmitBtn.disabled = state.answeredCurrent || live.player.submittedForIndex === state.currentIndex;
  if (joinSubmitBtn.disabled) {
    setStatus(joinFeedbackEl, 'Answer submitted. Waiting for next question…', 'ok');
  }

  setStatus(joinStatusEl, 'Question live!', 'ok');
}

function renderJoinQuestion(question) {
  joinPromptEl.textContent = question.prompt || '(No question text)';
  joinAnswersEl.innerHTML = '';

  if (question.type === 'mcq' || question.type === 'tf') {
    question.answers.forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'join-answer';
      radio.value = String(idx);

      const text = document.createElement('span');
      text.textContent = a.text;

      row.append(radio, text);
      joinAnswersEl.appendChild(row);
    });
    return;
  }

  if (question.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'joinTextAnswer';
    input.maxLength = 40;
    input.placeholder = 'Type your answer';
    joinAnswersEl.appendChild(input);
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
    setStatus(joinFeedbackEl, err.message, 'bad');
  }
}

function readJoinAnswer() {
  const checked = joinAnswersEl.querySelector('input[name="join-answer"]:checked');
  if (checked) return Number(checked.value);

  const text = document.getElementById('joinTextAnswer');
  if (text) return text.value;

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
  if (!live.host.pin || !live.host.token) {
    throw new Error('Create a live game first.');
  }
}

// ---------- Solo mode ----------
function bindSoloEvents() {
  startBtn.addEventListener('click', () => {
    syncQuizFromUI();
    if (!quiz.title?.trim()) return alert('Add a quiz title first.');
    if (!quiz.questions.length) return alert('Add at least 1 question.');

    soloGame = {
      student: studentNameEl.value.trim() || 'Student',
      index: 0,
      score: 0,
      answered: false,
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

  setStatus(feedbackEl, '', '');
  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');

  answersEl.innerHTML = '';

  if (q.type === 'mcq' || q.type === 'tf') {
    q.answers.forEach((a, idx) => {
      const row = document.createElement('label');
      row.className = 'answer-row';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'solo-answer';
      radio.value = String(idx);

      const text = document.createElement('span');
      text.textContent = a.text || '(blank)';

      row.append(radio, text);
      answersEl.appendChild(row);
    });
  }

  if (q.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'soloTextAnswer';
    input.maxLength = 40;
    input.placeholder = 'Type your answer';
    answersEl.appendChild(input);
  }
}

function evaluateSoloQuestion(q) {
  if (q.type === 'mcq' || q.type === 'tf') {
    const checked = answersEl.querySelector('input[name="solo-answer"]:checked');
    if (!checked) return { correct: false, hint: 'Select an answer first.' };

    const selected = Number(checked.value);
    const correctIndex = q.answers.findIndex((a) => a.correct);
    return { correct: selected === correctIndex };
  }

  if (q.type === 'text') {
    const val = document.getElementById('soloTextAnswer')?.value || '';
    const guess = normalizeTextAnswer(val);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);

    if (!accepted.length) return { correct: false, hint: 'No accepted answers set.' };
    return { correct: accepted.includes(guess), hint: `Accepted: ${accepted.slice(0, 2).join(' / ')}` };
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
  pinValueEl.textContent = String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- API ----------
async function api(path, opts = {}) {
  const base = normalizeBackendUrl(loadBackendUrl() || backendUrlEl.value.trim());
  if (!base) throw new Error('Set backend URL first.');

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

  if (!res.ok) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }

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

function makeMcqQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'mcq',
    prompt: '',
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

function makeTfQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'tf',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    answers: [
      { text: 'True', correct: true },
      { text: 'False', correct: false },
    ],
  };
}

function makeTextQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    prompt: '',
    points: 1000,
    timeLimit: 30,
    accepted: ['', '', '', ''],
  };
}

function normalizeQuizForLive(raw) {
  return {
    version: 1,
    title: String(raw.title || '').slice(0, 120),
    questions: (raw.questions || []).map((q) => {
      const base = {
        id: String(q.id || crypto.randomUUID()),
        type: q.type,
        prompt: String(q.prompt || '').slice(0, 120),
        points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
        timeLimit: clamp(Number(q.timeLimit || 20), q.type === 'text' ? 20 : 5, 240),
      };

      if (q.type === 'mcq' || q.type === 'tf') {
        const answers = (q.answers || [])
          .slice(0, q.type === 'tf' ? 2 : 6)
          .map((a) => ({ text: String(a.text || '').slice(0, 75), correct: !!a.correct }));

        if (q.type === 'tf') {
          answers[0] = { text: 'True', correct: !!answers[0]?.correct };
          answers[1] = { text: 'False', correct: !!answers[1]?.correct };
        }

        if (!answers.some((a) => a.correct) && answers.length) answers[0].correct = true;
        return { ...base, answers };
      }

      if (q.type === 'text') {
        const accepted = (q.accepted || []).slice(0, 4).map((x) => String(x || '').slice(0, 20));
        return { ...base, accepted };
      }

      return base;
    }),
  };
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
function setStatus(el, text, mode = '') {
  el.textContent = text;
  el.className = 'feedback';
  if (mode === 'ok') el.classList.add('ok');
  if (mode === 'bad') el.classList.add('bad');
}

function setBackendStatus(text, mode = '') {
  backendStatusEl.textContent = text;
  backendStatusEl.className = 'small';
  if (mode === 'ok') backendStatusEl.classList.add('ok');
  if (mode === 'bad') backendStatusEl.classList.add('bad');
}

function labelForType(type) {
  return (
    {
      mcq: 'Multiple choice',
      tf: 'True / False',
      text: 'Type answer',
    }[type] || type
  );
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

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
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
