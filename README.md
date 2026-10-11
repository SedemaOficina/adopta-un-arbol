# Guardianes de árboles

Plataforma ciudadana de la Secretaría del Medio Ambiente de la Ciudad de México (Sistema de Información Ambiental). Permite consultar el arbolado de cualquier calle de la Ciudad, ver cómo está la colonia frente al resto (verdor y calor) y convertirse en guardián o guardiana de un árbol del inventario de arbolado urbano, con un reconocimiento para guardar y compartir.

**Estado:** versión de prueba. Etapa 1: sitio estático, sin registro ni datos personales.

## Estructura

| Carpeta | Contenido |
|---|---|
| `10_sitio/` | El sitio que se publica: `index.html`, `datos/` (árboles por alcaldía) y `vendor/` (librerías) |
| `02_fuente/` | Código fuente de la página (`app.html`) y scripts que preparan los datos |
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

Si solo cambia la página (`02_fuente/app.html`), basta el paso 6: `python armar.py`. Todas las rutas están en `02_fuente/rutas.py`.

## Modo de prueba y modo de producción

`python armar.py` arma la **versión de prueba**: personas guardianas simuladas, aviso «Versión de prueba», casos «Para probar» y ligas para compartir hacia GitHub Pages. `python armar.py --produccion` arma la **versión pública**: sin nada de lo anterior y con ligas hacia `sedema.sia.cdmx.gob.mx/adopta-un-arbol/`. El repositorio guarda siempre la versión de prueba.

## Fuentes

- Inventario de arbolado urbano: SEDEMA y CIGA-UNAM.
- Vialidades: INEGI, Marco Geoestadístico 2020.
- Colonias: SEDEMA.
- Temperatura superficial: World Resources Institute (CC BY 4.0).
- Árboles patrimoniales: Registro de Árboles Patrimoniales de la Ciudad de México (SEDEMA).

Los límites que se muestran en el mapa son de referencia y no tienen carácter oficial.
