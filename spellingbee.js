/*
 * PinPlay — "spellingbee" question type: shared engine + interactive UI component.
 *
 * An audio-first spelling game for language learners. A question is one ROUND: a
 * list of target words. For each word the app pronounces it (or a clue) via the
 * host's TTS, and the student spells it on a reduced NYT-Spelling-Bee-style letter
 * circle (the word's own letters + a few distractor tiles). Tiles can be single
 * letters or multi-letter clusters ("tion", "tt") — a cluster tile just inserts its
 * string, so "b-e-tt-e-r" and "b-e-t-t-e-r" grade identically (no segmentation).
 *
 *  - Tapping a DISTRACTOR tile (a string absent from the word) → red flash, nothing
 *    inserted, no attempt consumed (an interference nudge).
 *  - Submitting a real-letter misspelling → marked wrong + the word is re-queued to
 *    return later in the same pass (Password-style circle-back, no instant retype).
 *  - Two passes: a LEARN pass (untimed), then a timed CHALLENGE pass with a
 *    Beginner→Good→Great→Genius ladder.
 *
 * Grading is case- AND accent-insensitive.
 *
 * This file is a classic <script> (no modules) shared by the student app (play.js),
 * the teacher app (app.js) and the test harness; it attaches everything to
 * window.SpellingBee. The Cloudflare Worker can't load this browser file, so the
 * small normalize/grade helpers are duplicated in cloudflare/worker.js (same pattern
 * the codebase already uses for normalizeTextAnswer / stripDiacritics).
 */
(function (global) {
  'use strict';

  // ----------------------------------------------------------------- constants
  var SCAFFOLD_LEVELS = ['A1', 'A2', 'B1'];
  // Ladder thresholds as a fraction of the round's total words.
  var DEFAULT_LADDER = { good: 0.4, great: 0.7, genius: 1.0 };
  var TILE_TARGET = 7;          // aim each circle toward ~7 tiles (NYT-style)
  var MIN_TARGET_LETTERS = 2;
  // Common English orthographic clusters offered as convenience / distractor tiles.
  var CLUSTERS = ['tch', 'ght', 'igh', 'tion', 'sion', 'cion', 'ck', 'ee', 'ea', 'oo',
    'ou', 'th', 'ch', 'sh', 'qu', 'tt', 'll', 'ss', 'bb', 'nn', 'mm', 'pp', 'rr', 'ff'];

  // ------------------------------------------------------------------- helpers
  // Case- and accent-insensitive, letters only (so "Café" === "cafe", and
  // punctuation/spaces are ignored). Mirrored in cloudflare/worker.js.
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (!Number.isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function distinctLetters(word) {
    var n = normalize(word), seen = {}, out = [];
    for (var i = 0; i < n.length; i++) {
      if (!seen[n[i]]) { seen[n[i]] = 1; out.push(n[i]); }
    }
    return out;
  }

  // ------------------------------------------------------------- auto distractors
  // Interference-aware absent letter/cluster picker. Per the teacher's rule it
  // ONLY fires for targets with FEWER than 7 distinct letters (to bring the circle
  // toward ~7 tiles); targets with 7+ distinct letters get none. Creator-supplied
  // distractors always win over this (see buildTiles).
  function autoDistractors(target, level) {
    var distinct = distinctLetters(target);
    if (distinct.length >= TILE_TARGET) return [];
    var cap = level === 'A1' ? 1 : (level === 'B1' ? 3 : 2);
    var count = Math.min(TILE_TARGET - distinct.length, cap);
    if (count <= 0) return [];

    var present = {};
    distinct.forEach(function (c) { present[c] = 1; });
    var n = normalize(target);
    var out = [];

    // Interference-style cluster decoys (the classic -tion / -ción / -sion trap).
    if (/tion$/.test(n)) {
      if (!present['c']) out.push('cion');
      if (out.length < count && n.indexOf('sion') < 0) out.push('sion');
    }
    // Then fill with common confusable single letters absent from the word.
    var pool = ['e', 'a', 's', 'c', 'k', 'h', 't', 'r', 'n', 'o', 'i', 'l',
      'd', 'm', 'u', 'y', 'g', 'b', 'p', 'w', 'f', 'v', 'z'];
    for (var i = 0; i < pool.length && out.length < count; i++) {
      if (!present[pool[i]] && out.indexOf(pool[i]) < 0) out.push(pool[i]);
    }
    return out.slice(0, count);
  }

  // Build the display tiles for one word: distinct letters (always), any authored
  // cluster tiles that actually occur in the word, plus distractor tiles. Each tile
  // is { text, distractor } where distractor === (text is NOT a substring of the
  // target) — that flag drives the red-flash-and-don't-insert behaviour.
  function buildTiles(word, opts) {
    opts = opts || {};
    var n = normalize(word);
    var texts = [];
    var pushUnique = function (s) { if (s && texts.indexOf(s) < 0) texts.push(s); };

    distinctLetters(word).forEach(pushUnique);
    (opts.clusterTiles || []).forEach(function (c) {
      var cc = normalize(c);
      if (cc.length > 1 && n.indexOf(cc) >= 0) pushUnique(cc);
    });
    var distract = (opts.distractors != null && opts.distractors.length)
      ? opts.distractors
      : autoDistractors(word, opts.level);
    distract.forEach(function (d) { pushUnique(normalize(d)); });

    return shuffle(texts.map(function (txt) {
      return { text: txt, distractor: n.indexOf(txt) < 0 };
    }));
  }

  // --------------------------------------------------------------------- grading
  function gradeWord(target, guess) {
    var t = normalize(target);
    return t.length > 0 && t === normalize(guess);
  }

  // Per-letter Wordle status array for a guess against a target.
  // Returns one of 'hit' | 'present' | 'miss' for each guessed letter.
  function wordleStatuses(guess, target) {
    var g = normalize(guess).split('');
    var t = normalize(target).split('');
    var res = new Array(g.length).fill('miss');
    var pool = {};
    t.forEach(function (c) { pool[c] = (pool[c] || 0) + 1; });
    // First pass: exact-position hits.
    for (var i = 0; i < g.length; i++) {
      if (g[i] === t[i]) { res[i] = 'hit'; pool[g[i]]--; }
    }
    // Second pass: present-but-misplaced.
    for (var j = 0; j < g.length; j++) {
      if (res[j] === 'hit') continue;
      if (pool[g[j]] > 0) { res[j] = 'present'; pool[g[j]]--; }
    }
    return res;
  }

  // Recompute the round score from the stored answer's guesses vs the question's
  // targets, matching by normalized target (re-queue reorders play, not grading).
  // Mirrored in cloudflare/worker.js. Returns the shape the app's evaluate() uses.
  function scoreRound(question, answer) {
    var words = (question && Array.isArray(question.words) ? question.words : [])
      .filter(function (w) { return w && normalize(w.target).length >= MIN_TARGET_LETTERS; });
    var total = words.length;
    if (!total) return { correct: false, partialScore: 0, partialTotal: 1 };
    var byTarget = {};
    if (answer && Array.isArray(answer.words)) {
      answer.words.forEach(function (w) {
        if (w && w.target != null) byTarget[normalize(w.target)] = w;
      });
    }
    var correctCount = 0;
    words.forEach(function (qw) {
      var a = byTarget[normalize(qw.target)];
      if (a && gradeWord(qw.target, a.guess)) correctCount++;
    });
    return { correct: correctCount === total, partialScore: correctCount, partialTotal: total };
  }

  function ladderRank(correct, total, thresholds) {
    if (!total) return 'beginner';
    var frac = correct / total;
    var th = thresholds || DEFAULT_LADDER;
    if (frac >= (th.genius != null ? th.genius : 1)) return 'genius';
    if (frac >= (th.great != null ? th.great : 0.7)) return 'great';
    if (frac >= (th.good != null ? th.good : 0.4)) return 'good';
    return 'beginner';
  }

  // ----------------------------------------------------------- config / validation
  function normalizeWord(w) {
    if (typeof w === 'string') w = { target: w };
    w = w || {};
    var out = { target: String(w.target == null ? '' : w.target).trim().slice(0, 40) };
    var clue = String(w.audioText == null ? '' : w.audioText).trim().slice(0, 200);
    if (clue) out.audioText = clue;
    if (Array.isArray(w.distractors)) {
      var d = w.distractors.map(function (x) { return String(x || '').trim().slice(0, 8); }).filter(Boolean);
      if (d.length) out.distractors = d.slice(0, 6);
    }
    if (Array.isArray(w.clusterTiles)) {
      var c = w.clusterTiles.map(function (x) { return String(x || '').trim().slice(0, 8); }).filter(Boolean);
      if (c.length) out.clusterTiles = c.slice(0, 6);
    }
    return out;
  }

  // Defaults so a MINIMAL config (just bare targets) is valid and playable.
  function normalizeConfig(q) {
    q = q || {};
    var ladder = q.ladderThresholds && typeof q.ladderThresholds === 'object' ? q.ladderThresholds : null;
    return {
      feature: String(q.feature || '').slice(0, 80),
      scaffoldLevel: SCAFFOLD_LEVELS.indexOf(q.scaffoldLevel) >= 0 ? q.scaffoldLevel : 'A2',
      timer: clampInt(q.timer, 0, 600, 90),
      maxAttemptsPerWord: clampInt(q.maxAttemptsPerWord, 1, 10, 3),
      ladderThresholds: ladder ? {
        good: Number(ladder.good) || DEFAULT_LADDER.good,
        great: Number(ladder.great) || DEFAULT_LADDER.great,
        genius: Number(ladder.genius) || DEFAULT_LADDER.genius,
      } : Object.assign({}, DEFAULT_LADDER),
      words: (Array.isArray(q.words) ? q.words : []).map(normalizeWord)
        .filter(function (w) { return w.target; }),
    };
  }

  // Validate authored config; fail loudly with author-readable messages (authors
  // won't have engine internals to debug against).
  function validateConfig(q) {
    var errors = [];
    var c = normalizeConfig(q);
    if (!c.words.length) {
      errors.push('Spelling Bee needs at least one word with a non-empty "target".');
    }
    c.words.forEach(function (w, i) {
      if (normalize(w.target).length < MIN_TARGET_LETTERS) {
        errors.push('Word ' + (i + 1) + ' ("' + w.target + '") needs at least ' + MIN_TARGET_LETTERS + ' letters.');
      }
    });
    return { ok: errors.length === 0, errors: errors, config: c };
  }

  // A ready-to-edit default question (used by the teacher app's "add question").
  function defaultQuestion() {
    return {
      type: 'spellingbee',
      prompt: 'Listen and spell each word.',
      feature: '',
      scaffoldLevel: 'A2',
      timer: 90,
      maxAttemptsPerWord: 3,
      points: 1000,
      timeLimit: 0,
      words: [{ target: '' }, { target: '' }, { target: '' }],
    };
  }

  // ---------------------------------------------------- Edge-TTS player factory
  // Returns playWord(text, voice) → Promise<boolean>. Reuses the app's
  // /api/tts/edge endpoint with a client cache, falling back to speechSynthesis.
  // The cache (a Map) and backend URL are supplied by the host so play.js can share
  // its existing studentEdgeTtsCache.
  function makeEdgeTtsPlayer(opts) {
    opts = opts || {};
    var cache = opts.cache || new Map();
    var getBackend = opts.getBackendUrl || function () { return opts.backendUrl || ''; };
    return function playWord(text, voice) {
      text = String(text || '').trim();
      if (!text) return Promise.resolve(false);
      voice = voice && voice.indexOf('Neural') >= 0
        ? voice
        : ((voice || 'en-US').replace('-Wave', '') + '-JennyNeural');
      var key = voice + '::' + text;
      var base = getBackend() || '';
      function playUrl(url) {
        return new Promise(function (resolve) {
          var a = new Audio(url);
          a.addEventListener('ended', function () { resolve(true); }, { once: true });
          a.addEventListener('error', function () { resolve(false); }, { once: true });
          a.play().catch(function () { resolve(false); });
        });
      }
      function speak() {
        return new Promise(function (resolve) {
          if (!('speechSynthesis' in global)) return resolve(false);
          try {
            global.speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(text);
            u.lang = (voice.match(/^[a-z]{2}-[A-Z]{2}/) || ['en-US'])[0];
            u.addEventListener('end', function () { resolve(true); }, { once: true });
            u.addEventListener('error', function () { resolve(false); }, { once: true });
            global.speechSynthesis.speak(u);
          } catch (e) { resolve(false); }
        });
      }
      var cached = cache.get(key);
      if (cached) return playUrl(cached);
      if (!base) return speak();
      return fetch(base + '/api/tts/edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, voice: voice }),
      }).then(function (res) {
        if (!res.ok) throw new Error('tts ' + res.status);
        return res.blob();
      }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        cache.set(key, url);
        return playUrl(url);
      }).catch(function () { return speak(); });
    };
  }

  // ------------------------------------------------------------------ UI render
  // render(container, question, options) → controller.
  // options: { t, voice, playWord(text,voice)->Promise, onChange(), onComplete(result),
  //            reviewMode, savedResult }
  // controller: { getResult(), isAnswered(), destroy() }
  function render(container, question, options) {
    options = options || {};
    var t = options.t || function (s) { return s; };
    var cfg = normalizeConfig(question);
    var voice = options.voice || question.language || 'en-US';
    var playWord = options.playWord || function () { return Promise.resolve(false); };

    container.innerHTML = '';
    container.classList.add('sb-host');

    // Review mode (locked): show a static summary, no game.
    if (options.reviewMode && options.savedResult) {
      renderSummary(container, t, cfg, options.savedResult);
      return { getResult: function () { return options.savedResult; }, isAnswered: function () { return true; }, destroy: function () {} };
    }

    if (!cfg.words.length) {
      var warn = document.createElement('p');
      warn.className = 'small';
      warn.textContent = t('This Spelling Bee has no words yet.');
      container.appendChild(warn);
      return { getResult: function () { return null; }, isAnswered: function () { return false; }, destroy: function () {} };
    }

    // Per-word result, keyed by original index.
    var results = cfg.words.map(function (w) {
      return { target: w.target, guess: '', correct: false, attempts: 0 };
    });

    var passes = ['learn', 'challenge'];
    var passIndex = 0;
    var learnDone = false;
    var roundDone = false;
    var queue = [];
    var current = -1;            // original index of the current word
    var guess = '';              // current typed string
    var timerId = null;
    var deadline = 0;
    var startedAt = Date.now();

    // ---- DOM scaffold ----
    var root = el('div', 'sb-game');
    var header = el('div', 'sb-header');
    var featureEl = el('span', 'sb-feature'); featureEl.textContent = cfg.feature || '';
    var progressEl = el('span', 'sb-progress');
    var timerEl = el('span', 'sb-timer hidden');
    header.append(featureEl, progressEl, timerEl);

    var audioRow = el('div', 'sb-audio');
    var playBtn = button('sb-play', t('🔊 Play word'));
    var repeatBtn = button('sb-repeat', t('↻ Repeat'));
    audioRow.append(playBtn, repeatBtn);

    var answerEl = el('div', 'sb-answer');
    var controls = el('div', 'sb-controls');
    var backBtn = button('sb-backspace', t('⌫'));
    var clearBtn = button('sb-clear', t('Clear'));
    var submitBtn = button('sb-submit btn-primary', t('Submit'));
    controls.append(backBtn, clearBtn, submitBtn);

    var circleEl = el('div', 'sb-circle');
    var feedbackEl = el('div', 'sb-feedback'); feedbackEl.setAttribute('aria-live', 'polite');
    var ladderEl = el('div', 'sb-ladder hidden');

    root.append(header, audioRow, answerEl, controls, circleEl, ladderEl, feedbackEl);
    container.appendChild(root);

    // ---- helpers ----
    function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
    function button(cls, label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sb-btn ' + cls; b.textContent = label; return b; }
    function fmtTime(ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }
    function passLabel() { return passes[passIndex] === 'learn' ? t('Learn') : t('Challenge'); }

    function speak() {
      var w = cfg.words[current];
      if (!w) return;
      playBtn.disabled = repeatBtn.disabled = true;
      root.classList.add('sb-speaking');
      var spoken = (w.audioText && w.audioText.trim()) ? w.audioText : w.target;
      Promise.resolve(playWord(spoken, voice)).then(function () {
        playBtn.disabled = repeatBtn.disabled = false;
        root.classList.remove('sb-speaking');
      });
    }

    function renderAnswer(statuses) {
      answerEl.innerHTML = '';
      var letters = guess.split('');
      for (var i = 0; i < letters.length; i++) {
        var cell = el('span', 'sb-cell');
        cell.textContent = letters[i];
        if (statuses && statuses[i]) cell.classList.add('sb-' + statuses[i]);
        answerEl.appendChild(cell);
      }
      // show empty slots hinting the word length only in learn pass
      if (passes[passIndex] === 'learn') {
        var remain = normalize(cfg.words[current].target).length - letters.length;
        for (var j = 0; j < remain; j++) answerEl.appendChild(el('span', 'sb-cell sb-empty'));
      }
    }

    function renderCircle() {
      circleEl.innerHTML = '';
      var w = cfg.words[current];
      var tiles = buildTiles(w.target, {
        distractors: w.distractors, clusterTiles: w.clusterTiles, level: cfg.scaffoldLevel,
      });
      tiles.forEach(function (tile, i) {
        var b = el('button', 'sb-tile' + (i === 0 ? ' sb-tile-center' : ''));
        b.type = 'button';
        b.textContent = tile.text;
        b.dataset.distractor = tile.distractor ? '1' : '0';
        b.addEventListener('click', function () { onTile(tile, b); });
        circleEl.appendChild(b);
      });
    }

    function onTile(tile, btn) {
      if (roundDone) return;
      if (tile.distractor) {
        btn.classList.remove('sb-flash');
        void btn.offsetWidth;            // restart the animation
        btn.classList.add('sb-flash');
        feedbackEl.textContent = t('Not in this word');
        feedbackEl.className = 'sb-feedback sb-bad';
        return;
      }
      if (normalize(guess).length >= 24) return;
      guess += tile.text;
      feedbackEl.textContent = '';
      feedbackEl.className = 'sb-feedback';
      renderAnswer();
    }

    function nextWord() {
      guess = '';
      feedbackEl.textContent = '';
      feedbackEl.className = 'sb-feedback';
      if (!queue.length) { return endPass(); }
      current = queue.shift();
      var correctSoFar = results.filter(function (r) { return r.correct; }).length;
      progressEl.textContent = passLabel() + ' · ' + correctSoFar + '/' + cfg.words.length;
      renderAnswer();
      renderCircle();
      submitBtn.disabled = false;
      speak();
    }

    function submit() {
      if (roundDone || current < 0) return;
      if (!normalize(guess)) { feedbackEl.textContent = t('Tap letters to spell the word first.'); feedbackEl.className = 'sb-feedback sb-bad'; return; }
      var w = cfg.words[current];
      var ok = gradeWord(w.target, guess);
      var rec = results[current];
      rec.attempts++;
      renderAnswer(wordleStatuses(guess, w.target));

      if (ok) {
        rec.guess = guess; rec.correct = true;
        feedbackEl.textContent = t('✓ Correct!'); feedbackEl.className = 'sb-feedback sb-good';
        if (options.onChange) options.onChange();
        wait(700).then(nextWord);
        return;
      }

      // Wrong: keep the best/last guess; re-queue with a gap if attempts remain.
      if (!rec.correct) rec.guess = guess;
      if (rec.attempts < cfg.maxAttemptsPerWord) {
        queue.push(current);  // circle back later in this pass
        feedbackEl.textContent = t('Not quite — it will come back. Listen again.');
      } else {
        feedbackEl.textContent = t('Moving on — spelling: {word}', { word: w.target });
      }
      feedbackEl.className = 'sb-feedback sb-bad';
      if (options.onChange) options.onChange();
      wait(900).then(nextWord);
    }

    function endPass() {
      submitBtn.disabled = true;
      if (passes[passIndex] === 'learn') {
        learnDone = true;
        if (options.onChange) options.onChange();   // now answerable
        stopTimer();
        showInterstitial();
      } else {
        finalize();
      }
    }

    function showInterstitial() {
      circleEl.innerHTML = '';
      answerEl.innerHTML = '';
      audioRow.classList.add('hidden');
      controls.classList.add('hidden');
      var correctSoFar = results.filter(function (r) { return r.correct; }).length;
      feedbackEl.className = 'sb-feedback';
      feedbackEl.innerHTML = '';
      var msg = el('p', 'sb-interstitial-msg');
      msg.textContent = t('Learn round done — {n}/{total} correct. Now beat the clock!', { n: correctSoFar, total: cfg.words.length });
      var go = button('sb-start-challenge btn-primary', t('▶ Start timed challenge'));
      go.addEventListener('click', startChallenge);
      feedbackEl.append(msg, go);
    }

    function startChallenge() {
      passIndex = 1;
      audioRow.classList.remove('hidden');
      controls.classList.remove('hidden');
      queue = shuffle(cfg.words.map(function (_, i) { return i; }));
      if (cfg.timer > 0) startTimer(cfg.timer * 1000);
      nextWord();
    }

    function startTimer(ms) {
      deadline = Date.now() + ms;
      timerEl.classList.remove('hidden');
      tick();
      timerId = setInterval(tick, 250);
    }
    function tick() {
      var left = deadline - Date.now();
      timerEl.textContent = '⏱ ' + fmtTime(left);
      timerEl.classList.toggle('sb-timer-low', left <= 10000);
      if (left <= 0) { stopTimer(); finalize(); }
    }
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } timerEl.classList.add('hidden'); }

    function finalize() {
      roundDone = true;
      stopTimer();
      audioRow.classList.add('hidden');
      controls.classList.add('hidden');
      circleEl.innerHTML = '';
      answerEl.innerHTML = '';
      var result = getResult();
      renderLadder(result);
      if (options.onComplete) options.onComplete(result);
      if (options.onChange) options.onChange();
    }

    function renderLadder(result) {
      var rank = ladderRank(result.correctCount, result.total, cfg.ladderThresholds);
      var labels = { beginner: t('Beginner'), good: t('Good'), great: t('Great'), genius: t('Genius') };
      ladderEl.className = 'sb-ladder sb-rank-' + rank;
      ladderEl.innerHTML = '';
      var score = el('div', 'sb-score');
      score.textContent = result.correctCount + ' / ' + result.total;
      var badge = el('div', 'sb-rank-badge');
      badge.textContent = labels[rank];
      ladderEl.append(badge, score);
      feedbackEl.innerHTML = '';
      feedbackEl.appendChild(buildResultList(t, cfg, result));
    }

    function getResult() {
      // Answerable only once the learn pass is complete.
      if (!learnDone) return null;
      var words = results.map(function (r) { return { target: r.target, guess: r.guess, correct: !!r.correct }; });
      var correctCount = words.filter(function (w) { return w.correct; }).length;
      return {
        words: words,
        correctCount: correctCount,
        total: words.length,
        pass: passes[passIndex],
        elapsedMs: Date.now() - startedAt,
      };
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // ---- wire controls ----
    playBtn.addEventListener('click', speak);
    repeatBtn.addEventListener('click', speak);
    backBtn.addEventListener('click', function () { if (guess) { guess = guess.slice(0, -1); renderAnswer(); } });
    clearBtn.addEventListener('click', function () { guess = ''; renderAnswer(); });
    submitBtn.addEventListener('click', submit);

    // ---- start ----
    queue = cfg.words.map(function (_, i) { return i; });
    nextWord();

    return {
      getResult: getResult,
      isAnswered: function () { return learnDone; },
      destroy: function () { stopTimer(); container.classList.remove('sb-host'); },
    };
  }

  // Read-only summary (review mode / after finalize): list each word ✓/✗.
  function buildResultList(t, cfg, result) {
    var ul = document.createElement('ul');
    ul.className = 'sb-result-list';
    (result.words || []).forEach(function (w) {
      var li = document.createElement('li');
      li.className = w.correct ? 'sb-ok' : 'sb-no';
      li.textContent = (w.correct ? '✓ ' : '✗ ') + w.target + (w.correct ? '' : (w.guess ? ' (' + t('you wrote') + ': ' + w.guess + ')' : ''));
      ul.appendChild(li);
    });
    return ul;
  }

  function renderSummary(container, t, cfg, result) {
    var wrap = document.createElement('div');
    wrap.className = 'sb-game sb-review';
    var head = document.createElement('div');
    head.className = 'sb-score';
    head.textContent = t('Spelling Bee') + ': ' + (result.correctCount || 0) + ' / ' + (result.total || (result.words || []).length);
    wrap.appendChild(head);
    wrap.appendChild(buildResultList(t, cfg, result));
    container.appendChild(wrap);
  }

  // ------------------------------------------------------------------- exports
  global.SpellingBee = {
    SCAFFOLD_LEVELS: SCAFFOLD_LEVELS,
    DEFAULT_LADDER: DEFAULT_LADDER,
    CLUSTERS: CLUSTERS,
    normalize: normalize,
    distinctLetters: distinctLetters,
    autoDistractors: autoDistractors,
    buildTiles: buildTiles,
    gradeWord: gradeWord,
    wordleStatuses: wordleStatuses,
    scoreRound: scoreRound,
    ladderRank: ladderRank,
    normalizeConfig: normalizeConfig,
    validateConfig: validateConfig,
    defaultQuestion: defaultQuestion,
    makeEdgeTtsPlayer: makeEdgeTtsPlayer,
    render: render,
  };

})(typeof window !== 'undefined' ? window : this);
