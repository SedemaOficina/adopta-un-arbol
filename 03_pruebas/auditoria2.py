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
Bloque 2 (v32b):
13. (C2-01) La calle de 640 árboles al azar (40 por alcaldía) se encuentra escrita como en la ficha, sin el tipo, con el tipo abreviado y en
    otro orden (95 % o más; en v31i, 3 %, 97 %, 0 % y 0 %).
14. (C2-01, C1-07, E3-06) En la caja: «Avenida Horacio», «Loma Alta Batalla», «Eje 8 Sur», «508» y «Gustavo A. Madero» llevan a lo buscado;
    Enter con «Narvarte» abre la colonia Narvarte Poniente.
15. (C1-07) En la caja de la colonia, «508» encuentra «Avenida 508».
16. (C1-01) Una colonia sin árboles ofrece el árbol libre más cercano y colonias cercanas con árboles; con la ubicación a más de 500 m,
    el aviso ofrece «Verlo».
17. (B5-03 del revisor 8) Si las calles no llegan, el buscador lo dice y no «No encontramos esa calle».
18. (C2-04 del revisor 3) Con el permiso de ubicación negado, el aviso ofrece «Volver a intentar» y no se va solo.
Uso: python auditoria2.py"""
import base64, gzip, json, random, re, sys, unicodedata
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
    col = 0
    for _ in range(v()):
        col += v(); v(); v(); u, s, calle = v(), v(), v(); v(); v(); v(); v(); v()
        yield u, s, col, calle
ABR2MUN = {'AZC': '002', 'COY': '003', 'CUJ': '004', 'GAM': '005', 'IZC': '006', 'IZP': '007', 'MAC': '008', 'MLP': '009', 'AOB': '010', 'TLH': '011',
           'TLP': '012', 'XOC': '013', 'BJU': '014', 'CUH': '015', 'MIH': '016', 'VCA': '017'}   # la de las tres letras de la clave (02_datos.js)
fuera, total, muestra = 0, 0, {}   # muestra: un árbol por cada combinación (letras de la clave, alcaldía de su archivo) distinta
con_calle = {}   # por alcaldía: (colonia, calle) de los árboles que tienen las dos (parte 13)
for f in sorted((SITIO / 'datos').glob('arboles_*.txt')):
    cve = f.stem.split('_')[1]
    for u, s, col, calle in arboles(cve):
        total += 1
        if not UA or cve not in UA[u]: fuera += 1
        if ABR2MUN[UGAS[u][:3]] != cve: muestra.setdefault((UGAS[u][:3], cve), f'{UGAS[u]}-{s:04d}')
        if col >= 0 and calle >= 0: con_calle.setdefault(cve, []).append((col, calle))
ok(UA is not None and fuera == 0 and total == 961318, f'{total:,} árboles; {fuera} en un archivo que su UGA no lista; {len(muestra)} combinaciones clave → otra alcaldía')

# Parte 13: la muestra del revisor 7 de la auditoría (c1_busqueda_calles.py): 40 árboles por alcaldía y sus formas de escribir la calle
plano = lambda t: unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().lower().strip()
TIPOS = ['Eje Vial', 'Calle', 'Cerrada', 'Privada', 'Avenida', 'Andador', 'Callejón', 'Prolongación', 'Circuito', 'Peatonal', 'Calzada', 'Retorno', 'Continuación',
         'Carretera', 'Periférico', 'Autopista', 'Diagonal', 'Boulevard', 'Viaducto', 'Callejóncito', 'Corredor', 'Pasaje', 'Ampliación', 'Camino']
ABREV = {'Avenida': 'Av.', 'Calle': 'C.', 'Cerrada': 'Cda.', 'Privada': 'Priv.', 'Calzada': 'Calz.', 'Andador': 'And.', 'Callejón': 'Cjón.', 'Prolongación': 'Prol.',
         'Eje Vial': 'Eje', 'Circuito': 'Cto.', 'Retorno': 'Ret.', 'Boulevard': 'Blvd.', 'Carretera': 'Carr.'}
NOMBRES_INEGI = {plano(n) for n in P['names']}
rnd = random.Random(20261020); CASOS = []   # (variante, escrito, colonia, nombres que cuentan)
for cve in sorted(con_calle):
    for col, ic in rnd.sample(con_calle[cve], 40):
        calle = P['inv']['calles'][ic]; tipo, nom = next(((t, calle[len(t) + 1:]) for t in TIPOS if calle.startswith(t + ' ')), ('', calle))
        objetivo = {plano(nom), plano(calle)} & NOMBRES_INEGI
        if not objetivo: continue
        vs = {'como en la ficha': calle, 'sin el tipo': nom}
        if tipo in ABREV: vs['tipo abreviado'] = ABREV[tipo] + ' ' + nom
        pal = nom.split()
        if len(pal) >= 2 and not re.search(r'\d', nom): vs['otro orden'] = ' '.join(pal[1:] + pal[:1])
        CASOS += [(k, q, col, sorted(objetivo)) for k, q in vs.items()]

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

    print('13. La calle de 640 árboles al azar, escrita como la escribe la gente', flush=True)
    ctx, pg = pagina(); abrir(pg)
    if pg.evaluate("typeof window.__BUSCAR !== 'function'"): ok(False, 'el sitio no tiene la búsqueda por palabras (window.__BUSCAR)')
    else:
        halladas = {}
        for i in range(0, len(CASOS), 200):
            lote = CASOS[i:i + 200]
            r = pg.evaluate("cs => cs.map(([q, col]) => (window.__BUSCAR(q) || []).filter(x => x[1] === col).map(x => x[0]))", [[q, col] for _, q, col, _ in lote])
            for (k, q, col, obj), nombres in zip(lote, r):
                h = halladas.setdefault(k, [0, 0]); h[1] += 1; h[0] += any(plano(n) in obj for n in nombres)
        for k, (h, n) in halladas.items(): ok(h / n >= .95, f'{k}: {h} de {n} ({100 * h / n:.1f} %; mínimo 95 %)')
    ctx.close()

    print('14. Búsquedas en la caja', flush=True)
    ctx, pg = pagina(); abrir(pg)
    def primeros(q):
        pg.fill('#omni', q); pg.wait_for_function("!document.getElementById('omni-list').hidden", timeout=5000)
        return pg.evaluate("[...document.querySelectorAll('#omni-list li[role=option]')].map(li => li.textContent.trim()).slice(0, 3)")
    for q, espera in (('Avenida Horacio', r'^Calle\s*Horacio'), ('Loma Alta Batalla', r'Batalla de Loma Alta'), ('Eje 8 Sur', r'^Calle\s*8 Sur'), ('508', r'^Calle\s*508'),
                      ('Gustavo A. Madero', r'^Alcaldía\s*Gustavo A\. Madero')):
        r = primeros(q); ok(r and re.search(espera, r[0]), f'«{q}» → {r[0] if r else "(nada)"}')
    pg.fill('#omni', 'Narvarte'); pg.wait_for_function("!document.getElementById('omni-list').hidden"); pg.keyboard.press('Enter')
    ok(logra(lambda: pg.wait_for_function("(document.querySelector('#answer .cab h2') || {}).textContent === 'Col. Narvarte Poniente'", timeout=10000)),
       'Enter con «Narvarte» abre la colonia Narvarte Poniente (antes, «Calle Hacienda Narvarte» de Villa Cuemanco)')
    ctx.close()

    print('15. Un número en la caja de la colonia', flush=True)
    col508 = next((col for l in con_calle.values() for col, ic in l if P['inv']['calles'][ic] == 'Avenida 508'), None)
    if col508 is None: ok(False, 'ningún árbol del inventario está en «Avenida 508» (cambió el inventario: elegir otra calle de puro número)')
    else:
        ctx, pg = pagina(); abrir(pg, f'#colonia-{col508}'); pg.wait_for_selector('#filtro', timeout=60000); pg.fill('#filtro', '508')
        ok(logra(lambda: pg.wait_for_function("[...document.querySelectorAll('.calle-btn')].some(b => /Avenida 508/.test(b.textContent))", timeout=5000)),
           f'«508» en la caja de {P["colonias"][col508]["n"]} encuentra «Avenida 508» (antes buscaba números de árbol)')
        ctx.close()

    print('16. Una colonia sin árboles', flush=True)
    for vista in ('escritorio', 'cel'):
        ctx, pg = pagina(vista); abrir(pg, '#colonia-537')
        hay = logra(lambda: pg.wait_for_selector('#answer .btn-cerca', timeout=30000))
        ok(hay and not re.search('¿En qué calle vives?', pg.inner_text('#answer')) and pg.locator('#answer .vecinas button').count() >= 1,
           f'{vista}: Col. El Sifón dice que los estamos registrando, ofrece el árbol libre más cercano y {pg.locator("#answer .vecinas button").count()} colonias cercanas, sin «¿En qué calle vives?»')
        if hay:
            pg.click('#answer .btn-cerca')
            ok(logra(lambda: pg.wait_for_function("!document.getElementById('card').hidden && /Espera quien lo cuide/.test(document.getElementById('card').textContent)", timeout=20000)),
               f'{vista}: el botón abre la ficha de un árbol que espera quien lo cuide')
        ctx.close()
    ctx, pg = pagina(geolocation={'latitude': 19.37125, 'longitude': -99.120055}, permissions=['geolocation']); abrir(pg)
    pg.click('#usar-ubic'); hay = logra(lambda: pg.wait_for_selector('#aviso .av-accion', timeout=30000))
    ok(hay and 'Verlo' in pg.inner_text('#aviso'), 'con la ubicación a más de 500 m, el aviso ofrece «Verlo»: ' + (pg.inner_text('#aviso')[:70].replace('\n', ' ') if hay else '(sin acción)'))
    if hay:
        pg.click('#aviso .av-accion')
        ok(logra(lambda: pg.wait_for_function("!document.getElementById('card').hidden && document.querySelector('#card .cerca')", timeout=20000)), '«Verlo» abre la ficha con la distancia')
    ctx.close()

    print('17. Las calles no llegan', flush=True)
    ctx, pg = pagina(); pg.route('**/datos/calles.txt*', lambda r: r.abort())
    pg.goto(base); pg.wait_for_function("document.getElementById('loader').hidden", timeout=120000); pg.wait_for_timeout(500)
    pg.fill('#omni', 'Horacio'); pg.wait_for_function("!document.getElementById('omni-list').hidden"); t = pg.inner_text('#omni-list')
    ok('No pudimos cargar las calles' in t and 'No encontramos esa calle' not in t, 'el buscador dice que no llegaron las calles: ' + t[:60].replace('\n', ' '))
    ctx.close()

    print('18. Permiso de ubicación negado', flush=True)
    ctx, pg = pagina(); abrir(pg); pg.click('#usar-ubic')
    hay = logra(lambda: pg.wait_for_selector('#aviso .av-accion', timeout=20000))
    ok(hay and 'Volver a intentar' in pg.inner_text('#aviso'), 'el aviso ofrece «Volver a intentar»')
    pg.wait_for_timeout(11000)
    ok(pg.locator('#aviso').is_visible(), 'y sigue a la vista después de 11 s (antes se iba solo a los 10 s)')
    ctx.close()
    b.close()
srv.shutdown()
ok(not errs, f'sin errores de página ({errs[:2]})')
fin()
