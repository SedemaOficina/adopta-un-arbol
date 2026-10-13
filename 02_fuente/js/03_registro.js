/* ================= guardianes (sin datos personales) ================= */
/* Cada guardianía es un registro anónimo {árbol, colonia, alcaldía, fecha}. Hoy solo vive en este navegador (más la simulación en modo prueba).
   El conteo de todas las personas lo dará el servicio del SIA (pendiente 7, etapa 2): llenará REG, REG_COL y REG_ALC y pondrá SERVIDOR = true. */
let REG = new Map(), REG_COL = new Map(), REG_ALC = new Map(), verG = 0, SERVIDOR = null;
/* Lo que se guarda en este navegador: solo claves de árboles y su lugar; nada de la persona. Las claves llevan versión
   (gda:v1:…): si un día cambia el formato, se agrega v2 y se pasa lo guardado de v1, sin que nadie pierda sus árboles. */
const CLAVE = {arboles:"gda:v1:arboles", lugares:"gda:v1:lugares"};
// Migración (v27): las claves de antes («guardianias» y «guardianias_meta») se copian a las nuevas una sola vez.
// Las anteriores se quedan donde están por si hubiera que regresar a una versión previa; se pueden quitar al montar en el SIA.
for (const [nueva, vieja] of [[CLAVE.arboles, "guardianias"], [CLAVE.lugares, "guardianias_meta"]])
  try { if (localStorage.getItem(nueva) === null && localStorage.getItem(vieja) !== null) localStorage.setItem(nueva, localStorage.getItem(vieja)); } catch {}
const PROPIOS = new Set(leerLocal(CLAVE.arboles, []).filter(x => typeof x === "string"));   /* v30: solo claves de árbol (un dato dañado no rompe la página) */
const patA = p => ({idc:p.inv || p.id, pat:p});   // el patrimonial se cuenta con la clave del inventario si está empatado
/* Personas guardianas simuladas: solo en modo prueba. v31d (Lote 7): lo que está entre las marcas solo-prueba no llega a la versión de
   producción (armar.py --produccion lo quita y revisa que no quede ningún nombre suyo); ahí simuladas() siempre da 0. */
let simuladas = () => 0;
/* solo-prueba: casos fijos y ~20 % de árboles con guardianes (siempre los mismos, por su número) */
const SIM_CASOS = {"MIH-029-1493":5, "MIH-029-1491":0, "MIH-029-1492":2, "MIH-047-1179":4, "25-MIH-TAX-19405GIMNO-0001":4, "25-CUH-TAX-19405GIMNO-0002":0};
const SIM_MIOS = ["MIH-029-1492"];
if (C.SIMULAR_GUARDIANES){
  for (const i of SIM_MIOS) PROPIOS.add(i);
  simuladas = idc => {
    if (idc in SIM_CASOS) return SIM_CASOS[idc];
    let h = 2166136261; for (let i = 0; i < idc.length; i++){ h ^= idc.charCodeAt(i); h = Math.imul(h, 16777619); }
    const r = (h >>> 0) / 4294967296; if (r >= .2) return 0;
    const q = r / .2; return q < .5 ? 1 : q < .75 ? 2 : q < .88 ? 3 : q < .95 ? 5 : 8; };
}
/* /solo-prueba */
const guardianes = a => (SERVIDOR ? (REG.get(a.idc) || 0) : (PROPIOS.has(a.idc) ? 1 : 0)) + simuladas(a.idc);
const conGuardianCol = c => C.SIMULAR_GUARDIANES ? arbolesDe(c).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_COL.get(c) || new Set()).size : 0;
const conGuardianAlc = m => C.SIMULAR_GUARDIANES ? (ARB_ALC.get(m) || []).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_ALC.get(m) || new Set()).size : 0;
async function registrarGuardian(a){
  if (PROPIOS.has(a.idc)) return "ya";
  PROPIOS.add(a.idc); guardarLocal(CLAVE.arboles, [...PROPIOS]); guardarMeta(a); actualizarMis();
  verG++; pintarMapa(); repintarPanel(); if (selArb === a && !card.hidden) pintarTarjeta(a);
  return "nuevo";
}

