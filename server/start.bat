@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
)
if not exist .env (
  echo Missing .env — copy .env.example to .env and fill MySQL credentials.
  pause
  exit /b 1
)
echo Starting Jiang Hu portfolio on http://localhost:3000
call npm.cmd start
pause
