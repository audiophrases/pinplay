@echo off
setlocal
REM PinPlay Cup: rebuild art from the design folder, sync the server's avatar
REM part counts, publish the site files and deploy the Cloudflare worker.
REM   update-cup-assets.bat                 (uses the default design folder)
REM   update-cup-assets.bat "D:\OtherDesignFolder"
REM Only generated files are committed (avatars, chests, icons, logo, fx, worker.js).
REM Sounds in cup\sounds are never touched here.

cd /d "%~dp0"
set "DESIGN=%~1"
if "%DESIGN%"=="" set "DESIGN=C:\Users\Admin\PinPlayCupMediaDesign"

echo [1/5] Starting Local Studio Server in background...
start /b node scripts\studio-server.js

echo.
echo [2/5] Syncing and committing design assets...
if exist "%DESIGN%\.git" (
  pushd "%DESIGN%"
  git add -A
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "chore(design): update assets before deploy"
    git push origin main
  )
  popd
)

echo.
echo [3/5] Building PinPlay Cup assets from "%DESIGN%" ...
node scripts\build-cup-assets.mjs "%DESIGN%" --write-worker
if errorlevel 1 goto :fail

echo.
echo [4/5] Committing generated code files ...
git add cup/avatar-parts.js cup/chests cup/icons cup/logo cup/fx avatar-preview.html scripts/build-cup-assets.mjs scripts/studio-server.js start-studio.bat update-cup-assets.bat
git add -f cloudflare/worker.js
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "chore(cup): rebuild PinPlay Cup assets from design packs"
  if errorlevel 1 goto :fail
) else (
  echo     No changes to commit.
)

echo.
echo [5/5] Pushing code to GitHub ...
git push origin main
if errorlevel 1 goto :fail

echo.
echo [4/4] Deploying the Cloudflare worker ...
cd /d "%~dp0cloudflare"
REM Prefer the installer's pinned wrangler (the npx cache is unreliable here).
set "WRANGLER=%~dp0setup\.generated\wrangler\node_modules\.bin\wrangler.cmd"
if exist "%WRANGLER%" (
  call "%WRANGLER%" deploy --config wrangler.toml
) else (
  call npx wrangler deploy --config wrangler.toml
)
if errorlevel 1 goto :fail

echo.
echo Done. Site files pushed and worker deployed.
pause
exit /b 0

:fail
echo.
echo *** Something failed - see the messages above. Nothing after that step ran.
pause
exit /b 1
