"""Nombres del mapa (v28g): que sigan a la vista y no se encimen.
Usa un gancho de la página (window.__ETQ, ver etqParaPruebas en 05_mapa.js) que solo existe si la prueba lo define: da los nombres que
se ven (texto, lugar en pantalla, tamaño, giro) y mueve la vista sin clics (con WebGL por software el mapa deja de oír clics).
Revisa, en seis zonas de la ciudad y tres acercamientos:
  1. Cobertura: en las zonas de cuadrícula hay nombres de calle en los cuatro cuartos de la pantalla.
  2. Estabilidad: al mover el mapa 300 px, los nombres que siguen a la vista se quedan en su lugar (no brincan).
  3. Una avenida recta (Doctor José María Vértiz, Avenida Cuauhtémoc o Xola, en Narvarte) conserva su nombre a la vista mientras se recorre.
  4. Ningún nombre se encima con otro.
  5. La colonia elegida conserva su nombre aunque su punto central salga de la vista; el de la calle elegida se ve y va dentro de la vista.
Uso: python etiquetas.py [--sitio <carpeta de un sitio armado>]   (para comparar con otra versión; necesita el mismo gancho)"""
import math, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, SITIO, servidor, revisiones

sitio = Path(sys.argv[sys.argv.index('--sitio') + 1]) if '--sitio' in sys.argv else SITIO
ZONAS = {'Centro': (-99.1335, 19.4326), 'Narvarte': (-99.1555, 19.3955), 'Del Valle': (-99.1680, 19.3830),
         'Iztapalapa': (-99.0560, 19.3570), 'Coyoacán': (-99.1620, 19.3500), 'Lomas': (-99.2140, 19.4220)}
CUADRICULA = ('Centro', 'Narvarte', 'Del Valle', 'Iztapalapa')   # calles en retícula: ahí se exige cobertura
ZOOMS = (15.2, 16.2, 17.2)
base, srv = servidor(sitio)
ok, fin = revisiones()
errs = []

def ver(pg, lon, lat, z):
    pg.evaluate(f'window.__ETQ.ir({lon}, {lat}, {z})'); pg.wait_for_timeout(300)
    pg.wait_for_function('!window.__ETQ.vista.faltan', timeout=20000); pg.wait_for_timeout(150)   # que termine de calcular las calles de la vista
    return pg.evaluate('({v: window.__ETQ.vista, n: window.__ETQ.nombres})')
def mover(pg, v, dx, dy):   # centro de la vista corrido dx, dy píxeles
    return pg.evaluate(f"(() => {{ const v = window.__ETQ.vista; return new deck.WebMercatorViewport({{longitude:v.lon, latitude:v.lat, zoom:v.z, width:v.W, height:v.H}}).unproject([v.W / 2 + {dx}, v.H / 2 + {dy}]); }})()")
def visibles(d, capa=None, m=0):
    v = d['v']; return [n for n in d['n'] if m <= n['x'] <= v['W'] - m and m <= n['y'] <= v['H'] - m and (capa is None or n['capa'] == capa)]
def caja(n):   # caja que ocupa el texto (más chica que la que usa la página: lo que se encime aquí, se encima de verdad)
    ls = n['t'].split('\n'); w = max(map(len, ls)) * n['s'] * .5; h = len(ls) * n['s']; a = math.radians(n['ang'] or 0)
    cw, ch = abs(w * math.cos(a)) + abs(h * math.sin(a)), abs(w * math.sin(a)) + abs(h * math.cos(a))
    return (n['x'] - cw / 2, n['y'] - ch / 2, n['x'] + cw / 2, n['y'] + ch / 2)
def encimadas(d):
    ns = [n for n in visibles(d) if not n['capa'].endswith('-c')]   # «-c»: la cifra bajo el nombre de colonia, pegada a él a propósito
    cs = [caja(n) for n in ns]
    return [(ns[i]['t'], ns[j]['t']) for i in range(len(cs)) for j in range(i + 1, len(cs))
            if cs[i][0] < cs[j][2] - 2 and cs[i][2] > cs[j][0] + 2 and cs[i][1] < cs[j][3] - 2 and cs[i][3] > cs[j][1] + 2]

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS); ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('window.__ETQ = {};'); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(base, timeout=120000); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_timeout(1500)
    tabla, cubiertas, encimas, estables, tiempos = [], [], [], [], []
    for zona, (lon, lat) in ZONAS.items():
        fila = [zona]
        for z in ZOOMS:
            d = ver(pg, lon, lat, z); c = visibles(d, 'lbl-calles'); fila.append(len(c)); tiempos.append(d['v']['ms'])
            encimas += [(zona, z, e) for e in encimadas(d)]
            if zona in CUADRICULA and z >= 16:
                W, H = d['v']['W'], d['v']['H']
                cuartos = {(n['x'] > W / 2, n['y'] > H / 2) for n in c}; cubiertas.append((zona, z, len(cuartos)))
            # estabilidad: correr 300 px a la derecha; lo que sigue a la vista debe quedar en el mismo lugar del mundo (300 px a la izquierda)
            nlon, nlat = mover(pg, d['v'], 300, 0); d2 = ver(pg, nlon, nlat, z); c2 = visibles(d2, 'lbl-calles')
            quedan = [n for n in c if 60 <= n['x'] - 300 <= d['v']['W'] - 60 and 40 <= n['y'] <= d['v']['H'] - 40]
            siguen = [n for n in quedan if any(m['t'] == n['t'] and abs(m['x'] - (n['x'] - 300)) < 4 and abs(m['y'] - n['y']) < 4 for m in c2)]
            if quedan: estables.append((zona, z, len(siguen), len(quedan)))
            encimas += [(zona, z, e) for e in encimadas(d2)]
        tabla.append(fila)
    print('Nombres de calle a la vista (1440 × 900):'); print('   zona        ' + '  '.join(f'z{z:<5}' for z in ZOOMS))
    for f in tabla: print(f'   {f[0]:<11} ' + '  '.join(f'{x:<6}' for x in f[1:]))
    sin = [(z_, zz, k) for z_, zz, k in cubiertas if k < 4]
    ok(not sin, f'cobertura: nombres de calle en los cuatro cuartos de la pantalla en {len(cubiertas) - len(sin)} de {len(cubiertas)} vistas de cuadrícula' + (f' (faltan: {sin})' if sin else ''))
    tot_s, tot_q = sum(s for *_, s, q in estables), sum(q for *_, s, q in estables)
    ok(tot_q and tot_s / tot_q >= .9, f'estabilidad: al mover 300 px se quedan en su lugar {tot_s} de {tot_q} nombres de calle que siguen a la vista')
    ok(not encimas, f'ningún nombre se encima con otro' + (f': {encimas[:4]}' if encimas else ''))
    ok(max(tiempos) < 1500, f'tiempo de armar las capas: máximo {max(tiempos):.0f} ms, mediana {sorted(tiempos)[len(tiempos) // 2]:.0f} ms (incluye calcular las calles de cada colonia la primera vez)')

    # 3. Una avenida larga y recta conserva su nombre a la vista al recorrerla (los nombres de INEGI no traen «Avenida» ni «Eje»)
    d = ver(pg, *ZONAS['Narvarte'], 16.6); W, H = d['v']['W'], d['v']['H']
    RECTAS = ('Doctor José María Vértiz', '1 Poniente (Avenida Cuauhtémoc)', '4 Sur (Xola)')
    avs = sorted([n for n in visibles(d, 'lbl-calles', 80) if n['t'] in RECTAS], key=lambda n: RECTAS.index(n['t']))
    if avs:
        av = avs[0]; a = math.radians(av['ang']); paso = .45 * (W if abs(av['ang']) < 45 else H)
        # primero se centra la avenida; luego se recorre en cinco pasos
        lon0, lat0 = mover(pg, d['v'], av['x'] - W / 2, av['y'] - H / 2); d = ver(pg, lon0, lat0, 16.6); presentes = []
        for _ in range(5):
            lon0, lat0 = mover(pg, d['v'], math.cos(a) * paso, -math.sin(a) * paso); d = ver(pg, lon0, lat0, 16.6)
            presentes.append(any(n['t'] == av['t'] for n in visibles(d, 'lbl-calles')))
        ok(all(presentes), f'«{av["t"]}» conserva su nombre a la vista en los {sum(presentes)} de 5 pasos de {paso:.0f} px a lo largo de ella')
    else: ok(False, 'no se ve el nombre de ninguna de ' + ', '.join(RECTAS) + ' en Narvarte a z16.6')

    # 5. Colonia elegida (Bosque de Chapultepec I): se corre la vista hasta que su punto queda 100 px fuera, del lado contrario al centro
    #    de la colonia (así la colonia sigue en pantalla); su nombre debe seguir a la vista. Y calle elegida (Real de los Reyes, con árboles).
    pg.goto(base + '#colonia-1656', timeout=120000); pg.reload(timeout=120000); pg.wait_for_function(LISTO, timeout=120000); pg.wait_for_function(CARGADO, timeout=120000); pg.wait_for_timeout(1500)
    nombre = pg.inner_text('#mapsum').split('\n')[0].strip()
    d = ver(pg, pg.evaluate('window.__ETQ.vista.lon'), pg.evaluate('window.__ETQ.vista.lat'), 15.3); W = d['v']['W']
    col = [n for n in visibles(d) if n['t'].split('\n')[0] == nombre]
    if col:
        c0 = col[0]; dx = -(W + 100 - c0['x']) if c0['x'] > W / 2 else c0['x'] + 100
        lon1, lat1 = mover(pg, d['v'], dx, 0); d2 = ver(pg, lon1, lat1, 15.3); otra = [n for n in visibles(d2) if n['t'].split('\n')[0] == nombre]
        ok(bool(otra), f'«{nombre}» conserva su nombre con su punto 100 px fuera de la vista' + (f' (ahora en x = {otra[0]["x"]:.0f})' if otra else ''))
        encimas += [('colonia elegida', e) for e in encimadas(d2)]
    else: ok(False, f'no se ve el nombre de «{nombre}» al abrirla')
    pg.fill('#omni', 'Real de los Reyes'); pg.wait_for_timeout(1200)
    opc = pg.locator('#omni-list li[role=option]', has_text='en Los Reyes')
    if opc.count():
        opc.first.dispatch_event('mousedown'); pg.wait_for_timeout(4500)
        d = pg.evaluate('({v: window.__ETQ.vista, n: window.__ETQ.nombres})'); vistos, dentro, n0 = 0, 0, len(encimas)
        for dx, dy in ((0, 0), (220, 0), (0, 180), (-220, 0), (0, -180)):
            lon2, lat2 = mover(pg, d['v'], dx, dy); d = ver(pg, lon2, lat2, d['v']['z'])
            sel = [n for n in d['n'] if n['capa'] == 'lbl-calle-sel']
            if sel: vistos += 1; dentro += 0 <= sel[0]['x'] <= d['v']['W'] and 0 <= sel[0]['y'] <= d['v']['H']
            encimas += [('calle elegida', e) for e in encimadas(d)]
        ok(vistos >= 4 and dentro == vistos, f'el nombre de la calle elegida se ve en {vistos} de 5 vistas al moverla, siempre dentro de la vista ({dentro} de {vistos})')
        ok(len(encimas) == n0, 'con calle elegida, ningún nombre se encima' + (f': {encimas[n0:n0 + 3]}' if len(encimas) > n0 else ''))
    else: ok(False, 'el buscador no encontró «Real de los Reyes» en Los Reyes')
    b.close()
srv.shutdown()
ok(not errs, 'sin errores de página' + (': ' + '; '.join(errs[:2]) if errs else ''))
fin()
