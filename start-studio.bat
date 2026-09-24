@echo off
setlocal
cd /d "%~dp0"
if not defined PINPLAY_DESIGN_DIR set "PINPLAY_DESIGN_DIR=%~dp0..\PinPlayCupMediaDesign"

set "STUDIO_PORT_NUM=%STUDIO_PORT%"
if not defined STUDIO_PORT_NUM set STUDIO_PORT_NUM=3005
echo Terminating any existing Studio server on port %STUDIO_PORT_NUM%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%STUDIO_PORT_NUM%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Building local assets only. No automatic pull, sync, commit, push or deployment.
node scripts\build-cup-assets.mjs "%PINPLAY_DESIGN_DIR%" --write-worker
if errorlevel 1 (
 echo Build failed. Studio was not started.
 pause
 exit /b 1
)
node scripts\studio-server.js --open
if errorlevel 1 (
 echo Studio failed to start.
 pause
 exit /b 1
)
