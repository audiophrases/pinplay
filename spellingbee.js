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
  var TILE_TARGET = 7;          // the comb is a FIXED 7 keys (NYT-style): long words
                                // merge adjacent letters into 2-letter tiles to get
                                // DOWN to 7; short words add decoys to fill UP to 7
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

  function isVowel(ch) { return 'aeiou'.indexOf(ch) >= 0; }

  // The single letter that anchors the hive centre across the whole question: the
  // one appearing in the MOST words (ties → most total occurrences → vowel →
  // alphabetical). null for an empty set.
  function mostCommonLetter(words) {
    if (!words || !words.length) return null;
    var doc = {}, tot = {}, order = [];
    words.forEach(function (w) {
      var n = normalize(w && w.target != null ? w.target : w), seen = {};
      for (var i = 0; i < n.length; i++) {
        var ch = n[i];
        if (tot[ch] == null) order.push(ch);
        tot[ch] = (tot[ch] || 0) + 1;
        if (!seen[ch]) { seen[ch] = 1; doc[ch] = (doc[ch] || 0) + 1; }
      }
    });
    var best = null;
    order.forEach(function (ch) {
      if (best === null) { best = ch; return; }
      if (doc[ch] > doc[best]) { best = ch; return; }
      if (doc[ch] !== doc[best]) return;
      if (tot[ch] > tot[best]) { best = ch; return; }
      if (tot[ch] !== tot[best]) return;
      if (isVowel(ch) && !isVowel(best)) { best = ch; return; }
      if (isVowel(ch) === isVowel(best) && ch < best) best = ch;
    });
    return best;
  }

  // Which letter centres a single word's hive: the question-wide centre if the word
  // has it, otherwise the letter that repeats most WITHIN this word (only if one
  // actually repeats — "more common than the rest"), else null (no anchor).
  function centerLetterForWord(word, globalCenter) {
    var n = normalize(word);
    if (globalCenter && n.indexOf(globalCenter) >= 0) return globalCenter;
    var freq = {}, order = [];
    for (var i = 0; i < n.length; i++) { if (freq[n[i]] == null) order.push(n[i]); freq[n[i]] = (freq[n[i]] || 0) + 1; }
    var best = null;
    order.forEach(function (ch) {
      if (best === null || freq[ch] > freq[best] ||
        (freq[ch] === freq[best] && isVowel(ch) && !isVowel(best))) best = ch;
    });
    return (best && freq[best] > 1) ? best : null;
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

  // Ordered list of plausible decoy tiles (strings ABSENT from the word): a
  // confusable vowel-cluster first (one SHARING a letter with an in-word vowel
  // cluster — ou↔au, ee↔ea — not an arbitrary "eau"), then common absent single
  // letters. Length-unbounded; callers slice to taste.
  function distractorCandidates(target) {
    var n = normalize(target);
    var present = {};
    distinctLetters(target).forEach(function (c) { present[c] = 1; });
    var out = [];

    var inWordVowel = inWordClusters(target).filter(function (c) { return VOWEL_CLUSTERS.indexOf(c) >= 0; });
    if (inWordVowel.length) {
      var letters = inWordVowel.join('');
      var pick = null, firstAbsent = null;
      for (var v = 0; v < VOWEL_CLUSTERS.length; v++) {
        var vc = VOWEL_CLUSTERS[v];
        if (n.indexOf(vc) >= 0) continue; // must be absent from the word
        if (firstAbsent === null) firstAbsent = vc;
        if (vc.length === 2 && vc.split('').some(function (ch) { return letters.indexOf(ch) >= 0; })) { pick = vc; break; }
      }
      if (pick || firstAbsent) out.push(pick || firstAbsent);
    }
    var pool = ['e', 'a', 's', 'c', 'k', 'h', 't', 'r', 'n', 'o', 'i', 'l',
      'd', 'm', 'u', 'y', 'g', 'b', 'p', 'w', 'f', 'v', 'z'];
    for (var i = 0; i < pool.length; i++) {
      if (!present[pool[i]] && out.indexOf(pool[i]) < 0) out.push(pool[i]);
    }
    return out;
  }

  // Up to MAX_DISTRACTORS decoys, filling the circle toward ~7 keys; fires only for
  // targets with < 7 distinct letters. (Standalone helper; buildTiles does its own
  // count-aware fill that accounts for cluster-pruned single letters.)
  function autoDistractors(target) {
    var distinct = distinctLetters(target);
    if (distinct.length >= TILE_TARGET) return [];
    var inWord = inWordClusters(target);
    var count = Math.max(0, Math.min(MAX_DISTRACTORS, TILE_TARGET - (distinct.length + inWord.length)));
    if (count <= 0) return [];
    return distractorCandidates(target).slice(0, count);
  }

  // Can `target` be spelled by repeatedly using tiles from `tileTexts`? (Tiles are
  // reusable — tapping the same key twice is allowed.) Simple reachability DP over
  // string positions. Used to prune redundant single-letter tiles.
  function canSpell(target, tileTexts) {
    var n = normalize(target), L = n.length;
    if (!L) return true;
    var reach = new Array(L + 1); reach[0] = true;
    for (var i = 0; i < L; i++) {
      if (!reach[i]) continue;
      for (var k = 0; k < tileTexts.length; k++) {
        var tt = tileTexts[k];
        if (tt && n.substr(i, tt.length) === tt) reach[i + tt.length] = true;
      }
    }
    return !!reach[L];
  }

  // Build the display tiles for one word, aiming for a compact NYT-style hive of
  // ~7 keys. Keys = the valid author clusterTiles + only the single letters STILL
  // NEEDED once those clusters are in play (a letter that only ever appears inside
  // a cluster, like the k/n of "kn", is dropped) + distractors. In-word clusters
  // are NOT auto-added — they just bloat the hive; the author picks the meaningful
  // ones per word. Each tile is { text, distractor } where distractor === (text not
  // a substring of the target) — that flag drives the red-flash-don't-insert nudge.
  function buildTiles(word, opts) {
    opts = opts || {};
    var n = normalize(word);

    var clusters = [];
    (opts.clusterTiles || []).forEach(function (c) {
      var cc = normalize(c);
      if (cc.length >= 2 && CLUSTERS.indexOf(cc) >= 0 && n.indexOf(cc) >= 0 && clusters.indexOf(cc) < 0) clusters.push(cc);
    });

    // Start from clusters + every distinct letter, then greedily drop any single
    // whose removal still leaves the word spellable (i.e. a cluster covers it). The
    // question's centre letter is protected so it always survives as a single tile.
    var protect = opts.centerLetter ? normalize(opts.centerLetter) : '';
    var working = clusters.concat(distinctLetters(word));
    distinctLetters(word).forEach(function (s) {
      if (s === protect) return;
      var without = working.filter(function (x) { return x !== s; });
      if (canSpell(n, without)) working = without;
    });

    // The comb is a FIXED 7 keys. A long word doesn't get extra tiles — adjacent
    // letters are merged into 2-letter tiles (e.g. hippopotamus → hi/pp/p/o/ta/mu/s)
    // until the word's own keys fit. When the author supplied distractors, reserve
    // room for them (their contrast is the lesson) and merge one step further.
    var authored = (opts.distractors || [])
      .map(normalize)
      .filter(function (s) { return s && n.indexOf(s) < 0; })
      .slice(0, MAX_DISTRACTORS);
    var coreTarget = Math.max(2, TILE_TARGET - authored.length);
    while (working.length > Math.max(coreTarget, TILE_TARGET - authored.length)) {
      var merged = mergeAdjacentPair(working, n, protect);
      if (!merged) break;
      working = merged;
    }

    var texts = working.slice();
    var distractorCount = 0;
    // Decoys only fill the comb UP to its fixed 7 keys — author-supplied ones first
    // (deliberate contrasts), then auto candidates; never past 7, max 3 decoys.
    function addDecoy(s) {
      s = normalize(s);
      if (!s || texts.indexOf(s) >= 0) return;            // empty or already a tile
      if (distractorCount >= MAX_DISTRACTORS) return;
      if (texts.length >= TILE_TARGET) return;             // comb is full
      texts.push(s); distractorCount++;
    }
    authored.forEach(addDecoy);
    distractorCandidates(word).forEach(addDecoy);

    return shuffle(texts.map(function (txt) {
      return { text: txt, distractor: n.indexOf(txt) < 0 };
    }));
  }

  // One merge step toward the fixed comb size: find two letters that sit next to
  // each other in the word, are both currently single tiles (and not the protected
  // centre letter), and whose fusion into one 2-letter tile keeps the word
  // spellable. Returns the merged tile set, or null when no safe pair exists.
  function mergeAdjacentPair(working, n, protect) {
    for (var i = 0; i < n.length - 1; i++) {
      var a = n[i], b = n[i + 1];
      if (a === b) continue; // fusing a double is count-neutral (1 out, 1 in)
      if (a === protect || b === protect) continue;
      if (working.indexOf(a) < 0 || working.indexOf(b) < 0) continue;
      var bigram = a + b;
      if (working.indexOf(bigram) >= 0) continue;
      var merged = working.filter(function (x) { return x !== a && x !== b; }).concat([bigram]);
      if (canSpell(n, merged)) return merged;
    }
    return null;
  }

  // Honeycomb placement: tile 0 sits in the centre, the rest fan out on concentric
  // hex rings (6, then 12, …) so any tile count reads as a NYT-style flower instead
  // of a wrapped grid. Returns {x,y} px offsets from centre + the box size to fit.
  var TILE_PX = 54; // must match .sb-tile width in styles.css
  function honeycombLayout(n) {
    var pos = [{ x: 0, y: 0 }];
    var rest = n - 1, ring = 1, gap = 6;
    var step = TILE_PX * 0.92 + gap;
    var maxAbs = 0;
    while (rest > 0) {
      var count = Math.min(ring * 6, rest);
      var radius = ring * step;
      var base = -Math.PI / 2;                                  // start at the top
      var stagger = (ring % 2 === 0) ? Math.PI / count : 0;     // offset even rings
      for (var k = 0; k < count; k++) {
        var a = base + stagger + k * (2 * Math.PI / count);
        var x = Math.round(radius * Math.cos(a));
        var y = Math.round(radius * Math.sin(a));
        pos.push({ x: x, y: y });
        maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y));
      }
      rest -= count; ring++;
    }
    return { positions: pos, size: Math.round(2 * (maxAbs + TILE_PX / 2) + 6) };
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

  // Accept a stashed snapshot only if it still matches THIS question (same word
  // count and same targets, in order) and its indices are in range. A mismatch
  // (different question, edited quiz) is ignored so the round just starts fresh.
  function sanitizeResumeState(state, cfg) {
    if (!state || typeof state !== 'object' || !Array.isArray(state.results)) return null;
    if (!cfg || !Array.isArray(cfg.words) || state.results.length !== cfg.words.length) return null;
    for (var i = 0; i < cfg.words.length; i++) {
      var r = state.results[i];
      if (!r || r.target !== cfg.words[i].target) return null;
    }
    if (!state.roundDone) {
      if (typeof state.wordIdx !== 'number' || state.wordIdx < 0 || state.wordIdx >= cfg.words.length) return null;
    }
    return state;
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
    var centerLetterGlobal = mostCommonLetter(cfg.words); // shared hive-centre anchor

    container.innerHTML = '';
    container.classList.add('sb-host');

    if (options.reviewMode && options.savedResult) {
      renderSummary(container, t, options.savedResult);
      return { getResult: function () { return options.savedResult; }, getState: function () { return null; }, isComplete: function () { return true; }, isAnswered: function () { return true; }, destroy: function () {} };
    }
    if (!cfg.words.length) {
      var warn = document.createElement('p');
      warn.className = 'small';
      warn.textContent = t('This Spelling Bee has no words yet.');
      container.appendChild(warn);
      return { getResult: function () { return null; }, getState: function () { return null; }, isComplete: function () { return false; }, isAnswered: function () { return false; }, destroy: function () {} };
    }

    var results = cfg.words.map(function (w) {
      return { target: w.target, guess: '', correct: false, solvedPass: 0, attempts: 0 };
    });

    var wordIdx = -1;      // index into cfg.words (words are played in order)
    var attempt = 0;       // 1..MAX_PASSES — current word's attempt number (= help level)
    var current = -1;      // alias of wordIdx for the shared tile/answer helpers
    var phase = 'input';   // 'input' = entering a guess, 'reveal' = showing the result
    var advanceAction = null; // 'retry' (same word, more help) | 'next' (next word/results)
    var guess = '';
    var roundDone = false;
    var started = false;   // first real submission → question becomes "answered"
    var startedAt = Date.now();
    var currentTiles = [];
    var tileBtns = {};

    function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
    function button(cls, label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sb-btn ' + cls; b.textContent = label; return b; }
    // The ↵ keycap follows the Enter key: it sits on Submit while typing and on the
    // advance button while a result is shown. Only one of those is ever visible at a
    // time, so the hint always points at what Enter does right now.
    function setEnterLabel(btn, label) {
      btn.textContent = label;
      btn.appendChild(document.createTextNode(' '));
      var kb = document.createElement('kbd'); kb.className = 'sb-kbd'; kb.textContent = '↵';
      btn.appendChild(kb);
    }

    var root = el('div', 'sb-game');
    var header = el('div', 'sb-header');
    var featureEl = el('span', 'sb-feature'); featureEl.textContent = cfg.feature || '';
    var progressEl = el('span', 'sb-progress');
    // Play word lives inline, right of the "Word n of m" progress (Repeat removed —
    // it did the exact same thing).
    var playBtn = button('sb-play', t('🔊 Play word'));
    header.append(featureEl, progressEl, playBtn);
    var answerEl = el('div', 'sb-answer');
    var controls = el('div', 'sb-controls');
    var backBtn = button('sb-backspace', t('⌫'));
    var clearBtn = button('sb-clear', t('Clear'));
    var submitBtn = button('sb-submit btn-primary', t('Submit'));
    setEnterLabel(submitBtn, t('Submit'));
    controls.append(backBtn, clearBtn, submitBtn);
    var advanceRow = el('div', 'sb-advance-row hidden');
    var advanceBtn = button('sb-advance btn-primary', t('Next'));
    advanceRow.append(advanceBtn);
    var circleEl = el('div', 'sb-circle');
    var ladderEl = el('div', 'sb-ladder hidden');
    var feedbackEl = el('div', 'sb-feedback'); feedbackEl.setAttribute('aria-live', 'polite');
    // Order mirrors NYT Spelling Bee: clue/answer on top, the hive, then the action
    // buttons (Backspace / Clear / Submit, or the advance button) BELOW the hive.
    root.append(header, answerEl, circleEl, controls, advanceRow, ladderEl, feedbackEl);
    container.appendChild(root);

    // Help escalates with the attempt number on the SAME word (no list-wide passes).
    function passHelp() { return attempt >= 3 ? 'trace' : (attempt === 2 ? 'length' : 'none'); }

    function showInputPhase() {
      phase = 'input';
      playBtn.classList.remove('hidden');
      answerEl.classList.remove('hidden');
      controls.classList.remove('hidden');
      circleEl.classList.remove('hidden');
      circleEl.classList.remove('sb-locked');
      advanceRow.classList.add('hidden');
    }
    function showRevealPhase(label) {
      phase = 'reveal';
      controls.classList.add('hidden');
      // Keep the hive on screen (just locked) so the answer row stays put instead of
      // the whole block reflowing/recentring when the keys vanish.
      circleEl.classList.add('sb-locked');
      setEnterLabel(advanceBtn, label);
      advanceRow.classList.remove('hidden');
    }

    function speak() {
      var w = cfg.words[current];
      if (!w) return;
      playBtn.disabled = true;
      root.classList.add('sb-speaking');
      var spoken = (w.audioText && w.audioText.trim()) ? w.audioText : w.target;
      Promise.resolve(playWord(spoken, voice)).then(function () {
        playBtn.disabled = false;
        root.classList.remove('sb-speaking');
      });
    }

    function renderAnswer(statuses) {
      answerEl.innerHTML = '';
      var letters = guess.split('');
      var count = letters.length;
      for (var i = 0; i < letters.length; i++) {
        var cell = el('span', 'sb-cell');
        cell.textContent = letters[i];
        if (statuses && statuses[i]) cell.classList.add('sb-' + statuses[i]);
        answerEl.appendChild(cell);
      }
      if (passHelp() !== 'none') { // pass 2 & 3 reveal the letter count
        var remain = normalize(cfg.words[current].target).length - normalize(guess).length;
        for (var j = 0; j < remain; j++) answerEl.appendChild(el('span', 'sb-cell sb-empty'));
        count += Math.max(0, remain);
      }
      // Cell count drives CSS sizing: long words shrink their cells to keep the
      // whole answer on ONE line (no wrapping mid-word) within the page width.
      answerEl.style.setProperty('--sb-cells', Math.max(1, count));
    }

    function renderCircle() {
      circleEl.innerHTML = ''; tileBtns = {};
      var w = cfg.words[current];
      var centerLetter = centerLetterForWord(w.target, centerLetterGlobal);
      currentTiles = buildTiles(w.target, { distractors: w.distractors, clusterTiles: w.clusterTiles, centerLetter: centerLetter });
      // Pull the chosen centre letter to index 0 so it lands on the gold centre hex.
      if (centerLetter) {
        for (var ci = 1; ci < currentTiles.length; ci++) {
          if (currentTiles[ci].text === centerLetter) {
            currentTiles.unshift(currentTiles.splice(ci, 1)[0]);
            break;
          }
        }
      }
      var layout = honeycombLayout(currentTiles.length);
      circleEl.style.width = layout.size + 'px';
      circleEl.style.height = layout.size + 'px';
      currentTiles.forEach(function (tile, i) {
        var b = el('button', 'sb-tile' + (i === 0 ? ' sb-tile-center' : ''));
        b.type = 'button';
        var p = layout.positions[i];
        b.style.setProperty('--tx', p.x + 'px');
        b.style.setProperty('--ty', p.y + 'px');
        var lab = el('span', 'sb-tile-label'); lab.textContent = tile.text;
        b.appendChild(lab);
        b.dataset.distractor = tile.distractor ? '1' : '0';
        b.addEventListener('click', function () { onTile(tile, b); });
        tileBtns[tile.text] = b;
        circleEl.appendChild(b);
      });
    }

    function flash(btn) { if (!btn) return; btn.classList.remove('sb-flash'); void btn.offsetWidth; btn.classList.add('sb-flash'); }
    // Quick scale-pop when a tile's letter lands in the answer row — tactile juice.
    function pop(btn) { if (!btn) return; btn.classList.remove('sb-pop'); void btn.offsetWidth; btn.classList.add('sb-pop'); }

    function onTile(tile, btn) {
      if (roundDone || phase !== 'input' || current < 0) return;
      if (passHelp() === 'trace') {
        // Only the next correct letter(s) are accepted; anything else flashes red.
        var cand = normalize(guess + tile.text);
        var tgt = normalize(cfg.words[current].target);
        if (cand.length <= tgt.length && tgt.indexOf(cand) === 0) {
          guess += tile.text; feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback'; renderAnswer(); pop(btn);
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
      guess += tile.text; feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback'; renderAnswer(); pop(btn);
    }

    // The hive tile whose key the typed letter should activate: an exact single
    // tile if there is one, otherwise the (non-distractor) cluster tile that contains
    // the letter — so typing the k of "kn" lights up the kn tile. null if the letter
    // isn't available at all.
    function displayTileForLetter(letter) {
      var cluster = null;
      for (var i = 0; i < currentTiles.length; i++) {
        var tt = currentTiles[i];
        if (tt.distractor) continue;
        if (tt.text === letter) return tileBtns[tt.text];           // exact single tile
        if (!cluster && tt.text.length > 1 && tt.text.indexOf(letter) >= 0) cluster = tt;
      }
      return cluster ? tileBtns[cluster.text] : null;
    }

    // Physical typing is forgiving: any letter that belongs to a non-distractor tile
    // — including a letter that only lives inside a cluster (the k/n of "kn") — is
    // appended one at a time, in any order, so the keystroke always visibly lands and
    // its tile pops. Letters not available in the hive do nothing. Routed through
    // onTile so trace mode + length limits still apply.
    function typeLetter(letter) {
      var host = displayTileForLetter(letter);
      if (!host) return false;
      onTile({ text: letter, distractor: false }, host);
      return true;
    }

    // Physical keyboard. Enter submits, Backspace deletes, letters type (see above).
    function onKey(e) {
      if (roundDone || current < 0) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (phase === 'reveal') {
        if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); advance(); }
        return;
      }
      if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); return; }
      if (k === 'Backspace') { e.preventDefault(); e.stopPropagation(); if (guess) { guess = guess.slice(0, -1); renderAnswer(); } return; }
      if (k && k.length === 1 && /[a-z]/i.test(k)) {
        // Swallow EVERY letter while spelling — even off-hive ones that insert
        // nothing. A leaked letter would otherwise trigger the host's single-key
        // hotkeys ('p' replays the question audio and ducks the ambient loop).
        e.preventDefault(); e.stopPropagation();
        typeLetter(normalize(k));
      }
    }

    function startWord(idx) {
      wordIdx = idx; current = idx; attempt = 1;
      beginAttempt();
    }

    // Start (or retry) the current word at the current attempt's help level.
    function beginAttempt() {
      guess = '';
      feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback';
      progressEl.textContent = t('Word {n} of {total}', { n: wordIdx + 1, total: cfg.words.length })
        + (attempt > 1 ? ' · ' + t('try {n}', { n: attempt }) : '');
      submitBtn.disabled = false;
      showInputPhase();
      renderAnswer(); renderCircle(); speak();
    }

    // Paint the result of the current guess: Wordle colours, feedback line, and
    // the advance button. Pure UI derived from {current word, guess, attempt}, so
    // it can be replayed verbatim when a half-finished round is restored after the
    // student navigates away and back.
    function renderReveal() {
      var w = cfg.words[current];
      var ok = gradeWord(w.target, guess);
      renderAnswer(wordleStatuses(guess, w.target));
      var lastWord = wordIdx >= cfg.words.length - 1;
      if (ok) {
        // "Correct!" rides on the advance button itself (no separate line) — saves a
        // whole row of vertical space; the green cells reinforce it.
        feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback';
        advanceAction = 'next';
        showRevealPhase(t('✓ Correct!') + ' ' + (lastWord ? t('See results →') : t('Next word →')));
      } else if (attempt < MAX_PASSES) {
        // No "not quite" line — the red cells + the "Try again →" button say it.
        feedbackEl.textContent = ''; feedbackEl.className = 'sb-feedback';
        advanceAction = 'retry';
        showRevealPhase(t('Try again →'));
      } else {
        feedbackEl.textContent = t('The correct spelling is: {word}', { word: w.target }); feedbackEl.className = 'sb-feedback sb-bad';
        advanceAction = 'next';
        showRevealPhase(lastWord ? t('See results →') : t('Next word →'));
      }
    }

    function submit() {
      if (roundDone || phase !== 'input' || current < 0) return;
      if (!normalize(guess)) { feedbackEl.textContent = t('Tap letters to spell the word first.'); feedbackEl.className = 'sb-feedback sb-bad'; return; }
      started = true;
      var w = cfg.words[current];
      var rec = results[current];
      rec.attempts = attempt;
      rec.guess = guess;
      if (gradeWord(w.target, guess)) { rec.correct = true; rec.solvedPass = attempt; }
      else if (attempt >= MAX_PASSES) { rec.correct = false; rec.solvedPass = 0; }
      renderReveal();
      if (options.onChange) options.onChange();
    }

    // Student-controlled advance — nothing auto-clears, so they can read the
    // reveal. Either retry the SAME word with more help, or move to the next word.
    function advance() {
      if (roundDone || phase !== 'reveal') return;
      if (advanceAction === 'retry') { attempt++; beginAttempt(); return; }
      if (wordIdx >= cfg.words.length - 1) { finalize(); return; }
      startWord(wordIdx + 1);
    }

    // The finished-round view (ladder + per-word list). Split from finalize() so a
    // restored already-complete round can show it WITHOUT re-firing the completion
    // callbacks (which would spuriously re-mark the answer dirty).
    function showFinalized() {
      roundDone = true;
      phase = 'reveal';
      playBtn.classList.add('hidden');
      controls.classList.add('hidden');
      advanceRow.classList.add('hidden');
      circleEl.classList.add('hidden');
      answerEl.classList.add('hidden');
      circleEl.innerHTML = '';
      answerEl.innerHTML = '';
      renderLadder(getResult());
    }

    function finalize() {
      showFinalized();
      var result = getResult();
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
        pass: attempt,
        elapsedMs: Date.now() - startedAt,
      };
    }

    // Serialisable snapshot of an in-progress (or finished) round, so the host can
    // stash it on navigate-away and hand it back via options.resumeState. Returns
    // null while the round is still pristine (nothing worth restoring).
    function getState() {
      if (!started && !roundDone && !normalize(guess) && wordIdx <= 0) return null;
      return {
        v: 1,
        results: results.map(function (r) { return { target: r.target, guess: r.guess, correct: r.correct, solvedPass: r.solvedPass, attempts: r.attempts }; }),
        wordIdx: wordIdx, attempt: attempt, phase: phase, advanceAction: advanceAction,
        guess: guess, roundDone: roundDone, started: started, startedAt: startedAt,
      };
    }

    // Rehydrate from a snapshot (already validated against this question). Restores
    // the exact word/attempt and replays the input or reveal view; a finished round
    // jumps straight to the results. Deliberately does NOT auto-speak — flipping
    // back to a question shouldn't blast audio; the student can hit Play.
    function restoreFrom(s) {
      for (var i = 0; i < results.length && i < s.results.length; i++) {
        var sr = s.results[i];
        results[i].guess = sr.guess || '';
        results[i].correct = !!sr.correct;
        results[i].solvedPass = sr.solvedPass || 0;
        results[i].attempts = sr.attempts || 0;
      }
      started = !!s.started;
      startedAt = s.startedAt || Date.now();
      if (s.roundDone) { showFinalized(); return; }
      wordIdx = s.wordIdx; current = wordIdx; attempt = s.attempt || 1;
      guess = s.guess || '';
      progressEl.textContent = t('Word {n} of {total}', { n: wordIdx + 1, total: cfg.words.length })
        + (attempt > 1 ? ' · ' + t('try {n}', { n: attempt }) : '');
      submitBtn.disabled = false;
      renderCircle();
      if (s.phase === 'reveal' && normalize(guess)) {
        renderReveal();
      } else {
        showInputPhase();
        renderAnswer();
      }
    }

    playBtn.addEventListener('click', speak);
    backBtn.addEventListener('click', function () { if (phase === 'input' && guess) { guess = guess.slice(0, -1); renderAnswer(); } });
    clearBtn.addEventListener('click', function () { if (phase === 'input') { guess = ''; renderAnswer(); } });
    submitBtn.addEventListener('click', submit);
    advanceBtn.addEventListener('click', advance);
    document.addEventListener('keydown', onKey, true); // capture so it beats host key handlers

    var resume = sanitizeResumeState(options.resumeState, cfg);
    if (resume) restoreFrom(resume); else startWord(0);

    return {
      getResult: getResult,
      getState: getState,
      isComplete: function () { return roundDone; },
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
    canSpell: canSpell,
    mostCommonLetter: mostCommonLetter,
    centerLetterForWord: centerLetterForWord,
    honeycombLayout: honeycombLayout,
    gradeWord: gradeWord,
    wordleStatuses: wordleStatuses,
    passWeight: passWeight,
    scoreRound: scoreRound,
    ladderRank: ladderRank,
    normalizeConfig: normalizeConfig,
    validateConfig: validateConfig,
    sanitizeResumeState: sanitizeResumeState,
    defaultQuestion: defaultQuestion,
    makeEdgeTtsPlayer: makeEdgeTtsPlayer,
    render: render,
  };

})(typeof window !== 'undefined' ? window : this);
