@echo off
if not exist _site mkdir _site
echo Preparing Assets (staging _site)...
rem Local tool state (the CodeGraph index is over the 25 MiB asset limit) never ships.
if exist _site\.codegraph rmdir /s /q _site\.codegraph
if exist _site\.claude rmdir /s /q _site\.claude
robocopy . _site /S /XD .git .wrangler .codegraph .claude node_modules cloudflare tests _site question-bank /XF *.cmd *.bat *.log *.jsonc *.toml *.md .gitignore .wranglerignore > nul

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