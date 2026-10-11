@echo off
chcp 65001 >nul
rem Instala una sola vez las librerías de Python que usan los scripts.
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py
%PY% -m pip install -r requirements.txt
pause
