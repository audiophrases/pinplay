/*
 * Build up mode: the Everest trail.
 *
 * An adaptive quiz assigned as a climb (BUILDUP_MODE_PLAN.md). The levels of
 * the quiz are the camps of the trail; the student's avatar is the token that
 * hops between them. Students see camps and altitude, never CEFR levels.
 *
 * Shared by the student page (the trail) and the teacher pages (camp names in
 * the results). window.PinBuildup = { altitude, campName, fmtAlt, mountTrail }.
 */
(function () {
  const tr = (s, vars) => (typeof window.t === 'function' ? window.t(s, vars) : String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m)));

  // Everest: Base Camp, Camps 1 to 4, Summit. A quiz with fewer levels keeps
  // Base Camp and the Summit and spaces the camps in between.
  const REAL_METRES = [5364, 6065, 6500, 7200, 7920, 8849];

  function altitude(i, n) {
    if (n <= 1) return REAL_METRES[0];
    const pos = (Math.max(0, Math.min(n - 1, i)) / (n - 1)) * (REAL_METRES.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(REAL_METRES.length - 1, lo + 1);
    return Math.round(REAL_METRES[lo] + (REAL_METRES[hi] - REAL_METRES[lo]) * (pos - lo));
  }

  function campName(i, n) {
    if (i <= 0) return tr('Base Camp');
    if (i >= n - 1) return tr('Summit');
    return tr('Camp {n}', { n: i });
  }

  function fmtAlt(m) {
    const fr = String(document.documentElement.lang || '').toLowerCase().startsWith('fr');
    return `${Number(m).toLocaleString(fr ? 'fr-FR' : 'en-US')} m`;
  }

  // A going-down line is never "wrong": climbers go back down to get used to
  // the air, then climb again.
  const DROP_LINES = [
    'Climb high, sleep low: back to {camp} to get used to the air.',
    'Even the best climbers go back down to {camp} to rest, then try again.',
    'One step back to {camp}. This is how you build up.',
  ];
  let dropCount = 0;

  function messageFor(c) {
    const n = c.n;
    const here = campName(c.rung, n);
    if (c.moved === 'summit') return { kind: 'summit', text: tr('You reached the Summit! 🚩') };
    if (c.moved === 'up') {
      return c.flag != null
        ? { kind: 'up', text: tr('{camp} reached. Flag planted! 🚩', { camp: here }) }
        : { kind: 'up', text: tr('Climbing! Back at {camp}.', { camp: here }) };
    }
    if (c.moved === 'pip') {
      const left = Math.max(1, c.need - c.pips);
      return { kind: 'pip', text: left === 1 ? tr('Good! One more right answer and you climb.') : tr('Good! {n} more right answers and you climb.', { n: left }) };
    }
    if (c.moved === 'down') {
      const line = DROP_LINES[dropCount % DROP_LINES.length];
      dropCount += 1;
      return { kind: 'down', text: tr(line, { camp: here }) };
    }
    if (c.moved === 'hold') return { kind: 'hold', text: tr('Stay here and try the next one.') };
    return null;
  }

  // The student's avatar: the one built in a Cup or a live lobby if this
  // browser has it, else one picked from the presets by name.
  function defaultAvatar(seed) {
    const AV = window.CUP_AVATAR;
    const presets = AV && Array.isArray(AV.presets) ? AV.presets : [];
    if (!presets.length) return null;
    let h = 0;
    String(seed || 'climber').split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
    const preset = presets[h % presets.length].avatar;
    return preset ? { head: 0, skin: 0, hair: 0, hairColor: 0, eyes: 0, mouth: 0, glasses: 0, hat: 0, shirt: 0, ...preset } : null;
  }

  function avatarFor(name) {
    const arena = window.PinArena;
    return (arena && arena.savedAvatar && arena.savedAvatar()) || defaultAvatar(name);
  }

  function avatarHtml(avatar) {
    const arena = window.PinArena;
    return arena && arena.avatarSvg && avatar ? arena.avatarSvg(avatar, 'climb-av') : '<span class="climb-av-fallback" aria-hidden="true">🧗</span>';
  }

  // Where a camp sits on the trail, as fractions (0..1) of the trail zone.
  // Vertical (a Chromebook's side panel): a gentle zigzag from the Base Camp
  // at the bottom to the Summit at the top. Horizontal (a narrow screen's
  // strip): the same path laid on its side.
  const zig = (i, n) => (i === 0 || i === n - 1 ? 0.5 : (i % 2 ? 0.34 : 0.66));
  const along = (i, n) => (i + 0.5) / n;
  const pos = (i, n) => ({ vx: zig(i, n), vy: along(i, n), hx: along(i, n), hy: 1 - zig(i, n) });
  const pointsV = (from, to, n) => Array.from({ length: to - from + 1 }, (_, k) => { const p = pos(from + k, n); return `${(p.vx * 100).toFixed(1)},${(100 - p.vy * 100).toFixed(1)}`; }).join(' ');
  const pointsH = (from, to, n) => Array.from({ length: to - from + 1 }, (_, k) => { const p = pos(from + k, n); return `${(p.hx * 100).toFixed(1)},${(p.hy * 100).toFixed(1)}`; }).join(' ');

  function mountTrail(parent, { onToken } = {}) {
    const el = document.createElement('aside');
    el.id = 'climbTrail';
    el.className = 'climb hidden';
    el.setAttribute('aria-label', tr('Your climb'));
    el.innerHTML = `
      <div class="climb-head">
        <div class="climb-alt" data-k="alt"></div>
        <div class="climb-camp" data-k="camp"></div>
      </div>
      <div class="climb-board" data-k="board">
        <svg class="climb-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline data-k="line" class="climb-line climb-line-v" points="" />
          <polyline data-k="lineDone" class="climb-line climb-line-done climb-line-v" points="" />
          <polyline data-k="lineH" class="climb-line climb-line-h" points="" />
          <polyline data-k="lineDoneH" class="climb-line climb-line-done climb-line-h" points="" />
        </svg>
        <ol class="climb-nodes" data-k="nodes"></ol>
        <button type="button" class="climb-token" data-k="token" title="${tr('Choose your climber')}" aria-label="${tr('Choose your climber')}"></button>
      </div>
      <p class="climb-msg" data-k="msg" role="status" aria-live="polite"></p>
      <p class="climb-tip hidden" data-k="tip"></p>`;
    parent.appendChild(el);
    const $ = (k) => el.querySelector(`[data-k="${k}"]`);
    const state = { n: 0, rung: -1, avatarKey: '', msgTimer: null };
    $('token').addEventListener('click', () => { if (onToken) onToken(); });
    // On a narrow screen the trail is a strip above the question, which the
    // question then makes room for (--climb-h).
    const narrow = window.matchMedia ? window.matchMedia('(max-width: 899px)') : { matches: false };
    const fit = () => document.documentElement.style.setProperty('--climb-h', narrow.matches && !el.classList.contains('hidden') ? `${el.offsetHeight}px` : '0px');
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(el);
    if (narrow.addEventListener) narrow.addEventListener('change', fit);

    const nodeVars = (p, prefix) => `--${prefix}vx:${p.vx.toFixed(4)};--${prefix}vy:${p.vy.toFixed(4)};--${prefix}hx:${p.hx.toFixed(4)};--${prefix}hy:${p.hy.toFixed(4)}`;

    function build(n) {
      state.n = n;
      el.style.setProperty('--n', String(n));
      $('line').setAttribute('points', pointsV(0, n - 1, n));
      $('lineH').setAttribute('points', pointsH(0, n - 1, n));
      $('nodes').innerHTML = Array.from({ length: n }, (_, i) => `
        <li class="climb-node" data-i="${i}" style="${nodeVars(pos(i, n), '')}">
          <span class="climb-label"><b>${campName(i, n)}</b><small>${fmtAlt(altitude(i, n))}</small><span class="climb-pips" data-pips></span></span>
          <span class="climb-spot" aria-hidden="true"><span class="climb-icon">${i === n - 1 ? '🏔️' : '⛺'}</span><span class="climb-flag">🚩</span></span>
        </li>`).join('');
    }

    function update(c, { name, avatar } = {}) {
      if (!c || !c.n || c.n < 2) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      if (state.n !== c.n) { build(c.n); state.rung = -1; }
      const n = c.n;
      const moved = state.rung !== -1 && c.rung !== state.rung;
      // The token and the numbers.
      const av = avatar || avatarFor(name);
      const key = JSON.stringify(av || '');
      if (key !== state.avatarKey) { state.avatarKey = key; $('token').innerHTML = avatarHtml(av); }
      const token = $('token');
      const tp = pos(c.rung, n);
      token.setAttribute('style', nodeVars(tp, ''));
      if (moved) {
        token.classList.remove('is-up', 'is-down');
        void token.offsetWidth;
        token.classList.add(c.rung > state.rung ? 'is-up' : 'is-down');
      }
      state.rung = c.rung;
      $('alt').textContent = fmtAlt(altitude(c.rung, n));
      $('camp').textContent = campName(c.rung, n);
      el.style.setProperty('--sky', String(c.rung / (n - 1)));
      $('lineDone').setAttribute('points', pointsV(0, c.best, n));
      $('lineDoneH').setAttribute('points', pointsH(0, c.best, n));
      el.querySelectorAll('.climb-node').forEach((node) => {
        const i = Number(node.dataset.i);
        node.classList.toggle('is-here', i === c.rung);
        node.classList.toggle('is-reached', i <= c.best);
        node.classList.toggle('is-flag', i > 0 && i <= c.best);
        const pips = node.querySelector('[data-pips]');
        pips.textContent = i === c.rung && !c.done ? Array.from({ length: c.need }, (_, p) => (p < c.pips ? '●' : '○')).join(' ') : '';
      });
      el.classList.toggle('is-summit', !!c.summit);
      el.classList.toggle('is-storm', !!c.tip);
      el.setAttribute('aria-label', `${tr('Your climb')}: ${campName(c.rung, n)}, ${fmtAlt(altitude(c.rung, n))}`);
      const tip = $('tip');
      tip.classList.toggle('hidden', !c.tip);
      tip.textContent = c.tip ? tr("Guide's tip: the weather is closing in. Look carefully at each right answer, ask your teacher for a hint, then keep climbing.") : '';
    }

    // The words about the move that was just made (shown with the feedback).
    function say(c) {
      const msg = $('msg');
      clearTimeout(state.msgTimer);
      const m = c ? messageFor(c) : null;
      msg.textContent = m ? m.text : '';
      msg.dataset.kind = m ? m.kind : '';
    }

    function destroy() { clearTimeout(state.msgTimer); el.remove(); document.documentElement.style.setProperty('--climb-h', '0px'); }
    return { el, update, say, destroy };
  }

  window.PinBuildup = { altitude, campName, fmtAlt, mountTrail, avatarFor, REAL_METRES };
}());
