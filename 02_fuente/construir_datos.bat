@echo off
chcp 65001 >nul
rem Reconstruye los datos y la página de Guardianes de árboles, en orden. Doble clic para correrlo.
rem Necesita los insumos de 00_insumos (ver 00_insumos\LEEME.md) y las librerías de requirements.txt (instalar.bat).
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py
echo.
echo [1/6] Leyendo el inventario de arbolado...
%PY% leer_inventario.py || goto error
echo [2/6] Asignando colonia y calle a cada árbol...
%PY% inventario.py || goto error
echo [3/6] Árboles patrimoniales (hoja Salida_Publica)...
%PY% patrimoniales.py || goto error
echo [4/6] Temperatura por colonia...
%PY% temperatura.py || goto error
echo [5/6] Datos de colonias, calles e indicadores...
%PY% construir_datos.py || goto error
echo [6/6] Armando la página...
%PY% armar.py || goto error
echo.
echo Listo. La página quedó en 10_sitio\index.html y los árboles en 10_sitio\datos\
pause
exit /b 0
:error
echo.
echo Hubo un error en el paso anterior. Lee el mensaje de arriba.
pause
exit /b 1
