import { describe, expect, it } from "vitest";

import {
  CLASES_SEGMENTO,
  describirProporcion,
  IMPLICACION_FEMUR,
  interpretarProporcion,
} from "@/domain/segmentos";

describe("catálogo de segmentos", () => {
  it("son las tres opciones de la ficha de Giovanni", () => {
    expect(CLASES_SEGMENTO).toEqual(["Corto", "Promedio", "Largo"]);
  });

  it("guarda el valor limpio, sin la implicación mecánica dentro", () => {
    // El flujograma escribe "Largo (Favor Hack/Prensa)". Meter eso en el dato
    // obligaría al motor a parsear texto para saber si el fémur es largo.
    for (const c of CLASES_SEGMENTO) {
      expect(c).not.toMatch(/[()]/);
    }
  });

  it("cada clase tiene su orientación para el entrenador", () => {
    expect(IMPLICACION_FEMUR.Largo).toMatch(/hack|prensa/i);
    expect(IMPLICACION_FEMUR.Corto).toMatch(/libre/i);
  });
});

describe("describirProporcion", () => {
  it("combina las dos clases tal como las nombra la ficha", () => {
    expect(describirProporcion("Largo", "Corto")).toBe("Fémur Largo / Torso Corto");
  });

  it("sin las dos, no describe nada", () => {
    expect(describirProporcion("Largo", undefined)).toBeNull();
    expect(describirProporcion(undefined, "Corto")).toBeNull();
  });

  it("cubre las nueve combinaciones sin fallar", () => {
    for (const f of CLASES_SEGMENTO) {
      for (const t of CLASES_SEGMENTO) {
        expect(describirProporcion(f, t)).toBe(`Fémur ${f} / Torso ${t}`);
      }
    }
  });
});

describe("interpretarProporcion", () => {
  it("devuelve la única interpretación que Giovanni documentó", () => {
    expect(interpretarProporcion("Fémur Largo / Torso Corto")).toBe("Inclinación Alta");
  });

  it("NO se inventa las que no conoce", () => {
    // Rellenar el hueco con algo verosímil sería inventar el método. Ocho de
    // las nueve combinaciones están sin definir y así deben quedarse hasta que
    // él las dé.
    expect(interpretarProporcion("Fémur Corto / Torso Largo")).toBeNull();
    expect(interpretarProporcion("Fémur Promedio / Torso Promedio")).toBeNull();
  });

  it("tolera que no haya proporción", () => {
    expect(interpretarProporcion(null)).toBeNull();
  });
});
