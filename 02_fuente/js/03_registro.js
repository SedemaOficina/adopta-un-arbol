/* ================= guardianes (sin datos personales) ================= */
/* Cada guardianía es un registro anónimo {árbol, colonia, alcaldía, fecha}. Hoy solo vive en este navegador (más la simulación en modo prueba).
   El conteo de todas las personas lo dará el servicio del SIA (pendiente 7, etapa 2): llenará REG, REG_COL y REG_ALC y pondrá SERVIDOR = true. */
let REG = new Map(), REG_COL = new Map(), REG_ALC = new Map(), verG = 0, SERVIDOR = null;
const PROPIOS = new Set(leerLocal("guardianias", []));
const patA = p => ({idc:p.inv || p.id, pat:p});   // el patrimonial se cuenta con la clave del inventario si está empatado
/* Simulación de pruebas: casos fijos y ~20 % de árboles con guardianes (siempre los mismos, por su número). */
const SIM_CASOS = {"MIH-029-1493":5, "MIH-029-1491":0, "MIH-029-1492":2, "MIH-047-1179":4, "25-MIH-TAX-19405GIMNO-0001":4, "25-CUH-TAX-19405GIMNO-0002":0};
const SIM_MIOS = ["MIH-029-1492"];
if (C.SIMULAR_GUARDIANES) for (const i of SIM_MIOS) PROPIOS.add(i);
function simG(idc){
  if (!C.SIMULAR_GUARDIANES) return 0;
  if (idc in SIM_CASOS) return SIM_CASOS[idc];
  let h = 2166136261; for (let i = 0; i < idc.length; i++){ h ^= idc.charCodeAt(i); h = Math.imul(h, 16777619); }
  const r = (h >>> 0) / 4294967296; if (r >= .2) return 0;
  const q = r / .2; return q < .5 ? 1 : q < .75 ? 2 : q < .88 ? 3 : q < .95 ? 5 : 8;
}
const guardianes = a => (SERVIDOR ? (REG.get(a.idc) || 0) : (PROPIOS.has(a.idc) ? 1 : 0)) + simG(a.idc);
const conGuardianCol = c => C.SIMULAR_GUARDIANES ? arbolesDe(c).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_COL.get(c) || new Set()).size : 0;
const conGuardianAlc = m => C.SIMULAR_GUARDIANES ? (ARB_ALC.get(m) || []).filter(a => guardianes(a) > 0).length : SERVIDOR ? (REG_ALC.get(m) || new Set()).size : 0;
async function registrarGuardian(a){
  if (PROPIOS.has(a.idc)) return "ya";
  PROPIOS.add(a.idc); guardarLocal("guardianias", [...PROPIOS]); guardarMeta(a); actualizarMis();
  verG++; pintarMapa(); repintarPanel(); if (selArb === a && !card.hidden) pintarTarjeta(a);
  return "nuevo";
}

