const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { loadDeclarations } = require('./helpers/extract-declaration');
const { seeded } = require('./helpers/adaptive-sim');

// Build up mode (BUILDUP_MODE_PLAN.md): an adaptive quiz assigned as a climb,
// always from the bottom, a wrong answer drops one step. These tests run the
// real functions of cloudflare/worker.js, and real assignments on the real
// worker with in-memory storage.
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));
const PW = 'teacher-secret';
const LEVELS = ['A1', 'A2', 'B1', 'B2'];

const mcq = (id, extra = {}) => ({ id, type: 'mcq', prompt: `Q ${id}?`, answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }], ...extra });
// 4 questions at each of 4 levels; the first option is always right.
const quiz = (levels = LEVELS, perLevel = 4) => ({
  title: 'Present simple',
  questions: levels.flatMap((l) => Array.from({ length: perLevel }, (_, i) => mcq(`${l}-${i + 1}`, { cefr: l }))),
});

describe('the build up engine (pure functions)', () => {
  let E;
  before(() => {
    E = loadDeclarations(read('cloudflare/worker.js'), [
      'CEFR_LEVELS', 'clamp', 'ADAPTIVE_START', 'ADAPTIVE_PATH_MAX', 'adaptiveInit', 'adaptivePathOk', 'adaptiveTally',
      'BUILDUP_NEED', 'BUILDUP_NEED_EASY', 'BUILDUP_TIP_AFTER', 'BUILDUP_MAX_COUNT',
      'buildupInit', 'buildupNeed', 'buildupRecord', 'buildupNext', 'buildupRebase', 'buildupView', 'buildupSummary',
    ]);
  });
  const fresh = (bands = LEVELS) => E.buildupInit(bands);
  const pool = (n = 4, per = 3) => Array.from({ length: n * per }, (_, i) => ({ qi: i, band: Math.floor(i / per) }));
  const answer = (st, ok) => E.buildupRecord(st, st.last == null ? 0 : st.last, st.bu.rung, ok);

  it('starts everyone on the first step with nothing carried over', () => {
    const st = fresh();
    assert.equal(st.bu.rung, 0);
    assert.equal(st.score, 0);
    assert.equal(st.known, false);
    assert.deepEqual(plain(E.buildupView(st)), { n: 5, rung: 0, pips: 0, need: 1, best: 0, moved: null, flag: null, tip: false, summit: false, done: false });
  });

  it('the first step needs one right answer, the next steps two', () => {
    const st = fresh();
    answer(st, true);
    assert.equal(st.bu.rung, 1);
    assert.equal(st.bu.moved, 'up');
    assert.equal(st.bu.flag, 1, 'a camp reached for the first time');
    answer(st, true);
    assert.equal(st.bu.rung, 1);
    assert.equal(st.bu.pips, 1);
    assert.equal(st.bu.moved, 'pip');
    answer(st, true);
    assert.equal(st.bu.rung, 2);
  });

  it('a wrong answer drops one step and empties the pips', () => {
    const st = fresh();
    answer(st, true); answer(st, true); // rung 1, one pip
    answer(st, false);
    assert.equal(st.bu.rung, 0);
    assert.equal(st.bu.pips, 0);
    assert.equal(st.bu.moved, 'down');
  });

  it('a step already cleared takes one right answer to climb back, the one dropped from still takes two', () => {
    const st = fresh();
    answer(st, true); answer(st, true); answer(st, true); // rung 2
    answer(st, false); // back to rung 1 (cleared)
    assert.equal(E.buildupNeed(st), 1);
    answer(st, true);
    assert.equal(st.bu.rung, 2, 'one right answer climbs back');
    assert.equal(st.bu.flag, null, 'no flag: the camp was reached before');
    assert.equal(E.buildupNeed(st), 2, 'rung 2 was not cleared');
  });

  it('a wrong answer on the first step stays there and counts toward the guide\'s tip', () => {
    const st = fresh();
    answer(st, false);
    assert.equal(st.bu.rung, 0);
    assert.equal(st.bu.moved, 'hold');
    answer(st, false);
    assert.equal(E.buildupView(st).tip, false);
    answer(st, false);
    assert.equal(E.buildupView(st).tip, true);
    answer(st, true);
    assert.equal(E.buildupView(st).tip, false, 'a right answer closes it');
  });

  it('two right answers on the top step reach the summit', () => {
    const st = fresh(['A1', 'A2']);
    answer(st, true); // rung 1 = top
    answer(st, true);
    assert.equal(st.bu.summit, false);
    answer(st, true);
    assert.equal(st.bu.summit, true);
    assert.equal(st.bu.moved, 'summit');
    assert.equal(E.buildupSummary(st).summit, true);
    const v = E.buildupView(st);
    assert.deepEqual([v.n, v.rung, v.best, v.pips], [3, 2, 2, 0], 'the Summit is a node after the top level');
  });

  it('neutral answers move nothing; the best step never goes down', () => {
    const st = fresh();
    answer(st, true); answer(st, true); answer(st, true); // rung 2
    answer(st, 'neutral');
    assert.equal(st.bu.rung, 2);
    answer(st, false); answer(st, false); answer(st, false);
    assert.equal(st.bu.rung, 0);
    assert.equal(st.bu.best, 2);
    assert.equal(E.buildupSummary(st).best, 2);
  });

  it('serves from the current step, least seen first, never the same one twice running', () => {
    const st = fresh();
    const p = pool();
    const rng = seeded(7);
    const served = [];
    for (let i = 0; i < 6; i += 1) {
      const qi = E.buildupNext(st, p, rng);
      assert.equal(p[qi].band, st.bu.rung);
      if (served.length) assert.notEqual(qi, served[served.length - 1]);
      served.push(qi);
      E.buildupRecord(st, qi, p[qi].band, false); // stay on step 0
    }
    assert.equal(new Set(served.slice(0, 3)).size, 3, 'all three before any repeat');
  });

  it('a one-question step is served again rather than ending the attempt', () => {
    const st = fresh(['A1', 'A2']);
    const p = [{ qi: 0, band: 0 }, { qi: 1, band: 1 }];
    E.buildupRecord(st, 0, 0, false);
    assert.equal(E.buildupNext(st, p, seeded(1)), 0);
  });

  it('a quiz edit keeps the student on the same level', () => {
    const st = fresh(['A1', 'A2', 'B1']);
    answer(st, true); answer(st, true); answer(st, true); // rung 2 = B1
    E.buildupRebase(st, ['A2', 'B1', 'B2']);
    assert.deepEqual(plain(st.bands), ['A2', 'B1', 'B2']);
    assert.equal(st.bu.rung, 1);
    assert.equal(st.score, 1);
  });

  describe('simulated students (each step has its own chance of a right answer)', () => {
    const run = (pRight, { n = 6, count = 24, seed = 5 } = {}) => {
      const rng = seeded(seed);
      const bands = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].slice(0, n);
      const st = E.buildupInit(bands);
      const p = pool(n, 5);
      let answered = 0;
      while (answered < count && !st.bu.summit) {
        const qi = E.buildupNext(st, p, rng);
        assert.ok(qi != null);
        assert.ok(st.bu.rung >= 0 && st.bu.rung < n);
        E.buildupRecord(st, qi, p[qi].band, rng() < pRight(st.bu.rung));
        answered += 1;
      }
      return { st, answered };
    };
    const summits = (pRight, o) => Array.from({ length: 200 }, (_, i) => run(pRight, { ...o, seed: i + 1 })).filter((r) => r.st.bu.summit).length;

    it('a strong student reaches the summit well inside the cap, in about 2 answers per step', () => {
      const r = run(() => 0.97);
      assert.equal(r.st.bu.summit, true);
      assert.ok(r.answered <= 16, `answered ${r.answered}`);
    });

    it('most students who get a step right 8 times in 10 reach the summit within 4 x steps', () => {
      assert.ok(summits(() => 0.8) >= 100, 'at least half of 200 runs');
    });

    it('a weak student (4 in 10) mostly does not, but climbs and never errors', () => {
      const s = summits(() => 0.4);
      assert.ok(s < 40, `summits ${s}`);
      const best = Array.from({ length: 50 }, (_, i) => run(() => 0.4, { seed: i + 1 }).st.bu.best);
      assert.ok(Math.max(...best) >= 1);
    });

    it('a student who finds the later steps hard stays around them', () => {
      const r = run((rung) => (rung < 3 ? 0.95 : 0.25), { count: 40 });
      assert.ok(r.st.bu.best >= 2);
      assert.equal(r.st.bu.summit, false);
    });
  });
});

describe('build up assignments (real worker, in-memory storage)', () => {
  let post;
  let get;
  before(async () => {
    const tmp = path.join(os.tmpdir(), `pinplay-worker-buildup-${process.pid}-${Date.now()}.mjs`);
    fs.writeFileSync(tmp, read('cloudflare/worker.js'));
    const mod = await import(`file://${tmp.replace(/\\/g, '/')}`);
    fs.unlinkSync(tmp);
    const storage = () => {
      const map = new Map();
      return {
        async get(k) { return map.has(k) ? structuredClone(map.get(k)) : undefined; },
        async put(k, v) { map.set(k, structuredClone(v)); },
        async delete(k) { return map.delete(k); },
        async list({ prefix = '' } = {}) { return new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])); },
      };
    };
    const rooms = new Map();
    const env = {
      CREATE_PASSWORD_HASH: require('node:crypto').createHash('sha256').update(PW).digest('hex'),
      ROOMS: { idFromName: (n) => n, get: (n) => { if (!rooms.has(n)) rooms.set(n, new mod.QuizRoom({ storage: storage() }, env)); const r = rooms.get(n); return { fetch: (u, i) => r.fetch(new Request(u, i)) }; } },
      QUIZ_MEDIA: null,
    };
    post = async (p, body, headers = {}) => {
      const res = await mod.default.fetch(new Request(`https://api.test${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), env);
      return { status: res.status, body: await res.json() };
    };
    get = async (p, headers = {}) => {
      const res = await mod.default.fetch(new Request(`https://api.test${p}`, { method: 'GET', headers }), env);
      return { status: res.status, body: await res.json() };
    };
  });

  const create = async (q = quiz(), extra = {}) => {
    const created = await post('/api/assignments/create', { password: PW, quiz: q, buildup: true, adaptive: true, adaptiveCount: 16, randomNames: true, feedbackMode: 'none', ...extra });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    return created.body.assignment;
  };
  const start = async (code, key) => {
    const started = await post('/api/assignment/start', { code, studentKey: key, studentName: 'Kid' });
    assert.ok(started.status < 300, JSON.stringify(started.body));
    return started.body;
  };
  // The served question is the last one; its id says its level.
  const servedId = (state) => state.attempt.assignment.quiz.questions.at(-1).prompt.slice(2, -1);
  const send = async (code, attemptId, state, right) => {
    const qIndex = state.attempt.assignment.quiz.questions.length - 1;
    const r = await post('/api/assignment/answer', { code, attemptId, qIndex, answer: right ? 0 : 1 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body;
  };

  it('is created with instant feedback forced and the question count kept', async () => {
    const a = await create();
    assert.equal(a.buildup, true);
    assert.equal(a.feedbackMode, 'instant');
    assert.equal(a.examMode, false);
    assert.equal(a.adaptiveCount, 16);
  });

  it('refuses a quiz with fewer than two levels', async () => {
    const r = await post('/api/assignments/create', { password: PW, quiz: quiz(['A1']), buildup: true, adaptive: true, adaptiveCount: 10, randomNames: true });
    assert.equal(r.status, 400);
  });

  it('keeps counts above the number of questions (steps repeat)', async () => {
    const a = await create(quiz(LEVELS, 2), { adaptiveCount: 30 });
    assert.equal(a.adaptiveCount, 30);
  });

  it('starts at the bottom and shows the student only the trail', async () => {
    const a = await create();
    const s = await start(a.code, 'anon-start');
    assert.match(servedId(s), /^A1-/);
    assert.deepEqual(plain(s.attempt.climb), { n: 5, rung: 0, pips: 0, need: 1, best: 0, moved: null, flag: null, tip: false, summit: false, done: false });
    assert.equal(s.attempt.assignment.feedbackMode, 'instant');
  });

  it('climbs on right answers, drops on a wrong one, and tells the student what moved', async () => {
    const a = await create();
    let s = await start(a.code, 'anon-climb');
    const id = s.attempt.id;
    s = await send(a.code, id, s, true);
    assert.equal(s.attempt.climb.rung, 1);
    assert.equal(s.attempt.climb.moved, 'up');
    assert.equal(s.attempt.climb.flag, 1);
    assert.match(servedId(s), /^A2-/);
    s = await send(a.code, id, s, true);
    assert.equal(s.attempt.climb.pips, 1);
    assert.equal(s.attempt.climb.moved, 'pip');
    s = await send(a.code, id, s, false);
    assert.equal(s.attempt.climb.rung, 0);
    assert.equal(s.attempt.climb.moved, 'down');
    assert.equal(s.attempt.climb.best, 1);
    assert.match(servedId(s), /^A1-/);
  });

  it('a student who answers everything right reaches the summit and the attempt is done', async () => {
    const a = await create();
    let s = await start(a.code, 'anon-summit');
    const id = s.attempt.id;
    let n = 0;
    while (!s.attempt.climb.done && n < 20) { s = await send(a.code, id, s, true); n += 1; }
    assert.equal(n, 7, '1 + 2 + 2 + 2 answers');
    assert.equal(s.attempt.assignment.totalQuestions, 7, 'the total is what was answered, not the cap');
    assert.equal(s.attempt.climb.summit, true);
    assert.equal(s.attempt.climb.moved, 'summit');
    const late = await post('/api/assignment/answer', { code: a.code, attemptId: id, qIndex: 7, answer: 0 });
    assert.equal(late.body.code, 'ADAPTIVE_DONE');
    const fin = await post('/api/assignment/submit', { code: a.code, attemptId: id });
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
  });

  it('the cap ends the attempt without a summit', async () => {
    const a = await create(quiz(), { adaptiveCount: 3 });
    let s = await start(a.code, 'anon-cap');
    const id = s.attempt.id;
    for (let i = 0; i < 3; i += 1) s = await send(a.code, id, s, false);
    assert.equal(s.attempt.climb.done, true);
    assert.equal(s.attempt.climb.summit, false);
    assert.equal(s.attempt.adaptive.done, true);
  });

  it('opens the guide\'s tip after three wrong answers in a row', async () => {
    const a = await create();
    let s = await start(a.code, 'anon-tip');
    for (let i = 0; i < 3; i += 1) s = await send(a.code, s.attempt.id, s, false);
    assert.equal(s.attempt.climb.tip, true);
  });

  it('shows the teacher where each student got to', async () => {
    const a = await create();
    let s = await start(a.code, 'anon-report');
    s = await send(a.code, s.attempt.id, s, true);
    s = await send(a.code, s.attempt.id, s, true);
    s = await send(a.code, s.attempt.id, s, true);
    const res = await post('/api/assignments/results', { password: PW, code: a.code });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const row = res.body.attempts.find((x) => x.adaptive?.buildup);
    assert.ok(row, JSON.stringify(res.body).slice(0, 400));
    assert.deepEqual(plain(row.adaptive.buildup), { n: 5, bands: LEVELS, rung: 2, best: 2, summit: false, stuck: false });
  });

  it('a plain adaptive assignment is unchanged (no trail)', async () => {
    const created = await post('/api/assignments/create', { password: PW, quiz: quiz(), adaptive: true, adaptiveCount: 6, randomNames: true });
    assert.equal(created.status, 201);
    assert.equal(created.body.assignment.buildup, undefined);
    const s = await start(created.body.assignment.code, 'anon-plain');
    assert.equal(s.attempt.climb, undefined);
  });
});

describe('Build up never touches the saved level', () => {
  it('adaptiveAttemptSaveLevel does nothing for a build up attempt', async () => {
    const E = loadDeclarations(read('cloudflare/worker.js'), ['adaptiveAttemptSaveLevel'], {
      sanitizeEmail: (e) => e,
      adaptiveSessionResult: () => { throw new Error('read the level'); },
      saveRosterLevels: () => { throw new Error('wrote the level'); },
    });
    await E.adaptiveAttemptSaveLevel({}, { studentEmail: 'a@b.cat', adaptive: { bu: {}, answered: 5 } });
  });
});

describe('the trail helpers (buildup.js)', () => {
  const vm = require('node:vm');
  const load = (lang = 'en') => {
    const window = { t: (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m)) };
    vm.runInNewContext(read('buildup.js'), { window, document: { documentElement: { lang } } });
    return window.PinBuildup;
  };

  it('uses the real altitudes of Everest for six camps', () => {
    const B = load();
    assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => B.altitude(i, 6)), [5364, 6065, 6500, 7200, 7920, 8849]);
  });

  it('spreads any other number of camps between Base Camp and the Summit', () => {
    const B = load();
    assert.equal(B.altitude(0, 3), 5364);
    assert.equal(B.altitude(2, 3), 8849);
    assert.equal(B.altitude(1, 3), 6850);
    const up = Array.from({ length: 7 }, (_, i) => B.altitude(i, 7));
    assert.deepEqual(up, [...up].sort((a, b) => a - b), 'always climbing');
  });

  it('names Base Camp, the camps and the Summit', () => {
    const B = load();
    assert.deepEqual([0, 1, 2, 3].map((i) => B.campName(i, 4)), ['Base Camp', 'Camp 1', 'Camp 2', 'Summit']);
  });

  it('writes altitudes the way the page language does', () => {
    assert.equal(load('en').fmtAlt(8849), '8,849 m');
    assert.match(load('fr').fmtAlt(8849), /^8\s?849 m$/);
  });

  it('every string it shows has a French translation', () => {
    const src = read('buildup.js');
    const dict = (() => { const w = {}; vm.runInNewContext(read('i18n-fr.js'), { window: w }); return w.PINPLAY_FR_DICT; })();
    const keys = [...src.matchAll(/tr\(\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
      .concat([...src.matchAll(/^\s+'((?:[^'\\]|\\.)*)',?\s*$/gm)].map((m) => m[1].replace(/\\'/g, "'")).filter((k) => /\{camp\}/.test(k)));
    assert.ok(keys.length > 8);
    keys.forEach((k) => assert.ok(dict[k], `no French for: ${k}`));
  });
});
