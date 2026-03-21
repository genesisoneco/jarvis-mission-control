@echo off
setlocal
set "APP_DIR=C:\Users\Richard Yoon\.openclaw\workspace-operator\apps\mission-control"
set "URL=http://127.0.0.1:8787"

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL%==0 (
    start "" "%URL%"
    endlocal
    exit /b 0
)

cd /d "%APP_DIR%"
start "Mission Control Server" cmd /k "cd /d "%APP_DIR%" && set VITE_BASE_PATH=/ && node server.mjs"

powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(15); do { try { $r = Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline); exit 1"

start "" "%URL%"
endlocal
