# Public games (`/play`)

PinPlay is one game in ESL Games and Beyond, but its link only shows a PIN box. This
adds a second entry point: **`/play`**, a page of game cards made from assignments
the teacher marks **🌐 Public**. The join page stays as it is (PIN box only) for live
games and normal assignments, so students never see both at once.

Decided with the owner on 2026-09-28.

## Decisions

| Topic | Decision |
|---|---|
| What is a public game | An existing assignment with a **Public** toggle on. One assignment, one set of questions: editing it updates both ways of playing. No copies. |
| Normal link | Unchanged. A login assignment stays login-only on its own link. |
| Player choice on `/play` | **Play anonymously** (random name) or **Sign in with Google** (the existing student login). |
| Anonymous play | Nothing about the player is stored. Only public counters per game: plays and likes. |
| Signed-in play | A normal attempt in the assignment's results, tagged "🌐 via /play". |
| Settings in public play | Instant feedback, no exam mode, unlimited attempts, no due date. |
| Teacher-graded questions | Notice before the game: "Sign in with Google for teacher corrections." Anonymous players can still answer them; they aren't scored and get no correction. |
| Getting corrections to signed-in players | The existing **View results → Notify selected** (Gmail draft with a link back). For `/play` attempts the link must point to the `/play` game, not the normal assignment link (which may be random-names mode and would not find the attempt). |
| Card picture | Automatic: the first question picture in the quiz (assignment media are already R2 URLs). No picture: a coloured tile with the title. |
| Card text | Title. Adaptive games add a **🎯 Adaptive** pill and the range of levels the quiz contains (e.g. "A1–B1", from its `cefr` tags). |
| Question order | Non-adaptive games play in the teacher's order. Adaptive games: the engine picks. |
| Card order on `/play` | Most played first by default; "Newest" and "Most liked" as alternatives. |
| Remove a game | Turn Public off, or archive the assignment. |
| Top scores (step 2) | Top 10 per game. Everyone appears as initials: signed-in players from their name (Eugeni Monfort Espí → EM), anonymous players from their random name (Calm Messi → CM). Only initials and score are stored. Adaptive games rank by level reached, then points. |
| Owner vs guests | Only the owner can make an assignment public. Each PinPlay installation has its own `/play`. |

## How anonymous play works with nothing stored

Grading and the adaptive engine today work from the stored attempt. For anonymous
players the server grades **statelessly**:

- `POST /api/public/game/start { code }` → a random name, the first question (answers
  stripped with `publicQuestion`) and a **play token**.
- `POST /api/public/game/answer { token, answer }` → the verdict, the correct answer
  (instant feedback), points, the next question (or the end) and the updated token.
- The **play token** carries the game's progress: code, quiz version (so an edited
  quiz ends old tokens cleanly), name, position or adaptive state (level, streak,
  questions served), score, expiry (~3 h). It is signed with an HMAC server key
  (reusing the existing secret with a purpose prefix), so it can't be edited in the
  browser. That also makes top scores trustworthy.
- Answers never reach the browser before the student has answered.

Why not grade in the browser: the page would receive every answer, and many public
games will also be graded homework on their normal link.

Known trade-off: instant feedback shows each answer once it's given. A student could
play the public version before doing the same assignment as graded homework. When that
matters, publish after the due date, or keep a separate practice assignment.

## Signed-in play

Reuses the existing assignment routes with `via: 'play'`:
- sign-in is required even when the assignment itself is random-names mode;
- the attempt is stored with `via: 'play'`, and the public-play settings above override
  the assignment's own (feedback, exam mode, attempts limit, due date);
- results show the "🌐 via /play" tag; grading and Notify selected work as usual.

## Pieces

1. **Worker**
   - `assignment.public` (bool) and `publishedAt`, set by an owner-only route.
   - `GET /api/public/games`: cards for public, non-archived assignments
     `{ code, title, cover, adaptive, levels, questionCount, plays, likes, publishedAt }`.
     Never answers.
   - Stateless anonymous play (start / answer) as above, including the adaptive engine
     running from the token.
   - Counters: `plays` (counted when a game is finished) and `likes`
     (`POST /api/public/game/like`, one per browser, light per-IP rate limit).
   - Signed-in `via: 'play'` handling on the existing routes.
2. **Student page** (`index.html` / `play.js`): `?game=CODE` opens straight into the
   game: title, [Play anonymously] [Sign in with Google], and the teacher-corrections
   line when the quiz has teacher-graded questions. Then the normal question screens.
3. **`/play` page**: the card grid, sort control and like button.
4. **Teacher page**: the 🌐 Public toggle on each assignment (owner-only), with its
   plays and likes; the "via /play" tag in results; the Notify link fix.
5. **Step 2**: top scores per game.

## Tests

- Token: tampering is rejected; an edited quiz ends old tokens; expiry.
- Stateless play gives the same verdicts and scores as a stored attempt, including an
  adaptive run (reuse `tests/helpers/adaptive-sim.js`).
- Listing never contains answer fields; archived or non-public assignments are absent.
- Teacher-graded questions in anonymous play: answered, not scored.
- Signed-in `via: 'play'`: sign-in enforced on a random-names assignment; overrides applied.

## Built

### Step 1: worker (2026-09-28)
- `assignment.public` + `publishedAt` (owner-only `POST /api/assignments/set-public`); `pub:index` lists public codes; `pc:<code>` holds `{ plays, likes }`. The teacher's assignment list shows `public`, `plays`, `likes`.
- `GET /api/public/games` (cached 30 s): `{ code, title, cover, adaptive, levels, questionCount, teacherGraded, plays, likes, publishedAt }`.
- Anonymous play: `POST /api/public/game/start | answer | finish | like`. The play token is the attempt (answers, adaptive state), signed with a key derived from the student-session secret (`public-play:` prefix), valid 3 h, refused after a quiz edit (`GAME_CHANGED`). Each question is answered once. Responses have the same shape as an assignment attempt, so the student page can play them unchanged. `finish` counts the play.
- Signed-in play: `via: 'play'` on `/api/assignment/check-status | start | attempts | delete-my-attempt` requires sign-in even on a random-names assignment. The attempt is stored with `via: 'play'`, and every route applies the public-play settings to it. `/play` and normal-link attempts are kept apart (resume, attempt limit). Results carry `via`.
- Answers are only ever revealed for questions already answered (`includeAnswerKey: false`), for anonymous and `via: 'play'` attempts alike.
- Tests: `tests/public-games.test.js` (unit, real worker code). An end-to-end script against `wrangler dev` checked 49 behaviours (listing, anonymous play incl. adaptive, tampering, edits, counters, archive, signed-in via /play).

### Notes for later steps
- Existing instant-feedback assignments send the answer key for the whole quiz with the first answer (`publicAssignmentAttempt` → `includeAnswerKey: includeAnswers`). Public play does not; normal homework is unchanged for now.
- Top scores (step 5) need replay protection: a player can resend an earlier token to answer a question again after seeing the answer. Record used token steps (id + step, expiring with the token) before scores count.
- Plays and likes have no server-side rate limit; the page keeps one like per browser.
