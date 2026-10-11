@echo off
chcp 65001 >nul
rem Reconstruye los datos y la página de Guardianes de árboles, en orden. Doble clic para correrlo.
rem Necesita los insumos de 00_insumos (ver 00_insumos\LEEME.md) y las librerías de requirements.txt (instalar.bat).
cd /d "%~dp0"
rem En Windows, Python escribe en cp1252 si no se le indica: forzar UTF-8 en todos los archivos.
set PYTHONUTF8=1
set PY=python
where python >nul 2>nul || set PY=py
echo.
echo [1/7] Leyendo el inventario de arbolado...
%PY% leer_inventario.py || goto error
echo [2/7] Asignando colonia y calle a cada árbol...
%PY% inventario.py || goto error
echo [3/7] Árboles patrimoniales (descarga la hoja Salida_Publica publicada)...
%PY% patrimoniales.py || goto error
echo [4/7] Temperatura por colonia...
%PY% temperatura.py || goto error
echo [5/7] Datos de colonias, calles e indicadores...
%PY% construir_datos.py || goto error
echo [6/7] Fondo del mapa: manzanas, parques, áreas protegidas y agua...
%PY% hacer_fondo.py || goto error
echo [7/7] Armando la página...
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
