import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import('playwright').catch(() => ({}));
let browser;
const source = fs.readFileSync('create/index.html', 'utf8');
const card = source.slice(source.indexOf('          <!-- Listening activity:'), source.indexOf('          <!-- Guest-only banner -->'));
describe('listening activity workspace', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(path => path && fs.existsSync(path));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open({ width = 1100, storage = false, page: existing } = {}) {
    const page = existing || await browser.newPage({ viewport: { width, height: 940 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.route('https://listening.test/**', route => route.fulfill({ contentType: 'text/html', body: `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main class="container">${card}</main></body></html>` }));
    await page.goto('https://listening.test/');
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(storage => {
      window.t = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
      window.escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
      window.quiz = { title: 'Unit 2', listeningSections: [] };
      window.createSessionPassword = 'teacher';
      window.DEFAULT_BACKEND_URL = 'https://api.test';
      window.loadBackendUrl = () => 'https://api.test';
      window.normalizeBackendUrl = value => value;
      window.calls = [];
      window.apiFail = false;
      window.latest = { id: 'abcdefgh23', title: 'Weekend', allowEdits: true, lines: [{ id: 'l1', speaker: 'Mia', text: 'Latest edited words.', status: 'todo' }] };
      window.api = async (route, opts) => {
        window.calls.push({ route, opts });
        if (window.apiFail) throw new Error('Offline');
        return route.endsWith('/list') ? { sessions: [{ ...window.latest, total: 1, recorded: 0, approved: 0 }] } : { session: structuredClone(window.latest) };
      };
      window.openListeningPrompt = opts => window.calls.push({ prompt: opts });
      window.open = (url, name) => { window.calls.push({ open: url, name }); return {}; };
      window.setSectionCollapsed = (button, body, collapsed) => body.classList.toggle('hidden', collapsed);
      window.listeningSectionToggleEl = document.getElementById('listeningSectionToggle');
      window.listeningCardBodyEl = document.getElementById('listeningCardBody');
      window.findListeningSection = id => window.quiz.listeningSections.find(section => section.id === id);
      window.attachListeningRecording = async (id, file) => { window.calls.push({ attached: id, name: file.name }); window.findListeningSection(id).audio = { name: file.name }; };
      window.builderSectionToggleEl = document.createElement('button');
      window.builderCardBodyEl = document.createElement('div');
      window.builderQuestionsToggleEl = document.createElement('button');
      window.builderQuestionsBodyEl = document.createElement('div');
      window.questionListEl = document.createElement('div');
      document.getElementById('listeningCardBody').classList.remove('hidden');
      if (storage) Object.defineProperty(window, 'localStorage', { value: { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Disabled'); } } });
    }, storage);
    await page.addScriptTag({ path: 'listening-script.js' });
    await page.addScriptTag({ path: 'voice-actors.js' });
    await page.addScriptTag({ path: 'listening-workspace.js' });
    return { page, errors };
  }
  it('offers four starting points, exposes the matching editor, and supports keyboard tabs', async () => {
    const { page, errors } = await open();
    assert.equal(await page.locator('[data-lr-start]').count(), 4);
    assert.equal(await page.locator('#voiceActorsOpenBtn').isVisible(), true);
    await page.locator('[data-lr-start="generate"]').click();
    assert.equal(await page.locator('#lrGenerator').getAttribute('open'), '');
    assert.equal(await page.locator('#lrTopic').evaluate(element => document.activeElement === element), true);
    await page.locator('#lrRecordedBy').selectOption('studio');
    await page.locator('#lrScriptToggle').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#lrVoicesToggle').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-lr-method="studio"]').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#lrQuestionsBody').isVisible(), true);
    await page.locator('#lrChangeStart').click();
    await page.locator('[data-lr-start="paste"]').click();
    assert.equal(await page.locator('#lrGenerator').getAttribute('open'), null);
    assert.equal(await page.locator('#lrScript').evaluate(element => document.activeElement === element), true);
    await page.screenshot({ path: 'tests/artifacts/listening-script-desktop.png', fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('saves script drafts and settings across reload and handles unavailable storage', async () => {
    const { page, errors } = await open();
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrDraftTitle').fill('Our draft');
    await page.locator('#lrScript').fill('Mia: Hello.\nTom: Hi!');
    await page.waitForFunction(() => document.getElementById('lrDraftStatus').textContent === 'Draft saved on this device');
    await open({ page });
    assert.equal(await page.locator('#lrScript').inputValue(), 'Mia: Hello.\nTom: Hi!');
    assert.equal(await page.locator('#lrDraftTitle').inputValue(), 'Our draft');
    assert.equal(await page.locator('#lrWorkspace').isVisible(), true);
    assert.equal(await page.locator('#lrDraftStatus').innerText(), 'Draft restored from this device');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pinplay.listening-draft.v1:https://api.test')).fields.lrScript), 'Mia: Hello.\nTom: Hi!');
    assert.deepEqual(errors, []);
    await page.close();
    const unavailable = await open({ storage: true });
    await unavailable.page.locator('[data-lr-start="paste"]').click();
    assert.match(await unavailable.page.locator('#lrDraftStatus').innerText(), /could not be saved/);
    assert.equal(await unavailable.page.locator('#lrScript').isEditable(), true);
    assert.deepEqual(unavailable.errors, []);
    await unavailable.page.close();
  });
  it('selects a recording session and fetches its latest edits before questions, blocking stale results on failure', async () => {
    const { page, errors } = await open();
    await page.locator('[data-lr-start="sessions"]').click();
    await page.locator('[data-va-open="abcdefgh23"]').click();
    await page.locator('[data-va-close]').click();
    assert.equal(await page.locator('#lrSessionSource').innerText(), 'Recording session: Weekend');
    assert.equal(await page.locator('#lrScript').inputValue(), 'Mia: Latest edited words.');
    assert.equal(await page.locator('#lrScript').isEditable(), false);
    await page.evaluate(() => { window.latest.lines[0].text = 'Changed on another device.'; });
    await page.locator('#lrQuestionsToggle').click();
    await page.locator('#lrQuestionsBtn').click();
    await page.waitForFunction(() => window.calls.some(call => call.prompt));
    assert.equal(await page.evaluate(() => window.calls.find(call => call.prompt).prompt.transcript), 'Mia: Changed on another device.');
    await page.evaluate(() => { window.apiFail = true; window.calls.length = 0; });
    await page.locator('#lrQuestionsBtn').click();
    assert.match(await page.locator('#lrStatus').innerText(), /Could not load the latest script/);
    assert.equal(await page.evaluate(() => window.calls.some(call => call.prompt)), false);
    await page.locator('#lrScriptToggle').click();
    await page.locator('#lrDetachSession').click();
    assert.equal(await page.locator('#lrScript').isEditable(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('uploads audio, preserves the explicit section destination, and supports audio-only questions', async () => {
    const { page, errors } = await open();
    await page.locator('[data-lr-start="upload"]').click();
    assert.equal(await page.locator('[data-lr-method="upload"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#lrAudioFile').setInputFiles({ name: 'scene.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(44) });
    assert.equal(await page.locator('#lrAudioName').innerText(), 'scene.wav');
    await page.locator('#lrQuestionsToggle').click();
    await page.locator('#lrQuestionsBtn').click();
    assert.equal(await page.evaluate(() => window.calls.find(call => call.prompt).prompt.source), 'attach');
    await page.evaluate(() => { window.quiz.listeningSections = [{ id: 's1', title: 'Part 1' }, { id: 's2', title: 'Part 2' }]; lrRefreshWorkspace(); });
    await page.getByText('Use with an existing listening section', { exact: true }).click();
    await page.locator('#lrTargetSection').selectOption('s2');
    await page.locator('#lrAttachAudio').click();
    assert.equal(await page.evaluate(() => window.calls.find(call => call.attached).attached), 's2');
    assert.equal(await page.locator('#lrTargetSection').inputValue(), 's2');
    assert.match(await page.locator('#lrStatus').innerText(), /Recording added/);
    assert.deepEqual(errors, []);
    await page.close();
  });
  // A stand-in for listening-studio/server.py on 127.0.0.1:8790.
  async function fakeStudio(page) {
    const studio = {
      offline: false, calls: [],
      status: { ok: true, job: null, queue: [], now: 1000 },
      recording: { recording: { id: 'a1b2c3d4e5f6', title: 'Weekend plans', stage: 'setup', text: 'Mia: Hello.\nTom: Hi!' }, result: null },
    };
    await page.route('http://127.0.0.1:8790/**', route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': 'https://listening.test', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (studio.offline) return route.abort('connectionrefused');
      studio.calls.push({ method: request.method(), path: url.pathname, body: request.method() === 'POST' ? request.postDataJSON() : null });
      if (url.pathname === '/api/status') return route.fulfill({ headers, json: studio.status });
      if (request.method() === 'POST' && url.pathname === '/api/recordings') return route.fulfill({ headers, json: { id: 'a1b2c3d4e5f6' } });
      if (url.pathname === '/api/recordings/a1b2c3d4e5f6') return route.fulfill({ headers, json: studio.recording });
      if (url.pathname.startsWith('/api/recordings/a1b2c3d4e5f6/audio/out/')) return route.fulfill({ headers: { ...headers, 'Content-Type': 'audio/mpeg' }, body: Buffer.from('ID3 fake mp3') });
      return route.fulfill({ status: 404, headers, json: { detail: 'Recording not found.' } });
    });
    return studio;
  }
  it('sends the script to Listening Studio, follows it, and puts its MP3 into the chosen section', async () => {
    const { page, errors } = await open();
    const studio = await fakeStudio(page);
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrDraftTitle').fill('Weekend plans');
    await page.locator('#lrScript').fill('Mia: Hello.\nTom: Hi!');
    await page.locator('#lrVoicesToggle').click();
    await page.locator('[data-lr-method="studio"]').click();
    await page.locator('#lrStudioBtn').click();
    await page.locator('#lrStudioOpen').waitFor({ state: 'visible' });
    // No language or voices yet: the studio opens it on its set-up form.
    const sent = studio.calls.find(call => call.method === 'POST');
    assert.deepEqual([sent.body.text, sent.body.title, sent.body.setup], ['Mia: Hello.\nTom: Hi!', 'Weekend plans', true]);
    assert.deepEqual(await page.evaluate(() => window.calls.find(call => call.open)), { open: 'http://127.0.0.1:8790/#r=a1b2c3d4e5f6', name: 'pinplay-listening-studio' });
    await page.waitForFunction(() => /describe the voices/.test(document.getElementById('lrStudioState').textContent));
    assert.equal(await page.locator('#lrStudioBtn').isVisible(), false);
    assert.equal(await page.locator('#lrSessionSource').innerText(), 'Listening Studio: Weekend plans');
    // Edited and being made in the studio: the card follows, the script box too.
    const edited = 'LANGUAGE: English\nVOICE Mia: A young woman.\nVOICE Tom: A young man.\nMia (happy): Hello there.\nTom: Hi!';
    studio.recording.recording = { ...studio.recording.recording, stage: 'approved', text: edited };
    studio.status = { ok: true, job: { id: 'a1b2c3d4e5f6', stage: 'lines', done: 3, total: 10, stages: { lines: 900 }, at: 960 }, queue: [], now: 970 };
    await page.evaluate(() => lrStudioRefresh());
    assert.equal(await page.locator('#lrStudioState').innerText(), 'Making lines 3/10 · about 2 min left');
    assert.equal(await page.locator('#lrScript').inputValue(), edited);
    assert.equal(await page.locator('#lrScript').isEditable(), false);
    await page.locator('#lrScriptToggle').click();
    assert.equal(await page.locator('#lrEditStudio').isVisible(), true);
    assert.equal(await page.locator('#lrEditSession').isVisible(), false);
    // Two parts, two sections: the second section takes the second part.
    studio.status = { ok: true, job: null, queue: [], now: 1100 };
    studio.recording.result = { parts: [{ label: 'Part 1', mp3: 'D:\\data\\out\\Weekend-plans-Part-1.mp3', seconds: 41.2 }, { label: 'Part 2', mp3: 'D:\\data\\out\\Weekend-plans-Part-2.mp3', seconds: 38 }] };
    await page.evaluate(() => { window.quiz.listeningSections = [{ id: 's1', title: 'Part 1' }, { id: 's2', title: 'Part 2' }]; return lrStudioRefresh(); });
    assert.equal(await page.locator('#lrVoicesToggle').innerText(), 'Recording\nStudio recording ready');
    await page.locator('#lrQuestionsToggle').click();
    await page.getByText('Use with an existing listening section', { exact: true }).click();
    await page.locator('#lrTargetSection').selectOption('s2');
    assert.equal(await page.locator('#lrStudioPart').inputValue(), '1');
    await page.locator('#lrUseStudioAudio').click();
    await page.waitForFunction(() => window.calls.some(call => call.attached));
    assert.deepEqual(await page.evaluate(() => window.calls.find(call => call.attached)), { attached: 's2', name: 'Weekend-plans-Part-2.mp3' });
    assert.ok(studio.calls.some(call => call.path === '/api/recordings/a1b2c3d4e5f6/audio/out/Weekend-plans-Part-2.mp3'));
    assert.match(await page.locator('#lrStatus').innerText(), /Studio recording added/);
    // Questions use the studio's latest script; with the studio closed, only after asking.
    studio.recording.recording.text = `${edited}\nMia: One more line.`;
    await page.locator('#lrQuestionsBtn').click();
    await page.waitForFunction(() => window.calls.some(call => call.prompt));
    assert.equal(await page.evaluate(() => window.calls.find(call => call.prompt).prompt.transcript), `${edited}\nMia: One more line.`);
    studio.offline = true;
    await page.evaluate(() => { window.calls.length = 0; });
    page.once('dialog', dialog => { assert.match(dialog.message(), /not running/); dialog.accept(); });
    await page.locator('#lrQuestionsBtn').click();
    await page.waitForFunction(() => window.calls.some(call => call.prompt));
    assert.equal(await page.evaluate(() => window.calls.find(call => call.prompt).prompt.transcript), `${edited}\nMia: One more line.`);
    await page.locator('#lrScriptToggle').click();
    await page.locator('#lrDetachSession').click();
    assert.equal(await page.locator('#lrScript').isEditable(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('offers the copy-and-paste way when Listening Studio is not running, and starts a complete script at once', async () => {
    const { page, errors } = await open();
    const studio = await fakeStudio(page);
    studio.offline = true;
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrScript').fill('LANGUAGE: English\nVOICE Mia: A young woman.\nMia: Hello.');
    await page.locator('#lrVoicesToggle').click();
    await page.locator('[data-lr-method="studio"]').click();
    await page.locator('#lrStudioBtn').click();
    await page.waitForFunction(() => /Could not reach Listening Studio/.test(document.getElementById('lrStatus').textContent));
    assert.equal(await page.locator('#lrStudioCopy').isVisible(), true);
    assert.equal(await page.locator('#lrScript').isEditable(), true);
    studio.offline = false;
    await page.locator('#lrStudioBtn').click();
    await page.locator('#lrStudioOpen').waitFor({ state: 'visible' });
    assert.equal(studio.calls.find(call => call.method === 'POST').body.setup, false);
    assert.equal(await page.locator('#lrStudioCopy').isVisible(), false);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('asks before replacing a separate draft with a recording session', async () => {
    const { page, errors } = await open();
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrScript').fill('Tom: Keep this draft.');
    await page.locator('#voiceActorsOpenBtn').click();
    const dialog = page.waitForEvent('dialog');
    const click = page.locator('[data-va-open="abcdefgh23"]').click();
    const confirmation = await dialog;
    assert.match(confirmation.message(), /Replace the current draft/);
    await confirmation.dismiss();
    await click;
    await page.locator('[data-va-close]').click();
    assert.equal(await page.locator('#lrScript').inputValue(), 'Tom: Keep this draft.');
    assert.equal(await page.locator('#lrScript').isEditable(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('fits a mobile viewport and keeps the script generator optional', async () => {
    const { page, errors } = await open({ width: 375 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/artifacts/listening-start-mobile.png', fullPage: true });
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrScript').fill('Mia: Hello!\nTom: Hi!');
    assert.equal(await page.locator('#lrCopyPromptBtn').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/artifacts/listening-script-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('works in the full teacher page with its real initialization and command palette', async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'teacher.test') {
        const filename = path.resolve(`.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith('/') ? 'index.html' : '');
        if (!filename.startsWith(path.resolve('.') + path.sep) || !fs.existsSync(filename)) return route.fulfill({ status: 404 });
        const contentType = filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
        return route.fulfill({ contentType, body: fs.readFileSync(filename) });
      }
      if (url.pathname.endsWith('.js')) return route.fulfill({ contentType: 'application/javascript', body: '' });
      return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, json: { ok: true, role: 'owner', questions: 0 } });
    });
    await page.goto('https://teacher.test/create/');
    await page.locator('#createPassword').fill('test');
    await page.locator('#unlockCreateBtn').click();
    await page.locator('#createWorkspace').waitFor({ state: 'visible' });
    await page.locator('#listeningSectionToggle').click();
    await page.locator('[data-lr-start="paste"]').click();
    await page.locator('#lrScript').fill('Mia: This is our script.');
    await page.locator('#lrVoicesToggle').click();
    await page.locator('[data-lr-method="studio"]').click();
    assert.equal(await page.locator('#lrStudioBtn').isVisible(), true);
    await page.keyboard.press('Control+k');
    await page.locator('.cmdp-input').fill('Copy the script prompt');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#lrScriptBody').isVisible(), true);
    assert.equal(await page.locator('#lrCopyPromptBtn').isVisible(), true);
    assert.equal(await page.locator('#lrScriptToggle').getAttribute('aria-selected'), 'true');
    await page.locator('#lrGenerator').evaluate(element => { element.open = false; });
    await page.locator('#listeningCard').screenshot({ path: 'tests/artifacts/listening-full-teacher.png' });
    assert.deepEqual(errors, []);
    await page.close();
  });
});
