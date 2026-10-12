# Pruebas de Guardianes de árboles

Pruebas automáticas de la página que se publica (`10_sitio/`). Abren la página en un navegador de verdad (Chromium y Safari/WebKit, con Playwright), hacen lo que haría una persona y revisan el resultado. No se publican en el sitio.

## Instalar (una vez)

1. Python 3.12 o posterior.
2. Node.js (solo para la revisión de accesibilidad y Lighthouse): https://nodejs.org
3. Doble clic en `instalar.bat`: instala las librerías de Python, los navegadores de Playwright y axe y Lighthouse en versiones fijas.

## Correr

Primero se arma el sitio (`python 02_fuente/armar.py`). Después, doble clic en `probar.bat`, o en una terminal dentro de esta carpeta:

| Comando | Qué corre | Tiempo aproximado |
|---|---|---|
| `python probar.py` | Todas las pruebas | 8 min |
| `python probar.py --rapido` | Tamaños, flujos y seguridad | 2.5 min |
| `python probar.py --solo calles,pdfs` | Las que se indiquen | |
| `python probar.py --foto <carpeta anterior>` | Además, la «foto» de las 13 pantallas comparada con una anterior | +4 min |
| `python probar.py --datos` | Además, la auditoría de datos (necesita `00_insumos/`) | +1 min |

Al final aparece un resumen con OK o FALLA por prueba. La salida completa de cada una queda en `resultados/<prueba>.txt` y las capturas en `resultados/<prueba>/`. La carpeta `resultados/` no se sube a GitHub.

Con `--gpu` las pruebas usan la tarjeta gráfica real (Direct3D) en lugar de WebGL por software: sirve cuando Windows frena el equipo sin usar (de noche las capturas del mapa pasaban de 30 s y fallaban aun con versiones que antes pasaban; 11 oct 2026).

Antes de publicar un cambio en la página se corre al menos `--rapido`; si el cambio no debía verse, también `--foto` (debe dar 0 diferencias).

## Qué revisa cada prueba

| Prueba | Archivo | Revisa |
|---|---|---|
| Tamaños | `tamanos.py` | Computadora de 1440 px y celular de 360, 390 y 430 px: abre en modo estándar y en español, sin barra horizontal; la liga directa abre la ficha; el reconocimiento se descarga en PDF e imagen; no llama a otros sitios (salvo Google para Street View). Con `--medir`, cuánto tarda el panel con red de celular lenta |
| Flujos | `flujos.py` | Cuidar un árbol (paso 1 y 2), «Mis árboles», «Usar mi ubicación» y que un navegador con las claves anteriores a v27 no pierda sus árboles. En el navegador solo se guardan claves de árboles, nunca el nombre |
| Calles | `calles.py` | Las calles llegan después del panel: si tardan, si no llegan y si llegan normal |
| Etiquetas | `etiquetas.py` | Nombres del mapa en seis zonas y tres acercamientos: nombres de calle en toda la pantalla, que no brinquen al mover la vista, una avenida que conserva su nombre al recorrerla, ninguno encimado, y la colonia y la calle elegidas a la vista. `--sitio <carpeta>` para comparar con otra versión (necesita el gancho `window.__ETQ`) |
| Interacciones | `interacciones.py` | Panel y mapa combinados en distinto orden: colonias unidas (C.P. 04330, liga vieja), buscador (cifra, flechas, «ver más»), caja de calle con una calle de otra alcaldía, la misma colonia otra vez, historial («atrás» y «adelante»), ubicación que llega tarde, botón de ubicación del mapa, árbol fuera del catálogo, toque de cerca fuera de un árbol (simulado con `window.__ETQ.toque`: los clics no llegan con WebGL por software), Escape, foco y anuncio |
| Celular | `celular.py` | Celular en Safari de iPhone 13 y en uno chico de 360 × 640 (v29): información y mapa en dos pantallas completas; al abrir, la información; «Ver el mapa» y el botón de abajo del mapa cambian de pantalla y llevan el foco; lo que no se ve no recibe el foco (`inert`); el botón del mapa dice lo que se verá; nada encimado (encabezado, tarjeta del lugar, botones, simbología, ficha); un árbol de la lista lleva al mapa con su ficha y «atrás» regresa a la lista; manija de la ficha al tocar y al deslizar; sin norte ni escala; dedo «fantasma»; fundidos al acercar. Capturas en `resultados/celular/` |
| Auditoría | `auditoria.py` | Errores que encontró la auditoría de v30 y que no deben volver: «Ciudad» después de mover el mapa a mano, un árbol de otra colonia desde «Mis árboles» (la ficha se cerraba sola), «atrás» con una ventana abierta, el aviso que se puede tocar en el celular, un borrador del reconocimiento por árbol, un dato dañado en el navegador y `armar.py --produccion` que no escribe en `10_sitio/` |
| PDF | `pdfs.py` | El PDF del reconocimiento (común y patrimonial): dos hojas carta, la calle del árbol en el ABC y menos de 1 MB. Con `--comparar <carpeta>` dice si cambió frente a otro |
| Seguridad | `seguridad.py` | Lo que escribe la persona no se ejecuta como código; la liga `#arbol-…` tampoco; sin cookies ni terceros; jsPDF y el QR no se bajan al abrir; funciona con la política de seguridad estricta (CSP) propuesta para el SIA |
| Compatibilidad | `compatibilidad.py` | Safari de iPhone (WebKit), navegador sin WebGL (computadora y celular), almacenamiento bloqueado, sin internet a media visita y persona que regresa |
| Accesibilidad | `accesibilidad.py` | axe (WCAG 2.2 AA) en las 13 pantallas, en computadora y celular, y uso con teclado de las ventanas (el foco no se sale, Esc cierra y el foco regresa) |
| Producción | `produccion.py` | La versión para el SIA, armada aparte: sin nada del modo prueba, con rutas válidas en Linux y probada con compresión y los encabezados de `04_sia/encabezados.conf` (ubicación, foto de la calle, cuidar, PDF, ligas al SIA). Con `--paquete` deja el `.zip` para entregar en `04_sia/paquetes/` |
| Logos | `logos.py` | Capturas de todos los lugares con logo, para revisarlas a ojo, y que todas las imágenes carguen |
| Foto | `foto.py` y `comparar_foto.py` | Estilo calculado, textos y atributos de cada elemento en las 13 pantallas, más el PDF y la imagen del reconocimiento. Sirve para comprobar que una reorganización del código no cambia nada visible |
| Datos | `auditar_datos.py` | Lo que descarga el sitio (`10_sitio/datos/`) contra el límite de la Ciudad (MGN 2025): árboles fuera del límite, sin calle cercana o repetidos. Solo informa |
| Lighthouse | `lighthouse.py` | Rendimiento, accesibilidad, buenas prácticas y buscadores con perfil de celular. Se corre aparte, sobre el sitio en línea: `python lighthouse.py https://sedemaoficina.github.io/adopta-un-arbol/ resultados/lighthouse 3` |
| Congelamientos | `bloqueo.py` | En qué se congela la página en un celular de gama media (procesador 4 veces más lento): tareas de más de 50 ms y tiempo bloqueado al abrir, al abrir en una colonia y al entrar a una alcaldía; con `--perfil`, qué funciones lo causan. Aparte, como Lighthouse: `PRUEBAS_GPU=1 python bloqueo.py` (v30g) |

`pantallas.py` tiene lo común: el servidor local del sitio, los tamaños de pantalla, el recorrido por las 13 pantallas y el conteo de revisiones.

## Notas

- El mapa se dibuja con WebGL por software (SwiftShader): es más lento que en un equipo real y, a veces, el mapa deja de responder a clics después del primero. Si una prueba falla por tiempo, primero se vuelve a correr esa prueba sola (`--solo <prueba>`) antes de buscar un error.
- Las pruebas usan los árboles de ejemplo del modo prueba (Avenida Horacio, Polanco, y dos patrimoniales). Con `armar.py --produccion` no hay personas guardianas simuladas y varias pruebas fallarían: se corren sobre la versión de prueba.
