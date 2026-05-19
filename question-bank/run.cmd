@echo off
setlocal
cd /d "%~dp0"

echo.
echo === PinPlay Question Bank Bridge ===
echo.

REM Make sure runtime deps are installed (quiet, idempotent).
py -3.11 -m pip install --quiet --disable-pip-version-check fastapi uvicorn >nul 2>nul
if errorlevel 1 (
    echo Failed to install fastapi/uvicorn. Try manually:
    echo     py -3.11 -m pip install fastapi uvicorn
    exit /b 1
)

REM Port can be overridden via BANK_BRIDGE_PORT.
if "%BANK_BRIDGE_PORT%"=="" set BANK_BRIDGE_PORT=8789

echo Listening on http://127.0.0.1:%BANK_BRIDGE_PORT%
echo Ctrl+C to stop.
echo.

py -3.11 -m uvicorn bridge:app --host 127.0.0.1 --port %BANK_BRIDGE_PORT%
