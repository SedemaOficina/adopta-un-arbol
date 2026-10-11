"""Indicadores reales por colonia desde frentes_manzanas_verdes (INEGI CEU 2020 + SEDEMA-SIA, nov. 2025):
 - verdor: % de la longitud de los frentes bajo vegetación (p_ndvi, NDVI), ponderado por longitud.
 - arboles: % de la longitud de frentes que INEGI registró con árboles o palmeras (ARBOLES = 1) sobre los que tienen dato (1 o 3).
Además, para cada frente de la herramienta (orden de calles prioritarias) si INEGI registró árboles."""
from rutas import META, FRENTES_PKL, FRENTES_SHP, INDICADORES_NPZ, exigir
exigir(META, FRENTES_PKL, FRENTES_SHP.with_suffix('.shp'))
import shapefile, pickle, json, numpy as np
from pyproj import Transformer
from shapely.geometry import Polygon, Point
from shapely.strtree import STRtree
D=str(FRENTES_SHP)
T=Transformer.from_crs(open(D+'.prj').read(),"EPSG:4326",always_xy=True)
m=json.load(open(META,encoding='utf-8')); Q=m['Q']
fr=pickle.load(open(FRENTES_PKL,'rb'))
r=shapefile.Reader(D, encoding='utf-8')
# índice de los frentes decodificados por primer y último vértice
idx={}
for i,f in enumerate(fr):
    p=f[5]; idx.setdefault((p[0],p[-1]),i); idx.setdefault((p[-1],p[0]),i)
arb_fr=np.full(len(fr),255,np.uint8); ndvi_fr=np.full(len(fr),-1.0); lon_fr=np.zeros(len(fr))
casados=0
for k in range(r.numRecords):
    s=r.shape(k); rec=r.record(k)
    xs,ys=T.transform([s.points[0][0],s.points[-1][0]],[s.points[0][1],s.points[-1][1]])
    a=(round(xs[0]*Q),round(ys[0]*Q)); b=(round(xs[1]*Q),round(ys[1]*Q))
    i=idx.get((a,b))
    if i is None:
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                for ex in (-1,0,1):
                    for ey in (-1,0,1):
                        i=idx.get(((a[0]+dx,a[1]+dy),(b[0]+ex,b[1]+ey)))
                        if i is not None: break
                    if i is not None: break
                if i is not None: break
            if i is not None: break
    if i is None: continue
    casados+=1
    arb_fr[i]={'1':1,'3':0}.get(rec['ARBOLES'],2); ndvi_fr[i]=rec['p_ndvi']; lon_fr[i]=rec['LON_FM']
print('casados',casados,'de',r.numRecords)
np.savez(INDICADORES_NPZ,arb=arb_fr,ndvi=ndvi_fr,lon=lon_fr)
