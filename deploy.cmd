@echo off
if not exist _site mkdir _site
echo Preparing Assets (staging _site)...
robocopy . _site /S /XD .git .wrangler node_modules cloudflare tests music _site /XF *.cmd *.log *.jsonc *.toml *.md .gitignore .wranglerignore > nul

echo.
echo Deploying Assets (pinplay-cdn)...
powershell -NoProfile -Command "& { npx wrangler deploy --config wrangler.jsonc %* 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath deploy.log -Encoding utf8; exit $LASTEXITCODE }"
if %errorlevel% neq 0 goto :fail

echo.
echo Deploying API (pinplay-api)...
pushd cloudflare
powershell -NoProfile -Command "& { npx wrangler deploy --config wrangler.toml %* 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath ..\deploy.log -Append -Encoding utf8; exit $LASTEXITCODE }"
set err=%errorlevel%
popd
if %err% neq 0 goto :fail

echo.
echo Deployment Complete! (full log in deploy.log)
exit /b 0

:fail
echo.
echo ERROR: Deployment failed. See deploy.log for details.
exit /b 1