@echo off
rem Abre el sitio con un servidor local (doble clic). Cierra la ventana negra para detenerlo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1"
