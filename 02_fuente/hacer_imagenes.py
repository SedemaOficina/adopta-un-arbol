"""Imágenes fijas del sitio, hechas una vez (no en cada armado); armar.py las copia al sitio:
  iconos   img/iconos/icono-32.png e icono-180.png, a partir de img/iconos/icono.svg (el arbolito del mapa en verde hoja sobre blanco)
  tarjeta  img/tarjeta.jpg (1200 × 630): la imagen que aparece al compartir la liga en WhatsApp, Facebook o X. Logo institucional sobre
           blanco, el nombre del sitio, la frase principal del panel (de textos.js) y un recorte real del mapa (Avenida Horacio, Polanco),
           tomado de una copia en modo producción para que no salgan personas guardianas simuladas.
Las dibuja Chromium con Playwright (se instala con 03_pruebas/instalar.bat). Uso: python hacer_imagenes.py [iconos] [tarjeta]   (sin nada: las dos)"""
import html, subprocess, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from rutas import FUENTE, ICONOS, leer_textos
sys.path.insert(0, str(FUENTE.parent / '03_pruebas'))
from pantallas import FLAGS, LISTO, servidor

QUE = [a for a in sys.argv[1:] if a in ('iconos', 'tarjeta')] or ['iconos', 'tarjeta']
TARJETA = FUENTE / 'img' / 'tarjeta.jpg'

def iconos(b):
    svg0 = (ICONOS / 'icono.svg').read_text(encoding='utf-8')
    # 32 px para la pestaña (navegadores sin ícono SVG); 180 px para la pantalla de inicio del iPhone (fondo blanco completo, con margen: iOS redondea)
    for lado, fondo in ((32, False), (180, True)):
        pg = b.new_page(viewport={'width': lado, 'height': lado}, device_scale_factor=1)
        svg = svg0 if not fondo else svg0.replace('rx="7"', 'rx="0"').replace('<g fill=', '<g transform="translate(3.2 3.2) scale(.8)" fill=')
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width={lado} height={lado} ", 1)}</body></html>')
        pg.screenshot(path=str(ICONOS / f'icono-{lado}.png'), omit_background=True); pg.close()
        print(f'icono-{lado}.png', (ICONOS / f'icono-{lado}.png').stat().st_size, 'bytes')

def tarjeta(b, tmp):
    subprocess.run([sys.executable, '-X', 'utf8', str(FUENTE / 'armar.py'), '--produccion', '--destino', str(tmp)], check=True, stdout=subprocess.DEVNULL)
    base, srv = servidor(tmp)
    # 1. Recorte del mapa: el árbol de ejemplo de Avenida Horacio, sin su ficha y un paso más lejos, sin botones ni avisos encima
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}); pg = ctx.new_page()
    pg.goto(base + '#arbol-MIH-029-1491'); pg.wait_for_function(LISTO, timeout=180000); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(2500)
    pg.locator('#card .close').first.click(); pg.wait_for_timeout(800); pg.locator('#zout').dispatch_event('click'); pg.wait_for_timeout(2500)
    pg.add_style_tag(content='.toolbar,.legend,.mapbar,.escala,.norte,.attrib,.card,.aviso,.globo{display:none !important}'); pg.wait_for_timeout(1500)
    m = pg.locator('#map').bounding_box()
    pg.screenshot(path=str(tmp / 'mapa.png'), clip={'x': m['x'] + 120, 'y': m['y'] + 50, 'width': 640, 'height': 518}, timeout=180000); ctx.close()
    # 2. La tarjeta, con las letras y el logo del sitio
    T = leer_textos()
    (tmp / 'tarjeta.html').write_text(f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="vendor/fonts/fuentes.css"><style>
      body{{margin:0;width:1200px;height:630px;background:#FFFFFF;font-family:Roboto,sans-serif;color:#24302A;overflow:hidden}}
      .banda{{height:110px;display:flex;align-items:center;padding:0 56px;border-bottom:3px solid #B28E5C;box-sizing:border-box}}
      .banda img{{height:50px}}
      .abajo{{display:flex;height:520px}}
      .texto{{width:560px;box-sizing:border-box;padding:52px 40px 0 56px}}
      h1{{font:700 64px/1.05 Cabin,sans-serif;color:#1F5E46;margin:0 0 28px}}
      p{{font:400 31px/1.35 Roboto,sans-serif;margin:0;text-wrap:balance}}
      .mapa{{width:640px;height:520px;background:url(mapa.png) center/cover}}
    </style></head><body><div class="banda"><img src="img/logo_inst.png" alt=""></div>
    <div class="abajo"><div class="texto"><h1>{html.escape(T["general.nombre_del_sitio"])}</h1><p>{html.escape(T["panel.los_arboles_de_tu_calle"])}</p></div><div class="mapa"></div></div>
    </body></html>''', encoding='utf-8')
    pg = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    pg.goto(base.replace('index.html', 'tarjeta.html')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
    pg.screenshot(path=str(TARJETA), type='jpeg', quality=86); pg.close(); srv.shutdown()
    print('tarjeta.jpg', TARJETA.stat().st_size // 1024, 'KB')

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS)
    if 'iconos' in QUE: iconos(b)
    if 'tarjeta' in QUE:
        with tempfile.TemporaryDirectory() as tmp: tarjeta(b, Path(tmp))
    b.close()
