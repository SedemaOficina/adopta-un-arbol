/* ================= cuidar y reconocimiento ================= */
/* Cinco compromisos, uno por letra del ABC: lo que la persona promete es lo mismo que aprende. */
const COMPROMISOS = [
  {l:"A", t:tx("cuidar.le_doy_agua_en_secas"), d:tx("cuidar.despacio_y_al_pie_una")},
  {l:"B", t:tx("cuidar.cuido_que_su_cajete_respire"), d:tx("cuidar.sin_basura_sin_cemento_sin")},
  {l:"C", t:tx("cuidar.le_dejo_su_hojarasca"), d:tx("cuidar.lo_que_cae_lo_abriga")},
  {l:"D", t:tx("cuidar.no_lo_podo_ni_lo"), d:tx("cuidar.nada_clavado_ni_amarrado_la")},
  {l:"E", t:tx("cuidar.lo_miro_y_aviso_si"), d:tx("cuidar.paso_a_verlo_noto_sus")}];
/* Borrador del reconocimiento: vive solo en esta página. v30 (auditoría): uno por árbol; antes era uno solo y, al cuidar un segundo árbol,
   su reconocimiento salía con la foto, el nombre del árbol y el mensaje del primero. El nombre y el trato de la persona sí pasan al siguiente. */
const BORRADORES = new Map();
let borrador = {nombre:"", trato:null, nombreArbol:"", carta:"", foto:null};   /* v31: sin trato elegido por omisión (Liber) */
const borradorDe = a => { if (!BORRADORES.has(a.idc)) BORRADORES.set(a.idc, {nombre:borrador.nombre, trato:borrador.trato, nombreArbol:"", carta:"", foto:null}); return BORRADORES.get(a.idc); };
/* Trato: valor fijo y texto en textos.js (antes el texto visible servía de clave en tres tablas) */
const TRATOS = ["guardiana", "guardian", "persona"];
const tratoTx = (t, min) => ({guardiana:min ? tx("cuidar.trato_guardiana_min") : tx("cuidar.trato_guardiana"), guardian:min ? tx("cuidar.trato_guardian_min") : tx("cuidar.trato_guardian"),
  persona:min ? tx("cuidar.trato_persona_min") : tx("cuidar.trato_persona")})[TRATOS.includes(t) ? t : "persona"];
const IMG = {guinda:css("--guinda"), dorado:css("--dorado"), doradoClaro:css("--pat-crema"), gris:css("--ink-2"), tinta:css("--ink"), hoja:css("--verdor-5"), placa:css("--menta-2"), placaBorde:css("--gris-borde"), pat:css("--pat"), linea:css("--line")};
const imgLogo = new Image(); imgLogo.src = window.LOGO_INST;
const imgEmblema = new Image();   // se pide solo al abrir el reconocimiento de un árbol patrimonial
/* Librerías que solo se usan al ver o guardar el reconocimiento: se cargan entonces (Lote 5). */
const LIB = {qr:"vendor/qrcode-generator-1.4.4.js", pdf:"vendor/jspdf-4.2.1.umd.min.js"};
const fuentes = Promise.all(["700 76px Cabin", "400 30px Roboto", "500 30px Roboto", "italic 400 30px Roboto"].map(f => document.fonts.load(f))).catch(() => {});
function abrirCuidar(a, paso){
  const m = $("m-cuidar"), mc = $("mc-cuidar"); borrador = borradorDe(a);
  if (C.SIMULAR_GUARDIANES && SIM_MIOS.includes(a.idc) && !borrador.nombre) Object.assign(borrador, {nombre:tx("cuidar.ejemplo_nombre"), trato:"guardiana", nombreArbol:tx("cuidar.ej_la_sombrita").replace(/^Ej\.\s*/, ""), carta:tx("cuidar.ejemplo_mensaje")});
  mc.classList.toggle("es-pat", !!a.pat);
  if (!paso) paso = PROPIOS.has(a.idc) && borrador.nombre ? 2 : 1;
  const est = el("p", {class:"estado", "aria-live":"polite"});
  const cab = (t) => [el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":tx("general.cerrar")}, linea("x")), el("p", {class:"paso", texto:t})];
  if (paso === 1){
    mc.classList.add("angosta");
    const nombre = el("input", {type:"text", id:"f-nombre", maxlength:"60", autocomplete:"name", "aria-required":"true", placeholder:tx("cuidar.ej_fulana_de_tal"), value:borrador.nombre});
    const arbol = el("input", {type:"text", id:"f-arbol", maxlength:"40", placeholder:tx("cuidar.ej_la_sombrita"), value:borrador.nombreArbol});
    const carta = el("textarea", {id:"f-carta", maxlength:"120", rows:"2", placeholder:tx("cuidar.ej_gracias_por_la_sombra"), "aria-describedby":"a-carta"}); carta.value = borrador.carta;
    const cuenta = el("small", {id:"a-carta", texto:tx("cuidar.caracteres", {n:carta.value.length})}); carta.addEventListener("input", () => { cuenta.textContent = tx("cuidar.caracteres", {n:carta.value.length}); crecer(); });
    const crecer = () => { carta.style.height = "auto"; carta.style.height = carta.scrollHeight + "px"; };   /* v31: crece con lo que se escribe, sin barra (FRM-29) */
    const foto = el("input", {type:"file", id:"f-foto", accept:"image/*", class:"foto-input", "aria-describedby":"foto-nota"});
    const acepto = el("input", {type:"checkbox", id:"f-acepto", "aria-required":"true"});
    const trato = el("div", {class:"trato", role:"radiogroup", "aria-labelledby":"etq-trato", "aria-required":"true"},   /* v30: el nombre lo da su etiqueta visible (antes se decía dos veces) */
      TRATOS.map((t, i) => el("label", {}, el("input", {type:"radio", name:"trato", id:"f-trato-" + i, value:t, checked:t === borrador.trato}), tratoTx(t))));
    /* v30: la foto se puede quitar; si no se puede leer (HEIC en algunos navegadores) se dice; «Confirmar» espera a que termine de cargar.
       v30e: caja punteada «Agregar fotografía» con ícono de cámara; con foto, su miniatura y «Cambiar fotografía» (antes, el nombre del archivo) */
    const icoFoto = el("span", {class:"foto-ico", "aria-hidden":"true"});
    icoFoto.innerHTML = '<svg class="ico-svg" viewBox="0 0 24 24"><path d="M13.5 5h-4L8 7.5H5a2 2 0 0 0-2 2V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5"/><circle cx="11" cy="13.2" r="3"/><path d="M19 3v5M16.5 5.5h5"/></svg>';
    const mini = el("img", {class:"foto-mini", alt:""}), fotoT = el("span", {class:"foto-t"}), nota = el("small", {id:"foto-nota", class:"foto-nota"});
    const quitar = el("button", {type:"button", class:"btn-txt foto-quitar", texto:tx("cuidar.quitar_foto"), onclick:() => { borrador.foto = null; foto.value = ""; etiquetaFoto(); foto.focus(); }});
    const etiquetaFoto = (error) => { const hay = !!borrador.foto;
      fotoT.textContent = hay ? tx("cuidar.cambiar_fotografia") : tx("cuidar.agregar_fotografia");
      icoFoto.hidden = hay; mini.hidden = !hay; if (hay) mini.src = borrador.foto.src; else mini.removeAttribute("src");
      nota.textContent = error || tx("cuidar.foto_nota"); nota.classList.toggle("error", !!error); quitar.hidden = !hay; if (error) anunciar(error); };
    etiquetaFoto();
    let fotoCargando = null;
    foto.addEventListener("change", () => { const f = foto.files[0]; if (!f) return;
      fotoCargando = new Promise(listo => { const r = new FileReader();
        r.onload = () => { const im = new Image(); im.onload = () => { borrador.foto = im; etiquetaFoto(); anunciar(tx("cuidar.foto_lista")); listo(); };
          im.onerror = () => { borrador.foto = null; foto.value = ""; etiquetaFoto(tx("cuidar.foto_no_se_pudo")); listo(); }; im.src = r.result; };
        r.onerror = () => { etiquetaFoto(tx("cuidar.foto_no_se_pudo")); listo(); }; r.readAsDataURL(f); }); });
    /* v31 (Liber, con el Estándar de formularios del SIA): las obligatorias llevan asterisco y «obligatorio» para lectores de pantalla (FRM-30);
       al confirmar con alguna sin contestar no se envía (FRM-38), cada una muestra su mensaje con aria-invalid y aria-describedby (FRM-34, 37)
       y el foco va a la primera (pedido de Liber; el estándar pide un resumen arriba, FRM-33). El mensaje se quita al contestarla (FRM-36). */
    const oblig = () => [el("span", {class:"oblig", "aria-hidden":"true", texto:" *"}), el("span", {class:"solo-lector", texto:tx("cuidar.obligatorio")})];
    const errDe = id => el("p", {class:"campo-error", id, hidden:true});
    const errNombre = errDe("e-nombre"), errTrato = errDe("e-trato"), errAcepto = errDe("e-acepto");
    const marcar = (ctrl, err, t) => { const d = (ctrl.getAttribute("aria-describedby") || "").split(" ").filter(x => x && x !== err.id);
      if (t){ err.replaceChildren(linea("alerta"), t); err.hidden = false; ctrl.setAttribute("aria-invalid", "true"); d.push(err.id); }
      else { err.hidden = true; err.replaceChildren(); ctrl.removeAttribute("aria-invalid"); }
      if (d.length) ctrl.setAttribute("aria-describedby", d.join(" ")); else ctrl.removeAttribute("aria-describedby"); };
    nombre.addEventListener("input", () => { if (nombre.value.trim()) marcar(nombre, errNombre); });
    trato.addEventListener("change", () => marcar(trato, errTrato));
    acepto.addEventListener("change", () => { if (acepto.checked) marcar(acepto, errAcepto); });
    let enviando = false;
    const confirmar = async () => {
      if (enviando) return;   /* v30: un doble toque no confirma dos veces (en la etapa 2 contaría doble) */
      const tr = trato.querySelector("input:checked");
      borrador.nombre = nombre.value.trim(); borrador.nombreArbol = arbol.value.trim(); borrador.carta = carta.value.trim(); borrador.trato = tr ? tr.value : null;
      const revisar = [[!borrador.nombre, nombre, errNombre, tx("cuidar.escribe_tu_nombre_como_quieres"), nombre],
        [!tr, trato, errTrato, tx("cuidar.elige_una_opcion"), trato.querySelector("input")],
        [!acepto.checked, acepto, errAcepto, tx("cuidar.marca_me_comprometo_a_cuidarlo"), acepto]];
      for (const [mal, ctrl, err, t] of revisar) marcar(ctrl, err, mal ? t : null);
      const faltan = revisar.filter(r => r[0]);
      if (faltan.length){ est.textContent = faltan.length === 1 ? tx("cuidar.falta_1") : tx("cuidar.faltan_n", {n:faltan.length}); faltan[0][4].focus(); return; }
      est.textContent = tx("cuidar.guardando"); enviando = true;
      if (fotoCargando) await Promise.race([fotoCargando, new Promise(r => setTimeout(r, 8000))]);
      const r = await registrarGuardian(a); enviando = false;
      abrirCuidar(a, r === "nuevo" ? 2.1 : 2);
    };
    mc.replaceChildren(...cab(tx("cuidar.paso_1_de_2_tu")),
      el("h2", {id:"t-cuidar", texto:a.pat ? tx("cuidar.vas_a_cuidar_patrimonial", {nombre:a.pat.nombre}) : tx("cuidar.vas_a_cuidar_este_arbol")}),
      el("p", {class:"sub", texto:calleTexto(a) + " · " + colTxt(a.col) + ", " + munNom(a.mun)}),
      el("form", {novalidate:true, onsubmit:e => { e.preventDefault(); confirmar(); }},
        el("p", {class:"nota nota-oblig", texto:tx("cuidar.preguntas_obligatorias")}),
        el("div", {class:"campo"}, el("label", {for:"f-nombre"}, tx("cuidar.tu_nombre_como_quieres_que"), oblig()), nombre, errNombre),
        el("div", {class:"campo"}, el("span", {class:"etq-campo", id:"etq-trato"}, tx("cuidar.como_te_nombramos"), oblig()), trato, errTrato),
        el("div", {class:"campo"}, el("label", {for:"f-arbol"}, tx("cuidar.ponle_nombre_a_tu_arbol"), el("span", {class:"opc", texto:tx("cuidar.opcional")})), arbol),
        el("div", {class:"campo"}, el("label", {for:"f-carta"}, tx("cuidar.escribele_un_mensaje"), el("span", {class:"opc", texto:tx("cuidar.opcional")})), carta, cuenta),
        el("div", {class:"campo campo-foto"}, el("span", {class:"etq-campo"}, tx("cuidar.fotografia"), el("span", {class:"opc", texto:tx("cuidar.opcional")})),
          foto, el("label", {for:"f-foto", class:"foto-caja"}, icoFoto, mini, fotoT), nota, quitar),
        el("div", {class:"compromiso"}, el("b", {texto:tx("cuidar.al_cuidarlo_me_propongo")}),
          el("ol", {class:"comp-lista"}, COMPROMISOS.map(c => el("li", {}, el("i", {"aria-hidden":"true", texto:c.l}), el("span", {}, el("strong", {texto:c.t}), " ", c.d))))),
        el("p", {class:"nota nota-simbolico", texto:tx("cuidar.no_guardamos_tu_nombre_tu")}),   /* v31: arriba del pie fijo (abajo quedaba tapado por él) */
        el("div", {class:"fijo-abajo"}, el("label", {class:"acepto"}, acepto, el("span", {}, tx("cuidar.me_comprometo_a_cuidarlo"), oblig())), errAcepto,
          el("button", {type:"submit", class:"btn grande", texto:tx("cuidar.confirmar_lo_voy_a_cuidar")}), est)));
    abrirModal(m); requestAnimationFrame(crecer); return;
  }
  mc.classList.remove("angosta");
  const lz = el("canvas", {class:"lienzo", width:"1650", height:"1275", role:"img", "aria-label":tx("cuidar.tu_reconocimiento")});
  const dib = () => dibujar(lz, a, est), n = guardianes(a);
  const verbo = tratoTx(borrador.trato, true);
  let bajando = false;
  /* v30: antes de guardar se espera a las letras, el logo y el QR (sin internet el QR quedaba vacío sin aviso); un toque a la vez */
  const descargar = formato => async ev => { if (bajando) return; bajando = true; const bt = ev && ev.currentTarget; if (bt) bt.disabled = true; est.textContent = tx("cuidar.preparando");
    await Promise.allSettled([fuentes, imgLogo.decode(), cargarScript(LIB.qr)]); dib();
    if (typeof qrcode !== "function") est.textContent = tx("cuidar.sin_qr");
    const ok = formato === "pdf" ? await guardarPDF(lz, a, est) : await guardarArchivo(await new Promise(r => lz.toBlob(r, "image/png")), "reconocimiento-" + a.idc + ".png");
    bajando = false; if (bt) bt.disabled = false; if (ok) est.textContent = tx("cuidar.listo_tu_reconocimiento_quedo_guardado"); };
  mc.replaceChildren(...cab(tx("cuidar.paso_2_de_2_tu")),
    el("h2", {id:"t-cuidar", texto:tx("cuidar.listo", {nombre:borrador.nombre, trato:verbo})}),
    el("p", {class:"sub", texto:n <= 1 ? tx("cuidar.eres_la_primera_persona_que") : tx("cuidar.ahora_lo_cuidan", {n})}),
    el("div", {class:"recono"}, lz,
      el("div", {class:"recono-acc"},
        el("button", {type:"button", class:"btn grande", texto:tx("cuidar.descargar_imagen"), onclick:descargar("png")}),
        el("button", {type:"button", class:"btn secondary grande", texto:tx("cuidar.descargar_pdf"), onclick:descargar("pdf")}),
        el("p", {class:"nota", texto:tx("cuidar.imagen_horizontal_para_compartir_pdf")}), est, guardaPagina(),
        el("div", {class:"cuentalo"}, el("div", {}, el("p", {class:"etq-campo", texto:tx("cuidar.comparte_que_ya_cuidas_este")}), el("p", {class:"nota", texto:tx("cuidar.publicalo_en_tus_redes_e")})), compartir(a, est, true)),
        abcBloque(false),
        el("div", {class:"recono-links"}, el("button", {type:"button", class:"btn-txt", texto:tx("cuidar.cambiar_mis_datos"), onclick:() => abrirCuidar(a, 1)}), el("button", {type:"button", class:"btn-txt", "data-cerrar":"", texto:tx("cuidar.volver_al_mapa")})))));
  abrirModal(m); dib(); fuentes.then(dib); imgLogo.decode().then(dib, () => {});
  cargarScript(LIB.qr).then(dib, () => {});
  if (a.pat){ if (!imgEmblema.src) imgEmblema.src = window.EMBLEMA_PAT; imgEmblema.decode().then(dib, () => {}); }
  if (paso === 2.1) est.textContent = "";
}
function lineas(cx, t, ancho){ const out = []; let l = ""; for (const w of t.split(/\s+/)){ const p = l ? l + " " + w : w; if (cx.measureText(p).width > ancho && l){ out.push(l); l = w; } else l = p; } if (l) out.push(l); return out; }
function escribir(cx, t, x, y, fuente, color, ancho, inter = 40, max = 0){ cx.font = fuente; cx.fillStyle = color; let ls = lineas(cx, t, ancho);
  if (max && ls.length > max){ ls = ls.slice(0, max); ls[max - 1] = ls[max - 1].replace(/»$/, "") + (t.endsWith("»") ? "…»" : "…"); }   /* v30: conserva las comillas de cierre */ ls.forEach((l, i) => cx.fillText(l, x, y + i * inter)); return y + (ls.length - 1) * inter; }
function dibujarQR(cx, url, x, y, tam){
  if (typeof qrcode !== "function"){ cx.strokeStyle = IMG.placaBorde; cx.strokeRect(x, y, tam, tam); return; }
  const qr = qrcode(0, "M"); qr.addData(url); qr.make(); const n = qr.getModuleCount(), m = tam / (n + 2);
  cx.fillStyle = "#fff"; cx.fillRect(x, y, tam, tam); cx.fillStyle = IMG.tinta;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cx.fillRect(Math.round(x + (c + 1) * m), Math.round(y + (r + 1) * m), Math.ceil(m), Math.ceil(m));
}
/* El cuerpo se dibuja con un factor k; si invade el pie se compacta. Solo si ni así cabe se avisa. */
function dibujar(lz, a, est){
  for (const k of [1, .92, .85, .78]) if (!dibujarCon(lz, a, k)){ if (est.dataset.largo){ est.textContent = ""; delete est.dataset.largo; } return; }
  est.textContent = tx("cuidar.el_texto_es_largo_y"); est.dataset.largo = "1";
}
/* Reconocimiento horizontal, tipo diploma (carta horizontal, 1650 × 1275). Patrimonial: morado del registro. */
function dibujarCon(lz, a, k){
  const ACC = a.pat ? IMG.pat : IMG.guinda, FIL = a.pat ? IMG.pat : IMG.dorado;
  const cx = lz.getContext("2d"), b = borrador, W = 1650, H = 1275, CX = W / 2, f = n => Math.round(n * k);
  cx.clearRect(0, 0, W, H); cx.fillStyle = "#FFFFFF"; cx.fillRect(0, 0, W, H); cx.textBaseline = "alphabetic";
  // marco doble
  cx.strokeStyle = ACC; cx.lineWidth = 6; cx.strokeRect(44, 44, W - 88, H - 88);
  cx.strokeStyle = FIL; cx.lineWidth = 2; cx.strokeRect(62, 62, W - 124, H - 124);
  if (imgLogo.complete && imgLogo.naturalWidth){ const lw = 900, lh = lw * imgLogo.naturalHeight / imgLogo.naturalWidth; cx.drawImage(imgLogo, CX - lw / 2, 118, lw, lh); }
  // Árbol patrimonial: el emblema de Árboles Patrimoniales como sello, arriba a la izquierda (el logo institucional sigue al centro)
  if (a.pat && imgEmblema.complete && imgEmblema.naturalWidth) cx.drawImage(imgEmblema, 104, 98, 196, 196 * imgEmblema.naturalHeight / imgEmblema.naturalWidth);
  const centro = (t, y, fuente, color, ancho = 1300, inter = 44, max = 1) => { cx.textAlign = "center"; const r = escribir(cx, t, CX, y, fuente, color, ancho, inter, max); cx.textAlign = "left"; return r; };
  cx.fillStyle = FIL; cx.fillRect(CX - 90, 238, 180, 3);
  cx.save(); cx.font = "600 26px Cabin"; cx.fillStyle = IMG.gris; cx.textAlign = "center"; if ("letterSpacing" in cx) cx.letterSpacing = "6px"; cx.fillText(tx("cuidar.reconocimiento_simbolico"), CX, 300); cx.restore();
  centro(tx("cuidar.se_reconoce_a"), 372, "400 32px Roboto", IMG.gris);
  // nombre, del tamaño que quepa
  /* v30 (auditoría): con foto, el nombre termina antes de ella (la foto va de x 1290 a 1530 y tapaba el final de nombres de unas 20
     letras); si aun a 56 px no cabe, va en dos renglones (antes se cortaba con «…») y lo de abajo baja. */
  const nom = b.nombre || tx("cuidar.tu_nombre"), anchoN = b.foto ? 890 : 1180;
  let tam = f(104), dy = 0; cx.font = `700 ${tam}px Cabin`; while (tam > 56 && cx.measureText(nom).width > anchoN){ tam -= 4; cx.font = `700 ${tam}px Cabin`; }
  if (cx.measureText(nom).width > anchoN){ tam = f(58); dy = 46; centro(nom, 452, `700 ${tam}px Cabin`, b.nombre ? ACC : IMG.placaBorde, anchoN, 62, 2); }
  else centro(nom, 480, `700 ${tam}px Cabin`, b.nombre ? ACC : IMG.placaBorde, anchoN);
  const comoQue = {guardiana:tx("cuidar.como_guardiana_del_arbol"), guardian:tx("cuidar.como_guardian_del_arbol"), persona:tx("cuidar.como_persona_guardiana_del_arbol")}[b.trato] || tx("cuidar.como_guardiana_del_arbol");
  centro(comoQue, 548 + dy, "400 34px Roboto", IMG.tinta);
  const nombreArbol = b.nombreArbol || (a.pat ? a.pat.nombre : "");
  let y = 548 + dy;
  if (nombreArbol){ y = centro("«" + nombreArbol + "»", 628 + dy, `700 ${f(60)}px Cabin`, IMG.tinta, 1300); }
  const lugar = (a.pat ? tx("general.arbol_patrimonial") : "") + (a.calle ? a.calle + " · " : "") + colTxt(a.col) + ", " + munNom(a.mun);
  y = centro(lugar, y + 56, "400 26px Roboto", IMG.gris, 1300, 32, 2);
  if (b.carta){ y = centro("«" + b.carta + "»", y + 64, `italic 400 ${f(32)}px Roboto`, IMG.tinta, 1100, f(42), 2); }
  // foto (opcional), en círculo a la derecha del nombre
  if (b.foto){ const im = b.foto, l = Math.min(im.naturalWidth, im.naturalHeight), r = 120, fx = W - 120 - 2 * r, fy = 330;
    cx.save(); cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.clip(); cx.drawImage(im, (im.naturalWidth - l) / 2, (im.naturalHeight - l) / 2, l, l, fx, fy, 2 * r, 2 * r); cx.restore();
    cx.strokeStyle = FIL; cx.lineWidth = 4; cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.stroke(); }
  // pie: compromisos · fecha · QR
  const yb = 930;
  cx.fillStyle = IMG.linea; cx.fillRect(120, yb - 40, W - 240, 2);
  escribir(cx, tx("cuidar.al_cuidarlo_me_propongo_2"), 130, yb + 10, "700 26px Cabin", IMG.tinta, 520);
  cx.font = "400 24px Roboto";
  COMPROMISOS.forEach((c, i) => { const yy = yb + 50 + i * 34; cx.fillStyle = ACC; cx.beginPath(); cx.arc(144, yy - 8, 13, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#FFFFFF"; cx.font = "700 16px Cabin"; cx.textAlign = "center"; cx.fillText(c.l, 144, yy - 2); cx.textAlign = "left";
    cx.fillStyle = IMG.tinta; cx.font = "400 23px Roboto"; cx.fillText(c.t, 168, yy); });
  centro(fechaHoy(), yb + 70, "500 30px Roboto", IMG.tinta);
  cx.fillStyle = IMG.tinta; cx.fillRect(CX - 170, yb + 90, 340, 1.5);
  centro(tx("general.ciudad_de_mexico"), yb + 124, "400 22px Roboto", IMG.gris);
  const q = 170, qx = W - 130 - q, qy = yb - 14;
  dibujarQR(cx, urlArbol(a), qx, qy, q);
  cx.textAlign = "center"; escribir(cx, tx("cuidar.visita_tu_arbol"), qx + q / 2, qy + q + 30, "400 20px Roboto", IMG.gris, 220); cx.textAlign = "left";
  centro(tx("cuidar.reconocimiento_simbolico_no_otorga_derechos"), H - 92, "400 19px Roboto", IMG.gris, 1300);
  return y > yb - 70;
}
/* PDF tamaño carta: página 1, el reconocimiento; página 2, el ABC de tu árbol. */
async function guardarPDF(lz, a, est){
  try { await cargarScript(LIB.pdf); } catch {}
  if (!window.jspdf){ est.textContent = tx("cuidar.no_se_pudo_preparar_el"); return false; }
  const doc = new window.jspdf.jsPDF({unit:"mm", format:"letter", orientation:"landscape"}), W = 215.9;
  doc.addImage(lz.toDataURL("image/png"), "PNG", 0, 0, 279.4, 215.9, undefined, "FAST");   // comprimida sin pérdida (sin esto el PDF pesaba 8 MB)
  doc.addPage("letter", "portrait");
  /* v30 (auditoría): colores del tablero (antes escritos a mano y algunos fuera de él); en un patrimonial, jacarandá como su hoja 1 */
  const ACC = a.pat ? IMG.pat : IMG.guinda, GRIS = IMG.gris, TINTA = IMG.tinta;
  doc.setDrawColor(ACC); doc.setLineWidth(1); doc.line(20, 20, W - 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(ACC); doc.text(tx("general.el_abc_de_tu_arbol"), 20, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(GRIS);
  doc.text((calleTexto(a) ? calleTexto(a) + ", " : "") + colTxt(a.col) + ", " + munNom(a.mun) + ".", 20, 43, {maxWidth:W - 40});
  let y = 56;
  for (const r of ABC){
    doc.setFillColor(css("--hoja")); doc.circle(26, y - 1.5, 5.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor("#FFFFFF"); doc.text(r.l, 26, y + .3, {align:"center"});
    doc.setTextColor(TINTA); doc.text(r.t, 37, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(GRIS);
    const ls = doc.splitTextToSize(r.largo, W - 57); doc.text(ls, 37, y + 5.5); y += 12 + ls.length * 4.4;
  }
  // Dos recuadros: lo que no se hace y cuándo avisar
  const caja = (x, w, titulo, items, color, fondo, pie) => {
    const alto = 11 + items.length * 4.6 + (pie ? 7 : 0);
    doc.setFillColor(fondo); doc.roundedRect(x, y, w, alto, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(color); doc.text(titulo, x + 4, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(css("--tinta-suave"));
    items.forEach((t, i) => doc.text("· " + t, x + 4, y + 12 + i * 4.6));
    if (pie){ doc.setFont("helvetica", "bold"); doc.text(pie, x + 4, y + 13 + items.length * 4.6); }
    return alto;
  };
  if (y > 212){ doc.addPage("letter", "portrait"); y = 28; }
  y += 2;
  const ancho = (W - 46) / 2, h1 = caja(20, ancho, tx("general.aunque_parezca_cuidado_no"), NO_HACER, ACC, css("--guinda-velo")),
    h2 = caja(26 + ancho, ancho, tx("general.avisa_si_ves"), AVISAR, css("--tinta-ambar"), css("--ambar-velo"), tx("cuidar.a_quien", {canal:CANAL_AVISO || tx("cuidar.canal_por_definir")}));
  y += Math.max(h1, h2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(GRIS);
  doc.text(tx("cuidar.reconocimiento_simbolico_no_otorga_derechos_2"), 20, 262, {maxWidth:W - 40});
  doc.text(tx("cuidar.secretaria_del_medio_ambiente_de"), 20, 270);
  return guardarArchivo(doc.output("blob"), "reconocimiento-" + a.idc + ".pdf");
}
/* Descarga con un enlace temporal. */
async function guardarArchivo(blob, archivo){
  const u = URL.createObjectURL(blob), aa = el("a", {href:u, download:archivo}); document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);   /* v30: 60 s (con 2 s algunos celulares no alcanzaban a guardar) */
  return true;
}

