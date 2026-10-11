"""Descarga el PDF del reconocimiento de un árbol común y de uno patrimonial, y resume cada uno (páginas, tamaño de página, texto, peso).
Sirve para comprobar que un cambio (p. ej. actualizar jsPDF) no altera el PDF. Uso: python pdfs.py <carpeta de salida> [--comparar <otra carpeta>]"""
import io, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
from pantallas import FLAGS, servidor, LISTO

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
base, srv = servidor()
def resumen(datos):
    r = PdfReader(io.BytesIO(datos))
    return {'paginas': len(r.pages), 'tamanos': [[round(float(p.mediabox.width), 1), round(float(p.mediabox.height), 1)] for p in r.pages],
            'texto': [p.extract_text() for p in r.pages], 'imagenes': [len(p.images) for p in r.pages], 'kb': len(datos) // 1024}
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True); res = {}
    for nombre, h, accion in [('comun', '#arbol-MIH-029-1492', 'ver'), ('patrimonial', '#arbol-25-CUH-TAX-19405GIMNO-0002', 'cuidar')]:
        pg = ctx.new_page(); pg.goto(base + h); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_selector('#card:not([hidden])'); pg.wait_for_timeout(1500)
        if accion == 'ver': pg.locator('#card').get_by_role('button', name='Ver mi reconocimiento').first.click()
        else:
            pg.locator('#card').get_by_role('button', name='Sé la primera persona en cuidarlo').click(); pg.wait_for_selector('#m-cuidar:not([hidden])')
            pg.fill('#f-nombre', 'Mariana'); pg.locator('.acepto input').check(); pg.get_by_role('button', name='Confirmar: lo voy a cuidar').click()
        pg.wait_for_timeout(3000)
        with pg.expect_download(timeout=60000) as d: pg.get_by_role('button', name='Descargar PDF').first.click()
        datos = Path(d.value.path()).read_bytes(); (OUT / f'{nombre}.pdf').write_bytes(datos); res[nombre] = resumen(datos); pg.close()
    b.close()
srv.shutdown()
(OUT / 'resumen.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
for k, v in res.items(): print(k, v['paginas'], 'páginas', v['tamanos'], v['imagenes'], 'imágenes', v['kb'], 'KB')
if '--comparar' in sys.argv:
    otra = json.loads((Path(sys.argv[sys.argv.index('--comparar') + 1]) / 'resumen.json').read_text(encoding='utf-8'))
    for k in res:
        for c in ('paginas', 'tamanos', 'texto', 'imagenes'):
            print(k, c, 'igual' if res[k][c] == otra[k][c] else f'DISTINTO: {otra[k][c]} -> {res[k][c]}' if c != 'texto' else 'DISTINTO')
