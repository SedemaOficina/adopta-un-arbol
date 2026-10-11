"""Lighthouse con perfil de celular. En este Windows Node no puede abrir Chrome por su cuenta («spawn UNKNOWN»), así que
Playwright abre Chromium con su puerto de depuración y Lighthouse se conecta a él.
Uso: python lighthouse.py <url> <prefijo de salida> [veces=1]   (escribe <prefijo>_N.report.json y .html y muestra el resumen)"""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL, SALIDA = sys.argv[1], Path(sys.argv[2]); VECES = int(sys.argv[3]) if len(sys.argv) > 3 else 1
LH = Path(__file__).parent / 'node_modules' / 'lighthouse' / 'cli' / 'index.js'
PUERTO = 9333
SALIDA.parent.mkdir(parents=True, exist_ok=True)
CLAVES = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight']

def resumen(f):
    d = json.loads(Path(f).read_text(encoding='utf-8'))
    if d.get('runtimeError'): return {'error': d['runtimeError']}
    r = {k: (round(v['score'] * 100) if v['score'] is not None else None) for k, v in d['categories'].items()}
    r.update({k: d['audits'][k].get('displayValue') for k in CLAVES})
    return r

with sync_playwright() as p:
    b = p.chromium.launch(args=[f'--remote-debugging-port={PUERTO}', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for i in range(1, VECES + 1):
        destino = f'{SALIDA}_{i}'
        subprocess.run(['node', str(LH), URL, f'--port={PUERTO}', '--form-factor=mobile', '--output=json', '--output=html',
                        f'--output-path={destino}', '--quiet'], check=False)
        print(i, json.dumps(resumen(destino + '.report.json'), ensure_ascii=False), flush=True)
    b.close()
