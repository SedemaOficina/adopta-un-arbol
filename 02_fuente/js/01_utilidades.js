/* ================= utilidades ================= */
const $ = id => document.getElementById(id);
const C = window.CONFIG;
/* v31d (Lote 7): cada archivo se pide con la huella de su contenido (?v=…, de CONFIG.HUELLAS, que escribe armar.py). Al publicar una
   versión nueva, quien ya visitó el sitio descarga otra vez solo los archivos que cambiaron, y nunca mezcla uno viejo con uno nuevo. */
const conHuella = ruta => ruta + "?v=" + (C.HUELLAS[ruta] || C.VERSION);
const LOGO = conHuella(window.LOGO_INST), EMBLEMA = conHuella(window.EMBLEMA_PAT);
for (const i of document.querySelectorAll(".logo-src")) i.src = LOGO;
/* Textos: todos viven en textos.js (window.TEXTOS). tx("clave") devuelve el texto; tx("clave", {n:3}) cambia {n} por 3. */
const T = window.TEXTOS || {};
const tx = (k, d) => { const s = T[k]; if (s == null){ console.error("Falta el texto «" + k + "» en textos.js"); return k; }
  return d ? s.replace(/\{(\w+)\}/g, (m, n) => n in d ? String(d[n]) : m) : s; };
const fmt = new Intl.NumberFormat("es-MX"), fmt0 = new Intl.NumberFormat("es-MX", {maximumFractionDigits:0}), fmt1 = new Intl.NumberFormat("es-MX", {minimumFractionDigits:1, maximumFractionDigits:1});
const fechaHoy = () => { const d = new Date(); return tx("general.fecha", {dia:d.getDate(), mes:tx("general.meses").split(",")[d.getMonth()], anio:d.getFullYear()}); };
/* v30: «1 árbol» en singular (antes «1 árboles») */
const nArb = n => n === 1 ? tx("general.un_arbol") : !n ? tx("general.sin_arboles") : tx("general.n_arboles", {n:fmt.format(n)});   /* v30h: con 0, «aún sin árboles» (decisión de Liber) */
const plano = t => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esTel = () => matchMedia("(max-width:860px)").matches;
// La ciudad entera: en celular deja libre la franja de la tarjeta de arriba y la columna de botones de la derecha.
const padCiudad = () => esTel() ? {top:70, left:14, right:56, bottom:66} : 20;   /* v29: abajo, el botón «Buscar tu árbol» */
function el(tag, at, ...hijos){
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(at || {})){
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v; else if (k === "texto") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (k === "style") n.style.cssText = v; else n.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat(Infinity)) if (h !== null && h !== undefined && h !== false) n.append(h.nodeType ? h : document.createTextNode(h));
  return n;
}
/* Carga un script de vendor/ solo cuando hace falta (una sola vez). Así jsPDF y el QR no pesan al abrir la página. */
const cargarScript = (() => { const hechos = {}; return src => hechos[src] || (hechos[src] = new Promise((ok, mal) => {
  const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete hechos[src]; mal(new Error("No se pudo cargar " + src)); };
  document.head.append(s); })); })();
/* v30 (auditoría): lo leído debe ser del mismo tipo que el valor por omisión (arreglo u objeto); antes, un dato dañado («{}» donde va un
   arreglo) impedía abrir el sitio en ese navegador. */
const leerLocal = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k));
  return v == null || Array.isArray(v) !== Array.isArray(d) || typeof v !== typeof d ? d : v; } catch { return d; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
/* Colores: los tokens de css/estilos.css (:root) son la única fuente; el código los lee con css("--token") y hex() los pasa a [r, g, b, a]. */
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const hex = (h, a = 255) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
