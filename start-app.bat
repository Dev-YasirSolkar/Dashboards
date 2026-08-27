@echo off
title Forklift Inventory & Dispatch App
echo ========================================================
echo   Starting Forklift Inventory & Site Dispatch System
echo ========================================================
echo.

echo Starting Backend Server on port 5000...
start "Forklift Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 2 >nul

echo Starting Frontend Server on port 5173...
start "Forklift Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 >nul

echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo ========================================================
echo   App is running!
echo   - Backend:  http://localhost:5000
echo   - Frontend: http://localhost:5173
echo ========================================================
