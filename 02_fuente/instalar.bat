@echo off
chcp 65001 >nul
rem Instala una sola vez las librerías de Python que usan los scripts.
cd /d "%~dp0"
rem En Windows, Python escribe en cp1252 si no se le indica: forzar UTF-8 en todos los archivos.
set PYTHONUTF8=1
set PY=python
where python >nul 2>nul || set PY=py
%PY% -m pip install -r requirements.txt
pause
