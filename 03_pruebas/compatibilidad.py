"""Compatibilidad (Lote 5): Safari (WebKit) en iPhone, navegador sin WebGL, almacenamiento bloqueado (incógnito estricto),
sin internet a media visita y persona que regresa. Uso: python compatibilidad.py [carpeta de capturas]"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, servidor, LISTO, boton_formato

CAP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'resultados' / 'compatibilidad'; CAP.mkdir(parents=True, exist_ok=True)
base, srv = servidor()
r = []
def ok(c, t): r.append((bool(c), t)); print(('  OK   ' if c else '  FALLA ') + t, flush=True)
SIN_GL = "const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, ...a){ return /webgl/i.test(t) ? null : o.call(this, t, ...a); };"
SIN_ALM = "Object.defineProperty(window, 'localStorage', {get(){ throw new DOMException('bloqueado', 'SecurityError'); }});"
def pagina(b, args, init=None):
    ctx = b.new_context(accept_downloads=True, **args)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); return ctx, pg, errs
def cuidar(pg, nombre='Ana'):
    pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
    pg.fill('#f-nombre', nombre); pg.locator('.trato label').first.click(); pg.locator('.acepto input').check(); pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_timeout(3000)
    return 'Paso 2 de 2' in pg.inner_text('#mc-cuidar')

with sync_playwright() as p:
    print('1. Safari en iPhone (WebKit)')
    wk = p.webkit.launch(); ctx, pg, errs = pagina(wk, p.devices['iPhone 14'])
    pg.goto(base + '#arbol-MIH-029-1491'); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(1500)
    ok(True, 'abre la página y la liga directa a un árbol')
    b_ = pg.get_by_role('button', name='Ver la foto de la calle y más')
    if b_.count(): b_.first.click(); pg.wait_for_timeout(600)
    ok(cuidar(pg), 'cuidar un árbol llega al reconocimiento')
    with pg.expect_download(timeout=60000) as d: boton_formato(pg, 'PDF').click()
    ok(d.value.suggested_filename.endswith('.pdf'), 'descarga el PDF')
    pg.screenshot(path=str(CAP / 'safari_iphone.png')); ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2])); ctx.close(); wk.close()

    ch = p.chromium.launch(args=FLAGS)
    for nom, args in [('escritorio', dict(viewport={'width': 1440, 'height': 900})), ('cel', dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True))]:
        print(f'2. Sin WebGL ({nom})')
        ctx, pg, errs = pagina(ch, args, SIN_GL)
        pg.goto(base); pg.wait_for_function("document.getElementById('loader').hidden", timeout=120000); pg.wait_for_timeout(1000)
        ok(pg.is_visible('.sin-mapa-aviso') and 'no puede mostrar el mapa' in pg.inner_text('.sin-mapa-aviso'), 'aviso «Tu navegador no puede mostrar el mapa» en lugar del mapa')
        ok(not pg.is_visible('.toolbar') and not pg.is_visible('.legend'), 'sin botones ni simbología del mapa')
        pg.fill('#omni', 'Narvarte Poniente'); pg.wait_for_timeout(500)
        pg.locator('#omni-list li[role=option]', has_text='Narvarte Poniente').first.dispatch_event('mousedown'); pg.wait_for_timeout(4000)
        ok('Narvarte Poniente' in pg.inner_text('#answer'), 'buscar una colonia abre su panel')
        pg.get_by_role('button', name='Elige un árbol que espera quien lo cuide').first.click(); pg.wait_for_timeout(2500)
        ok(pg.is_visible('#card'), 'elegir un árbol desde el panel abre su ficha encima del aviso')
        if nom == 'cel':
            b_ = pg.get_by_role('button', name='Ver la foto de la calle y más')
            if b_.count(): b_.first.click(); pg.wait_for_timeout(600)
        ok(cuidar(pg), 'cuidar desde la lista llega al reconocimiento')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500); pg.screenshot(path=str(CAP / f'sin_webgl_{nom}.png')); ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2])); ctx.close()

    print('3. Almacenamiento bloqueado (incógnito estricto)')
    ctx, pg, errs = pagina(ch, dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True), SIN_ALM)
    pg.goto(base + '#arbol-MIH-029-1491'); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(1200)
    b_ = pg.get_by_role('button', name='Ver la foto de la calle y más')
    if b_.count(): b_.first.click(); pg.wait_for_timeout(600)
    ok(cuidar(pg), 'cuida un árbol aunque el navegador no deje guardar nada'); ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2])); ctx.close()

    print('4. Sin internet a media visita')
    ctx, pg, errs = pagina(ch, dict(viewport={'width': 1440, 'height': 900}))
    pg.goto(base); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(1000)
    ctx.set_offline(True)
    pg.fill('#omni', 'Narvarte Poniente'); pg.wait_for_timeout(500)
    pg.locator('#omni-list li[role=option]', has_text='Narvarte Poniente').first.dispatch_event('mousedown'); pg.wait_for_timeout(5000)
    texto = pg.inner_text('#answer') + ' ' + (pg.inner_text('#aviso') if pg.is_visible('#aviso') else '')
    ok('No se pudieron descargar' in texto or 'internet' in texto.lower(), 'sin internet, avisa que no pudo descargar los árboles: ' + texto[:160].replace('\n', ' '))
    pg.screenshot(path=str(CAP / 'sin_internet.png'))
    ok(pg.get_by_role('button', name='Volver a intentar').count() == 1, 'el panel ofrece «Volver a intentar»')
    ctx.set_offline(False); pg.get_by_role('button', name='Volver a intentar').first.click(); pg.wait_for_timeout(5000)
    ok('Elige un árbol que espera quien lo cuide' in pg.inner_text('#answer'), 'con la conexión de vuelta, «Volver a intentar» carga los árboles'); ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2])); ctx.close()

    print('5. Persona que regresa')
    ctx = ch.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script(
        "if (!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('gda:v1:arboles', JSON.stringify(['MIH-029-1491'])); localStorage.setItem('gda:v1:lugares', JSON.stringify({'MIH-029-1491':{calle:'Avenida Horacio', col:1583, mun:'016', pat:null}})); }")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(base); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(800)
    esperado = 1 + (1 if pg.evaluate('CONFIG.SIMULAR_GUARDIANES') else 0)   # en modo prueba se suma el árbol simulado «que tú cuidas»
    ok(pg.is_visible('#mis-btn') and pg.inner_text('#mis-n').strip() == str(esperado), f'«Mis árboles» aparece con su árbol (contador {pg.inner_text("#mis-n").strip()})')
    pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])'); pg.locator('#m-mis').get_by_role('button', name='Ver en el mapa').first.click(); pg.wait_for_timeout(4000)
    ok(pg.is_visible('#card') and 'Tú' in pg.inner_text('#card'), '«Ver en el mapa» abre la ficha de su árbol («Tú ya lo cuidas»)'); ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2])); ctx.close()
    ch.close()
srv.shutdown()
print(f'{sum(1 for c, _ in r if c)} de {len(r)} revisiones bien'); sys.exit(0 if all(c for c, _ in r) else 1)
