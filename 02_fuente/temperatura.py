"""Calor por colonia y alcaldía: promedio de la temperatura superficial extrema (percentil 95 de la temporada más calurosa, Landsat 2023-2025, 30 m)
de la capa de WRI (CC BY 4.0). Cobertura: mancha urbana; las colonias fuera de ella quedan sin dato."""
from rutas import META, LST_TIF, TEMPERATURA, exigir
exigir(META, LST_TIF)
import rasterio, numpy as np, json
from rasterio.features import rasterize
m = json.load(open(META, encoding='utf-8')); Q = m['Q']
r = rasterio.open(LST_TIF); a = r.read(1).astype('float64'); ok = a != r.nodata
formas = [({'type': 'Polygon', 'coordinates': [(np.array(ring, float) / Q).tolist()]}, c['i']) for c in m['cols'] for ring in c['rings'] if len(ring) >= 4]
ids = rasterize(formas, out_shape=a.shape, transform=r.transform, fill=-1, dtype='int32', all_touched=False)
v = ok & (ids >= 0)
suma = np.bincount(ids[v], weights=a[v], minlength=len(m['colonias'])); n = np.bincount(ids[v], minlength=len(m['colonias']))
tc = {i: round(float(suma[i] / n[i]), 1) for i in range(len(n)) if n[i] >= 3}
ta = {}
for k, cve in enumerate(m['muns']):
    sel = [i for i, c in enumerate(m['colonias']) if c.get('m') == cve and n[i] > 0]
    if sel: ta[cve] = round(float(suma[sel].sum() / n[sel].sum()), 1)
ciudad = round(float(a[v].mean()), 1)
json.dump(dict(col=tc, alc=ta, ciudad=ciudad, pixeles=int(v.sum())), open(TEMPERATURA, 'w', encoding='utf-8'))
print('ciudad', ciudad, '| colonias con dato', len(tc), 'de', sum(1 for c in m['colonias'] if c['n']), '| alcaldías', ta)
for nom in ['Lomas de Chapultepec', 'Narvarte Poniente', 'Santa Cruz Meyehualco', 'Predio Degollado', 'Polanco Chapultepec']:
    print(nom, [tc.get(i) for i, c in enumerate(m['colonias']) if c['n'] == nom])
