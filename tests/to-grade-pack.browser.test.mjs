/* The real teacher page against the real Worker, with only the storage in
   memory: what the card says is what the picker says, is what lands in the ZIP,
   and what comes back from the AI brings the card down to what is left. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('playwright').catch(() => ({}));

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
const code = 'SPEAK123';
const teacherPassword = 'to-grade-browser';
const shots = process.env.PINPLAY_TEST_SHOTS || '';
const clone = (x) => (x === undefined ? x : structuredClone(x));
const recording = { audioUrl: 'media/take.webm', durationMs: 30000, transcript: '' };

const quiz = {
  title: 'Past simple',
  questions: [
    { id: 'q1', type: 'open', prompt: 'What did you do at the weekend?', points: 1000 },
    { id: 'q2', type: 'voice_record', prompt: 'Read this aloud.', points: 1000 },
    { id: 'q3', type: 'tf', prompt: 'Is this true?', points: 1000, answers: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }] },
  ],
};

let worker, QuizRoom, env, room, storage, temp, browser, ben;

async function student(route, body) {
  const response = await room.fetch(new Request(`https://room${route}`, { method: 'POST', body: JSON.stringify(body) }));
  return response.json();
}
const start = async (who) => (await student('/assignments/start', { code, studentKey: `key_${who}`, studentName: who })).attempt.id;
const answer = (attemptId, qIndex, value) => student('/assignments/answer', { code, attemptId, qIndex, answer: value });
const submit = (attemptId) => student('/assignments/submit', { code, attemptId, force: true });

describe('"to grade" through to the AI pack', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
    temp = path.join(os.tmpdir(), `pinplay-to-grade-browser-${process.pid}.mjs`);
    fs.writeFileSync(temp, src);
    ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
    const rows = new Map();
    storage = {
      get: async (k) => clone(rows.get(k)),
      put: async (k, v) => rows.set(k, clone(v)),
      delete: async (k) => rows.delete(k),
      list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, clone(v)])),
    };
    const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teacherPassword))).toString('hex');
    env = { CREATE_PASSWORD_HASH: hash, ROOMS: { idFromName: (n) => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
    room = new QuizRoom({ storage }, env);
    await storage.put(`ab:${code}`, {
      code, title: '3ESO - PAST SIMPLE', active: true, feedbackMode: 'instant', examMode: true, attemptsLimit: 0, quiz,
      pendingGradingCount: 0, pendingAttemptsCount: 0, attemptsCount: 0, createdAt: 1,
    });

    // Ana handed in. Ben and Dia stopped halfway. Cara handed in, then left a retry.
    const ana = await start('Ana');
    await answer(ana, 0, 'I go to the beach.');
    await answer(ana, 1, recording);
    await answer(ana, 2, 0);
    await submit(ana);
    ben = await start('Ben');
    await answer(ben, 0, 'I played football.');
    const dia = await start('Dia');
    await answer(dia, 0, 'I saw my cousins.');
    const cara = await start('Cara');
    await answer(cara, 0, 'I stayed at home.');
    await answer(cara, 1, recording);
    await submit(cara);
    const retry = await start('Cara');
    await answer(retry, 0, 'A retry she never finished.');

    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => {
    await browser?.close();
    if (temp) fs.unlinkSync(temp);
  });

  it('agrees from the card to the ZIP, and comes back down after the import', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    // A browser that already built packs remembers the old default.
    await page.addInitScript(() => {
      localStorage.setItem('pinplay.aiGradeSubmittedOnly.v1', '1');
      window.__zips = [];
      window.JSZip = class {
        constructor() { this.files = {}; window.__zips.push(this.files); }
        file(name, content) { this.files[name] = content; }
        async generateAsync() { return new Blob(['zip']); }
      };
    });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === 'teacher.test') {
        const filename = path.resolve(`.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith('/') ? 'index.html' : '');
        if (!filename.startsWith(path.resolve('.') + path.sep) || !fs.existsSync(filename)) return route.fulfill({ status: 404 });
        const contentType = filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
        return route.fulfill({ contentType, body: fs.readFileSync(filename) });
      }
      if (url.pathname.endsWith('.js')) return route.fulfill({ contentType: 'application/javascript', body: '' });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.startsWith('/api/media/')) return route.fulfill({ headers: CORS, contentType: 'audio/webm', body: 'audio' });
      if (!url.pathname.startsWith('/api/')) return route.fulfill({ status: 404 });
      try {
        const response = await worker.fetch(new Request(`https://api.test${url.pathname}${url.search}`, {
          method: request.method(),
          headers: { 'Content-Type': 'application/json' },
          ...(request.method() === 'GET' ? {} : { body: request.postData() || '{}' }),
        }), env);
        return route.fulfill({ status: response.status, headers: CORS, contentType: 'application/json', body: await response.text() });
      } catch {
        return route.fulfill({ headers: CORS, json: { ok: true } });
      }
    });

    await page.goto('https://teacher.test/create/');
    await page.locator('#createPassword').fill(teacherPassword);
    await page.locator('#unlockCreateBtn').click();
    await page.locator('#createWorkspace').waitFor({ state: 'visible' });
    await page.locator('#assignmentSectionToggle').click();
    const card = page.locator(`#assignmentList .assignment-item[data-code="${code}"]`);
    await card.waitFor();

    // The card. Ana 2 + Ben 1 + Dia 1 + Cara 2; Cara's unfinished retry does not count.
    const badge = card.locator('.badge-pending');
    assert.equal(await badge.textContent(), '4 att · 6 to grade');

    // The rows add up to it, and say what state each attempt is in.
    await card.locator('.assignment-header').click();
    await card.locator('[data-results-toggle]').click();
    const rows = page.locator('#assignmentResultsList li').filter({ hasText: 'Pending teacher' });
    await rows.nth(4).waitFor();
    assert.equal(await rows.count(), 5);
    assert.equal(await page.locator('#assignmentResultsList .badge-set-aside').count(), 1);
    assert.match(await rows.filter({ hasText: 'Ben' }).textContent(), /In progress · last active/);
    assert.match(await rows.filter({ hasText: 'Ana' }).textContent(), /Pending teacher: 2 · Submitted/);
    if (shots) await page.locator('#assignmentReviewPanel').screenshot({ path: path.join(shots, 'rows.png') });
    await page.locator('#assignmentResultsFilter').selectOption('pending');
    assert.equal(await rows.count(), 4);

    // The picker says the same before anything is built, with nothing held back.
    await page.locator('#aiGradePackAssignmentBtn').click();
    const picker = page.locator('#aiGradePackPickerModal');
    await picker.waitFor();
    const said = await picker.textContent();
    assert.match(said, /All 6 answers to grade/);
    assert.match(said, /4 submitted · 2 in unfinished attempts/);
    assert.match(said, /1 in set-aside attempts not included/);
    assert.equal(await picker.locator('#aiGradePackSubmittedOnly').isChecked(), false);
    if (shots) await page.screenshot({ path: path.join(shots, 'picker.png') });

    // The ZIP holds exactly those answers.
    await picker.locator('[data-ai-pack-confirm]').click();
    await page.waitForFunction(() => window.__zips.length && window.__zips[0]['data.json']);
    const data = JSON.parse(await page.evaluate(() => window.__zips[0]['data.json']));
    const answers = data.attempts.flatMap((a) => a.answers.map((ans) => ({ ...ans, attemptId: a.attemptId, student: a.studentDisplayName, status: a.status })));
    assert.equal(answers.length, 6);
    assert.deepEqual(answers.map((a) => a.student).sort(), ['Ana', 'Ana', 'Ben', 'Cara', 'Cara', 'Dia']);
    assert.equal(answers.find((a) => a.student === 'Ben').status, 'in_progress');
    assert.ok(!answers.some((a) => a.text.includes('retry')));
    const prompt = await page.evaluate(() => window.__zips[0]['prompt.md']);
    assert.match(prompt, /Grade both the same\s+way/);

    // While the AI works, Ben changes his answer. Its grade is for the old one.
    await page.waitForTimeout(5);
    await answer(ben, 0, 'I played tennis, not football.');

    // The AI grades them all but is unsure of one, Ana's recording.
    const unsure = answers.find((a) => a.student === 'Ana' && a.qIndex === 1);
    const response = {
      version: 1,
      assignmentCode: code,
      packBuiltAt: data.packBuiltAt,
      results: answers.map((a) => ({
        attemptId: a.attemptId, qIndex: a.qIndex, qId: a.qId,
        points: a === unsure ? 0 : 800, verdict: a === unsure ? 'needs_review' : 'partial',
        confidence: 0.9, correction: '', correctedText: '', sampleAnswer: '', rationale: '', flags: [],
      })),
    };
    await page.locator('#aiGradePackAssignmentBtn').click();
    await picker.locator('[data-ai-pack-import]').click();
    const importer = page.locator('#aiGradeImportModal');
    await importer.locator('[data-import-input]').fill(JSON.stringify(response));
    await importer.locator('[data-import-parse]').click();
    const apply = importer.locator('[data-import-apply-safe]');
    await apply.waitFor();
    assert.equal(await apply.textContent(), 'Apply 4 grades');
    const benRow = importer.locator('tr', { hasText: 'Ben' });
    assert.match(await benRow.textContent(), /changed since this pack/);
    assert.equal(await benRow.locator('[data-include-row]').isChecked(), false);
    const diaRow = importer.locator('tr', { hasText: 'Dia' });
    assert.match(await diaRow.textContent(), /unfinished attempt/);
    assert.equal(await diaRow.locator('[data-include-row]').isChecked(), true);
    if (shots) await page.screenshot({ path: path.join(shots, 'import.png') });
    await apply.click();

    // Two left, on the card, in the dialog and in the list behind it.
    await importer.getByText('2 still to grade.').waitFor();
    assert.equal(await badge.textContent(), '2 att · 2 to grade');
    assert.equal(await page.locator('#assignmentResultsFilter').inputValue(), 'pending');
    assert.equal(await rows.count(), 2);
    assert.match(await rows.filter({ hasText: 'Ana' }).textContent(), /Pending teacher: 1/);
    assert.match(await rows.filter({ hasText: 'Ben' }).textContent(), /Pending teacher: 1/);
    if (shots) await page.screenshot({ path: path.join(shots, 'after.png') });

    // The count held across a full refresh from the server.
    await importer.locator('[data-import-cancel]').click();
    await page.locator('#refreshAssignmentsBtn').click();
    await page.waitForFunction((c) => document.querySelector(`.assignment-item[data-code="${c}"] .badge-pending`)?.textContent === '2 att · 2 to grade', code);

    assert.deepEqual(errors, []);
    await context.close();
  });
});
