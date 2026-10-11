"""Prueba básica en los cuatro tamaños de pantalla (computadora de 1440 px; celular de 360, 390 y 430 px): la página abre en modo estándar
y en español, sin barra horizontal, llegan las calles, la liga directa abre la ficha del árbol y el reconocimiento se descarga en PDF
y en imagen. Con --medir, además, cuánto tarda el panel con una red de celular lenta (4 Mbps, 150 ms; sin caché).
Uso: python tamanos.py [--medir]   (capturas en resultados/tamanos/)"""
import json, sys, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, TAMANOS, servidor, revisiones

CAP = Path(__file__).parent / 'resultados' / 'tamanos'; CAP.mkdir(parents=True, exist_ok=True)
PERMITIDOS = ('127.0.0.1', 'google.com', 'googleapis.com', 'gstatic.com', 'ggpht.com')
base, srv = servidor(comprimir=True)
ok, fin = revisiones()
hosts = set()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS)
    for nv, o in TAMANOS.items():
        print(nv, flush=True)
        ctx = b.new_context(accept_downloads=True, locale='es-MX', **o); errs = []
        ctx.on('request', lambda q: hosts.add(urlparse(q.url).hostname or ''))
        def abrir(h=''):
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('console', lambda m: m.type == 'error' and errs.append('consola: ' + m.text[:200]))
            pg.goto(base + h); pg.wait_for_function(LISTO, timeout=180000); return pg
        t0 = time.time(); pg = abrir(); seg = round(time.time() - t0, 1); pg.wait_for_timeout(1500)
        pg.screenshot(path=str(CAP / f'{nv}_1_inicio.png'))
        ok(pg.evaluate('document.compatMode') == 'CSS1Compat' and pg.evaluate('document.documentElement.lang') == 'es',
           f'abre en modo estándar y en español, con las calles, en {seg} s')
        ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'sin barra horizontal')
        pg.close()
        pg = abrir('#arbol-MIH-029-1493'); pg.wait_for_selector('#card:not([hidden])', timeout=120000); pg.wait_for_timeout(2500)
        pg.screenshot(path=str(CAP / f'{nv}_2_arbol.png'))
        ok('Avenida Horacio' in pg.inner_text('#card'), 'la liga directa abre la ficha del árbol')
        pg.close()
        pg = abrir('#arbol-MIH-029-1492'); pg.wait_for_selector('#card:not([hidden])', timeout=120000); pg.wait_for_timeout(1500)
        pg.locator('#card').get_by_role('button', name='Ver mi reconocimiento').first.click()
        pg.wait_for_selector('#m-cuidar:not([hidden])', timeout=30000); pg.wait_for_timeout(2000)
        pg.screenshot(path=str(CAP / f'{nv}_3_reconocimiento.png'))
        for etq, ext in (('Descargar PDF', '.pdf'), ('Descargar imagen', '.png')):
            try:
                with pg.expect_download(timeout=60000) as d: pg.get_by_role('button', name=etq).first.click()
                kb = Path(d.value.path()).stat().st_size // 1024
                ok(d.value.suggested_filename.endswith(ext) and kb > 10, f'«{etq}»: {d.value.suggested_filename} ({kb} KB)')
            except Exception as e:
                ok(False, f'«{etq}» no descargó nada: {str(e)[:120]}')
        pg.close(); ctx.close()
        ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
    ajenos = sorted(h for h in hosts if h and not any(h == d or h.endswith('.' + d) for d in PERMITIDOS))
    ok(not ajenos, 'sin llamadas a otros sitios (fuera de Google para Street View): ' + (', '.join(ajenos) or 'ninguna'))

    if '--medir' in sys.argv:
        for vuelta in (1, 2):
            ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
            cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
            cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 4e6 / 8, 'uploadThroughput': 1e6 / 8})
            pg.goto(base, wait_until='commit', timeout=300000)
            pg.wait_for_function("document.getElementById('loader').hidden", timeout=300000, polling=50)
            m = {'panel_listo_s': round(pg.evaluate('performance.now()') / 1000, 2)}
            pg.wait_for_function("document.documentElement.dataset.calles === 'listas'", timeout=300000, polling=50)
            m['calles_listas_s'] = round(pg.evaluate('performance.now()') / 1000, 2)
            print(f'red lenta, vuelta {vuelta}:', json.dumps(m, ensure_ascii=False), flush=True); ctx.close()
    b.close()
srv.shutdown()
fin()
