/* ================= utilidades ================= */
const $ = id => document.getElementById(id);
for (const i of document.querySelectorAll(".logo-src")) i.src = window.LOGO_INST;
const C = window.CONFIG;
/* Textos: todos viven en textos.js (window.TEXTOS). tx("clave") devuelve el texto; tx("clave", {n:3}) cambia {n} por 3. */
const T = window.TEXTOS || {};
const tx = (k, d) => { const s = T[k]; if (s == null){ console.error("Falta el texto «" + k + "» en textos.js"); return k; }
  return d ? s.replace(/\{(\w+)\}/g, (m, n) => n in d ? String(d[n]) : m) : s; };
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fmt = new Intl.NumberFormat("es-MX"), fmt0 = new Intl.NumberFormat("es-MX", {maximumFractionDigits:0}), fmt1 = new Intl.NumberFormat("es-MX", {minimumFractionDigits:1, maximumFractionDigits:1});
const fechaHoy = () => { const d = new Date(); return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear(); };
const plano = t => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esTel = () => matchMedia("(max-width:860px)").matches;
// La ciudad entera: en celular deja libre la franja de la tarjeta de arriba y la columna de botones de la derecha.
const padCiudad = () => esTel() ? {top:70, left:14, right:56, bottom:14} : 20;
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
const leerLocal = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

