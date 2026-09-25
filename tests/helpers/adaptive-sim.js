/*
 * Loads the REAL adaptive engine out of cloudflare/worker.js and simulates
 * students playing a timed Cup round, so the level rules can be judged on a
 * real quiz shape before a class sees them.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./extract-declaration');

const WORKER_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'cloudflare', 'worker.js'), 'utf8');

function loadEngine() {
  return loadDeclarations(WORKER_SRC, [
    'CEFR_LEVELS', 'normalizeCefrLevel', 'clamp', 'isTeacherGradedTextQuestion', 'arenaEligibleIndexes',
    'ADAPTIVE_START', 'ADAPTIVE_WARMUP', 'ADAPTIVE_UP_WARMUP', 'ADAPTIVE_UP', 'ADAPTIVE_DOWN',
    'ADAPTIVE_STREAK_DOWN', 'ADAPTIVE_SUCCESS_FRACTION', 'ADAPTIVE_RETRY_GAPS', 'ADAPTIVE_PATH_MAX',
    'adaptivePool', 'adaptiveInit', 'adaptiveBand', 'adaptiveIsSuccess', 'adaptiveRecord', 'adaptiveNext', 'adaptiveUsualLevel',
  ]);
}

// Deterministic RNG (mulberry32) so simulated runs are repeatable.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rough seconds a student spends on each type, including the result screen.
const SECONDS = { mcq: 9, tf: 7, multi: 13, match_pairs: 22, puzzle: 16, text: 13, error_hunt: 16, spellingbee: 50, wordle: 65 };
const CHEST_SECONDS = 6; // Cup opens a chest after every 2 right answers

// A student with `ability` on the 0..5 CEFR scale (0 = A1, 5 = C2) answers a
// question of CEFR index `level` correctly with a logistic probability.
function pSuccess(ability, level) {
  return 1 / (1 + Math.exp(-1.4 * (ability + 0.5 - level)));
}

function simulate(E, questions, { ability, seconds = 300, seed = 1 }) {
  const rng = seeded(seed);
  const eligible = E.arenaEligibleIndexes({ quiz: { questions } });
  const { bands, pool } = E.adaptivePool(questions, eligible);
  const st = E.adaptiveInit(bands);
  let clock = 0;
  let rightSinceChest = 0;
  const served = [];
  while (clock < seconds) {
    const qi = E.adaptiveNext(st, pool, rng);
    if (qi == null) break;
    const q = questions[qi];
    const level = E.CEFR_LEVELS.indexOf(q.cefr);
    const ok = rng() < pSuccess(ability, level);
    E.adaptiveRecord(st, qi, bands.indexOf(q.cefr), ok, rng);
    served.push(qi);
    clock += SECONDS[q.type] || 12;
    if (ok && ++rightSinceChest >= 2) { rightSinceChest = 0; clock += CHEST_SECONDS; }
  }
  return { st, served, bands };
}

module.exports = { loadEngine, seeded, simulate, pSuccess, SECONDS };
