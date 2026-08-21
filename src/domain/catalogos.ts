/**
 * Catálogos del dominio, tal como aparecen en las fichas de Giovanni.
 *
 * Las cadenas están escritas EXACTAMENTE como en sus Excels
 * (docs/ESPECIFICACION-FICHAS.md §3.1). No son etiquetas de interfaz que se
 * puedan retocar: se guardan en la base y el motor de reglas las compara
 * literalmente. Cambiar "Hipertrofia (Masa Muscular)" por "Hipertrofia" rompería
 * las reglas en silencio.
 */

export const OBJETIVOS = [
  "Hipertrofia (Masa Muscular)",
  "Pérdida de Grasa",
  "Recomposición Corporal",
  "Rendimiento Deportivo",
  "Mantenimiento",
] as const;

export const NIVELES = [
  "Principiante",
  "Intermedio",
  "Avanzado",
  "Deportista",
  "Culturista / Competidor",
] as const;

/** La fórmula de densidad corporal usa una constante distinta por sexo. */
export const SEXOS = ["masculino", "femenino"] as const;

export const ETIQUETA_SEXO: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
};

export const ESTADOS_LESION = ["activa", "recuperada", "cronica"] as const;

export const ETIQUETA_ESTADO_LESION: Record<string, string> = {
  activa: "Activa",
  recuperada: "Recuperada",
  cronica: "Crónica",
};

/**
 * Zonas del cuerpo para el registro de lesiones.
 *
 * PROVISIONAL: es una lista de trabajo, no el vocabulario de Giovanni — él no
 * lo ha definido (pregunta abierta en PREGUNTAS-GIOVANNI.md). Por eso el campo
 * admite también texto libre: es preferible que el entrenador escriba "manguito
 * rotador" a que no pueda registrar la lesión.
 */
export const ZONAS_CUERPO = [
  "Hombro",
  "Codo",
  "Muñeca",
  "Zona cervical",
  "Zona dorsal",
  "Zona lumbar",
  "Cadera",
  "Rodilla",
  "Tobillo",
  "Pie",
] as const;

/**
 * Versión de la política de tratamiento de datos vigente.
 *
 * Se guarda con cada consentimiento. Cuando la política cambie, sube este
 * número y los consentimientos viejos quedan identificados como de la versión
 * anterior — que es justo lo que hay que poder demostrar ante la Ley 1581.
 */
export const VERSION_POLITICA = "v1";

/** Edad en años cumplidos. Entra en la fórmula de densidad corporal. */
export function edadEnAnios(nacimiento: Date, hoy: Date = new Date()): number {
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

/**
 * "hace 6 meses", "hace 3 semanas"… para la lista de atletas.
 *
 * Es lo que el entrenador usa para decidir a quién le toca evaluación, y una
 * fecha absoluta obliga a hacer la cuenta mentalmente.
 */
export function haceCuanto(fecha: string | Date | null, hoy: Date = new Date()): string {
  if (!fecha) return "sin evaluaciones";

  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dias = Math.floor((hoy.getTime() - d.getTime()) / 86_400_000);

  if (dias < 0) return "fecha futura";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;

  // El corte va en 30 días, no en 5 semanas: "hace 4 semanas" obliga a hacer la
  // cuenta mentalmente, "hace 1 mes" no.
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return `hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  }

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;

  const anios = Math.floor(dias / 365);
  return `hace ${anios} ${anios === 1 ? "año" : "años"}`;
}
