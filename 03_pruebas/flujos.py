"""Flujos completos en computadora y celular: cuidar un árbol (paso 1 y 2), «Mis árboles», «Usar mi ubicación» y que un navegador con las
claves de antes de v27 (guardianias) no pierda sus árboles. Uso: python flujos.py   (capturas en resultados/flujos/)"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, VISTAS, servidor, revisiones

CAP = Path(__file__).parent / 'resultados' / 'flujos'; CAP.mkdir(parents=True, exist_ok=True)
POLANCO = {'latitude': 19.4316, 'longitude': -99.1925}   # Avenida Horacio, cerca de los árboles de prueba
base, srv = servidor()
ok, fin = revisiones()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []
    def pagina(ctx):
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and errs.append('consola: ' + m.text[:200] + ' ' + (m.location or {}).get('url', '')[-90:]))
        return pg
    for nv, o in VISTAS.items():
        print(nv, flush=True)
        # 1. Cuidar un árbol que espera quien lo cuide
        ctx = b.new_context(geolocation=POLANCO, permissions=['geolocation'], **o); pg = pagina(ctx)
        pg.goto(base + '#arbol-MIH-029-1491'); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_selector('#card:not([hidden])', timeout=60000); pg.wait_for_timeout(1000)
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])', timeout=20000)
        pg.fill('#f-nombre', 'Prueba'); pg.locator('.trato label').first.click(); pg.locator('.acepto input').check(); pg.screenshot(path=str(CAP / f'{nv}_1_cuidar_paso1.png'))
        pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_timeout(2500)
        t = pg.inner_text('#mc-cuidar')
        ok('Paso 2 de 2' in t and 'Prueba' in t, 'cuidar: paso 2 con el reconocimiento a nombre de quien lo cuida')
        guard = pg.evaluate("localStorage.getItem('gda:v1:arboles')")
        ok(guard and 'MIH-029-1491' in guard, 'el navegador guarda solo la clave del árbol: ' + str(guard))
        ok('Prueba' not in pg.evaluate("JSON.stringify(localStorage)"), 'el nombre no se guarda en el navegador')
        pg.screenshot(path=str(CAP / f'{nv}_2_cuidar_paso2.png')); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        # 2. Mis árboles
        pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])', timeout=20000); pg.wait_for_timeout(500)
        t = pg.inner_text('#mc-mis')
        ok('Horacio' in t and 'Polanco' in t, '«Mis árboles» muestra la calle y la colonia del árbol cuidado')
        pg.screenshot(path=str(CAP / f'{nv}_3_mis_arboles.png')); ctx.close()
        # 3. Usar mi ubicación (página nueva, sin árbol abierto)
        ctx = b.new_context(geolocation=POLANCO, permissions=['geolocation'], **o); pg = pagina(ctx)
        pg.goto(base); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(500); pg.click('#usar-ubic')
        try:
            pg.wait_for_selector('#card:not([hidden])', timeout=90000); pg.wait_for_timeout(2500)
            ok(True, '«Usar mi ubicación» abre el árbol más cercano que espera quien lo cuide')
        except Exception:
            ok(False, '«Usar mi ubicación» no abrió un árbol; aviso: ' + (pg.inner_text('#aviso')[:120] if pg.is_visible('#aviso') else ''))
        pg.screenshot(path=str(CAP / f'{nv}_4_ubicacion.png')); ctx.close()
        # 4. Un navegador que ya cuidaba un árbol con las claves de antes (v26): no lo pierde
        ctx = b.new_context(**o)
        ctx.add_init_script("if (!sessionStorage.getItem('sembrado')){ sessionStorage.setItem('sembrado', '1'); localStorage.clear(); localStorage.setItem('guardianias', JSON.stringify(['MIH-029-1491'])); localStorage.setItem('guardianias_meta', JSON.stringify({'MIH-029-1491': {calle:'Avenida Horacio', col:1583, mun:'016', pat:null}})); }")
        pg = pagina(ctx); pg.goto(base); pg.wait_for_function(LISTO, timeout=120000)
        nuevas = pg.evaluate("[localStorage.getItem('gda:v1:arboles'), localStorage.getItem('gda:v1:lugares'), localStorage.getItem('guardianias')]")
        ok(nuevas[0] and 'MIH-029-1491' in nuevas[0] and nuevas[1] and 'Horacio' in nuevas[1], 'las claves de antes se copian a gda:v1:arboles y gda:v1:lugares')
        ok(nuevas[2] is not None, 'las claves de antes se conservan')
        pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])'); pg.wait_for_timeout(500)
        ok('Horacio' in pg.inner_text('#mc-mis'), '«Mis árboles» muestra el árbol que se cuidaba con la versión anterior')
        ctx.close()
    b.close()
srv.shutdown()
ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
fin()
