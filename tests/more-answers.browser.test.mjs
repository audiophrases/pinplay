/* Real browser check of the ✅ More answers dialog: pick, copy, paste, tick, add. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const app = fs.readFileSync('app.js', 'utf8');
const names = [
  'MORE_ANSWERS_TYPES', 'MORE_ANSWERS_LIMITS', 'MORE_ANSWERS_ANGLES', 'moreAnswersCurrent', 'moreAnswersPromptEntry',
  'buildMoreAnswersPrompt', 'parseMoreAnswersReply', 'planMoreAnswers', 'applyMoreAnswers', 'moreAnswersState',
  'moreAnswersCandidates', 'moreAnswersCurrentText', 'openMoreAnswersDialog', 'renderMoreAnswersDialog',
  'refreshMoreAnswersCounts', 'setMoreAnswersNotice', 'copyMoreAnswersPrompt', 'checkMoreAnswersReply', 'applyMoreAnswersReview',
  'contextGapList', 'getCorrectedVariantsList', 'countErrorHuntRequiredTokens', 'tokenizeWords', 'normalizeTextAnswer',
  'toSafeFilename', 'iconForType', 'escapeHtml', 'downloadTextFile',
];
let browser;
describe('More answers dialog', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  it('adds only the answers the teacher keeps, to the questions they picked', async () => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<main></main>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.addScriptTag({ content: `
      var t = (text, args = {}) => text.replace(/\\{(\\w+)\\}/g, (_, key) => String(args[key] ?? ''));
      var quiz = { title: 'Habits', questions: [
        { id: 'q1', type: 'error_hunt', prompt: "He don't usually walk to school.", corrected: "He doesn't usually walk to school.", correctedVariants: ["He doesn't usually walk to school."] },
        { id: 'q2', type: 'mcq', prompt: 'Pick one', answers: [{ text: 'a', correct: true }] },
        { id: 'q3', type: 'text', prompt: 'Another word for big?', accepted: ['large'] },
        { id: 'q4', type: 'context_gap', prompt: 'I ____ (live) here since 2010.', gaps: ['have lived'] },
      ] };
      var calls = { sync: 0, render: 0, save: 0 };
      var syncQuizFromUI = () => { calls.sync += 1; };
      var renderBuilder = () => { calls.render += 1; };
      var saveQuiz = () => { calls.save += 1; return true; };
      var copied = '';
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { copied = text; } } });
    ` });
    await page.addScriptTag({ content: names.map(name => extractDeclaration(app, name)).join('\n') });
    await page.evaluate(() => openMoreAnswersDialog());

    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('[data-ma-pick]').count(), 3, 'only auto-graded written answers are listed');
    await dialog.getByRole('button', { name: '📋 Copy prompt' }).click();
    assert.match(await dialog.locator('[data-ma-notice]').innerText(), /Tick at least one question/);

    await dialog.locator('[data-ma-pick="0"]').check();
    await dialog.locator('[data-ma-pick="2"]').check();
    assert.equal(await dialog.locator('[data-ma-count]').innerText(), '2 of 3 picked');
    await dialog.getByRole('button', { name: '📋 Copy prompt' }).click();
    await page.waitForFunction(() => copied);
    const prompt = await page.evaluate(() => copied);
    assert.match(prompt, /\{"n":1,"type":"error_hunt"/);
    assert.match(prompt, /\{"n":3,"type":"text"/);
    assert.doesNotMatch(prompt, /"n":4,"type"/);

    // Closing to go to the AI keeps the picks and the pasted text.
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.evaluate(() => openMoreAnswersDialog());
    assert.equal(await dialog.locator('[data-ma-pick="0"]').isChecked(), true);

    await dialog.locator('[data-ma-reply]').fill('Sure!\n```json\n' + JSON.stringify({ answers: [
      { n: 1, add: [{ answer: "We don't usually walk to school.", why: 'fixes the subject' }, { answer: "he doesn't usually walk to school", why: 'same' }, { answer: 'Him walks.', why: 'wrong' }] },
      { n: 3, add: [{ answer: 'huge', why: 'synonym' }] },
    ] }) + '\n```');
    await dialog.getByRole('button', { name: 'Check the reply' }).click();
    assert.match(await dialog.innerText(), /3 new answer\(s\) for 2 question\(s\)\. 1 already accepted, left out\./);
    assert.match(await dialog.innerText(), /fixes the subject/);
    await dialog.locator('.ma-chip', { hasText: 'Him walks.' }).locator('input').uncheck();
    await dialog.getByRole('button', { name: 'Add 2 answer(s)' }).click();

    assert.match(await dialog.locator('[data-ma-notice]').innerText(), /Added 2 answer\(s\) to 2 question\(s\)\./);
    const after = await page.evaluate(() => ({ quiz, calls }));
    assert.deepEqual(after.quiz.questions[0].correctedVariants, ["He doesn't usually walk to school.", "We don't usually walk to school."]);
    assert.deepEqual(after.quiz.questions[2].accepted, ['large', 'huge']);
    assert.deepEqual(after.quiz.questions[3].gaps, ['have lived']);
    assert.equal(after.calls.render, 1);
    assert.equal(after.calls.save, 1);
    assert.equal(await dialog.locator('[data-ma-reply]').inputValue(), '');
    assert.match(await dialog.locator('.ma-q', { hasText: 'Another word for big?' }).innerText(), /large · huge/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});
