@echo off
if not exist _site mkdir _site
echo Preparing Assets (staging _site)...
robocopy . _site /S /XD .git .wrangler node_modules cloudflare tests music _site /XF *.cmd *.log *.jsonc *.toml *.md .gitignore .wranglerignore > nul

echo.
echo Deploying Assets (pinplay-cdn)...
call npx wrangler deploy --config wrangler.jsonc %*
if %errorlevel% neq 0 goto :fail

echo.
echo Deploying API (pinplay-api)...
pushd cloudflare
call npx wrangler deploy --config wrangler.toml %*
set err=%errorlevel%
popd
if %err% neq 0 goto :fail

echo.
echo Deployment Complete!
exit /b 0

:fail
echo.
echo ERROR: Deployment failed.
exit /b 1