@echo off
setlocal
set "BRIDGE=%~dp0qboard-rawinput-bridge.ps1"

if not exist "%BRIDGE%" (
  echo Q-board bridge script was not found beside this launcher.
  echo Please extract every file from qboard-rawinput-bridge.zip first.
  pause
  exit /b 1
)

start "" powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%BRIDGE%" -AllowedOrigin "https://cbv-deux.github.io"
