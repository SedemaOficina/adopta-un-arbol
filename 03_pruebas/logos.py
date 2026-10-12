"""Capturas de todos los lugares con logo, para revisarlas a ojo (p. ej. con Comunicación): barra (computadora y celular), pantalla
de carga, pie de «Cómo funciona», ficha patrimonial y reconocimiento común y patrimonial. Revisa que todas las imágenes carguen.
Uso: python logos.py   (capturas en resultados/logos/)"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, VISTAS, servidor, revisiones, boton_formato

CAP = Path(__file__).parent / 'resultados' / 'logos'; CAP.mkdir(parents=True, exist_ok=True)
CARGADAS = "[...document.images].filter(i => i.src && i.offsetParent).every(i => i.complete && i.naturalWidth > 0)"
base, srv = servidor()
ok, fin = revisiones()
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []; rotas = []
    for vista, o in VISTAS.items():
        print(vista, flush=True)
        ctx = b.new_context(accept_downloads=True, **o)
        ctx.on('response', lambda r: r.status >= 400 and '/img/' in r.url and rotas.append(r.url))
        def abrir(h=''):
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.goto(base + h); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(2500); return pg
        pg = abrir()
        pg.screenshot(path=str(CAP / f'{vista}_1_barra.png'), clip={'x': 0, 'y': 0, 'width': o['viewport']['width'], 'height': 110})
        ok(pg.evaluate(CARGADAS), 'el logo de la barra carga')
        pg.evaluate("document.getElementById('loader').hidden = false"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(CAP / f'{vista}_2_carga.png')); pg.evaluate("document.getElementById('loader').hidden = true")
        pg.click('#abrir-info'); pg.wait_for_selector('#m-info:not([hidden])'); pg.wait_for_timeout(500)
        pg.evaluate("const m = document.querySelector('#mc-info'); m.scrollTop = m.scrollHeight"); pg.wait_for_timeout(400)
        pg.screenshot(path=str(CAP / f'{vista}_3_pie_como_funciona.png')); ok(pg.evaluate(CARGADAS), 'el logo del pie de «Cómo funciona» carga'); pg.close()
        pg = abrir('#arbol-25-CUH-TAX-19405GIMNO-0002')
        if vista == 'cel':
            g = pg.get_by_role('button', name='Ver la foto de la calle y más')
            if g.count(): g.first.click(); pg.wait_for_timeout(800)
        pg.screenshot(path=str(CAP / f'{vista}_4_ficha_patrimonial.png'))
        ok(pg.locator('#card .btn-pat-sello').count() == 1 and pg.evaluate(CARGADAS), 'la ficha patrimonial lleva el emblema y carga')
        pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
        pg.fill('#f-nombre', 'Mariana'); pg.locator('.trato label').first.click(); pg.locator('.acepto input').check(); pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_timeout(3000)
        pg.screenshot(path=str(CAP / f'{vista}_5_reconocimiento_patrimonial.png'))
        if vista == 'escritorio':
            with pg.expect_download() as d: boton_formato(pg, 'Imagen').click()
            d.value.save_as(str(CAP / 'reconocimiento_patrimonial.png'))
        pg.close()
        if vista == 'escritorio':
            pg = abrir('#arbol-MIH-029-1492'); pg.locator('#card').get_by_role('button', name='Ver mi reconocimiento').first.click(); pg.wait_for_timeout(2500)
            with pg.expect_download() as d: boton_formato(pg, 'Imagen').click()
            d.value.save_as(str(CAP / 'reconocimiento_comun.png')); pg.close()
        ctx.close()
    b.close()
srv.shutdown()
ok(not rotas, 'ninguna imagen falta: ' + (', '.join(rotas[:3]) or 'todas llegan'))
ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
fin()
