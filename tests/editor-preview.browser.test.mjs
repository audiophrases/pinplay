/* Real assignment page and Worker, driven by the shipped editor preview functions.
   Media preparation and preview creation are stubbed; student routes are real. */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const appSource = fs.readFileSync('app.js', 'utf8');
const { chromium } = await import('playwright').catch(() => ({}));

const origin = 'https://pinplay.test';
const code = 'PREVIEW';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const clone = x => x === undefined ? x : structuredClone(x);
let browser, worker, QuizRoom, env, room, rows, temp;

const quiz = () => ({ title: 'Draft quiz', questions: [
  { id: 'first', type: 'mcq', prompt: 'First question', points: 1000, answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }] },
  { id: 'target', type: 'mcq', prompt: 'Target question', points: 1000, audioEnabled: true, audioMode: 'tts', audioText: 'Target question', ttsAudioKey: 'tts/target.mp3', answers: [{ text: 'One', correct: true }, { text: 'Two', correct: false }, { text: 'Three', correct: false }] },
  { id: 'slide', type: 'slide', prompt: 'Comparative: 2 things\nB is **bigger than** A.\nSuperlative: number 1 in a group\nC is **the biggest**.', points: 0,
    audioEnabled: true, audioMode: 'tts', audioText: 'Comparative and superlative', ttsAudioKey: 'tts/slide.mp3' },
  { id: 'listen1', type: 'text', prompt: 'First listening question', points: 1000, acceptedAnswers: ['one'], listeningSection: 'section1' },
  { id: 'listen2', type: 'text', prompt: 'Second listening question', points: 1000, acceptedAnswers: ['two'], listeningSection: 'section1' },
], listeningSections: [{ id: 'section1', title: 'Listening together', audio: { kind: 'file', url: 'https://pinplay.test/recording.mp3' } }] });
describe('editor preview uses the real assignment page', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const src = fs.readFileSync('cloudflare/worker.js', 'utf8').replace("'./taskflow-auth.mjs'", JSON.stringify(pathToFileURL(path.resolve('cloudflare/taskflow-auth.mjs')).href));
    temp = path.join(os.tmpdir(), `pinplay-editor-preview-${process.pid}.mjs`);
    fs.writeFileSync(temp, src);
    ({ default: worker, QuizRoom } = await import(pathToFileURL(temp).href));
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => {
    await browser?.close();
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
    env = { ROOMS: { idFromName: n => n, get: () => ({ fetch: (url, init) => room.fetch(new Request(url, init)) }) } };
    room = new QuizRoom({ storage }, env);
  });

  async function openEditor() {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.addInitScript(({ origin }) => {
      try { localStorage.setItem('pinplay.backend.v1', origin); } catch {}
      HTMLMediaElement.prototype.play = function () {
        window.__played ||= [];
        window.__played.push(this.src);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {};
    }, { origin });
    await context.route(`${origin}/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/create/') return route.fulfill({ contentType: 'text/html', body: '<button id="preview">Preview</button><div id="status"></div><div id="builder"></div>' });
      if (url.pathname === '/test-create') {
        const body = request.postDataJSON();
        rows.set(`ab:${code}`, { code, title: body.title, className: '__preview__', active: true, randomNames: true, attemptsLimit: 0,
          feedbackMode: 'instant', shuffleQuestions: true, quiz: body.quiz });
        return route.fulfill({ json: { assignment: { code } } });
      }
      if (url.pathname.startsWith('/api/')) {
        const init = { method: request.method(), headers: request.headers() };
        if (!['GET', 'HEAD'].includes(init.method)) init.body = request.postData() || undefined;
        const res = await worker.fetch(new Request(request.url(), init), env);
        return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
      }
      const file = path.join(process.cwd(), url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    const editor = await context.newPage();
    await editor.goto(`${origin}/create/`);
    await editor.evaluate(draft => {
      Object.assign(window, {
        quiz: draft, previewMode: { index: 0 }, previewPoll: null, editorPreviewQuestionId: null, editorPreviewOpening: false,
        createSessionPassword: 'teacher', creatorRole: 'owner', assignmentFeedbackMode: 'instant', assignmentExamMode: false,
        assignmentShuffleQuestionsEl: { checked: true }, assignmentAiCheckEl: { checked: false },
        hostStatusEl: document.getElementById('status'), builderQuestionsBodyEl: document.getElementById('builder'),
        builderSectionToggleEl: null, builderCardBodyEl: null, builderQuestionsToggleEl: null,
        questionListEl: document.getElementById('builder'),
        t: (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? '')),
        syncQuizFromUI: () => {
          document.querySelectorAll('[data-field="prompt"]').forEach(input => { quiz.questions[Number(input.dataset.q)].prompt = input.value; });
        },
        requireQuizTitle() {}, setSectionCollapsed() {},
        normalizeQuizForLive: q => structuredClone(q),
        ensureQuizMediaReady: async () => { window.mediaPrepared = true; },
        setStatus: (el, text) => { el.textContent = text; },
        renderBuilder: () => {
          const container = document.getElementById('builder');
          container.replaceChildren(...quiz.questions.map((q, i) => {
            const input = document.createElement('input'); input.dataset.q = i; input.dataset.field = 'prompt'; input.value = q.prompt; return input;
          }));
        },
        api: async (route, opts) => {
          if (route === '/api/preview/cleanup') { window.cleaned = opts.body.code; return {}; }
          if (!window.mediaPrepared) throw new Error('Media was not prepared');
          return (await fetch('/test-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.body) })).json();
        },
      });
    }, quiz());
    const names = ['openEditorPreview', 'closeEditorAssignmentPreview', 'editPreviewQuestion', 'launchStudentPreviewAssignment', 'cleanupPreviewPoll'];
    const start = appSource.indexOf("window.addEventListener('message'", appSource.indexOf('let editorPreviewOpening'));
    const end = appSource.indexOf('function editPreviewQuestion()', start);
    await editor.addScriptTag({ content: names.map(name => extractDeclaration(appSource, name)).join('\n') + '\n' + appSource.slice(start, end) });
    await editor.evaluate(() => { document.getElementById('preview').onclick = () => openEditorPreview(1); });
    const popupPromise = editor.waitForEvent('popup');
    await editor.click('#preview');
    const page = await popupPromise;
    await page.waitForURL('**/?assignment=**', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(() => document.getElementById('joinPrompt')?.textContent.includes('Target question'), null, { timeout: 10000 });
    return { editor, page, context, errors };
  }

  it('opens by ID with full controls and audio, navigates listening sections, then returns to the latest draft', async () => {
    const { editor, page, context, errors } = await openEditor();
    try {
      assert.equal(await page.locator('#joinSubmitBtn').isVisible(), true);
      assert.match(await page.locator('#joinSubmitBtn').textContent(), /Save answer/);
      assert.equal(await page.locator('#joinTimer').isVisible(), true);
      assert.equal(await page.locator('#muteMusicBtn').isVisible(), true);
      assert.equal(await page.locator('iframe').count(), 0);
      await page.waitForFunction(() => window.__played?.some(url => url.includes('tts/target.mp3')));
      const order = await page.locator('#joinAnswers').textContent();
      const select = page.locator('#editorPreviewNavigation select');
      await select.selectOption('slide');
      assert.match(await page.locator('#joinPrompt').textContent(), /Superlative/);
      assert.equal(await page.locator('#joinSubmitBtn').isVisible(), true);
      // A teaching slide's 🎓 and 🎧 replay sit in the header; its text gets the whole slide.
      assert.equal(await page.locator('#joinSlideMark').isVisible(), true);
      assert.equal(await page.locator('#joinSlideAudio .audio-eq-replay').isVisible(), true);
      assert.doesNotMatch(await page.locator('#joinPrompt').textContent(), /🎓|🎧/);
      if (process.env.PINPLAY_SLIDE_SHOTS) await page.screenshot({ path: path.join(process.env.PINPLAY_SLIDE_SHOTS, 'preview-slide.png'), style: '#editorPreviewNavigation { visibility: hidden }' });
      await select.selectOption('target');
      assert.equal(await page.locator('#joinSlideMark').isVisible(), false);
      assert.equal(await page.locator('#joinSlideAudio').isVisible(), false);
      assert.equal(await page.locator('#joinPrompt .audio-eq-replay').count(), 1);
      assert.equal(await page.locator('#joinAnswers').textContent(), order);
      await select.selectOption('listen2');
      await page.locator('#listeningSheet').waitFor();
      assert.match(await page.locator('#listeningSheet').textContent(), /First listening question/);
      assert.match(await page.locator('#listeningSheet').textContent(), /Second listening question/);
      assert.equal(await page.locator('.ls-player').isVisible(), true);
      await select.selectOption('target');
      assert.equal(await page.locator('#listeningSheet').count(), 0);
      // A draft edit made while the preview is open must survive the return.
      await editor.evaluate(() => { renderBuilder(); });
      await editor.locator('[data-q="0"]').fill('Unsaved other edit');
      await page.getByRole('button', { name: 'Edit this question', exact: true }).click();
      await editor.locator('#editorPreviewReturn').waitFor();
      assert.equal(await editor.locator('[data-q="0"]').inputValue(), 'Unsaved other edit');
      assert.equal(await editor.locator('[data-q="1"]').evaluate(el => document.activeElement === el), true);
      await editor.locator('[data-q="1"]').fill('Updated target question');
      const popupPromise = editor.waitForEvent('popup');
      await editor.locator('#editorPreviewReturn').click();
      const updated = await popupPromise;
      await updated.waitForFunction(() => document.getElementById('joinPrompt')?.textContent.includes('Updated target question'));
      assert.equal(await editor.evaluate(() => quiz.questions[0].prompt), 'Unsaved other edit');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
  it('reports blocked pop-ups and incomplete questions without leaving a blank preview tab', async () => {
    const { editor, context } = await openEditor();
    try {
      await editor.evaluate(async () => {
        closeEditorAssignmentPreview();
        const realOpen = window.open;
        window.open = () => null;
        await openEditorPreview(1);
        window.open = realOpen;
      });
      assert.match(await editor.locator('#status').textContent(), /Allow pop-ups/);
      await editor.evaluate(() => { normalizeQuizForLive = () => ({ questions: [] }); });
      const popupPromise = editor.waitForEvent('popup');
      await editor.click('#preview');
      const blank = await popupPromise;
      await editor.waitForFunction(() => document.getElementById('status').textContent.includes('This question is incomplete'));
      assert.equal(blank.isClosed(), true);
      assert.equal(await editor.evaluate(() => editorPreviewOpening), false);
    } finally { await context.close(); }
  });

});
