@echo off
setlocal
REM ---- 小雅 AI 女友 一键启动：LLM + 口型数字人 + 语音桥接 + launcher ----
set "SCRATCH=E:\AI\dsh-voice-ai-girlfriend\.scratch"
set "TMP=%SCRATCH%"
set "TEMP=%SCRATCH%"
set "VENV_PY=E:\AI\dsh-voice-ai-girlfriend\venv-speech\Scripts\python.exe"

REM 0) always-on launcher (:8768) — the one-click on/off controller
set HAS_LAUNCHER=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8768" ^| findstr "LISTENING"') do set HAS_LAUNCHER=1
if not "%HAS_LAUNCHER%"=="1" (
  start "launcher" /min "%VENV_PY%" -m uvicorn launcher:app --host 127.0.0.1 --port 8768
)

REM 1) llama-server (LLM, :8090)
set HAS_LLM=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8090" ^| findstr "LISTENING"') do set HAS_LLM=1
if not "%HAS_LLM%"=="1" (
  start "llama-server" /min "E:\llama-cpp\llama-server.exe" -m "E:\llama-cpp\models\Qwen3-4B-Q4_K_M.gguf" -np 1 -c 8192 -fa on --temp 1.0 --host 0.0.0.0 --port 8090
)

REM 2) LiveTalking (口型数字人, :8010)
set HAS_LT=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8010" ^| findstr "LISTENING"') do set HAS_LT=1
if not "%HAS_LT%"=="1" (
  set PATH=E:\AI\ffmpeg;%PATH%
  set PYTHONIOENCODING=utf-8
  set HF_HOME=%SCRATCH%\hf-home
  start "livetalking" /min cmd /k "cd /d E:\AI\LiveTalking && set PATH=E:\AI\ffmpeg;%PATH% && E:\AI\LiveTalking\.venv-lt\Scripts\python.exe app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1"
)

REM 3) 语音桥接 (STT, :8765)
set HAS_BRIDGE=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8765" ^| findstr "LISTENING"') do set HAS_BRIDGE=1
if not "%HAS_BRIDGE%"=="1" (
  start "voice-bridge" /min cmd /k "cd /d E:\AI\dsh-voice-ai-girlfriend\bridge && set TMP=%SCRATCH% && set TEMP=%SCRATCH% && set HF_HOME=%SCRATCH%\hf-home && set PYTHONIOENCODING=utf-8 && E:\AI\dsh-voice-ai-girlfriend\venv-speech\Scripts\python.exe -m uvicorn voice_bridge:app --host 127.0.0.1 --port 8765"
)

timeout /t 15 /nobreak >nul
start http://127.0.0.1:8010/girlfriend.html
endlocal
