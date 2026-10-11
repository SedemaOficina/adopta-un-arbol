/* ================= datos ================= */
const setLoad = (msg, p) => { $("load-msg").textContent = msg; $("load-bar").style.width = (p * 100) + "%"; };
const deBase64 = t => { const s = atob(t.trim()), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
/* Todo el archivo entra de una vez: en pedazos (Blob.stream) la descompresión espera turno entre cuadro y cuadro del mapa
   y, con el mapa en movimiento, tardaba segundos en lugar de milisegundos (medido en el Lote 4.2). */
async function gunzip(b){ const ds = new DecompressionStream("gzip"), w = ds.writable.getWriter(); w.write(b).catch(() => {}); w.close().catch(() => {}); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
/* Lote 4.2: las calles (2.3 MB) se descargan aparte (datos/calles.txt) y en paralelo. El panel y el mapa de alcaldías y colonias
   aparecen sin esperarlas; al llegar, se agregan sus capas, etiquetas, cuadras y el buscador de calles (ver «calles» en el arranque). */
const conVersion = ruta => ruta + "?v=" + C.VERSION;   // el navegador no mezcla archivos de versiones distintas
const coloniasTexto = fetch(conVersion("datos/colonias.txt")).then(r => { if (!r.ok) throw new Error("no se pudieron descargar las colonias"); return r.text(); });
const callesTexto = fetch(conVersion("datos/calles.txt")).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
callesTexto.catch(() => {});   // el error se atiende en el arranque
setLoad(tx("carga.descomprimiendo_colonias"), .1);
const P = JSON.parse(new TextDecoder().decode(await gunzip(deBase64(await coloniasTexto))));
const Q = P.Q, PROM = P.prom;
setLoad(tx("carga.preparando_el_mapa"), .4); await new Promise(r => setTimeout(r, 16));
/* Ejes de vialidad (INEGI 2020): NF tramos; FN nombre, FC colonia, FS inicio de sus vértices en FPOS (lng, lat). Vacíos hasta que llegan. */
let NF = 0, FN = new Int32Array(0), FC = new Int32Array(0), FS = new Uint32Array(1), FPOS = new Float64Array(0), CALLES_LISTAS = false;
function leerCalles(raw){
  let rp = 0; const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return res % 2 ? -((res + 1) / 2) : res / 2; };
  const nf = rv(), fn = new Int32Array(nf), fc = new Int32Array(nf), fs = new Uint32Array(nf + 1), tmp = new Float64Array(raw.length);
  let px = 0, py = 0, nv = 0;
  for (let i = 0; i < nf; i++){ fn[i] = rv(); fc[i] = rv(); const k = rv(); fs[i] = nv; for (let j = 0; j < k; j++){ px += rv(); py += rv(); tmp[2*nv] = px / Q; tmp[2*nv+1] = py / Q; nv++; } }
  fs[nf] = nv; NF = nf; FN = fn; FC = fc; FS = fs; FPOS = tmp.slice(0, nv * 2);
}

const ring = r => r.map(p => [p[0] / Q, p[1] / Q]);
const COLS = P.cols.map(c => ({i:c.i, paths:c.rings.map(ring)}));
const COL_GEO = new Map(); for (const c of COLS){ const a = COL_GEO.get(c.i) || []; a.push(...c.paths); COL_GEO.set(c.i, a); }
const ALC = P.alc.map(a => ({cve:a.cve, nom:a.nom, polys:a.rings.map(ring)}));
const COLONIAS = P.colonias;   // índice = id de colonia; sin prioridad, rezago ni pobreza (decisión del proyecto)
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
  const pr = (async () => {
    // Archivo de texto en base64 (formato heredado del prototipo en Claude); dentro, el binario comprimido.
    const falla = () => new Error(tx("carga.error_arboles", {alcaldia:munNom(cve)}));
    const r = await fetch(conVersion("datos/arboles_" + cve + ".txt")).catch(() => { throw falla(); });   // sin internet: aviso en español, no «Failed to fetch»
    if (!r.ok) throw falla();
    const b = await gunzip(deBase64(await r.text()));
    let q = 0; const v = () => { let res = 0, sh = 0, x; do { x = b[q++]; res += (x & 0x7f) * Math.pow(2, sh); sh += 7; } while (x & 0x80); return res % 2 ? -((res + 1) / 2) : res / 2; };
    const n = v(), out = new Array(n); let c = 0, x = 0, y = 0;
    for (let i = 0; i < n; i++){
      c += v(); x += v(); y += v(); const u = v(), s = v(), calle = v(), cx = v(), cy = v(), h = v(), pt = v(), f = v();
      out[i] = {idc:INV.ugas[u] + "-" + String(s).padStart(4, "0"), lng:x / 1e6, lat:y / 1e6, col:c, mun:cve, calle:calle >= 0 ? INV.calles[calle] : null,
        cam:[(x + cx) / 1e6, (y + cy) / 1e6], rumbo:h, incl:pt, fecha:INV.fechas[f], pat:null};
    }
    for (const p of PAT.filter(p => p.mun === cve)){
      const t = p.inv && out.find(x => x.idc === p.inv);
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
async function buscarIdc(idc){
  const p = PAT.find(x => x.id === idc || x.inv === idc); if (p){ const a = await cargarAlcaldia(p.mun).catch(() => null); return a ? a.find(t => t.pat === p) || null : null; }
  const cve = ABR2MUN[idc.slice(0, 3)]; if (!cve) return null; const a = await cargarAlcaldia(cve).catch(() => null); return a ? a.find(t => t.idc === idc) || null : null; }

/* Conteos reales del inventario por colonia y alcaldía (vienen en el paquete de datos). */
const nCol = c => (COLONIAS[c] && COLONIAS[c].arb) || 0, nAlc = m => (INV.alc[m] || {arb:0}).arb;
const TOTAL = Object.values(INV.alc).reduce((s, x) => s + x.arb, 0);
/* Cinco tonos de verde por número de árboles, calculados entre las piezas que se comparan (alcaldías entre sí, o las colonias de una alcaldía). */
const VERDES = ["#E3ECDF", "#C3D9BC", "#97BE8E", "#6A9E62", "#3E6B48"].map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
/* El color del mapa es el verdor de las calles (satélite, igual en toda la ciudad), con cortes fijos para que alcaldías y colonias se lean con la misma escala.
   El número de árboles del inventario NO colorea el mapa: depende de cuánto se ha levantado en cada alcaldía. */
const CORTES_V = [40, 55, 70, 80], SIN_DATO = [221, 221, 216];
const colorV = v => v == null ? SIN_DATO : VERDES[CORTES_V.filter(x => v >= x).length];
const vAlc = m => (P.alcInd[m] || {}).v, vCol = i => COLONIAS[i] ? COLONIAS[i].v : null;

