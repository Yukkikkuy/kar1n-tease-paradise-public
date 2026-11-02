@echo off
:: Double-click may fail without admin. Prefer: right-click → Run as administrator
net session >nul 2>&1
if %errorLevel% NEQ 0 (
  echo Need Administrator. Right-click this file → Run as administrator.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0add-hosts.ps1"
pause
