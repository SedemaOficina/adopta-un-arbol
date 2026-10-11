"""Árboles patrimoniales para Guardianes de árboles, solo desde la hoja Salida_Publica del padrón (la única que se publica).
Cada uno se empata con el árbol del inventario más cercano (hasta 10 m); si no hay, aparece como punto propio.
La página de su ficha sigue la regla del micrositio: arbol-<nombre asignado sin acentos, en minúsculas y con guiones>.html"""
from rutas import META, PATRIMONIALES_CSV, INV_PKL, PATRIMONIALES, exigir
exigir(META, PATRIMONIALES_CSV, INV_PKL)
import csv, re, unicodedata, json, numpy as np, pandas as pd
from shapely import points, polygons, STRtree
m = json.load(open(META, encoding='utf-8')); Q = m['Q']
rows = [r for r in csv.DictReader(open(PATRIMONIALES_CSV, encoding='utf-8')) if r['estado'] == 'Publicado']
def slug(t): t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower(); return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
KX, KY = 105000.0, 110700.0
polys, pid = [], []
for c in m['cols']:
    for r in c['rings']:
        a = np.array(r, float) / Q
        if len(a) >= 4: polys.append(polygons(np.c_[a[:, 0] * KX, a[:, 1] * KY])); pid.append(c['i'])
tc = STRtree(polys)
df = pd.read_pickle(INV_PKL); df = df[df.registro == 'Árbol'].reset_index(drop=True)
ti = STRtree(points(np.c_[df.lng.values * KX, df.lat.values * KY]))
MUN = {v: k for k, v in zip(m['muns'], m['munNames'])}
out = []
for r in rows:
    lat, lng = float(r['latitud']), float(r['longitud']); pt = points([lng * KX, lat * KY])
    ia, ip = tc.query(np.array([pt]), predicate='within'); col = int(pid[ip[0]]) if len(ip) else -1
    j, d = ti.query_nearest(pt, max_distance=10, return_distance=True)
    out.append(dict(id=r['id'], nombre=r['nombre_asignado'], comun=r['nombre_comun'], cien=r['nombre_cientifico'], cat=r['categorias'].title(),
        calle=(r['calle'] + (' ' + r['num_ext'] if r['num_ext'] and r['num_ext'] != 'S/N' else '')).strip(), lat=lat, lng=lng,
        mun=MUN[r['alcaldia']], col=col, slug=slug(r['nombre_asignado']),
        inv=(df.idc.values[j[0]] if len(j) else None), dist=(round(float(d[0]), 1) if len(d) else None)))
json.dump(out, open(PATRIMONIALES, 'w', encoding='utf-8'), ensure_ascii=False)
for o in out: print(o['nombre'], '|', o['mun'], o['col'], '|', o['inv'], o['dist'])
