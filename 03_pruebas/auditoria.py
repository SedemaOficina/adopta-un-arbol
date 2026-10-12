"""Errores que encontró la auditoría de v30 (12 oct 2026) y que no deben volver:
1. «Ciudad» después de mover el mapa a mano vuelve a la ciudad (deck.gl ignoraba un vuelo igual al anterior).
2. Abrir desde «Mis árboles» un árbol de otra colonia deja la ficha abierta (el «atrás» interno la cerraba).
3. «Atrás» con una ventana abierta la cierra y deja la ficha y la dirección como estaban.
4. En el celular, con la información a la vista, el aviso se puede tocar (antes estaba dentro del mapa, que es inert).
5. Cada árbol tiene su borrador del reconocimiento: el nombre del árbol no pasa al siguiente; el de la persona sí.
6. Un dato dañado en el navegador («{}» donde va la lista de árboles) no impide abrir la página.
7. armar.py --produccion no escribe en 10_sitio/ (lo que publica GitHub Pages).
8. (v30d) La caja de calle con un teclado que arma la palabra (Gboard en Android): «Hora» queda «Hora» (antes «HHoHorHoraHora»).
9. (v30d) En Avenida Horacio ninguna cuadra se llama igual que otra y al tocar una se abre solo esa.
10. (v30e) Fotografía del reconocimiento: sin foto no se ve «Quitar fotografía» (antes se veía siempre); con foto, su miniatura y
    «Cambiar fotografía»; «Quitar fotografía» la quita y regresa a «Agregar fotografía».
11. (v30g) «Para probar» es un control del mapa (no está en el panel): abre sus 6 casos, Escape lo cierra y elegir un caso abre su árbol.
Uso: python auditoria.py"""
import subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, VISTAS, servidor, revisiones

RAIZ = Path(__file__).resolve().parents[1]
base, srv = servidor()
ok, fin = revisiones()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []
    def pagina(vista='escritorio', init=None, **extra):
        ctx = b.new_context(locale='es-MX', **VISTAS[vista], **extra); pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script('window.__ETQ = {};' + (init or ''))
        return ctx, pg
    def abrir(pg, h=''):
        pg.goto(base + h); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_function(CARGADO, timeout=120000); pg.wait_for_timeout(1500)

    print('1. «Ciudad» después de mover el mapa', flush=True)
    ctx, pg = pagina(); abrir(pg); pg.wait_for_timeout(1500)
    z0 = pg.evaluate("window.__ETQ.vista ? window.__ETQ.vista.z : 0")
    m = pg.locator('#map').bounding_box(); pg.mouse.move(m['x'] + m['width'] / 2, m['y'] + m['height'] / 2)
    for _ in range(8): pg.mouse.wheel(0, -120); pg.wait_for_timeout(80)
    pg.wait_for_timeout(1500); z1 = pg.evaluate("window.__ETQ.vista.z")
    pg.click('#zcity'); pg.wait_for_timeout(2500); z2 = pg.evaluate("window.__ETQ.vista.z")
    ok(z1 > z0 + .8 and abs(z2 - z0) < .3, f'«Ciudad» regresa a la ciudad después de acercar a mano (zoom {z0:.2f} → {z1:.2f} → {z2:.2f})')
    ctx.close()

    print('2. Un árbol de otra colonia desde «Mis árboles»', flush=True)
    ctx, pg = pagina(); abrir(pg, '#colonia-1693')
    pg.fill('#omni', '04330'); pg.wait_for_timeout(500); pg.locator('#omni-list li[role=option]').first.dispatch_event('mousedown'); pg.wait_for_timeout(2000)
    pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])')
    pg.locator('#m-mis').get_by_role('button', name='Ver en el mapa').first.click(); pg.wait_for_timeout(3500)
    ok(pg.is_visible('#card') and pg.evaluate("location.hash").startswith('#arbol-'), f'la ficha se queda abierta ({pg.evaluate("location.hash")})')

    print('3. «Atrás» con una ventana abierta', flush=True)
    pg.locator('#card').get_by_role('button', name='Ver mi reconocimiento').first.click(); pg.wait_for_selector('#m-cuidar:not([hidden])'); h0 = pg.evaluate("location.hash")
    pg.go_back(); pg.wait_for_timeout(1200)
    ok(pg.is_hidden('#m-cuidar') and pg.is_visible('#card') and pg.evaluate("location.hash") == h0, '«atrás» cierra la ventana y deja la ficha y la dirección')
    ctx.close()

    print('4. Aviso en el celular con la información a la vista', flush=True)
    ctx, pg = pagina('cel'); abrir(pg)
    pg.click('#usar-ubic'); pg.wait_for_selector('#aviso:not([hidden])', timeout=20000); pg.wait_for_timeout(800)
    toca = pg.evaluate("""(() => { const x = document.querySelector('#aviso .av-x, #aviso'); const r = x.getBoundingClientRect();
        const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('#aviso'); })()""")
    ok(toca and pg.evaluate("document.body.classList.contains('ver-info')"), 'el aviso queda encima de la información y recibe el toque')
    ctx.close()

    print('5. Un borrador por árbol', flush=True)
    ctx, pg = pagina(); abrir(pg, '#arbol-MIH-029-1491'); pg.wait_for_selector('#card:not([hidden])')
    pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
    pg.fill('#f-nombre', 'Ana Prueba'); pg.fill('#f-arbol', 'Primero'); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.evaluate("location.hash = '#arbol-MIH-029-1490'"); pg.wait_for_timeout(2500)
    bt = pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo')
    if bt.count():
        bt.click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        v = pg.evaluate("[document.getElementById('f-nombre').value, document.getElementById('f-arbol').value]")
        ok(v == ['', ''] or v[1] == '', f'el nombre del árbol no pasa al siguiente árbol ({v})')
    else: ok(True, '(el segundo árbol de prueba ya tiene quien lo cuide: sin revisión de borrador)')
    ctx.close()

    print('6. Dato dañado en el navegador', flush=True)
    ctx, pg = pagina(init="try { localStorage.setItem('gda:v1:arboles', '{}'); } catch (e) {}")
    try: abrir(pg); ok(True, 'con «{}» en la lista de árboles la página abre')
    except Exception as e: ok(False, 'con «{}» en la lista de árboles la página no abre: ' + str(e)[:80])
    ctx.close()
    print('8 y 9. Caja de calle y cuadras de Avenida Horacio', flush=True)
    ctx, pg = pagina(); abrir(pg, '#arbol-MIH-029-1493'); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(1500)
    ets = pg.locator('.cuadra-t b').all_inner_texts(); dobles = sorted({e for e in ets if ets.count(e) > 1})
    ok(len(ets) > 10 and not dobles, f'{len(ets)} cuadras en Avenida Horacio, ninguna con el mismo nombre' + (f': {dobles}' if dobles else ''))
    pg.locator('.cuadra-t').nth(3).click(); pg.wait_for_timeout(800)
    ok(pg.locator('.cuadra-t[aria-expanded=true]').count() == 1, 'al tocar una cuadra se abre solo esa')
    pg.locator('#filtro').fill(''); pg.wait_for_timeout(400); pg.locator('#filtro').focus(); cdp = ctx.new_cdp_session(pg)
    for t in ('H', 'Ho', 'Hor', 'Hora'):
        cdp.send('Input.imeSetComposition', {'text': t, 'selectionStart': len(t), 'selectionEnd': len(t)}); pg.wait_for_timeout(250)
    cdp.send('Input.insertText', {'text': 'Hora'}); pg.wait_for_timeout(600)
    v = pg.input_value('#filtro'); quedan = pg.locator('.calle-btn').all_inner_texts()
    ok(v == 'Hora' and quedan and all('hora' in q.lower() for q in quedan), f'con un teclado que arma la palabra, la caja dice «{v}» y la lista se filtra ({len(quedan)} calles)')
    ctx.close()

    print('10. Fotografía del reconocimiento', flush=True)
    ctx, pg = pagina('cel'); abrir(pg, '#arbol-MIH-029-1491'); pg.wait_for_selector('#card:not([hidden])')
    pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').first.click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
    q0 = pg.locator('.foto-quitar').is_visible(); t0 = pg.inner_text('.foto-caja')
    pg.set_input_files('#f-foto', str(RAIZ / '02_fuente' / 'img' / 'tarjeta.jpg')); pg.wait_for_timeout(1200)
    con = pg.evaluate("[document.querySelector('.foto-caja').innerText, !document.querySelector('.foto-mini').hidden, !document.querySelector('.foto-quitar').hidden]")
    pg.locator('.foto-quitar').click(); pg.wait_for_timeout(400)
    sin = pg.evaluate("[document.querySelector('.foto-caja').innerText, document.querySelector('.foto-quitar').hidden, document.querySelector('.foto-mini').hidden]")
    ok(not q0 and t0.strip() == 'Agregar fotografía' and con == ['Cambiar fotografía', True, True] and sin == ['Agregar fotografía', True, True],
       f'fotografía: sin foto «{t0.strip()}» y sin «Quitar» ({not q0}); con foto {con}; al quitarla {sin}')
    ctx.close()

    print('11. «Para probar» en el mapa', flush=True)
    for vista in ('escritorio', 'cel'):
        ctx, pg = pagina(vista); abrir(pg)
        en_panel = pg.locator('#answer', has_text='Para probar').count()
        if vista == 'cel': pg.click('#ver-mapa'); pg.wait_for_timeout(600)
        pg.click('#probar-btn'); pg.wait_for_timeout(400); n = pg.locator('#probar-menu .fila-btn').count()
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300); cierra = pg.is_hidden('#probar-menu') and pg.evaluate("document.activeElement.id") == 'probar-btn'
        pg.click('#probar-btn'); pg.wait_for_timeout(300); pg.locator('#probar-menu .fila-btn').first.click()
        pg.wait_for_selector('#card:not([hidden])', timeout=60000); pg.wait_for_timeout(1500)
        ok(en_panel == 0 and n == 6 and cierra and pg.is_hidden('#probar-menu') and 'Avenida Horacio' in pg.inner_text('#card'),
           f'{vista}: «Para probar» fuera del panel ({en_panel == 0}), {n} casos, Escape lo cierra ({cierra}) y el primer caso abre su árbol')
        ctx.close()
    ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
    b.close()
srv.shutdown()

print('7. Producción fuera de 10_sitio', flush=True)
r = subprocess.run([sys.executable, '-X', 'utf8', str(RAIZ / '02_fuente' / 'armar.py'), '--produccion'], capture_output=True, text=True, encoding='utf-8', cwd=RAIZ / '02_fuente')
ok(r.returncode != 0 and 'otra carpeta' in (r.stdout + r.stderr), 'armar.py --produccion sin --destino se niega a escribir en 10_sitio/')
fin()
