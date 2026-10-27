/* Keyboard-first assignment setup. The app supplies the current options and
   performs creation only after the teacher confirms the final review. */
(function () {
  'use strict';
  const t = (text, args) => window.t ? window.t(text, args) : text.replace(/\{(\w+)\}/g, (_, key) => String(args?.[key] ?? ''));
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function open({ title, questionCount, initial, adaptiveAvailable, climbAvailable, singleCount, hasSections, climbDefaultCount, classes = [], loadClasses, onCreate }) {
    if (document.getElementById('assignmentSetupDialog')) return;
    const previousFocus = document.activeElement;
    const original = { ...initial };
    const draft = { ...initial };
    let step = 0;
    let preset = 'custom';
    let busy = false;
    let created = false;
    let classSelection = draft.className ? `label:${draft.className}` : 'none';
    const names = ['Start', 'Students', 'Feedback', 'Questions', 'Review'];
    const dialog = document.createElement('dialog');
    dialog.id = 'assignmentSetupDialog';
    dialog.className = 'assignment-setup';
    dialog.setAttribute('aria-labelledby', 'assignmentSetupTitle');
    dialog.setAttribute('aria-describedby', 'assignmentSetupKeys');
    dialog.innerHTML = `
      <header class="assignment-setup-head">
        <div><p class="assignment-setup-eyebrow">${esc(t('NEW ASSIGNMENT'))}</p><h2 id="assignmentSetupTitle">${esc(title)}</h2>
        <p class="small muted">${esc(t('{n} questions in this quiz', { n: questionCount }))}</p></div>
        <button type="button" class="assignment-setup-close" data-setup-action="close" aria-label="${esc(t('Close'))}">×</button>
      </header>
      <nav class="assignment-setup-steps" aria-label="${esc(t('Assignment setup steps'))}"></nav>
      <div class="assignment-setup-content"></div>
      <p class="assignment-setup-status" role="status" aria-live="polite"></p>
      <footer class="assignment-setup-footer">
        <p id="assignmentSetupKeys"><kbd>←</kbd><kbd>→</kbd> ${esc(t('choose'))} <kbd>↑</kbd><kbd>↓</kbd> ${esc(t('settings'))} <kbd>Enter</kbd> ${esc(t('continue'))}</p>
        <div><button type="button" class="btn" data-setup-action="back">${esc(t('Back'))}</button>
        <button type="button" class="btn primary" data-setup-action="next">${esc(t('Continue'))} →</button></div>
      </footer>`;
    const content = dialog.querySelector('.assignment-setup-content');
    const status = dialog.querySelector('.assignment-setup-status');
    const back = dialog.querySelector('[data-setup-action="back"]');
    const next = dialog.querySelector('[data-setup-action="next"]');
    const closeButton = dialog.querySelector('[data-setup-action="close"]');
    const nav = dialog.querySelector('nav');

    function close() { if (!busy) dialog.close(); }
    dialog.addEventListener('close', () => { dialog.remove(); previousFocus?.focus(); });
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    closeButton.addEventListener('click', close);
    back.addEventListener('click', () => { if (!busy && step > 0) { step -= 1; render(); } });

    function choices(key, selected, options, label, compact = false, literal = false) {
      const labelId = label ? `assignmentSetup-${key}` : 'assignmentSetupStepTitle';
      return (label ? `<h4 id="${labelId}" class="assignment-setup-setting-title">${esc(t(label))}</h4>` : '')
        + `<div class="assignment-setup-choices${compact ? ' assignment-setup-choices-compact' : ''}" role="radiogroup" aria-labelledby="${labelId}" data-choice-group="${key}">${options.map(([value, icon, label, description, disabled]) => `
        <button type="button" class="assignment-setup-choice" role="radio" aria-checked="${value === selected}" tabindex="${value === selected ? 0 : -1}" data-choice="${esc(value)}" ${disabled ? 'disabled' : ''}>
          ${icon ? `<span class="assignment-setup-choice-icon" aria-hidden="true">${icon}</span>` : ''}<strong>${esc(literal ? label : t(label))}</strong>${description ? `<span>${esc(t(description))}</span>` : ''}<span class="assignment-setup-tick" aria-hidden="true">✓</span>
        </button>`).join('')}</div>`;
    }
    function heading(eyebrow, text, description) {
      return `<p class="assignment-setup-eyebrow">${esc(t(eyebrow))}</p><h3 id="assignmentSetupStepTitle">${esc(t(text))}</h3><p class="assignment-setup-description">${esc(t(description))}</p>`;
    }
    function field(label, control) { return `<label class="assignment-setup-field"><span>${esc(t(label))}</span>${control}</label>`; }
    function classOptions() {
      const list = content.querySelector('[data-class-options]');
      if (!list) return;
      const focused = list.contains(document.activeElement);
      const labels = [...new Set([original.className, ...classes].filter(Boolean))];
      list.innerHTML = choices('classLabel', classSelection, [
        ['none', '', t('No label')],
        ...labels.map(label => [`label:${label}`, '', label]),
        ['custom', '', t('Custom label')],
      ], 'Class label (optional)', true, true);
      if (focused) list.querySelector('[aria-checked="true"]')?.focus();
    }
    function normalize() {
      if (draft.format === 'climb') { draft.feedbackMode = 'instant'; draft.examMode = false; }
      const max = draft.format === 'climb' ? 100 : Math.max(1, singleCount);
      draft.adaptiveCount = Math.max(1, Math.min(max, Math.round(Number(draft.adaptiveCount) || 20)));
    }
    function choose(key, value) {
      if (key === 'preset') {
        preset = value;
        if (value === 'custom') {
          Object.assign(draft, original);
          classSelection = draft.className ? `label:${draft.className}` : 'none';
        } else if (value === 'adaptive') Object.assign(draft, {
          format: 'adaptive', feedbackMode: 'end', examMode: false, attemptsLimit: 2, signIn: 'signin',
          adaptiveCount: original.format === 'adaptive' ? original.adaptiveCount : 20,
        });
        else if (value === 'climb') Object.assign(draft, {
          format: 'climb', feedbackMode: 'instant', examMode: false, attemptsLimit: 0, signIn: 'signin',
          adaptiveCount: original.format === 'climb' ? original.adaptiveCount : climbDefaultCount || 20,
        });
        else Object.assign(draft, {
          format: 'all', feedbackMode: value === 'practice' ? 'instant' : value === 'exam' ? 'none' : 'end',
          examMode: value === 'exam', attemptsLimit: value === 'practice' ? 0 : value === 'exam' ? 1 : 2,
          signIn: value === 'practice' ? 'random' : 'signin',
        });
      } else if (key === 'classLabel') {
        classSelection = value;
        if (value !== 'custom') draft.className = value === 'none' ? '' : value.slice(6);
      } else if (key === 'format') {
        if (value === 'climb' && draft.format !== 'climb') draft.adaptiveCount = climbDefaultCount || 20;
        draft.format = value;
      } else draft[key] = ['examMode', 'shuffleQuestions'].includes(key) ? value === 'on'
        : key === 'attemptsLimit' ? Number(value) : value;
      normalize();
      render({ key, value });
    }

    function render(focusChoice) {
      normalize();
      status.textContent = '';
      nav.innerHTML = names.map((name, i) => `<button type="button" data-step="${i}" data-setup-action="step" ${i === step ? 'aria-current="step"' : ''}><span>${i < step ? '✓' : i + 1}</span>${esc(t(name))}</button>`).join('');
      back.hidden = step === 0;
      next.textContent = step === 4 ? t('Create assignment') : `${t('Continue')} →`;
      if (step === 0) {
        content.innerHTML = heading('01 / GET STARTED', 'What are you setting up?', 'Start with a preset, then make it yours.') + choices('preset', preset, [
          ['practice', '✦', 'Practice', 'Instant feedback · unlimited attempts · random names'],
          ['homework', '⌂', 'Homework', 'Feedback at the end · 2 attempts · student sign-in'],
          ['exam', '▣', 'Exam', 'No feedback · 1 attempt · student sign-in · exam mode'],
          ['adaptive', '🎯', 'Adaptive', adaptiveAvailable ? 'Questions match each student’s level · feedback at the end · 2 attempts · student sign-in' : 'Needs questions tagged with at least two levels.', !adaptiveAvailable],
          ['climb', '🏔', 'Climb', climbAvailable ? 'Easiest step first, one step at a time · instant feedback · unlimited attempts · student sign-in' : 'Needs auto-graded questions in two or more steps or levels.', !climbAvailable],
          ['custom', '⚙', 'Current settings', 'Keep the options you have already chosen'],
        ]);
      } else if (step === 1) {
        content.innerHTML = heading('02 / STUDENTS', 'Who is this for?', 'Choose how students enter, and give this assignment a class label.') + choices('signIn', draft.signIn, [
          ['signin', '👤', 'Students sign in', 'Keep results under each student’s school account.'],
          ['random', '🎲', 'Random names', 'Anyone with the link can play without signing in.'],
        ]) + '<div data-class-options></div>'
          + (classSelection === 'custom' ? field('Class label (optional)', `<input data-field="className" value="${esc(draft.className)}" placeholder="${esc(t('e.g. 4B'))}" autocomplete="off" maxlength="100">`) : '')
          + `<p class="assignment-setup-note">${esc(t('The class label organises your list. It does not restrict who can open the link.'))}</p>`;
        classOptions();
      } else if (step === 2) {
        const climb = draft.format === 'climb';
        content.innerHTML = heading('03 / FEEDBACK', 'When should students see feedback?', 'Choose what students see and how many attempts they get.') + choices('feedbackMode', draft.feedbackMode, [
          ['instant', '⚡', 'After each answer', 'Show right or wrong immediately. Saved answers are locked.'],
          ['end', '◷', 'At the end', 'Students can edit saved answers until they submit.', climb],
          ['none', '🔒', 'No feedback', 'Keep feedback hidden. Release grades yourself when ready.', climb],
        ]) + choices('attemptsLimit', String(draft.attemptsLimit), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0].map(n => [String(n), '', n === 0 ? 'Unlimited' : String(n)]), 'Attempts per student', true)
          + choices('examMode', draft.examMode ? 'on' : 'off', [
            ['off', '', 'Off', '', climb], ['on', '', 'On', '', climb],
          ], 'Exam mode', true)
          + `<p class="assignment-setup-note">${esc(t('Pause when students leave the tab and log focus changes.'))}</p>`
          + (climb ? `<p class="assignment-setup-note">${esc(t('Climb uses instant feedback and keeps exam mode off.'))}</p>` : '');
      } else if (step === 3) {
        content.innerHTML = heading('04 / QUESTIONS & TIMING', 'How should the assignment run?', 'Use the full quiz, or let the questions adapt to each student.') + choices('format', draft.format, [
          ['all', '▤', 'All questions', 'Every student gets the full quiz.'],
          ['adaptive', '🎯', 'Adaptive', adaptiveAvailable ? 'Questions match each student’s level.' : 'Needs questions tagged with at least two levels.', !adaptiveAvailable],
          ['climb', '🏔', 'Climb', climbAvailable ? 'Build a skill from the easiest step, one step at a time.' : 'Needs auto-graded questions in two or more steps or levels.', !climbAvailable],
        ]) + choices('shuffleQuestions', draft.format === 'all' && draft.shuffleQuestions ? 'on' : 'off', [
          ['off', '', 'Off', '', draft.format !== 'all'], ['on', '', 'On', '', draft.format !== 'all'],
        ], 'Shuffle questions', true)
          + `<p class="assignment-setup-note">${esc(t(draft.format === 'all' ? 'A separate question order for each new attempt. Listening sections stay together. Started attempts keep their order.' : 'Adaptive and Climb choose their own question order.'))}</p><div class="assignment-setup-fields">` + (draft.format !== 'all' && (draft.format === 'climb' || singleCount > 0)
          ? field(draft.format === 'climb' ? 'Maximum questions per student' : 'Questions per student', `<input type="number" data-field="adaptiveCount" min="1" max="${draft.format === 'climb' ? 100 : Math.max(1, singleCount)}" value="${draft.adaptiveCount}" required>`)
          : '') + field('Due date (optional)', `<input type="datetime-local" data-field="dueAt" value="${esc(draft.dueAt)}">`) + '</div>'
          + (draft.format === 'adaptive' && hasSections ? `<p class="assignment-setup-note">${esc(t('Listening sections are added at each student’s level.'))}</p>` : '')
          + (draft.format === 'climb' ? `<p class="assignment-setup-note">${esc(t('Climb uses instant feedback and keeps exam mode off.'))}</p>` : '');
      } else {
        const feedback = { none: 'No feedback', instant: 'After each answer', end: 'At the end' };
        const format = { all: 'All questions', adaptive: 'Adaptive', climb: 'Climb' };
        const summary = [
          ['Students', t(draft.signIn === 'signin' ? 'Students sign in' : 'Random names')],
          ['Class label', draft.className.trim() || t('No label')],
          ['Feedback', t(feedback[draft.feedbackMode])],
          ['Attempts', Number(draft.attemptsLimit) === 0 ? t('Unlimited') : draft.attemptsLimit],
          ['Questions', t(format[draft.format]) + (draft.format === 'all' ? ` · ${questionCount}` : (draft.format === 'climb' || singleCount > 0 ? ` · ${draft.adaptiveCount}` : ''))],
          ['Exam mode', t(draft.examMode ? 'On' : 'Off')],
          ['Shuffle questions', t(draft.format === 'all' && draft.shuffleQuestions ? 'On' : 'Off')],
          ['Due date', draft.dueAt ? new Date(draft.dueAt).toLocaleString() : t('No due date')],
        ];
        content.innerHTML = heading('05 / READY TO SHARE', 'Everything look right?', 'Create the assignment to get a link for your students.') + `<dl class="assignment-setup-review">${summary.map(([key, value]) => `<div><dt>${esc(t(key))}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
      }
      const focus = focusChoice ? [...content.querySelectorAll('[data-choice]')].find(card => card.closest('[data-choice-group]').dataset.choiceGroup === focusChoice.key && card.dataset.choice === focusChoice.value)
        : content.querySelector('[role="radio"][aria-checked="true"]:not(:disabled)');
      (focus || next).focus();
      content.scrollTop = 0;
    }

    content.addEventListener('click', event => {
      const card = event.target.closest('[data-choice]');
      if (!busy && card && !card.disabled) choose(card.closest('[data-choice-group]').dataset.choiceGroup, card.dataset.choice);
    });
    function readField(event) {
      const field = event.target.dataset.field;
      if (field) draft[field] = field === 'adaptiveCount' ? Number(event.target.value) : event.target.value;
    }
    content.addEventListener('input', readField);
    content.addEventListener('change', readField);
    nav.addEventListener('click', event => {
      const target = event.target.closest('[data-step]');
      if (target && !busy && valid()) { step = Number(target.dataset.step); render(); }
    });
    function valid() {
      const invalid = [...content.querySelectorAll('input,select')].find(el => !el.checkValidity());
      if (invalid) { invalid.reportValidity(); return false; }
      return true;
    }
    function settings() {
      return [...content.querySelectorAll('[data-choice-group],input[data-field]')].map(el => el.matches('[data-choice-group]')
        ? el.querySelector('[aria-checked="true"]:not(:disabled)') || el.querySelector('[data-choice]:not(:disabled)') : el)
        .filter(el => el && !el.disabled && el.getClientRects().length);
    }
    function moveSetting(target, delta) {
      const controls = settings();
      const index = controls.findIndex(el => el === target || (target.closest('[data-choice-group]') && el.closest('[data-choice-group]') === target.closest('[data-choice-group]')));
      if (index < 0) return false;
      const control = controls[index + delta];
      if (control) control.focus();
      else if (delta > 0) { if (valid()) next.focus(); }
      else nav.querySelector('[aria-current="step"]').focus();
      return true;
    }
    async function advance() {
      if (busy || created || !valid()) return;
      if (step < 4) { step += 1; render(); return; }
      normalize();
      busy = true;
      dialog.setAttribute('aria-busy', 'true');
      dialog.querySelectorAll('button,input,select').forEach(el => { el.disabled = true; });
      next.textContent = t('Creating…');
      status.textContent = t('Preparing the quiz and creating your assignment…');
      try {
        const result = await onCreate({ ...draft, className: draft.className.trim() });
        if (!result?.code || !result?.link) throw new Error(t('Assignment creation was not completed. Please try again.'));
        created = true;
        nav.hidden = true;
        back.hidden = true;
        next.hidden = true;
        document.getElementById('assignmentSetupKeys').hidden = true;
        content.innerHTML = heading('READY TO SHARE', 'Your assignment is ready', 'Share this link with your students.')
          + `<div class="assignment-setup-success"><span aria-hidden="true">✓</span><strong>${esc(result.code)}</strong></div>`
          + field('Assignment link', `<input class="assignment-setup-link" value="${esc(result.link)}" readonly>`)
          + `<button class="btn primary" type="button" data-setup-action="copy">${esc(t('Copy link'))}</button>`;
        const copy = content.querySelector('[data-setup-action="copy"]');
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(result.link); status.textContent = t('Link copied.'); }
          catch { content.querySelector('input').select(); status.textContent = t('Select and copy the link above.'); }
        });
        status.textContent = t('Assignment created.');
        copy.focus();
      } catch (error) {
        status.textContent = t('Could not create assignment: {message}', { message: error.message });
        dialog.querySelectorAll('button,input,select').forEach(el => { el.disabled = false; });
        next.textContent = t('Create assignment');
        next.focus();
      } finally {
        busy = false;
        closeButton.disabled = false;
        dialog.removeAttribute('aria-busy');
      }
    }
    next.addEventListener('click', advance);
    dialog.addEventListener('keydown', event => {
      // Keep the builder's global keyboard shortcuts out of this modal.
      event.stopPropagation();
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,input,select,[tabindex]')]
          .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (first && (event.shiftKey ? event.target === first : event.target === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
      if (busy || created || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Enter' && event.repeat) { event.preventDefault(); return; }
      const card = event.target.closest('[data-choice]');
      const action = event.target.closest('[data-setup-action]');
      if (card && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const group = card.closest('[data-choice-group]');
        const cards = [...group.querySelectorAll('[data-choice]:not(:disabled)')];
        const i = cards.indexOf(card);
        const delta = event.key === 'ArrowLeft' ? -1 : 1;
        const target = cards[event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : (i + delta + cards.length) % cards.length];
        choose(group.dataset.choiceGroup, target.dataset.choice);
      } else if ((card || event.target.type === 'text') && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        moveSetting(event.target, event.key === 'ArrowUp' ? -1 : 1);
      } else if (event.target.closest('[data-step]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const steps = [...nav.querySelectorAll('button')];
        const index = steps.indexOf(event.target.closest('[data-step]'));
        steps[event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + steps.length) % steps.length].focus();
      } else if (action && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const controls = settings();
        const currentStep = nav.querySelector('[aria-current="step"]');
        if (action.dataset.setupAction === 'step') {
          (event.key === 'ArrowUp' ? closeButton : controls[0] || next).focus();
        } else if (action === closeButton || event.key === 'ArrowDown') currentStep.focus();
        else if (event.key === 'ArrowUp') (controls[controls.length - 1] || currentStep).focus();
        else (event.key === 'ArrowLeft' && !back.hidden ? back : next).focus();
      } else if (event.key === 'Enter' && !event.target.closest('[data-setup-action]')) {
        event.preventDefault();
        const controls = settings();
        const index = controls.findIndex(el => el === event.target || (card && el.closest('[data-choice-group]') === card.closest('[data-choice-group]')));
        if (index >= 0 && controls[index + 1]) controls[index + 1].focus();
        else advance();
      }
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    render();
    if (loadClasses) Promise.resolve().then(loadClasses).then(values => { classes = values; classOptions(); }).catch(() => {});
  }

  window.PinAssignmentSetup = { open };
}());
