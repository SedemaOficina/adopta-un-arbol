/* ================= estado ================= */
let selAlc = null, selCol = null, selArb = null, tab = "arboles", filtroCalle = "", filtroG = "todos", verTodos = false, calleAbierta = null, cuadraAbierta = null, verCalles = false, nCalle = 40, verCols = false, fichaExtra = null;

/* ================= mapa ================= */
const {DeckGL, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer, IconLayer, WebMercatorViewport, FlyToInterpolator} = deck;
/* Etiquetas que no se enciman: se colocan de mayor a menor prioridad y se omite la que choca con una ya puesta.
   Se calcula en píxeles al zoom actual (no depende de hacia dónde se mueva el mapa). Sustituye al filtro de colisión de deck.gl, que no se comportó igual en todos los navegadores. */
const VP_ETQ = new Map();
function sinEncimar(items, texto, tamano, z, prioridad){
  const zz = Math.round(z * 5) / 5, clave = items.length + "|" + zz + "|" + tamano + "|" + (items[0] && texto(items[0]));
  if (VP_ETQ.has(clave)) return VP_ETQ.get(clave);
  const vp = new WebMercatorViewport({longitude:-99.13, latitude:19.4, zoom:zz, width:2, height:2}), cajas = [], out = [];
  for (const d of [...items].sort((a, b) => prioridad(b) - prioridad(a))){
    const [x, y] = vp.project(d.pos), ls = texto(d).split("\n"), w = Math.max(...ls.map(l => l.length)) * tamano * .58 + 10, h = ls.length * tamano * 1.15 + 6;
    const c = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) continue;
    cajas.push(c); out.push(d);
  }
  if (VP_ETQ.size > 60) VP_ETQ.clear();
  VP_ETQ.set(clave, out); return out;
}
const hex = (h, a = 255) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const K = {guinda:hex(css("--guinda")), dorado:hex(css("--dorado")), pat:hex(css("--pat")), hoja:hex(css("--hoja")), arbol:hex(css("--arbol")), gris:hex(css("--ink-2")), blanco:[255,255,255,255],
  calle:hex(css("--map-calle")), col:hex(css("--map-col")), alc:hex(css("--map-alc")), foco:hex(css("--focus")), loc:hex(css("--loc"))};
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
  if (selCol === null || !calleAbierta) return [];
  const k = selCol + "|" + calleAbierta + "|" + (cuadraAbierta || ""); if (CALLE_CACHE.k === k) return CALLE_CACHE.data;
  let arbs = arbolesDe(selCol).filter(a => calleTexto(a) === calleAbierta);
  if (cuadraAbierta && cuadraAbierta.startsWith(calleAbierta + "|")){ const cs = cuadrasDe(calleAbierta, arbs), c = cs && cs.find(x => calleAbierta + "|" + x.etq === cuadraAbierta); if (c) arbs = c.arbs; }
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
  MINZ = Math.max(8, z - .05);
  dk.setProps({controller:{...CTRL, minZoom:MINZ}});
}
addEventListener("resize", () => requestAnimationFrame(fijarMinZoom));
function volar(b, pad, zmin){
  if (!b) return;
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches, e = encuadre(b, pad);
  if (zmin && e.zoom < zmin) e.zoom = zmin;
  vista = {...e, transitionDuration:reducido ? 0 : 800, transitionInterpolator:reducido ? undefined : new FlyToInterpolator()};
  dk.setProps({initialViewState:vista});
}
/* Calles en bloques por alcaldía (vienen ordenadas así): solo se dibujan las que están a la vista. */
/* Calles del mapa: ejes de vialidad INEGI 2020, una línea por calle. Por alcaldía y clase (0 peatonal, 1 calle, 2 avenida, 3 vía rápida). */
const CALLES = [];   // se llena al llegar las calles (armarCapasCalles)
function armarCapasCalles(){ let a = 0;
  for (const [cve, ns] of P.callesMun){ const bb = bbox(ALC.find(x => x.cve === cve).polys);
    ns.forEach((n, k) => { if (!n){ return; } const b = a + n, o = FS[a];
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
/* Simbología B: de cerca, cada árbol es un arbolito verde (morado y más grande si es patrimonial);
   los que ya tienen guardián llevan una insignia guinda con cuántas personas lo cuidan. Se dibuja una sola vez en un lienzo (atlas). */
const ARBOLITO = {arb:{copa:"#4E9A63", tronco:"#2E6B42"}, pat:{copa:"#8D4992", tronco:"#5E2E63"}};
function trazarArbolito(c, x, y, k, col){
  c.save(); c.translate(x, y); c.scale(k, k); c.lineWidth = 1.6; c.strokeStyle = "#FFFFFF"; c.fillStyle = col.copa;
  for (const [cx, cy, r] of [[12, 9.5, 8], [6.5, 13, 5], [17.5, 13, 5]]){ c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.stroke(); }
  for (const [cx, cy, r] of [[12, 9.5, 8], [6.5, 13, 5], [17.5, 13, 5], [12, 12, 6.5]]){ c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(9.8, 15.6, 4.4, 11.2, 1.8); c.fill();
  c.fillStyle = col.tronco; c.beginPath(); c.roundRect(10.6, 16, 2.8, 10, 1.2); c.fill(); c.restore();
}
const ATLAS = (() => { const S = 4, W = 26 * S, H = 30 * S, cv = document.createElement("canvas"); cv.width = W * 2; cv.height = H;
  const c = cv.getContext("2d"); trazarArbolito(c, S, S, S, ARBOLITO.arb); trazarArbolito(c, W + S, S, S, ARBOLITO.pat);
  return {img:cv, map:{arb:{x:0, y:0, width:W, height:H, mask:false}, pat:{x:W, y:0, width:W, height:H, mask:false}}}; })();
function arbolitoSVG(pat, n){
  const col = pat ? ARBOLITO.pat : ARBOLITO.arb, s = el("span", {class:"mk-ico" + (pat ? " pat" : ""), "aria-hidden":"true"});
  s.innerHTML = '<svg viewBox="0 0 24 28" overflow="visible"><g fill="' + col.copa + '" stroke="#fff" stroke-width="1.6"><circle cx="12" cy="9.5" r="8"/><circle cx="6.5" cy="13" r="5"/><circle cx="17.5" cy="13" r="5"/></g><circle cx="12" cy="12" r="6.5" fill="' + col.copa + '"/><rect x="10.6" y="16" width="2.8" height="10" rx="1.2" fill="' + col.tronco + '"/></svg>';
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
const ALC_LBL = ALC.map(a => { const g = a.polys.reduce((m, p) => p.length > m.length ? p : m, a.polys[0]); return {pos:centro([g]), t:a.nom, cve:a.cve, ...tam([g])}; });
const COL_LBL = [...COL_GEO].map(([i, paths]) => ({pos:centro(paths, 12), t:COLONIAS[i] ? COLONIAS[i].n : "", i, ...tam(paths)}));
const STL = new Map(), ETQ_CALLE = {k:"", d:[]};
/* Juego de caracteres fijo para todas las etiquetas: con characterSet "auto" deck rehace el atlas de letras cada vez que cambian los datos, y eso traba el zoom. */
let CHARS_ = null;
const CHARS = () => CHARS_ || (CHARS_ = [...new Set([...P.names, ...INV.calles, ...COLS.map(c => COLONIAS[c.i] ? COLONIAS[c.i].n : ""), ...ALC.map(a => a.nom), "0123456789,.+-–«»°%() árboles"].join(""))].join(""));
/* Etiquetas de calle como en Nueva York: sobre el EJE de la calle (no sobre una acera) y repetidas a lo largo de ella.
   El inventario INEGI trae frentes de manzana, no ejes: el eje se aproxima con el punto medio entre los dos frentes que se miran. */
const SIN_NOMBRE = /ninguno|^sin nombre$/i;
function etiquetasCalle(c){
  if (STL.has(c)) return STL.get(c);
  const KX = 105000, KY = 110700, porNombre = new Map();
  for (const i of frentesDe(c)){
    if (FN[i] < 0 || SIN_NOMBRE.test(P.names[FN[i]] || "")) continue;
    const a = FS[i], b = FS[i + 1] - 1, x0 = FPOS[2*a] * KX, y0 = FPOS[2*a+1] * KY, x1 = FPOS[2*b] * KX, y1 = FPOS[2*b+1] * KY, L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 12) continue;
    const f = {x0, y0, x1, y1, L, ux:(x1 - x0) / L, uy:(y1 - y0) / L, mx:(x0 + x1) / 2, my:(y0 + y1) / 2};
    const arr = porNombre.get(FN[i]); if (arr) arr.push(f); else porNombre.set(FN[i], [f]);
  }
  const out = [];
  for (const [n, fs] of porNombre){
    // Los ejes vienen cortados en cada cruce: se encadenan los tramos seguidos y casi rectos de la misma calle,
    // para que una etiqueta "quepa" en la cuadra y la calle se lea como una sola.
    const llave = (x, y) => Math.round(x / 3) + "," + Math.round(y / 3), ext = new Map();
    for (const f of fs) for (const k of [llave(f.x0, f.y0), llave(f.x1, f.y1)]){ const l = ext.get(k); if (l) l.push(f); else ext.set(k, [f]); }
    const visto = new Set();
    for (const f0 of fs){
      if (visto.has(f0)) continue;
      const cadena = [f0]; visto.add(f0);
      for (const lado of [0, 1]){   // crecer hacia ambos extremos
        let f = f0, punta = lado ? [f0.x1, f0.y1] : [f0.x0, f0.y0];
        for (;;){
          const cand = (ext.get(llave(...punta)) || []).filter(g => !visto.has(g) && Math.abs(f.ux * g.ux + f.uy * g.uy) > .9);
          if (!cand.length) break;
          const g = cand[0]; visto.add(g); cadena.push(g);
          const d0 = Math.hypot(g.x0 - punta[0], g.y0 - punta[1]), d1 = Math.hypot(g.x1 - punta[0], g.y1 - punta[1]);
          punta = d0 < d1 ? [g.x1, g.y1] : [g.x0, g.y0]; f = g;
        }
      }
      const Lc = cadena.reduce((t, g) => t + g.L, 0);
      for (const f of cadena){
        // Frente de enfrente (avenidas con camellón dibujadas como dos ejes): la etiqueta va entre ambos.
        let mejor = null, dMin = 45;
        for (const g of fs){ if (cadena.includes(g) || Math.abs(f.ux * g.ux + f.uy * g.uy) < .92) continue;
          const t = (f.mx - g.x0) * g.ux + (f.my - g.y0) * g.uy; if (t < -5 || t > g.L + 5) continue;
          const px = g.x0 + g.ux * t, py = g.y0 + g.uy * t, d = Math.hypot(f.mx - px, f.my - py);
          if (d > 5 && d < dMin){ dMin = d; mejor = [px, py]; } }
        const cx = mejor ? (f.mx + mejor[0]) / 2 : f.mx, cy = mejor ? (f.my + mejor[1]) / 2 : f.my;
        let g = Math.atan2(f.uy, f.ux) * 180 / Math.PI; if (g > 90) g -= 180; if (g < -90) g += 180;
        out.push({t:P.names[n], pos:[cx / KX, cy / KY], ang:g, L:Lc, Lt:f.L, eje:1});
      }
    }
  }
  out.sort((x, y) => (y.eje - x.eje) || (y.L - x.L));
  STL.set(c, out); return out;
}
/* Elige qué etiquetas se ven a este zoom: la etiqueta cabe en su tramo, la misma calle se repite cada ~260 px y ninguna se encima con otra. */
function colocarEtiquetasCalle(cands, z, tam, obst = []){
  const vp = new WebMercatorViewport({longitude:-99.13, latitude:19.4, zoom:z, width:2, height:2}), mpp = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z);
  const cajas = [], visto = new Map(), out = [];
  // Las etiquetas de colonia ocupan su lugar primero (con margen): ninguna calle se escribe encima.
  for (const o of obst){ const [x, y] = vp.project(o.pos), w = Math.max(...o.ls.map(l => l.length)) * o.tam * .6 + 16, h = o.ls.length * o.tam * 1.3 + 12; cajas.push([x - w / 2, y - h / 2, x + w / 2, y + h / 2]); }
  for (const d of cands){
    const w = d.t.length * tam * .56 + 8, h = tam + 6;
    if (d.L / mpp < w * 1.1 || d.Lt / mpp < w * .45) continue;
    const [x, y] = vp.project(d.pos), mias = visto.get(d.t) || [];
    if (mias.some(([a, b]) => Math.hypot(a - x, b - y) < 260)) continue;
    const r = d.ang * Math.PI / 180, cw = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r)), ch = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
    const c = [x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2];
    if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) continue;
    cajas.push(c); mias.push([x, y]); visto.set(d.t, mias); out.push(d);
  }
  return out;
}
const COL_BB = new Map();
const bbCol = i => { if (!COL_BB.has(i)) COL_BB.set(i, bbox(COL_GEO.get(i) || [])); return COL_BB.get(i); };
/* Simbología: relleno = ya tiene guardián; solo contorno = espera guardián. */
const est = a => { const con = guardianes(a) > 0;
  return a.pat ? (con ? {f:K.guinda, s:K.pat, r:4.6, w:3} : {f:K.pat, s:K.blanco, r:4.6, w:1.5}) : (con ? {f:K.guinda, s:K.blanco, r:3.6, w:1.5} : {f:K.arbol, s:K.blanco, r:3.2, w:1}); };
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
function capas(){ const t0 = performance.now(), L = capasArmar(); if (window.__PERF) window.__PERF.push([Math.round((vista.zoom || 0) * 10) / 10, Math.round(performance.now() - t0), L.filter(Boolean).map(l => l.id).join(",")]); return L; }
function capasArmar(){
  const z = vista.zoom || 10;
  let etqCol = [];   // etiquetas de colonia de este cuadro: las de calle las esquivan
  const L = [
    // Las calles solo se dibujan de cerca: a escala de ciudad no se distinguen y cargan de más al teléfono.
    ...callesCapas(z),
    // Límites de colonia encima de las calles, con la misma «funda» que las alcaldías pero más fina: la línea verde oscuro los distingue de las calles blancas.
    z >= Z_COL && new PathLayer({id:"colonias-funda", data:COL_PATHS, getPath:d => d.path, getColor:[255,255,255,z < Z_ARB ? 150 : 110], getWidth:3.6, widthUnits:"pixels", jointRounded:true}),
    z >= Z_COL && new PathLayer({id:"colonias", data:COL_PATHS, getPath:d => d.path, getColor:[24,48,34,z < 12 ? 170 : z < Z_ARB ? 235 : 160], getWidth:1.6, widthUnits:"pixels", jointRounded:true}),
    // Límites de alcaldía con "funda": franja blanca ancha y línea oscura encima, para que se lean sobre cualquier verde.
    new PathLayer({id:"alcaldias-funda", data:ALC_PATHS, getPath:d => d.path, getColor:[255,255,255,z < Z_COL ? 235 : 200], getWidth:z < Z_COL ? 4.5 : 4, widthUnits:"pixels", jointRounded:true}),
    new PathLayer({id:"alcaldias", data:ALC_PATHS, getPath:d => d.path, getColor:[38,62,48,z < Z_COL ? 230 : 190], getWidth:z < Z_COL ? 1.6 : 1.4, widthUnits:"pixels", jointRounded:true})];
  // Ciudad: alcaldías en verdes por número de árboles. Alcaldía: sus colonias en verdes. (Como el mapa de árboles de Nueva York.)
  // Como el mapa de Nueva York, todo depende del zoom, no de lo elegido: lejos, alcaldías; más cerca, TODAS las colonias; de cerca, TODOS los árboles a la vista.
  const vb = limitesVista();
  if (z < Z_COL){
    L.unshift(new PolygonLayer({id:"alc-fill", data:ALC_POLY, getPolygon:d => d.p, getFillColor:d => [...colorV(vAlc(d.cve)), 235], stroked:false, filled:true, pickable:true}));
  } else {
    const alfa = z < 14 ? 225 : z < 15 ? 140 : 70;
    L.unshift(new PolygonLayer({id:"col-fill", data:COL_POLY, getPolygon:d => d.p, getFillColor:d => [...colorV(vCol(d.i)), alfa], stroked:false, filled:true, pickable:true, updateTriggers:{getFillColor:alfa}}));
  }
  // Suelo claro solo dentro de la Ciudad: lo de alrededor queda en gris (fondo del contenedor).
  L.unshift(new PolygonLayer({id:"cdmx-base", data:ALC_POLY, getPolygon:d => d.p, getFillColor:hex(css("--map-ground")), stroked:false, filled:true}));
  if (selAlc !== null) L.push(new PathLayer({id:"alc-sel", data:ALC.find(a => a.cve === selAlc).polys.map(p => ({path:p})), getPath:d => d.path, getColor:selCol === null ? K.guinda : [...K.guinda.slice(0, 3), 120], getWidth:selCol === null ? 3 : 2, widthUnits:"pixels"}));
  if (selCol !== null) L.push(new PolygonLayer({id:"col-sel", data:(COL_GEO.get(selCol) || []).map(p => ({p})), getPolygon:d => d.p, getLineColor:K.guinda, getLineWidth:2.5, lineWidthUnits:"pixels", stroked:true, filled:false}));
  const conCifra = (t, n) => t + "\n" + fmt.format(n || 0) + " árboles";
  // Una etiqueta solo aparece si su pieza mide en pantalla lo suficiente a este zoom; además no se enciman (filtro de colisión).
  const mpp = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), cabe = (d, px) => d.w / mpp > px && d.h / mpp > px * .5;
  const BLANCO = {getColor:[255,255,255,255], outlineColor:[30,58,38,235], outlineWidth:3, fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:CHARS(), fontSettings:{sdf:true}, lineHeight:1.12};
  const enVista = d => d.pos[0] > vb[0] && d.pos[0] < vb[2] && d.pos[1] > vb[1] && d.pos[1] < vb[3];
  // Texto oscuro con halo blanco sobre los verdes claros; blanco con halo oscuro sobre los verdes oscuros. Dos renglones: nombre y cifra.
  const dosRenglones = (id, data, nombre, cifra, tam, claro) => {
    const tinta = claro ? [24,52,36,255] : [255,255,255,255], halo = claro ? [255,255,255,235] : [20,48,33,235];
    const base = {data, getPosition:d => d.pos, characterSet:CHARS(), fontSettings:{sdf:true, fontSize:64, buffer:10, radius:16, cutoff:.22}, outlineColor:halo, getColor:tinta};
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
    const texto = d => d.chica ? (PARTIR[d.cve] || d.t) + "\n" + fmt.format(nAlc(d.cve)) : (PARTIR[d.cve] && z < 10.8 ? PARTIR[d.cve] : d.t) + (chico ? "" : "\n" + fmt.format(nAlc(d.cve)) + " árboles");
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
      const tinta = claro ? [24,52,36,255] : [255,255,255,255], halo = claro ? [255,255,255,240] : [20,48,33,240];
      const base = {getPosition:d => d.pos, fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:CHARS(), fontSettings:{sdf:true, fontSize:64, buffer:10, radius:16, cutoff:.22}, outlineWidth:2.4, outlineColor:halo, getColor:tinta, lineHeight:1.05};
      const mios = datos.filter(d => (claseV(vAlc(d.cve)) <= 2) === claro);
      L.push(new TextLayer({...base, id:"lbl-alc-" + claro, data:mios.filter(d => !d.chica), getText:texto, getSize:chico ? 10.5 : t, updateTriggers:{getText:[z < 10.8, chico]}}));
      if (!chico) L.push(new TextLayer({...base, id:"lbl-alc-chica-" + claro, data:mios.filter(d => d.chica), getText:texto, getSize:tc}));
    }
  }

  else if (z < 15){ const t = z < 13 ? 12 : 14, d0 = sinEncimar(COL_LBL.filter(d => COLONIAS[d.i] && enVista(d) && cabe(d, 64)), d => conCifra(d.t, nCol(d.i)), t, z, d => d.w * d.h);
    etqCol = d0.map(d => ({pos:d.pos, ls:[d.t, fmt.format(nCol(d.i)) + " árboles"], tam:t}));
    for (const claro of [true, false]) dosRenglones("lbl-col-" + claro, d0.filter(d => (z >= 14 || claseV(vCol(d.i)) <= 2) === claro), d => d.t, d => fmt.format(nCol(d.i)) + " árboles", t, claro); }
  else if (z < 16) L.push(new TextLayer({id:"lbl-col", data:(etqCol = sinEncimar(COL_LBL.filter(d => enVista(d) && cabe(d, 40)), d => d.t, 11, z, d => d.i === selCol ? 1e12 : d.w * d.h).map(d => ({...d, ls:[d.t], tam:11}))), getPosition:d => d.pos, getText:d => d.t, getSize:11, getColor:K.gris, fontFamily:"Roboto, sans-serif", characterSet:CHARS(), outlineWidth:3, outlineColor:[236,232,225,255], fontSettings:{sdf:true}}));
  // De cerca se ven todos los árboles de la alcaldía abierta; más lejos, solo los de la colonia elegida.
  let datosArb = [];
  // [id, datos, visible]. Las capas de las alcaldías ya cargadas se quedan vivas aunque no se vean (visible:false):
  // así, al acercarse o alejarse, deck no recalcula cientos de miles de árboles y el zoom no se traba.
  const capasArb = [];
  for (const A of ALC){ const bb = ALC_BB.get(A.cve), alaVista = !(bb[0] > vb[2] || bb[2] < vb[0] || bb[1] > vb[3] || bb[3] < vb[1]);
    const arr = ARB_ALC.get(A.cve);
    if (arr) capasArb.push(["arboles-" + A.cve, arr, z >= Z_ARB && alaVista]);
    else if (z >= Z_ARB && alaVista) cargarAlcaldia(A.cve).then(() => pintarMapa(), () => {}); }
  if (z < Z_ARB && selCol !== null && z >= 12.5){ datosArb = arbolesDe(selCol); capasArb.push(["arboles-col-" + selCol, datosArb, true]); }
  if (alcResalta && alcResalta !== selAlc){ const A = ALC.find(a => a.cve === alcResalta);
    if (A){ L.push(new PathLayer({id:"alc-resalta", data:A.polys.map(p => ({path:p})), getPath:d => d.path, getColor:[178,142,92,255], getWidth:4, widthUnits:"pixels"}));
      } }
  const tc = trazoCalle();
  if (tc.length) L.push(new PathLayer({id:"calle-sel", data:tc, getPath:d => d.path, getColor:[178,142,92,200], getWidth:4, widthUnits:"meters", widthMinPixels:3, widthMaxPixels:7, capRounded:true, jointRounded:true}));
  // Tamaño del arbolito en pantalla: 12 m de alto, entre 19 y 38 px; el patrimonial, 1.35 veces.
  const mppA = 156543.03 * Math.cos(19.4 * Math.PI / 180) / Math.pow(2, z), icoPx = Math.min(38, Math.max(19, 12 / mppA));
  // El atlas de arbolitos se sube a la tarjeta gráfica una sola vez, cuando el mapa ya tiene dispositivo; antes de eso se ven puntos.
  if (!ATLAS.tex){ try { const dv = dk.device; if (dv) ATLAS.tex = dv.createTexture({data:ATLAS.img, width:ATLAS.img.width, height:ATLAS.img.height, mipmaps:true, sampler:{minFilter:"linear", magFilter:"linear", mipmapFilter:"linear"}}); } catch (e) { ATLAS.tex = null; } }
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
      getPixelOffset:d => [icoPx * d.k * .36, -icoPx * d.k * .4], getColor:[255,255,255,255], fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:"0123456789+",
      background:true, getBackgroundColor:[157,33,72,255], backgroundPadding:[4, 1, 4, 1], backgroundBorderRadius:8, getBorderColor:[255,255,255,255], getBorderWidth:1.5,
      updateTriggers:{getText:verG, getPixelOffset:icoPx}}));
  }
  // Nombres de calle ENCIMA de los árboles, de TODAS las colonias a la vista, sobre el eje y repetidos a lo largo de la calle (como Nueva York).
  // Con una calle elegida, las demás se atenúan y la elegida lleva etiqueta propia.
  if (z >= 14.8){   // las etiquetas de calle esquivan las de colonia (etqCol)
    const tc2 = trazoCalle(), hay = tc2.length > 0, qn = hay ? plano(calleAbierta) : "";
    const tamC = Math.round((10.5 + 6.5 * (Math.pow(1.4, z - 10) - 1) / (Math.pow(1.4, 10) - 1)) * 10) / 10;
    const zz = Math.round(z * 5) / 5, cols = COL_LBL.filter(d => { const b = bbCol(d.i); return b[0] < vb[2] && b[2] > vb[0] && b[1] < vb[3] && b[3] > vb[1]; }).map(d => d.i).slice(0, 60);
    const clave = zz + "|" + cols.join(",") + "|" + qn + "|" + etqCol.map(d => d.ls[0]).join(",");
    if (clave !== ETQ_CALLE.k){
      const cands = cols.flatMap(i => etiquetasCalle(i)).filter(d => !hay || !(qn === plano(d.t) || qn.endsWith(" " + plano(d.t))));
      cands.sort((x, y) => (y.eje - x.eje) || (y.L - x.L));
      ETQ_CALLE.k = clave; ETQ_CALLE.d = colocarEtiquetasCalle(cands, zz, tamC, etqCol);
    }
    L.push(new TextLayer({id:"lbl-calles", data:ETQ_CALLE.d, getPosition:d => d.pos, getText:d => d.t, getAngle:d => d.ang, getSize:tamC, getColor:hay ? [110,112,114,140] : [84,86,88,255], fontFamily:"Roboto, sans-serif", fontWeight:500, characterSet:CHARS(), outlineWidth:4, outlineColor:[250,250,250,240], fontSettings:{sdf:true, radius:12, buffer:6}}));
  }
  if (selCol !== null && z >= 13.5){
    const tc2 = trazoCalle();
    if (tc2.length){ const lg = tc2.reduce((m, d) => d.path.length > m.path.length ? d : m, tc2[0]), mid = lg.path[Math.floor(lg.path.length / 2)];
      L.push(new TextLayer({id:"lbl-calle-sel", data:[{pos:mid, t:calleAbierta}], getPosition:d => d.pos, getText:d => d.t, getSize:15, getColor:[255,255,255,255], fontFamily:"Cabin, sans-serif", fontWeight:700, characterSet:CHARS(),
        background:true, getBackgroundColor:[107,78,30,235], backgroundPadding:[10, 6], getPixelOffset:[0, -22]})); }
  }
  if (selArb) L.push(conIcono
    ? new ScatterplotLayer({id:"arbol-sel", data:[selArb], getPosition:a => [a.lng, a.lat], getRadius:icoPx * (selArb.pat ? 1.35 : 1) * .66, radiusUnits:"pixels", filled:true, getFillColor:[36,48,42,28], stroked:true, getLineColor:[36,48,42,255], getLineWidth:2.5, lineWidthUnits:"pixels"})
    : new ScatterplotLayer({id:"arbol-sel", data:[selArb], getPosition:a => [a.lng, a.lat], getRadius:7, radiusUnits:"meters", radiusMinPixels:10, filled:false, stroked:true, getLineColor:[36,48,42,255], getLineWidth:3, lineWidthUnits:"pixels"}));
  if (miPos) L.push(new ScatterplotLayer({id:"yo", data:[miPos], getPosition:d => d, getRadius:6, radiusUnits:"pixels", getFillColor:K.loc, getLineColor:K.blanco, getLineWidth:2, lineWidthUnits:"pixels", stroked:true}));
  return L;
}
const pctTxt = v => v == null ? "sin dato" : fmt0.format(v) + " %";
const TIP = {font:"12px Roboto,sans-serif", background:"#fff", color:"#24262A", border:"1px solid #E2DDD5", borderRadius:"6px", padding:"6px 8px", whiteSpace:"pre"};
let LEY_ABIERTA = false;
function leyenda(){ leyendaContenido(); const lg = $("legend");
  lg.prepend(el("button", {type:"button", class:"lg-btn", "aria-expanded":String(LEY_ABIERTA), onclick:() => { LEY_ABIERTA = !LEY_ABIERTA; leyenda(); }}, LEY_ABIERTA ? "Ocultar simbología" : "Simbología"));
  lg.classList.toggle("plegada", !LEY_ABIERTA);
}
function leyendaContenido(){
  const lg = $("legend");
  const calleLg = () => calleAbierta && trazoCalle().length ? el("span", {class:"lg-calle"}, el("i", {"aria-hidden":"true"}), "Calle elegida: " + calleAbierta + (cuadraAbierta && cuadraAbierta.startsWith(calleAbierta + "|") ? " · " + cuadraAbierta.split("|")[1] : "")) : null;
  if ((vista.zoom || 10) < Z_ARB){
    lg.replaceChildren(el("span", {class:"lg-t", texto:"Verdor de las calles" + ((vista.zoom || 10) < Z_COL ? ", por alcaldía" : ", por colonia")}),
      el("div", {class:"rampa"}, "menos", VERDES.map(c => el("i", {style:"background:rgb(" + c.join(",") + ")"})), "más"),
      el("p", {class:"nota", texto:"Color: verdor medido por satélite (2025). Cifra: árboles del inventario de arbolado urbano."}));
    return;
  }
  if ((vista.zoom || 10) >= Z_ICO){
    lg.replaceChildren(el("span", {class:"lg-t", texto:"Árboles del inventario"}),
      el("span", {}, arbolitoSVG(false), "Espera quien lo cuide"), el("span", {}, arbolitoSVG(false, 3), "Ya lo cuidan: el número dice cuántas personas"),
      el("span", {}, arbolitoSVG(true), "Patrimonial"), el("span", {}, arbolitoSVG(true, 2), "Patrimonial que ya cuidan"),
      calleLg() || "", el("p", {class:"nota", texto:(vista.zoom || 10) >= Z_TOQUE ? "Toca un árbol para ver su ficha." : "Acerca el mapa para elegir un árbol."}));
    return;
  }
  lg.replaceChildren(el("span", {class:"lg-t", texto:"Árboles del inventario"}),
    el("span", {}, el("i", {class:"mk mk-arbol-con"}), "Ya lo cuidan"), el("span", {}, el("i", {class:"mk mk-arbol-sin"}), "Espera quien lo cuide"),
    el("span", {}, el("i", {class:"mk mk-pat-con"}), "Patrimonial que ya cuidan"), el("span", {}, el("i", {class:"mk mk-pat-sin"}), "Patrimonial que espera"), calleLg() || "",
    el("p", {class:"nota", texto:"Acércate más para ver cada árbol y cuántas personas lo cuidan."}));
}
let T_CAPAS = 0;
const ULT_CAPAS = {z:0, x:0, y:0};
function pintarCapas(){ Object.assign(ULT_CAPAS, {z:vista.zoom || 10, x:vista.longitude, y:vista.latitude}); dk.setProps({layers:capas()}); leyenda(); }
const CTRL = {doubleClickZoom:true, touchRotate:false, dragRotate:false, maxZoom:20.5, scrollZoom:{speed:1 / 300, smooth:true}, inertia:250};   // ~0.2 de zoom por muesca: entre Nueva York (1/450, se sentía lento aquí) y la anterior (1/250, brusca)
const dk = new DeckGL({container:mapEl, initialViewState:vista, controller:{...CTRL, minZoom:9},
  useDevicePixels:Math.min(window.devicePixelRatio || 1, 1.5),   // pantallas de alta densidad: menos píxeles por dibujar
  getCursor:({isHovering}) => isHovering ? "pointer" : "grab",
  onInteractionStateChange:s => { if (s && !s.isDragging && !s.isZooming && !s.isPanning && !s.inTransition){ clearTimeout(T_CAPAS); T_CAPAS = setTimeout(pintarCapas, 150); } },
  onViewStateChange:({viewState, interactionState}) => { vista = viewState; escala();
    // Se rehacen las capas al cambiar 0.2 de zoom o al moverse un tercio de pantalla desde la última vez (no desde el cuadro anterior: así un arrastre lento también actualiza).
    const u = ULT_CAPAS, px = 256 * Math.pow(2, viewState.zoom) / 360, mov = Math.max(Math.abs(u.x - viewState.longitude), Math.abs(u.y - viewState.latitude)) * px;
    if (Math.floor(u.z * 5) !== Math.floor(viewState.zoom * 5) || mov > (mapEl.clientWidth || 800) / 3){ clearTimeout(T_CAPAS); T_CAPAS = setTimeout(pintarCapas, 90); }
    return viewState; },
  onClick:info => {
    if (info.object && info.layer && info.layer.id.startsWith("arboles")){
      // Se abre directo el árbol tocado (la lista «Aquí hay N árboles juntos» se quitó en v25f: con el zoom a 20.5 se distinguen).
      if ((vista.zoom || 10) < Z_TOQUE){ acercarParaElegir(info.coordinate || [info.object.lng, info.object.lat]); return; }
      elegirArbol(info.object, {volar:false});
      return; }
    if (info.object && info.layer && info.layer.id.startsWith("patrimoniales")){ buscarIdc(info.object.id).then(a => a && elegirArbol(a, {volar:true})); return; }
    if (!info.coordinate) return;
    if (vista.zoom < Z_COL){ const a = alcaldiaEn(info.coordinate); if (a) elegirAlcaldia(a); return; }   // de lejos, primero la alcaldía
    const c = coloniaEn(info.coordinate); if (c !== null && c !== selCol) elegirColonia(c, {volar:true});
  },
  getTooltip:({object, layer}) => object && layer && layer.id === "alc-fill" ? {text:munNom(object.cve) + "\nVerdor de las calles: " + pctTxt(vAlc(object.cve)) + "\n" + fmt.format(nAlc(object.cve)) + " árboles registrados", style:TIP}
    : object && layer && layer.id === "col-fill" ? {text:COLONIAS[object.i].n + "\nVerdor de las calles: " + pctTxt(vCol(object.i)) + "\n" + fmt.format(nCol(object.i)) + " árboles registrados", style:TIP}
    : object && layer && layer.id.startsWith("patrimoniales") ? {text:"Árbol patrimonial «" + object.nombre + "»\n" + object.comun, style:TIP}
    : object && layer && layer.id.startsWith("arboles") ? {text:(object.pat ? "Árbol patrimonial" : "Árbol") + (object.calle ? " en " + object.calle : "") + "\n" + (guardianes(object) ? guardianes(object) + (guardianes(object) === 1 ? " persona lo cuida" : " personas lo cuidan") : "Espera quien lo cuide"), style:TIP} : null,
  layers:[]});
function globo(){ const g = $("globo"); if (g) g.hidden = true; }   // el verdor de la colonia ya está en el panel
const pintarMapa = () => { escala(); pintarCapas(); requestAnimationFrame(globo); };

