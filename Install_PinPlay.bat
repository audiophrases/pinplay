@echo off
REM PinPlay one-click installer for Windows.
REM Double-click this file to install PinPlay. It asks Windows for administrator
REM access (needed to install Node.js), then downloads PinPlay and starts the
REM guided setup wizard. No git needed.

REM --- Re-launch this file with administrator rights if we don't have them yet ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator access. Click "Yes" on the Windows prompt...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

REM --- Now running as administrator: download + run the installer ---
echo Running the PinPlay installer with administrator rights...
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/audiophrases/pinplay/main/setup/install.ps1 | iex"
pause
