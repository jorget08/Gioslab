/**
 * Composición corporal — método de Giovanni.
 *
 * Traducción literal de las fórmulas de
 * `fuentes-giovanni/Ficha_1.1jorgehernan...xlsx`. Ver docs/ESPECIFICACION-FICHAS.md.
 *
 * NO es Heath-Carter: es Jackson & Pollock de 7 pliegues para la densidad y la
 * ecuación de Siri para el porcentaje graso.
 *
 * Funciones puras, sin dependencias de React, Next ni Supabase (CLAUDE.md §3.4).
 * Si un resultado no coincide con su Excel, el Excel tiene la razón.
 */

export type Sexo = "masculino" | "femenino";

export interface Pliegues {
  triceps_mm: number;
  subscapular_mm: number;
  suprailiac_mm: number;
  abdominal_mm: number;
  thigh_mm: number;
  calf_mm: number;
  chest_mm: number;
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

/** Suma de 7 pliegues: los 6 de ISAK más el pectoral. Es la que alimenta J&P. */
export function suma7Pliegues(p: Pliegues): number {
  return redondear(suma6Pliegues(p) + p.chest_mm, 1);
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
  suma6: number;
  suma7: number;
  densidad: number;
  porcentajeGraso: number;
  masaGrasaKg: number;
  masaMagraKg: number;
  imc: number;
}

/** Cadena completa, en el mismo orden que su hoja de cálculo. */
export function calcularComposicion(args: {
  pliegues: Pliegues;
  pesoKg: number;
  estaturaCm: number;
  edadAnios: number;
  sexo: Sexo;
}): ComposicionCorporal {
  const suma6 = suma6Pliegues(args.pliegues);
  const suma7 = suma7Pliegues(args.pliegues);
  const densidad = densidadCorporal(suma7, args.edadAnios, args.sexo);
  const pct = porcentajeGraso(densidad);
  const grasa = masaGrasaKg(args.pesoKg, pct);

  return {
    suma6,
    suma7,
    densidad: redondear(densidad, 5),
    porcentajeGraso: redondear(pct, 1),
    masaGrasaKg: grasa,
    masaMagraKg: masaMagraKg(args.pesoKg, grasa),
    imc: imc(args.pesoKg, args.estaturaCm),
  };
}
