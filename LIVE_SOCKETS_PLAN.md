# Classic live games over a live connection (instead of polling)

Classic live games (PIN) poll: every student page asks `/api/player/state` every
2 s, the host page asks `/api/host/state` every 1 s, and `/api/host/attempts`
every 6 s. Each ask is a Worker request and a Durable Object request, so a class
of 30 costs about 1,000 of each per minute (~20,000 for a 20-minute game, about
a fifth of the free daily 100,000). PinPlay Cup already uses a live connection
(a hibernating WebSocket on the room's Durable Object) and costs a few hundred
requests per round. This moves classic live games onto the same kind of
connection. Planned and built 2026-09-29 (see "Built" at the end).

## When to build it

- Only if classic games are in regular use (3–4 or more a day on the free plan),
  or the fairness gain below matters. On 2026-09-29, a Cup-only teaching day
  used 1,365 of the 100,000 daily Worker requests; with mostly Cup and an
  occasional classic game there is no quota reason to build it.
- Effort: several hours of work and testing (worker, student page, host page,
  end-to-end tests), then a trial with one class.
- Alternative with no code: Workers Paid, $5/month (see "Considered and
  rejected").
- Independent of all this, step 0 (answers name their question) is worth doing
  now: it closes a small gap that exists today.

## What stays the same

- The server decides everything: which question is on, when it closes, what is
  revealed, scores. Screens only show what it sends, so all screens still
  advance together, and more tightly than now (a push reaches every screen at
  once instead of within the next 2 s poll).
- The messages carry exactly what the polls return today (`hostState(room)` for
  the host, `playerState(room, playerId)` for each student), so the page
  renderers (`renderHostState`, `renderPlayerState`) are unchanged.
- Answers, host actions (start, next, previous, reveal, settings, kick, grade…),
  joining, voice/photo uploads: unchanged HTTP requests. Only the state polling
  is replaced.
- PinPlay Cup: untouched.

## What gets better

- **Quota:** about 20–25 times cheaper (see Cost).
- **Tighter sync:** every screen gets a change at the same moment.
- **Fairer:** with polling, each phone sees a new question 0–2 s after Next
  (~1 s on average). The countdown ends at the server deadline
  (`questionDeadlineAt`), so that delay comes off the student's answering time,
  and since the first two correct answers score 100% (then 90%, 80%), the phones
  that happened to poll first get a head start. A push removes both.
- **Possible bonus:** a real "connected" indicator per student on the host
  screen.

## What we give up, and the safeguards it needs

- **Self-repair.** Polling fixes any glitch within 2 s. A connection can die
  silently (phone roaming between access points, laptop sleep, a proxy dropping
  a quiet connection) and the page only notices by its heartbeat. The Cup pings
  every 30 s and only reacts to a clean close. Classic games need a watchdog: a
  ping every 10 s while a game is on, and a reconnect when no pong comes back
  within 5 s. Also reconnect on the page's `online` and `visibilitychange`
  events. Worst case, a rare frozen screen lasts ~15 s instead of ≤2 s; over a
  school year with classes of 30, that will happen now and then. (A slow safety
  poll every 15 s would add redundancy for ~2,400 requests a game; not by
  default.)
- **Answers must name their question.** `/api/answer` sends no question index;
  the server applies an answer to whatever question is current. So a stale
  screen (today: the 0–2 s after Next, if the question was still open) can put a
  tap meant for the old question onto the new one. With a connection, a frozen
  screen would widen that window. Fix (step 0): send the question index and
  `questionStartedAt` with every answer; the server rejects a mismatch ("That
  question has ended") and the page refreshes.
- **Jobs that ride on polls today must move.** Closing timed-out questions (to
  the alarm); retrying the save of a login-required game into an assignment at
  the end (`maybeSnapshotLiveGame` runs on every host poll in the results phase;
  it moves to the alarm and to the host connecting); the host's attempts summary
  (pushed). Forgetting one would be a subtle bug.
- **Out-of-order messages.** A push and an HTTP answer response travel on
  different channels, so an older push can arrive after a newer answer
  response. Every state and every state-changing HTTP response carries a
  revision number; pages ignore anything older than what they've shown.
- **More moving parts.** Two ways of getting state (connection and fallback),
  reconnect logic, a timer instead of "the next poll". More to test, and new
  bugs would first show in class. Mitigated by the off switch, the per-page
  fallback, and a first try with one class. Local tests can simulate a host and
  several players, not 30 phones on school Wi-Fi.

Not lost (checked in the code): screens advancing together (tighter); deadline
enforcement (the answer route closes a timed-out question itself before
accepting, so the alarm only decides when "time's up" appears on screens);
answers, host actions and uploads (unchanged HTTP); nothing depends on polling
for "who's online"; the school network (the Cup's connection already works
there); the Cup.

## Design

### Server (QuizRoom Durable Object)

1. **Socket.** `GET /api/live/ws?pin=` upgrades to a WebSocket on the room, as
   `/api/arena/ws` does, using the hibernation API (`acceptWebSocket`), so an
   idle connection bills no running time. The first message authenticates:
   `{ t: 'auth', role: 'host', token }` or
   `{ t: 'auth', role: 'player', playerId, playerToken }`, which is checked like
   today's state routes. The socket's attachment records
   `{ kind: 'live', role, pid }`. The server answers with the current state at
   once.
2. **Push after every change.** Every room change already goes through
   `#setRoom`. After a write in a classic live room, schedule one coalesced
   broadcast (~150 ms, so a burst of answers is one push). Each socket gets its
   own state (`hostState` for host sockets, `playerState` for each player's). A
   socket is sent a message only if its state differs from what it was last sent
   (a small hash per socket in memory; after hibernation the first push simply
   goes to everyone), so an answer from one student doesn't resend unchanged
   states to the other 29. Outgoing messages are not billed.
3. **Revision number.** The room keeps a `rev` that goes up on every write. It is
   in every pushed state and in the HTTP responses that change what a page shows
   (answer, host actions).
4. **Closing questions on time.** Today a timed-out question is closed lazily by
   the next poll (`closeQuestionIfTimedOut`). With no polls, the room sets its
   alarm for the current question's deadline. `alarm()` already handles the
   24-hour cleanup; it will do both: close a timed-out question (then push), and
   re-arm for whichever comes first, the next deadline or the cleanup. Late
   answers stay rejected by the answer route itself, so an alarm firing a moment
   late only delays the "time's up" screen.
5. **End-of-game save retry.** `maybeSnapshotLiveGame` (login-required games
   saved into an assignment) moves from host polls to the alarm (re-armed while
   the game isn't saved yet) and to a host connecting in the results phase.
6. **Host extras.** The attempts snapshot (`buildAttemptSnapshots`, polled every
   6 s today) is pushed to host sockets with the state, only when it changed.
7. **Answers name their question** (step 0). `/api/answer` takes `qIndex` and
   `questionStartedAt`; a mismatch with the current question returns 409
   `QUESTION_ENDED`.
8. **Keep-alive.** The room already answers `ping` with `pong` without waking
   (`setWebSocketAutoResponse`). Pages ping every 10 s during a game (see the
   watchdog below).
9. **Routing.** `webSocketMessage` and `webSocketClose` pick Cup or live logic
   from the socket's attachment (`kind`), so the two never mix.

### Pages

- **Student page (play.js)** and **host page (app.js)**: open the connection
  when a game is joined or hosted; each state message goes to the existing
  renderer. The current poll functions stay as the fallback.
- **Watchdog.** Ping every 10 s during a game; no pong within 5 s → close and
  reconnect.
- **Reconnect.** On a drop: reconnect with back-off (1 s, 2 s, 4 s … up to
  15 s), and at once on `visibilitychange` (page visible again) and `online`.
  The server sends the current state on reconnect, so a student lands on the
  right question with the right time left (timers already count from the
  server's `questionStartedAt`).
- **Revision check.** Ignore any state older than the last one shown.
- **Answers.** Send `qIndex` and `questionStartedAt`; on `QUESTION_ENDED`, show
  "That question has ended" and refresh the state.
- **Fallback to polling.** If the connection can't be made or keeps failing
  (network blocking WebSockets, old browser), that page goes back to today's
  polling, alone. Everyone else stays on the connection.
- **Voice answers.** The poll is skipped while a voice answer records (a poll
  janked speech recognition). The same guard applies to pushes: a state that
  arrives mid-recording is kept and rendered when recording stops.
- **Live preview** (the teacher's student tab) is a normal player and gets the
  connection too.

### Safety switch

A room setting `liveTransport: 'socket' | 'poll'`, default `socket` once
released. Pages read it on join. Setting it to `poll` (one line in the worker)
puts every new game back on polling without redeploying the pages.

## Cost, 30 students, 20 questions, 20 minutes

| | Polling (today) | Live connection |
|---|---|---|
| State (students 2 s, host 1 s) | ~19,200 | 0 |
| Host attempts (6 s) | ~200 | 0 (pushed) |
| Connections + auth | 0 | ~33 |
| Keep-alive pings every 10 s (Durable Object only) | 0 | ≤ 190 |
| Answers (HTTP) | ~600 | ~600 |
| Joining, host actions | ~110 | ~110 |
| **Total requests** | **~20,000** | **~750–950** |

Question time-outs add no requests: Cloudflare bills setting an alarm as one
storage write (≤ 20 a game). Pings are ~3,700 incoming messages (31 screens)
billed at 20 to 1; if the auto-answered ones turn out not to be billed, the
total is ~750.

About 20–25 times cheaper: roughly 100 classic games a day on the free plan
instead of ~5, alongside everything else. Running time drops too: between
events the room hibernates.

A later option, if ever needed: send answers over the connection as well
(incoming messages are billed 20 to 1), which would bring a game to ~180–370
requests (joining and host actions stay HTTP). Not in this plan: answers stay
on HTTP, where uploads and retries already work.

## Steps

0. **Answers name their question** (independent, small; worth doing now).
   `qIndex` + `questionStartedAt` in `/api/answer`, `QUESTION_ENDED` on a
   mismatch, the student page refreshing on it. Test: an answer sent for the
   previous question after Next is rejected, not recorded on the new one.
1. **Worker.** Live socket route and auth; coalesced per-socket push after
   `#setRoom` (with the changed-state check); revision numbers; deadline alarm
   merged with the cleanup alarm; the end-of-game save retry moved to the alarm
   and host connect; attempts pushed to hosts; `kind` routing in the socket
   handlers; the `liveTransport` setting. Tests: unit tests for the alarm
   scheduling (next deadline vs cleanup) and the changed-state check; an
   end-to-end script against `wrangler dev` with a host and several players
   over sockets (join, start, answers, time-out closing a question with nobody
   polling, reveal, next, a dropped connection mid-question, results, the
   login-game save) that also counts the requests made.
2. **Student page.** Connection, watchdog, reconnect (back-off, visibility,
   online), revision check, fallback, voice guard.
3. **Host page.** Connection for state and attempts, watchdog, reconnect,
   revision check, fallback.
4. **Try it in class** with the switch available, then make the connection the
   default path (keeping polling only as the fallback).

## Considered and rejected (2026-09-29)

- **Slower polling between questions** (5 s): the new question would reach
  phones up to 5 s late, costing answer time and making the speed ranking more
  random. Host polling 1 s → 2 s is harmless but saves only ~3% (1 of 31
  screens). Slowing only while a student waits after answering saves ~20% but
  delays their right/wrong by up to 5 s. Not worth it.
- **Workers Paid ($5/month)** removes the quota concern without code changes
  (10M Worker requests and 1M Durable Object requests a month included, then
  $0.30 and $0.15 per million). This plan is about staying on the free plan and
  about fairness/smoothness.

## Open questions

- Whether Cloudflare bills auto-answered `ping` messages (≤ 190 requests a game
  either way).
- If a school network turns out to block WebSockets for classic games, the
  per-page fallback covers it at today's cost for those pages only.

## Built (2026-09-29)

All of steps 0–3, as designed above, with these specifics:

- Worker: `/api/live/ws`; `#liveSchedulePush` after `#setRoom` and `#persistReactionSlice` (120 ms coalescing, per-socket change check via `liveStateKey`, which ignores `serverNow` and `rev`); `rev` bumped in `#setRoom`, sent in both states and the answer response; `transport: 'socket'` in both states (`LIVE_TRANSPORT`, the off switch); the room alarm (`nextRoomAlarmAt`) closes timed-out questions and retries the end-of-game save (at most 5 times, a minute apart); `#deleteRoom` closes live connections with 4004 so pages learn the game ended; answers carrying `qIndex`/`questionStartedAt` for another question get 409 `question_ended`.
- Pages: `live-socket.js` (shared): 10 s ping, 5 s pong watchdog, back-off reconnect, rest after 6 failures (retry every minute), immediate check on `visibilitychange`/`online`. play.js and app.js keep polling as the bootstrap; the first state with `transport: 'socket'` opens the connection, polling pauses while it's up and resumes whenever it's down. Revision check on every state. A push during a voice recording waits until it stops. The host gets the attempts summary pushed.
- Tests: `tests/live-sockets.test.js` (alarm timing, snapshot retries, answer matching, change key). End-to-end against `wrangler dev`: host + 3 students over connections, no polling (push to all students within ~1 ms of each other, a 5 s question closed by the alarm ~0.4 s after its deadline, stale answer rejected, old pages still accepted, reconnect, ping/pong, rising revisions, game over closes connections). Real pages in Chrome: host page + 3 student pages through the normal UI; question shown on the 3 phones 245–279 ms after Start, no polling while connected, 20 API requests for the whole game.
- Not yet tried in a real class.
