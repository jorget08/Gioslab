/**
 * Módulo FEMTECH — adaptación por fase del ciclo menstrual.
 *
 * Traducción de las fórmulas de la sección 5 de la ficha de Giovanni.
 *
 * Nada de esto se guarda en la base: depende de la fecha de hoy, así que se
 * calcula al vuelo desde el último registro de ciclo (CLAUDE.md §3.4).
 */

export type FaseMenstrual =
  | "Anticonceptivo"
  | "Folicular Temprana"
  | "Folicular Tardía"
  | "Ovulatoria"
  | "Lútea Tardía";

export interface RegistroCiclo {
  /** Día 1 del último sangrado. */
  ultimaMenstruacion: Date;
  duracionCicloDias: number;
  usaAnticonceptivos: boolean;
}

const MS_POR_DIA = 86_400_000;

/**
 * Día actual dentro del ciclo: MOD(hoy − FUM, duración).
 *
 * Se compara a mediodía UTC para que el cambio de día no dependa de la hora ni
 * del horario de verano: en Bogotá una evaluación a las 7 p.m. no debe caer en
 * el día siguiente.
 */
export function diaDelCiclo(registro: RegistroCiclo, hoy: Date = new Date()): number {
  const aMediodiaUTC = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12);

  const dias = Math.floor(
    (aMediodiaUTC(hoy) - aMediodiaUTC(registro.ultimaMenstruacion)) / MS_POR_DIA,
  );

  // El resto en JavaScript conserva el signo del dividendo; se normaliza para
  // que una fecha futura no devuelva un día negativo.
  const d = registro.duracionCicloDias;
  return ((dias % d) + d) % d;
}

/**
 * Fase según el día del ciclo.
 *
 *   ≤ 5   Folicular Temprana
 *   ≤ 13  Folicular Tardía
 *   ≤ 16  Ovulatoria
 *   resto Lútea Tardía
 *
 * Los anticonceptivos hormonales tienen prioridad sobre todo lo demás: aplanan
 * la variación hormonal, así que las reglas de fase no proceden.
 */
export function faseMenstrual(registro: RegistroCiclo, hoy: Date = new Date()): FaseMenstrual {
  if (registro.usaAnticonceptivos) return "Anticonceptivo";

  const dia = diaDelCiclo(registro, hoy);
  if (dia <= 5) return "Folicular Temprana";
  if (dia <= 13) return "Folicular Tardía";
  if (dia <= 16) return "Ovulatoria";
  return "Lútea Tardía";
}

/**
 * Multiplicador de volumen de entrenamiento.
 * Folicular Tardía 1.1× · Lútea Tardía 0.8× · resto 1.0×
 */
export function multiplicadorVolumen(fase: FaseMenstrual): number {
  if (fase === "Folicular Tardía") return 1.1;
  if (fase === "Lútea Tardía") return 0.8;
  return 1;
}

/**
 * Ajuste biomecánico. En la fase ovulatoria la laxitud ligamentosa aumenta, y
 * su método prioriza máquinas para reducir la exigencia de estabilización.
 */
export function ajusteBiomecanico(fase: FaseMenstrual): string {
  return fase === "Ovulatoria"
    ? "Priorizar Máquinas (Laxitud)"
    : "Estándar por Palancas";
}

/**
 * Qué pasa en el cuerpo y qué hace el método al respecto.
 *
 * Del módulo de fisiología femenina que Giovanni entregó aparte. Hasta ahora
 * solo guardábamos el multiplicador de volumen, que es la parte automatizable,
 * pero el número por sí solo no le dice nada al entrenador: "×0.8" no explica
 * por qué su atleta rinde menos esta semana.
 *
 * Esto es §3.6 aplicado al módulo FEMTECH: si el sistema recorta el volumen un
 * 20%, tiene que poder decir por qué.
 */
export interface PrescripcionFase {
  /** Lo que está ocurriendo fisiológicamente. */
  efecto: string;
  /** Lo que el método hace en consecuencia. */
  ajuste: string;
  /** Días del ciclo que abarca, para situar al entrenador. */
  rango: string;
}

export const PRESCRIPCION_FASE: Record<FaseMenstrual, PrescripcionFase> = {
  "Folicular Temprana": {
    rango: "días 1 a 5",
    efecto: "Inflamación, posible molestia abdominal y variabilidad de energía.",
    ajuste:
      "Volumen moderado. Autorregulación opcional en ejercicios con alta presión intraabdominal, como la sentadilla libre.",
  },
  "Folicular Tardía": {
    rango: "días 6 a 13",
    efecto: "Pico de estrógenos, máxima fuerza y mayor tolerancia al volumen.",
    ajuste:
      "Fase de sobrecarga progresiva: priorizar RIR 1-0 y buscar récords de carga en multiarticulares.",
  },
  Ovulatoria: {
    rango: "días 14 a 16",
    efecto: "Fuerza en su punto máximo, pero mayor laxitud ligamentosa por la relaxina.",
    ajuste:
      "Priorizar estabilidad biomecánica: preferir variantes en máquina o con apoyo guiado para proteger la articulación.",
  },
  "Lútea Tardía": {
    rango: "días 17 al final",
    efecto: "Aumento de progesterona, fatiga central y menor tolerancia al esfuerzo.",
    ajuste:
      "Reducir el volumen total de series entre un 20% y un 30%, o programar una semana de descarga.",
  },
  Anticonceptivo: {
    rango: "todo el ciclo",
    efecto:
      "El anticonceptivo hormonal aplana la fluctuación de estrógenos y progesterona.",
    ajuste: "Volumen plano, sin ajuste por fase.",
  },
};

/**
 * Duración del ciclo.
 *
 * Dos niveles, igual que las medidas antropométricas: su módulo especifica
 * "editable de 21 a 35", pero un ciclo irregular de 38 días existe y bloquearlo
 * dejaría a esa atleta fuera del módulo. Fuera de 21-45 sí es un error de
 * digitación, y ahí coincide con el CHECK de la tabla.
 */
export const DURACION_CICLO = { min: 21, max: 45, normalMin: 21, normalMax: 35, defecto: 28 };

export function avisoDuracionCiclo(dias: number): { nivel: "bloquea" | "advierte"; mensaje: string } | null {
  if (dias < DURACION_CICLO.min || dias > DURACION_CICLO.max) {
    return {
      nivel: "bloquea",
      mensaje: `La duración debe estar entre ${DURACION_CICLO.min} y ${DURACION_CICLO.max} días.`,
    };
  }
  if (dias < DURACION_CICLO.normalMin || dias > DURACION_CICLO.normalMax) {
    return {
      nivel: "advierte",
      mensaje: `Lo habitual es entre ${DURACION_CICLO.normalMin} y ${DURACION_CICLO.normalMax} días. Confirma que es correcto.`,
    };
  }
  return null;
}

export interface AdaptacionCiclo {
  diaDelCiclo: number;
  fase: FaseMenstrual;
  multiplicadorVolumen: number;
  ajusteBiomecanico: string;
  prescripcion: PrescripcionFase;
}

export function adaptacionPorCiclo(
  registro: RegistroCiclo,
  hoy: Date = new Date(),
): AdaptacionCiclo {
  const fase = faseMenstrual(registro, hoy);
  return {
    diaDelCiclo: diaDelCiclo(registro, hoy),
    fase,
    multiplicadorVolumen: multiplicadorVolumen(fase),
    ajusteBiomecanico: ajusteBiomecanico(fase),
    prescripcion: PRESCRIPCION_FASE[fase],
  };
}
