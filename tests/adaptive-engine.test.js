const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine, seeded, simulate } = require('./helpers/adaptive-sim');
const { questions: VERBS } = require('./fixtures/adaptive-irregular-verbs');

// Adaptive mode, phase 2: the engine in cloudflare/worker.js (ADAPTIVE_MODE_PLAN.md §4).
let E;
before(() => { E = loadEngine(); });

const plain = (v) => JSON.parse(JSON.stringify(v));
const q = (cefr, type = 'mcq') => ({ type, cefr });
const levelOf = (st) => st.bands[E.adaptiveBand(st)];

describe('bands come from the levels the quiz contains', () => {
  it('uses all six levels of a full quiz', () => {
    const eligible = E.arenaEligibleIndexes({ quiz: { questions: VERBS } });
    const { bands, pool } = E.adaptivePool(VERBS, eligible);
    assert.deepEqual(plain(bands), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    assert.equal(pool.length, 100);
  });

  it('skips untagged, poll and teacher-graded questions', () => {
    const qs = [q('A1'), q(''), { type: 'mcq', cefr: 'B1', isPoll: true }, q('B2', 'open'), { type: 'text', cefr: 'C1', accepted: [] }, q('B1')];
    const { bands, pool } = E.adaptivePool(qs, E.arenaEligibleIndexes({ quiz: { questions: qs } }));
    assert.deepEqual(plain(bands), ['A1', 'B1']);
    assert.deepEqual(plain(pool.map((p) => p.qi)), [0, 5]);
  });

  it('moves across gaps: a quiz with A1, B1 and C1 goes A1 → B1 → C1', () => {
    const qs = [q('A1'), q('A1'), q('B1'), q('B1'), q('C1'), q('C1')];
    const { bands, pool } = E.adaptivePool(qs, [0, 1, 2, 3, 4, 5]);
    const st = E.adaptiveInit(bands);
    const rng = seeded(3);
    const seen = [];
    for (let i = 0; i < 6; i++) {
      const qi = E.adaptiveNext(st, pool, rng);
      seen.push(qs[qi].cefr);
      E.adaptiveRecord(st, qi, pool.find((p) => p.qi === qi).band, true, rng);
    }
    assert.equal(seen[0], 'A1');
    assert.ok(seen.includes('B1'));
    assert.equal(levelOf(st), 'C1');
  });
});

describe('level movement', () => {
  it('starts at the lowest level and stays inside the quiz levels', () => {
    const st = E.adaptiveInit(['A2', 'B1', 'B2']);
    assert.equal(levelOf(st), 'A2');
    for (let i = 0; i < 10; i++) E.adaptiveRecord(st, i, 0, false, seeded(1));
    assert.equal(levelOf(st), 'A2');
    for (let i = 0; i < 20; i++) E.adaptiveRecord(st, i, 2, true, seeded(1));
    assert.equal(levelOf(st), 'B2');
  });

  it('climbs a whole level per right answer until the first miss or 4 answers', () => {
    const st = E.adaptiveInit(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    const levels = [];
    for (let i = 0; i < 4; i++) {
      E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(1));
      levels.push(levelOf(st));
    }
    assert.deepEqual(levels, ['A2', 'B1', 'B2', 'C1']);
    assert.equal(st.warm, false);
  });

  it('after the first miss, needs about three right answers per level', () => {
    const st = E.adaptiveInit(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    E.adaptiveRecord(st, 0, 0, true, seeded(1));  // A1 right -> A2
    E.adaptiveRecord(st, 1, 1, false, seeded(1)); // A2 miss: warm-up over
    assert.equal(levelOf(st), 'A2');
    const levels = [];
    for (let i = 2; i < 5; i++) {
      E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(1));
      levels.push(levelOf(st));
    }
    assert.deepEqual(levels, ['A2', 'A2', 'B1']);
  });

  it('two misses drop a level, and three in a row drop faster', () => {
    const st = E.adaptiveInit(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    st.score = 3.9; // top of B2
    E.adaptiveRecord(st, 1, 3, false, seeded(1));
    assert.equal(levelOf(st), 'B2');
    E.adaptiveRecord(st, 2, 3, false, seeded(1));
    assert.equal(levelOf(st), 'B1');
    E.adaptiveRecord(st, 3, 2, false, seeded(1));
    assert.equal(levelOf(st), 'A2'); // 3rd miss in a row: extra drop
  });

  it('counts partial rounds as a success from 70%', () => {
    assert.equal(E.adaptiveIsSuccess({ correct: true }), true);
    assert.equal(E.adaptiveIsSuccess({ correct: false, partialScore: 4, partialTotal: 5 }), true);
    assert.equal(E.adaptiveIsSuccess({ correct: false, partialScore: 0.7, partialTotal: 1 }), true);
    assert.equal(E.adaptiveIsSuccess({ correct: false, partialScore: 3, partialTotal: 5 }), false);
    assert.equal(E.adaptiveIsSuccess({ correct: false }), false);
  });
});

describe('state size', () => {
  it('keeps the last 200 answers but counts every answer per level', () => {
    const st = E.adaptiveInit(['A1', 'A2']);
    for (let i = 0; i < 2500; i++) E.adaptiveRecord(st, i % 7, i % 2, i % 3 !== 0, seeded(i));
    assert.equal(st.path.length, 200);
    assert.equal(st.answered, 2500);
    assert.equal(st.perLevel.A1.answered + st.perLevel.A2.answered, 2500);
  });
});

describe('question choice', () => {
  it('never serves the same question twice in a row', () => {
    for (const ability of [-1, 1, 2.5, 4, 6]) {
      const { served } = simulate(E, VERBS, { ability, seconds: 3000, seed: 7 });
      for (let i = 1; i < served.length; i++) assert.notEqual(served[i], served[i - 1]);
    }
  });

  it('brings a missed question back after 2–3 others', () => {
    const qs = Array.from({ length: 12 }, () => q('A1'));
    const { bands, pool } = E.adaptivePool(qs, qs.map((_, i) => i));
    const st = E.adaptiveInit(bands);
    const rng = seeded(11);
    const first = E.adaptiveNext(st, pool, rng);
    E.adaptiveRecord(st, first, 0, false, rng);
    let gap = 0;
    for (;;) {
      const qi = E.adaptiveNext(st, pool, rng);
      if (qi === first) break;
      E.adaptiveRecord(st, qi, 0, true, rng);
      gap += 1;
      assert.ok(gap <= 3, 'missed question should be back within 3');
    }
    assert.ok(gap >= 2);
  });

  it('prefers questions the student has not seen yet', () => {
    const qs = Array.from({ length: 8 }, () => q('A1'));
    const { bands, pool } = E.adaptivePool(qs, qs.map((_, i) => i));
    const st = E.adaptiveInit(bands);
    const rng = seeded(5);
    const served = [];
    for (let i = 0; i < 8; i++) {
      const qi = E.adaptiveNext(st, pool, rng);
      served.push(qi);
      E.adaptiveRecord(st, qi, 0, true, rng);
    }
    assert.equal(new Set(served).size, 8);
  });

  it('holds back a missed question until the student is back at its level', () => {
    const qs = [q('A1'), q('A1'), q('A1'), q('A2'), q('A2'), q('A2')];
    const { bands, pool } = E.adaptivePool(qs, qs.map((_, i) => i));
    const st = E.adaptiveInit(bands);
    const rng = seeded(2);
    E.adaptiveRecord(st, 0, 0, true, rng);  // up to A2
    E.adaptiveRecord(st, 3, 1, false, rng); // miss an A2 question
    E.adaptiveRecord(st, 4, 1, false, rng); // and another: back to A1
    assert.equal(levelOf(st), 'A1');
    for (let i = 0; i < 4; i++) {
      const qi = E.adaptiveNext(st, pool, rng);
      assert.equal(qs[qi].cefr, 'A1', 'no A2 retries while working at A1');
      E.adaptiveRecord(st, qi, 0, false, rng);
    }
  });
});

describe('simulated 5-minute Cup on the irregular-verbs quiz', () => {
  // Eight games per student type; "usual level" = where they spent most of
  // the second half. Allow one level of luck either way in a few games.
  const usual = (ability) => [1, 2, 3, 4, 5, 6, 7, 8]
    .map((seed) => E.adaptiveUsualLevel(simulate(E, VERBS, { ability, seed }).st));
  const share = (levels, allowed) => levels.filter((l) => allowed.includes(l)).length / levels.length;

  it('a strong student works at C1–C2', () => {
    const levels = usual(5);
    assert.ok(share(levels, ['C1', 'C2']) >= 0.75, levels.join(' '));
    assert.ok(share(levels, ['B2', 'C1', 'C2']) === 1, levels.join(' '));
  });

  it('a struggling student works at A1–A2', () => {
    const levels = usual(0);
    assert.ok(share(levels, ['A1', 'A2']) >= 0.75, levels.join(' '));
    assert.ok(share(levels, ['A1', 'A2', 'B1']) === 1, levels.join(' '));
  });

  it('an average student works around B1', () => {
    const levels = usual(2);
    assert.ok(share(levels, ['A2', 'B1', 'B2']) >= 0.75, levels.join(' '));
  });
});
