@echo off
setlocal
cd /d "%~dp0"
if not defined PINPLAY_DESIGN_DIR set "PINPLAY_DESIGN_DIR=%~dp0..\PinPlayCupMediaDesign"

set "STUDIO_PORT_NUM=%STUDIO_PORT%"
if not defined STUDIO_PORT_NUM set STUDIO_PORT_NUM=3005
echo Terminating any existing Studio server on port %STUDIO_PORT_NUM%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%STUDIO_PORT_NUM%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Checking for remote updates in code repo...
git fetch >nul 2>&1
git status -uno | find /i "is behind" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo *** UPDATE AVAILABLE FOR PINPLAY CODE ***
    choice /c YN /m "Pull new code changes from cloud now?"
    if errorlevel 2 goto :skipCodePull
    if errorlevel 1 git pull
    :skipCodePull
)

echo Checking for remote updates in asset repo...
pushd "%PINPLAY_DESIGN_DIR%"
git fetch >nul 2>&1
git status -uno | find /i "is behind" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo *** UPDATE AVAILABLE FOR AVATAR ASSETS ***
    choice /c YN /m "Pull new assets from cloud now?"
    if errorlevel 2 goto :skipAssetPull
    if errorlevel 1 git pull
    :skipAssetPull
)
popd
echo.
echo Building assets...
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
