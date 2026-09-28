/*
 * PinPlay games page (/games/): the assignments the teacher made Public, as
 * game cards. A card opens the student page with ?game=CODE, which offers
 * "Continue with Google" or "Play anonymously". See PUBLIC_GAMES_PLAN.md.
 */
(() => {
  const BACKEND_KEY = 'pinplay.backend.v1';
  const DEFAULT_BACKEND_URL = 'https://api.pinplay.win';
  // Shared with the student page's end-of-game Like button.
  const LIKES_KEY = 'pinplay.gameLikes.v1';
  const SORT_KEY = 'pinplay.gamesSort.v1';

  const t = (s, p) => (typeof window.t === 'function' ? window.t(s, p) : String(s).replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? p[k] : m)));
  const grid = document.getElementById('gamesGrid');
  const statusEl = document.getElementById('gamesStatus');
  const sortButtons = [...document.querySelectorAll('.games-sort-btn')];

  let games = [];
  let sort = 'popular';
  try { sort = localStorage.getItem(SORT_KEY) || 'popular'; } catch { /* storage off */ }
  if (!sortButtons.some((b) => b.dataset.sort === sort)) sort = 'popular';

  function backendUrl() {
    let raw = '';
    try { raw = localStorage.getItem(BACKEND_KEY) || ''; } catch { /* storage off */ }
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
    } catch { /* not set */ }
    return DEFAULT_BACKEND_URL;
  }

  function readLikes() {
    try { return JSON.parse(localStorage.getItem(LIKES_KEY) || '{}') || {}; } catch { return {}; }
  }

  function writeLikes(likes) {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(likes)); } catch { /* storage off */ }
  }

  const SORTS = {
    popular: (a, b) => b.plays - a.plays || b.likes - a.likes || (b.publishedAt || 0) - (a.publishedAt || 0),
    newest: (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0),
    liked: (a, b) => b.likes - a.likes || b.plays - a.plays || (b.publishedAt || 0) - (a.publishedAt || 0),
  };

  // A steady colour per game for cards without a picture.
  function tileHue(text) {
    let h = 0;
    for (const ch of String(text || '')) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
  }

  function cardFor(game, liked) {
    const li = document.createElement('li');
    li.className = 'game-item';

    const link = document.createElement('a');
    link.className = 'game-card';
    link.href = `../?game=${encodeURIComponent(game.code)}`;

    const cover = document.createElement('div');
    cover.className = 'game-cover';
    if (game.cover) {
      const img = document.createElement('img');
      img.src = game.cover.replace('https://pinplay-api.eugenime.workers.dev', 'https://api.pinplay.win');
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => { img.remove(); cover.classList.add('game-cover--tile'); });
      cover.append(img);
    } else {
      cover.classList.add('game-cover--tile');
    }
    cover.style.setProperty('--tile-hue', String(tileHue(game.title)));
    const initial = document.createElement('span');
    initial.className = 'game-cover-initial';
    initial.setAttribute('aria-hidden', 'true');
    initial.textContent = [...String(game.title || '?').trim()][0] || '?';
    cover.append(initial);

    const body = document.createElement('div');
    body.className = 'game-body';
    const title = document.createElement('h3');
    title.className = 'game-title';
    title.textContent = game.title || t('Game');
    const meta = document.createElement('div');
    meta.className = 'game-meta';
    if (game.adaptive) {
      const pill = document.createElement('span');
      pill.className = 'game-pill game-pill--adaptive';
      const range = game.levels ? (game.levels.from === game.levels.to ? game.levels.from : `${game.levels.from}–${game.levels.to}`) : '';
      pill.textContent = range ? t('🎯 Adaptive · {levels}', { levels: range }) : t('🎯 Adaptive');
      meta.append(pill);
    }
    const count = document.createElement('span');
    count.className = 'game-pill';
    count.textContent = t('{n} questions', { n: game.questionCount });
    meta.append(count);
    const plays = document.createElement('span');
    plays.className = 'game-plays';
    plays.textContent = game.plays === 1 ? t('▶ 1 play') : t('▶ {n} plays', { n: game.plays });
    body.append(title, meta, plays);
    link.append(cover, body);

    const like = document.createElement('button');
    like.type = 'button';
    like.className = 'game-like';
    like.setAttribute('aria-pressed', liked ? 'true' : 'false');
    like.setAttribute('aria-label', t('Like {title}', { title: game.title }));
    like.textContent = `${liked ? '❤️' : '🤍'} ${game.likes}`;
    like.addEventListener('click', () => toggleLike(game, like));

    li.append(link, like);
    return li;
  }

  async function toggleLike(game, button) {
    const likes = readLikes();
    const next = !likes[game.code];
    if (next) likes[game.code] = true; else delete likes[game.code];
    writeLikes(likes);
    game.likes = Math.max(0, game.likes + (next ? 1 : -1));
    button.setAttribute('aria-pressed', next ? 'true' : 'false');
    button.textContent = `${next ? '❤️' : '🤍'} ${game.likes}`;
    try {
      await fetch(`${backendUrl()}/api/public/game/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: game.code, like: next }),
      });
    } catch { /* best effort: the count catches up on the next visit */ }
  }

  function render() {
    sortButtons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.sort === sort ? 'true' : 'false'));
    const likes = readLikes();
    grid.replaceChildren(...games.slice().sort(SORTS[sort]).map((g) => cardFor(g, !!likes[g.code])));
  }

  async function load() {
    statusEl.textContent = t('Loading…');
    try {
      const res = await fetch(`${backendUrl()}/api/public/games`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `${res.status}`);
      games = (Array.isArray(data?.games) ? data.games : []).map((g) => ({
        ...g,
        plays: Math.max(0, Number(g.plays) || 0),
        likes: Math.max(0, Number(g.likes) || 0),
      }));
      statusEl.textContent = games.length ? '' : t('No games yet. Check back soon!');
      render();
    } catch {
      statusEl.textContent = t('Could not load the games. Check your connection and reload.');
    }
  }

  sortButtons.forEach((b) => b.addEventListener('click', () => {
    sort = b.dataset.sort;
    try { localStorage.setItem(SORT_KEY, sort); } catch { /* storage off */ }
    render();
  }));
  // The language switch re-translates static text; re-render the cards too.
  window.onLocaleChange = () => { if (games.length) render(); };

  load();
})();
