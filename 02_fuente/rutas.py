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
VIALIDADES_MGN2025 = INSUMOS / 'ciga' / 'vialidades_MGN2025.zip'                       # vialidades INEGI 2025 (para migrar en el Lote 5)
PATRIMONIALES_CSV = INSUMOS / 'patrimoniales' / 'salida_publica.csv'                  # SOLO la hoja Salida_Publica del padrón
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

# Página
APP = FUENTE / 'app.html'
LOGO = FUENTE / 'img' / 'logo_inst.png'
INDEX = SITIO / 'index.html'
CALLES_TXT = DATOS / 'calles.txt'        # ejes de calles que la página descarga después del panel (copia de calles.b64)


def exigir(*rutas):
    """Detiene el script con un mensaje claro si falta un insumo."""
    faltan = [str(r.relative_to(RAIZ)) for r in rutas if not Path(r).exists()]
    if faltan:
        raise SystemExit('Faltan insumos:\n  ' + '\n  '.join(faltan) + '\nVer 00_insumos/LEEME.md')
