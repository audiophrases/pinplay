const BACKEND_KEY = 'pinplay.backend.v1';
const DEFAULT_BACKEND_URL = 'https://pinplay-api.eugenime.workers.dev';
const CLIENT_ID_KEY = 'pinplay.client.v1';
const REACTION_EMOJIS = ['👍','❤️','🔥','🤩','🤯','🤣','😎','🥳','😅','😱','😜','🙌','👏','✅','6️⃣','7️⃣','🆗','💪','🤟','✌️','🤙','🙈','🙉','🙊','🫡','🫠','👾'];

const joinStepPinEl = document.getElementById('joinStepPin');
const joinStepIdentityEl = document.getElementById('joinStepIdentity');
const joinModeHintEl = document.getElementById('joinModeHint');
const joinNameWrapEl = document.getElementById('joinNameWrap');

const joinPinEl = document.getElementById('joinPin');
const validatePinBtn = document.getElementById('validatePinBtn');
const joinNameEl = document.getElementById('joinName');
const joinBtn = document.getElementById('joinBtn');
const joinStatusEl = document.getElementById('joinStatus');
const joinTitleEl = document.getElementById('joinTitle');
const joinQuestionWrap = document.getElementById('joinQuestionWrap');
const joinProgressEl = document.getElementById('joinProgress');
const joinTimerEl = document.getElementById('joinTimer');
const joinScoreEl = document.getElementById('joinScore');
const joinPromptEl = document.getElementById('joinPrompt');
const joinAnswersEl = document.getElementById('joinAnswers');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinFeedbackEl = document.getElementById('joinFeedback');

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
    randomNamesMode: false,
    displayName: null,
    clientId: getOrCreateClientId(),
    selectedBet: 0,
    timerTicker: null,
    timerStartedAt: null,
    timerLimitSec: null,
  },
};

init();

function init() {
  if (validatePinBtn) validatePinBtn.addEventListener('click', validatePin);
  if (joinBtn) joinBtn.addEventListener('click', joinLiveGame);
  if (joinSubmitBtn) joinSubmitBtn.addEventListener('click', submitLiveAnswer);

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

async function validatePin() {
  try {
    const pin = String(joinPinEl?.value || '').trim();
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

    const data = await api(
      `/api/pin/check?pin=${encodeURIComponent(pin)}&clientId=${encodeURIComponent(live.player.clientId)}`,
      { method: 'GET' },
    );

    live.player.pin = pin;
    live.player.randomNamesMode = !!data?.settings?.randomNames;

    if (joinStepPinEl) joinStepPinEl.classList.add('hidden');
    if (joinStepIdentityEl) joinStepIdentityEl.classList.remove('hidden');

    if (live.player.randomNamesMode) {
      if (joinNameWrapEl) joinNameWrapEl.classList.add('hidden');
      if (joinModeHintEl) {
        joinModeHintEl.textContent = data.alreadyJoined && data.joinedPlayer?.name
          ? `Random names mode is ON. You are already in as ${data.joinedPlayer.name}.`
          : 'Random names mode is ON. You will be assigned a fun name automatically.';
      }
    } else {
      if (joinNameWrapEl) joinNameWrapEl.classList.remove('hidden');
      if (joinModeHintEl) {
        joinModeHintEl.textContent = 'Open names mode. Enter your name to join.';
      }
      if (data.alreadyJoined && data.joinedPlayer?.name && joinNameEl && !joinNameEl.value.trim()) {
        joinNameEl.value = data.joinedPlayer.name;
      }
    }

    if (joinBtn) joinBtn.textContent = data.alreadyJoined ? 'Rejoin game' : 'Join live game';
    setStatus(joinStatusEl, 'PIN valid ✅', 'ok');
  } catch (err) {
    setStatus(joinStatusEl, err.message, 'bad');
  }
}

async function joinLiveGame() {
  try {
    if (!live.player.pin) {
      await validatePin();
      if (!live.player.pin) return;
    }

    const name = String(joinNameEl?.value || '').trim();
    if (!live.player.randomNamesMode && !name) throw new Error('Enter your name.');

    const data = await api('/api/join', {
      method: 'POST',
      body: {
        pin: live.player.pin,
        name,
        clientId: live.player.clientId,
      },
    });

    live.player.id = data.playerId;
    live.player.token = data.playerToken;
    live.player.renderKey = null;
    live.player.submittedForIndex = null;
    live.player.currentQuestion = null;
    live.player.pinSelection = null;

    const shownName = data.name || name || 'Student';
    live.player.displayName = shownName;
    setJoinTitle(shownName);

    const prefix = data.alreadyJoined ? 'Rejoined' : 'Joined';
    setStatus(joinStatusEl, `${prefix} as ${shownName} ✅`, 'ok');

    if (joinStepIdentityEl) joinStepIdentityEl.classList.add('hidden');

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
  const latestName = String(state?.name || '').trim();
  if (latestName && latestName !== live.player.displayName) {
    live.player.displayName = latestName;
    setJoinTitle(latestName);
  }

  if (joinProgressEl) joinProgressEl.textContent = `Question ${Math.max(0, state.currentIndex + 1)} / ${state.totalQuestions}`;
  if (joinScoreEl) joinScoreEl.textContent = `Score: ${state.score}`;

  if (state.phase !== 'question' || !state.question) {
    stopJoinTimer();
    if (joinTimerEl) joinTimerEl.textContent = 'Time: —';
    if (joinQuestionWrap) joinQuestionWrap.classList.add('hidden');

    if (state.phase === 'lobby') {
      setStatus(joinStatusEl, 'Waiting for teacher to start…', 'ok');
    } else if (state.phase === 'results') {
      setStatus(joinStatusEl, 'Game finished 🎉', 'ok');
      renderLeaderboardInJoin(state.leaderboard || []);
    }
    return;
  }

  if (joinQuestionWrap) joinQuestionWrap.classList.remove('hidden');

  const key = `${state.phase}:${state.currentIndex}`;
  const shouldRenderQuestion = live.player.renderKey !== key;
  if (shouldRenderQuestion) {
    live.player.renderKey = key;
    live.player.submittedForIndex = state.answeredCurrent ? state.currentIndex : null;
    live.player.currentQuestion = state.question;
    live.player.pinSelection = null;
    live.player.selectedBet = 0;
    renderJoinQuestion(state.question);
    setStatus(joinFeedbackEl, '', '');
    animatePulse(joinQuestionWrap);
  }

  const questionClosed = !!state.questionClosed;

  if (questionClosed) {
    stopJoinTimer();
    if (joinTimerEl) joinTimerEl.textContent = 'Time: 0s';
  } else {
    startJoinTimer(state);
  }

  if (joinSubmitBtn) {
    joinSubmitBtn.disabled = questionClosed || state.answeredCurrent || live.player.submittedForIndex === state.currentIndex;
    if (!questionClosed && joinSubmitBtn.disabled) {
      setStatus(joinFeedbackEl, 'Answer submitted. Waiting for reveal…', 'ok');
    }
  }

  if (questionClosed) {
    const rr = state.revealedResult;
    if (rr) {
      if (rr.correct) {
        setStatus(joinFeedbackEl, `✅ Correct (+${Number(rr.pointsAwarded || 0)} pts)`, 'ok');
      } else {
        setStatus(joinFeedbackEl, '❌ Incorrect', 'bad');
      }
    } else {
      setStatus(joinFeedbackEl, 'Question closed.', 'ok');
    }
    setStatus(joinStatusEl, 'Answer revealed.', 'ok');
  } else if (state.answeredCurrent) {
    setStatus(joinStatusEl, 'Answer received.', 'ok');
  } else {
    setStatus(joinStatusEl, 'Question live!', 'ok');
  }
}

function renderJoinQuestion(question) {
  if (joinSubmitBtn) joinSubmitBtn.classList.remove('hidden');
  if (joinPromptEl) joinPromptEl.textContent = question.prompt || '(No question text)';
  if (joinAnswersEl) joinAnswersEl.innerHTML = '';
  if (!joinAnswersEl) return;

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
      btn.addEventListener('click', () => speakText(question.audioText || question.prompt || '', question.language || 'en-US-Wave'));
      joinAnswersEl.appendChild(btn);
      speakText(question.audioText || question.prompt || '', question.language || 'en-US-Wave');
    }
    appendRiskBetBar();
    appendReactionBar();
    return;
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'context_gap' || question.type === 'match_pairs') {
    if (question.type === 'image_open' && question.imageData) {
      const wrap = document.createElement('div');
      wrap.className = 'pin-preview';
      const img = document.createElement('img');
      img.src = question.imageData;
      img.alt = 'Image prompt';
      wrap.appendChild(img);
      joinAnswersEl.appendChild(wrap);
    }

    if (question.type === 'context_gap') {
      const count = Math.max(2, Math.min(4, Number(question.gapCount || 2)));
      for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 20;
        input.placeholder = `Blank ${i + 1}`;
        input.dataset.joinGap = String(i);
        joinAnswersEl.appendChild(input);
      }
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

    const wrap = document.createElement('div');
    wrap.className = 'pin-preview';

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
    appendRiskBetBar();
    appendReactionBar();
  }
}

function appendRiskBetBar() {
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

  const bets = [
    { value: 1, emoji: '🤔', title: 'Bet 1' },
    { value: 2, emoji: '😬', title: 'Bet 2' },
    { value: 3, emoji: '🔥', title: 'Bet 3' },
  ];

  bets.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn risk-bet-btn';
    btn.dataset.bet = String(b.value);
    btn.textContent = b.emoji;
    btn.title = b.title;
    if (Number(live.player.selectedBet || 0) === b.value) btn.classList.add('active');
    btn.addEventListener('click', () => {
      live.player.selectedBet = b.value;
      row.querySelectorAll('.risk-bet-btn').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
    });
    row.appendChild(btn);
  });

  if (joinSubmitBtn) {
    joinSubmitBtn.classList.remove('top-space');
    controls.appendChild(joinSubmitBtn);
  }

  controls.appendChild(row);

  wrap.appendChild(controls);
  joinAnswersEl.appendChild(wrap);
}

function appendReactionBar() {
  if (!joinAnswersEl) return;

  const wrap = document.createElement('div');
  wrap.className = 'top-space';

  const label = document.createElement('p');
  label.className = 'small';
  label.textContent = 'Quick reaction:';
  wrap.appendChild(label);

  const row = document.createElement('div');
  row.className = 'row gap';

  REACTION_EMOJIS.slice(0, 20).forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = emoji;
    btn.style.padding = '.3rem .5rem';
    btn.addEventListener('click', () => sendReaction(emoji));
    row.appendChild(btn);
  });

  wrap.appendChild(row);
  joinAnswersEl.appendChild(wrap);
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
        bet: Number(live.player.selectedBet || 0),
      },
    });

    live.player.submittedForIndex = data.currentIndex;
    if (joinSubmitBtn) joinSubmitBtn.disabled = true;

    setStatus(joinFeedbackEl, 'Answer submitted. Waiting for reveal…', 'ok');

    if (joinScoreEl) joinScoreEl.textContent = `Score: ${data.score}`;
  } catch (err) {
    const msg = String(err?.message || 'Could not submit answer.');
    if (msg.includes('Question is closed') || msg.includes('Question is not active')) {
      if (joinSubmitBtn) joinSubmitBtn.disabled = true;
      setStatus(joinFeedbackEl, 'Question is closed. Waiting for next one…', 'ok');
      return;
    }
    setStatus(joinFeedbackEl, msg, 'bad');
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

  if (q.type === 'pin') return live.player.pinSelection;

  return null;
}

function startPlayerPolling() {
  stopPlayerPolling();
  live.player.pollTimer = setInterval(pollPlayerState, 2000);
}

function stopPlayerPolling() {
  if (live.player.pollTimer) clearInterval(live.player.pollTimer);
  live.player.pollTimer = null;
  stopJoinTimer();
}

function startJoinTimer(state) {
  if (!joinTimerEl) return;

  const startedAt = Number(state?.questionStartedAt || Date.now());
  const limitSec = Math.max(1, Number(state?.question?.timeLimit || 20));

  if (live.player.timerStartedAt === startedAt && live.player.timerLimitSec === limitSec && live.player.timerTicker) {
    return;
  }

  live.player.timerStartedAt = startedAt;
  live.player.timerLimitSec = limitSec;

  stopJoinTimer();
  const paint = () => {
    const remainingMs = Math.max(0, startedAt + limitSec * 1000 - Date.now());
    const sec = Math.ceil(remainingMs / 1000);
    joinTimerEl.textContent = `Time: ${sec}s`;
  };

  paint();
  live.player.timerTicker = setInterval(paint, 250);
}

function stopJoinTimer() {
  if (live.player.timerTicker) clearInterval(live.player.timerTicker);
  live.player.timerTicker = null;
}

function renderLeaderboardInJoin(leaderboard) {
  if (!joinQuestionWrap || !joinPromptEl || !joinAnswersEl) return;

  joinQuestionWrap.classList.remove('hidden');
  joinPromptEl.textContent = 'Final leaderboard';
  joinAnswersEl.innerHTML = '';
  if (joinSubmitBtn) joinSubmitBtn.classList.add('hidden');

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

function createPuzzleDnd(container, options, listId = 'puzzlePieces') {
  const hint = document.createElement('p');
  hint.className = 'small';
  hint.textContent = 'Touchscreen: tap piece then tap target.';
  container.appendChild(hint);

  const list = document.createElement('div');
  list.className = 'row gap';
  list.style.flexWrap = 'wrap';
  list.dataset.puzzleList = listId;
  container.appendChild(list);

  let dragIndex = -1;
  let touchFrom = -1;

  const refreshIndexes = () => {
    [...list.querySelectorAll('[data-puzzle-piece]')].forEach((el, i) => {
      el.dataset.puzzleIndex = String(i);
    });
  };

  const movePiece = (from, to) => {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < 0 || from === to) return;
    const arr = [...list.querySelectorAll('[data-puzzle-piece]')];
    const moving = arr[from];
    const target = arr[to];
    if (!moving || !target) return;

    if (from < to) list.insertBefore(moving, target.nextSibling);
    else list.insertBefore(moving, target);
    refreshIndexes();
  };

  options.forEach((text, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'btn';
    item.style.cursor = 'grab';
    item.draggable = true;
    item.dataset.puzzlePiece = String(text || '');
    item.dataset.puzzleIndex = String(index);
    item.textContent = String(text || '');

    item.addEventListener('dragstart', () => {
      dragIndex = Number(item.dataset.puzzleIndex);
      item.style.opacity = '.5';
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
      dragIndex = -1;
    });
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      movePiece(Number(dragIndex), Number(item.dataset.puzzleIndex));
    });

    item.addEventListener('click', () => {
      const idx = Number(item.dataset.puzzleIndex);
      if (touchFrom < 0) {
        touchFrom = idx;
        item.style.outline = '2px solid #3b82f6';
        item.style.outlineOffset = '2px';
        return;
      }

      movePiece(touchFrom, idx);
      [...list.querySelectorAll('[data-puzzle-piece]')].forEach((el) => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      });
      touchFrom = -1;
    });

    list.appendChild(item);
  });
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

function setStatus(el, text, mode = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'feedback';
  if (mode === 'ok') el.classList.add('ok');
  if (mode === 'bad') el.classList.add('bad');
}

function setJoinTitle(name = '') {
  if (!joinTitleEl) return;
  const safe = String(name || '').trim();
  joinTitleEl.textContent = safe ? safe : 'Join game';
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

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}



