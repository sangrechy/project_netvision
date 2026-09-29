@echo off
title NetVision V2 — Launcher
color 0b

echo ============================================================
echo           NETVISION V2 — STARTUP LAUNCHER
echo      Neumorphic Cross-Platform Hotspot Intelligence
echo ============================================================
echo.

cd /d "%~dp0"

:: Ensure Node is in PATH for this session if in C:\devtools\node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\devtools\node\node.exe" (
        set "PATH=C:\devtools\node;%PATH%"
    )
)

echo [1/2] Starting NetVision V2 Backend (Port 3001)...
start "NetVision V2 - Backend" cmd /k "cd /d ""%~dp0backend"" && set ""PATH=C:\devtools\node;%%PATH%%"" && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting NetVision V2 Frontend (Port 5173)...
start "NetVision V2 - Frontend" cmd /k "cd /d ""%~dp0frontend"" && set ""PATH=C:\devtools\node;%%PATH%%"" && node node_modules\vite\bin\vite.js --host"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   ✔ NetVision V2 is now running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3001
echo ============================================================
echo.

:: Open browser automatically
start http://localhost:5173

exit
