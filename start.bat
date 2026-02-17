@echo off
title Movers App Launcher
color 0A

echo ========================================
echo    Movers App - Starting Services
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Django Backend" cmd /k "cd /d C:\transportation_app\backend && .\venv\Scripts\activate && python manage.py runserver"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Server...
start "React Frontend" cmd /k "cd /d C:\transportation_app\frontend && npm run dev"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo    Admin:    http://localhost:8000/admin
echo.
echo ========================================
echo.
echo Press any key to open the app in browser...
pause > nul

start http://localhost:5173
