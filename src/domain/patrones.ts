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

// ---------------------------------------------------------------------------
// Patrones complementarios (9-nov)
// ---------------------------------------------------------------------------

/**
 * Su "Matriz Complementaria de Patrones de Movimiento". NO sustituye a los ocho
 * de arriba: "conservamos intactos los 7 patrones básicos… le agregamos estas
 * subcategorías complementarias para que el motor clasifique Hip Thrusts,
 * Curls, Elevaciones Laterales o Trabajo Unilateral sin generar conflictos".
 * El patrón básico sigue siendo la llave del reparto y de la sustitución; este
 * dice QUÉ tipo de accesorio es dentro de él. Catálogo cerrado por lo mismo que
 * el básico: escrito a mano, dos iguales no se encontrarían.
 */
export const COMPLEMENTARIOS = [
  "dominante_unilateral_rodilla",
  "flexion_rodilla",
  "extension_rodilla",
  "abduccion_aduccion_cadera",
  "puente_cadera",
  "flexoextension_codo",
  "elevacion_hombro",
  "abduccion_horizontal_hombro",
  "plantiflexion",
  "core_anti_extension_rotacion",
] as const;

export type Complementario = (typeof COMPLEMENTARIOS)[number];

/** Nombre, enfoque y ejemplos, tal cual su matriz. */
export const FICHA_COMPLEMENTARIO: Record<Complementario, { nombre: string; enfoque: string; ejemplos: string }> = {
  dominante_unilateral_rodilla: {
    nombre: "Dominante Unilateral de Rodilla",
    enfoque: "Empuje / Tracción Unilateral",
    ejemplos: "Sentadilla Búlgara, Zancadas Caminando, Step-Up en Banco, Prensa Unilateral",
  },
  flexion_rodilla: {
    nombre: "Flexión de Rodilla Monoarticular",
    enfoque: "Aislamiento de Isquiosurales",
    ejemplos: "Curl Femoral Sentado, Tumbado y De Pie, Curl Nórdico",
  },
  extension_rodilla: {
    nombre: "Extensión de Rodilla Monoarticular",
    enfoque: "Aislamiento de Cuádriceps",
    ejemplos: "Extensión de Rodilla en Máquina, Sentadilla Sissy",
  },
  abduccion_aduccion_cadera: {
    nombre: "Abducción / Aducción de Cadera",
    enfoque: "Anexo Cadera y Aductores",
    ejemplos: "Abducción en Máquina y en Polea, Aducción en Máquina, Plancha Copenhague",
  },
  puente_cadera: {
    nombre: "Extensión / Puente de Cadera (J3)",
    enfoque: "Dominante de Glúteo Mayor",
    ejemplos: "Hip Thrust con Barra, Glute Bridge, Hip Thrust en Máquina, Patada de Glúteo en Polea",
  },
  flexoextension_codo: {
    nombre: "Flexión / Extensión de Codo (Brazos)",
    enfoque: "Aislamiento de Bíceps / Tríceps",
    ejemplos: "Curl de Bíceps (EZ, Inclinado, Scott, Bayesian), Press Francés, Pushdown, Extensiones Overhead",
  },
  elevacion_hombro: {
    nombre: "Abducción / Elevación de Hombro",
    enfoque: "Aislamiento Deltoides Lateral",
    ejemplos: "Elevaciones Laterales con Mancuernas, en Polea y en Banco Inclinado",
  },
  abduccion_horizontal_hombro: {
    nombre: "Abducción Horizontal / Rotación Externa",
    enfoque: "Deltoides Posterior y Manguito",
    ejemplos: "Pájaros con Mancuernas, Inverted Reverse Pec Deck, Face Pulls con Cuerda",
  },
  plantiflexion: {
    nombre: "Plantiflexión (Pantorrillas)",
    enfoque: "Aislamiento Gastrocnemio / Sóleo",
    ejemplos: "Elevación de Talones De Pie (gastrocnemio) y Sentado (sóleo)",
  },
  core_anti_extension_rotacion: {
    nombre: "Anti-Extensión / Anti-Rotación (Core)",
    enfoque: "Estabilidad Central / Abdomen",
    ejemplos: "Rueda Abdominal, Press Pallof, Crunch en Polea Alta, Plancha Isométrica",
  },
};

export function esComplementario(valor: unknown): valor is Complementario {
  return typeof valor === "string" && (COMPLEMENTARIOS as readonly string[]).includes(valor);
}
