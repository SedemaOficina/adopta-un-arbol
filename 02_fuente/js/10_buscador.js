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
      el("span", {class:"m", texto:x.tipo === "calle" ? tx("buscador.en_colonia", {colonia:c.n}) : tx("buscador.cp_arboles", {cp:c.cp, n:fmt.format(nCol(x.i))})})); };
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

