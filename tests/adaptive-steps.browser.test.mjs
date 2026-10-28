import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const app = fs.readFileSync('app.js', 'utf8');
let browser;

describe('numbered difficulty authoring', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open() {
    const page = await browser.newPage({ viewport: { width: 1100, height: 920 } });
    await page.setContent(fs.readFileSync('create/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''));
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(() => {
      document.querySelector('#createWorkspace').classList.remove('hidden');
      document.querySelector('#creationPromptBody').classList.remove('hidden');
      for (let el = document.querySelector('#promptLevel'); el; el = el.parentElement) el.classList.remove('hidden');
      window.t = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
      window.escapeHtml = text => String(text ?? '');
    });
    return page;
  }

  it('shows a 2–12 step control with the existing comments, and restores the single level', async () => {
    const page = await open();
    await page.addScriptTag({ content: extractDeclaration(app, 'syncAdaptivePromptFields') });
    await page.evaluate(() => {
      document.querySelector('#promptAdaptive').addEventListener('change', syncAdaptivePromptFields);
      syncAdaptivePromptFields();
    });
    await page.locator('#promptLevel').fill('A2');
    await page.locator('#promptAdaptive').check();
    assert.equal(await page.locator('#promptAdaptiveSteps').isVisible(), true);
    assert.equal(await page.locator('#promptLevel').isDisabled(), true);
    await page.locator('#promptAdaptiveSteps').fill('8');
    await page.locator('#promptLevelNotes').fill('Reach B2 by step 8 with small increases.');
    assert.equal(await page.locator('#promptAdaptiveSteps').getAttribute('max'), '12');
    assert.equal(await page.locator('#promptLevelNotes').inputValue(), 'Reach B2 by step 8 with small increases.');
    await page.locator('#promptAdaptive').uncheck();
    assert.equal(await page.locator('#promptAdaptiveSteps').isVisible(), false);
    assert.equal(await page.locator('#promptLevel').inputValue(), 'A2');
    await page.close();
  });

  it('offers Adaptive and Climb on a step-only quiz, and filters live steps as numbers', async () => {
    const page = await open();
    await page.evaluate(() => {
      window.quiz = { questions: Array.from({ length: 36 }, (_, i) => ({ id: `q${i}`, type: 'mcq', step: Math.floor(i / 3) + 1 })) };
      window.adaptiveDefaultedFor = null;
      window.liveLevelsFor = null;
      window.liveLevelsOff = new Set();
      window.assignmentFeedbackEl = null;
      window.assignmentExamModeEl = null;
      window.assignmentShuffleQuestionsEl = null;
      window.assignmentFeedbackMode = 'instant';
      window.assignmentExamMode = false;
      window.syncPreviewTitle = () => {};
      window.renderQuizStrip = () => {};
      window.renderLevelUsage = () => {};
      window.renderStepsPlan = () => {};
      window.quizHasListeningSections = () => false;
      window.setAssignmentFeedbackMode = () => {};
      window.setAssignmentExamMode = () => {};
    });
    const names = ['CEFR_LEVELS', 'BUILDUP_MAX_STEPS', 'BUILDUP_MAX_COUNT', 'BUILDUP_COUNT_PER_STEP', 'ADAPTIVE_ASSIGNMENT_DEFAULT_COUNT',
      'normalizeClimbStep', 'normalizeCefr', 'isAdaptiveEligibleQuestion', 'cefrCoverage', 'climbStepsOf', 'quizLevelsPresent', 'isBuildupQuestion',
      'buildupAvailableSteps', 'climbRangeText', 'assignmentBuildupSelected', 'adaptiveSingleQuestionCount', 'buildupDefaultCount',
      'syncAssignmentAdaptiveControl', 'syncLiveLevelsControl', 'liveLevelsForGame', 'cupAdaptiveOn', 'initLiveLevelsControl', 'renderLevelCoverage'];
    await page.addScriptTag({ content: names.map(n => extractDeclaration(app, n)).join('\n') });
    await page.evaluate(() => { syncAssignmentAdaptiveControl(); initLiveLevelsControl(); renderLevelCoverage(); });
    assert.equal(await page.locator('#levelCoverage .level-count').count(), 12);
    assert.match(await page.locator('#levelCoverage').textContent(), /Step 12\s+3/);
    assert.equal(await page.locator('#assignmentAdaptiveMode option[value="adaptive"]').isDisabled(), false);
    assert.equal(await page.locator('#assignmentAdaptiveMode option[value="buildup"]').isDisabled(), false);
    assert.equal(await page.locator('#assignmentAdaptiveMode').inputValue(), 'adaptive');
    assert.equal(await page.locator('#assignmentAdaptiveCount').getAttribute('max'), '36');
    assert.equal(await page.locator('#liveLevelsList input').count(), 12);
    await page.locator('#liveLevelsList input[value="12"]').evaluate(el => el.click());
    const selection = await page.evaluate(() => liveLevelsForGame());
    assert.equal(selection.length, 11);
    assert.equal(selection.includes(12), false);
    assert.ok(selection.every(n => typeof n === 'number'));
    assert.equal(await page.evaluate(() => cupAdaptiveOn()), true);
    await page.close();
  });
});
