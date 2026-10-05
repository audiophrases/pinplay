@echo off
setlocal
title PinPlay Listening Studio
rem Double-click to open the PinPlay Listening Studio in your browser.
rem It starts the studio quietly (a minimised window), or just opens the page
rem if it is already running. Nothing to type: see LISTENING_STUDIO_PLAN.md.

set "STUDIO=%~dp0"
set "URL=http://127.0.0.1:8790/"

rem Where this computer keeps the studio's engine and recordings (about 10 GB).
rem The usual folder is on D:; a computer that can't write there (another
rem layout, a protected drive) is asked once, and the answer is remembered in
rem studio-home.txt next to this file.
set "HOME_FILE=%STUDIO%studio-home.txt"
set "HOME_DIR="
if exist "%HOME_FILE%" set /p HOME_DIR=<"%HOME_FILE%"
if defined HOME_DIR call :can_write "%HOME_DIR%" || set "HOME_DIR="
if not defined HOME_DIR call :choose_home
if not defined HOME_DIR exit /b 1
set "VENV=%HOME_DIR%\qwen3\venv"
set "PY=%VENV%\Scripts\python.exe"
set "LOG=%HOME_DIR%\studio-data\studio-log.txt"
rem server.py reads its folder from this.
set "PINPLAY_STUDIO_HOME=%HOME_DIR%"

rem Already running? Then just open the page.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%URL%api/status' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open

rem First time on this computer: set up the studio's engine (once).
if exist "%PY%" goto ready
echo.
echo  Setting up the PinPlay Listening Studio (only the first time).
echo  Folder: %HOME_DIR%
echo  This downloads about 2 GB and can take 10 to 20 minutes.
echo.
call :check_memory || exit /b 1
call :find_python311
if not defined PY311 (
  echo  Python 3.11 was not found on this computer. Please install Python 3.11 from python.org, then try again.
  pause
  exit /b 1
)
if not exist "%HOME_DIR%\qwen3" mkdir "%HOME_DIR%\qwen3"
"%PY311%" -m venv "%VENV%"
if not exist "%PY%" (
  echo  The studio's Python could not be set up in:
  echo  %VENV%
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


rem ---------------------------------------------------------------- helpers

rem The usual folder when this computer can write there; otherwise ask.
:choose_home
set "DEFAULT_HOME=D:\Admin\pinplay listening tts audio production"
set "SUGGEST=C:\PinPlay Listening Studio"
call :can_write "%DEFAULT_HOME%"
if not errorlevel 1 (
  set "HOME_DIR=%DEFAULT_HOME%"
  goto save_home
)
echo.
echo  Where should the studio keep its engine and recordings (about 10 GB)?
echo  The usual folder can't be used on this computer:
echo  %DEFAULT_HOME%
:ask_home
set "HOME_DIR="
set /p "HOME_DIR= Folder [press Enter for %SUGGEST%]: "
if not defined HOME_DIR set "HOME_DIR=%SUGGEST%"
set "HOME_DIR=%HOME_DIR:"=%"
call :can_write "%HOME_DIR%"
if errorlevel 1 (
  echo  That folder can't be written to. Try another drive or folder.
  goto ask_home
)
:save_home
> "%HOME_FILE%" echo %HOME_DIR%
exit /b 0

rem Exit code 0 when the folder exists (or can be made) and accepts a file.
:can_write
if not exist "%~1\" mkdir "%~1" >nul 2>&1
if not exist "%~1\" exit /b 1
type nul > "%~1\.pinplay-write-test" 2>nul
if not exist "%~1\.pinplay-write-test" exit /b 1
del "%~1\.pinplay-write-test" >nul 2>&1
exit /b 0

rem PY311: an installed Python 3.11. The Python launcher lists every Python on
rem the computer, including ones installed by uv (not found by "py -3.11").
:find_python311
set "PY311="
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$p = (py -0p 2>$null) | Where-Object { $_ -match '3\.11' } | ForEach-Object { ($_.Trim() -split '\s+')[-1] } | Where-Object { Test-Path $_ } | Select-Object -First 1; if ($p) { $p }"`) do set "PY311=%%p"
if defined PY311 exit /b 0
for /f "usebackq delims=" %%v in (`python -c "import sys; print(sys.version_info[:2] == (3, 11))" 2^>nul`) do if "%%v"=="True" set "PY311=python"
exit /b 0

rem The voice model needs about 7 GB of memory on its own: say so before the
rem 2 GB download on a computer with less than 12 GB.
:check_memory
set "RAM_GB="
for /f "usebackq delims=" %%m in (`powershell -NoProfile -Command "[math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB)"`) do set "RAM_GB=%%m"
if not defined RAM_GB exit /b 0
if %RAM_GB% GEQ 12 exit /b 0
echo  This computer has %RAM_GB% GB of memory. The studio's voice model needs about
echo  7 GB on its own, so here it may be very slow or stop with an error.
echo  A computer with 16 GB works well.
echo.
choice /c YN /m " Install anyway"
if errorlevel 2 exit /b 1
echo.
exit /b 0
