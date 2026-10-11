"""Imágenes fijas del sitio, hechas una vez (no en cada armado): las versiones PNG del ícono (img/iconos/icono.svg, el arbolito del mapa
en verde hoja sobre blanco). Las dibuja Chromium con Playwright (se instala con 03_pruebas/instalar.bat).
Uso: python hacer_imagenes.py   (escribe img/iconos/icono-32.png e icono-180.png; armar.py las copia al sitio)"""
from pathlib import Path
from playwright.sync_api import sync_playwright

IMG = Path(__file__).parent / 'img'
SVG = (IMG / 'iconos' / 'icono.svg').read_text(encoding='utf-8')
with sync_playwright() as p:
    b = p.chromium.launch()
    # 32 px para la pestaña (navegadores sin ícono SVG); 180 px para la pantalla de inicio del iPhone (fondo blanco completo: iOS redondea)
    for lado, fondo in ((32, False), (180, True)):
        pg = b.new_page(viewport={'width': lado, 'height': lado}, device_scale_factor=1)
        svg = SVG if not fondo else SVG.replace('rx="7"', 'rx="0"').replace('translate(4 2)', 'translate(6.4 5.2) scale(.8)')   # con margen
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width={lado} height={lado} ", 1)}</body></html>')
        pg.screenshot(path=str(IMG / 'iconos' / f'icono-{lado}.png'), omit_background=True)
        pg.close()
    b.close()
for f in sorted((IMG / 'iconos').glob('icono-*.png')): print(f.name, f.stat().st_size, 'bytes')
