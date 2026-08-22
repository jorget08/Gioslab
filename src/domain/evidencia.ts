/**
 * Jerarquía de nivel de evidencia (MÓDULO 03 de las aclaraciones de Giovanni).
 *
 * Yo pregunté por esto pensando que era una etiqueta descriptiva —"de dónde
 * sale esta regla"— y la respuesta fue más útil: es el ORDEN DE RESOLUCIÓN DE
 * CONFLICTOS del motor.
 *
 * Cuando dos reglas activas se contradicen sobre el mismo ejercicio (una lo
 * prioriza, otra lo excluye), el motor no puede aplicar las dos ni elegir al
 * azar. Gana la de mayor nivel, siempre, sin excepción. Sin esta jerarquía el
 * motor sería no determinista: el mismo atleta con las mismas reglas podría
 * recibir prescripciones distintas según el orden en que se leyeran las filas.
 *
 * El orden vive aquí y no en la base porque quien compara es el motor, y el
 * motor corre en el cliente (docs/ARQUITECTURA.md). La base solo garantiza que
 * el valor sea uno de los cuatro.
 */

export const NIVELES_EVIDENCIA = [
  "LEVEL_A_SCIENCE",
  "LEVEL_B_BIOMECHANICS",
  "LEVEL_C_CONSENSUS",
  "LEVEL_D_OVERRIDE",
] as const;

export type NivelEvidencia = (typeof NIVELES_EVIDENCIA)[number];

/**
 * Peso para comparar. Mayor gana.
 *
 * Los números no se guardan en ningún sitio ni se muestran: son un detalle de
 * implementación de la comparación. Lo que importa es el orden relativo, que es
 * exactamente el que él especificó.
 */
const PESO: Record<NivelEvidencia, number> = {
  LEVEL_A_SCIENCE: 4,
  LEVEL_B_BIOMECHANICS: 3,
  LEVEL_C_CONSENSUS: 2,
  LEVEL_D_OVERRIDE: 1,
};

/** Lo que ve el entrenador. La clave técnica no se enseña en pantalla. */
export const ETIQUETA_EVIDENCIA: Record<NivelEvidencia, string> = {
  LEVEL_A_SCIENCE: "Evidencia científica",
  LEVEL_B_BIOMECHANICS: "Biomecánica",
  LEVEL_C_CONSENSUS: "Consenso técnico",
  LEVEL_D_OVERRIDE: "Criterio del entrenador",
};

/**
 * La explicación larga, para el detalle de la regla (§3.6: el entrenador tiene
 * que poder ver por qué el motor decidió lo que decidió).
 */
export const DESCRIPCION_EVIDENCIA: Record<NivelEvidencia, string> = {
  LEVEL_A_SCIENCE:
    "Metaanálisis y ensayos clínicos. Reglas biológicas fundamentales: volumen semanal por grupo muscular, adaptaciones por fase menstrual.",
  LEVEL_B_BIOMECHANICS:
    "Anatomía funcional: momento de fuerza, vectores de tracción y brazo de momento según las palancas de este atleta.",
  LEVEL_C_CONSENSUS:
    "Práctica clínica estandarizada: criterios de estructuración de rutinas, ejercicios estables frente a inestables.",
  LEVEL_D_OVERRIDE:
    "Criterio directo del entrenador. Sobrescribe la regla automática por decisión manual.",
};

export function esNivelEvidencia(valor: string): valor is NivelEvidencia {
  return (NIVELES_EVIDENCIA as readonly string[]).includes(valor);
}

/**
 * Compara dos niveles.
 * > 0 si `a` manda sobre `b`, < 0 si manda `b`, 0 si están empatados.
 */
export function compararEvidencia(a: NivelEvidencia, b: NivelEvidencia): number {
  return PESO[a] - PESO[b];
}

/** ¿`a` le gana a `b`? Empate NO es victoria: hay que resolverlo aparte. */
export function mandaSobre(a: NivelEvidencia, b: NivelEvidencia): boolean {
  return PESO[a] > PESO[b];
}

/**
 * Ordena reglas de la que más manda a la que menos.
 *
 * Estable a propósito: dos reglas del mismo nivel conservan el orden en que
 * llegaron. El motor las sigue viendo empatadas —resolver un empate es una
 * decisión metodológica, no de ordenamiento— pero al menos el resultado es
 * reproducible entre ejecuciones.
 */
export function ordenarPorEvidencia<T extends { evidence_level: NivelEvidencia }>(
  reglas: readonly T[],
): T[] {
  return [...reglas].sort((x, y) => compararEvidencia(y.evidence_level, x.evidence_level));
}

/**
 * Resuelve un conflicto entre reglas que se contradicen.
 *
 * Devuelve la ganadora y, si hay empate en el nivel más alto, las empatadas.
 * NO inventa un desempate: si dos reglas de nivel B se contradicen, eso es un
 * defecto de la matriz que tiene que arreglar Giovanni, y el motor debe poder
 * decirlo en vez de escoger una en silencio.
 */
export interface Conflicto<T> {
  ganadora: T;
  /** Más de una = empate real. El motor tiene que avisar, no elegir. */
  empatadas: T[];
}

export function resolverConflicto<T extends { evidence_level: NivelEvidencia }>(
  reglas: readonly T[],
): Conflicto<T> | null {
  if (reglas.length === 0) return null;

  const ordenadas = ordenarPorEvidencia(reglas);
  const techo = ordenadas[0].evidence_level;
  const empatadas = ordenadas.filter((r) => r.evidence_level === techo);

  return { ganadora: ordenadas[0], empatadas };
}
