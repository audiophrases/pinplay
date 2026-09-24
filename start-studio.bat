@echo off
setlocal
cd /d "%~dp0"
if not defined PINPLAY_DESIGN_DIR set "PINPLAY_DESIGN_DIR=%~dp0..\PinPlayCupMediaDesign"
echo Building local assets only. No automatic pull, sync, commit, push or deployment.
node scripts\build-cup-assets.mjs "%PINPLAY_DESIGN_DIR%" --write-worker
if errorlevel 1 (
 echo Build failed. Studio was not started.
 pause
 exit /b 1
)
node scripts\studio-server.js --open
if errorlevel 1 (
 echo Studio failed to start. Existing servers were not reused or terminated.
 echo Close your old Studio, or set STUDIO_PORT to another port.
 pause
 exit /b 1
)
