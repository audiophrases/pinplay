@echo off
setlocal
cd /d "%~dp0"

echo.
echo [1/3] Syncing latest code and design assets from GitHub ...
git pull --rebase origin main

if exist "C:\Users\Admin\PinPlayCupMediaDesign\.git" (
  echo Syncing PinPlayCupMediaDesign repository...
  pushd "C:\Users\Admin\PinPlayCupMediaDesign"
  git pull --rebase origin main
  popd
) else (
  echo PinPlayCupMediaDesign repo not found locally. Cloning...
  git clone https://github.com/audiophrases/PinPlayCupMediaDesign.git "C:\Users\Admin\PinPlayCupMediaDesign"
)

echo.
echo [2/3] Building local avatar assets...
node scripts\build-cup-assets.mjs "C:\Users\Admin\PinPlayCupMediaDesign" --write-worker

echo.
echo [3/3] Starting PinPlay Cup Local Studio Server...
start "" "C:\Users\Admin\pinplay\avatar-preview.html"
node scripts\studio-server.js
pause
