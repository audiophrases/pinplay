/* "To grade" and the AI packs must always say the same thing. The real Worker
   and the real pack code from app.js, with only the storage in memory: after
   every kind of change, the card, the attempt rows, the question counts and the
   pack must all agree, and agree on the same answers. */
import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadDeclarations } = require('./helpers/extract-declaration');

const code = 'MATCH123';
const teacherPassword = 'to-grade-test';
const clone = (x) => (x === undefined ? x : structuredClone(x));
const recording = (minutes = 1) => ({ audioUrl: 'media/take.webm', durationMs: minutes * 60000, transcript: '' });
const wait = () => new Promise((resolve) => setTimeout(resolve, 3));

let worker, QuizRoom, env, room, storage, temp, app, lists = 0;

const quiz = {
  title: 'Speaking',
  questions: [
    { id: 'q1', type: 'open', prompt: 'Your weekend?', points: 1000 },
    { id: 'q2', type: 'voice_record', prompt: 'Read this out.', points: 1000 },
    { id: 'q3', type: 'tf', prompt: 'True?', points: 1000, answers: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }] },
  ],
};

async function call(route, body) {
  const response = await worker.fetch(new Request(`https://api.test${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  return { status: response.status, body: await response.json() };
}
async function student(route, body) {
  const response = await room.fetch(new Request(`https://room${route}`, { method: 'POST', body: JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
}
const teacher = (route, body = {}) => call(route, { code, password: teacherPassword, ...body });

const start = async (who, c = code) => {
  const r = await student('/assignments/start', { code: c, studentKey: `key_${who}`, studentName: who });
  assert.ok(r.body.attempt?.id, JSON.stringify(r.body));
  return r.body.attempt.id;
};
const answer = async (attemptId, qIndex, value, c = code) => {
  const r = await student('/assignments/answer', { code: c, attemptId, qIndex, answer: value });
  assert.equal(r.status, 200, JSON.stringify(r.body));
};
const submit = async (attemptId, c = code) => {
  const r = await student('/assignments/submit', { code: c, attemptId, force: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
};
const row = (attemptId, c = code) => storage.get(`a:${c}:t:${attemptId}`);
const newAssignment = (c, settings = {}) => storage.put(`ab:${c}`, {
  code: c, title: c, active: true, feedbackMode: 'instant', attemptsLimit: 0, quiz: clone(quiz),
  pendingGradingCount: 0, pendingAttemptsCount: 0, attemptsCount: 0, createdAt: 1, ...settings,
});

async function packFor(c = code, args = {}) {
  return app.aiGradePackLoadEntries({ scope: 'pending', code: c, ...args });
}
const packKeys = (entries) => Array.from(entries, (e) => `${e.attemptId}::${e.qIndex}`).sort();

// The whole point: every place that says how much there is to grade agrees.
async function assertAllAgree(answers, attempts, c = code) {
  // Read first: the card must be right without the results view fixing it.
  const list = await call('/api/assignments/list', { password: teacherPassword, limit: 50 });
  const card = list.body.assignments.find((a) => a.code === c);
  assert.equal(card.pendingGradingCount, answers, 'card: answers to grade');
  assert.equal(card.pendingAttemptsCount, attempts, 'card: attempts to grade');

  const results = await call('/api/assignments/results', { code: c, password: teacherPassword });
  const totals = app.assignmentToGradeTotals(results.body.attempts);
  assert.equal(totals.answers, answers, 'attempt rows: answers');
  assert.equal(totals.attempts, attempts, 'attempt rows: attempts');

  const overview = await call('/api/assignments/grading-overview', { code: c, password: teacherPassword });
  const byQuestion = overview.body.questions.reduce((sum, q) => sum + q.pendingCount, 0);
  assert.equal(byQuestion, answers, 'question counts');
  overview.body.questions.forEach((q) => assert.equal(q.answeredCount, q.gradedCount + q.pendingCount + (q.isPoll ? q.answeredCount : 0)));

  // The one-question packs follow the same count, question by question.
  for (const q of overview.body.questions.filter((x) => x.teacherGraded)) {
    const pack = packFor(c, { scope: 'question', qIndex: q.qIndex });
    if (q.pendingCount) assert.equal((await pack).entries.length, q.pendingCount, `AI pack for Q${q.qIndex + 1}`);
    else await assert.rejects(pack, /nothing to grade/);
  }

  if (!answers) {
    await assert.rejects(packFor(c), /No pending/);
    return;
  }
  const { entries } = await packFor(c);
  assert.equal(entries.length, answers, 'AI pack');

  // Not just the same number: the same answers, attempt by attempt.
  const toGradeByAttempt = new Map(results.body.attempts
    .map((a) => [a.id, app.assignmentAttemptToGrade(a)]).filter(([, n]) => n));
  const inPack = new Map();
  Array.from(entries).forEach((e) => inPack.set(e.attemptId, (inPack.get(e.attemptId) || 0) + 1));
  assert.deepEqual(Object.fromEntries(inPack), Object.fromEntries(toGradeByAttempt), 'AI pack, attempt by attempt');
}

before(async () => {
  const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
  temp = path.join(os.tmpdir(), `pinplay-to-grade-${process.pid}.mjs`);
  fs.writeFileSync(temp, src);
  ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
  const rows = new Map();
  storage = {
    get: async (k) => clone(rows.get(k)),
    put: async (k, v) => rows.set(k, clone(v)),
    delete: async (k) => rows.delete(k),
    list: async ({ prefix = '' } = {}) => {
      if (prefix.startsWith('a:')) lists += 1;
      return new Map([...rows].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, clone(v)]));
    },
  };
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teacherPassword))).toString('hex');
  env = { CREATE_PASSWORD_HASH: hash, ROOMS: { idFromName: (n) => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
  room = new QuizRoom({ storage }, env);

  app = loadDeclarations(fs.readFileSync('app.js', 'utf8'), [
    'AI_GRADE_PACK_MAX_AUDIO_MS', 'AI_GRADE_PACK_MAX_ANSWERS',
    'assignmentAttemptToGrade', 'assignmentToGradeTotals', 'aiGradePackIsToGrade', 'aiGradePackQuestionEntries',
    'aiGradePackNextBatch', 'aiGradePackEntryFromItem', 'aiGradePackLoadEntries', 'aiGradePackBuildData',
    'aiGradeImportLoadContext', 'aiGradeImportBucketRow',
  ], {
    createSessionPassword: teacherPassword,
    t: (k) => k,
    api: async (route, { body }) => {
      const r = await call(route, body);
      if (r.status >= 400) throw new Error(r.body?.error || `HTTP ${r.status}`);
      return r.body;
    },
  });
  await newAssignment(code);
});
after(() => { if (temp) fs.unlinkSync(temp); });

describe('the rule: one attempt per student', () => {
  let cara1, cara2, dan1, dan2, ben;

  it('counts a submitted attempt', async () => {
    const id = await start('ana');
    await answer(id, 0, 'I went to the beach.');
    await answer(id, 1, recording());
    await answer(id, 2, 0); // auto-graded: never to grade
    await submit(id);
    await assertAllAgree(2, 1);
  });

  it('counts an unfinished attempt when the student never handed anything in', async () => {
    ben = await start('ben');
    await answer(ben, 0, 'I go beach.');
    await assertAllAgree(3, 2);
    assert.equal((await row(ben)).setAside, undefined);
  });

  it('never counts questions the student did not reach', async () => {
    assert.equal((await packFor()).entries.filter((e) => e.attemptId === ben).length, 1);
  });

  it('sets aside a retry that was started and left, however far it got', async () => {
    cara1 = await start('cara');
    await answer(cara1, 0, 'First go.');
    await answer(cara1, 1, recording());
    await submit(cara1);
    await assertAllAgree(5, 3);
    cara2 = await start('cara');
    assert.notEqual(cara2, cara1);
    assert.equal((await row(cara2)).setAside, true);
    await answer(cara2, 0, 'Second go, unfinished.');
    await assertAllAgree(5, 3);
    assert.ok(!packKeys((await packFor()).entries).some((k) => k.startsWith(cara2)));
  });

  it('counts only the latest of several submitted attempts', async () => {
    dan1 = await start('dan');
    await answer(dan1, 0, 'One.');
    await answer(dan1, 1, recording());
    await submit(dan1);
    dan2 = await start('dan');
    await answer(dan2, 0, 'Two.');
    await answer(dan2, 1, recording());
    await submit(dan2);
    await assertAllAgree(7, 4);
    assert.equal((await row(dan1)).setAside, true);
    assert.equal((await row(dan2)).setAside, undefined);
  });

  it('lets a retry take over the moment it is handed in', async () => {
    await submit(cara2);
    assert.equal((await row(cara1)).setAside, true);
    assert.equal((await row(cara2)).setAside, undefined);
    await assertAllAgree(6, 4); // cara's retry has 1 answer, her first had 2
  });

  it('goes down by one for each graded answer', async () => {
    const id = packKeys((await packFor()).entries).find((k) => k.startsWith(ben)).split('::')[0];
    await teacher('/api/assignments/grade', { attemptId: id, qIndex: 0, points: 500, correction: 'Past tense.' });
    await assertAllAgree(5, 3);
  });

  it('brings the earlier attempt back if the one that counted is deleted', async () => {
    const r = await student('/assignments/delete-attempt-by-student', { code, attemptId: cara2, studentKey: 'key_cara' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await row(cara1)).setAside, undefined);
    await assertAllAgree(6, 3);
  });

  it('treats a reopened attempt as the student\'s current work', async () => {
    await teacher('/api/assignments/reopen-attempt', { attemptId: dan1 });
    assert.equal((await row(dan1)).setAside, undefined);
    assert.equal((await row(dan2)).setAside, true);
    await assertAllAgree(6, 3);
  });

  it('brings the other attempt back when the teacher deletes the one that counted', async () => {
    await teacher('/api/assignments/delete-attempt', { attemptId: dan1 });
    assert.equal((await row(dan2)).setAside, undefined);
    await assertAllAgree(6, 3);
  });

  it('keeps a set-aside attempt reachable: one student, and a grade by hand', async () => {
    const eve1 = await start('eve');
    await answer(eve1, 0, 'Handed in.');
    await submit(eve1);
    const eve2 = await start('eve');
    await answer(eve2, 0, 'Left unfinished.');
    await assertAllAgree(7, 4);
    const { entries } = await packFor(code, { scope: 'attempt', attemptId: eve2 });
    assert.equal(entries.length, 1);
    const graded = await teacher('/api/assignments/grade', { attemptId: eve2, qIndex: 0, points: 1000, correction: '' });
    assert.equal(graded.status, 200);
    await assertAllAgree(7, 4);
  });

  it('lets a released retry take over, as it hands the attempt in', async () => {
    const results = await teacher('/api/assignments/results');
    const eve2 = results.body.attempts.find((a) => a.studentName === 'eve' && !a.submitted);
    const eve1 = results.body.attempts.find((a) => a.studentName === 'eve' && a.submitted);
    const released = await teacher('/api/assignments/release-grades', { attemptIds: [eve2.id] });
    assert.equal(released.status, 200, JSON.stringify(released.body));
    assert.equal((await row(eve1.id)).setAside, true);
    assert.equal((await row(eve2.id)).setAside, undefined);
    await assertAllAgree(6, 3);
  });

  it('grades everything in the pack, unfinished attempts included, down to zero', async () => {
    const { entries, meta } = await packFor();
    const data = app.aiGradePackBuildData({ entries, meta, scope: 'pending' });
    const results = data.attempts.flatMap((a) => a.answers.map((ans) => ({
      attemptId: a.attemptId, qIndex: ans.qIndex, qId: ans.qId, points: 800, verdict: 'partial', confidence: 0.9,
    })));
    assert.equal(results.length, 6);
    const ctx = await app.aiGradeImportLoadContext(code, new Set(results.map((r) => r.qIndex)));
    ctx.packBuiltAt = data.packBuiltAt;
    const rows = results.map((r) => app.aiGradeImportBucketRow(r, ctx));
    assert.deepEqual(Array.from(new Set(rows.map((r) => r.bucket))), ['apply']);
    for (const r of rows) await teacher('/api/assignments/grade', { attemptId: r.attemptId, qIndex: r.qIndex, points: r.points, correction: '' });
    await assertAllAgree(0, 0);
  });
});

describe('packs one chat at a time', () => {
  const big = 'PACKS123';

  it('adds up to "to grade" over the packs, with no answer sent twice', async () => {
    await newAssignment(big);
    for (const who of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const id = await start(who, big);
      await answer(id, 1, recording(4), big);
      if (who !== 'g') await submit(id, big);
    }
    await assertAllAgree(7, 7, big);
    const seen = [];
    let packs = 0;
    for (let left = 7; left > 0; packs += 1) {
      const { entries: loaded } = await packFor(big);
      assert.equal(loaded.length, left, 'the next pack starts from what is still to grade');
      const batch = app.aiGradePackNextBatch(loaded);
      for (const e of batch) {
        assert.ok(!seen.includes(`${e.attemptId}`), 'sent twice');
        seen.push(`${e.attemptId}`);
        await call('/api/assignments/grade', { code: big, password: teacherPassword, attemptId: e.attemptId, qIndex: e.qIndex, points: 1000, correction: '' });
      }
      left -= batch.length;
    }
    assert.equal(packs, 2);
    assert.equal(seen.length, 7);
    await assertAllAgree(0, 0, big);
  });
});

describe('"Submitted attempts only"', () => {
  const opt = 'OPTOUT12';

  it('leaves unfinished attempts out of the pack on request, and says how many', async () => {
    await newAssignment(opt);
    const done = await start('s', opt);
    await answer(done, 0, 'Finished.', opt);
    await submit(done, opt);
    const open = await start('u', opt);
    await answer(open, 0, 'Not finished.', opt);
    await assertAllAgree(2, 2, opt);
    const { entries, meta } = await packFor(opt, { submittedOnly: true });
    assert.deepEqual(packKeys(entries), [`${done}::0`]);
    assert.equal(meta.excludedInProgress, 1);
    const overview = await call('/api/assignments/grading-overview', { code: opt, password: teacherPassword });
    assert.equal(overview.body.questions[0].pendingUnfinishedCount, 1);
  });
});

describe('an answer changed after the pack was built', () => {
  const chg = 'CHANGE12';

  it('is held back, and the others go through', async () => {
    await newAssignment(chg, { feedbackMode: 'end' });
    const stays = await start('s', chg);
    await answer(stays, 0, 'Stays the same.', chg);
    const changes = await start('c', chg);
    await answer(changes, 0, 'First words.', chg);
    const { entries, meta } = await packFor(chg);
    const data = app.aiGradePackBuildData({ entries, meta, scope: 'pending' });
    await wait();
    await answer(changes, 0, 'Different words.', chg);
    const ctx = await app.aiGradeImportLoadContext(chg, new Set([0]));
    ctx.packBuiltAt = data.packBuiltAt;
    const bucket = (attemptId) => app.aiGradeImportBucketRow({ attemptId, qIndex: 0, qId: 'q1', points: 900, verdict: 'correct', confidence: 1 }, ctx);
    assert.equal(bucket(stays).bucket, 'apply');
    assert.equal(bucket(changes).skipReason, 'changed');
  });

  it('puts a graded answer back to pending when the student changes it', async () => {
    const results = await call('/api/assignments/results', { code: chg, password: teacherPassword });
    const id = results.body.attempts[0].id;
    await call('/api/assignments/grade', { code: chg, password: teacherPassword, attemptId: id, qIndex: 0, points: 900, correction: '' });
    await assertAllAgree(1, 1, chg);
    await answer(id, 0, 'Changed after grading.', chg);
    await assertAllAgree(2, 2, chg);
  });
});

describe('assignments from before the rule', () => {
  const old = 'OLD12345';

  it('catch up the first time the teacher opens the results', async () => {
    await newAssignment(old, { pendingGradingCount: 3, pendingAttemptsCount: 2, attemptsCount: 2 });
    const attempt = (id, submittedAt, answersByQ) => ({ id, studentKey: 'key_old', studentName: 'Old', submitted: true, submittedAt, startedAt: submittedAt, answersByQ });
    await storage.put(`a:${old}:t:first`, attempt('first', 100, { 0: { answer: 'a' }, 1: { answer: recording() } }));
    await storage.put(`a:${old}:t:second`, attempt('second', 200, { 0: { answer: 'b' } }));
    const before = await call('/api/assignments/list', { password: teacherPassword, limit: 50 });
    assert.equal(before.body.assignments.find((a) => a.code === old).pendingGradingCount, 3);
    await call('/api/assignments/results', { code: old, password: teacherPassword });
    assert.equal((await row('first', old)).setAside, true);
    await assertAllAgree(1, 1, old);
  });

  it('writes nothing when opening the results finds nothing to change', async () => {
    const puts = [];
    const put = storage.put;
    storage.put = async (k, v) => { puts.push(k); return put(k, v); };
    await call('/api/assignments/results', { code: old, password: teacherPassword });
    storage.put = put;
    assert.deepEqual(puts, []);
  });
});

describe('the rule does not cost server reads where it matters', () => {
  const quota = 'QUOTA123';

  it('saving an answer and submitting a first attempt never scan the attempts', async () => {
    await newAssignment(quota);
    const id = await start('q', quota);
    const before = lists;
    await answer(id, 0, 'One.', quota);
    await answer(id, 1, recording(), quota);
    await submit(id, quota);
    assert.equal(lists, before);
  });

  it('saving an answer in a retry does not scan either', async () => {
    const id = await start('q', quota);
    const before = lists;
    await answer(id, 0, 'Retry.', quota);
    assert.equal(lists, before);
  });
});

describe('the two entries of a public game', () => {
  const pub = 'PUBLIC12';

  it('keeps the Games page apart from the assignment link', async () => {
    await newAssignment(pub, { public: true });
    const homework = await start('h', pub);
    await answer(homework, 0, 'Homework.', pub);
    await submit(homework, pub);
    const practice = await student('/assignments/start', { code: pub, studentKey: 'key_h', studentName: 'h', via: 'play' });
    assert.equal(practice.status, 201, JSON.stringify(practice.body));
    assert.equal((await row(homework, pub)).setAside, undefined);
    assert.equal((await row(practice.body.attempt.id, pub)).setAside, undefined);
  });
});

describe('listening sections in a pack', () => {
  const lis = 'LISTEN12';
  const script = 'The next train to Girona leaves at nine fifteen.';

  it('gives the grader the words once, and never gives them to students', async () => {
    await newAssignment(lis, {
      quiz: {
        title: 'Listening',
        listeningSections: [{ id: 'ls_station', title: 'At the station', text: 'Listen and answer.', transcript: script, audio: { url: 'media/station.mp3' } }],
        questions: [
          { id: 'q1', type: 'open', prompt: 'When does the train leave?', points: 1000, listeningSection: 'ls_station' },
          { id: 'q2', type: 'open', prompt: 'Where is it going?', points: 1000, listeningSection: 'ls_station' },
          { id: 'q3', type: 'open', prompt: 'Not about the recording.', points: 1000, readingText: 'A short passage.' },
        ],
      },
    });
    const id = await start('l', lis);
    for (const q of [0, 1, 2]) await answer(id, q, 'An answer.', lis);
    await student('/assignments/submit', { code: lis, attemptId: id, force: true });
    const { entries, meta } = await packFor(lis);
    const data = app.aiGradePackBuildData({ entries, meta, scope: 'pending' });
    assert.equal(data.listeningSections.length, 1);
    assert.equal(data.listeningSections[0].script, script);
    assert.equal(data.listeningSections[0].instruction, 'Listen and answer.');
    assert.equal(data.questions[0].media.audio, null);
    assert.equal(data.questions[2].readingText, 'A short passage.');

    const state = await room.fetch(new Request(`https://room/assignments/state?code=${lis}&attemptId=${id}`));
    assert.ok(!(await state.text()).includes('Girona'), 'students must not receive the words');
  });
});

describe('adaptive attempts', () => {
  const ada = 'ADAPT123';

  it('count the same way, answer by answer', async () => {
    await newAssignment(ada, {
      adaptive: { count: 3 },
      quiz: {
        title: 'Adaptive',
        questions: ['A1', 'A1', 'A2', 'A2', 'B1', 'B1'].map((cefr, i) => ({ id: `q${i}`, type: 'open', prompt: `Question ${i}`, points: 1000, cefr })),
      },
    });
    const id = await start('a', ada);
    assert.ok((await row(id, ada)).adaptive, 'a real adaptive attempt');
    await answer(id, 0, 'First answer.', ada);
    await answer(id, 1, 'Second answer.', ada);
    await assertAllAgree(2, 1, ada);
    await submit(id, ada);
    const retry = await start('a', ada);
    await answer(retry, 0, 'A retry, left unfinished.', ada);
    await assertAllAgree(2, 1, ada);
    assert.equal((await row(retry, ada)).setAside, true);
  });
});
