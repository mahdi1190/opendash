@echo off
REM Syntax-check every script block that build.mjs puts into index.html:
REM the concatenated src\app\*.js bundle, src\motion.js and the Finances view
REM (src\finance\*.js, concatenated into one IIFE).
setlocal
cd /d "%~dp0"
node build.mjs --syntax
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Syntax check FAILED. See node output above.
  exit /b %ERRORLEVEL%
)
endlocal
