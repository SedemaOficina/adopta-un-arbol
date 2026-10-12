/* ================= reglas y textos ================= */
const sePuedeCuidar = a => !a.cond || a.cond === "Buena" || a.cond === "Regular";
const calleTexto = a => a.calle || tx("guia.calle_sin_nombre_registrado");
/* v30: grupo del árbol en la lista de la colonia (el mismo criterio en el panel, al elegir un árbol y en el mapa) */
const grupoCalle = a => a.pat && !a.calle ? tx("panel.arboles_patrimoniales") : calleTexto(a);
const esGrupoSinCalle = k => k === tx("guia.calle_sin_nombre_registrado") || k === tx("panel.arboles_patrimoniales");
const urlArbol = a => C.URL_SITIO + "#arbol-" + a.idc;
const urlPatrimonial = a => C.URL_PATRIMONIALES + "arbol-" + a.pat.slug + ".html";
const coord = a => a.lat.toFixed(6) + "," + a.lng.toFixed(6);
/* Street View: la misma toma con la que se levantó el árbol (cámara, rumbo e inclinación del inventario). */
const urlStreetView = a => a.cam ? "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + a.cam[1].toFixed(6) + "," + a.cam[0].toFixed(6) + "&heading=" + a.rumbo + "&pitch=" + a.incl + "&fov=40"
  : "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + coord(a);
/* Street View dentro de la ficha: oficial con la clave de Google Maps Embed; sin clave, la liga pública (STREET_VIEW_SIN_CLAVE). */
function embedStreetView(a){
  const ll = a.cam ? a.cam[1].toFixed(6) + "," + a.cam[0].toFixed(6) : a.lat.toFixed(6) + "," + a.lng.toFixed(6);   // sin toma registrada: la vista más cercana al árbol
  const src = C.GOOGLE_MAPS_EMBED_KEY
    ? "https://www.google.com/maps/embed/v1/streetview?key=" + C.GOOGLE_MAPS_EMBED_KEY + "&location=" + ll + "&heading=" + a.rumbo + "&pitch=8&fov=60"
    : C.STREET_VIEW_SIN_CLAVE ? "https://maps.google.com/maps?layer=c&cbll=" + ll + "&cbp=12," + a.rumbo + ",0,0,-8&output=svembed" : null;
  return src ? el("div", {class:"sv-marco"}, el("iframe", {title:tx("ficha.street_view_titulo", {calle:calleTexto(a)}), loading:"lazy", referrerpolicy:"no-referrer-when-downgrade", src})) : null;
}
const nomCol = c => COLONIAS[c] ? COLONIAS[c].n : tx("guia.fuera_del_catalogo_de_colonias");
/* v30 (Liber: «hay veces que solo pone el nombre de la colonia; quisiera que apareciera Col. Romero de Terreros»): en los textos el nombre
   lleva «Col.», salvo los que ya dicen qué son. En el mapa y en las listas de colonias va solo (ahí ya se sabe que son colonias). */
const SIN_COL = /^(Col\.|Colonia|Barrio|Pueblo|U\. H\.|Unidad|Conjunto|Ejido|Campamento|Fraccionamiento|Aeropuerto|Ciudad Universitaria|Zona Federal)(\s|$)/;
const conCol = n => !n || SIN_COL.test(n) ? n : tx("general.colonia_con_col", {colonia:n});
const colTxt = c => COLONIAS[c] ? conCol(COLONIAS[c].n) : tx("guia.fuera_del_catalogo_de_colonias");
/* El ABC del cuidado (aprobado el 9 oct 2026). Sin cantidades hasta que el área técnica las valide; canal de aviso por definir. */
const ABC = [
  {l:"A", t:tx("guia.agua_en_secas"), corto:tx("guia.despacio_y_al_pie_una"),
    largo:tx("guia.de_noviembre_a_mayo_riegalo")},
  {l:"B", t:tx("guia.base_que_respira"), corto:tx("guia.su_cajete_sin_basura_cemento"),
    largo:tx("guia.retira_basura_cascajo_heces_y")},
  {l:"C", t:tx("guia.cobija_de_hojas"), corto:tx("guia.deja_su_hojarasca_en_el"),
    largo:tx("guia.las_hojas_que_caen_guardan")},
  {l:"D", t:tx("guia.deja_su_cuerpo_en_paz"), corto:tx("guia.nada_clavado_amarrado_colgado_ni"),
    largo:tx("guia.la_corteza_es_su_piel")},
  {l:"E", t:tx("guia.encuentrate_con_el_y_avisa"), corto:tx("guia.pasa_a_verlo_nota_sus"),
    largo:tx("guia.observalo_en_cada_temporada_y")}];
const NO_HACER = [tx("guia.podarlo_requiere_autorizacion_de_tu"), tx("guia.cementar_o_reducir_su_cajete"), tx("guia.hacerle_jardinera_o_echarle_tierra"), tx("guia.amontonar_hojas_contra_el_tronco"), tx("guia.encalar_o_pintar_el_tronco"), tx("guia.usar_fertilizantes_o_herbicidas"), tx("guia.clavarle_amarrarle_o_colgarle_cosas")];
const AVISAR = [tx("guia.ramas_rotas_o_colgando"), tx("guia.una_inclinacion_nueva"), tx("guia.raices_cortadas_por_una_obra"), tx("guia.su_cajete_encementado"), tx("guia.poda_o_derribo_sin_aviso"), tx("guia.una_plaga_evidente"), tx("guia.el_arbol_seco")];
const CANAL_AVISO = null;   // pendiente: micrositio, alcaldía o PAOT (uno solo)
/* Videos cortos de cuidado (pendiente 22). url:null = aún no grabado: se muestra «Próximamente». Al tener la liga (YouTube o propia), basta con ponerla aquí. */
const VIDEOS = [
  {id:"riego", letra:"A", t:tx("guia.riego"), d:tx("guia.cuando_y_como_darle_agua"), url:null},
  {id:"residuos", letra:"B", t:tx("guia.retira_los_residuos"), d:tx("guia.su_cajete_limpio_sin_basura"), url:null},
  {id:"acolchado", letra:"C", t:tx("guia.acolchado"), d:tx("guia.sus_hojas_como_cobija_en"), url:null},
  {id:"lastimes", letra:"D", t:tx("guia.no_lo_lastimes"), d:tx("guia.nada_clavado_amarrado_colgado_ni_2"), url:null},
  {id:"conoce", letra:null, t:tx("guia.conoce_tu_arbol"), d:tx("guia.sus_partes_y_como_cambia"), url:null},
  {id:"riesgo", letra:"E", t:tx("guia.senales_de_riesgo_y_a"), d:tx("guia.que_mirar_y_a_quien"), url:null},
  {id:"letrero", letra:null, t:tx("guia.ponle_un_letrero_sin_lastimarlo"), d:tx("guia.como_nombrarlo_sin_clavos_ni"), url:null}];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.35)"/><path d="M10 8.2v7.6l6-3.8z" fill="#fff"/></svg>';
function chipVideo(v){ if (!v) return null;
  const s = el(v.url ? "a" : "span", {class:"vid-chip" + (v.url ? "" : " pronto"), href:v.url || null, target:v.url ? "_blank" : null, rel:v.url ? "noopener" : null}, el("span", {class:"vid-ico"}), tx("guia.video", {titulo:v.t}) + (v.url ? "" : tx("guia.proximamente")));
  s.firstChild.innerHTML = PLAY; return s; }
let verVideos = false;
function galeriaVideos(){
  const caja = el("div", {class:"videos"});
  const pinta = () => {
    const lista = verVideos ? VIDEOS : VIDEOS.slice(0, 3);
    caja.replaceChildren(el("p", {class:"videos-t"}, el("b", {texto:tx("guia.videos_para_cuidar_tu_arbol")}), el("span", {texto:tx("guia.n_videos", {n:VIDEOS.length})})),
      el("div", {class:"vid-fila"}, lista.map(v => { const c = el(v.url ? "a" : "div", {class:"vid" + (v.url ? "" : " pronto"), href:v.url || null, target:v.url ? "_blank" : null, rel:v.url ? "noopener" : null},
          el("span", {class:"vid-mini vid-" + v.id}, el("span", {class:"vid-play"}), v.url ? null : el("small", {texto:tx("guia.proximamente_2")})),
          el("b", {texto:v.t}), el("span", {texto:v.d}));
        c.querySelector(".vid-play").innerHTML = PLAY; return c; })),
      el("button", {type:"button", class:"btn-txt", texto:verVideos ? tx("guia.ver_menos_videos") : tx("guia.ver_mas_videos", {n:VIDEOS.length}), onclick:() => { verVideos = !verVideos; pinta(); }}));
  };
  pinta(); return caja;
}
const abcBloque = abierto => el("details", {class:"abc", open:abierto || null}, el("summary", {texto:tx("guia.como_cuidarlo_el_abc_de")}),
  el("ol", {}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}), el("b", {texto:r.t}), el("span", {texto:r.corto})))),
  el("p", {class:"abc-no"}, el("b", {texto:tx("guia.no_lo_podes")}), tx("guia.la_poda_requiere_autorizacion_de")),
  el("details", {class:"abc-mas"}, el("summary", {texto:tx("guia.ver_la_guia_completa")}),
    el("ol", {class:"abc-largo"}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}),
      el("div", {}, el("b", {texto:r.t}), el("p", {texto:r.largo}), chipVideo(VIDEOS.find(v => v.letra === r.l)))))),
    el("div", {class:"abc-cols"},
      el("div", {class:"abc-nohacer"}, el("b", {texto:tx("general.aunque_parezca_cuidado_no")}), el("ul", {}, NO_HACER.map(t => el("li", {texto:t})))),
      el("div", {class:"abc-avisa"}, el("b", {texto:tx("general.avisa_si_ves")}), el("ul", {}, AVISAR.map(t => el("li", {texto:t}))),
        el("p", {}, el("b", {texto:tx("guia.a_quien")}), CANAL_AVISO || tx("guia.canal_de_aviso_por_definir")))),
    galeriaVideos()),
  el("p", {class:"nota", texto:tx("guia.guia_por_validar_con_el")}));
const INDS = [
  {k:"t", n:tx("guia.calor"), u:" °C", min:35, max:60,
   mide:tx("guia.la_temperatura_de_la_superficie"),
   fuente:tx("guia.wri_a_partir_de_imagenes")},
  {k:"a", n:tx("guia.calles_con_arboles"),
   u:" %", min:0, max:100,
   mide:tx("guia.que_parte_de_las_banquetas"),
   fuente:tx("guia.inegi_caracteristicas_del_entorno_urbano")},
  {k:"v", n:tx("general.verdor_de_las_calles"),
   u:" %", min:0, max:100,
   mide:tx("guia.que_parte_de_la_orilla"),
   fuente:tx("guia.sedema_sia_modelo_de_priorizacion")}];

