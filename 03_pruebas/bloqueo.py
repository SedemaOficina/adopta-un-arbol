"""Mide en qué se congela la página en un celular de gama media (procesador 4 veces más lento, como Lighthouse).
Por escenario: tareas largas (> 50 ms), tiempo bloqueado total (suma de lo que pasa de 50 ms) y las funciones que más tiempo usan.
Se corre aparte (no está en probar.py): los tiempos varían de una corrida a otra; para comparar dos versiones, dos corridas de cada una.
Con --perfil, además, los tramos sin descanso y las funciones de app.js y deck.gl que más tiempo abarcan en cada uno.
Uso: python bloqueo.py [--sitio <carpeta>] [--escenarios inicio,colonia,alcaldia] [--perfil]   (con la tarjeta gráfica: PRUEBAS_GPU=1)
Escenarios: inicio (abrir la página), colonia (abrir directo en Los Reyes, Coyoacán), alcaldia (ya abierta, entrar a Iztapalapa)."""
import sys, collections
from pathlib import Path
from playwright.sync_api import sync_playwright
from pantallas import FLAGS, LISTO, CARGADO, SITIO, servidor

sitio = Path(sys.argv[sys.argv.index('--sitio') + 1]) if '--sitio' in sys.argv else SITIO
ESC = sys.argv[sys.argv.index('--escenarios') + 1].split(',') if '--escenarios' in sys.argv else ['inicio', 'colonia', 'alcaldia']
PERFIL = '--perfil' in sys.argv
OBS = """window.__LT = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__LT.push([Math.round(e.startTime), Math.round(e.duration)]); })
          .observe({type:'longtask', buffered:true}); } catch (e) {}"""
base, srv = servidor(sitio, comprimir=True)

def correr(pg, cdp, nombre):
    if nombre == 'inicio':
        pg.goto(base); pg.wait_for_function(LISTO, timeout=300000, polling=100)
    elif nombre == 'colonia':
        pg.goto(base + '#colonia-158'); pg.wait_for_function(LISTO, timeout=300000, polling=100); pg.wait_for_function(CARGADO, timeout=300000, polling=100)
    elif nombre == 'alcaldia':   # ya abierta la página: elegir una colonia de Iztapalapa (la alcaldía con más árboles)
        pg.goto(base); pg.wait_for_function(LISTO, timeout=300000, polling=100); pg.wait_for_timeout(3000)
        pg.evaluate("window.__LT = []; window.__T0 = performance.now()")
        if PERFIL: cdp.send('Profiler.start')
        pg.evaluate("location.hash = '#alcaldia-007'"); pg.wait_for_timeout(500); pg.wait_for_function(CARGADO, timeout=300000, polling=100)
    pg.wait_for_timeout(4000)
    t0 = pg.evaluate("window.__T0 || 0")
    lt = [x for x in pg.evaluate("window.__LT") if x[0] >= t0]
    return lt

with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS)
    for nombre in ESC:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='es-MX')
        ctx.add_init_script(OBS); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        if PERFIL:
            cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200})
            if nombre != 'alcaldia': cdp.send('Profiler.start')
        lt = correr(pg, cdp, nombre)
        tbt = sum(max(0, d - 50) for _, d in lt)
        print(f'== {nombre}: {len(lt)} tareas largas, bloqueado {tbt} ms, la mayor {max([d for _, d in lt] or [0])} ms')
        print('   ', ' '.join(f'{d}ms@{s / 1000:.1f}s' for s, d in sorted(lt, key=lambda x: -x[1])[:12]))
        if PERFIL:
            prof = cdp.send('Profiler.stop')['profile']; nodes = {n['id']: n for n in prof['nodes']}
            dt = collections.Counter(); tiempos = prof['timeDeltas']
            for sid, d in zip(prof['samples'], tiempos): dt[sid] += d
            por = collections.Counter()
            for nid, us in dt.items():
                cf = nodes[nid]['callFrame']; u = cf['url'].split('/')[-1].split('?')[0]
                por[f"{cf['functionName'] or '(anónima)'} {u}:{cf['lineNumber'] + 1}"] += us
            total = sum(por.values())
            for k, us in por.most_common(14): print(f'    {us / 1000:8.0f} ms  {k}')
            # tramos seguidos sin descanso (> 150 ms) y, en cada uno, las funciones de app.js que más tiempo abarcan (con lo que llaman)
            padre = {}
            for n in prof['nodes']:
                for c in n.get('children', []): padre[c] = n['id']
            def pila(nid):
                out = []
                while nid in nodes:
                    cf = nodes[nid]['callFrame']; u = cf['url'].split('/')[-1].split('?')[0]
                    out.append(f"{cf['functionName'] or '(anónima)'} {u}:{cf['lineNumber'] + 1}"); nid = padre.get(nid)
                return out
            t = 0; seg = []; cur = None
            for sid, d in zip(prof['samples'], tiempos):
                t += d; idle = nodes[sid]['callFrame']['functionName'] in ('(idle)', '(program)') and not nodes[sid].get('children')
                if idle:
                    if cur and t - cur['fin'] > 8000: seg.append(cur); cur = None
                    continue
                if not cur: cur = {'ini': t, 'fin': t, 'inc': collections.Counter()}
                cur['fin'] = t
                for f in set(pila(sid)):
                    if 'app.js' in f or 'deck.gl' in f: cur['inc'][f] += d
            if cur: seg.append(cur)
            for sg in seg:
                dur = (sg['fin'] - sg['ini']) / 1000
                if dur < 150: continue
                print(f'   tramo de {dur:.0f} ms a {sg["ini"] / 1e6:.1f} s:')
                for k, us in sg['inc'].most_common(9):
                    if 'app.js' in k or us > dur * 300: print(f'       {us / 1000:6.0f} ms  {k}')
        ctx.close()
    b.close()
srv.shutdown()
