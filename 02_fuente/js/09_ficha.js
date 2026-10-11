/* ================= ficha del árbol ================= */
const card = $("card");
card.addEventListener("scroll", () => card.classList.toggle("desplazada", card.scrollTop > 40), {passive:true});
new MutationObserver(() => document.body.classList.toggle("con-ficha", !card.hidden)).observe(card, {attributes:true, attributeFilter:["hidden"]});
function placa(a){ return el("div", {class:"placa" + (a.pat ? " pat" : "")}, el("small", {texto:tx("ficha.arbol_numero")}), el("b", {texto:a.idc})); }
let fichaAmplia = false;
function pintarTarjeta(a){
  const g = guardianes(a), est = el("p", {class:"estado", "aria-live":"polite"}), cn = nomCol(a.col), mio = PROPIOS.has(a.idc);
  const estado = (a.pat ? tx("general.arbol_patrimonial") : "") + (g ? tx("ficha.ya_tiene_quien_lo_cuide") : tx("general.espera_quien_lo_cuide"));
  const frase = mio ? tx("ficha.tu_ya_lo_cuidas_gracias") : g ? (g === 1 ? tx("ficha.una_persona_ya_lo_cuida") : tx("ficha.n_personas_ya_lo_cuidan", {n:g})) : tx("ficha.aun_nadie_lo_cuida_puedes");
  const sv = embedStreetView(a);
  const extra = (k, t, icono) => el("button", {type:"button", class:"ficha-link", "aria-expanded":String(fichaExtra === k), onclick:() => { fichaExtra = fichaExtra === k ? null : k; pintarTarjeta(a); }}, icono, t);
  const icoInv = linea("compartir"), icoAbc = linea("hoja");
  if (card.dataset.idc !== a.idc) fichaAmplia = false;
  card.classList.toggle("amplia", fichaAmplia);
  const partes = [el("button", {type:"button", class:"ficha-grip", "aria-expanded":String(fichaAmplia), "aria-label":fichaAmplia ? tx("ficha.ver_menos_de_la_ficha") : tx("ficha.ver_la_foto_de_la"),
      onclick:() => { fichaAmplia = !fichaAmplia; pintarTarjeta(a); }}, el("i", {"aria-hidden":"true"}), el("span", {texto:fichaAmplia ? tx("ficha.ver_menos") : tx("ficha.ver_la_foto_de_la_2")})),
    // Barra fija: al bajar por la ficha aparece una franja con el nombre y la X, y el contenido pasa por debajo (la X ya no se encima).
    el("div", {class:"ficha-barra"}, el("div", {class:"fb-fondo", "aria-hidden":"true"}, el("span", {class:"fb-t", texto:a.pat ? "«" + a.pat.nombre + "»" : (a.calle || tx("ficha.arbol_de", {colonia:cn}))})),
      el("button", {type:"button", class:"close", "aria-label":tx("ficha.cerrar_ficha"), onclick:cerrarTarjeta}, linea("x"))),
    el("p", {class:"tipo"}, el("i", {class:"mk " + (a.pat ? "mk-pat-" : "mk-arbol-") + (g ? "con" : "sin"), "aria-hidden":"true"}), estado),
    a.pat ? el("h2", {class:"num nombre-pat", texto:"«" + a.pat.nombre + "»"}) : el("h2", {class:"num calle-t", texto:a.calle || tx("ficha.arbol_de", {colonia:cn})}),
    el("p", {class:"sub"}, (a.pat ? a.pat.comun + " · " + (a.calle ? a.calle + " · " : "") : "") + cn + " · ", el("span", {class:"num-chico", texto:tx("ficha.numero", {arbol:a.idc})}))];
  if (a.pat) partes.push(el("a", {class:"btn-pat", href:urlPatrimonial(a), target:"_blank", rel:"noopener"}, el("img", {class:"btn-pat-sello", src:window.EMBLEMA_PAT, alt:""}), el("span", {}, el("b", {texto:tx("ficha.ver_su_ficha_de_arbol")}), el("small", {texto:tx("ficha.historia_medidas_y_decreto")})), linea("externa")));
  else if (a.esp) partes.push(el("p", {class:"sub", texto:a.esp + " (" + a.cien + ")"}));
  const iVerlo = partes.length;
  partes.push(sv ? el("div", {class:"verlo"}, sv) : el("a", {class:"btn secondary verlo-link", style:"margin-top:14px", href:urlStreetView(a), target:"_blank", rel:"noopener", texto:tx("ficha.es_este_verlo_en_street")}));
  // Contador de guardianes: lo primero que se lee después de la foto. Cero también se dice, con círculos vacíos.
  const otros = mio ? g - 1 : g, vis = Math.min(g, 6);
  partes.push(el("div", {class:"contador " + (mio ? "mio" : g ? "con" : "cero")},
    el("div", {class:"cifra"}, el("b", {texto:String(g)}), el("span", {texto:g === 1 ? "persona guardiana" : "personas guardianas"})),
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
  const viejo = card.dataset.idc === a.idc && !card.hidden ? card.querySelector(":scope > .verlo") : null;
  if (viejo){   // mismo árbol: el Street View no se vuelve a cargar
    while (viejo.previousSibling) viejo.previousSibling.remove();
    while (viejo.nextSibling) viejo.nextSibling.remove();
    viejo.before(...partes.slice(0, iVerlo)); viejo.after(...partes.slice(iVerlo + 1));
  } else card.replaceChildren(...partes);
  card.dataset.idc = a.idc; card.hidden = false; requestAnimationFrame(globo);
  if (!fichaExtra && esTel()) card.scrollTop = 0;
  if (fichaExtra){ card.scrollTop = y; requestAnimationFrame(() => { const u = card.querySelector(".desplegado"); if (u) u.scrollIntoView({block:"nearest", behavior:"smooth"}); }); }
}
function cerrarTarjeta(){ card.hidden = true; const prev = selArb; selArb = null; pintarMapa(); repintarPanel(); if (prev){ const b = [...document.querySelectorAll(".lista button")].find(x => x.dataset.idc === prev.idc); if (b) b.focus(); } }

/* ================= acciones principales ================= */
function inicio(){ elegirAlcaldia(null); }
function elegirAlcaldia(cve, op = {}){
  selAlc = cve || null; selCol = null; selArb = null; card.hidden = true; verCols = false;
  if (selAlc) cargarAlcaldia(selAlc).then(() => { if (selAlc === cve){ mapsum(); pintarMapa(); repintarPanel(); } }, e => { aviso(e.message, "error"); if (selAlc === cve) mapsum(); });
  $("omni").value = ""; $("omni-clear").hidden = true;
  migas(); mapsum(); selAlc ? vistaAlcaldia() : vistaInicio(); pintarMapa();
  if (op.volar !== false) volar(selAlc ? bbox(ALC.find(a => a.cve === selAlc).polys) : CITY, selAlc ? padMapa() : padCiudad());
  $("panel-body").scrollTop = 0;
}
function elegirColonia(i, op = {}){
  if (selCol !== i){ tab = "arboles"; filtroCalle = ""; filtroG = "todos"; verTodos = false; calleAbierta = null; verCalles = false; nCalle = 40; }
  selCol = i; selArb = null; card.hidden = true; selAlc = COLONIAS[i].m;
  if (!ARB_ALC.has(selAlc)) cargarAlcaldia(selAlc).then(() => { if (selCol === i){ mapsum(); pintarMapa(); repintarPanel(); } }, e => { aviso(e.message, "error"); if (selCol === i){ mapsum(); repintarPanel(); } });
  $("omni").value = COLONIAS[i].n; $("omni-clear").hidden = false;
  migas(); mapsum(); vistaColonia(); pintarMapa();
  if (op.volar) volar(bbox(COL_GEO.get(i)), padMapa(), Z_ARB + .3);   // como el mapa de Nueva York: al elegir colonia, se acerca hasta ver sus árboles
  $("panel-body").scrollTop = 0;
}
/* Abre en el panel la cuadra del árbol dentro de su calle (calleAbierta). Sin calles cargadas todavía, la calle queda sin cuadras. */
function abrirCuadraDe(a){
  const k = calleAbierta, cs = cuadrasDe(k, arbolesDe(a.col).filter(x => calleTexto(x) === k)), c = cs && cs.find(x => x.arbs.includes(a));
  cuadraAbierta = c ? k + "|" + c.etq : null;
  if (c){ const i = c.arbs.indexOf(a); if (i >= nCalle) nCalle = Math.ceil((i + 1) / 40) * 40; }
}
const verArbolEnLista = () => requestAnimationFrame(() => { const b = document.querySelector('.lista button[aria-pressed="true"]'); if (b) b.scrollIntoView({block:"center"}); });
function elegirArbol(a, op = {}){
  if (a.col >= 0 && a.col !== selCol) elegirColonia(a.col);
  else if (a.col < 0 && selAlc !== a.mun) elegirAlcaldia(a.mun, {volar:false});
  if (selArb !== a) fichaExtra = null; selArb = a;
  if (a.calle && a.col >= 0){   // el panel abre la calle y la cuadra del árbol elegido (en el mapa, por ubicación o desde la lista)
    const k = calleTexto(a); if (filtroCalle && !plano(k).includes(plano(filtroCalle))) filtroCalle = "";
    calleAbierta = k; abrirCuadraDe(a);
  }
  pintarTarjeta(a); repintarPanel(); pintarMapa(); verArbolEnLista();
  if (op.volar){ const d = .0012; volar([a.lng - d, a.lat - d, a.lng + d, a.lat + d], esTel() ? {top:40, left:20, right:20, bottom:Math.round(innerHeight * .45)} : {top:60, left:60, right:400, bottom:60}, Z_TOQUE + .3); }   // siempre lo bastante cerca para tocar los árboles vecinos los arbolitos
  if (esTel()) cerrarHoja();
  const h = card.querySelector("h2"); h.setAttribute("tabindex", "-1"); h.focus({preventScroll:true});
}

