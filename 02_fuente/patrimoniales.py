"""Árboles patrimoniales para Guardianes de árboles, solo desde la hoja Salida_Publica del padrón (la única que se publica).
La hoja se descarga en cada corrida de su liga publicada (PATRIMONIALES_URL en rutas.py) y se guarda como copia local;
sin internet, se usa la última copia. Si la hoja trae columnas que no son de Salida_Publica, el script se detiene:
así nunca se usa por error la hoja «Listado».
Cada uno se empata con el árbol del inventario más cercano (hasta 10 m); si no hay, aparece como punto propio.
La página de su ficha sigue la regla del micrositio: arbol-<nombre asignado sin acentos, en minúsculas y con guiones>.html"""
from rutas import META, PATRIMONIALES_CSV, PATRIMONIALES_URL, INV_PKL, PATRIMONIALES, exigir
exigir(META, INV_PKL)
import csv, io, re, sys, unicodedata, json, urllib.request, numpy as np, pandas as pd
from shapely import points, polygons, STRtree

# Columnas de la hoja Salida_Publica (11 oct 2026). Una columna nueva puede ser privada: se revisa antes de aceptarla aquí.
PUBLICAS = set('''id estado nomino nombre_asignado nombre_comun nombre_cientifico centenario historico notable singular categorias fecha_decreto
gaceta drive_decreto tiene_programa url_programa alcaldia calle num_ext colonia cp entre_1 entre_2 referencias tipo_ubicacion nombre_sitio
suelo_conservacion pueblo_barrio latitud longitud utm_x utm_y street_view reino phylum clase orden familia genero autor idnombrecat endemismo
cites iucn nom059 prioritaria nivel_prioridad exotica_invasora ambiente forma_crecimiento url_snib url_observacion altura_m dap_cm
altura_medicion_dap circunferencia_cm ancho_copa_m largo_copa_m extension_copa_m condicion_general estructura_general edad_estimada
expectativa_vida fecha_itree moneda_itree validacion_itree url_itree beneficio_economico co2_eq_kg escorrentia_l precip_interceptada_l
elim_co_g elim_o3_g elim_no2_g elim_so2_g elim_pm25_g ahorro_kwh evit_co2_kg evit_co_g evit_no2_g evit_so2_g evit_pm25_g obs_publicas'''.split())
USADAS = {'id', 'estado', 'nombre_asignado', 'nombre_comun', 'nombre_cientifico', 'categorias', 'alcaldia', 'calle', 'num_ext', 'latitud', 'longitud'}
try:
    texto = urllib.request.urlopen(PATRIMONIALES_URL, timeout=60).read().decode('utf-8')
    origen = 'hoja en línea'
except Exception as e:
    exigir(PATRIMONIALES_CSV)
    print(f'AVISO: no se pudo descargar la hoja ({e}); se usa la copia local {PATRIMONIALES_CSV.name}')
    texto, origen = PATRIMONIALES_CSV.read_text(encoding='utf-8'), 'copia local'
lector = csv.DictReader(io.StringIO(texto))
extra, faltan = set(lector.fieldnames or []) - PUBLICAS, USADAS - set(lector.fieldnames or [])
if extra or faltan:
    sys.exit('La hoja no es Salida_Publica (o cambió): ' + (f'columnas nuevas {sorted(extra)} ' if extra else '') + (f'faltan {sorted(faltan)}' if faltan else '') +
             '\nRevisar la liga en rutas.py (PATRIMONIALES_URL). Nunca usar la hoja «Listado».')
rows = [r for r in lector if r['estado'] == 'Publicado']
if not rows: sys.exit('La hoja no trae ningún árbol con estado «Publicado».')
if origen == 'hoja en línea':
    PATRIMONIALES_CSV.parent.mkdir(parents=True, exist_ok=True); PATRIMONIALES_CSV.write_text(texto, encoding='utf-8', newline='')
print(f'{len(rows)} árboles patrimoniales publicados ({origen})')
m = json.load(open(META, encoding='utf-8')); Q = m['Q']
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
