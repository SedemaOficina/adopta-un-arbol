/* ================= compartir ================= */
/* Compartir: WhatsApp, X, Facebook y copiar, como íconos. «propio» = la persona cuenta que ya lo cuida. */
const ICO = {
  wa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  fb:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.4 1.5-1.4h1.5V4.5a20 20 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.3H8.1v3h2.5V21h2.9z"/></svg>',
  liga:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>'};
const LINEA = {
  pin:'<path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  compartir:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 13.2l7.6 4.4M15.8 6.4l-7.6 4.4"/>',
  hoja:'<path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-14 14z"/><path d="M5 19l7.5-7.5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  reiniciar:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  externa:'<path d="M8 16 16 8M10 8h6v6"/>'};
const linea = k => { const s = el("span", {class:"ico", "aria-hidden":"true"}); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + LINEA[k] + '</svg>'; return s; };
const icono = k => { const s = el("span", {class:"ic"}); s.innerHTML = ICO[k]; return s; };
function compartir(a, est, propio){
  const url = urlArbol(a), col = nomCol(a.col), calle = a.calle, g = guardianes(a);
  const trato = ({"Guardiana":"guardiana", "Guardián":"guardián", "Persona guardiana":"persona guardiana"}[borrador.trato] || "guardiana");
  // Textos aprobados (10 oct 2026). {LIGA} marca dónde va la liga (antes era «L» y se confundía con la L de «Los Reyes»); sin número de árbol, con calle y colonia.
  const donde = calle ? calle + ", en " + col + "," : col, dondeCorto = calle ? calle + ", " + col : col;
  const pat = a.pat ? "«" + a.pat.nombre + "», un árbol patrimonial de la Ciudad de México" : null;
  const plantilla = propio
    ? (pat ? "Ya soy " + trato + " de " + pat + " 🌳. Conoce su historia y cuida uno de tu calle: {LIGA}"
           : "Ya soy " + trato + " de un árbol en " + dondeCorto + " 🌳. Tú también puedes cuidar uno de tu calle: {LIGA} #GuardianesDeÁrboles")
    : g
      ? (pat ? "A " + pat + ", ya " + (g === 1 ? "lo cuida 1 persona" : "lo cuidan " + g + " personas") + ". ¿Te sumas? 🌳 {LIGA}"
             : "A este árbol de " + donde + " ya " + (g === 1 ? "lo cuida 1 persona" : "lo cuidan " + g + " personas") + ". ¿Te sumas? 🌳 {LIGA}")
      : (pat ? pat.charAt(0).toUpperCase() + pat.slice(1) + ", todavía no tiene quien lo cuide. ¿Te animas a ser su guardián o guardiana? 🌳 {LIGA}"
             : "Este árbol de " + donde + " todavía no tiene quien lo cuide. ¿Te animas a ser su guardián o guardiana? 🌳 {LIGA}");
  const msj = plantilla.replace("{LIGA}", url);                                   // WhatsApp, X y copiar: la liga va dentro del texto
  const msjSinLiga = plantilla.replace(/:?\s*\{LIGA\}/, "").replace(/\s+$/, "");    // menú de compartir del teléfono: la liga va aparte
  const msjWa = msj.replace(/\s*🌳/g, "");   // WhatsApp de escritorio en Windows convierte el emoji en un signo de interrogación al abrir la liga
  const ir = (k, t, href) => el("a", {class:"ic-btn", href, target:"_blank", rel:"noopener", "aria-label":t, title:t}, icono(k));
  return el("div", {class:"compartir"},
    ir("wa", "Compartir por WhatsApp", "https://wa.me/?text=" + encodeURIComponent(msjWa)),
    ir("x", "Compartir en X", "https://twitter.com/intent/tweet?text=" + encodeURIComponent(msj)),
    // Facebook no acepta texto prellenado (solo la liga) y en el celular su app intercepta la liga y abre el inicio, no la ventana de publicar.
    // Por eso: en celular se usa el menú nativo de compartir del teléfono (ahí aparece Facebook con el texto y la liga);
    // en computadora se copia el mensaje al portapapeles y se abre la ventana de Facebook para pegarlo.
    el("a", {class:"ic-btn", href:"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), target:"_blank", rel:"noopener", "aria-label":"Compartir en Facebook", title:"Compartir en Facebook",
      onclick:async e => {
        const movil = matchMedia("(pointer:coarse)").matches;
        if (movil && navigator.share){ e.preventDefault(); try { await navigator.share({title:"Guardianes de árboles", text:msjSinLiga, url}); } catch {} return; }
        try { await navigator.clipboard.writeText(msj); est.textContent = "Copiamos tu mensaje: pégalo en la publicación de Facebook."; } catch {}
      }}, icono("fb")),
    el("button", {type:"button", class:"ic-btn", "aria-label":"Copiar la liga", title:"Copiar la liga", onclick:async () => {
      try { await navigator.clipboard.writeText(msj); est.textContent = "Mensaje y liga copiados. Pégalos donde quieras."; }
      catch { est.textContent = "No se pudo copiar. La liga es: " + url; } }}, icono("liga")));
}

