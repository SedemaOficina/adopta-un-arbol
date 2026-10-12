"""Interacciones del panel con el mapa (v28i): botones del panel en distinto orden y combinados con acciones en el mapa.
Revisa: colonias unidas (C.P. 04330 y liga vieja), buscador (cifra de árboles, flechas, «ver más», la misma colonia otra vez limpia la
caja de calle), caja de calle con una calle de otra alcaldía, historial («atrás» cierra la ficha y luego la colonia), ubicación que llega
tarde sin pisar lo que se eligió, el botón de ubicación del mapa igual al del panel, árbol fuera del catálogo de colonias, un toque de cerca
fuera de un árbol, Escape en la ficha, foco en los acordeones y anuncio para lectores de pantalla.
Uso: python interacciones.py"""
import base64, gzip, json, math
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, SITIO, servidor, revisiones

base, srv = servidor()
ok, fin = revisiones()
errs = []

# ---- datos del sitio, para elegir casos reales (árboles en colonias y fuera del catálogo) ----
def leer(f): return gzip.decompress(base64.b64decode((SITIO / 'datos' / f).read_text(encoding='ascii')))
P = json.loads(leer('colonias.txt'))
UGAS = P['inv']['ugas']
def arboles(cve):
    b, q = leer(f'arboles_{cve}.txt'), 0
    def v():
        nonlocal q; r = s = 0
        while True:
            c = b[q]; q += 1; r |= (c & 0x7f) << s; s += 7
            if not c & 0x80: return -((r + 1) // 2) if r & 1 else r // 2
    n = v(); col = x = y = 0; out = []
    for _ in range(n):
        col += v(); x += v(); y += v(); u = v(); seq = v(); v()
        for _ in range(5): v()
        out.append((col, x / 1e6, y / 1e6, UGAS[u] + '-' + str(seq).zfill(4)))
    return out
COY = arboles('003')
en_reyes = [a for a in COY if a[0] == 158]
MIH = arboles('016')
fuera = next(a for a in MIH if a[0] < 0)                     # árbol de Miguel Hidalgo fuera del catálogo de colonias
otra_col = next(a for a in MIH if a[0] >= 0)[0]                # una colonia de la misma alcaldía, para empezar ahí
# punto DENTRO de la colonia Bosque de Chapultepec I (1656) y lejos de todo árbol, para un toque «en el hueco» de otra colonia
from shapely.geometry import Polygon, Point
CHA = Polygon([(x / P['Q'], y / P['Q']) for x, y in next(c for c in P['cols'] if c['i'] == 1656)['rings'][0]])
x0, y0, x1, y1 = CHA.bounds
cha = [a for a in MIH if x0 - .002 < a[1] < x1 + .002 and y0 - .002 < a[2] < y1 + .002]
hueco = max([p for p in ((x0 + i * (x1 - x0) / 40, y0 + j * (y1 - y0) / 40) for i in range(41) for j in range(41)) if CHA.contains(Point(p))],
            key=lambda p: min(math.hypot((p[0] - a[1]) * 105000, (p[1] - a[2]) * 110700) for a in cha))
print('casos: Coyoacán', len(COY), '| Miguel Hidalgo', len(MIH), '| Los Reyes', len(en_reyes), 'árboles | fuera del catálogo', fuera[3], '| hueco', hueco)

GEO = """window.__GEO = {lon:%s, lat:%s, demora:0};
navigator.geolocation.getCurrentPosition = (ok, err) => setTimeout(() => ok({coords:{longitude:__GEO.lon, latitude:__GEO.lat, accuracy:20}}), __GEO.demora);"""

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('window.__ETQ = {};'); ctx.add_init_script(GEO % (en_reyes[0][1], en_reyes[0][2]))
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    titulo = lambda: pg.inner_text('#answer .cab h2') if pg.locator('#answer .cab h2').count() else ''
    def abrir(h=''):
        pg.goto(base + h, timeout=120000); pg.reload(timeout=120000); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(1200)
    def buscar(t):
        pg.fill('#omni', ''); pg.type('#omni', t, delay=20); pg.wait_for_timeout(700)
        return pg.locator('#omni-list li[role=option]:not([aria-disabled])')
    def abrir_arbol():   # el primer árbol de la primera calle de la colonia abierta (abre la calle y, si tiene cuadras, la primera)
        if pg.locator('.calle-btn[aria-expanded=true]').count() == 0: pg.locator('.calle-btn').first.click(); pg.wait_for_timeout(600)
        if not pg.locator('.lista button[data-idc]').count(): pg.locator('.cuadra-t').first.click(); pg.wait_for_timeout(600)
        pg.locator('.lista button[data-idc]').first.click(); pg.wait_for_timeout(1200)
    def escoger(t, cual):   # una COLONIA del buscador (su renglón dice «C.P.»), no una calle con el mismo nombre
        buscar(t).filter(has_text=cual).filter(has_text='C.P.').first.dispatch_event('mousedown'); pg.wait_for_timeout(1500); pg.wait_for_function(CARGADO, timeout=120000)

    # 1. Colonias unidas: el C.P. 04330 da una sola «Los Reyes», con su cifra de árboles; la liga vieja #colonia-1812 abre la 158
    abrir()
    ops = buscar('04330'); textos = ops.all_inner_texts()
    reyes = [t for t in textos if 'Los Reyes' in t]
    ok(len(reyes) == 1 and 'árboles' in reyes[0], f'C.P. 04330: una sola «Los Reyes» y con su cifra de árboles ({reyes})')
    abrir('#colonia-1812'); pg.wait_for_function(CARGADO, timeout=120000)
    ok(titulo() == 'Los Reyes' and pg.evaluate('location.hash') == '#colonia-158', f'la liga vieja #colonia-1812 abre Los Reyes y la dirección queda #colonia-158 ({titulo()}, {pg.evaluate("location.hash")})')

    # 2. Buscador: con flechas, lo resaltado es lo que se abre; «ver más»
    abrir(); buscar('reyes')
    for _ in range(3): pg.keyboard.press('ArrowDown')
    # el nombre del renglón resaltado (sin la etiqueta «Calle» o «Colonia»)
    resaltado = pg.evaluate("(() => { const s = document.querySelector('#omni-list li.active > span'); if (!s) return '?'; const t = s.querySelector('.tipo-r'); return s.textContent.slice(t ? t.textContent.length : 0).trim(); })()")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    ok(resaltado != '?' and pg.input_value('#omni').startswith(resaltado), f'con flechas se abre lo que está resaltado ({resaltado!r} → {pg.input_value("#omni")!r})')
    n0 = buscar('ayuntamiento').count(); mas = pg.locator('#omni-list li.ver-mas')
    if mas.count():
        mas.first.dispatch_event('mousedown'); pg.wait_for_timeout(700); n1 = pg.locator('#omni-list li[role=option]:not(.ver-mas)').count()
        ok(n1 > n0 - 1, f'«ver más» muestra más resultados ({n0 - 1} → {n1})')
    else: ok(False, '«ayuntamiento» no tiene «ver más»')

    # 3. Caja de calle: una calle de otra alcaldía ofrece dónde está; la misma colonia elegida otra vez limpia la caja
    abrir('#colonia-158'); pg.wait_for_function(CARGADO, timeout=120000)
    pg.fill('#filtro', 'AYUNTAMIENTO'); pg.wait_for_timeout(800)
    otra = pg.locator('.en-otra button')
    ok(otra.count() > 0 and 'No está en Los Reyes' in pg.inner_text('.en-otra'), f'«AYUNTAMIENTO» en Los Reyes ofrece {otra.count()} lugares donde sí está')
    if otra.count():
        destino = otra.first.inner_text().split('\n')[1].replace('en ', '').split(',')[0]
        otra.first.click(); pg.wait_for_timeout(1500); pg.wait_for_function(CARGADO, timeout=120000)
        ok(titulo() == destino and pg.locator('.calle-btn[aria-expanded=true]').count() == 1, f'al elegir uno se abre esa colonia con la calle abierta ({titulo()})')
    abrir('#colonia-158'); pg.wait_for_function(CARGADO, timeout=120000); pg.fill('#filtro', 'zzz'); pg.wait_for_timeout(500)
    escoger('Los Reyes', 'Los Reyes')
    ok(pg.input_value('#filtro') == '', f'elegir la misma colonia en el buscador limpia la caja de calle («{pg.input_value("#filtro")}»)')

    # 4. Historial: atrás cierra la ficha y luego la colonia; adelante regresa
    abrir(); escoger('Los Reyes', 'Los Reyes'); h_col = pg.evaluate('location.hash')
    abrir_arbol()
    ok(pg.is_visible('#card') and pg.evaluate('location.hash').startswith('#arbol-'), f'al abrir un árbol la dirección lo dice ({pg.evaluate("location.hash")})')
    pg.go_back(); pg.wait_for_timeout(1200)
    ok(not pg.is_visible('#card') and pg.evaluate('location.hash') == h_col and titulo() == 'Los Reyes', '«atrás» cierra la ficha y deja la colonia')
    pg.go_back(); pg.wait_for_timeout(1500)
    ok(pg.evaluate('location.hash') == '' and pg.is_hidden('#crumb'), '«atrás» otra vez regresa a la ciudad (no sale del sitio)')
    pg.go_forward(); pg.wait_for_timeout(1500)
    ok(titulo() == 'Los Reyes', '«adelante» vuelve a la colonia')
    # cerrar la ficha con la X tampoco deja entradas repetidas
    abrir_arbol()
    largo = pg.evaluate('history.length'); pg.locator('#card .close').first.click(); pg.wait_for_timeout(800)
    ok(pg.evaluate('location.hash') == h_col and pg.evaluate('history.length') <= largo, 'cerrar la ficha con la X regresa a la colonia sin sumar entradas')

    # 5. Escape cierra la ficha; foco en acordeones; anuncio
    abrir_arbol(); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ok(not pg.is_visible('#card'), 'Escape cierra la ficha')
    c0 = pg.locator('.calle-btn').nth(1); k = c0.get_attribute('data-foco'); c0.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
    ok(pg.evaluate('document.activeElement && document.activeElement.dataset.foco') == k, 'al abrir una calle con el teclado, el foco sigue en esa calle')
    escoger('Coltongo', 'Coltongo')
    try: pg.wait_for_function("document.getElementById('anuncio').textContent.includes('Coltongo')", timeout=8000)   # se escribe en el cuadro siguiente
    except Exception: pass
    ok('Coltongo' in pg.inner_text('#anuncio'), f'se anuncia la colonia elegida («{pg.inner_text("#anuncio")}»)')

    # 6. Ubicación que llega tarde: no pisa la colonia que se eligió mientras
    abrir(); pg.evaluate('window.__GEO.demora = 3000'); pg.click('#usar-ubic'); pg.wait_for_timeout(300)
    escoger('Coltongo', 'Coltongo'); pg.wait_for_timeout(4500)
    ok(titulo() == 'Coltongo' and not pg.is_visible('#card'), f'la ubicación que llega tarde no cambia lo elegido mientras ({titulo()})')
    # El botón de ubicación del mapa hace lo mismo que el del panel: elige el árbol más cercano
    abrir(); pg.evaluate('window.__GEO.demora = 0'); pg.locator('#zloc').click(); pg.wait_for_timeout(4000)
    ok(pg.is_visible('#card') and titulo() == 'Los Reyes', f'el botón de ubicación del mapa abre el árbol más cercano ({titulo()})')

    # 7. Árbol fuera del catálogo de colonias: el panel pasa a su alcaldía
    abrir(f'#colonia-{otra_col}'); pg.wait_for_function(CARGADO, timeout=120000)
    pg.evaluate(f"location.hash = '#arbol-{fuera[3]}'"); pg.wait_for_timeout(3000)
    ok(pg.is_visible('#card') and pg.locator('#crumb [aria-current=page]').inner_text() == 'Miguel Hidalgo', f'un árbol fuera del catálogo deja el panel en su alcaldía ({pg.locator("#crumb [aria-current=page]").inner_text()})')

    # 8. De cerca, un toque fuera de un árbol (en otra colonia) no cambia de colonia ni cierra la ficha
    abrir('#colonia-158'); pg.wait_for_function(CARGADO, timeout=120000)
    abrir_arbol()
    # Con WebGL por software los clics no llegan al mapa: el toque se simula llamando al manejador del mapa (window.__ETQ.toque).
    pg.evaluate(f'window.__ETQ.ir({hueco[0]}, {hueco[1]}, 18)'); pg.wait_for_timeout(1500)
    pg.evaluate(f'window.__ETQ.toque({hueco[0]}, {hueco[1]})'); pg.wait_for_timeout(1500)
    ok(titulo() == 'Los Reyes' and pg.is_visible('#card') and abs(pg.evaluate('window.__ETQ.vista.z') - 18) < .05, f'un toque de cerca en otra colonia, fuera de un árbol, no cambia nada ({titulo()}, z {pg.evaluate("window.__ETQ.vista.z"):.2f})')
    # control: de lejos (escala de colonias) el mismo toque sí elige esa colonia
    pg.evaluate(f'window.__ETQ.ir({hueco[0]}, {hueco[1]}, 13.5)'); pg.wait_for_timeout(1200)
    pg.evaluate(f'window.__ETQ.toque({hueco[0]}, {hueco[1]})'); pg.wait_for_timeout(2000)
    ok(titulo().startswith('Bosque de Chapultepec'), f'de lejos, el mismo toque sí elige esa colonia ({titulo()})')
    b.close()
srv.shutdown()
ok(not errs, 'sin errores de página' + (': ' + '; '.join(errs[:2]) if errs else ''))
fin()
