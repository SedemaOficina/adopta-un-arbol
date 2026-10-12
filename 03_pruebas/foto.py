"""«Foto» de las 13 pantallas a 1440 y 390 px: estilo calculado de cada elemento (también ::before/::after, :hover y aro de foco),
textos, atributos (incluidas las ligas para compartir), texto del PDF e imagen del reconocimiento. Se compara con comparar_foto.py:
en una reorganización debe dar 0 diferencias. Con --selectores anota qué elementos toca cada selector del CSS.
Uso: python foto.py --salida <carpeta> [--sitio 10_sitio] [--solo escritorio,cel] [--selectores]"""
import argparse, gzip, hashlib, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, VISTAS, SITIO, servidor, recorrer, boton_formato

ap = argparse.ArgumentParser(); ap.add_argument('--sitio', default=str(SITIO)); ap.add_argument('--salida', required=True)
ap.add_argument('--solo', default=''); ap.add_argument('--selectores', action='store_true')
args = ap.parse_args()
base, srv = servidor(Path(args.sitio))
OUT = Path(args.salida); OUT.mkdir(parents=True, exist_ok=True)
if args.solo: VISTAS = {k: v for k, v in VISTAS.items() if k in args.solo.split(',')}
PROPS = '''display position top right bottom left width height min-width max-width min-height max-height margin-top margin-right margin-bottom
margin-left padding-top padding-right padding-bottom padding-left box-sizing color background-color background-image background-size
background-position border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style
border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius
border-top-right-radius border-bottom-right-radius border-bottom-left-radius font-family font-size font-weight font-style line-height
letter-spacing text-align text-transform text-decoration-line text-decoration-color text-overflow white-space word-break overflow-x overflow-y
opacity visibility z-index box-shadow transform transition-property cursor flex-direction flex-wrap flex-grow flex-shrink flex-basis
justify-content align-items align-self gap row-gap column-gap grid-template-columns order outline-style outline-width outline-color
outline-offset fill stroke stroke-width list-style-type vertical-align object-fit pointer-events user-select backdrop-filter
filter clip-path inset-inline-start content resize accent-color caret-color appearance text-indent float clear'''.split()
PSEUDO = ['content', 'display', 'position', 'width', 'height', 'top', 'left', 'right', 'bottom', 'background-color', 'border-top-width',
          'border-top-color', 'border-radius', 'color', 'transform', 'opacity']
# Zonas que cambian con el tiempo o la animación del mapa: se guardan sus textos, no su estilo.
SIN_ESTILO = ['#escala', '#globo', '#aviso', '#map', '.loader']

JS_FOTO = r"""([PROPS, PSEUDO, SIN]) => {
  const fuera = SIN.flatMap(s => [...document.querySelectorAll(s)]);
  const omitir = n => fuera.some(f => f === n || f.contains(n));
  const ruta = n => { const p = []; for (let e = n; e && e !== document.body; e = e.parentElement){
      const hermanos = [...e.parentElement.children].filter(x => !['SCRIPT', 'STYLE', 'LINK'].includes(x.tagName));
      p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '[' + hermanos.indexOf(e) + ']'); }
    return p.join('/'); };
  const est = {}, txt = [], atr = [];
  for (const e of document.body.querySelectorAll('*')){
    if (['SCRIPT', 'STYLE', 'LINK', 'IFRAME'].includes(e.tagName)) continue;
    const r = ruta(e);
    for (const a of ['aria-label', 'title', 'placeholder', 'alt', 'href', 'aria-description', 'value', 'download'])
      if (e.hasAttribute(a)) atr.push([r, a, e.getAttribute(a)]);
    for (const t of e.childNodes) if (t.nodeType === 3 && t.textContent.trim()) txt.push([r, t.textContent.replace(/\s+/g, ' ').trim()]);
    if (omitir(e)) continue;
    const cs = getComputedStyle(e), v = {};
    if (cs.display === 'none'){ est[r] = {display:'none'}; continue; }
    for (const p of PROPS) v[p] = cs.getPropertyValue(p);
    for (const ps of ['::before', '::after']){ const c = getComputedStyle(e, ps); if (c.content && c.content !== 'none' && c.content !== 'normal')
      for (const p of PSEUDO) v[ps + p] = c.getPropertyValue(p); }
    est[r] = v;
  }
  return {est, txt, atr, cuerpo:document.body.innerText};
}"""

JS_SEL = r"""() => {
  const ruta = n => { const p = []; for (let e = n; e && e !== document.body; e = e.parentElement){
      const h = [...e.parentElement.children].filter(x => !['SCRIPT', 'STYLE', 'LINK'].includes(x.tagName));
      p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '[' + h.indexOf(e) + ']'); } return p.join('/'); };
  const sels = new Set();
  const rec = l => { for (const r of l){ if (r.cssRules && !r.selectorText) rec(r.cssRules); else if (r.selectorText) for (const s of r.selectorText.split(',')) sels.add(s.trim()); } };
  for (const sh of document.styleSheets){ try { rec(sh.cssRules); } catch {} }
  const out = {};
  for (const s of sels){
    const limpio = s.replace(/::?(before|after|placeholder|marker|selection|-webkit-[\w-]+)/g, '').replace(/:(hover|focus-visible|focus-within|focus|active|visited)/g, '').trim() || '*';
    try { out[s] = [...document.querySelectorAll(limpio)].map(ruta); } catch { out[s] = null; }
  }
  return out;
}"""

def foto(pg, nombre, vista, extra=None):
    if args.selectores:
        (OUT / f'{vista}_{nombre}.sel.json.gz').write_bytes(gzip.compress(json.dumps(pg.evaluate(JS_SEL), ensure_ascii=False).encode()))
        print(f'  {nombre}: selectores anotados', flush=True); return
    d = pg.evaluate(JS_FOTO, [PROPS, PSEUDO, SIN_ESTILO])
    if extra: d.update(extra)
    try: pg.screenshot(path=str(OUT / f'{vista}_{nombre}.png'), timeout=90000)
    except Exception as e: print('  (sin captura:', str(e)[:60], ')')
    estilos, tabla = {}, {}
    for r, v in d.pop('est').items():
        k = json.dumps(v, sort_keys=True); tabla.setdefault(k, len(tabla)); estilos[r] = tabla[k]
    d['est'] = estilos; d['tabla'] = {i: json.loads(k) for k, i in tabla.items()}
    (OUT / f'{vista}_{nombre}.json.gz').write_bytes(gzip.compress(json.dumps(d, ensure_ascii=False).encode()))
    print(f'  {nombre}: {len(estilos)} elementos, {len(d["txt"])} textos, {len(d["atr"])} atributos', flush=True)

def hover_y_foco(pg, vista):
    """Estilo bajo el ratón de cada selector con :hover que tenga un elemento visible, y el aro de foco con Tab."""
    sels = pg.evaluate(r"""() => { const s = new Set(); for (const sh of document.styleSheets){ let rs; try { rs = sh.cssRules; } catch { continue; }
        const rec = l => { for (const r of l){ if (r.cssRules && !r.selectorText) rec(r.cssRules); else if (r.selectorText && r.selectorText.includes(':hover'))
          for (const x of r.selectorText.split(',')) s.add(x.trim().replace(/:hover/g, '')); } }; rec(rs); } return [...s]; }""")
    res = {}
    for s in sels:
        try:
            loc = pg.locator(s).first
            if not loc.count() or not loc.is_visible(): continue
            loc.hover(timeout=2000); pg.wait_for_timeout(250)
            res[s] = loc.evaluate("(e, P) => { const c = getComputedStyle(e); return Object.fromEntries(P.map(p => [p, c.getPropertyValue(p)])); }",
                                  ['color', 'background-color', 'border-top-color', 'text-decoration-line', 'box-shadow', 'opacity', 'transform', 'outline-style'])
        except Exception: pass
    pg.mouse.move(1, 1)
    foco = []
    for i in range(18):
        pg.keyboard.press('Tab'); pg.wait_for_timeout(60)
        foco.append(pg.evaluate("() => { const e = document.activeElement, c = getComputedStyle(e); return [e.tagName + (e.id ? '#' + e.id : '') + '.' + e.className, c.outlineStyle, c.outlineWidth, c.outlineColor, c.outlineOffset, c.boxShadow]; }"))
    (OUT / f'{vista}_hover_foco.json').write_text(json.dumps({'hover': res, 'foco': foco}, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'  hover: {len(res)} selectores; foco: {len(foco)} pasos', flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); errs = []
    for vista, o in VISTAS.items():
        print(vista, flush=True)
        ctx = b.new_context(accept_downloads=True, locale='es-MX', **o)
        def al_llegar(pg, nombre):
            extra = {}
            if nombre == '09_reconocimiento' and not args.selectores:
                for etq in ('PDF', 'Imagen'):   # v31b: «Descargar» y luego el formato
                    with pg.expect_download(timeout=60000) as d: boton_formato(pg, etq).click()
                    datos = Path(d.value.path()).read_bytes()
                    if etq == 'PDF':
                        from pypdf import PdfReader
                        extra['pdf'] = [pag.extract_text() for pag in PdfReader(io.BytesIO(datos)).pages]; extra['pdf_kb'] = len(datos) // 1024
                    else:
                        (OUT / f'{vista}_reconocimiento.png').write_bytes(datos); extra['png_sha'] = hashlib.sha256(datos).hexdigest()
            foto(pg, nombre, vista, extra)
            if nombre in ('01_inicio', '04_arbol_con_guardianes') and not args.selectores:
                hover_y_foco(pg, vista if nombre == '01_inicio' else vista + '_ficha')
        recorrer(ctx, base, vista, al_llegar, errs)
        ctx.close()
    b.close()
(OUT / 'errores.json').write_text(json.dumps(errs, ensure_ascii=False, indent=1), encoding='utf-8')
print('errores de página:', len(errs)); [print('  ', e) for e in errs[:10]]
srv.shutdown()
