/* ================= cuidar y reconocimiento ================= */
/* Cinco compromisos, uno por letra del ABC: lo que la persona promete es lo mismo que aprende. */
const COMPROMISOS = [
  {l:"A", t:"Le doy agua en secas.", d:"Despacio y al pie, una vez por semana, cuando la tierra está seca."},
  {l:"B", t:"Cuido que su cajete respire.", d:"Sin basura, sin cemento, sin tierra de más."},
  {l:"C", t:"Le dejo su hojarasca.", d:"Lo que cae lo abriga y lo alimenta."},
  {l:"D", t:"No lo podo ni lo lastimo.", d:"Nada clavado ni amarrado. La poda es de quien tiene autorización."},
  {l:"E", t:"Lo miro y aviso si está en riesgo.", d:"Paso a verlo, noto sus cambios y llamo a quien corresponde."}];
const borrador = {nombre:"", trato:"Guardiana", nombreArbol:"", carta:"", foto:null};   // vive solo en esta página
const IMG = {guinda:"#9D2148", dorado:"#B28E5C", doradoClaro:"#F3ECE1", gris:"#55585A", tinta:"#23262A", hoja:"#3E6B48", placa:"#E8EBE9", placaBorde:"#B5BCB7"};
const imgLogo = new Image(); imgLogo.src = window.LOGO_INST;
const imgEmblema = new Image(); imgEmblema.src = window.EMBLEMA_PAT;
const fuentes = Promise.all(["700 76px Cabin", "400 30px Roboto", "500 30px Roboto", "italic 400 30px Roboto"].map(f => document.fonts.load(f))).catch(() => {});
function abrirCuidar(a, paso){
  const m = $("m-cuidar"), mc = $("mc-cuidar");
  if (C.SIMULAR_GUARDIANES && SIM_MIOS.includes(a.idc) && !borrador.nombre) Object.assign(borrador, {nombre:"Mariana", trato:"Guardiana", nombreArbol:"La Sombrita", carta:"Gracias por la sombra de las tres de la tarde."});
  mc.classList.toggle("es-pat", !!a.pat);
  if (!paso) paso = PROPIOS.has(a.idc) && borrador.nombre ? 2 : 1;
  const est = el("p", {class:"estado", "aria-live":"polite"});
  const cab = (t) => [el("button", {class:"close", type:"button", "data-cerrar":"", "aria-label":"Cerrar"}, linea("x")), el("p", {class:"paso", texto:t})];
  if (paso === 1){
    mc.classList.add("angosta");
    const nombre = el("input", {type:"text", id:"f-nombre", maxlength:"60", autocomplete:"name", placeholder:"Ej. Fulana de Tal", value:borrador.nombre});
    const arbol = el("input", {type:"text", id:"f-arbol", maxlength:"40", placeholder:"Ej. La Sombrita", value:borrador.nombreArbol});
    const carta = el("textarea", {id:"f-carta", maxlength:"120", rows:"2", placeholder:"Ej. Gracias por la sombra de las tres de la tarde.", "aria-describedby":"a-carta"}); carta.value = borrador.carta;
    const cuenta = el("small", {id:"a-carta", texto:carta.value.length + " de 120 caracteres"}); carta.addEventListener("input", () => { cuenta.textContent = carta.value.length + " de 120 caracteres"; });
    const foto = el("input", {type:"file", id:"f-foto", accept:"image/*", class:"foto-input"});
    const acepto = el("input", {type:"checkbox", id:"f-acepto"});
    const trato = el("div", {class:"trato", role:"radiogroup", "aria-label":"¿Cómo te nombramos?"},
      ["Guardiana", "Guardián", "Persona guardiana"].map((t, i) => el("label", {}, el("input", {type:"radio", name:"trato", id:"f-trato-" + i, value:t, checked:t === borrador.trato}), t)));
    foto.addEventListener("change", () => { const f = foto.files[0]; const lb = mc.querySelector(".foto-label"); if (lb) lb.textContent = f ? "Foto agregada: " + f.name : "+ Agregar una foto del árbol (opcional; no sale de tu teléfono)"; if (!f){ borrador.foto = null; return; }
      const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { borrador.foto = im; }; im.src = r.result; }; r.readAsDataURL(f); });
    const confirmar = async () => {
      borrador.nombre = nombre.value.trim(); borrador.nombreArbol = arbol.value.trim(); borrador.carta = carta.value.trim(); borrador.trato = trato.querySelector("input:checked").value;
      if (!borrador.nombre){ est.textContent = "Escribe tu nombre, como quieres que aparezca en tu reconocimiento."; nombre.focus(); return; }
      if (!acepto.checked){ est.textContent = "Marca «Me comprometo a cuidarlo» para continuar."; acepto.focus(); return; }
      est.textContent = "Guardando…";
      const r = await registrarGuardian(a);
      abrirCuidar(a, r === "nuevo" ? 2.1 : 2);
    };
    mc.replaceChildren(...cab("Paso 1 de 2 · Tu compromiso"),
      el("h2", {id:"t-cuidar", texto:a.pat ? "Vas a cuidar «" + a.pat.nombre + "»" : "Vas a cuidar este árbol"}),
      el("p", {class:"sub", texto:(calleTexto(a) || "Calle sin registrar") + " · " + nomCol(a.col) + ", " + munNom(a.mun)}),
      el("form", {onsubmit:e => { e.preventDefault(); confirmar(); }},
        el("div", {class:"campo"}, el("label", {for:"f-nombre", texto:"Tu nombre, como quieres que aparezca"}), nombre),
        el("div", {class:"campo"}, el("span", {class:"etq-campo", texto:"¿Cómo te nombramos?"}), trato),
        el("div", {class:"campo"}, el("label", {for:"f-arbol"}, "Ponle nombre a tu árbol ", el("span", {class:"opc", texto:"(opcional)"})), arbol),
        el("div", {class:"campo"}, el("label", {for:"f-carta"}, "Escríbele un mensaje ", el("span", {class:"opc", texto:"(opcional)"})), carta, cuenta),
        el("div", {class:"campo"}, el("label", {for:"f-foto", class:"foto-label", texto:"+ Agregar una foto del árbol (opcional; no sale de tu teléfono)"}), foto),
        el("div", {class:"compromiso"}, el("b", {texto:"Al cuidarlo, me propongo"}),
          el("ol", {class:"comp-lista"}, COMPROMISOS.map(c => el("li", {}, el("i", {"aria-hidden":"true", texto:c.l}), el("span", {}, el("strong", {texto:c.t}), " ", c.d))))),
        el("div", {class:"fijo-abajo"}, el("label", {class:"acepto"}, acepto, "Me comprometo a cuidarlo"),
          el("button", {type:"submit", class:"btn grande", texto:"Confirmar: lo voy a cuidar"}), est),
        el("p", {class:"nota", texto:"No guardamos tu nombre, tu foto ni lo que escribas. Del árbol solo se suma que una persona más lo cuida. El reconocimiento es simbólico y no otorga derechos sobre el árbol ni autoriza intervenirlo."})));
    abrirModal(m); return;
  }
  mc.classList.remove("angosta");
  const lz = el("canvas", {class:"lienzo", width:"1650", height:"1275", role:"img", "aria-label":"Tu reconocimiento"});
  const dib = () => dibujar(lz, a, est), n = guardianes(a);
  const verbo = {"Guardiana":"guardiana", "Guardián":"guardián", "Persona guardiana":"persona guardiana"}[borrador.trato] || "guardiana";
  const descargar = formato => async () => { const ok = formato === "pdf" ? await guardarPDF(lz, a, est) : await guardarArchivo(await new Promise(r => lz.toBlob(r, "image/png")), "reconocimiento-" + a.idc + ".png"); if (ok) est.textContent = "Listo, tu reconocimiento quedó guardado."; };
  mc.replaceChildren(...cab("Paso 2 de 2 · Tu reconocimiento"),
    el("h2", {id:"t-cuidar", texto:"¡Listo, " + borrador.nombre + "! Ya eres " + verbo + " de este árbol."}),
    el("p", {class:"sub", texto:n <= 1 ? "Eres la primera persona que lo cuida." : "Ahora lo cuidan " + n + " personas."}),
    el("div", {class:"recono"}, lz,
      el("div", {class:"recono-acc"},
        el("button", {type:"button", class:"btn grande", texto:"Descargar imagen", onclick:descargar("png")}),
        el("button", {type:"button", class:"btn secondary grande", texto:"Descargar PDF", onclick:descargar("pdf")}),
        el("p", {class:"nota", texto:"Imagen horizontal para compartir. PDF tamaño carta para imprimir, con el ABC de tu árbol en la segunda hoja."}), est, guardaPagina(),
        el("div", {class:"cuentalo"}, el("div", {}, el("p", {class:"etq-campo", texto:"Comparte que ya cuidas este árbol"}), el("p", {class:"nota", texto:"Publícalo en tus redes e invita a más personas a cuidar los árboles de su calle."})), compartir(a, est, true)),
        abcBloque(false),
        el("div", {class:"recono-links"}, el("button", {type:"button", class:"btn-txt", texto:"Cambiar mis datos", onclick:() => abrirCuidar(a, 1)}), el("button", {type:"button", class:"btn-txt", "data-cerrar":"", texto:"Volver al mapa"})))));
  abrirModal(m); dib(); fuentes.then(dib); imgLogo.decode().then(dib, () => {}); imgEmblema.decode().then(dib, () => {});
  if (paso === 2.1) est.textContent = "";
}
function lineas(cx, t, ancho){ const out = []; let l = ""; for (const w of t.split(/\s+/)){ const p = l ? l + " " + w : w; if (cx.measureText(p).width > ancho && l){ out.push(l); l = w; } else l = p; } if (l) out.push(l); return out; }
function escribir(cx, t, x, y, fuente, color, ancho, inter = 40, max = 0){ cx.font = fuente; cx.fillStyle = color; let ls = lineas(cx, t, ancho); if (max && ls.length > max){ ls = ls.slice(0, max); ls[max - 1] += "…"; } ls.forEach((l, i) => cx.fillText(l, x, y + i * inter)); return y + (ls.length - 1) * inter; }
function dibujarQR(cx, url, x, y, tam){
  if (typeof qrcode !== "function"){ cx.strokeStyle = IMG.placaBorde; cx.strokeRect(x, y, tam, tam); return; }
  const qr = qrcode(0, "M"); qr.addData(url); qr.make(); const n = qr.getModuleCount(), m = tam / (n + 2);
  cx.fillStyle = "#fff"; cx.fillRect(x, y, tam, tam); cx.fillStyle = IMG.tinta;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cx.fillRect(Math.round(x + (c + 1) * m), Math.round(y + (r + 1) * m), Math.ceil(m), Math.ceil(m));
}
/* El cuerpo se dibuja con un factor k; si invade el pie se compacta. Solo si ni así cabe se avisa. */
function dibujar(lz, a, est){
  for (const k of [1, .92, .85, .78]) if (!dibujarCon(lz, a, k)){ if (est.dataset.largo){ est.textContent = ""; delete est.dataset.largo; } return; }
  est.textContent = "El texto es largo y se encima con el pie: acorta tu nombre o la línea para tu árbol."; est.dataset.largo = "1";
}
/* Reconocimiento horizontal, tipo diploma (carta horizontal, 1650 × 1275). Patrimonial: morado del registro. */
function dibujarCon(lz, a, k){
  const ACC = a.pat ? "#8D4992" : IMG.guinda, FIL = a.pat ? "#8D4992" : IMG.dorado;
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
  cx.save(); cx.font = "600 26px Cabin"; cx.fillStyle = IMG.gris; cx.textAlign = "center"; if ("letterSpacing" in cx) cx.letterSpacing = "6px"; cx.fillText("RECONOCIMIENTO SIMBÓLICO", CX, 300); cx.restore();
  centro("Se reconoce a", 372, "400 32px Roboto", IMG.gris);
  // nombre, del tamaño que quepa
  let tam = f(104); cx.font = `700 ${tam}px Cabin`; while (tam > 56 && cx.measureText(b.nombre || "Tu nombre").width > 1180){ tam -= 4; cx.font = `700 ${tam}px Cabin`; }
  centro(b.nombre || "Tu nombre", 480, `700 ${tam}px Cabin`, b.nombre ? ACC : IMG.placaBorde, 1300);
  const comoQue = {"Guardiana":"como guardiana del árbol", "Guardián":"como guardián del árbol", "Persona guardiana":"como persona guardiana del árbol"}[b.trato] || "como guardiana del árbol";
  centro(comoQue, 548, "400 34px Roboto", IMG.tinta);
  const nombreArbol = b.nombreArbol || (a.pat ? a.pat.nombre : "");
  let y = 548;
  if (nombreArbol){ y = centro("«" + nombreArbol + "»", 628, `700 ${f(60)}px Cabin`, IMG.tinta, 1300); }
  const lugar = (a.pat ? "Árbol patrimonial · " : "") + (a.calle ? a.calle + " · " : "") + nomCol(a.col) + ", " + munNom(a.mun);
  y = centro(lugar, y + 56, "400 26px Roboto", IMG.gris, 1300, 32, 2);
  if (b.carta){ y = centro("«" + b.carta + "»", y + 64, `italic 400 ${f(32)}px Roboto`, IMG.tinta, 1100, f(42), 2); }
  // foto (opcional), en círculo a la derecha del nombre
  if (b.foto){ const im = b.foto, l = Math.min(im.naturalWidth, im.naturalHeight), r = 120, fx = W - 120 - 2 * r, fy = 330;
    cx.save(); cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.clip(); cx.drawImage(im, (im.naturalWidth - l) / 2, (im.naturalHeight - l) / 2, l, l, fx, fy, 2 * r, 2 * r); cx.restore();
    cx.strokeStyle = FIL; cx.lineWidth = 4; cx.beginPath(); cx.arc(fx + r, fy + r, r, 0, Math.PI * 2); cx.stroke(); }
  // pie: compromisos · fecha · QR
  const yb = 930;
  cx.fillStyle = "#E9E3D8"; cx.fillRect(120, yb - 40, W - 240, 2);
  escribir(cx, "Al cuidarlo, me propongo:", 130, yb + 10, "700 26px Cabin", IMG.tinta, 520);
  cx.font = "400 24px Roboto";
  COMPROMISOS.forEach((c, i) => { const yy = yb + 50 + i * 34; cx.fillStyle = ACC; cx.beginPath(); cx.arc(144, yy - 8, 13, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#FFFFFF"; cx.font = "700 16px Cabin"; cx.textAlign = "center"; cx.fillText(c.l, 144, yy - 2); cx.textAlign = "left";
    cx.fillStyle = IMG.tinta; cx.font = "400 23px Roboto"; cx.fillText(c.t, 168, yy); });
  centro(fechaHoy(), yb + 70, "500 30px Roboto", IMG.tinta);
  cx.fillStyle = IMG.tinta; cx.fillRect(CX - 170, yb + 90, 340, 1.5);
  centro("Ciudad de México", yb + 124, "400 22px Roboto", IMG.gris);
  const q = 170, qx = W - 130 - q, qy = yb - 14;
  dibujarQR(cx, urlArbol(a), qx, qy, q);
  cx.textAlign = "center"; escribir(cx, "Visita tu árbol", qx + q / 2, qy + q + 30, "400 20px Roboto", IMG.gris, 220); cx.textAlign = "left";
  centro("Reconocimiento simbólico: no otorga derechos sobre el árbol ni autoriza intervenirlo.", H - 92, "400 19px Roboto", IMG.gris, 1300);
  return y > yb - 70;
}
/* PDF tamaño carta: página 1, el reconocimiento; página 2, el ABC de tu árbol. */
async function guardarPDF(lz, a, est){
  if (!window.jspdf){ est.textContent = "No se pudo preparar el PDF en esta vista (no cargó la herramienta de PDF). Descarga la imagen."; return false; }
  const doc = new window.jspdf.jsPDF({unit:"mm", format:"letter", orientation:"landscape"}), W = 215.9;
  doc.addImage(lz.toDataURL("image/png"), "PNG", 0, 0, 279.4, 215.9);
  doc.addPage("letter", "portrait");
  doc.setDrawColor(157, 33, 72); doc.setLineWidth(1); doc.line(20, 20, W - 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(157, 33, 72); doc.text("El ABC de tu árbol", 20, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(85, 88, 90);
  doc.text((calleTexto(a) ? calleTexto(a) + ", " : "") + nomCol(a.col) + ", " + munNom(a.mun) + ".", 20, 43, {maxWidth:W - 40});
  let y = 56;
  for (const r of ABC){
    doc.setFillColor(31, 94, 70); doc.circle(26, y - 1.5, 5.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.text(r.l, 26, y + .3, {align:"center"});
    doc.setTextColor(35, 38, 42); doc.text(r.t, 37, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(70, 74, 76);
    const ls = doc.splitTextToSize(r.largo, W - 57); doc.text(ls, 37, y + 5.5); y += 12 + ls.length * 4.4;
  }
  // Dos recuadros: lo que no se hace y cuándo avisar
  const caja = (x, w, titulo, items, color, fondo, pie) => {
    const alto = 11 + items.length * 4.6 + (pie ? 7 : 0);
    doc.setFillColor(...fondo); doc.roundedRect(x, y, w, alto, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...color); doc.text(titulo, x + 4, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(52, 68, 59);
    items.forEach((t, i) => doc.text("· " + t, x + 4, y + 12 + i * 4.6));
    if (pie){ doc.setFont("helvetica", "bold"); doc.text(pie, x + 4, y + 13 + items.length * 4.6); }
    return alto;
  };
  if (y > 212){ doc.addPage("letter", "portrait"); y = 28; }
  y += 2;
  const ancho = (W - 46) / 2, h1 = caja(20, ancho, "Aunque parezca cuidado, no", NO_HACER, [157, 33, 72], [251, 239, 243]),
    h2 = caja(26 + ancho, ancho, "Avisa si ves", AVISAR, [107, 78, 30], [255, 246, 229], "¿A quién? " + (CANAL_AVISO || "Canal por definir."));
  y += Math.max(h1, h2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(85, 88, 90);
  doc.text("Reconocimiento simbólico: no otorga derechos sobre el árbol ni autoriza intervenirlo. Guía por validar con el área técnica.", 20, 262, {maxWidth:W - 40});
  doc.text("Secretaría del Medio Ambiente de la Ciudad de México", 20, 270);
  return guardarArchivo(doc.output("blob"), "reconocimiento-" + a.idc + ".pdf");
}
/* Descarga con un enlace temporal. */
async function guardarArchivo(blob, archivo){
  const u = URL.createObjectURL(blob), aa = el("a", {href:u, download:archivo}); document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  return true;
}

