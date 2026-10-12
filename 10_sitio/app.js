/* Configuración de Guardianes de árboles. Direcciones: viven aquí y en ningún otro lugar. null = liga pendiente.
   MODO lo escribe armar.py en <html data-modo>: "prueba" (python armar.py) o "produccion" (python armar.py --produccion).
   Prueba: personas guardianas simuladas, aviso «Versión de prueba» y casos «Para probar». Producción: nada de eso.
   VERSION y FECHA_VERSION las escribe armar.py (constantes al principio de armar.py). */
window.LOGO_INST = "img/logo_inst.png";   // logo institucional (tablero I): Gobierno CDMX · SEDEMA · SIA
window.EMBLEMA_PAT = "img/emblema_patrimoniales.png";   // emblema de Árboles Patrimoniales de la Ciudad de México
window.CONFIG = (() => {
  const POR_MODO = {
    prueba:     {URL_SITIO: "https://sedemaoficina.github.io/adopta-un-arbol/", SIMULAR_GUARDIANES: true},   // GitHub Pages (Lote 6)
    produccion: {URL_SITIO: "https://sedema.sia.cdmx.gob.mx/adopta-un-arbol/",  SIMULAR_GUARDIANES: false}   // SIA (Lote 7)
  };
  const MODO = POR_MODO[document.documentElement.dataset.modo] ? document.documentElement.dataset.modo : "prueba";
  return {
    MODO, VERSION:"31b", FECHA_VERSION:"12 de octubre de 2026", ...POR_MODO[MODO],   // URL_SITIO: liga para compartir y QR (+ "#arbol-<clave>"); SIMULAR_GUARDIANES: ~20 % de árboles con guardianes al azar (fijo por árbol) y casos de ejemplo
    URL_PATRIMONIALES: "https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/",   // la ficha de cada ejemplar es arbol-<clave>.html
    GOOGLE_MAPS_EMBED_KEY: null,   // con clave de Google Maps Embed (de SEDEMA), la ficha muestra Street View dentro de la página
    STREET_VIEW_SIN_CLAVE: true,   // sin clave: Street View dentro de la ficha con la liga pública de Google (no oficial)
    CORTE_INVENTARIO: "octubre de 2026"
  };
})();
(async function(){
"use strict";
/* ================= utilidades ================= */
const $ = id => document.getElementById(id);
for (const i of document.querySelectorAll(".logo-src")) i.src = window.LOGO_INST;
const C = window.CONFIG;
/* Textos: todos viven en textos.js (window.TEXTOS). tx("clave") devuelve el texto; tx("clave", {n:3}) cambia {n} por 3. */
const T = window.TEXTOS || {};
const tx = (k, d) => { const s = T[k]; if (s == null){ console.error("Falta el texto «" + k + "» en textos.js"); return k; }
  return d ? s.replace(/\{(\w+)\}/g, (m, n) => n in d ? String(d[n]) : m) : s; };
const fmt = new Intl.NumberFormat("es-MX"), fmt0 = new Intl.NumberFormat("es-MX", {maximumFractionDigits:0}), fmt1 = new Intl.NumberFormat("es-MX", {minimumFractionDigits:1, maximumFractionDigits:1});
const fechaHoy = () => { const d = new Date(); return tx("general.fecha", {dia:d.getDate(), mes:tx("general.meses").split(",")[d.getMonth()], anio:d.getFullYear()}); };
/* v30: «1 árbol» en singular (antes «1 árboles») */
const nArb = n => n === 1 ? tx("general.un_arbol") : !n ? tx("general.sin_arboles") : tx("general.n_arboles", {n:fmt.format(n)});   /* v30h: con 0, «aún sin árboles» (decisión de Liber) */
const plano = t => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esTel = () => matchMedia("(max-width:860px)").matches;
// La ciudad entera: en celular deja libre la franja de la tarjeta de arriba y la columna de botones de la derecha.
const padCiudad = () => esTel() ? {top:70, left:14, right:56, bottom:66} : 20;   /* v29: abajo, el botón «Buscar tu árbol» */
function el(tag, at, ...hijos){
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(at || {})){
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v; else if (k === "texto") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (k === "style") n.style.cssText = v; else n.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat(Infinity)) if (h !== null && h !== undefined && h !== false) n.append(h.nodeType ? h : document.createTextNode(h));
  return n;
}
/* Carga un script de vendor/ solo cuando hace falta (una sola vez). Así jsPDF y el QR no pesan al abrir la página. */
const cargarScript = (() => { const hechos = {}; return src => hechos[src] || (hechos[src] = new Promise((ok, mal) => {
  const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete hechos[src]; mal(new Error("No se pudo cargar " + src)); };
  document.head.append(s); })); })();
/* v30 (auditoría): lo leído debe ser del mismo tipo que el valor por omisión (arreglo u objeto); antes, un dato dañado («{}» donde va un
   arreglo) impedía abrir el sitio en ese navegador. */
const leerLocal = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k));
  return v == null || Array.isArray(v) !== Array.isArray(d) || typeof v !== typeof d ? d : v; } catch { return d; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
/* Colores: los tokens de css/estilos.css (:root) son la única fuente; el código los lee con css("--token") y hex() los pasa a [r, g, b, a]. */
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const hex = (h, a = 255) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
/* ================= datos ================= */
const setLoad = (msg, p) => { $("load-msg").textContent = msg; $("load-bar").style.width = (p * 100) + "%"; };
const deBase64 = t => { const s = atob(t.trim()), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
/* v30g: el trabajo largo (calles y árboles) va por pedazos de ~8 ms y entre uno y otro la pantalla responde (antes se congelaba de 0.5 a 1 s
   en un celular de gama media). ceder() da el turno sin el freno de los temporizadores en pestañas ocultas. */
const ceder = () => window.scheduler && scheduler.yield ? scheduler.yield() : new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const ratos = () => { let t0 = performance.now(); return async () => { if (performance.now() - t0 > 8){ await ceder(); t0 = performance.now(); } }; };
async function deBase64EnRatos(t){ const s = atob(t.trim()), u = new Uint8Array(s.length), pausa = ratos();
  for (let i = 0; i < s.length; i += 65536){ const fin = Math.min(s.length, i + 65536); for (let k = i; k < fin; k++) u[k] = s.charCodeAt(k); await pausa(); }
  return u; }
/* Todo el archivo entra de una vez: en pedazos (Blob.stream) la descompresión espera turno entre cuadro y cuadro del mapa
   y, con el mapa en movimiento, tardaba segundos en lugar de milisegundos (medido en el Lote 4.2). */
async function gunzip(b){ const ds = new DecompressionStream("gzip"), w = ds.writable.getWriter(); w.write(b).catch(() => {}); w.close().catch(() => {}); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
/* Lote 4.2: las calles (2.3 MB) se descargan aparte (datos/calles.txt) y en paralelo. El panel y el mapa de alcaldías y colonias
   aparecen sin esperarlas; al llegar, se agregan sus capas, etiquetas, cuadras y el buscador de calles (ver «calles» en el arranque). */
const conVersion = ruta => ruta + "?v=" + C.VERSION;   // el navegador no mezcla archivos de versiones distintas
/* v30: los errores que puede ver la persona van en español (textos.js) y marcados con paraPersona; los demás se cambian por uno general (cierre.txt) */
const errorPersona = t => Object.assign(new Error(t), {paraPersona:true});
if (!("DecompressionStream" in window)) throw errorPersona(tx("carga.navegador_viejo"));   /* Safari anterior a 16.4 */
const coloniasTexto = fetch(conVersion("datos/colonias.txt")).then(r => { if (!r.ok) throw errorPersona(tx("carga.error_colonias")); return r.text(); }, () => { throw errorPersona(tx("carga.error_colonias")); });
const callesTexto = fetch(conVersion("datos/calles.txt")).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
callesTexto.catch(() => {});   // el error se atiende en el arranque
setLoad(tx("carga.descomprimiendo_colonias"), .1);
const P = JSON.parse(new TextDecoder().decode(await gunzip(deBase64(await coloniasTexto))));
const Q = P.Q, PROM = P.prom;
setLoad(tx("carga.preparando_el_mapa"), .4); await new Promise(r => setTimeout(r, 16));
/* Ejes de vialidad (INEGI 2020): NF tramos; FN nombre, FC colonia, FS inicio de sus vértices en FPOS (lng, lat). Vacíos hasta que llegan. */
let NF = 0, FN = new Int32Array(0), FC = new Int32Array(0), FS = new Uint32Array(1), FPOS = new Float64Array(0), CALLES_LISTAS = false, CALLES_FALLO = false;
async function leerCalles(raw){
  let rp = 0; const pausa = ratos(); const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return res % 2 ? -((res + 1) / 2) : res / 2; };
  const nf = rv(), fn = new Int32Array(nf), fc = new Int32Array(nf), fs = new Uint32Array(nf + 1), tmp = new Float64Array(raw.length);
  let px = 0, py = 0, nv = 0;
  for (let i = 0; i < nf; i++){ if ((i & 2047) === 0) await pausa();
    fn[i] = rv(); fc[i] = rv(); const k = rv(); fs[i] = nv; for (let j = 0; j < k; j++){ px += rv(); py += rv(); tmp[2*nv] = px / Q; tmp[2*nv+1] = py / Q; nv++; } }
  fs[nf] = nv; NF = nf; FN = fn; FC = fc; FS = fs; FPOS = tmp.slice(0, nv * 2);
}

const ring = r => r.map(p => [p[0] / Q, p[1] / Q]);
const COLS = P.cols.map(c => ({i:c.i, paths:c.rings.map(ring)}));
const COL_GEO = new Map(); for (const c of COLS){ const a = COL_GEO.get(c.i) || []; a.push(...c.paths); COL_GEO.set(c.i, a); }
const ALC = P.alc.map(a => ({cve:a.cve, nom:a.nom, polys:a.rings.map(ring)}));
const COLONIAS = P.colonias;   // índice = id de colonia; sin prioridad, rezago ni pobreza (decisión del proyecto)
/* v28i: las colonias partidas del catálogo se unieron (colonias_unidas.py); una liga o un lugar guardado con el número de una parte lleva a la que quedó. */
const ALIAS_COL = P.alias || {}, colQueda = i => ALIAS_COL[i] ?? i;
const munNom = m => P.munNames[m];
function bbox(paths){ let w = 180, s = 90, e = -180, n = -90; for (const p of paths) for (const q of p){ if (q[0] < w) w = q[0]; if (q[0] > e) e = q[0]; if (q[1] < s) s = q[1]; if (q[1] > n) n = q[1]; } return [w, s, e, n]; }
function centroCaja(paths){ const b = bbox(paths); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
/* Punto más «adentro» del polígono mayor (lejos de sus bordes): ahí va la etiqueta, aunque la forma sea alargada o en L. */
function centro(paths, N = 24){
  const g = paths.reduce((m, p) => p.length > m.length ? p : m, paths[0]); if (!g || g.length < 4) return centroCaja(paths);
  const [w, s, e, n] = bbox([g]), dx = (e - w) / N, dy = (n - s) / N;
  const dist = (x, y) => { let d = Infinity; for (let i = 0, j = g.length - 1; i < g.length; j = i++){ const [x1, y1] = g[j], [x2, y2] = g[i], vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
      let t = L ? ((x - x1) * vx + (y - y1) * vy) / L : 0; t = Math.max(0, Math.min(1, t)); const px = x1 + t * vx - x, py = (y1 + t * vy - y) * 1.05; d = Math.min(d, px * px + py * py); } return d; };
  let mejor = null, md = -1;
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++){ const x = w + a * dx, y = s + b * dy; if (!dentro([x, y], g)) continue; const d = dist(x, y); if (d > md){ md = d; mejor = [x, y]; } }
  if (!mejor) return centroCaja(paths);
  // afinar alrededor del mejor punto
  for (const f of [.5, .25, .12]) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++){ const x = mejor[0] + a * dx * f, y = mejor[1] + b * dy * f; if (!dentro([x, y], g)) continue; const d = dist(x, y); if (d > md){ md = d; mejor = [x, y]; } }
  return mejor;
}
function dentro(pt, poly){ let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function coloniaEn(pt){ for (const c of COLS) for (const p of c.paths) if (dentro(pt, p)) return c.i; return null; }
function alcaldiaEn(pt){ for (const a of ALC) for (const p of a.polys) if (dentro(pt, p)) return a.cve; return null; }

/* ================= inventario de arbolado (real) ================= */
/* Avance de la capa arbolado_cdmx_sep. Un archivo por alcaldía (datos/arboles_<cve>.txt) que se descarga solo al abrirla.
   Por árbol: colonia, posición, UGA y consecutivo (= número del árbol), calle (frente INEGI más cercano) y la toma de Street View. */
const INV = P.inv, ABR2MUN = {"AZC":"002","COY":"003","CUJ":"004","GAM":"005","IZC":"006","IZP":"007","MAC":"008","MLP":"009","AOB":"010","TLH":"011","TLP":"012","XOC":"013","BJU":"014","CUH":"015","MIH":"016","VCA":"017"};
const ARB_ALC = new Map(), CARGANDO = new Map(), FALLO_ALC = new Set();   // FALLO_ALC: alcaldías cuyos árboles no se pudieron descargar (sin internet)
let COL_FR = null;
function frentesDe(c){ if (!COL_FR){ COL_FR = new Map(); for (let i = 0; i < NF; i++){ const a = COL_FR.get(FC[i]); if (a) a.push(i); else COL_FR.set(FC[i], [i]); } } return COL_FR.get(c) || []; }
function cargarAlcaldia(cve){
  if (ARB_ALC.has(cve)) return Promise.resolve(ARB_ALC.get(cve));
  if (CARGANDO.has(cve)) return CARGANDO.get(cve);
  const falla = () => errorPersona(tx("carga.error_arboles", {alcaldia:munNom(cve)}));
  const pr = (async () => {
    // Archivo de texto en base64 (formato heredado del prototipo en Claude); dentro, el binario comprimido.
    const r = await fetch(conVersion("datos/arboles_" + cve + ".txt")).catch(() => { throw falla(); });   // sin internet: aviso en español, no «Failed to fetch»
    if (!r.ok) throw falla();
    const b = await r.text().then(async t => gunzip(await deBase64EnRatos(t))).catch(() => { throw falla(); });   /* v30: descarga cortada o archivo dañado: el mismo aviso */
    let q = 0; const v = () => { let res = 0, sh = 0, x; do { x = b[q++]; res += (x & 0x7f) * Math.pow(2, sh); sh += 7; } while (x & 0x80); return res % 2 ? -((res + 1) / 2) : res / 2; };
    const n = v(), out = new Array(n), pausa = ratos(); let c = 0, x = 0, y = 0;
    for (let i = 0; i < n; i++){ if ((i & 1023) === 0) await pausa();
      c += v(); x += v(); y += v(); const u = v(), s = v(), calle = v(), cx = v(), cy = v(), h = v(), pt = v(), f = v();
      out[i] = {idc:INV.ugas[u] + "-" + String(s).padStart(4, "0"), lng:x / 1e6, lat:y / 1e6, col:c, mun:cve, calle:calle >= 0 ? INV.calles[calle] : null,
        cam:[(x + cx) / 1e6, (y + cy) / 1e6], rumbo:h, incl:pt, fecha:INV.fechas[f], pat:null};
    }
    const pats = PAT.filter(p => p.mun === cve), porIdc = pats.length ? new Map(out.map(x => [x.idc, x])) : null;   /* v30: con índice (antes se recorría la alcaldía por cada patrimonial) */
    for (const p of pats){
      const t = p.inv && porIdc.get(p.inv);
      if (t) t.pat = p;
      else out.push({idc:p.id, lng:p.lng, lat:p.lat, col:p.col, mun:cve, calle:p.calle, cam:null, rumbo:0, incl:0, fecha:null, pat:p});
    }
    ARB_ALC.set(cve, out); FALLO_ALC.delete(cve); return out;
  })();
  CARGANDO.set(cve, pr); pr.catch(() => { CARGANDO.delete(cve); FALLO_ALC.add(cve); });
  return pr;
}
/* Árboles patrimoniales (hoja Salida_Publica del padrón): siempre visibles en el mapa, aun sin abrir su alcaldía. */
const PAT = P.pat;
const POR_COL = new Map();
function arbolesDe(c){ if (POR_COL.has(c)) return POR_COL.get(c); const a = ARB_ALC.get(COLONIAS[c] && COLONIAS[c].m); if (!a) return []; const r = a.filter(t => t.col === c); POR_COL.set(c, r); return r; }
/* null: no existe ese árbol. undefined: no se pudieron cargar los árboles de su alcaldía (sin internet); ya se avisó (v28i: antes decía «No encontramos ese árbol»). */
async function buscarIdc(idc){
  const cargar = cve => cargarAlcaldia(cve).catch(e => { aviso(e.message, "error"); return undefined; });
  const p = PAT.find(x => x.id === idc || x.inv === idc); if (p){ const a = await cargar(p.mun); return a ? a.find(t => t.pat === p) || null : a; }
  const cve = ABR2MUN[idc.slice(0, 3)]; if (!cve) return null; const a = await cargar(cve); return a ? a.find(t => t.idc === idc) || null : a; }

/* Conteos reales del inventario por colonia y alcaldía (vienen en el paquete de datos). */
const nCol = c => (COLONIAS[c] && COLONIAS[c].arb) || 0, nAlc = m => (INV.alc[m] || {arb:0}).arb;
const TOTAL = Object.values(INV.alc).reduce((s, x) => s + x.arb, 0);
/* Cinco tonos de verde por número de árboles, calculados entre las piezas que se comparan (alcaldías entre sí, o las colonias de una alcaldía). */
const VERDES = ["--verdor-1", "--verdor-2", "--verdor-3", "--verdor-4", "--verdor-5"].map(t => hex(css(t)).slice(0, 3));
/* El color del mapa es el verdor de las calles (satélite, igual en toda la ciudad), con cortes fijos para que alcaldías y colonias se lean con la misma escala.
   El número de árboles del inventario NO colorea el mapa: depende de cuánto se ha levantado en cada alcaldía. */
const CORTES_V = [40, 55, 70, 80], SIN_DATO = hex(css("--mapa-sin-dato")).slice(0, 3);
const colorV = v => v == null ? SIN_DATO : VERDES[CORTES_V.filter(x => v >= x).length];
const vAlc = m => (P.alcInd[m] || {}).v, vCol = i => COLONIAS[i] ? COLONIAS[i].v : null;

/* ================= guardianes (sin datos personales) ================= */
/* Cada guardianía es un registro anónimo {árbol, colonia, alcaldía, fecha}. Hoy solo vive en este navegador (más la simulación en modo prueba).
   El conteo de todas las personas lo dará el servicio del SIA (pendiente 7, etapa 2): llenará REG, REG_COL y REG_ALC y pondrá SERVIDOR = true. */
let REG = new Map(), REG_COL = new Map(), REG_ALC = new Map(), verG = 0, SERVIDOR = null;
/* Lo que se guarda en este navegador: solo claves de árboles y su lugar; nada de la persona. Las claves llevan versión
   (gda:v1:…): si un día cambia el formato, se agrega v2 y se pasa lo guardado de v1, sin que nadie pierda sus árboles. */
const CLAVE = {arboles:"gda:v1:arboles", lugares:"gda:v1:lugares"};
// Migración (v27): las claves de antes («guardianias» y «guardianias_meta») se copian a las nuevas una sola vez.
// Las anteriores se quedan donde están por si hubiera que regresar a una versión previa; se pueden quitar al montar en el SIA.
for (const [nueva, vieja] of [[CLAVE.arboles, "guardianias"], [CLAVE.lugares, "guardianias_meta"]])
  try { if (localStorage.getItem(nueva) === null && localStorage.getItem(vieja) !== null) localStorage.setItem(nueva, localStorage.getItem(vieja)); } catch {}
const PROPIOS = new Set(leerLocal(CLAVE.arboles, []).filter(x => typeof x === "string"));   /* v30: solo claves de árbol (un dato dañado no rompe la página) */
const patA = p => ({idc:p.inv || p.id, pat:p});   // el patrimonial se cuenta con la clave del inventario si está empatado
/* Simulación de pruebas: casos fijos y ~20 % de árboles con guardianes (siempre los mismos, por su número). */
const SIM_CASOS = {"MIH-029-1493":5, "MIH-029-1491":0, "MIH-029-1492":2, "MIH-047-1179":4, "25-MIH-TAX-19405GIMNO-0001":4, "25-CUH-TAX-19405GIMNO-0002":0};
const SIM_MIOS = ["MIH-029-1492"];
if (C.SIMULAR_GUARDIANES) for (const i of SIM_MIOS) PROPIOS.add(i);
function simG(idc){
  if (!C.SIMULAR_GUARDIANES) return 0;
  if (idc in SIM_CASOS) return SIM_CASOS[idc];
  let h = 2166136261; for (let i = 0; i < idc.length; i++){ h ^= idc.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = (h >>> 0) / 4294967296; if (r >= .2) return 0;
  const q = r / .2; return q < .5 ? 1 : q < .75 ? 2 : q < .88 ? 3 : q < .95 ? 5 : 8;
}
const guardianes = a => (SERVIDOR ? (REG.get(a.idc) || 0) : (PROPIOS.has(a.idc) ? 1 : 0)) + simG(a.idc);
const conGuardianCol = c => C.SIMULAR_GUARDIANES ? arbolesDe(c).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_COL.get(c) || new Set()).size : 0;
const conGuardianAlc = m => C.SIMULAR_GUARDIANES ? (ARB_ALC.get(m) || []).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_ALC.get(m) || new Set()).size : 0;
async function registrarGuardian(a){
  if (PROPIOS.has(a.idc)) return "ya";
  PROPIOS.add(a.idc); guardarLocal(CLAVE.arboles, [...PROPIOS]); guardarMeta(a); actualizarMis();
  verG++; pintarMapa(); repintarPanel(); if (selArb === a && !card.hidden) pintarTarjeta(a);
  return "nuevo";
}

/* ================= reglas y textos ================= */
const sePuedeCuidar = a => !a.cond || a.cond === "Buena" || a.cond === "Regular";
const calleTexto = a => a.calle || tx("guia.calle_sin_nombre_registrado");
/* v30: grupo del árbol en la lista de la colonia (el mismo criterio en el panel, al elegir un árbol y en el mapa) */
const grupoCalle = a => a.pat && !a.calle ? tx("panel.arboles_patrimoniales") : calleTexto(a);
const esGrupoSinCalle = k => k === tx("guia.calle_sin_nombre_registrado") || k === tx("panel.arboles_patrimoniales");
const urlArbol = a => C.URL_SITIO + "#arbol-" + a.idc;
const urlPatrimonial = a => C.URL_PATRIMONIALES + "arbol-" + a.pat.slug + ".html";
const coord = a => a.lat.toFixed(6) + "," + a.lng.toFixed(6);
/* Street View: la misma toma con la que se levantó el árbol (cámara, rumbo e inclinación del inventario). */
const urlStreetView = a => a.cam ? "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + a.cam[1].toFixed(6) + "," + a.cam[0].toFixed(6) + "&heading=" + a.rumbo + "&pitch=" + a.incl + "&fov=40"
  : "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + coord(a);
/* Street View dentro de la ficha: oficial con la clave de Google Maps Embed; sin clave, la liga pública (STREET_VIEW_SIN_CLAVE). */
function embedStreetView(a){
  const ll = a.cam ? a.cam[1].toFixed(6) + "," + a.cam[0].toFixed(6) : a.lat.toFixed(6) + "," + a.lng.toFixed(6);   // sin toma registrada: la vista más cercana al árbol
  const src = C.GOOGLE_MAPS_EMBED_KEY
    ? "https://www.google.com/maps/embed/v1/streetview?key=" + C.GOOGLE_MAPS_EMBED_KEY + "&location=" + ll + "&heading=" + a.rumbo + "&pitch=8&fov=60"
    : C.STREET_VIEW_SIN_CLAVE ? "https://maps.google.com/maps?layer=c&cbll=" + ll + "&cbp=12," + a.rumbo + ",0,0,-8&output=svembed" : null;
  return src ? el("div", {class:"sv-marco"}, el("iframe", {title:tx("ficha.street_view_titulo", {calle:calleTexto(a)}), loading:"lazy", referrerpolicy:"no-referrer-when-downgrade", src})) : null;
}
const nomCol = c => COLONIAS[c] ? COLONIAS[c].n : tx("guia.fuera_del_catalogo_de_colonias");
/* v30 (Liber: «hay veces que solo pone el nombre de la colonia; quisiera que apareciera Col. Romero de Terreros»): en los textos el nombre
   lleva «Col.», salvo los que ya dicen qué son. En el mapa y en las listas de colonias va solo (ahí ya se sabe que son colonias). */
const SIN_COL = /^(Col\.|Colonia|Barrio|Pueblo|U\. H\.|Unidad|Conjunto|Ejido|Campamento|Fraccionamiento|Aeropuerto|Ciudad Universitaria|Zona Federal)(\s|$)/;
const conCol = n => !n || SIN_COL.test(n) ? n : tx("general.colonia_con_col", {colonia:n});
const colTxt = c => COLONIAS[c] ? conCol(COLONIAS[c].n) : tx("guia.fuera_del_catalogo_de_colonias");
/* El ABC del cuidado (aprobado el 9 oct 2026). Sin cantidades hasta que el área técnica las valide; canal de aviso por definir. */
const ABC = [
  {l:"A", t:tx("guia.agua_en_secas"), corto:tx("guia.despacio_y_al_pie_una"),
    largo:tx("guia.de_noviembre_a_mayo_riegalo")},
  {l:"B", t:tx("guia.base_que_respira"), corto:tx("guia.su_cajete_sin_basura_cemento"),
    largo:tx("guia.retira_basura_cascajo_heces_y")},
  {l:"C", t:tx("guia.cobija_de_hojas"), corto:tx("guia.deja_su_hojarasca_en_el"),
    largo:tx("guia.las_hojas_que_caen_guardan")},
  {l:"D", t:tx("guia.deja_su_cuerpo_en_paz"), corto:tx("guia.nada_clavado_amarrado_colgado_ni"),
    largo:tx("guia.la_corteza_es_su_piel")},
  {l:"E", t:tx("guia.encuentrate_con_el_y_avisa"), corto:tx("guia.pasa_a_verlo_nota_sus"),
    largo:tx("guia.observalo_en_cada_temporada_y")}];
const NO_HACER = [tx("guia.podarlo_requiere_autorizacion_de_tu"), tx("guia.cementar_o_reducir_su_cajete"), tx("guia.hacerle_jardinera_o_echarle_tierra"), tx("guia.amontonar_hojas_contra_el_tronco"), tx("guia.encalar_o_pintar_el_tronco"), tx("guia.usar_fertilizantes_o_herbicidas"), tx("guia.clavarle_amarrarle_o_colgarle_cosas")];
const AVISAR = [tx("guia.ramas_rotas_o_colgando"), tx("guia.una_inclinacion_nueva"), tx("guia.raices_cortadas_por_una_obra"), tx("guia.su_cajete_encementado"), tx("guia.poda_o_derribo_sin_aviso"), tx("guia.una_plaga_evidente"), tx("guia.el_arbol_seco")];
const CANAL_AVISO = null;   // pendiente: micrositio, alcaldía o PAOT (uno solo)
/* Videos cortos de cuidado (pendiente 22). url:null = aún no grabado: se muestra «Próximamente». Al tener la liga (YouTube o propia), basta con ponerla aquí. */
const VIDEOS = [
  {id:"riego", letra:"A", t:tx("guia.riego"), d:tx("guia.cuando_y_como_darle_agua"), url:null},
  {id:"residuos", letra:"B", t:tx("guia.retira_los_residuos"), d:tx("guia.su_cajete_limpio_sin_basura"), url:null},
  {id:"acolchado", letra:"C", t:tx("guia.acolchado"), d:tx("guia.sus_hojas_como_cobija_en"), url:null},
  {id:"lastimes", letra:"D", t:tx("guia.no_lo_lastimes"), d:tx("guia.nada_clavado_amarrado_colgado_ni_2"), url:null},
  {id:"conoce", letra:null, t:tx("guia.conoce_tu_arbol"), d:tx("guia.sus_partes_y_como_cambia"), url:null},
  {id:"riesgo", letra:"E", t:tx("guia.senales_de_riesgo_y_a"), d:tx("guia.que_mirar_y_a_quien"), url:null},
  {id:"letrero", letra:null, t:tx("guia.ponle_un_letrero_sin_lastimarlo"), d:tx("guia.como_nombrarlo_sin_clavos_ni"), url:null}];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="' + css("--video-sombra") + '"/><path d="M10 8.2v7.6l6-3.8z" fill="#fff"/></svg>';
/* v31b (Liber): en la guía completa cada video va incrustado con su vista previa (miniatura con botón de reproducir). Mientras no exista,
   la miniatura dice «Próximamente» y no se puede reproducir. Con la liga, la miniatura la abre; para verlo dentro de la página hay que
   permitir su sitio en la política de seguridad (pendiente 22). */
function miniVideo(v){ if (!v) return null;
  const c = el(v.url ? "a" : "div", {class:"vid vid-incr" + (v.url ? "" : " pronto"), href:v.url || null, target:v.url ? "_blank" : null, rel:v.url ? "noopener" : null},
    el("span", {class:"vid-mini vid-" + v.id}, el("span", {class:"vid-play"}), v.url ? null : el("small", {texto:tx("guia.proximamente_2")})),
    el("b", {texto:tx("guia.video", {titulo:v.t})}));
  c.querySelector(".vid-play").innerHTML = PLAY; return c; }
/* Videos que no van con una letra del ABC (los de cada letra ya están en su renglón) */
function galeriaVideos(){
  return el("div", {class:"videos"}, el("p", {class:"videos-t"}, el("b", {texto:tx("guia.mas_videos")})),
    el("div", {class:"vid-fila"}, VIDEOS.filter(v => !v.letra).map(v => { const c = miniVideo(v); c.append(el("span", {texto:v.d})); return c; })));
}
const abcCorto = () => el("ol", {}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}), el("b", {texto:r.t}), el("span", {texto:r.corto}))));
const abcNo = () => el("p", {class:"abc-no"}, el("b", {texto:tx("guia.no_lo_podes")}), tx("guia.la_poda_requiere_autorizacion_de"));
const guiaCompleta = () => [
  el("ol", {class:"abc-largo"}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}),
    el("div", {}, el("b", {texto:r.t}), el("p", {texto:r.largo}), miniVideo(VIDEOS.find(v => v.letra === r.l)))))),
  el("div", {class:"abc-cols"},
    el("div", {class:"abc-nohacer"}, el("b", {texto:tx("general.aunque_parezca_cuidado_no")}), el("ul", {}, NO_HACER.map(t => el("li", {texto:t})))),
    el("div", {class:"abc-avisa"}, el("b", {texto:tx("general.avisa_si_ves")}), el("ul", {}, AVISAR.map(t => el("li", {texto:t}))),
      el("p", {}, el("b", {texto:tx("guia.a_quien")}), CANAL_AVISO || tx("guia.canal_de_aviso_por_definir")))),
  galeriaVideos()];
const abcBloque = abierto => el("details", {class:"abc", open:abierto || null}, el("summary", {texto:tx("guia.como_cuidarlo_el_abc_de")}),
  abcCorto(), abcNo(), el("details", {class:"abc-mas"}, el("summary", {texto:tx("guia.ver_la_guia_completa")}), ...guiaCompleta()),
  el("p", {class:"nota", texto:tx("guia.guia_por_validar_con_el")}));
/* v31b (Liber): en la página del árbol adoptado, la guía de cuidado es una sección con título; toda la tarjeta abre la guía completa y el
   enlace se ve como botón (el teclado usa el botón; el toque en cualquier parte de la tarjeta hace lo mismo). */
function guiaCuidado(){
  const completa = el("div", {class:"abc guia-completa", id:"guia-completa", hidden:true}, ...guiaCompleta());
  const bt = el("button", {type:"button", class:"btn guia-bt", "aria-expanded":"false", "aria-controls":"guia-completa", texto:tx("guia.ver_la_guia_completa"), onclick:() => {
    const abrir = completa.hidden; completa.hidden = !abrir; bt.setAttribute("aria-expanded", String(abrir));
    bt.textContent = abrir ? tx("guia.ocultar_la_guia_completa") : tx("guia.ver_la_guia_completa"); }});
  const tarjeta = el("div", {class:"abc guia-tarjeta", onclick:e => { if (!e.target.closest("button,a")) bt.click(); }}, abcCorto(), abcNo(), bt);
  return el("section", {class:"guia-cuidado", "aria-labelledby":"t-guia"}, el("h3", {id:"t-guia", texto:tx("guia.como_cuidarlo_el_abc_de")}), tarjeta, completa,
    el("p", {class:"nota", texto:tx("guia.guia_por_validar_con_el")}));
}
const INDS = [
  {k:"t", n:tx("guia.calor"), u:" °C", min:35, max:60,
   mide:tx("guia.la_temperatura_de_la_superficie"),
   fuente:tx("guia.wri_a_partir_de_imagenes")},
  {k:"a", n:tx("guia.calles_con_arboles"),
   u:" %", min:0, max:100,
   mide:tx("guia.que_parte_de_las_banquetas"),
   fuente:tx("guia.inegi_caracteristicas_del_entorno_urbano")},
  {k:"v", n:tx("general.verdor_de_las_calles"),
   u:" %", min:0, max:100,
   mide:tx("guia.que_parte_de_la_orilla"),
   fuente:tx("guia.sedema_sia_modelo_de_priorizacion")}];

/* ================= estado ================= */
let selAlc = null, selCol = null, selArb = null, tab = "arboles", filtroCalle = "", filtroG = "todos", verTodos = false, calleAbierta = null, cuadraAbierta = null, verCalles = false, nCalle = 40, verCols = false, fichaExtra = null;

/* ================= mapa ================= */
const {DeckGL, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer, IconLayer, WebMercatorViewport, FlyToInterpolator} = deck;
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
  + (FONDO.nom || []).map(r => r[0]).join("") + "0123456789,.+-–«»°%() árboles")].join(""));
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
function capas(){ const t0 = performance.now(), L = conFondo(capasArmar()); if (window.__PERF) window.__PERF.push([Math.round((vista.zoom || 0) * 10) / 10, Math.round(performance.now() - t0), L.filter(Boolean).map(l => l.id).join(",")]);
  if (window.__ETQ) etqParaPruebas(L, performance.now() - t0); return L; }
/* Solo para 03_pruebas/etiquetas.py: si la prueba define window.__ETQ antes de abrir la página, aquí recibe los nombres que se ven
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
      const mios = datos.filter(d => (claseV(vAlc(d.cve)) <= 3) === claro);   // texto blanco solo sobre el verdor 5 (sobre el 4 daba 2.7:1)
      L.push(new TextLayer({...base, id:"lbl-alc-" + claro, data:mios.filter(d => !d.chica), getText:texto, getSize:chico ? 10.5 : t, updateTriggers:{getText:[z < 10.8, chico]}}));
      if (!chico) L.push(new TextLayer({...base, id:"lbl-alc-chica-" + claro, data:mios.filter(d => d.chica), getText:texto, getSize:tc}));
    }
  }

  else if (z < 15){ const t = z < 13 ? 12 : 14, d0 = sinEncimar(colVisibles(d => COLONIAS[d.i] && cabe(d, 64)), d => conCifra(d.t, nCol(d.i)), t, z, d => d.i === selCol ? 1e12 : d.w * d.h, ocupaSel);
    etqCol = d0.map(d => ({pos:d.pos, ls:[d.t, nArb(nCol(d.i))], tam:t}));
    for (const claro of [true, false]) dosRenglones("lbl-col-" + claro, d0.filter(d => (z >= 14 || claseV(vCol(d.i)) <= 3) === claro), d => d.t, d => nArb(nCol(d.i)), t, claro); }
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
  const r = await fetch(conVersion("datos/" + f + ".txt")); if (!r.ok) throw new Error(f);
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
    fetch(conVersion("datos/fondo_nombres.json")).then(r => r.json()).then(j => { FONDO.nom = j; CHARS_ = null; if (FONDO.base) pintarCapas(); }).catch(() => {}); }
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
    const borde = new PolygonLayer({id:"fondo-protegida-borde", data:FONDO.base.protegida, getPolygon:d => d, filled:false, stroked:true, getLineColor:hex(css("--fondo-protegida-borde"), 170),
      getLineWidth:z >= Z_ARB ? 1.75 : 1.25, lineWidthUnits:"pixels", updateTriggers:{getLineWidth:z >= Z_ARB}});
    const j = out.findIndex(l => l && /^calles-|^colonias-funda$/.test(l.id)); out.splice(j < 0 ? i + 1 + abajo.length : j, 0, borde);
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
  FONDO.nom.forEach(([n, lon, lat, ha], k) => {
    if (Math.sqrt(ha * 1e4) / mpp < 90) return;
    let pos = [lon, lat];
    if (!(lon > vb[0] + mx && lon < vb[2] - mx && lat > vb[1] + my && lat < vb[3] - my)){
      const r = FONDO.anillo[k]; if (!r) return;
      const bb = bbox([r]); if (!(bb[0] < vb[2] && bb[2] > vb[0] && bb[1] < vb[3] && bb[3] > vb[1])) return;
      pos = posVisible(r, pos, vb, z); if (!pos) return; }
    let t = n; if (n.length > 22){ const m = n.length / 2, a = n.lastIndexOf(" ", m), b = n.indexOf(" ", m), q = a < 0 ? b : b < 0 ? a : (m - a <= b - m ? a : b); if (q > 0) t = n.slice(0, q) + "\n" + n.slice(q + 1); }
    const ls = t.split("\n"), c = cajaEnMundo(pos, ls, T, zz);
    if (cajas.some(o => c[0] < o[2] && c[2] > o[0] && c[1] < o[3] && c[3] > o[1])) return;
    cajas.push(c);
    let tono = "hoja";
    if (z < Z_ARB){ const kk = n + "|" + pos[0].toFixed(3) + "," + pos[1].toFixed(3); let cl = ANP_TONO.get(kk);
      if (cl === undefined){ const ci = colEnPunto(pos), v = ci == null ? null : vCol(ci); cl = v == null ? 0 : CORTES_V.filter(x => v >= x).length; if (ANP_TONO.size > 500) ANP_TONO.clear(); ANP_TONO.set(kk, cl); }
      tono = cl <= 1 ? "hoja" : cl <= 3 || z >= 14 ? "tinta" : "blanco"; }
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
  [/^col-fill$/, z => tramo(z, [[11.2, 0], [11.8, 1], [13.8, 1], [14.5, 0]])],
  [/^fondo-(mz-|verde$|agua$|protegida$)/, z => tramo(z, [[14, 0], [14.5, 1]])],
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

/* ================= panel ================= */
const answer = $("answer");   /* v30e: sin la barra de abajo «Ver los árboles en el mapa» (repetía «Ver el mapa») */
const coloniasDe = cve => COLONIAS.map((c, i) => c && c.m === cve ? i : null).filter(i => i !== null).sort((x, y) => COLONIAS[x].n.localeCompare(COLONIAS[y].n, "es"));
function mapsum(){
  const s = $("mapsum");
  if (selCol === null && selAlc === null){ s.replaceChildren(el("b", {texto:tx("general.ciudad_de_mexico")}), el("small", {texto:tx("panel.toca_tu_alcaldia_en_el")})); return; }
  const cargando = !ARB_ALC.has(selAlc) && !FALLO_ALC.has(selAlc) ? tx("panel.cargando_sus_arboles") : "";
  if (selCol === null){ s.replaceChildren(el("b", {texto:munNom(selAlc)}), el("small", {texto:tx("panel.alcaldia_resumen", {n:fmt.format(nAlc(selAlc)), colonias:fmt.format(coloniasDe(selAlc).length)}) + cargando})); return; }
  s.replaceChildren(el("b", {texto:colTxt(selCol)}), el("small", {texto:nCol(selCol) ? (nCol(selCol) === 1 ? tx("panel.colonia_resumen_1") : tx("panel.colonia_resumen", {n:fmt.format(nCol(selCol))})) + cargando : tx("panel.sin_arboles_registrados")}));
}
function migas(){
  const n = $("crumb");
  if (selAlc === null){ n.hidden = true; return; }
  n.hidden = false;
  const sep = () => el("span", {"aria-hidden":"true", texto:"›"});
  /* v30f: solo los niveles de arriba; el lugar donde se está es el título grande de abajo (antes se repetía y en el celular se partía en otro renglón) */
  n.replaceChildren(el("button", {type:"button", texto:tx("general.ciudad_de_mexico"), onclick:() => { inicio(); if (!esTel()) $("omni").focus(); }}),
    ...(selCol === null ? [] : [sep(), el("button", {type:"button", texto:munNom(selAlc), onclick:() => elegirAlcaldia(selAlc, {foco:true})})]));
}
/* Casos para probar (solo en modo prueba): en el control «Para probar» del mapa o, sin mapa, al final del panel de inicio. */
function casosPrueba(alElegir){
  const listo = () => { if (alElegir) alElegir(); };
  return [[["MIH-029-1493", tx("panel.arbol_que_cuidan_5_personas"), tx("panel.polanco_avenida_horacio")], ["MIH-029-1491", tx("panel.arbol_que_espera_quien_lo"), tx("panel.polanco_avenida_horacio")],
     ["MIH-029-1492", tx("panel.arbol_que_tu_ya_cuidas"), tx("panel.abre_tu_reconocimiento_y_descarga")], ["25-MIH-TAX-19405GIMNO-0001", tx("panel.arbol_patrimonial_que_cuidan_4"), tx("panel.miguel_hidalgo")],
     ["25-CUH-TAX-19405GIMNO-0002", tx("panel.arbol_patrimonial_que_espera_quien"), tx("panel.jardin_san_fernando_cuauhtemoc")]].map(([idc, t, d]) =>
      el("button", {type:"button", class:"fila-btn", onclick:() => { listo(); const t0 = TURNO; buscarIdc(idc).then(a => { if (t0 !== TURNO) return; if (a) elegirArbol(a, {volar:true}); else if (a === null) aviso(tx("general.arbol_no_encontrado", {arbol:idc}), "error"); }); }},
        el("b", {texto:t}), el("small", {texto:d}), el("span", {class:"k", texto:tx("panel.ver")}))),
    el("button", {type:"button", class:"fila-btn", onclick:() => { listo(); elegirColonia(1583, {volar:true}); }}, el("b", {texto:tx("panel.prueba_una_colonia", {colonia:COLONIAS[1583].n})}), el("small", {texto:munNom(COLONIAS[1583].m)}), el("span", {class:"k", texto:tx("panel.ver")})),
    C.SIMULAR_GUARDIANES ? el("p", {class:"nota", texto:tx("panel.las_personas_guardianas_de_esta")}) : null].flat().filter(Boolean);
}
/* v30g: control «Para probar» sobre el mapa: un botón junto a la tarjeta del lugar que abre la lista de casos. Se cierra al elegir uno,
   con Escape, con un toque fuera o con el mismo botón. En producción no existe (index.html lo marca solo-prueba). */
(() => { const caja = $("probar"); if (!caja) return;
  if (C.MODO !== "prueba" || !HAY_MAPA){ caja.hidden = true; return; }
  const btn = $("probar-btn"), menu = $("probar-menu");
  const abrir = si => { menu.hidden = !si; btn.setAttribute("aria-expanded", String(si)); caja.parentElement.classList.toggle("con-menu", si);   /* encima de los botones del mapa */ if (si){ menu.replaceChildren(...casosPrueba(() => abrir(false))); const b = menu.querySelector("button"); if (b) b.focus(); } };
  btn.onclick = () => abrir(menu.hidden);
  menu.addEventListener("keydown", e => { if (e.key === "Escape"){ e.stopPropagation(); abrir(false); btn.focus(); } });
  document.addEventListener("pointerdown", e => { if (!menu.hidden && !caja.contains(e.target)) abrir(false); }, true);
})();
function vistaInicio(){
  // La frase y el texto de entrada ya vienen en index.html (se ven antes de que cargue el mapa): se reusan si están.
  const ya = c => { const n = answer.querySelector(":scope > p." + c); return n && n.textContent === tx(c === "tesis" ? "panel.los_arboles_de_tu_calle" : "panel.mira_como_esta_tu_colonia") ? n : null; };
  answer.replaceChildren(
    ya("tesis") || el("p", {class:"tesis", texto:tx("panel.los_arboles_de_tu_calle")}),
    ya("lead") || el("p", {class:"lead", texto:tx("panel.mira_como_esta_tu_colonia")}),
    bloqueHeroe(TOTAL, gCiudad()),
    el("ol", {class:"pasos"},
      el("li", {}, el("b", {texto:tx("panel.busca_tu_calle")}), tx("panel.o_usa_tu_ubicacion")),
      el("li", {}, el("b", {texto:tx("panel.encuentra_un_arbol")}), tx("panel.de_tu_calle_confirmalo_en")),
      el("li", {}, el("b", {texto:tx("panel.cuidalo")}), tx("panel.y_guarda_tu_reconocimiento_en")),
      el("li", {}, el("b", {texto:tx("panel.invita")}), tx("panel.a_tu_familia_y_a"))),
    /* v30g: «Para probar» es un control del mapa (Liber); aquí solo queda si el navegador no puede mostrar el mapa */
    ...(C.MODO !== "prueba" || (HAY_MAPA && $("probar")) ? [] : [el("div", {class:"grupo"}, el("p", {class:"sec-tit", texto:tx("panel.para_probar")}), casosPrueba())]),
    el("p", {class:"fuente", texto:tx("panel.fuentes", {registros:fmt.format(INV.registros)})}),
    el("p", {class:"fuente-priv"}, el("button", {type:"button", class:"btn-txt", onclick:() => abrirPrivacidad()}, tx("general.aviso_de_privacidad"))));   /* v30j */
}
function bloqueHeroe(n, nG, accion){
  return el("div", {class:"heroe"},
    el("p", {class:"heroe-n"}, el("b", {texto:fmt.format(n)}), el("span", {texto:n === 1 ? tx("panel.arbol") : tx("panel.arboles")})),
    n ? el("div", {class:"barra-g", role:"img", "aria-label":tx("panel.barra_guardianes", {g:fmt.format(nG), n:fmt.format(n)})}, el("i", {style:"width:" + Math.min(100, nG / n * 100) + "%"})) : null,
    n ? el("p", {class:"heroe-t"}, el("b", {texto:fmt.format(nG)}), (nG === 1 ? tx("panel.ya_tiene_quien_lo_cuide") : tx("panel.ya_tienen_quien_los_cuide")) + " · " + fmt.format(n - nG) + (n - nG === 1 ? tx("panel.espera_a_alguien") : tx("panel.esperan_a_alguien"))) : null,
    accion || null);
}
/* ===== Panel G3: cada dato es una barra con la raya de la ciudad ===== */
const gCiudad = () => C.SIMULAR_GUARDIANES ? Math.round(TOTAL * .2) : SERVIDOR ? [...REG.keys()].length : 0;
function cabecera(titulo, sub, n){
  return el("div", {class:"cab"},
    el("div", {class:"scope-head"}, el("h2", {texto:titulo}), el("p", {texto:sub})),
    n ? el("div", {class:"cab-n"}, el("b", {texto:fmt.format(n)}), el("span", {texto:n === 1 ? tx("panel.arbol") : tx("panel.arboles")})) : null);   /* v30h: sin «0 árboles» */
}
function bloqueComparar(x, n, nG, esCol){
  const p = PROM, filas = [];
  const fila = (titulo, valor, color, pct, pctCiudad, frase, tinta) => el("div", {class:"comp-fila", style:"--c:" + color + ";--ct:" + (tinta || color)},
    el("div", {class:"t"}, el("b", {texto:titulo}), el("strong", {texto:valor})),
    el("div", {class:"comp-barra", role:"img", "aria-label":titulo + ": " + valor + ". " + frase},
      el("i", {style:"width:" + Math.max(2, Math.min(100, pct)) + "%"}), el("s", {style:"left:calc(" + Math.max(0, Math.min(100, pctCiudad)) + "% - 1px)"})),
    el("p", {texto:frase}));
  if (x.v != null) filas.push(fila(tx("general.verdor_de_las_calles"), fmt0.format(x.v) + " %", "var(--hoja)", x.v, p.v,
    esCol ? decimos(V_COLS.filter(w => w < x.v).length / V_COLS.length) + tx("panel.verdor_ciudad", {v:fmt0.format(p.v)}) : tx("panel.verdor_promedio", {comparacion:x.v < p.v ? tx("panel.menos_verdes") : tx("panel.mas_verdes"), v:fmt0.format(p.v)})));
  if (x.t != null){
    const d = Math.round((x.t - p.t) * 10) / 10, pos = v => (v - 35) / 25 * 100;
    const color = d <= -1 ? "var(--calor-fresco)" : d >= 1 ? "var(--calor-caliente)" : "var(--calor-igual)", tinta = d <= -1 ? "var(--calor-ink)" : d >= 1 ? "var(--calor-caliente-ink)" : "var(--calor-igual-ink)";
    filas.push(fila(tx("panel.calor_del_suelo"), fmt1.format(x.t) + "°", color, pos(x.t), pos(p.t),
      Math.abs(d) < .5 ? tx("panel.calor_igual", {t:fmt1.format(p.t)}) : tx("panel.calor_diferencia", {d:fmt1.format(Math.abs(d)), comparacion:d > 0 ? tx("panel.mas_caliente") : tx("panel.mas_fresco")}), tinta));
  }
  if (x.a != null) filas.push(fila(tx("panel.banqueta_con_arboles"), fmt0.format(x.a) + " %", "var(--arbol)", x.a, p.a,
    tx("panel.banqueta", {a:fmt0.format(x.a), ciudad:fmt0.format(p.a)}), "var(--hoja)"));
  if (n) filas.push(fila(tx("panel.arboles_ya_cuidados"), fmt0.format(nG / n * 100) + " %", "var(--guinda)", nG / n * 100, TOTAL ? gCiudad() / TOTAL * 100 : 0,
    tx("panel.guardianes_frase", {g:fmt.format(nG), n:fmt.format(n)}) + (C.SIMULAR_GUARDIANES ? tx("panel.simulado") : "")));
  return el("div", {class:"condicion"},
    el("h3", {class:"sec-tit", texto:esCol ? tx("panel.tu_colonia_frente_a_la") : tx("panel.la_alcaldia_frente_a_la")}),
    el("div", {class:"comp"}, el("p", {class:"comp-ley"}, el("span", {}, el("i", {class:"comp-ley-barra"}), esCol ? tx("panel.tu_colonia") : tx("panel.la_alcaldia")), el("span", {}, el("i", {class:"comp-ley-raya"}), tx("panel.promedio_de_la_ciudad"))), filas),
    el("details", {class:"que-mide"}, el("summary", {texto:tx("panel.que_mide_cada_dato")}),
      INDS.map(ind => el("div", {}, el("p", {}, el("b", {texto:ind.n + ". "}), ind.mide), el("p", {class:"nota", texto:tx("panel.fuente", {fuente:ind.fuente})})))));
}
/* ===== Mejora 7: el árbol que espera guardián más cerca de ti ===== */
function arbolLibreCerca(pt){
  const dist = a => Math.hypot((a.lng - pt[0]) * 105000, (a.lat - pt[1]) * 110700);
  for (const r of [.0015, .005, .02]){   // ~150 m, ~500 m y ~2 km: se queda con el más cercano del primer radio que tenga alguno
    const b = [pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r]; let mejor = null, dm = Infinity;
    for (const arr of ARB_ALC.values()) for (const a of enCeldas(arr, b)){
      if (guardianes(a) > 0 || !sePuedeCuidar(a)) continue; const d = dist(a); if (d < dm){ dm = d; mejor = a; } }
    if (mejor) return [mejor, dm];
  }
  return [null, 0];
}
/* v28i: un solo comportamiento para los dos botones de ubicación (el del panel y el del mapa); no se encima una búsqueda con otra; si la
   persona elige otra cosa mientras llega la ubicación, el resultado no la pisa (TURNO); y se cargan también las alcaldías a menos de
   ~500 m (cerca de un límite, el árbol más cercano puede estar en la de al lado). */
let UBICANDO = false;
function cercaDeMi(boton){
  if (!navigator.geolocation) return aviso(tx("general.este_navegador_no_puede_ubicarte"), "error");
  if (UBICANDO) return; UBICANDO = true; const t0 = TURNO, texto0 = $("omni").value;
  /* Sin «largo» (ya se tiene la ubicación) solo cambia el botón y se quita el aviso: el resultado llega en un instante (decisión de Liber, 11 oct). */
  const paso = (corto, largo) => { if (boton) boton.replaceChildren(el("span", {class:"girando", "aria-hidden":"true"}), corto); if (largo) aviso(largo, "espera"); else $("aviso").hidden = true; };
  if (boton){ boton.disabled = true; boton.setAttribute("aria-busy", "true"); boton.dataset.h = boton.innerHTML; }
  paso(tx("panel.buscando_tu_ubicacion"), tx("panel.buscando_tu_ubicacion_puede_tardar"));
  const fin = () => { clearTimeout(limite); UBICANDO = false; if (boton){ boton.disabled = false; boton.removeAttribute("aria-busy"); boton.innerHTML = boton.dataset.h; } };
  /* v30 (auditoría): escribir en el buscador mientras tanto también es «otra cosa» (antes la ubicación borraba lo escrito) */
  const otraCosa = () => { if (TURNO === t0 && $("omni").value === texto0) return false; fin(); if ($("aviso").classList.contains("t-espera")) $("aviso").hidden = true; return true; };
  /* v30: si el navegador nunca responde (la persona no contesta el permiso), a los 25 s se sueltan los botones y se quita el aviso */
  const limite = setTimeout(() => { if (UBICANDO){ fin(); if ($("aviso").classList.contains("t-espera")) $("aviso").hidden = true; } }, 25000);
  navigator.geolocation.getCurrentPosition(async p => {
    if (otraCosa()) return;
    miPos = [p.coords.longitude, p.coords.latitude]; const c = coloniaEn(miPos);
    if (c === null){ fin(); aviso(tx("general.tu_ubicacion_esta_fuera_de"), "error"); pintarMapa(); return; }
    paso(tx("panel.buscando_el_arbol_mas_cercano"));
    const r = .005, propia = COLONIAS[c].m, vecinas = ALC.map(A => A.cve).filter(k => { const b = ALC_BB.get(k); return k !== propia && b[0] < miPos[0] + r && b[2] > miPos[0] - r && b[1] < miPos[1] + r && b[3] > miPos[1] - r; });
    try { await Promise.all([cargarAlcaldia(propia), ...vecinas.map(k => cargarAlcaldia(k).catch(() => null))]); } catch (e){ if (otraCosa()) return; fin(); aviso(e.message, "error"); return; }
    await new Promise(r => setTimeout(r, 30));
    if (otraCosa()) return;
    const [a, d] = arbolLibreCerca(miPos); fin();
    limpiarBusqueda();
    // "Cerca" es lo que se camina en unos minutos: hasta 500 m. Más lejos ya no es tu árbol de todos los días.
    if (!a){ elegirColonia(c, {volar:true}); aviso(tx("panel.cerca_de_ti_no_hay"), "guia"); return; }
    if (d > 500){ elegirColonia(c, {volar:true}); aviso(tx("panel.ubicacion_lejos", {km:fmt1.format(d / 1000)}), "guia"); return; }
    /* v29 (Liber: el aviso flotante estorbaba): la distancia va en la ficha, debajo del nombre; los lectores de pantalla la oyen igual */
    const m = Math.max(10, Math.round(d / 10) * 10), min = Math.max(1, Math.round(d / 80));
    CERCA = {idc:a.idc, t:tx(d > 120 ? "ficha.cerca_minutos" : "ficha.cerca", {m:fmt.format(m), min})};
    elegirArbol(a, {volar:true});   // cambia solo de colonia (o, fuera del catálogo, a su alcaldía)
    anunciar(CERCA.t);
  }, () => { if (otraCosa()) return; fin(); aviso(tx("general.no_pudimos_usar_tu_ubicacion"), "error"); }, {timeout:12000, maximumAge:120000, enableHighAccuracy:false});   /* v30: si ya se eligió otra cosa, se quita el aviso de espera */
}
const decimos = r => { const k = Math.round(r * 10); return k >= 10 ? tx("panel.estan_entre_las_mas_verdes") : k <= 0 ? tx("panel.estan_entre_las_menos_verdes") : tx("panel.mas_verdes_que_k", {k}); };
const V_COLS = COLONIAS.filter(c => c && c.v != null).map(c => c.v);   // para ubicar una colonia entre todas por verdor
function vistaAlcaldia(){
  const cols = coloniasDe(selAlc), vis = verCols ? cols : cols.slice(0, 15);
  answer.replaceChildren(
    cabecera(munNom(selAlc), cols.length === 1 ? tx("panel.una_colonia") : tx("panel.n_colonias", {n:fmt.format(cols.length)}), nAlc(selAlc)),
    el("h3", {class:"sec-tit", texto:tx("panel.elige_tu_colonia")}),
    el("ul", {class:"lista lista-col", "aria-label":tx("panel.colonias_de", {alcaldia:munNom(selAlc)})},
      vis.map(i => el("li", {}, el("button", {type:"button", onclick:() => elegirColonia(i, {volar:true, foco:true})}, el("span", {class:"n", texto:COLONIAS[i].n}), el("span", {class:"c", texto:nArb(nCol(i))}))))),
    cols.length > vis.length ? el("button", {type:"button", class:"btn secondary", texto:tx("panel.ver_las_colonias", {n:fmt.format(cols.length)}), onclick:() => { verCols = true; vistaAlcaldia(); enfocarN(".lista-col button", 15); }}) : "",
    bloqueComparar(P.alcInd[selAlc], nAlc(selAlc), conGuardianAlc(selAlc), false));
}
function eligeUno(arb){
  const libres = arb.filter(a => guardianes(a) === 0 && sePuedeCuidar(a)); if (!libres.length) return;
  const [x, y] = [vista.longitude, vista.latitude];
  const cerca = libres.slice().sort((p, q) => Math.hypot(p.lng - x, p.lat - y) - Math.hypot(q.lng - x, q.lat - y)).slice(0, 25);
  elegirArbol(cerca[Math.floor(Math.random() * cerca.length)], {volar:true});
}
/* Renglón de un árbol. Con «lugar» (lista de una cuadra), arriba va dónde está y abajo su estado; sin él, arriba el estado y abajo la calle,
   salvo «enSuCalle» (lista bajo el nombre de su calle): ahí la calle no se repite. */
function filaArbol(a, lugar, enSuCalle){
  const g = guardianes(a), pat = a.pat ? tx("panel.arbol_patrimonial_nombre", {nombre:a.pat.nombre}) : null;
  const estado = PROPIOS.has(a.idc) ? tx("panel.tu_lo_cuidas") : g ? (g === 1 ? tx("panel.lo_cuida_1_persona") : tx("panel.lo_cuidan_n", {n:g})) : tx("general.espera_quien_lo_cuide");
  return el("li", {}, el("button", {type:"button", "data-idc":a.idc, "aria-pressed":String(selArb === a), onclick:() => elegirArbol(a, {volar:true, desdeLista:true})},
    el("i", {class:"mk " + (a.pat ? "mk-pat-" : "mk-arbol-") + (g ? "con" : "sin"), "aria-hidden":"true"}),
    el("span", {class:"n", texto:lugar || estado}),
    (lugar || pat || !enSuCalle) ? el("span", {class:"c", texto:lugar ? (pat ? estado + " · " + pat : estado) : pat || calleTexto(a)}) : null));
}
let SOLO_LISTA = false;   /* v30d: la caja de calle pide rehacer solo la lista */
function vistaColonia(){
  const c = COLONIAS[selCol], arb = arbolesDe(selCol);
  const nCon = SERVIDOR ? conGuardianCol(selCol) : arb.filter(a => guardianes(a) > 0).length;
  let cuerpo;
  if (!ARB_ALC.has(c.m)) cuerpo = FALLO_ALC.has(c.m)
    ? [el("p", {class:"nota", texto:tx("carga.error_arboles", {alcaldia:munNom(c.m)})}),
       el("button", {type:"button", class:"btn secondary", texto:tx("panel.volver_a_intentar"), onclick:() => { FALLO_ALC.delete(c.m); elegirColonia(selCol); repintarPanel(); enfocarTitulo(); }})]
    : [el("p", {class:"nota", texto:tx("panel.cargando_arboles_de", {alcaldia:munNom(c.m)})})];
  else if (!arb.length) cuerpo = [el("p", {class:"recuadro", texto:tx("panel.esta_colonia_no_tiene_arboles")})];
  else {
    const q = plano(filtroCalle), pasa = () => true;
    const filtro = el("input", {class:"filtro filtro-calle", type:"search", id:"filtro", placeholder:tx("panel.escribe_tu_calle"), "aria-label":tx("panel.en_que_calle_vives_escribe"), value:filtroCalle});
    /* v30d: con cada letra se rehace solo la lista y la caja se queda (rehacerla duplicaba lo escrito con teclados que arman la palabra, como Gboard en Android) */
    filtro.addEventListener("input", () => { filtroCalle = filtro.value; calleAbierta = null; calleAuto = false; cuadraAbierta = null; nCalle = 40; const pos = filtro.selectionStart;
      SOLO_LISTA = true; try { vistaColonia(); } finally { SOLO_LISTA = false; }
      if (document.activeElement !== filtro){ const f = $("filtro"); f.focus(); f.setSelectionRange(pos, pos); } });
    const porNumero = q && /\d/.test(q) ? arb.filter(a => pasa(a) && plano(a.idc).includes(q)) : [];
    let lista;
    if (porNumero.length) lista = el("ul", {class:"lista", "aria-label":tx("panel.arboles_que_coinciden")}, porNumero.slice(0, 40).map(a => filaArbol(a)));
    else {
      const grupos = new Map();
      for (const a of arb) if (pasa(a)){ const k = grupoCalle(a); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); }
      let calles = [...grupos.entries()].filter(([k]) => !q || plano(k).includes(q)).sort((x, y) => y[1].length - x[1].length);
      // Calle elegida en el buscador: se abre la que se llama exactamente así (o termina así: «Avenida Horacio» por «Horacio»); si no, la de más árboles.
      if (calleAuto){ if (calles.length) calleAbierta = (calles.find(([k]) => plano(k) === q || plano(k).endsWith(" " + q)) || calles[0])[0]; calleAuto = false; }   /* v30: se apaga aunque no haya calles (antes se quedaba prendido) */
      const max = calles.length ? calles[0][1].length : 1, total = calles.length;
      if (calleAbierta){ const i = calles.findIndex(([x]) => x === calleAbierta); if (i > 0) calles.unshift(calles.splice(i, 1)[0]); }   // la calle abierta va primero
      if (!verCalles && !q) calles = calles.slice(0, 8);
      lista = calles.length ? el("ul", {class:"calles-lista", "aria-label":tx("panel.arboles_por_calle")}, calles.map(([k, as]) => {
        const abierta = calleAbierta === k;
        return el("li", {class:abierta ? "abierta" : ""},
          el("button", {type:"button", class:"calle-btn", "data-foco":"calle:" + k, "aria-expanded":String(abierta), onclick:() => {
              calleAbierta = abierta ? null : k; cuadraAbierta = null; nCalle = 40; vistaColonia(); enfocar("calle:" + k);
              if (!abierta){ const xs = as.map(a => a.lng), ys = as.map(a => a.lat); volar([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], padMapa()); } }},
            el("span", {class:"n", texto:k}), el("span", {class:"k", texto:fmt.format(as.length) + (as.length === 1 ? tx("panel.arbol_2") : tx("panel.arboles_2"))}),
            (() => { const g = as.filter(a => guardianes(a) > 0).length;
              return el("span", {class:"calle-g"}, el("span", {class:"barrita g", "aria-hidden":"true"}, el("i", {style:"width:" + (g ? Math.max(3, g / as.length * 100) : 0) + "%"})),
                el("small", {texto:g ? fmt.format(g) + (g === 1 ? tx("panel.ya_cuidado") : tx("panel.ya_cuidados")) : tx("panel.ninguno_cuidado_aun")})); })()),
          abierta ? listaCuadras(k, as) : null);
      }), !verCalles && !q && total > 8 ? el("li", {}, el("button", {type:"button", class:"btn secondary", style:"width:100%;margin-top:10px", texto:tx("panel.ver_las_calles", {n:fmt.format(total)}), onclick:() => { verCalles = true; vistaColonia(); enfocarN(".calle-btn", 8); }})) : null)
        : sinCoincidencias(q);
    }
    cuerpo = [filtro, lista];
  }
  const hayLibres = arb.some(a => guardianes(a) === 0 && sePuedeCuidar(a)), viejo = $("filtro");
  if (SOLO_LISTA && viejo && viejo.parentNode && viejo.parentNode.id === "tp" && cuerpo[0] && cuerpo[0].id === "filtro"){
    for (const n of [...viejo.parentNode.childNodes]) if (n !== viejo) n.remove();
    viejo.parentNode.append(...cuerpo.slice(1));
  } else answer.replaceChildren(
    cabecera(conCol(c.n), tx("panel.colonia_sub", {alcaldia:munNom(c.m), cp:c.cp}), nCol(selCol)),
    hayLibres ? el("div", {class:"acciones-col"}, el("button", {type:"button", class:"btn", texto:tx("panel.elige_un_arbol_que_espera"), onclick:() => eligeUno(arb)})) : "",
    el("h3", {class:"sec-tit", texto:tx("panel.en_que_calle_vives")}),
    el("div", {class:"tabpanel", id:"tp"}, cuerpo),
    bloqueComparar(c, nCol(selCol), nCon, true));
  const kc = selCol + "|" + calleAbierta + "|" + cuadraAbierta; if (kc !== ultimaCalleMapa){ ultimaCalleMapa = kc; pintarMapa(); }
}
/* ===== Lote 2: la calle por cuadras, con los cruces de los ejes de vialidad de INEGI =====
   Los ejes de INEGI se cortan en cada cruce: los extremos de cada tramo son nodos. Los tramos de la misma calle que siguen
   sin cruce se juntan en una cuadra; cada árbol va al tramo más cercano; la cuadra se nombra con las calles que la cruzan. */
let NODOS = null, EJES_NOM = null, NOM_IDX = null;
const kNodo = v => Math.round(FPOS[2 * v] * Q) + "," + Math.round(FPOS[2 * v + 1] * Q);
function indicesCuadras(){
  if (NODOS) return;
  NODOS = new Map(); EJES_NOM = new Map(); NOM_IDX = new Map();
  P.names.forEach((n, i) => { const k = plano(n); if (!k) return; const l = NOM_IDX.get(k); if (l) l.push(i); else NOM_IDX.set(k, [i]); });
  for (let e = 0; e < NF; e++){
    if (FS[e + 1] - FS[e] < 2) continue;
    for (const v of [FS[e], FS[e + 1] - 1]){ const k = kNodo(v); const l = NODOS.get(k); if (l) l.push(e); else NODOS.set(k, [e]); }
    if (FN[e] >= 0){ const l = EJES_NOM.get(FN[e]); if (l) l.push(e); else EJES_NOM.set(FN[e], [e]); }
  }
}
/* El nombre del árbol trae el tipo de vialidad («Avenida Horacio»); el eje, solo el nombre («Horacio»). */
function nombresEje(calle){
  const w = (calle || "").split(/\s+/);
  const s = new Set();   // se juntan todas las formas: «Avenida Horacio» y «Horacio»
  for (let d = 0; d <= Math.min(2, w.length - 1); d++) for (const i of NOM_IDX.get(plano(w.slice(d).join(" "))) || []) s.add(i);
  return s.size ? s : null;
}
function cuadrasDe(calle, arbs){
  if (!calle || arbs.length < 2) return null;
  indicesCuadras();
  const idxs = nombresEje(calle); if (!idxs) return null;
  const KX = 105000, KY = 110700, xs = arbs.map(a => a.lng), ys = arbs.map(a => a.lat), mg = .0007;
  const caja = [Math.min(...xs) - mg, Math.min(...ys) - mg, Math.max(...xs) + mg, Math.max(...ys) + mg];
  // La calle se mide a lo largo de su dirección principal (este-oeste o norte-sur), en metros.
  const largo = (caja[2] - caja[0]) * KX >= (caja[3] - caja[1]) * KY, med = (x, y) => largo ? x * KX : y * KY;
  // Cortes: vértices de la calle donde termina un tramo de otra calle con nombre (los ejes de INEGI se cortan en los cruces).
  const cortes = [];
  for (const n of idxs) for (const e of EJES_NOM.get(n) || []) for (let v = FS[e]; v < FS[e + 1]; v++){
    const x = FPOS[2 * v], y = FPOS[2 * v + 1]; if (x < caja[0] || x > caja[2] || y < caja[1] || y > caja[3]) continue;
    const nombres = [];
    for (const o of NODOS.get(kNodo(v)) || []) if (FN[o] >= 0 && !idxs.has(FN[o])){ const t = P.names[FN[o]]; if (t && !SIN_NOMBRE.test(t) && !nombres.includes(t)) nombres.push(t); }
    if (nombres.length) cortes.push({m:med(x, y), x, y, nombres});
  }
  if (!cortes.length) return null;
  // Un mismo cruce aparece dos veces en avenidas con camellón: se juntan los cortes a menos de 18 m.
  cortes.sort((p, q) => p.m - q.m);
  const cs = [];
  /* v30d: y los de una misma calle a menos de 60 m (calles que no cruzan derecho): dejaban tramitos «Junto a» repetidos; el corte queda a la mitad */
  for (const c of cortes){ const u = cs[cs.length - 1], misma = u && c.m - u.m < 60 && c.nombres.some(n => u.nombres.includes(n));
    if (u && (c.m - u.m < 18 || misma)){ for (const n of c.nombres) if (!u.nombres.includes(n)) u.nombres.push(n);
      if (misma && c.m - u.m >= 18){ u.m = (u.m + c.m) / 2; u.x = (u.x + c.x) / 2; u.y = (u.y + c.y) / 2; } }
    else cs.push({m:c.m, x:c.x, y:c.y, nombres:[...c.nombres]}); }
  const grupos = new Map();
  for (const a of arbs){
    const m = med(a.lng, a.lat); let i = 0; while (i < cs.length && cs[i].m <= m) i++;   // entre cs[i-1] y cs[i]
    const l = grupos.get(i); if (l) l.push(a); else grupos.set(i, [a]);
  }
  if (grupos.size < 2) return null;   // una sola cuadra: no hace falta dividir
  const nom = c => c ? c.nombres[0] : null;
  const unidad = (p, q) => { const dx = (q.x - p.x) * KX, dy = (q.y - p.y) * KY, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const DIR = cs.length > 1 ? unidad(cs[0], cs[cs.length - 1]) : largo ? [1, 0] : [0, 1];   // dirección de toda la calle
  const res = [...grupos.entries()].sort((p, q) => p[0] - q[0]).map(([i, as]) => {
    const A = nom(cs[i - 1]), B = nom(cs[i]);
    as.sort((p, q) => med(p.lng, p.lat) - med(q.lng, q.lat));
    // Dónde está cada árbol: a cuántos metros de la esquina más cercana, para encontrarlo en la calle. Se mide A LO LARGO de la cuadra
    // (de esquina a esquina; en las de la orilla, la dirección de toda la calle): en avenidas con camellón, lo ancho no cuenta.
    const u = A && B ? unidad(cs[i - 1], cs[i]) : DIR;
    const dist = (a, c) => c ? Math.abs((a.lng - c.x) * KX * u[0] + (a.lat - c.y) * KY * u[1]) : Infinity;
    const lugar = a => { const dA = A ? dist(a, cs[i - 1]) : Infinity, dB = B ? dist(a, cs[i]) : Infinity, d = Math.min(dA, dB), calle = dA <= dB ? A : B;
      return d < 10 ? tx("panel.en_la_esquina_con", {calle}) : tx("panel.a_m_de_calle", {m:fmt.format(Math.round(d / 5) * 5), calle}); };
    const junto = !(A && B && A !== B);
    return {etq:junto ? tx("panel.cuadra_junto", {calle:A || B}) : tx("panel.cuadra_entre", {a:A, b:B}), junto, calleJ:A || B, despues:!!A, arbs:as, lugares:as.map(lugar)};
  });
  /* v30d: dos cuadras «Junto a» la misma calle (una de cada lado del cruce) llevan el lado; y cada cuadra, una clave única para abrirla sola */
  const LADO = largo ? [tx("panel.lado_poniente"), tx("panel.lado_oriente")] : [tx("panel.lado_sur"), tx("panel.lado_norte")];
  const rep = c => res.filter(x => x.etq === c.etq).length > 1;
  for (const c of res.filter(c => c.junto && rep(c))) c.etq2 = tx("panel.cuadra_junto_lado", {calle:c.calleJ, lado:LADO[c.despues ? 1 : 0]});
  for (const c of res) if (c.etq2) c.etq = c.etq2;
  res.forEach((c, j) => { c.clave = c.etq + "|" + res.slice(0, j).filter(x => x.etq === c.etq).length; });
  return res;
}
/* Foco después de rehacer el panel (v28i): el mismo botón (acordeones) o el primero de lo que se acaba de mostrar («Ver más»). */
const enfocar = k => { const b = [...answer.querySelectorAll("[data-foco]")].find(x => x.dataset.foco === k); if (b) b.focus({preventScroll:true}); };
const enfocarN = (sel, n) => requestAnimationFrame(() => { const b = answer.querySelectorAll(sel)[n]; if (b) b.focus(); });
/* Sin coincidencias en la caja de calle de la colonia (v28i): si la calle está en la colonia pero sin árboles en el inventario, se dice así;
   si no, se busca en toda la ciudad y se ofrecen hasta 5 lugares donde sí está, los más cercanos primero (antes solo «Ninguna calle o
   árbol coincide», también cuando la calle era de otra alcaldía). */
let COL_CENTRO = null;
const centroCol = i => { if (!COL_CENTRO) COL_CENTRO = new Map(COL_LBL.map(d => [d.i, d.pos])); return COL_CENTRO.get(i) || [vista.longitude, vista.latitude]; };
function sinCoincidencias(q){
  const nota = t => el("p", {class:"nota", texto:t});
  if (!q || q.length < 3 || /^\d+$/.test(q) || !CALLES_LISTAS) return nota(tx("panel.ninguna_calle_o_arbol_coincide"));
  if (frentesDe(selCol).some(f => FN[f] >= 0 && plano(P.names[FN[f]] || "").includes(q))) return nota(tx("panel.calle_sin_arboles", {colonia:colTxt(selCol)}));
  const c0 = centroCol(selCol), d = x => { const c = centroCol(x.i); return Math.hypot(c[0] - c0[0], (c[1] - c0[1]) * 1.06); };
  const otros = indiceCalles().filter(x => x.i !== selCol && x.k.includes(q)).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || d(a) - d(b)).slice(0, 5);
  if (!otros.length) return nota(tx("panel.ninguna_calle_o_arbol_coincide"));
  return el("div", {class:"en-otra"}, nota(tx("panel.no_esta_en", {colonia:colTxt(selCol)})),
    el("ul", {class:"lista"}, otros.map(x => el("li", {}, el("button", {type:"button", onclick:() => { irACalle(x); enfocarTitulo(); }}, el("span", {class:"n", texto:P.names[x.calle]}),
      el("span", {class:"c", texto:tx("panel.en_colonia_alcaldia", {colonia:colTxt(x.i), alcaldia:munNom(COLONIAS[x.i].m)})}))))));
}
/* El árbol que llegó de fuera de la lista (ARRIBA) va primero; los demás conservan su orden. */
let ARRIBA = null;
const primeroArriba = (arr, extra) => { const i = ARRIBA ? arr.indexOf(ARRIBA) : -1; if (i <= 0) return [arr, extra];
  const mover = x => x && [x[i], ...x.slice(0, i), ...x.slice(i + 1)]; return [mover(arr), mover(extra)]; };
function listaCuadras(k, as){
  const masBtn = n => el("li", {}, el("button", {type:"button", class:"mas", texto:tx("panel.ver_mas_restantes", {n:fmt.format(n)}), onclick:() => { const k = nCalle; nCalle += 40; vistaColonia(); enfocarN(".lista button[data-idc]", k); }}));
  const cs = cuadrasDe(esGrupoSinCalle(k) ? null : k, as);   /* v30: sin calle y patrimoniales no tienen cuadras */
  if (!cs){ const [orden] = primeroArriba(as);
    return el("ul", {class:"lista"}, orden.slice(0, nCalle).map(a => filaArbol(a, null, true)), as.length > nCalle ? masBtn(as.length - nCalle) : null); }
  const filas = [];
  for (const c of cs){
    const id = k + "|" + c.clave, abierta = cuadraAbierta === id, n = c.arbs.length, g = c.arbs.filter(a => guardianes(a) > 0).length;
    const xs = c.arbs.map(a => a.lng), ys = c.arbs.map(a => a.lat), m = .0004;
    filas.push(el("li", {class:"cuadra-li" + (abierta ? " abierta" : "")}, el("button", {type:"button", class:"cuadra-t", "data-foco":"cuadra:" + id, "aria-expanded":String(abierta),
      onclick:() => { cuadraAbierta = abierta ? null : id; nCalle = 40; vistaColonia(); enfocar("cuadra:" + id); if (!abierta) volar([Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m], padMapa()); }},
      el("b", {texto:c.etq}), el("span", {texto:fmt.format(n) + (n === 1 ? tx("panel.arbol_2") : tx("panel.arboles_2")) + (g ? " · " + fmt.format(g) + (g === 1 ? tx("panel.ya_cuidado") : tx("panel.ya_cuidados")) : "")}))));
    if (abierta){
      const [arbs, lugares] = primeroArriba(c.arbs, c.lugares);
      filas.push(...arbs.slice(0, nCalle).map((a, i) => filaArbol(a, lugares[i])));
      if (n > nCalle) filas.push(masBtn(n - nCalle));
    }
  }
  return el("ul", {class:"lista lista-cuadras", "aria-label":tx("panel.cuadras_de", {calle:k})}, filas);
}

/* ===== Lote 2: «Mis árboles». Se guarda solo el lugar del árbol, en este navegador; nada de la persona. ===== */
function guardarMeta(a){ const m = leerLocal(CLAVE.lugares, {}); m[a.idc] = {calle:a.calle || null, col:a.col, mun:a.mun, pat:a.pat ? a.pat.nombre : null}; guardarLocal(CLAVE.lugares, m); }
function actualizarMis(){ const n = PROPIOS.size, b = $("mis-btn"); if (!b) return; b.hidden = !n; $("mis-n").textContent = String(n); b.setAttribute("aria-label", tx("mis.boton", {n})); }
function guardaPagina(){
  return el("div", {class:"guarda"},
    el("p", {}, el("b", {texto:tx("mis.guarda_esta_pagina_para_volver")}), tx("mis.en_el_celular_abre_el")),
    el("p", {}, el("b", {texto:tx("mis.en_temporada_de_secas")}), tx("mis.recuerda_darle_agua_despacio_y")));
}
/* v31b (Liber): en la página del árbol adoptado, el recordatorio de agua es un aviso destacado, no texto corrido */
const avisoSecas = () => el("div", {class:"aviso-secas", role:"note"}, linea("gota"), el("p", {}, el("b", {texto:tx("mis.en_temporada_de_secas")}), tx("mis.recuerda_darle_agua_despacio_y")));
function abrirMis(){
  const m = $("m-mis"), mc = $("mc-mis"), meta = leerLocal(CLAVE.lugares, {}), ids = [...PROPIOS];
  const fila = (idc, a) => {
    const x = a ? {calle:a.calle, col:a.col, mun:a.mun, pat:a.pat ? a.pat.nombre : null} : meta[idc];
    const titulo = !x ? tx("mis.buscando_tu_arbol") : x.pat ? "«" + x.pat + "»" : (x.calle || tx("mis.arbol_sin_calle_registrada"));
    const lugar = x ? [x.col >= 0 && COLONIAS[colQueda(x.col)] ? colTxt(colQueda(x.col)) : null, x.mun ? munNom(x.mun) : null].filter(Boolean).join(", ") : "";
    const ir = async paso => { const t0 = TURNO, t = a || await buscarIdc(idc); cerrarModal(m); if (t0 !== TURNO) return; if (!t) return t === null ? aviso(tx("general.arbol_no_encontrado"), "error") : null; if (paso) abrirCuidar(t); else elegirArbol(t, {volar:true}); };
    return el("li", {}, el("b", {texto:titulo}), lugar ? el("span", {texto:lugar}) : null,
      el("div", {class:"mis-acc"}, el("button", {type:"button", class:"btn-txt", texto:tx("mis.ver_en_el_mapa"), onclick:() => ir(0)}), el("button", {type:"button", class:"btn-txt", texto:tx("mis.mi_reconocimiento"), onclick:() => ir(1)})));
  };
  const lis = ids.map(idc => { const li = fila(idc, null);
    if (!meta[idc]) buscarIdc(idc).then(a => { if (a){ guardarMeta(a); li.replaceWith(fila(idc, a)); } }, () => {});
    return li; });
  mc.replaceChildren(el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":tx("general.cerrar")}, linea("x")),
    el("h2", {id:"t-mis", texto:tx("general.mis_arboles")}),
    el("p", {class:"sub", texto:ids.length === 1 ? tx("mis.cuidas_un_arbol_gracias") : tx("mis.cuidas_n", {n:ids.length})}),
    el("ul", {class:"mis-lista"}, lis),
    guardaPagina(),
    el("p", {class:"nota", texto:tx("mis.esta_lista_se_guarda_solo")}));
  abrirModal(m);
}


/* Escala gráfica: una barra de 40 a 110 px con una distancia redonda (10 m … 20 km). */
function escala(){
  const e = $("escala"); if (!e || !vista || vista.zoom == null) return;
  const mpp = 156543.03 * Math.cos((vista.latitude || 19.4) * Math.PI / 180) / Math.pow(2, vista.zoom), max = 110 * mpp;
  const d = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(x => x <= max).pop() || 10;
  e.firstChild.style.width = Math.round(d / mpp) + "px"; e.lastChild.textContent = d >= 1000 ? fmt.format(d / 1000) + " km" : d + " m";
}
function repintarPanel(){
  const y = $("panel-body").scrollTop;
  if (selCol !== null) vistaColonia(); else if (selAlc !== null) vistaAlcaldia(); else return;
  $("panel-body").scrollTop = y;
}
const padMapa = () => esTel() ? {top:60, left:20, right:60, bottom:70} : 60;   /* v29: abajo, el botón «Ver la colonia…» */

/* ================= compartir ================= */
/* Compartir: WhatsApp, X, Facebook y copiar, como íconos. «propio» = la persona cuenta que ya lo cuida. */
const ICO = {
  wa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  fb:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.4 1.5-1.4h1.5V4.5a20 20 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.3H8.1v3h2.5V21h2.9z"/></svg>',
  liga:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>'};
const LINEA = {
  pin:'<path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  compartir:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 13.2l7.6 4.4M15.8 6.4l-7.6 4.4"/>',
  hoja:'<path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-14 14z"/><path d="M5 19l7.5-7.5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  gota:'<path d="M12 3.5c3.4 4 5.8 7.3 5.8 10.2a5.8 5.8 0 0 1-11.6 0c0-2.9 2.4-6.2 5.8-10.2z"/>',
  reiniciar:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  externa:'<path d="M8 16 16 8M10 8h6v6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',   // avisos: orientación
  alerta:'<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.3"/>'};   // avisos: no se pudo
const linea = k => { const s = el("span", {class:"ico", "aria-hidden":"true"}); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + LINEA[k] + '</svg>'; return s; };
const icono = k => { const s = el("span", {class:"ic"}); s.innerHTML = ICO[k]; return s; };
function compartir(a, est, propio){
  const url = urlArbol(a), col = colTxt(a.col), calle = a.calle, g = guardianes(a);
  const trato = tratoTx(borrador.trato, true);
  // Textos aprobados (10 oct 2026). {LIGA} marca dónde va la liga (antes era «L» y se confundía con la L de «Los Reyes»); sin número de árbol, con calle y colonia.
  const donde = calle ? tx("compartir.donde", {calle, colonia:col}) : col, dondeCorto = calle ? tx("compartir.donde_corto", {calle, colonia:col}) : col;
  const pat = a.pat ? tx("compartir.patrimonial", {nombre:a.pat.nombre}) : null;
  const cuantos = g === 1 ? tx("compartir.lo_cuida_1") : tx("compartir.lo_cuidan_n", {n:g});
  const plantilla = propio
    ? (pat ? tx("compartir.ya_soy_patrimonial", {trato, patrimonial:pat})
           : tx("compartir.ya_soy", {trato, donde:dondeCorto}))
    : g
      ? (pat ? tx("compartir.invitar_patrimonial_cuidan", {patrimonial:pat, cuantos})
             : tx("compartir.invitar_cuidan", {donde, cuantos}))
      : (pat ? tx("compartir.invitar_patrimonial_espera", {patrimonial:pat.charAt(0).toUpperCase() + pat.slice(1)})
             : tx("compartir.invitar_espera", {donde}));
  const msj = plantilla.replace("{LIGA}", url);                                   // WhatsApp, X y copiar: la liga va dentro del texto
  const msjSinLiga = plantilla.replace(/:?\s*\{LIGA\}/, "").replace(/\s+$/, "");    // menú de compartir del teléfono: la liga va aparte
  const msjWa = msj.replace(/\s*🌳/g, "");   // WhatsApp de escritorio en Windows convierte el emoji en un signo de interrogación al abrir la liga
  const ir = (k, t, href) => el("a", {class:"ic-btn", href, target:"_blank", rel:"noopener", "aria-label":t, title:t}, icono(k));
  /* v30i: en el celular también van los íconos (Liber probó en v30h un solo botón con el menú del teléfono y prefirió los íconos) */
  return el("div", {class:"compartir"},
    ir("wa", tx("compartir.compartir_por_whatsapp"), "https://wa.me/?text=" + encodeURIComponent(msjWa)),
    ir("x", tx("compartir.compartir_en_x"), "https://twitter.com/intent/tweet?text=" + encodeURIComponent(msj)),
    // Facebook no acepta texto prellenado (solo la liga) y en el celular su app intercepta la liga y abre el inicio, no la ventana de publicar.
    // Por eso: en celular se usa el menú nativo de compartir del teléfono (ahí aparece Facebook con el texto y la liga);
    // en computadora se copia el mensaje al portapapeles y se abre la ventana de Facebook para pegarlo.
    el("a", {class:"ic-btn", href:"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), target:"_blank", rel:"noopener", "aria-label":tx("compartir.compartir_en_facebook"), title:tx("compartir.compartir_en_facebook"),
      onclick:async e => {
        const movil = matchMedia("(pointer:coarse)").matches;
        if (movil && navigator.share){ e.preventDefault(); try { await navigator.share({title:tx("general.nombre_del_sitio"), text:msjSinLiga, url}); } catch {} return; }
        try { await navigator.clipboard.writeText(msj); est.textContent = tx("compartir.copiamos_tu_mensaje_pegalo_en"); } catch {}
      }}, icono("fb")),
    el("button", {type:"button", class:"ic-btn", "aria-label":tx("compartir.copiar_la_liga"), title:tx("compartir.copiar_la_liga"), onclick:async () => {
      try { await navigator.clipboard.writeText(msj); est.textContent = tx("compartir.mensaje_y_liga_copiados_pegalos"); }
      catch { est.textContent = tx("compartir.no_se_pudo_copiar", {liga:url}); } }}, icono("liga")));
}

/* ================= ficha del árbol ================= */
const card = $("card");
card.addEventListener("scroll", () => card.classList.toggle("desplazada", card.scrollTop > 40), {passive:true});
/* Clases del cuerpo para los estilos del celular: con-ficha y ficha-amplia (v28j: con la ficha amplia se esconden los controles del mapa).
   Al abrirse la ficha en el celular se pliega la simbología, que quedaba debajo (v28j). */
new MutationObserver(() => { const b = document.body, abre = !card.hidden && !b.classList.contains("con-ficha");
  b.classList.toggle("con-ficha", !card.hidden); b.classList.toggle("ficha-amplia", !card.hidden && card.classList.contains("amplia"));
  if (abre && esTel() && LEY_ABIERTA){ LEY_ABIERTA = false; leyenda(); } }).observe(card, {attributes:true, attributeFilter:["hidden", "class"]});
/* v28k (Liber: «que la manija se esconda al deslizar o al tocar en todas sus posiciones»): la ficha sigue al dedo; al soltar, hacia abajo
   pasa de amplia a compacta y de compacta a cerrada; hacia arriba, de compacta a amplia; un toque cambia entre compacta y amplia. */
{ let y0 = null, dy = 0, movio = false;
  const amplia = v => { fichaAmplia = v; if (selArb) pintarTarjeta(selArb); };
  card.addEventListener("pointerdown", e => { const g = e.target.closest(".ficha-grip"); if (!esTel() || !g) return; y0 = e.clientY; dy = 0; movio = false; g.setPointerCapture(e.pointerId); });
  card.addEventListener("pointermove", e => { if (y0 === null) return; dy = e.clientY - y0; if (Math.abs(dy) > 8) movio = true;
    if (movio){ card.style.transition = "none"; card.style.transform = "translateY(" + Math.max(0, dy) + "px)"; } });
  const soltar = (e, cancelado) => { if (y0 === null) return; y0 = null; card.style.transition = "transform .18s ease"; card.style.transform = "";
    if (cancelado) return;
    if (!movio){ amplia(!fichaAmplia); return; }
    if (dy > 50){ if (fichaAmplia) amplia(false); else cerrarTarjeta(); }
    else if (dy < -50 && !fichaAmplia) amplia(true); };
  card.addEventListener("pointerup", e => soltar(e, false)); card.addEventListener("pointercancel", e => soltar(e, true));
}
let fichaAmplia = false, CERCA = null;
/* v30j (Liber): la foto de la calle se pide una vez por visita; antes de pedirla se avisa que Google recibe la consulta. Después, la de los
   demás árboles sale sola. Solo vive en la memoria de la página: al recargar se vuelve a pedir. */
let SV_ACEPTADA = false;
const pedirStreetView = a => embedStreetView(a) && el("div", {class:"sv-pedir-caja"},
  el("div", {class:"sv-marco sv-pedir-marco"}, el("button", {type:"button", class:"sv-pedir", "aria-describedby":"sv-aviso", onclick:() => {
    SV_ACEPTADA = true; pintarTarjeta(a); const f = card.querySelector(".sv-marco iframe"); if (f) f.focus(); }}, linea("pin"), tx("ficha.ver_la_foto_de_la_calle"))),
  el("p", {class:"nota sv-aviso", id:"sv-aviso"}, tx("ficha.sv_aviso") + " ", el("button", {type:"button", class:"btn-txt", onclick:() => abrirPrivacidad()}, tx("general.aviso_de_privacidad"))));   /* CERCA: {idc, t} del árbol más cercano a la persona (06_panel, cercaDeMi) */
function pintarTarjeta(a){
  const g = guardianes(a), est = el("p", {class:"estado", "aria-live":"polite"}), cn = colTxt(a.col), mio = PROPIOS.has(a.idc);
  const estado = (a.pat ? tx("general.arbol_patrimonial") : "") + (g ? tx("ficha.ya_tiene_quien_lo_cuide") : tx("general.espera_quien_lo_cuide"));
  /* v30: en el celular la foto de la calle se pide al abrir la ficha amplia (en la compacta no se ve). v30h (decisión de Liber): en la computadora,
     al tocar «Ver la foto de la calle»; antes se cargaba sola y Google recibía cada ficha abierta. */
  const sv = esTel() && !fichaAmplia ? null : SV_ACEPTADA ? embedStreetView(a) : pedirStreetView(a);
  const extra = (k, t, icono) => el("button", {type:"button", class:"ficha-link", "data-k":k, "aria-expanded":String(fichaExtra === k), onclick:() => { fichaExtra = fichaExtra === k ? null : k; pintarTarjeta(a);
    const b = card.querySelector('.ficha-link[data-k="' + k + '"]'); if (b) b.focus(); }}, icono, t);   /* v30: el foco se queda en el botón al redibujar la ficha */
  const icoInv = linea("compartir"), icoAbc = linea("hoja");
  if (card.dataset.idc !== a.idc) fichaAmplia = false;
  card.classList.toggle("amplia", fichaAmplia);
  const partes = [el("button", {type:"button", class:"ficha-grip", "aria-expanded":String(fichaAmplia), "aria-label":fichaAmplia ? tx("ficha.ver_menos_de_la_ficha") : tx("ficha.ver_la_foto_de_la"),
      onclick:e => { if (esTel() && e.detail !== 0) return; fichaAmplia = !fichaAmplia; pintarTarjeta(a); }}   /* en el celular, el toque y el deslizón los atiende fichaManija; aquí, el teclado */, el("i", {"aria-hidden":"true"}), el("span", {texto:fichaAmplia ? tx("ficha.ver_menos") : tx("ficha.ver_la_foto_de_la_2")})),
    // Barra fija: al bajar por la ficha aparece una franja con el nombre y la X, y el contenido pasa por debajo (la X ya no se encima).
    el("div", {class:"ficha-barra"}, el("div", {class:"fb-fondo", "aria-hidden":"true"}, el("span", {class:"fb-t", texto:a.pat ? "«" + a.pat.nombre + "»" : (a.calle || tx("ficha.arbol_de", {colonia:cn}))})),
      el("button", {type:"button", class:"close", "aria-label":tx("ficha.cerrar_ficha"), onclick:cerrarTarjeta}, linea("x"))),
    el("p", {class:"tipo"}, el("i", {class:"mk " + (a.pat ? "mk-pat-" : "mk-arbol-") + (g ? "con" : "sin"), "aria-hidden":"true"}), estado),
    a.pat ? el("h2", {class:"num nombre-pat", texto:"«" + a.pat.nombre + "»"}) : el("h2", {class:"num calle-t", texto:a.calle || tx("ficha.arbol_de", {colonia:cn})}),
    el("p", {class:"sub"}, (a.pat ? a.pat.comun + " · " + (a.calle ? a.calle + " · " : "") : "") + cn + " · ", el("span", {class:"num-chico", texto:tx("ficha.numero", {arbol:a.idc})}))];
  if (a.pat) partes.push(el("a", {class:"btn-pat", href:urlPatrimonial(a), target:"_blank", rel:"noopener"}, el("img", {class:"btn-pat-sello", src:window.EMBLEMA_PAT, alt:""}), el("span", {}, el("b", {texto:tx("ficha.ver_su_ficha_de_arbol")}), el("small", {texto:tx("ficha.historia_medidas_y_decreto")})), linea("externa")));
  else if (a.esp) partes.push(el("p", {class:"sub", texto:a.esp + " (" + a.cien + ")"}));
  if (CERCA && CERCA.idc === a.idc) partes.push(el("p", {class:"cerca"}, linea("hoja"), CERCA.t));
  const iVerlo = partes.length;
  partes.push(sv ? el("div", {class:"verlo"}, sv) : el("a", {class:"btn secondary verlo-link", style:"margin-top:14px", href:urlStreetView(a), target:"_blank", rel:"noopener", texto:tx("ficha.es_este_verlo_en_street")}));
  // Contador de guardianes: lo primero que se lee después de la foto. Cero también se dice, con círculos vacíos.
  const otros = mio ? g - 1 : g, vis = Math.min(g, 6);
  partes.push(el("div", {class:"contador " + (mio ? "mio" : g ? "con" : "cero")},
    el("div", {class:"cifra"}, el("b", {texto:String(g)}), el("span", {texto:g === 1 ? tx("ficha.persona_guardiana") : tx("ficha.personas_guardianas")})),
    el("div", {class:"lado"},
      el("div", {class:"caras", "aria-hidden":"true"}, g ? [...Array.from({length:vis}, (_, i) => el("i", {class:mio && i === 0 ? "yo" : ""})), g > vis ? el("em", {texto:"+" + (g - vis)}) : null] : Array.from({length:3}, () => el("i", {class:"vacia"}))),
      el("p", {texto:mio ? (otros ? tx("ficha.tu_eres_parte_gracias") : tx("ficha.tu_lo_cuidas_gracias")) : g ? tx("ficha.puedes_sumarte") : tx("ficha.nadie_lo_cuida_todavia_puedes")}))));
  if (sePuedeCuidar(a)) partes.push(mio
    ? el("button", {type:"button", class:"btn btn-mio", onclick:() => abrirCuidar(a)}, linea("check"), tx("ficha.ver_mi_reconocimiento"))
    : el("button", {type:"button", class:"btn" + (g ? " btn-sumar" : " btn-primero"), texto:(g ? tx("ficha.sumate_yo_tambien_lo_cuido") : tx("ficha.se_la_primera_persona_en")), onclick:() => abrirCuidar(a)}));
  else partes.push(el("div", {class:"atn"}, el("b", {texto:tx("ficha.este_arbol_necesita_atencion_especializada")}), el("br"), tx("ficha.su_cuidado_corresponde_al_personal")));
  partes.push(el("div", {class:"ficha-links"},
    extra("inv", tx("ficha.invitar_a_alguien_a_cuidarlo"), icoInv), fichaExtra === "inv" ? el("div", {class:"desplegado"}, compartir(a, est), est) : null,
    extra("abc", tx("ficha.como_cuidarlo"), icoAbc), fichaExtra === "abc" ? el("div", {class:"desplegado"}, abcBloque(true)) : null));
  const y = card.scrollTop;
  card.classList.toggle("es-pat", !!a.pat);
  const viejo0 = card.dataset.idc === a.idc && !card.hidden ? card.querySelector(":scope > .verlo") : null;
  const viejo = viejo0 && viejo0.querySelector("iframe") && sv && sv.querySelector("iframe") ? viejo0 : null;   /* v30h: el recuadro «Ver la foto de la calle» sí se cambia por la foto */
  if (viejo){   // mismo árbol: el Street View no se vuelve a cargar
    while (viejo.previousSibling) viejo.previousSibling.remove();
    while (viejo.nextSibling) viejo.nextSibling.remove();
    viejo.before(...partes.slice(0, iVerlo)); viejo.after(...partes.slice(iVerlo + 1));
  } else card.replaceChildren(...partes);
  card.dataset.idc = a.idc; card.hidden = false;
  if (!fichaExtra && esTel()) card.scrollTop = 0;
  if (fichaExtra){ card.scrollTop = y; requestAnimationFrame(() => { const u = card.querySelector(".desplegado"); if (u) u.scrollIntoView({block:"nearest", behavior:"smooth"}); }); }
}
function cerrarTarjeta(){ card.hidden = true; const prev = selArb; selArb = null; pintarMapa(); repintarPanel(); marcarHistoria();
  if (esTel() && RESTAURANDO && ARBOL_DESDE_INFO) verInfo();   /* v29: con «atrás», el celular regresa a la lista de donde se eligió el árbol */
  const b = prev && (!esTel() || PANTALLA === "info") ? [...document.querySelectorAll(".lista button")].find(x => x.dataset.idc === prev.idc) : null;
  if (b) b.focus(); else if (esTel() && PANTALLA === "mapa") $("ver-info").focus({preventScroll:true}); else enfocarTitulo(); }   /* v30: si el árbol no está en la lista, el foco va al título */
card.addEventListener("keydown", e => { if (e.key === "Escape" && !card.hidden){ e.stopPropagation(); cerrarTarjeta(); } });   // la ficha es un diálogo: Escape la cierra
/* ===== v28i: turnos, historial y anuncios =====
   TURNO sube con cada elección (alcaldía, colonia, árbol). Lo que llega tarde (ubicación, ligas, «Mis árboles», «Para probar», un
   patrimonial tocado) revisa que nadie haya elegido otra cosa mientras; si sí, no pisa lo que la persona eligió. */
let TURNO = 0, RESTAURANDO = false, ATRAS_PROPIO = false, HISTORIA_PAUSA = false;
const hashDe = () => selArb ? "#arbol-" + selArb.idc : selCol !== null ? "#colonia-" + selCol : selAlc !== null ? "#alcaldia-" + selAlc : "";
/* Historial: cada lugar elegido deja una entrada, así «atrás» cierra la ficha, luego la colonia y luego la alcaldía (antes sacaba del
   sitio), y la dirección se puede compartir. De un árbol a otro se reemplaza la entrada; cerrar la ficha regresa a la entrada anterior. */
function marcarHistoria(){
  if (RESTAURANDO || HISTORIA_PAUSA) return;   /* v30: HISTORIA_PAUSA, mientras elegirArbol cambia de colonia por dentro (una sola entrada) */
  const nuevo = hashDe(), actual = location.hash, st = history.state || {};
  if (nuevo === actual) return;
  const url = location.pathname + location.search + nuevo;
  if (nuevo.startsWith("#arbol-") && actual.startsWith("#arbol-")) history.replaceState({prev:st.prev ?? null}, "", url);
  else if (st.prev === nuevo){ ATRAS_PROPIO = true; history.back(); }   /* v29: este «atrás» es del sitio, no de la persona */
  else history.pushState({prev:actual}, "", url);
}
function aplicarHash(h, op = {}){
  const [ruta, ...resto] = h.replace(/^#/, "").split("-"), param = resto.join("-"), t0 = TURNO;
  RESTAURANDO = true;
  try {
    if (ruta === "colonia" && COLONIAS[colQueda(+param)]){ const i = colQueda(+param); elegirColonia(i, {volar:op.volar !== false && i !== selCol}); }
    else if (ruta === "alcaldia" && ALC.some(a => a.cve === param)) elegirAlcaldia(param, {volar:op.volar !== false && (param !== selAlc || selCol !== null)});   /* v30: también de colonia a su alcaldía */
    else if (ruta === "arbol") buscarIdc(param).then(a => { if (t0 !== TURNO) return; RESTAURANDO = true;
      try { if (a) elegirArbol(a, {volar:true}); else if (a === null) aviso(tx("general.arbol_no_encontrado", {arbol:param}), "error"); } finally { RESTAURANDO = false; } });
    else if (!ruta && (selAlc !== null || selArb)) inicio();
  } finally { RESTAURANDO = false; }
  // una liga con el número viejo de una colonia unida queda con el de la que quedó
  if (ruta !== "arbol" && location.hash !== hashDe()) history.replaceState(history.state, "", location.pathname + location.search + hashDe());
}
addEventListener("popstate", () => { const propio = ATRAS_PROPIO; ATRAS_PROPIO = false;
  /* v30 (auditoría): el «atrás» que usa el sitio para limpiar la dirección no se vuelve a aplicar: si mientras tanto se eligió otra cosa
     (un árbol de otra colonia), aplicarlo cerraba la ficha recién abierta. Solo se acomoda la dirección. */
  if (propio){ if (location.hash !== hashDe()) marcarHistoria(); return; }
  /* v30: «atrás» con una ventana abierta (cuidar, reconocimiento, «Mis árboles», «Cómo funciona») cierra la ventana y deja todo lo demás */
  const ventana = document.querySelector(".modal:not([hidden])");
  if (ventana){ cerrarModal(ventana); history.pushState({prev:location.hash}, "", location.pathname + location.search + hashDe()); return; }
  if (location.hash !== hashDe()) aplicarHash(location.hash);
  /* v29: el «atrás» de la persona desde un árbol elegido en la lista regresa a la lista; cerrar la ficha (X o deslizar) se queda en el mapa */
  if (esTel() && ARBOL_DESDE_INFO && !selArb && !location.hash.startsWith("#arbol-")){ ARBOL_DESDE_INFO = false; verInfo({foco:true}); } });   /* v29: «atrás» desde un árbol elegido en la lista regresa a la lista */
function anunciar(t){ const a = $("anuncio"); if (a){ a.textContent = ""; requestAnimationFrame(() => { a.textContent = t; }); } }   // para lectores de pantalla: lo que cambió por el mapa o el buscador
function enfocarTitulo(){ const h = answer.querySelector(".cab h2"); if (h){ h.setAttribute("tabindex", "-1"); h.focus({preventScroll:true}); } }

/* ================= acciones principales ================= */
function inicio(){ elegirAlcaldia(null); }
function elegirAlcaldia(cve, op = {}){
  TURNO++;
  selAlc = cve || null; selCol = null; selArb = null; card.hidden = true; verCols = false;
  filtroCalle = ""; calleAbierta = null; cuadraAbierta = null; ARRIBA = null;   // lo de la colonia anterior ya no aplica
  if (selAlc) cargarAlcaldia(selAlc).then(() => { if (selAlc === cve){ mapsum(); pintarMapa(); repintarPanel(); } }, e => { aviso(e.message, "error"); if (selAlc === cve) mapsum(); });
  $("omni").value = ""; $("omni-clear").hidden = true;
  migas(); mapsum(); selAlc ? vistaAlcaldia() : vistaInicio(); pintarMapa();
  if (op.volar !== false) volar(selAlc ? bbox(ALC.find(a => a.cve === selAlc).polys) : CITY, selAlc ? padMapa() : padCiudad());
  $("panel-body").scrollTop = 0;
  marcarHistoria(); anunciar(selAlc ? tx("anuncio.alcaldia", {alcaldia:munNom(selAlc), n:fmt.format(nAlc(selAlc))}) : tx("anuncio.ciudad"));
  if (op.foco) enfocarTitulo();
}
function elegirColonia(i, op = {}){
  TURNO++;
  // Otra colonia, o la misma elegida otra vez desde el buscador («limpiar»): se borra lo de antes (calle, cuadra, filtro, árbol de arriba).
  if (selCol !== i || op.limpiar){ tab = "arboles"; filtroCalle = ""; filtroG = "todos"; verTodos = false; calleAbierta = null; cuadraAbierta = null; ARRIBA = null; verCalles = false; nCalle = 40; calleAuto = false; }
  selCol = i; selArb = null; card.hidden = true; selAlc = COLONIAS[i].m;
  if (!ARB_ALC.has(selAlc)) cargarAlcaldia(selAlc).then(() => { if (selCol === i){ mapsum(); pintarMapa(); repintarPanel(); } }, e => { aviso(e.message, "error"); if (selCol === i){ mapsum(); repintarPanel(); } });
  $("omni").value = COLONIAS[i].n; $("omni-clear").hidden = false;
  migas(); mapsum(); vistaColonia(); pintarMapa();
  if (op.volar) volar(bbox(COL_GEO.get(i)), padMapa(), Z_ARB + .3);   // como el mapa de Nueva York: al elegir colonia, se acerca hasta ver sus árboles
  $("panel-body").scrollTop = 0;
  marcarHistoria(); anunciar(tx("anuncio.colonia", {colonia:colTxt(i), alcaldia:munNom(COLONIAS[i].m), arboles:nArb(nCol(i))}));
  if (op.foco) enfocarTitulo();
}
/* Abre en el panel la cuadra del árbol dentro de su calle (calleAbierta). Sin calles cargadas todavía, la calle queda sin cuadras. */
function abrirCuadraDe(a){
  const k = calleAbierta, cs = cuadrasDe(k, arbolesDe(a.col).filter(x => calleTexto(x) === k)), c = cs && cs.find(x => x.arbs.includes(a));
  cuadraAbierta = c ? k + "|" + c.clave : null;
  if (c){ const i = c.arbs.indexOf(a); if (i >= nCalle) nCalle = Math.ceil((i + 1) / 40) * 40; }
}
const verArbolEnLista = () => requestAnimationFrame(() => { const b = document.querySelector('.lista button[aria-pressed="true"]'); if (b) b.scrollIntoView({block:"center"}); });
function elegirArbol(a, op = {}){
  HISTORIA_PAUSA = true;   /* v30: una sola entrada en el historial (la del árbol), aunque cambie de colonia */
  try {
    if (a.col >= 0 && a.col !== selCol) elegirColonia(a.col);
    // Fuera del catálogo de colonias (4.5 % de los árboles): el panel muestra su alcaldía (antes se quedaba en la colonia anterior).
    else if (a.col < 0 && (selCol !== null || selAlc !== a.mun)) elegirAlcaldia(a.mun, {volar:false});
  } finally { HISTORIA_PAUSA = false; }
  TURNO++;
  if (!op.desdeLista) ARRIBA = a;   // llegó por ubicación, mapa, liga o «Mis árboles»: va primero en su lista (después de cambiar de colonia, que lo borra)
  if (selArb !== a) fichaExtra = null; selArb = a;
  if (CERCA && CERCA.idc !== a.idc) CERCA = null;   /* v30: «el más cercano» solo para el árbol que se encontró con la ubicación */
  if (a.col >= 0){   // el panel abre la calle y la cuadra del árbol elegido (en el mapa, por ubicación o desde la lista)
    const k = grupoCalle(a); if (filtroCalle && !plano(k).includes(plano(filtroCalle))) filtroCalle = "";
    calleAbierta = k; if (a.calle) abrirCuadraDe(a); else cuadraAbierta = null;   /* v30: también sin calle (antes se quedaba abierta otra calle) */
  }
  pintarTarjeta(a); repintarPanel(); pintarMapa(); verArbolEnLista();
  if (op.volar){ const d = .0012; volar([a.lng - d, a.lat - d, a.lng + d, a.lat + d], esTel() ? {top:40, left:20, right:20, bottom:Math.round(innerHeight * .45)} : {top:60, left:60, right:400, bottom:60}, Z_TOQUE + .3); }   // siempre lo bastante cerca para tocar los árboles vecinos los arbolitos
  if (esTel()){ if (PANTALLA === "info") ARBOL_DESDE_INFO = true; else if (!RESTAURANDO) ARBOL_DESDE_INFO = false; verMapa(); }   /* v29: el árbol se ve en el mapa */
  const h = card.querySelector("h2"); h.setAttribute("tabindex", "-1"); h.focus({preventScroll:true});
  marcarHistoria();
}

/* ================= buscador ================= */
const omni = $("omni"), lista = $("omni-list");
const IDX = COLONIAS.map((c, i) => c ? {i, k:plano(c.n), cp:c.cp} : null).filter(Boolean);
let activo = -1, res = [], verMasBusq = false;
function marcar(t, q){ const p = plano(t).indexOf(q); return p < 0 || !q ? t : [t.slice(0, p), el("mark", {texto:t.slice(p, p + q.length)}), t.slice(p + q.length)]; }
/* Índice de calles: un renglón por calle y colonia (frentes de manzana INEGI). La gente busca su calle, no su colonia. */
let IDX_CALLES = null;
function indiceCalles(){
  if (IDX_CALLES) return IDX_CALLES;
  const vistos = new Map();
  for (let i = 0; i < NF; i++){ if (FN[i] < 0 || FC[i] < 0 || !COLONIAS[FC[i]]) continue; const k = FN[i] * 4096 + FC[i]; if (!vistos.has(k)) vistos.set(k, {calle:FN[i], i:FC[i], k:plano(P.names[FN[i]])}); }
  return IDX_CALLES = [...vistos.values()];
}
function buscar(){
  const q = plano(omni.value); $("omni-clear").hidden = !omni.value;
  if (q.length < 2 && !/^\d/.test(q)){ lista.hidden = true; omni.setAttribute("aria-expanded", "false"); return; }
  /* v28i: los resultados más cercanos primero (a la ubicación, la colonia elegida o el centro del mapa); por código postal, la colonia con
     más árboles primero; y «ver más» cuando no caben (antes se cortaban sin aviso: 8 colonias y 14 calles). */
  const ref = miPos || (selCol !== null ? centroCol(selCol) : [vista.longitude, vista.latitude]), lejos = i => { const c = centroCol(i); return Math.hypot(c[0] - ref[0], (c[1] - ref[1]) * 1.06); };
  const nC = verMasBusq ? 40 : 8, nK = verMasBusq ? 60 : 14, esCP = /^\d+$/.test(q);
  const colsT = IDX.filter(x => x.k.includes(q) || x.cp.startsWith(q))
    .sort((a, b) => esCP ? nCol(b.i) - nCol(a.i) : (b.k.startsWith(q) - a.k.startsWith(q)) || lejos(a.i) - lejos(b.i) || a.k.localeCompare(b.k));
  const callesT = q.length >= 3 && !esCP ? indiceCalles().filter(x => x.k.includes(q))
    .sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || lejos(a.i) - lejos(b.i) || a.k.length - b.k.length) : [];
  const cols = colsT.slice(0, nC).map(x => ({...x, tipo:"col"})), calles = callesT.slice(0, nK).map(x => ({...x, tipo:"calle"}));
  const faltan = colsT.length - cols.length + callesT.length - calles.length;
  // Sin alcaldía elegida, los resultados se agrupan por alcaldía (y se resalta en el mapa al pasar por ella).
  const todos = [...calles, ...cols];
  const grupos = new Map(); for (const x of todos){ const m = COLONIAS[x.i].m; if (!grupos.has(m)) grupos.set(m, []); grupos.get(m).push(x); }
  const ordenAlc = [...grupos.keys()];
  res = ordenAlc.flatMap(m => grupos.get(m));
  activo = -1; omni.removeAttribute("aria-activedescendant");   /* v30: antes apuntaba a una opción vieja */
  const filas = []; let n = 0;
  const fila = x => { const c = COLONIAS[x.i], k = n++;
    return el("li", {role:"option", id:"op-" + k, "aria-selected":"false", "data-alc":c.m, onmousedown:e => { e.preventDefault(); escoger(k); }, onmouseenter:() => resaltarAlc(c.m)},
      el("span", {}, x.tipo === "calle" ? [el("span", {class:"tipo-r", texto:tx("buscador.calle")}), marcar(P.names[x.calle], q)] : [el("span", {class:"tipo-r", texto:tx("buscador.colonia")}), marcar(c.n, q)]),
      el("span", {class:"m", texto:x.tipo === "calle" ? tx("buscador.en_colonia", {colonia:c.n}) : tx("buscador.cp_arboles", {cp:c.cp, arboles:nArb(nCol(x.i))})})); };
  for (const m of ordenAlc){ const g = grupos.get(m);
    filas.push(el("li", {class:"grupo-t alc-t", role:"presentation", onmouseenter:() => resaltarAlc(m)}, el("span", {texto:munNom(m)}), el("small", {texto:g.length === 1 ? tx("buscador.un_resultado") : tx("buscador.n_resultados", {n:fmt.format(g.length)})})));
    for (const x of g) filas.push(fila(x)); }
  if (faltan > 0){ const k = n++; res.push({tipo:"mas"});
    filas.push(el("li", {role:"option", id:"op-" + k, class:"ver-mas", "aria-selected":"false", onmousedown:e => { e.preventDefault(); escoger(k); }}, el("span", {texto:faltan === 1 ? tx("buscador.ver_uno_mas") : tx("buscador.ver_mas", {n:fmt.format(faltan)})}))); }
  const esperaCalles = !CALLES_LISTAS && !CALLES_FALLO && q.length >= 3 && !/^\d+$/.test(q);   /* v30: si no llegaron, no se espera para siempre */   // las calles llegan después del panel; al llegar se repite la búsqueda
  if (esperaCalles) filas.push(el("li", {class:"empty", role:"option", "aria-disabled":"true", texto:tx("buscador.cargando_calles")}));
  lista.replaceChildren(...(filas.length ? filas : [el("li", {class:"empty", role:"option", "aria-disabled":"true", texto:tx("buscador.no_encontramos_esa_calle_o")})]));
  lista.hidden = false; omni.setAttribute("aria-expanded", "true");
}
let calleAuto = false;
let alcResalta = null;
function resaltarAlc(m){ if (m === alcResalta) return; alcResalta = m; pintarMapa(); }
function escoger(n){
  const x = res[n]; if (!x) return;
  if (x.tipo === "mas"){ verMasBusq = true; buscar(); omni.focus(); return; }
  lista.hidden = true; omni.setAttribute("aria-expanded", "false"); omni.removeAttribute("aria-activedescendant"); alcResalta = null;
  if (x.tipo !== "calle"){ elegirColonia(x.i, {volar:true, limpiar:true}); return; }
  irACalle(x);
}
/* Abre una calle de una colonia (del buscador o de «No está en … La encontramos en:»): la colonia limpia, la calle filtrada y abierta, el mapa en la calle. */
function irACalle(x){
  elegirColonia(x.i, {volar:false, limpiar:true});
  filtroCalle = P.names[x.calle]; calleAuto = true; vistaColonia();
  let b = [180, 90, -180, -90];
  for (const f of frentesDe(x.i)) if (FN[f] === x.calle) for (let v = FS[f]; v < FS[f + 1]; v++){ const X = FPOS[2*v], Y = FPOS[2*v+1]; b = [Math.min(b[0], X), Math.min(b[1], Y), Math.max(b[2], X), Math.max(b[3], Y)]; }
  volar(b[0] < b[2] ? [b[0] - .0008, b[1] - .0008, b[2] + .0008, b[3] + .0008] : bbox(COL_GEO.get(x.i)), padMapa());
  $("omni").value = P.names[x.calle] + ", " + COLONIAS[x.i].n;
}
omni.addEventListener("input", () => { verMasBusq = false; buscar(); });
omni.addEventListener("keydown", e => {
  if (lista.hidden || !res.length){ if (e.key === "Enter") buscar(); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); activo = (activo + (e.key === "ArrowDown" ? 1 : -1) + res.length) % res.length;
    // Solo las opciones (los títulos de alcaldía no cuentan): antes el resaltado caía un renglón arriba de lo que se abría.
    lista.querySelectorAll('li[id^="op-"]').forEach(li => { const on = li.id === "op-" + activo; li.classList.toggle("active", on); li.setAttribute("aria-selected", String(on)); });
    omni.setAttribute("aria-activedescendant", "op-" + activo); $("op-" + activo).scrollIntoView({block:"nearest"}); if ($("op-" + activo).dataset.alc) resaltarAlc($("op-" + activo).dataset.alc); }
  else if (e.key === "Enter"){ e.preventDefault(); escoger(activo < 0 ? 0 : activo); }
  else if (e.key === "Escape"){ lista.hidden = true; omni.setAttribute("aria-expanded", "false"); omni.removeAttribute("aria-activedescendant"); }
});
omni.addEventListener("blur", () => setTimeout(() => { lista.hidden = true; omni.setAttribute("aria-expanded", "false"); omni.removeAttribute("aria-activedescendant"); resaltarAlc(null); }, 150));
$("omni-clear").addEventListener("click", () => { omni.value = ""; omni.focus(); buscar(); });

/* ================= herramientas del mapa ================= */
/* Pellizco del trackpad (separar o juntar dos dedos). El navegador lo manda como rueda con Ctrl y saltos muy chicos;
   con la velocidad de la rueda del ratón el acercamiento era lentísimo. Aquí se atiende aparte, alrededor del cursor. */
mapEl.addEventListener("wheel", e => {
  if (!e.ctrlKey) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const r = mapEl.getBoundingClientRect(), px = [e.clientX - r.left, e.clientY - r.top];
  const dy = Math.max(-60, Math.min(60, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
  const z = Math.max(MINZ, Math.min(20.5, vista.zoom - dy * .015));
  if (z === vista.zoom) return;
  const base = {longitude:vista.longitude, latitude:vista.latitude, zoom:vista.zoom, pitch:0, bearing:0, width:r.width, height:r.height};
  const ll = new WebMercatorViewport(base).unproject(px), c = new WebMercatorViewport({...base, zoom:z}).panByPosition(ll, px);
  irA({longitude:c.longitude, latitude:c.latitude, zoom:z, pitch:0, bearing:0, transitionDuration:0});
  escala(); clearTimeout(T_CAPAS); T_CAPAS = setTimeout(pintarCapas, 120);
}, {capture:true, passive:false});
const zoomA = d => irA({...vista, zoom:Math.max(MINZ, Math.min(20.5, vista.zoom + d)), transitionDuration:250});   /* v30: el mínimo es MINZ (antes 9: en el celular «−» podía acercar) */
$("zin").onclick = () => zoomA(1); $("zout").onclick = () => zoomA(-1);
$("zcity").onclick = () => volar(CITY, padCiudad());
/* Lejos, los árboles se enciman: al tocar uno, el mapa se acerca ahí para tocarlo de nuevo. */
function acercarParaElegir(c){
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  irA({...vista, longitude:c[0], latitude:c[1], zoom:Math.max(vista.zoom || 10, Z_TOQUE + .5), transitionDuration:reducido ? 0 : 700, transitionInterpolator:reducido ? undefined : new FlyToInterpolator()});   // sin aviso: acercarse ya se entiende solo (decisión de Liber, 11 oct)
}
/* El aviso va justo debajo de la tarjeta del lugar (arriba a la izquierda), alineado con ella: antes quedaba centrado y se encimaba con la tarjeta. */
function colocarAviso(a){
  const ms = $("mapsum"), par = a.offsetParent; if (!par) return;
  /* v30: en el celular, con la información a la vista, el aviso va arriba de ella (antes, sobre la tarjeta del lugar, que no se ve) */
  if (esTel() && PANTALLA === "info"){ Object.assign(a.style, {top:"10px", left:"10px", transform:"none", width:"calc(100% - 20px)", maxWidth:"none"}); return; }
  const r = ms && !ms.hidden ? ms.getBoundingClientRect() : null, pr = par.getBoundingClientRect();
  if (r && r.height){ a.style.top = Math.round(r.bottom - pr.top + 8) + "px"; a.style.left = Math.round(r.left - pr.left) + "px"; a.style.transform = "none";
    a.style.width = Math.max(280, Math.round(r.width)) + "px"; a.style.maxWidth = "calc(100% - " + (Math.round(r.left - pr.left) + 12) + "px)"; }   // mismo ancho que la tarjeta del lugar
  /* En celular la escala está bajo la tarjeta del lugar, donde sale el aviso: mientras se ve, baja debajo de él; si así taparía la
     simbología, se oculta hasta que se quite (pendiente 29). Desde v28j el celular no lleva norte. */
  const fin = Math.round(a.offsetTop + a.offsetHeight + 8), lg = $("legend");
  par.style.setProperty("--aviso-fin", fin + "px");
  par.classList.toggle("aviso-largo", !!lg && fin + 44 > lg.offsetTop);
}
/* Avisos del mapa. Tipos: «espera» (con círculo; se queda hasta que termina lo que se espera), «ok» (encontró un árbol),
   «guia» (orientación, o una búsqueda sin árbol cercano) y «error» (no se pudo). Los demás se quitan solos (7 s; 10 s si el texto es largo) o con su botón. */
const AV_ICONO = {ok:"hoja", guia:"info", error:"alerta"};   // hoja: la misma de «Mis árboles»
function aviso(t, tipo = "error"){ const a = $("aviso"), s = String(t), espera = tipo === "espera";
  a.replaceChildren(espera ? el("span", {class:"girando", "aria-hidden":"true"}) : linea(AV_ICONO[tipo] || "alerta"), el("span", {class:"av-tx", texto:s}),
    ...(espera ? [] : [el("button", {type:"button", class:"av-x", "aria-label":tx("general.cerrar_aviso"), onclick:() => { a.hidden = true; }}, linea("x"))]));
  a.className = "aviso t-" + tipo; a.hidden = false; colocarAviso(a);
  clearTimeout(aviso.c); aviso.c = setTimeout(() => { if (!a.hidden) colocarAviso(a); }, 500);   /* otra vez cuando el panel o el mapa terminan de moverse */
  if (!espera) anunciar(s);   /* v30: un role=status que aparece y cambia de texto a la vez a veces no se lee */
  clearTimeout(aviso.t); if (!espera) aviso.t = setTimeout(() => a.hidden = true, s.length > 90 ? 10000 : 7000);
}
/* Una búsqueda nueva (ubicación, mapa) borra la anterior: la calle buscada, su cuadra y el texto del buscador. */
function limpiarBusqueda(){ filtroCalle = ""; calleAbierta = null; cuadraAbierta = null; verCalles = false; nCalle = 40; calleAuto = false; CERCA = null; $("omni").value = ""; $("omni-clear").hidden = true; }
$("zloc").onclick = () => cercaDeMi(null);   // v28i: hace lo mismo que «Usar mi ubicación» (antes solo llevaba a la colonia, con otros tiempos)

/* ================= celular: dos pantallas (v29) ================= */
/* Como el mapa de árboles de Nueva York (video de Liber, 11 oct 2026): en el celular la información y el mapa son dos pantallas completas
   que se cambian con un botón («Ver el mapa» arriba de la información; en el mapa, abajo, el que dice qué se verá) y la información entra
   deslizándose desde la izquierda. Antes (Lote 3 a v28k) el panel salía desde abajo en tres alturas y el mapa quedaba en ~210 px en un
   iPhone, con controles encimados. Elegir un árbol lleva al mapa con su ficha; buscar una colonia o una calle se queda en la información
   (es lo que se pidió); tocar el mapa se queda en el mapa. En la computadora no cambia nada (panel a la izquierda). */
let PANTALLA = "info", ARBOL_DESDE_INFO = false;
const panelEl = document.querySelector(".panel"), mapaEl = document.querySelector(".mapwrap");
function pantalla(p, op = {}){
  if (!HAY_MAPA) p = "info";
  const antes = PANTALLA, tel = esTel(), b = document.body; PANTALLA = p;
  b.classList.toggle("ver-mapa", p === "mapa"); b.classList.toggle("ver-info", p === "info");
  panelEl.inert = tel && p === "mapa"; mapaEl.inert = tel && p === "info" && HAY_MAPA;   /* sin mapa, la ficha (que vive con el mapa) se abre sobre la información */   /* lo que queda fuera de la vista no recibe el foco */
  rotuloInfo(); if (!$("aviso").hidden) colocarAviso($("aviso"));
  if (tel && antes !== p){ const f = document.activeElement;
    if (op.foco || (f && f !== document.body && (p === "mapa" ? panelEl : mapaEl).contains(f))) $(p === "mapa" ? "ver-info" : "ver-mapa").focus({preventScroll:true}); }
}
const verMapa = op => pantalla("mapa", op), verInfo = op => pantalla("info", op);
/* El botón del mapa dice lo que se verá al volver a la información. */
function rotuloInfo(){ const t = $("ver-info-t"); if (!t) return;
  const s = calleAbierta && selCol !== null ? tx("ventanas.ver_la_calle") : selCol !== null ? tx("ventanas.ver_la_colonia") : selAlc !== null ? tx("ventanas.ver_la_alcaldia") : tx("ventanas.buscar_tu_arbol");
  if (t.textContent !== s) t.textContent = s; }
$("ver-mapa").onclick = () => verMapa({foco:true});
$("ver-info").onclick = () => verInfo({foco:true});
matchMedia("(max-width:860px)").addEventListener("change", () => pantalla(PANTALLA));
pantalla("info");
/* v28k: botones del mapa según el alto que le queda (iPhone con las barras de Safari, teléfono acostado): con menos de 210 px se
   quitan acercar y alejar (quedan ciudad y ubicación; se acerca con dos dedos o dos toques); con menos de 130, todos y la simbología. */
if (window.ResizeObserver) new ResizeObserver(() => { const h = mapEl.clientHeight, b = document.body;
  b.classList.toggle("mapa-bajo", esTel() && h < 210); b.classList.toggle("mapa-minimo", esTel() && h < 130); }).observe(mapEl);

/* ================= ventanas ================= */
/* --vvh: alto visible (con el teclado abierto se reduce); --encabezado-fin: dónde termina el encabezado (la ficha amplia empieza debajo, v28j). */
{ const vv = () => { const r = document.documentElement.style, b = document.querySelector(".barra");
    r.setProperty("--alto", innerHeight + "px");   /* v29c: alto de la página (en iOS 26, 100dvh dejaba una franja vacía abajo) */
    if (window.visualViewport) r.setProperty("--vvh", visualViewport.height + "px");
    if (b) r.setProperty("--encabezado-fin", Math.round(b.getBoundingClientRect().bottom) + "px"); };
  if (window.visualViewport) visualViewport.addEventListener("resize", vv); addEventListener("resize", vv); vv(); }
let antesDeModal = null;
function abrirModal(m){ if (m.hidden) antesDeModal = document.activeElement; m.hidden = false;   /* de un paso a otro de la misma ventana se conserva a dónde regresar */ const f = m.querySelector("h2"); f.setAttribute("tabindex", "-1"); f.focus(); }
function cerrarModal(m){ m.hidden = true;
  /* v30: si el botón que abrió la ventana ya no existe (la ficha se volvió a dibujar al cuidar), el foco va a la ficha o al título del panel */
  if (antesDeModal && antesDeModal.isConnected) antesDeModal.focus();
  else if (!card.hidden){ const h = card.querySelector("h2"); if (h){ h.setAttribute("tabindex", "-1"); h.focus({preventScroll:true}); } }
  else enfocarTitulo(); }
for (const m of document.querySelectorAll(".modal")){
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-cerrar]")) cerrarModal(m); });
  m.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarModal(m);
    if (e.key === "Tab"){ const f = [...m.querySelectorAll("button,a[href],input,textarea,summary")].filter(x => !x.disabled && x.offsetParent); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); } }
  });
}
$("mc-info").append(
  el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":tx("general.cerrar")}, linea("x")),
  el("h2", {id:"t-info", texto:tx("general.como_funciona")}),
  el("p", {texto:tx("ventanas.los_arboles_de_tu_calle")}),
  el("ol", {class:"pasos"},
    el("li", {}, el("b", {texto:tx("ventanas.busca_tu_calle_o_usa")}), tx("ventanas.veras_que_tan_verde_es")),
    el("li", {}, el("b", {texto:tx("ventanas.encuentra_un_arbol")}), tx("ventanas.de_cerca_cada_arbol_del")),
    el("li", {}, el("b", {texto:tx("ventanas.cuidalo")}), tx("ventanas.escribe_tu_nombre_y_guarda")),
    el("li", {}, el("b", {texto:tx("ventanas.invita")}), tx("ventanas.envia_la_liga_de_un"))),
  el("h3", {texto:tx("general.el_abc_de_tu_arbol")}), abcBloque(true),
  el("h3", {texto:tx("ventanas.que_miden_las_cifras_de")}),
  ...INDS.map(i => el("p", {}, el("b", {texto:i.n + ". "}), tx("ventanas.mide_y_fuente", {mide:i.mide, fuente:i.fuente}))),
  el("h3", {texto:tx("ventanas.preguntas_frecuentes")}),
  el("div", {class:"preguntas"},
    [[tx("ventanas.el_arbol_se_vuelve_mio"), tx("ventanas.no_el_reconocimiento_es_simbolico")],
     [tx("ventanas.guardan_mis_datos"), tx("ventanas.no_tu_nombre_tu_foto")]]
    .map(([q, r]) => el("details", {}, el("summary", {texto:q}), el("p", {texto:r})))),
  el("p", {}, el("button", {type:"button", class:"btn-txt", onclick:() => abrirPrivacidad()}, tx("general.aviso_de_privacidad"))),
  el("h3", {texto:tx("ventanas.sobre_esta_version")}),
  el("p", {class:"nota", texto:tx("ventanas.datos_inventario_de_arbolado_urbano")}),
  el("p", {class:"nota version-sitio", texto:tx("ventanas.version", {version:C.VERSION, fecha:C.FECHA_VERSION})}),
  el("div", {class:"pie-inst"},
    el("span", {class:"logo-inst pie-comp"}, el("img", {class:"logo-src", src:window.LOGO_INST, alt:tx("general.gobierno_de_la_ciudad_de")})),
    el("span", {class:"pie-ap"},
      el("span", {class:"logo-inst recorte"}, el("img", {src:window.LOGO_INST, alt:tx("ventanas.gobierno_de_la_ciudad_de_2")})),
      el("span", {class:"logo-inst derecha"}, el("img", {src:window.LOGO_INST, alt:tx("ventanas.sistema_de_informacion_ambiental")})))));
$("abrir-info").onclick = () => abrirModal($("m-info"));
/* v30j: aviso de privacidad general (Liber). Se abre desde la foto de la calle, «Cómo funciona» y el final del panel de inicio. */
{ const sec = (t, p) => [el("h3", {texto:tx(t)}), el("p", {texto:tx(p)})];
  $("mc-priv").append(
    el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":tx("general.cerrar")}, linea("x")),
    el("h2", {id:"t-priv", texto:tx("privacidad.titulo")}),
    el("p", {texto:tx("privacidad.intro")}),
    ...sec("privacidad.reconocimiento_t", "privacidad.reconocimiento"), ...sec("privacidad.navegador_t", "privacidad.navegador"),
    ...sec("privacidad.ubicacion_t", "privacidad.ubicacion"), ...sec("privacidad.google_t", "privacidad.google"),
    el("p", {}, el("a", {href:"https://policies.google.com/privacy?hl=es-419", target:"_blank", rel:"noopener", texto:tx("privacidad.google_liga")})),
    ...sec("privacidad.redes_t", "privacidad.redes"), ...sec("privacidad.servidor_t", "privacidad.servidor"),
    el("p", {class:"nota", texto:tx("privacidad.validar")})); }
function abrirPrivacidad(){ abrirModal($("m-priv")); }

/* ================= cuidar y reconocimiento ================= */
/* Cinco compromisos, uno por letra del ABC: lo que la persona promete es lo mismo que aprende. */
const COMPROMISOS = [
  {l:"A", t:tx("cuidar.le_doy_agua_en_secas"), d:tx("cuidar.despacio_y_al_pie_una")},
  {l:"B", t:tx("cuidar.cuido_que_su_cajete_respire"), d:tx("cuidar.sin_basura_sin_cemento_sin")},
  {l:"C", t:tx("cuidar.le_dejo_su_hojarasca"), d:tx("cuidar.lo_que_cae_lo_abriga")},
  {l:"D", t:tx("cuidar.no_lo_podo_ni_lo"), d:tx("cuidar.nada_clavado_ni_amarrado_la")},
  {l:"E", t:tx("cuidar.lo_miro_y_aviso_si"), d:tx("cuidar.paso_a_verlo_noto_sus")}];
/* Borrador del reconocimiento: vive solo en esta página. v30 (auditoría): uno por árbol; antes era uno solo y, al cuidar un segundo árbol,
   su reconocimiento salía con la foto, el nombre del árbol y el mensaje del primero. El nombre y el trato de la persona sí pasan al siguiente. */
const BORRADORES = new Map();
let borrador = {nombre:"", trato:null, nombreArbol:"", carta:"", foto:null};   /* v31: sin trato elegido por omisión (Liber) */
const borradorDe = a => { if (!BORRADORES.has(a.idc)) BORRADORES.set(a.idc, {nombre:borrador.nombre, trato:borrador.trato, nombreArbol:"", carta:"", foto:null}); return BORRADORES.get(a.idc); };
/* Trato: valor fijo y texto en textos.js (antes el texto visible servía de clave en tres tablas) */
const TRATOS = ["guardiana", "guardian", "persona"];
const tratoTx = (t, min) => ({guardiana:min ? tx("cuidar.trato_guardiana_min") : tx("cuidar.trato_guardiana"), guardian:min ? tx("cuidar.trato_guardian_min") : tx("cuidar.trato_guardian"),
  persona:min ? tx("cuidar.trato_persona_min") : tx("cuidar.trato_persona")})[TRATOS.includes(t) ? t : "persona"];
const IMG = {guinda:css("--guinda"), dorado:css("--dorado"), doradoClaro:css("--pat-crema"), gris:css("--ink-2"), tinta:css("--ink"), hoja:css("--verdor-5"), placa:css("--menta-2"), placaBorde:css("--gris-borde"), pat:css("--pat"), linea:css("--line")};
const imgLogo = new Image(); imgLogo.src = window.LOGO_INST;
const imgEmblema = new Image();   // se pide solo al abrir el reconocimiento de un árbol patrimonial
/* Librerías que solo se usan al ver o guardar el reconocimiento: se cargan entonces (Lote 5). */
const LIB = {qr:"vendor/qrcode-generator-1.4.4.js", pdf:"vendor/jspdf-4.2.1.umd.min.js"};
const fuentes = Promise.all(["700 76px Cabin", "400 30px Roboto", "500 30px Roboto", "italic 400 30px Roboto"].map(f => document.fonts.load(f))).catch(() => {});
function abrirCuidar(a, paso){
  const m = $("m-cuidar"), mc = $("mc-cuidar"); borrador = borradorDe(a);
  if (C.SIMULAR_GUARDIANES && SIM_MIOS.includes(a.idc) && !borrador.nombre) Object.assign(borrador, {nombre:tx("cuidar.ejemplo_nombre"), trato:"guardiana", nombreArbol:tx("cuidar.ej_la_sombrita").replace(/^Ej\.\s*/, ""), carta:tx("cuidar.ejemplo_mensaje")});
  mc.classList.toggle("es-pat", !!a.pat);
  if (!paso) paso = PROPIOS.has(a.idc) && borrador.nombre ? 2 : 1;
  const est = el("p", {class:"estado", "aria-live":"polite"});
  const cab = (t) => [el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":tx("general.cerrar")}, linea("x")), el("p", {class:"paso", texto:t})];
  if (paso === 1){
    mc.classList.add("angosta");
    const nombre = el("input", {type:"text", id:"f-nombre", maxlength:"60", autocomplete:"name", "aria-required":"true", placeholder:tx("cuidar.ej_fulana_de_tal"), value:borrador.nombre});
    const arbol = el("input", {type:"text", id:"f-arbol", maxlength:"40", placeholder:tx("cuidar.ej_la_sombrita"), value:borrador.nombreArbol});
    const carta = el("textarea", {id:"f-carta", maxlength:"120", rows:"2", placeholder:tx("cuidar.ej_gracias_por_la_sombra"), "aria-describedby":"a-carta"}); carta.value = borrador.carta;
    const cuenta = el("small", {id:"a-carta", texto:tx("cuidar.caracteres", {n:carta.value.length})}); carta.addEventListener("input", () => { cuenta.textContent = tx("cuidar.caracteres", {n:carta.value.length}); crecer(); });
    const crecer = () => { carta.style.height = "auto"; carta.style.height = carta.scrollHeight + "px"; };   /* v31: crece con lo que se escribe, sin barra (FRM-29) */
    const foto = el("input", {type:"file", id:"f-foto", accept:"image/*", class:"foto-input", "aria-describedby":"foto-nota"});
    const acepto = el("input", {type:"checkbox", id:"f-acepto", "aria-required":"true"});
    const trato = el("div", {class:"trato", role:"radiogroup", "aria-labelledby":"etq-trato", "aria-required":"true"},   /* v30: el nombre lo da su etiqueta visible (antes se decía dos veces) */
      TRATOS.map((t, i) => el("label", {}, el("input", {type:"radio", name:"trato", id:"f-trato-" + i, value:t, checked:t === borrador.trato}), tratoTx(t))));
    /* v30: la foto se puede quitar; si no se puede leer (HEIC en algunos navegadores) se dice; «Confirmar» espera a que termine de cargar.
       v30e: caja punteada «Agregar fotografía» con ícono de cámara; con foto, su miniatura y «Cambiar fotografía» (antes, el nombre del archivo) */
    const icoFoto = el("span", {class:"foto-ico", "aria-hidden":"true"});
    icoFoto.innerHTML = '<svg class="ico-svg" viewBox="0 0 24 24"><path d="M13.5 5h-4L8 7.5H5a2 2 0 0 0-2 2V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5"/><circle cx="11" cy="13.2" r="3"/><path d="M19 3v5M16.5 5.5h5"/></svg>';
    const mini = el("img", {class:"foto-mini", alt:""}), fotoT = el("span", {class:"foto-t"}), nota = el("small", {id:"foto-nota", class:"foto-nota"});
    const quitar = el("button", {type:"button", class:"btn-txt foto-quitar", texto:tx("cuidar.quitar_foto"), onclick:() => { borrador.foto = null; foto.value = ""; etiquetaFoto(); foto.focus(); }});
    const etiquetaFoto = (error) => { const hay = !!borrador.foto;
      fotoT.textContent = hay ? tx("cuidar.cambiar_fotografia") : tx("cuidar.agregar_fotografia");
      icoFoto.hidden = hay; mini.hidden = !hay; if (hay) mini.src = borrador.foto.src; else mini.removeAttribute("src");
      nota.textContent = error || tx("cuidar.foto_nota"); nota.classList.toggle("error", !!error); quitar.hidden = !hay; if (error) anunciar(error); };
    etiquetaFoto();
    let fotoCargando = null;
    foto.addEventListener("change", () => { const f = foto.files[0]; if (!f) return;
      fotoCargando = new Promise(listo => { const r = new FileReader();
        r.onload = () => { const im = new Image(); im.onload = () => { borrador.foto = im; etiquetaFoto(); anunciar(tx("cuidar.foto_lista")); listo(); };
          im.onerror = () => { borrador.foto = null; foto.value = ""; etiquetaFoto(tx("cuidar.foto_no_se_pudo")); listo(); }; im.src = r.result; };
        r.onerror = () => { etiquetaFoto(tx("cuidar.foto_no_se_pudo")); listo(); }; r.readAsDataURL(f); }); });
    /* v31 (Liber, con el Estándar de formularios del SIA): las obligatorias llevan asterisco y «obligatorio» para lectores de pantalla (FRM-30);
       al confirmar con alguna sin contestar no se envía (FRM-38), cada una muestra su mensaje con aria-invalid y aria-describedby (FRM-34, 37)
       y el foco va a la primera (pedido de Liber; el estándar pide un resumen arriba, FRM-33). El mensaje se quita al contestarla (FRM-36). */
    const oblig = () => [el("span", {class:"oblig", "aria-hidden":"true", texto:" *"}), el("span", {class:"solo-lector", texto:tx("cuidar.obligatorio")})];
    const errDe = id => el("p", {class:"campo-error", id, hidden:true});
    const errNombre = errDe("e-nombre"), errTrato = errDe("e-trato"), errAcepto = errDe("e-acepto");
    const marcar = (ctrl, err, t) => { const d = (ctrl.getAttribute("aria-describedby") || "").split(" ").filter(x => x && x !== err.id);
      if (t){ err.replaceChildren(linea("alerta"), t); err.hidden = false; ctrl.setAttribute("aria-invalid", "true"); d.push(err.id); }
      else { err.hidden = true; err.replaceChildren(); ctrl.removeAttribute("aria-invalid"); }
      if (d.length) ctrl.setAttribute("aria-describedby", d.join(" ")); else ctrl.removeAttribute("aria-describedby"); };
    nombre.addEventListener("input", () => { if (nombre.value.trim()) marcar(nombre, errNombre); });
    trato.addEventListener("change", () => marcar(trato, errTrato));
    acepto.addEventListener("change", () => { if (acepto.checked) marcar(acepto, errAcepto); });
    let enviando = false;
    const confirmar = async () => {
      if (enviando) return;   /* v30: un doble toque no confirma dos veces (en la etapa 2 contaría doble) */
      const tr = trato.querySelector("input:checked");
      borrador.nombre = nombre.value.trim(); borrador.nombreArbol = arbol.value.trim(); borrador.carta = carta.value.trim(); borrador.trato = tr ? tr.value : null;
      const revisar = [[!borrador.nombre, nombre, errNombre, tx("cuidar.escribe_tu_nombre_como_quieres"), nombre],
        [!tr, trato, errTrato, tx("cuidar.elige_una_opcion"), trato.querySelector("input")],
        [!acepto.checked, acepto, errAcepto, tx("cuidar.marca_me_comprometo_a_cuidarlo"), acepto]];
      for (const [mal, ctrl, err, t] of revisar) marcar(ctrl, err, mal ? t : null);
      const faltan = revisar.filter(r => r[0]);
      if (faltan.length){ est.textContent = faltan.length === 1 ? tx("cuidar.falta_1") : tx("cuidar.faltan_n", {n:faltan.length}); faltan[0][4].focus(); return; }
      est.textContent = tx("cuidar.guardando"); enviando = true;
      if (fotoCargando) await Promise.race([fotoCargando, new Promise(r => setTimeout(r, 8000))]);
      const r = await registrarGuardian(a); enviando = false;
      abrirCuidar(a, r === "nuevo" ? 2.1 : 2);
    };
    mc.replaceChildren(...cab(tx("cuidar.paso_1_de_2_tu")),
      el("h2", {id:"t-cuidar", texto:a.pat ? tx("cuidar.vas_a_cuidar_patrimonial", {nombre:a.pat.nombre}) : tx("cuidar.vas_a_cuidar_este_arbol")}),
      el("p", {class:"sub", texto:calleTexto(a) + " · " + colTxt(a.col) + ", " + munNom(a.mun)}),
      el("form", {novalidate:true, onsubmit:e => { e.preventDefault(); confirmar(); }},
        el("p", {class:"nota nota-oblig", texto:tx("cuidar.preguntas_obligatorias")}),
        el("div", {class:"campo"}, el("label", {for:"f-nombre"}, tx("cuidar.tu_nombre_como_quieres_que"), oblig()), nombre, errNombre),
        el("div", {class:"campo"}, el("span", {class:"etq-campo", id:"etq-trato"}, tx("cuidar.como_te_nombramos"), oblig()), trato, errTrato),
        el("div", {class:"campo"}, el("label", {for:"f-arbol"}, tx("cuidar.ponle_nombre_a_tu_arbol"), el("span", {class:"opc", texto:tx("cuidar.opcional")})), arbol),
        el("div", {class:"campo"}, el("label", {for:"f-carta"}, tx("cuidar.escribele_un_mensaje"), el("span", {class:"opc", texto:tx("cuidar.opcional")})), carta, cuenta),
        el("div", {class:"campo campo-foto"}, el("span", {class:"etq-campo"}, tx("cuidar.fotografia"), el("span", {class:"opc", texto:tx("cuidar.opcional")})),
          foto, el("label", {for:"f-foto", class:"foto-caja"}, icoFoto, mini, fotoT), nota, quitar),
        el("div", {class:"compromiso"}, el("b", {texto:tx("cuidar.al_cuidarlo_me_propongo")}),
          el("ol", {class:"comp-lista"}, COMPROMISOS.map(c => el("li", {}, el("i", {"aria-hidden":"true", texto:c.l}), el("span", {}, el("strong", {texto:c.t}), " ", c.d))))),
        el("p", {class:"nota nota-simbolico", texto:tx("cuidar.no_guardamos_tu_nombre_tu")}),   /* v31: arriba del pie fijo (abajo quedaba tapado por él) */
        el("div", {class:"fijo-abajo"}, el("label", {class:"acepto"}, acepto, el("span", {}, tx("cuidar.me_comprometo_a_cuidarlo"), oblig())), errAcepto,
          el("button", {type:"submit", class:"btn grande", texto:tx("cuidar.confirmar_lo_voy_a_cuidar")}), est)));
    abrirModal(m); requestAnimationFrame(crecer); return;
  }
  mc.classList.remove("angosta");
  const lz = el("canvas", {class:"lienzo", width:"1650", height:"1275", role:"img", "aria-label":tx("cuidar.tu_reconocimiento")});
  const lzG = el("canvas", {class:"lienzo lienzo-guia", width:"1275", height:"1650", role:"img", "aria-label":tx("cuidar.tu_guia_de_cuidado")});   /* v31b */
  const dib = () => { dibujar(lz, a, est); dibujarGuia(lzG, a); }, n = guardianes(a);
  const verbo = tratoTx(borrador.trato, true);
  let bajando = false;
  /* v30: antes de guardar se espera a las letras, el logo y el QR (sin internet el QR quedaba vacío sin aviso); un toque a la vez */
  const descargar = formato => async ev => { if (bajando) return; bajando = true; const bt = ev && ev.currentTarget; if (bt) bt.disabled = true; est.textContent = tx("cuidar.preparando");
    await Promise.allSettled([fuentes, imgLogo.decode(), cargarScript(LIB.qr)]); dib();
    if (typeof qrcode !== "function") est.textContent = tx("cuidar.sin_qr");
    /* v31b (Liber): la descarga incluye la guía de cuidado: en PDF, en la segunda hoja; en imagen, como un segundo archivo */
    const png = c => new Promise(r => c.toBlob(r, "image/png"));
    let ok;
    if (formato === "pdf") ok = await guardarPDF(lz, a, est);
    else { ok = await guardarArchivo(await png(lz), "reconocimiento-" + a.idc + ".png");
      await new Promise(r => setTimeout(r, 700));   /* dos descargas seguidas: algunos navegadores no aceptan la segunda al mismo tiempo */
      ok = ok && await guardarArchivo(await png(lzG), "guia-de-cuidado-" + a.idc + ".png"); }
    bajando = false; if (bt) bt.disabled = false; if (ok) est.textContent = formato === "pdf" ? tx("cuidar.listo_tu_reconocimiento_quedo_guardado") : tx("cuidar.listo_imagenes"); };
  /* v31b (Liber): un solo botón «Descargar» que pregunta el formato (antes «Descargar imagen» y «Descargar PDF») */
  const formatos = el("div", {class:"formatos", id:"formatos", hidden:true},
    el("p", {class:"formatos-t", texto:tx("cuidar.en_que_formato")}),
    el("div", {class:"formatos-bts"},
      el("button", {type:"button", class:"btn secondary grande", texto:tx("cuidar.formato_imagen"), onclick:descargar("png")}),
      el("button", {type:"button", class:"btn secondary grande", texto:tx("cuidar.formato_pdf"), onclick:descargar("pdf")})),
    el("p", {class:"nota", texto:tx("cuidar.incluye_la_guia")}));
  const btDesc = el("button", {type:"button", class:"btn grande", "aria-expanded":"false", "aria-controls":"formatos", texto:tx("cuidar.descargar"), onclick:() => {
    const abre = formatos.hidden; formatos.hidden = !abre; btDesc.setAttribute("aria-expanded", String(abre)); if (abre) formatos.querySelector("button").focus(); }});
  mc.replaceChildren(...cab(tx("cuidar.paso_2_de_2_tu")),
    el("h2", {id:"t-cuidar", texto:tx("cuidar.listo", {nombre:borrador.nombre, trato:verbo})}),
    el("p", {class:"sub", texto:n <= 1 ? tx("cuidar.eres_la_primera_persona_que") : tx("cuidar.ahora_lo_cuidan", {n})}),
    el("div", {class:"recono"},
      el("div", {class:"previas"}, el("figure", {class:"previa"}, lz, el("figcaption", {texto:tx("cuidar.tu_reconocimiento")})),
        el("figure", {class:"previa previa-guia"}, lzG, el("figcaption", {texto:tx("cuidar.guia_de_cuidado")}))),
      el("div", {class:"recono-acc"},
        el("div", {class:"descargar"}, btDesc, formatos), est, avisoSecas(),
        el("div", {class:"cuentalo"}, el("div", {}, el("p", {class:"etq-campo", texto:tx("cuidar.comparte_que_ya_cuidas_este")}), el("p", {class:"nota", texto:tx("cuidar.publicalo_en_tus_redes_e")})), compartir(a, est, true)),
        guiaCuidado(),
        el("div", {class:"recono-links"}, el("button", {type:"button", class:"btn-txt", texto:tx("cuidar.cambiar_mis_datos"), onclick:() => abrirCuidar(a, 1)}), el("button", {type:"button", class:"btn-txt", "data-cerrar":"", texto:tx("cuidar.volver_al_mapa")})))));
  abrirModal(m); dib(); fuentes.then(dib); imgLogo.decode().then(dib, () => {});
  cargarScript(LIB.qr).then(dib, () => {});
  if (a.pat){ if (!imgEmblema.src) imgEmblema.src = window.EMBLEMA_PAT; imgEmblema.decode().then(dib, () => {}); }
  if (paso === 2.1) est.textContent = "";
}
function lineas(cx, t, ancho){ const out = []; let l = ""; for (const w of t.split(/\s+/)){ const p = l ? l + " " + w : w; if (cx.measureText(p).width > ancho && l){ out.push(l); l = w; } else l = p; } if (l) out.push(l); return out; }
function escribir(cx, t, x, y, fuente, color, ancho, inter = 40, max = 0){ cx.font = fuente; cx.fillStyle = color; let ls = lineas(cx, t, ancho);
  if (max && ls.length > max){ ls = ls.slice(0, max); ls[max - 1] = ls[max - 1].replace(/»$/, "") + (t.endsWith("»") ? "…»" : "…"); }   /* v30: conserva las comillas de cierre */ ls.forEach((l, i) => cx.fillText(l, x, y + i * inter)); return y + (ls.length - 1) * inter; }
function dibujarQR(cx, url, x, y, tam){
  if (typeof qrcode !== "function"){ cx.strokeStyle = IMG.placaBorde; cx.strokeRect(x, y, tam, tam); return; }
  const qr = qrcode(0, "M"); qr.addData(url); qr.make(); const n = qr.getModuleCount(), m = tam / (n + 2);
  cx.fillStyle = "#fff"; cx.fillRect(x, y, tam, tam); cx.fillStyle = IMG.tinta;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cx.fillRect(Math.round(x + (c + 1) * m), Math.round(y + (r + 1) * m), Math.ceil(m), Math.ceil(m));
}
/* El cuerpo se dibuja con un factor k; si invade el pie se compacta. Solo si ni así cabe se avisa. */
function dibujar(lz, a, est){
  for (const k of [1, .92, .85, .78]) if (!dibujarCon(lz, a, k)){ if (est.dataset.largo){ est.textContent = ""; delete est.dataset.largo; } return; }
  est.textContent = tx("cuidar.el_texto_es_largo_y"); est.dataset.largo = "1";
}
/* Reconocimiento horizontal, tipo diploma (carta horizontal, 1650 × 1275). Patrimonial: morado del registro. */
function dibujarCon(lz, a, k){
  const ACC = a.pat ? IMG.pat : IMG.guinda, FIL = a.pat ? IMG.pat : IMG.dorado;
  const cx = lz.getContext("2d"), b = borrador, W = 1650, H = 1275, CX = W / 2, f = n => Math.round(n * k);
  cx.clearRect(0, 0, W, H); cx.fillStyle = "#FFFFFF"; cx.fillRect(0, 0, W, H); cx.textBaseline = "alphabetic";
  // marco doble
  cx.strokeStyle = ACC; cx.lineWidth = 6; cx.strokeRect(44, 44, W - 88, H - 88);
  cx.strokeStyle = FIL; cx.lineWidth = 2; cx.strokeRect(62, 62, W - 124, H - 124);
  if (imgLogo.complete && imgLogo.naturalWidth){ const lw = 900, lh = lw * imgLogo.naturalHeight / imgLogo.naturalWidth; cx.drawImage(imgLogo, CX - lw / 2, 118, lw, lh); }
  // Árbol patrimonial: el emblema de Árboles Patrimoniales como sello, arriba a la izquierda (el logo institucional sigue al centro)
  if (a.pat && imgEmblema.complete && imgEmblema.naturalWidth) cx.drawImage(imgEmblema, 104, 98, 196, 196 * imgEmblema.naturalHeight / imgEmblema.naturalWidth);
  const centro = (t, y, fuente, color, ancho = 1300, inter = 44, max = 1) => { cx.textAlign = "center"; const r = escribir(cx, t, CX, y, fuente, color, ancho, inter, max); cx.textAlign = "left"; return r; };
  cx.fillStyle = FIL; cx.fillRect(CX - 90, 238, 180, 3);
  cx.save(); cx.font = "600 26px Cabin"; cx.fillStyle = IMG.gris; cx.textAlign = "center"; if ("letterSpacing" in cx) cx.letterSpacing = "6px"; cx.fillText(tx("cuidar.reconocimiento_simbolico"), CX, 300); cx.restore();
  centro(tx("cuidar.se_reconoce_a"), 372, "400 32px Roboto", IMG.gris);
  // nombre, del tamaño que quepa
  /* v30 (auditoría): con foto, el nombre termina antes de ella (la foto va de x 1290 a 1530 y tapaba el final de nombres de unas 20
     letras); si aun a 56 px no cabe, va en dos renglones (antes se cortaba con «…») y lo de abajo baja. */
  const nom = b.nombre || tx("cuidar.tu_nombre"), anchoN = b.foto ? 890 : 1180;
  let tam = f(104), dy = 0; cx.font = `700 ${tam}px Cabin`; while (tam > 56 && cx.measureText(nom).width > anchoN){ tam -= 4; cx.font = `700 ${tam}px Cabin`; }
  if (cx.measureText(nom).width > anchoN){ tam = f(58); dy = 46; centro(nom, 452, `700 ${tam}px Cabin`, b.nombre ? ACC : IMG.placaBorde, anchoN, 62, 2); }
  else centro(nom, 480, `700 ${tam}px Cabin`, b.nombre ? ACC : IMG.placaBorde, anchoN);
  const comoQue = {guardiana:tx("cuidar.como_guardiana_del_arbol"), guardian:tx("cuidar.como_guardian_del_arbol"), persona:tx("cuidar.como_persona_guardiana_del_arbol")}[b.trato] || tx("cuidar.como_guardiana_del_arbol");
  centro(comoQue, 548 + dy, "400 34px Roboto", IMG.tinta);
  const nombreArbol = b.nombreArbol || (a.pat ? a.pat.nombre : "");
  let y = 548 + dy;
  if (nombreArbol){ y = centro("«" + nombreArbol + "»", 628 + dy, `700 ${f(60)}px Cabin`, IMG.tinta, 1300); }
  const lugar = (a.pat ? tx("general.arbol_patrimonial") : "") + (a.calle ? a.calle + " · " : "") + colTxt(a.col) + ", " + munNom(a.mun);
  y = centro(lugar, y + 56, "400 26px Roboto", IMG.gris, 1300, 32, 2);
  if (b.carta){ y = centro("«" + b.carta + "»", y + 64, `italic 400 ${f(32)}px Roboto`, IMG.tinta, 1100, f(42), 2); }
  // foto (opcional), en círculo a la derecha del nombre
  if (b.foto){ const im = b.foto, l = Math.min(im.naturalWidth, im.naturalHeight), r = 120, fx = W - 120 - 2 * r, fy = 330;
    cx.save(); cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.clip(); cx.drawImage(im, (im.naturalWidth - l) / 2, (im.naturalHeight - l) / 2, l, l, fx, fy, 2 * r, 2 * r); cx.restore();
    cx.strokeStyle = FIL; cx.lineWidth = 4; cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.stroke(); }
  // pie: compromisos · fecha · QR
  const yb = 930;
  cx.fillStyle = IMG.linea; cx.fillRect(120, yb - 40, W - 240, 2);
  escribir(cx, tx("cuidar.al_cuidarlo_me_propongo_2"), 130, yb + 10, "700 26px Cabin", IMG.tinta, 520);
  cx.font = "400 24px Roboto";
  COMPROMISOS.forEach((c, i) => { const yy = yb + 50 + i * 34; cx.fillStyle = ACC; cx.beginPath(); cx.arc(144, yy - 8, 13, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#FFFFFF"; cx.font = "700 16px Cabin"; cx.textAlign = "center"; cx.fillText(c.l, 144, yy - 2); cx.textAlign = "left";
    cx.fillStyle = IMG.tinta; cx.font = "400 23px Roboto"; cx.fillText(c.t, 168, yy); });
  centro(fechaHoy(), yb + 70, "500 30px Roboto", IMG.tinta);
  cx.fillStyle = IMG.tinta; cx.fillRect(CX - 170, yb + 90, 340, 1.5);
  centro(tx("general.ciudad_de_mexico"), yb + 124, "400 22px Roboto", IMG.gris);
  const q = 170, qx = W - 130 - q, qy = yb - 14;
  dibujarQR(cx, urlArbol(a), qx, qy, q);
  cx.textAlign = "center"; escribir(cx, tx("cuidar.visita_tu_arbol"), qx + q / 2, qy + q + 30, "400 20px Roboto", IMG.gris, 220); cx.textAlign = "left";
  centro(tx("cuidar.reconocimiento_simbolico_no_otorga_derechos"), H - 92, "400 19px Roboto", IMG.gris, 1300);
  return y > yb - 70;
}
/* PDF tamaño carta: página 1, el reconocimiento; página 2, el ABC de tu árbol. */
async function guardarPDF(lz, a, est){
  try { await cargarScript(LIB.pdf); } catch {}
  if (!window.jspdf){ est.textContent = tx("cuidar.no_se_pudo_preparar_el"); return false; }
  const doc = new window.jspdf.jsPDF({unit:"mm", format:"letter", orientation:"landscape"}), W = 215.9;
  doc.addImage(lz.toDataURL("image/png"), "PNG", 0, 0, 279.4, 215.9, undefined, "FAST");   // comprimida sin pérdida (sin esto el PDF pesaba 8 MB)
  doc.addPage("letter", "portrait");
  /* v30 (auditoría): colores del tablero (antes escritos a mano y algunos fuera de él); en un patrimonial, jacarandá como su hoja 1 */
  const ACC = a.pat ? IMG.pat : IMG.guinda, GRIS = IMG.gris, TINTA = IMG.tinta;
  doc.setDrawColor(ACC); doc.setLineWidth(1); doc.line(20, 20, W - 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(ACC); doc.text(tx("general.el_abc_de_tu_arbol"), 20, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(GRIS);
  doc.text((calleTexto(a) ? calleTexto(a) + ", " : "") + colTxt(a.col) + ", " + munNom(a.mun) + ".", 20, 43, {maxWidth:W - 40});
  let y = 56;
  for (const r of ABC){
    doc.setFillColor(css("--hoja")); doc.circle(26, y - 1.5, 5.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor("#FFFFFF"); doc.text(r.l, 26, y + .3, {align:"center"});
    doc.setTextColor(TINTA); doc.text(r.t, 37, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(GRIS);
    const ls = doc.splitTextToSize(r.largo, W - 57); doc.text(ls, 37, y + 5.5); y += 12 + ls.length * 4.4;
  }
  // Dos recuadros: lo que no se hace y cuándo avisar
  const caja = (x, w, titulo, items, color, fondo, pie) => {
    const alto = 11 + items.length * 4.6 + (pie ? 7 : 0);
    doc.setFillColor(fondo); doc.roundedRect(x, y, w, alto, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(color); doc.text(titulo, x + 4, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(css("--tinta-suave"));
    items.forEach((t, i) => doc.text("· " + t, x + 4, y + 12 + i * 4.6));
    if (pie){ doc.setFont("helvetica", "bold"); doc.text(pie, x + 4, y + 13 + items.length * 4.6); }
    return alto;
  };
  if (y > 212){ doc.addPage("letter", "portrait"); y = 28; }
  y += 2;
  const ancho = (W - 46) / 2, h1 = caja(20, ancho, tx("general.aunque_parezca_cuidado_no"), NO_HACER, ACC, css("--guinda-velo")),
    h2 = caja(26 + ancho, ancho, tx("general.avisa_si_ves"), AVISAR, css("--tinta-ambar"), css("--ambar-velo"), tx("cuidar.a_quien", {canal:CANAL_AVISO || tx("cuidar.canal_por_definir")}));
  y += Math.max(h1, h2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(GRIS);
  doc.text(tx("cuidar.reconocimiento_simbolico_no_otorga_derechos_2"), 20, 262, {maxWidth:W - 40});
  doc.text(tx("cuidar.secretaria_del_medio_ambiente_de"), 20, 270);
  return guardarArchivo(doc.output("blob"), "reconocimiento-" + a.idc + ".pdf");
}
/* v31b: la guía de cuidado como imagen (el segundo archivo al descargar en imagen), con el contenido de la hoja 2 del PDF y las letras del
   sitio. Carta vertical a 150 ppp (1275 px de ancho), medidas en milímetros y puntos como en el PDF; si no cabe, la imagen crece hacia abajo. */
function dibujarGuia(cv, a){
  const s = 1275 / 215.9, pt = 150 / 72, W = 215.9, cx = cv.getContext("2d");
  const ACC = a.pat ? IMG.pat : IMG.guinda, GRIS = IMG.gris, TINTA = IMG.tinta, SUAVE = css("--tinta-suave");
  const f = (peso, tam, fam) => peso + " " + Math.round(tam * pt) + "px " + fam + ", sans-serif";
  const pasada = pintar => {
    const txt = (t, x, y, fuente, color, alinear) => { if (!pintar) return; cx.font = fuente; cx.fillStyle = color; cx.textAlign = alinear || "left"; cx.fillText(t, x * s, y * s); };
    const parrafo = (t, x, y, ancho, fuente, color, inter) => { cx.font = fuente; const ls = lineas(cx, t, ancho * s);
      if (pintar){ cx.fillStyle = color; cx.textAlign = "left"; ls.forEach((l, i) => cx.fillText(l, x * s, (y + i * inter) * s)); } return ls.length; };
    if (pintar){ cx.fillStyle = "#FFFFFF"; cx.fillRect(0, 0, cv.width, cv.height); cx.strokeStyle = ACC; cx.lineWidth = s; cx.beginPath(); cx.moveTo(20 * s, 20 * s); cx.lineTo((W - 20) * s, 20 * s); cx.stroke(); }
    cx.textBaseline = "alphabetic";
    txt(tx("general.el_abc_de_tu_arbol"), 20, 34, f("700", 22, "Cabin"), ACC);
    const lugar = (calleTexto(a) ? calleTexto(a) + ", " : "") + colTxt(a.col) + ", " + munNom(a.mun) + ".";
    let y = 43 + (parrafo(lugar, 20, 43, W - 40, f("400", 11, "Roboto"), GRIS, 5) - 1) * 5 + 13;
    for (const r of ABC){
      if (pintar){ cx.fillStyle = css("--hoja"); cx.beginPath(); cx.arc(26 * s, (y - 1.5) * s, 5.5 * s, 0, 2 * Math.PI); cx.fill();
        cx.textBaseline = "middle"; txt(r.l, 26, y - 1.4, f("700", 13, "Cabin"), "#FFFFFF", "center"); cx.textBaseline = "alphabetic"; }
      txt(r.t, 37, y, f("700", 13, "Cabin"), TINTA);
      y += 12 + parrafo(r.largo, 37, y + 5.5, W - 57, f("400", 10, "Roboto"), GRIS, 4.4) * 4.4;
    }
    y += 2;
    const caja = (x, w, titulo, items, color, fondo, pie) => {
      cx.font = f("400", 9.5, "Roboto"); const ls = items.map(t => lineas(cx, "· " + t, (w - 8) * s)), nl = ls.reduce((n, l) => n + l.length, 0);
      const alto = 13 + nl * 4.6 + (pie ? 7 : 0);
      if (pintar){ cx.fillStyle = fondo; cx.beginPath(); if (cx.roundRect) cx.roundRect(x * s, y * s, w * s, alto * s, 3 * s); else cx.rect(x * s, y * s, w * s, alto * s); cx.fill(); }
      txt(titulo, x + 4, y + 6.5, f("700", 10.5, "Cabin"), color);
      let k = 0; for (const l of ls) for (const ln of l){ txt(ln, x + 4, y + 12 + k * 4.6, f("400", 9.5, "Roboto"), SUAVE); k++; }
      if (pie) txt(pie, x + 4, y + 13 + nl * 4.6, f("700", 9.5, "Roboto"), SUAVE);
      return alto; };
    const ancho = (W - 46) / 2, h1 = caja(20, ancho, tx("general.aunque_parezca_cuidado_no"), NO_HACER, ACC, css("--guinda-velo")),
      h2 = caja(26 + ancho, ancho, tx("general.avisa_si_ves"), AVISAR, css("--tinta-ambar"), css("--ambar-velo"), tx("cuidar.a_quien", {canal:CANAL_AVISO || tx("cuidar.canal_por_definir")}));
    y += Math.max(h1, h2) + 10;
    y += (parrafo(tx("cuidar.reconocimiento_simbolico_no_otorga_derechos_2"), 20, y, W - 40, f("400", 8.5, "Roboto"), GRIS, 4) - 1) * 4 + 6;
    txt(tx("cuidar.secretaria_del_medio_ambiente_de"), 20, y, f("400", 8.5, "Roboto"), GRIS);
    y += 6;
    if (imgLogo.complete && imgLogo.naturalWidth){ const lw = 110, lh = lw * imgLogo.naturalHeight / imgLogo.naturalWidth; if (pintar) cx.drawImage(imgLogo, 20 * s, y * s, lw * s, lh * s); y += lh; }
    return y + 14; };
  const alto = Math.max(1650, Math.ceil(pasada(false) * s)); if (cv.height !== alto) cv.height = alto;
  pasada(true);
}
/* Descarga con un enlace temporal. */
async function guardarArchivo(blob, archivo){
  const u = URL.createObjectURL(blob), aa = el("a", {href:u, download:archivo}); document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);   /* v30: 60 s (con 2 s algunos celulares no alcanzaban a guardar) */
  return true;
}

/* ================= arranque ================= */
$("usar-ubic").onclick = () => cercaDeMi($("usar-ubic"));
$("mis-btn").onclick = abrirMis; actualizarMis();
setLoad(tx("carga.listo"), 1); $("loader").hidden = true;
const ruta = location.hash.slice(1).split("-")[0];
mapsum(); vistaInicio(); pintarMapa();
requestAnimationFrame(() => { fijarMinZoom(); if (!location.hash) volar(CITY, padCiudad()); });   // ya con el tamaño final del mapa
if (ruta) aplicarHash(location.hash);   // #colonia-N (también el número viejo de una colonia unida), #alcaldia-CVE o #arbol-CLAVE
/* Calles: llegan después del panel. Se arman sus capas y se rehacen los índices que se calcularon sin ellas
   (cuadras, etiquetas, resaltado de la calle elegida y buscador de calles). */
callesTexto.then(async t => {
  await leerCalles(await gunzip(await deBase64EnRatos(t))); armarCapasCalles();
  COL_FR = null; NODOS = null; IDX_CALLES = null; STL.clear(); ETQ_CALLE.k = ""; CALLE_CACHE = {k:null, data:[]};
  CALLES_LISTAS = true; document.documentElement.dataset.calles = "listas";
  const abrir = selArb && selArb.col >= 0 && calleAbierta === calleTexto(selArb) && !cuadraAbierta;   // árbol elegido antes de que llegaran
  if (abrir) abrirCuadraDe(selArb);
  if (selCol !== null) repintarPanel();
  if (abrir && cuadraAbierta) verArbolEnLista();
  pintarMapa();
  if (!lista.hidden) buscar();
}).catch(e => { console.error(e); CALLES_FALLO = true; aviso(tx("carga.no_se_pudieron_cargar_las"), "error"); if (!lista.hidden) buscar(); });
})().catch(e => { const m = document.getElementById("load-msg"), T = window.TEXTOS || {};   /* v30: sin el error técnico (va a la consola) */
  if (m) m.textContent = e && e.paraPersona ? e.message : T["carga.error_general"]; console.error(e); });

