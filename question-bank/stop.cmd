@echo off
setlocal enabledelayedexpansion

if "%BANK_BRIDGE_PORT%"=="" set BANK_BRIDGE_PORT=8789

echo Looking for bridge on port %BANK_BRIDGE_PORT%...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BANK_BRIDGE_PORT% " ^| findstr LISTENING') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        set FOUND=1
    ) else (
        echo   ^(failed to kill PID %%a^)
    )
)

if "%FOUND%"=="0" (
    echo No bridge process found on port %BANK_BRIDGE_PORT%.
) else (
    echo Bridge stopped.
)

REM Pause so the user can read the output when double-clicking from Explorer.
if "%~1" neq "--no-pause" pause
