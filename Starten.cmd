@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_node
if exist "node_modules\.bin\vite.cmd" goto :start
call npm.cmd ci
if errorlevel 1 goto :failed
:start
call npm.cmd run dev -- --open
if errorlevel 1 goto :failed
exit /b 0
:missing_node
echo Bitte Node.js 24 LTS von https://nodejs.org installieren.
pause
exit /b 1
:failed
echo Der Start ist fehlgeschlagen. Details stehen oben.
pause
exit /b 1
