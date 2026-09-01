/**
 * Asimetrías entre lados (tarea 2.15).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES Y QUÉ NO ES
 * ---------------------------------------------------------------------------
 *
 * Una asimetría es una resta entre dos perímetros del mismo segmento. Suena
 * trivial y no lo es, porque de esa resta cuelga una prescripción: Giovanni
 * pidió que el motor "prescriba unilaterales empezando por el lado débil y
 * ajuste el volumen en esa zona". Si el signo se invierte, el sistema manda
 * reforzar el lado que ya era el fuerte y agranda justo lo que quería corregir.
 *
 * Por eso aquí no hay ningún atajo: el lado débil es SIEMPRE el de menor
 * perímetro, y si falta uno de los dos lados no se devuelve nada.
 *
 * ---------------------------------------------------------------------------
 * LOS UMBRALES SON SUYOS, Y CAMBIARON
 * ---------------------------------------------------------------------------
 *
 * Primero dijo 1 cm o 5 % en brazo; lo repensó el 1-sep y lo dejó en 1,5 cm sin
 * porcentaje. Eso zanja además la contradicción que tenía con su propio
 * `Principios_Entrenamiento`, que decía 1,5 desde el principio.
 *
 * ⚠️ QUE SE CAIGA EL PORCENTAJE NO ES COSMÉTICO. Un criterio relativo obliga a
 * decidir sobre qué perímetro se calcula el tanto por ciento —¿el mayor, el
 * menor, la media?— y las tres respuestas dan números distintos justo en el
 * borde, que es donde se decide si alguien entra en protocolo. En centímetros
 * la asimetría es una resta y no hay nada que interpretar.
 */

export const SEGMENTOS = ["brazo", "muslo", "pantorrilla"] as const;
export type Segmento = (typeof SEGMENTOS)[number];

export type Lado = "derecho" | "izquierdo";

export const FICHA_SEGMENTO: Record<Segmento, { nombre: string; derecho: string; izquierdo: string }> = {
  brazo:       { nombre: "Brazo",       derecho: "arm_flexed_cm", izquierdo: "arm_flexed_left_cm" },
  muslo:       { nombre: "Muslo",       derecho: "thigh_cm",      izquierdo: "thigh_left_cm" },
  pantorrilla: { nombre: "Pantorrilla", derecho: "calf_cm",       izquierdo: "calf_left_cm" },
};

/**
 * Diferencia en centímetros a partir de la cual se activa el protocolo.
 *
 * `null` = todavía no lo ha dicho. NO se rellena con el de al lado: un umbral
 * inventado activa un protocolo correctivo sobre alguien que no lo necesita, y
 * el atleta acaba haciendo trabajo unilateral por una decisión nuestra.
 * Pantorrilla está pendiente desde el 1-sep (su formulario decía 1 cm y su
 * `Principios` habla de 2 cm en piernas).
 */
export const UMBRAL_CM: Record<Segmento, number | null> = {
  brazo: 1.5,
  muslo: 2,
  pantorrilla: null,
};

export interface Asimetria {
  segmento: Segmento;
  derecho: number;
  izquierdo: number;
  /** Siempre positiva: es una magnitud, no una dirección. */
  diferenciaCm: number;
  /** El de MENOR perímetro. Es por el que hay que empezar. */
  ladoDebil: Lado;
  /**
   * `true` supera el umbral, `false` no lo supera, `null` no hay umbral fijado.
   *
   * Los tres estados son distintos y la interfaz los distingue: `null` no es
   * "está bien", es "no lo sabemos porque él no lo ha dicho".
   */
  superaUmbral: boolean | null;
}

/** Las columnas de la medición que hacen falta. Todo lo demás sobra aquí. */
export type MedicionBilateral = Partial<
  Record<
    "arm_flexed_cm" | "arm_flexed_left_cm" | "thigh_cm" | "thigh_left_cm" | "calf_cm" | "calf_left_cm",
    number | string | null
  >
>;

/** Numero o `null`. Acepta texto porque PostgREST devuelve `numeric` como string. */
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * La asimetría de un segmento, o `null` si falta alguno de los dos lados.
 *
 * Falta un lado ≠ simétrico. Las mediciones anteriores a la 2.15 se tomaron de
 * un solo lado, así que devolver 0 las convertiría en "perfectamente simétrico"
 * y taparía justo lo que hay que detectar.
 */
export function asimetriaDe(medicion: MedicionBilateral, segmento: Segmento): Asimetria | null {
  const ficha = FICHA_SEGMENTO[segmento];
  const derecho = num(medicion[ficha.derecho as keyof MedicionBilateral]);
  const izquierdo = num(medicion[ficha.izquierdo as keyof MedicionBilateral]);
  if (derecho === null || izquierdo === null) return null;

  const umbral = UMBRAL_CM[segmento];
  // Redondeo a una decimal: es la precisión con la que se guarda (numeric(5,1))
  // y sin él la resta saca 1.7999999999999998, que en pantalla es ridículo.
  const diferenciaCm = Math.round(Math.abs(derecho - izquierdo) * 10) / 10;

  return {
    segmento,
    derecho,
    izquierdo,
    diferenciaCm,
    ladoDebil: izquierdo < derecho ? "izquierdo" : "derecho",
    superaUmbral: umbral === null ? null : diferenciaCm > umbral,
  };
}

/** Todas las que se pueden calcular, en el orden del catálogo. */
export function asimetriasDe(medicion: MedicionBilateral): Asimetria[] {
  return SEGMENTOS.map((s) => asimetriaDe(medicion, s)).filter((a): a is Asimetria => a !== null);
}

/**
 * Los segmentos que superan su umbral. Es lo que ve el motor.
 *
 * Solo entran los que lo superan de verdad: un segmento con umbral pendiente
 * (`null`) NO entra, porque hacerlo dispararía una regla con un criterio que
 * Giovanni no ha fijado.
 */
export function segmentosConAsimetria(medicion: MedicionBilateral): Segmento[] {
  return asimetriasDe(medicion)
    .filter((a) => a.superaUmbral === true)
    .map((a) => a.segmento);
}

/** Frase para el entrenador: qué corregir y por dónde empezar. */
export function describirAsimetria(a: Asimetria): string {
  const lado = a.ladoDebil === "izquierdo" ? "izquierdo" : "derecho";
  return (
    `${FICHA_SEGMENTO[a.segmento].nombre}: ${a.diferenciaCm.toFixed(1).replace(".", ",")} cm ` +
    `a favor del ${a.ladoDebil === "izquierdo" ? "derecho" : "izquierdo"}. ` +
    `Empezar el trabajo unilateral por el ${lado}.`
  );
}
