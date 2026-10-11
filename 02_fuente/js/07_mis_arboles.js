/* ===== Lote 2: «Mis árboles». Se guarda solo el lugar del árbol, en este navegador; nada de la persona. ===== */
function guardarMeta(a){ const m = leerLocal("guardianias_meta", {}); m[a.idc] = {calle:a.calle || null, col:a.col, mun:a.mun, pat:a.pat ? a.pat.nombre : null}; guardarLocal("guardianias_meta", m); }
function actualizarMis(){ const n = PROPIOS.size, b = $("mis-btn"); if (!b) return; b.hidden = !n; $("mis-n").textContent = String(n); b.setAttribute("aria-label", "Mis árboles: " + n); }
function guardaPagina(){
  return el("div", {class:"guarda"},
    el("p", {}, el("b", {texto:"Guarda esta página para volver a tu árbol. "}), "En el celular, abre el menú del navegador y elige «Agregar a la pantalla de inicio»; en la computadora, presiona Ctrl + D."),
    el("p", {}, el("b", {texto:"En temporada de secas, "}), "recuerda darle agua: despacio y al pie, una vez por semana."));
}
function abrirMis(){
  const m = $("m-mis"), mc = $("mc-mis"), meta = leerLocal("guardianias_meta", {}), ids = [...PROPIOS];
  const fila = (idc, a) => {
    const x = a ? {calle:a.calle, col:a.col, mun:a.mun, pat:a.pat ? a.pat.nombre : null} : meta[idc];
    const titulo = !x ? "Buscando tu árbol…" : x.pat ? "«" + x.pat + "»" : (x.calle || "Árbol sin calle registrada");
    const lugar = x ? [x.col >= 0 && COLONIAS[x.col] ? COLONIAS[x.col].n : null, x.mun ? munNom(x.mun) : null].filter(Boolean).join(", ") : "";
    const ir = async paso => { const t = a || await buscarIdc(idc); cerrarModal(m); if (!t) return aviso("No encontramos ese árbol."); if (paso) abrirCuidar(t); else elegirArbol(t, {volar:true}); };
    return el("li", {}, el("b", {texto:titulo}), lugar ? el("span", {texto:lugar}) : null,
      el("div", {class:"mis-acc"}, el("button", {type:"button", class:"btn-txt", texto:"Ver en el mapa", onclick:() => ir(0)}), el("button", {type:"button", class:"btn-txt", texto:"Mi reconocimiento", onclick:() => ir(1)})));
  };
  const lis = ids.map(idc => { const li = fila(idc, null);
    if (!meta[idc]) buscarIdc(idc).then(a => { if (a){ guardarMeta(a); li.replaceWith(fila(idc, a)); } }, () => {});
    return li; });
  mc.replaceChildren(el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":"Cerrar"}, linea("x")),
    el("h2", {id:"t-mis", texto:"Mis árboles"}),
    el("p", {class:"sub", texto:ids.length === 1 ? "Cuidas un árbol. Gracias." : "Cuidas " + ids.length + " árboles. Gracias."}),
    el("ul", {class:"mis-lista"}, lis),
    guardaPagina(),
    el("p", {class:"nota", texto:"Esta lista se guarda solo en este navegador. Si cambias de teléfono o borras los datos del navegador, se pierde."}));
  abrirModal(m);
}


/* Escala gráfica: una barra de 40 a 110 px con una distancia redonda (10 m … 20 km). */
function escala(){
  const e = $("escala"); if (!e || !vista || vista.zoom == null) return;
  const mpp = 156543.03 * Math.cos((vista.latitude || 19.4) * Math.PI / 180) / Math.pow(2, vista.zoom), max = 110 * mpp;
  const d = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(x => x <= max).pop() || 10;
  e.firstChild.style.width = Math.round(d / mpp) + "px"; e.lastChild.textContent = d >= 1000 ? fmt.format(d / 1000) + " km" : d + " m";
}
function repintarPanel(){
  const y = $("panel-body").scrollTop;
  if (selCol !== null) vistaColonia(); else if (selAlc !== null) vistaAlcaldia(); else return;
  $("panel-body").scrollTop = y;
}
const padMapa = () => esTel() ? {top:60, left:20, right:60, bottom:20} : 60;

