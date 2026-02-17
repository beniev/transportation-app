@echo off
title Movers App - Restarting Services
color 0E

echo ========================================
echo    Movers App - Restarting Services
echo ========================================
echo.

echo Stopping services...
echo.

echo Stopping Django Backend...
taskkill /FI "WINDOWTITLE eq Django Backend*" /F >nul 2>&1

echo Stopping React Frontend...
taskkill /FI "WINDOWTITLE eq React Frontend*" /F >nul 2>&1

echo Killing processes on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo Killing processes on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo Killing processes on port 5174 (Frontend alt)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo.
echo Services stopped. Starting services...
echo.

timeout /t 2 /nobreak >nul

echo Starting Django Backend...
start "Django Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo Starting React Frontend...
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo    Services restarted successfully!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
