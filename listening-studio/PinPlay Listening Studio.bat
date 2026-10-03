@echo off
setlocal
title PinPlay Listening Studio
rem Double-click to open the PinPlay Listening Studio in your browser.
rem It starts the studio quietly (a minimised window), or just opens the page
rem if it is already running. Nothing to type: see LISTENING_STUDIO_PLAN.md.

set "STUDIO=%~dp0"
set "URL=http://127.0.0.1:8790/"
set "HOME_DIR=D:\Admin\pinplay listening tts audio production"
set "VENV=%HOME_DIR%\qwen3\venv"
set "PY=%VENV%\Scripts\python.exe"
set "LOG=%HOME_DIR%\studio-data\studio-log.txt"

rem Already running? Then just open the page.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%URL%api/status' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open

rem First time on this computer: set up the studio's engine (once).
if exist "%PY%" goto ready
echo.
echo  Setting up the PinPlay Listening Studio (only the first time).
echo  This downloads about 2 GB and can take 10 to 20 minutes.
echo.
if not exist "%HOME_DIR%\qwen3" mkdir "%HOME_DIR%\qwen3"
py -3.11 -m venv "%VENV%" 2>nul || python -m venv "%VENV%"
if not exist "%PY%" (
  echo  Python 3.11 was not found on this computer. Please install it from python.org, then try again.
  pause
  exit /b 1
)
"%PY%" -m pip install --upgrade pip
"%PY%" -m pip install -r "%STUDIO%requirements.txt"
if errorlevel 1 (
  echo.
  echo  The setup could not finish. Check the internet connection, then double-click again.
  pause
  exit /b 1
)

:ready
if not exist "%HOME_DIR%\studio-data" mkdir "%HOME_DIR%\studio-data"
rem The studio runs in its own minimised window; closing that window stops it.
start "PinPlay Listening Studio (running - close to stop)" /min cmd /c ""%PY%" "%STUDIO%server.py" > "%LOG%" 2>&1"

rem Wait until it answers (loading takes a few seconds).
powershell -NoProfile -Command "for ($i = 0; $i -lt 90; $i++) { try { Invoke-WebRequest -UseBasicParsing '%URL%api/status' -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1" >nul 2>&1
if errorlevel 1 (
  echo  The studio did not start. Details are in:
  echo  %LOG%
  pause
  exit /b 1
)

:open
rem A desktop icon, the first time.
powershell -NoProfile -Command "$d = [Environment]::GetFolderPath('Desktop'); $l = Join-Path $d 'PinPlay Listening Studio.lnk'; if (-not (Test-Path $l)) { $s = (New-Object -ComObject WScript.Shell).CreateShortcut($l); $s.TargetPath = '%~f0'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.IconLocation = \"$env:SystemRoot\System32\SndVol.exe,0\"; $s.Description = 'PinPlay Listening Studio'; $s.Save() }" >nul 2>&1
start "" "%URL%"
exit /b 0
