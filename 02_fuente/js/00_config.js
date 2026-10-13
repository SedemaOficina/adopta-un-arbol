/* Configuración de Guardianes de árboles. Direcciones: viven aquí y en ningún otro lugar. null = liga pendiente.
   MODO lo escribe armar.py en <html data-modo>: "prueba" (python armar.py) o "produccion" (python armar.py --produccion).
   Prueba: personas guardianas simuladas, aviso «Versión de prueba» y casos «Para probar». Producción: nada de eso.
   VERSION y FECHA_VERSION las escribe armar.py (constantes al principio de armar.py); HUELLAS también (huella del contenido de cada archivo
   de datos/, img/ y vendor/, para pedirlo con ?v=<huella>: ver conHuella en 01_utilidades.js). */
window.LOGO_INST = "img/logo_inst.png";   // logo institucional (tablero I): Gobierno CDMX · SEDEMA · SIA
window.EMBLEMA_PAT = "img/emblema_patrimoniales.png";   // emblema de Árboles Patrimoniales de la Ciudad de México
window.CONFIG = (() => {
  const POR_MODO = {
    prueba:     {URL_SITIO: "https://sedemaoficina.github.io/adopta-un-arbol/", SIMULAR_GUARDIANES: true},   // GitHub Pages (Lote 6)
    produccion: {URL_SITIO: "https://sedema.sia.cdmx.gob.mx/adopta-un-arbol/",  SIMULAR_GUARDIANES: false}   // SIA (Lote 7)
  };
  const MODO = POR_MODO[document.documentElement.dataset.modo] ? document.documentElement.dataset.modo : "prueba";
  return {
    MODO, VERSION:"__VERSION__", FECHA_VERSION:"__FECHA_VERSION__", HUELLAS:__HUELLAS__, ...POR_MODO[MODO],   // URL_SITIO: liga para compartir y QR (+ "#arbol-<clave>"); SIMULAR_GUARDIANES: ~20 % de árboles con guardianes al azar (fijo por árbol) y casos de ejemplo
    URL_PATRIMONIALES: "https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/",   // la ficha de cada ejemplar es arbol-<clave>.html
    GOOGLE_MAPS_EMBED_KEY: null,   // con clave de Google Maps Embed (de SEDEMA), la ficha muestra Street View dentro de la página
    STREET_VIEW_SIN_CLAVE: true,   // sin clave: Street View dentro de la ficha con la liga pública de Google (no oficial)
    CORTE_INVENTARIO: "octubre de 2026"
  };
})();
