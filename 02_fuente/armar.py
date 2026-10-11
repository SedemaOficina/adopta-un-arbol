"""Último paso. Arma la página: mete en app.html los datos de colonias (meta_g.b64), el logo y el modo, y escribe 10_sitio/index.html.
Las calles (calles.b64) no van dentro de la página: se copian a 10_sitio/datos/calles.txt y la página las descarga después del panel.
Uso:  python armar.py                      -> 10_sitio/index.html en modo prueba (personas guardianas simuladas, aviso de prueba)
      python armar.py --produccion         -> 10_sitio/index.html en modo producción (sin simulación ni avisos de prueba)
      python armar.py --salida otra.html   -> además, una copia de la página en esa ruta"""
import base64, json, re, shutil, sys
from pathlib import Path
from rutas import APP, LOGO, EMBLEMA, META_B64, CALLES_B64, CALLES_TXT, INDEX, exigir

exigir(APP, LOGO, EMBLEMA, META_B64, CALLES_B64)
modo = 'produccion' if '--produccion' in sys.argv else 'prueba'
t = APP.read_text(encoding='utf-8')
logo = 'data:image/png;base64,' + base64.b64encode(LOGO.read_bytes()).decode()
t = t.replace('__META__', META_B64.read_text()).replace('"__LOGO__"', json.dumps(logo))
emblema = 'data:image/png;base64,' + base64.b64encode(EMBLEMA.read_bytes()).decode()
t = t.replace('"__EMBLEMA__"', json.dumps(emblema))
t = t.replace('data-modo="__MODO__"', f'data-modo="{modo}"')
if modo == 'produccion':   # quita el aviso «Versión de prueba» y todo lo marcado como solo-prueba
    t = re.sub(r'<!-- solo-prueba[^>]*-->.*?<!-- /solo-prueba -->\n?', '', t, flags=re.S)
sobran = [m for m in ('__META__', '__LOGO__', '__EMBLEMA__', '__MODO__') if m in t]
if sobran: sys.exit('Faltó reemplazar en app.html: ' + ', '.join(sobran))
salidas = [INDEX] + ([Path(sys.argv[sys.argv.index('--salida') + 1])] if '--salida' in sys.argv else [])
for s in salidas:
    s.parent.mkdir(parents=True, exist_ok=True); s.write_text(t, encoding='utf-8', newline='\n')
CALLES_TXT.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(CALLES_B64, CALLES_TXT)
print(len(t) // 1024, 'KB, modo', modo, '->', ', '.join(str(s) for s in salidas), f'(+ {CALLES_TXT.name}, {CALLES_TXT.stat().st_size // 1024} KB)')
