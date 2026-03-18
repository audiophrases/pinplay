@echo off
REM Restore secrets for pinplay-api
REM Format: one "SECRET_NAME=value" per line in restore-secrets.local.cmd
REM That file is gitignored - fill in your values there

setlocal
set WORKER=pinplay-api
set LOCAL_FILE=%~dp0restore-secrets.local.cmd

if not exist "%LOCAL_FILE%" (
    echo ERROR: restore-secrets.local.cmd not found
    echo.
    echo Create it with one secret per line:
    echo   CREATE_PASSWORD_HASH=abc123...
    echo   PEXELS_API_KEY=xyz789...
    echo   EDGE_TTS_URL=https://...
    echo   STUDENT_LOGIN_VERIFY_SECRET=...
    echo   STUDENT_LOGIN_VERIFY_URL=https://...
    exit /b 1
)

echo Restoring secrets for %WORKER% from restore-secrets.local.cmd...
echo.

for /f "tokens=1,* delims==" %%a in ('type "%LOCAL_FILE%" ^| findstr /v "^#"') do (
    set "key=%%a"
    set "value=%%b"
    if not "!value!"=="" (
        echo Setting %%a...
        echo !value! | npx wrangler secret put %%a --name %WORKER%
    )
)

echo.
echo Done! Verify with: npx wrangler secret list --name %WORKER%
