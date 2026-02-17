@echo off
title Movers App - Stopping Services
color 0C

echo ========================================
echo    Movers App - Stopping Services
echo ========================================
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
echo ========================================
echo    All services stopped!
echo ========================================
echo.
pause
