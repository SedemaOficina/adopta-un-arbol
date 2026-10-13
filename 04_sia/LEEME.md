# Guardianes de árboles en el SIA (Lote 7)

Propuesta para montar el sitio en `https://sedema.sia.cdmx.gob.mx/adopta-un-arbol/`. Falta que el equipo del SIA la revise. Las preguntas pendientes y esta misma propuesta están en el documento «Guardianes de árboles · Montaje en el SIA: preguntas y propuesta técnica».

**Todavía no se publica en producción:** primero debe estar listo el servicio de conteo de personas guardianas del SIA (pendiente 7, decisión de Liber del 11 oct 2026). Hasta entonces, el sitio de pruebas sigue en GitHub Pages.

## Archivos

| Archivo | Qué es |
|---|---|
| `encabezados.conf` | Encabezados de seguridad: política de seguridad (CSP), `nosniff`, `Referrer-Policy` y `Permissions-Policy`. Un solo lugar: lo usan las dos configuraciones y la prueba |
| `nginx-adopta-un-arbol.conf` | Configuración propuesta para nginx: barra final, compresión, caché y encabezados |
| `express-adopta-un-arbol.js` | La misma configuración para Express, como Árboles Patrimoniales |
| `paquetes/` | Paquetes `.zip` de cada versión con su huella SHA-256 (no se suben a GitHub) |

## Caché (desde v31d)

Cada archivo se pide con la huella de su contenido (`app.js?v=437db69c54`), que pone `armar.py`. Por eso el servidor puede guardarlo un año: si el archivo cambia, cambia su huella y con ella la dirección. Al publicar una versión nueva, quien ya visitó el sitio descarga otra vez solo los archivos que cambiaron (casi siempre `app.js`, `app.css` y `textos.js`, unos 300 KB) y no los 20 MB de datos. `index.html` no se guarda (`no-cache`): el navegador pregunta cada vez y recibe 304 si no cambió. Las letras (`vendor/fonts/*.woff2`) las pide `fuentes.css` sin huella: 30 días.

## Armar y revisar la versión de producción

```
cd 03_pruebas
python produccion.py --paquete
```

Arma la versión de producción en una carpeta aparte (`10_sitio/` no se toca: el repositorio guarda siempre la de prueba), revisa que no lleve nada del modo prueba ni rutas que fallen en Linux, y la prueba en Chromium con compresión y con los encabezados de `encabezados.conf`. Si todo sale bien, deja en `04_sia/paquetes/` el archivo `adopta-un-arbol-v<versión>.zip` y su `.sha256`. Nunca reemplaza un paquete anterior.

## Subir una versión (propuesta)

Cada versión vive en su propia carpeta y un enlace apunta a la vigente. Publicar y regresar es cambiar el enlace: no se borra ni se sobrescribe nada, y el cambio es instantáneo.

```
/srv/sia/adopta-un-arbol-v28b/     versión anterior
/srv/sia/adopta-un-arbol-v29/      versión nueva
/srv/sia/adopta-un-arbol  ->  adopta-un-arbol-v29     (enlace que sirve nginx o Express)
```

1. Comprobar la huella: `sha256sum -c adopta-un-arbol-v29.sha256` debe decir «OK».
2. Descomprimir en `/srv/sia/`: `unzip adopta-un-arbol-v29.zip -d /srv/sia/` (crea `adopta-un-arbol-v29/`).
3. Cambiar el enlace: `ln -sfn adopta-un-arbol-v29 /srv/sia/adopta-un-arbol`.
4. Revisar en el navegador (lista de abajo).

**Regresar a la versión anterior:** `ln -sfn adopta-un-arbol-v28b /srv/sia/adopta-un-arbol`. Las carpetas viejas se pueden quitar cuando ya no hagan falta; se recomienda conservar las dos últimas.

Si el SIA prefiere `git pull`, como en Árboles Patrimoniales, se puede preparar una rama `sia` que lleve solo la versión de producción, con una etiqueta por versión para regresar. Se hace cuando el SIA responda la pregunta 2 del documento.

## Revisar después de montar

| Comprobar | Qué debe pasar |
|---|---|
| `…/adopta-un-arbol` sin barra | Redirige a `…/adopta-un-arbol/` y carga con estilos |
| Al abrir | Aparece el panel y el mapa con las alcaldías; sin el aviso «Versión de prueba» |
| «Usar mi ubicación» | Pide permiso y lleva a un árbol cercano (requiere HTTPS) |
| Ficha de un árbol | Se ve la foto de la calle (Street View) |
| Cuidar un árbol, «Descargar» y «PDF» | Llega al reconocimiento y descarga el PDF |
| Pestaña Red del navegador | `index.html`, `app.js` y `datos/*.txt` llegan con `Content-Encoding: gzip` (o `br`) y con `Content-Security-Policy`; los archivos se piden con `?v=` y su huella, y llegan con `Cache-Control: public, max-age=31536000, immutable` |
| Consola del navegador | Sin errores ni avisos de la política de seguridad |
| Compartir la liga por WhatsApp | Sale la tarjeta con el mapa |

## Lo que no hay que hacer

- No editar archivos dentro de la carpeta de una versión: cada versión se arma con `armar.py` y se prueba antes de entregarla.
- No servir la carpeta del repositorio ni `10_sitio/`: esa es la versión de prueba (personas guardianas simuladas).
- No agregar una política de seguridad distinta sin probarla con `produccion.py`: una CSP más estricta deja la página en blanco o sin la foto de la calle.
