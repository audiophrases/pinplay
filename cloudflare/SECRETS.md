# Cloudflare Worker Secrets (`pinplay-api`)

This covers the owner's worker, `pinplay-api`. Teacher instances created by the
setup wizard provision their own secrets (`setup/pinplay-setup.mjs`).

## Deploying from more than one computer

Secrets live in Cloudflare, not in this repo, and `wrangler deploy` never
deletes or changes them. The deploy config (`cloudflare/wrangler.toml`) is in
git, so every computer deploys the same bindings. Deploying from the desktop
or the laptop is equally safe, with two rules:

1. **`git pull` before you deploy.** The front-end is GitHub Pages, so it
   updates as soon as `main` is pushed. The worker only changes when you
   deploy. Deploying from a computer that hasn't pulled replaces the live
   worker with older code.
2. **Never add plain-text variables in the Cloudflare dashboard.** A deploy
   wipes dashboard variables that aren't in `wrangler.toml`. Use a secret
   (`wrangler secret put`) or a `[vars]` entry in `wrangler.toml` instead.
   As of 2026-09-25 the live worker has no dashboard variables.

Each computer needs `npx wrangler login` once, with the owner's Cloudflare
account.

## Secrets the worker reads

Checked against `cloudflare/worker.js` and the live worker on 2026-09-25.

### Required

| Secret | Used for | If missing |
|--------|----------|------------|
| `CREATE_PASSWORD_HASH` | Teacher login: SHA-256 of the teacher password, lowercase hex | Nobody can log in to the teacher page |
| `GOOGLE_CLIENT_ID` | Verifying student "Sign in with Google" | Student sign-in fails |
| `STUDENT_SESSION_KEY` | Signing student session tokens (`openssl rand -hex 32`) | Falls back to `CREATOR_SIGNING_KEY`. Rotating it signs every student out, nothing else breaks. |
| `CREATOR_SIGNING_KEY` | Signing guest creator workspace tokens (`openssl rand -hex 32`) | Guest workspaces can't be created |
| `EDGE_TTS_URL` | Edge TTS bridge URL for question audio | No generated audio |
| `EDGE_TTS_SECRET` | Bearer token sent to the TTS bridge. Must match the bridge's own `EDGE_TTS_SECRET`. | If the bridge has its own secret set, it rejects every audio request |

### Optional (turn on search features)

| Secret | Used for | If missing |
|--------|----------|------------|
| `PEXELS_API_KEY` | Image search and stock-video search in the builder | Image search and Pexels video results don't work |
| `GIPHY_API_KEY` | GIF search in the builder | GIF search reports "not configured" |
| `YOUTUBE_API_KEY` | YouTube results in video search | YouTube is skipped |
| `VIMEO_ACCESS_TOKEN` | Vimeo results in video search | Vimeo is skipped (not set on the live worker) |
| `BUILDER_BASE_URL` | Teacher-page URL used in guest workspace links | Defaults to `https://audiophrases.github.io/pinplay/create/` (not set on the live worker) |

### No longer needed (kept on purpose for now)

| Secret | Left over from |
|--------|----------------|
| `CREATE_PASSWORD` | Old plain-text teacher password, replaced by `CREATE_PASSWORD_HASH` |
| `DRIVE_PUBLISH_URL` | Removed Google Drive publishing |
| `DRIVE_SHARED_SECRET` | Removed Google Drive publishing |
| `STUDENT_LOGIN_VERIFY_URL` | Old student username/password login |
| `STUDENT_ROSTER_LOOKUP_SECRET` | Old Apps Script student roster |
| `STUDENT_ROSTER_LOOKUP_URL` | Old Apps Script student roster |

Nothing in the code reads these any more, and they don't need backing up or
restoring. The owner decided on 2026-09-25 to keep them on the live worker for
now. If you decide to remove one later:

```bash
npx wrangler secret delete STUDENT_ROSTER_LOOKUP_URL --name pinplay-api
```

## Check which secrets are set

Always pass `--name`; without it wrangler returns an empty list.

```bash
npx wrangler secret list --name pinplay-api
```

This shows names only, never values.

## Set or change one secret

```bash
echo "value" | npx wrangler secret put SECRET_NAME --name pinplay-api
```

## Back up and restore all secrets

Cloudflare never shows a secret's value again after it is set, so keep your
own copy of the values:

1. Create `cloudflare\restore-secrets.local.cmd` (gitignored) with one
   `NAME=value` line per secret. `cloudflare/secrets-template.json` lists every
   name. Lines starting with `#` are ignored.
2. To restore, run `cloudflare\restore-secrets.cmd`. It uploads every line in
   the file and then warns about any required secret the file doesn't contain.

Keep the local file on each computer you might restore from, or keep the values
in a password manager and recreate the file when needed.

## Student sign-in

Students sign in with Google; there are no student passwords.

- `GOOGLE_CLIENT_ID` is a Web application OAuth client. Its **Authorized
  JavaScript origins** must list every origin the student page is served from.
- `STUDENT_SESSION_KEY` signs the session token the browser sends with every
  identity-bearing call.

Who may sign in (allowed domains, and whether unknown students auto-enrol) is
not a secret: set it in the teacher page under **Students -> Sign-in rules**.
