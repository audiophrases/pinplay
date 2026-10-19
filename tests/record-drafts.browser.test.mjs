import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { loadDeclarations } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
let browser;
describe('recording script draft protection', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open() {
    const page = await browser.newPage();
    const session = { id: 'abcdefgh23', title: 'Scene', allowEdits: true, lines: [
      { id: 'l1', speaker: 'Mia', text: 'First line.', status: 'todo' },
      { id: 'l2', speaker: 'Tom', text: 'Second line.', status: 'todo' },
    ] };
    let reads = 0, writes = 0, fail = false, release;
    await page.route('https://pinplay.test/**', route => {
      if (new URL(route.request().url()).pathname.endsWith('styles.css')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync('styles.css', 'utf8') });
      return route.fulfill({ contentType: 'text/html', body: fs.readFileSync('record/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') });
    });
    await page.route('https://api.pinplay.win/**', async route => {
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers });
      if (route.request().method() === 'GET') reads++;
      else {
        writes++;
        const data = route.request().postDataJSON();
        if (release === 'hold') await new Promise(resolve => { release = resolve; });
        if (fail) return route.fulfill({ status: 503, headers, json: { error: 'Offline' } });
        session.lines.find(line => line.id === data.line).text = data.text;
      }
      return route.fulfill({ headers, json: { session } });
    });
    await page.goto('https://pinplay.test/record/?s=abcdefgh23');
    await page.addScriptTag({ path: 'record.js' });
    await page.locator('#recChoose').waitFor({ state: 'visible' });
    return { page, get reads() { return reads; }, get writes() { return writes; }, failSave() { fail = true; }, holdSave() { release = 'hold'; }, releaseSave() { release(); } };
  }
  async function choose(fixture) {
    await fixture.page.locator('[data-rec-mode="all"]').click();
    await fixture.page.locator('#recEditBtn').click();
    await fixture.page.locator('#recEditText').fill('Unsaved words.');
  }
  async function confirmClick(page, selector, accept = false) {
    const dialog = page.waitForEvent('dialog');
    const click = page.locator(selector).click();
    const prompt = await dialog;
    assert.match(prompt.message(), /not saved.*Discard/);
    if (accept) await prompt.accept(); else await prompt.dismiss();
    await click;
  }
  it('Next, changing views, changing character and refresh preserve drafts when discard is declined', async () => {
    const fixture = await open();
    const { page } = fixture;
    await choose(fixture);
    for (const selector of ['#recNextBtn', '#recScriptBtn', '#recBack', '#recRefresh', '#recEditCancel']) {
      await confirmClick(page, selector);
      assert.equal(await page.locator('#recEditText').inputValue(), 'Unsaved words.');
      assert.equal(await page.locator('#recEditBox').isVisible(), true);
      assert.match(await page.locator('#recProgress').innerText(), /Line 1 of 2/);
    }
    assert.equal(fixture.reads, 1);
    await confirmClick(page, '#recNextBtn', true);
    assert.match(await page.locator('#recProgress').innerText(), /Line 2 of 2/);
    await page.locator('#recEditBtn').click();
    await page.locator('#recEditText').fill('Second unsaved draft.');
    await confirmClick(page, '#recPrevBtn');
    assert.equal(await page.locator('#recEditText').inputValue(), 'Second unsaved draft.');
    await confirmClick(page, '#recEditCancel', true);
    await page.close();
  });
  it('whole-script switching, recording, back and refresh protect the active line draft', async () => {
    const fixture = await open();
    const { page } = fixture;
    await page.locator('#recChooseScript').click();
    await page.locator('[data-script-edit="l1"]').click();
    await page.locator('[data-script-text="l1"]').fill('Whole script draft.');
    for (const selector of ['[data-script-edit="l2"]', '[data-script-record="l2"]', '#recScriptBack', '#recScriptRecord', '#recScriptRefresh', '[data-script-remove="l2"]', '[data-script-rename="Tom"]']) {
      await confirmClick(page, selector);
      assert.equal(await page.locator('[data-script-text="l1"]').inputValue(), 'Whole script draft.');
    }
    assert.equal(fixture.reads, 1);
    await confirmClick(page, '[data-script-edit="l2"]', true);
    assert.equal(await page.locator('[data-script-text="l2"]').inputValue(), 'Second line.');
    await page.locator('#recScriptBack').click(); // unchanged words need no confirmation
    await page.close();
  });
  it('saved words persist and navigation stays blocked while the save is in flight', async () => {
    const fixture = await open();
    const { page } = fixture;
    await choose(fixture);
    fixture.holdSave();
    await page.locator('#recEditSave').click();
    await page.waitForFunction(() => document.getElementById('recEditText').disabled);
    assert.equal(await page.locator('#recNextBtn').isDisabled(), true);
    await page.locator('#recBack').click();
    assert.equal(await page.locator('#recStudio').isVisible(), true);
    fixture.releaseSave();
    await page.locator('#recEditBox').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#recText').innerText(), 'Unsaved words.');
    await page.locator('#recNextBtn').click();
    await page.locator('#recPrevBtn').click();
    assert.equal(await page.locator('#recText').innerText(), 'Unsaved words.');
    assert.equal(fixture.writes, 1);
    await page.close();
  });
  it('a failed save keeps the draft and still asks before moving to another line', async () => {
    const fixture = await open();
    const { page } = fixture;
    await choose(fixture);
    fixture.failSave();
    await page.locator('#recEditSave').click();
    await page.waitForFunction(() => document.getElementById('recStatus').textContent.includes('Not saved'));
    assert.equal(await page.locator('#recEditText').inputValue(), 'Unsaved words.');
    await confirmClick(page, '#recNextBtn');
    await confirmClick(page, '#recEditCancel', true);
    await page.close();
  });
  it('teacher text edits already save on confirmation and cancellation makes no request', async () => {
    const requests = [];
    let answer = 'Updated teacher words.';
    const va = { session: { id: 'abcdefgh23', lines: [{ id: 'l1', text: 'Original.' }] }, edits: new Map() };
    const teacher = loadDeclarations(fs.readFileSync('voice-actors.js', 'utf8'), ['vaChangeScript'], {
      va, prompt: () => answer, t: text => text, vaStop() {}, vaFlushSave: async () => {},
      vaRenderSession() {}, vaLoadTakes: async () => {}, vaStatus() {},
      vaApi: async (route, body) => {
        requests.push({ route, body });
        return { session: { id: 'abcdefgh23', lines: [{ id: 'l1', text: body.text }] } };
      },
    });
    await teacher.vaChangeScript('text', 'l1');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].route, 'script');
    assert.equal(requests[0].body.text, 'Updated teacher words.');
    assert.equal(va.session.lines[0].text, 'Updated teacher words.');
    answer = null;
    await teacher.vaChangeScript('text', 'l1');
    assert.equal(requests.length, 1);
  });
});
