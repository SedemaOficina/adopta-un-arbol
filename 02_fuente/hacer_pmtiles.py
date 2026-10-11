"""Teselas vectoriales de calles (vialidades INEGI MGN 2025, desde v28f) -> 00_insumos/vialidades/calles.pmtiles, sin QGIS. Uso: python hacer_pmtiles.py [salida]
Une los tramos de cada calle (mismo nombre y clase, por alcaldía) para que se lean continuos al alejarse."""
import shapefile, math, gzip, json, sys
from collections import defaultdict
from shapely.geometry import LineString, MultiLineString, box, mapping
from shapely.ops import linemerge, transform
from shapely.strtree import STRtree
import mapbox_vector_tile as mvt
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
CLASE = {**{t: 3 for t in ('Periférico','Viaducto','Autopista','Carretera')},
         **{t: 2 for t in ('Eje Vial','Avenida','Calzada','Boulevard','Circuito','Diagonal')},
         **{t: 0 for t in ('Andador','Peatonal','Pasaje','Corredor')}}
R = 6378137.0
def merc(x, y): return (math.radians(x) * R, math.log(math.tan(math.pi / 4 + math.radians(y) / 2)) * R)
from vialidades import leer_ejes   # vialidades INEGI MGN 2025, ya en longitud y latitud (v28f)
from rutas import INSUMOS
SALIDA = sys.argv[1] if len(sys.argv) > 1 else str(INSUMOS / 'vialidades' / 'calles.pmtiles')
grupos = defaultdict(list); tipo = {}
for mun, tv, nv, pts in leer_ejes():
    k = CLASE.get(tv, 1); key = (mun, nv, k)
    grupos[key].append([merc(*p) for p in pts]); tipo[key] = tv
feats = []
for (mun, nom, k), ls in grupos.items():
    g = linemerge(MultiLineString(ls))
    for parte in (g.geoms if g.geom_type == 'MultiLineString' else [g]):
        feats.append((parte, {'nombre': nom, 'tipo': tipo[(mun, nom, k)], 'clase': k}))
print('tramos unidos', len(feats), file=sys.stderr)
geoms = [f[0] for f in feats]; tree = STRtree(geoms)
DESDE = {3: 10, 2: 10, 1: 13, 0: 15}
B = (-99.3515, 19.1241, -98.9466, 19.5928)
def tile_bounds(z, x, y):
    n = 2 ** z; w = 2 * math.pi * R / n; x0 = -math.pi * R + x * w; y1 = math.pi * R - y * w
    return x0, y1 - w, x0 + w, y1
ent = []
for z in range(10, 16):
    n = 2 ** z
    tx0 = int((B[0] + 180) / 360 * n); tx1 = int((B[2] + 180) / 360 * n)
    ty = lambda la: int((1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n)
    ty0, ty1 = ty(B[3]), ty(B[1])
    tol = 2 * math.pi * R / n / 4096 * 1.0   # ~1 unidad de tesela
    cuenta = 0
    for x in range(tx0, tx1 + 1):
        for y in range(ty0, ty1 + 1):
            b = tile_bounds(z, x, y); w = b[2] - b[0]; pad = w * 64 / 4096
            clip = box(b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad)
            out = []
            for i in tree.query(clip):
                g, props = feats[i]
                if z < DESDE[props['clase']]: continue
                c = g.intersection(clip)
                if c.is_empty: continue
                c = c.simplify(tol, preserve_topology=False)
                if c.is_empty or c.length < tol: continue
                out.append({'geometry': c, 'properties': props})
            if not out: continue
            data = mvt.encode([{'name': 'calles', 'features': out}], default_options={'quantize_bounds': b, 'extents': 4096, 'y_coord_down': False})
            ent.append((zxy_to_tileid(z, x, y), gzip.compress(data, 6))); cuenta += 1
    print('zoom', z, 'teselas', cuenta, file=sys.stderr)
ent.sort()
vl = [{'id': 'calles', 'fields': {'nombre': 'String', 'tipo': 'String', 'clase': 'Number'}, 'minzoom': 10, 'maxzoom': 15,
       'description': 'Ejes de vialidad unidos por calle. clase: 3 vía rápida, 2 avenida, 1 calle, 0 peatonal'}]
with open(SALIDA, 'wb') as f:
    w = Writer(f)
    for tid, d in ent: w.write_tile(tid, d)
    e7 = lambda v: int(v * 1e7)
    w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP, 'min_zoom': 10, 'max_zoom': 15,
                'min_lon_e7': e7(B[0]), 'min_lat_e7': e7(B[1]), 'max_lon_e7': e7(B[2]), 'max_lat_e7': e7(B[3]),
                'center_zoom': 13, 'center_lon_e7': e7(-99.1332), 'center_lat_e7': e7(19.4326)},
               {'name': 'Calles CDMX', 'description': 'Vialidades INEGI MGN 2025 · Guardianes de árboles',
                'attribution': 'INEGI, Marco Geoestadístico 2025', 'type': 'baselayer', 'version': '2', 'vector_layers': vl})
print('listo', len(ent), file=sys.stderr)
