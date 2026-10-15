@echo off
rem Run the website locally: installs packages on first run, starts the dev
rem server, and opens http://localhost:3000 in your browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages ^(first run only^)...
  call npm install || exit /b 1
)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
call npm run dev
