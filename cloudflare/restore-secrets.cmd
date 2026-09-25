@echo off
REM Restore secrets for pinplay-api (see SECRETS.md)
REM Format: one "SECRET_NAME=value" per line in restore-secrets.local.cmd
REM That file is gitignored - fill in your values there. Lines starting with # are skipped.

setlocal EnableDelayedExpansion
set WORKER=pinplay-api
set LOCAL_FILE=%~dp0restore-secrets.local.cmd
set REQUIRED=CREATE_PASSWORD_HASH GOOGLE_CLIENT_ID STUDENT_SESSION_KEY CREATOR_SIGNING_KEY EDGE_TTS_URL EDGE_TTS_SECRET

if not exist "%LOCAL_FILE%" (
    echo ERROR: restore-secrets.local.cmd not found
    echo.
    echo Create it next to this script with one secret per line:
    echo   CREATE_PASSWORD_HASH=abc123...
    echo   GOOGLE_CLIENT_ID=....apps.googleusercontent.com
    echo   STUDENT_SESSION_KEY=...
    echo   CREATOR_SIGNING_KEY=...
    echo   EDGE_TTS_URL=https://...
    echo   EDGE_TTS_SECRET=...
    echo   PEXELS_API_KEY=...
    echo   GIPHY_API_KEY=...
    echo   YOUTUBE_API_KEY=...
    echo.
    echo secrets-template.json lists every name; SECRETS.md says what each one does.
    exit /b 1
)

echo Restoring secrets for %WORKER% from restore-secrets.local.cmd...
echo.

set "SEEN= "
for /f "tokens=1,* delims==" %%a in ('type "%LOCAL_FILE%" ^| findstr /v "^#"') do (
    set "key=%%a"
    set "value=%%b"
    if not "!value!"=="" (
        echo Setting %%a...
        >secret.tmp echo !value!
        call npx wrangler secret put %%a --name %WORKER% < secret.tmp
        del secret.tmp
        set "SEEN=!SEEN!%%a "
    )
)

set MISSING=
for %%r in (%REQUIRED%) do (
    if "!SEEN: %%r =!"=="!SEEN!" set "MISSING=!MISSING! %%r"
)

echo.
if defined MISSING (
    echo WARNING: these required secrets were not in restore-secrets.local.cmd:!MISSING!
    echo They keep whatever value Cloudflare already has, if any.
    echo.
)
echo Done. Verify with: npx wrangler secret list --name %WORKER%
