/* ================= estado ================= */
let selAlc = null, selCol = null, selArb = null, tab = "arboles", filtroCalle = "", filtroG = "todos", verTodos = false, calleAbierta = null, cuadraAbierta = null, verCalles = false, nCalle = 40, verCols = false, fichaExtra = null;

/* ================= mapa ================= */
const {DeckGL, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer, IconLayer, WebMercatorViewport, FlyToInterpolator, PathStyleExtension} = deck;
const PUNTEADO = new PathStyleExtension({dash:true});   /* v31g: límite punteado de las áreas protegidas */
/* Etiquetas que no se enciman: se colocan de mayor a menor prioridad y se omite la que choca con una ya puesta.
   Se calcula en píxeles al zoom actual (no depende de hacia dónde se mueva el mapa). Sustituye al filtro de colisión de deck.gl, que no se comportó igual en todos los navegadores. */
const VP_ETQ = new Map();
function sinEncimar(items, texto, tamano, z, prioridad, ocupadas = []){
  // La clave lleva cada nombre con su lugar (los de la orilla se recolocan al mover el mapa) y lo ya ocupado. Antes bastaban el número
  // de nombres y el primero: dos vistas distintas podían confundirse y salir nombres en un lugar que ya no era.
  const zz = Math.round(z * 5) / 5, clave = zz + "|" + tamano + "|" + items.map(d => texto(d) + "@" + Math.round(d.pos[0] * 2e4) + "," + Math.round(d.pos[1] * 2e4)).join(";")
    + "|" + ocupadas.map(c => c.map(Math.round).join(",")).join(";");
  if (VP_ETQ.has(clave)) return VP_ETQ.get(clave);
  const vp = vpMundo(zz), cajas = ocupadas.slice(), out = [];
  for (const d of [...items].sort((a, b) => prioridad(b) - prioridad(a))){
    const [x, y] = vp.project(d.pos), ls = texto(d).split("\n"), w = Math.max(...ls.map(l => l.length)) * tamano * .58 + 10, h = ls.length * tamano * 1.15 + 6;
    const c = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) continue;
    cajas.push(c); out.push(d);
  }
  if (VP_ETQ.size > 60) VP_ETQ.clear();
  VP_ETQ.set(clave, out); return out;
}
/* Las etiquetas se acomodan en «píxeles del mundo» a un zoom fijo (en pasos de 0.2): no dependen de dónde está la vista, así que no brincan al mover el mapa. */
const VP_MUNDO = new Map();
function vpMundo(zz){ let v = VP_MUNDO.get(zz); if (!v){ v = new WebMercatorViewport({longitude:-99.13, latitude:19.4, zoom:zz, width:2, height:2}); VP_MUNDO.set(zz, v); } return v; }
/* Caja (en píxeles del mundo) de una etiqueta horizontal: para que las demás la esquiven. */
function cajaEnMundo(pos, ls, tam, zz, dy = 0, mx = 10, my = 6){
  const [x, y] = vpMundo(zz).project(pos), w = Math.max(...ls.map(l => l.length)) * tam * .58 + mx, h = ls.length * tam * 1.2 + my;
  return [x - w / 2, y + dy - h / 2, x + w / 2, y + dy + h / 2];
}
const K = {patLuz:hex(css("--pat-luz")), guinda:hex(css("--guinda")), dorado:hex(css("--dorado")), pat:hex(css("--pat")), hoja:hex(css("--hoja")), arbol:hex(css("--arbol")), gris:hex(css("--ink-2")), blanco:[255,255,255,255],
  calle:hex(css("--map-calle")), col:hex(css("--map-col")), alc:hex(css("--map-alc")), foco:hex(css("--focus")), loc:hex(css("--loc")),
  /* v30 (auditoría): los colores que estaban escritos a mano en las capas, como tokens (mismos valores) */
  tinta:hex(css("--mapa-tinta")), haloOsc:hex(css("--mapa-halo-oscuro")), limCol:hex(css("--mapa-limite-colonia")), limAlc:hex(css("--mapa-limite-alcaldia")), haloGris:hex(css("--mapa-halo-gris")),
  calleNom:hex(css("--mapa-calle-nombre")), calleAten:hex(css("--mapa-calle-atenuada")), haloCalle:hex(css("--mapa-halo-calle")), ink:hex(css("--ink")), ambar:hex(css("--tinta-ambar"))};
const cA = (c, a) => [c[0], c[1], c[2], a];   /* el mismo color con otra opacidad */
const CITY = [-99.365, 19.048, -98.940, 19.593];
const mapEl = $("map");
function encuadre(b, pad){
  const w = mapEl.clientWidth || 800, h = mapEl.clientHeight || 600;
  // El margen nunca puede comerse el mapa (en teléfono el mapa es bajo): si no cabe, se reduce.
  const lim = v => Math.max(0, Math.min(v, 0.4 * Math.min(w, h)));
  const padding = typeof pad === "object" ? {top:lim(pad.top), bottom:lim(pad.bottom), left:lim(pad.left), right:lim(pad.right)} : lim(pad ?? Math.min(60, w / 8));
  const vp = new WebMercatorViewport({width:w, height:h}).fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding});
  return {longitude:vp.longitude, latitude:vp.latitude, zoom:Math.min(vp.zoom, 17.5), pitch:0, bearing:0};
}
let vista = encuadre(CITY, padCiudad());
let MINZ = 9;
/* La calle abierta en la lista (o buscada) se resalta en el mapa para que la persona se ubique. */
let CALLE_CACHE = {k:null, data:[]}, ultimaCalleMapa = null;
/* v24b: se resaltan los tramos donde están los árboles de esa calle (o de la cuadra abierta), no todo lo que se llama igual.
   INEGI nombra igual a la calle, la privada y la cerrada («Cruz Verde»); y el nombre del árbol viene del frente de manzana,
   que no siempre coincide con el nombre del eje. Cada árbol marca el tramo más cercano (de preferencia con su mismo nombre). */
function trazoCalle(){
  if (selCol === null || !calleAbierta || esGrupoSinCalle(calleAbierta)) return [];   /* v30: «sin nombre registrado» y patrimoniales no son una calle */
  const k = selCol + "|" + calleAbierta + "|" + (cuadraAbierta || ""); if (CALLE_CACHE.k === k) return CALLE_CACHE.data;
  let arbs = arbolesDe(selCol).filter(a => calleTexto(a) === calleAbierta);
  if (cuadraAbierta && cuadraAbierta.startsWith(calleAbierta + "|")){ const cs = cuadrasDe(calleAbierta, arbs), c = cs && cs.find(x => calleAbierta + "|" + x.clave === cuadraAbierta); if (c) arbs = c.arbs; }
  const data = [];
  if (arbs.length){
    indicesCuadras();
    const KX = 105000, KY = 110700, mg = .0005, idxs = nombresEje(calleAbierta) || new Set();
    const xs = arbs.map(a => a.lng), ys = arbs.map(a => a.lat), caja = [Math.min(...xs) - mg, Math.min(...ys) - mg, Math.max(...xs) + mg, Math.max(...ys) + mg];
    const cand = [];
    for (let e = 0; e < NF; e++){ const v0 = FS[e], v1 = FS[e + 1] - 1; if (v1 <= v0) continue;
      const x0 = FPOS[2 * v0], y0 = FPOS[2 * v0 + 1], x1 = FPOS[2 * v1], y1 = FPOS[2 * v1 + 1];
      if (Math.max(x0, x1) < caja[0] || Math.min(x0, x1) > caja[2] || Math.max(y0, y1) < caja[1] || Math.min(y0, y1) > caja[3]) continue;
      cand.push(e); }
    const dTramo = (px, py, e) => { let best = Infinity;
      for (let v = FS[e]; v < FS[e + 1] - 1; v++){
        const ax = FPOS[2 * v] * KX, ay = FPOS[2 * v + 1] * KY, dx = FPOS[2 * v + 2] * KX - ax, dy = FPOS[2 * v + 3] * KY - ay, L = dx * dx + dy * dy;
        const s = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0, d = Math.hypot(px - ax - s * dx, py - ay - s * dy);
        if (d < best) best = d; }
      return best; };
    const usados = new Set();
    for (const a of arbs){ const px = a.lng * KX, py = a.lat * KY; let mismo = -1, dm = Infinity, otro = -1, dot = Infinity;
      for (const e of cand){ const d = dTramo(px, py, e); if (idxs.has(FN[e])){ if (d < dm){ dm = d; mismo = e; } } else if (d < dot){ dot = d; otro = e; } }
      const e = mismo >= 0 && dm <= 40 ? mismo : otro >= 0 && dot <= 40 ? otro : -1; if (e >= 0) usados.add(e); }
    for (const e of usados){ const path = []; for (let v = FS[e]; v < FS[e + 1]; v++) path.push([FPOS[2 * v], FPOS[2 * v + 1]]); if (path.length > 1) data.push({path}); }
  }
  CALLE_CACHE = {k, data}; return data;
}
function fijarMinZoom(){
  const z = encuadre(CITY, padCiudad()).zoom; if (!isFinite(z)) return;
  MINZ = Math.max(esTel() ? 7 : 8, z - .05);   /* v28k: en un iPhone con las barras de Safari el mapa mide ~200 px y la ciudad no cabía en 8 */
  dk.setProps({controller:{...CTRL, minZoom:MINZ}});
}
addEventListener("resize", () => requestAnimationFrame(fijarMinZoom));
/* v30 (auditoría): deck.gl ignora un initialViewState igual al anterior (lo compara a fondo): volver a mandar el mismo lugar (el botón
   «Ciudad» después de mover el mapa a mano, la misma colonia otra vez) no hacía nada y `vista` quedaba desfasada de lo que se veía. Todo
   cambio de vista pasa por irA, que le pone un número distinto a cada envío. */
let VUELOS = 0;
function irA(v){ vista = {...v, _n:++VUELOS}; dk.setProps({initialViewState:vista}); }
function volar(b, pad, zmin){
  if (!b) return;
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches, e = encuadre(b, pad);
  if (zmin && e.zoom < zmin) e.zoom = zmin;
  irA({...e, transitionDuration:reducido ? 0 : 800, transitionInterpolator:reducido ? undefined : new FlyToInterpolator()});
}
/* Calles en bloques por alcaldía (vienen ordenadas así): solo se dibujan las que están a la vista. */
/* Calles del mapa: ejes de vialidad INEGI (Marco Geoestadístico 2025), una línea por calle. Por alcaldía y clase (0 peatonal, 1 calle, 2 avenida, 3 vía rápida). */
const CALLES = [];   // se llena al llegar las calles (armarCapasCalles)
let FK = new Uint8Array(0);   // clase de cada eje (0 peatonal, 1 calle, 2 avenida, 3 vía rápida): solo avenidas y vías rápidas se dibujan con dos ejes
function armarCapasCalles(){ let a = 0; FK = new Uint8Array(NF);
  for (const [cve, ns] of P.callesMun){ const bb = bbox(ALC.find(x => x.cve === cve).polys);
    ns.forEach((n, k) => { if (!n){ return; } const b = a + n, o = FS[a]; FK.fill(k, a, b);
      CALLES.push({cve, k, bb, data:{length:n, startIndices:FS.slice(a, b + 1).map(x => x - o), attributes:{getPath:{value:FPOS.subarray(2 * o, 2 * FS[b]), size:2}}}}); a = b; }); }
  CALLES.sort((x, y) => x.k - y.k);   // las avenidas se dibujan encima de las calles
}
const CALLE_ESTILO = [
  {desde:15, ancho:3, min:.5, alfa:z => 200},                             // andadores y peatonales
  {desde:13, ancho:9, min:.5, alfa:z => z < 13.6 ? 85 : z < 14 ? 130 : z < 15 ? 200 : 255}, // calles, cerradas, privadas (tenues a escala de alcaldía, para que se lean las colonias)
  {desde:11.5, ancho:16, min:.8, alfa:z => z < 13.6 ? 120 : 255},           // avenidas, ejes viales, calzadas
  {desde:11.5, ancho:26, min:1.4, alfa:z => z < 13 ? 190 : 255}];           // Periférico, Viaducto, autopistas
// Capas de calles persistentes (visible según zoom y vista), para no recalcular al acercarse o alejarse.
function callesCapas(z){ const vis = new Set(aLaVista());
  return CALLES.map(c => { const e = CALLE_ESTILO[c.k], a = Math.round(e.alfa(z));
    return new PathLayer({id:"calles-" + c.cve + "-" + c.k, data:c.data, visible:z >= e.desde && vis.has(c), _pathType:"open", getColor:[255, 255, 255, a], getWidth:e.ancho, widthUnits:"meters", widthMinPixels:e.min,
      capRounded:true, jointRounded:true, updateTriggers:{getColor:a}}); }); }
function aLaVista(){ const w = mapEl.clientWidth || 800, h = mapEl.clientHeight || 600; const b = new WebMercatorViewport({...vista, width:w, height:h}).getBounds(); return CALLES.filter(c => c.bb[0] < b[2] && c.bb[2] > b[0] && c.bb[1] < b[3] && c.bb[3] > b[1]); }
const ALC_PATHS = ALC.flatMap(a => a.polys.map(p => ({path:p})));
const Z_COL = 11.5, Z_ARB = 14.5, Z_ICO = 16, Z_TOQUE = 17.5;   // Z_TOQUE: desde aquí se puede elegir un árbol tocándolo (árboles de banqueta a 12-20 px uno de otro)   // zoom desde el que se ven todas las colonias, todos los árboles a la vista (puntos) y los arbolitos
/* Niveles de zoom en que cambia lo que se dibuja (fundido alcaldías-colonias, colonias, árboles de la colonia, fundido colonias-manzanas,
   árboles, nombres de calle, límite de áreas protegidas, arbolitos, toque). */
const NIVELES = [11.2, Z_COL, 11.8, 12.5, 13.5, 14, Z_ARB, 14.8, 15.5, Z_ICO, Z_TOQUE], nivelZ = z => NIVELES.filter(n => z >= n).length;
/* Simbología B: de cerca, cada árbol es un arbolito verde (morado y más grande si es patrimonial);
   los que ya tienen guardián llevan una insignia guinda con cuántas personas lo cuidan. Se dibuja una sola vez en un lienzo (atlas). */
const ARBOLITO = {arb:{copa:css("--arbol"), tronco:css("--arbol-tronco"), borde:css("--hoja")}, pat:{copa:css("--pat"), tronco:css("--pat-tronco"), borde:"#FFFFFF"}};   // borde hoja (v28i, contraste)
function trazarArbolito(c, x, y, k, col){
  c.save(); c.translate(x, y); c.scale(k, k); c.lineWidth = 1.6; c.strokeStyle = col.borde; c.fillStyle = col.copa;
  for (const [cx, cy, r] of [[12, 9.5, 8], [6.5, 13, 5], [17.5, 13, 5]]){ c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.stroke(); }
  for (const [cx, cy, r] of [[12, 9.5, 8], [6.5, 13, 5], [17.5, 13, 5], [12, 12, 6.5]]){ c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(9.8, 15.6, 4.4, 11.2, 1.8); c.fill();
  c.fillStyle = col.tronco; c.beginPath(); c.roundRect(10.6, 16, 2.8, 10, 1.2); c.fill(); c.restore();
}
/* El atlas se dibuja la primera vez que el mapa se acerca a escala de árboles, no al abrir: preparar el primer lienzo de dibujo
   cuesta, y así el panel aparece antes (Lote 5). */
const ATLAS = {img:null, map:null, tex:null};
function crearAtlas(){ const S = 4, W = 26 * S, H = 30 * S, cv = document.createElement("canvas"); cv.width = W * 2; cv.height = H;
  const c = cv.getContext("2d"); trazarArbolito(c, S, S, S, ARBOLITO.arb); trazarArbolito(c, W + S, S, S, ARBOLITO.pat);
  ATLAS.img = cv; ATLAS.map = {arb:{x:0, y:0, width:W, height:H, mask:false}, pat:{x:W, y:0, width:W, height:H, mask:false}}; }
function arbolitoSVG(pat, n){
  const col = pat ? ARBOLITO.pat : ARBOLITO.arb, s = el("span", {class:"mk-ico" + (pat ? " pat" : ""), "aria-hidden":"true"});
  s.innerHTML = '<svg viewBox="0 0 24 28" overflow="visible"><g fill="' + col.copa + '" stroke="' + col.borde + '" stroke-width="1.6"><circle cx="12" cy="9.5" r="8"/><circle cx="6.5" cy="13" r="5"/><circle cx="17.5" cy="13" r="5"/></g><circle cx="12" cy="12" r="6.5" fill="' + col.copa + '"/><rect x="10.6" y="16" width="2.8" height="10" rx="1.2" fill="' + col.tronco + '"/></svg>';
  if (n) s.append(el("b", {texto:String(n)}));
  return s;
}
const ALC_POLY = ALC.flatMap(a => a.polys.map(p => ({p, cve:a.cve})));
const COL_POLY = COLS.flatMap(c => c.paths.map(p => ({p, i:c.i})));
const ALC_BB = new Map(ALC.map(a => [a.cve, bbox(a.polys)]));
function limitesVista(){ const w = mapEl.clientWidth || 800, h = mapEl.clientHeight || 600; return new WebMercatorViewport({...vista, width:w, height:h}).getBounds().flat(); }
const COL_PATHS = COLS.flatMap(c => c.paths.map(p => ({path:p, i:c.i})));
const tam = paths => { const b = bbox(paths); return {w:(b[2] - b[0]) * 105000, h:(b[3] - b[1]) * 110700}; };
/* Recorta un anillo al rectángulo de la vista (Sutherland-Hodgman). */
function recortar(ring, [x0, y0, x1, y1]){
  let out = ring;
  for (const [dentroDe, corte] of [
    [p => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [p => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [p => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]]){
    const ent = out; out = []; if (!ent.length) break;
    for (let i = 0; i < ent.length; i++){ const a = ent[(i + ent.length - 1) % ent.length], b = ent[i];
      if (dentroDe(b)){ if (!dentroDe(a)) out.push(corte(a, b)); out.push(b); } else if (dentroDe(a)) out.push(corte(a, b)); }
  }
  return out;
}
/* Dónde va el nombre de una pieza: en su lugar si cabe completa en la vista; si el borde del mapa la corta, al centro de lo que se ve; si se ve muy poco, sin nombre. */
function posVisible(ring, pos, vb, z){
  if (!ring) return pos;
  const b = bbox([ring]), mx = (vb[2] - vb[0]) * .04, my = (vb[3] - vb[1]) * .06;
  // En celular la tarjeta «Ciudad de México» cubre casi todo el ancho de la orilla de arriba: el nombre no debe quedar debajo.
  const ms = $("mapsum"), mr = mapEl.getBoundingClientRect(), sr = ms && !ms.hidden ? ms.getBoundingClientRect() : null;
  const tapa = sr && sr.width > mr.width * .5 ? Math.max(0, sr.bottom - mr.top + 6) * (vb[3] - vb[1]) / (mr.height || 600) : 0;
  const v = [vb[0] + mx, vb[1] + my, vb[2] - mx, vb[3] - Math.max(my, tapa)];
  const posDentro = pos[0] > v[0] && pos[0] < v[2] && pos[1] > v[1] && pos[1] < v[3];
  if (b[0] >= v[0] && b[2] <= v[2] && b[1] >= v[1] && b[3] <= v[3]) return pos;   // completa a la vista
  const r = recortar(ring, v); if (r.length < 3) return null;
  const area = g => { let a = 0; for (let i = 0, j = g.length - 1; i < g.length; j = i++) a += (g[j][0] + g[i][0]) * (g[j][1] - g[i][1]); return Math.abs(a / 2); };
  const casiToda = area(r) > .8 * area(ring);
  if (casiToda && posDentro) return pos;   // apenas la roza la orilla: se queda en su lugar
  const rb = bbox([r]), ppg = (mapEl.clientWidth || 800) / (vb[2] - vb[0]);   // píxeles por grado de longitud en esta vista
  if (!casiToda && ((rb[2] - rb[0]) * ppg < 110 || (rb[3] - rb[1]) * ppg * 1.06 < 50)) return null;   // se ve muy poco: sin nombre (antes quedaba cortado en la orilla)
  return centro([[...r, r[0]]], 16) || null;
}
const ALC_ANILLO = new Map(ALC.map(a => [a.cve, a.polys.reduce((m, p) => p.length > m.length ? p : m, a.polys[0])]));
/* v30g: el punto del nombre viene calculado en los datos (puntos_nombre.py, la misma cuenta); antes se calculaba aquí para las 2,019
   colonias al abrir (unos 2 s en un celular de gama media). Si los datos no lo traen, se calcula como antes. */
const LBL = P.lbl || {col:{}, alc:{}};
const ALC_LBL = ALC.map(a => { const g = a.polys.reduce((m, p) => p.length > m.length ? p : m, a.polys[0]); return {pos:LBL.alc[a.cve] || centro([g]), t:a.nom, cve:a.cve, ...tam([g])}; });
const COL_LBL = [...COL_GEO].map(([i, paths]) => ({pos:LBL.col[i] || centro(paths, 12), t:COLONIAS[i] ? COLONIAS[i].n : "", i, ...tam(paths)}));
const STL = new Map(), ETQ_CALLE = {k:"", d:[]};
/* v28j: los nombres de calle que faltan se calculan en ratos libres del navegador (~10 ms cada vez) y el mapa se repinta solo dos veces:
   al tener los de las colonias a la vista y al tener también los de alrededor. */
const enRato = f => window.requestIdleCallback ? requestIdleCallback(f, {timeout:300}) : setTimeout(f, 30);
let ETQ_RATOS = null;
function callesEnRatos(cols, vis){
  const nuevo = !ETQ_RATOS; ETQ_RATOS = {cols, vis, visListas:vis.every(i => STL.has(i))};
  if (!nuevo) return;
  const paso = dl => { const R = ETQ_RATOS, t0 = performance.now(), queda = () => performance.now() - t0 < 10 && (!dl || !dl.timeRemaining || dl.timeRemaining() > 1);
    for (const i of R.cols){ if (STL.has(i)) continue; if (!queda()) break; etiquetasCalle(i); }
    if (R.cols.every(i => STL.has(i))){ ETQ_RATOS = null; pintarCapas(); return; }
    if (!R.visListas && R.vis.every(i => STL.has(i))){ R.visListas = true; pintarCapas(); }
    enRato(paso); };
  enRato(paso);
}
/* Juego de caracteres fijo para todas las etiquetas: con characterSet "auto" deck rehace el atlas de letras cada vez que cambian los datos, y eso traba el zoom. */
let CHARS_ = null;
/* v30g: deck.gl guarda dibujadas las letras de solo 3 combinaciones de tipo de letra y ajustes; con 5 las borraba y las volvía a dibujar
   (unos 0.3 s cada vez en un celular de gama media). Todas las etiquetas usan estos ajustes; quedan Cabin 700, Roboto 500 y Roboto (lbl-col). */
const SDF = {sdf:true, fontSize:64, buffer:10, radius:16, cutoff:.22};
/* v30g: las letras de calles, colonias y alcaldías vienen en los datos (P.chars); antes se buscaban aquí entre más de 600 mil caracteres */
const CHARS = () => CHARS_ || (CHARS_ = [...new Set((P.chars || [...P.names, ...INV.calles, ...COLS.map(c => COLONIAS[c.i] ? COLONIAS[c.i].n : ""), ...ALC.map(a => a.nom)].join(""))
  + (FONDO.nom || []).map(r => r[0]).join("") + tx("mapa.anp_nombre", {nombre:""}) +"0123456789,.+-–«»°%() árboles")].join(""));
/* Nombres de calle como en Nueva York: sobre el EJE de la calle y repetidos a lo largo de ella.
   Los tramos seguidos y casi rectos del mismo nombre se encadenan en una sola línea; cada 30 m de esa línea hay un candidato con su
   tramo recto alrededor: h[0..3] es la mitad del largo en que la calle no se aparta más de 3, 6, 12 o 24 m de la línea del nombre
   (se usa la tolerancia que a ese zoom mide unos 7 px).
   Así el nombre puede cruzar esquinas si la calle sigue recta. Antes iba uno por cuadra y solo si cabía en ella: en cuadras de 100 m
   casi no salían nombres hasta acercarse mucho, y siempre en las mismas pocas cuadras largas (v28g, 11 oct).
   La calle se arma también con las cuadras de las colonias vecinas (hasta ~500 m): muchas avenidas son el límite entre dos colonias e
   INEGI asigna cada cuadra a una u otra; armada solo con las propias, la avenida quedaba en pedazos de una cuadra. Cada colonia pone
   candidatos solo sobre sus propias cuadras, para no repetirlos. */
const SIN_NOMBRE = /ninguno|^sin nombre$/i, PASO_ETQ = 30;
function etiquetasCalle(c){
  if (STL.has(c)) return STL.get(c);
  const KX = 105000, KY = 110700, porNombre = new Map();
  const propios = frentesDe(c), nombres = new Set(propios.map(i => FN[i])), b0 = bbCol(c), m = .005, caja = [b0[0] - m, b0[1] - m, b0[2] + m, b0[3] + m], ejes = propios.map(i => [i, true]);
  for (const d of COL_LBL) if (d.i !== c){ const bb = bbCol(d.i); if (bb[0] < caja[2] && bb[2] > caja[0] && bb[1] < caja[3] && bb[3] > caja[1]) for (const i of frentesDe(d.i)) if (nombres.has(FN[i])) ejes.push([i, false]); }
  for (const [i, own] of ejes){
    if (FN[i] < 0 || SIN_NOMBRE.test(P.names[FN[i]] || "")) continue;
    const pts = []; for (let j = FS[i]; j < FS[i + 1]; j++) pts.push([FPOS[2*j] * KX, FPOS[2*j+1] * KY]);
    if (pts.length < 2) continue;
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1], L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 12) continue;
    const f = {pts, x0, y0, x1, y1, L, ux:(x1 - x0) / L, uy:(y1 - y0) / L, k:FK[i], own};
    const arr = porNombre.get(FN[i]); if (arr) arr.push(f); else porNombre.set(FN[i], [f]);
  }
  const out = [];
  for (const [n, fs] of porNombre){
    // Los ejes vienen cortados en cada cruce: se encadenan, en orden, los tramos seguidos y casi rectos de la misma calle. Las puntas se
    // unen aunque no se toquen (hasta 6 m): en los cruces de avenidas con camellón INEGI deja huecos, y la cadena se cortaba cada pocas cuadras.
    const G = 6, ext = new Map(), celda = (i, j) => i + "," + j;
    for (const f of fs) for (const [x, y] of [[f.x0, f.y0], [f.x1, f.y1]]){ const k = celda(Math.floor(x / G), Math.floor(y / G)), l = ext.get(k); if (l) l.push(f); else ext.set(k, [f]); }
    const cerca = (punta, f) => { const i0 = Math.floor(punta[0] / G), j0 = Math.floor(punta[1] / G), res = [];
      for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const g of ext.get(celda(i, j)) || []){
        if (visto.has(g) || res.includes(g) || Math.abs(f.ux * g.ux + f.uy * g.uy) <= .9) continue;
        const d = Math.min(Math.hypot(g.x0 - punta[0], g.y0 - punta[1]), Math.hypot(g.x1 - punta[0], g.y1 - punta[1])); if (d <= G) res.push(g); }
      return res.sort((g, h) => Math.min(Math.hypot(g.x0 - punta[0], g.y0 - punta[1]), Math.hypot(g.x1 - punta[0], g.y1 - punta[1])) - Math.min(Math.hypot(h.x0 - punta[0], h.y0 - punta[1]), Math.hypot(h.x1 - punta[0], h.y1 - punta[1]))); };
    const visto = new Set();
    for (const f0 of fs){
      if (visto.has(f0)) continue; visto.add(f0);
      let linea = f0.pts.slice(), suyo = Array(f0.pts.length - 1).fill(f0.own); const cadena = [f0];   // suyo[j]: el tramo j es de esta colonia
      for (const lado of [1, 0]){   // crecer por el final y por el principio
        let f = f0;
        for (;;){
          const punta = lado ? linea[linea.length - 1] : linea[0];
          const cand = cerca(punta, f);
          if (!cand.length) break;
          const g = cand[0]; visto.add(g); cadena.push(g);
          const p = Math.hypot(g.x0 - punta[0], g.y0 - punta[1]) < Math.hypot(g.x1 - punta[0], g.y1 - punta[1]) ? g.pts : g.pts.slice().reverse();   // p empieza en la punta
          linea = lado ? linea.concat(p.slice(1)) : p.slice().reverse().slice(0, -1).concat(linea);
          suyo = lado ? suyo.concat(Array(p.length - 1).fill(g.own)) : Array(p.length - 1).fill(g.own).concat(suyo);
          f = g;
        }
      }
      const acc = [0]; for (let j = 1; j < linea.length; j++) acc.push(acc[j - 1] + Math.hypot(linea[j][0] - linea[j - 1][0], linea[j][1] - linea[j - 1][1]));
      const T = acc[acc.length - 1]; if (T < 12 || !cadena.some(g => g.own)) continue;
      const en = s => { s = Math.max(0, Math.min(T, s)); let lo = 0, hi = acc.length - 1;
        while (hi - lo > 1){ const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
        const t = (s - acc[lo]) / (acc[hi] - acc[lo] || 1); return [linea[lo][0] + (linea[hi][0] - linea[lo][0]) * t, linea[lo][1] + (linea[hi][1] - linea[lo][1]) * t, lo]; };
      const k = Math.max(...cadena.map(g => g.k)), otros = fs.filter(g => !cadena.includes(g)), nA = Math.max(1, Math.round(T / PASO_ETQ));
      for (let q = 0; q < nA; q++){
        const s = (q + .5) * T / nA, p = en(s); if (!suyo[Math.min(p[2], suyo.length - 1)]) continue;
        const a = en(s - 15), b = en(s + 15);
        let dx = b[0] - a[0], dy = b[1] - a[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        // Mitad del largo recto alrededor del punto: hasta donde la calle se aparta más de «tol» metros de la línea del nombre, o se acaba.
        const recto = (tol, e0 = 0) => { let e = e0;
          const bien = d => { const sa = s - d, sb = s + d; if (sa < 0 || sb > T) return false; const pa = en(sa), pb = en(sb);
            return Math.abs((pa[0] - p[0]) * dy - (pa[1] - p[1]) * dx) <= tol && Math.abs((pb[0] - p[0]) * dy - (pb[1] - p[1]) * dx) <= tol; };
          while (e < 440 && bien(e + 20)) e += 20;   // de 20 en 20 m y, al final, 10 m más si aún cabe
          return e < 440 && bien(e + 10) ? e + 10 : e; };
        const h = [recto(3)]; for (const tol of [6, 12, 24]) h.push(recto(tol, h[h.length - 1]));
        // Avenidas con camellón dibujadas como dos ejes (clases 2 y 3): el nombre va entre ambos. En calles comunes, la de enfrente
        // con el mismo nombre es otra (cerradas, privadas) y el nombre caería entre las dos, fuera de ambas.
        let cx = p[0], cy = p[1];
        if (k >= 2){ let mejor = null, dMin = 45;
          for (const g of otros){ if (Math.abs(dx * g.ux + dy * g.uy) < .92) continue;
            const t = (p[0] - g.x0) * g.ux + (p[1] - g.y0) * g.uy; if (t < -5 || t > g.L + 5) continue;
            const px = g.x0 + g.ux * t, py = g.y0 + g.uy * t, d = Math.hypot(p[0] - px, p[1] - py);
            if (d > 5 && d < dMin){ dMin = d; mejor = [px, py]; } }
          if (mejor){ cx = (p[0] + mejor[0]) / 2; cy = (p[1] + mejor[1]) / 2; } }
        let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        const ar = ang * Math.PI / 180;
        out.push({t:P.names[n], pos:[cx / KX, cy / KY], ang, h, k, u:cx * Math.cos(ar) + cy * Math.sin(ar)});   // u: metros a lo largo de la calle
      }
    }
  }
  STL.set(c, out); return out;
}
/* Elige qué nombres de calle se ven a este zoom: el nombre cabe en un tramo recto de su calle (aunque cruce esquinas), la misma calle
   se repite a no menos de 240 px y ninguno se encima con otro, con los de colonia ni con el de la calle elegida. Primero avenidas y vías rápidas;
   luego los lugares más cerca de una cuadrícula fija a lo largo de la calle (cada 260 px): así los nombres quedan repartidos a lo largo
   de toda la calle y no amontonados donde hay más tramo recto, y como la cuadrícula es del mapa y no de la pantalla, no brincan al mover
   la vista. A igualdad, más tramo recto y luego la posición. */
function colocarEtiquetasCalle(cands, z, tam, obst = [], ocupadas = []){
  const vp = vpMundo(z), mpp = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), tol = 7 * mpp, it = tol >= 24 ? 3 : tol >= 12 ? 2 : tol >= 6 ? 1 : 0, H = d => d.h[it];
  const C = 160, rejilla = new Map(), visto = new Map(), out = [];
  const celdas = (c, fn) => { for (let i = Math.floor(c[0] / C); i <= Math.floor(c[2] / C); i++) for (let j = Math.floor(c[1] / C); j <= Math.floor(c[3] / C); j++) if (fn(i + "," + j)) return true; return false; };
  const poner = c => celdas(c, k => { const a = rejilla.get(k); if (a) a.push(c); else rejilla.set(k, [c]); });
  const choca = c => celdas(c, k => (rejilla.get(k) || []).some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1]));
  // Los nombres de colonia (con margen) y el de la calle elegida ocupan su lugar primero.
  for (const o of obst){ const [x, y] = vp.project(o.pos), w = Math.max(...o.ls.map(l => l.length)) * o.tam * .6 + 16, h = o.ls.length * o.tam * 1.3 + 12; poner([x - w / 2, y - h / 2, x + w / 2, y + h / 2]); }
  for (const c of ocupadas) poner(c);
  const S = 260 * mpp, fase = d => Math.round(Math.abs(d.u / S - Math.round(d.u / S)) * 20);   // 0 = sobre la cuadrícula; 10 = a media distancia
  const orden = cands.map(d => [d, d.k, fase(d), Math.round(H(d) / 20)]).sort((a, b) => (b[1] - a[1]) || (a[2] - b[2]) || (b[3] - a[3]) || (a[0].pos[0] - b[0].pos[0]) || (a[0].pos[1] - b[0].pos[1])).map(x => x[0]);
  for (const d of orden){
    const w = d.t.length * tam * .56 + 8, h = tam + 6;
    if (2 * H(d) / mpp < w * 1.05) continue;
    const [x, y] = vp.project(d.pos), mias = visto.get(d.t) || [];
    if (mias.some(([a, b]) => Math.hypot(a - x, b - y) < 240)) continue;
    const r = d.ang * Math.PI / 180, cw = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r)), ch = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
    const c = [x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2];
    if (choca(c)) continue;
    poner(c); mias.push([x, y]); visto.set(d.t, mias); out.push(d);
  }
  return out;
}
/* Nombre de la calle elegida: en el tramo que se ve, el más cercano al centro; se queda donde está mientras siga a la vista
   (antes iba a la mitad de la calle y, al recorrerla, se quedaba atrás). */
let SEL_ETQ = null;
/* v28j: la parte del mapa que de verdad se ve, en grados: sin la tarjeta del lugar (arriba), los controles (a la derecha), la simbología
   (abajo, en celular) ni la ficha abierta (abajo en celular, a la derecha en computadora), y con lugar para el nombre. Antes se usaba la
   vista entera menos un margen fijo, y en el celular el nombre caía bajo la tarjeta del lugar o la ficha. */
function vistaLibre(nombre){
  const W = mapEl.clientWidth, H = mapEl.clientHeight; if (!W || !H) return null;
  const m = mapEl.getBoundingClientRect(), caja = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" ? e.getBoundingClientRect() : null;   /* v30: con getClientRects (la ficha del celular es fixed y su offsetParent es nulo) */
  const media = Math.min(W / 3, String(nombre || "").length * 15 * .3 + 8);
  let x0 = 10 + media, y0 = 10, x1 = W - 10 - media, y1 = H - 10;
  const sum = caja($("mapsum")), bar = caja(document.querySelector(".toolbar")), lg = caja($("legend")), fi = caja($("card"));
  if (sum) y0 = Math.max(y0, sum.bottom - m.top + 8);
  y0 += 34;   /* el nombre va encima de su punto */
  if (bar) x1 = Math.min(x1, bar.left - m.left - 6 - media);
  if (lg && esTel()) y1 = Math.min(y1, lg.top - m.top - 8);
  if (fi){ if (esTel()) y1 = Math.min(y1, fi.top - m.top - 10); else x1 = Math.min(x1, fi.left - m.left - 10 - media); }
  if (x1 - x0 < 20 || y1 - y0 < 20) return null;
  const vp = new WebMercatorViewport({...vista, width:W, height:H}), [a0, b1] = vp.unproject([x0, y0]), [a1, b0] = vp.unproject([x1, y1]);
  return [a0, b0, a1, b1];
}
function posCalleElegida(tc2, vb){
  const k = calleAbierta + "|" + (cuadraAbierta || ""), mx = (vb[2] - vb[0]) * .1, my = (vb[3] - vb[1]) * .12, v = vistaLibre(calleAbierta) || [vb[0] + mx, vb[1] + my, vb[2] - mx, vb[3] - my];
  const dentro = p => p[0] > v[0] && p[0] < v[2] && p[1] > v[1] && p[1] < v[3];
  if (SEL_ETQ && SEL_ETQ.k === k && dentro(SEL_ETQ.pos)) return SEL_ETQ.pos;
  const cx = (v[0] + v[2]) / 2, cy = (v[1] + v[3]) / 2; let mejor = null, dm = Infinity;
  for (const d of tc2) for (let i = 0; i < d.path.length; i++){ const a = d.path[i], b = d.path[i + 1] || a;
    for (const q of [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]) if (dentro(q)){ const dd = (q[0] - cx) ** 2 + ((q[1] - cy) * 1.06) ** 2; if (dd < dm){ dm = dd; mejor = q; } } }
  SEL_ETQ = mejor ? {k, pos:mejor} : null; return mejor;
}
/* El anillo mayor de cada colonia, para poner su nombre en la parte que se ve. */
const COL_ANILLO = new Map();
const anilloCol = i => { if (!COL_ANILLO.has(i)){ const ps = COL_GEO.get(i) || []; COL_ANILLO.set(i, ps.reduce((m, p) => p.length > m.length ? p : m, ps[0])); } return COL_ANILLO.get(i); };
const COL_BB = new Map();
const bbCol = i => { if (!COL_BB.has(i)) COL_BB.set(i, bbox(COL_GEO.get(i) || [])); return COL_BB.get(i); };
/* Simbología: relleno = ya tiene guardián; solo contorno = espera guardián. */
/* v30 (auditoría): «tiene quien lo cuide» se calcula una vez por árbol y por cambio de registro (verG): antes, al dibujar una alcaldía,
   se calculaba cuatro veces por árbol (color, borde, tamaño y grosor), cada una con el hash de la simulación. Los cuatro estilos son fijos. */
const EST = {patCon:{f:K.guinda, s:K.patLuz, r:5, w:2.2}, patSin:{f:K.pat, s:K.blanco, r:4.6, w:1.5}, con:{f:K.guinda, s:K.blanco, r:3.6, w:1.5}, sin:{f:K.arbol, s:K.hoja, r:3.2, w:1.2}};
const est = a => { if (a._v !== verG){ a._v = verG; a._c = guardianes(a) > 0; }
  return a.pat ? (a._c ? EST.patCon : EST.patSin) : (a._c ? EST.con : EST.sin); };   // aro hoja: el verde con aro blanco daba 2.3–2.7:1 sobre manzana, parque o agua
let miPos = null;
/* Índice por celdas (~450 m) de cada arreglo de árboles: para insignias y búsquedas a la vista sin recorrer cientos de miles. */
const CELDA = .004, IDX_CELDAS = new WeakMap();
function enCeldas(arr, b){
  let ix = IDX_CELDAS.get(arr);
  if (!ix){ ix = new Map(); for (const a of arr){ const k = Math.floor(a.lng / CELDA) * 100000 + Math.floor(a.lat / CELDA); const c = ix.get(k); if (c) c.push(a); else ix.set(k, [a]); } IDX_CELDAS.set(arr, ix); }
  const out = [];
  for (let i = Math.floor(b[0] / CELDA); i <= Math.floor(b[2] / CELDA); i++) for (let j = Math.floor(b[1] / CELDA); j <= Math.floor(b[3] / CELDA); j++){
    const c = ix.get(i * 100000 + j); if (c) for (const a of c) if (a.lng > b[0] && a.lng < b[2] && a.lat > b[1] && a.lat < b[3]) out.push(a); }
  return out;
}
function capas(){ const t0 = performance.now(), L = conFondo(capasArmar());
  /* solo-prueba: ganchos de 03_pruebas (celular.py, etiquetas.py y otras); sin window.__PERF ni window.__ETQ no corren */
  if (window.__PERF) window.__PERF.push([Math.round((vista.zoom || 0) * 10) / 10, Math.round(performance.now() - t0), L.filter(Boolean).map(l => l.id).join(",")]);
  if (window.__ETQ) etqParaPruebas(L, performance.now() - t0);
  /* /solo-prueba */
  return L; }
/* solo-prueba: para 03_pruebas/etiquetas.py, si la prueba define window.__ETQ antes de abrir la página, aquí recibe los nombres que se ven
   (texto, lugar en pantalla, tamaño y giro) y una forma de mover la vista. Sin esa variable, nada de esto corre. */
function etqParaPruebas(L, ms){
  const W = mapEl.clientWidth, H = mapEl.clientHeight, vp = new WebMercatorViewport({longitude:vista.longitude, latitude:vista.latitude, zoom:vista.zoom, width:W, height:H});
  const val = (f, d, def) => typeof f === "function" ? f(d) : (f == null ? def : f);
  window.__ETQ.vista = {lon:vista.longitude, lat:vista.latitude, z:vista.zoom, W, H, ms, faltan:!!ETQ_CALLE.faltan && vista.zoom >= 14.8};
  window.__ETQ.nombres = L.filter(l => l && /^lbl-/.test(l.id) && Array.isArray(l.props.data)).flatMap(l => l.props.data.map(d => { const [x, y] = vp.project(l.props.getPosition(d)), o = val(l.props.getPixelOffset, d, [0, 0]);
    return {capa:l.id, t:String(l.props.getText(d)), x:x + o[0], y:y + o[1], s:val(l.props.getSize, d, 12), ang:val(l.props.getAngle, d, 0)}; }));
  window.__ETQ.candidatos = t => [...STL.values()].flat().filter(d => d.t === t);   // dónde podría ir el nombre de una calle (para revisar por qué no sale)
  window.__ETQ.dedos = () => { try { return dk.eventManager.manager.input.store.length; } catch { return -1; } };   // cuántos dedos cree tener puestos el mapa (03_pruebas/celular.py)
  window.__ETQ.toque = (lon, lat) => dk.props.onClick({coordinate:[lon, lat]});   // un toque en el mapa sin clic (con WebGL por software los clics no llegan)
  window.__ETQ.ir = (lon, lat, z) => { irA({longitude:lon, latitude:lat, zoom:z, pitch:0, bearing:0, transitionDuration:0}); escala(); pintarCapas(); };
}
/* /solo-prueba */
/* v30 (auditoría): los patrimoniales viven también en el arreglo de su alcaldía (para la lista y la búsqueda), pero en el mapa se dibujan
   solo en su capa propia: antes salían dos veces (punto, arbolito e insignia guinda encimados). */
const SIN_PAT = new WeakMap();
const sinPatrimoniales = arr => { let r = SIN_PAT.get(arr); if (!r){ r = arr.filter(a => !a.pat); SIN_PAT.set(arr, r); } return r; };
/* v30 (auditoría): una alcaldía se ve si alguna de sus colonias está a la vista (las cajas de las alcaldías se enciman mucho: se bajaban
   en promedio 2.8 alcaldías por vista en el celular cuando se veían 2.1; cada una pesa 1 a 2 MB). */
const COLBB_ALC = new Map(); for (const [i] of COL_GEO){ const m = COLONIAS[i] && COLONIAS[i].m; if (m){ if (!COLBB_ALC.has(m)) COLBB_ALC.set(m, []); COLBB_ALC.get(m).push(bbCol(i)); } }
const alcVisible = (cve, vb) => { const bs = COLBB_ALC.get(cve); return !bs || bs.some(b => b[0] < vb[2] && b[2] > vb[0] && b[1] < vb[3] && b[3] > vb[1]); };
function capasArmar(){
  const z = vista.zoom || 10;
  let etqCol = [];   // etiquetas de colonia de este cuadro: las de calle las esquivan
  const L = [
    // Las calles solo se dibujan de cerca: a escala de ciudad no se distinguen y cargan de más al teléfono.
    ...callesCapas(z),
    // Límites de colonia encima de las calles, con la misma «funda» que las alcaldías pero más fina: la línea verde oscuro los distingue de las calles blancas.
    // De cerca se atenúan (desde zoom 16) y desaparecen (17): la geometría de colonias es esquemática (mediana de 10 vértices) y a escala de calle
    // cruzaría manzanas. Corrección de fondo pendiente: catálogo de colonias con su geometría original.
    z >= Z_COL && new PathLayer({id:"colonias-funda", data:COL_PATHS, getPath:d => d.path, getColor:[255,255,255,255], getWidth:3.6, widthUnits:"pixels", jointRounded:true}),   // opacidad: OPACIDAD
    z >= Z_COL && new PathLayer({id:"colonias", data:COL_PATHS, getPath:d => d.path, getColor:K.limCol, getWidth:1.6, widthUnits:"pixels", jointRounded:true}),
    // Límites de alcaldía con "funda": franja blanca ancha y línea oscura encima, para que se lean sobre cualquier verde.
    new PathLayer({id:"alcaldias-funda", data:ALC_PATHS, getPath:d => d.path, getColor:[255,255,255,z < Z_COL ? 235 : 200], getWidth:z < Z_COL ? 4.5 : 4, widthUnits:"pixels", jointRounded:true}),
    new PathLayer({id:"alcaldias", data:ALC_PATHS, getPath:d => d.path, getColor:cA(K.limAlc, z < Z_COL ? 230 : 190), getWidth:z < Z_COL ? 1.6 : 1.4, widthUnits:"pixels", jointRounded:true})];
  // Ciudad: alcaldías en verdes por número de árboles. Alcaldía: sus colonias en verdes. (Como el mapa de árboles de Nueva York.)
  // Como el mapa de Nueva York, todo depende del zoom, no de lo elegido: lejos, alcaldías; más cerca, TODAS las colonias; de cerca, TODOS los árboles a la vista.
  const vb = limitesVista();
  // v28k: alcaldías y colonias se funden entre 11.2 y 11.8, y las colonias se desvanecen hacia las manzanas entre 13.8 y 14.5 (OPACIDAD);
  // antes cambiaban de golpe y, al alejar, las colonias «aparecían de la nada».
  if (z >= 11.2) L.unshift(new PolygonLayer({id:"col-fill", data:COL_POLY, getPolygon:d => d.p, getFillColor:d => [...colorV(vCol(d.i)), 225], stroked:false, filled:true, pickable:z >= Z_COL}));
  if (z < 11.8) L.unshift(new PolygonLayer({id:"alc-fill", data:ALC_POLY, getPolygon:d => d.p, getFillColor:d => [...colorV(vAlc(d.cve)), 235], stroked:false, filled:true, pickable:z < Z_COL}));
  // Suelo claro solo dentro de la Ciudad: lo de alrededor queda en gris (fondo del contenedor).
  L.unshift(new PolygonLayer({id:"cdmx-base", data:ALC_POLY, getPolygon:d => d.p, getFillColor:hex(css("--map-ground")), stroked:false, filled:true}));
  if (selAlc !== null) L.push(new PathLayer({id:"alc-sel", data:ALC.find(a => a.cve === selAlc).polys.map(p => ({path:p})), getPath:d => d.path, getColor:selCol === null ? K.guinda : [...K.guinda.slice(0, 3), 120], getWidth:selCol === null ? 3 : 2, widthUnits:"pixels"}));
  if (selCol !== null) L.push(new PolygonLayer({id:"col-sel", data:(COL_GEO.get(selCol) || []).map(p => ({p})), getPolygon:d => d.p, getLineColor:[...K.guinda.slice(0, 3), z < 16 ? 255 : z < 17 ? 120 : 0], getLineWidth:2.5, lineWidthUnits:"pixels", stroked:true, filled:false}));
  const conCifra = (t, n) => t + "\n" + nArb(n || 0);
  // Una etiqueta solo aparece si su pieza mide en pantalla lo suficiente a este zoom; además no se enciman (filtro de colisión).
  const mpp = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), cabe = (d, px) => d.w / mpp > px && d.h / mpp > px * .5;
  const enVista = d => d.pos[0] > vb[0] && d.pos[0] < vb[2] && d.pos[1] > vb[1] && d.pos[1] < vb[3];
  // Una sola fila de prioridad para los nombres: calle elegida, colonia elegida, colonias, calles (avenidas primero). Cada uno esquiva a los anteriores.
  const zzE = Math.round(z * 5) / 5, etqSel = selCol !== null && z >= 13.5 ? (tc => tc.length ? posCalleElegida(tc, vb) : null)(trazoCalle()) : null;
  const ocupaSel = etqSel ? [cajaEnMundo(etqSel, [calleAbierta], 15, zzE, -22, 24, 14)] : [];
  // Nombre de colonia en la parte que se ve: si su punto sale de la vista pero la colonia sigue en pantalla, el nombre pasa al centro
  // de lo que se ve, como las alcaldías (antes desaparecía aunque la persona estuviera dentro de la colonia).
  const mgx = (vb[2] - vb[0]) * .04, mgy = (vb[3] - vb[1]) * .06;
  const colVisibles = filtro => COL_LBL.filter(filtro).map(d => {
    if (d.pos[0] > vb[0] + mgx && d.pos[0] < vb[2] - mgx && d.pos[1] > vb[1] + mgy && d.pos[1] < vb[3] - mgy) return d;
    const b = bbCol(d.i); if (!(b[0] < vb[2] && b[2] > vb[0] && b[1] < vb[3] && b[3] > vb[1])) return null;
    const pos = posVisible(anilloCol(d.i), d.pos, vb, z); return pos ? {...d, pos} : null; }).filter(Boolean);
  // Texto oscuro con halo blanco sobre los verdes claros; blanco con halo oscuro sobre los verdes oscuros. Dos renglones: nombre y cifra.
  const dosRenglones = (id, data, nombre, cifra, tam, claro) => {
    const tinta = claro ? K.tinta : K.blanco, halo = claro ? cA(K.blanco, 235) : cA(K.haloOsc, 235);
    const base = {data, getPosition:d => d.pos, characterSet:CHARS(), fontSettings:SDF, outlineColor:halo, getColor:tinta};
    L.push(new TextLayer({...base, id:id + "-n", getText:nombre, getSize:tam, fontFamily:"Cabin, sans-serif", fontWeight:700, outlineWidth:2.4, getPixelOffset:[0, -tam * .5]}));
    L.push(new TextLayer({...base, id:id + "-c", getText:cifra, getSize:Math.round(tam * .86), fontFamily:"Roboto, sans-serif", fontWeight:500, outlineWidth:2.2, getPixelOffset:[0, tam * .66]}));
  };
  const claseV = v => v == null ? 0 : CORTES_V.filter(x => v >= x).length;
  if (z < Z_COL){
    // Todas las alcaldías llevan nombre y cifra. Las seis del centro son chicas a esta escala: letra menor, nombre partido,
    // solo la cifra, y posición ajustada a mano para que ninguna se encime (las demás, en su punto más interior).
    const CENTRO = {"002":[-99.177, 19.486], "015":[-99.149, 19.432], "017":[-99.084, 19.430], "014":[-99.160, 19.377], "006":[-99.097, 19.394], "016":[-99.197, 19.436]};
    const AJUSTE = {"004":[-99.300, 19.335], "003":[-99.160, 19.322]};   // Gustavo A. Madero y Miguel Hidalgo van al centro de su cuerpo principal
    const PARTIR = {"004":"Cuajimalpa\nde Morelos", "017":"Venustiano\nCarranza", "014":"Benito\nJuárez", "008":"La Magdalena\nContreras", "016":"Miguel\nHidalgo", "005":"Gustavo A.\nMadero", "010":"Álvaro\nObregón"};
    const t = z < 10.8 ? 12 : 14, tc = z < 10.8 ? 10.5 : 12;
    // Celular (la ciudad entera cabe en ~360 px): solo nombres, sin cifras, y sin las seis alcaldías chicas del centro; con un toque se ven en el globo.
    const chico = z < 9.6 || (mapEl.clientWidth || 800) < 600;
    // Las posiciones a mano solo sirven con la ciudad entera a la vista; más cerca, cada nombre va al punto más interior de lo que se ve.
    const aMano = z < 10.4;
    const texto = d => d.chica ? (PARTIR[d.cve] || d.t) + "\n" + fmt.format(nAlc(d.cve)) : (PARTIR[d.cve] && z < 10.8 ? PARTIR[d.cve] : d.t) + (chico ? "" : "\n" + nArb(nAlc(d.cve)));
    const vpE = new WebMercatorViewport({...vista, width:mapEl.clientWidth || 800, height:mapEl.clientHeight || 600}), cajas = [];
    const datos = ALC_LBL.map(d => { const pos = posVisible(ALC_ANILLO.get(d.cve), (aMano && (CENTRO[d.cve] || AJUSTE[d.cve])) || d.pos, vb, z);
      return pos ? {...d, pos, chica:aMano && !!CENTRO[d.cve]} : null; }).filter(Boolean)
      .filter(d => !(chico && d.chica))
      .sort((a, b) => (b.chica ? 1e15 : b.w * b.h) - (a.chica ? 1e15 : a.w * a.h))
      .filter(d => { // si dos nombres se enciman, queda el de la alcaldía mayor (en celular, la ciudad entera mide ~360 px)
        const tm = d.chica ? tc : chico ? 10.5 : t, ls = texto(d).split("\n"), [x, y] = vpE.project(d.pos);
        const w = Math.max(...ls.map(l => l.length)) * tm * .5 + 2, h = ls.length * tm * 1.05 + 2, c = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
        if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) return false; cajas.push(c); return true; });
    for (const claro of [true, false]){
      const tinta = claro ? K.tinta : K.blanco, halo = claro ? cA(K.blanco, 240) : cA(K.haloOsc, 240);
      const base = {getPosition:d => d.pos, fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:CHARS(), fontSettings:SDF, outlineWidth:2.4, outlineColor:halo, getColor:tinta, lineHeight:1.05};
      const mios = datos.filter(d => (claseV(vAlc(d.cve)) <= 2) === claro);   /* v31e: texto blanco sobre el verdor 4 (5.0:1) y 5; la tinta daría 2.7:1 sobre el 4 */
      L.push(new TextLayer({...base, id:"lbl-alc-" + claro, data:mios.filter(d => !d.chica), getText:texto, getSize:chico ? 10.5 : t, updateTriggers:{getText:[z < 10.8, chico]}}));
      if (!chico) L.push(new TextLayer({...base, id:"lbl-alc-chica-" + claro, data:mios.filter(d => d.chica), getText:texto, getSize:tc}));
    }
  }

  else if (z < 15){ const t = z < 13 ? 12 : 14, d0 = sinEncimar(colVisibles(d => COLONIAS[d.i] && cabe(d, 64)), d => conCifra(d.t, nCol(d.i)), t, z, d => d.i === selCol ? 1e12 : d.w * d.h, ocupaSel);
    etqCol = d0.map(d => ({pos:d.pos, ls:[d.t, nArb(nCol(d.i))], tam:t}));
    for (const claro of [true, false]) dosRenglones("lbl-col-" + claro, d0.filter(d => (z >= 14 || claseV(vCol(d.i)) <= 2) === claro), d => d.t, d => nArb(nCol(d.i)), t, claro); }
  else if (z < 16) L.push(new TextLayer({id:"lbl-col", data:(etqCol = sinEncimar(colVisibles(d => cabe(d, 40)), d => d.t, 11, z, d => d.i === selCol ? 1e12 : d.w * d.h, ocupaSel).map(d => ({...d, ls:[d.t], tam:11}))), getPosition:d => d.pos, getText:d => d.t, getSize:11, getColor:K.gris, fontFamily:"Roboto, sans-serif", characterSet:CHARS(), outlineWidth:3, outlineColor:K.haloGris, fontSettings:{sdf:true}}));
  // Nombres de las ANP y AVA: después de los de colonia (y de la calle elegida) en la fila de prioridad; las calles los esquivan.
  const etqAnp = nombresProtegidas(z, vb, zzE, [...etqCol.map(d => cajaEnMundo(d.pos, d.ls, d.tam, zzE)), ...ocupaSel]);
  const verdeHoja = hex(css("--fondo-protegida-texto")), tinta = K.tinta;
  for (const [id, tonos, halo] of [["lbl-anp", ["hoja", "tinta"], cA(K.blanco, 235)], ["lbl-anp-blanco", ["blanco"], cA(K.haloOsc, 235)]]){
    const d = etqAnp.filter(x => tonos.includes(x.tono));
    if (d.length) L.push(new TextLayer({id, data:d, getPosition:x => x.pos, getText:x => x.t, getSize:x => x.tam, getColor:x => x.tono === "hoja" ? verdeHoja : x.tono === "tinta" ? tinta : [255,255,255,255],
      fontFamily:"Roboto, sans-serif", fontWeight:500, characterSet:CHARS(), lineHeight:1.2, outlineWidth:2.4, outlineColor:halo, fontSettings:SDF}));
  }
  const obstCalle = etqCol.concat(etqAnp.map(d => ({pos:d.pos, ls:d.ls, tam:d.tam})));
  // De cerca se ven todos los árboles de la alcaldía abierta; más lejos, solo los de la colonia elegida.
  let datosArb = [];
  // [id, datos, visible]. Las capas de las alcaldías ya cargadas se quedan vivas aunque no se vean (visible:false):
  // así, al acercarse o alejarse, deck no recalcula cientos de miles de árboles y el zoom no se traba.
  const capasArb = [];
  for (const A of ALC){ const bb = ALC_BB.get(A.cve), alaVista = !(bb[0] > vb[2] || bb[2] < vb[0] || bb[1] > vb[3] || bb[3] < vb[1]) && alcVisible(A.cve, vb);
    const arr = ARB_ALC.get(A.cve) && sinPatrimoniales(ARB_ALC.get(A.cve));
    if (arr) capasArb.push(["arboles-" + A.cve, arr, z >= Z_ARB && alaVista]);
    /* v30: si falla por el mapa (red inestable al arrastrar), se avisa; se reintenta al volver la conexión («online», más abajo) */
    else if (z >= Z_ARB && alaVista && !FALLO_ALC.has(A.cve)) cargarAlcaldia(A.cve).then(() => pintarMapa(), e => aviso(e.message, "error")); }
  if (z < Z_ARB && selCol !== null && z >= 12.5){ datosArb = arbolesDe(selCol); capasArb.push(["arboles-col-" + selCol, datosArb, true]); }
  if (alcResalta && alcResalta !== selAlc){ const A = ALC.find(a => a.cve === alcResalta);
    if (A){ L.push(new PathLayer({id:"alc-resalta", data:A.polys.map(p => ({path:p})), getPath:d => d.path, getColor:K.dorado, getWidth:4, widthUnits:"pixels"}));
      } }
  const tc = trazoCalle();
  if (tc.length) L.push(new PathLayer({id:"calle-sel", data:tc, getPath:d => d.path, getColor:cA(K.dorado, 200), getWidth:4, widthUnits:"meters", widthMinPixels:3, widthMaxPixels:7, capRounded:true, jointRounded:true}));
  // Tamaño del arbolito en pantalla: 12 m de alto, entre 19 y 38 px; el patrimonial, 1.35 veces.
  const mppA = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), icoPx = Math.min(38, Math.max(19, 12 / mppA));
  // El atlas de arbolitos se sube a la tarjeta gráfica una sola vez, cuando el mapa ya tiene dispositivo; antes de eso se ven puntos.
  if (!ATLAS.tex && z >= Z_ARB){ try { const dv = dk.device; if (dv){ if (!ATLAS.img) crearAtlas(); ATLAS.tex = dv.createTexture({data:ATLAS.img, width:ATLAS.img.width, height:ATLAS.img.height, mipmaps:true, sampler:{minFilter:"linear", magFilter:"linear", mipmapFilter:"linear"}}); } } catch (e) { ATLAS.tex = null; } }
  const conIcono = z >= Z_ICO && !!ATLAS.tex;
  // Puntos (de media distancia) y arbolitos (de cerca) conviven; solo cambia cuál se ve.
  for (const [id, datos, ve] of capasArb) L.push(new ScatterplotLayer({id, data:datos, visible:ve && !conIcono, pickable:true, getPosition:a => [a.lng, a.lat],
    getFillColor:a => est(a).f, getLineColor:a => est(a).s, getRadius:a => est(a).r, getLineWidth:a => est(a).w,
    radiusUnits:"meters", radiusMinPixels:2.5, radiusMaxPixels:11, lineWidthUnits:"pixels", stroked:true, filled:true,
    updateTriggers:{getFillColor:verG, getLineColor:verG, getLineWidth:verG}}));
  L.push(new ScatterplotLayer({id:"patrimoniales", data:PAT, visible:z >= Z_ARB && !conIcono, pickable:true, getPosition:p => [p.lng, p.lat], getFillColor:p => est(patA(p)).f, getLineColor:p => est(patA(p)).s, getLineWidth:p => est(patA(p)).w, lineWidthUnits:"pixels", stroked:true, getRadius:6, radiusUnits:"meters", radiusMinPixels:5, radiusMaxPixels:12,
    updateTriggers:{getFillColor:verG, getLineColor:verG, getLineWidth:verG}}));
  if (ATLAS.tex){
    const ico = {iconAtlas:ATLAS.tex, iconMapping:ATLAS.map, sizeUnits:"pixels", pickable:true, getPosition:a => [a.lng, a.lat], billboard:true, alphaCutoff:.05};
    for (const [id, datos, ve] of capasArb) L.push(new IconLayer({...ico, id:id + "-ico", data:datos, visible:ve && conIcono, getIcon:() => "arb", getSize:icoPx}));
    L.push(new IconLayer({...ico, id:"patrimoniales-ico", data:PAT, visible:conIcono, getPosition:p => [p.lng, p.lat], getIcon:() => "pat", getSize:icoPx * 1.35}));
  }
  if (conIcono){
    // Insignias guindas: solo de los árboles que ya tienen guardián, con margen de media pantalla y buscando por celdas.
    const mx = (vb[2] - vb[0]) / 2, my = (vb[3] - vb[1]) / 2, vb2 = [vb[0] - mx, vb[1] - my, vb[2] + mx, vb[3] + my];
    const vis = d => d.lng > vb2[0] && d.lng < vb2[2] && d.lat > vb2[1] && d.lat < vb2[3], ins = [];
    for (const [, datos, ve] of capasArb) if (ve) for (const a of enCeldas(datos, vb2)){ const g = guardianes(a); if (g > 0) ins.push({lng:a.lng, lat:a.lat, g, k:1}); }
    for (const p of PAT) if (vis(p)){ const g = guardianes(patA(p)); if (g > 0) ins.push({lng:p.lng, lat:p.lat, g, k:1.35}); }
    const tIns = icoPx < 22 ? 10 : 11;
    L.push(new TextLayer({id:"insignias", data:ins, getPosition:d => [d.lng, d.lat], getText:d => d.g > 99 ? "99+" : String(d.g), getSize:tIns,
      getPixelOffset:d => [icoPx * d.k * .36, -icoPx * d.k * .4], getColor:[255,255,255,255], fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:"0123456789+", fontSettings:SDF,
      background:true, getBackgroundColor:K.guinda, backgroundPadding:[4, 1, 4, 1], backgroundBorderRadius:8, getBorderColor:[255,255,255,255], getBorderWidth:1.5,
      updateTriggers:{getText:verG, getPixelOffset:icoPx}}));
  }
  // Nombres de calle ENCIMA de los árboles, de TODAS las colonias a la vista, sobre el eje y repetidos a lo largo de la calle (como Nueva York).
  // Con una calle elegida, las demás se atenúan y la elegida lleva etiqueta propia.
  if (z >= 14.8){   // las etiquetas de calle esquivan las de colonia (etqCol)
    const tc2 = trazoCalle(), hay = tc2.length > 0, qn = hay ? plano(calleAbierta) : "";
    const tamC = Math.round((10.5 + 6.5 * (Math.pow(1.4, z - 10) - 1) / (Math.pow(1.4, 10) - 1)) * 10) / 10;
    // Calles de las colonias a la vista y de media pantalla alrededor: las de la orilla ya están acomodadas cuando entran. Sin tope de
    // colonias (antes 60, en orden de catálogo y no de cercanía: en zonas de colonias chicas, partes de la pantalla quedaban sin nombres).
    const zz = zzE, ex = (vb[2] - vb[0]) * .5, ey = (vb[3] - vb[1]) * .5, vx = [vb[0] - ex, vb[1] - ey, vb[2] + ex, vb[3] + ey];
    const cx = (vb[0] + vb[2]) / 2, cy = (vb[1] + vb[3]) / 2;
    const cols = COL_LBL.filter(d => { const b = bbCol(d.i); return b[0] < vx[2] && b[2] > vx[0] && b[1] < vx[3] && b[3] > vx[1]; })
      .sort((a, b) => Math.hypot(a.pos[0] - cx, a.pos[1] - cy) - Math.hypot(b.pos[0] - cx, b.pos[1] - cy)).map(d => d.i);
    // Las calles de cada colonia se calculan una vez, de la más cercana al centro a la más lejana (antes de v28g, la primera vista de una
    // zona con muchas colonias podía trabar el mapa casi un segundo).
    // v28j: en el cuadro solo ~8 ms; lo que falta se calcula en ratos libres (callesEnRatos) y el mapa se repinta una vez al tener las de
    // la vista y otra al tener las de alrededor (antes se rehacía todo cada 16 ms mientras faltaban: en el celular el mapa se trababa).
    const t0 = performance.now();
    for (const i of cols){ if (STL.has(i)) continue; if (performance.now() - t0 > 8) break; etiquetasCalle(i); }
    const faltan = cols.some(i => !STL.has(i));
    if (faltan) callesEnRatos(cols, cols.filter(i => { const b = bbCol(i); return b[0] < vb[2] && b[2] > vb[0] && b[1] < vb[3] && b[3] > vb[1]; }));
    ETQ_CALLE.faltan = faltan;
    if (STL.size > 800){ const ahora = new Set(cols); for (const k of [...STL.keys()]) if (!ahora.has(k)) STL.delete(k); }   // memoria acotada
    const listas = cols.filter(i => STL.has(i));
    const clave = zz + "|" + listas.join(",") + "|" + qn + "|" + obstCalle.map(d => d.ls[0] + "@" + Math.round(d.pos[0] * 2e4) + "," + Math.round(d.pos[1] * 2e4)).join(",") + "|" + ocupaSel.map(c => c.map(Math.round).join(",")).join(";");
    if (clave !== ETQ_CALLE.k){
      const cands = listas.flatMap(i => STL.get(i)).filter(d => d.pos[0] > vx[0] && d.pos[0] < vx[2] && d.pos[1] > vx[1] && d.pos[1] < vx[3] && (!hay || !(qn === plano(d.t) || qn.endsWith(" " + plano(d.t)))));
      ETQ_CALLE.k = clave; ETQ_CALLE.d = colocarEtiquetasCalle(cands, zz, tamC, obstCalle, ocupaSel);
    }
    L.push(new TextLayer({id:"lbl-calles", data:ETQ_CALLE.d, getPosition:d => d.pos, getText:d => d.t, getAngle:d => d.ang, getSize:tamC, getColor:hay ? K.calleAten : K.calleNom, fontFamily:"Roboto, sans-serif", fontWeight:500, characterSet:CHARS(), outlineWidth:4, outlineColor:cA(K.haloCalle, 240), fontSettings:SDF}));
  }
  if (etqSel) L.push(new TextLayer({id:"lbl-calle-sel", data:[{pos:etqSel, t:calleAbierta}], getPosition:d => d.pos, getText:d => d.t, getSize:15, getColor:[255,255,255,255], fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:CHARS(), fontSettings:SDF,
    background:true, getBackgroundColor:cA(K.ambar, 235), backgroundPadding:[10, 6], getPixelOffset:[0, -22]}));
  if (selArb) L.push(conIcono
    ? new ScatterplotLayer({id:"arbol-sel", data:[selArb], getPosition:a => [a.lng, a.lat], getRadius:icoPx * (selArb.pat ? 1.35 : 1) * .66, radiusUnits:"pixels", filled:true, getFillColor:cA(K.ink, 28), stroked:true, getLineColor:K.ink, getLineWidth:2.5, lineWidthUnits:"pixels"})
    : new ScatterplotLayer({id:"arbol-sel", data:[selArb], getPosition:a => [a.lng, a.lat], getRadius:7, radiusUnits:"meters", radiusMinPixels:10, filled:false, stroked:true, getLineColor:K.ink, getLineWidth:3, lineWidthUnits:"pixels"}));
  if (miPos) L.push(new ScatterplotLayer({id:"yo", data:[miPos], getPosition:d => d, getRadius:6, radiusUnits:"pixels", getFillColor:K.loc, getLineColor:K.blanco, getLineWidth:2, lineWidthUnits:"pixels", stroked:true}));
  return L;
}
const pctTxt = v => v == null ? tx("general.sin_dato") : tx("general.porcentaje", {v:fmt0.format(v)});
/* En pantallas táctiles no hay globo: un toque lo dejaba pegado sobre el mapa (v28j, prueba de Liber en iPhone). */
const SIN_MOUSE = matchMedia("(hover: none)");
const TIP = {font:"12px Roboto,sans-serif", background:"#fff", color:css("--ink"), border:"1px solid " + css("--tip-borde"), borderRadius:"6px", padding:"6px 8px", whiteSpace:"pre"};
let LEY_ABIERTA = false;
let LEY_K = "";
function leyenda(){ const z = vista.zoom || 10, k = [z < Z_ARB, z >= Z_ICO, LEY_ABIERTA].join("|");
  if (k === LEY_K) return; LEY_K = k;   /* v28j: antes se rehacía en cada repintado del mapa */
  const conFoco = !!(document.activeElement && document.activeElement.classList.contains("lg-btn"));   /* v28k: al rehacerse no se pierde el foco */
  leyendaContenido(); const lg = $("legend");
  lg.prepend(el("button", {type:"button", class:"lg-btn", "aria-expanded":String(LEY_ABIERTA), onclick:() => { LEY_ABIERTA = !LEY_ABIERTA; leyenda(); $("legend").querySelector(".lg-btn").focus(); }}, LEY_ABIERTA ? tx("mapa.ocultar_simbologia") : tx("general.simbologia")));
  lg.classList.toggle("plegada", !LEY_ABIERTA);
  if (conFoco) lg.querySelector(".lg-btn").focus();
}
function leyendaContenido(){
  /* v29 (Liber, 12 oct: «la simbología me sigue pareciendo un exceso, en celular y en computadora»): de lejos, solo la rampa del verdor;
     de cerca, solo los tres tipos de árbol. Sin título, notas, calle elegida ni parques (se entienden solos o ya los dice el panel). En la
     computadora va en una sola línea. */
  const lg = $("legend"), z = vista.zoom || 10, fila = (...c) => el("span", {}, ...c);
  if (z < Z_ARB){
    lg.replaceChildren(el("div", {class:"rampa"}, el("b", {texto:tx("general.verdor_de_las_calles")}), tx("mapa.menos"), VERDES.map(c => el("i", {style:"background:rgb(" + c.join(",") + ")"})), tx("mapa.mas")));
    return;
  }
  const ico = z >= Z_ICO;
  lg.replaceChildren(fila(ico ? arbolitoSVG(false) : el("i", {class:"mk mk-arbol-sin"}), tx("general.espera_quien_lo_cuide")),
    fila(ico ? arbolitoSVG(false, 3) : el("i", {class:"mk mk-arbol-con"}), tx("mapa.ya_lo_cuidan")),
    fila(ico ? arbolitoSVG(true) : [el("i", {class:"mk mk-pat-sin"}), el("i", {class:"mk mk-pat-con"})], tx("mapa.patrimonial")));
}
let T_CAPAS = 0;
/* ===== Fondo del mapa (v28h; decisión de Liber del 11 oct, tras la prueba en la rama prueba-mapa-base-osm) =====
   Manzanas del Catastro de la CDMX (las que usó el CIGA para ubicar los árboles: casi ningún árbol cae dentro de una), parques y jardines
   del Inventario de Áreas Verdes 2017 de SEDEMA (solo parques, arboledas, alamedas, jardines públicos, vegetación reminiscente, viveros y
   forestación), ANP y AVA oficiales y agua de SEDEMA; alojados en el sitio (datos/fondo_*.txt y fondo_nombres.json, de hacer_fondo.py),
   sin mosaicos ajenos. De lejos manda el verdor por colonia: solo se ve el límite de las áreas protegidas (y solo hasta 15.5: de cerca se
   juntaba con los de alcaldía y colonia, que corren por las mismas avenidas a pocos metros). Desde Z_ARB: suelo neutro sin el tinte del
   verdor, manzanas (por alcaldía, al acercarse) y, encima de ellas, parques y áreas protegidas en verde claro (Catastro trae muchos
   parques como manzana) y agua. A escala de ciudad no se descarga nada. */
const FONDO = {base:null, nom:null, pidiendo:false, mz:new Map(), pend:new Set(), fallo:new Set(), anillo:null};
const FONDO_ESCALA = 200000;   /* coordenadas en 1/200,000 de grado (ESCALA en hacer_fondo.py) */
async function fondoLeer(f){
  const r = await fetch(conHuella("datos/" + f + ".txt")); if (!r.ok) throw new Error(f);
  const b = await gunzip(deBase64(await r.text())); let q = 0, x = 0, y = 0;
  const v = () => { let res = 0, sh = 0, c; do { c = b[q++]; res += (c & 0x7f) * Math.pow(2, sh); sh += 7; } while (c & 0x80); return res % 2 ? -((res + 1) / 2) : res / 2; };
  return () => { const n = v(), out = new Array(n);
    for (let i = 0; i < n; i++){ const nr = v(), p = new Array(nr);
      for (let j = 0; j < nr; j++){ const k = v(), a = new Array(k); for (let m = 0; m < k; m++){ x += v(); y += v(); a[m] = [x / FONDO_ESCALA, y / FONDO_ESCALA]; } p[j] = a; }
      out[i] = p; }
    return out; };
}
function conFondo(L){
  const z = vista.zoom || 10;
  if (!HAY_MAPA || z < Z_COL) return L;
  /* v30 (auditoría): si el fondo falla se reintenta a lo más tres veces (antes, en cada repintado, con un repintado más por cada intento) y
     los nombres se piden una sola vez; al llegar solo repintan si ya hay fondo. */
  if (!FONDO.base && !FONDO.pidiendo && (FONDO.intentos || 0) < 3){ FONDO.pidiendo = true; FONDO.intentos = (FONDO.intentos || 0) + 1;
    fondoLeer("fondo_base").then(pol => { FONDO.base = {verde:pol(), agua:pol(), protegida:pol()}; pintarCapas(); }).catch(() => { FONDO.pidiendo = false; }); }
  if (!FONDO.nomPedido){ FONDO.nomPedido = true;
    fetch(conHuella("datos/fondo_nombres.json")).then(r => r.json()).then(j => { FONDO.nom = j; CHARS_ = null; if (FONDO.base) pintarCapas(); }).catch(() => {}); }
  if (!FONDO.base) return L;
  const out = L.slice(), abajo = [];
  if (z >= 14){   /* v28k: desde 14 y se funde con las colonias hasta 14.5 (antes aparecía de golpe en 14.5) */
    const vb = limitesVista(), verde = hex(css("--fondo-verde"));
    for (const [cve, bb] of ALC_BB){
      if (!(bb[0] < vb[2] && bb[2] > vb[0] && bb[1] < vb[3] && bb[3] > vb[1])) continue;
      const d = FONDO.mz.get(cve);
      if (d) abajo.push(new PolygonLayer({id:"fondo-mz-" + cve, data:d, getPolygon:p => p, getFillColor:hex(css("--fondo-manzana")), stroked:false, filled:true}));
      else if (!FONDO.pend.has(cve) && !FONDO.fallo.has(cve)){ FONDO.pend.add(cve);
        fondoLeer("fondo_manzanas_" + cve).then(pol => { FONDO.mz.set(cve, pol()); FONDO.pend.delete(cve); pintarCapas(); }).catch(() => { FONDO.pend.delete(cve); FONDO.fallo.add(cve); }); }
    }
    abajo.push(new PolygonLayer({id:"fondo-protegida", data:FONDO.base.protegida, getPolygon:d => d, getFillColor:verde, stroked:false, filled:true}),
      new PolygonLayer({id:"fondo-verde", data:FONDO.base.verde, getPolygon:d => d, getFillColor:verde, stroked:false, filled:true}),
      new PolygonLayer({id:"fondo-agua", data:FONDO.base.agua, getPolygon:d => d, getFillColor:hex(css("--fondo-agua")), stroked:false, filled:true}));
    for (let i = out.length - 1; i >= 0; i--){ const l = out[i];
      if (l && l.id === "col-fill" && z >= Z_ARB) out.splice(i, 1);
      else if (l && l.id === "cdmx-base") out[i] = l.clone({getFillColor:hex(css("--fondo-suelo")), updateTriggers:{getFillColor:"suelo"}}); }
  }
  const i = out.findIndex(l => l && (l.id === "col-fill" || l.id === "cdmx-base")); out.splice(i + 1, 0, ...abajo);
  if (z < 15.5){   // límite de las áreas protegidas: encima del verdor y de las manzanas, debajo de calles y límites
    /* v31g (Liber, 14 oct: el verde de las ANP se confundía con la rampa; muestras en https://claude.ai/artifact/XE6zEFs3e4eqGmxPxyQydM):
       contorno oscuro punteado sobre un halo blanco continuo. Se ve sobre cualquier clase del verdor, también con daltonismo, y no se
       parece al límite de colonia, que es continuo. */
    const borde = [new PolygonLayer({id:"fondo-protegida-halo", data:FONDO.base.protegida, getPolygon:d => d, filled:false, stroked:true, getLineColor:cA(K.blanco, 210), getLineWidth:4.5, lineWidthUnits:"pixels"}),
      new PolygonLayer({id:"fondo-protegida-borde", data:FONDO.base.protegida, getPolygon:d => d, filled:false, stroked:true, getLineColor:hex(css("--fondo-protegida-borde"), 235), getLineWidth:2, lineWidthUnits:"pixels",
        extensions:[PUNTEADO], getDashArray:[5, 3], dashJustified:true})];
    const j = out.findIndex(l => l && /^calles-|^colonias-funda$/.test(l.id)); out.splice(j < 0 ? i + 1 + abajo.length : j, 0, ...borde);
  }
  return out;
}
/* Nombres de las ANP y AVA: en su punto interior (polylabel) o, si sale de la vista, en la parte que se ve (posVisible); solo si el área
   mide en pantalla al menos 90 px de lado. En la fila de prioridad, después de las colonias y antes de las calles. Color según lo que
   tienen detrás (mínimo 4.5:1): verde hoja sobre fondos claros (de cerca y sobre el verdor 1 y 2), tinta sobre el verdor 3 y 4, blanco
   sobre el verdor 5 (con el tinte más tenue de z14–14.5, tinta también sobre el 5). */
const ANP_TONO = new Map();
function colEnPunto(p){ for (const d of COL_LBL){ const b = bbCol(d.i); if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue; for (const r of COL_GEO.get(d.i) || []) if (dentro(p, r)) return d.i; } return null; }
function nombresProtegidas(z, vb, zz, ocupadas){
  if (!FONDO.nom || !FONDO.base || z < Z_COL || z >= 18.5) return [];
  if (!FONDO.anillo) FONDO.anillo = FONDO.nom.map(([, lon, lat]) => { const g = FONDO.base.protegida.find(pol => dentro([lon, lat], pol[0])); return g ? g[0] : null; });
  const mpp = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), mx = (vb[2] - vb[0]) * .04, my = (vb[3] - vb[1]) * .06, T = 12.5, cajas = ocupadas.slice(), out = [];
  FONDO.nom.forEach(([n, lon, lat, ha, tipo], k) => {
    if (Math.sqrt(ha * 1e4) / mpp < 90) return;
    let pos = [lon, lat];
    if (!(lon > vb[0] + mx && lon < vb[2] - mx && lat > vb[1] + my && lat < vb[3] - my)){
      const r = FONDO.anillo[k]; if (!r) return;
      const bb = bbox([r]); if (!(bb[0] < vb[2] && bb[2] > vb[0] && bb[1] < vb[3] && bb[3] > vb[1])) return;
      pos = posVisible(r, pos, vb, z); if (!pos) return; }
    let t = n; if (n.length > 22){ const m = n.length / 2, a = n.lastIndexOf(" ", m), b = n.indexOf(" ", m), q = a < 0 ? b : b < 0 ? a : (m - a <= b - m ? a : b); if (q > 0) t = n.slice(0, q) + "\n" + n.slice(q + 1); }
    if (tipo === "anp") t = tx("mapa.anp_nombre", {nombre:t});   /* v31f (Liber): «Área Natural Protegida» en su renglón, arriba del nombre */
    const ls = t.split("\n"), c = cajaEnMundo(pos, ls, T, zz);
    if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) return;
    cajas.push(c);
    let tono = "hoja";
    if (z < Z_ARB){ const kk = n + "|" + pos[0].toFixed(3) + "," + pos[1].toFixed(3); let cl = ANP_TONO.get(kk);
      if (cl === undefined){ const ci = colEnPunto(pos), v = ci == null ? null : vCol(ci); cl = v == null ? 0 : CORTES_V.filter(x => v >= x).length; if (ANP_TONO.size > 500) ANP_TONO.clear(); ANP_TONO.set(kk, cl); }
      /* v31g: sobre el verdor, el nombre ya no va en verde (se confundía con la rampa): tinta sobre 1 a 3, «sin dato» y fuera de colonias;
         blanco sobre 4 y 5. De cerca (desde Z_ARB, sin verdor) sigue en el verde de las áreas protegidas. */
      tono = cl <= 2 || z >= 14 ? "tinta" : "blanco"; }
    out.push({pos, t, ls, tam:T, tono});
  });
  return out;
}
const ULT_CAPAS = {z:0, x:0, y:0, t:0};
/* v28k: opacidades que cambian poco a poco con el zoom (fundidos entre alcaldías, colonias y manzanas; límites de colonia que se atenúan).
   Mientras el dedo acerca o aleja, solo se ajustan estas (copias baratas de las capas ya hechas), cuadro por cuadro, sin rehacer lo demás. */
const tramo = (z, pts) => { if (z <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]){ const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (z - a) / (b - a); } return pts[pts.length - 1][1]; };
const OPACIDAD = [
  [/^alc-fill$/, z => tramo(z, [[11.2, 1], [11.8, 0]])],
  /* v31g: el verdor termina de irse antes de que lleguen el fondo, los parques y las áreas protegidas (antes se encimaban de 14 a 14.5
     y los parques en verde claro parecían colonias de la clase 1) */
  [/^col-fill$/, z => tramo(z, [[11.2, 0], [11.8, 1], [13.8, 1], [14.25, 0]])],
  [/^fondo-(mz-|verde$|agua$|protegida$)/, z => tramo(z, [[14.25, 0], [14.5, 1]])],
  [/^colonias-funda$/, z => tramo(z, [[14.5, 150], [16, 110], [17, 50], [17.3, 0]]) / 255],
  [/^colonias$/, z => tramo(z, [[11.5, 170], [12.2, 235], [14.5, 235], [16, 160], [17, 70], [17.3, 0]]) / 255]];
function conOpacidad(L, z){ return L.map(l => { if (!l) return l; for (const [re, f] of OPACIDAD) if (re.test(l.id)){ const o = Math.round(f(z) * 100) / 100; return l.clone({opacity:o, visible:o > 0}); } return l; }); }
/* v30g: una capa que aún no se ha visto no se le pasa al mapa: deck.gl preparaba sus datos y sus programas de dibujo aunque estuviera
   oculta (al llegar las calles, las de toda la ciudad: 1.5 a 3 s congelado en un celular de gama media). Desde que se ve una vez, se queda
   en la lista aunque se oculte (así no se vuelve a preparar al acercar y alejar). */
const YA_VISTAS = new Set();
const despiertas = L => L.filter(l => { if (!l) return false; if (l.props.visible !== false && l.props.opacity !== 0){ YA_VISTAS.add(l.id); return true; } return YA_VISTAS.has(l.id); });
let ULT_L = null, RAF_OPAC = 0;
const ajustarOpacidad = () => { if (RAF_OPAC || !ULT_L) return; RAF_OPAC = requestAnimationFrame(() => { RAF_OPAC = 0; dk.setProps({layers:despiertas(conOpacidad(ULT_L, vista.zoom || 10))}); }); };
function pintarCapas(){ if (!HAY_MAPA){ leyenda(); rotuloInfo(); return; }   /* v30: sin mapa no se arman capas (ni descargas por la vista) */
  Object.assign(ULT_CAPAS, {z:vista.zoom || 10, x:vista.longitude, y:vista.latitude, t:performance.now()}); ULT_L = capas(); dk.setProps({layers:despiertas(conOpacidad(ULT_L, vista.zoom || 10))}); leyenda(); rotuloInfo(); }
const CTRL = {doubleClickZoom:true, touchRotate:false, dragRotate:false, maxZoom:20.5, scrollZoom:{speed:1 / 300, smooth:true}, inertia:250};   // ~0.2 de zoom por muesca: entre Nueva York (1/450, se sentía lento aquí) y la anterior (1/250, brusca)
/* Sin WebGL el mapa no se puede dibujar: en su lugar va un aviso y todo se hace desde el panel (decisión de Liber, Lote 5). */
const HAY_MAPA = (() => { try { const c = document.createElement("canvas"), g = c.getContext("webgl2");   /* v30: deck.gl 9.4 solo usa WebGL 2; con WebGL 1 el mapa quedaba en blanco y sin aviso */
  if (g){ const x = g.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } return !!g; } catch { return false; } })();
function sinMapa(){ if (document.body.classList.contains("sin-mapa")) return; document.body.classList.add("sin-mapa");
  mapEl.parentElement.append(el("div", {class:"sin-mapa-aviso", role:"status"}, el("b", {texto:tx("mapa.sin_mapa_titulo")}), el("p", {texto:tx("mapa.sin_mapa")})));
  try { pantalla("info"); } catch {} }   /* al abrir aún no existe: 11_herramientas la pone después */
if (!HAY_MAPA) sinMapa();
const dk = !HAY_MAPA ? {setProps(){}, device:null} : new DeckGL({container:mapEl, initialViewState:vista, controller:{...CTRL, minZoom:9},   // sin WebGL no se crea el mapa (evita su error)
  useDevicePixels:Math.min(window.devicePixelRatio || 1, 1.5),
  pickingRadius:8,   // un toque a unos píxeles de un árbol también lo elige (v28i)   // pantallas de alta densidad: menos píxeles por dibujar
  getCursor:({isHovering}) => isHovering ? "pointer" : "grab",
  /* v30: si el mapa no puede dibujar (la tarjeta gráfica se niega o se pierde), aviso de sin mapa en lugar de un mapa en blanco */
  onError:e => { console.error(e); if (!dk.device || (dk.device.isLost && dk.device.isLost())) sinMapa(); },
  /* v30: un repintado pendiente se cancela si empieza otro gesto (antes podía caer a la mitad de un arrastre) */
  onInteractionStateChange:s => { if (!s) return; if (s.isDragging || s.isZooming || s.isPanning){ clearTimeout(T_CAPAS); return; }
    if (!s.inTransition){ clearTimeout(T_CAPAS); T_CAPAS = setTimeout(pintarCapas, 150); } },
  onViewStateChange:({viewState, interactionState}) => { vista = viewState; escala();
    // v28j: mientras el mapa se mueve, las capas se rehacen solo al cruzar un nivel en que cambia lo que se dibuja (alcaldías o colonias,
    // árboles, nombres de calle, arbolitos…; así, al alejar de un jalón no se quedan las colonias a escala de ciudad) o tras un salto grande
    // (una pantalla o un nivel de zoom); lo demás, al soltar (onInteractionStateChange). Antes se rehacían cada ~160 ms: en el celular el
    // arrastre se sentía trabado.
    const u = ULT_CAPAS, px = 256 * Math.pow(2, viewState.zoom) / 360, mov = Math.max(Math.abs(u.x - viewState.longitude), Math.abs(u.y - viewState.latitude)) * px;
    /* v30: durante un vuelo (elegir colonia o árbol, «Ciudad») solo los cambios grandes (alcaldías y colonias, árboles, arbolitos) rehacen
       todo; antes se cruzaban ~7 niveles en 800 ms, con descargas y nombres de calle a la mitad del vuelo */
    const nivel = interactionState && interactionState.inTransition ? z => [Z_COL, Z_ARB, Z_ICO].filter(n => z >= n).length : nivelZ;
    if (nivel(u.z) !== nivel(viewState.zoom)){ clearTimeout(T_CAPAS); pintarCapas(); }
    else if ((Math.abs(u.z - viewState.zoom) >= 1 || mov > Math.max(mapEl.clientWidth, mapEl.clientHeight)) && performance.now() - u.t > 400){ clearTimeout(T_CAPAS); pintarCapas(); }
    else if (Math.abs(u.z - viewState.zoom) > .01) ajustarOpacidad();
    return viewState; },
  onClick:info => {
    if (info.object && info.layer && info.layer.id.startsWith("arboles")){
      // Se abre directo el árbol tocado (la lista «Aquí hay N árboles juntos» se quitó en v25f: con el zoom a 20.5 se distinguen).
      if ((vista.zoom || 10) < Z_TOQUE){ acercarParaElegir(info.coordinate || [info.object.lng, info.object.lat]); return; }
      elegirArbol(info.object, {volar:false});
      return; }
    if (info.object && info.layer && info.layer.id.startsWith("patrimoniales")){ const t0 = TURNO; buscarIdc(info.object.id).then(a => { if (a && t0 === TURNO) elegirArbol(a, {volar:true}); }); return; }
    if (!info.coordinate) return;
    if (vista.zoom < Z_COL){ const a = alcaldiaEn(info.coordinate); if (a) elegirAlcaldia(a); return; }   // de lejos, primero la alcaldía
    // De cerca (escala de árboles) un toque fuera de un árbol no hace nada: antes, un toque fallido del otro lado de un límite cambiaba de
    // colonia, cerraba la ficha y alejaba el mapa (v28i).
    if (vista.zoom >= Z_ARB) return;
    const c = coloniaEn(info.coordinate); if (c !== null && c !== selCol) elegirColonia(c, {volar:true});
  },
  getTooltip:({object, layer}) => SIN_MOUSE.matches ? null : object && layer && layer.id === "alc-fill" ? {text:tx("mapa.globo_zona", {nombre:munNom(object.cve), verdor:pctTxt(vAlc(object.cve)), arboles:nArb(nAlc(object.cve))}), style:TIP}
    : object && layer && layer.id === "col-fill" ? {text:tx("mapa.globo_zona", {nombre:colTxt(object.i), verdor:pctTxt(vCol(object.i)), arboles:nArb(nCol(object.i))}), style:TIP}   /* v30h: con «Col.» (Liber) */
    : object && layer && layer.id.startsWith("patrimoniales") ? {text:tx("mapa.globo_patrimonial", {nombre:object.nombre, comun:object.comun}), style:TIP}
    : object && layer && layer.id.startsWith("arboles") ? {text:(object.pat ? tx("mapa.arbol_patrimonial") : tx("mapa.arbol")) + (object.calle ? tx("mapa.en_calle", {calle:object.calle}) : "") + "\n" + (guardianes(object) ? guardianes(object) + (guardianes(object) === 1 ? tx("mapa.persona_lo_cuida") : tx("mapa.personas_lo_cuidan")) : tx("general.espera_quien_lo_cuide")), style:TIP} : null,
  layers:[]});
addEventListener("online", () => { if (FALLO_ALC.size){ FALLO_ALC.clear(); pintarMapa(); } });   /* v30: al volver la conexión se reintentan las alcaldías que fallaron */
/* Dedos «fantasma» (pruebas de Liber en iPhone: v28k, «se traba y luego con un solo dedo puedo hacer zoom»; v29, «se queda congelado:
   puedo picar botones pero no pellizcar ni arrastrar el mapa»). El mapa lleva una lista de los dedos puestos y quita cada uno cuando el
   navegador avisa que se levantó; si ese aviso se pierde, el dedo se queda en la lista: con uno de más, un dedo pellizca; con dos de más,
   ningún gesto se reconoce. v28k vigilaba los dedos desde afuera; desde v29 se revisa la lista del propio mapa (eventManager de deck.gl)
   y, cuando ya no queda ningún dedo en la pantalla, al empezar un toque nuevo como primer dedo o al salir de la página, se le avisa que
   los que siguieran ahí se levantaron. */
if (HAY_MAPA){
  const dedosDelMapa = () => { try { return dk.eventManager.manager.input.store; } catch { return null; } };
  const soltar = salvo => { const st = dedosDelMapa(); if (!st || !st.length) return;
    for (const id of st.map(x => x.pointerId).filter(id => id !== salvo)) window.dispatchEvent(new PointerEvent("pointercancel", {pointerId:id, pointerType:"touch", bubbles:true})); };
  mapEl.addEventListener("pointerdown", e => { if (e.isPrimary) soltar(e.pointerId); }, true);
  for (const t of ["touchend", "touchcancel"]) addEventListener(t, e => { if (!e.touches.length) setTimeout(() => soltar(), 0); }, true);
  addEventListener("blur", () => soltar()); document.addEventListener("visibilitychange", () => { if (document.hidden) soltar(); });
}
const pintarMapa = () => { escala(); pintarCapas(); };

