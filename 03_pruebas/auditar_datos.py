"""Auditoría de datos (Lote 5): revisa lo que el sitio realmente descarga (10_sitio/datos/) contra el límite de la Ciudad (MGN 2025).
Solo reporta; los datos se corrigen al recibir la capa final del inventario (decisión de Liber, 11 oct 2026).
Uso: python auditar_datos.py   (escribe resultados/datos.json y muestra las tablas)"""
import base64, gzip, json, math, sys, zipfile
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np, shapefile
from shapely import points, Polygon, STRtree, unary_union, distance
from scipy.spatial import cKDTree

R = Path(__file__).resolve().parents[1]; DATOS = R / '10_sitio' / 'datos'; INTER = R / '00_insumos' / 'intermedios'
P = json.loads(gzip.decompress(base64.b64decode((DATOS / 'colonias.txt').read_text().strip())))
INV, COLONIAS, MUN = P['inv'], P['colonias'], dict(zip(P['muns'], P['munNames'])) if 'muns' in P else None
nombres = {a['cve']: a['nom'] for a in P['alc']}

def leer(cve):
    """Decodifica datos/arboles_<cve>.txt igual que 02_datos.js."""
    b = gzip.decompress(base64.b64decode((DATOS / f'arboles_{cve}.txt').read_text().strip())); q = 0
    def v():
        nonlocal q; res = sh = 0
        while True:
            x = b[q]; q += 1; res += (x & 0x7f) << sh; sh += 7
            if not x & 0x80: break
        return -((res + 1) // 2) if res % 2 else res // 2
    n = v(); out = np.zeros((n, 4), np.int64); ids = []; c = x = y = 0
    for i in range(n):
        c += v(); x += v(); y += v(); u, s, calle = v(), v(), v(); v(); v(); v(); v(); v()
        out[i] = (c, x, y, calle); ids.append(INV['ugas'][u] + '-' + str(s).zfill(4))
    return out, ids

# Límite de la Ciudad (MGN 2025, Web Mercator) -> polígono en metros de Web Mercator
lim = shapefile.Reader(str(R / '00_insumos' / 'ciga' / 'LimitesAlcaldia_MGN2025.zip'))
polis = []
for sh in lim.shapes():
    partes = list(sh.parts) + [len(sh.points)]
    for a, b_ in zip(partes, partes[1:]):
        pts = sh.points[a:b_]
        if len(pts) >= 4: polis.append(Polygon(pts))
ciudad = unary_union(polis).buffer(0)
RT = 6378137.0
def merc(lng, lat): return RT * np.radians(lng), RT * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))

filas, todos_ids, todas_xy = [], Counter(), []
for cve in sorted(nombres):
    arr, ids = leer(cve); n = len(arr)
    lng, lat = arr[:, 1] / 1e6, arr[:, 2] / 1e6; mx, my = merc(lng, lat)
    pts = points(np.c_[mx, my]); dentro = ciudad.contains(pts) if hasattr(ciudad, 'contains') else None
    import shapely; dentro = shapely.contains(ciudad, pts)
    d = np.zeros(n); fuera = ~dentro
    if fuera.any(): d[fuera] = shapely.distance(ciudad, pts[fuera]) * np.cos(np.radians(lat[fuera]))   # metros reales
    km = np.c_[lng * 105000.0, lat * 110700.0]; todas_xy.append(km)
    t = cKDTree(km); pares = t.query_pairs(0.5)   # árboles a menos de 50 cm de otro
    exactos = n - len({(a, b_) for a, b_ in zip(arr[:, 1], arr[:, 2])})
    todos_ids.update(ids)
    filas.append({'cve': cve, 'alcaldia': nombres[cve], 'arboles': n, 'sin_colonia': int((arr[:, 0] < 0).sum()), 'sin_calle': int((arr[:, 3] < 0).sum()),
                  'fuera_del_limite': int(fuera.sum()), 'fuera_mas_de_50m': int((d > 50).sum()), 'coordenada_repetida': int(exactos), 'a_menos_de_50cm': len(pares)})
    print(cve, filas[-1], flush=True)

ids_rep = sum(c - 1 for c in todos_ids.values() if c > 1)
# colonias sin árboles (con polígono)
con_poligono = {c['i'] for c in P['cols']}
sin_arboles = defaultdict(int)
for i in con_poligono:
    c = COLONIAS[i]
    if c and not c.get('arb'): sin_arboles[c['m']] += 1
pat = json.loads((INTER / 'patrimoniales.json').read_text(encoding='utf-8'))
res = {'por_alcaldia': filas, 'total': {k: sum(f[k] for f in filas) for k in filas[0] if k not in ('cve', 'alcaldia')},
       'claves_repetidas': ids_rep, 'colonias': {'catalogo': len(COLONIAS), 'con_poligono': len(con_poligono), 'sin_arboles': sum(sin_arboles.values()),
       'sin_arboles_por_alcaldia': {nombres[k]: v for k, v in sorted(sin_arboles.items())}},
       'patrimoniales': {'publicados': len(pat), 'empatados': sum(1 for p in pat if p['inv']), 'sin_empate': [p['nombre'] for p in pat if not p['inv']],
                         'distancia_max_m': max(p['dist'] for p in pat if p['dist'] is not None)},
       'registros_inventario': INV.get('registros')}
(R / '03_pruebas' / 'resultados').mkdir(exist_ok=True)
(R / '03_pruebas' / 'resultados' / 'datos.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps({k: v for k, v in res.items() if k != 'por_alcaldia'}, ensure_ascii=False, indent=1))
