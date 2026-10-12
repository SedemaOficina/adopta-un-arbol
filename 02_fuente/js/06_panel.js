/* ================= panel ================= */
const answer = $("answer"), acciones = $("acciones");
const coloniasDe = cve => COLONIAS.map((c, i) => c && c.m === cve ? i : null).filter(i => i !== null).sort((x, y) => COLONIAS[x].n.localeCompare(COLONIAS[y].n, "es"));
function mapsum(){
  const s = $("mapsum");
  if (selCol === null && selAlc === null){ s.replaceChildren(el("b", {texto:tx("general.ciudad_de_mexico")}), el("small", {texto:tx("panel.toca_tu_alcaldia_en_el")})); return; }
  const cargando = !ARB_ALC.has(selAlc) && !FALLO_ALC.has(selAlc) ? tx("panel.cargando_sus_arboles") : "";
  if (selCol === null){ s.replaceChildren(el("b", {texto:munNom(selAlc)}), el("small", {texto:tx("panel.alcaldia_resumen", {n:fmt.format(nAlc(selAlc)), colonias:fmt.format(coloniasDe(selAlc).length)}) + cargando})); return; }
  s.replaceChildren(el("b", {texto:COLONIAS[selCol].n}), el("small", {texto:nCol(selCol) ? tx("panel.colonia_resumen", {n:fmt.format(nCol(selCol))}) + cargando : tx("panel.sin_arboles_registrados")}));
}
function migas(){
  const n = $("crumb");
  if (selAlc === null){ n.hidden = true; return; }
  n.hidden = false;
  const sep = () => el("span", {"aria-hidden":"true", texto:"›"});
  n.replaceChildren(el("button", {type:"button", texto:tx("general.ciudad_de_mexico"), onclick:() => { inicio(); if (!esTel()) $("omni").focus(); }}), sep(),
    ...(selCol === null ? [el("span", {"aria-current":"page", texto:munNom(selAlc)})] : [el("button", {type:"button", texto:munNom(selAlc), onclick:() => elegirAlcaldia(selAlc, {foco:true})}), sep(), el("span", {"aria-current":"page", texto:COLONIAS[selCol].n})]));
}
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
    ...(C.MODO !== "prueba" ? [] : [el("div", {class:"grupo"}, el("p", {class:"sec-tit", texto:tx("panel.para_probar")}),
      [["MIH-029-1493", tx("panel.arbol_que_cuidan_5_personas"), tx("panel.polanco_avenida_horacio")], ["MIH-029-1491", tx("panel.arbol_que_espera_quien_lo"), tx("panel.polanco_avenida_horacio")],
       ["MIH-029-1492", tx("panel.arbol_que_tu_ya_cuidas"), tx("panel.abre_tu_reconocimiento_y_descarga")], ["25-MIH-TAX-19405GIMNO-0001", tx("panel.arbol_patrimonial_que_cuidan_4"), tx("panel.miguel_hidalgo")],
       ["25-CUH-TAX-19405GIMNO-0002", tx("panel.arbol_patrimonial_que_espera_quien"), tx("panel.jardin_san_fernando_cuauhtemoc")]].map(([idc, t, d]) =>
        el("button", {type:"button", class:"fila-btn", onclick:() => { const t0 = TURNO; buscarIdc(idc).then(a => { if (t0 !== TURNO) return; if (a) elegirArbol(a, {volar:true}); else if (a === null) aviso(tx("general.arbol_no_encontrado", {arbol:idc}), "error"); }); }},
          el("b", {texto:t}), el("small", {texto:d}), el("span", {class:"k", texto:tx("panel.ver")}))),
      el("button", {type:"button", class:"fila-btn", onclick:() => elegirColonia(1583, {volar:true})}, el("b", {texto:tx("panel.prueba_una_colonia", {colonia:COLONIAS[1583].n})}), el("small", {texto:munNom(COLONIAS[1583].m)}), el("span", {class:"k", texto:tx("panel.ver")})),
      C.SIMULAR_GUARDIANES ? el("p", {class:"nota", texto:tx("panel.las_personas_guardianas_de_esta")}) : null)]),
    el("p", {class:"fuente", texto:tx("panel.fuentes", {registros:fmt.format(INV.registros)})}));
  acciones.hidden = true;
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
    el("div", {class:"cab-n"}, el("b", {texto:fmt.format(n)}), el("span", {texto:n === 1 ? tx("panel.arbol") : tx("panel.arboles")})));
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
    cabecera(munNom(selAlc), fmt.format(cols.length) + " colonias", nAlc(selAlc)),
    el("h3", {class:"sec-tit", texto:tx("panel.elige_tu_colonia")}),
    el("ul", {class:"lista lista-col", "aria-label":tx("panel.colonias_de", {alcaldia:munNom(selAlc)})},
      vis.map(i => el("li", {}, el("button", {type:"button", onclick:() => elegirColonia(i, {volar:true, foco:true})}, el("span", {class:"n", texto:COLONIAS[i].n}), el("span", {class:"c", texto:tx("general.n_arboles", {n:fmt.format(nCol(i))})}))))),
    cols.length > vis.length ? el("button", {type:"button", class:"btn secondary", texto:tx("panel.ver_las_colonias", {n:fmt.format(cols.length)}), onclick:() => { verCols = true; vistaAlcaldia(); enfocarN(".lista-col button", 15); }}) : "",
    bloqueComparar(P.alcInd[selAlc], nAlc(selAlc), conGuardianAlc(selAlc), false));
  acciones.hidden = true;
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
    filtro.addEventListener("input", () => { filtroCalle = filtro.value; calleAbierta = null; calleAuto = false; cuadraAbierta = null; nCalle = 40; const pos = filtro.selectionStart; vistaColonia(); const f = $("filtro"); f.focus(); f.setSelectionRange(pos, pos); });
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
  const hayLibres = arb.some(a => guardianes(a) === 0 && sePuedeCuidar(a));
  answer.replaceChildren(
    cabecera(c.n, tx("panel.colonia_sub", {alcaldia:munNom(c.m), cp:c.cp}), nCol(selCol)),
    hayLibres ? el("div", {class:"acciones-col"}, el("button", {type:"button", class:"btn", texto:tx("panel.elige_un_arbol_que_espera"), onclick:() => eligeUno(arb)})) : "",
    el("h3", {class:"sec-tit", texto:tx("panel.en_que_calle_vives")}),
    el("div", {class:"tabpanel", id:"tp"}, cuerpo),
    bloqueComparar(c, nCol(selCol), nCon, true));
  acciones.replaceChildren(); if (arb.length) acciones.append(el("button", {type:"button", class:"btn secondary", texto:tx("panel.ver_los_arboles_en_el"), onclick:() => { verMapa(); volar(bbox(COL_GEO.get(selCol)), padMapa()); }}));
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
    if (nombres.length) cortes.push({m:med(x, y), x, y, nombres});
  }
  if (!cortes.length) return null;
  // Un mismo cruce aparece dos veces en avenidas con camellón: se juntan los cortes a menos de 18 m.
  cortes.sort((p, q) => p.m - q.m);
  const cs = [];
  for (const c of cortes){ const u = cs[cs.length - 1]; if (u && c.m - u.m < 18){ for (const n of c.nombres) if (!u.nombres.includes(n)) u.nombres.push(n); } else cs.push({m:c.m, x:c.x, y:c.y, nombres:[...c.nombres]}); }
  const grupos = new Map();
  for (const a of arbs){
    const m = med(a.lng, a.lat); let i = 0; while (i < cs.length && cs[i].m <= m) i++;   // entre cs[i-1] y cs[i]
    const l = grupos.get(i); if (l) l.push(a); else grupos.set(i, [a]);
  }
  if (grupos.size < 2) return null;   // una sola cuadra: no hace falta dividir
  const nom = c => c ? c.nombres[0] : null;
  const unidad = (p, q) => { const dx = (q.x - p.x) * KX, dy = (q.y - p.y) * KY, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const DIR = cs.length > 1 ? unidad(cs[0], cs[cs.length - 1]) : largo ? [1, 0] : [0, 1];   // dirección de toda la calle
  return [...grupos.entries()].sort((p, q) => p[0] - q[0]).map(([i, as]) => {
    const A = nom(cs[i - 1]), B = nom(cs[i]);
    as.sort((p, q) => med(p.lng, p.lat) - med(q.lng, q.lat));
    // Dónde está cada árbol: a cuántos metros de la esquina más cercana, para encontrarlo en la calle. Se mide A LO LARGO de la cuadra
    // (de esquina a esquina; en las de la orilla, la dirección de toda la calle): en avenidas con camellón, lo ancho no cuenta.
    const u = A && B ? unidad(cs[i - 1], cs[i]) : DIR;
    const dist = (a, c) => c ? Math.abs((a.lng - c.x) * KX * u[0] + (a.lat - c.y) * KY * u[1]) : Infinity;
    const lugar = a => { const dA = A ? dist(a, cs[i - 1]) : Infinity, dB = B ? dist(a, cs[i]) : Infinity, d = Math.min(dA, dB), calle = dA <= dB ? A : B;
      return d < 10 ? tx("panel.en_la_esquina_con", {calle}) : tx("panel.a_m_de_calle", {m:fmt.format(Math.round(d / 5) * 5), calle}); };
    return {etq:A && B && A !== B ? tx("panel.cuadra_entre", {a:A, b:B}) : tx("panel.cuadra_junto", {calle:A || B}), arbs:as, lugares:as.map(lugar)};
  });
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
  if (frentesDe(selCol).some(f => FN[f] >= 0 && plano(P.names[FN[f]] || "").includes(q))) return nota(tx("panel.calle_sin_arboles", {colonia:COLONIAS[selCol].n}));
  const c0 = centroCol(selCol), d = x => { const c = centroCol(x.i); return Math.hypot(c[0] - c0[0], (c[1] - c0[1]) * 1.06); };
  const otros = indiceCalles().filter(x => x.i !== selCol && x.k.includes(q)).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || d(a) - d(b)).slice(0, 5);
  if (!otros.length) return nota(tx("panel.ninguna_calle_o_arbol_coincide"));
  return el("div", {class:"en-otra"}, nota(tx("panel.no_esta_en", {colonia:COLONIAS[selCol].n})),
    el("ul", {class:"lista"}, otros.map(x => el("li", {}, el("button", {type:"button", onclick:() => { irACalle(x); enfocarTitulo(); }}, el("span", {class:"n", texto:P.names[x.calle]}),
      el("span", {class:"c", texto:tx("panel.en_colonia_alcaldia", {colonia:COLONIAS[x.i].n, alcaldia:munNom(COLONIAS[x.i].m)})}))))));
}
/* El árbol que llegó de fuera de la lista (ARRIBA) va primero; los demás conservan su orden. */
let ARRIBA = null;
const primeroArriba = (arr, extra) => { const i = ARRIBA ? arr.indexOf(ARRIBA) : -1; if (i <= 0) return [arr, extra];
  const mover = x => x && [x[i], ...x.slice(0, i), ...x.slice(i + 1)]; return [mover(arr), mover(extra)]; };
function listaCuadras(k, as){
  const masBtn = n => el("li", {}, el("button", {type:"button", class:"mas", texto:tx("panel.ver_mas_restantes", {n:fmt.format(n)}), onclick:() => { const k = nCalle; nCalle += 40; vistaColonia(); enfocarN(".lista button[data-idc]", k); }}));
  const cs = cuadrasDe(k === tx("panel.sin_calle_registrada") || k === tx("panel.arboles_patrimoniales") ? null : k, as);
  if (!cs){ const [orden] = primeroArriba(as);
    return el("ul", {class:"lista"}, orden.slice(0, nCalle).map(a => filaArbol(a, null, true)), as.length > nCalle ? masBtn(as.length - nCalle) : null); }
  const filas = [];
  for (const c of cs){
    const id = k + "|" + c.etq, abierta = cuadraAbierta === id, n = c.arbs.length, g = c.arbs.filter(a => guardianes(a) > 0).length;
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

