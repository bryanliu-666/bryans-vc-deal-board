@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run VC Deal Board.
  echo Download it from https://nodejs.org, then open this file again.
  pause
  exit /b 1
)

if not exist "node_modules\exceljs" (
  echo Preparing VC Deal Board for first use...
  call npm install
  if errorlevel 1 (
    echo Setup did not finish. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

call npm start
