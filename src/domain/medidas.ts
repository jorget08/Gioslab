/**
 * Campos de la medición antropométrica y su validación.
 *
 * Los rangos son EXACTAMENTE los CHECK de la tabla
 * (migración 20260819070000 + 20260819120000). Si divergen, la app dejaría
 * escribir algo que la base rechaza al guardar, y el entrenador perdería el
 * trabajo al final en vez de al principio.
 *
 * Lógica pura, sin React ni Supabase: es donde viven los errores sutiles.
 */

export type CampoMedida =
  | "height_cm" | "weight_kg"
  | "triceps_mm" | "subscapular_mm" | "suprailiac_mm" | "abdominal_mm"
  | "thigh_mm" | "calf_mm" | "chest_mm"
  | "waist_cm" | "hip_cm"
  | "arm_relaxed_cm" | "arm_flexed_cm" | "chest_cm" | "thigh_cm" | "calf_cm";

export interface MetaCampo {
  etiqueta: string;
  /** Dónde se toma. El entrenador no debería tener que recordarlo. */
  sitio?: string;
  unidad: "cm" | "kg" | "mm";
  min: number;
  max: number;
  /** Salto respecto a la evaluación anterior que dispara una advertencia. */
  saltoRelativo?: number;
  saltoAbsoluto?: number;
}

export const CAMPOS: Record<CampoMedida, MetaCampo> = {
  height_cm:  { etiqueta: "Estatura", unidad: "cm", min: 100, max: 260, saltoAbsoluto: 2 },
  weight_kg:  { etiqueta: "Peso",     unidad: "kg", min: 20,  max: 400, saltoRelativo: 0.1 },

  triceps_mm:     { etiqueta: "Tríceps",      sitio: "cara posterior del brazo", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  subscapular_mm: { etiqueta: "Subescapular", sitio: "bajo el ángulo de la escápula", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  suprailiac_mm:  { etiqueta: "Suprailíaco",  sitio: "sobre la cresta ilíaca", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  abdominal_mm:   { etiqueta: "Abdominal",    sitio: "a 5 cm del ombligo", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  thigh_mm:       { etiqueta: "Muslo",        sitio: "cara anterior, punto medio", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  calf_mm:        { etiqueta: "Pantorrilla",  sitio: "cara medial, máximo perímetro", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },
  chest_mm:       { etiqueta: "Pectoral",     sitio: "diagonal axila-pezón", unidad: "mm", min: 1, max: 100, saltoRelativo: 0.4 },

  waist_cm: { etiqueta: "Cintura", sitio: "a nivel umbilical", unidad: "cm", min: 40, max: 200, saltoRelativo: 0.15 },
  hip_cm:   { etiqueta: "Cadera",  sitio: "máxima prominencia de glúteos", unidad: "cm", min: 40, max: 200, saltoRelativo: 0.15 },

  // Perímetros de extremidades y tronco. Cintura y cadera sirven para el ratio
  // de riesgo; estos son los que dicen DÓNDE creció alguien.
  //
  // El salto que dispara aviso es más estrecho aquí (8%) que en cintura (15%):
  // un brazo no gana cuatro centímetros entre dos evaluaciones, así que un
  // cambio así es casi siempre un error de tecleo o de punto de medición.
  arm_relaxed_cm: { etiqueta: "Brazo relajado",  sitio: "punto medio del brazo, colgando", unidad: "cm", min: 15, max: 70,  saltoRelativo: 0.08 },
  arm_flexed_cm:  { etiqueta: "Brazo contraído", sitio: "máxima circunferencia en flexión", unidad: "cm", min: 15, max: 70,  saltoRelativo: 0.08 },
  chest_cm:       { etiqueta: "Tórax",           sitio: "a nivel mesoesternal",             unidad: "cm", min: 50, max: 200, saltoRelativo: 0.10 },
  thigh_cm:       { etiqueta: "Muslo",           sitio: "punto medio entre ingle y rodilla", unidad: "cm", min: 25, max: 110, saltoRelativo: 0.10 },
  calf_cm:        { etiqueta: "Pantorrilla",     sitio: "máxima circunferencia",            unidad: "cm", min: 15, max: 80,  saltoRelativo: 0.08 },
};

/**
 * Perímetros, en el orden en que se recorre al atleta: tronco primero y luego
 * las extremidades de arriba abajo. El mismo criterio que la movilidad.
 */
export const PERIMETROS: CampoMedida[] = [
  "waist_cm", "hip_cm", "chest_cm",
  "arm_relaxed_cm", "arm_flexed_cm", "thigh_cm", "calf_cm",
];

/** Los 7 pliegues, en el orden del protocolo ISAK de la ficha de Giovanni. */
export const PLIEGUES: CampoMedida[] = [
  "triceps_mm", "subscapular_mm", "suprailiac_mm",
  "abdominal_mm", "thigh_mm", "calf_mm", "chest_mm",
];

export type NivelAviso = "bloquea" | "advierte";

export interface Aviso {
  nivel: NivelAviso;
  mensaje: string;
  /** Valor propuesto, cuando se puede adivinar la intención. */
  sugerencia?: number;
}

/**
 * ¿Quiso escribir otra cosa?
 *
 * Un 1750 en estatura es un dedo de más: 175 sí cabe en el rango. Proponer la
 * corrección es mucho más útil que decir "valor inválido" y dejar que el
 * entrenador adivine qué pasó.
 */
function sugerirCorreccion(valor: number, meta: MetaCampo): number | undefined {
  for (const factor of [10, 100]) {
    const candidato = valor / factor;
    if (candidato >= meta.min && candidato <= meta.max) {
      // Solo si el resultado es "limpio": 1750/10 = 175 sí; 1753/10 = 175.3 no
      // tiene por qué ser lo que quería.
      if (Number.isInteger(candidato) || Number.isInteger(candidato * 10)) return candidato;
    }
  }
  // También el caso contrario: un 17 donde iba 170.
  for (const factor of [10]) {
    const candidato = valor * factor;
    if (candidato >= meta.min && candidato <= meta.max) return candidato;
  }
  return undefined;
}

/**
 * Nivel 1 — BLOQUEA. Solo lo imposible.
 *
 * Fuera del rango que acepta la base. Son errores de tecleo, no valores
 * extremos: una persona no mide 1750 cm.
 */
export function validarRango(campo: CampoMedida, valor: number | null): Aviso | null {
  if (valor === null || Number.isNaN(valor)) return null;

  const meta = CAMPOS[campo];
  if (valor >= meta.min && valor <= meta.max) return null;

  const sugerencia = sugerirCorreccion(valor, meta);
  const num = Number.isInteger(valor) ? valor : Number(valor.toFixed(1));

  return {
    nivel: "bloquea",
    mensaje: sugerencia
      ? `${num} no puede ser ${meta.etiqueta.toLowerCase()} en ${meta.unidad}. ¿Querías escribir ${sugerencia}?`
      : `${meta.etiqueta} debe estar entre ${meta.min} y ${meta.max} ${meta.unidad}.`,
    sugerencia,
  };
}

/**
 * Nivel 2 — ADVIERTE, pero deja pasar.
 *
 * Un salto grande frente a la evaluación anterior. Un atleta PUEDE perder 12 kg
 * en seis meses, y una herramienta que se lo discute al entrenador se abandona
 * el primer día. Solo se pregunta si está seguro.
 */
export function compararConAnterior(
  campo: CampoMedida,
  valor: number | null,
  anterior: number | null | undefined,
  fechaAnterior?: string | null,
): Aviso | null {
  if (valor === null || anterior === null || anterior === undefined) return null;
  if (Number.isNaN(valor) || anterior === 0) return null;

  const meta = CAMPOS[campo];
  const diferencia = valor - anterior;
  const absoluta = Math.abs(diferencia);

  const superaAbsoluto = meta.saltoAbsoluto !== undefined && absoluta > meta.saltoAbsoluto;
  const superaRelativo =
    meta.saltoRelativo !== undefined && absoluta / anterior > meta.saltoRelativo;

  if (!superaAbsoluto && !superaRelativo) return null;

  const verbo = diferencia > 0 ? "subió" : "bajó";
  const cantidad = Number(absoluta.toFixed(1));
  const desde = fechaAnterior ? ` desde ${fechaAnterior}` : " desde la última evaluación";

  return {
    nivel: "advierte",
    mensaje: `${meta.etiqueta} ${verbo} ${cantidad} ${meta.unidad}${desde}. ¿Es correcto?`,
  };
}

/** Los dos niveles juntos. El que bloquea manda. */
export function revisarCampo(
  campo: CampoMedida,
  valor: number | null,
  anterior?: number | null,
  fechaAnterior?: string | null,
): Aviso | null {
  return validarRango(campo, valor) ?? compararConAnterior(campo, valor, anterior, fechaAnterior);
}

/** Convierte lo tecleado a número. Acepta coma decimal: es lo que se teclea aquí. */
export function aNumero(texto: string): number | null {
  const limpio = texto.replace(",", ".").trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Qué falta para poder calcular el porcentaje graso. */
export function faltantesParaCalculo(valores: Partial<Record<CampoMedida, number | null>>): string[] {
  const faltan: string[] = [];

  const sinPliegue = PLIEGUES.filter((p) => valores[p] === null || valores[p] === undefined);
  if (sinPliegue.length > 0) {
    faltan.push(
      sinPliegue.length === 1
        ? `el pliegue ${CAMPOS[sinPliegue[0]].etiqueta.toLowerCase()}`
        : `${sinPliegue.length} pliegues`,
    );
  }

  if (valores.weight_kg === null || valores.weight_kg === undefined) faltan.push("el peso");
  if (valores.height_cm === null || valores.height_cm === undefined) faltan.push("la estatura");

  return faltan;
}
