/**
 * Composición corporal — método de Giovanni.
 *
 * ===========================================================================
 * DOS MÉTODOS, Y EL BUENO ES YUHASZ
 * ===========================================================================
 *
 * Su ficha "para el desarrollador" (19-ago) especificaba Jackson & Pollock de 7
 * pliegues + Siri, y eso fue lo primero que se implementó. Pero las fichas que
 * usa DE VERDAD con sus clientes —Diego Mafla y Daniela Méndez, 27-ago— llevan
 * la fórmula escrita en la celda:
 *
 *   IF(sexo="H", (Σ6 × 0.1051) + 2.585,
 *   IF(sexo="M", (Σ6 × 0.1548) + 3.58, "Defina Género"))
 *
 * Eso es Yuhasz sobre SEIS pliegues. Y los PDF que le entrega a sus clientes
 * dicen literalmente "% Grasa (Yuhasz)" con esos números.
 *
 * Manda Yuhasz, por dos motivos:
 *
 *  1. CLAUDE.md §3.4: si el resultado no coincide con su Excel, el Excel tiene
 *     la razón. Y el Excel que importa es el que usa, no el que documentó.
 *  2. Sus fichas reales NO MIDEN EL PLIEGUE PECTORAL. Jackson & Pollock de 7
 *     pliegues no es que dé otro número: es que no se puede calcular sobre un
 *     atleta suyo real.
 *
 * Jackson & Pollock se conserva porque él lo especificó y puede querer volver:
 * la columna `body_fat_pct_source` distingue el origen del dato. Pendiente de
 * que confirme cuál quiere de aquí en adelante (PREGUNTAS-GIOVANNI).
 *
 * Funciones puras, sin dependencias de React, Next ni Supabase (CLAUDE.md §3.4).
 */

export type Sexo = "masculino" | "femenino";

export type MetodoGrasa = "yuhasz" | "jackson-pollock";

export interface Pliegues {
  triceps_mm: number;
  subscapular_mm: number;
  suprailiac_mm: number;
  abdominal_mm: number;
  thigh_mm: number;
  calf_mm: number;
  /**
   * OPCIONAL. Solo lo necesita Jackson & Pollock, y sus fichas reales no lo
   * miden. Exigirlo dejaba el cálculo sin poder ejecutarse sobre un atleta suyo.
   */
  chest_mm?: number | null;
}

/** Redondeo a n decimales sin los sustos binarios de toFixed. */
const redondear = (v: number, decimales: number): number =>
  Math.round((v + Number.EPSILON) * 10 ** decimales) / 10 ** decimales;

/**
 * Suma de 6 pliegues (ISAK): tríceps, subescapular, suprailíaco, abdominal,
 * muslo y pantorrilla. Sin el pectoral.
 */
export function suma6Pliegues(p: Pliegues): number {
  return redondear(
    p.triceps_mm + p.subscapular_mm + p.suprailiac_mm + p.abdominal_mm + p.thigh_mm + p.calf_mm,
    1,
  );
}

/**
 * Suma de 7 pliegues: los 6 de ISAK más el pectoral. Es la que alimenta J&P.
 *
 * `null` cuando no hay pectoral, que es el caso normal en sus fichas. Devolver
 * la suma de 6 disfrazada de 7 daría un porcentaje graso plausible y falso.
 */
export function suma7Pliegues(p: Pliegues): number | null {
  if (p.chest_mm === undefined || p.chest_mm === null) return null;
  return redondear(suma6Pliegues(p) + p.chest_mm, 1);
}

/**
 * Porcentaje graso — Yuhasz sobre la suma de 6 pliegues.
 *
 * Las dos constantes salen literalmente de la celda E11 de sus fichas. No hay
 * paso intermedio por densidad: Yuhasz estima el porcentaje directamente, así
 * que aquí no interviene Siri.
 */
export function porcentajeGrasoYuhasz(suma6: number, sexo: Sexo): number {
  return sexo === "masculino" ? suma6 * 0.1051 + 2.585 : suma6 * 0.1548 + 3.58;
}

/**
 * Densidad corporal — Jackson & Pollock, 7 pliegues.
 *
 * Mujeres: 1.097 − 0.00046971·S + 0.00000056·S² − 0.00012828·edad
 * Hombres: 1.112 − 0.00043499·S + 0.00000055·S² − 0.00028826·edad
 *
 * `edad` en años cumplidos. Su Excel la saca de la cadena "30 años" con
 * LEFT(...,2), que se rompe por debajo de 10 y por encima de 99; aquí se recibe
 * el número directamente.
 */
export function densidadCorporal(sumaPliegues: number, edadAnios: number, sexo: Sexo): number {
  const s = sumaPliegues;
  return sexo === "femenino"
    ? 1.097 - 0.00046971 * s + 0.00000056 * s ** 2 - 0.00012828 * edadAnios
    : 1.112 - 0.00043499 * s + 0.00000055 * s ** 2 - 0.00028826 * edadAnios;
}

/** Porcentaje graso — ecuación de Siri: (4.95/densidad − 4.5) × 100. */
export function porcentajeGraso(densidad: number): number {
  return (4.95 / densidad - 4.5) * 100;
}

export function masaGrasaKg(pesoKg: number, pctGraso: number): number {
  return redondear(pesoKg * (pctGraso / 100), 1);
}

export function masaMagraKg(pesoKg: number, masaGrasa: number): number {
  return redondear(pesoKg - masaGrasa, 1);
}

/** IMC — peso / (estatura en metros)². */
export function imc(pesoKg: number, estaturaCm: number): number {
  return redondear(pesoKg / (estaturaCm / 100) ** 2, 1);
}

/**
 * Ratio cintura/cadera. Su ficha anota "riesgo si > 0.85 en mujeres"; el umbral
 * para hombres no está definido, así que aquí solo se calcula el valor y la
 * interpretación queda para una regla del motor.
 */
export function ratioCinturaCadera(cinturaCm: number, caderaCm: number): number {
  return redondear(cinturaCm / caderaCm, 3);
}

export interface ComposicionCorporal {
  metodo: MetodoGrasa;
  suma6: number;
  /** `null` sin pliegue pectoral, que es lo normal en sus fichas. */
  suma7: number | null;
  /** Solo existe con Jackson & Pollock: Yuhasz no pasa por la densidad. */
  densidad: number | null;
  porcentajeGraso: number;
  masaGrasaKg: number;
  masaMagraKg: number;
  imc: number;
}

/**
 * Cadena completa, en el mismo orden que su hoja de cálculo.
 *
 * Por defecto Yuhasz, que es lo que usa. Si se pide Jackson & Pollock sin
 * pectoral se CAE al método que sí se puede calcular en vez de inventarse el
 * dato que falta, y `metodo` dice cuál se usó de verdad — nunca hay que adivinar
 * de dónde salió el número que se le enseña al entrenador.
 */
export function calcularComposicion(args: {
  pliegues: Pliegues;
  pesoKg: number;
  estaturaCm: number;
  edadAnios: number;
  sexo: Sexo;
  metodo?: MetodoGrasa;
}): ComposicionCorporal {
  const suma6 = suma6Pliegues(args.pliegues);
  const suma7 = suma7Pliegues(args.pliegues);

  const usaJP = args.metodo === "jackson-pollock" && suma7 !== null;
  const densidad = usaJP ? densidadCorporal(suma7, args.edadAnios, args.sexo) : null;
  const pct = densidad !== null ? porcentajeGraso(densidad) : porcentajeGrasoYuhasz(suma6, args.sexo);
  const grasa = masaGrasaKg(args.pesoKg, pct);

  return {
    metodo: usaJP ? "jackson-pollock" : "yuhasz",
    suma6,
    suma7,
    densidad: densidad === null ? null : redondear(densidad, 5),
    porcentajeGraso: redondear(pct, 1),
    masaGrasaKg: grasa,
    masaMagraKg: masaMagraKg(args.pesoKg, grasa),
    imc: imc(args.pesoKg, args.estaturaCm),
  };
}
