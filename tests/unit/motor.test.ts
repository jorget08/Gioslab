import { describe, expect, it } from "vitest";

import type { Ejercicio } from "@/domain/ejercicios";
import {
  evaluar,
  evaluarCondicion,
  evaluarPredicado,
  excluidos,
  hechosQueFaltan,
  incluidos,
  type Hechos,
} from "@/domain/motor";
import type { Regla } from "@/domain/reglas";

// --- Andamiaje -------------------------------------------------------------

const ej = (name: string, p: Partial<Ejercicio> = {}): Ejercicio => ({
  id: name, name, description: null, target_muscle: null, movement_pattern: null,
  biomechanical_type: null, equipment: null, contraindications: [], is_active: true, ...p,
});

const regla = (p: Partial<Regla> & { rule_key: string }): Regla => ({
  version: 1, nivel: 1,
  condition: { todas: [] },
  actions: {},
  justification: "Motivo",
  evidence_level: "LEVEL_B_BIOMECHANICS",
  ...p,
});

const BIBLIOTECA = [
  ej("Sentadilla Trasera", { movement_pattern: "squat_dominante_rodilla", contraindications: ["Rodilla", "Lumbar"] }),
  ej("Prensa 45°", { movement_pattern: "squat_dominante_rodilla" }),
  ej("Hip Thrust", { movement_pattern: "hip_hinge_dominante_cadera", contraindications: ["Embarazo"] }),
  ej("Press Militar", { movement_pattern: "vertical_push", contraindications: ["Hombro"] }),
];

const nombres = (ds: { ejercicio: string }[]) => ds.map((d) => d.ejercicio).sort();

// --- Predicados ------------------------------------------------------------

describe("evaluarPredicado: tres valores, no dos", () => {
  it("resuelve comparaciones numéricas", () => {
    const h: Hechos = { dorsiflexion_cm: 4 };
    expect(evaluarPredicado({ hecho: "dorsiflexion_cm", op: "<", valor: 5 }, h)).toBe("cumple");
    expect(evaluarPredicado({ hecho: "dorsiflexion_cm", op: ">=", valor: 5 }, h)).toBe("no-cumple");
  });

  it("un hecho ausente es INDECIDIBLE, no falso", () => {
    // Es la decisión que sostiene la seguridad del motor. Si fuera falso, la
    // regla "dorsiflexión < 5 → excluye sentadilla" no dispararía en quien no
    // tiene el tobillo medido, y le prescribiríamos sentadilla profunda.
    expect(evaluarPredicado({ hecho: "dorsiflexion_cm", op: "<", valor: 5 }, {})).toBe("sin-dato");
    expect(
      evaluarPredicado({ hecho: "dorsiflexion_cm", op: "<", valor: 5 }, { dorsiflexion_cm: null }),
    ).toBe("sin-dato");
  });

  it("pero un cero y un false SÍ son datos", () => {
    // Ambos son falsy en JavaScript. Si se colaran en la comprobación de
    // ausencia, "no usa anticonceptivos" pasaría por "no lo sabemos".
    expect(evaluarPredicado({ hecho: "dorsiflexion_cm", op: "<", valor: 5 }, { dorsiflexion_cm: 0 })).toBe("cumple");
    expect(
      evaluarPredicado({ hecho: "usa_anticonceptivos", op: "=", valor: false }, { usa_anticonceptivos: false }),
    ).toBe("cumple");
  });

  it("`entre` es cerrado abajo y abierto arriba", () => {
    // Para que dos bandas contiguas —5-10 y 10-15— no se solapen en el 10.
    const p = { hecho: "dorsiflexion_cm", op: "entre" as const, valor: [5, 10] as [number, number] };
    expect(evaluarPredicado(p, { dorsiflexion_cm: 5 })).toBe("cumple");
    expect(evaluarPredicado(p, { dorsiflexion_cm: 9.9 })).toBe("cumple");
    expect(evaluarPredicado(p, { dorsiflexion_cm: 10 })).toBe("no-cumple");
  });

  it("`incluye` y `no_incluye` trabajan sobre conjuntos", () => {
    const h: Hechos = { lesiones: ["Rodilla", "Lumbar"] };
    expect(evaluarPredicado({ hecho: "lesiones", op: "incluye", valor: "Rodilla" }, h)).toBe("cumple");
    expect(evaluarPredicado({ hecho: "lesiones", op: "incluye", valor: "Hombro" }, h)).toBe("no-cumple");
    expect(evaluarPredicado({ hecho: "lesiones", op: "no_incluye", valor: "Hombro" }, h)).toBe("cumple");
  });

  it("un conjunto vacío es un dato: no tiene lesiones", () => {
    expect(evaluarPredicado({ hecho: "lesiones", op: "incluye", valor: "Rodilla" }, { lesiones: [] })).toBe("no-cumple");
  });

  it("un hecho inventado no se resuelve a la ligera", () => {
    expect(evaluarPredicado({ hecho: "altura_salto", op: ">", valor: 40 }, {})).toBe("sin-dato");
  });
});

describe("evaluarCondicion", () => {
  it("exige que se cumplan todos", () => {
    const h: Hechos = { sexo: "femenino", porcentaje_graso: 18 };
    expect(
      evaluarCondicion(
        [
          { hecho: "sexo", op: "=", valor: "femenino" },
          { hecho: "porcentaje_graso", op: "<", valor: 20 },
        ],
        h,
      ).veredicto,
    ).toBe("cumple");
  });

  it("un `no-cumple` manda sobre un `sin-dato`", () => {
    // Si la regla ya no aplica por otro motivo, da igual que falte un dato: no
    // tiene sentido reclamar una medición para una regla descartada.
    const r = evaluarCondicion(
      [
        { hecho: "sexo", op: "=", valor: "masculino" },
        { hecho: "porcentaje_graso", op: "<", valor: 20 },
      ],
      { sexo: "femenino" },
    );
    expect(r.veredicto).toBe("no-cumple");
    expect(r.faltan).toEqual([]);
  });

  it("un solo predicado indecidible deja la regla indecidible", () => {
    const r = evaluarCondicion(
      [
        { hecho: "sexo", op: "=", valor: "femenino" },
        { hecho: "porcentaje_graso", op: "<", valor: 20 },
      ],
      { sexo: "femenino" },
    );
    expect(r.veredicto).toBe("sin-dato");
    expect(r.faltan).toEqual(["porcentaje_graso"]);
  });
});

// --- El tubo ---------------------------------------------------------------

describe("nivel 1: filtra", () => {
  it("excluye lo que la regla excluye y deja el resto", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 3 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-severa",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_ejercicios: ["Sentadilla Trasera"], sustituir_por: ["Prensa 45°"] },
        }),
      ],
    });
    expect(nombres(excluidos(r))).toEqual(["Sentadilla Trasera"]);
    expect(nombres(incluidos(r))).toEqual(["Hip Thrust", "Prensa 45°", "Press Militar"]);
  });

  it("excluir un patrón alcanza a todos sus ejercicios", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 3 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "sin-rodilla",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_patrones: ["squat_dominante_rodilla"] },
        }),
      ],
    });
    expect(nombres(excluidos(r))).toEqual(["Prensa 45°", "Sentadilla Trasera"]);
  });

  it("un sustituto que también está excluido NO se ofrece", () => {
    // Mandar al entrenador a otro ejercicio prohibido es peor que no proponer
    // ninguno.
    const r = evaluar({
      hechos: { dorsiflexion_cm: 3 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "a",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_ejercicios: ["Sentadilla Trasera"], sustituir_por: ["Prensa 45°", "Hip Thrust"] },
        }),
        regla({
          rule_key: "b",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_ejercicios: ["Prensa 45°"] },
        }),
      ],
    });
    const sent = r.ejercicios.find((e) => e.ejercicio === "Sentadilla Trasera")!;
    expect(sent.sustitutos).toEqual(["Hip Thrust"]);
  });

  it("un modificador cambia el CÓMO sin quitar el ejercicio", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 7 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-limitada",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
          actions: { modificador: "Elevar talones 2.5 cm" },
        }),
      ],
    });
    expect(excluidos(r)).toHaveLength(0);
    expect(r.modificadoresGenerales).toEqual(["Elevar talones 2.5 cm"]);
  });

  it("un modificador sin destino NO se pega a cada ejercicio", () => {
    // Se pegaba, y en pantalla salía "elevar talones 2.5 cm" bajo el Press
    // Militar. Una indicación absurda repetida bajo ocho ejercicios desacredita
    // a los ocho, así que un ajuste de sesión se dice una vez y aparte.
    const r = evaluar({
      hechos: { dorsiflexion_cm: 7 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-limitada",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
          actions: { modificador: "Elevar talones 2.5 cm" },
        }),
      ],
    });
    for (const e of r.ejercicios) expect(e.modificadores, e.ejercicio).toEqual([]);
  });

  it("un modificador con destino sí viaja con su ejercicio", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 7 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-limitada",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
          actions: { priorizar: ["Sentadilla Trasera"], modificador: "Elevar talones 2.5 cm" },
        }),
      ],
    });
    const sent = r.ejercicios.find((e) => e.ejercicio === "Sentadilla Trasera")!;
    expect(sent.modificadores).toEqual(["Elevar talones 2.5 cm"]);
    expect(r.modificadoresGenerales).toEqual([]);
    for (const e of r.ejercicios.filter((x) => x.ejercicio !== "Sentadilla Trasera")) {
      expect(e.modificadores, e.ejercicio).toEqual([]);
    }
  });
});

describe("el cruce de contraindicaciones", () => {
  it("descarta lo que choca con una lesión, sin necesidad de regla", () => {
    const r = evaluar({
      hechos: { lesiones: ["Rodilla"] },
      ejercicios: BIBLIOTECA,
      reglas: [],
    });
    expect(nombres(excluidos(r))).toEqual(["Sentadilla Trasera"]);
  });

  it("y con una condición fisiológica igual", () => {
    const r = evaluar({
      hechos: { condiciones: ["Embarazo"] },
      ejercicios: BIBLIOTECA,
      reglas: [],
    });
    expect(nombres(excluidos(r))).toEqual(["Hip Thrust"]);
  });

  it("explica el descarte aunque no venga de una fila de reglas", () => {
    // Sin esto el entrenador vería desaparecer un ejercicio sin motivo visible,
    // que es justo lo contrario de lo que pide §3.6.
    const r = evaluar({ hechos: { lesiones: ["Rodilla"] }, ejercicios: BIBLIOTECA, reglas: [] });
    const sent = excluidos(r)[0];
    expect(sent.porQue[0].justification).toContain("Rodilla");
    expect(sent.porQue[0].rule_key).toBe("cruce-contraindicaciones");
  });

  it("sin lesiones ni condiciones no descarta nada", () => {
    const r = evaluar({ hechos: { lesiones: [], condiciones: [] }, ejercicios: BIBLIOTECA, reglas: [] });
    expect(excluidos(r)).toHaveLength(0);
  });
});

describe("nivel 2: modula la carga", () => {
  const enLuteaTardia = (extra: Regla[] = []) =>
    evaluar({
      hechos: { fase_ciclo: "Lútea Tardía" },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "lutea",
          nivel: 2,
          condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] },
          actions: { volumen_factor: 0.75, rir: { delta: 2 } },
          evidence_level: "LEVEL_A_SCIENCE",
        }),
        ...extra,
      ],
    });

  it("aplica el factor de volumen y el desplazamiento de RIR", () => {
    const r = enLuteaTardia();
    expect(r.volumenFactor).toBe(0.75);
    expect(r.rir.delta).toBe(2);
  });

  it("sin reglas de volumen el factor es 1, no 0", () => {
    const r = evaluar({ hechos: {}, ejercicios: BIBLIOTECA, reglas: [] });
    expect(r.volumenFactor).toBe(1);
  });

  it("dos factores distintos NO se multiplican: compiten", () => {
    // Multiplicarlos compondría recortes que nadie autorizó: 0.75 × 0.9 deja el
    // volumen en 0.67, una descarga mucho más agresiva de lo que dice ninguna
    // de las dos reglas.
    const r = enLuteaTardia([
      regla({
        rule_key: "otra",
        nivel: 2,
        condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] },
        actions: { volumen_factor: 0.9 },
        evidence_level: "LEVEL_C_CONSENSUS",
      }),
    ]);
    expect(r.volumenFactor).toBe(0.75);
    expect(r.conflictos).toHaveLength(1);
    expect(r.conflictos[0].ganadora.rule_key).toBe("lutea");
    expect(r.conflictos[0].empate).toBe(false);
  });

  it("los suelos de RIR se acumulan quedándose con el más alto", () => {
    // Son restricciones de seguridad y conviven: el más conservador manda.
    const r = evaluar({
      hechos: { condiciones: ["Hipertensión / Cardiovascular"] },
      ejercicios: [],
      reglas: [
        regla({
          rule_key: "hta",
          condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] },
          actions: { rir: { piso: 2 }, prohibir_maniobra: ["Valsalva"] },
        }),
        regla({
          rule_key: "otra",
          condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] },
          actions: { rir: { piso: 3 } },
        }),
      ],
    });
    expect(r.rir.piso).toBe(3);
    expect(r.conflictos).toHaveLength(0);
  });

  it("las maniobras prohibidas se suman, no compiten", () => {
    const r = evaluar({
      hechos: { condiciones: ["Hipertensión / Cardiovascular"] },
      ejercicios: [],
      reglas: [
        regla({ rule_key: "a", condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] }, actions: { prohibir_maniobra: ["Valsalva"] } }),
        regla({ rule_key: "b", condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] }, actions: { prohibir_maniobra: ["Isométricos largos"] } }),
      ],
    });
    expect(r.maniobrasProhibidas.sort()).toEqual(["Isométricos largos", "Valsalva"]);
  });
});

describe("conflictos y empates", () => {
  const dos = (evidenciaA: string, evidenciaB: string) =>
    evaluar({
      hechos: { fase_ciclo: "Lútea Tardía" },
      ejercicios: [],
      reglas: [
        regla({ rule_key: "a", nivel: 2, evidence_level: evidenciaA, condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] }, actions: { volumen_factor: 0.75 } }),
        regla({ rule_key: "b", nivel: 2, evidence_level: evidenciaB, condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] }, actions: { volumen_factor: 1.2 } }),
      ],
    });

  it("gana la de mayor evidencia venga en el orden que venga", () => {
    expect(dos("LEVEL_A_SCIENCE", "LEVEL_D_OVERRIDE").volumenFactor).toBe(0.75);
    expect(dos("LEVEL_D_OVERRIDE", "LEVEL_A_SCIENCE").volumenFactor).toBe(1.2);
  });

  it("un empate se DENUNCIA en vez de resolverse en silencio", () => {
    // Dos reglas igual de respaldadas que se contradicen son un defecto de la
    // matriz. El motor elige una para poder seguir, pero lo deja escrito.
    const r = dos("LEVEL_B_BIOMECHANICS", "LEVEL_B_BIOMECHANICS");
    expect(r.conflictos[0].empate).toBe(true);
    expect(r.conflictos[0].descartadas).toHaveLength(1);
  });

  it("el conflicto dice sobre qué fue", () => {
    expect(dos("LEVEL_A_SCIENCE", "LEVEL_C_CONSENSUS").conflictos[0].sobre).toContain("volumen");
  });
});

describe("niveles 3 y 4", () => {
  it("aplica el reparto entre patrones", () => {
    const r = evaluar({
      hechos: { dominancia_sentadilla: "Dominante de Rodilla" },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dom",
          nivel: 3,
          condition: { todas: [{ hecho: "dominancia_sentadilla", op: "=", valor: "Dominante de Rodilla" }] },
          actions: { ratio_patron: { hip_hinge_dominante_cadera: 0.6, squat_dominante_rodilla: 0.4 } },
        }),
      ],
    });
    expect(r.ratioPatron).toEqual({ hip_hinge_dominante_cadera: 0.6, squat_dominante_rodilla: 0.4 });
  });

  it("fija el volumen base semanal por composición", () => {
    const r = evaluar({
      hechos: { sexo: "femenino", porcentaje_graso: 18 },
      ejercicios: [],
      reglas: [
        regla({
          rule_key: "magra",
          nivel: 4,
          condition: {
            todas: [
              { hecho: "sexo", op: "=", valor: "femenino" },
              { hecho: "porcentaje_graso", op: "<", valor: 20 },
            ],
          },
          actions: { volumen_series: { min: 16, max: 22 } },
        }),
      ],
    });
    expect(r.volumenSeries).toEqual({ min: 16, max: 22 });
  });
});

// --- Lo que falta ----------------------------------------------------------

describe("datos que faltan: se denuncian, no se asumen", () => {
  const sinTobillo = () =>
    evaluar({
      hechos: { lesiones: [] },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-severa",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_ejercicios: ["Sentadilla Trasera"] },
        }),
      ],
    });

  it("la regla no dispara, pero queda registrada como sin evaluar", () => {
    const r = sinTobillo();
    expect(r.sinEvaluar).toHaveLength(1);
    expect(r.sinEvaluar[0].faltan).toEqual(["dorsiflexion_cm"]);
  });

  it("y la prescripción se marca incompleta", () => {
    // Es lo que impide que el motor parezca seguro cuando solo está desinformado.
    expect(sinTobillo().completo).toBe(false);
    expect(evaluar({ hechos: {}, ejercicios: [], reglas: [] }).completo).toBe(true);
  });

  it("hechosQueFaltan los devuelve ordenados por nivel del tubo", () => {
    const r = evaluar({
      hechos: {},
      ejercicios: [],
      reglas: [
        regla({ rule_key: "n4", nivel: 4, condition: { todas: [{ hecho: "porcentaje_graso", op: "<", valor: 20 }] }, actions: { volumen_series: { min: 1, max: 2 } } }),
        regla({ rule_key: "n1", condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] }, actions: { excluir_ejercicios: ["X"] } }),
      ],
    });
    // La seguridad primero: es lo que hay que ir a medir antes.
    expect(hechosQueFaltan(r)).toEqual(["dorsiflexion_cm", "porcentaje_graso"]);
  });
});

// --- Trazabilidad ----------------------------------------------------------

describe("toda decisión se puede explicar (§3.6)", () => {
  it("cada exclusión dice qué regla la causó y por qué", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 3 },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({
          rule_key: "dorsi-severa",
          condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
          actions: { excluir_ejercicios: ["Sentadilla Trasera"] },
          justification: "Por debajo de 5 cm se dispara el valgo dinámico de rodilla.",
        }),
      ],
    });
    const sent = excluidos(r)[0];
    expect(sent.porQue[0].rule_key).toBe("dorsi-severa");
    expect(sent.porQue[0].justification).toContain("valgo dinámico");
    expect(sent.porQue[0].descripcion).toContain("Dorsiflexión de tobillo es menor que 5cm");
  });

  it("las reglas que dispararon quedan listadas aparte", () => {
    const r = evaluar({
      hechos: { dorsiflexion_cm: 3, fase_ciclo: "Lútea Tardía" },
      ejercicios: BIBLIOTECA,
      reglas: [
        regla({ rule_key: "a", condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] }, actions: { excluir_ejercicios: ["Sentadilla Trasera"] } }),
        regla({ rule_key: "b", nivel: 2, condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] }, actions: { volumen_factor: 0.75 } }),
        regla({ rule_key: "no-dispara", condition: { todas: [{ hecho: "dorsiflexion_cm", op: ">", valor: 20 }] }, actions: { excluir_ejercicios: ["Prensa 45°"] } }),
      ],
    });
    expect(r.aplicadas.map((a) => a.rule_key).sort()).toEqual(["a", "b"]);
  });
});

// --- Un caso completo ------------------------------------------------------

describe("caso real: atleta con rodilla mala en lútea tardía", () => {
  const r = evaluar({
    hechos: {
      dorsiflexion_cm: 4,
      lesiones: ["Rodilla"],
      condiciones: ["Hipertensión / Cardiovascular"],
      fase_ciclo: "Lútea Tardía",
      sexo: "femenino",
      porcentaje_graso: 18,
    },
    ejercicios: BIBLIOTECA,
    reglas: [
      regla({ rule_key: "dorsi-severa", condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] }, actions: { excluir_ejercicios: ["Sentadilla Trasera"], sustituir_por: ["Prensa 45°"] } }),
      regla({ rule_key: "hta", evidence_level: "LEVEL_A_SCIENCE", condition: { todas: [{ hecho: "condiciones", op: "incluye", valor: "Hipertensión / Cardiovascular" }] }, actions: { prohibir_maniobra: ["Valsalva"], rir: { piso: 2 } } }),
      regla({ rule_key: "lutea", nivel: 2, evidence_level: "LEVEL_A_SCIENCE", condition: { todas: [{ hecho: "fase_ciclo", op: "=", valor: "Lútea Tardía" }] }, actions: { volumen_factor: 0.75, rir: { delta: 2 } } }),
      regla({ rule_key: "magra", nivel: 4, condition: { todas: [{ hecho: "sexo", op: "=", valor: "femenino" }, { hecho: "porcentaje_graso", op: "<", valor: 20 }] }, actions: { volumen_series: { min: 16, max: 22 } } }),
    ],
  });

  it("los cuatro niveles actúan a la vez", () => {
    expect(nombres(excluidos(r))).toEqual(["Sentadilla Trasera"]);
    expect(r.volumenFactor).toBe(0.75);
    expect(r.maniobrasProhibidas).toEqual(["Valsalva"]);
    expect(r.volumenSeries).toEqual({ min: 16, max: 22 });
  });

  it("la sentadilla se cae por DOS motivos y los dos se explican", () => {
    // La regla de dorsiflexión y el cruce con su rodilla. Enseñar solo uno
    // dejaría al entrenador creyendo que basta con corregir el tobillo.
    const sent = excluidos(r)[0];
    expect(sent.porQue.map((p) => p.rule_key).sort()).toEqual([
      "cruce-contraindicaciones", "dorsi-severa",
    ]);
  });

  it("el suelo y el desplazamiento de RIR conviven", () => {
    expect(r.rir).toEqual({ piso: 2, delta: 2 });
  });

  it("no hay conflictos ni datos pendientes", () => {
    expect(r.conflictos).toEqual([]);
    expect(r.completo).toBe(true);
  });

  it("y quedan tres ejercicios utilizables", () => {
    expect(nombres(incluidos(r))).toEqual(["Hip Thrust", "Prensa 45°", "Press Militar"]);
  });
});
