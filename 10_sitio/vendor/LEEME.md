# Librerías y letras alojadas en el sitio

La página no pide código ni letras a otros sitios (política de seguridad del SIA). Estas son copias exactas de las versiones publicadas; no se editan a mano. Para actualizar una, se baja la nueva versión, se cambia su nombre donde se carga (`02_fuente/index.html` para deck.gl; `LIB` en `02_fuente/js/12_cuidar.js` para jsPDF y el QR) y se anota aquí.

| Archivo | Qué es | Versión | Origen | Licencia | Bytes | Huella SHA-384 |
|---|---|---|---|---|---|---|
| `deck.gl-9.4.0.min.js` | Mapa (deck.gl) | 9.4.0 | https://cdn.jsdelivr.net/npm/deck.gl@9.4.0/dist.min.js | MIT | 2,073,497 | `sha384-NrpHmp6N6IhXZ+gSV+uRLo+Hqprkw4BfdGzmxgWXhjakjkAabyfQxokSmn/aK0VB` |
| `jspdf-4.2.1.umd.min.js` | PDF del reconocimiento (jsPDF); se carga solo al guardar el PDF | 4.2.1 | https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js | MIT | 420,165 | `sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3` |
| `qrcode-generator-1.4.4.js` | Código QR del reconocimiento | 1.4.4 | https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js | MIT | 56,694 | `sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k` |
| `fonts/cabin-latin.woff2` | Letra Cabin (títulos), pesos 500 a 700 | Google Fonts v35 | fonts.gstatic.com | SIL OFL 1.1 (`fonts/OFL-cabin.txt`) | 28,320 | `sha384-KZ9ufLYykmyCqRFT+Qjb7jekTuYJk4sMEuL6F8lG81rxhPqPQ6RbWhL/82yRJoTt` |
| `fonts/cabin-latin-ext.woff2` | Cabin, letras de otros idiomas | Google Fonts v35 | fonts.gstatic.com | SIL OFL 1.1 | 15,992 | `sha384-nkAwWxUSWJ/0oWEUGRY3xgZv+vuYculGHU1I5XK6Bw3wg0cVAqaXUpGNeMaN9xux` |
| `fonts/roboto-latin.woff2` | Letra Roboto (texto), pesos 300 a 700 | Google Fonts v51 | fonts.gstatic.com | SIL OFL 1.1 (`fonts/OFL-roboto.txt`) | 43,136 | `sha384-cRWqYoK1JFpgIWsQLV3fZnrYFvqD8CddruARJEScLgYvbD84hbbiYCHl6sB78gxH` |
| `fonts/roboto-latin-ext.woff2` | Roboto, letras de otros idiomas | Google Fonts v51 | fonts.gstatic.com | SIL OFL 1.1 | 29,392 | `sha384-6AqxcCc+o8tnGzmYTLCOdrslzH9VGFS9S6+3irGI9DzdlwUYUFLcIz64QX4pucmk` |
| `fonts/roboto-italica-latin.woff2` | Roboto itálica 400 | Google Fonts v51 | fonts.gstatic.com | SIL OFL 1.1 | 23,672 | `sha384-DzQqZNcFGB94c2rNwmjeGo3sOlUB/T4kp1AzpjECdBUuHQ0hti2eHb8Xo9fc3TV4` |
| `fonts/roboto-italica-latin-ext.woff2` | Roboto itálica, letras de otros idiomas | Google Fonts v51 | fonts.gstatic.com | SIL OFL 1.1 | 16,068 | `sha384-Xzh2QilpixaNLqIicNITXCvCtlLgrIYQMlJRmsNFPmM0ssjL8+qkuD3d6JNDEEvz` |

`fonts/fuentes.css` declara las letras con los mismos rangos de caracteres que usa Google Fonts: el navegador baja solo los archivos que necesita (en español, los dos `-latin`).

Notas para la revisión de seguridad:
- deck.gl trae escritas direcciones de unpkg.com y gstatic.com para módulos que esta página no usa (lectores de archivos en segundo plano, Draco, H3). Las pruebas con Playwright confirman que la página no las pide.
- Para comprobar un archivo: `openssl dgst -sha384 -binary <archivo> | openssl base64 -A` debe dar la huella de la tabla.
- Lo único externo que sigue usando la página es Street View dentro de la ficha (google.com) y las ligas para compartir (WhatsApp, X, Facebook), que abre la persona.

Historial: jsPDF 2.5.1 se cambió por 4.2.1 el 11 oct 2026 (Lote 5): la 2.5.1 tenía 12 avisos de seguridad conocidos (2 críticos, 8 altos; GitHub Advisory Database), corregidos en 4.2.1. qrcode-generator 1.4.4 no tiene avisos.
