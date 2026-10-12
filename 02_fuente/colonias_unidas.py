"""Colonias partidas del catálogo de SEDEMA (v28i, decisión de Liber del 11 oct 2026).
En el catálogo hay 213 grupos (437 entradas) con el mismo nombre (sin acentos ni mayúsculas), el mismo código postal y la misma alcaldía:
casi siempre la segunda entrada (números 17xx–18xx) son pedazos sueltos de la primera (p. ej. Los Reyes, Coyoacán: la 158 con 1,459
árboles y la 1812 con 12 árboles en 4 pedazos). Al buscar por C.P. salían repetidas y sin distinguirse. En el sitio cuentan como una sola
colonia: la de mayor superficie se queda con su número y recibe los pedazos, los árboles, las calles y los indicadores de las demás. Las
piezas de cada grupo están a menos de 2.5 km entre sí (revisado el 11 oct). Lo usan inventario.py (colonia de cada árbol) y construir_datos.py
(colonias, calles, indicadores y patrimoniales); el sitio recibe el mismo alias para las ligas y los lugares guardados con el número viejo."""
import unicodedata

def _norm(s):
    return ''.join(ch for ch in unicodedata.normalize('NFD', (s or '').strip().lower()) if unicodedata.category(ch) != 'Mn')

def areas(m):
    """Superficie (m²) de cada colonia del catálogo, sumando sus anillos (meta.json: m['cols'], coordenadas en 1/Q de grado)."""
    Q, out = m['Q'], {}
    for c in m['cols']:
        for r in c['rings']:
            p = [(x / Q * 105000, y / Q * 110700) for x, y in r]
            out[c['i']] = out.get(c['i'], 0) + .5 * abs(sum(p[k][0] * p[k - 1][1] - p[k - 1][0] * p[k][1] for k in range(len(p))))
    return out

def alias(m):
    """{número de la colonia que se une: número de la colonia que queda}."""
    a, grupos = areas(m), {}
    for i, c in enumerate(m['colonias']):
        if c['n']: grupos.setdefault((_norm(c['n']), c['cp'].zfill(5), c['m']), []).append(i)
    out = {}
    for v in grupos.values():
        if len(v) < 2: continue
        k = max(v, key=lambda i: (a.get(i, 0), -i))
        out.update({i: k for i in v if i != k})
    return out

def tabla(m):
    """Arreglo índice -> colonia que queda (para numpy): tabla(m)[i] es i si no se une."""
    import numpy as np
    t = np.arange(len(m['colonias']), dtype=np.int32)
    for i, k in alias(m).items(): t[i] = k
    return t
