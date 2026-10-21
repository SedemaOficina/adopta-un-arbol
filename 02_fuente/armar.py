"""Último paso. Arma el sitio en 10_sitio/ a partir de las piezas de 02_fuente/:
  index.html          <- index.html (estructura de la página), con el modo, la versión y sus textos ({{clave}} desde textos.js)
  textos.js           <- textos.js (todos los textos que lee la persona)
  app.css             <- css/*.css, en orden
  app.js              <- js/00_config.js y, dentro de una sola función (comparten variables), js/01_*.js … js/99_*.js y js/cierre.txt
  datos/colonias.txt  <- meta_g.b64 (colonias e indicadores);  datos/calles.txt <- calles.b64
  img/                <- logo institucional, emblema de Árboles Patrimoniales, íconos y tarjeta para compartir (los hace hacer_imagenes.py)
La página no lleva código ni estilos dentro del HTML (lista para la política de seguridad del SIA).
Antes de escribir revisa que no falte ningún texto: los {{clave}} del HTML y las claves que pide el código deben estar en textos.js.
v31d (Lote 7): cada archivo se pide con la huella de su contenido (?v=<huella>): las ligas de index.html las pone este script y las que
pide el código salen de CONFIG.HUELLAS. En producción quita lo marcado solo-prueba en index.html, app.css y app.js.
Uso:  python armar.py                  -> modo prueba (personas guardianas simuladas, aviso de prueba, «Para probar»)
      python armar.py --produccion --destino <dir> -> modo producción (sin simulación ni avisos de prueba), siempre en otra carpeta:
                                       10_sitio/ es lo que publica GitHub Pages y va siempre en modo prueba (v30)
      python armar.py --destino <dir>  -> arma en otra carpeta (para pruebas); copia también vendor/ y datos/arboles_*.txt"""
import hashlib, html as html_mod, json, re, shutil, subprocess, sys
from pathlib import Path
from rutas import (INDEX_FUENTE, CSS_DIR, JS_DIR, TEXTOS_JS, LOGO, EMBLEMA, ICONOS, TARJETA, META_B64, CALLES_B64, SITIO, exigir, leer_textos, marcas_cambiadas)

VERSION, FECHA_VERSION = '32b', '20 de octubre de 2026'   # cambiar en cada versión publicada (se ve en el pie de «Cómo funciona»)

exigir(INDEX_FUENTE, CSS_DIR, JS_DIR, TEXTOS_JS, LOGO, EMBLEMA, ICONOS / 'icono.svg', ICONOS / 'icono-32.png', ICONOS / 'icono-180.png', META_B64, CALLES_B64)
modo = 'produccion' if '--produccion' in sys.argv else 'prueba'
destino = Path(sys.argv[sys.argv.index('--destino') + 1]) if '--destino' in sys.argv else SITIO
# v30 (auditoría): el modo producción nunca se arma en 10_sitio/: si se subiera por error, GitHub Pages publicaría un sitio sin aviso de
# prueba, sin «noindex» y con QR y ligas a la dirección del SIA, que aún no existe (los reconocimientos quedarían con un QR roto).
if modo == 'produccion' and destino.resolve() == SITIO.resolve():
    sys.exit('El modo producción se arma en otra carpeta: python armar.py --produccion --destino <carpeta> (10_sitio/ va siempre en modo prueba).')

# Dirección pública del sitio en cada modo: la misma de js/00_config.js (liga para compartir, QR y etiquetas para redes)
URL_SITIO = re.search(modo + r':\s*\{URL_SITIO:\s*"([^"]+)"', (JS_DIR / '00_config.js').read_text(encoding='utf-8')).group(1)

def poner(t):
    return t.replace('__URL_SITIO__', URL_SITIO).replace('__MODO__', modo).replace('__VERSION__', VERSION).replace('__FECHA_VERSION__', FECHA_VERSION)

TEXTOS = leer_textos()
# v30 (auditoría): textos.js lo puede editar cualquier persona; se revisa que no se pierdan sus marcas. Los mensajes para compartir deben
# llevar la liga, y si un texto cambió sus {marcas} respecto a lo guardado en git, se avisa (el código las llena por nombre).
sin_liga = [k for k, v in TEXTOS.items() if re.match(r'compartir\.(ya_soy|invitar_)', k) and '{LIGA}' not in v]
if sin_liga: sys.exit('Estos textos para compartir perdieron {LIGA}: ' + ', '.join(sin_liga))
# v32 (auditoría del 20 oct, A5-01): esta revisión nunca había avisado (a su expresión le faltaba una diagonal invertida y un «except»
# general callaba el error). Ahora lee la versión guardada con el mismo lector de textos.js; solo se salta si no hay git o no hay versión guardada.
try: antes = subprocess.run(['git', 'show', 'HEAD:02_fuente/textos.js'], capture_output=True, cwd=TEXTOS_JS.parent, encoding='utf-8')
except OSError: antes = None
if antes is not None and antes.returncode == 0:
    for k, v0, v1 in marcas_cambiadas(leer_textos(antes.stdout), TEXTOS): print(f'  AVISO: el texto «{k}» cambió sus marcas: {v0} → {v1}')

# Totales de control (CLAUDE.md). Si cambian los datos a propósito (capa final del inventario), se actualizan aquí.
TOTALES_ESPERADOS = {'árboles': 961_318, 'ejes de calles': 177_715, 'colonias en el catálogo': 2_244, 'alcaldías': 16, 'archivos de árboles': 16}
def revisar_totales():
    import base64, gzip
    P = json.loads(gzip.decompress(base64.b64decode(META_B64.read_text().strip())))
    raw = gzip.decompress(base64.b64decode(CALLES_B64.read_text().strip())); r = sh = i = 0
    while True:
        b = raw[i]; i += 1; r += (b & 0x7f) << sh; sh += 7
        if not b & 0x80: break
    hay = {'árboles': sum(x['arb'] for x in P['inv']['alc'].values()), 'ejes de calles': r // 2, 'colonias en el catálogo': len(P['colonias']),
           'alcaldías': len(P['alc']), 'archivos de árboles': len(list((SITIO / 'datos').glob('arboles_*.txt')))}
    dif = {k: (v, TOTALES_ESPERADOS[k]) for k, v in hay.items() if v != TOTALES_ESPERADOS[k]}
    print('Totales:', ' · '.join(f'{v:,} {k}' for k, v in hay.items()) + ('  (iguales a los de control)' if not dif else ''))
    for k, (v, e) in dif.items(): print(f'  AVISO: {k}: {v:,} (los de control dicen {e:,}). Si el cambio es a propósito, actualiza TOTALES_ESPERADOS en armar.py y CLAUDE.md.')
revisar_totales()

html = poner(INDEX_FUENTE.read_text(encoding='utf-8'))
faltan = sorted({k for k in re.findall(r'\{\{([\w.]+)\}\}', html) if k not in TEXTOS})
if faltan: sys.exit('Faltan en textos.js: ' + ', '.join(faltan))
html = re.sub(r'\{\{([\w.]+)\}\}', lambda m: html_mod.escape(TEXTOS[m.group(1)], quote=True), html)
if modo == 'produccion':   # v30d: notas internas que no deben llegar al sitio del SIA (pendientes 14 y 15)
    for k, v in TEXTOS.items():
        if re.search(r'por definir|por validar', v, re.I): print(f'  AVISO (producción): el texto «{k}» es una nota interna: «{v}»')
css = ''.join(f.read_text(encoding='utf-8') for f in sorted(CSS_DIR.glob('*.css')))
partes = sorted(f for f in JS_DIR.glob('[0-9][0-9]_*.js') if not f.name.startswith('00_'))
codigo = ''.join(f.read_text(encoding='utf-8') for f in partes)

# v31d (Lote 7): lo marcado solo-prueba (aviso «Versión de prueba», simulación de personas guardianas, «Para probar» y ganchos de
# 03_pruebas) no llega a producción. Las marcas van en pares y sin anidar (se revisa también en modo prueba, para que no falle al entregar).
def sin_prueba(t, abre, cierra, donde):
    marcas = sorted([(m.start(), 'abre') for m in re.finditer(re.escape(abre), t)] + [(m.start(), 'cierra') for m in re.finditer(re.escape(cierra), t)])
    if [k for _, k in marcas] != ['abre', 'cierra'] * (len(marcas) // 2):
        sys.exit(f'Marcas solo-prueba disparejas en {donde}: cada «{abre}» necesita su «{cierra}», sin una dentro de otra.')
    return re.sub(r'[ \t]*' + re.escape(abre) + r'.*?' + re.escape(cierra) + r'[ \t]*\n?', '', t, flags=re.S)
limpios = (sin_prueba(html, '<!-- solo-prueba', '<!-- /solo-prueba -->', 'index.html'),
           sin_prueba(css, '/* solo-prueba', '/* /solo-prueba */', 'css/'), sin_prueba(codigo, '/* solo-prueba', '/* /solo-prueba */', 'js/'))
if modo == 'produccion':
    html, css, codigo = limpios
    rastros = sorted(set(re.findall(r'SIM_CASOS|SIM_MIOS|casosPrueba|etqParaPruebas|__ETQ|__PERF|__BUSCAR|"probar|\.probar|banner-prueba', html + css + codigo)))
    if rastros: sys.exit('Quedó código de prueba fuera de las marcas solo-prueba: ' + ', '.join(rastros))

(destino / 'datos').mkdir(parents=True, exist_ok=True); (destino / 'img').mkdir(exist_ok=True)
(destino / 'app.css').write_text(css, encoding='utf-8', newline='\n')
shutil.copyfile(TEXTOS_JS, destino / 'textos.js')
shutil.copyfile(META_B64, destino / 'datos' / 'colonias.txt'); shutil.copyfile(CALLES_B64, destino / 'datos' / 'calles.txt')
shutil.copyfile(LOGO, destino / 'img' / 'logo_inst.png'); shutil.copyfile(EMBLEMA, destino / 'img' / 'emblema_patrimoniales.png')
for n in ('icono.svg', 'icono-32.png', 'icono-180.png'): shutil.copyfile(ICONOS / n, destino / 'img' / n)
if TARJETA.exists(): shutil.copyfile(TARJETA, destino / 'img' / 'tarjeta.jpg')
else: print('Aviso: falta img/tarjeta.jpg (la imagen al compartir la liga): python hacer_imagenes.py tarjeta')
if destino != SITIO:   # copia completa para probar en otra carpeta
    shutil.copytree(SITIO / 'vendor', destino / 'vendor', dirs_exist_ok=True)
    for f in [*(SITIO / 'datos').glob('arboles_*.txt'), *(SITIO / 'datos').glob('fondo_*')]: shutil.copyfile(f, destino / 'datos' / f.name)

# v31d (Lote 7): huella del contenido de cada archivo (10 caracteres de su SHA-256). El navegador guarda un año lo que lleva ?v=<huella>
# (04_sia/) y, al publicar una versión nueva, solo vuelve a descargar los archivos que cambiaron (antes, ?v=<versión> los renovaba todos).
HUELLA = {}
def huella(rel):
    if rel not in HUELLA: HUELLA[rel] = hashlib.sha256((destino / rel).read_bytes()).hexdigest()[:10]
    return HUELLA[rel]
pedidos = [*(destino / 'datos').glob('*'), *(destino / 'img').glob('*'), *(destino / 'vendor').glob('*.js')]   # lo que pide el código
HUELLAS = {r: huella(r) for r in sorted(f.relative_to(destino).as_posix() for f in pedidos if f.is_file())}
js = (poner((JS_DIR / '00_config.js').read_text(encoding='utf-8')).replace('__HUELLAS__', json.dumps(HUELLAS, separators=(',', ':'))) +
      '(async function(){\n"use strict";\n' + codigo + (JS_DIR / 'cierre.txt').read_text(encoding='utf-8') + '\n')
sobran = [m for m in ('__MODO__', '__VERSION__', '__FECHA_VERSION__', '__URL_SITIO__', '__HUELLAS__') if m in html + js]
if sobran: sys.exit('Faltó reemplazar: ' + ', '.join(sobran))
TEMAS = sorted({k.split('.')[0] for k in TEXTOS})
usadas = set(re.findall(r'"((?:' + '|'.join(TEMAS) + r')\.[a-z0-9_]+)"', js))
if usadas - set(TEXTOS): sys.exit('El código pide textos que no están en textos.js: ' + ', '.join(sorted(usadas - set(TEXTOS))))
(destino / 'app.js').write_text(js, encoding='utf-8', newline='\n')
# index.html: ?v=<huella> en cada liga a un archivo del sitio, también en la imagen para redes (og:image), que las redes guardan por su
# dirección. Las letras .woff2 no: fuentes.css las pide sin huella y el preload debe pedir exactamente lo mismo.
def con_huella(m):
    url = m.group(2); rel = url[len(URL_SITIO):] if url.startswith(URL_SITIO) else url
    if not re.fullmatch(r'[\w./-]+\.\w+', rel) or rel.endswith('.woff2') or not (destino / rel).is_file(): return m.group(0)
    return f'{m.group(1)}="{url}?v={huella(rel)}"'
html = re.sub(r'\b(src|href|content)="([^"?#]*)"', con_huella, html)
if re.search(r'<script>|<style>| style="| on[a-z]+="', html): sys.exit('index.html no debe llevar código, estilos ni manejadores dentro (política de seguridad)')
(destino / 'index.html').write_text(html, encoding='utf-8', newline='\n')
# Sintaxis de app.js y textos.js (si hay Node.js): un error aquí deja la página detenida en «Descomprimiendo datos…».
NODE = shutil.which('node')
if NODE:
    for f in ('app.js', 'textos.js'):
        r = subprocess.run([NODE, '--check', str(destino / f)], capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode: sys.exit(f'ERROR de sintaxis en {f}: la página no arrancaría. Revisa el archivo de 02_fuente/js que se indica abajo.\n' + r.stderr.strip()[:1500])
else: print('Aviso: sin Node.js (https://nodejs.org) no se revisa la sintaxis de app.js.')
kb = lambda p: (destino / p).stat().st_size // 1024
print(f'v{VERSION}, modo {modo} -> {destino}: index.html {kb("index.html")} KB, app.css {kb("app.css")} KB, app.js {kb("app.js")} KB, '
      f'textos.js {len(TEXTOS)} textos, datos/colonias.txt {kb("datos/colonias.txt")} KB, datos/calles.txt {kb("datos/calles.txt")} KB')
