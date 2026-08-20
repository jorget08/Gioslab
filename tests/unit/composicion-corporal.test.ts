import { describe, expect, it } from "vitest";

import {
  calcularComposicion,
  densidadCorporal,
  imc,
  porcentajeGraso,
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
    expect(suma7Pliegues(MARIA) - suma6Pliegues(MARIA)).toBe(MARIA.chest_mm);
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

describe("cadena completa del caso María Fernanda", () => {
  const r = calcularComposicion({
    pliegues: MARIA,
    pesoKg: MARIA_PESO,
    estaturaCm: MARIA_ESTATURA,
    edadAnios: MARIA_EDAD,
    sexo: "femenino",
  });

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
