/**
 * Catálogo cerrado de patrones de movimiento (MÓDULO 04).
 *
 * Ocho claves, ni una más. Es la llave con la que el motor cruza ejercicios:
 * cuando una regla excluye la Sentadilla Trasera, lo que busca para sustituirla
 * es otro ejercicio del mismo patrón. Si el catálogo estuviera abierto, dos
 * ejercicios equivalentes escritos distinto ("empuje horizontal" / "Empuje
 * Horizontal") no se encontrarían y la sustitución fallaría en silencio.
 *
 * La clave va en inglés como el resto del esquema; el nombre que ve el
 * entrenador está aquí. Esa separación importa: si mañana Giovanni quiere
 * llamarlo "Dominante de Cuádriceps", se cambia la etiqueta y ninguna regla ni
 * ningún ejercicio ya clasificado se rompe.
 */

export const PATRONES = [
  "squat_dominante_rodilla",
  "hip_hinge_dominante_cadera",
  "horizontal_push",
  "horizontal_pull",
  "vertical_push",
  "vertical_pull",
  "isolation_accessory",
  "core_anti_flexion_extension",
] as const;

export type Patron = (typeof PATRONES)[number];

export interface FichaPatron {
  nombre: string;
  /** Ejemplos textuales de Giovanni. Ayudan a clasificar sin adivinar. */
  ejemplos: string[];
}

export const FICHA_PATRON: Record<Patron, FichaPatron> = {
  squat_dominante_rodilla: {
    nombre: "Dominante de Rodilla",
    ejemplos: ["Sentadillas", "Prensa", "Zancadas", "Sentadilla Búlgara"],
  },
  hip_hinge_dominante_cadera: {
    nombre: "Dominante / Bisagra de Cadera",
    ejemplos: ["Peso Muerto", "Hip Thrust", "Buenos Días"],
  },
  horizontal_push: {
    nombre: "Empuje Horizontal",
    ejemplos: ["Press de Banca", "Flexiones", "Press en Máquina"],
  },
  horizontal_pull: {
    nombre: "Tracción Horizontal",
    ejemplos: ["Remo en Polea", "Remo con Barra", "Remo Unilateral"],
  },
  vertical_push: {
    nombre: "Empuje Vertical",
    ejemplos: ["Press Militar", "Press de Hombros con Mancuernas"],
  },
  vertical_pull: {
    nombre: "Tracción Vertical",
    ejemplos: ["Jalón al Pecho", "Dominadas"],
  },
  isolation_accessory: {
    nombre: "Aislamiento / Monoarticular",
    ejemplos: ["Curl de Bíceps", "Extensiones de Tríceps", "Elevaciones Laterales"],
  },
  core_anti_flexion_extension: {
    nombre: "Core / Estabilidad Central",
    ejemplos: ["Planchas", "Anti-rotación", "Press Pallof"],
  },
};

export function esPatron(valor: string): valor is Patron {
  return (PATRONES as readonly string[]).includes(valor);
}

/** Nombre para pantalla. Si llega una clave desconocida se devuelve tal cual:
 *  es preferible ver la clave cruda que un "Desconocido" que oculta el fallo. */
export function nombrePatron(valor: string): string {
  return esPatron(valor) ? FICHA_PATRON[valor].nombre : valor;
}

/** Opciones para un desplegable, en el orden del catálogo. */
export function opcionesPatron(): { valor: Patron; texto: string; detalle: string }[] {
  return PATRONES.map((p) => ({
    valor: p,
    texto: FICHA_PATRON[p].nombre,
    detalle: FICHA_PATRON[p].ejemplos.join(", "),
  }));
}
