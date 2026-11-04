/* 🤖 The real student page against the real Worker, with only OpenAI stubbed:
   with instant feedback an open answer is scored the moment it is saved. */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('playwright').catch(() => ({}));

const origin = 'https://pinplay.test';
const code = 'AISCORE';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const clone = x => x === undefined ? x : structuredClone(x);
const realFetch = globalThis.fetch;
let browser, worker, QuizRoom, env, room, rows, temp;
let reply, openAiStatus, calls;

const quiz = () => ({ title: 'Writing', questions: [
  { id: 'q1', type: 'open', prompt: 'Describe your best friend in two sentences.', points: 1000 },
  { id: 'q2', type: 'open', prompt: 'What did you do last weekend?', points: 2000 },
  { id: 'q3', type: 'mcq', prompt: 'Pick the first one', points: 1000, answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
] });
const hud = page => page.locator('#joinStatusHud');
const note = page => page.locator('.ai-note-reveal');
const answerBox = page => page.locator('#joinAnswers textarea, #joinQuestionInteractive textarea').first();

describe('an open answer scored on the student page', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
    temp = path.join(os.tmpdir(), `pinplay-ai-score-${process.pid}.mjs`);
    fs.writeFileSync(temp, src);
    ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
    globalThis.fetch = async (url, init) => {
      if (!String(url).startsWith('https://api.openai.com/')) return realFetch(url, init);
      calls.push(JSON.parse(JSON.parse(init.body).input));
      if (openAiStatus !== 200) return new Response('{}', { status: openAiStatus });
      const text = JSON.stringify(reply());
      return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }), { status: 200 });
    };
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => {
    await browser?.close();
    globalThis.fetch = realFetch;
    if (temp) fs.unlinkSync(temp);
  });
  beforeEach(async () => {
    rows = new Map();
    const storage = {
      get: async k => clone(rows.get(k)),
      put: async (k, v) => rows.set(k, clone(v)),
      delete: async k => { (Array.isArray(k) ? k : [k]).forEach(key => rows.delete(key)); },
      list: async ({ prefix = '' } = {}) => new Map([...rows].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, clone(v)])),
    };
    env = { OPENAI_API_KEY: 'sk-test', ROOMS: { idFromName: n => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
    room = new QuizRoom({ storage }, env);
    calls = [];
    openAiStatus = 200;
    reply = () => ({ task: 'partly', score: 4, feedback: 'Say what she is like.' });
    await storage.put(`ab:${code}`, {
      code, title: 'Writing', active: true, feedbackMode: 'instant', randomNames: true, attemptsLimit: 0, aiCheck: true,
      pendingGradingCount: 0, pendingAttemptsCount: 0, attemptsCount: 0, quiz: quiz(),
    });
  });

  async function open() {
    const page = await browser.newPage({ viewport: { width: 1000, height: 820 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ origin }) => localStorage.setItem('pinplay.backend.v1', origin), { origin });
    await page.route(`${origin}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const init = { method: request.method(), headers: request.headers() };
        if (!['GET', 'HEAD'].includes(request.method())) init.body = request.postData() || undefined;
        const res = await worker.fetch(new Request(request.url(), init), env);
        return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
      }
      const file = path.join(process.cwd(), decodeURIComponent(url.pathname));
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto(`${origin}/index.html?assignment=${code}`);
    await page.locator('#joinBtn').click();
    await answerBox(page).waitFor({ state: 'visible' });
    return { page, errors };
  }

  const saveAnswer = async (page, text) => {
    await answerBox(page).fill(text);
    await page.locator('#joinSubmitBtn').click();
  };

  it('shows the score and feedback at once, counts them, and moves on', async () => {
    const { page, errors } = await open();
    await saveAnswer(page, 'My friend Ana is kind.');
    await note(page).waitFor();
    assert.equal(await hud(page).textContent(), '🤖 AI score: 400 / 1000');
    assert.ok(await hud(page).evaluate(el => el.classList.contains('bad')), 'a weak answer does not read as right');
    const text = await note(page).textContent();
    assert.match(text, /400 \/ 1000 pts/);
    assert.match(text, /Part of the task is missing/);
    assert.match(text, /Say what she is like\./);
    assert.match(text, /Your teacher can change this score\./);
    assert.equal(await note(page).locator('.student-answer-reveal-title span').last().evaluate(el => el.style.background), 'rgb(220, 38, 38)');
    assert.equal(await page.getByText('Teacher Feedback').count(), 0);
    assert.equal(await answerBox(page).isDisabled(), true);
    assert.match(await page.locator('#joinScore').textContent(), /400/);
    assert.equal(rows.get(`ab:${code}`).pendingGradingCount, 0);

    // A good answer, on a question worth more: its own points, in green.
    reply = () => ({ task: 'done', score: 10, feedback: 'Well done.' });
    await page.locator('#joinSubmitBtn').click();
    await page.getByText('What did you do last weekend?').waitFor();
    assert.equal(await note(page).count(), 0, 'nothing left over from the last question');
    await saveAnswer(page, 'I went to the beach.');
    await note(page).waitFor();
    assert.equal(await hud(page).textContent(), '🤖 AI score: 2000 / 2000');
    assert.ok(await hud(page).evaluate(el => el.classList.contains('ok')));
    assert.match(await page.locator('#joinScore').textContent(), /2,?400/);
    assert.equal(calls.length, 2);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('shows the score again when the student goes back to the question', async () => {
    const { page, errors } = await open();
    await saveAnswer(page, 'My friend Ana is kind.');
    await note(page).waitFor();
    await page.locator('#joinSubmitBtn').click();
    await page.getByText('What did you do last weekend?').waitFor();
    await page.evaluate(() => moveAssignmentIndex(-1));
    await page.getByText('Describe your best friend in two sentences.').waitFor();
    await note(page).waitFor();
    assert.match(await note(page).textContent(), /400 \/ 1000 pts/);
    assert.equal(await answerBox(page).inputValue(), 'My friend Ana is kind.');
    assert.equal(await answerBox(page).isDisabled(), true);
    assert.equal(calls.length, 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('without OpenAI the answer is saved and waits for the teacher, and the student carries on', async () => {
    openAiStatus = 500;
    const { page, errors } = await open();
    await saveAnswer(page, 'My friend Ana is kind.');
    await page.locator('#joinSubmitBtn', { hasText: /continue/i }).waitFor();
    assert.equal(await note(page).count(), 0);
    assert.doesNotMatch(await hud(page).textContent(), /AI score/);
    assert.equal(rows.get(`ab:${code}`).pendingGradingCount, 1);
    await page.locator('#joinSubmitBtn').click();
    await page.getByText('What did you do last weekend?').waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  });
});
