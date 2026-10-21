"""Las calles se descargan después del panel (Lote 4.2). Revisa cuatro casos en computadora (capturas en resultados/calles/):
A. Liga a un árbol con las calles retrasadas 8 s: el árbol se abre sin cuadras y, al llegar las calles, se abre su cuadra y se resalta la calle.
B. Búsqueda antes de que lleguen las calles: «Cargando calles…» y, al llegar, aparecen las calles.
C. Las calles no se pueden descargar: aviso claro y la búsqueda de colonias sigue funcionando.
D. Normal: buscar una calle abre la colonia con esa calle.
Uso: python calles.py"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, servidor, revisiones

CAP = Path(__file__).parent / 'resultados' / 'calles'; CAP.mkdir(parents=True, exist_ok=True)
DEMORA = {'/datos/calles.txt': 0}   # segundos que tarda el servidor en entregar las calles
base, srv = servidor(demoras=DEMORA)
LISTO = "document.getElementById('loader').hidden"
CALLES = "document.documentElement.dataset.calles === 'listas'"
EN_CUADRA = re.compile(r'A \d+ m de |En la esquina con')   # renglones de una cuadra abierta (v28d: distancia a la esquina)
ok, fin = revisiones()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []
    def pagina():
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); pg.add_init_script('window.__ETQ = {}')
        pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and errs.append('consola: ' + m.text[:200] + ' ' + (m.location or {}).get('url', '')[-90:]))
        return ctx, pg

    print('A. Liga a un árbol con las calles retrasadas', flush=True)
    DEMORA['/datos/calles.txt'] = 8; ctx, pg = pagina()
    pg.goto(base + '#arbol-MIH-029-1493'); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_selector('#card:not([hidden])', timeout=60000)
    ok(not pg.evaluate(CALLES), 'el árbol se abre antes de que lleguen las calles')
    ok(not EN_CUADRA.search(pg.inner_text('#answer')), 'sin calles, la lista va sin cuadras')
    pg.screenshot(path=str(CAP / 'A1_arbol_sin_calles.png'))
    pg.wait_for_function(CALLES, timeout=60000); pg.wait_for_timeout(1500)
    ok(EN_CUADRA.search(pg.inner_text('#answer')), 'al llegar las calles se abre la cuadra del árbol, con la distancia de cada árbol a la esquina')
    # v29: la simbología ya no dice «Calle elegida» (Liber: solo lo necesario); la calle se resalta y se nombra en el mapa
    ok(pg.evaluate("(window.__ETQ.nombres || []).some(n => n.capa === 'lbl-calle-sel' && /Horacio/.test(n.t))"), 'y el mapa nombra la calle elegida')
    pg.screenshot(path=str(CAP / 'A2_arbol_con_calles.png')); ctx.close()

    print('B. Búsqueda antes de que lleguen las calles', flush=True)
    ctx, pg = pagina(); pg.goto(base); pg.wait_for_function(LISTO, timeout=120000)
    pg.fill('#omni', 'Horacio'); pg.wait_for_timeout(300); l0 = pg.inner_text('#omni-list')
    ok('Cargando calles' in l0 and 'No encontramos' not in l0, 'la lista dice «Cargando calles…» y no «No encontramos»')
    pg.screenshot(path=str(CAP / 'B1_busqueda_sin_calles.png'))
    pg.wait_for_function(CALLES, timeout=60000); pg.wait_for_timeout(500); l1 = pg.inner_text('#omni-list')
    ok('Cargando calles' not in l1 and 'Horacio' in l1 and 'calle' in l1.lower(), 'al llegar, la lista muestra las calles')   # v32b: la etiqueta se ve en mayúsculas («CALLE»)
    pg.screenshot(path=str(CAP / 'B2_busqueda_con_calles.png')); ctx.close()
    DEMORA['/datos/calles.txt'] = 0

    print('C. Las calles no se pueden descargar', flush=True)
    n = len(errs); ctx, pg = pagina(); pg.route('**/datos/calles.txt*', lambda r: r.fulfill(status=404, body='no'))
    pg.goto(base); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(1500)
    av = pg.inner_text('#aviso') if pg.is_visible('#aviso') else ''
    ok('No se pudieron cargar las calles' in av, 'aviso: ' + av[:80])
    pg.fill('#omni', 'Narvarte'); pg.wait_for_timeout(300)
    ok('Narvarte' in pg.inner_text('#omni-list'), 'la búsqueda de colonias sigue funcionando')
    pg.screenshot(path=str(CAP / 'C_sin_calles.png')); ctx.close()
    del errs[n:]   # aquí el error es esperado (el 404 y su registro en la consola)

    print('D. Normal: buscar una calle y abrirla', flush=True)
    ctx, pg = pagina(); pg.goto(base); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_function(CALLES, timeout=60000)
    pg.fill('#omni', 'Horacio'); pg.wait_for_timeout(300)
    pg.locator('#omni-list li[role=option]', has_text='Calle').first.dispatch_event('mousedown'); pg.wait_for_timeout(3000)
    ok('Horacio' in pg.inner_text('#answer'), 'el panel abre la colonia con la calle buscada')
    pg.screenshot(path=str(CAP / 'D_calle_buscada.png')); ctx.close()
    b.close()
srv.shutdown()
ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
fin()
