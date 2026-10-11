"""Prepara el inventario de arbolado (capa arbolado_cdmx_sep, avance entregado por Liber el 9 oct 2026) para Guardianes de árboles.
Solo registros 'Árbol'. A cada árbol se le asigna su colonia (punto en polígono) y su calle (frente de manzana INEGI más cercano, hasta 40 m).
Salida: un archivo binario comprimido por alcaldía (se descarga solo al abrir esa alcaldía) y conteos reales por colonia y alcaldía."""
import base64
from rutas import META, FRENTES_PKL, INV_PKL, INV_META, DATOS, exigir
exigir(META, FRENTES_PKL, INV_PKL); DATOS.mkdir(parents=True, exist_ok=True)
import pandas as pd, numpy as np, json, pickle, gzip, re
from shapely import points, linestrings, polygons, STRtree
m = json.load(open(META, encoding='utf-8')); Q = m['Q']
fr = pickle.load(open(FRENTES_PKL, 'rb'))
df = pd.read_pickle(INV_PKL)
total = len(df); df = df[df.registro == 'Árbol'].reset_index(drop=True)
KX, KY = 105000.0, 110700.0   # metros por grado (aprox. a 19.4° N), para medir distancias en el plano
X = df.lng.values * KX; Y = df.lat.values * KY
# --- colonia de cada árbol ---
polys, pid = [], []
for c in m['cols']:
    for r in c['rings']:
        a = np.array(r, float) / Q
        if len(a) >= 4: polys.append(polygons(np.c_[a[:, 0] * KX, a[:, 1] * KY])); pid.append(c['i'])
pid = np.array(pid); arbol_pt = points(np.c_[X, Y])
t = STRtree(polys); ia, ip = t.query(arbol_pt, predicate='within')
col = np.full(len(df), -1, np.int32); col[ia] = pid[ip]
print('árboles', len(df), 'de', total, '| sin colonia (dentro de polígono)', int((col < 0).sum()))
# v25h (11 oct 2026): los árboles de banqueta que quedan fuera de un polígono de colonia por pocos metros van a la colonia más cercana (hasta 30 m).
sinc = np.flatnonzero(col < 0)
jn, jp = t.query_nearest(arbol_pt[sinc], max_distance=30, all_matches=False)
col[sinc[jn]] = pid[jp]
print('asignados a la colonia más cercana (<=30 m)', len(jn), '| siguen sin colonia', int((col < 0).sum()))
# --- calle: frente más cercano ---
lines = [linestrings(np.array(f[5], float) / Q * [KX, KY]) for f in fr]
# nombre de calle = tipo de vialidad + nombre (INEGI), p. ej. «Calle 5», «Avenida Revolución»
TIPOS = m['tipos']
def nom(f):
    n = m['names'][f[1]] if f[1] >= 0 else ''
    t = TIPOS[f[2]] if 0 <= f[2] < len(TIPOS) else ''
    if not n or n.lower().startswith(('ninguno', 'sin nombre')): return ''
    return (t + ' ' + n) if t and t not in ('Rasgo', 'Otro', 'Ninguno', 'Sin Referencia') and not n.lower().startswith(t.lower()) else n
CALLES = sorted({nom(f) for f in fr} - {''}); cidx = {c: i for i, c in enumerate(CALLES)}
names = np.array([cidx.get(nom(f), -1) for f in fr])
tl = STRtree(lines); ia2, il = tl.query_nearest(arbol_pt, max_distance=40, all_matches=False)
calle = np.full(len(df), -1, np.int32); calle[ia2] = names[il]
print('con calle', int((calle >= 0).sum()))
# --- Street View: cámara, rumbo e inclinación desde pano_url ---
pv = df.pano_url.str.extract(r'viewpoint=([-\d.]+),([-\d.]+)&heading=([-\d.]+)&pitch=([-\d.]+)').astype(float).values
fechas = sorted(df.pano_date.unique()); fidx = {f: i for i, f in enumerate(fechas)}
ugas = sorted(df.uga.unique()); uidx = {u: i for i, u in enumerate(ugas)}
seq = df.idc.str.rsplit('-', n=1).str[1].astype(int).values
mun_col = {i: c['m'] for i, c in enumerate(m['colonias'])}
mun = np.array([mun_col.get(int(c), '') if c >= 0 else '' for c in col])
# alcaldía de los árboles sin colonia: la de su UGA
ABR2MUN = {'AZC':'002','COY':'003','CUJ':'004','GAM':'005','IZC':'006','IZP':'007','MAC':'008','MLP':'009','AOB':'010','TLH':'011','TLP':'012','XOC':'013','BJU':'014','CUH':'015','MIH':'016','VCA':'017'}
sin = mun == ''; mun[sin] = [ABR2MUN[u.split('-')[0]] for u in df.uga.values[sin]]
def zz(v): return v*2 if v >= 0 else -v*2-1
def enc(o, v):
    v = zz(int(v))
    while True:
        b = v & 0x7f; v >>= 7
        if v: o.append(b | 0x80)
        else: o.append(b); break
E = 1e6
conteo_col, conteo_alc, tamanos = {}, {}, {}
for cve in sorted(set(mun)):
    idx = np.flatnonzero(mun == cve)
    idx = idx[np.lexsort((df.lng.values[idx], df.lat.values[idx], col[idx]))]
    o = bytearray(); enc(o, len(idx)); px = py = 0; pc = 0
    for i in idx:
        x = round(df.lng.values[i] * E); y = round(df.lat.values[i] * E)
        enc(o, col[i] - pc); pc = col[i]
        enc(o, x - px); enc(o, y - py); px, py = x, y
        enc(o, uidx[df.uga.values[i]]); enc(o, seq[i]); enc(o, calle[i])
        enc(o, round(pv[i, 1] * E) - x); enc(o, round(pv[i, 0] * E) - y); enc(o, round(pv[i, 2]) % 360); enc(o, round(pv[i, 3])); enc(o, fidx[df.pano_date.values[i]])
    g = gzip.compress(bytes(o), 9); (DATOS / f'arboles_{cve}.txt').write_text(base64.b64encode(g).decode()); tamanos[cve] = len(g)   # la página lee el gzip en base64
    conteo_alc[cve] = int(len(idx))
for c in col[col >= 0]: conteo_col[int(c)] = conteo_col.get(int(c), 0) + 1
json.dump(dict(calles=CALLES, fechas=fechas, ugas=ugas, conteoCol=conteo_col, conteoAlc=conteo_alc, sinColonia=int((col < 0).sum()), registros=total,
               porTipo=df_tipos if False else None), open(INV_META, 'w', encoding='utf-8'), ensure_ascii=False)
print('KB por alcaldía', {k: v // 1024 for k, v in tamanos.items()}, 'total MB', sum(tamanos.values()) / 1e6)
