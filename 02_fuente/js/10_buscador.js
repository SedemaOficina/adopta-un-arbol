/* ================= buscador ================= */
const omni = $("omni"), lista = $("omni-list");
/* v32b (auditoría del 20 oct, C2-01; decisión de Liber): se busca palabra por palabra, en cualquier orden, sin el tipo de vía ni sus
   abreviaturas y sin artículos ni preposiciones, de los dos lados (lo escrito y el nombre). Antes la búsqueda pedía el texto seguido y el
   nombre de INEGI viene sin el tipo: «Avenida Horacio», «Av. Horacio», «Loma Alta Batalla» o «Eje 8 Sur» no daban nada, aunque la ficha
   dice «Avenida Horacio». También se encuentran las alcaldías y, con una palabra más, la colonia de una calle («Horacio Polanco»).
   Cada palabra escrita puede ir a medias («hora» encuentra «Horacio»). Tolerar una letra equivocada queda para después de la prueba con
   personas (decisión de Liber). */
const TIPO_VIA = new Set(("avenida av ave avda calle c cll calzada calz cerrada cda cerr privada priv prv pvda andador and callejon cjon callejoncito " +
  "prolongacion prol circuito cto peatonal retorno ret continuacion cont carretera carr periferico perif autopista diagonal diag boulevard blvd bulevar " +
  "boul viaducto corredor pasaje psje ampliacion ampl camino cam eje vial col colonia alcaldia").split(" "));
const VACIAS = new Set("de del la las los el y a en".split(" "));
const palabrasDe = t => plano(t).match(/[a-z0-9]+/g) || [];
/* Las palabras que cuentan: sin tipo de vía y sin artículos; si así no queda ninguna («Calle A»), las que había antes de quitarlas. */
function palabrasClave(t){ const w = palabrasDe(t), s = w.filter(x => !TIPO_VIA.has(x)), v = s.filter(x => !VACIAS.has(x)); return v.length ? v : s.length ? s : w; }
/* null si alguna palabra buscada no está; si están todas: 0 = el mismo nombre, 1 = el nombre empieza con lo buscado y en ese orden
   («Eje 8 Sur» → «8 Sur (calzada Ermita Iztapalapa)», «Narvarte» → «Narvarte Poniente»), 2 = palabras completas en otro orden o con otras
   en medio, 3 = alguna a medias. extra: palabras que también cuentan (la colonia de una calle), sin bastar solas. */
function compararPalabras(qt, nt, extra){
  let completas = true, enNombre = 0;
  for (const p of qt){
    if (nt.includes(p)){ enNombre++; continue; }
    if (nt.some(x => x.startsWith(p))){ enNombre++; completas = false; continue; }
    if (extra && extra.some(x => x.startsWith(p))){ if (!extra.includes(p)) completas = false; continue; }
    return null;
  }
  if (!enNombre) return null;
  if (!completas) return 3;
  const enOrden = enNombre === qt.length && qt.every((p, i) => nt[i] === p);
  return enOrden && nt.length === qt.length ? 0 : enOrden ? 1 : 2;
}
/* Cuántas de las palabras escritas tal cual (con tipo) están en el nombre: desempata «Ampliación Gabriel Hernández» de «Gabriel Hernández». */
const tal = (qw, t) => qw.filter(p => palabrasDe(t).some(x => x.startsWith(p))).length;
const IDX = COLONIAS.map((c, i) => c ? {i, t:palabrasClave(c.n), cp:c.cp} : null).filter(Boolean);
const IDX_ALC = ALC.map(a => ({m:a.cve, t:palabrasClave(a.nom)}));
let activo = -1, res = [], verMasBusq = false;
/* Resalta en el nombre el principio de cada palabra que coincide con una buscada. */
function marcar(t, qw){
  const out = []; let u = 0;
  for (const m of t.matchAll(/[\p{L}\p{N}]+/gu)){ const p = plano(m[0]), q = qw.filter(x => p.startsWith(x)).sort((a, b) => b.length - a.length)[0]; if (!q) continue;
    out.push(t.slice(u, m.index), el("mark", {texto:m[0].slice(0, q.length)})); u = m.index + q.length; }
  return out.length ? [...out, t.slice(u)] : t; }
/* Índice de calles: un renglón por calle y colonia (frentes de manzana INEGI). La gente busca su calle, no su colonia. */
let IDX_CALLES = null;
function indiceCalles(){
  if (IDX_CALLES) return IDX_CALLES;
  const vistos = new Map(), pal = new Map(), colT = new Map();
  for (let i = 0; i < NF; i++){ if (FN[i] < 0 || FC[i] < 0 || !COLONIAS[FC[i]]) continue; const k = FN[i] * 4096 + FC[i]; if (vistos.has(k)) continue;
    if (!pal.has(FN[i])) pal.set(FN[i], palabrasClave(P.names[FN[i]])); if (!colT.has(FC[i])) colT.set(FC[i], palabrasClave(COLONIAS[FC[i]].n));
    vistos.set(k, {calle:FN[i], i:FC[i], t:pal.get(FN[i]), ct:colT.get(FC[i])}); }
  return IDX_CALLES = [...vistos.values()];
}
/* Calles que coinciden con lo escrito, de la mejor a la peor y, entre iguales, de la más cercana a ref a la más lejana. */
function buscarCalles(q, ref, filtro){
  const qt = palabrasClave(q), qw = palabrasDe(q), lejos = i => { const c = centroCol(i); return Math.hypot(c[0] - ref[0], (c[1] - ref[1]) * 1.06); };
  const r = [];
  for (const x of indiceCalles()){ if (filtro && !filtro(x)) continue; const s = compararPalabras(qt, x.t, x.ct); if (s !== null) r.push({...x, s, d:lejos(x.i), w:tal(qw, P.names[x.calle])}); }
  return r.sort((a, b) => a.s - b.s || b.w - a.w || a.d - b.d || P.names[a.calle].length - P.names[b.calle].length);
}
function buscar(){
  const q = plano(omni.value); $("omni-clear").hidden = !omni.value;
  if (q.length < 2 && !/^\d/.test(q)){ lista.hidden = true; omni.setAttribute("aria-expanded", "false"); return; }
  /* v28i: los resultados más cercanos primero (a la ubicación, la colonia elegida o el centro del mapa); por código postal, la colonia con
     más árboles primero; y «ver más» cuando no caben (antes se cortaban sin aviso: 8 colonias y 14 calles).
     v32b: primero lo que coincide con palabras completas y, entre eso, alcaldías, colonias y calles (si se escribió «Avenida», «Calle»…,
     primero calles; así Enter con «Narvarte» abre la colonia y no «Calle Hacienda Narvarte» de Villa Cuemanco, E3-06); después lo que
     coincide a medias. Los números de 1 a 4 cifras buscan también calles («Avenida 508», «Calle 5»: 213 calles, C1-07); de 4 o 5, códigos postales. */
  const ref = miPos || (selCol !== null ? centroCol(selCol) : [vista.longitude, vista.latitude]), lejos = i => { const c = centroCol(i); return Math.hypot(c[0] - ref[0], (c[1] - ref[1]) * 1.06); };
  const nC = verMasBusq ? 40 : 8, nK = verMasBusq ? 60 : 14, esNum = /^\d+$/.test(q), esCP = esNum && q.length >= 4;
  const qt = palabrasClave(q), qw = palabrasDe(q), pideCalle = qw.some(x => TIPO_VIA.has(x) && !["col", "colonia", "alcaldia"].includes(x));
  const alcs = esNum ? [] : IDX_ALC.map(x => ({...x, s:compararPalabras(qt, x.t)})).filter(x => x.s !== null).map(x => ({...x, tipo:"alc"}));
  const colsT = IDX.map(x => ({...x, s:esNum ? (x.cp.startsWith(q) ? (x.cp === q ? 0 : 1) : null) : compararPalabras(qt, x.t)})).filter(x => x.s !== null)
    .map(x => ({...x, w:tal(qw, COLONIAS[x.i].n), d:lejos(x.i)}))
    .sort((a, b) => esCP ? nCol(b.i) - nCol(a.i) : a.s - b.s || b.w - a.w || a.d - b.d || COLONIAS[a.i].n.localeCompare(COLONIAS[b.i].n));
  const callesT = (esNum ? q.length <= 4 : q.length >= 3) && CALLES_LISTAS ? buscarCalles(q, ref) : [];
  const cols = colsT.slice(0, nC).map(x => ({...x, tipo:"col"})), calles = callesT.slice(0, nK).map(x => ({...x, tipo:"calle"}));
  const faltan = colsT.length - cols.length + callesT.length - calles.length;
  const ORDEN = pideCalle || (esNum && !esCP) ? {calle:0, col:1, alc:2} : {alc:0, col:1, calle:2}, peso = x => esCP && x.tipo === "col" ? 0 : x.s >= 3 ? 1 : 0;
  const todos = [...alcs, ...calles, ...cols].sort((a, b) => peso(a) - peso(b) || ORDEN[a.tipo] - ORDEN[b.tipo]);   /* estable: dentro de cada tipo, su orden */
  // Sin alcaldía elegida, los resultados se agrupan por alcaldía (y se resalta en el mapa al pasar por ella).
  const alcDe = x => x.tipo === "alc" ? x.m : COLONIAS[x.i].m;
  const grupos = new Map(); for (const x of todos){ const m = alcDe(x); if (!grupos.has(m)) grupos.set(m, []); grupos.get(m).push(x); }
  const ordenAlc = [...grupos.keys()];
  res = ordenAlc.flatMap(m => grupos.get(m));
  activo = -1; omni.removeAttribute("aria-activedescendant");   /* v30: antes apuntaba a una opción vieja */
  const filas = []; let n = 0;
  const fila = x => { const m = alcDe(x), c = x.tipo === "alc" ? null : COLONIAS[x.i], k = n++;
    const [tipo, nombre, sub] = x.tipo === "alc" ? [tx("buscador.alcaldia"), munNom(m), tx("buscador.alc_colonias", {n:fmt.format(coloniasDe(m).length), arboles:nArb(nAlc(m))})]
      : x.tipo === "calle" ? [tx("buscador.calle"), P.names[x.calle], tx("buscador.en_colonia", {colonia:c.n})] : [tx("buscador.colonia"), c.n, tx("buscador.cp_arboles", {cp:c.cp, arboles:nArb(nCol(x.i))})];
    return el("li", {role:"option", id:"op-" + k, "aria-selected":"false", "data-alc":m, onmousedown:e => { e.preventDefault(); escoger(k); }, onmouseenter:() => resaltarAlc(m)},
      el("span", {}, el("span", {class:"tipo-r", texto:tipo}), marcar(nombre, qt)), el("span", {class:"m", texto:sub})); };
  for (const m of ordenAlc){ const g = grupos.get(m);
    filas.push(el("li", {class:"grupo-t alc-t", role:"presentation", onmouseenter:() => resaltarAlc(m)}, el("span", {texto:munNom(m)}), el("small", {texto:g.length === 1 ? tx("buscador.un_resultado") : tx("buscador.n_resultados", {n:fmt.format(g.length)})})));
    for (const x of g) filas.push(fila(x)); }
  if (faltan > 0){ const k = n++; res.push({tipo:"mas"});
    filas.push(el("li", {role:"option", id:"op-" + k, class:"ver-mas", "aria-selected":"false", onmousedown:e => { e.preventDefault(); escoger(k); }}, el("span", {texto:faltan === 1 ? tx("buscador.ver_uno_mas") : tx("buscador.ver_mas", {n:fmt.format(faltan)})}))); }
  const conCalles = esNum ? q.length <= 4 : q.length >= 3;
  const esperaCalles = !CALLES_LISTAS && !CALLES_FALLO && conCalles;   /* v30: si no llegaron, no se espera para siempre */   // las calles llegan después del panel; al llegar se repite la búsqueda
  if (esperaCalles) filas.push(el("li", {class:"empty", role:"option", "aria-disabled":"true", texto:tx("buscador.cargando_calles")}));
  /* v32b (B5-03 del revisor 8): si las calles no llegaron, se dice siempre (antes el aviso duraba 7 s y luego «No encontramos esa calle»
     para calles que sí existen) */
  if (CALLES_FALLO && conCalles) filas.push(el("li", {class:"empty", role:"option", "aria-disabled":"true", texto:tx("buscador.calles_no_llegaron")}));
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
  if (x.tipo === "alc"){ elegirAlcaldia(x.m, {foco:true}); return; }
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
/* solo-prueba: 03_pruebas/auditoria2.py hace cientos de búsquedas sin escribir en la caja: calles que coinciden, [nombre, colonia] */
window.__BUSCAR = q => CALLES_LISTAS ? buscarCalles(q, [vista.longitude, vista.latitude]).map(x => [P.names[x.calle], x.i]) : null;
/* /solo-prueba */

