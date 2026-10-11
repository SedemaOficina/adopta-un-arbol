"""Accesibilidad (Lote 5): axe-core en las 13 pantallas a 1440 y 390 px, y revisión con teclado de las ventanas
(el foco no se escapa, Esc cierra y el foco regresa al botón que la abrió).
Uso: python accesibilidad.py [--sitio 10_sitio]   (escribe resultados/accesibilidad.json y muestra el resumen)"""
import json, sys
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, VISTAS, SITIO, servidor, recorrer

AXE = Path(__file__).parent / 'node_modules' / 'axe-core' / 'axe.min.js'
sitio = Path(sys.argv[sys.argv.index('--sitio') + 1]) if '--sitio' in sys.argv else SITIO
base, srv = servidor(sitio)
hallazgos = defaultdict(lambda: {'impacto': None, 'ayuda': '', 'pantallas': set(), 'nodos': set()})
teclado = []

def revisar(pg, nombre, vista):
    pg.add_script_tag(path=str(AXE))
    r = pg.evaluate("axe.run(document, {resultTypes:['violations'], runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}})")
    for v in r['violations']:
        h = hallazgos[v['id']]; h['impacto'] = v['impact']; h['ayuda'] = v['help']; h['pantallas'].add(f'{vista}:{nombre}')
        for n in v['nodes'][:12]: h['nodos'].add(' '.join(n['target'])[:90])

def ventana(pg, abrir_sel, modal, vista, etiqueta):
    """Abre una ventana con el teclado, recorre 40 Tab y revisa que el foco no salga; luego Esc y el foco regresa."""
    b = pg.locator(abrir_sel).first; b.focus(); pg.keyboard.press('Enter'); pg.wait_for_selector(f'{modal}:not([hidden])', timeout=20000); pg.wait_for_timeout(500)
    fuera = 0
    for _ in range(40):
        pg.keyboard.press('Tab'); pg.wait_for_timeout(40)
        if not pg.evaluate(f"document.querySelector('{modal}').contains(document.activeElement)"): fuera += 1
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    cerrada = pg.evaluate(f"document.querySelector('{modal}').hidden")
    regresa = pg.evaluate("(s) => document.activeElement === document.querySelector(s)", abrir_sel)
    teclado.append({'vista': vista, 'ventana': etiqueta, 'tab_fuera_de_la_ventana': fuera, 'esc_cierra': cerrada, 'foco_regresa': regresa})

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errores = []
    for vista, o in VISTAS.items():
        ctx = b.new_context(locale='es-MX', **o)
        recorrer(ctx, base, vista, lambda pg, n: revisar(pg, n, vista), errores)
        # teclado: «Cómo funciona» y «Mis árboles»
        pg = ctx.new_page(); pg.goto(base); pg.wait_for_function("document.getElementById('loader').hidden", timeout=120000); pg.wait_for_timeout(2000)
        ventana(pg, '#abrir-info', '#m-info', vista, 'Cómo funciona'); ventana(pg, '#mis-btn', '#m-mis', vista, 'Mis árboles'); pg.close()
        ctx.close()
    b.close()
srv.shutdown()
orden = {'critical': 0, 'serious': 1, 'moderate': 2, 'minor': 3}
res = sorted(({'id': k, 'impacto': h['impacto'], 'ayuda': h['ayuda'], 'pantallas': sorted(h['pantallas']), 'ejemplos': sorted(h['nodos'])[:8]}
              for k, h in hallazgos.items()), key=lambda x: (orden.get(x['impacto'], 9), x['id']))
(Path(__file__).parent / 'resultados').mkdir(exist_ok=True)
(Path(__file__).parent / 'resultados' / 'accesibilidad.json').write_text(json.dumps({'axe': res, 'teclado': teclado, 'errores': errores}, ensure_ascii=False, indent=1), encoding='utf-8')
for r in res: print(f"{r['impacto']:9s} {r['id']:32s} {len(r['pantallas']):2d} pantallas · {r['ayuda'][:70]}\n            {r['ejemplos'][:3]}")
for t in teclado: print('teclado', t)
print('errores de página:', len(errores))
