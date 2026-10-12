"""Seguridad (Lote 5): lo que escribe la persona se trata siempre como texto; la liga #arbol-… no ejecuta nada; la página no llama a
terceros (salvo Google para Street View), no guarda cookies y en el navegador solo guarda claves de árboles; jsPDF y el QR no se
descargan al abrir; y todo funciona con una política de seguridad estricta (CSP) como la del SIA.
Uso: python seguridad.py"""
import json, sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, servidor, LISTO

CSP = ("default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob: https://*.google.com https://*.googleapis.com "
       "https://*.gstatic.com https://*.ggpht.com; font-src 'self'; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; "
       "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'")
PERMITIDOS = ('127.0.0.1', 'google.com', 'googleapis.com', 'gstatic.com', 'ggpht.com')
CEBO = '<img src=x onerror="window.__pwn=1">'
base, srv = servidor(encabezados={'Content-Security-Policy': CSP})
r = []
def ok(c, t): r.append((bool(c), t)); print(('  OK   ' if c else '  FALLA ') + t, flush=True)
def esperar(pg, expr, seg=120):   # sin wait_for_function (usa eval, que la CSP bloquea)
    fin = time.time() + seg
    while time.time() < fin:
        if pg.evaluate(expr): return
        time.sleep(.25)
    estado = pg.evaluate("[document.getElementById('loader').hidden ? 'sin pantalla de carga' : 'pantalla de carga: ' + document.getElementById('loader').innerText.slice(0, 80), "
                         "'calles: ' + (document.documentElement.dataset.calles || 'aún no')].join(' · ')")
    raise TimeoutError(f'la página no terminó de cargar en {seg} s ({estado})')
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    ctx.add_init_script("window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));")
    hosts, pedidos = set(), []
    ctx.on('request', lambda q: (hosts.add(urlparse(q.url).hostname or ''), pedidos.append(q.url)))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    print('1. Al abrir'); pg.goto(base); esperar(pg, LISTO); pg.wait_for_timeout(1500)
    ok(not any('jspdf' in u or 'qrcode' in u for u in pedidos), 'jsPDF y el QR no se descargan al abrir la página')
    ok(pg.evaluate("document.cookie") == '' and not ctx.cookies(), 'no guarda cookies')
    print('2. Lo que escribe la persona')
    pg.goto(base + '#arbol-MIH-029-1491'); pg.reload(); esperar(pg, LISTO); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(1200)
    pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
    pg.fill('#f-nombre', CEBO); pg.fill('#f-arbol', CEBO); pg.fill('#f-carta', CEBO[:110]); pg.locator('.trato label').first.click(); pg.locator('.acepto input').check()
    pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_timeout(3000)
    ok(not pg.evaluate("window.__pwn") and pg.locator('#m-cuidar img[src="x"]').count() == 0, 'el nombre, el nombre del árbol y el mensaje no se ejecutan como código')
    ok('<img src=x' in pg.inner_text('#mc-cuidar'), 'se muestran tal cual, como texto')
    with pg.expect_download() as d: pg.get_by_role('button', name='Descargar PDF').first.click()
    ok(d.value.suggested_filename.endswith('.pdf'), 'el PDF se genera (jsPDF se carga al pedirlo)')
    guardado = pg.evaluate("JSON.stringify(Object.keys(localStorage)) + JSON.stringify(Object.values(localStorage))")
    ok('img src' not in guardado and all(k.startswith(('gda:v1:', 'guardianias')) for k in pg.evaluate("Object.keys(localStorage)")),
       'en el navegador solo se guardan claves de árboles y su lugar: ' + guardado[:120])
    print('3. Liga con código')
    pg2 = ctx.new_page(); pg2.goto(base + '#arbol-' + CEBO.replace(' ', '%20')); esperar(pg2, LISTO); pg2.wait_for_timeout(2500)
    ok(not pg2.evaluate("window.__pwn") and pg2.locator('img[src="x"]').count() == 0, 'una liga #arbol-<código> no ejecuta nada (solo avisa que no encontró el árbol)')
    print('4. Terceros y política de seguridad')
    ajenos = sorted(h for h in hosts if h and not any(h == d or h.endswith('.' + d) for d in PERMITIDOS))
    ok(not ajenos, 'sin llamadas a terceros (fuera de Google para Street View): ' + (', '.join(ajenos) or 'ninguna'))
    viol = pg.evaluate('window.__csp') + pg2.evaluate('window.__csp')
    ok(not viol, 'sin violaciones de la política estricta: ' + (', '.join(sorted(set(viol))) or 'ninguna'))
    ok(not errs, 'sin errores de página')
    b.close()
srv.shutdown()
print(f'{sum(1 for c, _ in r if c)} de {len(r)} revisiones bien')
sys.exit(0 if all(c for c, _ in r) else 1)
