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
/* Lejos, los árboles se enciman: al tocar uno, el mapa se acerca ahí y se pide tocarlo de nuevo. */
function acercarParaElegir(c){
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  vista = {...vista, longitude:c[0], latitude:c[1], zoom:Math.max(vista.zoom || 10, Z_TOQUE + .5), transitionDuration:reducido ? 0 : 700, transitionInterpolator:reducido ? undefined : new FlyToInterpolator()};
  dk.setProps({initialViewState:vista});
  aviso(tx("ventanas.te_acercamos_para_que_elijas"));
}
/* El aviso va justo debajo de la tarjeta del lugar (arriba a la izquierda), alineado con ella: antes quedaba centrado y se encimaba con la tarjeta. */
function colocarAviso(a){
  const ms = $("mapsum"), par = a.offsetParent; if (!ms || ms.hidden || !par) return;
  const r = ms.getBoundingClientRect(), pr = par.getBoundingClientRect(); if (!r.height) return;
  a.style.top = Math.round(r.bottom - pr.top + 8) + "px"; a.style.left = Math.round(r.left - pr.left) + "px"; a.style.transform = "none";
}
function aviso(t, fijo){ const a = $("aviso"); a.replaceChildren(...(fijo ? [el("span", {class:"girando", "aria-hidden":"true"})] : []), t); a.classList.toggle("espera", !!fijo); a.hidden = false; colocarAviso(a); clearTimeout(aviso.t); if (!fijo) aviso.t = setTimeout(() => a.hidden = true, 7000); }
/* Una búsqueda nueva (ubicación, mapa) borra la anterior: la calle buscada, su cuadra y el texto del buscador. */
function limpiarBusqueda(){ filtroCalle = ""; calleAbierta = null; cuadraAbierta = null; verCalles = false; nCalle = 40; $("omni").value = ""; $("omni-clear").hidden = true; }
$("zloc").onclick = () => {
  if (!navigator.geolocation) return aviso(tx("ventanas.este_navegador_no_puede_ubicarte"));
  navigator.geolocation.getCurrentPosition(p => {
    miPos = [p.coords.longitude, p.coords.latitude]; const c = coloniaEn(miPos);
    if (c === null){ aviso(tx("general.tu_ubicacion_esta_fuera_de")); pintarMapa(); return; }
    limpiarBusqueda(); elegirColonia(c); volar([miPos[0] - .004, miPos[1] - .004, miPos[0] + .004, miPos[1] + .004], padMapa());
  }, () => aviso(tx("ventanas.no_pudimos_usar_tu_ubicacion")), {timeout:8000, maximumAge:60000});
};

/* ================= hoja inferior (teléfono) ================= */
/* Lote 3: la hoja del celular tiene tres alturas: asoma (se ve el mapa), media (inicio) y completa (para leer). Se cambia tocando o arrastrando la manija. */
let HOJA = "media";
function hoja(e){ HOJA = e; const b = document.body; b.classList.remove("hoja-asoma", "hoja-media", "hoja-completa"); b.classList.add("hoja-" + e);
  const g = $("grip"); g.style.removeProperty("--hoja-px"); b.classList.remove("hoja-arrastre");
  g.setAttribute("aria-expanded", String(e === "completa")); $("grip-lbl").textContent = e === "completa" ? tx("ventanas.ver_el_mapa") : e === "media" ? tx("general.ver_mas") : tx("ventanas.ver_el_panel"); }
function cerrarHoja(){ hoja("asoma"); }
{ const g = $("grip"); let y0 = null, h0 = 0, movio = false;
  g.addEventListener("pointerdown", e => { if (!esTel()) return; y0 = e.clientY; h0 = $("panel-body").closest(".panel").getBoundingClientRect().height; movio = false; g.setPointerCapture(e.pointerId); });
  g.addEventListener("pointermove", e => { if (y0 === null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 6) movio = true; if (!movio) return;
    document.body.classList.add("hoja-arrastre"); document.documentElement.style.setProperty("--hoja-px", Math.max(120, Math.min(innerHeight - 130, h0 - dy)) + "px"); });
  g.addEventListener("pointerup", e => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null;
    if (!movio){ hoja(HOJA === "completa" ? "media" : HOJA === "media" ? "completa" : "media"); return; }
    const r = Math.max(0, h0 - dy) / innerHeight; hoja(r < .4 ? "asoma" : r < .72 ? "media" : "completa"); document.documentElement.style.removeProperty("--hoja-px"); });
  g.addEventListener("click", e => { if (!esTel() || e.detail === 0) hoja(HOJA === "completa" ? "media" : HOJA === "media" ? "completa" : "media"); });   // teclado (Enter/espacio)
}
hoja("media");

/* ================= ventanas ================= */
if (window.visualViewport){ const vv = () => document.documentElement.style.setProperty("--vvh", visualViewport.height + "px"); visualViewport.addEventListener("resize", vv); vv(); }
let antesDeModal = null;
function abrirModal(m){ antesDeModal = document.activeElement; m.hidden = false; const f = m.querySelector("h2"); f.setAttribute("tabindex", "-1"); f.focus(); }
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

