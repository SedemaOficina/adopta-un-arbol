/* ================= reglas y textos ================= */
const sePuedeCuidar = a => !a.cond || a.cond === "Buena" || a.cond === "Regular";
const calleTexto = a => a.calle || "Calle sin nombre registrado";
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
  return src ? el("div", {class:"sv-marco"}, el("iframe", {title:"Street View del árbol " + a.idc, loading:"lazy", referrerpolicy:"no-referrer-when-downgrade", src})) : null;
}
const nomCol = c => COLONIAS[c] ? COLONIAS[c].n : "Fuera del catálogo de colonias";
/* El ABC del cuidado (aprobado el 9 oct 2026). Sin cantidades hasta que el área técnica las valide; canal de aviso por definir. */
const ABC = [
  {l:"A", t:"Agua en secas", corto:"Despacio y al pie, una vez por semana. Si la tierra está húmeda, no riegues.",
    largo:"De noviembre a mayo, riégalo una vez por semana, despacio y al pie, temprano o al caer la tarde, para que el agua llegue hondo. Antes, toca la tierra: si está húmeda, no riegues. Usa agua reutilizada sin jabón ni cloro, como la que sale mientras se calienta la regadera o la de lavar verduras. Los árboles jóvenes son los que más la necesitan. En lluvias, solo obsérvalo."},
  {l:"B", t:"Base que respira", corto:"Su cajete, sin basura, cemento ni tierra de más. No lo pises ni estaciones encima.",
    largo:"Retira basura, cascajo, heces y hierba. Afloja solo la superficie con una herramienta de mano, sin tocar raíces. No estaciones, apiles ni camines sobre el cajete: cada pisada aprieta la tierra y le quita aire."},
  {l:"C", t:"Cobija de hojas", corto:"Deja su hojarasca en el cajete, en forma de dona y sin tocar el tronco.",
    largo:"Las hojas que caen guardan la humedad y lo alimentan: déjalas en el cajete, no en la basura. Acomódalas en forma de dona, separadas del tronco, en una capa delgada. No uses pasto recién cortado."},
  {l:"D", t:"Deja su cuerpo en paz", corto:"Nada clavado, amarrado, colgado ni pintado. Sin fertilizantes ni herbicidas.",
    largo:"La corteza es su piel: no le claves, amarres ni cuelgues nada, no la pintes ni la encales. No le pongas fertilizantes ni herbicidas. Y no lo podes: la poda requiere autorización de tu alcaldía y personal capacitado."},
  {l:"E", t:"Encuéntrate con él y avisa", corto:"Pasa a verlo, nota sus cambios y avisa si lo ves en riesgo.",
    largo:"Obsérvalo en cada temporada y preséntaselo a tus vecinos. Si lo ves en riesgo, avisa: tú observas y avisas, no intervienes."}];
const NO_HACER = ["Podarlo: requiere autorización de tu alcaldía", "Cementar o reducir su cajete", "Hacerle jardinera o echarle tierra", "Amontonar hojas contra el tronco", "Encalar o pintar el tronco", "Usar fertilizantes o herbicidas", "Clavarle, amarrarle o colgarle cosas"];
const AVISAR = ["Ramas rotas o colgando", "Una inclinación nueva", "Raíces cortadas por una obra", "Su cajete encementado", "Poda o derribo sin aviso visible", "Una plaga evidente", "El árbol seco"];
const CANAL_AVISO = null;   // pendiente: micrositio, alcaldía o PAOT (uno solo)
/* Videos cortos de cuidado (pendiente 22). url:null = aún no grabado: se muestra «Próximamente». Al tener la liga (YouTube o propia), basta con ponerla aquí. */
const VIDEOS = [
  {id:"riego", letra:"A", t:"Riego", d:"Cuándo y cómo darle agua en secas.", url:null},
  {id:"residuos", letra:"B", t:"Retira los residuos", d:"Su cajete limpio: sin basura, cascajo ni cemento.", url:null},
  {id:"acolchado", letra:"C", t:"Acolchado", d:"Sus hojas como cobija, en forma de dona.", url:null},
  {id:"lastimes", letra:"D", t:"No lo lastimes", d:"Nada clavado, amarrado, colgado ni pintado.", url:null},
  {id:"conoce", letra:null, t:"Conoce tu árbol", d:"Sus partes y cómo cambia en el año.", url:null},
  {id:"riesgo", letra:"E", t:"Señales de riesgo y a quién avisar", d:"Qué mirar y a quién llamar.", url:null},
  {id:"letrero", letra:null, t:"Ponle un letrero sin lastimarlo", d:"Cómo nombrarlo sin clavos ni alambre.", url:null}];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.35)"/><path d="M10 8.2v7.6l6-3.8z" fill="#fff"/></svg>';
function chipVideo(v){ if (!v) return null;
  const s = el(v.url ? "a" : "span", {class:"vid-chip" + (v.url ? "" : " pronto"), href:v.url || null, target:v.url ? "_blank" : null, rel:v.url ? "noopener" : null}, el("span", {class:"vid-ico"}), "Video: " + v.t + (v.url ? "" : " · próximamente"));
  s.firstChild.innerHTML = PLAY; return s; }
let verVideos = false;
function galeriaVideos(){
  const caja = el("div", {class:"videos"});
  const pinta = () => {
    const lista = verVideos ? VIDEOS : VIDEOS.slice(0, 3);
    caja.replaceChildren(el("p", {class:"videos-t"}, el("b", {texto:"Videos para cuidar tu árbol"}), el("span", {texto:VIDEOS.length + " videos cortos"})),
      el("div", {class:"vid-fila"}, lista.map(v => { const c = el(v.url ? "a" : "div", {class:"vid" + (v.url ? "" : " pronto"), href:v.url || null, target:v.url ? "_blank" : null, rel:v.url ? "noopener" : null},
          el("span", {class:"vid-mini vid-" + v.id}, el("span", {class:"vid-play"}), v.url ? null : el("small", {texto:"Próximamente"})),
          el("b", {texto:v.t}), el("span", {texto:v.d}));
        c.querySelector(".vid-play").innerHTML = PLAY; return c; })),
      el("button", {type:"button", class:"btn-txt", texto:verVideos ? "Ver menos videos" : "Ver más videos (" + VIDEOS.length + ")", onclick:() => { verVideos = !verVideos; pinta(); }}));
  };
  pinta(); return caja;
}
const abcBloque = abierto => el("details", {class:"abc", open:abierto || null}, el("summary", {texto:"Cómo cuidarlo: el ABC de tu árbol"}),
  el("ol", {}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}), el("b", {texto:r.t}), el("span", {texto:r.corto})))),
  el("p", {class:"abc-no"}, el("b", {texto:"No lo podes. "}), "La poda requiere autorización de tu alcaldía. Si lo ves en riesgo, avisa."),
  el("details", {class:"abc-mas"}, el("summary", {texto:"Ver la guía completa"}),
    el("ol", {class:"abc-largo"}, ABC.map(r => el("li", {}, el("i", {"aria-hidden":"true", texto:r.l}),
      el("div", {}, el("b", {texto:r.t}), el("p", {texto:r.largo}), chipVideo(VIDEOS.find(v => v.letra === r.l)))))),
    el("div", {class:"abc-cols"},
      el("div", {class:"abc-nohacer"}, el("b", {texto:"Aunque parezca cuidado, no"}), el("ul", {}, NO_HACER.map(t => el("li", {texto:t})))),
      el("div", {class:"abc-avisa"}, el("b", {texto:"Avisa si ves"}), el("ul", {}, AVISAR.map(t => el("li", {texto:t}))),
        el("p", {}, el("b", {texto:"¿A quién? "}), CANAL_AVISO || "Canal de aviso por definir."))),
    galeriaVideos()),
  el("p", {class:"nota", texto:"Guía por validar con el área técnica de la Secretaría."}));
const INDS = [
  {k:"t", n:"Calor", u:" °C", min:35, max:60,
   f:(v, p) => { const d = Math.round((v - p) * 10) / 10, g = x => fmt1.format(x) + " °C";
     return Math.abs(d) < .5 ? `En los días más calurosos, su suelo y sus techos llegan a ${g(v)}, casi igual que el promedio de la ciudad (${g(p)}).`
       : `En los días más calurosos, su suelo y sus techos llegan a ${g(v)}: ${g(Math.abs(d))} ${d > 0 ? "más" : "menos"} que el promedio de la ciudad.`; },
   mide:"La temperatura de la superficie (suelo, pavimento y techos) en los días más calurosos del año, medida por satélite: el valor alto típico de la temporada de calor, promediado en la colonia. No es la temperatura del aire, pero muestra dónde se acumula el calor y dónde la sombra de los árboles hace más falta.",
   fuente:"WRI, a partir de imágenes Landsat 2023-2025 (30 m), licencia CC BY 4.0. Cubre la mancha urbana."},
  {k:"a", n:"Calles con árboles",
   f:(v, p) => `En ${fmt0.format(v)} de cada 100 metros de banqueta hay árboles. En la ciudad, ${fmt0.format(p)}.`,
   u:" %", min:0, max:100,
   mide:"Qué parte de las banquetas tiene al menos un árbol o palmera. 100 % significaría que todos los tramos de banqueta tienen árboles; no mide cuántos hay ni qué tan grandes son.",
   fuente:"INEGI, Características del Entorno Urbano 2020, por frente de manzana. Se omiten los frentes sin dato."},
  {k:"v", n:"Verdor de las calles",
   f:(v, p, x) => (v < p ? "Vistas desde el satélite, sus calles son menos verdes que el promedio de la ciudad." : "Vistas desde el satélite, sus calles son más verdes que el promedio de la ciudad.")
     + (x && x.n ? " " + decimos(V_COLS.filter(w => w < v).length / V_COLS.length) : ""),
   u:" %", min:0, max:100,
   mide:"Qué parte de la orilla de las manzanas se ve con vegetación en imagen de satélite: árboles, pasto o jardines, públicos o privados. 100 % significaría que toda la orilla de las manzanas se ve verde.",
   fuente:"SEDEMA-SIA, modelo de priorización de reforestación (noviembre de 2025), sobre frentes de manzana de INEGI."}];
function mensaje(x){
  if (x.v == null || x.a == null) return "Aún no tenemos todos los datos de esta colonia.";
  // 1.5 °C sobre el promedio pesa como 15 % menos verdor o menos calles con árboles
  const b = {t:x.t == null ? 0 : (x.t - PROM.t) / 1.5 * .15, v:(PROM.v - x.v) / PROM.v, a:(PROM.a - x.a) / PROM.a};
  const [k, val] = Object.entries(b).sort((p, q) => q[1] - p[1])[0];
  if (val >= .15) return {t:"Tu colonia se calienta más que la ciudad: le hace falta sombra.", v:"A las calles de tu colonia les falta verde.", a:"Muchas calles de tu colonia no tienen árboles."}[k];
  if (b.v <= -.15 && b.a <= -.1) return "Tu colonia es de las más verdes. Cuidarla también cuenta.";
  return "Tu colonia está cerca del promedio de la ciudad. Cada árbol cuenta.";
}

