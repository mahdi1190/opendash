@echo off
REM Start OpenDash: check Node, upgrade the data folder if needed, rebuild
REM index.html, then run the server under tools\supervisor.mjs, which starts
REM it again if it crashes and handles Settings > Server > Restart.
REM   start-opendash.bat                        default data folder .\data, port 4173
REM   start-opendash.bat --data-dir D:\dash --port 4300 --no-open
REM DASHBOARD_NO_PAUSE=1 (set by tools\start-hidden.mjs for a window nobody
REM sees) skips the "press a key" pauses.
REM start-dashboard.bat (the old name) is a shim that runs this file.
setlocal
title OpenDash
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed. Install the LTS version ^(20 or newer^) from
  echo   https://nodejs.org and run this again.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)

REM --- Node 20 or newer ------------------------------------------------------
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo.
  for /f "delims=" %%v in ('node -v') do echo   OpenDash needs Node.js 20 or newer. You have %%v.
  echo   Install the LTS version from https://nodejs.org and run this again.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)

REM --- Upgrade the data folder if this version of the app needs it ---------
REM (backs up the data folder first; the one-time copy of an old state\ folder
REM  is never done automatically - it prints the command to run instead)
node tools\migrate.mjs --auto %*
if errorlevel 2 (
  echo.
  echo   OpenDash was NOT started. Run the command above once, then start again.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)
if errorlevel 1 (
  echo.
  echo   A data migration failed - see the error above. Your data folder backup
  echo   is in data\backups\. OpenDash was NOT started.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)

REM --- Rebuild index.html from src\ ---------------------------------------
node build.mjs
if errorlevel 1 (
  echo.
  echo   BUILD FAILED - see the error above.
  echo   OpenDash was NOT started.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)

echo.
echo   Starting OpenDash...
echo   Close this window ^(or press Ctrl+C^) to stop it. If it crashes it is
echo   started again; Settings ^> Server can restart it.
echo.

node tools\supervisor.mjs %*

REM Only hold the window open on a real failure. Exit code 0 covers a normal
REM Ctrl+C / close / Stop server and the "already running, opened it" case;
REM 78 is a set-up problem (port taken, data not moved), 1 = it kept crashing.
if errorlevel 1 (
  echo.
  echo   The server stopped with an error - see above, or data\logs\server.log.
  if not defined DASHBOARD_NO_PAUSE pause
)
endlocal
