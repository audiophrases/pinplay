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
        <p id="assignmentSetupKeys"><kbd>←</kbd><kbd>→</kbd> ${esc(t('choose'))} <kbd>Enter</kbd> ${esc(t('continue'))} <span>· ${esc(t('Tab for more options'))}</span></p>
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

    function choices(key, selected, options) {
      return `<div class="assignment-setup-choices" role="radiogroup" aria-labelledby="assignmentSetupStepTitle" data-choice-group="${key}">${options.map(([value, icon, label, description, disabled]) => `
        <button type="button" class="assignment-setup-choice" role="radio" aria-checked="${value === selected}" tabindex="${value === selected ? 0 : -1}" data-choice="${value}" ${disabled ? 'disabled' : ''}>
          <span class="assignment-setup-choice-icon" aria-hidden="true">${icon}</span><strong>${esc(t(label))}</strong><span>${esc(t(description))}</span><span class="assignment-setup-tick" aria-hidden="true">✓</span>
        </button>`).join('')}</div>`;
    }
    function heading(eyebrow, text, description) {
      return `<p class="assignment-setup-eyebrow">${esc(t(eyebrow))}</p><h3 id="assignmentSetupStepTitle">${esc(t(text))}</h3><p class="assignment-setup-description">${esc(t(description))}</p>`;
    }
    function field(label, control) { return `<label class="assignment-setup-field"><span>${esc(t(label))}</span>${control}</label>`; }
    function classOptions() {
      const list = content.querySelector('#assignmentSetupClasses');
      if (list) list.innerHTML = classes.map(c => `<option value="${esc(c)}"></option>`).join('');
    }
    function normalize() {
      if (draft.format === 'climb') { draft.feedbackMode = 'instant'; draft.examMode = false; }
      const max = draft.format === 'climb' ? 100 : Math.max(1, singleCount);
      draft.adaptiveCount = Math.max(1, Math.min(max, Math.round(Number(draft.adaptiveCount) || 20)));
    }
    function choose(key, value) {
      if (key === 'preset') {
        preset = value;
        if (value === 'custom') Object.assign(draft, original);
        else Object.assign(draft, {
          format: 'all', feedbackMode: value === 'practice' ? 'instant' : value === 'exam' ? 'none' : 'end',
          examMode: value === 'exam', attemptsLimit: value === 'practice' ? 0 : value === 'exam' ? 1 : 2,
          signIn: value === 'practice' ? 'random' : 'signin',
        });
      } else if (key === 'format') {
        if (value === 'climb' && draft.format !== 'climb') draft.adaptiveCount = climbDefaultCount || 20;
        draft.format = value;
      } else draft[key] = value;
      normalize();
      render(value);
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
          ['custom', '⚙', 'Current settings', 'Keep the options you have already chosen'],
        ]);
      } else if (step === 1) {
        content.innerHTML = heading('02 / STUDENTS', 'Who is this for?', 'Choose how students enter, and give this assignment a class label.') + choices('signIn', draft.signIn, [
          ['signin', '👤', 'Students sign in', 'Keep results under each student’s school account.'],
          ['random', '🎲', 'Random names', 'Anyone with the link can play without signing in.'],
        ]) + field('Class label (optional)', `<input data-field="className" value="${esc(draft.className)}" list="assignmentSetupClasses" placeholder="${esc(t('e.g. 4B'))}" autocomplete="off" maxlength="100"><datalist id="assignmentSetupClasses"></datalist>`)
          + `<p class="assignment-setup-note">${esc(t('The class label organises your list. It does not restrict who can open the link.'))}</p>`;
        classOptions();
      } else if (step === 2) {
        const climb = draft.format === 'climb';
        content.innerHTML = heading('03 / FEEDBACK', 'When should students see feedback?', 'Choose what students see and how many attempts they get.') + choices('feedbackMode', draft.feedbackMode, [
          ['instant', '⚡', 'After each answer', 'Show right or wrong immediately. Saved answers are locked.'],
          ['end', '◷', 'At the end', 'Students can edit saved answers until they submit.', climb],
          ['none', '🔒', 'No feedback', 'Keep feedback hidden. Release grades yourself when ready.', climb],
        ]) + `<div class="assignment-setup-fields">` + field('Attempts per student', `<select data-field="attemptsLimit">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0].map(n => `<option value="${n}" ${Number(draft.attemptsLimit) === n ? 'selected' : ''}>${n === 0 ? esc(t('Unlimited')) : n}</option>`).join('')}</select>`)
          + `<label class="assignment-setup-switch"><input type="checkbox" data-field="examMode" ${draft.examMode ? 'checked' : ''} ${climb ? 'disabled' : ''}><span><strong>${esc(t('Exam mode'))}</strong><small>${esc(t('Pause when students leave the tab and log focus changes.'))}</small></span></label></div>`
          + (climb ? `<p class="assignment-setup-note">${esc(t('Climb uses instant feedback and keeps exam mode off.'))}</p>` : '');
      } else if (step === 3) {
        content.innerHTML = heading('04 / QUESTIONS & TIMING', 'How should the assignment run?', 'Use the full quiz, or let the questions adapt to each student.') + choices('format', draft.format, [
          ['all', '▤', 'All questions', 'Every student gets the full quiz.'],
          ['adaptive', '🎯', 'Adaptive', adaptiveAvailable ? 'Questions match each student’s level.' : 'Needs questions tagged with at least two levels.', !adaptiveAvailable],
          ['climb', '🏔', 'Climb', climbAvailable ? 'Build a skill from the easiest level, step by step.' : 'Needs auto-graded questions at two or more levels.', !climbAvailable],
        ]) + `<div class="assignment-setup-fields">` + (draft.format !== 'all' && (draft.format === 'climb' || singleCount > 0)
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
          ['Due date', draft.dueAt ? new Date(draft.dueAt).toLocaleString() : t('No due date')],
        ];
        content.innerHTML = heading('05 / READY TO SHARE', 'Everything look right?', 'Create the assignment to get a link for your students.') + `<dl class="assignment-setup-review">${summary.map(([key, value]) => `<div><dt>${esc(t(key))}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
      }
      const focus = focusChoice ? content.querySelector(`[data-choice="${focusChoice}"]`) : content.querySelector('[role="radio"][aria-checked="true"]');
      (focus || next).focus();
      content.scrollTop = 0;
    }

    content.addEventListener('click', event => {
      const card = event.target.closest('[data-choice]');
      if (!busy && card && !card.disabled) choose(card.closest('[data-choice-group]').dataset.choiceGroup, card.dataset.choice);
    });
    function readField(event) {
      const field = event.target.dataset.field;
      if (field) draft[field] = event.target.type === 'checkbox' ? event.target.checked
        : ['adaptiveCount', 'attemptsLimit'].includes(field) ? Number(event.target.value) : event.target.value;
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
      const card = event.target.closest('[data-choice]');
      if (card && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const group = card.closest('[data-choice-group]');
        const cards = [...group.querySelectorAll('[data-choice]:not(:disabled)')];
        const i = cards.indexOf(card);
        const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
        const target = cards[event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : (i + delta + cards.length) % cards.length];
        choose(group.dataset.choiceGroup, target.dataset.choice);
      } else if (event.key === 'Enter' && !event.target.closest('[data-setup-action]') && event.target.tagName !== 'SELECT') {
        event.preventDefault();
        advance();
      }
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    render();
    if (loadClasses) Promise.resolve().then(loadClasses).then(values => { classes = values; classOptions(); }).catch(() => {});
  }

  window.PinAssignmentSetup = { open };
}());
