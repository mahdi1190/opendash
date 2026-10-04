@echo off
REM start-dashboard.bat - the old name of start-opendash.bat. Kept so desktop
REM shortcuts and Windows start-up entries made before the rename keep working:
REM it runs start-opendash.bat from this folder with the same arguments and
REM hands back its exit code. Use start-opendash.bat for anything new.
if not exist "%~dp0start-opendash.bat" (
  echo.
  echo   start-opendash.bat is missing from this folder, so OpenDash cannot start.
  echo.
  if not defined DASHBOARD_NO_PAUSE pause
  exit /b 1
)
call "%~dp0start-opendash.bat" %*
exit /b %ERRORLEVEL%
