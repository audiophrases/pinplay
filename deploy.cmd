@echo off
echo Preparing Assets (staging _site)...
rem _site is built afresh each time, so a file deleted from the project stops
rem being published. Local tools and their data never ship: the CodeGraph
rem index (over the 25 MiB asset limit), the Listening Studio (it runs on this
rem computer), the setup wizard's generated files, editor and git settings,
rem and scratch files (test*.js, out*.txt, the REVERT note, t8.mp3).
if exist _site rmdir /s /q _site
mkdir _site
robocopy . _site /S /XD .git .wrangler .codegraph .claude .vscode .githooks node_modules __pycache__ cloudflare tests _site question-bank listening-studio .generated /XF *.cmd *.bat *.sh *.log *.jsonc *.toml *.md .gitignore .gitattributes .wranglerignore test*.js out*.txt REVERT-commit-*.txt t8.mp3 feedback-test.html > nul

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