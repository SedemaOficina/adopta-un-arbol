/* ================= arranque ================= */
$("usar-ubic").onclick = () => cercaDeMi($("usar-ubic"));
$("mis-btn").onclick = abrirMis; actualizarMis();
setLoad(tx("carga.listo"), 1); $("loader").hidden = true;
const ruta = location.hash.slice(1).split("-")[0];
mapsum(); vistaInicio(); pintarMapa();
requestAnimationFrame(() => { fijarMinZoom(); if (!location.hash) volar(CITY, padCiudad()); });   // ya con el tamaño final del mapa
if (ruta) aplicarHash(location.hash);   // #colonia-N (también el número viejo de una colonia unida), #alcaldia-CVE o #arbol-CLAVE
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
}).catch(e => { console.error(e); CALLES_FALLO = true; aviso(tx("carga.no_se_pudieron_cargar_las"), "error"); if (!lista.hidden) buscar(); });
