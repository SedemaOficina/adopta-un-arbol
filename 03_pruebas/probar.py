"""Corre las pruebas de la página (10_sitio/) y al final da un resumen. Cada prueba guarda su salida completa en resultados/<prueba>.txt.
Uso:
  python probar.py                      todas las pruebas (unos 8 minutos en una computadora de oficina)
  python probar.py --rapido             solo tamaños, flujos y seguridad (unos 3 minutos)
  python probar.py --solo calles,pdfs   las que se indiquen
  python probar.py --foto <carpeta>     además, «foto» de las 13 pantallas comparada con una anterior (debe dar 0 diferencias si no se
                                        quiso cambiar nada visible); la nueva queda en resultados/foto_<fecha>/
  python probar.py --datos              además, la auditoría de datos (necesita 00_insumos/)
Primero hay que armar el sitio (python 02_fuente/armar.py). Instalación: instalar.bat (una vez)."""
import re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent; RES = AQUI / 'resultados'; RES.mkdir(exist_ok=True)
PRUEBAS = [   # (nombre, script, qué revisa)
    ('tamanos', 'tamanos.py', 'Computadora de 1440 px y celular de 360, 390 y 430 px'),
    ('flujos', 'flujos.py', 'Cuidar un árbol, «Mis árboles», «Usar mi ubicación», claves anteriores'),
    ('calles', 'calles.py', 'Calles que llegan tarde o no llegan'),
    ('etiquetas', 'etiquetas.py', 'Nombres del mapa: siguen a la vista, no brincan ni se enciman; colonia y calle elegidas'),
    ('interacciones', 'interacciones.py', 'Panel y mapa en distinto orden: buscador, caja de calle, historial, ubicación tardía, toques, Escape, foco'),
    ('pdfs', 'pdfs.py', 'PDF del reconocimiento, común y patrimonial'),
    ('seguridad', 'seguridad.py', 'Código escondido, terceros, cookies, política estricta (CSP)'),
    ('compatibilidad', 'compatibilidad.py', 'Safari de iPhone, sin WebGL, sin almacenamiento, sin internet'),
    ('accesibilidad', 'accesibilidad.py', 'axe en 26 pantallas y uso con teclado'),
    ('produccion', 'produccion.py', 'Versión para el SIA: sin nada de prueba, con su política de seguridad'),
    ('logos', 'logos.py', 'Capturas de los logos (resultados/logos/) para revisarlas a ojo'),
]
RAPIDO = ['tamanos', 'flujos', 'seguridad']
arg = lambda n: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else None
lista = arg('--solo').split(',') if arg('--solo') else RAPIDO if '--rapido' in sys.argv else [n for n, _, _ in PRUEBAS]
desconocidas = [n for n in lista if n not in {p[0] for p in PRUEBAS}]
if desconocidas: sys.exit('No existe la prueba: ' + ', '.join(desconocidas) + '. Hay: ' + ', '.join(p[0] for p in PRUEBAS))
if not (AQUI.parent / '10_sitio' / 'app.js').exists(): sys.exit('Falta armar el sitio: python 02_fuente/armar.py')
if 'accesibilidad' in lista and not (AQUI / 'node_modules' / 'axe-core').exists(): sys.exit('Falta instalar axe: doble clic en instalar.bat')

trabajos = [(n, [s], q) for n, s, q in PRUEBAS if n in lista]
if arg('--foto'):
    nueva = RES / ('foto_' + datetime.now().strftime('%Y-%m-%d_%H%M'))
    trabajos.append(('foto', ['foto.py', '--salida', str(nueva)], 'Captura de estilos y textos de las 13 pantallas'))
    trabajos.append(('comparar foto', ['comparar_foto.py', arg('--foto'), str(nueva)], f'Diferencias con {Path(arg("--foto")).name}'))
if '--datos' in sys.argv: trabajos.append(('datos', ['auditar_datos.py'], 'Auditoría de datos (solo informa)'))

def correr(nombre, cmd):
    """Corre una prueba mostrando su salida y la guarda en resultados/<nombre>.txt. Devuelve (salió bien, resumen, segundos)."""
    t0 = time.time(); lineas = []
    with subprocess.Popen([sys.executable, '-X', 'utf8', *cmd], cwd=AQUI, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          text=True, encoding='utf-8', errors='replace') as pr:
        for l in pr.stdout: print('   ' + l.rstrip(), flush=True); lineas.append(l)
    (RES / f'{nombre.replace(" ", "_")}.txt').write_text(''.join(lineas), encoding='utf-8')
    texto = ''.join(lineas); m = re.search(r'(\d+) de (\d+) revisiones bien', texto)
    if nombre == 'comparar foto': m2 = re.search(r'TOTAL de diferencias: (\d+)', texto); res = f'{m2.group(1)} diferencias' if m2 else ''
    else: res = m.group(0).replace(' revisiones bien', '') if m else ''
    if pr.returncode and not res: res = (lineas[-1].strip() if lineas else 'no corrió')[:60]
    return pr.returncode == 0 and (nombre != 'comparar foto' or res == '0 diferencias'), res, time.time() - t0

inicio = time.time(); tabla = []
for i, (nombre, cmd, que) in enumerate(trabajos, 1):
    print(f'\n[{i}/{len(trabajos)}] {nombre}: {que}', flush=True)
    tabla.append((nombre, *correr(nombre, cmd)))
dur = lambda s: f'{int(s // 60)} min {int(s % 60):02d} s'
print('\nResumen' + ' ' * 40 + datetime.now().strftime('%d/%m/%Y %H:%M'))
for nombre, bien, res, s in tabla: print(f"  {'OK   ' if bien else 'FALLA'}  {nombre:16s} {res:22s} {dur(s):>12s}")
malas = [n for n, b, _, _ in tabla if not b]
print(f"\n{len(tabla) - len(malas)} de {len(tabla)} pruebas bien en {dur(time.time() - inicio)}." +
      (f" Revisar: {', '.join(malas)} (detalle en 03_pruebas/resultados/<prueba>.txt)." if malas else ''))
sys.exit(1 if malas else 0)
