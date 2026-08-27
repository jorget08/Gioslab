import { describe, expect, it } from "vitest";

import {
  aNumero,
  CAMPOS,
  compararConAnterior,
  faltantesParaCalculo,
  PLIEGUES,
  revisarCampo,
  validarRango,
  PERIMETROS,
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
    expect(faltantesParaCalculo(parcial)).toEqual(["5 pliegues"]);
  });

  it("también avisa del peso y la estatura", () => {
    const soloPliegues = Object.fromEntries(PLIEGUES.map((c) => [c, 10]));
    expect(faltantesParaCalculo(soloPliegues)).toEqual(["el peso", "la estatura"]);
  });
});

describe("perímetros de extremidades y tronco", () => {
  it("están los cinco que pidió Giovanni, más cintura y cadera", () => {
    // Su justificación: con cintura y cadera no se puede seguir la hipertrofia,
    // solo el riesgo abdominal.
    expect(PERIMETROS).toEqual([
      "waist_cm", "hip_cm", "chest_cm",
      "arm_relaxed_cm", "arm_flexed_cm", "thigh_cm", "calf_cm",
    ]);
  });

  it("todos van en centímetros y tienen sitio de medición", () => {
    // Sin el sitio, dos entrenadores miden el brazo en puntos distintos y la
    // evolución deja de significar nada.
    for (const campo of PERIMETROS) {
      expect(CAMPOS[campo].unidad, campo).toBe("cm");
      expect(CAMPOS[campo].sitio, campo).toBeTruthy();
    }
  });

  it("un brazo no cambia como una cintura: el aviso salta antes", () => {
    // 8% frente al 15% de la cintura. Cuatro centímetros de brazo entre dos
    // evaluaciones es casi siempre un error de tecleo o de punto de medición.
    expect(CAMPOS.arm_flexed_cm.saltoRelativo).toBeLessThan(CAMPOS.waist_cm.saltoRelativo!);
  });

  it("brazo relajado y contraído son campos distintos", () => {
    // La diferencia entre ambos es la que habla de masa contráctil;
    // promediarlos la perdería.
    expect(CAMPOS.arm_relaxed_cm.etiqueta).not.toBe(CAMPOS.arm_flexed_cm.etiqueta);
  });

  it("rechaza lo imposible y propone la corrección", () => {
    const aviso = validarRango("arm_flexed_cm", 300);
    expect(aviso?.nivel).toBe("bloquea");
    expect(aviso?.sugerencia).toBe(30);
  });

  it("los rangos coinciden con los CHECK de la tabla", () => {
    // Si divergen, la app deja escribir algo que la base rechaza al guardar y
    // el entrenador pierde el trabajo al final en vez de al principio.
    expect([CAMPOS.arm_relaxed_cm.min, CAMPOS.arm_relaxed_cm.max]).toEqual([15, 70]);
    expect([CAMPOS.arm_flexed_cm.min, CAMPOS.arm_flexed_cm.max]).toEqual([15, 70]);
    expect([CAMPOS.chest_cm.min, CAMPOS.chest_cm.max]).toEqual([50, 200]);
    expect([CAMPOS.thigh_cm.min, CAMPOS.thigh_cm.max]).toEqual([25, 110]);
    expect([CAMPOS.calf_cm.min, CAMPOS.calf_cm.max]).toEqual([15, 80]);
  });

  it("el pliegue y el perímetro de pantorrilla no se confunden", () => {
    // calf_mm es el pliegue del protocolo ISAK; calf_cm es el contorno.
    expect(CAMPOS.calf_mm.unidad).toBe("mm");
    expect(CAMPOS.calf_cm.unidad).toBe("cm");
  });
});
