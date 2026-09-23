// PinPlay Cup (internal id "arena"): self-paced live mode — student screens +
// projected teacher board.
// Loaded after play.js on the student page and after app.js on the teacher page;
// it reuses their globals (renderJoinQuestion, readJoinAnswer, live,
// normalizeBackendUrl, loadBackendUrl, DEFAULT_BACKEND_URL) and talks to the
// room's Durable Object over one WebSocket (/api/arena/ws).
(function () {
  const ARENA_DISPLAY_NAME = 'PinPlay Cup';

  const CARDS = {
    lucky: { icon: '🪙', name: 'Points', hint: '' },
    double: { icon: '✖️2', name: 'Double Up', hint: 'Next right ×2' },
    boost: { icon: '⚡', name: 'Boost', hint: '+50% for 20s' },
    second: { icon: '🔁', name: 'Second Chance', hint: 'Retry one miss' },
    shield: { icon: '🛡️', name: 'Shield', hint: 'Blocks 1 attack' },
    steal: { icon: '🦝', name: 'Steal 10%', hint: 'You pick who' },
    pickpocket: { icon: '🧤', name: 'Pickpocket', hint: 'Take 200 · you pick' },
    swap: { icon: '🔀', name: 'Swap', hint: 'Swap scores · random player' },
    jackpot: { icon: '💎', name: 'Jackpot', hint: '+1000' },
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = (s, vars) => (typeof t === 'function' ? t(s, vars) : s);

  // ---------------------------------------------------------------- avatar
  // Modular character: one index per part. Counts must match
  // ARENA_AVATAR_PARTS in cloudflare/worker.js.
  const AVATAR_PARTS = { skin: 6, hair: 8, hairColor: 8, eyes: 4, mouth: 4, glasses: 5, hat: 7, shirt: 8 };
  const AVATAR_LABELS = { skin: 'Skin', hair: 'Hair', hairColor: 'Hair colour', eyes: 'Eyes', mouth: 'Mouth', glasses: 'Glasses', hat: 'Hat', shirt: 'Shirt' };
  const SKINS = ['#f9d7b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'];
  const HAIR_COLORS = ['#2b1b0e', '#6b4423', '#b5651d', '#e8c872', '#d9480f', '#9aa0a6', '#7048e8', '#20c997'];
  const SHIRTS = ['#605dff', '#e63946', '#2a9d8f', '#f4a261', '#264653', '#ff5da2', '#8ac926', '#1982c4'];
  const AVATAR_KEY = 'pinplay.cup.avatar';
  const INK = '#2a2230';

  function randomAvatar() {
    const out = {};
    Object.entries(AVATAR_PARTS).forEach(([k, n]) => { out[k] = Math.floor(Math.random() * n); });
    // Most kids shouldn't start with a hat AND glasses — keep randoms readable.
    if (Math.random() < 0.5) out.glasses = 0;
    if (Math.random() < 0.4) out.hat = 0;
    return out;
  }

  function avatarSvg(a, cls = 'arena-av') {
    if (!a || typeof a !== 'object') a = {};
    const g = (k) => Math.max(0, Math.min(AVATAR_PARTS[k] - 1, Number(a[k]) || 0));
    const skin = SKINS[g('skin')];
    const hc = HAIR_COLORS[g('hairColor')];
    const shirt = SHIRTS[g('shirt')];
    const hair = g('hair');
    const parts = [];
    // body + neck
    parts.push(`<path d="M16 100 C16 78 32 70 50 70 C68 70 84 78 84 100 Z" fill="${shirt}"/>`);
    parts.push(`<rect x="43" y="58" width="14" height="16" rx="5" fill="${skin}"/>`);
    // hair that sits behind the head
    if (hair === 3) parts.push(`<path d="M23 45 C23 17 77 17 77 45 L79 76 L65 76 L65 50 L35 50 L35 76 L21 76 Z" fill="${hc}"/>`);
    if (hair === 7) parts.push(`<path d="M23 46 C23 17 77 17 77 46 L77 64 L63 64 L63 44 L37 44 L37 64 L23 64 Z" fill="${hc}"/>`);
    if (hair === 4) parts.push(`<circle cx="50" cy="16" r="9" fill="${hc}"/>`);
    // head + ears + cheeks
    parts.push(`<circle cx="27" cy="47" r="5" fill="${skin}"/><circle cx="73" cy="47" r="5" fill="${skin}"/>`);
    parts.push(`<circle cx="50" cy="45" r="24" fill="${skin}"/>`);
    parts.push('<circle cx="38" cy="53" r="3.2" fill="#ff8fa3" opacity=".45"/><circle cx="62" cy="53" r="3.2" fill="#ff8fa3" opacity=".45"/>');
    // eyes
    const eyes = g('eyes');
    if (eyes === 0) parts.push(`<circle cx="41" cy="45" r="3" fill="${INK}"/><circle cx="59" cy="45" r="3" fill="${INK}"/>`);
    if (eyes === 1) parts.push(`<path d="M37 46 Q41 41 45 46 M55 46 Q59 41 63 46" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    if (eyes === 2) parts.push(`<circle cx="41" cy="45" r="3" fill="${INK}"/><path d="M55 45 L63 45" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`);
    if (eyes === 3) parts.push(`<circle cx="41" cy="45" r="5" fill="#fff"/><circle cx="59" cy="45" r="5" fill="#fff"/><circle cx="42" cy="46" r="2.6" fill="${INK}"/><circle cx="60" cy="46" r="2.6" fill="${INK}"/>`);
    // mouth
    const mouth = g('mouth');
    if (mouth === 0) parts.push(`<path d="M43 55 Q50 61 57 55" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    if (mouth === 1) parts.push(`<path d="M41 54 Q50 65 59 54 Z" fill="${INK}"/><path d="M44 55 L56 55 L55 57 L45 57 Z" fill="#fff"/>`);
    if (mouth === 2) parts.push(`<ellipse cx="50" cy="57" rx="3.5" ry="4" fill="${INK}"/>`);
    if (mouth === 3) parts.push(`<path d="M43 55 Q50 61 57 55" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="52" cy="59.5" rx="3" ry="3.4" fill="#ff5d8f"/>`);
    // hair on top of the head
    const top = {
      1: `<path d="M26 42 C26 17 74 17 74 42 C66 31 40 29 26 42 Z" fill="${hc}"/>`,
      2: `<path d="M26 40 L29 21 L37 29 L43 14 L50 27 L57 13 L62 28 L71 20 L74 40 C62 30 38 30 26 40 Z" fill="${hc}"/>`,
      3: `<path d="M26 42 C26 17 74 17 74 42 C66 31 40 29 26 42 Z" fill="${hc}"/>`,
      4: `<path d="M26 40 C26 20 74 20 74 40 C64 30 36 30 26 40 Z" fill="${hc}"/>`,
      5: [30, 38, 46, 54, 62, 70].map((x, i) => `<circle cx="${x}" cy="${[33, 25, 22, 22, 25, 33][i]}" r="8" fill="${hc}"/>`).join(''),
      6: `<path d="M44 33 L46 8 L54 8 L56 33 Z" fill="${hc}"/>`,
      7: `<path d="M26 42 C26 17 74 17 74 42 C62 33 38 33 26 42 Z" fill="${hc}"/>`,
    }[hair];
    if (top) parts.push(top);
    // glasses
    const gl = g('glasses');
    if (gl === 1) parts.push(`<g stroke="${INK}" stroke-width="2" fill="rgba(255,255,255,.25)"><circle cx="41" cy="45" r="6.5"/><circle cx="59" cy="45" r="6.5"/><path d="M47.5 45 L52.5 45"/></g>`);
    if (gl === 2) parts.push(`<g stroke="${INK}" stroke-width="2" fill="rgba(255,255,255,.25)"><rect x="33" y="40" width="15" height="10" rx="2"/><rect x="52" y="40" width="15" height="10" rx="2"/><path d="M48 45 L52 45"/></g>`);
    if (gl === 3) parts.push(`<g fill="#16161d"><rect x="32" y="40" width="16" height="10" rx="4"/><rect x="52" y="40" width="16" height="10" rx="4"/><rect x="46" y="42" width="8" height="2.5"/></g><path d="M35 42 L40 42" stroke="#fff" stroke-width="1.5" opacity=".7"/>`);
    if (gl === 4) parts.push(`<g stroke="#f59f00" stroke-width="3" fill="rgba(116,192,252,.45)"><circle cx="41" cy="45" r="7"/><circle cx="59" cy="45" r="7"/></g><path d="M26 44 L34 44 M66 44 L74 44" stroke="#f59f00" stroke-width="3"/>`);
    // hats
    const hat = g('hat');
    if (hat === 1) parts.push('<path d="M25 36 C25 15 75 15 75 36 Z" fill="#e63946"/><path d="M48 33 L86 35 Q86 40 80 40 L48 38 Z" fill="#c1121f"/><circle cx="50" cy="16" r="3" fill="#c1121f"/>');
    if (hat === 2) parts.push('<path d="M25 37 C25 11 75 11 75 37 Z" fill="#3a86ff"/><rect x="23" y="32" width="54" height="8" rx="4" fill="#2667cc"/><circle cx="50" cy="12" r="5.5" fill="#fff"/>');
    if (hat === 3) parts.push('<path d="M30 32 L30 13 L40 23 L50 8 L60 23 L70 13 L70 32 Z" fill="#f4c20d" stroke="#d4a017" stroke-width="1.5"/><circle cx="50" cy="26" r="2.5" fill="#e63946"/>');
    if (hat === 4) parts.push('<path d="M27 34 L52 -2 L73 34 Z" fill="#5b3cc4"/><ellipse cx="50" cy="34" rx="30" ry="5" fill="#4527a0"/><path d="M52 14 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5 Z" fill="#ffd43b"/>');
    if (hat === 5) parts.push('<path d="M38 28 L50 0 L62 28 Z" fill="#ff5da2"/><path d="M42 19 L58 19 M45 11 L55 11" stroke="#ffd43b" stroke-width="3"/><circle cx="50" cy="1" r="3.5" fill="#ffd43b"/>');
    if (hat === 6) parts.push(`<path d="M24 47 C24 13 76 13 76 47" stroke="#333" stroke-width="5" fill="none"/><rect x="18" y="39" width="10" height="16" rx="4" fill="#e63946"/><rect x="72" y="39" width="10" height="16" rx="4" fill="#e63946"/>`);
    return `<svg class="${cls}" viewBox="0 -4 100 104" aria-hidden="true">${parts.join('')}</svg>`;
  }

  function loadSavedAvatar() {
    try {
      const a = JSON.parse(localStorage.getItem(AVATAR_KEY) || 'null');
      if (a && Object.keys(AVATAR_PARTS).every((k) => Number.isInteger(a[k]) && a[k] >= 0 && a[k] < AVATAR_PARTS[k])) return a;
    } catch { /* blocked storage */ }
    return null;
  }

  function saveAvatar(a) {
    try { localStorage.setItem(AVATAR_KEY, JSON.stringify(a)); } catch { /* blocked storage */ }
  }

  function wsUrl(pin) {
    const base = (normalizeBackendUrl(loadBackendUrl()) || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
    return `${base.replace(/^http/i, 'ws')}/api/arena/ws?pin=${encodeURIComponent(pin)}`;
  }

  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  // Reconnecting socket: auth is always the first frame; fatal close codes
  // (unauthorized / removed / game gone) stop the retry loop.
  function connect(pin, authMsg, onMsg, onFatal) {
    let ws = null;
    let stopped = false;
    let retry = 0;
    let pingTimer = null;
    const open = () => {
      ws = new WebSocket(wsUrl(pin));
      ws.onopen = () => {
        retry = 0;
        ws.send(JSON.stringify(authMsg));
        clearInterval(pingTimer);
        // Answered by the DO's auto-response without waking it.
        pingTimer = setInterval(() => { try { ws.send('ping'); } catch { /* */ } }, 30000);
      };
      ws.onmessage = (ev) => {
        if (ev.data === 'pong') return;
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        onMsg(msg);
      };
      ws.onclose = (ev) => {
        clearInterval(pingTimer);
        if (stopped) return;
        if ([4001, 4003, 4004].includes(ev.code)) { stopped = true; onFatal(ev.reason || 'Disconnected'); return; }
        if (ev.code === 4000) { stopped = true; onFatal(tr('Opened on another tab or device.')); return; }
        retry += 1;
        setTimeout(open, Math.min(5000, 500 * retry));
      };
    };
    open();
    return {
      send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); },
      close() { stopped = true; clearInterval(pingTimer); try { ws.close(1000); } catch { /* */ } },
    };
  }

  // ---------------------------------------------------------------- student
  const P = {
    active: false,
    sock: null,
    skew: 0,          // serverNow - Date.now()
    you: null,
    avatars: [],
    status: 'lobby',
    endsAt: null,
    seq: null,
    sending: false,
    holdUntil: 0,     // don't swap the question while a result flash is showing
    pendingQ: null,
    tick: null,
    root: null,
  };

  function playerNow() { return Date.now() + P.skew; }

  function ensurePlayerDom() {
    if (P.root) return;
    P.root = el(`<div id="arenaPlayer">
      <div id="arenaHud" class="arena-hud hidden">
        <span class="arena-hud-me"><span data-a="avatar"></span> <b data-a="name"></b></span>
        <span class="arena-hud-score">⭐ <b data-a="score">0</b></span>
        <span class="arena-hud-rank">#<b data-a="rank">–</b><small data-a="total"></small></span>
        <span class="arena-hud-fx" data-a="fx"></span>
        <span class="arena-hud-clock" data-a="clock">–:––</span>
      </div>
      <div id="arenaLobby" class="arena-overlay hidden">
        <div class="arena-panel">
          <h2>${esc(ARENA_DISPLAY_NAME)}</h2>
          <p class="arena-sub" data-a="lobbyName"></p>
          <p class="small">${esc(tr('Build your avatar'))}</p>
          <div class="arena-avatar-editor">
            <div class="arena-avatar-preview" data-a="avatarPreview"></div>
            <div class="arena-avatar-parts" data-a="avatarParts"></div>
          </div>
          <button type="button" class="btn small" data-a="avatarRandom">🎲 ${esc(tr('Surprise me'))}</button>
          <p class="arena-wait">${esc(tr('Waiting for the teacher to start…'))}</p>
          <div class="arena-lobby-players" data-a="lobbyPlayers"></div>
        </div>
      </div>
      <div id="arenaCards" class="arena-overlay hidden">
        <div class="arena-panel">
          <h2 data-a="cardsTitle">${esc(tr('Open a chest!'))}</h2>
          <div class="arena-card-row" data-a="cardRow"></div>
          <div class="arena-countdown"><i data-a="cardsBar"></i></div>
        </div>
      </div>
      <div id="arenaPower" class="arena-overlay hidden">
        <div class="arena-panel">
          <h2>⚡ ${esc(tr('POWER! Choose your move'))}</h2>
          <div class="arena-card-row" data-a="powerRow"></div>
          <div class="arena-countdown"><i data-a="powerBar"></i></div>
        </div>
      </div>
      <div id="arenaTarget" class="arena-overlay hidden">
        <div class="arena-panel">
          <h2 data-a="targetTitle"></h2>
          <div class="arena-target-list" data-a="targetList"></div>
          <div class="arena-countdown"><i data-a="targetBar"></i></div>
        </div>
      </div>
      <div id="arenaEnd" class="arena-overlay hidden">
        <div class="arena-panel" data-a="endPanel"></div>
      </div>
      <div class="arena-toasts" data-a="toasts"></div>
    </div>`);
    document.body.appendChild(P.root);
  }

  const $p = (key) => P.root.querySelector(`[data-a="${key}"]`);

  function show(id, on) {
    const node = document.getElementById(id);
    if (node) node.classList.toggle('hidden', !on);
  }

  function toast(html, kind = '') {
    const box = $p('toasts');
    const node = el(`<div class="arena-toast ${kind}">${html}</div>`);
    box.appendChild(node);
    setTimeout(() => node.classList.add('out'), 1900);
    setTimeout(() => node.remove(), 2400);
  }

  function renderHud() {
    const y = P.you;
    if (!y) return;
    $p('avatar').innerHTML = avatarSvg(y.avatar, 'arena-av arena-av-hud');
    $p('name').textContent = y.name || '';
    $p('score').textContent = Number(y.score || 0).toLocaleString();
    $p('rank').textContent = y.rank || '–';
    $p('total').textContent = y.total ? `/${y.total}` : '';
    const fx = [];
    if (y.fx?.double) fx.push('<span title="Double Up">✖️2</span>');
    if (y.fx?.boostLeftMs > 0) fx.push('<span title="Boost">⚡</span>');
    if (y.fx?.second) fx.push('<span title="Second Chance">🔁</span>');
    if (y.fx?.shieldLeftMs > 0) fx.push('<span title="Shield">🛡️</span>');
    $p('fx').innerHTML = fx.join('');
  }

  function renderLobby(board) {
    const y = P.you || {};
    $p('lobbyName').textContent = y.name ? tr('You are {name}', { name: y.name }) : '';
    renderAvatarEditor();
    if (board?.players) {
      $p('lobbyPlayers').innerHTML = board.players
        .map((p) => `<span class="arena-chip">${avatarSvg(p.avatar, 'arena-av arena-av-chip')} ${esc(p.name)}</span>`).join('');
    }
  }

  function renderAvatarEditor() {
    const a = P.avatar || P.you?.avatar || {};
    $p('avatarPreview').innerHTML = avatarSvg(a, 'arena-av arena-av-big');
    $p('avatarParts').innerHTML = Object.keys(AVATAR_PARTS).map((k) => `<div class="arena-part-row">
      <button type="button" class="arena-part-btn" data-part="${k}" data-dir="-1" aria-label="${esc(tr('Previous'))}">◀</button>
      <span>${esc(tr(AVATAR_LABELS[k]))}</span>
      <button type="button" class="arena-part-btn" data-part="${k}" data-dir="1" aria-label="${esc(tr('Next'))}">▶</button>
    </div>`).join('');
  }

  // Local preview updates instantly; the server gets one debounced update.
  function setAvatar(a) {
    P.avatar = a;
    saveAvatar(a);
    $p('avatarPreview').innerHTML = avatarSvg(a, 'arena-av arena-av-big');
    clearTimeout(P.avatarTimer);
    P.avatarTimer = setTimeout(() => P.sock.send({ t: 'avatar', avatar: a }), 250);
  }

  function startClock() {
    clearInterval(P.tick);
    P.tick = setInterval(() => {
      if (P.endsAt && P.status === 'playing') $p('clock').textContent = fmtClock(P.endsAt - playerNow());
    }, 250);
  }

  function prepareQuestionChrome() {
    const wrap = document.getElementById('joinQuestionWrap');
    if (wrap) wrap.classList.remove('hidden');
  }

  function showQuestion(msg) {
    if (Date.now() < P.holdUntil) {
      P.pendingQ = msg;
      setTimeout(() => { if (P.pendingQ === msg) { P.pendingQ = null; showQuestion(msg); } }, P.holdUntil - Date.now() + 20);
      return;
    }
    P.seq = msg.seq;
    P.sending = false;
    prepareQuestionChrome();
    live.player.currentQuestion = msg.question;
    live.player.pinSelection = null;
    live.player.pinSelections = [];
    renderJoinQuestion(msg.question);
    const btn = document.getElementById('joinSubmitBtn');
    if (btn) {
      delete btn.dataset.mode;
      btn.disabled = false;
      btn.classList.remove('hidden');
      btn.textContent = tr('Submit');
    }
    if (msg.retry) toast(`🔁 ${esc(tr('Second chance — try again!'))}`, 'info');
  }

  function submit() {
    if (!P.active || P.status !== 'playing' || P.sending || P.seq == null) return;
    const answer = readJoinAnswer();
    if (answer === null || answer === undefined || answer === '') {
      toast(esc(tr('Answer first!')), 'info');
      return;
    }
    P.sending = true;
    const btn = document.getElementById('joinSubmitBtn');
    if (btn) btn.disabled = true;
    P.sock.send({ t: 'answer', seq: P.seq, answer });
  }

  function countdownBar(bar, expiresAt) {
    const total = Math.max(1, expiresAt - playerNow());
    bar.style.transition = 'none';
    bar.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${total}ms linear`;
      bar.style.width = '0%';
    }));
  }

  function showChests(msg) {
    $p('cardsTitle').textContent = tr('Open a chest!');
    $p('cardRow').innerHTML = Array.from({ length: msg.n }, (_, i) => `<button type="button" class="arena-card arena-chest" data-chest="${i}" style="--i:${i}">
      <span class="arena-card-icon">🎁</span><b>?</b></button>`).join('');
    show('arenaCards', true);
    countdownBar($p('cardsBar'), msg.expiresAt);
  }

  // Flip all three: the picked one pops, the other two show what was missed.
  function revealChests(msg) {
    const label = (c) => (c.kind === 'power' ? ['⚡', tr('POWER')] : c.kind === 'jackpot' ? ['💎', `+${c.amount}`] : ['🪙', `+${c.amount}`]);
    $p('cardsTitle').textContent = msg.chests[msg.i].kind === 'power' ? tr('POWER!') : tr('Points!');
    const bar = $p('cardsBar');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    $p('cardRow').innerHTML = msg.chests.map((c, i) => {
      const [icon, text] = label(c);
      return `<div class="arena-card arena-chest revealed${i === msg.i ? ' picked' : ' missed'} kind-${c.kind}">
        <span class="arena-card-icon">${icon}</span><b>${esc(text)}</b></div>`;
    }).join('');
    show('arenaCards', true);
  }

  function showPower(msg) {
    $p('powerRow').innerHTML = msg.options.map((id, i) => {
      const c = CARDS[id] || { icon: '❔', name: id, hint: '' };
      return `<button type="button" class="arena-card arena-card-${esc(id)}" data-power="${i}" style="--i:${i}">
        <span class="arena-card-icon">${esc(c.icon)}</span>
        <b>${esc(tr(c.name))}</b><small>${esc(tr(c.hint))}</small></button>`;
    }).join('');
    show('arenaCards', false);
    show('arenaPower', true);
    countdownBar($p('powerBar'), msg.expiresAt);
  }

  function showTarget(msg) {
    show('arenaCards', false);
    show('arenaPower', false);
    const c = CARDS[msg.card] || {};
    $p('targetTitle').textContent = `${c.icon || ''} ${tr('Who do you want to rob?')}`;
    $p('targetList').innerHTML = msg.players.map((p) => `<button type="button" class="arena-target" data-target="${esc(p.id)}">
      ${avatarSvg(p.avatar, 'arena-av arena-av-row')}<b>${esc(p.name)}</b><small>${Number(p.score || 0).toLocaleString()}</small></button>`).join('');
    show('arenaTarget', true);
    countdownBar($p('targetBar'), msg.expiresAt);
  }

  function rewardText(msg) {
    const c = CARDS[msg.card] || { icon: '', name: msg.card };
    const who = esc(msg.target || '');
    if (msg.note === 'blocked') return `🛡️ ${esc(tr('{name} was shielded!', { name: msg.target }))}`;
    if (msg.note === 'miss') return `${c.icon} ${esc(tr('Missed!'))}`;
    switch (msg.card) {
      case 'lucky': case 'jackpot': return `${c.icon} +${msg.amount}!`;
      case 'steal': case 'pickpocket': return `${c.icon} +${msg.amount} ${esc(tr('from'))} ${who}`;
      case 'swap': return `🔀 ${esc(tr('Swapped with'))} ${who} (${msg.amount >= 0 ? '+' : ''}${msg.amount})`;
      default: return `${c.icon} ${esc(tr(c.name))}!`;
    }
  }

  function renderEnd(msg) {
    show('arenaCards', false);
    show('arenaPower', false);
    show('arenaTarget', false);
    const wrap = document.getElementById('joinQuestionWrap');
    if (wrap) wrap.classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    $p('endPanel').innerHTML = `<h2>${esc(tr("Time's up!"))}</h2>
      <div class="arena-podium">${(msg.podium || []).map((p, i) => `<div class="arena-podium-step s${i + 1}">
        ${avatarSvg(p.avatar, 'arena-av arena-podium-avatar')}<b>${esc(p.name)}</b>
        <span>${medals[i]} ${Number(p.score).toLocaleString()}</span></div>`).join('')}</div>
      <p class="arena-final">${esc(tr('You finished #{rank} of {total} with {score} points', { rank: msg.rank, total: msg.total, score: Number(msg.score || 0).toLocaleString() }))}</p>
      <p class="small">${esc(tr('{c} correct out of {a} answers', { c: msg.correct || 0, a: msg.answered || 0 }))}</p>`;
    show('arenaEnd', true);
  }

  function onPlayerMsg(msg) {
    if (msg.now) P.skew = msg.now - Date.now();
    switch (msg.t) {
      case 'hello':
        break;
      case 'you': {
        const prevStatus = P.status;
        P.you = msg;
        P.status = msg.status;
        P.endsAt = msg.endsAt;
        renderHud();
        if (msg.status === 'lobby') {
          // First lobby visit: reuse the avatar this device built last time,
          // or start from a random one.
          if (!P.avatar) setAvatar(loadSavedAvatar() || randomAvatar());
          show('arenaLobby', true);
          renderLobby(null);
        } else if (msg.status === 'playing') {
          show('arenaLobby', false);
          show('arenaHud', true);
          if (prevStatus !== 'playing') startClock();
        }
        break;
      }
      case 'board':
        if (P.status === 'lobby') renderLobby(msg);
        break;
      case 'q':
        show('arenaLobby', false);
        show('arenaHud', true);
        showQuestion(msg);
        break;
      case 'result':
        if (msg.retry) break;
        if (msg.correct) {
          P.holdUntil = Date.now() + 550;
          toast(`✅ +${msg.points}`, 'good');
        } else {
          // Wrong: leave the right answer up long enough to actually read it.
          P.holdUntil = Date.now() + (msg.answer ? 2200 : 900);
          toast(`❌ ${msg.points ? `+${msg.points}` : ''}${msg.answer ? `<br><small>${esc(tr('Answer'))}: ${esc(msg.answer)}</small>` : ''}`, 'bad');
        }
        break;
      case 'chests':
        setTimeout(() => showChests(msg), Math.max(0, P.holdUntil - Date.now()));
        break;
      case 'reveal':
        revealChests(msg);
        P.holdUntil = Date.now() + 1100;
        break;
      case 'power':
        // Let the flipped chests register before the choice appears.
        setTimeout(() => showPower(msg), Math.max(0, P.holdUntil - Date.now()));
        break;
      case 'autopick': {
        if (msg.stage === 'power') {
          const c = CARDS[msg.card] || {};
          toast(`⏱️ ${esc(tr('Auto-picked'))}: ${c.icon || ''} ${esc(tr(c.name || msg.card))}`, 'info');
          show('arenaPower', false);
        } else {
          toast(`⏱️ ${esc(tr('Auto-picked a chest'))}`, 'info');
        }
        break;
      }
      case 'target':
        showTarget(msg);
        break;
      case 'reward': {
        // Points: keep the flipped chests up for a beat before closing.
        const delay = Math.max(0, P.holdUntil - Date.now());
        setTimeout(() => { show('arenaCards', false); show('arenaPower', false); show('arenaTarget', false); }, delay);
        P.holdUntil = Date.now() + delay + 500;
        toast(rewardText(msg), msg.note ? 'bad' : 'reward');
        break;
      }
      case 'fx':
        if (msg.kind === 'robbed') toast(`${(CARDS[msg.card] || {}).icon || '🦝'} ${esc(tr('{name} took {n} from you!', { name: msg.by, n: msg.amount }))}`, 'bad');
        else if (msg.kind === 'blocked') toast(`🛡️ ${esc(tr('Your shield blocked {name}!', { name: msg.by }))}`, 'good');
        else if (msg.kind === 'swapped') toast(`🔀 ${esc(tr('{name} swapped scores with you!', { name: msg.by }))}`, 'bad');
        break;
      case 'end':
        P.status = 'finished';
        clearInterval(P.tick);
        $p('clock').textContent = '0:00';
        P.you = msg;
        renderHud();
        renderEnd(msg);
        break;
      default:
        break;
    }
  }

  function startPlayer({ pin, playerId, playerToken }) {
    ensurePlayerDom();
    P.active = true;
    document.body.classList.add('arena-mode');
    if (typeof stopPlayerPolling === 'function') stopPlayerPolling();
    P.root.addEventListener('click', (e) => {
      const part = e.target.closest('[data-part]');
      if (part) {
        const k = part.dataset.part;
        const n = AVATAR_PARTS[k];
        const cur = { ...(P.avatar || randomAvatar()) };
        cur[k] = (cur[k] + Number(part.dataset.dir) + n) % n;
        setAvatar(cur);
        return;
      }
      if (e.target.closest('[data-a="avatarRandom"]')) { setAvatar(randomAvatar()); return; }
      const chest = e.target.closest('[data-chest]');
      if (chest) {
        P.root.querySelectorAll('[data-chest]').forEach((b) => { b.disabled = true; });
        chest.classList.add('picked');
        P.sock.send({ t: 'chest', i: Number(chest.dataset.chest) });
        return;
      }
      const power = e.target.closest('[data-power]');
      if (power) {
        P.root.querySelectorAll('[data-power]').forEach((b) => { b.disabled = true; });
        power.classList.add('picked');
        P.sock.send({ t: 'power', i: Number(power.dataset.power) });
        return;
      }
      const tgt = e.target.closest('[data-target]');
      if (tgt) {
        P.root.querySelectorAll('[data-target]').forEach((b) => { b.disabled = true; });
        P.sock.send({ t: 'target', playerId: tgt.dataset.target });
      }
    });
    P.sock = connect(pin, { t: 'auth', role: 'player', playerId, playerToken }, onPlayerMsg, (reason) => {
      P.active = false;
      toast(esc(reason), 'bad');
    });
  }

  // ---------------------------------------------------------------- teacher board
  const H = { sock: null, root: null, board: null, skew: 0, tick: null, pin: '', durations: [], lastRanks: new Map() };
  const $h = (key) => H.root.querySelector(`[data-h="${key}"]`);

  function feedText(f) {
    const a = esc(f.a), b = esc(f.b);
    switch (f.kind) {
      case 'steal': return `🦝 <b>${a}</b> ${esc(tr('stole'))} ${f.amount} ${esc(tr('from'))} <b>${b}</b>`;
      case 'pickpocket': return `🧤 <b>${a}</b> ${esc(tr('pickpocketed'))} ${f.amount} ${esc(tr('from'))} <b>${b}</b>`;
      case 'swap': return `🔀 <b>${a}</b> ${esc(tr('swapped with'))} <b>${b}</b>`;
      case 'blocked': return `🛡️ <b>${b}</b> ${esc(tr('blocked'))} <b>${a}</b>`;
      case 'jackpot': return `💎 <b>${a}</b> ${esc(tr('hit the JACKPOT'))} +${f.amount}`;
      case 'lucky': return `🍀 <b>${a}</b> ${esc(tr('got lucky'))} +${f.amount}`;
      default: return '';
    }
  }

  function ensureHostDom() {
    if (H.root) return;
    H.root = el(`<div id="arenaBoard" class="arena-board">
      <header class="arena-board-top">
        <span class="arena-board-title">${esc(ARENA_DISPLAY_NAME)}</span>
        <span class="arena-board-pin">PIN <b data-h="pin"></b></span>
        <span class="arena-board-clock" data-h="clock">–:––</span>
        <span class="arena-board-actions">
          <span data-h="durations" class="arena-durations"></span>
          <button type="button" class="btn success" data-h="start">${esc(tr('Start'))}</button>
          <button type="button" class="btn danger hidden" data-h="end">${esc(tr('End now'))}</button>
          <button type="button" class="btn" data-h="close">${esc(tr('Close'))}</button>
        </span>
      </header>
      <p class="arena-board-error bad" data-h="error"></p>
      <div class="arena-board-body">
        <ol class="arena-rank" data-h="rank"></ol>
        <aside class="arena-feed" data-h="feed"></aside>
      </div>
      <div class="arena-board-podium hidden" data-h="podium"></div>
    </div>`);
    document.body.appendChild(H.root);
    H.root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-dur]');
      if (d) { H.sock.send({ t: 'duration', sec: Number(d.dataset.dur) }); return; }
      if (e.target.closest('[data-h="start"]')) H.sock.send({ t: 'start' });
      else if (e.target.closest('[data-h="end"]')) { if (confirm(tr('End the round now?'))) H.sock.send({ t: 'end' }); }
      else if (e.target.closest('[data-h="close"]')) closeHost();
    });
  }

  function renderRanking(players, status) {
    const list = $h('rank');
    // FLIP: remember old row positions so rank changes slide instead of jump.
    const before = new Map([...list.children].map((li) => [li.dataset.id, li.getBoundingClientRect().top]));
    const rows = new Map([...list.children].map((li) => [li.dataset.id, li]));
    list.classList.toggle('lobby', status === 'lobby');
    const frag = document.createDocumentFragment();
    players.forEach((p, i) => {
      let li = rows.get(p.id);
      if (!li) { li = document.createElement('li'); li.dataset.id = p.id; }
      const prevScore = Number(li.dataset.score || 0);
      li.innerHTML = status === 'lobby'
        ? `${avatarSvg(p.avatar, 'arena-av arena-row-avatar')}<b>${esc(p.name)}</b>`
        : `<span class="arena-row-pos">${i + 1}</span>${avatarSvg(p.avatar, 'arena-av arena-row-avatar')}
           <b class="arena-row-name">${esc(p.name)}</b>${p.shield ? '<span class="arena-row-shield">🛡️</span>' : ''}
           <span class="arena-row-score">${Number(p.score).toLocaleString()}</span>`;
      if (status !== 'lobby' && Number(p.score) !== prevScore) {
        li.classList.remove('bump-up', 'bump-down');
        void li.offsetWidth;
        li.classList.add(Number(p.score) > prevScore ? 'bump-up' : 'bump-down');
      }
      li.dataset.score = p.score;
      frag.appendChild(li);
    });
    list.replaceChildren(frag);
    [...list.children].forEach((li) => {
      const top = before.get(li.dataset.id);
      if (top == null) return;
      const dy = top - li.getBoundingClientRect().top;
      if (!dy) return;
      li.style.transition = 'none';
      li.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => { li.style.transition = 'transform 450ms ease'; li.style.transform = ''; });
    });
  }

  function renderPodium(podium) {
    const box = $h('podium');
    const medals = ['🥇', '🥈', '🥉'];
    box.innerHTML = `<h2>${esc(tr('Final podium'))}</h2><div class="arena-podium">${(podium || []).map((p, i) => `<div class="arena-podium-step s${i + 1}">
      ${avatarSvg(p.avatar, 'arena-av arena-podium-avatar')}<b>${esc(p.name)}</b>
      <span>${medals[i]} ${Number(p.score).toLocaleString()}</span></div>`).join('')}</div>`;
    box.classList.remove('hidden');
  }

  function onHostMsg(msg) {
    if (msg.now) H.skew = msg.now - Date.now();
    if (msg.t === 'hello') { H.durations = msg.durations || []; return; }
    if (msg.t === 'error') { $h('error').textContent = msg.error; return; }
    if (msg.t !== 'board') return;
    H.board = msg;
    $h('error').textContent = '';
    const lobby = msg.status === 'lobby';
    $h('start').classList.toggle('hidden', !lobby);
    $h('end').classList.toggle('hidden', msg.status !== 'playing');
    $h('durations').innerHTML = lobby
      ? H.durations.map((s) => `<button type="button" class="btn small${s === msg.durationSec ? ' primary' : ''}" data-dur="${s}">${s / 60} min</button>`).join('')
      : '';
    if (lobby) $h('clock').textContent = fmtClock(msg.durationSec * 1000);
    H.root.classList.toggle('is-lobby', lobby);
    renderRanking(msg.players, msg.status);
    $h('feed').innerHTML = (msg.feed || []).slice().reverse().map((f) => `<div class="arena-feed-item">${feedText(f)}</div>`).join('');
    if (msg.status === 'finished') {
      $h('clock').textContent = '0:00';
      renderPodium(msg.podium || msg.players.slice(0, 3));
    }
  }

  function openHost({ pin, token }) {
    ensureHostDom();
    H.pin = pin;
    $h('pin').textContent = pin;
    $h('podium').classList.add('hidden');
    H.root.classList.remove('hidden');
    document.body.classList.add('arena-board-open');
    if (H.sock) H.sock.close();
    H.sock = connect(pin, { t: 'auth', role: 'host', token }, onHostMsg, (reason) => { $h('error').textContent = reason; });
    clearInterval(H.tick);
    H.tick = setInterval(() => {
      const b = H.board;
      if (b?.status === 'playing' && b.endsAt) $h('clock').textContent = fmtClock(b.endsAt - (Date.now() + H.skew));
    }, 250);
  }

  function closeHost() {
    if (H.sock) H.sock.close();
    H.sock = null;
    clearInterval(H.tick);
    if (H.root) H.root.classList.add('hidden');
    document.body.classList.remove('arena-board-open');
  }

  window.PinArena = {
    displayName: ARENA_DISPLAY_NAME,
    get active() { return P.active; },
    startPlayer,
    submit,
    openHost,
    closeHost,
  };
})();
