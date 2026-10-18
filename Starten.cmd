@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_node
if exist "apps\desktop\node_modules\.bin\vite.cmd" goto :start
call npx.cmd --yes pnpm@11.25.0 install --frozen-lockfile
if errorlevel 1 goto :failed
:start
echo Black sheep startet unter http://127.0.0.1:5174
call npx.cmd --yes pnpm@11.25.0 dev
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
