# Cloudflare Worker Secrets

## Required secrets for `pinplay-api`

| Secret | Purpose |
|--------|---------|
| `CREATE_PASSWORD_HASH` | SHA-256 hash of teacher password (lowercase hex) |
| `PEXELS_API_KEY` | Image search in quiz builder |
| `EDGE_TTS_URL` | Text-to-speech bridge URL |
| `STUDENT_LOGIN_VERIFY_SECRET` | Student login auth |
| `STUDENT_LOGIN_VERIFY_URL` | Student login verification endpoint |

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
   STUDENT_LOGIN_VERIFY_SECRET=...
   STUDENT_LOGIN_VERIFY_URL=https://...
   ```
3. Run: `cloudflare\restore-secrets.cmd`

## Current values location

Store your current secret values in `~/.pinplay-secrets.json` (gitignored, outside repo).
