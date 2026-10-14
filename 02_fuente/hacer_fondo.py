"""Fondo del mapa (v28h; antes, prueba en la rama prueba-mapa-base-osm): manzanas del Catastro de la CDMX (las que usó el CIGA para
ubicar los árboles: solo 3.9 % de los árboles cae dentro de una), parques y jardines del Inventario de Áreas Verdes 2017 de SEDEMA (no todo
el inventario: ver SUBCAT), áreas naturales protegidas y áreas de valor ambiental oficiales (del proyecto Categorías de protección ambiental)
y cuerpos de agua de SEDEMA. Escribe en 10_sitio/datos/ los archivos del fondo, en el mismo formato que los árboles (base64 de gzip de
enteros variables; coordenadas en 1/ESCALA de grado, en diferencias):
  fondo_manzanas_<alcaldía>.txt   manzanas de cada alcaldía (se piden solo al acercarse)
  fondo_base.txt                  parques y jardines, agua, ANP y AVA
  fondo_nombres.json              nombre de cada ANP y AVA, un punto dentro de ella y su superficie
Insumos en 00_insumos/ (ver su LEEME.md). Uso: python hacer_fondo.py"""
import base64, gzip, io, zipfile
import numpy as np, shapefile
from pyproj import Transformer
from shapely import Polygon, Point, STRtree
from rutas import INSUMOS, DATOS

KX, KY = 105000.0, 110700.0
ESCALA = 200_000   # coordenadas en 1/200,000 de grado (rejilla de 0.55 m, menor que la simplificación): 27 % menos que en millonésimas
                   # y sin diferencia a la vista; la página divide entre lo mismo (FONDO_ESCALA en 05_mapa.js)
CATASTRO = INSUMOS / 'ciga' / 'catastro_manzanas' / 'Catastro_CDMX_Manzanas.zip'
ALCALDIAS = INSUMOS / 'ciga' / 'LimitesAlcaldia_MGN2025.zip'
VERDES = INSUMOS / 'contexto' / 'Inventario de Áreas Verdes 2017.shp'
AGUA = INSUMOS / 'contexto' / 'Cuerpos de agua, canales, y tanque regulador.shp'
PROTEGIDAS = INSUMOS / 'contexto' / 'anp_ava_geometrias.geojson'   # ANP y AVA oficiales, del proyecto Categorías de protección ambiental (decretos, CONANP, SEDEMA)

def lector(ruta, enc='latin-1'):
    """(registros, anillos por figura en lon/lat) de un .shp suelto o del primero dentro de un .zip."""
    if str(ruta).endswith('.zip'):
        z = zipfile.ZipFile(ruta); s = [n for n in z.namelist() if n.lower().endswith('.shp')][0]; b = s[:-4]
        r = shapefile.Reader(shp=io.BytesIO(z.read(s)), dbf=io.BytesIO(z.read(b + '.dbf')), shx=io.BytesIO(z.read(b + '.shx')), encoding='latin-1', encodingErrors='replace')
        prj = z.read(b + '.prj').decode('latin-1')
    else:
        r = shapefile.Reader(str(ruta), encoding=enc, encodingErrors='replace'); prj = open(str(ruta)[:-4] + '.prj', encoding='latin-1').read()
    T = Transformer.from_crs(prj, 'EPSG:4326', always_xy=True)
    figs, recs = [], []
    for k in range(len(r)):
        try: s = r.shape(k)
        except shapefile.ShapefileException: continue   # figuras vacías (el inventario de áreas verdes trae alguna)
        if not s.points: continue
        sr = type('', (), {'record': r.record(k)})
        partes = list(s.parts) + [len(s.points)]
        xy = np.array(s.points, float); lon, lat = T.transform(xy[:, 0], xy[:, 1])
        figs.append([np.c_[lon[a:b], lat[a:b]] for a, b in zip(partes[:-1], partes[1:]) if b - a >= 4]); recs.append(sr.record)
    return recs, figs

def agrupar(anillos):
    """Anillos de una figura del shapefile -> polígonos con sus huecos. En un shapefile el contorno exterior va en el sentido del reloj y
    los huecos al revés; cada hueco va con el exterior anterior. (Sin esto, la tierra dentro de un contorno de canales se pintaba como agua.)"""
    pols = []
    for a in anillos:
        x, y = a[:, 0], a[:, 1]; doble_area = np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) + x[-1] * y[0] - x[0] * y[-1]
        if doble_area < 0 or not pols: pols.append([a])
        else: pols[-1].append(a)
    return pols

def simplificar(pol, tol):
    """Polígono (exterior y huecos, en lon/lat) -> anillos simplificados (tolerancia en metros), o None si queda demasiado chico."""
    p = Polygon(pol[0] * [KX, KY], [h * [KX, KY] for h in pol[1:]]).simplify(tol, preserve_topology=True)
    if p.is_empty or p.area < 4 or p.geom_type != 'Polygon': return None
    return [np.array(p.exterior.coords)[:-1] / [KX, KY]] + [np.array(h.coords)[:-1] / [KX, KY] for h in p.interiors if Polygon(h).area >= 4]

class Escritor:
    def __init__(self): self.b = bytearray(); self.x = self.y = 0
    def v(self, n):
        n = 2 * n if n >= 0 else -2 * n - 1
        while True:
            c = n & 0x7f; n >>= 7
            if n: self.b.append(c | 0x80)
            else: self.b.append(c); return
    def poligonos(self, lista):   # lista de polígonos; cada uno, lista de anillos
        def rejilla(a):   # a la rejilla de ESCALA, sin vértices repetidos; None si el anillo se cierra en menos de 3
            q = np.round(np.asarray(a) * ESCALA).astype(np.int64); q = q[np.r_[True, np.any(q[1:] != q[:-1], axis=1)]]
            if len(q) > 1 and (q[0] == q[-1]).all(): q = q[:-1]
            return q if len(q) >= 3 else None
        lista = [[r for r in rs if r is not None] for rs in ([rejilla(a) for a in anillos] for anillos in lista) if rs[0] is not None]
        self.v(len(lista))
        for anillos in lista:
            self.v(len(anillos))
            for a in anillos:
                self.v(len(a))
                for X, Y in a:
                    X, Y = int(X), int(Y); self.v(X - self.x); self.v(Y - self.y); self.x, self.y = X, Y
    def guardar(self, nombre):
        (DATOS / nombre).write_text(base64.b64encode(gzip.compress(bytes(self.b), 9, mtime=0)).decode('ascii'), encoding='ascii')
        return (DATOS / nombre).stat().st_size // 1024

# Alcaldías (límites MGN 2025): para repartir las manzanas por alcaldía
recs, figs = lector(ALCALDIAS)
alc = [(str(r[2]).zfill(5)[-3:], Polygon(f[0])) for r, f in zip(recs, figs)]   # campo CVEMUN_05 (p. ej. 9005 -> «005»)
print('alcaldías', sorted(c for c, _ in alc))
t_alc = STRtree([p for _, p in alc])

# Manzanas de Catastro
_, figs = lector(CATASTRO); por_alc = {}
for anillos in figs:
    for pol in agrupar(anillos):
        s = simplificar(pol, .7)
        if s is None: continue
        c = Point(s[0].mean(0)); i = t_alc.query(c, predicate='within')
        cve = alc[int(i[0])][0] if len(i) else alc[int(t_alc.nearest(c))][0]
        por_alc.setdefault(cve, []).append(s)
for cve, lista in sorted(por_alc.items()):
    e = Escritor(); e.poligonos(lista); print('manzanas', cve, len(lista), e.guardar(f'fondo_manzanas_{cve}.txt'), 'KB')

# Áreas verdes y agua (SEDEMA)
# Solo lo que a la vista es un espacio verde (Liber, 11 oct): el inventario 2017 también cuenta como área verde el terreno completo de
# escuelas, unidades habitacionales, deportivos y panteones, y los camellones, glorietas, plazas (casi siempre pavimentadas), baldíos y azoteas.
SUBCAT = {'Parques', 'Arboledas', 'Alamedas', 'Jardines públicos'}
CATEG = {'Áreas con vegetación reminisciente', 'Vivero', 'Forestación urbana'}   # las de protección salen de PROTEGIDAS (más completo: 66 contra 31)
recs_v, figs_v = lector(VERDES, 'utf-8')
verdes = [s for r, anillos in zip(recs_v, figs_v) if (r[2] or '').strip() in SUBCAT or (r[1] or '').strip() in CATEG
          for pol in agrupar(anillos) if (s := simplificar(pol, 1.0)) is not None]
recs_a, figs_a = lector(AGUA)   # solo canales, cuerpos de agua y tanque regulador (claves 3, 4 y 5): la figura sin nombre (clave 0) es el resto de la ciudad
agua = [s for r, anillos in zip(recs_a, figs_a) if int(r[1] or 0) in (3, 4, 5) for pol in agrupar(anillos) if (s := simplificar(pol, 1.0)) is not None]
import json
protegidas = []
for f in json.load(open(PROTEGIDAS, encoding='utf-8'))['features']:
    g = f['geometry']; polis = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for anillos in polis:   # GeoJSON: el primero es el exterior; los demás, huecos
        s = simplificar([np.array(a, float)[:-1] for a in anillos], 1.5)
        if s is not None: protegidas.append(s)
e = Escritor(); e.poligonos(verdes); e.poligonos(agua); e.poligonos(protegidas)
print('parques y jardines', len(verdes), '| agua', len(agua), '| ANP y AVA', len(protegidas), '|', e.guardar('fondo_base.txt'), 'KB')

# Nombres de las ANP y AVA (prueba de etiquetas, 11 oct): un punto dentro de la parte más grande de cada área (polylabel), con su superficie
# para decidir desde qué acercamiento cabe el nombre. Sin paréntesis («Bosque de Chapultepec»); las barrancas con «Barranca» delante;
# las que comparten polígono (Cerro de la Estrella federal y local; Sierra de Santa Catarina ZCE y ZSCE) quedan una vez.
import re
from shapely.geometry import shape
from shapely.ops import polylabel
nombres = {}
for f in json.load(open(PROTEGIDAS, encoding='utf-8'))['features']:
    p = f['properties']; n = re.sub(r'\s*\([^)]*\)', '', p['nombre']).strip()
    if p['grupo'] == 'AVA · Barranca' and not n.lower().startswith(('barranca', 'río')): n = 'Barranca ' + n
    g = shape(f['geometry']).buffer(0); parte = max(getattr(g, 'geoms', [g]), key=lambda x: x.area)
    m = Polygon(np.array(parte.exterior.coords) * [KX, KY], [np.array(h.coords) * [KX, KY] for h in parte.interiors])
    # v31f: quinto dato, la categoría («anp» o «ava»): el mapa antepone «Área Natural Protegida» a las ANP (Liber, 14 oct)
    c = polylabel(m, tolerance=5); fila = [n, round(c.x / KX, 5), round(c.y / KY, 5), round(m.area / 1e4, 1), 'anp' if p['grupo'].startswith('ANP') else 'ava']
    if n not in nombres or fila[3] > nombres[n][3]: nombres[n] = fila
(DATOS / 'fondo_nombres.json').write_text(json.dumps(sorted(nombres.values(), key=lambda x: -x[3]), ensure_ascii=False), encoding='utf-8')
print('nombres de ANP y AVA', len(nombres))
