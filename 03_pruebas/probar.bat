@echo off
chcp 65001 >nul
rem Corre todas las pruebas de la página (unos 8 minutos) y al final muestra el resumen.
rem Más corto: abrir una terminal aquí y escribir  probar.bat --rapido
cd /d "%~dp0"
set PYTHONUTF8=1
set PY=python
where python >nul 2>nul || set PY=py
%PY% probar.py %*
pause
