/**
 * Guardar un archivo generado en el dispositivo.
 *
 * ---------------------------------------------------------------------------
 * ESTE ARCHIVO EXISTE PARA QUE HAYA UN SOLO SITIO QUE TOCAR
 * ---------------------------------------------------------------------------
 *
 * `CLAUDE.md` §3.3: «nada que dependa de `window.open`, ventanas emergentes o
 * descargas del navegador **sin una alternativa nativa prevista**». La
 * alternativa es esta función: hoy usa un enlace con `download`, y dentro de
 * Capacitor pasará por el plugin de sistema de archivos y el de compartir.
 *
 * Si cada pantalla creara su propio `<a download>`, en Fase B habría que
 * buscarlos uno a uno y el que se escape falla en silencio: en el contenedor
 * nativo el enlace no da error, sencillamente no pasa nada.
 */

export function guardarArchivo(blob: Blob, nombre: string): void {
  // `createObjectURL` en vez de un data: URI porque un plan de seis semanas son
  // cientos de kilobytes, y en base64 crecen un tercio dentro del DOM.
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = "noopener";

  document.body.append(enlace);
  enlace.click();
  enlace.remove();

  // Sin revocar, el blob se queda en memoria hasta que se cierra la pestaña.
  // El retraso es porque Safari cancela la descarga si se revoca de inmediato.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
