"""Último paso. Arma la página: mete en app.html los datos (meta_g.b64, calles.b64) y el logo, y escribe 10_sitio/index.html.
Uso:  python armar.py                      -> 10_sitio/index.html
      python armar.py --salida otra.html   -> además, una copia en esa ruta (p. ej., el artefacto de Claude)"""
import base64, json, sys
from pathlib import Path
from rutas import APP, LOGO, META_B64, CALLES_B64, INDEX, exigir

exigir(APP, LOGO, META_B64, CALLES_B64)
t = APP.read_text(encoding='utf-8')
logo = 'data:image/png;base64,' + base64.b64encode(LOGO.read_bytes()).decode()
t = t.replace('__META__', META_B64.read_text()).replace('__CALLES__', CALLES_B64.read_text()).replace('"__LOGO__"', json.dumps(logo))
salidas = [INDEX] + ([Path(sys.argv[sys.argv.index('--salida') + 1])] if '--salida' in sys.argv else [])
for s in salidas:
    s.parent.mkdir(parents=True, exist_ok=True); s.write_text(t, encoding='utf-8')
print(len(t) // 1024, 'KB ->', ', '.join(str(s) for s in salidas))
