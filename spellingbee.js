/*
 * PinPlay — "spellingbee" question type: shared engine + interactive UI component.
 *
 * An audio-first spelling game for language learners. A question is one ROUND: a
 * list of target words. For each word the app pronounces it (or a clue) via the
 * host's TTS, and the student spells it on a reduced NYT-Spelling-Bee-style letter
 * circle (the word's own letters + auto-detected multi-letter clusters + a few
 * distractor tiles, max ~7 keys total). Tiles can be single letters or clusters
 * ("tion"→no, see CLUSTERS; e.g. "ee","tt","ght"); a cluster tile just inserts its
 * string, so "b-e-tt-e-r" and "b-e-t-t-e-r" grade identically (no segmentation).
 *
 * Difficulty is FIXED for everyone (no level selector): each word gets up to
 * THREE passes with escalating help, and points decrease the later you get it —
 *   pass 1: no help                        → 100%
 *   pass 2: letter-count empty slots shown  →  66%
 *   pass 3: trace mode (only the next correct letter is accepted; wrong taps
 *           flash red)                       →  33%
 *   never got it                            →   0%
 * A word missed on a pass rolls to the next pass (Password-style circle-back).
 *
 * The student may also type on a physical keyboard: a letter that matches a tile
 * acts like tapping it; a letter NOT in the circle does nothing.
 *
 * Grading is case- AND accent-insensitive.
 *
 * This file is a classic <script> (no modules) shared by the student app (play.js),
 * the teacher app (app.js) and the test harness; it attaches everything to
 * window.SpellingBee. The Cloudflare Worker can't load this browser file, so the
 * small normalize/grade/score helpers are duplicated in cloudflare/worker.js.
 */
(function (global) {
  'use strict';

  // ----------------------------------------------------------------- constants
  var MAX_PASSES = 3;
  var MAX_DISTRACTORS = 3;
  var TILE_TARGET = 7;          // aim each circle toward ~7 tiles total (NYT-style)
  var MIN_TARGET_LETTERS = 2;
  // Points multiplier by the pass a word was first spelled correctly on.
  var PASS_WEIGHTS = { 1: 1, 2: 0.66, 3: 0.33 };
  // Ladder thresholds as a fraction of the round's max points.
  var DEFAULT_LADDER = { good: 0.4, great: 0.7, genius: 1.0 };

  // Multi-letter clusters offered as convenience / distractor tiles (2–3 letters).
  // Common English (+ a few French) digraphs/trigraphs, grouped so the decoy picker
  // can reach for a confusable VOWEL cluster. Longest are listed first so substring
  // dedup in inWordClusters() keeps "ght" over "gh", "tch" over "ch", etc.
  var VOWEL_CLUSTERS = [
    'eau', 'igh',
    'ai', 'ay', 'au', 'aw', 'ea', 'ee', 'ei', 'eu', 'ew', 'ey', 'ie',
    'oa', 'oo', 'oi', 'oy', 'ou', 'ow', 'oe', 'ue', 'ui',
  ];
  var CONSONANT_DIGRAPHS = [
    'sch', 'tch', 'dge', 'ght',
    'ch', 'sh', 'th', 'ph', 'wh', 'gh', 'ck', 'ng', 'qu', 'kn', 'wr', 'gn', 'sc',
  ];
  var DOUBLED_CONSONANTS = ['bb', 'cc', 'dd', 'ff', 'gg', 'll', 'mm', 'nn', 'pp', 'rr', 'ss', 'tt', 'zz'];
  var CONSONANT_CLUSTERS = CONSONANT_DIGRAPHS.concat(DOUBLED_CONSONANTS);
  var CLUSTERS = VOWEL_CLUSTERS.concat(CONSONANT_CLUSTERS);

  // ------------------------------------------------------------------- helpers
  // Case- and accent-insensitive, letters only (so "Café" === "cafe").
  // Mirrored in cloudflare/worker.js.
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^a-z]/g, '');
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

  function passWeight(p) { return PASS_WEIGHTS[p] || 0; }

  // Clusters from the inventory that occur in the target, with any cluster fully
  // contained in a longer matched cluster dropped (so "ght" wins over "gh").
  function inWordClusters(target) {
    var n = normalize(target);
    var matched = CLUSTERS.filter(function (c) { return n.indexOf(c) >= 0; });
    return matched.filter(function (c) {
      return !matched.some(function (o) { return o !== c && o.length > c.length && o.indexOf(c) >= 0; });
    });
  }

  // Up to MAX_DISTRACTORS decoy tiles (strings absent from the word), filling the
  // circle toward ~7 keys. Fires only for targets with < 7 distinct letters. May
  // include one absent vowel-cluster decoy when the word itself uses a vowel
  // cluster (the classic ee/ea kind of trap), then absent single letters.
  function autoDistractors(target) {
    var distinct = distinctLetters(target);
    if (distinct.length >= TILE_TARGET) return [];
    var inWord = inWordClusters(target);
    var count = Math.max(0, Math.min(MAX_DISTRACTORS, TILE_TARGET - (distinct.length + inWord.length)));
    if (count <= 0) return [];

    var n = normalize(target);
    var present = {};
    distinct.forEach(function (c) { present[c] = 1; });
    var out = [];

    // A confusable absent vowel-cluster decoy when the word uses a vowel cluster.
    if (inWord.some(function (c) { return VOWEL_CLUSTERS.indexOf(c) >= 0; })) {
      for (var v = 0; v < VOWEL_CLUSTERS.length; v++) {
        if (n.indexOf(VOWEL_CLUSTERS[v]) < 0) { out.push(VOWEL_CLUSTERS[v]); break; }
      }
    }
    // Fill with common confusable single letters absent from the word.
    var pool = ['e', 'a', 's', 'c', 'k', 'h', 't', 'r', 'n', 'o', 'i', 'l',
      'd', 'm', 'u', 'y', 'g', 'b', 'p', 'w', 'f', 'v', 'z'];
    for (var i = 0; i < pool.length && out.length < count; i++) {
      if (!present[pool[i]] && out.indexOf(pool[i]) < 0) out.push(pool[i]);
    }
    return out.slice(0, count);
  }

  // Build the display tiles for one word: distinct letters (always) + clusters
  // (auto-detected in-word ones + valid author clusterTiles) + distractor tiles.
  // Each tile is { text, distractor } where distractor === (text not a substring
  // of the target) — that flag drives the red-flash-and-don't-insert behaviour.
  function buildTiles(word, opts) {
    opts = opts || {};
    var n = normalize(word);
    var texts = [];
    var push = function (s) { if (s && texts.indexOf(s) < 0) texts.push(s); };

    distinctLetters(word).forEach(push);
    inWordClusters(word).forEach(push);
    (opts.clusterTiles || []).forEach(function (c) {
      var cc = normalize(c);
      if (cc.length >= 2 && CLUSTERS.indexOf(cc) >= 0 && n.indexOf(cc) >= 0) push(cc);
    });
    var distract = (opts.distractors && opts.distractors.length)
      ? opts.distractors.map(normalize).filter(Boolean).slice(0, MAX_DISTRACTORS)
      : autoDistractors(word);
    distract.forEach(push);

    return shuffle(texts.map(function (txt) {
      return { text: txt, distractor: n.indexOf(txt) < 0 };
    }));
  }

  // --------------------------------------------------------------------- grading
  function gradeWord(target, guess) {
    var t = normalize(target);
    return t.length > 0 && t === normalize(guess);
  }

  // Per-letter Wordle status array: 'hit' | 'present' | 'miss' for each guess letter.
  function wordleStatuses(guess, target) {
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

  // Recompute round score from stored guesses vs the question's targets, matching
  // by normalized target. Points per correct word are weighted by the pass it was
  // solved on (solvedPass; missing → treated as pass 1). partialTotal = word count
  // so points = basePoints * (sum of weights / wordCount). Mirrors worker.js.
  function scoreRound(question, answer) {
    var words = (question && Array.isArray(question.words) ? question.words : [])
      .filter(function (w) { return normalize(w && w.target).length >= MIN_TARGET_LETTERS; });
    var total = words.length;
    if (!total) return { correct: false, partialScore: 0, partialTotal: 1 };
    var byTarget = {};
    if (answer && Array.isArray(answer.words)) {
      answer.words.forEach(function (w) { if (w && w.target != null) byTarget[normalize(w.target)] = w; });
    }
    var correctCount = 0, score = 0;
    words.forEach(function (qw) {
      var a = byTarget[normalize(qw.target)];
      if (a && gradeWord(qw.target, a.guess)) {
        correctCount++;
        var sp = Number(a.solvedPass);
        score += passWeight(sp >= 1 && sp <= MAX_PASSES ? sp : 1);
      }
    });
    return { correct: correctCount === total, partialScore: score, partialTotal: total };
  }

  function ladderRank(score, total, thresholds) {
    if (!total) return 'beginner';
    var frac = score / total;
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
      if (d.length) out.distractors = d.slice(0, MAX_DISTRACTORS);
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
      ladderThresholds: ladder ? {
        good: Number(ladder.good) || DEFAULT_LADDER.good,
        great: Number(ladder.great) || DEFAULT_LADDER.great,
        genius: Number(ladder.genius) || DEFAULT_LADDER.genius,
      } : Object.assign({}, DEFAULT_LADDER),
      words: (Array.isArray(q.words) ? q.words : []).map(normalizeWord)
        .filter(function (w) { return w.target; }),
    };
  }

  // Validate authored config; fail loudly with author-readable messages.
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
      points: 1000,
      timeLimit: 0, // standard per-question time limit (0 = none); 3 passes are the attempt limit
      words: [{ target: '' }, { target: '' }, { target: '' }],
    };
  }

  // ---------------------------------------------------- Edge-TTS player factory
  // Returns playWord(text, voice) → Promise<boolean>. Reuses the app's
  // /api/tts/edge endpoint with a client cache, falling back to speechSynthesis.
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

    if (options.reviewMode && options.savedResult) {
      renderSummary(container, t, options.savedResult);
      return { getResult: function () { return options.savedResult; }, isAnswered: function () { return true; }, destroy: function () {} };
    }
    if (!cfg.words.length) {
      var warn = document.createElement('p');
      warn.className = 'small';
      warn.textContent = t('This Spelling Bee has no words yet.');
      container.appendChild(warn);
      return { getResult: function () { return null; }, isAnswered: function () { return false; }, destroy: function () {} };
    }

    var results = cfg.words.map(function (w) {
      return { target: w.target, guess: '', correct: false, solvedPass: 0, attempts: 0 };
    });

    var passNum = 0;       // 1..3
    var queue = [];
    var nextQueue = [];    // words missed this pass → retried next pass with more help
    var current = -1;
    var guess = '';
    var roundDone = false;
    var started = false;   // first real submission → question becomes "answered"
    var startedAt = Date.now();
    var currentTiles = [];
    var tileBtns = {};

    function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
    function button(cls, label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sb-btn ' + cls; b.textContent = label; return b; }

    var root = el('div', 'sb-game');
    var header = el('div', 'sb-header');
    var featureEl = el('span', 'sb-feature'); featureEl.textContent = cfg.feature || '';
    var progressEl = el('span', 'sb-progress');
    header.append(featureEl, progressEl);
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
    var ladderEl = el('div', 'sb-ladder hidden');
    var feedbackEl = el('div', 'sb-feedback'); feedbackEl.setAttribute('aria-live', 'polite');
    root.append(header, audioRow, answerEl, controls, circleEl, ladderEl, feedbackEl);
    container.appendChild(root);

    function passHelp() { return passNum >= 3 ? 'trace' : (passNum === 2 ? 'length' : 'none'); }

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
      if (passHelp() !== 'none') { // pass 2 & 3 reveal the letter count
        var remain = normalize(cfg.words[current].target).length - normalize(guess).length;
        for (var j = 0; j < remain; j++) answerEl.appendChild(el('span', 'sb-cell sb-empty'));
      }
    }

    function renderCircle() {
      circleEl.innerHTML = ''; tileBtns = {};
      var w = cfg.words[current];
      currentTiles = buildTiles(w.target, { distractors: w.distractors, clusterTiles: w.clusterTiles });
      currentTiles.forEach(function (tile, i) {
        var b = el('button', 'sb-tile' + (i === 0 ? ' sb-tile-center' : ''));
        b.type = 'button';
        b.textContent = tile.text;
        b.dataset.distractor = tile.distractor ? '1' : '0';
        b.addEventListener('click', function () { onTile(tile, b); });
        tileBtns[tile.text] = b;
        circleEl.appendChild(b);
      });
    }

    function flash(btn) { if (!btn) return; btn.classList.remove('sb-flash'); void btn.offsetWidth; btn.classList.add('sb-flash'); }

    function onTile(tile, btn) {
      if (roundDone || current < 0) return;
      if (passHelp() === 'trace') {
        // Only the next correct letter(s) are accepted; anything else flashes red.
        var cand = normalize(guess + tile.text);
        var tgt = normalize(cfg.words[current].target);
        if (cand.length <= tgt.length && tgt.indexOf(cand) === 0) {
          guess += tile.text; feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback'; renderAnswer();
        } else {
          flash(btn); feedbackEl.textContent = t('Not the next letter'); feedbackEl.className = 'sb-feedback sb-bad';
        }
        return;
      }
      if (tile.distractor) {
        flash(btn); feedbackEl.textContent = t('Not in this word'); feedbackEl.className = 'sb-feedback sb-bad';
        return;
      }
      if (normalize(guess).length >= 28) return;
      guess += tile.text; feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback'; renderAnswer();
    }

    // Physical keyboard: a letter matching a tile acts like tapping it; a letter
    // NOT in the circle does nothing. Enter submits, Backspace deletes.
    function onKey(e) {
      if (roundDone || current < 0) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); return; }
      if (k === 'Backspace') { e.preventDefault(); e.stopPropagation(); if (guess) { guess = guess.slice(0, -1); renderAnswer(); } return; }
      if (k && k.length === 1 && /[a-z]/i.test(k)) {
        var letter = normalize(k);
        var tile = currentTiles.filter(function (x) { return x.text === letter; })[0];
        if (!tile) return; // letter not in the circle → do nothing
        e.preventDefault(); e.stopPropagation();
        onTile(tile, tileBtns[letter]);
      }
    }

    function nextWord() {
      guess = ''; feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback';
      if (!queue.length) return endPass();
      current = queue.shift();
      var solved = results.filter(function (r) { return r.correct; }).length;
      progressEl.textContent = t('Pass {n} of {max}', { n: passNum, max: MAX_PASSES }) + ' · ' + solved + '/' + cfg.words.length;
      submitBtn.disabled = false;
      renderAnswer(); renderCircle(); speak();
    }

    function submit() {
      if (roundDone || current < 0) return;
      if (!normalize(guess)) { feedbackEl.textContent = t('Tap letters to spell the word first.'); feedbackEl.className = 'sb-feedback sb-bad'; return; }
      started = true;
      var w = cfg.words[current];
      var rec = results[current];
      rec.attempts++;
      var ok = gradeWord(w.target, guess);
      renderAnswer(wordleStatuses(guess, w.target));
      if (ok) {
        rec.guess = guess; rec.correct = true; rec.solvedPass = passNum;
        feedbackEl.textContent = t('✓ Correct!'); feedbackEl.className = 'sb-feedback sb-good';
        if (options.onChange) options.onChange();
        wait(700).then(nextWord);
        return;
      }
      rec.guess = guess;
      if (passNum < MAX_PASSES) {
        nextQueue.push(current);
        feedbackEl.textContent = t('Not quite — it comes back with more help.');
      } else {
        feedbackEl.textContent = t('Spelling: {word}', { word: w.target });
      }
      feedbackEl.className = 'sb-feedback sb-bad';
      if (options.onChange) options.onChange();
      wait(900).then(nextWord);
    }

    function endPass() {
      submitBtn.disabled = true;
      if (passNum < MAX_PASSES && nextQueue.length) startPass(passNum + 1);
      else finalize();
    }

    function startPass(p) {
      passNum = p;
      queue = (p === 1) ? cfg.words.map(function (_, i) { return i; }) : nextQueue;
      nextQueue = [];
      nextWord();
    }

    function finalize() {
      roundDone = true;
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
      var frac = result.total ? result.pointsScore / result.total : 0;
      var rank = ladderRank(result.pointsScore, result.total, cfg.ladderThresholds);
      var labels = { beginner: t('Beginner'), good: t('Good'), great: t('Great'), genius: t('Genius') };
      ladderEl.className = 'sb-ladder sb-rank-' + rank;
      ladderEl.innerHTML = '';
      var badge = el('div', 'sb-rank-badge'); badge.textContent = labels[rank];
      var score = el('div', 'sb-score'); score.textContent = result.correctCount + ' / ' + result.total + ' · ' + Math.round(frac * 100) + '%';
      ladderEl.append(badge, score);
      feedbackEl.innerHTML = '';
      feedbackEl.appendChild(buildResultList(t, result));
    }

    function getResult() {
      if (!started && !roundDone) return null;
      var words = results.map(function (r) { return { target: r.target, guess: r.guess, correct: !!r.correct, solvedPass: r.solvedPass || 0 }; });
      var correctCount = words.filter(function (w) { return w.correct; }).length;
      var pointsScore = results.reduce(function (s, r) { return s + (r.correct ? passWeight(r.solvedPass) : 0); }, 0);
      return {
        words: words,
        correctCount: correctCount,
        total: words.length,
        pointsScore: pointsScore,
        pass: passNum,
        elapsedMs: Date.now() - startedAt,
      };
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    playBtn.addEventListener('click', speak);
    repeatBtn.addEventListener('click', speak);
    backBtn.addEventListener('click', function () { if (guess) { guess = guess.slice(0, -1); renderAnswer(); } });
    clearBtn.addEventListener('click', function () { guess = ''; renderAnswer(); });
    submitBtn.addEventListener('click', submit);
    document.addEventListener('keydown', onKey, true); // capture so it beats host key handlers

    startPass(1);

    return {
      getResult: getResult,
      isAnswered: function () { return started || roundDone; },
      destroy: function () { document.removeEventListener('keydown', onKey, true); container.classList.remove('sb-host'); },
    };
  }

  // Read-only summary (review mode / after finalize): list each word ✓/✗.
  function buildResultList(t, result) {
    var ul = document.createElement('ul');
    ul.className = 'sb-result-list';
    (result.words || []).forEach(function (w) {
      var li = document.createElement('li');
      li.className = w.correct ? 'sb-ok' : 'sb-no';
      var passNote = (w.correct && w.solvedPass > 1) ? ' (' + t('pass') + ' ' + w.solvedPass + ')' : '';
      li.textContent = (w.correct ? '✓ ' : '✗ ') + w.target + (w.correct ? passNote : (w.guess ? ' (' + t('you wrote') + ': ' + w.guess + ')' : ''));
      ul.appendChild(li);
    });
    return ul;
  }

  function renderSummary(container, t, result) {
    var wrap = document.createElement('div');
    wrap.className = 'sb-game sb-review';
    var head = document.createElement('div');
    head.className = 'sb-score';
    head.textContent = t('Spelling Bee') + ': ' + (result.correctCount || 0) + ' / ' + (result.total || (result.words || []).length);
    wrap.appendChild(head);
    wrap.appendChild(buildResultList(t, result));
    container.appendChild(wrap);
  }

  // ------------------------------------------------------------------- exports
  global.SpellingBee = {
    MAX_PASSES: MAX_PASSES,
    MAX_DISTRACTORS: MAX_DISTRACTORS,
    PASS_WEIGHTS: PASS_WEIGHTS,
    DEFAULT_LADDER: DEFAULT_LADDER,
    CLUSTERS: CLUSTERS,
    VOWEL_CLUSTERS: VOWEL_CLUSTERS,
    CONSONANT_CLUSTERS: CONSONANT_CLUSTERS,
    normalize: normalize,
    distinctLetters: distinctLetters,
    inWordClusters: inWordClusters,
    autoDistractors: autoDistractors,
    buildTiles: buildTiles,
    gradeWord: gradeWord,
    wordleStatuses: wordleStatuses,
    passWeight: passWeight,
    scoreRound: scoreRound,
    ladderRank: ladderRank,
    normalizeConfig: normalizeConfig,
    validateConfig: validateConfig,
    defaultQuestion: defaultQuestion,
    makeEdgeTtsPlayer: makeEdgeTtsPlayer,
    render: render,
  };

})(typeof window !== 'undefined' ? window : this);
