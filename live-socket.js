/*
 * Classic live games: state pushed over a WebSocket instead of polled.
 * See LIVE_SOCKETS_PLAN.md. Used by the student page (play.js) and the host
 * page (app.js).
 *
 * Polling stays the bootstrap and the fallback: a page keeps its poll loop,
 * pauses it while this connection is healthy (onUp) and resumes it whenever it
 * isn't (onDown), so a dropped or silently dead connection never leaves a
 * screen stuck for longer than the watchdog takes to notice.
 */
(function () {
  // A connection can die without closing (phone roaming between access points,
  // laptop sleep, a proxy dropping a quiet connection); only a missing pong
  // shows it. The room answers 'ping' without waking up.
  const PING_EVERY_MS = 10000;
  const PONG_WITHIN_MS = 5000;
  const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
  // After this many failures in a row, rest (polling carries on) and retry
  // every minute, or at once when the page is visible again or back online.
  const FAILS_BEFORE_REST = 6;
  const REST_RETRY_MS = 60000;

  function wsUrl(base, pin) {
    const u = new URL(base);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/api/live/ws';
    u.search = `?pin=${encodeURIComponent(pin)}`;
    return u.toString();
  }

  // auth: the first message ({ t: 'auth', role: 'host', token } or
  // { t: 'auth', role: 'player', playerId, playerToken }).
  // onState(msg): { t: 'state', state, attempts? }.
  // onFatal(code): unauthorized (4001) or game over (4004); no more retries.
  function connect({ base, pin, auth, onState, onUp, onDown, onFatal }) {
    if (typeof WebSocket !== 'function' || !base || !pin) return null;
    let ws = null;
    let stopped = false;
    let up = false;
    let fails = 0;
    let pingTimer = null;
    let pongTimer = null;
    let retryTimer = null;

    const clearTimers = () => {
      clearInterval(pingTimer);
      clearTimeout(pongTimer);
      pingTimer = null;
      pongTimer = null;
    };

    const scheduleRetry = () => {
      clearTimeout(retryTimer);
      const delay = fails >= FAILS_BEFORE_REST ? REST_RETRY_MS : BACKOFF_MS[Math.min(fails, BACKOFF_MS.length) - 1];
      retryTimer = setTimeout(open, delay);
    };

    function open() {
      if (stopped || ws) return;
      clearTimeout(retryTimer);
      let sock;
      try {
        sock = new WebSocket(wsUrl(base, pin));
      } catch {
        fails += 1;
        scheduleRetry();
        return;
      }
      ws = sock;

      // Gone, whether it closed or went silent: back to polling, then retry.
      const lost = (code) => {
        if (sock !== ws) return;
        ws = null;
        clearTimers();
        up = false;
        try { sock.onclose = null; sock.onmessage = null; sock.close(); } catch { /* already closed */ }
        if (typeof onDown === 'function') onDown();
        if (stopped) return;
        if (code === 4001 || code === 4004) {
          stopped = true;
          if (typeof onFatal === 'function') onFatal(code);
          return;
        }
        fails += 1;
        scheduleRetry();
      };

      sock.onopen = () => {
        try { sock.send(JSON.stringify(auth)); } catch { lost(0); return; }
        pingTimer = setInterval(() => {
          if (sock.readyState !== 1) return;
          try { sock.send('ping'); } catch { lost(0); return; }
          clearTimeout(pongTimer);
          pongTimer = setTimeout(() => lost(0), PONG_WITHIN_MS);
        }, PING_EVERY_MS);
      };
      sock.onmessage = (ev) => {
        clearTimeout(pongTimer); // anything arriving proves the connection is alive
        if (ev.data === 'pong') return;
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (!msg || msg.t !== 'state') return;
        if (!up) {
          up = true;
          fails = 0;
          if (typeof onUp === 'function') onUp();
        }
        if (typeof onState === 'function') onState(msg);
      };
      sock.onclose = (ev) => lost(ev.code);
      sock.onerror = () => { /* onclose follows */ };
      sock.pinplayLost = lost;
    }

    // Back from a locked screen, another app, or no network: check at once.
    const wake = () => {
      if (stopped || document.visibilityState === 'hidden') return;
      if (!ws) {
        fails = Math.min(fails, 1);
        open();
      } else if (ws.readyState === 1) {
        try { ws.send('ping'); } catch { /* the watchdog handles it */ }
        clearTimeout(pongTimer);
        // A dead connection can take long to report its close; don't wait for it.
        const sock = ws;
        pongTimer = setTimeout(() => { if (sock === ws) sock.pinplayLost(0); }, PONG_WITHIN_MS);
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);

    open();

    return {
      get up() { return up; },
      close() {
        stopped = true;
        clearTimers();
        clearTimeout(retryTimer);
        document.removeEventListener('visibilitychange', wake);
        window.removeEventListener('online', wake);
        const sock = ws;
        ws = null;
        up = false;
        if (sock) {
          try { sock.onclose = null; sock.onmessage = null; sock.close(1000); } catch { /* */ }
        }
      },
    };
  }

  window.PinPlayLiveSocket = { connect };
})();
