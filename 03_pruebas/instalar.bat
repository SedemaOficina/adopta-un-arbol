@echo off
chcp 65001 >nul
rem Instala una sola vez lo que usan las pruebas: librerías de Python, los navegadores de Playwright (Chromium y Safari/WebKit)
rem y, si Node.js está instalado, axe y Lighthouse (versiones fijas de package-lock.json).
cd /d "%~dp0"
set PYTHONUTF8=1
set PY=python
where python >nul 2>nul || set PY=py
%PY% -m pip install -r requirements.txt
%PY% -m playwright install chromium webkit
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js no está instalado: sin él no corren accesibilidad.py ni lighthouse.py. Se descarga de https://nodejs.org
) else (
  call npm ci
)
pause
