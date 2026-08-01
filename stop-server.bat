@echo off
echo Stopping Next.js server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    echo Killed PID %%a
)
echo Done.
