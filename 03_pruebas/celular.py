"""Acomodo del celular (v28j, tras la prueba de Liber en un iPhone: «todo encimado»): en Safari de iPhone 13 (WebKit) y en un celular
chico de 360 x 640 (Chromium), con el panel a media altura, el panel arriba, la simbología abierta, la ficha y la ficha amplia, ningún
control del mapa (botones, escala, simbología, tarjeta del lugar) se mete sobre el panel o el encabezado, la ficha no tapa el encabezado,
la simbología se cierra sola al abrir un árbol, no hay norte y la pantalla se reconoce como táctil (sin globo del mouse).
v28k: sin escala en el celular; la página mide lo que se ve; con el mapa bajo solo quedan los botones de ciudad y ubicación; las manijas
del panel y de la ficha responden al deslizar y al tocar; un dedo «fantasma» se suelta solo; alcaldías, colonias y manzanas se funden.
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
    # con WebGL por software, la captura con el mapa de cerca tarda 13 a 20 s
    pg.wait_for_timeout(900); pg.screenshot(path=str(CAP / f'{nv}_{n}.png'), timeout=120000); c = cajas(pg); ch = choques(c, ficha)
    ok(not ch, f'{nv}, {texto}: ' + ('nada encimado' if not ch else '; '.join(ch)))
    return c

with sync_playwright() as p:
    for nv, nav, opciones in (('iphone13', p.webkit, p.devices['iPhone 13']),
                              ('chico360', p.chromium, dict(viewport={'width': 360, 'height': 640}, device_scale_factor=2, is_mobile=True, has_touch=True))):
        b = nav.launch(args=FLAGS) if nav is p.chromium else nav.launch()
        ctx = b.new_context(locale='es-MX', **opciones); pg = ctx.new_page(); errs = []; pg.add_init_script('window.__ETQ = {}; window.__PERF = [];')
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(base + '#colonia-158', timeout=180000); pg.wait_for_function(LISTO, timeout=180000); pg.wait_for_function(CARGADO, timeout=180000)
        pg.wait_for_timeout(2000)
        ok(pg.evaluate("matchMedia('(hover: none)').matches"), f'{nv}: se reconoce como pantalla táctil (el mapa no muestra el globo del mouse)')
        c = revisar(pg, nv, '1_panel_medio', 'panel a media altura')
        ok('norte' not in c and 'escala' not in c, f'{nv}: sin norte ni escala en el celular')
        ok(abs(pg.evaluate("document.body.getBoundingClientRect().height") - pg.evaluate("innerHeight")) < 2, f'{nv}: la página mide lo que se ve')
        bajo = pg.evaluate("document.getElementById('map').clientHeight < 210")
        ok(pg.locator('#zin').is_visible() != bajo, f'{nv}: acercar y alejar ' + ('se quitan con el mapa bajo' if bajo else 'están con el mapa alto'))
        # manija del panel: un deslizón corto baja o sube un escalón
        def deslizar(sel, dy):
            b_ = pg.locator(sel).first.bounding_box(); x, y = b_['x'] + b_['width'] / 2, b_['y'] + b_['height'] / 2
            pg.mouse.move(x, y); pg.mouse.down()
            for k in range(1, 7): pg.mouse.move(x, y + dy * k / 6); pg.wait_for_timeout(16)
            pg.mouse.up(); pg.wait_for_timeout(500)
        hoja = lambda: pg.evaluate("['asoma','media','completa'].find(h => document.body.classList.contains('hoja-' + h))")
        deslizar('#grip', 60); h1 = hoja(); deslizar('#grip', -60); h2 = hoja()
        ok((h1, h2) == ('asoma', 'media'), f'{nv}: la manija del panel baja y sube con un deslizón corto ({h1}, {h2})')
        # dedo «fantasma»: un dedo que el mapa cree puesto se suelta cuando ya no hay ninguno en la pantalla
        ok(pg.evaluate("""(() => { let n = 0; addEventListener('pointercancel', e => { if (e.pointerId === 77) n++; });
            document.getElementById('map').dispatchEvent(new PointerEvent('pointerdown', {pointerId:77, pointerType:'touch', isPrimary:false, bubbles:true}));
            try { window.dispatchEvent(new TouchEvent('touchend', {touches:[], bubbles:true})); } catch (e) { return 'sin TouchEvent'; }
            return n === 1; })()""") in (True, 'sin TouchEvent'), f'{nv}: un dedo «fantasma» se suelta solo')
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
        ok(pg.evaluate("document.getElementById('card').classList.contains('amplia')"), f'{nv}: un toque en la manija abre la ficha amplia')
        ok(not any(k in c for k in ('controles', 'escala', 'simbologia')), f'{nv}: con la ficha amplia no se ven los controles del mapa')
        deslizar('.ficha-grip', 90); a1 = pg.evaluate("document.getElementById('card').classList.contains('amplia')")
        deslizar('.ficha-grip', -90); a2 = pg.evaluate("document.getElementById('card').classList.contains('amplia')")
        deslizar('.ficha-grip', 90); deslizar('.ficha-grip', 90); cerrada = pg.evaluate("document.getElementById('card').hidden")
        ok((a1, a2, cerrada) == (False, True, True), f'{nv}: la manija de la ficha se desliza: amplia → compacta, → amplia, y abajo dos veces la cierra ({a1}, {a2}, {cerrada})')
        if nv == 'chico360':   # fundidos (Chromium dibuja el mapa)
            pg.evaluate("window.__PERF = []")
            ids = lambda z: (pg.evaluate(f"window.__ETQ && window.__ETQ.ir ? (window.__ETQ.ir(-99.16, 19.37, {z}), window.__PERF.slice(-1)[0][2]) : ''") or '')
            z1 = ids(11.5); z2 = ids(14.2)
            ok('alc-fill' in z1 and 'col-fill' in z1, f'{nv}: a zoom 11.5 alcaldías y colonias se funden')
            ok('col-fill' in z2, f'{nv}: a zoom 14.2 las colonias se desvanecen poco a poco (aún están)')
        ok(not errs, f'{nv}: sin errores de página ' + '; '.join(errs[:2]))
        b.close()
srv.shutdown()
fin()
