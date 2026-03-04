const STORAGE_KEY = 'pinplay.quiz.v1';

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

const quizTitleEl = document.getElementById('quizTitle');
const questionListEl = document.getElementById('questionList');
const addMcqBtn = document.getElementById('addMcqBtn');
const addTfBtn = document.getElementById('addTfBtn');
const addTextBtn = document.getElementById('addTextBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

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
let game = null;

init();

function init() {
  bindTabs();
  bindBuilderEvents();
  bindPlayEvents();

  renderBuilder();
  refreshPin();
}

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
    downloadJson(quiz, toSafeFilename((quiz.title || 'pinplay-quiz')) + '.json');
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
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.removeQuestion);
      quiz.questions.splice(idx, 1);
      renderBuilder();
    }
  });
}

function bindPlayEvents() {
  startBtn.addEventListener('click', () => {
    syncQuizFromUI();
    if (!quiz.title?.trim()) return alert('Add a quiz title first.');
    if (!quiz.questions.length) return alert('Add at least 1 question.');

    const name = studentNameEl.value.trim() || 'Student';
    game = {
      student: name,
      index: 0,
      score: 0,
      answered: false,
    };

    lobbyCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    gameCard.classList.remove('hidden');
    renderGameQuestion();
  });

  submitBtn.addEventListener('click', () => {
    if (!game || game.answered) return;
    const q = quiz.questions[game.index];
    const result = evaluateQuestion(q);

    if (result.correct) {
      game.score += Number(q.points || 1000);
      feedbackEl.textContent = 'Correct ✅';
      feedbackEl.className = 'feedback ok';
    } else {
      feedbackEl.textContent = `Not quite ❌ ${result.hint || ''}`.trim();
      feedbackEl.className = 'feedback bad';
    }

    game.answered = true;
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    scoreEl.textContent = `Score: ${game.score}`;
  });

  nextBtn.addEventListener('click', () => {
    if (!game) return;
    game.index += 1;
    game.answered = false;

    if (game.index >= quiz.questions.length) {
      finishGame();
      return;
    }

    renderGameQuestion();
  });

  playAgainBtn.addEventListener('click', () => {
    game = null;
    resultCard.classList.add('hidden');
    gameCard.classList.add('hidden');
    lobbyCard.classList.remove('hidden');
    refreshPin();
  });
}

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
      specific = `
        <label class="top-space">Accepted answers (1-4, max 20 chars each)</label>
        <div class="answers-grid">
          ${(q.accepted || ['', '', '', ''])
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
    if (timeEl) q.timeLimit = clamp(Number(timeEl.value || 20), q.type === 'mcq' || q.type === 'tf' ? 5 : 20, 240);

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

function renderGameQuestion() {
  const q = quiz.questions[game.index];
  progressEl.textContent = `Question ${game.index + 1} / ${quiz.questions.length}`;
  scoreEl.textContent = `Score: ${game.score}`;
  qPromptEl.textContent = q.prompt || '(No question text)';

  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');

  answersEl.innerHTML = '';

  if (q.type === 'mcq' || q.type === 'tf') {
    q.answers.forEach((a, idx) => {
      const id = `ans-${game.index}-${idx}`;
      const row = document.createElement('label');
      row.className = 'answer-row';
      row.innerHTML = `
        <input type="radio" name="live-answer" value="${idx}" id="${id}" />
        <span>${escapeHtml(a.text || '(blank)')}</span>
      `;
      answersEl.appendChild(row);
    });
  }

  if (q.type === 'text') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'liveTextAnswer';
    input.maxLength = 40;
    input.placeholder = 'Type your answer';
    answersEl.appendChild(input);
  }
}

function evaluateQuestion(q) {
  if (q.type === 'mcq' || q.type === 'tf') {
    const checked = answersEl.querySelector('input[name="live-answer"]:checked');
    if (!checked) return { correct: false, hint: 'Select an answer first.' };

    const selected = Number(checked.value);
    const correctIndex = q.answers.findIndex((a) => a.correct);
    return { correct: selected === correctIndex };
  }

  if (q.type === 'text') {
    const val = document.getElementById('liveTextAnswer')?.value || '';
    const guess = normalizeTextAnswer(val);
    const accepted = (q.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    if (!accepted.length) return { correct: false, hint: 'No accepted answers set by teacher.' };
    const ok = accepted.includes(guess);
    return { correct: ok, hint: ok ? '' : `Accepted: ${accepted.slice(0, 2).join(' / ')}` };
  }

  return { correct: false };
}

function finishGame() {
  gameCard.classList.add('hidden');
  resultCard.classList.remove('hidden');

  const totalPossible = quiz.questions.reduce((sum, q) => sum + Number(q.points || 1000), 0);
  finalScoreEl.textContent = `${game.student}, you scored ${game.score} / ${totalPossible}.`;
}

function refreshPin() {
  pinValueEl.textContent = String(Math.floor(100000 + Math.random() * 900000));
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

function loadQuiz() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveQuiz(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function toSafeFilename(s) {
  return String(s || 'quiz').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
}
