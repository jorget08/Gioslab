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

export interface AdaptacionCiclo {
  diaDelCiclo: number;
  fase: FaseMenstrual;
  multiplicadorVolumen: number;
  ajusteBiomecanico: string;
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
  };
}
