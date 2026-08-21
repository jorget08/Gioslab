/**
 * Segmentos óseos y proporciones — paso 3 del wizard.
 *
 * Las opciones salen de la ficha de Giovanni (docs/ESPECIFICACION-FICHAS.md
 * §3.2). NO se mide en centímetros: es una clasificación que hace el entrenador
 * con criterio, no una cinta métrica.
 *
 * ⚠️ PENDIENTE: sus dos archivos usan vocabularios distintos para lo mismo. La
 * ficha antropométrica dice `[Corto, Promedio, Largo]`; el flujograma dice
 * `[Corto (Favor Sentadilla Libre), Promedio, Largo (Favor Hack/Prensa)]`.
 *
 * Se guarda el valor CORTO —limpio, tres opciones— y la implicación mecánica se
 * enseña como ayuda en pantalla. Así el entrenador ve la orientación sin que
 * acabe metida dentro del dato, donde el motor tendría que parsearla.
 */

export const CLASES_SEGMENTO = ["Corto", "Promedio", "Largo"] as const;
export type ClaseSegmento = (typeof CLASES_SEGMENTO)[number];

/** Lo que implica cada longitud de fémur, según el flujograma de Giovanni. */
export const IMPLICACION_FEMUR: Record<ClaseSegmento, string> = {
  Corto: "favorece sentadilla libre",
  Promedio: "sin preferencia marcada",
  Largo: "favorece hack y prensa",
};

export const IMPLICACION_TORSO: Record<ClaseSegmento, string> = {
  Corto: "más inclinación en sentadilla",
  Promedio: "sin preferencia marcada",
  Largo: "torso más vertical",
};

/**
 * Describe la combinación fémur/torso.
 *
 * Es la descripción MECÁNICA, no la interpretación. La ficha de Giovanni
 * clasifica "Fémur Largo / Torso Corto" como "Inclinación Alta", pero solo
 * conocemos esa correspondencia: las otras ocho combinaciones no están
 * definidas, y ponerlas nosotros sería inventar el método.
 *
 * Se guarda la combinación —que es un hecho— y la interpretación queda para el
 * motor de reglas cuando Giovanni la defina.
 */
export function describirProporcion(
  femur: ClaseSegmento | undefined,
  torso: ClaseSegmento | undefined,
): string | null {
  if (!femur || !torso) return null;
  return `Fémur ${femur} / Torso ${torso}`;
}

/**
 * ¿Es una combinación que la ficha de Giovanni ya clasifica?
 *
 * Solo hay una documentada. Se usa para enseñar su interpretación cuando
 * aplica, y no enseñar nada cuando no la tenemos, en vez de rellenar el hueco
 * con algo verosímil.
 */
export const INTERPRETACIONES_CONOCIDAS: Record<string, string> = {
  "Fémur Largo / Torso Corto": "Inclinación Alta",
};

export function interpretarProporcion(proporcion: string | null): string | null {
  if (!proporcion) return null;
  return INTERPRETACIONES_CONOCIDAS[proporcion] ?? null;
}
