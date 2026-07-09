/*
 * PinPlay — "wordle" question type: shared engine + interactive UI component.
 *
 * A Wordle-style word-guessing game. A question is ONE word (5–8 letters is the
 * authoring guideline) and the student gets a limited number of attempts
 * (default 6). Each submitted guess is colour-coded per letter — green = right
 * letter in the right spot, yellow = in the word but elsewhere, grey = not in
 * the word — on the board AND on an on-screen QWERTY keyboard that remembers
 * the best-known state of every letter.
 *
 * Hints (each deducts HINT_PENALTY (25%) of the question's points, max
 * MAX_HINTS (3)): if the author supplied 'hints' — up to 3 text clues ordered
 * from less obvious to more obvious (synonyms, definitions) — the Hint button
 * shows the next one. When no hints are authored, the button falls back to
 * revealing a correct letter in the hint-slots row (never more than
 * wordLength - 2 letter reveals).
 *
 * Scoring: solved → 100% minus 25% per hint used (floor 0); not solved → 0.
 * Grading is case- AND accent-insensitive; any full-length letter combination
 * is accepted as a guess (no dictionary check — ESL-friendly).
 *
 * This file is a classic <script> (no modules) shared by the student app
 * (play.js), the teacher app (app.js) and the test harness; it attaches
 * everything to window.Wordle. The Cloudflare Worker can't load this browser
 * file, so the small normalize/score helpers are duplicated in
 * cloudflare/worker.js (same pattern as spellingbee.js).
 */
(function (global) {
  'use strict';

  // ----------------------------------------------------------------- constants
  var DEFAULT_ATTEMPTS = 6;
  var MIN_ATTEMPTS = 3;
  var MAX_ATTEMPTS = 8;
  var MIN_LEN = 3;   // hard floor (engine tolerance); authoring guideline is 5–8
  var MAX_LEN = 12;  // hard ceiling
  var MAX_HINTS = 3;
  var HINT_PENALTY = 0.25;
  var KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  // ------------------------------------------------------------------- helpers
  // Case- and accent-insensitive, letters only (so "Café" === "cafe").
  // Mirrored in cloudflare/worker.js.
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  // Per-letter Wordle status array for one guess: 'hit' | 'present' | 'miss'.
  // Classic two-pass algorithm so duplicate letters are only marked 'present'
  // as many times as they occur in the target.
  function statuses(guess, target) {
    var g = normalize(guess).split('');
    var t = normalize(target).split('');
    var res = new Array(g.length).fill('miss');
    var pool = {};
    t.forEach(function (c) { pool[c] = (pool[c] || 0) + 1; });
    for (var i = 0; i < g.length; i++) { if (g[i] === t[i]) { res[i] = 'hit'; pool[g[i]]--; } }
    for (var j = 0; j < g.length; j++) {
      if (res[j] === 'hit') continue;
      if (pool[g[j]] > 0) { res[j] = 'present'; pool[g[j]]--; }
    }
    return res;
  }

  // Best-known state per letter across all submitted guesses, for keyboard
  // colouring: 'hit' beats 'present' beats 'miss'; unknown letters are absent.
  function keyStates(guesses, target) {
    var rank = { miss: 1, present: 2, hit: 3 };
    var out = {};
    (guesses || []).forEach(function (guess) {
      var g = normalize(guess).split('');
      var st = statuses(guess, target);
      for (var i = 0; i < g.length; i++) {
        if (!out[g[i]] || rank[st[i]] > rank[out[g[i]]]) out[g[i]] = st[i];
      }
    });
    return out;
  }

  function maxHintsFor(word) {
    return Math.max(0, Math.min(MAX_HINTS, normalize(word).length - 2));
  }

  // How many hints this question allows: authored text hints cap at their count
  // (max 3); the letter-reveal fallback caps at wordLength - 2 (max 3).
  function hintCapFor(cfg) {
    return cfg.hints.length ? Math.min(MAX_HINTS, cfg.hints.length) : maxHintsFor(cfg.word);
  }

  function clampAttempts(n) {
    var v = parseInt(n, 10);
    if (!Number.isFinite(v)) return DEFAULT_ATTEMPTS;
    return Math.max(MIN_ATTEMPTS, Math.min(MAX_ATTEMPTS, v));
  }

  // ------------------------------------------------------------- config/schema
  function normalizeConfig(question) {
    question = question || {};
    return {
      word: String(question.word || '').trim(),
      maxAttempts: clampAttempts(question.maxAttempts),
      // Author text hints, ordered less obvious → more obvious. Optional; when
      // empty the Hint button reveals letters instead.
      hints: (Array.isArray(question.hints) ? question.hints : [])
        .map(function (h) { return String(h || '').trim(); })
        .filter(Boolean)
        .slice(0, MAX_HINTS),
    };
  }

  function validateConfig(question) {
    var errors = [];
    var n = normalize(question && question.word);
    if (!n) errors.push('wordle: "word" is required.');
    else if (n.length < MIN_LEN || n.length > MAX_LEN) {
      errors.push('wordle: word must be ' + MIN_LEN + '-' + MAX_LEN + ' letters (5-8 recommended); got "' + question.word + '".');
    }
    return errors;
  }

  function defaultQuestion() {
    return {
      type: 'wordle',
      prompt: 'Guess the word!',
      points: 1000,
      timeLimit: 0,
      word: '',
      maxAttempts: DEFAULT_ATTEMPTS,
    };
  }

  // --------------------------------------------------------------------- score
  // Recompute the round from stored guesses vs the question's word — never trust
  // a client-reported "solved". Solved → 1 minus 25% per hint (floor 0); the
  // hint count itself is client-reported (like spellingbee's solvedPass) but a
  // round with no correct guess always earns 0. Mirrored in cloudflare/worker.js.
  function scoreRound(question, answer) {
    var cfg = normalizeConfig(question);
    var target = normalize(cfg.word);
    if (!target) return { correct: false, partialScore: 0, partialTotal: 1, solved: false, hintsUsed: 0, attemptsUsed: 0 };
    var maxA = cfg.maxAttempts;
    var guesses = (answer && Array.isArray(answer.guesses) ? answer.guesses : []).slice(0, maxA);
    var solved = guesses.some(function (g) { return normalize(g) === target; });
    var rawHints = Number(answer && answer.hintsUsed);
    var hintsUsed = Math.max(0, Math.min(hintCapFor(cfg), Number.isFinite(rawHints) ? Math.floor(rawHints) : 0));
    var score = solved ? Math.max(0, 1 - HINT_PENALTY * hintsUsed) : 0;
    return {
      correct: solved,
      partialScore: score,
      partialTotal: 1,
      solved: solved,
      hintsUsed: hintsUsed,
      attemptsUsed: guesses.length,
    };
  }

  // Accept a stashed snapshot only if it still matches THIS question's word and
  // its fields are sane. A mismatch (edited quiz) means start fresh.
  function sanitizeResumeState(state, cfg) {
    if (!state || typeof state !== 'object') return null;
    if (!cfg || state.word !== normalize(cfg.word)) return null;
    if (!Array.isArray(state.guesses)) return null;
    if (state.guesses.length > MAX_ATTEMPTS) return null;
    if (state.revealed && typeof state.revealed !== 'object') return null;
    return state;
  }

  // ------------------------------------------------------------------ UI render
  // render(container, question, options) → controller.
  // options: { t, onChange(), onComplete(result), reviewMode, savedResult, resumeState }
  // controller: { getResult(), getState(), isComplete(), isAnswered(), destroy() }
  function render(container, question, options) {
    options = options || {};
    var t = options.t || function (s) { return s; };
    var cfg = normalizeConfig(question);
    var target = normalize(cfg.word);
    var len = target.length;
    var maxA = cfg.maxAttempts;
    var textHints = cfg.hints; // authored clues (less → more obvious); empty = letter reveals
    var hintCap = hintCapFor(cfg);

    container.innerHTML = '';
    container.classList.add('wd-host');

    if (options.reviewMode && options.savedResult) {
      renderSummary(container, t, options.savedResult, cfg);
      return { getResult: function () { return options.savedResult; }, getState: function () { return null; }, isComplete: function () { return true; }, isAnswered: function () { return true; }, destroy: function () {} };
    }
    if (!target || len < MIN_LEN) {
      var warn = document.createElement('p');
      warn.className = 'small';
      warn.textContent = t('This word puzzle has no word yet.');
      container.appendChild(warn);
      return { getResult: function () { return null; }, getState: function () { return null; }, isComplete: function () { return false; }, isAnswered: function () { return false; }, destroy: function () {} };
    }

    var guesses = [];        // submitted guesses (normalized strings)
    var input = '';          // current row being typed
    var hintsUsed = 0;
    var revealed = {};       // position (int) -> letter, from hints
    var done = false;
    var solved = false;
    var startedAt = Date.now();

    function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

    var root = el('div', 'wd-game');
    var header = el('div', 'wd-header');
    var progressEl = el('span', 'wd-progress');
    var hintBtn = el('button', 'wd-btn wd-hint');
    hintBtn.type = 'button';
    hintBtn.textContent = t('💡 Hint (−25%)');
    header.append(progressEl, hintBtn);

    // Authored text hints appear here as they are bought, one line per hint.
    var hintsListEl = el('div', 'wd-hints');

    // Hint slots: one dashed cell per letter; letter-reveal hints fill in green.
    // Always present so using a hint never shifts the layout (also doubles as
    // the word-length indicator).
    var hintRow = el('div', 'wd-hint-slots');

    var gridEl = el('div', 'wd-grid');
    var feedbackEl = el('div', 'wd-feedback'); feedbackEl.setAttribute('aria-live', 'polite');
    var keyboardEl = el('div', 'wd-keyboard');
    root.append(header, hintsListEl, hintRow, gridEl, feedbackEl, keyboardEl);
    container.appendChild(root);

    // --- board ---------------------------------------------------------------
    var rows = []; // rows[r][c] = cell element
    function buildGrid() {
      gridEl.innerHTML = ''; rows = [];
      for (var r = 0; r < maxA; r++) {
        var rowEl = el('div', 'wd-row');
        var cells = [];
        for (var c = 0; c < len; c++) {
          var cell = el('span', 'wd-cell');
          cells.push(cell); rowEl.appendChild(cell);
        }
        rows.push(cells); gridEl.appendChild(rowEl);
      }
    }

    function paintRow(r, guess, st) {
      for (var c = 0; c < len; c++) {
        var cell = rows[r][c];
        cell.textContent = guess[c] || '';
        cell.className = 'wd-cell' + (st && st[c] ? ' wd-' + st[c] : (guess[c] ? ' wd-filled' : ''));
      }
    }

    function paintInputRow() {
      if (guesses.length < maxA) paintRow(guesses.length, input, null);
    }

    function paintHintSlots() {
      hintRow.innerHTML = '';
      for (var c = 0; c < len; c++) {
        var cell = el('span', 'wd-slot' + (revealed[c] ? ' wd-revealed' : ''));
        cell.textContent = revealed[c] || '';
        hintRow.appendChild(cell);
      }
    }

    // Authored clues bought so far, in order (less obvious first).
    function paintHintTexts() {
      hintsListEl.innerHTML = '';
      for (var i = 0; i < hintsUsed && i < textHints.length; i++) {
        var line = el('div', 'wd-hint-line');
        line.textContent = '💡 ' + textHints[i];
        hintsListEl.appendChild(line);
      }
    }

    // --- keyboard --------------------------------------------------------------
    var keyBtns = {};
    var enterBtn = null;
    function buildKeyboard() {
      keyboardEl.innerHTML = ''; keyBtns = {};
      KEY_ROWS.forEach(function (rowStr, ri) {
        var rowEl = el('div', 'wd-key-row');
        if (ri === KEY_ROWS.length - 1) {
          enterBtn = el('button', 'wd-key wd-key-wide wd-enter');
          enterBtn.type = 'button';
          enterBtn.textContent = t('Enter');
          var kb = el('kbd', 'wd-kbd'); kb.textContent = '↵';
          enterBtn.appendChild(kb);
          enterBtn.addEventListener('click', function () { submit(); });
          rowEl.appendChild(enterBtn);
        }
        rowStr.split('').forEach(function (letter) {
          var b = el('button', 'wd-key');
          b.type = 'button';
          b.textContent = letter;
          b.addEventListener('click', function () { typeLetter(letter, b); });
          keyBtns[letter] = b;
          rowEl.appendChild(b);
        });
        if (ri === KEY_ROWS.length - 1) {
          var back = el('button', 'wd-key wd-key-wide');
          back.type = 'button';
          back.textContent = '⌫';
          back.addEventListener('click', function () { backspace(); });
          rowEl.appendChild(back);
        }
        keyboardEl.appendChild(rowEl);
      });
    }

    function paintKeyboard() {
      var st = keyStates(guesses, target);
      Object.keys(keyBtns).forEach(function (letter) {
        keyBtns[letter].className = 'wd-key' + (st[letter] ? ' wd-' + st[letter] : '');
      });
    }

    function pop(btn) { if (!btn) return; btn.classList.remove('wd-pop'); void btn.offsetWidth; btn.classList.add('wd-pop'); }
    function shakeRow(r) {
      var rowEl = gridEl.children[r];
      if (!rowEl) return;
      rowEl.classList.remove('wd-shake'); void rowEl.offsetWidth; rowEl.classList.add('wd-shake');
    }

    function updateHeader() {
      progressEl.textContent = t('Guess {n} of {total}', { n: Math.min(guesses.length + 1, maxA), total: maxA });
      hintBtn.disabled = done || hintsUsed >= hintCap;
    }

    // --- actions ---------------------------------------------------------------
    function typeLetter(letter, btn) {
      if (done || input.length >= len) return;
      input += letter;
      feedbackEl.textContent = ''; feedbackEl.className = 'wd-feedback';
      paintInputRow();
      pop(btn || keyBtns[letter]);
    }

    function backspace() {
      if (done || !input) return;
      input = input.slice(0, -1);
      paintInputRow();
    }

    function submit() {
      if (done) return;
      if (input.length < len) {
        feedbackEl.textContent = t('Not enough letters');
        feedbackEl.className = 'wd-feedback wd-bad';
        shakeRow(guesses.length);
        return;
      }
      var st = statuses(input, target);
      paintRow(guesses.length, input, st);
      guesses.push(input);
      solved = normalize(input) === target;
      input = '';
      paintKeyboard();
      if (solved || guesses.length >= maxA) { finalize(); }
      else { updateHeader(); paintInputRow(); }
      if (options.onChange) options.onChange();
    }

    // Buy the next hint — an authored clue when the question has them (shown in
    // order, less obvious → more obvious), otherwise reveal a correct letter:
    // leftmost position not already revealed and not already solved green in a
    // submitted guess. Either way it costs 25% of the points.
    function useHint() {
      if (done || hintsUsed >= hintCap) return;
      if (textHints.length) {
        hintsUsed++;
        paintHintTexts();
        updateHeader();
        if (options.onChange) options.onChange();
        return;
      }
      var known = {};
      guesses.forEach(function (g) {
        var st = statuses(g, target);
        for (var i = 0; i < st.length; i++) if (st[i] === 'hit') known[i] = true;
      });
      var pos = -1;
      for (var c = 0; c < len; c++) { if (!revealed[c] && !known[c]) { pos = c; break; } }
      if (pos < 0) { for (var c2 = 0; c2 < len; c2++) { if (!revealed[c2]) { pos = c2; break; } } }
      if (pos < 0) return;
      revealed[pos] = target[pos];
      hintsUsed++;
      paintHintSlots();
      updateHeader();
      if (options.onChange) options.onChange();
    }

    // Finished-round view WITHOUT completion callbacks, so a restored round
    // doesn't spuriously re-mark the answer dirty (same split as spellingbee).
    function showFinalizedView() {
      done = true;
      keyboardEl.classList.add('wd-locked');
      hintBtn.disabled = true;
      progressEl.textContent = t('Guess {n} of {total}', { n: guesses.length, total: maxA });
      if (solved) {
        var pct = Math.round(Math.max(0, 1 - HINT_PENALTY * hintsUsed) * 100);
        feedbackEl.textContent = t('✓ Correct!') + (hintsUsed ? ' · ' + pct + '%' : '');
        feedbackEl.className = 'wd-feedback wd-good';
      } else {
        feedbackEl.textContent = t('The word was: {word}', { word: target });
        feedbackEl.className = 'wd-feedback wd-bad';
      }
    }

    function finalize() {
      showFinalizedView();
      if (options.onComplete) options.onComplete(getResult());
    }

    // --- physical keyboard ------------------------------------------------------
    function onKey(e) {
      if (done) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); return; }
      if (k === 'Backspace') { e.preventDefault(); e.stopPropagation(); backspace(); return; }
      if (k && k.length === 1 && /[a-z]/i.test(k)) {
        e.preventDefault(); e.stopPropagation();
        typeLetter(normalize(k));
      }
    }

    // --- state ------------------------------------------------------------------
    function getResult() {
      if (!guesses.length && !done) return null;
      var scored = scoreRound({ word: cfg.word, maxAttempts: maxA }, { guesses: guesses, hintsUsed: hintsUsed });
      return {
        word: target,
        guesses: guesses.slice(),
        solved: scored.solved,
        hintsUsed: hintsUsed,
        attemptsUsed: guesses.length,
        pointsScore: scored.partialScore,
        elapsedMs: Date.now() - startedAt,
      };
    }

    function getState() {
      if (!guesses.length && !input && !hintsUsed && !done) return null;
      return {
        v: 1, word: target,
        guesses: guesses.slice(), input: input,
        hintsUsed: hintsUsed, revealed: Object.assign({}, revealed),
        done: done, solved: solved, startedAt: startedAt,
      };
    }

    function restoreFrom(s) {
      guesses = s.guesses.map(normalize).filter(function (g) { return g.length === len; }).slice(0, maxA);
      input = normalize(s.input || '').slice(0, len);
      hintsUsed = Math.max(0, Math.min(hintCap, Number(s.hintsUsed) || 0));
      revealed = {};
      Object.keys(s.revealed || {}).forEach(function (k) {
        var p = parseInt(k, 10);
        if (p >= 0 && p < len) revealed[p] = target[p]; // re-derive: never trust stored letters
      });
      solved = guesses.some(function (g) { return g === target; });
      startedAt = s.startedAt || Date.now();
      guesses.forEach(function (g, r) { paintRow(r, g, statuses(g, target)); });
      paintKeyboard();
      paintHintSlots();
      paintHintTexts();
      if (s.done || solved || guesses.length >= maxA) { showFinalizedView(); return; }
      updateHeader();
      paintInputRow();
    }

    buildGrid();
    buildKeyboard();
    paintHintSlots();
    hintBtn.addEventListener('click', useHint);
    document.addEventListener('keydown', onKey, true); // capture so it beats host key handlers

    var resume = sanitizeResumeState(options.resumeState, cfg);
    if (resume) { restoreFrom(resume); } else { updateHeader(); }

    return {
      getResult: getResult,
      getState: getState,
      isComplete: function () { return done; },
      isAnswered: function () { return guesses.length > 0 || done; },
      destroy: function () { document.removeEventListener('keydown', onKey, true); container.classList.remove('wd-host'); },
    };
  }

  // Read-only summary (review mode / host): mini coloured grid + outcome line.
  function renderSummary(container, t, result, cfg) {
    var wrap = document.createElement('div');
    wrap.className = 'wd-game wd-review';
    var target = normalize((result && result.word) || (cfg && cfg.word));
    var head = document.createElement('div');
    head.className = 'wd-summary-head';
    head.textContent = result && result.solved
      ? t('✓ Correct!') + ' · ' + t('Solved in {n} tries', { n: (result.guesses || []).length })
      : t('The word was: {word}', { word: target });
    wrap.appendChild(head);
    var grid = document.createElement('div');
    grid.className = 'wd-grid wd-grid-mini';
    (result && result.guesses || []).forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'wd-row';
      var st = statuses(g, target);
      normalize(g).split('').forEach(function (ch, i) {
        var cell = document.createElement('span');
        cell.className = 'wd-cell wd-' + (st[i] || 'miss');
        cell.textContent = ch;
        row.appendChild(cell);
      });
      grid.appendChild(row);
    });
    wrap.appendChild(grid);
    if (result && result.hintsUsed) {
      var hints = document.createElement('div');
      hints.className = 'small';
      hints.textContent = t('{n} hint(s) used', { n: result.hintsUsed });
      wrap.appendChild(hints);
    }
    container.appendChild(wrap);
  }

  // ------------------------------------------------------------------- exports
  global.Wordle = {
    DEFAULT_ATTEMPTS: DEFAULT_ATTEMPTS,
    MIN_ATTEMPTS: MIN_ATTEMPTS,
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    MAX_HINTS: MAX_HINTS,
    HINT_PENALTY: HINT_PENALTY,
    normalize: normalize,
    statuses: statuses,
    keyStates: keyStates,
    maxHintsFor: maxHintsFor,
    hintCapFor: hintCapFor,
    scoreRound: scoreRound,
    normalizeConfig: normalizeConfig,
    validateConfig: validateConfig,
    sanitizeResumeState: sanitizeResumeState,
    defaultQuestion: defaultQuestion,
    render: render,
    renderSummary: renderSummary,
  };

})(typeof window !== 'undefined' ? window : this);
