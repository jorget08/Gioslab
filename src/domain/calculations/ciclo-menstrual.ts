/**
 * Módulo FEMTECH — adaptación por fase del ciclo menstrual.
 *
 * Traducción de sus fórmulas. Los cortes de fase y los multiplicadores salen de
 * su matriz de condicionales (2026-08-25), que es posterior y más precisa que el
 * documento de fisiología femenina con el que se construyó esto al principio.
 *
 * Nada de esto se guarda en la base: depende de la fecha de hoy, así que se
 * calcula al vuelo desde el último registro de ciclo (CLAUDE.md §3.4).
 */

/**
 * Cuatro fases endocrinas, no cinco.
 *
 * "Ovulatoria" desapareció como fase en la matriz de Giovanni: queda absorbida
 * por Folicular Tardía, que ahora llega hasta el día 14. Al preguntarle si eso
 * enterraba su regla de laxitud ligamentosa respondió que no —"no se cayó, se
 * convierte en un submódulo de seguridad dentro de la Folicular Tardía"—, así
 * que el pico ovulatorio vive ahora como BANDERA y no como fase. Ver
 * `picoOvulatorio`.
 */
export type FaseMenstrual =
  | "Anticonceptivo"
  | "Folicular Temprana"
  | "Folicular Tardía"
  | "Lútea Temprana"
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
 * Fase según el día del ciclo, con los cortes de su matriz.
 *
 *   ≤ 5   Folicular Temprana
 *   ≤ 14  Folicular Tardía   (absorbe la ovulación)
 *   ≤ 22  Lútea Temprana
 *   resto Lútea Tardía
 *
 * Los anticonceptivos hormonales tienen prioridad sobre todo lo demás: aplanan
 * la variación hormonal, así que las reglas de fase no proceden.
 */
export function faseMenstrual(registro: RegistroCiclo, hoy: Date = new Date()): FaseMenstrual {
  if (registro.usaAnticonceptivos) return "Anticonceptivo";

  const dia = diaDelCiclo(registro, hoy);
  if (dia <= 5) return "Folicular Temprana";
  if (dia <= 14) return "Folicular Tardía";
  if (dia <= 22) return "Lútea Temprana";
  return "Lútea Tardía";
}

/**
 * ¿Está en el pico ovulatorio?
 *
 * Es una BANDERA dentro de Folicular Tardía, no una fase. La diferencia importa:
 * la fase gestiona volumen metabólico y esto es una regla de SEGURIDAD
 * ARTICULAR. Durante el pico de estrógenos y el aumento de relaxina sube la
 * laxitud del ligamento cruzado anterior, así que se prioriza cadena cinética
 * cerrada y se restringe el impacto.
 *
 * Días 12 a 14, los que él fijó para un ciclo estándar. NO se escala con la
 * duración del ciclo a propósito: sus cortes de fase también son días fijos, y
 * escalar solo esto los dejaría en desacuerdo. Para ciclos por encima de 35 días
 * él mismo dijo que el ajuste va por RIR/RPE y no por calendario.
 */
export function picoOvulatorio(registro: RegistroCiclo, hoy: Date = new Date()): boolean {
  if (registro.usaAnticonceptivos) return false;
  const dia = diaDelCiclo(registro, hoy);
  return dia >= 12 && dia <= 14;
}

/**
 * Multiplicador de volumen de entrenamiento, según su matriz.
 *
 *   Folicular Tardía  1.15×   (él da 110–120 %; su pseudocódigo usa 1.15)
 *   Lútea Tardía      0.75×   (da −25/−30 %; su pseudocódigo usa 0.75)
 *   resto             1.00×
 *
 * Antes eran 1.1 y 0.8, de su documento de fisiología femenina. La matriz es
 * posterior y más precisa, así que manda.
 */
export function multiplicadorVolumen(fase: FaseMenstrual): number {
  if (fase === "Folicular Tardía") return 1.15;
  if (fase === "Lútea Tardía") return 0.75;
  return 1;
}

/**
 * Ajuste biomecánico. Depende del PICO ovulatorio, no de la fase: es la regla
 * de seguridad articular que Giovanni conservó como submódulo.
 */
export function ajusteBiomecanico(pico: boolean): string {
  return pico ? "Priorizar Máquinas (Laxitud)" : "Estándar por Palancas";
}

/**
 * Qué pasa en el cuerpo y qué hace el método al respecto.
 *
 * Del módulo de fisiología femenina que Giovanni entregó aparte. Hasta ahora
 * solo guardábamos el multiplicador de volumen, que es la parte automatizable,
 * pero el número por sí solo no le dice nada al entrenador: "×0.75" no explica
 * por qué su atleta rinde menos esta semana.
 *
 * Esto es §3.6 aplicado al módulo FEMTECH: si el sistema recorta el volumen un
 * 25%, tiene que poder decir por qué.
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
    rango: "días 6 a 14",
    efecto: "Pico de estrógenos, máxima fuerza y mayor tolerancia al volumen.",
    ajuste:
      "Fase de sobrecarga progresiva: priorizar RIR 1-0 y buscar récords de carga en multiarticulares.",
  },
  "Lútea Temprana": {
    rango: "días 15 a 22",
    efecto: "Progesterona elevada.",
    ajuste: "Volumen de mantenimiento activo, con RIR 1-2.",
  },
  "Lútea Tardía": {
    rango: "días 23 al final",
    efecto: "Aumento de progesterona, fatiga central y menor tolerancia al esfuerzo.",
    ajuste:
      "Reducir el volumen total de series entre un 25% y un 30%, o programar una semana de descarga.",
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
  /** Bandera de seguridad articular, no una fase. Ver `picoOvulatorio`. */
  picoOvulatorio: boolean;
}

export function adaptacionPorCiclo(
  registro: RegistroCiclo,
  hoy: Date = new Date(),
): AdaptacionCiclo {
  const fase = faseMenstrual(registro, hoy);
  const pico = picoOvulatorio(registro, hoy);
  return {
    diaDelCiclo: diaDelCiclo(registro, hoy),
    fase,
    multiplicadorVolumen: multiplicadorVolumen(fase),
    ajusteBiomecanico: ajusteBiomecanico(pico),
    prescripcion: PRESCRIPCION_FASE[fase],
    picoOvulatorio: pico,
  };
}
