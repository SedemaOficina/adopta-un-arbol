"""Punto donde va el nombre de cada colonia y de cada alcaldía en el mapa (v30g).
Es la misma cuenta que hacía la página al abrir (centro() en 02_datos.js: el punto más «adentro» del polígono mayor, lejos de sus
bordes), escrita igual paso por paso para que dé los mismos puntos. Hacerla aquí, una vez, le ahorra al celular unos 2 s al abrir.
Lo usa construir_datos.py: paquete['lbl'] = {'col': {id: [lng, lat]}, 'alc': {cve: [lng, lat]}}."""


def _bbox(paths):
    w, s, e, n = 180, 90, -180, -90
    for p in paths:
        for q in p:
            if q[0] < w: w = q[0]
            if q[0] > e: e = q[0]
            if q[1] < s: s = q[1]
            if q[1] > n: n = q[1]
    return [w, s, e, n]


def _centro_caja(paths):
    b = _bbox(paths)
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]


def _dentro(pt, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if ((yi > pt[1]) != (yj > pt[1])) and pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi: c = not c
        j = i
    return c


def centro(paths, N=24):
    g = paths[0]
    for p in paths:
        if len(p) > len(g): g = p
    if not g or len(g) < 4: return _centro_caja(paths)
    w, s, e, n = _bbox([g]); dx = (e - w) / N; dy = (n - s) / N

    def dist(x, y):
        d = float('inf'); j = len(g) - 1
        for i in range(len(g)):
            x1, y1 = g[j]; x2, y2 = g[i]; vx = x2 - x1; vy = y2 - y1; L = vx * vx + vy * vy
            t = ((x - x1) * vx + (y - y1) * vy) / L if L else 0
            t = max(0, min(1, t)); px = x1 + t * vx - x; py = (y1 + t * vy - y) * 1.05
            d = min(d, px * px + py * py); j = i
        return d

    mejor, md = None, -1
    for a in range(N + 1):
        for b in range(N + 1):
            x = w + a * dx; y = s + b * dy
            if not _dentro([x, y], g): continue
            d = dist(x, y)
            if d > md: md = d; mejor = [x, y]
    if not mejor: return _centro_caja(paths)
    for f in (.5, .25, .12):   # afinar alrededor del mejor punto
        for a in range(-2, 3):
            for b in range(-2, 3):
                x = mejor[0] + a * dx * f; y = mejor[1] + b * dy * f
                if not _dentro([x, y], g): continue
                d = dist(x, y)
                if d > md: md = d; mejor = [x, y]
    return mejor


def calcular(cols, alc, Q, redondeo=6):
    """cols y alc como van en el paquete (anillos en enteros, ×Q). Colonias con varios polígonos: todos juntos, como COL_GEO en la página."""
    anillo = lambda r: [[p[0] / Q, p[1] / Q] for p in r]
    geo = {}
    for c in cols: geo.setdefault(c['i'], []).extend(anillo(r) for r in c['rings'])
    r = lambda pt: [round(pt[0], redondeo), round(pt[1], redondeo)]
    out_col = {str(i): r(centro(paths, 12)) for i, paths in geo.items() if paths}
    out_alc = {}
    for a in alc:
        polys = [anillo(x) for x in a['rings']]
        g = polys[0]
        for p in polys:
            if len(p) > len(g): g = p
        out_alc[a['cve']] = r(centro([g]))
    return {'col': out_col, 'alc': out_alc}
