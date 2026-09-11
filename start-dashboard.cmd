@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "PROJECT_ROOT=%~dp0"
set "VENV_PYTHON=%PROJECT_ROOT%.venv\Scripts\python.exe"
set "BACKEND_DIR=%PROJECT_ROOT%backend"

echo Jarvis Dashboard - Startpruefung
echo.

if not exist "%PROJECT_ROOT%package.json" (
    echo [FEHLER] package.json fehlt. Bitte start-dashboard.cmd im Dashboard-Projekt belassen.
    goto :failed
)
if not exist "%BACKEND_DIR%\app\main.py" (
    echo [FEHLER] backend\app\main.py fehlt. Das Backend kann nicht gestartet werden.
    goto :failed
)
if not exist "%VENV_PYTHON%" (
    echo [FEHLER] Die lokale Python-Umgebung .venv fehlt.
    echo Fuehre zuerst die Installationsschritte aus der README aus.
    goto :failed
)

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Node.js wurde nicht gefunden. Installiere Node.js LTS und oeffne das Terminal neu.
    goto :failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] npm wurde nicht gefunden. Repariere oder installiere Node.js LTS erneut.
    goto :failed
)
node.exe -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major >= 23 || (major === 22 && minor >= 13) ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    for /f "delims=" %%V in ('node.exe --version') do set "NODE_VERSION=%%V"
    echo [FEHLER] Node.js !NODE_VERSION! ist zu alt. Benoetigt wird mindestens Node.js 22.13.
    goto :failed
)

"%VENV_PYTHON%" --version >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Python in .venv kann nicht ausgefuehrt werden. Erstelle .venv laut README neu.
    goto :failed
)
if not exist "%PROJECT_ROOT%node_modules\.bin\vinext.cmd" (
    echo [FEHLER] Frontend-Abhaengigkeiten fehlen. Fuehre einmalig "npm install" aus.
    goto :failed
)
"%VENV_PYTHON%" -c "import fastapi, httpx, psutil, pydantic, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Python-Abhaengigkeiten fehlen. Installiere backend\requirements-dev.txt in .venv.
    goto :failed
)

powershell.exe -NoProfile -NonInteractive -Command "$ports = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port; if ($ports -contains 3000) { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Port 3000 ist bereits belegt. Beende den dort laufenden Prozess und versuche es erneut.
    goto :failed
)
powershell.exe -NoProfile -NonInteractive -Command "$ports = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port; if ($ports -contains 8000) { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Port 8000 ist bereits belegt. Beende den dort laufenden Prozess und versuche es erneut.
    goto :failed
)

echo [OK] Alle Dateien, Programme, Abhaengigkeiten und Ports sind bereit.
if /i "%~1"=="--check" (
    echo [OK] Nur-Pruefung abgeschlossen. Es wurden keine Server gestartet.
    exit /b 0
)

echo Starte Backend und Frontend in zwei sichtbaren Terminalfenstern ...
start "Jarvis Backend" /D "%BACKEND_DIR%" cmd.exe /k ""%VENV_PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "Jarvis Frontend" /D "%PROJECT_ROOT%" cmd.exe /k "npm.cmd run dev -- --host 127.0.0.1 --port 3000"

set /a WAIT_COUNT=0
:wait_backend
powershell.exe -NoProfile -NonInteractive -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :wait_frontend_setup
set /a WAIT_COUNT+=1
if !WAIT_COUNT! geq 45 (
    echo [FEHLER] Das Backend war nach 45 Sekunden noch nicht erreichbar.
    echo Pruefe die Meldung im Fenster "Jarvis Backend". Beende beide Server dort mit Strg+C.
    goto :failed
)
ping 127.0.0.1 -n 2 >nul
goto :wait_backend

:wait_frontend_setup
set /a WAIT_COUNT=0
:wait_frontend
powershell.exe -NoProfile -NonInteractive -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :started
set /a WAIT_COUNT+=1
if !WAIT_COUNT! geq 60 (
    echo [FEHLER] Das Frontend war nach 60 Sekunden noch nicht erreichbar.
    echo Pruefe die Meldung im Fenster "Jarvis Frontend". Beende beide Server dort mit Strg+C.
    goto :failed
)
ping 127.0.0.1 -n 2 >nul
goto :wait_frontend

:started
echo.
echo [OK] Das Dashboard ist bereit: http://localhost:3000
echo Zum Beenden in beiden Serverfenstern Strg+C druecken und die Fenster schliessen.
start "" "http://localhost:3000"
exit /b 0

:failed
echo.
echo Das Dashboard wurde nicht gestartet.
pause
exit /b 1
