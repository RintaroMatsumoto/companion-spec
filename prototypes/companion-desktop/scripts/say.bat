@echo off
chcp 65001 >nul
setlocal
if "%~1"=="" (
  echo usage: say.bat "text" [emotion]
  echo   emotion: calm ^| wry ^| pleased ^| scolding
  exit /b 1
)
set "TEXT=%~1"
set "EMO=%~2"
if "%EMO%"=="" set "EMO=calm"
node "%~dp0say.mjs" "%TEXT%" "%EMO%"
endlocal
