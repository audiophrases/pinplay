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
const ALL = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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

  it('a new student climbs about a whole level per right answer', () => {
    const st = E.adaptiveInit(ALL);
    const levels = [];
    for (let i = 0; i < 4; i++) {
      E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(1));
      levels.push(levelOf(st));
    }
    assert.deepEqual(levels, ['A2', 'B1', 'B2', 'C1']);
  });

  it('a new student also drops fast: one miss costs about a level', () => {
    const st = E.adaptiveInit(ALL);
    for (let i = 0; i < 3; i++) E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(1));
    assert.equal(levelOf(st), 'B2');
    E.adaptiveRecord(st, 3, 3, false, seeded(1));
    assert.equal(levelOf(st), 'B1');
  });

  it('a settled level (~50 answers) needs about three right answers per level', () => {
    const st = E.adaptiveInit(ALL, { cefr: 1, answered: 50 }); // bottom of A2
    const levels = [];
    for (let i = 0; i < 3; i++) {
      E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(1));
      levels.push(levelOf(st));
    }
    assert.deepEqual(levels, ['A2', 'A2', 'B1']);
  });

  it('steps keep shrinking as answers pile up', () => {
    assert.ok(E.adaptiveStepScale(0) > E.adaptiveStepScale(10));
    assert.ok(E.adaptiveStepScale(10) > E.adaptiveStepScale(50));
    assert.ok(E.adaptiveStepScale(50) > E.adaptiveStepScale(500));
    assert.ok(E.adaptiveStepScale(5000) >= E.ADAPTIVE_STEP_SETTLED);
    // 200 answers in: three right answers from the bottom of A2 stay in A2,
    // and two misses at the top of B2 stay in B2.
    const up = E.adaptiveInit(ALL, { cefr: 1, answered: 200 });
    for (let i = 0; i < 3; i++) E.adaptiveRecord(up, i, E.adaptiveBand(up), true, seeded(1));
    assert.equal(levelOf(up), 'A2');
    const down = E.adaptiveInit(ALL, { cefr: 3.9, answered: 200 });
    for (let i = 0; i < 2; i++) E.adaptiveRecord(down, i, 3, false, seeded(1));
    assert.equal(levelOf(down), 'B2');
  });

  it('two misses drop a settled level, and three in a row drop faster', () => {
    const st = E.adaptiveInit(ALL, { cefr: 3.9, answered: 50 }); // top of B2
    E.adaptiveRecord(st, 1, 3, false, seeded(1));
    assert.equal(levelOf(st), 'B2');
    E.adaptiveRecord(st, 2, 3, false, seeded(1));
    assert.equal(levelOf(st), 'B1');
    E.adaptiveRecord(st, 3, 2, false, seeded(1));
    assert.equal(levelOf(st), 'A2'); // 3rd miss in a row: extra drop
  });

  it('after a drop, a struggling student spends fewer questions on the level above', () => {
    // Right at A1, wrong at A2 (the pattern from the owner's first Cup test).
    const st = E.adaptiveInit(['A1', 'A2', 'B1']);
    let above = 0;
    for (let i = 0; i < 40; i++) {
      const band = E.adaptiveBand(st);
      if (band > 0) above += 1;
      E.adaptiveRecord(st, i, band, band === 0, seeded(i));
    }
    assert.ok(above / 40 < 0.4, `share above level ${above / 40}`);
    assert.ok(above / 40 > 0.33, `share above level ${above / 40}`);
  });

  it('partial rounds: right from 70%, neutral from 40%, wrong below', () => {
    assert.equal(E.adaptiveOutcome({ correct: true }), 'right');
    assert.equal(E.adaptiveOutcome({ correct: false, partialScore: 4, partialTotal: 5 }), 'right');
    assert.equal(E.adaptiveOutcome({ correct: false, partialScore: 0.7, partialTotal: 1 }), 'right');
    assert.equal(E.adaptiveOutcome({ correct: false, partialScore: 3, partialTotal: 5 }), 'neutral');
    assert.equal(E.adaptiveOutcome({ correct: false, partialScore: 2, partialTotal: 5 }), 'neutral');
    assert.equal(E.adaptiveOutcome({ correct: false, partialScore: 1, partialTotal: 5 }), 'wrong');
    assert.equal(E.adaptiveOutcome({ correct: false }), 'wrong');
  });

  it('teacher grades use the same bands (a 1000-point question)', () => {
    const at = (points) => E.adaptiveOutcomeFromFraction(points / 1000);
    assert.equal(at(1000), 'right');
    assert.equal(at(750), 'right');
    assert.equal(at(700), 'right');
    assert.equal(at(699), 'neutral');
    assert.equal(at(500), 'neutral');
    assert.equal(at(400), 'neutral');
    assert.equal(at(399), 'wrong');
    assert.equal(at(250), 'wrong');
    assert.equal(at(0), 'wrong');
  });

  it('a neutral answer steadies the level without moving it', () => {
    const st = E.adaptiveInit(ALL, { cefr: 2.5, answered: 10 });
    const scaleBefore = E.adaptiveStepScale(st.prior + st.answered);
    E.adaptiveRecord(st, 1, 2, 'neutral', seeded(1));
    assert.equal(st.score, 2.5);
    assert.equal(st.answered, 1);
    assert.ok(E.adaptiveStepScale(st.prior + st.answered) < scaleBefore, 'steps got smaller');
    assert.equal(st.retry.length, 0, 'no retry for a neutral answer');
    assert.equal(st.perLevel.B1.answered, 1);
    assert.equal(st.perLevel.B1.right, 0);
    assert.equal(st.perLevel.B1.neutral, 1);
    assert.match(E.adaptiveSummary(st).path, /B1~/);
  });

  it('a neutral answer breaks a run of misses', () => {
    const st = E.adaptiveInit(ALL, { cefr: 3.9, answered: 50 });
    E.adaptiveRecord(st, 1, 3, false, seeded(1));
    E.adaptiveRecord(st, 2, 3, false, seeded(1));
    E.adaptiveRecord(st, 3, 2, 'neutral', seeded(1));
    const before = st.score;
    E.adaptiveRecord(st, 4, 2, false, seeded(1));
    assert.ok(before - st.score < 0.6, 'no extra drop: not three misses in a row');
  });
});

describe('saved level carries over between sessions', () => {
  it('starts a returning student at their saved level', () => {
    const st = E.adaptiveInit(ALL, { cefr: 2.4, answered: 30 });
    assert.equal(levelOf(st), 'B1');
    assert.equal(st.prior, 30);
    assert.ok(Math.abs(E.adaptiveCefr(st) - 2.4) < 1e-9);
  });

  it('places a saved level the quiz lacks at the nearest level it has', () => {
    // Above the quiz: top of its highest level.
    const high = E.adaptiveInit(['A1', 'A2', 'B1'], { cefr: 4.5, answered: 40 });
    assert.equal(levelOf(high), 'B1');
    assert.equal(high.score, 2.99);
    // Below the quiz: bottom of its lowest level.
    const low = E.adaptiveInit(['B1', 'B2', 'C1'], { cefr: 0.5, answered: 40 });
    assert.equal(levelOf(low), 'B1');
    assert.equal(low.score, 0);
    // In a gap: B1 on an A1 / B2 / C1 quiz goes to B2 (one step) not A1 (two).
    assert.equal(levelOf(E.adaptiveInit(['A1', 'B2', 'C1'], { cefr: 2.5, answered: 40 })), 'B2');
    // Equally far: the easier one.
    assert.equal(levelOf(E.adaptiveInit(['A2', 'B2'], { cefr: 2.5, answered: 40 })), 'A2');
  });

  it('ignores a missing or broken saved level', () => {
    for (const saved of [null, {}, { cefr: 'x' }]) {
      const st = E.adaptiveInit(ALL, saved);
      assert.equal(st.score, E.ADAPTIVE_START);
      assert.equal(st.prior, 0);
    }
  });

  it('saves nothing for a session without answers', () => {
    assert.equal(E.adaptiveSessionResult(E.adaptiveInit(ALL)), null);
  });

  it('adds the session answers and takes the session level', () => {
    const st = E.adaptiveInit(ALL, { cefr: 1.5, answered: 12 });
    for (let i = 0; i < 5; i++) E.adaptiveRecord(st, i, E.adaptiveBand(st), true, seeded(i));
    const saved = E.adaptiveMergeSaved({ cefr: 1.5, answered: 12 }, E.adaptiveSessionResult(st), 99);
    assert.equal(saved.answered, 17);
    assert.equal(saved.updatedAt, 99);
    assert.ok(saved.cefr > 1.5);
    assert.equal(saved.cefr, Math.round(E.adaptiveCefr(st) * 100) / 100);
    // A first session just takes the result.
    assert.equal(E.adaptiveMergeSaved(null, { cefr: 2.345, answered: 8, bottom: 0, top: 5 }).cefr, 2.35);
  });

  it('keeps a saved level the quiz could not reach, unless the student fell off its edge', () => {
    const quiz = { bottom: 1, top: 3 }; // A2–B2
    const c1 = { cefr: 4.5, answered: 60 };
    // Held the top level (B2): the quiz couldn't test C1, keep C1.
    assert.equal(E.adaptiveMergeSaved(c1, { ...quiz, cefr: 3.99, answered: 15 }).cefr, 4.5);
    assert.equal(E.adaptiveMergeSaved(c1, { ...quiz, cefr: 3.2, answered: 15 }).cefr, 4.5);
    // Fell back to B1: that is real evidence, take it.
    assert.equal(E.adaptiveMergeSaved(c1, { ...quiz, cefr: 2.6, answered: 15 }).cefr, 2.6);
    const a1 = { cefr: 0.4, answered: 60 };
    // Stayed in the bottom level (A2): keep A1.
    assert.equal(E.adaptiveMergeSaved(a1, { ...quiz, cefr: 1.7, answered: 15 }).cefr, 0.4);
    // Climbed to B1: take it.
    assert.equal(E.adaptiveMergeSaved(a1, { ...quiz, cefr: 2.1, answered: 15 }).cefr, 2.1);
  });

  it('a strong returning student works at C1–C2 from the first questions', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { st } = simulate(E, VERBS, { ability: 5, seed, saved: { cefr: 4.5, answered: 60 } });
      const first = st.path.slice(0, 5).map((p) => p.band);
      assert.ok(first.every((b) => ['C1', 'C2'].includes(b)), first.join(' '));
    }
  });

  it('over several Cups a student settles: fewer level changes than in the first', () => {
    const changes = (st) => st.path.slice(1).filter((p, i) => p.band !== st.path[i].band).length;
    let first = 0;
    let fifth = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let saved = null;
      for (let k = 0; k < 5; k++) {
        const { st } = simulate(E, VERBS, { ability: 2, seed: seed * 10 + k, saved });
        if (k === 0) first += changes(st);
        if (k === 4) fifth += changes(st);
        saved = E.adaptiveMergeSaved(saved, E.adaptiveSessionResult(st));
      }
    }
    assert.ok(fifth < first * 0.75, `first ${first}, fifth ${fifth}`);
  });
});

describe('saved level storage (roster rows in the assignments DO)', () => {
  let S;
  before(() => {
    const fs = require('node:fs');
    const path = require('node:path');
    const { loadDeclarations } = require('./helpers/extract-declaration');
    const src = fs.readFileSync(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8');
    // rosterKey is a one-line template-literal arrow the extractor can't lift.
    S = loadDeclarations(src, [
      'CEFR_LEVELS', 'clamp', 'sanitizeName', 'sanitizeEmail', 'sanitizeClassName',
      'ADAPTIVE_UP', 'ADAPTIVE_DOWN', 'ADAPTIVE_STEP_NEW', 'ADAPTIVE_STEP_SETTLED', 'ADAPTIVE_SETTLE_HALF',
      'ADAPTIVE_SUCCESS_FRACTION', 'ADAPTIVE_NEUTRAL_FRACTION',
      'mergeRosterRow', 'saveRosterLevels', 'saveRosterGradeChange', 'adaptiveBand', 'adaptiveCefr', 'adaptiveSessionResult',
      'adaptiveMergeSaved', 'adaptiveStepScale', 'adaptiveOutcomeFromFraction', 'adaptivePathOk', 'adaptiveTally',
      'adaptiveGradeStep', 'adaptiveApplyGrade', 'adaptiveAttemptSaveLevel', 'adaptiveAttemptGrade',
      'adaptiveTeacherLevel', 'teacherLevelOverrides', 'setRosterLevel',
    ], { rosterKey: (email) => `rs:${String(email || '').trim().toLowerCase()}` });
  });
  const fakeStorage = (rows = {}) => {
    const m = new Map(Object.entries(rows));
    return { m, get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); } };
  };
  const session = (score, answered) => ({ bands: ALL.slice(), score, answered });

  it('keeps the level when the teacher renames or re-classes a student', () => {
    const prior = { email: 'a@s.cat', displayName: 'Ana', className: '4B', level: { cefr: 2.4, answered: 30 } };
    const row = S.mergeRosterRow(prior, { className: '4C' }, 'a@s.cat');
    assert.equal(row.className, '4C');
    assert.deepEqual(plain(row.level), { cefr: 2.4, answered: 30 });
    assert.equal('level' in S.mergeRosterRow(null, { displayName: 'New' }, 'n@s.cat'), false);
  });

  it('updates existing rows only', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', displayName: 'Ana' } });
    await S.saveRosterLevels(storage, [
      { email: 'A@S.cat', result: S.adaptiveSessionResult(session(3.5, 12)) },
      { email: 'gone@s.cat', result: S.adaptiveSessionResult(session(1.5, 12)) },
    ]);
    assert.equal(storage.m.get('rs:a@s.cat').level.cefr, 3.5);
    assert.equal(storage.m.get('rs:a@s.cat').level.answered, 12);
    assert.equal(storage.m.has('rs:gone@s.cat'), false);
  });

  it('credits an assignment attempt once, and only new answers after a reopen', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 1.2, answered: 40 } } });
    const attempt = { studentEmail: 'a@s.cat', adaptive: session(2.3, 15) };
    await S.adaptiveAttemptSaveLevel(storage, attempt);
    await S.adaptiveAttemptSaveLevel(storage, attempt); // submit after done: no double count
    assert.equal(storage.m.get('rs:a@s.cat').level.answered, 55);
    attempt.adaptive.answered = 18; // reopened, 3 more answers
    attempt.adaptive.score = 2.6;
    await S.adaptiveAttemptSaveLevel(storage, attempt);
    assert.equal(storage.m.get('rs:a@s.cat').level.answered, 58);
    assert.equal(storage.m.get('rs:a@s.cat').level.cefr, 2.6);
  });

  it('never saves for anonymous attempts', async () => {
    const storage = fakeStorage();
    await S.adaptiveAttemptSaveLevel(storage, { studentEmail: '', adaptive: session(2.3, 15) });
    assert.equal(storage.m.size, 0);
  });

  // An attempt at B1 (2.5 on a full quiz, 50 saved answers) that was served a
  // B1 open question (quiz position 7) as its first item.
  const openAttempt = () => {
    const st = { bands: ALL.slice(), score: 2.5, answered: 0, prior: 50, perLevel: {}, levelSaved: 0, done: false,
      path: [{ qi: 7, level: 'B1', band: 'B1', ok: null, teacher: true, pending: true }],
      items: [{ qi: 7, answer: 'essay', at: 1, band: 2, qBand: 2 }] };
    return { studentEmail: 'a@s.cat', submitted: false, adaptive: st };
  };
  const grade = (points) => ({ graded: true, pointsAwarded: points, correction: '', gradedAt: 1 });
  const row = (storage) => storage.m.get('rs:a@s.cat').level;

  it('a grade during the attempt moves the live level, and reaches the roster when the attempt is saved', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 2.5, answered: 50 } } });
    const attempt = openAttempt();
    const st = attempt.adaptive;
    assert.equal(await S.adaptiveAttemptGrade(storage, attempt, 7, grade(750), 1000), true);
    assert.ok(Math.abs(st.score - (2.5 + 0.34)) < 1e-9, `live level ${st.score}`);
    assert.equal(st.answered, 1);
    assert.deepEqual(plain(row(storage)), { cefr: 2.5, answered: 50 }, 'roster untouched mid-attempt');
    assert.equal(st.path[0].pending, false);
    assert.equal(st.path[0].ok, true);
    st.done = true;
    await S.adaptiveAttemptSaveLevel(storage, attempt);
    assert.equal(row(storage).cefr, 2.84);
    assert.equal(row(storage).answered, 51);
    assert.equal(st.items[0].levelEffect.inRoster, true);
  });

  it('a regrade after the attempt was saved takes back the old grade on the roster', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 2.5, answered: 50 } } });
    const attempt = openAttempt();
    await S.adaptiveAttemptGrade(storage, attempt, 7, grade(750), 1000); // right: +0.34
    attempt.adaptive.done = true;
    await S.adaptiveAttemptSaveLevel(storage, attempt);
    await S.adaptiveAttemptGrade(storage, attempt, 7, grade(250), 1000); // now wrong
    assert.ok(Math.abs(row(storage).cefr - 2.0) < 0.011, `roster ${row(storage).cefr}`);
    assert.equal(row(storage).answered, 51, 'a regrade is not a new answer');
    assert.equal(attempt.adaptive.perLevel.B1.right, 0);
    assert.equal(attempt.adaptive.path[0].ok, false);
  });

  it('a first grade after the attempt was saved nudges the roster and counts once', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 2.5, answered: 50 } } });
    const attempt = openAttempt();
    attempt.submitted = true;
    await S.adaptiveAttemptGrade(storage, attempt, 7, grade(500), 1000); // neutral
    assert.deepEqual({ cefr: row(storage).cefr, answered: row(storage).answered }, { cefr: 2.5, answered: 51 });
    assert.equal(attempt.adaptive.levelSaved, 1, 'a later save will not count it again');
    await S.adaptiveAttemptSaveLevel(storage, attempt);
    assert.equal(row(storage).answered, 51);
  });

  it('refuses a question the student was never given', async () => {
    const storage = fakeStorage();
    assert.equal(await S.adaptiveAttemptGrade(storage, openAttempt(), 3, grade(1000), 1000), false);
  });

  it('the teacher places a student mid-level, keeping their answer count', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 1.2, answered: 30 } } });
    const row = await S.setRosterLevel(storage, 'a@s.cat', 'B2', 1000);
    assert.deepEqual(plain(row.level), { cefr: 3.5, answered: 30, updatedAt: 1000, setByTeacher: true });
    assert.equal(row.levelSetAt, 1000);
    // A student without a level starts from 0 answers.
    const fresh = fakeStorage({ 'rs:n@s.cat': { email: 'n@s.cat' } });
    assert.equal((await S.setRosterLevel(fresh, 'n@s.cat', 'A2', 5)).level.answered, 0);
    assert.equal(await S.setRosterLevel(fresh, 'nobody@s.cat', 'A2', 5), null);
  });

  it('the teacher resets a level; renames and class edits keep the stamp', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', displayName: 'Ana', level: { cefr: 3.2, answered: 80 } } });
    const row = await S.setRosterLevel(storage, 'a@s.cat', '', 2000);
    assert.equal('level' in row, false);
    assert.equal(row.levelSetAt, 2000);
    assert.equal(S.mergeRosterRow(row, { className: '4C' }, 'a@s.cat').levelSetAt, 2000);
  });

  it('a change the teacher makes during a session wins over that session', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 1.5, answered: 20 } } });
    await S.setRosterLevel(storage, 'a@s.cat', 'B2', 5000);
    const result = { ...S.adaptiveSessionResult(session(0.5, 10)), startedAt: 4000 }; // began before the change
    await S.saveRosterLevels(storage, [{ email: 'a@s.cat', result }]);
    assert.equal(row(storage).cefr, 3.5, 'teacher level stays');
    assert.equal(row(storage).answered, 30, 'the answers still count');
    assert.equal(row(storage).setByTeacher, true);
    // A later session moves it as usual and it is no longer "set by you".
    await S.saveRosterLevels(storage, [{ email: 'a@s.cat', result: { ...S.adaptiveSessionResult(session(4.2, 5)), startedAt: 6000 } }]);
    assert.equal(row(storage).cefr, 4.2);
    assert.equal(row(storage).setByTeacher, undefined);
  });

  it('a reset during a session stays reset', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 3.5, answered: 40 } } });
    await S.setRosterLevel(storage, 'a@s.cat', '', 5000);
    await S.saveRosterLevels(storage, [{ email: 'a@s.cat', result: { ...S.adaptiveSessionResult(session(2.2, 10)), startedAt: 4000 } }]);
    assert.equal(storage.m.get('rs:a@s.cat').level, undefined);
  });

  it('a late grade from before the teacher\'s change counts but does not move it', async () => {
    const storage = fakeStorage({ 'rs:a@s.cat': { email: 'a@s.cat', level: { cefr: 2.5, answered: 50 } } });
    const attempt = { ...openAttempt(), submitted: true, startedAt: 4000 };
    await S.setRosterLevel(storage, 'a@s.cat', 'C1', 5000);
    await S.adaptiveAttemptGrade(storage, attempt, 7, grade(1000), 1000);
    assert.deepEqual({ cefr: row(storage).cefr, answered: row(storage).answered }, { cefr: 4.5, answered: 51 });
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

describe('adaptive assignments', () => {
  const quiz = () => ({
    questions: [
      ...['A1', 'A1', 'A2', 'A2', 'B1', 'B1'].map((cefr, i) => ({ id: `q${i}`, type: 'mcq', cefr })),
      { id: 'open', type: 'open', cefr: 'B1' },
    ],
  });
  const assignment = (count) => ({ quiz: quiz(), adaptive: { count } });

  it('starts an attempt only with 2+ tagged levels and a count', () => {
    assert.equal(E.adaptiveAttemptInit({ quiz: quiz() }), null);
    assert.equal(E.adaptiveAttemptInit({ quiz: { questions: [{ type: 'mcq', cefr: 'A1' }] }, adaptive: { count: 3 } }), null);
    const st = E.adaptiveAttemptInit(assignment(4));
    assert.equal(st.count, 4);
    assert.equal(st.items.length, 0);
    assert.equal(quiz().questions[st.current].cefr, 'A1');
  });

  it('shows students only the served questions, with N as the goal', () => {
    const a = assignment(4);
    const st = E.adaptiveAttemptInit(a);
    const first = st.current;
    st.items.push({ qi: first, answer: 0, at: 1 });
    E.adaptiveRecord(st, first, 0, true, seeded(1));
    E.adaptiveAttemptAdvance(a, st);
    const v = E.adaptiveAttemptView(a, { id: 'at_1', adaptive: st, answersByQ: { [first]: { answer: 0 } } });
    assert.equal(v.assignment.quiz.questions.length, 2); // answered + current
    assert.equal(v.assignment.quiz.questions[0].id, a.quiz.questions[first].id);
    assert.deepEqual(Object.keys(v.attempt.answersByQ), ['0']);
    assert.equal(v.attempt.adaptive, undefined);
    const done = E.adaptiveAttemptView(a, { adaptive: st, answersByQ: {} }, { includeCurrent: false });
    assert.equal(done.assignment.quiz.questions.length, 1);
  });

  it('finishes after N answers and serves the open question once at most', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = assignment(7);
      const st = E.adaptiveAttemptInit(a);
      const rng = seeded(seed);
      let opens = 0;
      while (!st.done) {
        const qi = st.current;
        const qBand = st.bands.indexOf(a.quiz.questions[qi].cefr);
        st.items.push({ qi, answer: 0, at: 1 });
        if (a.quiz.questions[qi].type === 'open') {
          opens += 1;
          E.adaptiveRecordPending(st, qi, qBand);
        } else {
          E.adaptiveRecord(st, qi, qBand, true, rng);
        }
        E.adaptiveAttemptAdvance(a, st);
      }
      assert.equal(st.items.length, 7);
      assert.equal(st.current, null);
      assert.ok(opens <= 1, `open served ${opens} times`);
    }
  });

  it('the Cup never serves teacher-graded questions', () => {
    const qs = quiz().questions;
    const { pool } = E.adaptivePool(qs, E.arenaEligibleIndexes({ quiz: { questions: qs } }));
    assert.equal(pool.some((p) => qs[p.qi].type === 'open'), false);
  });

  it('follows questions to their new place after a quiz edit', () => {
    const a = assignment(4);
    const st = E.adaptiveAttemptInit(a);
    const answered = st.current;
    st.items.push({ qi: answered, answer: 0, at: 1 });
    E.adaptiveRecord(st, answered, 0, true, seeded(1));
    E.adaptiveAttemptAdvance(a, st);
    const servedId = a.quiz.questions[st.current].id;
    const answeredId = a.quiz.questions[answered].id;
    // Reverse the quiz: every index changes.
    const edited = { ...a, quiz: { questions: a.quiz.questions.slice().reverse() } };
    const n = a.quiz.questions.length;
    E.adaptiveAttemptRemap(edited, st, (qi) => n - 1 - qi);
    assert.equal(edited.quiz.questions[st.items[0].qi].id, answeredId);
    assert.equal(edited.quiz.questions[st.current].id, servedId);
    // Delete the served question: a new one is served in its place, and the
    // answered question still points at the right question.
    const kept = edited.quiz.questions.filter((q) => q.id !== servedId);
    const trimmed = { ...a, quiz: { questions: kept } };
    E.adaptiveAttemptRemap(trimmed, st, (qi) => {
      const idx = kept.findIndex((q) => q.id === edited.quiz.questions[qi]?.id);
      return idx < 0 ? null : idx;
    });
    assert.notEqual(st.current, null);
    assert.notEqual(trimmed.quiz.questions[st.current].id, servedId);
    assert.equal(trimmed.quiz.questions[st.items[0].qi].id, answeredId);
  });

  it('keeps the student level when the quiz changes its levels', () => {
    const st = E.adaptiveInit(['A1', 'A2', 'B1', 'B2']);
    st.score = 2.5; // B1
    st.retry.push({ qi: 1, band: 1, due: 0 });
    E.adaptiveRebase(st, ['A2', 'B1', 'C1']);
    assert.equal(st.bands[E.adaptiveBand(st)], 'B1');
    assert.equal(st.retry.length, 0);
  });

  it('summarises the path for the teacher', () => {
    const st = E.adaptiveInit(['A1', 'A2', 'B1']);
    [true, true, false, true].forEach((ok, i) => E.adaptiveRecord(st, i, E.adaptiveBand(st), ok, seeded(i)));
    const sum = E.adaptiveSummary(st);
    assert.equal(sum.answered, 4);
    assert.equal(sum.path.split(' ').length, 4);
    assert.ok(['A1', 'A2', 'B1'].includes(sum.usualLevel));
    assert.equal(sum.perLevel.A1.answered + (sum.perLevel.A2?.answered || 0) + (sum.perLevel.B1?.answered || 0), 4);
  });
});
