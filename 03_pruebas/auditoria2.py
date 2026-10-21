"""Errores de la auditoría del 20 oct 2026 (bloque 1, v32) que no deben volver. Cada revisión falla en v31i y pasa desde v32.
1. (A5-01) armar.py avisa si un texto de textos.js perdió o cambió una {marca} (la revisión nunca había corrido).
2. (B2-01) Datos: cada árbol está en un archivo de alcaldía que su UGA tiene en INV.ugaAlc (los 961,318).
3. (B2-01) La liga de árboles cuya UGA es de otra alcaldía abre su ficha (antes, «No encontramos ese árbol» en 55,176 ligas).
4. (C4-01) Dos pestañas: cuidar en una no borra lo cuidado en la otra, y la otra se entera sin recargar.
5. (E3-01) Con el almacenamiento lleno, el paso 2 y «Mis árboles» avisan que la lista no se guarda.
6. (C4-02, C2-03) Quien llega con la liga de un árbol: «atrás» con el formulario abierto lo cierra y sigue en el sitio; lo escrito sigue ahí.
7. (C2-03) Lo escrito en el formulario se conserva al cerrarlo con Escape o con la X.
8. (B4-02) Dos ventanas encimadas: «atrás» cierra la de arriba; al cerrar las dos, el foco regresa al botón que las abrió.
9. (B7-01) Con la foto de la calle ya pedida, «Usar mi ubicación» no pide nada a Google hasta un toque nuevo.
10. (B4-01) El pie fijo del formulario no tapa el campo con el foco (zoom al 200 % y 1440 × 900 con los errores a la vista).
11. (B4-03) Al descargar, el foco se queda en el botón y Escape cierra la ventana.
12. (B5-04) La liga de un árbol sin internet deja «Volver a intentar» en el panel, y al volver la red abre el árbol.
Uso: python auditoria2.py"""
import base64, gzip, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, VISTAS, SITIO, servidor, revisiones, boton_formato

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / '02_fuente'))
from rutas import leer_textos, marcas_cambiadas
ok, fin = revisiones()

print('1. armar.py avisa si un texto cambió sus marcas', flush=True)
T = leer_textos(); k = next(k for k, v in T.items() if '{alcaldia}' in v)
cambiado = {**T, k: T[k].replace('{alcaldia}', '')}
ok([x[0] for x in marcas_cambiadas(T, cambiado)] == [k] and not marcas_cambiadas(T, T), f'quitar {{alcaldia}} de «{k}» se avisa; sin cambios, nada')

print('2. Cada árbol está en una alcaldía de su UGA (INV.ugaAlc)', flush=True)
P = json.loads(gzip.decompress(base64.b64decode((SITIO / 'datos' / 'colonias.txt').read_text().strip())))
UGAS, UA = P['inv']['ugas'], P['inv'].get('ugaAlc')
def arboles(cve):
    b = gzip.decompress(base64.b64decode((SITIO / 'datos' / f'arboles_{cve}.txt').read_text().strip())); q = 0
    def v():
        nonlocal q; r = sh = 0
        while True:
            x = b[q]; q += 1; r |= (x & 0x7f) << sh; sh += 7
            if not x & 0x80: return -((r + 1) // 2) if r % 2 else r // 2
    for _ in range(v()):
        v(); v(); v(); u, s = v(), v(); v(); v(); v(); v(); v(); v()
        yield u, s
ABR2MUN = {'AZC': '002', 'COY': '003', 'CUJ': '004', 'GAM': '005', 'IZC': '006', 'IZP': '007', 'MAC': '008', 'MLP': '009', 'AOB': '010', 'TLH': '011',
           'TLP': '012', 'XOC': '013', 'BJU': '014', 'CUH': '015', 'MIH': '016', 'VCA': '017'}   # la de las tres letras de la clave (02_datos.js)
fuera, total, muestra = 0, 0, {}   # muestra: un árbol por cada combinación (letras de la clave, alcaldía de su archivo) distinta
for f in sorted((SITIO / 'datos').glob('arboles_*.txt')):
    cve = f.stem.split('_')[1]
    for u, s in arboles(cve):
        total += 1
        if not UA or cve not in UA[u]: fuera += 1
        if ABR2MUN[UGAS[u][:3]] != cve: muestra.setdefault((UGAS[u][:3], cve), f'{UGAS[u]}-{s:04d}')
ok(UA is not None and fuera == 0 and total == 961318, f'{total:,} árboles; {fuera} en un archivo que su UGA no lista; {len(muestra)} combinaciones clave → otra alcaldía')

base, srv = servidor()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []
    def pagina(vista='escritorio', init=None, ctx=None, **extra):
        ctx = ctx or b.new_context(locale='es-MX', **(VISTAS[vista] if isinstance(vista, str) else vista), **extra); pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        if init: pg.add_init_script(init)
        return ctx, pg
    def abrir(pg, h=''):
        pg.goto(base + h); pg.wait_for_function(LISTO, timeout=120000)
        if h.startswith('#arbol-'): pg.wait_for_selector('#card:not([hidden])', timeout=60000)
    def cuidar(pg, nombre):
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        pg.fill('#f-nombre', nombre); pg.locator('.trato label').first.click(); pg.locator('.acepto input').check()
        pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_function("/Paso 2 de 2/.test(document.getElementById('mc-cuidar').textContent)", timeout=20000)
    def logra(f):   # True si f() termina sin error (una espera que se cumple); así una falla se reporta y la prueba sigue con lo demás
        try: f(); return True
        except Exception: return False
    # De 3 puntos del control con el foco (centro y dos esquinas), cuántos tapa el pie fijo o la X de la ventana, o quedan fuera de la pantalla.
    # El campo de la foto está escondido a propósito: se mide su etiqueta («Agregar fotografía»), que es lo que se ve.
    TAPADO = """(() => { let e = document.activeElement; if (!e || e === document.body) return 3;
      if (e.type === 'file') e = document.querySelector('label[for="' + e.id + '"]') || e;
      const r = e.getBoundingClientRect(), ps = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4]];
      const tapa = t => t && !e.contains(t) && (t.closest('.fijo-abajo') && !e.closest('.fijo-abajo') || t.closest('.modal-card > .close'));
      return ps.filter(([x, y]) => y < 0 || y > innerHeight || tapa(document.elementFromPoint(x, y))).length; })()"""

    print('3. Ligas de árboles cuya UGA es de otra alcaldía', flush=True)
    ligas = ['BJU-002-2892', 'AZC-004-1183'] + [muestra[k] for k in sorted(muestra)[::max(1, len(muestra) // 4)]][:4]
    ctx, pg = pagina()
    for idc in ligas:
        pg.goto('about:blank'); pg.goto(base + '#arbol-' + idc); pg.wait_for_function(LISTO, timeout=120000)
        try: pg.wait_for_function(f"!document.getElementById('card').hidden && document.getElementById('card').dataset.idc === {json.dumps(idc)}", timeout=30000); abre = True
        except Exception: abre = False
        ok(abre, f'la liga #arbol-{idc} abre su ficha')
    ctx.close()

    print('4. Dos pestañas del mismo navegador', flush=True)
    ctx, a = pagina(); abrir(a, '#arbol-MIH-029-1491'); _, bb = pagina(ctx=ctx); abrir(bb, '#arbol-MIH-027-2450')
    cuidar(a, 'Persona A'); cuidar(bb, 'Persona B')
    guardado = json.loads(bb.evaluate("localStorage.getItem('gda:v1:arboles')"))
    ok({'MIH-029-1491', 'MIH-027-2450'} <= set(guardado), f'quedan guardados los árboles de las dos pestañas: {guardado}')
    ok(logra(lambda: a.wait_for_function("document.getElementById('mis-n').textContent.trim() === '3'", timeout=5000)),
       f'la primera pestaña cuenta, sin recargar, el árbol que cuidó la otra (3 con el de ejemplo; dice {a.inner_text("#mis-n").strip()})')
    a.keyboard.press('Escape'); a.wait_for_selector('#m-cuidar', state='hidden'); a.click('#mis-btn'); a.wait_for_selector('#m-mis:not([hidden])')
    bb.keyboard.press('Escape'); bb.wait_for_selector('#m-cuidar', state='hidden'); bb.wait_for_timeout(300); bb.evaluate("location.hash = '#arbol-MIH-029-1490'")
    bb.wait_for_selector('#card:not([hidden])[data-idc="MIH-029-1490"]', timeout=30000); cuidar(bb, 'Persona B')
    al_dia = logra(lambda: a.wait_for_function("document.querySelectorAll('#mc-mis .mis-lista li').length === 4", timeout=5000))
    a.keyboard.press('Escape'); a.wait_for_timeout(400)
    ok(al_dia and a.locator('#m-mis').is_hidden(), '«Mis árboles» abierto en la primera pestaña se pone al día con el árbol de la otra, y Escape lo sigue cerrando')
    ctx.close()

    print('5. Almacenamiento lleno', flush=True)
    ctx, pg = pagina(init="Storage.prototype.setItem = function(){ throw new DOMException('lleno', 'QuotaExceededError'); };")
    abrir(pg, '#arbol-MIH-029-1491'); cuidar(pg, 'Ana')
    aviso_p2 = pg.locator('#mc-cuidar .aviso-guardar')
    ok(aviso_p2.count() and aviso_p2.is_visible(), 'el paso 2 avisa que este navegador no guarda la lista: ' + (aviso_p2.inner_text()[:60] if aviso_p2.count() else '(sin aviso)'))
    pg.keyboard.press('Escape'); pg.wait_for_selector('#m-cuidar', state='hidden'); pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])')
    ok(pg.locator('#mc-mis .aviso-guardar').count() and 'se guarda solo en este navegador' not in pg.inner_text('#mc-mis'), '«Mis árboles» avisa que la lista no se guarda (y ya no dice que se guarda)')
    ctx.close()

    print('6. Llegar con la liga de un árbol y oprimir «atrás» con el formulario abierto', flush=True)
    for vista in ('escritorio', 'cel'):
        ctx, pg = pagina(vista); abrir(pg, '#arbol-MIH-029-1491')
        if vista == 'cel': pg.wait_for_timeout(600)
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        pg.fill('#f-nombre', 'Ana Prueba'); pg.go_back(); pg.wait_for_timeout(800)
        sigue = pg.url == base + '#arbol-MIH-029-1491' and pg.locator('#m-cuidar').is_hidden() and pg.locator('#card').is_visible()
        ok(sigue, f'{vista}: «atrás» cierra el formulario y sigue en la ficha ({pg.url.split("/")[-1]})')
        if sigue:
            pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
            ok(pg.input_value('#f-nombre') == 'Ana Prueba', f'{vista}: al volver a abrirlo, el nombre escrito sigue ahí')
            pg.click('#mc-cuidar .close'); pg.wait_for_selector('#m-cuidar', state='hidden'); pg.wait_for_timeout(300)
            ok(pg.url == base + '#arbol-MIH-029-1491', f'{vista}: la X lo cierra y la dirección sigue en el árbol')
        ctx.close()

    print('7. Lo escrito no se pierde al cerrar el formulario', flush=True)
    ctx, pg = pagina(); abrir(pg, '#arbol-MIH-029-1491')
    VAL = "[document.getElementById('f-nombre').value, document.getElementById('f-arbol').value, document.getElementById('f-carta').value, (document.querySelector('#f-trato input:checked') || {}).value || null]"
    for cerrar in ('Escape', 'X'):
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        pg.fill('#f-nombre', 'Ana ' + cerrar); pg.fill('#f-arbol', 'La Sombrita'); pg.fill('#f-carta', 'Gracias por la sombra'); pg.locator('#f-trato label').nth(1).click()
        antes = pg.evaluate(VAL)
        if cerrar == 'Escape': pg.keyboard.press('Escape')
        else: pg.click('#mc-cuidar .close')
        pg.wait_for_selector('#m-cuidar', state='hidden')
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        ok(pg.evaluate(VAL) == antes, f'cerrado con {cerrar}: nombre, nombre del árbol, mensaje y trato siguen ahí')
        pg.keyboard.press('Escape'); pg.wait_for_selector('#m-cuidar', state='hidden')
    ctx.close()

    print('8. Dos ventanas encimadas', flush=True)
    ctx, pg = pagina(); abrir(pg)
    pg.click('#abrir-info'); pg.wait_for_selector('#m-info:not([hidden])'); pg.locator('#mc-info').get_by_role('button', name='Aviso de privacidad').click(); pg.wait_for_selector('#m-priv:not([hidden])')
    pg.go_back(); pg.wait_for_timeout(600)
    ok(pg.locator('#m-priv').is_hidden() and pg.locator('#m-info').is_visible(), '«atrás» cierra el aviso de privacidad y deja «Cómo funciona»')
    for m in ('#m-priv', '#m-info'):
        if pg.locator(m).is_visible(): pg.locator(m).press('Escape'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.activeElement && document.activeElement.id") == 'abrir-info', 'al cerrar las dos, el foco regresa al botón «Cómo funciona»')
    ctx.close()

    print('9. Foto de la calle y «Usar mi ubicación»', flush=True)
    ctx, pg = pagina(geolocation={'latitude': 19.4316, 'longitude': -99.1925}, permissions=['geolocation'])
    pedidos = []; pg.on('request', lambda q: pedidos.append(q.url))
    abrir(pg, '#arbol-MIH-029-1491'); pg.locator('#card .sv-pedir').click(); pg.wait_for_selector('#card .sv-marco iframe', timeout=10000)
    antes = len([u for u in pedidos if 'google' in u]); pg.click('#usar-ubic')
    pg.wait_for_function("document.querySelector('#card .cerca')", timeout=30000); pg.wait_for_timeout(1500)
    nuevos = [u for u in pedidos if 'google' in u][antes:]
    pide = pg.locator('#card .sv-pedir').is_visible()
    ok(not nuevos and pide, f'la ficha del árbol más cercano pide la foto con un toque ({len(nuevos)} peticiones a Google)')
    if pide:
        pg.locator('#card .sv-pedir').click(); pg.wait_for_timeout(1500)
        ok(len([u for u in pedidos if 'google' in u]) > antes, 'al tocar «Ver la foto de la calle», sí se pide')
    ctx.close()

    print('10. El pie fijo no tapa el campo con el foco', flush=True)
    for nombre, vista in (('zoom al 200 % (720 × 450)', {'viewport': {'width': 720, 'height': 450}}), ('1440 × 900', VISTAS['escritorio'])):
        ctx, pg = pagina(vista); abrir(pg, '#arbol-MIH-029-1491')
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_selector('.resumen-errores:not([hidden])')
        pg.locator('.resumen-errores-enlace').first.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        ok(pg.evaluate("document.activeElement.id") == 'f-nombre' and pg.evaluate(TAPADO) == 0, f'{nombre}: la liga del resumen lleva a «Tu nombre» y se ve completo')
        tapados = []
        for _ in range(14):
            pg.keyboard.press('Tab'); pg.wait_for_timeout(120)
            if pg.evaluate(TAPADO) == 3: tapados.append(pg.evaluate("(document.activeElement.id || document.activeElement.textContent || '').trim().slice(0, 30)"))
        ok(not tapados, f'{nombre}: con Tab, ningún control queda tapado por completo ({tapados})')
        ctx.close()

    print('11. Descargar con el teclado', flush=True)
    ctx, pg = pagina(accept_downloads=True); abrir(pg, '#arbol-MIH-029-1491'); cuidar(pg, 'Ana')
    bt = boton_formato(pg, 'Imagen'); bt.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    ok(pg.evaluate("document.activeElement && document.activeElement.textContent.trim()") == 'Imagen', 'mientras prepara la imagen, el foco se queda en el botón')
    pg.wait_for_function("/Listo/.test(document.querySelector('#mc-cuidar .recono-acc .estado').textContent)", timeout=30000)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    ok(pg.locator('#m-cuidar').is_hidden(), 'después, Escape cierra la ventana')
    ctx.close()

    print('12. La liga de un árbol sin internet', flush=True)
    ctx, pg = pagina(); corte = {'si': True}
    pg.route('**/datos/arboles_016.txt*', lambda r: r.abort() if corte['si'] else r.continue_())
    pg.goto(base + '#arbol-MIH-029-1491'); pg.wait_for_function(LISTO, timeout=120000)
    hay = logra(lambda: pg.wait_for_selector('.liga-fallida', timeout=20000))
    ok(hay and pg.locator('.liga-fallida').get_by_role('button', name='Volver a intentar').is_visible(), 'el panel dice que no pudo abrir el árbol y ofrece «Volver a intentar»')
    if hay:
        corte['si'] = False; pg.locator('.liga-fallida').get_by_role('button', name='Volver a intentar').click()
        ok(logra(lambda: pg.wait_for_function("!document.getElementById('card').hidden && document.getElementById('card').dataset.idc === 'MIH-029-1491'", timeout=30000))
           and not pg.locator('.liga-fallida').count(), 'con la red de vuelta, «Volver a intentar» abre el árbol de la liga')
    ctx.close()
    b.close()
srv.shutdown()
ok(not errs, f'sin errores de página ({errs[:2]})')
fin()
