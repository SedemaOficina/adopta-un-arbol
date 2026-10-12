"""Versión de producción para el SIA (Lote 7): la arma en una carpeta aparte (10_sitio no se toca: el repositorio guarda la de prueba),
revisa que no lleve nada del modo prueba ni rutas que fallen en Linux, y la prueba en Chromium con compresión y con los encabezados
de seguridad propuestos para el SIA (04_sia/encabezados.conf), igual que los serviría su servidor.
Uso: python produccion.py [--paquete]
  --paquete  además, 04_sia/paquetes/adopta-un-arbol-v<versión>.zip y su huella SHA-256 (.sha256), listos para entregar al SIA.
Recordatorio (decisión de Liber, 11 oct 2026): se publica en producción solo con el servicio de conteo del SIA listo (pendiente 7)."""
import hashlib, os, re, subprocess, sys, tempfile, time, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, servidor, revisiones

RAIZ = Path(__file__).resolve().parents[1]
CONF = RAIZ / '04_sia' / 'encabezados.conf'
ENCABEZADOS = dict(re.findall(r'^add_header\s+(\S+)\s+"(.*)"\s+always;', CONF.read_text(encoding='utf-8'), re.M))
VERSION = re.search(r"VERSION, FECHA_VERSION = '([^']+)'", (RAIZ / '02_fuente' / 'armar.py').read_text(encoding='utf-8')).group(1)
URL_SIA = re.search(r'produccion:\s*\{URL_SITIO:\s*"([^"]+)"', (RAIZ / '02_fuente' / 'js' / '00_config.js').read_text(encoding='utf-8')).group(1)
LISTO = "document.getElementById('loader').hidden && document.documentElement.dataset.calles === 'listas'"
ok, fin = revisiones()

def existe_exacto(base, rel):
    """En Linux importan las mayúsculas y en Windows no: revisa cada parte de la ruta con su nombre exacto."""
    d = base
    for parte in rel.split('/'):
        if not d.is_dir() or parte not in os.listdir(d): return False
        d = d / parte
    return True

def esperar(pg, expr, seg=120):   # sin wait_for_function: usa eval, que la política de seguridad bloquea
    t = time.time()
    while time.time() - t < seg:
        if pg.evaluate(expr): return
        time.sleep(.25)
    raise TimeoutError(expr)

with tempfile.TemporaryDirectory() as tmp:
    sitio = Path(tmp) / f'adopta-un-arbol-v{VERSION}'   # mismo nombre que su carpeta en el servidor
    r = subprocess.run([sys.executable, '-X', 'utf8', str(RAIZ / '02_fuente' / 'armar.py'), '--produccion', '--destino', str(sitio)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-500:], flush=True)
    if r.returncode: sys.exit('armar.py --produccion falló:\n' + r.stderr[-1500:])

    print('1. Archivos', flush=True)
    html = (sitio / 'index.html').read_text(encoding='utf-8'); js = (sitio / 'app.js').read_text(encoding='utf-8')
    textos = (sitio / 'textos.js').read_text(encoding='utf-8'); css = (sitio / 'app.css').read_text(encoding='utf-8')
    ok('data-modo="produccion"' in html, 'index.html dice modo producción')
    ok(not re.search(r'banner-prueba|noindex|solo-prueba', html), 'sin aviso «Versión de prueba», sin noindex y sin partes de prueba')
    ok(f'property="og:url" content="{URL_SIA}"' in html and f'property="og:image" content="{URL_SIA}img/tarjeta.jpg' in html,
       f'la tarjeta para compartir apunta al SIA ({URL_SIA})')
    sin_config = re.sub(r'prueba:\s*\{URL_SITIO:[^\n]*', '', js)   # la configuración trae las direcciones de los dos modos
    ok('sedemaoficina.github.io' not in html + sin_config + textos, 'ninguna liga al sitio de pruebas de GitHub (fuera de la configuración de modos)')
    refs = {re.sub(r'[?#].*', '', u) for u in re.findall(r'(?:src|href)="([^"]+)"', html) if not re.match(r'(https?:|data:|#|mailto:)', u)}
    refs |= set(re.findall(r'"((?:datos|img|vendor)/[\w./-]+\.\w+)"', js))
    faltan = sorted(u for u in refs if not existe_exacto(sitio, u))
    ok(not faltan, f'{len(refs)} rutas de index.html y app.js existen con sus mayúsculas exactas (Linux): ' + (', '.join(faltan) or 'todas'))
    ok(len(list((sitio / 'datos').glob('arboles_*.txt'))) == 16, '16 archivos de árboles, uno por alcaldía')
    http = sorted(set(re.findall(r'http://(?!www\.w3\.org)[\w./-]+', html + js + css + textos)))
    ok(not http, 'sin direcciones http:// (contenido mixto en HTTPS): ' + (', '.join(http[:3]) or 'ninguna'))
    sobran = sorted(f.name for f in sitio.rglob('*') if f.suffix in ('.bat', '.ps1', '.py'))
    ok(not sobran, 'sin archivos de la computadora de trabajo (.bat, .ps1, .py): ' + (', '.join(sobran) or 'ninguno'))
    n = sum(1 for f in sitio.rglob('*') if f.is_file()); mb = sum(f.stat().st_size for f in sitio.rglob('*') if f.is_file()) / 1048576
    print(f'  {n} archivos, {mb:.1f} MB', flush=True)

    print('2. En el navegador, con compresión y los encabezados de 04_sia/encabezados.conf', flush=True)
    base, srv = servidor(sitio, comprimir=True, encabezados=ENCABEZADOS)
    with sync_playwright() as p:
        b = p.chromium.launch(args=FLAGS)
        for vista, o in (('escritorio', dict(viewport={'width': 1440, 'height': 900})),
                         ('cel', dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True))):
            print(vista, flush=True)
            ctx = b.new_context(accept_downloads=True, geolocation={'latitude': 19.4316, 'longitude': -99.1925}, permissions=['geolocation'], **o)
            ctx.add_init_script("window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));")
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.goto(base); esperar(pg, LISTO); pg.wait_for_timeout(1000)
            ok(pg.evaluate("CONFIG.MODO === 'produccion' && !CONFIG.SIMULAR_GUARDIANES && CONFIG.URL_SITIO") == URL_SIA,
               'la página corre en modo producción, sin personas guardianas simuladas')
            ok(pg.locator('.banner-prueba').count() == 0, 'sin el aviso «Versión de prueba»')
            pg.screenshot(path=str(Path(__file__).parent / 'resultados' / f'produccion_{vista}_inicio.png'))
            pg.click('#usar-ubic')
            try:
                pg.wait_for_selector('#card:not([hidden])', timeout=90000); pg.wait_for_timeout(1500); ubic = True
            except Exception: ubic = False
            ok(ubic, '«Usar mi ubicación» funciona con la política de permisos (Permissions-Policy)')
            if vista == 'cel':
                g = pg.get_by_role('button', name='Ver la foto de la calle y más')
                if g.count(): g.first.click(); pg.wait_for_timeout(600)
            pg.locator('#card .sv-pedir').click(); pg.wait_for_timeout(600)   # v30j: la foto se pide una vez por visita (computadora y celular)
            t = time.time()
            while time.time() - t < 30 and not any('google.com/maps' in f.url for f in pg.frames[1:]): pg.wait_for_timeout(500)   # v30j: con time.sleep Playwright no se enteraba del marco nuevo
            ok(any('google.com/maps' in f.url for f in pg.frames[1:]), 'la foto de la calle (Street View de Google) carga con la política de seguridad')
            pg.wait_for_timeout(4000); pg.screenshot(path=str(Path(__file__).parent / 'resultados' / f'produccion_{vista}_ficha.png'))
            pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
            pg.fill('#f-nombre', 'Prueba'); pg.locator('.acepto input').check(); pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click(); pg.wait_for_timeout(3000)
            ok('Paso 2 de 2' in pg.inner_text('#mc-cuidar'), 'cuidar un árbol llega al reconocimiento')
            with pg.expect_download(timeout=60000) as d: pg.get_by_role('button', name='Descargar PDF').first.click()
            ok(d.value.suggested_filename.endswith('.pdf'), 'el PDF se descarga (jsPDF bajo la política de seguridad)')
            ligas = pg.evaluate("[...document.querySelectorAll('#m-cuidar a[href]')].map(a => decodeURIComponent(a.href)).join(' ')")
            ok('sedema.sia.cdmx.gob.mx/adopta-un-arbol/#arbol-' in ligas, 'las ligas para compartir apuntan al árbol en el SIA')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
            ok(pg.inner_text('#mis-n').strip() == '1', '«Mis árboles» cuenta solo el árbol cuidado (sin simulados)')
            viol = pg.evaluate('window.__csp')
            ok(not viol, 'sin violaciones de la política de seguridad: ' + (', '.join(sorted(set(viol))[:3]) or 'ninguna'))
            ok(not errs, 'sin errores de página: ' + '; '.join(errs[:2]))
            ctx.close()
        b.close()
    srv.shutdown()

    if '--paquete' in sys.argv:
        dest = RAIZ / '04_sia' / 'paquetes'; dest.mkdir(parents=True, exist_ok=True)
        zp = dest / f'{sitio.name}.zip'; i = 2
        while zp.exists(): zp = dest / f'{sitio.name}_{i}.zip'; i += 1   # nunca se reemplaza un paquete anterior
        with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for f in sorted(sitio.rglob('*')):
                if f.is_file(): z.write(f, f'{sitio.name}/' + f.relative_to(sitio).as_posix())
        huella = hashlib.sha256(zp.read_bytes()).hexdigest()
        zp.with_suffix('.sha256').write_text(f'{huella}  {zp.name}\n', encoding='utf-8')
        print(f'Paquete: {zp.relative_to(RAIZ)} ({zp.stat().st_size / 1048576:.1f} MB)\nSHA-256: {huella}', flush=True)
fin()
