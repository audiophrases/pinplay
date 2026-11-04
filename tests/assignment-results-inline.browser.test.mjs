/* The real teacher page with only the API stubbed: "View results" opens the
   attempts and the grading right under that assignment, and they stay there
   through everything that rebuilds the list. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import('playwright').catch(() => ({}));

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
let browser;

const attempts = (n) => Array.from({ length: n }, (_, i) => ({
  id: `attempt${i}`, studentName: `Student ${String(i).padStart(2, '0')}`, submitted: true, updatedAt: 1800000000000,
  metrics: { totalScore: 500, answeredCount: 5, totalQuestions: 5, pendingTeacherGradeCount: 0 },
}));

describe('results right under the assignment', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open({ width = 1200, height = 800 } = {}) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const server = {
      assignments: ['AAA111', 'BBB222', 'CCC333', 'DDD444'].map((code, i) => ({
        code, title: `Unit ${i + 1}`, active: true, totalQuestions: 5, attemptsLimit: 1, attemptsCount: 30,
      })),
      attemptCount: 30,
      hold: {},
      resultCalls: [],
    };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'teacher.test') {
        const filename = path.resolve(`.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith('/') ? 'index.html' : '');
        if (!filename.startsWith(path.resolve('.') + path.sep) || !fs.existsSync(filename)) return route.fulfill({ status: 404 });
        const contentType = filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
        return route.fulfill({ contentType, body: fs.readFileSync(filename) });
      }
      if (url.pathname.endsWith('.js')) return route.fulfill({ contentType: 'application/javascript', body: '' });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const body = route.request().postDataJSON?.() || {};
      const json = (data) => route.fulfill({ headers: CORS, json: data });
      if (url.pathname === '/api/assignments/list') return json({ assignments: server.assignments });
      if (url.pathname === '/api/assignments/results') {
        server.resultCalls.push(body.code);
        await server.hold[body.code];
        const assignment = server.assignments.find(a => a.code === body.code);
        return json({ assignment, attempts: attempts(server.attemptCount) });
      }
      if (url.pathname === '/api/assignments/attempt') return json({ gradingItems: [] });
      if (url.pathname === '/api/assignments/delete') {
        server.assignments = server.assignments.filter(a => a.code !== body.code);
        return json({ ok: true });
      }
      return json({ ok: true, role: 'owner', questions: 0 });
    });
    await page.goto('https://teacher.test/create/');
    await page.locator('#createPassword').fill('test');
    await page.locator('#unlockCreateBtn').click();
    await page.locator('#createWorkspace').waitFor({ state: 'visible' });
    await page.locator('#assignmentSectionToggle').click();
    await rowOf(page, 'DDD444').waitFor();
    return { page, errors, server };
  }

  const rowOf = (page, code) => page.locator(`#assignmentList .assignment-item[data-code="${code}"]`);
  const resultsBtn = (page, code) => rowOf(page, code).locator('[data-results-toggle]');
  const expand = (page, code) => rowOf(page, code).locator('.assignment-header').click();
  const attemptRows = (page) => page.locator('#assignmentResultsList li');
  async function viewResults(page, code) {
    await expand(page, code);
    await resultsBtn(page, code).click();
    await attemptRows(page).nth(5).waitFor();
    await settle(page);
  }
  // Smooth scrolling has finished.
  const settle = (page) => page.evaluate(() => new Promise((resolve) => {
    let last = scrollY, still = 0;
    const tick = () => {
      still = scrollY === last ? still + 1 : 0;
      last = scrollY;
      if (still > 10) resolve(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

  it('opens between that assignment and the next one', async () => {
    const { page, errors } = await open();
    assert.equal(await page.locator('#assignmentResultsFilter').isVisible(), false, 'nothing shows before an assignment is chosen');

    await viewResults(page, 'BBB222');

    const box = async (locator) => locator.boundingBox();
    const actions = await box(rowOf(page, 'BBB222').locator('.assignment-actions'));
    const toolbar = await box(page.locator('#assignmentResultsFilter'));
    const next = await box(rowOf(page, 'CCC333'));
    const last = await box(attemptRows(page).last());
    assert.ok(toolbar.y >= actions.y + actions.height, 'the toolbar sits below the assignment’s buttons');
    assert.ok(last.y + last.height <= next.y, 'every attempt sits above the next assignment');
    assert.equal(await attemptRows(page).count() > 30, true);
    assert.equal(await resultsBtn(page, 'BBB222').textContent(), 'Hide results');

    const title = await box(rowOf(page, 'BBB222').locator('.assignment-header'));
    assert.ok(Math.abs(title.y) < 12, `the assignment’s title stays on screen, at the top (y=${title.y})`);

    await page.screenshot({ path: 'tests/artifacts/assignment-results-inline.png' });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('closes again, and shows the grading in the same place', async () => {
    const { page, errors, server } = await open();
    await viewResults(page, 'AAA111');

    await page.getByRole('button', { name: 'Open grading', exact: true }).first().click();
    await page.getByText('No submitted answers yet.').waitFor();
    await settle(page);
    assert.equal(await rowOf(page, 'AAA111').locator('#assignmentGradingList').isVisible(), true, 'grading stays inside the row too');

    await resultsBtn(page, 'AAA111').click();
    assert.equal(await page.locator('#assignmentResultsFilter').isVisible(), false);
    assert.equal(await resultsBtn(page, 'AAA111').textContent(), 'View results');

    await resultsBtn(page, 'AAA111').click();
    await attemptRows(page).nth(5).waitFor();
    assert.equal(await page.getByText('No submitted answers yet.').isVisible(), true, 'reopening keeps the grading that was open');
    assert.equal(server.resultCalls.length, 2, 'reopening loads fresh results');
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('moves to another assignment without bringing its grading along', async () => {
    const { page, errors } = await open();
    await viewResults(page, 'AAA111');
    await page.getByRole('button', { name: 'Open grading', exact: true }).first().click();
    await page.getByText('No submitted answers yet.').waitFor();

    await viewResults(page, 'CCC333');

    assert.equal(await rowOf(page, 'CCC333').locator('#assignmentResultsList').count(), 1);
    assert.equal(await rowOf(page, 'AAA111').locator('#assignmentResultsList').count(), 0);
    assert.equal(await resultsBtn(page, 'AAA111').textContent(), 'View results');
    assert.equal(await resultsBtn(page, 'CCC333').textContent(), 'Hide results');
    assert.match(await page.locator('#assignmentResultsSummary').textContent(), /^Unit 3/);
    assert.equal(await page.locator('#assignmentGradingList li').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('shows the assignment opened last when an earlier one answers late', async () => {
    const { page, errors, server } = await open();
    let release;
    server.hold.AAA111 = new Promise(resolve => { release = resolve; });
    await expand(page, 'AAA111');
    await resultsBtn(page, 'AAA111').click();
    await viewResults(page, 'BBB222');

    release();
    await page.waitForTimeout(150);

    assert.match(await page.locator('#assignmentResultsSummary').textContent(), /^Unit 2/);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('keeps the results when the row is collapsed and reopened', async () => {
    const { page, errors, server } = await open();
    await viewResults(page, 'AAA111');

    await expand(page, 'AAA111');
    assert.equal(await page.locator('#assignmentResultsFilter').isVisible(), false);
    await expand(page, 'AAA111');
    assert.equal(await attemptRows(page).first().isVisible(), true);
    assert.equal(server.resultCalls.length, 1, 'nothing to reload');
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('holds the next row still when the results above it close', async () => {
    const { page, errors } = await open();
    await viewResults(page, 'AAA111');

    const header = rowOf(page, 'BBB222').locator('.assignment-header');
    await header.scrollIntoViewIfNeeded();
    await settle(page);
    const before = await header.boundingBox();
    await header.click();
    await settle(page);
    const after = await header.boundingBox();

    assert.equal(await rowOf(page, 'AAA111').evaluate(el => el.classList.contains('expanded')), false);
    assert.ok(Math.abs(after.y - before.y) < 2, `the row stayed under the pointer (${before.y} → ${after.y})`);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('survives refreshing the list, with fresh attempts', async () => {
    const { page, errors, server } = await open();
    await viewResults(page, 'BBB222');
    server.attemptCount = 31;

    await page.locator('#refreshAssignmentsBtn').click();
    await page.waitForFunction(() => /31\/31/.test(document.getElementById('assignmentResultsSummary').textContent));

    assert.equal(await rowOf(page, 'BBB222').locator('#assignmentResultsList').count(), 1);
    assert.equal(await attemptRows(page).first().isVisible(), true, 'the row stays open');
    assert.equal(await resultsBtn(page, 'BBB222').textContent(), 'Hide results');

    await page.locator('#assignmentResultsSort').selectOption('score-desc');
    assert.equal(await attemptRows(page).count() > 31, true, 'the toolbar still works on what is shown');
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('stays open when the assignment is closed from its own row', async () => {
    const { page, errors, server } = await open();
    await viewResults(page, 'BBB222');
    const calls = server.resultCalls.length;

    await rowOf(page, 'BBB222').getByRole('button', { name: 'Close assignment' }).click();
    await page.waitForFunction(n => {
      const rows = document.querySelectorAll('#assignmentResultsList li');
      return rows.length > n && !!rows[0].offsetParent;
    }, 5);
    await page.waitForTimeout(100);

    assert.equal(server.resultCalls.length, calls + 1);
    assert.equal(await rowOf(page, 'BBB222').locator('#assignmentResultsList').count(), 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('goes away with a deleted assignment and still opens on the others', async () => {
    const { page, errors } = await open();
    await viewResults(page, 'BBB222');

    await rowOf(page, 'BBB222').getByRole('button', { name: 'Delete', exact: true }).click();
    await rowOf(page, 'BBB222').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#assignmentResultsFilter').isVisible(), false);

    await viewResults(page, 'CCC333');
    assert.equal(await rowOf(page, 'CCC333').locator('#assignmentResultsList').count(), 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('is not dimmed inside an archived assignment, and follows it in and out of the list', async () => {
    const { page, errors, server } = await open();
    server.assignments[3].archived = true;
    await page.locator('#refreshAssignmentsBtn').click();
    await page.locator('#toggleArchivedAssignmentsBtn').click();
    await viewResults(page, 'DDD444');

    const opacity = await attemptRows(page).first().evaluate((el) => {
      let shown = 1;
      for (let n = el; n; n = n.parentElement) shown *= Number(getComputedStyle(n).opacity);
      return shown;
    });
    assert.equal(opacity, 1);

    await page.locator('#toggleArchivedAssignmentsBtn').click();
    assert.equal(await page.locator('#assignmentResultsFilter').isVisible(), false);
    await page.locator('#toggleArchivedAssignmentsBtn').click();
    assert.equal(await attemptRows(page).first().isVisible(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('fits a phone', async () => {
    const { page, errors } = await open({ width: 375, height: 750 });
    await viewResults(page, 'AAA111');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
});
