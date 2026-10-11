/* ================= panel ================= */
const answer = $("answer"), acciones = $("acciones");
const coloniasDe = cve => COLONIAS.map((c, i) => c && c.m === cve ? i : null).filter(i => i !== null).sort((x, y) => COLONIAS[x].n.localeCompare(COLONIAS[y].n, "es"));
function mapsum(){
  const s = $("mapsum");
  if (selCol === null && selAlc === null){ s.replaceChildren(el("b", {texto:"Ciudad de México"}), el("small", {texto:"Toca tu alcaldía en el mapa o escribe tu calle"})); return; }
  const cargando = !ARB_ALC.has(selAlc) ? ". Cargando sus árboles…" : "";
  if (selCol === null){ s.replaceChildren(el("b", {texto:munNom(selAlc)}), el("small", {texto:fmt.format(nAlc(selAlc)) + " árboles en " + fmt.format(coloniasDe(selAlc).length) + " colonias" + cargando})); return; }
  s.replaceChildren(el("b", {texto:COLONIAS[selCol].n}), el("small", {texto:nCol(selCol) ? fmt.format(nCol(selCol)) + " árboles en el inventario" + cargando : "Sin árboles registrados"}));
}
function migas(){
  const n = $("crumb");
  if (selAlc === null){ n.hidden = true; return; }
  n.hidden = false;
  const sep = () => el("span", {"aria-hidden":"true", texto:"›"});
  n.replaceChildren(el("button", {type:"button", texto:"Ciudad de México", onclick:() => { filtroCalle = ""; calleAbierta = null; inicio(); }}), sep(),
    ...(selCol === null ? [el("span", {"aria-current":"page", texto:munNom(selAlc)})] : [el("button", {type:"button", texto:munNom(selAlc), onclick:() => elegirAlcaldia(selAlc)}), sep(), el("span", {"aria-current":"page", texto:COLONIAS[selCol].n})]));
}
function vistaInicio(){
  answer.replaceChildren(
    el("p", {class:"tesis", texto:"Los árboles de tu calle ya tienen número. Falta que tengan a alguien."}),
    el("p", {class:"lead", texto:"Mira cómo está tu colonia frente al resto de la ciudad y conviértete en guardián o guardiana de un árbol cerca de ti."}),
    bloqueHeroe(TOTAL, gCiudad()),
    el("ol", {class:"pasos"},
      el("li", {}, el("b", {texto:"Busca tu calle "}), "o usa tu ubicación."),
      el("li", {}, el("b", {texto:"Encuentra un árbol "}), "de tu calle; confírmalo en Street View."),
      el("li", {}, el("b", {texto:"Cuídalo "}), "y guarda tu reconocimiento en imagen o PDF."),
      el("li", {}, el("b", {texto:"Invita "}), "a tu familia y a tus vecinos a cuidar los árboles que esperan quien los cuide.")),
    ...(C.MODO !== "prueba" ? [] : [el("div", {class:"grupo"}, el("p", {class:"sec-tit", texto:"Para probar"}),
      [["MIH-029-1493", "Árbol que cuidan 5 personas", "Polanco, Avenida Horacio"], ["MIH-029-1491", "Árbol que espera quien lo cuide", "Polanco, Avenida Horacio"],
       ["MIH-029-1492", "Árbol que tú ya cuidas", "Abre tu reconocimiento y descarga el PDF"], ["25-MIH-TAX-19405GIMNO-0001", "Árbol patrimonial que cuidan 4 personas", "Miguel Hidalgo"],
       ["25-CUH-TAX-19405GIMNO-0002", "Árbol patrimonial que espera quien lo cuide", "«Jardín San Fernando», Cuauhtémoc"]].map(([idc, t, d]) =>
        el("button", {type:"button", class:"fila-btn", onclick:() => buscarIdc(idc).then(a => a ? elegirArbol(a, {volar:true}) : aviso("No encontramos el árbol " + idc + "."))},
          el("b", {texto:t}), el("small", {texto:d}), el("span", {class:"k", texto:"Ver"}))),
      el("button", {type:"button", class:"fila-btn", onclick:() => elegirColonia(1583, {volar:true})}, el("b", {texto:"Una colonia: " + COLONIAS[1583].n}), el("small", {texto:munNom(COLONIAS[1583].m)}), el("span", {class:"k", texto:"Ver"})),
      C.SIMULAR_GUARDIANES ? el("p", {class:"nota", texto:"Las personas guardianas de esta prueba son simuladas: uno de cada cinco árboles, al azar."}) : null)]),
    el("p", {class:"fuente", texto:"Árboles: inventario de arbolado urbano de la Ciudad de México (SEDEMA y CIGA-UNAM), octubre de 2026, " + fmt.format(INV.registros) + " registros. Colonias: catálogo de colonias de SEDEMA. Calles y árboles en banqueta: INEGI, Características del Entorno Urbano 2020. Verdor: SEDEMA-SIA (noviembre de 2025). Calor: WRI a partir de Landsat 2023-2025 (CC BY 4.0)."}));
  acciones.hidden = true;
}
function bloqueHeroe(n, nG, accion){
  return el("div", {class:"heroe"},
    el("p", {class:"heroe-n"}, el("b", {texto:fmt.format(n)}), el("span", {texto:n === 1 ? "árbol" : "árboles"})),
    n ? el("div", {class:"barra-g", role:"img", "aria-label":fmt.format(nG) + " de " + fmt.format(n) + " árboles ya tienen quien los cuide"}, el("i", {style:"width:" + Math.min(100, nG / n * 100) + "%"})) : null,
    n ? el("p", {class:"heroe-t"}, el("b", {texto:fmt.format(nG)}), (nG === 1 ? " ya tiene quien lo cuide" : " ya tienen quien los cuide") + " · " + fmt.format(n - nG) + (n - nG === 1 ? " espera a alguien" : " esperan a alguien")) : null,
    accion || null);
}
/* ===== Panel G3: cada dato es una barra con la raya de la ciudad ===== */
const gCiudad = () => C.SIMULAR_GUARDIANES ? Math.round(TOTAL * .2) : SERVIDOR ? [...REG.keys()].length : 0;
function cabecera(titulo, sub, n){
  return el("div", {class:"cab"},
    el("div", {class:"scope-head"}, el("h2", {texto:titulo}), el("p", {texto:sub})),
    el("div", {class:"cab-n"}, el("b", {texto:fmt.format(n)}), el("span", {texto:n === 1 ? "árbol" : "árboles"})));
}
function bloqueComparar(x, n, nG, esCol){
  const p = PROM, filas = [];
  const fila = (titulo, valor, color, pct, pctCiudad, frase, tinta) => el("div", {class:"comp-fila", style:"--c:" + color + ";--ct:" + (tinta || color)},
    el("div", {class:"t"}, el("b", {texto:titulo}), el("strong", {texto:valor})),
    el("div", {class:"comp-barra", role:"img", "aria-label":titulo + ": " + valor + ". " + frase},
      el("i", {style:"width:" + Math.max(2, Math.min(100, pct)) + "%"}), el("s", {style:"left:calc(" + Math.max(0, Math.min(100, pctCiudad)) + "% - 1px)"})),
    el("p", {texto:frase}));
  if (x.v != null) filas.push(fila("Verdor de las calles", fmt0.format(x.v) + " %", "var(--hoja)", x.v, p.v,
    esCol ? decimos(V_COLS.filter(w => w < x.v).length / V_COLS.length) + " Ciudad: " + fmt0.format(p.v) + " %." : (x.v < p.v ? "Menos verdes" : "Más verdes") + " que el promedio de la ciudad (" + fmt0.format(p.v) + " %)."));
  if (x.t != null){
    const d = Math.round((x.t - p.t) * 10) / 10, pos = v => (v - 35) / 25 * 100;
    const color = d <= -1 ? "#E3A93C" : d >= 1 ? "#C8442C" : "#D9822B", tinta = d <= -1 ? "#8A5A1E" : d >= 1 ? "#A3361F" : "#8A4A12";
    filas.push(fila("Calor del suelo", fmt1.format(x.t) + "°", color, pos(x.t), pos(p.t),
      Math.abs(d) < .5 ? "Casi igual que la ciudad (" + fmt1.format(p.t) + "°) en los días más calurosos." : fmt1.format(Math.abs(d)) + "° " + (d > 0 ? "más caliente" : "más fresco") + " que la ciudad en los días más calurosos.", tinta));
  }
  if (x.a != null) filas.push(fila("Banqueta con árboles", fmt0.format(x.a) + " %", "var(--arbol)", x.a, p.a,
    "En " + fmt0.format(x.a) + " de cada 100 metros de banqueta hay árboles. Ciudad: " + fmt0.format(p.a) + " %.", "var(--hoja)"));
  if (n) filas.push(fila("Árboles ya cuidados", fmt0.format(nG / n * 100) + " %", "var(--guinda)", nG / n * 100, TOTAL ? gCiudad() / TOTAL * 100 : 0,
    fmt.format(nG) + " de " + fmt.format(n) + " árboles ya tienen quien los cuide." + (C.SIMULAR_GUARDIANES ? " (Simulado.)" : "")));
  return el("div", {class:"condicion"},
    el("h3", {class:"sec-tit", texto:esCol ? "Tu colonia frente a la ciudad" : "La alcaldía frente a la ciudad"}),
    el("div", {class:"comp"}, el("p", {class:"comp-ley"}, el("span", {}, el("i", {class:"comp-ley-barra"}), esCol ? "Tu colonia" : "La alcaldía"), el("span", {}, el("i", {class:"comp-ley-raya"}), "Promedio de la ciudad")), filas),
    el("details", {class:"que-mide"}, el("summary", {texto:"¿Qué mide cada dato?"}),
      INDS.map(ind => el("div", {}, el("p", {}, el("b", {texto:ind.n + ". "}), ind.mide), el("p", {class:"nota", texto:"Fuente: " + ind.fuente})))));
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
function cercaDeMi(boton){
  if (!navigator.geolocation) return aviso("Este navegador no puede ubicarte. Escribe tu calle o tu colonia.");
  const paso = (corto, largo) => { if (boton) boton.replaceChildren(el("span", {class:"girando", "aria-hidden":"true"}), corto); aviso(largo, true); };
  if (boton){ boton.disabled = true; boton.setAttribute("aria-busy", "true"); boton.dataset.h = boton.innerHTML; }
  paso("Buscando tu ubicación…", "Buscando tu ubicación. Puede tardar unos segundos; si el navegador te pregunta, permite usarla.");
  const fin = () => { if (boton){ boton.disabled = false; boton.removeAttribute("aria-busy"); boton.innerHTML = boton.dataset.h; } };
  navigator.geolocation.getCurrentPosition(async p => {
    miPos = [p.coords.longitude, p.coords.latitude]; const c = coloniaEn(miPos);
    if (c === null){ fin(); aviso("Tu ubicación está fuera de las colonias de la Ciudad de México."); pintarMapa(); return; }
    paso("Buscando el árbol más cercano…", "Ya te ubicamos. Buscando el árbol más cercano que espera quien lo cuide…");
    try { await cargarAlcaldia(COLONIAS[c].m); } catch (e){ fin(); aviso(e.message); return; }
    await new Promise(r => setTimeout(r, 30));
    const [a, d] = arbolLibreCerca(miPos); fin();
    limpiarBusqueda();
    // "Cerca" es lo que se camina en unos minutos: hasta 500 m. Más lejos ya no es tu árbol de todos los días.
    if (!a){ elegirColonia(c, {volar:true}); aviso("Cerca de ti no hay árboles que esperen quien los cuide. Te mostramos tu colonia."); return; }
    if (d > 500){ elegirColonia(c, {volar:true}); aviso("No encontramos árboles que esperen quien los cuide a menos de 500 metros de ti (el más cercano está a " + fmt1.format(d / 1000) + " km). Te mostramos tu colonia."); return; }
    if (a.col >= 0) elegirColonia(a.col);
    elegirArbol(a, {volar:true});
    const m = Math.max(10, Math.round(d / 10) * 10), min = Math.max(1, Math.round(d / 80));
    aviso("Este es el árbol que espera quien lo cuide más cerca de ti: a unos " + fmt.format(m) + " metros" + (d > 120 ? ", " + min + " minutos caminando." : "."));
  }, () => { fin(); aviso("No pudimos usar tu ubicación. Revisa el permiso de ubicación del navegador, o escribe tu calle."); }, {timeout:12000, maximumAge:120000, enableHighAccuracy:false});
}
const decimos = r => { const k = Math.round(r * 10); return k >= 10 ? "Están entre las más verdes de la ciudad." : k <= 0 ? "Están entre las menos verdes de la ciudad: aquí cada árbol cuenta más." : "Son más verdes que las de " + k + " de cada 10 colonias."; };
const V_COLS = COLONIAS.filter(c => c && c.v != null).map(c => c.v);   // para ubicar una colonia entre todas por verdor
function vistaAlcaldia(){
  const cols = coloniasDe(selAlc), vis = verCols ? cols : cols.slice(0, 15);
  answer.replaceChildren(
    cabecera(munNom(selAlc), fmt.format(cols.length) + " colonias", nAlc(selAlc)),
    el("h3", {class:"sec-tit", texto:"Elige tu colonia"}),
    el("ul", {class:"lista lista-col", "aria-label":"Colonias de " + munNom(selAlc)},
      vis.map(i => el("li", {}, el("button", {type:"button", onclick:() => elegirColonia(i, {volar:true})}, el("span", {class:"n", texto:COLONIAS[i].n}), el("span", {class:"c", texto:fmt.format(nCol(i)) + " árboles"}))))),
    cols.length > vis.length ? el("button", {type:"button", class:"btn secondary", texto:"Ver las " + fmt.format(cols.length) + " colonias", onclick:() => { verCols = true; vistaAlcaldia(); }}) : "",
    bloqueComparar(P.alcInd[selAlc], nAlc(selAlc), conGuardianAlc(selAlc), false));
  acciones.hidden = true;
}
function eligeUno(arb){
  const libres = arb.filter(a => guardianes(a) === 0 && sePuedeCuidar(a)); if (!libres.length) return;
  const [x, y] = [vista.longitude, vista.latitude];
  const cerca = libres.slice().sort((p, q) => Math.hypot(p.lng - x, p.lat - y) - Math.hypot(q.lng - x, q.lat - y)).slice(0, 25);
  elegirArbol(cerca[Math.floor(Math.random() * cerca.length)], {volar:true});
}
function filaArbol(a, sub){
  const g = guardianes(a);
  return el("li", {}, el("button", {type:"button", "data-idc":a.idc, "aria-pressed":String(selArb === a), onclick:() => elegirArbol(a, {volar:true})},
    el("i", {class:"mk " + (a.pat ? "mk-pat-" : "mk-arbol-") + (g ? "con" : "sin"), "aria-hidden":"true"}), el("span", {class:"n", texto:PROPIOS.has(a.idc) ? "Tú lo cuidas" : g ? (g === 1 ? "Lo cuida 1 persona" : "Lo cuidan " + g + " personas") : "Espera quien lo cuide"}),
    el("span", {class:"c", texto:a.pat ? "Árbol patrimonial «" + a.pat.nombre + "»" : sub || calleTexto(a)})));
}
function vistaColonia(){
  const c = COLONIAS[selCol], arb = arbolesDe(selCol);
  const nCon = SERVIDOR ? conGuardianCol(selCol) : arb.filter(a => guardianes(a) > 0).length;
  let cuerpo;
  if (!ARB_ALC.has(c.m)) cuerpo = [el("p", {class:"nota", texto:"Cargando los árboles de " + munNom(c.m) + "…"})];
  else if (!arb.length) cuerpo = [el("p", {class:"recuadro", texto:"Esta colonia no tiene árboles de banqueta registrados en el inventario."})];
  else {
    const q = plano(filtroCalle), pasa = () => true;
    const filtro = el("input", {class:"filtro filtro-calle", type:"search", id:"filtro", placeholder:"Escribe tu calle", "aria-label":"¿En qué calle vives? Escribe tu calle", value:filtroCalle});
    filtro.addEventListener("input", () => { filtroCalle = filtro.value; calleAbierta = null; nCalle = 40; const pos = filtro.selectionStart; vistaColonia(); const f = $("filtro"); f.focus(); f.setSelectionRange(pos, pos); });
    const porNumero = q && /\d/.test(q) ? arb.filter(a => pasa(a) && plano(a.idc).includes(q)) : [];
    let lista;
    if (porNumero.length) lista = el("ul", {class:"lista", "aria-label":"Árboles que coinciden"}, porNumero.slice(0, 40).map(a => filaArbol(a)));
    else {
      const grupos = new Map();
      for (const a of arb) if (pasa(a)){ const k = a.pat && !a.calle ? "Árboles patrimoniales" : (calleTexto(a) || "Sin calle registrada"); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); }
      let calles = [...grupos.entries()].filter(([k]) => !q || plano(k).includes(q)).sort((x, y) => y[1].length - x[1].length);
      if (calleAuto && calles.length){ calleAbierta = calles[0][0]; calleAuto = false; }
      const max = calles.length ? calles[0][1].length : 1, total = calles.length;
      if (calleAbierta){ const i = calles.findIndex(([x]) => x === calleAbierta); if (i > 0) calles.unshift(calles.splice(i, 1)[0]); }   // la calle abierta va primero
      if (!verCalles && !q) calles = calles.slice(0, 8);
      lista = calles.length ? el("ul", {class:"calles-lista", "aria-label":"Árboles por calle"}, calles.map(([k, as]) => {
        const abierta = calleAbierta === k;
        return el("li", {class:abierta ? "abierta" : ""},
          el("button", {type:"button", class:"calle-btn", "aria-expanded":String(abierta), onclick:() => {
              calleAbierta = abierta ? null : k; nCalle = 40; vistaColonia();
              if (!abierta){ const xs = as.map(a => a.lng), ys = as.map(a => a.lat); volar([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], padMapa()); } }},
            el("span", {class:"n", texto:k}), el("span", {class:"k", texto:fmt.format(as.length) + (as.length === 1 ? " árbol" : " árboles")}),
            (() => { const g = as.filter(a => guardianes(a) > 0).length;
              return el("span", {class:"calle-g"}, el("span", {class:"barrita g", "aria-hidden":"true"}, el("i", {style:"width:" + (g ? Math.max(3, g / as.length * 100) : 0) + "%"})),
                el("small", {texto:g ? fmt.format(g) + (g === 1 ? " ya cuidado" : " ya cuidados") : "Ninguno cuidado aún"})); })()),
          abierta ? listaCuadras(k, as) : null);
      }), !verCalles && !q && total > 8 ? el("li", {}, el("button", {type:"button", class:"btn secondary", style:"width:100%;margin-top:10px", texto:"Ver las " + fmt.format(total) + " calles", onclick:() => { verCalles = true; vistaColonia(); }})) : null)
        : el("p", {class:"nota", texto:"Ninguna calle o árbol coincide."});
    }
    cuerpo = [filtro, lista];
  }
  const hayLibres = arb.some(a => guardianes(a) === 0 && sePuedeCuidar(a));
  answer.replaceChildren(
    cabecera(c.n, munNom(c.m) + " · C.P. " + c.cp, nCol(selCol)),
    hayLibres ? el("div", {class:"acciones-col"}, el("button", {type:"button", class:"btn", texto:"Elige un árbol que espera quien lo cuide", onclick:() => eligeUno(arb)})) : "",
    el("h3", {class:"sec-tit", texto:"¿En qué calle vives?"}),
    el("div", {class:"tabpanel", id:"tp"}, cuerpo),
    bloqueComparar(c, nCol(selCol), nCon, true));
  acciones.replaceChildren(); if (arb.length) acciones.append(el("button", {type:"button", class:"btn secondary", texto:"Ver los árboles en el mapa", onclick:() => { cerrarHoja(); volar(bbox(COL_GEO.get(selCol)), padMapa()); }}));
  acciones.hidden = !acciones.childElementCount;
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
    if (nombres.length) cortes.push({m:med(x, y), nombres});
  }
  if (!cortes.length) return null;
  // Un mismo cruce aparece dos veces en avenidas con camellón: se juntan los cortes a menos de 18 m.
  cortes.sort((p, q) => p.m - q.m);
  const cs = [];
  for (const c of cortes){ const u = cs[cs.length - 1]; if (u && c.m - u.m < 18){ for (const n of c.nombres) if (!u.nombres.includes(n)) u.nombres.push(n); } else cs.push({m:c.m, nombres:[...c.nombres]}); }
  const grupos = new Map();
  for (const a of arbs){
    const m = med(a.lng, a.lat); let i = 0; while (i < cs.length && cs[i].m <= m) i++;   // entre cs[i-1] y cs[i]
    const l = grupos.get(i); if (l) l.push(a); else grupos.set(i, [a]);
  }
  if (grupos.size < 2) return null;   // una sola cuadra: no hace falta dividir
  const nom = c => c ? c.nombres[0] : null;
  return [...grupos.entries()].sort((p, q) => p[0] - q[0]).map(([i, as]) => {
    const A = nom(cs[i - 1]), B = nom(cs[i]);
    as.sort((p, q) => med(p.lng, p.lat) - med(q.lng, q.lat));
    return {etq:A && B && A !== B ? "Entre " + A + " y " + B : "Junto a " + (A || B), arbs:as};
  });
}
function listaCuadras(k, as){
  const masBtn = n => el("li", {}, el("button", {type:"button", class:"mas", texto:"Ver más (" + fmt.format(n) + " restantes)", onclick:() => { nCalle += 40; vistaColonia(); }}));
  const cs = cuadrasDe(k === "Sin calle registrada" || k === "Árboles patrimoniales" ? null : k, as);
  if (!cs) return el("ul", {class:"lista"}, as.slice(0, nCalle).map(a => filaArbol(a)), as.length > nCalle ? masBtn(as.length - nCalle) : null);
  const filas = [];
  for (const c of cs){
    const id = k + "|" + c.etq, abierta = cuadraAbierta === id, n = c.arbs.length, g = c.arbs.filter(a => guardianes(a) > 0).length;
    const xs = c.arbs.map(a => a.lng), ys = c.arbs.map(a => a.lat), m = .0004;
    filas.push(el("li", {class:"cuadra-li" + (abierta ? " abierta" : "")}, el("button", {type:"button", class:"cuadra-t", "aria-expanded":String(abierta),
      onclick:() => { cuadraAbierta = abierta ? null : id; nCalle = 40; vistaColonia(); if (!abierta) volar([Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m], padMapa()); }},
      el("b", {texto:c.etq}), el("span", {texto:fmt.format(n) + (n === 1 ? " árbol" : " árboles") + (g ? " · " + fmt.format(g) + (g === 1 ? " ya cuidado" : " ya cuidados") : "")}))));
    if (abierta){
      filas.push(...c.arbs.slice(0, nCalle).map((a, i) => filaArbol(a, "Árbol " + (i + 1) + " de " + n + " en esta cuadra")));
      if (n > nCalle) filas.push(masBtn(n - nCalle));
    }
  }
  return el("ul", {class:"lista lista-cuadras", "aria-label":"Cuadras de " + k}, filas);
}

