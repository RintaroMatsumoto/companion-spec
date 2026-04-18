@echo off
REM companion-desktop prototype — Windows launcher.
REM
REM Prereqs:
REM   1. Node 18+ installed and on PATH
REM   2. VOICEVOX running (http://127.0.0.1:50021)
REM   3. avatars\companion.vrm present (run: node scripts\download-avatar.mjs)

setlocal
cd /d "%~dp0.."

set PORT=5173

REM --- VOICEVOX reachability hint ---
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:50021/version -TimeoutSec 2; Write-Host '[companion] VOICEVOX ok:' $r.Content.Trim() } catch { Write-Host '[companion] WARNING: VOICEVOX not reachable at 127.0.0.1:50021 — start VOICEVOX first.' }"

REM --- Install deps if missing ---
if not exist "node_modules" (
  echo [companion] installing dependencies...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [companion] npm install failed.
    exit /b 1
  )
)

REM --- Avatar check ---
if not exist "avatars\companion.vrm" (
  echo [companion] avatars\companion.vrm is missing — fetching sample...
  node scripts\download-avatar.mjs
)

REM --- Start server in a new window ---
start "companion-server" cmd /c "node server\index.js"

REM --- Wait briefly, then open Chrome app-mode ---
timeout /t 2 /nobreak >nul

REM Try common Chrome locations.
set CHROME=""
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set CHROME="%LocalAppData%\Google\Chrome\Application\chrome.exe"

if %CHROME%=="" (
  echo [companion] Chrome not found. Open http://localhost:%PORT%/ manually.
) else (
  start "" %CHROME% --app=http://localhost:%PORT%/ --window-size=480,720 --disable-features=TranslateUI
)

echo [companion] launched. Close the server window to stop.
endlocal
