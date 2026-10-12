"""Datos de Guardianes de árboles (versión de prueba), a partir del paquete de Calles prioritarias y de la capa
frentes_manzanas_verdes (INEGI CEU 2020 + SEDEMA-SIA, nov. 2025).
REALES: colonias, calles, verdor de las calles (p_ndvi) y calles con árboles (INEGI, ARBOLES).
INVENTARIO: avance de la capa arbolado_cdmx_sep (9 oct 2026), preparado por inventario.py; aquí solo se agregan sus conteos.
PENDIENTE: calor (temperatura superficial 2024, SIA)."""
from rutas import META, FRENTES_PKL, INDICADORES_NPZ, INV_META, TEMPERATURA, VIALIDADES_MGN2025, PATRIMONIALES, META_B64, CALLES_B64, exigir
exigir(META, FRENTES_PKL, INDICADORES_NPZ, INV_META, TEMPERATURA, VIALIDADES_MGN2025, PATRIMONIALES)
import pickle, gzip, json, base64, random
import numpy as np
m = json.load(open(META, encoding='utf-8'))
fr = pickle.load(open(FRENTES_PKL, 'rb'))
z = np.load(INDICADORES_NPZ); ARB, NDVI, LON = z['arb'], z['ndvi'], z['lon']
Q = m['Q']
# v28i: colonias partidas del catálogo (mismo nombre, C.P. y alcaldía) cuentan como una sola (colonias_unidas.py)
from colonias_unidas import alias as alias_colonias, tabla as tabla_colonias, areas as areas_colonias
# v30 (auditoría): nombres para mostrar: acentos seguros, abreviaturas, romanos y minúsculas (nombres_colonias.py)
from nombres_colonias import limpiar as limpiar_nombre
# v30g: punto del nombre de cada colonia y alcaldía, calculado aquí y no en el celular (puntos_nombre.py)
import puntos_nombre
ALIAS, UNE, AREA = alias_colonias(m), tabla_colonias(m), areas_colonias(m)
une = lambda c: int(UNE[c]) if c >= 0 else c
col = np.array([une(f[3]) for f in fr]); mun = np.array([f[0] for f in fr])

def agg(mask):
    w, v, a = LON[mask], NDVI[mask], ARB[mask]
    ok = v >= 0; da = a <= 1
    ver = round(float((v[ok] * w[ok]).sum() / w[ok].sum()), 1) if w[ok].sum() else None
    ar = round(float(w[a == 1].sum() / w[da].sum() * 100), 1) if w[da].sum() else None
    return ver, ar

cv, ca = agg(np.ones(len(fr), bool))
# km de calle (frente de manzana) por colonia y alcaldía, para comparar árboles por kilómetro
def km(pts): a = np.array(pts, float) / Q; return float(np.hypot(np.diff(a[:, 0]) * 105.0, np.diff(a[:, 1]) * 110.7).sum())
KMC, KMA = {}, {}
for f in fr:
    k = km(f[5]); KMC[une(f[3])] = KMC.get(une(f[3]), 0) + k; KMA[m['muns'][f[0]]] = KMA.get(m['muns'][f[0]], 0) + k
INV = json.load(open(INV_META, encoding='utf-8'))
TEM = json.load(open(TEMPERATURA, encoding='utf-8'))   # de temperatura.py (WRI, CC BY 4.0)
prom = dict(v=cv, a=ca, t=None)
alcInd = {m['muns'][k]: dict(zip(('v', 'a'), agg(mun == k))) for k in range(len(m['muns']))}
porCol = {}
orden_col = np.argsort(col, kind='stable'); cs = col[orden_col]
cortes = np.flatnonzero(np.diff(cs)) + 1
for grupo in np.split(orden_col, cortes):
    c = int(col[grupo[0]]); msk = np.zeros(len(fr), bool); msk[grupo] = True; porCol[c] = agg(msk)

# calor de una colonia unida: promedio de sus partes pesado por superficie
grupo = {}
for i in range(len(m['colonias'])): grupo.setdefault(int(UNE[i]), []).append(i)
def calor(i):
    ps = [(TEM['col'][str(j)], AREA.get(j, 0)) for j in grupo.get(i, [i]) if TEM['col'].get(str(j)) is not None]
    w = sum(a for _, a in ps)
    return round(sum(t * a for t, a in ps) / w, 1) if w else (ps[0][0] if ps else None)
cat = []
for i, c in enumerate(m['colonias']):
    if not c['n'] or i in ALIAS: cat.append(None); continue   # las unidas quedan vacías: sus datos van en la que queda
    v, a = porCol.get(i, (None, None))
    cat.append(dict(n=limpiar_nombre(c['n']), cp=c['cp'].zfill(5), m=c['m'], v=v, a=a, t=calor(i), km=round(KMC.get(i, 0), 2), arb=INV['conteoCol'].get(str(i), 0)))
for c in m['cols']: c['i'] = une(c['i'])   # los pedazos pasan a la colonia que queda
# y se funden en una sola figura (solo el contorno de afuera): dos pedazos de Los Reyes 1812 caían dentro de la 158 y se veían como
# contornos sueltos dentro de la colonia (Liber, 11 oct)
from shapely.geometry import Polygon as _Pol
from shapely.ops import unary_union as _union
_unidas, _piezas, _cols = set(ALIAS.values()), {}, []
for c in m['cols']:
    if c['i'] in _unidas: _piezas.setdefault(c['i'], []).extend(c['rings'])
    else: _cols.append(c)
for k, rings in _piezas.items():
    u = _union([_Pol(r).buffer(0) for r in rings if len(r) >= 4])
    _cols.append({'i': k, 'rings': [[[int(round(x)), int(round(y))] for x, y in p.exterior.coords] for p in getattr(u, 'geoms', [u]) if not p.is_empty and p.area > 0]})
m['cols'] = _cols

def zz(v): return v*2 if v >= 0 else -v*2-1
def enc(o, v):
    v = zz(v)
    while True:
        b = v & 0x7f; v >>= 7
        if v: o.append(b | 0x80)
        else: o.append(b); break
# CALLES DEL MAPA: vialidades INEGI, Marco Geoestadístico 2025 (desde v28f; entregadas por el CIGA; antes, ejes MGN 2020), una línea por calle.
# Los frentes de manzana se siguen usando arriba para los indicadores (verdor, calles con árboles, km) y en inventario.py para la calle de cada árbol.
# Por eje: nombre (índice en names, misma convención NOMVIAL que los frentes), colonia (la del frente más cercano con el mismo nombre) y puntos.
# Orden: por alcaldía y, dentro, por clase (0 peatonal, 1 calle, 2 avenida, 3 vía rápida) para dibujar cada clase con su ancho.
import shapefile
from scipy.spatial import cKDTree
CLASE = {**{t: 3 for t in ('Periférico', 'Viaducto', 'Autopista', 'Carretera')},
         **{t: 2 for t in ('Eje Vial', 'Avenida', 'Calzada', 'Boulevard', 'Circuito', 'Diagonal')},
         **{t: 0 for t in ('Andador', 'Peatonal', 'Pasaje', 'Corredor')}}
names = list(m['names']); NIDX = {n: i for i, n in enumerate(names)}
mid = np.array([f[5][len(f[5]) // 2] for f in fr], float) / Q
arbol_kd = cKDTree(np.c_[mid[:, 0] * 105000, mid[:, 1] * 110700])
fr_name = np.array([f[1] for f in fr]); fr_col = col
from vialidades import leer_ejes   # ya en longitud y latitud (la capa 2025 viene en metros)
ejes = []; sin_col = 0
for cve_mun, tipo, nom, pts in leer_ejes():
    k = CLASE.get(tipo, 1)
    if nom not in NIDX: NIDX[nom] = len(names); names.append(nom)
    ni = NIDX[nom]
    mx, my = pts[len(pts) // 2]
    d, ix = arbol_kd.query([mx * 105000, my * 110700], k=24, distance_upper_bound=120)
    c = -1
    for dd, ii in zip(np.atleast_1d(d), np.atleast_1d(ix)):
        if np.isinf(dd): break
        if fr_name[ii] == ni: c = int(fr_col[ii]); break
    if c < 0:
        dd, ii = arbol_kd.query([mx * 105000, my * 110700], k=1, distance_upper_bound=200)
        c = int(fr_col[ii]) if not np.isinf(dd) else -1
    if c < 0: sin_col += 1
    q = [(round(x * Q), round(y * Q)) for x, y in pts]
    # quitar puntos repetidos tras cuantizar
    q = [q[0]] + [p for i_, p in enumerate(q[1:], 1) if p != q[i_ - 1]]
    if len(q) < 2: continue
    ejes.append((cve_mun, k, ni, c, q))
print('ejes', len(ejes), 'sin colonia', sin_col, 'nombres', len(names))
ejes.sort(key=lambda e: (e[0], e[1]))
cuentaK = {}
for e in ejes: cuentaK.setdefault(e[0], [0, 0, 0, 0])[e[1]] += 1
o = bytearray(); enc(o, len(ejes)); px = py = 0
for (_, k, ni, c, q) in ejes:
    enc(o, ni); enc(o, c); enc(o, len(q))
    for x, y in q: enc(o, x-px); enc(o, y-py); px, py = x, y
m['names'] = names
calles_b64 = base64.b64encode(gzip.compress(bytes(o), 9, mtime=0)).decode()   # v30: mtime=0, mismo resultado con los mismos datos
prom['t'] = TEM['ciudad']
for k in alcInd: alcInd[k]['t'] = TEM['alc'].get(k)
inventario = dict(calles=INV['calles'], fechas=INV['fechas'], ugas=INV['ugas'], alc={k: dict(arb=v, km=round(KMA[k], 1)) for k, v in INV['conteoAlc'].items()},
                  sinColonia=INV['sinColonia'], registros=INV['registros'])
PAT = json.load(open(PATRIMONIALES, encoding='utf-8'))   # de patrimoniales.py (hoja Salida_Publica)
for p_ in PAT:
    if isinstance(p_, dict) and isinstance(p_.get('col'), int): p_['col'] = une(p_['col'])
paquete = dict(Q=Q, prom=prom, alcInd=alcInd, inv=inventario, pat=PAT, munNames=dict(zip(m['muns'], m['munNames'])), names=m['names'],
    colonias=cat, alc=m['alc'], callesMun=[[k, cuentaK.get(k, [0, 0, 0, 0])] for k in m['muns']], cols=m['cols'], alias={str(k): v for k, v in ALIAS.items()},
    lbl=puntos_nombre.calcular(m['cols'], m['alc'], Q),
    # v30g: las letras de todos los nombres del mapa (86), para que la página no las busque entre más de 600 mil caracteres al abrir
    chars=''.join(sorted(set(''.join(m['names'])) | set(''.join(inventario['calles'])) | set(''.join(c['n'] for c in cat if c)) | set(''.join(a['nom'] for a in m['alc'])))))
meta_b64 = base64.b64encode(gzip.compress(json.dumps(paquete, ensure_ascii=False, separators=(",", ":")).encode(), 9, mtime=0)).decode()
open(META_B64, 'w', encoding='utf-8').write(meta_b64); open(CALLES_B64, 'w', encoding='utf-8').write(calles_b64)
print('prom', prom, '| meta', len(meta_b64)//1024, 'KB  calles', len(calles_b64)//1024, 'KB')
