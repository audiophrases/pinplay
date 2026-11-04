import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { loadDeclarations } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
let browser;
// 0.3 s of silence, 0.2 s of tone, 0.1 s of silence: the shape of a real take.
function takeWav() {
  const rate = 8000;
  const samples = Int16Array.from({ length: rate * 0.6 }, (_, i) => (i >= rate * 0.3 && i < rate * 0.5 ? Math.round(Math.sin(i / 3) * 12000) : 0));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + samples.byteLength, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(samples.byteLength, 40);
  return Buffer.concat([header, Buffer.from(samples.buffer)]);
}
describe('recording saves and script draft protection', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open(lines) {
    const page = await browser.newPage();
    const session = { id: 'abcdefgh23', title: 'Scene', allowEdits: true, lines: lines || [
      { id: 'l1', speaker: 'Mia', text: 'First line.', status: 'todo' },
      { id: 'l2', speaker: 'Tom', text: 'Second line.', status: 'todo' },
    ] };
    let reads = 0, writes = 0, fail = false, invalidConfirmation = false, release, brokenMedia = '';
    const takeBodies = [], mediaReads = [];
    await page.route('https://pinplay.test/**', route => {
      if (new URL(route.request().url()).pathname.endsWith('styles.css')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync('styles.css', 'utf8') });
      return route.fulfill({ contentType: 'text/html', body: fs.readFileSync('record/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') });
    });
    await page.route('https://api.pinplay.win/**', async route => {
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers });
      const { pathname } = new URL(route.request().url());
      if (pathname.startsWith('/api/media/')) {
        const key = pathname.replace('/api/media/', '');
        mediaReads.push(key);
        if (key === brokenMedia) return route.fulfill({ status: 404, headers, json: { error: 'File not found' } });
        return route.fulfill({ headers, contentType: 'audio/wav', body: takeWav() });
      }
      if (route.request().method() === 'GET') reads++;
      else {
        writes++;
        if (new URL(route.request().url()).pathname === '/api/rec/take') {
          takeBodies.push(route.request().postDataBuffer());
          if (fail) return route.fulfill({ status: 503, headers, json: { error: 'Offline' } });
          const line = session.lines.find(line => line.id === new URL(route.request().url()).searchParams.get('line'));
          line.status = 'recorded';
          line.take = { key: `voice-actors/${session.id}/${line.id}.webm`, at: Date.now() };
          return route.fulfill({ headers, json: invalidConfirmation ? { ok: true } : { ok: true, line, previousKey: '' } });
        }
        const data = route.request().postDataJSON();
        if (release === 'hold') await new Promise(resolve => { release = resolve; });
        if (fail) return route.fulfill({ status: 503, headers, json: { error: 'Offline' } });
        session.lines.find(line => line.id === data.line).text = data.text;
      }
      return route.fulfill({ headers, json: { session } });
    });
    await page.goto('https://pinplay.test/record/?s=abcdefgh23');
    await page.evaluate(() => {
      // Deterministic audio without requesting a real microphone in browser tests.
      navigator.mediaDevices.getUserMedia = async () => new MediaStream();
      window.MediaRecorder = class {
        static isTypeSupported() { return true; }
        constructor(stream, { mimeType }) { this.mimeType = mimeType; }
        start() {}
        stop() {
          this.ondataavailable({ data: new Blob(['recorded take'], { type: this.mimeType }) });
          this.onstop();
        }
      };
    });
    await page.addScriptTag({ path: 'voice-trim.js' });
    await page.addScriptTag({ path: 'record.js' });
    await page.locator('#recChoose').waitFor({ state: 'visible' });
    return { page, session, takeBodies, mediaReads, breakMedia(key) { brokenMedia = key; }, get reads() { return reads; }, get writes() { return writes; }, failSave() { fail = true; }, invalidateConfirmation() { invalidConfirmation = true; }, retrySave() { fail = invalidConfirmation = false; }, holdSave() { release = 'hold'; }, releaseSave() { release(); } };
  }
  async function recordTake(page) {
    await page.locator('#recRecord').click();
    await page.waitForFunction(() => document.getElementById('recRecord').textContent.includes('Stop'));
    await page.locator('#recRecord').click();
    assert.equal(await page.locator('#recSave').isEnabled(), true);
  }
  async function saveTake(page) {
    await page.locator('#recSave').click();
    await page.waitForFunction(() => !document.getElementById('recStatus').textContent.includes('Saving'));
  }
  it('accepts the saved line response, updates progress and finishes after the final take', async () => {
    const fixture = await open();
    const { page } = fixture;
    try {
      await page.locator('[data-rec-mode="all"]').click();
      await recordTake(page);
      await saveTake(page);
      assert.match(await page.locator('#recStatus').innerText(), /✅ Saved/);
      assert.match(await page.locator('#recProgress').innerText(), /Line 2 of 2 · 1 recorded/);
      assert.equal(await page.locator('#recSave').isDisabled(), true);
      await page.locator('#recPrevBtn').click();
      assert.equal(await page.locator('#recListen').isEnabled(), true);
      assert.equal(await page.locator('#recSave').isDisabled(), true);
      await page.locator('#recNextBtn').click();
      await recordTake(page);
      await saveTake(page);
      assert.match(await page.locator('#recStatus').innerText(), /✅ Saved/);
      assert.equal(await page.locator('#recDone').isVisible(), true);
      assert.equal(fixture.writes, 2);
    } finally { await page.close(); }
  });
  it('says so on the last line, and ✓ still leads somewhere once it is recorded', async () => {
    const fixture = await open();
    const { page } = fixture;
    try {
      await page.locator('[data-rec-mode="all"]').click();
      assert.equal(await page.locator('#recLast').isVisible(), false);
      assert.match(await page.locator('#recSave').innerText(), /Save & next/);
      await recordTake(page);
      await saveTake(page);
      assert.match(await page.locator('#recLast').innerText(), /Last line/);
      assert.match(await page.locator('#recSave').innerText(), /Save & finish/);
      assert.equal(await page.locator('#recSave').isDisabled(), true);
      assert.ok(Number(await page.locator('#recSave').evaluate((b) => getComputedStyle(b).opacity)) < 1, 'a disabled ✓ must not look pressable');
      await recordTake(page);
      assert.match(await page.locator('#recHint').innerText(), /Save & finish/);
      await saveTake(page);
      assert.equal(await page.locator('#recDone').isVisible(), true);
      // Back on the last line, with its take saved: this was the dead end.
      await page.locator('#recDoneBack').click();
      assert.match(await page.locator('#recProgress').innerText(), /Line 2 of 2 · 2 recorded/);
      assert.equal(await page.locator('#recNextBtn').isDisabled(), true);
      assert.match(await page.locator('#recLast').innerText(), /Every line here is recorded/);
      assert.match(await page.locator('#recSave').innerText(), /Finish/);
      await page.locator('#recSave').click();
      assert.equal(await page.locator('#recDone').isVisible(), true);
      assert.equal(fixture.writes, 2);
    } finally { await page.close(); }
  });
  it('from the end of the script, ✓ goes back to the lines that were skipped', async () => {
    const fixture = await open();
    const { page } = fixture;
    try {
      await page.locator('[data-rec-mode="all"]').click();
      await page.locator('#recNextBtn').click();
      assert.equal(await page.locator('#recLast').isVisible(), false);
      await recordTake(page);
      assert.match(await page.locator('#recSave').innerText(), /Save & next/);
      await saveTake(page);
      assert.match(await page.locator('#recStatus').innerText(), /end of the script\. Lines left to record: 1/);
      assert.match(await page.locator('#recProgress').innerText(), /Line 1 of 2 · 1 recorded/);
      await page.locator('#recNextBtn').click();
      assert.match(await page.locator('#recLast').innerText(), /End of the script\. Lines left to record: 1/);
      assert.match(await page.locator('#recSave').innerText(), /Lines left/);
      await page.locator('#recSave').click();
      assert.match(await page.locator('#recProgress').innerText(), /Line 1 of 2/);
      assert.equal(await page.locator('#recSave').isDisabled(), true);
    } finally { await page.close(); }
  });
  const take = (id) => ({ key: `voice-actors/abcdefgh23/${id}.wav`, at: 1 });
  const recordedScene = () => [
    { id: 'l1', speaker: 'Mia', text: 'First line.', status: 'recorded', take: take('l1') },
    { id: 'l2', speaker: 'Tom', text: 'Second line.', status: 'todo' },
    { id: 'l3', speaker: 'Mia', text: 'Third line.', status: 'recorded', take: take('l3') },
  ];
  async function countStarts(page) {
    await page.evaluate(() => {
      window.starts = [];
      const { start } = AudioBufferSourceNode.prototype;
      AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
        window.starts.push({ offset, duration });
        return start.call(this, when, offset, duration);
      };
    });
  }
  const playedAll = (page) => page.waitForFunction(() => document.getElementById('recWholeToggle').textContent.includes('from the start'));
  it('plays every take so far in script order, trimmed, skipping the lines not recorded', async () => {
    const fixture = await open(recordedScene());
    const { page } = fixture;
    try {
      await countStarts(page);
      await page.locator('#recChooseScript').click();
      fixture.session.lines[1] = { ...fixture.session.lines[1], status: 'recorded', take: take('l2b') }; // another volunteer, after the page loaded
      fixture.session.lines.push({ id: 'l4', speaker: 'Tom', text: 'Fourth line.', status: 'todo' });
      await page.locator('#recScriptListen').click();
      await page.locator('#recWhole').waitFor({ state: 'visible' });
      await page.locator('[data-line="l4"]').waitFor();
      assert.match(await page.locator('#recWholeInfo').innerText(), /3 of 4 lines recorded/);
      assert.match(await page.locator('#recWholeHint').innerText(), /skipped/);
      assert.equal(await page.locator('[data-line="l4"] button').isDisabled(), true);
      await playedAll(page);
      assert.deepEqual(fixture.mediaReads, ['voice-actors/abcdefgh23/l1.wav', 'voice-actors/abcdefgh23/l2b.wav', 'voice-actors/abcdefgh23/l3.wav']);
      const starts = await page.evaluate(() => window.starts);
      assert.equal(starts.length, 3);
      starts.forEach(({ offset, duration }) => {
        assert.ok(offset > 0.1 && offset < 0.25, `offset ${offset}`); // the silence before the speech is gone
        assert.ok(duration < 0.5, `duration ${duration}`);
      });
      assert.equal(await page.locator('#recWholeList .current').count(), 0);
      // Again from a line: no take is fetched twice.
      await page.locator('[data-whole-from="2"]').click();
      await playedAll(page);
      assert.equal(await page.evaluate(() => window.starts.length), 4);
      assert.equal(fixture.mediaReads.length, 3);
      await page.locator('#recWholeBack').click();
      assert.equal(await page.locator('#recScript').isVisible(), true);
    } finally { await page.close(); }
  });
  it('the thank-you opens the whole thing, and ⏸ holds it', async () => {
    const fixture = await open(recordedScene());
    const { page } = fixture;
    try {
      await countStarts(page);
      await page.locator('[data-rec-mode="all"]').click();
      assert.match(await page.locator('#recProgress').innerText(), /Line 2 of 3/);
      await recordTake(page);
      await saveTake(page);
      await page.locator('#recDoneListen').click();
      await page.waitForFunction(() => window.starts.length === 1);
      await page.locator('#recWholeToggle').click();
      assert.match(await page.locator('#recWholeToggle').innerText(), /Resume/);
      await page.waitForTimeout(1500); // longer than a take and the pause after it
      assert.equal(await page.evaluate(() => window.starts.length), 1);
      await page.locator('#recWholeToggle').click();
      await playedAll(page);
      assert.equal(await page.evaluate(() => window.starts.length), 3);
      await page.locator('#recWholeBack').click();
      assert.equal(await page.locator('#recDone').isVisible(), true);
    } finally { await page.close(); }
  });
  it('tells the volunteer when nothing is recorded yet, and carries on past a take that fails', async () => {
    const empty = await open();
    try {
      await empty.page.locator('#recChooseScript').click();
      await empty.page.locator('#recScriptListen').click();
      await empty.page.locator('#recWholeList li').first().waitFor();
      assert.match(await empty.page.locator('#recWholeHint').innerText(), /Nothing is recorded yet/);
      assert.equal(await empty.page.locator('#recWholeToggle').isDisabled(), true);
    } finally { await empty.page.close(); }
    const fixture = await open(recordedScene());
    const { page } = fixture;
    try {
      await countStarts(page);
      fixture.breakMedia('voice-actors/abcdefgh23/l1.wav');
      await page.locator('#recChooseScript').click();
      await page.locator('#recScriptListen').click();
      await page.waitForFunction(() => document.getElementById('recStatus').textContent.includes('could not be loaded'));
      assert.match(await page.locator('#recStatus').innerText(), /1 takes could not be loaded/);
      assert.equal(await page.evaluate(() => window.starts.length), 1);
    } finally { await page.close(); }
  });
  for (const failure of ['server error', 'missing confirmation']) {
    it(`keeps the take available for an identical retry after a ${failure}`, async () => {
      const fixture = await open();
      const { page } = fixture;
      try {
        await page.locator('[data-rec-mode="all"]').click();
        await recordTake(page);
        if (failure === 'server error') fixture.failSave();
        else fixture.invalidateConfirmation();
        await saveTake(page);
        assert.match(await page.locator('#recStatus').innerText(), /Not saved/);
        assert.match(await page.locator('#recProgress').innerText(), /Line 1 of 2 · 0 recorded/);
        assert.equal(await page.locator('#recListen').isEnabled(), true);
        assert.equal(await page.locator('#recSave').isEnabled(), true);
        fixture.retrySave();
        await saveTake(page);
        assert.match(await page.locator('#recStatus').innerText(), /✅ Saved/);
        assert.match(await page.locator('#recProgress').innerText(), /Line 2 of 2 · 1 recorded/);
        assert.equal(fixture.takeBodies.length, 2);
        assert.deepEqual(fixture.takeBodies[0], fixture.takeBodies[1]);
      } finally { await page.close(); }
    });
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
