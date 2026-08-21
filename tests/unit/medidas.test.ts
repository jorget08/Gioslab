import { describe, expect, it } from "vitest";

import {
  aNumero,
  CAMPOS,
  compararConAnterior,
  faltantesParaCalculo,
  PLIEGUES,
  revisarCampo,
  validarRango,
} from "@/domain/medidas";

describe("los rangos coinciden con los CHECK de la base", () => {
  // Si divergen, la app deja escribir algo que la base rechaza al guardar y el
  // entrenador pierde el trabajo al final en vez de al principio.
  it.each([
    ["height_cm", 100, 260],
    ["weight_kg", 20, 400],
    ["triceps_mm", 1, 100],
    ["waist_cm", 40, 200],
    ["hip_cm", 40, 200],
  ] as const)("%s: %i a %i", (campo, min, max) => {
    expect(CAMPOS[campo].min).toBe(min);
    expect(CAMPOS[campo].max).toBe(max);
  });

  it("son 7 pliegues, en el orden del protocolo", () => {
    expect(PLIEGUES).toEqual([
      "triceps_mm", "subscapular_mm", "suprailiac_mm",
      "abdominal_mm", "thigh_mm", "calf_mm", "chest_mm",
    ]);
  });
});

describe("nivel 1 — bloquea solo lo imposible", () => {
  it("acepta valores normales", () => {
    expect(validarRango("height_cm", 165)).toBeNull();
    expect(validarRango("weight_kg", 62.5)).toBeNull();
  });

  it("acepta los extremos exactos del rango", () => {
    expect(validarRango("height_cm", 100)).toBeNull();
    expect(validarRango("height_cm", 260)).toBeNull();
  });

  it("PROPONE la corrección: 1750 → 175", () => {
    // Decir solo "valor inválido" deja al entrenador adivinando qué pasó.
    const a = validarRango("height_cm", 1750);
    expect(a?.nivel).toBe("bloquea");
    expect(a?.sugerencia).toBe(175);
    expect(a?.mensaje).toMatch(/¿Querías escribir 175\?/);
  });

  it("también al revés: 17 kg → 170", () => {
    const a = validarRango("height_cm", 17);
    expect(a?.sugerencia).toBe(170);
  });

  it("no inventa una sugerencia cuando no la hay", () => {
    const a = validarRango("height_cm", 99999);
    expect(a?.nivel).toBe("bloquea");
    expect(a?.sugerencia).toBeUndefined();
    expect(a?.mensaje).toMatch(/entre 100 y 260/);
  });

  it("un campo vacío no es un error", () => {
    expect(validarRango("weight_kg", null)).toBeNull();
  });
});

describe("nivel 2 — advierte pero DEJA PASAR", () => {
  it("12 kg menos avisa, no bloquea", () => {
    // Un atleta puede perderlos. Si la app se lo discute, vuelve al Excel.
    const a = compararConAnterior("weight_kg", 61, 73, "marzo");
    expect(a?.nivel).toBe("advierte");
    expect(a?.mensaje).toMatch(/bajó 12 kg desde marzo/);
    expect(a?.mensaje).toMatch(/¿Es correcto\?/);
  });

  it("una variación normal no dice nada", () => {
    expect(compararConAnterior("weight_kg", 63, 62.5)).toBeNull();
  });

  it("la estatura salta con 2 cm, que es mucho en un adulto", () => {
    expect(compararConAnterior("height_cm", 168, 165)).not.toBeNull();
    expect(compararConAnterior("height_cm", 166, 165)).toBeNull();
  });

  it("sin medición anterior no hay con qué comparar", () => {
    expect(compararConAnterior("weight_kg", 61, null)).toBeNull();
    expect(compararConAnterior("weight_kg", 61, undefined)).toBeNull();
  });

  it("distingue subir de bajar", () => {
    expect(compararConAnterior("weight_kg", 80, 62)?.mensaje).toMatch(/subió/);
    expect(compararConAnterior("weight_kg", 50, 62)?.mensaje).toMatch(/bajó/);
  });
});

describe("revisarCampo — el que bloquea manda", () => {
  it("ante un imposible, no se molesta en comparar", () => {
    const a = revisarCampo("height_cm", 1750, 165);
    expect(a?.nivel).toBe("bloquea");
  });

  it("si el valor es posible, compara con el anterior", () => {
    expect(revisarCampo("weight_kg", 61, 73)?.nivel).toBe("advierte");
  });

  it("valor normal y sin salto: ni una cosa ni la otra", () => {
    expect(revisarCampo("weight_kg", 62, 62.5)).toBeNull();
  });
});

describe("aNumero", () => {
  it("acepta coma decimal, que es lo que se teclea aquí", () => {
    expect(aNumero("12,5")).toBe(12.5);
    expect(aNumero("12.5")).toBe(12.5);
  });

  it("vacío es vacío, no cero", () => {
    // Un 0 se guardaría como medición real; vacío significa "sin medir".
    expect(aNumero("")).toBeNull();
    expect(aNumero("   ")).toBeNull();
  });

  it("descarta lo que no es número", () => {
    expect(aNumero("abc")).toBeNull();
  });
});

describe("faltantesParaCalculo", () => {
  const completo = Object.fromEntries(
    [...PLIEGUES, "weight_kg", "height_cm"].map((c) => [c, 10]),
  );

  it("con todo, no falta nada", () => {
    expect(faltantesParaCalculo(completo)).toEqual([]);
  });

  it("nombra el pliegue cuando falta uno solo", () => {
    const { thigh_mm, ...resto } = completo;
    void thigh_mm;
    expect(faltantesParaCalculo(resto)).toEqual(["el pliegue muslo"]);
  });

  it("cuenta cuando faltan varios", () => {
    const parcial = { triceps_mm: 12, weight_kg: 62, height_cm: 165 };
    expect(faltantesParaCalculo(parcial)).toEqual(["6 pliegues"]);
  });

  it("también avisa del peso y la estatura", () => {
    const soloPliegues = Object.fromEntries(PLIEGUES.map((c) => [c, 10]));
    expect(faltantesParaCalculo(soloPliegues)).toEqual(["el peso", "la estatura"]);
  });
});
