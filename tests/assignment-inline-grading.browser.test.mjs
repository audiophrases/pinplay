import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const app = fs.readFileSync('app.js', 'utf8');
const names = [
  'gradeAssignmentQuestion', 'fetchAssignmentAttemptDetail', 'fetchAssignmentResults', 'renderAssignmentResults',
  'buildGradeControls', 'inlineCorrectionDiffSetup', 'enterQuestionGradingFocus',
  'CORRECTION_DIFF_PREFIX', 'CORRECTION_NOTE_PREFIX', 'splitCorrectionNote', 'joinCorrectionNote',
  'reconstructCorrectedFromDiff', 'computeWordDiff', 'renderStructuredCorrectionDiff',
];
let browser;

describe('saving grades without losing the current position or other edits', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open({ mode = 'attempt', pending = false, width = 1100 } = {}) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<main class="container"><p id="status" style="min-height:24px"></p><section><p id="resultsSummary"></p><ul id="results"></ul></section><p id="summary"></p><ul id="grading" class="list"></ul><div style="height:900px"></div></main>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(({ mode, pending }) => {
      window.t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
      window.escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      window.escapeHtmlText = window.escapeHtml;
      window.iconForType = () => '✎';
      window.createSessionPassword = 'teacher';
      window.assignmentGradingSummaryEl = document.getElementById('summary');
      window.assignmentGradingListEl = document.getElementById('grading');
      window.assignmentStatusEl = document.getElementById('status');
      window.assignmentResultsSummaryEl = document.getElementById('resultsSummary');
      window.assignmentResultsListEl = document.getElementById('results');
      window.assignmentResultsFilterEl = { value: pending ? 'pending' : 'all' };
      window.assignmentResultsClassFilterEl = null;
      window.assignmentResultsSortEl = null;
      window.assignmentResultsBestOnlyEl = null;
      window.notifySelection = { code: 'EXAM123', ids: new Set() };
      window.enrichAssignmentAttemptsWithClass = async () => {};
      window.serverItems = Array.from({ length: 18 }, (_, index) => ({
        qIndex: mode === 'attempt' ? index : 0, servedIndex: index,
        qType: 'open', prompt: `Question ${index + 1}`, answerText: 'I go to school.',
        teacherGraded: true, maxPoints: 1000, attemptId: mode === 'attempt' ? 'student0' : `student${index}`,
        studentName: `Student ${index}`, grade: pending ? null : { graded: true, pointsAwarded: 100 },
      }));
      window.serverAttempts = Array.from({ length: mode === 'attempt' ? 1 : 18 }, (_, index) => ({
        id: `student${index}`, studentName: `Student ${index}`, submitted: true,
        metrics: { totalScore: pending ? 0 : mode === 'attempt' ? 1800 : 100, answeredCount: 18, totalQuestions: 18, pendingTeacherGradeCount: pending ? 1 : 0 },
      }));
      window.assignment = { code: 'EXAM123', title: 'Exam' };
      window.assignmentResultsCache = { code: 'EXAM123', data: { assignment, attempts: structuredClone(serverAttempts) } };
      window.calls = [];
      window.api = async (route, { body }) => {
        calls.push({ route, body });
        if (route.endsWith('/attempt')) return { gradingItems: structuredClone(serverItems) };
        if (route.endsWith('/results')) return { assignment, attempts: structuredClone(serverAttempts) };
        if (route.endsWith('/question-grading')) return { question: { qType: 'open', prompt: 'Question', maxPoints: 1000 }, items: structuredClone(serverItems) };
        if (route.endsWith('/grade')) {
          if (window.delaySave) await new Promise(resolve => { window.finishSave = resolve; });
          if (window.failSave) throw new Error('Connection lost');
          const item = serverItems.find(it => it.qIndex === body.qIndex && it.attemptId === body.attemptId);
          item.grade = { graded: true, pointsAwarded: body.points, correction: body.correction, correctionAudioKey: body.correctionAudioKey };
          const attempt = serverAttempts.find(it => it.id === body.attemptId);
          attempt.metrics.totalScore = serverItems.filter(it => it.attemptId === body.attemptId).reduce((sum, it) => sum + (it.grade?.pointsAwarded || 0), 0);
          attempt.metrics.pendingTeacherGradeCount = serverItems.filter(it => it.attemptId === body.attemptId && !it.grade?.graded).length;
          return { ok: true, attempt: structuredClone(attempt) };
        }
        throw new Error(`Unexpected route: ${route}`);
      };
    }, { mode, pending });
    await page.addScriptTag({ content: names.map(name => {
      if (name === 'renderStructuredCorrectionDiff') {
        const start = app.indexOf('function renderStructuredCorrectionDiff(');
        return app.slice(start, app.indexOf('\nfunction renderCorrectionNoteHtml(', start));
      }
      return extractDeclaration(app, name);
    }).join('\n') });
    await page.evaluate(() => renderAssignmentResults('EXAM123', assignmentResultsCache.data));
    if (mode === 'attempt') {
      await page.getByRole('button', { name: 'Open grading', exact: true }).first().click();
    } else {
      await page.evaluate(() => enterQuestionGradingFocus('EXAM123', 0));
    }
    await page.waitForFunction(() => document.querySelectorAll('[data-grade-points-input]').length === 18);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return { page, errors };
  }

  const rows = page => page.locator('#grading > li').filter({ has: page.locator('[data-grade-points-input]') });
  async function parkAt(page, row) {
    await row.evaluate(el => window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 140, behavior: 'instant' }));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    // Finish the intentional smooth scroll used when initially opening an attempt.
    await page.waitForFunction(() => {
      const top = document.querySelectorAll('[data-grade-points-input]')[12].getBoundingClientRect().top;
      return top > 100 && top < 400;
    });
    return row.evaluate(el => el.getBoundingClientRect().top);
  }
  async function settle(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }

  for (const width of [1100, 390]) {
    it(`keeps Open grading in place at ${width}px, updates the total, and preserves another question's draft`, async () => {
      const { page, errors } = await open({ width });
      const row = rows(page).nth(12);
      const neighbour = rows(page).nth(13);
      await neighbour.locator('[data-grade-correction-input]').fill('Keep this unsaved correction.');
      await row.locator('[data-grade-points-input]').fill('650');
      await row.locator('[data-grade-correction-input]').fill('I went to school.');
      const before = await parkAt(page, row);
      await page.evaluate(() => { window.originalEditor = document.querySelectorAll('[data-grade-points-input]')[12]; });
      await row.getByRole('button', { name: 'Update grade', exact: true }).click();
      await row.locator('[data-grade-save-status]').getByText('Saved · Quiz total: 2350 pts', { exact: true }).waitFor();
      await settle(page);
      assert.ok(Math.abs(await row.evaluate(el => el.getBoundingClientRect().top) - before) < 2);
      assert.equal(await page.evaluate(() => originalEditor === document.querySelectorAll('[data-grade-points-input]')[12]), true);
      assert.equal(await neighbour.locator('[data-grade-correction-input]').inputValue(), 'Keep this unsaved correction.');
      assert.equal(await neighbour.locator('[data-grade-save-status]').innerText(), 'Unsaved changes');
      assert.equal(await page.evaluate(() => assignmentResultsCache.data.attempts[0].metrics.totalScore), 2350);
      const calls = await page.evaluate(() => calls);
      assert.equal(calls.filter(call => call.route.endsWith('/attempt')).length, 1);
      assert.equal(calls.filter(call => call.route.endsWith('/results')).length, 0);
      assert.equal(calls.find(call => call.route.endsWith('/grade')).body.servedIndex, 12);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  it('keeps later edits unsaved while a request runs, and shows errors locally with retry', async () => {
    const { page, errors } = await open();
    const row = rows(page).nth(12);
    await row.locator('[data-grade-points-input]').fill('600');
    await parkAt(page, row);
    await page.evaluate(() => { window.delaySave = true; });
    const button = row.getByRole('button', { name: 'Update grade', exact: true });
    await button.click();
    await row.locator('[data-grade-save-status]').getByText('Saving grade…', { exact: true }).waitFor();
    assert.equal(await button.isDisabled(), true);
    await row.locator('[data-grade-points-input]').fill('700');
    await page.evaluate(() => { window.delaySave = false; finishSave(); });
    await row.locator('[data-grade-save-status]').getByText('Unsaved changes', { exact: true }).waitFor();
    assert.equal(await row.locator('[data-grade-points-input]').inputValue(), '700');
    assert.equal(await page.evaluate(() => serverItems[12].grade.pointsAwarded), 600);
    await page.evaluate(() => { window.failSave = true; });
    const before = await row.evaluate(el => el.getBoundingClientRect().top);
    await button.click();
    await row.locator('[data-grade-save-status]').getByText('Grade error: Connection lost', { exact: true }).waitFor();
    assert.equal(await button.isEnabled(), true);
    assert.equal(await row.locator('[data-grade-points-input]').inputValue(), '700');
    assert.ok(Math.abs(await row.evaluate(el => el.getBoundingClientRect().top) - before) < 2);
    await page.evaluate(() => { window.failSave = false; });
    await button.click();
    await row.locator('[data-grade-save-status]').getByText('Saved · Quiz total: 2400 pts', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('updates the question summary and badge in place, including when a filtered result above disappears', async () => {
    const { page, errors } = await open({ mode: 'question', pending: true });
    const row = rows(page).nth(12);
    const neighbour = rows(page).nth(13);
    await neighbour.locator('[data-grade-points-input]').fill('300');
    await row.locator('[data-grade-points-input]').fill('750');
    const before = await parkAt(page, row);
    await row.getByRole('button', { name: 'Save grade', exact: true }).click();
    await row.locator('[data-grade-save-status]').getByText('Saved · Quiz total: 750 pts', { exact: true }).waitFor();
    await settle(page);
    assert.ok(Math.abs(await row.evaluate(el => el.getBoundingClientRect().top) - before) < 2);
    assert.match(await page.locator('#summary').innerText(), /1 graded · 17 pending/);
    assert.match(await row.innerText(), /GRADED/);
    assert.equal(await neighbour.locator('[data-grade-points-input]').inputValue(), '300');
    assert.equal(await neighbour.locator('[data-grade-save-status]').innerText(), 'Unsaved changes');
    assert.equal(await page.locator('#results').getByRole('button', { name: 'Open grading', exact: true }).count(), 17);
    assert.equal(await page.evaluate(() => calls.filter(call => call.route.endsWith('/question-grading')).length), 1);
    assert.deepEqual(errors, []);
    await page.close();
  });
});
