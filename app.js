const STORAGE_KEY = 'pinplay.quiz.v1';
const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CREATE_UNLOCK_KEY = 'pinplay.create.unlocked.v1';
const CREATE_PASSWORD = '1234.';

// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Builder
const quizTitleEl = document.getElementById('quizTitle');
const questionListEl = document.getElementById('questionList');
const addMcqBtn = document.getElementById('addMcqBtn');
const addMultiBtn = document.getElementById('addMultiBtn');
const addTfBtn = document.getElementById('addTfBtn');
const addTextBtn = document.getElementById('addTextBtn');
const addPuzzleBtn = document.getElementById('addPuzzleBtn');
const addAudioBtn = document.getElementById('addAudioBtn');
const addSliderBtn = document.getElementById('addSliderBtn');
const addPinBtn = document.getElementById('addPinBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

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
const hostRefreshBtn = document.getElementById('hostRefreshBtn');
const hostStartBtn = document.getElementById('hostStartBtn');
const hostPrevBtn = document.getElementById('hostPrevBtn');
const hostNextBtn = document.getElementById('hostNextBtn');
const livePinEl = document.getElementById('livePin');
const livePhaseEl = document.getElementById('livePhase');
const liveProgressEl = document.getElementById('liveProgress');
const liveResponsesEl = document.getElementById('liveResponses');
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
    timerTicker: null,
    timerDeadlineMs: null,
    timerForIndex: null,
    timerStartedAtMs: null,
    lastPhase: null,
    lastIndex: null,
    lastResponseCount: 0,
    lastAllAnsweredKey: null,
    lastRevealKey: null,
    state: null,
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
function bindBuilderEvents() {
  addMcqBtn.addEventListener('click', () => {
    quiz.questions.push(makeMcqQuestion());
    renderBuilder();
  });

  addMultiBtn.addEventListener('click', () => {
    quiz.questions.push(makeMultiQuestion());
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

  addPuzzleBtn.addEventListener('click', () => {
    quiz.questions.push(makePuzzleQuestion());
    renderBuilder();
  });

  addAudioBtn.addEventListener('click', () => {
    quiz.questions.push(makeAudioQuestion());
    renderBuilder();
  });

  addSliderBtn.addEventListener('click', () => {
    quiz.questions.push(makeSliderQuestion());
    renderBuilder();
  });

  addPinBtn.addEventListener('click', () => {
    quiz.questions.push(makePinQuestion());
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

  questionListEl.addEventListener('click', async (e) => {
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
      if (!q || q.type !== 'audio') return;
      speakText(q.audioText || q.prompt || '', q.language || 'en-US');
    }
  });

  questionListEl.addEventListener('change', async (e) => {
    const upload = e.target.closest('[data-pin-upload]');
    if (!upload) return;

    const idx = Number(upload.dataset.pinUpload);
    const q = quiz.questions[idx];
    if (!q || q.type !== 'pin') return;

    const file = upload.files?.[0];
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

      if (q.type === 'audio') {
        specific += `
          <label class="top-space">Text to read aloud (max 120 chars)</label>
          <input data-q="${idx}" data-field="audioText" maxlength="120" value="${escapeHtml(q.audioText || '')}" placeholder="Text-to-speech prompt" />
          <label>Language code (e.g. en-US, ca-ES)</label>
          <input data-q="${idx}" data-field="language" maxlength="10" value="${escapeHtml(q.language || 'en-US')}" />
          <div class="top-space"><button type="button" class="btn" data-play-audio-preview="${idx}">🔊 Play preview</button></div>
        `;
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

    if (q.type === 'puzzle') {
      const items = q.items || ['', '', '', ''];
      specific += `
        <label class="top-space">Correct order items (min 3, max 4)</label>
        <div class="answers-grid">
          ${items
            .map(
              (item, i) => `
            <input data-q="${idx}" data-puzzle-index="${i}" maxlength="75" value="${escapeHtml(item || '')}" placeholder="Position ${i + 1}" />
          `,
            )
            .join('')}
        </div>
        <p class="small">Students will need to place these in the correct order.</p>
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

      if (q.type === 'audio') {
        const audioTextEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="audioText"]`);
        const languageEl = questionListEl.querySelector(`[data-q="${idx}"][data-field="language"]`);
        q.audioText = String(audioTextEl?.value || '').slice(0, 120);
        q.language = String(languageEl?.value || 'en-US').slice(0, 10) || 'en-US';
      }
    }

    if (q.type === 'text') {
      const accepted = [];
      for (let aIdx = 0; aIdx < 4; aIdx++) {
        const aEl = questionListEl.querySelector(`[data-q="${idx}"][data-accepted-index="${aIdx}"]`);
        accepted.push(String(aEl?.value || '').slice(0, 20));
      }
      q.accepted = accepted;
    }

    if (q.type === 'puzzle') {
      const items = [];
      for (let i = 0; i < 4; i++) {
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

// ---------- Live mode ----------
function bindLiveEvents() {
  if (createLiveBtn) createLiveBtn.addEventListener('click', createLiveGame);
  if (hostRefreshBtn) hostRefreshBtn.addEventListener('click', pollHostState);
  if (hostStartBtn) hostStartBtn.addEventListener('click', hostStartGame);
  if (hostPrevBtn) hostPrevBtn.addEventListener('click', hostPrevQuestion);
  if (hostNextBtn) hostNextBtn.addEventListener('click', hostNextQuestion);

  if (hostPlayersEl) {
    hostPlayersEl.addEventListener('click', (e) => {
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

  if (livePhaseEl) livePhaseEl.textContent = `Phase: ${state.phase}`;
  if (liveProgressEl) liveProgressEl.textContent = `Progress: ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (liveResponsesEl) liveResponsesEl.textContent = `Answers this round: ${state.responseCount} / ${state.playerCount}`;
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

      const kick = document.createElement('button');
      kick.className = 'btn';
      kick.dataset.kickPlayer = p.id;
      kick.textContent = 'Remove';

      row.append(name, kick);
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

  const phaseChanged = live.host.lastPhase !== state.phase || live.host.lastIndex !== state.currentIndex;

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
    projectorCorrectEl.textContent =
      state.phase === 'question' && state.questionClosed && state.correctAnswer ? `Correct answer: ${state.correctAnswer}` : '';
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

    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Correct answer: ${state.correctAnswer}` : question.type === 'audio' ? 'Audio question.' : '';
    return;
  }

  if (question.type === 'text') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Correct answer: ${state.correctAnswer}` : 'Type-answer question.';
    return;
  }

  if (question.type === 'puzzle') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer ? `Correct order: ${state.correctAnswer}` : 'Puzzle question.';
    if (question.options?.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = `Items: ${question.options.join(' • ')}`;
      hostQuestionAnswersEl.appendChild(p);
    }
    return;
  }

  if (question.type === 'slider') {
    hostQuestionHintEl.textContent = showReveal && state.correctAnswer
      ? `Correct value: ${state.correctAnswer}`
      : `Slider range: ${question.min} to ${question.max}${question.unit ? ` ${question.unit}` : ''}`;
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

  if (live.host.timerForIndex !== questionIndex || live.host.timerStartedAtMs !== startedAt) {
    live.host.timerDeadlineMs = startedAt + limitSec * 1000;
    live.host.timerForIndex = questionIndex;
    live.host.timerStartedAtMs = startedAt;
    startHostTimerTicker();
  }

  const remainingMs = Math.max(0, Number(live.host.timerDeadlineMs || Date.now()) - Date.now());
  const remaining = Math.ceil(remainingMs / 1000);
  projectorTimerEl.textContent = `Time: ${remaining}s`;
}

function startHostTimerTicker() {
  stopHostTimerTicker();
  live.host.timerTicker = setInterval(() => {
    if (!projectorTimerEl || !live.host.timerDeadlineMs) return;
    const remainingMs = Math.max(0, live.host.timerDeadlineMs - Date.now());
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

    if (question.type === 'audio') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '🔊 Play audio';
      btn.addEventListener('click', () => speakText(question.audioText || question.prompt || '', question.language || 'en-US'));
      joinAnswersEl.appendChild(btn);
      speakText(question.audioText || question.prompt || '', question.language || 'en-US');
    }
    return;
  }

  if (question.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'joinTextAnswer';
    input.maxLength = 40;
    input.placeholder = 'Type your answer';
    joinAnswersEl.appendChild(input);
    return;
  }

  if (question.type === 'puzzle') {
    const options = question.options || [];

    for (let i = 0; i < (question.length || options.length); i++) {
      const row = document.createElement('div');
      row.className = 'row gap';

      const label = document.createElement('span');
      label.className = 'small';
      label.textContent = `Position ${i + 1}`;

      const select = document.createElement('select');
      select.dataset.joinPuzzleSlot = String(i);

      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose...';
      select.appendChild(empty);

      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });

      row.append(label, select);
      joinAnswersEl.appendChild(row);
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

  if (q.type === 'text') {
    const text = document.getElementById('joinTextAnswer');
    return text ? text.value : '';
  }

  if (q.type === 'puzzle') {
    const slots = [...joinAnswersEl.querySelectorAll('[data-join-puzzle-slot]')];
    const values = slots.map((s) => s.value).filter(Boolean);
    return values.length === slots.length ? values : null;
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

    if (q.type === 'audio') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn top-space';
      btn.textContent = '🔊 Play audio';
      btn.addEventListener('click', () => speakText(q.audioText || q.prompt || '', q.language || 'en-US'));
      answersEl.appendChild(btn);
      speakText(q.audioText || q.prompt || '', q.language || 'en-US');
    }
    return;
  }

  if (q.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'soloTextAnswer';
    input.maxLength = 40;
    input.placeholder = 'Type your answer';
    answersEl.appendChild(input);
    return;
  }

  if (q.type === 'puzzle') {
    const options = shuffle([...(q.items || []).filter(Boolean)]);
    soloGame.puzzleOptions = options;

    for (let i = 0; i < options.length; i++) {
      const row = document.createElement('div');
      row.className = 'row gap';

      const label = document.createElement('span');
      label.className = 'small';
      label.textContent = `Position ${i + 1}`;

      const select = document.createElement('select');
      select.dataset.soloPuzzleSlot = String(i);

      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose...';
      select.appendChild(empty);

      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });

      row.append(label, select);
      answersEl.appendChild(row);
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

  if (q.type === 'puzzle') {
    const slots = [...answersEl.querySelectorAll('[data-solo-puzzle-slot]')];
    const selected = slots.map((s) => s.value).filter(Boolean);
    if (selected.length !== slots.length) return { correct: false, hint: 'Fill all positions.' };

    const expected = (q.items || []).map(normalizeTextAnswer);
    const got = selected.map(normalizeTextAnswer);
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

function makeMultiQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'multi',
    prompt: '',
    points: 1000,
    timeLimit: 20,
    answers: [
      { text: '', correct: true },
      { text: '', correct: true },
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

function makePuzzleQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'puzzle',
    prompt: '',
    points: 1000,
    timeLimit: 30,
    items: ['', '', '', ''],
  };
}

function makeAudioQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'audio',
    prompt: '',
    audioText: '',
    language: 'en-US',
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
        ...(q.type === 'audio'
          ? {
              audioText: String(q.audioText || '').slice(0, 120),
              language: String(q.language || 'en-US').slice(0, 10) || 'en-US',
            }
          : {}),
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

    if (q.type === 'puzzle') {
      const items = (q.items || []).map((x) => String(x || '').slice(0, 75)).filter(Boolean).slice(0, 4);
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
      puzzle: 'Puzzle',
      audio: 'Quiz + Audio',
      slider: 'Slider',
      pin: 'Pin answer',
    }[type] || type
  );
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'puzzle', 'pin'].includes(type)) return 20;
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

function speakText(text, lang = 'en-US') {
  const value = String(text || '').trim();
  if (!value || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = lang || 'en-US';
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




