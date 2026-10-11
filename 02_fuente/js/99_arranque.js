/* ================= arranque ================= */
$("usar-ubic").onclick = () => cercaDeMi($("usar-ubic"));
$("mis-btn").onclick = abrirMis; actualizarMis();
setLoad(tx("carga.listo"), 1); $("loader").hidden = true;
const h = location.hash.slice(1), [ruta, ...resto] = h.split("-"), param = resto.join("-");
mapsum(); vistaInicio(); pintarMapa();
if (!HAY_MAPA && esTel()) hoja("completa");   // sin mapa, en el celular el panel se abre completo
requestAnimationFrame(() => { fijarMinZoom(); if (!location.hash) volar(CITY, padCiudad()); });   // ya con el tamaño final del mapa
if (ruta === "colonia" && COLONIAS[+param]) elegirColonia(+param, {volar:true});
else if (ruta === "arbol") buscarIdc(param).then(a => { if (a) elegirArbol(a, {volar:true}); else aviso(tx("general.arbol_no_encontrado", {arbol:param}), "error"); });
/* Calles: llegan después del panel. Se arman sus capas y se rehacen los índices que se calcularon sin ellas
   (cuadras, etiquetas, resaltado de la calle elegida y buscador de calles). */
callesTexto.then(async t => {
  leerCalles(await gunzip(deBase64(t))); armarCapasCalles();
  COL_FR = null; NODOS = null; IDX_CALLES = null; STL.clear(); ETQ_CALLE.k = ""; CALLE_CACHE = {k:null, data:[]};
  CALLES_LISTAS = true; document.documentElement.dataset.calles = "listas";
  const abrir = selArb && selArb.col >= 0 && calleAbierta === calleTexto(selArb) && !cuadraAbierta;   // árbol elegido antes de que llegaran
  if (abrir) abrirCuadraDe(selArb);
  if (selCol !== null) repintarPanel();
  if (abrir && cuadraAbierta) verArbolEnLista();
  pintarMapa();
  if (!lista.hidden) buscar();
}).catch(e => { console.error(e); aviso(tx("carga.no_se_pudieron_cargar_las"), "error"); });
