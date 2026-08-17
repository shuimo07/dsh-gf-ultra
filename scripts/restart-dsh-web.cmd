@echo off
setlocal
REM ---- dsh web + voice bridge restart (one-click) ----
REM Usage: double-click or run from cmd. Kills the instance on :3080/:3081,
REM (re)starts the voice bridge on :8765, then starts dsh web on :3080.
timeout /t 12 /nobreak >nul
set "NODE=D:\AI\固件\node.exe"
set "DSH_BIN=C:\Users\legion\AppData\Local\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh\lib\bin.js"
set "SCRATCH=E:\AI\dsh-voice-ai-girlfriend\.scratch"
set "VENV_PY=E:\AI\dsh-voice-ai-girlfriend\venv-speech\Scripts\python.exe"
set "BRIDGE_DIR=E:\AI\dsh-voice-ai-girlfriend\bridge"

REM 1) Stop old web instances.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3081" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3080" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1
timeout /t 3 /nobreak >nul

REM 0) Ensure the always-on launcher (:8768) is up.
set HAS_LAUNCHER=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8768" ^| findstr "LISTENING"') do set HAS_LAUNCHER=1
if not "%HAS_LAUNCHER%"=="1" (
  start "launcher" /min "%VENV_PY%" -m uvicorn launcher:app --host 127.0.0.1 --port 8768
  timeout /t 3 /nobreak >nul
)

REM 2) (Re)start the voice bridge if :8765 is not listening.
set HAS_BRIDGE=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8765" ^| findstr "LISTENING"') do set HAS_BRIDGE=1
if not "%HAS_BRIDGE%"=="1" (
  cd /d "%BRIDGE_DIR%"
  set TMP=%SCRATCH%
  set TEMP=%SCRATCH%
  set HF_HOME=%SCRATCH%\hf-home
  set PYTHONIOENCODING=utf-8
  start "voice-bridge" /min "%VENV_PY%" -m uvicorn voice_bridge:app --host 127.0.0.1 --port 8765
)

REM 3) Start dsh web (default host/port 127.0.0.1:3080).
cd /d "C:\Users\legion\AppData\Local\npm-cache\_npx\1e7f6d9597241db0"
start "dsh-web" /min "%NODE%" "%DSH_BIN%" --profile web

endlocal
