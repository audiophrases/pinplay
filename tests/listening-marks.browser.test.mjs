/* A submitted listening section shows its marks like the one-question screen:
   green/red answers, a dashed green missed choice, "Correct Answer" and
   "Teacher Feedback" boxes. */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const source = fs.readFileSync('play.js', 'utf8');
const names = [
  'listeningSheet', 'renderListeningSheet', 'renderListeningQuestion', 'listeningSavedAnswer', 'listeningAnswered',
  'updateListeningProgress', 'markListeningAnswer', 'teacherFeedbackBox', 'buildCorrectionDiffHtml', 'splitCorrectionNote',
  'renderStructuredCorrectionDiff', 'renderCorrectionNoteHtml', 'escapeHtmlText', 'CORRECTION_DIFF_PREFIX', 'CORRECTION_NOTE_PREFIX',
  'contextGapAcceptedFromReveal', 'normalizeTextAnswer', 'listeningOptionOrder', 'questionShuffleSeed', 'seededShuffleIndices',
  'renderInlineContextGapInputs', 'countErrorHuntRequiredTokens', 'tokenizeWords', 'listeningSectionLocked', 'listeningHeardBox',
  'listeningStatus', 'aiNoteBox',
];
let browser;

describe('listening section marks', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open() {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<html><body></body></html>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(() => {
      window.t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
      for (const name of ['renderListeningPlayer', 'leaveListeningSheet', 'submitListeningSection', 'queueListeningSave', 'flushListeningSaves']) window[name] = () => {};
      window.isAdaptiveAssignmentOpen = () => false;
      window.renderErrorHuntDiff = () => ({ editedCount: 0 });
      window.loadBackendUrl = () => 'https://api.example';
    });
    await page.addScriptTag({ content: names.map(name => extractDeclaration(source, name)).join('\n') });
    await page.evaluate(() => {
      const section = { id: 'p1', title: 'Part 1', text: 'Listen.' };
      const questions = [
        { type: 'mcq', prompt: 'Where?', answers: [{ text: 'London' }, { text: 'Bristol' }, { text: 'Leeds' }] },
        { type: 'mcq', prompt: 'When?', answers: [{ text: '9:15' }, { text: '9:50' }, { text: '10:15' }] },
        { type: 'multi', prompt: 'What does he buy?', answers: [{ text: 'Coffee' }, { text: 'Paper' }, { text: 'Sandwich' }, { text: 'Ticket' }] },
        { type: 'text', prompt: 'Which platform?' },
        { type: 'context_gap', prompt: 'The train is ____ minutes late because of the ____.', gapCount: 2 },
        { type: 'match_pairs', prompt: 'Match.', leftItems: ['Seller', 'Tom'], rightOptions: ['asks', 'sells'] },
        { type: 'open', prompt: 'Why is he travelling?' },
        { type: 'open', prompt: 'What would you do?' },
        { type: 'text', prompt: 'How much?' },
        { type: 'text', prompt: 'Which day?' },
      ].map(q => ({ ...q, points: 1000, listeningSection: section.id }));
      const answersByQ = {
        0: { answer: 0 }, 1: { answer: 0 }, 2: { answer: [0, 2] }, 3: { answer: 'platform 4' },
        4: { answer: ['20', 'snow'] }, 5: { answer: ['sells', 'sells'] },
        6: { answer: 'He visits his gran.' },
        7: { answer: 'I would read.', teacherGrade: { graded: true, pointsAwarded: 1000, correction: 'Good idea!' } },
        9: { answer: 'Munday', teacherGrade: { graded: true, pointsAwarded: 1000, correction: 'Monday: mind the spelling.' } },
      };
      const answersWithCorrectness = [
        { qIndex: 0, correct: true, correctAnswer: '1. London' },
        { qIndex: 1, correct: false, correctAnswer: '2. 9:50' },
        { qIndex: 2, correct: false, correctAnswer: '1. Coffee | 4. Ticket' },
        { qIndex: 3, correct: false, correctAnswer: 'platform 5 | five' },
        { qIndex: 4, correct: false, partialScore: 1, partialTotal: 2, correctAnswer: '20 | rain, storm' },
        { qIndex: 5, correct: false, correctAnswer: 'Seller→sells | Tom→asks' },
        { qIndex: 9, correct: true, correctAnswer: 'Monday' },
      ];
      window.live = { player: { mode: 'assignment', assignment: { code: 'X', attemptId: 'a1', currentIndex: 0, state: { attempt: {
        assignment: { feedbackMode: 'end', quiz: { questions, listeningSections: [section] } },
        answersByQ, answersWithCorrectness, answeredQIndexes: Object.keys(answersByQ).map(Number), sectionsSubmitted: { p1: 1 }, submitted: true,
      } } } } };
      renderListeningSheet({ section, first: 0, last: questions.length - 1 });
    });
    return { page, errors };
  }

  const card = (page, i) => page.evaluate((i) => {
    const el = document.querySelector(`.ls-q[data-q-index="${i}"]`);
    const marks = (sel) => [...el.querySelectorAll(sel)].map((x) => ['correct-highlight', 'incorrect-highlight', 'correct-missed', 'ignored-option'].find((c) => x.classList.contains(c)) || '');
    const value = (x) => Number(x.querySelector('input')?.value);
    return {
      options: Object.fromEntries([...el.querySelectorAll('.ls-option')].map((row) => [value(row), marks('.ls-option')[[...el.querySelectorAll('.ls-option')].indexOf(row)]])),
      inputs: marks('.ls-input, [data-ls-gap], .ls-select'),
      pills: [...el.querySelectorAll('.context-gap-accepted')].map((x) => x.textContent),
      boxes: [...el.querySelectorAll('.student-answer-reveal')].map((x) => x.textContent.trim()),
      line: el.querySelector('.ls-q-mark')?.textContent || '',
    };
  }, i);

  it('colours choices like the one-question screen and never boxes their answer', async () => {
    const { page, errors } = await open();
    assert.deepEqual(await card(page, 0), { options: { 0: 'correct-highlight', 1: 'ignored-option', 2: 'ignored-option' }, inputs: [], pills: [], boxes: [], line: '' });
    assert.deepEqual((await card(page, 1)).options, { 0: 'incorrect-highlight', 1: 'correct-missed', 2: 'ignored-option' });
    assert.deepEqual((await card(page, 1)).boxes, []);
    assert.deepEqual((await card(page, 2)).options, { 0: 'correct-highlight', 1: 'ignored-option', 2: 'incorrect-highlight', 3: 'correct-missed' });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('colours typed answers, each gap and each pair, with the right answer in a box', async () => {
    const { page, errors } = await open();
    assert.deepEqual(await card(page, 3), { options: {}, inputs: ['incorrect-highlight'], pills: [], boxes: ['Correct Answerplatform 5 | five'], line: '' });
    const gaps = await card(page, 4);
    assert.deepEqual(gaps.inputs, ['correct-highlight', 'incorrect-highlight']);
    assert.deepEqual(gaps.pills, ['✓ rain / storm']);
    assert.deepEqual((await card(page, 5)).inputs, ['correct-highlight', 'incorrect-highlight']);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('shows the teacher’s grade in the Teacher Feedback box, and plain lines otherwise', async () => {
    const { page, errors } = await open();
    assert.equal((await card(page, 6)).line, 'Your teacher will mark this one.');
    assert.deepEqual((await card(page, 7)).boxes, ['Teacher Feedback1000 / 1000 ptsGood idea!']);
    assert.deepEqual(await card(page, 8), { options: {}, inputs: [''], pills: [], boxes: [], line: 'Not answered' });
    // A teacher's comment on an auto-marked answer joins its colour.
    assert.deepEqual(await card(page, 9), { options: {}, inputs: ['correct-highlight'], pills: [], boxes: ['Teacher Feedback1000 / 1000 ptsMonday: mind the spelling.'], line: '' });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('shows the AI check under the marks: a reason, or feedback, and nothing for an accepted answer', async () => {
    const { page, errors } = await open();
    const out = await page.evaluate(() => {
      const attempt = live.player.assignment.state.attempt;
      const { questions } = attempt.assignment.quiz;
      const shown = (i, note, mark) => {
        attempt.answersByQ[i].ai = note;
        const el = renderListeningQuestion(questions[i], i, true, mark);
        return {
          boxes: [...el.querySelectorAll('.student-answer-reveal')].map((x) => x.textContent.trim()),
          line: el.querySelector('.ls-q-mark')?.textContent || '',
        };
      };
      return {
        refused: shown(3, { ok: false, why: 'Platform 4 is not the one.' }, { qIndex: 3, correct: false, correctAnswer: 'platform 5' }),
        accepted: shown(3, { ok: true, why: 'Same meaning.' }, { qIndex: 3, correct: true, correctAnswer: 'platform 5' }),
        open: shown(6, { task: 'partly', feedback: 'Say why he travels.' }),
        teacher: shown(7, { task: 'done', feedback: 'Well done.' }),
      };
    });
    assert.deepEqual(out.refused, { boxes: ['Correct Answerplatform 5', 'AI checkPlatform 4 is not the one.'], line: '' });
    assert.deepEqual(out.accepted, { boxes: [], line: '' });
    assert.deepEqual(out.open, { boxes: ['AI check⚠️ Part of the task is missingSay why he travels.Your teacher still grades this answer.'], line: '' });
    assert.deepEqual(out.teacher, { boxes: ['Teacher Feedback1000 / 1000 ptsGood idea!'], line: '' }, 'a teacher’s own feedback replaces the note');
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('draws the class correction’s marks the same way', async () => {
    const { page, errors } = await open();
    const out = await page.evaluate(() => {
      listeningSheet.mode = 'live';
      listeningSheet.live = { closed: true };
      listeningSheet.liveAnswers = { 0: 0, 1: 'No idea' };
      const mcq = renderListeningQuestion({ type: 'mcq', prompt: 'Yes?', answers: [{ text: 'Yes' }, { text: 'No' }] }, 0, true, { correct: false, correctAnswer: '2. No' });
      const open = renderListeningQuestion({ type: 'open', prompt: 'Why?', points: 1000 }, 1, true, { liveTeacher: { graded: true, pointsAwarded: 0, correction: 'Try again' } });
      const badge = open.querySelector('.student-answer-reveal-title span:last-child');
      return {
        rows: [...mcq.querySelectorAll('.ls-option')].map((row) => [Number(row.querySelector('input').value), row.className]).sort(),
        teacher: open.querySelector('.student-answer-reveal')?.textContent.trim(),
        badge: badge?.style.background,
      };
    });
    assert.deepEqual(out.rows, [[0, 'ls-option incorrect-highlight'], [1, 'ls-option correct-missed']]);
    assert.equal(out.teacher, 'Teacher Feedback0 / 1000 ptsTry again');
    assert.equal(out.badge, 'rgb(220, 38, 38)');
    assert.deepEqual(errors, []);
    await page.close();
  });
});
