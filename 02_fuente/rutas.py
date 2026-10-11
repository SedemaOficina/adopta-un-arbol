"""Rutas del proyecto, relativas a la carpeta adopta-un-arbol (funciona en cualquier computadora).
Todos los scripts de 02_fuente las toman de aquí; si un insumo cambia de nombre, se cambia solo en este archivo."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
INSUMOS = RAIZ / '00_insumos'
INTER = INSUMOS / 'intermedios'          # salidas intermedias de los scripts (no se publican)
FUENTE = RAIZ / '02_fuente'
SITIO = RAIZ / '10_sitio'
DATOS = SITIO / 'datos'                  # árboles por alcaldía que la página descarga al abrir cada una

# Insumos de origen (pesados: se quedan en la copia local, no van a GitHub)
ARBOLADO_CSV = INSUMOS / 'arbolado' / 'arbolado_cdmx_sep.csv'                          # inventario del CIGA-UNAM
EJES_2020 = INSUMOS / 'vialidades' / 'inegi_2020' / 'ejes_vialidad_inegi_2020.zip'      # ejes de vialidad INEGI MGN 2020
LIMITES_MGN2025 = INSUMOS / 'ciga' / 'LimitesAlcaldia_MGN2025.zip'                    # límite de alcaldías que usa el CIGA
VIALIDADES_MGN2025 = INSUMOS / 'ciga' / 'vialidades_MGN2025.zip'                       # vialidades INEGI MGN 2025: las calles del sitio desde v28f (vialidades.py)
PATRIMONIALES_CSV = INSUMOS / 'patrimoniales' / 'salida_publica.csv'                  # copia local de la hoja (la escribe patrimoniales.py)
# Fuente de los árboles patrimoniales (decisión de Liber, 11 oct 2026): SOLO la hoja Salida_Publica del padrón, publicada como CSV.
# patrimoniales.py la descarga en cada corrida; si no hay internet, usa la copia local.
PATRIMONIALES_URL = ('https://docs.google.com/spreadsheets/d/e/2PACX-1vTb8DIn-UxYrBo-k91vleNcsfQoMVlQjtWp4YurZHgeh-_p0pSWLt-yeWS86wKybtQfj1D4wveAEtyw'
                     '/pub?gid=283285465&single=true&output=csv')
FRENTES_SHP = INSUMOS / 'frentes' / 'frentes_manzanas_verdes'                          # frentes INEGI CEU 2020 + SIA (solo para indicadores_reales.py)
LST_TIF = INTER / 'lst_wri_2023_2025.tif'                                              # temperatura superficial WRI (CC BY 4.0)

# Intermedios
META = INTER / 'meta.json'
FRENTES_PKL = INTER / 'fr.pkl'
INDICADORES_NPZ = INTER / 'inegi_fr.npz'
INV_PKL = INTER / 'inv.pkl'
INV_META = INTER / 'inventario_meta.json'
TEMPERATURA = INTER / 'temperatura.json'
PATRIMONIALES = INTER / 'patrimoniales.json'
META_B64 = INTER / 'meta_g.b64'
CALLES_B64 = INTER / 'calles.b64'

# Página (piezas en 02_fuente; armar.py las junta en 10_sitio)
INDEX_FUENTE = FUENTE / 'index.html'   # estructura de la página
CSS_DIR = FUENTE / 'css'               # estilos, se juntan en orden en app.css
JS_DIR = FUENTE / 'js'                 # código por tema (00_config, 01_utilidades … 99_arranque), se junta en app.js
TEXTOS_JS = FUENTE / 'textos.js'       # todos los textos que lee la persona
LOGO = FUENTE / 'img' / 'logo_inst.png'          # logo institucional (copia reducida de img/marca/logo-institucional-media.png)
EMBLEMA = FUENTE / 'img' / 'marca' / 'emblema-media.png'   # emblema de Árboles Patrimoniales
ICONOS = FUENTE / 'img' / 'iconos'   # ícono de la pestaña y de la pantalla de inicio (lo hace hacer_imagenes.py)
TARJETA = FUENTE / 'img' / 'tarjeta.jpg'   # imagen al compartir la liga, 1200 × 630 (la hace hacer_imagenes.py)
INDEX = SITIO / 'index.html'
CALLES_TXT = DATOS / 'calles.txt'        # ejes de calles que la página descarga después del panel (copia de calles.b64)


def exigir(*rutas):
    """Detiene el script con un mensaje claro si falta un insumo."""
    faltan = [str(r.relative_to(RAIZ)) for r in rutas if not Path(r).exists()]
    if faltan:
        raise SystemExit('Faltan insumos:\n  ' + '\n  '.join(faltan) + '\nVer 00_insumos/LEEME.md')


def leer_textos():
    """02_fuente/textos.js -> diccionario (sin comentarios ni comas finales). Si alguien rompe el formato, se dice dónde."""
    import json, re
    t = TEXTOS_JS.read_text(encoding='utf-8')
    t = re.sub(r'/\*.*?\*/', '', t, count=1, flags=re.S)
    t = '\n'.join(l for l in t.split('\n') if not l.lstrip().startswith('//'))
    t = t[t.index('{'):t.rindex('}') + 1]; t = re.sub(r',\s*}', '}', t)
    try: return json.loads(t)
    except json.JSONDecodeError as e: raise SystemExit(f'textos.js tiene un error de formato cerca de: {t[max(0, e.pos - 80):e.pos + 40]!r}')
