import { describe, expect, it } from "vitest";

import {
  describirRegla,
  ETIQUETA_NIVEL,
  HECHOS,
  hechosDeNivel,
  NIVELES_MOTOR,
  validarAcciones,
  validarPredicado,
  validarRegla,
  type Regla,
} from "@/domain/reglas";

/** Base mínima válida; cada test cambia solo lo que le interesa. */
const regla = (p: Partial<Regla> = {}): Regla => ({
  rule_key: "prueba",
  version: 1,
  nivel: 1,
  condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
  actions: { excluir_ejercicios: ["Sentadilla Trasera"] },
  justification: "Motivo de prueba",
  evidence_level: "LEVEL_B_BIOMECHANICS",
  ...p,
});

describe("la gramática expresa la matriz de Giovanni", () => {
  it("dorsiflexión severa: excluye y sustituye", () => {
    // Fila 1 de su Nivel 1, literal.
    const r = regla({
      rule_key: "dorsiflexion-severa",
      condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
      actions: {
        excluir_ejercicios: ["Sentadilla libre profunda", "Hack libre"],
        sustituir_por: ["Sentadilla Heels-Elevated", "Prensa 45°"],
      },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toBe(
      "Si Dorsiflexión de tobillo es menor que 5cm, entonces excluye Sentadilla libre profunda, Hack libre; sustituye por Sentadilla Heels-Elevated o Prensa 45°.",
    );
  });

  it("dorsiflexión limitada: no excluye nada, cambia el CÓMO", () => {
    // Es la distinción que pedía su matriz: "permitir con adaptación".
    const r = regla({
      condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
      actions: { modificador: "Añadir cuñas de talón de 2 a 3 cm" },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toContain("está entre 5cm y 10cm");
  });

  it("contraindicación sistémica: prohíbe una maniobra y pone piso al RIR", () => {
    const r = regla({
      condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] },
      actions: { prohibir_maniobra: ["Valsalva"], rir: { piso: 2 } },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toBe(
      "Si Condiciones fisiológicas incluye Hipertensión / Cardiovascular, entonces prohíbe Valsalva; no baja del RIR 2.",
    );
  });

  it("fase lútea tardía: modula volumen e intensidad", () => {
    const r = regla({
      nivel: 2,
      condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] },
      actions: { volumen_factor: 0.75, rir: { delta: 2 } },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toBe(
      "Si Fase del ciclo es Lútea Tardía, entonces reduce el volumen un 25%; sube el RIR en 2.",
    );
  });

  it("dominancia: reparte el ratio entre patrones", () => {
    const r = regla({
      nivel: 3,
      condition: { todas: [{ hecho: "dominancia_sentadilla", op: "=", valor: "Dominante de Rodilla" }] },
      actions: {
        ratio_patron: { hip_hinge_dominante_cadera: 0.6, squat_dominante_rodilla: 0.4 },
      },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toContain("60% hip_hinge_dominante_cadera / 40% squat_dominante_rodilla");
  });

  it("composición corporal: volumen base por sexo y porcentaje graso", () => {
    // Su Nivel 4 tiene umbrales distintos por sexo, y por eso `sexo` es un hecho.
    const r = regla({
      nivel: 4,
      condition: {
        todas: [
          { hecho: "sexo", op: "=", valor: "femenino" },
          { hecho: "porcentaje_graso", op: "<", valor: 20 },
        ],
      },
      actions: { volumen_series: { min: 16, max: 22 } },
    });
    expect(validarRegla(r)).toEqual([]);
    expect(describirRegla(r)).toContain("16–22 series por grupo y semana");
  });
});

describe("los dos ejes no se mezclan", () => {
  it("los cuatro niveles tienen etiqueta y describen el orden del motor", () => {
    for (const n of NIVELES_MOTOR) expect(ETIQUETA_NIVEL[n].length).toBeGreaterThan(0);
    expect(ETIQUETA_NIVEL[1]).toContain("Seguridad");
    expect(ETIQUETA_NIVEL[4]).toContain("Composición");
  });

  it("una regla no puede mirar un hecho de un nivel posterior", () => {
    // Si una regla de seguridad mirara el % graso, el motor todavía no lo
    // habría calculado: el nivel 4 va después. Es un error de sitio, no de dato.
    const r = regla({
      nivel: 1,
      condition: { todas: [{ hecho: "porcentaje_graso", op: "<", valor: 12 }] },
    });
    expect(validarRegla(r).join(" ")).toContain("es de nivel 4 y esta regla es de nivel 1");
  });

  it("pero sí uno de un nivel anterior", () => {
    // Al revés es legítimo: en el nivel 2 ya se sabe qué lesiones tiene.
    const r = regla({
      nivel: 2,
      condition: { todas: [{ hecho: "lesiones", op: "incluye", valor: "Rodilla" }] },
      actions: { volumen_factor: 0.9 },
    });
    expect(validarRegla(r)).toEqual([]);
  });

  it("el nivel de evidencia sigue siendo obligatorio y aparte", () => {
    expect(validarRegla(regla({ evidence_level: "LEVEL_A_SCIENCE" }))).toEqual([]);
    expect(validarRegla(regla({ evidence_level: "muy_fiable" })).join(" ")).toContain(
      "no es un nivel de evidencia válido",
    );
  });
});

describe("validarPredicado", () => {
  it("rechaza un hecho inventado", () => {
    expect(validarPredicado({ hecho: "altura_salto", op: ">", valor: 40 })[0]).toContain(
      "no es un hecho conocido",
    );
  });

  it("rechaza un operador que no aplica al tipo", () => {
    // "menor que" sobre un conjunto de lesiones no significa nada.
    expect(
      validarPredicado({ hecho: "lesiones", op: "<", valor: 3 })[0],
    ).toContain("no aplica");
  });

  it("rechaza un valor fuera del dominio", () => {
    expect(
      validarPredicado({ hecho: "fase_ciclo", op: "=", valor: "Ovulatoria" })[0],
    ).toContain("no es un valor de");
  });

  it("acepta las cuatro fases que dejó su matriz", () => {
    for (const f of ["Folicular Temprana", "Folicular Tardía", "Lútea Temprana", "Lútea Tardía"]) {
      expect(validarPredicado({ hecho: "fase_ciclo", op: "=", valor: f })).toEqual([]);
    }
  });

  it("caza un rango escrito al revés", () => {
    expect(
      validarPredicado({ hecho: "dorsiflexion_cm", op: "entre", valor: [10, 5] })[0],
    ).toContain("al revés");
  });

  it("exige número donde hay número", () => {
    expect(
      validarPredicado({ hecho: "dorsiflexion_cm", op: "<", valor: "cinco" })[0],
    ).toContain("se compara con un número");
  });
});

describe("validarAcciones", () => {
  it("una regla tiene que hacer algo", () => {
    expect(validarAcciones({})[0]).toContain("no hace nada");
  });

  it("rechaza un patrón fuera del catálogo", () => {
    expect(validarAcciones({ excluir_patrones: ["sentadilla"] })[0]).toContain("no es un patrón");
  });

  it("los ratios tienen que sumar 1", () => {
    expect(
      validarAcciones({ ratio_patron: { squat_dominante_rodilla: 0.6, vertical_pull: 0.6 } })[0],
    ).toContain("deben sumar 1");
    // Y 0.6 + 0.4 en binario no da 1 exacto: la comparación lleva tolerancia.
    expect(
      validarAcciones({ ratio_patron: { squat_dominante_rodilla: 0.6, vertical_pull: 0.4 } }),
    ).toEqual([]);
  });

  it("caza un factor de volumen imposible", () => {
    expect(validarAcciones({ volumen_factor: 15 })[0]).toContain("fuera de lo razonable");
  });

  it("delata un sustituto que nunca se aplicaría", () => {
    // Sustituir sin excluir nada es una regla muerta: parece que protege y no
    // hace nada.
    expect(validarAcciones({ sustituir_por: ["Prensa 45°"] })[0]).toContain(
      "no llegaría a aplicarse",
    );
  });
});

describe("validarRegla", () => {
  it("una condición vacía dispararía siempre", () => {
    expect(validarRegla(regla({ condition: { todas: [] } })).join(" ")).toContain(
      "dispararía siempre",
    );
  });

  it("sin justificación no se puede explicar al entrenador", () => {
    expect(validarRegla(regla({ justification: "   " })).join(" ")).toContain(
      "Falta la justificación",
    );
  });

  it("acumula todos los errores en vez de parar en el primero", () => {
    // Quien edita una regla quiere ver todo lo que está mal de una vez.
    const errores = validarRegla(
      regla({ rule_key: "", nivel: 9, justification: "", evidence_level: "x", actions: {} }),
    );
    expect(errores.length).toBeGreaterThanOrEqual(4);
  });
});

describe("catálogo de hechos", () => {
  it("cada hecho declara de dónde sale", () => {
    // Sin el origen nadie puede comprobar que el motor lo está resolviendo bien.
    for (const [clave, h] of Object.entries(HECHOS)) {
      expect(h.origen, clave).toBeTruthy();
      expect(h.etiqueta, clave).toBeTruthy();
    }
  });

  it("los hechos de tipo opción o conjunto traen su dominio", () => {
    for (const [clave, h] of Object.entries(HECHOS)) {
      if (h.tipo === "opcion" || h.tipo === "conjunto") {
        expect(h.dominio, clave).toBeDefined();
        expect(h.dominio!.length, clave).toBeGreaterThan(0);
      }
    }
  });

  it("todos los niveles tienen hechos que mirar", () => {
    for (const n of NIVELES_MOTOR) expect(hechosDeNivel(n).length).toBeGreaterThan(0);
  });

  it("lo que sale de la ficha del atleta es de nivel 1", () => {
    // El nivel dice DESDE CUÁNDO existe el dato, no quién lo consume. Todo lo
    // que vive en `athletes` se conoce al crear el atleta, antes de medir nada,
    // así que ponerlo en un nivel alto lo vuelve invisible para las reglas de
    // los niveles anteriores. Pasó con `sexo`: estaba en el 4 y dejaba las
    // reglas de ciclo (nivel 2) sin poder filtrar por sexo, así que no se
    // aplicaban y nadie se enteraba.
    for (const [clave, h] of Object.entries(HECHOS)) {
      if (h.origen.startsWith("athletes.")) expect(h.nivel, clave).toBe(1);
    }
  });
});
