"""Vialidades INEGI, Marco Geoestadístico 2025 (las entregó el CIGA: 00_insumos/ciga/vialidades_MGN2025.zip). Desde v28f son las calles
del sitio (decisión de Liber, 11 oct 2026). A diferencia de los ejes 2020, vienen en metros (Lambert de INEGI, ITRF2008) y con letras
en Latin-1: aquí se leen ya en longitud y latitud (WGS84). Lo usan inventario.py (calle de cada árbol), construir_datos.py (calles del
mapa) y hacer_pmtiles.py (teselas)."""
import io, zipfile
import numpy as np, shapefile
from pyproj import Transformer
from rutas import VIALIDADES_MGN2025

CODIFICACION = {'88591': 'latin-1', '1252': 'cp1252', 'UTF-8': 'utf-8', 'UTF8': 'utf-8'}

def leer_ejes(ruta=VIALIDADES_MGN2025):
    """Lista de ejes (CVE_MUN, TIPOVIAL, NOMVIAL, [(lon, lat), …]) en el orden del archivo; sin tramos de menos de dos puntos."""
    z = zipfile.ZipFile(ruta); shp = [n for n in z.namelist() if n.lower().endswith('.shp')][0]; b = shp[:-4]
    cpg = z.read(b + '.cpg').decode('ascii').strip() if b + '.cpg' in z.namelist() else '1252'
    rd = shapefile.Reader(shp=io.BytesIO(z.read(shp)), dbf=io.BytesIO(z.read(b + '.dbf')), shx=io.BytesIO(z.read(b + '.shx')),
                          encoding=CODIFICACION.get(cpg, cpg))
    fl = [f[0] for f in rd.fields[1:]]; iN, iT, iM = fl.index('NOMVIAL'), fl.index('TIPOVIAL'), fl.index('CVE_MUN')
    crudos = [(sr.record, sr.shape.points) for sr in rd.iterShapeRecords() if len(sr.shape.points) >= 2]
    T = Transformer.from_crs(z.read(b + '.prj').decode('latin-1'), 'EPSG:4326', always_xy=True)
    xy = np.array([p for _, pts in crudos for p in pts], float); lon, lat = T.transform(xy[:, 0], xy[:, 1])
    out, k = [], 0
    for rec, pts in crudos:
        n = len(pts)
        out.append((rec[iM], (rec[iT] or '').strip(), (rec[iN] or '').strip(), list(zip(lon[k:k + n].tolist(), lat[k:k + n].tolist()))))
        k += n
    return out

if __name__ == '__main__':
    e = leer_ejes(); print(len(e), 'ejes;', e[0][:3], e[0][3][:2])
