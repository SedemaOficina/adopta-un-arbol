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
const SV_PEDIDA = new Set();   /* árboles cuya foto de la calle ya pidió la persona (en la computadora) */
const pedirStreetView = a => embedStreetView(a) && el("div", {class:"sv-marco sv-pedir-marco"}, el("button", {type:"button", class:"sv-pedir", onclick:() => {
  SV_PEDIDA.add(a.idc); pintarTarjeta(a); const f = card.querySelector(".sv-marco iframe"); if (f) f.focus(); }}, linea("pin"), tx("ficha.ver_la_foto_de_la_calle")));   /* CERCA: {idc, t} del árbol más cercano a la persona (06_panel, cercaDeMi) */
function pintarTarjeta(a){
  const g = guardianes(a), est = el("p", {class:"estado", "aria-live":"polite"}), cn = colTxt(a.col), mio = PROPIOS.has(a.idc);
  const estado = (a.pat ? tx("general.arbol_patrimonial") : "") + (g ? tx("ficha.ya_tiene_quien_lo_cuide") : tx("general.espera_quien_lo_cuide"));
  /* v30: en el celular la foto de la calle se pide al abrir la ficha amplia (en la compacta no se ve). v30h (decisión de Liber): en la computadora,
     al tocar «Ver la foto de la calle»; antes se cargaba sola y Google recibía cada ficha abierta. */
  const sv = esTel() ? (fichaAmplia ? embedStreetView(a) : null) : SV_PEDIDA.has(a.idc) ? embedStreetView(a) : pedirStreetView(a);
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

