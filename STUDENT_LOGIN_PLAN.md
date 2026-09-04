# Student login: Sign in with Google, one code path for owner and teacher setups

Status: sections 1-9 implemented on 2026-09-04. Section 11 (merging the rest of
the two deployments) is still a plan.

Not yet done, and needed before students can sign in:

1. Create the Google OAuth client and set `GOOGLE_CLIENT_ID` + `STUDENT_SESSION_KEY`.
2. Run the rekey migration (section 7) while the Apps Script is still wired.
3. Import the roster CSV in the new Students panel.
4. Deploy (`deploy.cmd`), then retire the Apps Scripts and the Google Form.

## 0. Where we are today

Two different student-auth stacks run on the same worker code:

| | Owner (api.pinplay.win) | Teacher via wizard (wife) |
|---|---|---|
| Roster source | Google Sheet, read by an Apps Script at `STUDENT_ROSTER_LOOKUP_URL` | R2 objects written by `setup/student-accounts.js` (`STUDENT_ACCOUNTS=self`) |
| Student credentials | username + password stored in the sheet | username + PBKDF2 password in R2, email verified by Google at signup |
| Sign-up | hardcoded Google Form link in `index.html` | in-app "Create a student account" (`student-accounts-ui.js`) |
| Forgot login | `LOGIN_LOOKUP_URL` Apps Script link in `play.js` | Google sign-in recovery in `student-accounts-ui.js` |
| Teacher roster edits | edit the sheet | floating "Students" panel (`student-admin-ui.js`): rename, reset password, delete |
| Wiring | `lookupAndVerifyStudent()` fetches the Apps Script | wizard wraps the worker (`worker.teacher.js`) and intercepts the self-fetch to `/api/students/lookup` |
| Attempt key | `usr_<email>` (after the rekey migration) | `usr_<email>` |

Everything else in the two setups (TTS bridge, media host, Question Bank flag, tinyurl alias, guest workspaces) is unrelated to student login. So yes: the roster source, plus the sign-up and recovery channels that go with it, is the only auth difference.

Gaps found while mapping (pre-existing, fixed by this plan):

- The self-service `/api/students/lookup` returns `{ email, passwordOk }` only. The teacher dashboard expects `{ username, email, class }`, so on the wife's site the notify flow reports "No email found" for everyone, class badges never show, and rekey-by-email matches nothing.
- Live games hash the identity into `stu_<sha>` (`normalizeStudentIdentity`) while assignments use `usr_<email>`. A snapshotted live game and the same student's assignment attempts cannot be joined. Class never reaches the live identity either, so the host list code that prints "(4B)" has never had data.
- `cloudflare/SECRETS.md` still documents `STUDENT_LOGIN_VERIFY_*`, which the worker no longer reads.

## 1. Target design

- **Identity = verified Google email.** The student key stays `usr_<email>` (`makeStudentKeyFromEmail`), so every existing attempt on both setups stays attached.
- **No student usernames or passwords.** The join page shows one "Sign in with Google" button when a game or assignment requires login. Random-names mode is untouched.
- **Roster becomes a directory, not a credential store.** Per email: display name, class (e.g. `4B`), legacy username, notes, last login. Stored in the assignments Durable Object (single writer, transactional, one `list` call returns all rows). Teacher edits it in the create dashboard; CSV import and export.
- **Login policy is a roster setting, editable in the dashboard, no redeploy:** allowed domains and addresses (owner: `iecomaruga.cat` plus a test Gmail), and `open` (any allowed account auto-enrolls with its Google name and an empty class) or `roster` (only listed emails may sign in). Default `open`.
- **Session token.** After the ID token is verified once, the worker mints an HMAC-signed student token (email, display name, class, 30-day expiry). The client stores it and sends it on every identity-bearing call. No Apps Script round trip on login, no external call after the first sign-in.
- **One code path.** The roster, login, and admin routes live in `cloudflare/worker.js`. The wizard stops generating a wrapper worker and stops shipping the three `setup/student-*.js` files.

Default display name is the Google account's full name, cut to 40 characters; the teacher can shorten or change it in the roster. Students cannot rename themselves.

## 2. Data and secrets

Durable Object storage (`__assignments_registry__`):

```
roster:<email>   { email, displayName, className, legacyUsername, notes,
                   source: 'import'|'google'|'manual'|'migrated',
                   createdAt, updatedAt, lastLoginAt }
rosterSettings   { allowedDomains: ['iecomaruga.cat', 'eugenime@gmail.com'],
                   policy: 'open'|'roster' }
```

Worker secrets:

| Secret | Status |
|---|---|
| `GOOGLE_CLIENT_ID` | keep (already provisioned by the wizard); owner sets it too |
| `STUDENT_SESSION_KEY` | new, HMAC key for student tokens; wizard auto-generates, owner runs `openssl rand -hex 32` |
| `STUDENT_ACCOUNTS`, `STUDENT_ROSTER_LOOKUP_URL`, `STUDENT_ROSTER_LOOKUP_SECRET` | removed |
| `STUDENT_LOGIN_OVERRIDE_USER/PASS` | removed; test with a Gmail address in `allowedDomains` |
| `STUDENT_LOGIN_VERIFY_URL/SECRET` | dead already; drop from docs |

Google OAuth client: one per deployment. Authorized JavaScript origins must list every origin the student page is served from (owner: the GitHub Pages origin and the pinplay.win origin if the site is served there).

## 3. Worker API

New public routes:

- `GET /api/student/config` → `{ googleClientId, loginEnabled, allowedDomains }`. `loginEnabled` is false when the client ID or session key is missing, and the join page says so instead of failing later.
- `POST /api/student/login { googleIdToken }` → verifies via `https://oauth2.googleapis.com/tokeninfo` (checks `aud`, `email_verified`, expiry), applies the domain policy, upserts or rejects per `policy`, stamps `lastLoginAt`, returns `{ studentToken, student: { email, displayName, className } }`.

Student routes switch from `name`/`password` to `studentToken`:

- `POST /api/join` (login-required rooms), `POST /api/assignment/check-status`, `POST /api/assignment/start`, `POST /api/assignment/delete-my-attempt`, and `GET /api/assignment/attempts` (currently keyed only by `studentKey`; it starts requiring the token).
- A shared `resolveStudent(env, request, body)` verifies the token and returns `{ email, studentKey, legacyStudentKey, displayName, className }`. `legacyStudentKey` is `usr_<legacyUsername>` when the roster row has one, so pre-migration attempts still match.
- `lookupAndVerifyStudent`, the isolate email cache, and the Apps Script fetch are deleted.

Teacher routes (Bearer create password through `verifyCreatePassword`, same as every other create endpoint):

- `GET /api/students` list, `POST /api/students/upsert`, `POST /api/students/delete`, `POST /api/students/import` (rows or CSV text, `merge` or `replace`), `GET /api/students/export.csv`, `GET|POST /api/students/settings`.
- `POST /api/assignments/lookup-emails` is reimplemented over the roster (match on display name, legacy username, or email) and keeps its `{ username, email, class }` response so `app.js` needs no change there.
- `POST /api/assignments/rekey-by-email` is reimplemented over roster legacy usernames so it keeps working without Apps Script.

Attempt and identity changes:

- `/assignments/start` stores `studentEmail` and `className` on the attempt; `publicAssignmentAttempt` and the host list expose them. `app.js` already prefers `attempt.studentEmail`.
- Live `/join` builds the identity with `studentKey = usr_<email>` and the roster class, so snapshots and assignments share keys and the host list shows "(4B)".

## 4. Student page (`index.html`, `play.js`)

- Remove the username and password inputs, the Google Form hint, `LOGIN_LOOKUP_URL`, and client-side `makeAssignmentStudentKey` (the key now comes from the server).
- After `validatePin`, when the room or assignment requires login: if a stored session (`pinplay.student.v1` in localStorage) is present and unexpired, show a chip "Signed in as Nel Oru (4B) · Not you?" and enable Join. Otherwise lazy-load `https://accounts.google.com/gsi/client`, render the button into a new `#joinGoogle` container, post the credential to `/api/student/login`, store the session, then enable Join.
- "Not you?" clears the session and calls `google.accounts.id.disableAutoSelect()`.
- Review, retake, and delete-own-attempt paths pass the token instead of username and password.
- Clear messages for: login not configured on this site, account domain not allowed, not on the roster (policy `roster`), session expired.
- All new strings through `t()` with French entries in `i18n-fr.js`; `node scripts/i18n-check.mjs` must pass.

## 5. Teacher dashboard (`create/index.html`, `app.js`)

- New "Students" card, replacing `setup/student-admin-ui.js`: table with name, email, class, last login, source; inline edit of name and class; add a row by email; delete; CSV import (columns `email, name, class, username`) with merge or replace; CSV export; settings for allowed domains and policy. Rows with an empty class are highlighted so auto-enrolled students are easy to file into a class.
- Uses `createSessionPassword` like the rest of the dashboard.
- Assignment results and notify flow read `studentEmail` and `className` from the attempt first and fall back to `lookup-emails` for old attempts.

## 6. Setup wizard (`setup/pinplay-setup.mjs`) and repo hygiene

- Delete `setup/student-accounts.js`, `setup/student-accounts-ui.js`, `setup/student-admin-ui.js`; remove `injectStudentAccountsUi`, the `worker.teacher.js` wrapper, and the global fetch interception. `main` points at `worker.original.js` (still the media-host repointed copy).
- `stepStudentAccountsPref` becomes "Student sign-in with Google (recommended)". Skipping it leaves random-names mode only, and the wizard says so.
- `stepStudentAccountsSecrets` keeps the guided Client ID text, auto-generates `STUDENT_SESSION_KEY`, and stops provisioning `STUDENT_ACCOUNTS` and the roster lookup pair.
- Drop `OWNER_LOGIN_LOOKUP_URL` and its replacement (the constant leaves `play.js`).
- Update `setup/README.md`, `README.md`, `cloudflare/SECRETS.md`, `cloudflare/secrets-template.json`, `QA_CHECKLIST.md`.

## 7. Migration

Owner:

1. While the Apps Script is still configured, run `/api/assignments/rekey-by-email` with `dryRun: true`, review `unmatchedNames`, then apply. Every attempt is then `usr_<email>`.
2. Export the roster sheet as CSV with `email, name, class, username`. After deploy, import it in the Students card (`merge`). The password column is not imported.
3. Create the Google OAuth client, set `GOOGLE_CLIENT_ID` and `STUDENT_SESSION_KEY`, set allowed domains to `iecomaruga.cat` plus the owner's test Gmail, policy `open`.
4. Deploy API and assets together (`deploy.cmd`). Retire the roster Apps Script, the lookup Apps Script, and the Google Form.

Teacher (wife):

- On the first roster access after deploy, the worker migrates existing R2 accounts (`students/accounts/*.json`) into roster rows: `displayName = username`, `legacyUsername = username`, `source = 'migrated'`. Idempotent; the R2 objects are left in place and can be deleted later. Her attempts are already `usr_<email>`.
- `node setup/pinplay-setup.mjs --update` sets `STUDENT_SESSION_KEY`; `GOOGLE_CLIENT_ID` is already there. Her students sign in with Google from then on and their old passwords stop mattering.

## 8. Work packages, in order

1. **Worker roster and login core.** DO roster routes, admin endpoints, `verifyGoogleIdToken`, token mint and verify, `resolveStudent`. Old password paths untouched so the owner API can deploy early. Test with curl.
2. **Students card.** Dashboard UI, CSV import and export, settings. Import the owner roster.
3. **Student page cutover.** Google button, session chip, token-bearing calls. Switch the five student routes to `studentToken` and delete the password path. Deploy assets and API in one go.
4. **Identity consistency.** `usr_` key and class on live identity; `studentEmail` and `className` stamped on attempts; dashboard prefers them.
5. **Wizard.** Remove wrapper and setup scripts, new secrets step, R2 account migration. Run `--update` against the wife's setup, then a fresh-install dry run on a scratch Cloudflare account.
6. **Cleanup.** Dead code and secrets, docs, i18n check, `node --test tests/`.

## 9. QA checklist

- Owner school account: assignment start shows earlier attempts, results show class, notify resolves emails, live join works, hall shows "(4B)", same student cannot join a room twice, "Not you?" switches account.
- Personal Gmail outside the allowed list is rejected with a clear message; an unknown school account auto-enrolls and appears in the Students card with an empty class.
- Wife's site after `--update`: migrated rows present, students sign in with Google, admin edits persist.
- Random-names games and assignments, and the builder's student preview, behave exactly as before.
- Expired session re-prompts for Google sign-in without losing the PIN or assignment code.
- `node scripts/i18n-check.mjs` and `node --test tests/` pass.

## 10. Decisions and open points

Decided: full Google name as default display name; policy `open` within allowed domains; 30-day session; `tokeninfo` verification; roster in the Durable Object rather than R2; one OAuth client per deployment.

Open:

- Students without a Google account: none expected in a Workspace school. Fallback is random-names mode for that game. No password fallback is planned.
- Whether to delete the migrated R2 account objects automatically or leave that to a later cleanup.

## 10b. What the build changed from this plan

Three things came out differently once the code was written:

- **Login policy lives in the Durable Object, not the worker.** The DO owns the
  allow-list and roster check so sign-in is a single round trip that reads the
  same rows the teacher edits. The worker only verifies the Google token first.
- **Random-name assignments still send a client-derived key.** An earlier draft
  short-circuited them, which would have hidden the review/retake modal for
  anonymous players. They now reach the Durable Object exactly as before.
- **`X-Student-Token` had to be added to the CORS allow-list.** Without it every
  student call fails the preflight, with no visible error.

Two bugs were found and fixed while testing:

- `parseRosterCsv` returned rows whose "email" was not an email, so an import of
  a junk line reported students added that were never stored.
- The teacher dashboard read the class only from a roster lookup by name. It now
  prefers the class stamped on the attempt, and falls back to the lookup for
  attempts recorded before Google sign-in.

Coverage: `tests/roster.test.js` runs the real parsing and policy functions
extracted from `cloudflare/worker.js`; `tests/student-login.test.mjs` drives the
real worker module end to end against an in-memory Durable Object and a stubbed
Google endpoint, covering sign-in, the roster API, assignment start, live join
and both anonymous paths.

## 11. Beyond login: every other difference between the two deployments

Student auth is the only *behavioural* difference. The rest is the owner's values baked into source files, which the wizard patches on copies at deploy time. Full inventory, grouped by what would be needed to make both deployments run identical files.

### 11a. Owner values the wizard rewrites on copies today

| Literal | Where | Wizard action |
|---|---|---|
| `https://api.pinplay.win` | `app.js`, `play.js`, `question-bank-ui.js` (`DEFAULT_BACKEND_URL` and fallback lists) | replaced with teacher API URL in every `_site` `.js`/`.html` |
| `https://audiophrases.github.io/pinplay` | `app.js` (live QR, join and assignment links), `create/index.html` (QR image, URL-encoded) | replaced in `.js`; URL-encoded form replaced everywhere |
| `PinPlayGame` | `create/index.html` hall join hero (tinyurl alias) | replaced with the teacher's tinyurl alias |
| `https://pinplay-api.eugenime.workers.dev` | `worker.js` `extractBase64MediaToR2` stamps this host into every uploaded media URL | second worker deploy on the edited copy `worker.original.js` |
| owner Apps Script lookup URL | `play.js` | cleared (goes away with the login plan) |
| `account_id`, `main` | `cloudflare/wrangler.toml` | dropped / repointed to the wrapper |
| `question-bank-ui.js` script tag | `create/index.html` | stripped unless the teacher opts in |

### 11b. Owner values the wizard does NOT touch (teacher sites still point at the owner)

- `pingEdgeTtsBridgeWarmup` in `app.js` and `play.js` pings `https://edge-tts-bridge.onrender.com/health`, the owner's Render bridge. A teacher's own Render bridge never gets warmed, so her first neural-voice playback after 15 idle minutes cold-starts. Fix: ping through the worker (`GET /api/tts/warm`) so each deployment warms its own bridge.
- `/s/:code` share-preview route in `worker.js` redirects to `https://audiophrases.github.io/pinplay/`. The teacher app never generates `/s/` links, so it is harmless today, but it should read a `PUBLIC_SITE_URL` var.
- `BUILDER_BASE_URL` fallback in `worker.js` is the owner's create page. Covered for teachers by the secret the wizard sets; would collapse into `PUBLIC_SITE_URL` too.
- `replaceAll('https://pinplay-api.eugenime.workers.dev', 'https://api.pinplay.win')` inside the `api()` helper of `app.js` and `play.js`: an owner media-host migration baked into the frontend. No-op on teacher sites after replacement. Should move server-side or be dropped once old quizzes are re-stamped.
- Pexels `User-Agent` strings in `worker.js` name the owner's site. Cosmetic.
- Showcase Quiz button in `create/index.html` links to the owner's assignment `9C2FEX`. Intentional (the showcase lives on the owner backend), but it means every guest banner advertises the owner's site.

### 11c. Structural differences (not string replacement)

1. **Frontend hosting.** Owner: GitHub Pages is the canonical origin baked into QR and share links, plus a Cloudflare assets worker `pinplay` deployed by `deploy.cmd` from `_site`. Teacher: assets worker only, on `*.workers.dev`. Two hosting models, and the Google OAuth origins list has to cover both for the owner.
2. **Worker entry point.** Owner deploys `cloudflare/worker.js` directly. Teacher deploys a generated wrapper (`worker.teacher.js` → `worker.original.js`) purely to bolt on student routes and to edit the media host. The login plan removes the wrapper; making the media host derive from the request origin (or a `PUBLIC_API_URL` var) removes the second deploy pass and the `eugenime` literal.
3. **Site build.** Owner: `deploy.cmd` robocopies the whole repo minus exclusions, so the live site also ships `feedback-test.html`, `test-tts.js`, `out_test.txt` and similar. Teacher: `collectFrontendAssets` publishes only what the two HTML entry points reference, plus `create/`, `music/` and root `*.json`. Two build paths that can drift.
4. **Secrets and config provisioning.** Owner: manual `wrangler secret put` and `restore-secrets.cmd` from `~/.pinplay-secrets.json`. Teacher: wizard with `setup/.generated/state.json`. Owner-only secrets: `EDGE_TTS_SECRET`, `STUDENT_LOGIN_OVERRIDE_*`, `STUDENT_ROSTER_LOOKUP_*`. Teacher-only: `STUDENT_ACCOUNTS`, `GOOGLE_CLIENT_ID`, `BUILDER_BASE_URL`.
5. **TTS bridge.** Owner: `cloudflare/edge_tts_bridge.py` on Render with a shared `EDGE_TTS_SECRET`. Teacher: `setup/tts-bridge/edge_tts_bridge.py` via the `render.yaml` blueprint, with no secret (the bridge is open to anyone with the URL). The two Python files differ only in docstring and whitespace.
6. **Update path.** Owner: `git pull` and `deploy.cmd`. Teacher: `--update` downloads the tarball and copies a fixed file list (`worker.js`, `wrangler.toml`, the TTS script, the three setup scripts, frontend assets). Any new backend module must be added to that list by hand.
7. **Tooling.** Owner uses whatever `npx wrangler` resolves. Wizard installs pinned wrangler 4.42.0 under `setup/.generated/wrangler`.
8. **Question Bank.** Owner-only local Python bridge (`question-bank/bridge.py` on `127.0.0.1:8789`) driven by `question-bank-ui.js`. Teachers get it stripped by default. Not a hosting difference, just an owner tool.
9. **Identical already:** worker name `pinplay-api`, R2 bucket `pinplay-quiz-media`, Durable Object class and migrations, `AUTH_RL` rate-limit binding, CORS (`*`), i18n (runtime toggle), `music/` assets.

### 11d. What a complete merge would take

Replace deploy-time string patching with per-deployment runtime config, so the same files ship everywhere:

- **Frontend:** one generated `config.js` (or `<meta>` block) per deployment holding `apiUrl`, `siteUrl`, `shortJoinUrl`, `showcaseUrl`, `questionBank`. The owner commits theirs; the wizard writes the teacher's into `_site`. This retires the `api.pinplay.win`, `github.io`, `PinPlayGame` and Question Bank rewrites.
- **Worker:** `PUBLIC_SITE_URL` var (share redirect, builder base, QR) and media URLs built from the request origin or `PUBLIC_API_URL`. Retires the second deploy pass and the wrapper.
- **TTS warm ping** through the worker, and one copy of the bridge script (owner deploys from `setup/tts-bridge` too). Decide whether teachers get an `EDGE_TTS_SECRET` (wizard could generate one and print it for the Render env var).
- **One site builder** (`scripts/build-site.mjs`) used by both `deploy.cmd` and the wizard, so the owner's site stops shipping test files and the two builds cannot drift.
- **One hosting model for the owner.** Either the assets worker on `pinplay.win` becomes canonical with GitHub Pages kept as a redirect stub for printed QR codes, or GitHub Pages stays and the assets worker goes. Keeping both means two OAuth origins and two places links can point.
- **Owner runs the wizard too.** With the above in place the owner deployment is just another teacher deployment whose `config.js` and secrets happen to be the owner's; `deploy.cmd` stays as the fast dev loop calling the shared builder.

Suggested order after the login work: worker `PUBLIC_SITE_URL` + request-origin media host (removes pass 2), then `config.js` + shared site builder (removes all frontend rewrites), then the TTS ping and bridge dedupe, then the hosting decision.
