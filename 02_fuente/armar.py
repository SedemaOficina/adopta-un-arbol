"""Último paso. Arma el sitio en 10_sitio/ a partir de las piezas de 02_fuente/:
  index.html          <- index.html (estructura de la página), con el modo, la versión y sus textos ({{clave}} desde textos.js)
  textos.js           <- textos.js (todos los textos que lee la persona)
  app.css             <- css/*.css, en orden
  app.js              <- js/00_config.js y, dentro de una sola función (comparten variables), js/01_*.js … js/99_*.js y js/cierre.txt
  datos/colonias.txt  <- meta_g.b64 (colonias e indicadores);  datos/calles.txt <- calles.b64
  img/                <- logo institucional y emblema de Árboles Patrimoniales
La página no lleva código ni estilos dentro del HTML (lista para la política de seguridad del SIA).
Antes de escribir revisa que no falte ningún texto: los {{clave}} del HTML y las claves que pide el código deben estar en textos.js.
Uso:  python armar.py                  -> modo prueba (personas guardianas simuladas, aviso de prueba, «Para probar»)
      python armar.py --produccion     -> modo producción (sin simulación ni avisos de prueba)
      python armar.py --destino <dir>  -> arma en otra carpeta (para pruebas); copia también vendor/ y datos/arboles_*.txt"""
import html as html_mod, json, re, shutil, sys
from pathlib import Path
from rutas import (INDEX_FUENTE, CSS_DIR, JS_DIR, TEXTOS_JS, LOGO, EMBLEMA, META_B64, CALLES_B64, SITIO, exigir)

VERSION, FECHA_VERSION = '27', '11 de octubre de 2026'   # cambiar en cada versión publicada (se ve en el pie de «Cómo funciona»)

exigir(INDEX_FUENTE, CSS_DIR, JS_DIR, TEXTOS_JS, LOGO, EMBLEMA, META_B64, CALLES_B64)
modo = 'produccion' if '--produccion' in sys.argv else 'prueba'
destino = Path(sys.argv[sys.argv.index('--destino') + 1]) if '--destino' in sys.argv else SITIO

def poner(t):
    return t.replace('__MODO__', modo).replace('__VERSION__', VERSION).replace('__FECHA_VERSION__', FECHA_VERSION)

def leer_textos():
    """textos.js -> diccionario (sin comentarios ni comas finales). Si alguien rompe el formato, se dice dónde."""
    t = TEXTOS_JS.read_text(encoding='utf-8')
    t = re.sub(r'/\*.*?\*/', '', t, count=1, flags=re.S)
    t = '\n'.join(l for l in t.split('\n') if not l.lstrip().startswith('//'))
    t = t[t.index('{'):t.rindex('}') + 1]; t = re.sub(r',\s*}', '}', t)
    try: return json.loads(t)
    except json.JSONDecodeError as e: sys.exit(f'textos.js tiene un error de formato cerca de: {t[max(0, e.pos - 80):e.pos + 40]!r}')
TEXTOS = leer_textos()

html = poner(INDEX_FUENTE.read_text(encoding='utf-8'))
faltan = sorted({k for k in re.findall(r'\{\{([\w.]+)\}\}', html) if k not in TEXTOS})
if faltan: sys.exit('Faltan en textos.js: ' + ', '.join(faltan))
html = re.sub(r'\{\{([\w.]+)\}\}', lambda m: html_mod.escape(TEXTOS[m.group(1)], quote=True), html)
if modo == 'produccion':   # quita el aviso «Versión de prueba» y todo lo marcado como solo-prueba
    html = re.sub(r'<!-- solo-prueba[^>]*-->.*?<!-- /solo-prueba -->\n?', '', html, flags=re.S)
css = ''.join(f.read_text(encoding='utf-8') for f in sorted(CSS_DIR.glob('*.css')))
partes = sorted(f for f in JS_DIR.glob('[0-9][0-9]_*.js') if not f.name.startswith('00_'))
js = (poner((JS_DIR / '00_config.js').read_text(encoding='utf-8')) +
      '(async function(){\n"use strict";\n' + ''.join(f.read_text(encoding='utf-8') for f in partes) +
      (JS_DIR / 'cierre.txt').read_text(encoding='utf-8') + '\n')
sobran = [m for m in ('__MODO__', '__VERSION__', '__FECHA_VERSION__') if m in html + js]
if sobran: sys.exit('Faltó reemplazar: ' + ', '.join(sobran))
TEMAS = sorted({k.split('.')[0] for k in TEXTOS})
usadas = set(re.findall(r'"((?:' + '|'.join(TEMAS) + r')\.[a-z0-9_]+)"', js))
if usadas - set(TEXTOS): sys.exit('El código pide textos que no están en textos.js: ' + ', '.join(sorted(usadas - set(TEXTOS))))
if re.search(r'<script>|<style>| style="| on[a-z]+="', html): sys.exit('index.html no debe llevar código, estilos ni manejadores dentro (política de seguridad)')

(destino / 'datos').mkdir(parents=True, exist_ok=True); (destino / 'img').mkdir(exist_ok=True)
(destino / 'index.html').write_text(html, encoding='utf-8', newline='\n')
(destino / 'app.css').write_text(css, encoding='utf-8', newline='\n')
(destino / 'app.js').write_text(js, encoding='utf-8', newline='\n')
shutil.copyfile(TEXTOS_JS, destino / 'textos.js')
shutil.copyfile(META_B64, destino / 'datos' / 'colonias.txt'); shutil.copyfile(CALLES_B64, destino / 'datos' / 'calles.txt')
shutil.copyfile(LOGO, destino / 'img' / 'logo_inst.png'); shutil.copyfile(EMBLEMA, destino / 'img' / 'emblema_patrimoniales.png')
if destino != SITIO:   # copia completa para probar en otra carpeta
    shutil.copytree(SITIO / 'vendor', destino / 'vendor', dirs_exist_ok=True)
    for f in (SITIO / 'datos').glob('arboles_*.txt'): shutil.copyfile(f, destino / 'datos' / f.name)
kb = lambda p: (destino / p).stat().st_size // 1024
print(f'v{VERSION}, modo {modo} -> {destino}: index.html {kb("index.html")} KB, app.css {kb("app.css")} KB, app.js {kb("app.js")} KB, '
      f'textos.js {len(TEXTOS)} textos, datos/colonias.txt {kb("datos/colonias.txt")} KB, datos/calles.txt {kb("datos/calles.txt")} KB')
