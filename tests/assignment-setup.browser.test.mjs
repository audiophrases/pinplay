/* Optional browser checks: npm install --no-save --package-lock=false playwright
   Uses installed Chrome/Edge, or Playwright's installed Chromium. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import('playwright').catch(() => ({}));
const initial = { className: '4B', dueAt: '', attemptsLimit: 0, signIn: 'random', feedbackMode: 'instant', examMode: false, shuffleQuestions: false, aiCheck: false, format: 'all', adaptiveCount: 8 };
let browser;
describe('assignment setup with a real keyboard', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open(extra = {}, callback) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 920 } });
    await page.setContent('<html><body><button id="opener">Create assignment</button></body></html>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.addScriptTag({ path: 'assignment-setup.js' });
    await page.evaluate(({ initial, extra, callback }) => {
      window.calls = [];
      document.getElementById('opener').focus();
      window.PinAssignmentSetup.open({
        title: 'Past tenses · Unit 3', questionCount: 24, initial, adaptiveAvailable: true, climbAvailable: true,
        singleCount: 24, hasSections: false, climbDefaultCount: 20, classes: ['4A', '4B'], ...extra,
        onCreate: callback ? (0, eval)(callback) : async draft => { window.calls.push(draft); return { code: 'ABC123', link: 'https://example.com/?assignment=ABC123' }; },
      });
    }, { initial, extra, callback });
    return page;
  }
  async function focusedGroup(page) {
    return page.evaluate(() => document.activeElement.closest('[data-choice-group]')?.dataset.choiceGroup);
  }
  async function enterToReview(page) {
    for (let i = 0; i < 15; i++) {
      if (await page.getByRole('heading', { name: 'Everything look right?' }).count()) return;
      await page.keyboard.press('Enter');
    }
    assert.fail('Enter must reach the final review without Tab or mouse input');
  }
  it('arrows choose cards, Enter advances, and creation waits for the final review', async () => {
    const page = await open({ initial: { ...initial, dueAt: '2026-12-20T17:00' } });
    await page.keyboard.press('ArrowRight'); // current -> practice
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('heading', { name: 'Who is this for?' }).count(), 1);
    await page.keyboard.press('ArrowLeft'); // random -> sign in
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'classLabel');
    await page.keyboard.press('ArrowRight'); // 4B -> 4A
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight'); // instant -> end
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'attemptsLimit');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight'); // unlimited -> 3
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'examMode');
    await page.keyboard.press('ArrowRight'); // off -> on
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'aiCheck');
    assert.equal(await page.locator('[data-choice-group="aiCheck"] [aria-checked="true"]').getAttribute('data-choice'), 'off');
    await page.keyboard.press('ArrowRight'); // off -> on
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'format');
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'shuffleQuestions');
    await page.keyboard.press('ArrowRight'); // off -> on
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-field="dueAt"]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowRight'); // native date segments keep their arrow handling
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('heading', { name: 'Everything look right?' }).count(), 1);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Your assignment is ready' }).waitFor();
    const [draft] = await page.evaluate(() => window.calls);
    assert.equal(draft.signIn, 'signin'); assert.equal(draft.feedbackMode, 'end');
    assert.equal(draft.attemptsLimit, 3); assert.equal(draft.examMode, true);
    assert.equal(draft.className, '4A');
    assert.equal(draft.shuffleQuestions, true);
    assert.equal(draft.aiCheck, true);
    assert.equal(draft.dueAt, '2026-12-20T17:00');
    assert.equal(await page.locator('.assignment-setup-steps').isVisible(), false);
    assert.equal(await page.locator('[data-setup-action="next"]').isVisible(), false);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#opener').evaluate(el => el === document.activeElement), true);
    await page.close();
  });
  it('Exam preset provides no feedback, one attempt, school sign-in and exam mode', async () => {
    const page = await open();
    await page.keyboard.press('Home'); // practice
    await page.keyboard.press('ArrowRight'); // homework
    await page.keyboard.press('ArrowRight'); // exam
    await enterToReview(page);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Your assignment is ready' }).waitFor();
    const [draft] = await page.evaluate(() => window.calls);
    assert.equal(draft.feedbackMode, 'none'); assert.equal(draft.attemptsLimit, 1);
    assert.equal(draft.signIn, 'signin'); assert.equal(draft.examMode, true);
    await page.close();
  });
  it('Escape cancels a draft, native modal traps focus and unavailable modes are skipped', async () => {
    const page = await open({ adaptiveAvailable: false, climbAvailable: false });
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.closest('dialog')?.id), 'assignmentSetupDialog');
    }
    await page.locator('[data-step="3"]').click();
    assert.equal(await page.locator('[data-choice="adaptive"]').isDisabled(), true);
    await page.locator('[data-choice="all"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-choice="all"]').getAttribute('aria-checked'), 'true');
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.close();
  });
  it('Climb enforces instant feedback, validates counts and preserves class text editing', async () => {
    const page = await open({ initial: { ...initial, examMode: true, feedbackMode: 'none' } });
    await page.locator('[data-step="1"]').click();
    await page.keyboard.press('Enter'); // class choices
    await page.keyboard.press('End'); // custom class label
    await page.keyboard.press('Enter'); // text field
    await page.locator('[data-field="className"]').fill('4B evening');
    await page.keyboard.press('ArrowLeft'); // edit the text, not a radio card
    assert.equal(await page.getByRole('heading', { name: 'Who is this for?' }).count(), 1);
    await page.locator('[data-step="3"]').click();
    await page.locator('[data-choice="climb"]').click();
    await page.locator('[data-field="adaptiveCount"]').fill('101');
    await page.locator('[data-setup-action="next"]').click();
    assert.equal(await page.getByRole('heading', { name: 'How should the assignment run?' }).count(), 1);
    await page.locator('[data-field="adaptiveCount"]').fill('12');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-field="dueAt"]').evaluate(el => el === document.activeElement), true);
    await page.locator('[data-field="dueAt"]').fill('2026-12-20T17:00');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Your assignment is ready' }).waitFor();
    const [draft] = await page.evaluate(() => window.calls);
    assert.equal(draft.format, 'climb'); assert.equal(draft.feedbackMode, 'instant');
    assert.equal(draft.examMode, false); assert.equal(draft.adaptiveCount, 12);
    assert.equal(draft.className, '4B evening');
    assert.equal(draft.dueAt, '2026-12-20T17:00');
    await page.close();
  });
  it('up and down move between settings without changing values or mixing On/Off groups', async () => {
    const page = await open();
    await page.locator('[data-step="2"]').click();
    assert.equal(await page.locator('select,input[type="checkbox"],datalist').count(), 0);
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedGroup(page), 'attemptsLimit');
    await page.keyboard.press('ArrowLeft'); // unlimited -> 10
    assert.equal(await focusedGroup(page), 'attemptsLimit');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedGroup(page), 'examMode');
    await page.keyboard.press('ArrowRight'); // off -> on
    assert.equal(await focusedGroup(page), 'examMode');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusedGroup(page), 'attemptsLimit');
    assert.equal(await page.locator('[data-choice-group="attemptsLimit"] [aria-checked="true"]').getAttribute('data-choice'), '10');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusedGroup(page), 'feedbackMode');
    await page.locator('[data-step="3"]').click();
    await page.keyboard.press('ArrowRight'); // adaptive disables shuffle
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-field="adaptiveCount"]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowUp'); // native number increment
    assert.equal(await page.locator('[data-field="adaptiveCount"]').inputValue(), '9');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Your assignment is ready' }).waitFor();
    const [draft] = await page.evaluate(() => window.calls);
    assert.equal(draft.attemptsLimit, 10); assert.equal(draft.examMode, true);
    assert.equal(draft.feedbackMode, 'instant'); assert.equal(draft.adaptiveCount, 9);
    await page.close();
  });
  it('Climb skips locked settings when continuing with Enter', async () => {
    const page = await open({ initial: { ...initial, format: 'climb', feedbackMode: 'none', examMode: true } });
    await page.locator('[data-step="2"]').click();
    await page.keyboard.press('ArrowRight'); // no available alternative to instant
    assert.equal(await page.locator('[data-choice="instant"]').getAttribute('aria-checked'), 'true');
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'attemptsLimit');
    await page.keyboard.press('Enter'); // skips disabled exam-mode choices
    assert.equal(await focusedGroup(page), 'aiCheck');
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'format');
    await page.keyboard.press('Enter'); // skips disabled shuffle choices
    assert.equal(await page.locator('[data-field="adaptiveCount"]').evaluate(el => el === document.activeElement), true);
    await page.close();
  });
  it('arrows reach the step navigation and review Back button without Tab', async () => {
    const page = await open();
    await page.keyboard.press('ArrowUp'); // first setting -> current step
    assert.equal(await page.locator('[data-step="0"]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter'); // Students
    assert.equal(await focusedGroup(page), 'signIn');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp'); // step -> close
    assert.equal(await page.locator('[data-setup-action="close"]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowDown'); // close -> current step
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter'); // Review
    assert.equal(await page.getByRole('heading', { name: 'Everything look right?' }).count(), 1);
    await page.keyboard.press('ArrowLeft'); // Create -> Back
    await page.keyboard.press('Enter');
    assert.equal(await focusedGroup(page), 'format');
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.close();
  });
  it('creation errors stay in the dialog, retry works and repeated Enter cannot duplicate a request', async () => {
    const page = await open({}, `async draft => {
      window.calls.push(draft);
      if (window.calls.length === 1) await new Promise((_, reject) => { window.fail = () => reject(new Error('Network unavailable')); });
      return { code: 'RETRY1', link: 'https://example.com/?assignment=RETRY1' };
    }`);
    await page.locator('[data-step="4"]').click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 1);
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    await page.evaluate(() => window.fail());
    await page.getByRole('status').filter({ hasText: 'Network unavailable' }).waitFor();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Your assignment is ready' }).waitFor();
    assert.equal(await page.evaluate(() => window.calls.length), 2);
    await page.close();
  });
  it('fits a narrow screen without horizontal overflow', async () => {
    const page = await open();
    await page.setViewportSize({ width: 375, height: 740 });
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-step="${i}"]`).click();
      assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    }
    await page.locator('[data-step="0"]').click();
    await page.setViewportSize({ width: 1100, height: 920 });
    await page.keyboard.press('ArrowLeft');
    if (process.env.PINPLAY_SETUP_SCREENSHOT) await page.screenshot({ path: process.env.PINPLAY_SETUP_SCREENSHOT });
    await page.close();
  });
});
