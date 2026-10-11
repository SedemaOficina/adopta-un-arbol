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
  aviso("Te acercamos para que elijas bien: toca tu árbol.");
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
  if (!navigator.geolocation) return aviso("Este navegador no puede ubicarte. Busca tu colonia por nombre o código postal.");
  navigator.geolocation.getCurrentPosition(p => {
    miPos = [p.coords.longitude, p.coords.latitude]; const c = coloniaEn(miPos);
    if (c === null){ aviso("Tu ubicación está fuera de las colonias de la Ciudad de México."); pintarMapa(); return; }
    limpiarBusqueda(); elegirColonia(c); volar([miPos[0] - .004, miPos[1] - .004, miPos[0] + .004, miPos[1] + .004], padMapa());
  }, () => aviso("No pudimos usar tu ubicación en esta vista. Elige tu alcaldía o busca tu colonia."), {timeout:8000, maximumAge:60000});
};

/* ================= hoja inferior (teléfono) ================= */
/* Lote 3: la hoja del celular tiene tres alturas: asoma (se ve el mapa), media (inicio) y completa (para leer). Se cambia tocando o arrastrando la manija. */
let HOJA = "media";
function hoja(e){ HOJA = e; const b = document.body; b.classList.remove("hoja-asoma", "hoja-media", "hoja-completa"); b.classList.add("hoja-" + e);
  const g = $("grip"); g.style.removeProperty("--hoja-px"); b.classList.remove("hoja-arrastre");
  g.setAttribute("aria-expanded", String(e === "completa")); $("grip-lbl").textContent = e === "completa" ? "Ver el mapa" : e === "media" ? "Ver más" : "Ver el panel"; }
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
  el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":"Cerrar"}, linea("x")),
  el("h2", {id:"t-info", texto:"Cómo funciona"}),
  el("p", {texto:"Los árboles de tu calle ya tienen número en el inventario de arbolado urbano. Falta que tengan a alguien que los mire."}),
  el("ol", {class:"pasos"},
    el("li", {}, el("b", {texto:"Busca tu calle o usa tu ubicación. "}), "Verás qué tan verde es tu colonia y cuántas calles con árboles tiene, frente al promedio de la ciudad."),
    el("li", {}, el("b", {texto:"Encuentra un árbol. "}), "De cerca, cada árbol del mapa es un arbolito; los que ya tienen quien los cuide llevan un número guinda con cuántas personas lo cuidan. Confírmalo en Street View."),
    el("li", {}, el("b", {texto:"Cuídalo. "}), "Escribe tu nombre y guarda tu reconocimiento en imagen o en PDF. Varias personas pueden cuidar el mismo árbol."),
    el("li", {}, el("b", {texto:"Invita. "}), "Envía la liga de un árbol a tu familia o a tus vecinos.")),
  el("h3", {texto:"El ABC de tu árbol"}), abcBloque(true),
  el("h3", {texto:"Qué miden las cifras de tu colonia"}),
  ...INDS.map(i => el("p", {}, el("b", {texto:i.n + ". "}), i.mide + " Fuente: " + i.fuente)),
  el("h3", {texto:"Preguntas frecuentes"}),
  el("div", {class:"preguntas"},
    [["¿El árbol se vuelve mío?", "No. El reconocimiento es simbólico: no otorga derechos sobre el árbol ni autoriza podarlo, moverlo o intervenirlo. Las decisiones técnicas sobre cada árbol las toma la autoridad."],
     ["¿Guardan mis datos?", "No. Tu nombre, tu foto y lo que escribas se usan solo en tu teléfono para armar el reconocimiento. Del árbol solo se cuenta que una persona más lo cuida, sin ningún dato tuyo."]]
    .map(([q, r]) => el("details", {}, el("summary", {texto:q}), el("p", {texto:r})))),
  el("h3", {texto:"Sobre esta versión"}),
  el("p", {class:"nota", texto:"Datos: inventario de arbolado urbano (octubre de 2026; solo registros de árbol), colonias (catálogo SEDEMA), calles y árboles en banqueta (INEGI, Características del Entorno Urbano 2020) y verdor de las calles (SEDEMA-SIA, noviembre de 2025). La calle de cada árbol es la más cercana a él. Calor: WRI a partir de Landsat 2023-2025 (CC BY 4.0). En una segunda etapa, la ficha de cada árbol mostrará su nombre común y científico, el diámetro del tronco, la altura y el diámetro de la copa."}),
  el("div", {class:"pie-inst"},
    el("span", {class:"logo-inst pie-comp"}, el("img", {class:"logo-src", src:window.LOGO_INST, alt:"Gobierno de la Ciudad de México. Secretaría del Medio Ambiente. Sistema de Información Ambiental."})),
    el("span", {class:"pie-ap"},
      el("span", {class:"logo-inst recorte"}, el("img", {src:window.LOGO_INST, alt:"Gobierno de la Ciudad de México. Secretaría del Medio Ambiente."})),
      el("span", {class:"logo-inst derecha"}, el("img", {src:window.LOGO_INST, alt:"Sistema de Información Ambiental."})))));
$("abrir-info").onclick = () => abrirModal($("m-info"));

