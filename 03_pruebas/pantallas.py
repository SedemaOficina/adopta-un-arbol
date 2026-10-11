"""Común a las pruebas de Guardianes de árboles: servidor local del sitio, navegadores y las 13 pantallas que se revisan.
recorrer(navegador, vista, al_llegar) abre cada pantalla y llama al_llegar(pagina, nombre) cuando ya está lista."""
import functools, gzip, os, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SITIO = RAIZ / '10_sitio'
FLAGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
VISTAS = {'escritorio': dict(viewport={'width': 1440, 'height': 900}),
          'cel': dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)}
LISTO = "document.getElementById('loader').hidden && document.documentElement.dataset.calles === 'listas'"
CARGADO = "!/Cargando/.test(document.getElementById('mapsum').textContent + (document.getElementById('answer') || {}).textContent)"

def servidor(sitio=SITIO, comprimir=False, encabezados=None):
    """Sirve la carpeta del sitio en 127.0.0.1 (puerto libre). comprimir=True usa gzip como GitHub Pages. Devuelve (url_base, server)."""
    cache = {}
    class H(SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def end_headers(self):
            for k, v in (encabezados or {}).items(): self.send_header(k, v)
            super().end_headers()
        def do_GET(self):
            ruta = self.translate_path(self.path)
            if comprimir and 'gzip' in self.headers.get('Accept-Encoding', '') and os.path.isfile(ruta) and ruta.endswith(('.html', '.js', '.css', '.txt')):
                if ruta not in cache: cache[ruta] = gzip.compress(open(ruta, 'rb').read(), 6)
                c = cache[ruta]; self.send_response(200); self.send_header('Content-Type', self.guess_type(ruta))
                self.send_header('Content-Encoding', 'gzip'); self.send_header('Content-Length', str(len(c))); self.end_headers(); self.wfile.write(c); return
            return super().do_GET()
    srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(sitio)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}/index.html', srv

PANTALLAS = ['01_inicio', '02_colonia', '03_alcaldia', '04_arbol_con_guardianes', '05_arbol_espera', '06_cuidar_paso1', '07_patrimonial_espera',
             '08_patrimonial_cuidan', '09_reconocimiento', '10_mis_arboles', '11_como_funciona', '12_busqueda', '13_busqueda_sin_resultado']

def recorrer(ctx, base, vista, al_llegar, errores=None, solo=None):
    """Abre las 13 pantallas en el contexto ctx; en cada una llama al_llegar(pagina, nombre)."""
    errores = errores if errores is not None else []
    def abrir(h=''):
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errores.append(str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and errores.append('consola: ' + m.text[:300]))
        pg.goto(base + h); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(2500)
        pg.wait_for_function(CARGADO, timeout=120000); pg.wait_for_timeout(500); return pg
    def ficha_amplia(pg):
        if vista == 'cel':
            b = pg.get_by_role('button', name='Ver la foto de la calle y más')
            if b.count(): b.first.click(); pg.wait_for_timeout(800)
    def desplegar(pg, *nombres):
        for n in nombres:
            l = pg.locator('#card').get_by_role('button', name=n)
            if l.count(): l.first.click(); pg.wait_for_timeout(400)
    quiere = lambda n: not solo or n in solo
    if quiere('01_inicio'): pg = abrir(); al_llegar(pg, '01_inicio'); pg.close()
    if quiere('02_colonia') or quiere('03_alcaldia'):
        pg = abrir('#colonia-1583')
        if quiere('02_colonia'): al_llegar(pg, '02_colonia')
        if quiere('03_alcaldia'):
            pg.locator('#crumb button').nth(1).click(); pg.wait_for_timeout(6000)
            pg.wait_for_function("!/Cargando/.test(document.getElementById('answer').textContent)", timeout=120000); al_llegar(pg, '03_alcaldia')
        pg.close()
    if quiere('04_arbol_con_guardianes'):
        pg = abrir('#arbol-MIH-029-1493'); ficha_amplia(pg); desplegar(pg, 'Invitar a alguien a cuidarlo', 'Cómo cuidarlo'); al_llegar(pg, '04_arbol_con_guardianes'); pg.close()
    if quiere('05_arbol_espera') or quiere('06_cuidar_paso1'):
        pg = abrir('#arbol-MIH-029-1491'); ficha_amplia(pg); desplegar(pg, 'Invitar a alguien a cuidarlo')
        if quiere('05_arbol_espera'): al_llegar(pg, '05_arbol_espera')
        if quiere('06_cuidar_paso1'):
            pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])'); pg.wait_for_timeout(800)
            al_llegar(pg, '06_cuidar_paso1')
        pg.close()
    if quiere('07_patrimonial_espera'):
        pg = abrir('#arbol-25-CUH-TAX-19405GIMNO-0002'); ficha_amplia(pg); desplegar(pg, 'Invitar a alguien a cuidarlo'); al_llegar(pg, '07_patrimonial_espera'); pg.close()
    if quiere('08_patrimonial_cuidan'):
        pg = abrir('#arbol-25-MIH-TAX-19405GIMNO-0001'); ficha_amplia(pg); desplegar(pg, 'Invitar a alguien a cuidarlo'); al_llegar(pg, '08_patrimonial_cuidan'); pg.close()
    if quiere('09_reconocimiento'):
        pg = abrir('#arbol-MIH-029-1492'); pg.locator('#card').get_by_role('button', name='Ver mi reconocimiento').first.click()
        pg.wait_for_selector('#m-cuidar:not([hidden])'); pg.wait_for_timeout(2500); al_llegar(pg, '09_reconocimiento'); pg.close()
    if quiere('10_mis_arboles'):
        pg = abrir(); pg.click('#mis-btn'); pg.wait_for_selector('#m-mis:not([hidden])'); pg.wait_for_timeout(600); al_llegar(pg, '10_mis_arboles'); pg.close()
    if quiere('11_como_funciona'):
        pg = abrir(); pg.click('#abrir-info'); pg.wait_for_selector('#m-info:not([hidden])'); pg.wait_for_timeout(600)
        mas = pg.locator('#m-info').get_by_role('button', name='Ver más videos', exact=False)
        if mas.count(): mas.first.click(); pg.wait_for_timeout(400)
        al_llegar(pg, '11_como_funciona'); pg.close()
    if quiere('12_busqueda') or quiere('13_busqueda_sin_resultado'):
        pg = abrir(); pg.fill('#omni', 'Horacio'); pg.wait_for_timeout(600)
        if quiere('12_busqueda'): al_llegar(pg, '12_busqueda')
        if quiere('13_busqueda_sin_resultado'): pg.fill('#omni', 'zzqx'); pg.wait_for_timeout(400); al_llegar(pg, '13_busqueda_sin_resultado')
        pg.close()
    return errores
