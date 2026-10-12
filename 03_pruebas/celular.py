"""Acomodo del celular, en Safari de iPhone 13 (WebKit) y en un celular chico de 360 x 640 (Chromium).
v29 (video del mapa de Nueva York que mandó Liber): información y mapa son dos pantallas completas que se cambian con un botón. Revisa
que al abrir se vea la información, que «Ver el mapa» y el botón de abajo del mapa cambien de pantalla (y lleven el foco), que lo que no se
ve no reciba el foco, que el botón del mapa diga lo que se verá, que nada se encime (encabezado, tarjeta del lugar, botones, simbología,
botón de abajo, ficha), que elegir un árbol de la lista lleve al mapa con su ficha y «atrás» regrese a la lista.
De antes (v28j y v28k): sin norte ni escala; la página mide lo que se ve; pantalla táctil sin globo del mouse; la simbología se cierra sola
al abrir un árbol y conserva el foco de su botón; la manija de la ficha responde al tocar y al deslizar; un dedo «fantasma» se suelta
solo; alcaldías, colonias y manzanas se funden al acercar.
Uso: python celular.py   (capturas en resultados/celular/)"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, servidor, revisiones

CAP = Path(__file__).parent / 'resultados' / 'celular'; CAP.mkdir(parents=True, exist_ok=True)
SEL = {'encabezado': 'header.barra', 'mapsum': '#mapsum', 'controles': '.toolbar', 'escala': '#escala', 'norte': '.norte', 'simbologia': '#legend',
       'boton_info': '#ver-info', 'panel': 'aside.panel', 'ficha': '#card'}
base, srv = servidor()
ok, fin = revisiones()

def cajas(pg):
    out = {}
    for k, s in SEL.items():
        l = pg.locator(s).first
        if l.count() and l.is_visible():
            b = l.bounding_box(); out[k] = (b['y'], b['y'] + b['height'], b['x'], b['x'] + b['width'])
    return out

def cruzan(a, b): return a[0] < b[1] - 2 and b[0] < a[1] - 2 and a[2] < b[3] - 2 and b[2] < a[3] - 2

def choques(c, ficha=False):
    res = []
    for k in ('controles', 'escala', 'norte', 'simbologia', 'mapsum', 'boton_info'):
        if k in c and c[k][0] < c['encabezado'][1] - 2: res.append(f'{k} sube {round(c["encabezado"][1] - c[k][0])} px sobre el encabezado')
    for a, b in (('simbologia', 'mapsum'), ('simbologia', 'boton_info'), ('controles', 'boton_info'), ('controles', 'mapsum'), ('simbologia', 'controles')):
        if a in c and b in c and cruzan(c[a], c[b]) and not (ficha and 'boton_info' in (a, b)): res.append(f'{a} se encima con {b}')
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
        vista = lambda: pg.evaluate("document.body.classList.contains('ver-mapa') ? 'mapa' : document.body.classList.contains('ver-info') ? 'info' : '?'")
        inertes = lambda: pg.evaluate("[document.querySelector('.panel').inert, document.querySelector('.mapwrap').inert]")
        foco = lambda: pg.evaluate("document.activeElement ? document.activeElement.id : ''")
        ok(pg.evaluate("matchMedia('(hover: none)').matches"), f'{nv}: se reconoce como pantalla táctil (el mapa no muestra el globo del mouse)')
        ok(abs(pg.evaluate("document.body.getBoundingClientRect().height") - pg.evaluate("innerHeight")) < 2, f'{nv}: la página mide lo que se ve')
        # 1. al abrir: la información a pantalla completa
        c = revisar(pg, nv, '1_info', 'información al abrir')
        alto = pg.evaluate("innerHeight")
        ok(vista() == 'info' and inertes() == [False, True] and 'panel' in c and c['panel'][0] <= c['encabezado'][1] + 2 and c['panel'][1] >= alto - 2,
           f'{nv}: al abrir se ve la información a pantalla completa (y el mapa no recibe el foco)')
        # 2. «Ver el mapa»
        pg.click('#ver-mapa'); pg.wait_for_timeout(500); c = revisar(pg, nv, '2_mapa', 'mapa')
        ok(vista() == 'mapa' and inertes() == [True, False] and 'panel' not in c and foco() == 'ver-info', f'{nv}: «Ver el mapa» lleva al mapa completo y el foco a su botón')
        ok('norte' not in c and 'escala' not in c, f'{nv}: sin norte ni escala en el celular')
        ok(pg.inner_text('#ver-info').strip() == 'Ver la colonia y sus calles', f'{nv}: el botón del mapa dice lo que se verá («{pg.inner_text("#ver-info").strip()}»)')
        ok(pg.locator('#zin').is_visible(), f'{nv}: con el mapa completo están acercar y alejar')
        # dedos «fantasma» (v29): dos dedos que el mapa cree puestos (nunca se avisó que se levantaron) se sueltan cuando ya no queda ninguno
        # en la pantalla, y también al empezar un toque nuevo; después, el mapa se vuelve a arrastrar
        fantasmas = """(() => { const c = document.querySelector('#map canvas');
            for (const id of [201, 202]) c.dispatchEvent(new PointerEvent('pointerdown', {pointerId:id, pointerType:'touch', isPrimary:false, bubbles:true, buttons:1, clientX:150, clientY:300}));
            return window.__ETQ.dedos(); })()"""
        if pg.evaluate("window.__ETQ && window.__ETQ.dedos ? window.__ETQ.dedos() : -1") >= 0:
            n1 = pg.evaluate(fantasmas)
            hay_touch = pg.evaluate("(() => { try { window.dispatchEvent(new TouchEvent('touchend', {touches:[], bubbles:true})); return true; } catch (e) { return false; } })()")
            pg.wait_for_timeout(100); n2 = pg.evaluate("window.__ETQ.dedos()")
            ok(n1 == 2 and (n2 == 0 or not hay_touch), f'{nv}: los dedos «fantasma» se sueltan al quitar el último dedo ({n1} → {n2})')
            pg.evaluate(fantasmas); v0 = pg.evaluate("window.__ETQ.vista.lon")
            m = pg.locator('#map').bounding_box(); x, y = m['x'] + m['width'] / 2, m['y'] + m['height'] / 2
            pg.mouse.move(x, y); pg.mouse.down()
            for k in range(1, 9): pg.mouse.move(x - 12 * k, y); pg.wait_for_timeout(20)
            pg.mouse.up(); pg.wait_for_timeout(1200)
            ok(pg.evaluate("window.__ETQ.dedos()") == 0 and abs(pg.evaluate("window.__ETQ.vista.lon") - v0) > 1e-6, f'{nv}: con dedos «fantasma», un toque nuevo los suelta y el mapa se arrastra')
        else:
            ok(True, f'{nv}: (el mapa no se dibuja en este navegador de prueba: sin revisión de dedos «fantasma»)')
        # 3. simbología abierta
        pg.evaluate("document.querySelector('.lg-btn').click()"); revisar(pg, nv, '3_simbologia', 'simbología abierta')
        ok(pg.evaluate("document.activeElement && document.activeElement.classList.contains('lg-btn')"), f'{nv}: el foco se queda en el botón de la simbología')
        # 4. de regreso a la información; un árbol de la lista lleva al mapa con su ficha
        pg.click('#ver-info'); pg.wait_for_timeout(500)
        ok(vista() == 'info' and foco() == 'ver-mapa', f'{nv}: el botón del mapa regresa a la información y lleva el foco a «Ver el mapa»')
        def arbol_de_lista(i=0):
            pg.locator('.calle-btn').first.scroll_into_view_if_needed()
            if not pg.locator('.lista button[data-idc]').count(): pg.locator('.calle-btn').first.click(); pg.wait_for_timeout(800)
            if not pg.locator('.lista button[data-idc]').count(): pg.locator('.cuadra-t').first.click(); pg.wait_for_timeout(800)
            bt = pg.locator('.lista button[data-idc]').nth(i); bt.scroll_into_view_if_needed(); bt.click()
            pg.wait_for_selector('#card:not([hidden])', timeout=60000)
        arbol_de_lista()
        revisar(pg, nv, '4_ficha', 'ficha', ficha=True)
        ok(vista() == 'mapa', f'{nv}: un árbol elegido en la lista se ve en el mapa con su ficha')
        ok(pg.evaluate("document.querySelector('.lg-btn').getAttribute('aria-expanded')") == 'false', f'{nv}: la simbología se cierra sola al abrir un árbol')
        # 5. ficha amplia y manija
        pg.locator('.ficha-grip').first.click(); c = revisar(pg, nv, '5_ficha_amplia', 'ficha amplia', ficha=True)
        ok(pg.evaluate("document.getElementById('card').classList.contains('amplia')"), f'{nv}: un toque en la manija abre la ficha amplia')
        ok(not any(k in c for k in ('controles', 'escala', 'simbologia')), f'{nv}: con la ficha amplia no se ven los controles del mapa')
        def deslizar(sel, dy):
            b_ = pg.locator(sel).first.bounding_box(); x, y = b_['x'] + b_['width'] / 2, b_['y'] + b_['height'] / 2
            pg.mouse.move(x, y); pg.mouse.down()
            for k in range(1, 7): pg.mouse.move(x, y + dy * k / 6); pg.wait_for_timeout(16)
            pg.mouse.up(); pg.wait_for_timeout(500)
        deslizar('.ficha-grip', 90); a1 = pg.evaluate("document.getElementById('card').classList.contains('amplia')")
        deslizar('.ficha-grip', -90); a2 = pg.evaluate("document.getElementById('card').classList.contains('amplia')")
        deslizar('.ficha-grip', 90); a3 = pg.evaluate("document.getElementById('card').classList.contains('amplia')")
        ok((a1, a2, a3) == (False, True, False), f'{nv}: la manija de la ficha se desliza: amplia → compacta → amplia → compacta ({a1}, {a2}, {a3})')
        # 6. «atrás» regresa a la lista de donde se eligió el árbol
        pg.go_back(); pg.wait_for_timeout(1200)
        ok(vista() == 'info' and pg.evaluate("document.getElementById('card').hidden"), f'{nv}: «atrás» cierra la ficha y regresa a la lista')
        # 7. otra vez un árbol; deslizar hacia abajo lo cierra y se queda en el mapa
        arbol_de_lista(1); deslizar('.ficha-grip', 90)
        ok(pg.evaluate("document.getElementById('card').hidden") and vista() == 'mapa' and foco() == 'ver-info',
           f'{nv}: deslizar la ficha compacta hacia abajo la cierra; queda el mapa con el foco en su botón')
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
