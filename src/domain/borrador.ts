/**
 * Borradores de evaluación a medias.
 *
 * "La realidad del gimnasio son las interrupciones" (tarea 2.8). Un entrenador
 * empieza a medir, le preguntan algo, atiende a otro atleta y vuelve veinte
 * minutos después. Perder los pliegues ya tomados significa volver a medirlos
 * con el atleta esperando.
 *
 * DÓNDE VIVEN: en el dispositivo, no en el servidor. Son datos de salud a medio
 * capturar —sin consentimiento cerrado, sin revisar— y subirlos multiplicaría la
 * superficie expuesta sin ninguna ganancia: nadie retoma una evaluación desde
 * otro teléfono.
 *
 * Lógica pura para poder probarla: el almacenamiento real está en lib/.
 */

/** Sube cuando cambian los campos guardados, para descartar borradores viejos. */
export const VERSION_BORRADOR = 1;

/** Una semana. Pasado eso, la evaluación ya no se va a retomar. */
export const CADUCIDAD_MS = 7 * 24 * 60 * 60 * 1000;

export interface Borrador<T> {
  version: number;
  guardadoEn: number;
  /** Para no ofrecerle a alguien el borrador de otro en un móvil compartido. */
  usuarioId: string;
  atletaId: string;
  datos: T;
}

export type TipoBorrador = "medicion" | "segmentos" | "atleta";

const PREFIJO = "gioslab:borrador";

export function claveBorrador(tipo: TipoBorrador, atletaId: string): string {
  return `${PREFIJO}:${tipo}:${atletaId}`;
}

/** ¿Es una clave de borrador nuestra? Se usa al limpiar todo al cerrar sesión. */
export function esClaveBorrador(clave: string): boolean {
  return clave.startsWith(`${PREFIJO}:`);
}

export function crearBorrador<T>(
  usuarioId: string,
  atletaId: string,
  datos: T,
  ahora = Date.now(),
): Borrador<T> {
  return { version: VERSION_BORRADOR, guardadoEn: ahora, usuarioId, atletaId, datos };
}

/**
 * ¿Se puede ofrecer este borrador?
 *
 * Tres motivos para decir que no, y los tres importan:
 *  - Caducado: una evaluación de hace diez días ya no se retoma.
 *  - De otro usuario: en el móvil del gimnasio lo abre otra persona.
 *  - De otra versión: los campos cambiaron y restaurarlo metería basura.
 */
export function borradorUtilizable<T>(
  borrador: Borrador<T> | null,
  usuarioId: string,
  ahora = Date.now(),
): boolean {
  if (!borrador) return false;
  if (borrador.version !== VERSION_BORRADOR) return false;
  if (borrador.usuarioId !== usuarioId) return false;
  if (ahora - borrador.guardadoEn > CADUCIDAD_MS) return false;
  return true;
}

/** Analiza lo leído del almacenamiento sin confiar en su forma. */
export function analizarBorrador<T>(crudo: string | null): Borrador<T> | null {
  if (!crudo) return null;
  try {
    const b = JSON.parse(crudo) as Borrador<T>;
    if (typeof b?.version !== "number" || typeof b?.guardadoEn !== "number") return null;
    if (typeof b?.usuarioId !== "string" || typeof b?.atletaId !== "string") return null;
    return b;
  } catch {
    // Un JSON corrupto no debe tumbar la pantalla: se trata como si no hubiera
    // borrador y se sigue.
    return null;
  }
}

/**
 * ¿Merece la pena guardar esto?
 *
 * Un borrador vacío no aporta nada y provocaría un aviso de "tienes algo a
 * medias" sobre una pantalla en blanco, que desconcierta más que ayuda.
 */
export function tieneAlgoQueGuardar(datos: Record<string, unknown>): boolean {
  return Object.values(datos).some(
    (v) => v !== null && v !== undefined && String(v).trim() !== "",
  );
}

/** "hace 20 minutos", para el aviso de restauración. */
export function haceCuantoCorto(guardadoEn: number, ahora = Date.now()): string {
  const minutos = Math.floor((ahora - guardadoEn) / 60_000);
  if (minutos < 1) return "hace un momento";
  if (minutos === 1) return "hace 1 minuto";
  if (minutos < 60) return `hace ${minutos} minutos`;

  const horas = Math.floor(minutos / 60);
  if (horas === 1) return "hace 1 hora";
  if (horas < 24) return `hace ${horas} horas`;

  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}
