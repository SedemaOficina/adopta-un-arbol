"""Medición (no cambia nada del sitio): ¿qué pasaría con la calle de cada árbol si se usan las vialidades INEGI MGN 2025?
Compara la calle actual (frente de manzana INEGI 2020 más cercano, hasta 40 m, como inventario.py) con dos variantes:
  A pura       el eje 2025 más cercano, hasta 40 m
  A con frente el eje 2025, hasta 40 m, paralelo (±20°) al frente 2020 más cercano: el frente dice hacia qué calle da el árbol
               (en las esquinas el eje más cercano puede ser el de la calle de al lado) y el eje 2025 da el nombre vigente
Uso: python medir_calles_2025.py   (escribe 03_pruebas/resultados/calles_2025/: resumen.json y muestras.csv)"""
import csv, io, json, pickle, random, unicodedata, zipfile
import numpy as np, pandas as pd, shapefile
from shapely import points, linestrings, box, STRtree, distance
from rutas import META, FRENTES_PKL, INV_PKL, VIALIDADES_MGN2025, RAIZ, exigir

exigir(META, FRENTES_PKL, INV_PKL, VIALIDADES_MGN2025)
OUT = RAIZ / '03_pruebas' / 'resultados' / 'calles_2025'; OUT.mkdir(parents=True, exist_ok=True)
KX, KY = 105000.0, 110700.0
m = json.load(open(META, encoding='utf-8')); Q = m['Q']; TIPOS = m['tipos']
NO_TIPO = ('Rasgo', 'Otro', 'Ninguno', 'Sin Referencia')
def nombre(t, n):
    n = (n or '').strip(); t = (t or '').strip()
    if not n or n.lower().startswith(('ninguno', 'sin nombre')): return ''
    return (t + ' ' + n) if t and t not in NO_TIPO and not n.lower().startswith(t.lower()) else n
def plano(s): return ' '.join(unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().split())
def direccion(xy):
    d = np.array(xy[-1], float) - np.array(xy[0], float); l = np.hypot(*d); return d / l if l else np.array([1.0, 0.0])

# Árboles
df = pd.read_pickle(INV_PKL); df = df[df.registro == 'Árbol'].reset_index(drop=True)
P = points(df.lng.values * KX, df.lat.values * KY); N = len(df); print('árboles', N, flush=True)

# Actual: frente 2020 más cercano (hasta 40 m)
fr = pickle.load(open(FRENTES_PKL, 'rb'))
fxy = [np.array(f[5], float) / Q * [KX, KY] for f in fr]
FL = [linestrings(x) for x in fxy]; FDIR = np.array([direccion(x) for x in fxy])
fnom = np.array([nombre(TIPOS[f[2]] if 0 <= f[2] < len(TIPOS) else '', m['names'][f[1]] if f[1] >= 0 else '') for f in fr], dtype=object)
ia, ifr = STRtree(FL).query_nearest(P, max_distance=40, all_matches=False)
fr_de = np.full(N, -1); fr_de[ia] = ifr
actual = np.full(N, '', dtype=object); actual[ia] = fnom[ifr]
print('con calle hoy (frentes 2020):', int((actual != '').sum()), flush=True)

# Ejes 2025 (vienen en Latin-1)
z = zipfile.ZipFile(VIALIDADES_MGN2025); shp = [n for n in z.namelist() if n.lower().endswith('.shp')][0]; b = shp[:-4]
rd = shapefile.Reader(shp=io.BytesIO(z.read(shp)), dbf=io.BytesIO(z.read(b + '.dbf')), shx=io.BytesIO(z.read(b + '.shx')), encoding='latin-1')
fl = [f[0] for f in rd.fields[1:]]; iN, iT = fl.index('NOMVIAL'), fl.index('TIPOVIAL')
# La capa 2025 viene en metros (Lambert de INEGI, ITRF2008), no en grados como la de 2020: se pasa a longitud y latitud de una vez.
from pyproj import Transformer
T = Transformer.from_crs(z.read(b + '.prj').decode('latin-1'), 'EPSG:4326', always_xy=True)
crudos = [(sr.shape.points, nombre(sr.record[iT], sr.record[iN]), sr.record[iN] or '') for sr in rd.iterShapeRecords() if len(sr.shape.points) >= 2]
ebase = [c[2] for c in crudos]; crudos = [c[:2] for c in crudos]
todos = np.array([p for pts, _ in crudos for p in pts], float); lon, lat = T.transform(todos[:, 0], todos[:, 1])
cortes = np.cumsum([0] + [len(pts) for pts, _ in crudos])
EL, EDIR, enom = [], [], []
for k, (pts, nm) in enumerate(crudos):
    a_, b_ = cortes[k], cortes[k + 1]
    xy = np.c_[lon[a_:b_] * KX, lat[a_:b_] * KY]; EL.append(linestrings(xy)); EDIR.append(direccion(xy)); enom.append(nm)
EDIR = np.array(EDIR); enom = np.array(enom, dtype=object); print('ejes 2025', len(EL), flush=True)
TE = STRtree(EL)

# A pura: eje más cercano
ia, ie = TE.query_nearest(P, max_distance=40, all_matches=False)
pura = np.full(N, '', dtype=object); pura[ia] = enom[ie]

# A con frente: entre los ejes a 40 m, el más cercano que sea paralelo (±20°) al frente 2020 del árbol; si no hay, el más cercano
x, y = df.lng.values * KX, df.lat.values * KY
it, ie = TE.query(box(x - 80, y - 80, x + 80, y + 80))   # candidatos por caja; luego, por distancia real
d = distance(P[it], np.array(EL, dtype=object)[ie]); ok80 = d <= 80; it, ie, d = it[ok80], ie[ok80], d[ok80]
it80, ie80, d80 = it, ie, d   # hasta 80 m: para reconocer la calle de hoy en avenidas anchas (el eje queda lejos de las orillas)
m40 = d <= 40; it, ie, d = it[m40], ie[m40], d[m40]
print('pares árbol-eje a 40 m o menos:', len(it), flush=True)
par = np.zeros(len(it), bool); con_fr = fr_de[it] >= 0
par[con_fr] = np.abs((FDIR[fr_de[it[con_fr]]] * EDIR[ie[con_fr]]).sum(1)) > np.cos(np.radians(20))
clave = d + np.where(par | ~con_fr, 0, 1e6)   # los paralelos primero
orden = np.lexsort((clave, it)); it, ie, clave = it[orden], ie[orden], clave[orden]
primero = np.r_[True, it[1:] != it[:-1]]
confr = np.full(N, '', dtype=object); confr[it[primero]] = enom[ie[primero]]

# C conservadora: si la calle de hoy sigue a 80 m o menos en 2025 (mismo nombre completo; si no, mismo nombre sin el tipo), se queda esa
# (con su nombre 2025); si ya no está (renombrada o trazo nuevo), el eje 2025 más cercano. Así cambia el nombre, no la calle.
A = np.array([plano(x) for x in actual])
fbase = np.array([plano(m['names'][f[1]]) if f[1] >= 0 else '' for f in fr], dtype=object)
Ebase = np.array([plano(n) for n in ebase], dtype=object); Efull = np.array([plano(n) for n in enom], dtype=object)
tiene_fr = fr_de[it80] >= 0
full = tiene_fr & (Efull[ie80] == A[it80]) & (A[it80] != '')
base_ = tiene_fr & ~full & (Ebase[ie80] == np.where(tiene_fr, fbase[np.maximum(fr_de[it80], 0)], '')) & (Ebase[ie80] != '')
cand = full | base_
k2 = np.where(full, 0, 1) * 1e6 + d80   # primero el nombre completo; luego el nombre sin tipo; el más cercano
o2 = np.lexsort((k2[cand], it80[cand])); ci, ce = it80[cand][o2], ie80[cand][o2]; p2 = np.r_[True, ci[1:] != ci[:-1]]
conserv = pura.copy(); conserv[ci[p2]] = enom[ce[p2]]
sigue_hoy = np.zeros(N, bool); sigue_hoy[ci[p2]] = True

# Resumen
Pu = np.array([plano(x) for x in pura]); Cf = np.array([plano(x) for x in confr]); Co = np.array([plano(x) for x in conserv])
def comparar(nuevo):
    hoy, sin = A != '', nuevo == ''
    return {'igual': int(((A == nuevo) & hoy).sum()), 'distinta': int(((A != nuevo) & hoy & ~sin).sum()),
            'pierde calle': int((hoy & sin).sum()), 'gana calle': int((~hoy & ~sin).sum()), 'sin calle en ambos': int((~hoy & sin).sum())}
res = {'arboles': N, 'A pura': comparar(Pu), 'A con frente': comparar(Cf), 'C conservadora': comparar(Co)}
hoy_ = A != ''
res['C conservadora: detalle'] = {'misma calle, mismo nombre': int((hoy_ & sigue_hoy & (Co == A)).sum()),
    'misma calle, nombre 2025 distinto (ortografía o tipo)': int((hoy_ & sigue_hoy & (Co != A)).sum()),
    'la de hoy ya no está a 80 m: eje 2025 más cercano (hasta 40 m)': int((hoy_ & ~sigue_hoy & (Co != '')).sum())}
# De las distintas (A con frente): ¿la calle de hoy sigue existiendo cerca con el mismo nombre (otra calle elegida) o ya no está (renombrada o nueva)?
dist_i = np.where((A != Cf) & (A != '') & (Cf != ''))[0]
cerca = {}
for t, e in zip(it, ie): cerca.setdefault(t, set()).add(plano(enom[e]))
sigue = np.array([A[i] in cerca.get(i, ()) for i in dist_i])
res['A con frente: distintas'] = {'la de hoy sigue a menos de 40 m (eligió otra)': int(sigue.sum()), 'la de hoy ya no está cerca (renombrada o trazo nuevo)': int((~sigue).sum())}
json.dump(res, open(OUT / 'resumen.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))

# Muestras para revisar a ojo (con liga al árbol en el sitio de pruebas)
random.seed(11)
with open(OUT / 'muestras.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['tipo', 'idc', 'calle hoy (frentes 2020)', 'A pura (eje 2025)', 'A con frente', 'C conservadora', 'liga'])
    grupos = (('C: misma calle, nombre 2025 distinto', np.where(hoy_ & sigue_hoy & (Co != A))[0]),
              ('C: la de hoy ya no está, eje más cercano', np.where(hoy_ & ~sigue_hoy & (Co != ''))[0]),
              ('C: pierde calle', np.where(hoy_ & (Co == ''))[0]), ('C: gana calle', np.where(~hoy_ & (Co != ''))[0]))
    for etq, idx in grupos:
        for i in random.sample(list(idx), min(25, len(idx))):
            w.writerow([etq, df.idc[i], actual[i], pura[i], confr[i], conserv[i], f'https://sedemaoficina.github.io/adopta-un-arbol/#arbol-{df.idc[i]}'])
print('muestras en', OUT / 'muestras.csv')
