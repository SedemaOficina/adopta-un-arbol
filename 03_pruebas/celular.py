"""Acomodo del celular (v28j, tras la prueba de Liber en un iPhone: «todo encimado»): en Safari de iPhone 13 (WebKit) y en un celular
chico de 360 x 640 (Chromium), con el panel a media altura, el panel arriba, la simbología abierta, la ficha y la ficha amplia, ningún
control del mapa (botones, escala, simbología, tarjeta del lugar) se mete sobre el panel o el encabezado, la ficha no tapa el encabezado,
la simbología se cierra sola al abrir un árbol, no hay norte y la pantalla se reconoce como táctil (sin globo del mouse).
Uso: python celular.py   (capturas en resultados/celular/)"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, servidor, revisiones

CAP = Path(__file__).parent / 'resultados' / 'celular'; CAP.mkdir(parents=True, exist_ok=True)
SEL = {'encabezado': 'header.barra', 'mapsum': '#mapsum', 'controles': '.toolbar', 'escala': '#escala', 'norte': '.norte', 'simbologia': '#legend',
       'hoja': 'aside.panel', 'ficha': '#card'}
base, srv = servidor()
ok, fin = revisiones()

def cajas(pg):
    out = {}
    for k, s in SEL.items():
        l = pg.locator(s).first
        if l.count() and l.is_visible():
            b = l.bounding_box(); out[k] = (b['y'], b['y'] + b['height'])
    return out

def choques(c, ficha=False):
    res = []
    for k in ('controles', 'escala', 'norte', 'simbologia', 'mapsum'):
        if k not in c: continue
        if 'hoja' in c and c[k][1] > c['hoja'][0] + 2 and not ficha: res.append(f'{k} se mete {round(c[k][1] - c["hoja"][0])} px sobre el panel')
        if c[k][0] < c['encabezado'][1] - 2: res.append(f'{k} sube {round(c["encabezado"][1] - c[k][0])} px sobre el encabezado')
    if 'simbologia' in c and 'mapsum' in c and c['simbologia'][1] - c['simbologia'][0] > 50 and c['simbologia'][0] < c['mapsum'][1] - 2:
        res.append('la simbología abierta tapa la tarjeta del lugar')
    if 'escala' in c and 'simbologia' in c and c['escala'][1] > c['simbologia'][0] + 2 and c['escala'][0] < c['simbologia'][1]:
        res.append('la escala queda bajo la simbología')
    if 'ficha' in c and c['ficha'][0] < c['encabezado'][1] - 2: res.append(f'la ficha tapa {round(c["encabezado"][1] - c["ficha"][0])} px del encabezado')
    return res

def revisar(pg, nv, n, texto, ficha=False):
    pg.wait_for_timeout(900); pg.screenshot(path=str(CAP / f'{nv}_{n}.png')); c = cajas(pg); ch = choques(c, ficha)
    ok(not ch, f'{nv}, {texto}: ' + ('nada encimado' if not ch else '; '.join(ch)))
    return c

with sync_playwright() as p:
    for nv, nav, opciones in (('iphone13', p.webkit, p.devices['iPhone 13']),
                              ('chico360', p.chromium, dict(viewport={'width': 360, 'height': 640}, device_scale_factor=2, is_mobile=True, has_touch=True))):
        b = nav.launch(args=FLAGS) if nav is p.chromium else nav.launch()
        ctx = b.new_context(locale='es-MX', **opciones); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(base + '#colonia-158', timeout=180000); pg.wait_for_function(LISTO, timeout=180000); pg.wait_for_function(CARGADO, timeout=180000)
        pg.wait_for_timeout(2000)
        ok(pg.evaluate("matchMedia('(hover: none)').matches"), f'{nv}: se reconoce como pantalla táctil (el mapa no muestra el globo del mouse)')
        c = revisar(pg, nv, '1_panel_medio', 'panel a media altura')
        ok('norte' not in c, f'{nv}: sin norte en el celular')
        pg.locator('#grip').click(); revisar(pg, nv, '2_panel_arriba', 'panel arriba')
        pg.locator('#grip').click(); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('.lg-btn').click()"); c = revisar(pg, nv, '3_simbologia', 'simbología abierta')
        ok(pg.evaluate("document.activeElement && document.activeElement.classList.contains('lg-btn')"), f'{nv}: el foco se queda en el botón de la simbología')
        pg.locator('#grip').click(); revisar(pg, nv, '4_simbologia_panel_arriba', 'simbología abierta con el panel arriba')
        pg.locator('#grip').click(); pg.wait_for_timeout(500)
        pg.locator('.calle-btn').first.scroll_into_view_if_needed(); pg.locator('.calle-btn').first.click(force=True); pg.wait_for_timeout(800)
        if not pg.locator('.lista button[data-idc]').count(): pg.locator('.cuadra-t').first.click(force=True); pg.wait_for_timeout(800)
        pg.locator('.lista button[data-idc]').first.scroll_into_view_if_needed(); pg.locator('.lista button[data-idc]').first.click(force=True)
        pg.wait_for_selector('#card:not([hidden])', timeout=60000)
        revisar(pg, nv, '5_ficha', 'ficha', ficha=True)
        ok(pg.evaluate("document.querySelector('.lg-btn').getAttribute('aria-expanded')") == 'false', f'{nv}: la simbología se cierra sola al abrir un árbol')
        pg.locator('.ficha-grip').first.click(); c = revisar(pg, nv, '6_ficha_amplia', 'ficha amplia', ficha=True)
        ok(not any(k in c for k in ('controles', 'escala', 'simbologia')), f'{nv}: con la ficha amplia no se ven los controles del mapa')
        ok(not errs, f'{nv}: sin errores de página ' + '; '.join(errs[:2]))
        b.close()
srv.shutdown()
fin()
