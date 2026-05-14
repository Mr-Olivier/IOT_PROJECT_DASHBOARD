@echo off
title AquaSense IoT — Start Everything
color 0A

echo.
echo  ==============================================================
echo   AquaSense IoT  —  Smart Irrigation System
echo   Starting all services: Dashboard, ML Service, Serial Bridge
echo  ==============================================================
echo.

:: ── 1. Start Next.js dashboard ──────────────────────────────────
echo  [1/3]  Starting Next.js Dashboard (port 3000)...
start "AquaSense Dashboard" cmd /k "cd /d "%~dp0" && echo. && echo  AquaSense Dashboard - http://localhost:3000 && echo. && npm run dev"

:: Give Next.js 8 seconds to begin compiling
timeout /t 8 /nobreak > nul

:: ── 2. Start Python ML service (FastAPI on port 5001) ───────────
echo  [2/3]  Starting ML Service (port 5001)...
echo         NOTE: First run trains the model — takes ~20 seconds.
start "AquaSense ML Service" cmd /k "cd /d "%~dp0" && echo. && echo  AquaSense ML Service - http://localhost:5001/status && echo. && "C:\Program Files\Python312\python.exe" ml_service/main.py"

:: Wait 25 seconds so training finishes before the bridge starts
echo         Waiting 25s for model training to complete...
timeout /t 25 /nobreak > nul

:: ── 3. Start Python serial bridge ───────────────────────────────
echo  [3/3]  Starting Serial Bridge (COM8)...
start "AquaSense Serial Bridge" cmd /k "cd /d "%~dp0" && echo. && echo  AquaSense Serial Bridge && echo. && "C:\Program Files\Python312\python.exe" serial_bridge/bridge.py"

:: Open dashboard after 5 more seconds
timeout /t 5 /nobreak > nul
start http://localhost:3000

echo.
echo  ==============================================================
echo   All services started!
echo.
echo   Dashboard    ->  http://localhost:3000
echo   ML Status    ->  http://localhost:5001/status
echo   ML Decision  ->  IRRIGATE when soil ^< 65%%  (pump ON)
echo                    HOLD     when soil ^>= 65%% (pump OFF)
echo                    LOW_WATER when reservoir ^< 15%% (pump OFF)
echo.
echo   HOW IT WORKS:
echo   Arduino sends sensor data every 2s (DATA: line)
echo   Bridge reads  ->  saves to DB  ->  asks ML /predict
echo   ML returns IRRIGATE / HOLD / LOW_WATER + confidence
echo   Bridge sends CMD:PUMP=1:IRRIGATE or CMD:PUMP=0:HOLD
echo   Arduino relay turns pump ON or OFF immediately
echo   Dashboard refreshes every 3s showing the live decision
echo.
echo   To stop: close the three terminal windows
echo  ==============================================================
echo.
pause
