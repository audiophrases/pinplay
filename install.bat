@echo off
REM PinPlay one-click installer for Windows.
REM Double-click this file (or run it) to install PinPlay. It launches PowerShell,
REM downloads the setup script, and starts the guided wizard. No git needed.
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/audiophrases/pinplay/main/setup/install.ps1 | iex"
pause
