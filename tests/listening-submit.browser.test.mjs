import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { extractDeclaration } = createRequire(import.meta.url)('./helpers/extract-declaration');
const { chromium } = await import('playwright').catch(() => ({}));
const source = fs.readFileSync('play.js', 'utf8');
const names = [
  'init', 'submitLiveAnswer', 'listeningSheet', 'liveListeningLocked', 'liveListeningStage',
  'maybeRenderLiveListeningSheet', 'assignmentListeningInfo', 'listeningSectionLocked',
  'closeListeningSheet', 'maybeRenderListeningSheet', 'listeningSavedAnswer', 'renderListeningSheet',
  'listeningStatus', 'listeningAnswered', 'updateListeningProgress', 'renderListeningQuestion',
  'queueListeningSave', 'flushListeningSaves', 'sendListeningSave',
  'confirmListeningSubmission', 'submitListeningSection',
  'listeningOptionOrder', 'questionShuffleSeed', 'seededShuffleIndices',
];
let browser;

describe('listening submission requires an explicit confirmation', { skip: !chromium && 'Install playwright to run browser checks' }, () => {
  before(async () => {
    const executablePath = [process.env.PINPLAY_TEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function open({ mode = 'assignment', width = 1100, filled = false } = {}) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<main id="joinQuestionWrap"><div id="joinAnswers"><input></div><button id="joinSubmitBtn">Finish quiz</button></main>');
    await page.addStyleTag({ path: 'styles.css' });
    await page.evaluate(({ mode, filled }) => {
      window.t = (text, args = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
      for (const name of [
        'setupImageLightbox', 'pingEdgeTtsBridgeWarmup', 'initAssignmentSfx', 'initMuteMusicBtn',
        'initBetControl', 'initReactionRow', 'scheduleJoinAdaptiveFit', 'armFirstInteractionFullscreen',
        'initAssignmentFromUrl', 'initGameFromUrl', 'initLivePreviewFromUrl', 'markAnswerDirty', 'updateAnswerKeyHint',
        'cancelPendingAssignmentQuestionAutoplay', 'stopAssignmentQuestionAudioPlayback', 'stopAllAssignmentAmbient',
        'stopJoinTimer', 'renderListeningPlayer',
      ]) window[name] = () => {};
      for (const name of ['validatePinBtn', 'joinBtn', 'joinSignOutBtn', 'rerollNameBtn', 'assignmentPrevBtn', 'assignmentNextBtn', 'assignmentNextPendingBtn', 'joinPinEl']) window[name] = null;
      for (const name of ['joinQuestionWrap', 'joinAnswersEl', 'joinSubmitBtn']) window[name] = document.getElementById(name === 'joinAnswersEl' ? 'joinAnswers' : name);
      window.isAdaptiveAssignmentOpen = () => false;
      window._spellingBeeRoundActive = window._wordleRoundActive = false;
      window.hiddenActions = [];
      window.moveAssignmentIndex = delta => hiddenActions.push(delta);
      window.PinArena = { active: true, submit: () => hiddenActions.push('submit') };
      window.calls = [];
      window.events = [];
      window.section = { id: 'part1', title: 'Part 1', text: 'Listen and answer.' };
      const questions = [
        { type: 'text', prompt: 'What did she say?' },
        { type: 'open', prompt: 'Explain in your own words.' },
        { type: 'mcq', prompt: 'Choose one.', answers: [{ text: 'Yes' }, { text: 'No' }] },
        { type: 'match_pairs', prompt: 'Match the speaker.', leftItems: ['Speaker 1'], rightOptions: ['Alex', 'Sam'] },
      ].map(q => ({ ...q, listeningSection: section.id }));
      const answers = filled ? { 0: 'A sentence in progress', 1: 'An explanation', 2: 0, 3: ['0'] } : {};
      window.live = { player: { mode, pin: '1234', id: 'student', token: 'token', assignment: {
        code: 'EXAM', attemptId: 'attempt1', currentIndex: 0,
        state: { attempt: { assignment: { feedbackMode: 'none', quiz: { questions, listeningSections: [section] } },
          answersByQ: Object.fromEntries(Object.entries(answers).map(([i, answer]) => [i, { answer }])),
          answeredQIndexes: Object.keys(answers).map(Number), sectionsSubmitted: {},
        } },
      } } };
      window.info = { section, first: 0, last: 3 };
      window.liveState = { phase: 'question', questionStartedAt: 123, listening: { ...info, questions, answers } };
      window.api = async (route, { body }) => {
        calls.push({ route, body: structuredClone(body) });
        if (route.endsWith('/answer')) {
          if (window.delaySave) await new Promise(resolve => { window.finishSave = resolve; });
          events.push('saved');
          const attempt = live.player.assignment.state.attempt;
          attempt.answersByQ[String(body.qIndex)] = { answer: body.answer };
          attempt.answeredQIndexes = Object.keys(attempt.answersByQ).map(Number);
          return { attempt: structuredClone(attempt) };
        }
        if (route.endsWith('/submit') || route.endsWith('/submit-section')) {
          if (window.failSubmit) throw new Error('Connection lost');
          events.push('submitted');
          if (mode === 'live') {
            liveState.listening.submitted = true;
            return { state: liveState };
          }
          const attempt = structuredClone(live.player.assignment.state.attempt);
          attempt.sectionsSubmitted[section.id] = 1;
          return { attempt };
        }
        throw new Error(`Unexpected route: ${route}`);
      };
      window.applyLivePlayerState = state => maybeRenderLiveListeningSheet(state);
      window.refresh = () => maybeRenderListeningSheet(mode === 'live' ? liveState : {
        phase: 'question', currentIndex: 0, totalQuestions: questions.length,
        answeredQIndexes: live.player.assignment.state.attempt.answeredQIndexes,
      });
    }, { mode, filled });
    await page.addScriptTag({ content: names.map(name => extractDeclaration(source, name)).join('\n') });
    await page.evaluate(() => { init(); refresh(); });
    return { page, errors };
  }

  const submitButton = page => page.locator('#listeningSheet').getByRole('button', { name: 'Submit section', exact: true });
  const submissionCalls = page => page.evaluate(() => calls.filter(call => /\/submit(?:-section)?$/.test(call.route)));
  async function assertClean(page, errors) {
    assert.deepEqual(errors, []);
    await page.close();
  }

  for (const mode of ['assignment', 'live']) {
    it(`${mode}: typing Enter and using answer controls never triggers the hidden quiz`, async () => {
      const { page, errors } = await open({ mode });
      const input = page.locator('.ls-q[data-q-index="0"] input');
      await input.fill('Still writing');
      await input.press('Enter');
      const textarea = page.locator('textarea');
      await textarea.fill('First line');
      await textarea.press('End');
      await textarea.press('Enter');
      await textarea.pressSequentially('Second line');
      assert.equal(await textarea.inputValue(), 'First line\nSecond line');
      const radio = page.locator('.ls-option input').first();
      await radio.focus();
      await radio.press('Space');
      assert.equal(await radio.isChecked(), true);
      await page.locator('select').press('ArrowDown');
      await page.locator('select').press('Enter');
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await page.evaluate(() => submitLiveAnswer());
      assert.deepEqual(await page.evaluate(() => hiddenActions), []);
      assert.deepEqual(await submissionCalls(page), []);
      assert.equal(await page.locator('dialog').count(), 0);
      assert.equal(await input.inputValue(), 'Still writing');
      await assertClean(page, errors);
    });

    it(`${mode}: confirmation defaults to Keep working, Escape and Enter cancel without losing drafts`, async () => {
      const { page, errors } = await open({ mode, width: 390 });
      const input = page.locator('.ls-q[data-q-index="0"] input');
      await input.fill('A draft to keep');
      await submitButton(page).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /3 questions unanswered/);
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Keep working');
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Submit section');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Keep working');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !listeningSheet.busy);
      assert.equal(await submitButton(page).evaluate(el => el === document.activeElement), true);
      await submitButton(page).click();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !listeningSheet.busy);
      assert.equal(await page.locator('dialog').count(), 0);
      assert.equal(await input.inputValue(), 'A draft to keep');
      assert.deepEqual(await submissionCalls(page), []);
      assert.deepEqual(await page.evaluate(() => hiddenActions), []);
      await assertClean(page, errors);
    });

    it(`${mode}: explicit confirmation waits for the latest draft and submits only once`, async () => {
      const { page, errors } = await open({ mode, filled: true });
      await page.evaluate(() => { window.delaySave = true; });
      await page.locator('.ls-q[data-q-index="0"] input').fill('The complete final sentence.');
      await submitButton(page).click();
      await page.waitForFunction(() => typeof finishSave === 'function');
      // Repeated activation while the confirmation is pending cannot open another one.
      await page.evaluate(() => { submitListeningSection(info); });
      assert.equal(await page.locator('dialog').count(), 1);
      assert.match(await page.getByRole('dialog').innerText(), /Submit this section\?/);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      assert.deepEqual(await submissionCalls(page), []);
      await page.evaluate(() => { submitListeningSection(info); finishSave(); });
      await page.waitForFunction(() => !listeningSheet.busy);
      assert.deepEqual(await page.evaluate(() => events), ['saved', 'submitted']);
      const calls = await submissionCalls(page);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].route, mode === 'live' ? '/api/section/submit' : '/api/assignment/submit-section');
      assert.equal(await page.evaluate(() => live.player.assignment.state.attempt.answersByQ[0].answer), 'The complete final sentence.');
      assert.equal(await page.locator('.ls-q[data-q-index="0"] input').isDisabled(), true);
      assert.equal(await page.locator('dialog').count(), 0);
      await assertClean(page, errors);
    });
  }

  it('a refresh with all drafts answered keeps the same editable sheet and focused unfinished sentence', async () => {
    const { page, errors } = await open({ filled: true });
    const input = page.locator('.ls-q[data-q-index="0"] input');
    await input.fill('I was just about to');
    await page.evaluate(() => { window.originalSheet = listeningSheet.el; refresh(); });
    assert.equal(await page.evaluate(() => listeningSheet.el === originalSheet), true);
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    await input.pressSequentially(' finish this sentence.');
    await page.evaluate(async () => { await flushListeningSaves(); refresh(); });
    assert.equal(await input.inputValue(), 'I was just about to finish this sentence.');
    assert.equal(await input.isEditable(), true);
    assert.deepEqual(await submissionCalls(page), []);
    await assertClean(page, errors);
  });

  it('failed submission leaves answers editable and allows another confirmed attempt', async () => {
    const { page, errors } = await open({ filled: true });
    await page.evaluate(() => { window.failSubmit = true; });
    await submitButton(page).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit section', exact: true }).click();
    await page.waitForFunction(() => !listeningSheet.busy);
    assert.equal(await page.locator('.ls-status').innerText(), 'Connection lost');
    assert.equal(await page.locator('.ls-q[data-q-index="0"] input').isEditable(), true);
    await page.evaluate(() => { window.failSubmit = false; });
    await submitButton(page).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit section', exact: true }).click();
    await page.waitForFunction(() => !listeningSheet.busy);
    assert.equal((await submissionCalls(page)).length, 2);
    assert.equal(await page.locator('.ls-q[data-q-index="0"] input').isDisabled(), true);
    await assertClean(page, errors);
  });

  it('a teacher closing the section cancels an open confirmation', async () => {
    const { page, errors } = await open({ mode: 'live' });
    await submitButton(page).click();
    await page.evaluate(() => { liveState.listening.closed = true; refresh(); });
    await page.waitForFunction(() => !listeningSheet.busy);
    assert.equal(await page.locator('dialog').count(), 0);
    assert.deepEqual(await submissionCalls(page), []);
    assert.equal(await page.locator('.ls-q[data-q-index="0"] input').isDisabled(), true);
    await assertClean(page, errors);
  });

  it('normal quiz keyboard shortcuts resume after leaving the listening sheet', async () => {
    const { page, errors } = await open();
    await page.evaluate(() => { closeListeningSheet(); document.activeElement.blur(); });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => hiddenActions), [1, 'submit']);
    await assertClean(page, errors);
  });

  it('a teacher moving on during the final save prevents a stale submission', async () => {
    const { page, errors } = await open({ mode: 'live' });
    await page.evaluate(() => { window.delaySave = true; });
    await page.locator('.ls-q[data-q-index="0"] input').fill('My final answer');
    await submitButton(page).click();
    await page.waitForFunction(() => typeof finishSave === 'function');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit section', exact: true }).click();
    await page.evaluate(() => { liveState.listening.closed = true; refresh(); finishSave(); });
    await page.waitForFunction(() => !listeningSheet.busy);
    assert.deepEqual(await submissionCalls(page), []);
    assert.equal(await page.locator('dialog').count(), 0);
    await assertClean(page, errors);
  });
});
