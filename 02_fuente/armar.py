"""Último paso. Arma la página: mete en app.html los datos (meta_g.b64, calles.b64), el logo y el modo, y escribe 10_sitio/index.html.
Uso:  python armar.py                      -> 10_sitio/index.html en modo prueba (personas guardianas simuladas, aviso de prueba)
      python armar.py --produccion         -> 10_sitio/index.html en modo producción (sin simulación ni avisos de prueba)
      python armar.py --salida otra.html   -> además, una copia en esa ruta"""
import base64, json, re, sys
from pathlib import Path
from rutas import APP, LOGO, META_B64, CALLES_B64, INDEX, exigir

exigir(APP, LOGO, META_B64, CALLES_B64)
modo = 'produccion' if '--produccion' in sys.argv else 'prueba'
t = APP.read_text(encoding='utf-8')
logo = 'data:image/png;base64,' + base64.b64encode(LOGO.read_bytes()).decode()
t = t.replace('__META__', META_B64.read_text()).replace('__CALLES__', CALLES_B64.read_text()).replace('"__LOGO__"', json.dumps(logo))
t = t.replace('data-modo="__MODO__"', f'data-modo="{modo}"')
if modo == 'produccion':   # quita el aviso «Versión de prueba» y todo lo marcado como solo-prueba
    t = re.sub(r'<!-- solo-prueba[^>]*-->.*?<!-- /solo-prueba -->\n?', '', t, flags=re.S)
sobran = [m for m in ('__META__', '__CALLES__', '__LOGO__', '__MODO__') if m in t]
if sobran: sys.exit('Faltó reemplazar en app.html: ' + ', '.join(sobran))
salidas = [INDEX] + ([Path(sys.argv[sys.argv.index('--salida') + 1])] if '--salida' in sys.argv else [])
for s in salidas:
    s.parent.mkdir(parents=True, exist_ok=True); s.write_text(t, encoding='utf-8', newline='\n')
print(len(t) // 1024, 'KB, modo', modo, '->', ', '.join(str(s) for s in salidas))
