# Cloudflare Worker Secrets

## Required secrets for `pinplay-api`

| Secret | Purpose |
|--------|---------|
| `CREATE_PASSWORD_HASH` | SHA-256 hash of teacher password (lowercase hex) |
| `PEXELS_API_KEY` | Image search in quiz builder |
| `EDGE_TTS_URL` | Text-to-speech bridge URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID used to verify student sign-in |
| `STUDENT_SESSION_KEY` | HMAC key for student session tokens (e.g. `openssl rand -hex 32`) |
| `CREATOR_SIGNING_KEY` | HMAC key for signing guest creator workspace tokens (e.g. `openssl rand -hex 32`) |

## Check secrets (IMPORTANT: use --name flag!)

```bash
# This returns EMPTY (wrangler bug/quirk):
npx wrangler secret list

# This shows the actual secrets:
npx wrangler secret list --name pinplay-api
```

## Set a secret

```bash
echo "value" | npx wrangler secret put SECRET_NAME --name pinplay-api
```

## Restore all secrets at once

1. Copy the template: `cp cloudflare/secrets-template.json %USERPROFILE%\.pinplay-secrets.json`
2. Fill in values in `cloudflare\restore-secrets.local.cmd` (gitignored):
   ```
   CREATE_PASSWORD_HASH=abc123...
   PEXELS_API_KEY=xyz789...
   EDGE_TTS_URL=https://...
   GOOGLE_CLIENT_ID=....apps.googleusercontent.com
   STUDENT_SESSION_KEY=...
   ```
3. Run: `cloudflare\restore-secrets.cmd`

## Current values location

Store your current secret values in `~/.pinplay-secrets.json` (gitignored, outside repo).

## Student sign-in

Students sign in with Google; there are no student passwords. Two secrets make
that work:

- `GOOGLE_CLIENT_ID` — a Web application OAuth client. Its **Authorized
  JavaScript origins** must list every origin the student page is served from.
- `STUDENT_SESSION_KEY` — signs the session token the browser replays on every
  identity-bearing call. Rotating it signs everyone out; nothing else breaks.

Who may sign in (allowed domains, and whether unknown students auto-enrol) is
not a secret: set it in the teacher page under **Students -> Sign-in rules**.
