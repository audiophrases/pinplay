import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const app = fs.readFileSync('app.js', 'utf8');
let browser;
describe('assignment settings save and reopen', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(path => path && fs.existsSync(path));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open({ locked = false, legacy = false } = {}) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(fs.readFileSync('create/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''));
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(({ locked, legacy }) => {
      window.t = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
      window.escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
      window.createSessionPassword = 'teacher';
      window.assignmentStatusEl = document.createElement('p');
      window.assignmentClassOptionsEl = null;
      window.loadAssignmentClassSuggestions = async () => {};
      window.syncSignInRulesLine = () => {};
      window.openStudentsSettingsDialog = () => {};
      window.refreshAssignmentsList = async () => {};
      window.setStatus = (el, text) => { el.textContent = text; };
      window.saved = { code: 'ABC123', title: 'Exam', className: '3C', randomNames: false, feedbackMode: 'none', examMode: true,
        attemptsLimit: 1, format: 'all', adaptiveSingleCount: 0, shuffleQuestions: false, attemptsCount: locked ? 1 : 0 };
      window.options = { format: 'all', count: 0, locked, adaptiveAvailable: true, climbAvailable: true, adaptiveMax: 12, climbMax: 100, hasSections: false };
      window.legacy = legacy;
      if (legacy) { delete window.saved.shuffleQuestions; delete window.saved.format; }
      window.calls = [];
      window.api = async (route, opts) => {
        window.calls.push({ route, body: opts.body });
        if (route.endsWith('/get-quiz')) return { assignment: structuredClone(window.saved), ...(window.legacy ? {} : { settings: structuredClone(window.options) }) };
        Object.assign(window.saved, opts.body);
        if (opts.body.format) {
          window.saved.adaptiveSingleCount = opts.body.format === 'all' ? 0 : opts.body.questionCount;
          window.options.format = opts.body.format;
          window.options.count = window.saved.adaptiveSingleCount;
        }
        const assignment = structuredClone(window.saved);
        if (window.omitShuffleOnSave) delete assignment.shuffleQuestions;
        return { ok: true, assignment };
      };
    }, { locked, legacy });
    await page.addScriptTag({ content: [extractDeclaration(app, 'toDatetimeLocalValue'), extractDeclaration(app, 'openAssignmentSettingsDialog')].join('\n') });
    await page.evaluate(() => openAssignmentSettingsDialog(window.saved));
    return { page, errors };
  }
  const dialog = page => page.locator('.assignment-settings-dialog');
  const shuffle = page => dialog(page).getByRole('checkbox', { name: 'Shuffle questions', exact: true });
  it('persists shuffle when saved, reads fresh state on reopen, and leaves the choice editable after attempts start', async () => {
    const { page, errors } = await open({ locked: true });
    assert.equal(await shuffle(page).isEnabled(), true);
    await shuffle(page).check();
    await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
    await page.locator('.assignment-settings-dialog').waitFor({ state: 'detached' });
    await page.evaluate(() => openAssignmentSettingsDialog({ ...window.saved, shuffleQuestions: false }));
    assert.equal(await shuffle(page).isChecked(), true);
    assert.equal(await dialog(page).locator('[data-settings-format]').isDisabled(), true);
    assert.match(await dialog(page).locator('[data-settings-format-note]').innerText(), /attempt has already started/);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('does not report success if the API omits the saved shuffle value', async () => {
    const { page, errors } = await open();
    await page.evaluate(() => { window.omitShuffleOnSave = true; });
    await shuffle(page).check();
    await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal(await dialog(page).isVisible(), true);
    assert.match(await dialog(page).innerText(), /did not confirm Shuffle questions was saved/);
    assert.equal(await dialog(page).getByRole('button', { name: 'Save', exact: true }).isEnabled(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('explains missing backend support and disables unsupported controls', async () => {
    const { page, errors } = await open({ legacy: true });
    assert.equal(await shuffle(page).isDisabled(), true);
    assert.equal(await dialog(page).locator('[data-settings-format]').isDisabled(), true);
    assert.match(await dialog(page).innerText(), /API does not support Shuffle questions yet/);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('saves format and count before attempts start, enforces Climb choices, and reloads the selected mode', async () => {
    const { page, errors } = await open();
    await dialog(page).locator('[data-settings-format]').selectOption('climb');
    await dialog(page).locator('[data-settings-count]').fill('25');
    const exam = dialog(page).getByRole('checkbox', { name: '🔒 Exam mode', exact: true });
    assert.equal(await exam.isDisabled(), true);
    assert.equal(await exam.isChecked(), false);
    assert.equal(await shuffle(page).isDisabled(), true);
    await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
    await page.locator('.assignment-settings-dialog').waitFor({ state: 'detached' });
    await page.evaluate(() => openAssignmentSettingsDialog(window.saved));
    assert.equal(await dialog(page).locator('[data-settings-format]').inputValue(), 'climb');
    assert.equal(await dialog(page).locator('[data-settings-count]').inputValue(), '25');
    assert.deepEqual(errors, []);
    await page.close();
  });
});
