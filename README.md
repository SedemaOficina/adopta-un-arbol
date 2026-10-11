# Guardianes de árboles

Plataforma ciudadana de la Secretaría del Medio Ambiente de la Ciudad de México (Sistema de Información Ambiental). Permite consultar el arbolado de cualquier calle de la Ciudad, ver cómo está la colonia frente al resto (verdor y calor) y convertirse en guardián o guardiana de un árbol del inventario de arbolado urbano, con un reconocimiento para guardar y compartir.

**Estado:** versión de prueba. Etapa 1: sitio estático, sin registro ni datos personales.

## Estructura

| Carpeta | Contenido |
|---|---|
| `10_sitio/` | El sitio que se publica (lo arma `armar.py`; no se edita a mano): `index.html`, `app.css`, `app.js`, `datos/` (colonias, calles y árboles por alcaldía), `img/` (logos) y `vendor/` (librerías y letras) |
| `02_fuente/` | Código fuente de la página: `index.html` (estructura), `css/estilos.css`, `js/` (código por tema: `00_config.js`, `01_utilidades.js` … `99_arranque.js`), `img/`; y los scripts que preparan los datos |
| `03_pruebas/` | Pruebas automáticas de la página (ver `03_pruebas/LEEME.md`) |
| `00_insumos/` | Capas de origen (solo en la copia local; ver `00_insumos/LEEME.md`) y datos intermedios |

## Ver el sitio en la computadora

Doble clic en `10_sitio/abrir-sitio-local.bat` (levanta un servidor local y abre el navegador).

## Reconstruir los datos

1. Instalar Python 3.11 o posterior y, una vez, las librerías: doble clic en `02_fuente/instalar.bat`.
2. Colocar los insumos en `00_insumos/` como indica `00_insumos/LEEME.md`.
3. Doble clic en `02_fuente/construir_datos.bat`. Corre en orden:

| Paso | Script | Hace |
|---|---|---|
| 1 | `leer_inventario.py` | Lee el inventario de arbolado (CSV) |
| 2 | `inventario.py` | Asigna colonia y calle a cada árbol y escribe `10_sitio/datos/` |
| 3 | `patrimoniales.py` | Árboles patrimoniales (solo la hoja pública del padrón) |
| 4 | `temperatura.py` | Temperatura superficial por colonia |
| 5 | `construir_datos.py` | Colonias, calles e indicadores |
| 6 | `armar.py` | Arma `10_sitio/index.html` |

Si solo cambia la página (`02_fuente/index.html`, `css/` o `js/`), basta el paso 6: `python armar.py`. Todas las rutas están en `02_fuente/rutas.py`.

## Probar la página

Las pruebas automáticas están en `03_pruebas/`: abren la página en Chromium y Safari (WebKit), en computadora y en celular, y revisan los flujos, la seguridad, la compatibilidad, la accesibilidad y el PDF. Se instalan una vez con `03_pruebas/instalar.bat` y se corren con `03_pruebas/probar.bat` (o `python probar.py --rapido` para lo esencial). Detalle en `03_pruebas/LEEME.md`.

## Cambiar un texto

Todos los textos que lee la persona están en `02_fuente/textos.js`, ordenados por pantalla. Se edita solo lo que va entre comillas a la derecha (las instrucciones están al principio del archivo) y se corre `python armar.py`, que avisa si falta un texto o si el archivo quedó mal escrito.

## Versión

`VERSION` y `FECHA_VERSION`, al principio de `02_fuente/armar.py`. Se ven al pie de «Cómo funciona» y hacen que el navegador no mezcle archivos de versiones distintas.

## Modo de prueba y modo de producción

`python armar.py` arma la **versión de prueba**: personas guardianas simuladas, aviso «Versión de prueba», casos «Para probar» y ligas para compartir hacia GitHub Pages. `python armar.py --produccion` arma la **versión pública**: sin nada de lo anterior y con ligas hacia `sedema.sia.cdmx.gob.mx/adopta-un-arbol/`. El repositorio guarda siempre la versión de prueba.

## Fuentes

- Inventario de arbolado urbano: SEDEMA y CIGA-UNAM.
- Vialidades: INEGI, Marco Geoestadístico 2020.
- Colonias: SEDEMA.
- Temperatura superficial: World Resources Institute (CC BY 4.0).
- Árboles patrimoniales: Registro de Árboles Patrimoniales de la Ciudad de México (SEDEMA).

Los límites que se muestran en el mapa son de referencia y no tienen carácter oficial.
