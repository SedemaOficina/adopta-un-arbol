// Guardianes de árboles en Express, como Árboles Patrimoniales (alternativa a nginx; propuesta, Lote 7).
// Sirve /srv/sia/adopta-un-arbol (enlace a la carpeta de la versión vigente) en /adopta-un-arbol/, con compresión,
// caché y los mismos encabezados de seguridad que nginx (los lee de encabezados.conf, que va junto a este archivo).
// Uso dentro de la aplicación Express existente:   require('./express-adopta-un-arbol')(app);
// Requiere: npm i compression
const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');

const CARPETA = process.env.GUARDIANES_DIR || '/srv/sia/adopta-un-arbol';
// add_header "Nombre" "valor" always;  ->  {Nombre: valor}
const ENCABEZADOS = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, 'encabezados.conf'), 'utf8').split('\n')
    .map(l => l.match(/^add_header\s+(\S+)\s+"(.*)"\s+always;/)).filter(Boolean).map(m => [m[1], m[2]]));

module.exports = function montar(app){
  const r = express.Router();
  r.use(compression());   // al abrir se descargan 3 MB en lugar de 5.5 MB
  r.use((req, res, next) => { res.set(ENCABEZADOS); next(); });
  r.use(express.static(CARPETA, {
    redirect: true,   // 301 de /adopta-un-arbol a /adopta-un-arbol/: las rutas del sitio son relativas
    etag: true,
    setHeaders(res, ruta){
      const rel = path.relative(CARPETA, ruta).split(path.sep).join('/');
      // Llevan ?v=<huella de su contenido> (desde v31d): un año; si cambian, cambia su dirección
      if (/^(app\.js|app\.css|textos\.js|datos\/[a-z0-9_]+\.(txt|json)|img\/[a-z0-9_.-]+|vendor\/[a-z0-9_.-]+\.js|vendor\/fonts\/fuentes\.css)$/.test(rel)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else if (/^vendor\//.test(rel)) res.set('Cache-Control', 'public, max-age=2592000');   // letras (fuentes.css las pide sin huella): 30 días
      else res.set('Cache-Control', 'no-cache');   // index.html: se revisa cada vez (304 si no cambió)
    },
  }));
  app.use('/adopta-un-arbol', r);
};
