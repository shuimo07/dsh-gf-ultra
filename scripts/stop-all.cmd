@echo off
setlocal
REM ---- Stop the voice AI girlfriend stack: dsh web (:3080) + voice bridge (:8765) ----
echo Stopping dsh web (:3080) and voice bridge (:8765)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3080" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1 && echo   killed web pid %%p
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3081" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1 && echo   killed test web pid %%p
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8765" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1 && echo   killed bridge pid %%p
echo Done.
endlocal
