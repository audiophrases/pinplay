# Classic live games over a live connection (instead of polling)

Classic live games (PIN) poll: every student page asks `/api/player/state` every
2 s, the host page asks `/api/host/state` every 1 s, and `/api/host/attempts`
every 6 s. Each ask is a Worker request and a Durable Object request, so a class
of 30 costs about 1,000 of each per minute (~19,000 for a 20-minute game, about
a fifth of the free daily 100,000). PinPlay Cup already uses a live connection
(a hibernating WebSocket on the room's Durable Object) and costs a few hundred
requests per round. This moves classic live games onto the same kind of
connection. Planned 2026-09-29.

## What stays the same

- The server decides everything: which question is on, when it closes, what is
  revealed, scores. Screens only show what it sends, so all screens still
  advance together, and more tightly than now (a push reaches every screen at
  once instead of within the next 2 s poll).
- Fairer too. With polling, each phone sees a new question 0–2 s after Next
  (~1 s on average). The countdown ends at the server deadline
  (`questionDeadlineAt`), so that delay comes off the student's answering time,
  and since the first two correct answers score 100% (then 90%, 80%), the phones
  that happened to poll first get a head start. A push removes both.

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
- The messages carry exactly what the polls return today (`hostState(room)` for
  the host, `playerState(room, playerId)` for each student), so the page
  renderers (`renderHostState`, `renderPlayerState`) are unchanged.
- Answers, host actions (start, next, previous, reveal, settings, kick, grade…),
  joining, voice/photo uploads: unchanged HTTP requests. Only the state polling
  is replaced.
- PinPlay Cup: untouched.

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
   (a small hash per socket in memory), so an answer from one student doesn't
   resend unchanged states to the other 29. Outgoing messages are not billed.
3. **Closing questions on time.** Today a timed-out question is closed lazily by
   the next poll (`closeQuestionIfTimedOut`). With no polls, the room sets its
   alarm for the current question's deadline. `alarm()` already handles the
   24-hour cleanup; it will do both: close a timed-out question (then push), and
   re-arm for whichever comes first, the next deadline or the cleanup.
4. **Host extras.** The attempts snapshot (`buildAttemptSnapshots`, polled every
   6 s today) is pushed to host sockets with the state, only when it changed.
5. **Keep-alive.** The room already answers `ping` with `pong` without waking
   (`setWebSocketAutoResponse`); pages ping every 25 s.
6. **Routing.** `webSocketMessage` and `webSocketClose` pick Cup or live logic
   from the socket's attachment (`kind`), so the two never mix.

### Pages

- **Student page (play.js)** and **host page (app.js)**: open the connection
  when a game is joined or hosted; each state message goes to the existing
  renderer. The current poll functions stay as the fallback.
- **Reconnect.** On a drop (Wi-Fi, locked phone, laptop sleep): reconnect with
  back-off (1 s, 2 s, 4 s … up to 15 s), and at once when the page becomes
  visible again. The server sends the current state on reconnect, so a student
  lands on the right question with the right time left (timers already count
  from the server's `questionStartedAt`).
- **Fallback to polling.** If the connection can't be made or keeps failing
  (school network blocking WebSockets, old browser), that page goes back to
  today's polling, alone. Everyone else stays on the connection. The Cup runs
  over the same kind of connection in the same classrooms, so this should be
  rare.
- **Voice answers.** The poll is skipped while a voice answer records (a poll
  janked speech recognition). Pushes are rarer and smaller; the same guard
  applies: a state message that arrives mid-recording is kept and rendered when
  recording stops.
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
| Answers (HTTP) | ~600 | ~600 |
| Joining, host actions | ~110 | ~110 |
| Question time-outs (alarm) | 0 | ≤ 20 |
| **Total requests (Worker and DO each)** | **~20,000** | **~770** |

About 25 times cheaper: roughly 100+ classic games a day on the free plan
instead of ~5, alongside everything else. Running time drops too: between
events the room hibernates.

A later option, if ever needed: send answers over the connection as well
(incoming messages are billed 20 to 1), which would bring a game to ~100
requests. Not in this plan: answers stay on HTTP, where uploads and retries
already work.

## Steps

1. **Worker.** Live socket route and auth; coalesced per-socket push after
   `#setRoom` (with the changed-state check); deadline alarm merged with the
   cleanup alarm; attempts pushed to hosts; `kind` routing in the socket
   handlers; the `liveTransport` setting. Tests: unit tests for the alarm
   scheduling (next deadline vs cleanup) and the changed-state check; an
   end-to-end script against `wrangler dev` with a host and several players
   over sockets (join, start, answers, time-out closing a question with nobody
   polling, reveal, next, reconnect mid-question, results) that also counts the
   requests made.
2. **Student page.** Connection, reconnect, visibility, fallback, voice guard.
3. **Host page.** Connection for state and attempts, reconnect, fallback.
4. **Try it in class** with the switch available, then remove the dead poll
   timers' default path (keeping polling only as the fallback).

## Open questions

- None blocking. If a school network turns out to block WebSockets for classic
  games, the per-page fallback covers it at today's cost for those pages only.
