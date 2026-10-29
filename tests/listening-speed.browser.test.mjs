import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const source = fs.readFileSync('play.js', 'utf8');
const names = ['listeningSheet', 'addListeningSpeed', 'formatListeningTime', 'renderListeningPlayer'];
let browser;

// A real, locally generated recording lets us measure media time against wall
// time without network requests or mocked HTMLMediaElement playback.
const sampleRate = 8000;
const wav = Buffer.alloc(44 + sampleRate * 20 * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < sampleRate * 20; i += 1) {
  wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / sampleRate) * 800), 44 + i * 2);
}
const audioUrl = `data:audio/wav;base64,${wav.toString('base64')}`;

describe('student listening playback speed', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open({ playsAllowed = 0, speedAllowed = true, locked = false } = {}) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="player"></div>');
    await page.evaluate(() => {
      window.t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
      window.listeningStatus = () => {};
      window.live = { player: { assignment: { code: 'QUIZ', attemptId: 'student', state: { attempt: { listeningPlays: {} } } } } };
      window.calls = [];
      window.api = async (route, opts) => {
        calls.push({ route, ...opts });
        return { plays: 1 };
      };
    });
    await page.addScriptTag({ content: names.map(name => extractDeclaration(source, name)).join('\n') });
    await page.evaluate(({ audioUrl, playsAllowed, speedAllowed, locked }) => {
      window.section = { id: 'part1', audioUrl, playsAllowed, speedAllowed, pauseAllowed: true };
      window.redraw = () => renderListeningPlayer(document.getElementById('player'), section, live.player.assignment.state.attempt, locked);
      redraw();
      window.audio = listeningSheet.audio;
    }, { audioUrl, playsAllowed, speedAllowed, locked });
    return { page, errors };
  }

  async function expectRate(page, rate) {
    await page.waitForFunction(rate => audio.playbackRate === rate && audio.defaultPlaybackRate === rate, rate, { timeout: 2000 });
    assert.equal(await page.locator('.ls-speed-value').textContent(), `${Math.round(rate * 100)}%`);
  }

  async function measuredRate(page) {
    const start = await page.evaluate(() => ({ time: audio.currentTime, at: performance.now() }));
    await page.waitForTimeout(1400);
    return page.evaluate(start => (audio.currentTime - start.time) / ((performance.now() - start.at) / 1000), start);
  }

  for (const playsAllowed of [0, 2]) {
    it(`${playsAllowed ? 'limited' : 'unlimited'} plays: slows real playback and restores normal speed`, async () => {
      const { page, errors } = await open({ playsAllowed });
      try {
        await page.getByRole('slider', { name: 'Playback speed' }).fill('85');
        await expectRate(page, 0.85);
        if (playsAllowed) await page.locator('.ls-play-btn').click();
        else await page.evaluate(() => audio.play());
        await page.waitForFunction(() => audio.currentTime > 0.3);
        const slow = await measuredRate(page);
        assert.ok(slow > 0.76 && slow < 0.94, `85% advanced at ${slow.toFixed(3)} seconds per second`);
        await page.getByRole('button', { name: 'Faster', exact: true }).click();
        await expectRate(page, 0.86);
        await page.getByRole('button', { name: 'Slower', exact: true }).click();
        await expectRate(page, 0.85);
        if (playsAllowed) {
          await page.locator('.ls-play-btn').click();
          assert.equal(await page.evaluate(() => audio.paused), true);
          await page.locator('.ls-play-btn').click();
          await expectRate(page, 0.85);
          assert.equal(await page.evaluate(() => calls.length), 1, 'resuming uses the same play');
        }
        await page.getByRole('button', { name: 'Normal', exact: true }).click();
        await expectRate(page, 1);
        const normal = await measuredRate(page);
        assert.ok(normal > 0.94 && normal < 1.06, `100% advanced at ${normal.toFixed(3)} seconds per second`);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });

    it(`${playsAllowed ? 'limited' : 'unlimited'} plays: keeps the dial's selected rate after media resets`, async () => {
      const { page, errors } = await open({ playsAllowed });
      try {
        await page.getByRole('slider', { name: 'Playback speed' }).fill('85');
        // Media loading or native player controls can reset the element's rate
        // independently of the custom dial. Its percentage must stay effective.
        await page.evaluate(() => { audio.defaultPlaybackRate = 1; audio.playbackRate = 1; });
        await expectRate(page, 0.85);
        await page.evaluate(() => audio.play());
        await page.waitForFunction(() => audio.currentTime > 0.3);
        await page.evaluate(() => { audio.defaultPlaybackRate = 1; audio.playbackRate = 1; });
        await expectRate(page, 0.85);
        const slow = await measuredRate(page);
        assert.ok(slow > 0.76 && slow < 0.94, `selected slowdown survived at ${slow.toFixed(3)}`);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  it('keeps only the current dial in charge when the player is redrawn', async () => {
    const { page, errors } = await open();
    try {
      await page.getByRole('slider', { name: 'Playback speed' }).fill('85');
      await page.evaluate(() => { redraw(); redraw(); });
      assert.equal(await page.evaluate(() => listeningSheet.audio === audio), true);
      await page.getByRole('slider', { name: 'Playback speed' }).fill('92');
      await page.evaluate(() => { audio.defaultPlaybackRate = 1; audio.playbackRate = 1; });
      await expectRate(page, 0.92);
      await page.evaluate(() => audio.load());
      await expectRate(page, 0.92);
      await page.evaluate(() => { section = { ...section, id: 'part2' }; listeningSheet.audio = null; redraw(); window.audio = listeningSheet.audio; });
      await expectRate(page, 1);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });

  it('keeps normal speed when the teacher disables the dial', async () => {
    const { page, errors } = await open({ speedAllowed: false });
    try {
      assert.equal(await page.getByRole('slider').count(), 0);
      await page.evaluate(() => { audio.playbackRate = 0.5; });
      await page.waitForFunction(() => audio.playbackRate === 1, null, { timeout: 2000 });
      assert.equal(await page.evaluate(() => audio.defaultPlaybackRate), 1);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
