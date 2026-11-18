@echo off
setlocal
cd /d "%~dp0"
title PinPlay exam mode tester

where node >nul 2>&1
if errorlevel 1 goto noNode

echo Starting the exam mode tester...
echo.
echo If Windows asks whether Node.js may use the network,
echo tick "Private networks" and click Allow, or the Chromebook can't connect.
echo.
node exam-mode-tester\server.js --open
echo.
echo The tester has stopped.
pause
exit /b 0

:noNode
echo Node.js is not installed on this computer, so the tester can't run.
echo Install it from https://nodejs.org and try again.
pause
exit /b 1
