"""Compara dos «fotos» de foto.py: estilos por elemento, textos, atributos, texto del PDF, imagen del reconocimiento, :hover y foco.
Uso: python comparar_foto.py <antes> <después> [--detalle 20] [--equivalentes main=div,…]
--equivalentes: etiquetas que cambiaron a propósito (p. ej. el <div class="app"> que pasó a <main>) se comparan como la misma."""
import gzip, json, sys
from pathlib import Path
a, b = Path(sys.argv[1]), Path(sys.argv[2]); N = int(sys.argv[sys.argv.index('--detalle') + 1]) if '--detalle' in sys.argv else 12
total = 0
EQUIV = dict(x.split('=') for x in sys.argv[sys.argv.index('--equivalentes') + 1].split(',')) if '--equivalentes' in sys.argv else {}
def ancla(r):
    """La ruta empieza en el ancestro más cercano con id: quitar o agregar un hermano no descuadra a los demás."""
    for nuevo, viejo in EQUIV.items(): r = r.replace(nuevo + '[', viejo + '[')
    s = r.split('/'); k = max((i for i, x in enumerate(s) if '#' in x), default=0)
    if '#' in s[k]: s[k] = s[k].split('[')[0]   # el id ya es único: sin su posición entre hermanos
    return '/'.join(s[k:])
def carga(p):
    d = json.loads(gzip.decompress(p.read_bytes()))
    d['est'] = {ancla(r): i for r, i in d['est'].items()}
    d['txt'] = [[ancla(r), x] for r, x in d['txt']]; d['atr'] = [[ancla(r), a, v] for r, a, v in d['atr']]
    return d
for fa in sorted(a.glob('*.json.gz')):
    fb = b / fa.name
    if not fb.exists(): print(fa.name, 'FALTA en después'); total += 1; continue
    A, B = carga(fa), carga(fb); nombre = fa.name[:-8]; dif = []
    ea = {r: A['tabla'][str(i)] for r, i in A['est'].items()}; eb = {r: B['tabla'][str(i)] for r, i in B['est'].items()}
    for r in sorted(set(ea) | set(eb)):
        if r not in ea: dif.append(f'elemento nuevo {r}'); continue
        if r not in eb: dif.append(f'elemento que falta {r}'); continue
        for p in sorted(set(ea[r]) | set(eb[r])):
            if ea[r].get(p) != eb[r].get(p): dif.append(f'estilo {r} {p}: {ea[r].get(p)!r} -> {eb[r].get(p)!r}')
    for k in ('txt', 'atr'):
        sa, sb = [json.dumps(x, ensure_ascii=False) for x in A[k]], [json.dumps(x, ensure_ascii=False) for x in B[k]]
        if sa != sb:
            import difflib
            for l in difflib.unified_diff(sa, sb, lineterm='', n=0):
                if l[:1] in '+-' and l[:3] not in ('+++', '---'): dif.append(f'{k} {l[:220]}')
    if A.get('cuerpo') != B.get('cuerpo'): dif.append('texto visible (innerText) distinto')
    for k in ('pdf', 'png_sha'):
        if A.get(k) != B.get(k): dif.append(f'{k} distinto')
    total += len(dif)
    print(f'{nombre:38s} {"OK" if not dif else str(len(dif)) + " diferencias"}')
    for d in dif[:N]: print('    ', d)
for fa in sorted(a.glob('*_hover_foco.json')):
    fb = b / fa.name
    if not fb.exists(): print(fa.name, 'FALTA'); continue
    A, B = json.loads(fa.read_text(encoding='utf-8')), json.loads(fb.read_text(encoding='utf-8'))
    dh = [s for s in set(A['hover']) | set(B['hover']) if A['hover'].get(s) != B['hover'].get(s)]
    df = [i for i, (x, y) in enumerate(zip(A['foco'], B['foco'])) if x != y]
    total += len(dh) + len(df)
    print(f'{fa.name[:-5]:38s} {"OK" if not dh and not df else f"{len(dh)} hover y {len(df)} foco distintos"}')
    for s in dh[:N]: print('     hover', s, A['hover'].get(s), '->', B['hover'].get(s))
    for i in df[:N]: print('     foco', i, A['foco'][i], '->', B['foco'][i])
print('TOTAL de diferencias:', total)
