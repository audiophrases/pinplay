/* Real browser regression checks for teacher review of automatic grades. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const app = fs.readFileSync('app.js', 'utf8');
const names = [
  'gradeAssignmentQuestion', 'enterGradeByQuestionMode', 'openGradingFocusModal', 'gradingFocusState',
  'ensureGradingFocusModal', 'showGradingFocusModal', 'hideGradingFocusModal', 'closeGradingFocusModal',
  'renderGradingFocusItem', 'moveGradingFocusTo', 'gradingFocusKeydown',
  'enterGradeByStudentMode', 'openStudentGradingFocusModal', 'studentGradingFocusState',
  'ensureStudentGradingFocusModal', 'showStudentGradingFocusModal', 'hideStudentGradingFocusModal', 'closeStudentGradingFocusModal',
  'renderStudentGradingFocusItem', 'moveStudentGradingFocusTo', 'studentGradingFocusKeydown',
  'gradingMediaDetailsHtml', 'wireGradingMediaTts', 'CORRECTION_DIFF_PREFIX', 'CORRECTION_NOTE_PREFIX',
  'splitCorrectionNote', 'joinCorrectionNote', 'reconstructCorrectedFromDiff', 'computeWordDiff',
  'renderStructuredCorrectionDiff', 'renderCorrectionNoteHtml',
];
let browser;
describe('reviewing auto-graded exams after release', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });
  async function open(mode) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<p id="summary"></p><ul id="grading"></ul><p id="status"></p>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(() => {
      window.t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
      window.escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      window.escapeHtmlText = window.escapeHtml;
      window.iconForType = () => '✎';
      window.createSessionPassword = 'teacher';
      window.assignmentGradingSummaryEl = document.getElementById('summary');
      window.assignmentGradingListEl = document.getElementById('grading');
      window.assignmentStatusEl = document.getElementById('status');
      window.items = [
        { qIndex: 0, qType: 'text', prompt: 'Past tense of walk', answerText: 'walked', correctAnswer: 'walked', teacherGraded: false, maxPoints: 2000, grade: { graded: true, pointsAwarded: 2000 } },
        { qIndex: 1, qType: 'text', prompt: 'Past tense of go', answerText: 'goed', correctAnswer: 'went', teacherGraded: false, maxPoints: 2000, grade: { graded: true, pointsAwarded: 0 } },
        { qIndex: 2, qType: 'tf', prompt: 'Poll', answerText: 'Yes', isPoll: true },
      ];
      window.attempt = { id: 'student1', studentName: 'Alex', submitted: true, submittedAt: 100, gradeReleasedAt: 200, releasedGrade: 50,
        metrics: { answeredCount: 3, totalQuestions: 3, pendingTeacherGradeCount: 0, autoGradedCount: 3 } };
      window.assignment = { code: 'EXAM123', title: 'Exam', feedbackMode: 'none', examMode: true };
      window.assignmentResultsCache = { code: 'EXAM123', data: { assignment, attempts: [structuredClone(attempt)] } };
      window.renderedGrades = [];
      window.renderAssignmentResults = (code, data) => renderedGrades.push(data.attempts[0].releasedGrade);
      window.api = async (route, { body }) => {
        if (route.endsWith('/results')) return { assignment, attempts: [attempt] };
        if (route.endsWith('/grading-overview')) return { assignment, submittedAttempts: 1, questions: items.map(item => ({ ...item, answeredCount: 1, gradedCount: 1 })) };
        if (route.endsWith('/question-grading')) return { question: structuredClone(items[body.qIndex]), items: [{ ...structuredClone(items[body.qIndex]), attemptId: 'student1', studentName: 'Alex' }] };
        if (route.endsWith('/attempt')) return { gradingItems: structuredClone(items) };
        if (route.endsWith('/grade')) {
          items[body.qIndex].grade = { graded: true, pointsAwarded: body.points, correction: body.correction, correctionAudioKey: body.correctionAudioKey };
          attempt.releasedGrade = items.slice(0, 2).reduce((sum, item) => sum + item.grade.pointsAwarded, 0) / 40;
          return { attempt: structuredClone(attempt) };
        }
        throw new Error(`Unexpected API route: ${route}`);
      };
    });
    await page.addScriptTag({ content: names.map(name => {
      // This helper has braces inside its regular expressions; the small
      // declaration extractor treats those as JavaScript block delimiters.
      if (name === 'renderStructuredCorrectionDiff') {
        const start = app.indexOf('function renderStructuredCorrectionDiff(');
        return app.slice(start, app.indexOf('\nfunction renderCorrectionNoteHtml(', start));
      }
      return extractDeclaration(app, name);
    }).join('\n') });
    await page.evaluate(mode => mode === 'question' ? enterGradeByQuestionMode('EXAM123') : enterGradeByStudentMode('EXAM123'), mode);
    return { page, errors };
  }
  it('by question includes auto-grades, shows current points and answer key, and reopens saved overrides', async () => {
    const { page, errors } = await open('question');
    assert.equal(await page.locator('#grading > li').count(), 2);
    await page.locator('#grading > li').first().getByRole('button', { name: 'Review graded' }).click();
    assert.equal(await page.locator('[data-grade-points-input]').inputValue(), '2000');
    assert.match(await page.locator('#gradingFocusContent').innerText(), /Correct answer: walked/);
    assert.equal(await page.locator('[data-ai-grade-pack-question]').count(), 0);
    await page.locator('[data-grade-points-input]').fill('1000');
    await page.locator('[data-grade-comment-input]').fill('Half credit after review.');
    await page.locator('[data-save-grade]').click();
    await page.getByText("You've reached the end.", { exact: false }).waitFor();
    assert.deepEqual(await page.evaluate(() => renderedGrades), [25]);
    await page.keyboard.press('Escape');
    await page.locator('#grading > li').first().getByRole('button', { name: 'Review graded' }).click();
    assert.equal(await page.locator('[data-grade-points-input]').inputValue(), '1000');
    assert.equal(await page.locator('[data-grade-comment-input]').inputValue(), 'Half credit after review.');
    await page.locator('[data-mark-correct]').click();
    await page.getByText("You've reached the end.", { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => items[0].grade.pointsAwarded), 2000);
    assert.deepEqual(errors, []);
    await page.close();
  });
  it('by student opens auto-only work, excludes polls, and updates the cached released grade', async () => {
    const { page, errors } = await open('student');
    await page.getByRole('button', { name: 'Review answers' }).click();
    assert.equal(await page.locator('[data-sgrade-points-input]').inputValue(), '2000');
    await page.locator('[data-snext-question]').click();
    assert.equal(await page.locator('[data-sgrade-points-input]').inputValue(), '0');
    assert.match(await page.locator('#studentGradingFocusContent').innerText(), /Correct answer: went/);
    await page.locator('[data-sgrade-points-input]').fill('1000');
    await page.locator('[data-ssave-grade]').click();
    await page.getByText('All questions reviewed for this student.', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => assignmentResultsCache.data.attempts[0].releasedGrade), 75);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review answers' }).click();
    await page.locator('[data-snext-question]').click();
    assert.equal(await page.locator('[data-sgrade-points-input]').inputValue(), '1000');
    assert.deepEqual(errors, []);
    await page.close();
  });
});
