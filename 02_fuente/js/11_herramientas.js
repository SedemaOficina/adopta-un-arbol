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
  vista = {longitude:c.longitude, latitude:c.latitude, zoom:z, pitch:0, bearing:0, transitionDuration:0};
  dk.setProps({initialViewState:vista});
  escala(); clearTimeout(T_CAPAS); T_CAPAS = setTimeout(pintarCapas, 120);
}, {capture:true, passive:false});
const zoomA = d => { vista = {...vista, zoom:Math.max(9, Math.min(20.5, vista.zoom + d)), transitionDuration:250}; dk.setProps({initialViewState:vista}); };
$("zin").onclick = () => zoomA(1); $("zout").onclick = () => zoomA(-1);
$("zcity").onclick = () => volar(CITY, padCiudad());
/* Lejos, los árboles se enciman: al tocar uno, el mapa se acerca ahí para tocarlo de nuevo. */
function acercarParaElegir(c){
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  vista = {...vista, longitude:c[0], latitude:c[1], zoom:Math.max(vista.zoom || 10, Z_TOQUE + .5), transitionDuration:reducido ? 0 : 700, transitionInterpolator:reducido ? undefined : new FlyToInterpolator()};
  dk.setProps({initialViewState:vista});   // sin aviso: acercarse ya se entiende solo (decisión de Liber, 11 oct)
}
/* El aviso va justo debajo de la tarjeta del lugar (arriba a la izquierda), alineado con ella: antes quedaba centrado y se encimaba con la tarjeta. */
function colocarAviso(a){
  const ms = $("mapsum"), par = a.offsetParent; if (!par) return;
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
  clearTimeout(aviso.c); aviso.c = setTimeout(() => { if (!a.hidden) colocarAviso(a); }, 500);   /* otra vez cuando la hoja termina de moverse */
  clearTimeout(aviso.t); if (!espera) aviso.t = setTimeout(() => a.hidden = true, s.length > 90 ? 10000 : 7000);
}
/* Una búsqueda nueva (ubicación, mapa) borra la anterior: la calle buscada, su cuadra y el texto del buscador. */
function limpiarBusqueda(){ filtroCalle = ""; calleAbierta = null; cuadraAbierta = null; verCalles = false; nCalle = 40; $("omni").value = ""; $("omni-clear").hidden = true; }
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
  rotuloInfo();
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
    if (window.visualViewport) r.setProperty("--vvh", visualViewport.height + "px");
    if (b) r.setProperty("--encabezado-fin", Math.round(b.getBoundingClientRect().bottom) + "px"); };
  if (window.visualViewport) visualViewport.addEventListener("resize", vv); addEventListener("resize", vv); vv(); }
let antesDeModal = null;
function abrirModal(m){ if (m.hidden) antesDeModal = document.activeElement; m.hidden = false;   /* de un paso a otro de la misma ventana se conserva a dónde regresar */ const f = m.querySelector("h2"); f.setAttribute("tabindex", "-1"); f.focus(); }
function cerrarModal(m){ m.hidden = true; if (antesDeModal) antesDeModal.focus(); }
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
  el("h3", {texto:tx("ventanas.sobre_esta_version")}),
  el("p", {class:"nota", texto:tx("ventanas.datos_inventario_de_arbolado_urbano")}),
  el("p", {class:"nota version-sitio", texto:tx("ventanas.version", {version:C.VERSION, fecha:C.FECHA_VERSION})}),
  el("div", {class:"pie-inst"},
    el("span", {class:"logo-inst pie-comp"}, el("img", {class:"logo-src", src:window.LOGO_INST, alt:tx("general.gobierno_de_la_ciudad_de")})),
    el("span", {class:"pie-ap"},
      el("span", {class:"logo-inst recorte"}, el("img", {src:window.LOGO_INST, alt:tx("ventanas.gobierno_de_la_ciudad_de_2")})),
      el("span", {class:"logo-inst derecha"}, el("img", {src:window.LOGO_INST, alt:tx("ventanas.sistema_de_informacion_ambiental")})))));
$("abrir-info").onclick = () => abrirModal($("m-info"));

