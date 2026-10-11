# Insumos · Guardianes de árboles

Capas y archivos de origen. **Solo en la copia local:** no se publican en GitHub (son pesados o de uso interno). Las rutas exactas están en `02_fuente/rutas.py`; si falta un archivo, el script lo dice y se detiene.

| Ruta | Contenido | Lo usa |
|---|---|---|
| `arbolado/arbolado_cdmx_sep.csv` | Inventario de arbolado urbano del CIGA-UNAM (CSV con `idc`, `lat`, `lng`, `registro`, `uga`, `pano_*`). **Colocarlo a mano** (pesa ~350 MB). Al recibir la entrega final, reemplazarlo con el mismo nombre | `leer_inventario.py` |
| `vialidades/inegi_2020/ejes_vialidad_inegi_2020.zip` | Ejes de vialidad INEGI MGN 2020 (shapefile comprimido; se lee sin descomprimir) | `construir_datos.py` |
| `ciga/LimitesAlcaldia_MGN2025.zip` | Límite de alcaldías MGN 2025, capa que usa el CIGA-UNAM | revisión de la entrega final (pendiente 25) |
| `ciga/vialidades_MGN2025.zip` | Vialidades INEGI MGN 2025, capa que usa el CIGA-UNAM | migración de calles (Lote 5) |
| `ciga/catastro_manzanas/Catastro_CDMX_Manzanas.zip` | Manzanas del Catastro de la Ciudad de México (53 MB), de la liga del anexo I del informe del CIGA-UNAM. Colocarla a mano | `hacer_fondo.py` (fondo del mapa) y revisión de la entrega final |
| `contexto/Inventario de Áreas Verdes 2017.*` | Inventario de Áreas Verdes 2017 de SEDEMA (shapefile, UTF-8). Solo se usan parques, arboledas, alamedas, jardines públicos, vegetación reminiscente, viveros y forestación | `hacer_fondo.py` |
| `contexto/Cuerpos de agua, canales, y tanque regulador.*` | Cuerpos de agua, canales y tanque regulador de SEDEMA (shapefile) | `hacer_fondo.py` |
| `contexto/anp_ava_geometrias.geojson` | Las 66 ANP y AVA oficiales: copia de `data/geometrias.geojson` del proyecto Categorías de protección ambiental (decretos, CONANP y SEDEMA) | `hacer_fondo.py` |
| `patrimoniales/salida_publica.csv` | Copia local de la hoja Salida_Publica del padrón de árboles patrimoniales (nunca la hoja Listado). **No se coloca a mano:** `patrimoniales.py` la descarga en cada corrida de la liga publicada (`PATRIMONIALES_URL` en `02_fuente/rutas.py`) y la guarda aquí; sin internet usa esta copia | `patrimoniales.py` |
| `frentes/frentes_manzanas_verdes.*` | Frentes de manzana INEGI CEU 2020 + SIA. Solo si se quiere recalcular `inegi_fr.npz` | `indicadores_reales.py` (opcional) |
| `colonias/` | `colonias_reforestacion.gpkg` y `alcaldias.geojson`, copiados de MODELO-PRIORIZACION-REFORESTACION | referencia |
| `vialidades/calles.pmtiles` | Teselas de calles (`hacer_pmtiles.py`), para el Lote 6 | sitio |

## intermedios/

Salidas de los scripts. `meta.json`, `fr.pkl` e `inegi_fr.npz` vienen de la preparación de colonias y frentes de Calles prioritarias y no se regeneran aquí.

| Archivo | Lo genera | Sirve para |
|---|---|---|
| `meta.json` | preparación de colonias y frentes (Calles prioritarias) | colonias, alcaldías y nombres de calles |
| `fr.pkl`, `inegi_fr.npz` | frentes de manzana INEGI 2020 | calle de cada árbol e indicadores |
| `inv.pkl` | `leer_inventario.py` | inventario en formato rápido |
| `inventario_meta.json` | `inventario.py` | conteos por colonia y alcaldía |
| `patrimoniales.json` | `patrimoniales.py` | árboles patrimoniales |
| `temperatura.json`, `lst_wri_2023_2025.tif` | `temperatura.py` (WRI) | calor del suelo |
| `meta_g.b64`, `calles.b64` | `construir_datos.py` | datos que `armar.py` mete en la página (estos dos sí van a GitHub) |
