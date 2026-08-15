@echo off
echo Starting Next.js server on port 3000...

netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo Port 3000 is already in use. Run stop-server.bat first.
    exit /b 1
)

start "Next.js Server" /min cmd /c "npm run start"
echo Server starting on http://localhost:3000
echo Done.
