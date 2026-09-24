@echo off
setlocal
cd /d "%~dp0"
echo Starting PinPlay Cup Local Studio Server...
start "" http://localhost:3005/
node scripts\studio-server.js
pause
