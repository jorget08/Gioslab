import { describe, expect, it } from "vitest";

import {
  calcularComposicion,
  densidadCorporal,
  imc,
  porcentajeGraso,
  porcentajeGrasoYuhasz,
  ratioCinturaCadera,
  suma6Pliegues,
  suma7Pliegues,
  type Pliegues,
} from "@/domain/calculations/composicion-corporal";

/**
 * GOLDEN TESTS contra el Excel de Giovanni.
 *
 * Caso: María Fernanda Gómez, la atleta de ejemplo de
 * `Ficha_1.1jorgehernanAntropometrica_Automatizada_GiosLab_v2.xlsx`.
 * Los valores esperados son los que calcula su hoja, leídos celda a celda.
 *
 * Si uno de estos falla, el Excel tiene la razón hasta que Giovanni diga lo
 * contrario (CLAUDE.md §3.4).
 */
const MARIA: Pliegues = {
  triceps_mm: 12,
  subscapular_mm: 10,
  suprailiac_mm: 14,
  abdominal_mm: 16,
  thigh_mm: 18,
  calf_mm: 8,
  chest_mm: 6,
};

const MARIA_PESO = 62.5;
const MARIA_ESTATURA = 165;
const MARIA_EDAD = 30;

describe("sumatorias de pliegues", () => {
  it("suma de 6 (ISAK) = 78 mm, como en la celda E33", () => {
    expect(suma6Pliegues(MARIA)).toBe(78);
  });

  it("suma de 7 = 84 mm, como en la celda E34", () => {
    expect(suma7Pliegues(MARIA)).toBe(84);
  });

  it("la de 6 excluye el pectoral: es la única diferencia", () => {
    expect(suma7Pliegues(MARIA)! - suma6Pliegues(MARIA)).toBe(MARIA.chest_mm);
  });

  it("sin pectoral no hay suma de 7, y se dice", () => {
    // Sus fichas reales no lo miden. Devolver la suma de 6 disfrazada de 7 daría
    // un porcentaje graso plausible y falso.
    const { chest_mm, ...sinPectoral } = MARIA;
    void chest_mm;
    expect(suma7Pliegues(sinPectoral)).toBeNull();
    expect(suma6Pliegues(sinPectoral)).toBe(78);
  });
});

describe("densidad corporal (Jackson & Pollock 7 pliegues)", () => {
  it("mujer de 30 años con suma 84 → 1.05764732 (celda E38)", () => {
    expect(densidadCorporal(84, 30, "femenino")).toBeCloseTo(1.05764732, 8);
  });

  it("usa una constante distinta según el sexo", () => {
    const f = densidadCorporal(84, 30, "femenino");
    const m = densidadCorporal(84, 30, "masculino");
    expect(m).not.toBeCloseTo(f, 4);
    // A igualdad de pliegues, la fórmula masculina da más densidad, o sea
    // menos grasa estimada.
    expect(m).toBeGreaterThan(f);
  });

  it("a más pliegues, menos densidad", () => {
    expect(densidadCorporal(120, 30, "femenino")).toBeLessThan(
      densidadCorporal(84, 30, "femenino"),
    );
  });

  it("la edad entra en la fórmula y baja la densidad", () => {
    expect(densidadCorporal(84, 50, "femenino")).toBeLessThan(
      densidadCorporal(84, 20, "femenino"),
    );
  });
});

describe("porcentaje graso (Siri)", () => {
  it("densidad 1.05764732 → 18.02 % (celda E39)", () => {
    expect(porcentajeGraso(1.05764732)).toBeCloseTo(18.019906673615882, 6);
  });
});

describe("cadena completa del caso María Fernanda (Jackson & Pollock)", () => {
  // Se pide J&P explícitamente: es el caso de su ficha "para el desarrollador",
  // no el método que usa con clientes. Por defecto el cálculo ya es Yuhasz.
  const r = calcularComposicion({
    pliegues: MARIA,
    pesoKg: MARIA_PESO,
    estaturaCm: MARIA_ESTATURA,
    edadAnios: MARIA_EDAD,
    sexo: "femenino",
    metodo: "jackson-pollock",
  });

  it("usa el método que se le pidió", () => expect(r.metodo).toBe("jackson-pollock"));
  it("suma de 7 = 84", () => expect(r.suma7).toBe(84));
  it("porcentaje graso = 18.0", () => expect(r.porcentajeGraso).toBe(18));
  it("masa grasa = 11.3 kg (celda E40: 11.262…)", () => expect(r.masaGrasaKg).toBe(11.3));
  it("masa magra = 51.2 kg (celda E41: 51.237…)", () => expect(r.masaMagraKg).toBe(51.2));
  it("IMC = 23.0 (celda E14: 22.956…)", () => expect(r.imc).toBe(23));

  it("masa grasa + masa magra reconstruyen el peso", () => {
    expect(r.masaGrasaKg + r.masaMagraKg).toBeCloseTo(MARIA_PESO, 1);
  });
});

describe("IMC y ratio cintura/cadera", () => {
  it("62.5 kg y 165 cm → 23.0", () => {
    expect(imc(62.5, 165)).toBe(23);
  });

  it("cintura 68 / cadera 96 → 0.708 (celda E20)", () => {
    expect(ratioCinturaCadera(68, 96)).toBe(0.708);
  });

  it("el umbral de riesgo femenino de su ficha es 0.85", () => {
    // La interpretación es una regla del motor, no del cálculo; aquí solo se
    // fija que el valor cae del lado correcto para este caso.
    expect(ratioCinturaCadera(68, 96)).toBeLessThan(0.85);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN TESTS con atletas REALES (tarea 3.4)
// ---------------------------------------------------------------------------
//
// Dos personas a las que Giovanni entrena de verdad. Las fichas y los planes que
// les entregó llegaron el 2026-08-27; los valores esperados están leídos de la
// celda del Excel y del PDF que tienen en la mano.
//
// Estos son los que mandan. Si uno falla, el Excel tiene la razón (§3.4).

describe("golden · Diego Mafla, 41 años (ficha real, Yuhasz)", () => {
  const DIEGO: Pliegues = {
    triceps_mm: 14,
    subscapular_mm: 21,
    suprailiac_mm: 17,
    abdominal_mm: 26,
    thigh_mm: 18,
    calf_mm: 10,
    // Su ficha real NO mide el pectoral. Por eso Jackson & Pollock no se puede
    // calcular sobre él, y por eso el método por defecto es Yuhasz.
  };

  const r = calcularComposicion({
    pliegues: DIEGO,
    pesoKg: 80,
    estaturaCm: 175,
    edadAnios: 41,
    sexo: "masculino",
  });

  it("cae a Yuhasz porque no hay con qué hacer Jackson & Pollock", () => {
    expect(r.metodo).toBe("yuhasz");
    expect(r.suma7).toBeNull();
    expect(r.densidad).toBeNull();
  });

  it("Σ6 = 106 mm (celda B16)", () => expect(r.suma6).toBe(106));

  it("% graso = 13.7 (celda E11: 13.7256)", () => {
    expect(porcentajeGrasoYuhasz(106, "masculino")).toBeCloseTo(13.7256, 4);
    expect(r.porcentajeGraso).toBe(13.7);
  });

  it("masa grasa = 11.0 kg (celda E12: 10.98048)", () => expect(r.masaGrasaKg).toBe(11));
  it("masa magra = 69.0 kg (celda E13: 69.01952)", () => expect(r.masaMagraKg).toBe(69));

  it("su plan impreso dice 13.73% y 69.02 kg magros", () => {
    // Lo que el cliente tiene en la mano. Con la fórmula exacta, sin redondear.
    const pct = porcentajeGrasoYuhasz(106, "masculino");
    expect(Number(pct.toFixed(2))).toBe(13.73);
    expect(Number((80 - 80 * (pct / 100)).toFixed(2))).toBe(69.02);
  });
});

describe("golden · Daniela Méndez, 33 años (ficha real, Yuhasz)", () => {
  const DANIELA: Pliegues = {
    triceps_mm: 22,
    subscapular_mm: 38,
    suprailiac_mm: 9,
    abdominal_mm: 12,
    thigh_mm: 40,
    calf_mm: 24,
  };

  const r = calcularComposicion({
    pliegues: DANIELA,
    pesoKg: 79,
    estaturaCm: 165,
    edadAnios: 33,
    sexo: "femenino",
  });

  it("Σ6 = 145 mm (celda B16)", () => expect(r.suma6).toBe(145));

  it("% graso = 26.0 (celda E11: 26.026)", () => {
    expect(porcentajeGrasoYuhasz(145, "femenino")).toBeCloseTo(26.026, 3);
    expect(r.porcentajeGraso).toBe(26);
  });

  it("masa grasa = 20.6 kg (celda E12: 20.56054)", () => expect(r.masaGrasaKg).toBe(20.6));
  it("masa magra = 58.4 kg (celda E13: 58.43946)", () => expect(r.masaMagraKg).toBe(58.4));

  it("su plan v2, con otra toma, da 27.57% y 56.5 kg magros", () => {
    // Σ6 = 155 y 78 kg. Es una medición posterior a la de la ficha; sirve como
    // segundo caso femenino y confirma que la constante no depende del peso.
    const pct = porcentajeGrasoYuhasz(155, "femenino");
    expect(Number(pct.toFixed(2))).toBe(27.57);
    expect(Number((78 - 78 * (pct / 100)).toFixed(1))).toBe(56.5);
  });
});

describe("las dos constantes de Yuhasz son distintas por sexo", () => {
  it("con la misma suma, la mujer sale más alta", () => {
    // Es lo que dice su IF(B5="H"…, IF(B5="M"…): 0.1051/2.585 contra 0.1548/3.58.
    expect(porcentajeGrasoYuhasz(120, "femenino")).toBeGreaterThan(
      porcentajeGrasoYuhasz(120, "masculino"),
    );
  });

  it("una suma de cero devuelve la constante independiente", () => {
    expect(porcentajeGrasoYuhasz(0, "masculino")).toBeCloseTo(2.585, 6);
    expect(porcentajeGrasoYuhasz(0, "femenino")).toBeCloseTo(3.58, 6);
  });
});
