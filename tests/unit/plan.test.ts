import { describe, expect, it } from "vitest";

import {
  cierrePara,
  ejerciciosDelPlan,
  leerPlan,
  planValido,
  seriesEfectivasDe,
  seriesPorEjercicioEnSemana,
  validarPlan,
  VERSION_PLAN,
  type DiaPlan,
  type EjercicioPlan,
  type Plan,
} from "@/domain/plan";

// --- Andamiaje -------------------------------------------------------------

const ej = (nombre: string, p: Partial<EjercicioPlan> = {}): EjercicioPlan => ({
  ejercicio: nombre,
  seriesCalentamiento: 2,
  seriesEfectivas: 3,
  repMin: 8,
  repMax: 10,
  rpePrimeras: 8,
  rpeUltima: 9,
  descansoSeg: 120,
  sustitutos: [],
  ...p,
});

const dia = (n: number, p: Partial<DiaPlan> = {}): DiaPlan => ({
  dia: n,
  titulo: "Torso",
  preparacion: { minutos: 8, bloques: ["Movilidad de hombro"] },
  central: { ejercicios: [ej("Press de Banca Plano (Bench Press)")] },
  final: { cierre: "recuperacion_activa", minutos: 8 },
  ...p,
});

const plan = (p: Partial<Plan> = {}): Plan => ({
  version: VERSION_PLAN,
  periodizacion: "ondulante",
  objetivo: "hipertrofia",
  diasPorSemana: 1,
  semanas: [{ semana: 1, tipo: "carga", dias: [dia(1)] }],
  ...p,
});

// --- Las tres fases --------------------------------------------------------

describe("las tres fases son obligatorias", () => {
  // Su documento del 1-sep: "el sistema no debe permitir guardar ni iniciar una
  // sesión si no se cumple esta estructura". Por eso son tres pruebas y no una
  // nota en un comentario.
  it("un plan completo pasa", () => {
    expect(validarPlan(plan())).toEqual([]);
    expect(planValido(plan())).toBe(true);
  });

  it("sin preparación, no se guarda", () => {
    const p = plan({
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { preparacion: { minutos: 0, bloques: [] } })] }],
    });
    expect(validarPlan(p)).toContainEqual(expect.stringMatching(/preparación/i));
  });

  it("sin fase central con ejercicios, no se guarda", () => {
    const p = plan({
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { central: { ejercicios: [] } })] }],
    });
    expect(validarPlan(p)).toContainEqual(expect.stringMatching(/central/i));
  });
});

describe("el cierre tiene que corresponder al objetivo", () => {
  it("Zona 2 en un plan de pérdida de grasa: correcto", () => {
    const p = plan({
      objetivo: "perdida_grasa",
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { final: { cierre: "cardio_zona2", minutos: 20 } })] }],
    });
    expect(validarPlan(p)).toEqual([]);
  });

  it("Zona 2 en un plan de fuerza: se rechaza", () => {
    // No es purismo: el cierre en Zona 2 existe para aprovechar el glucógeno ya
    // agotado, y en un plan de fuerza solo se come la recuperación.
    const p = plan({
      objetivo: "fuerza",
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { final: { cierre: "cardio_zona2", minutos: 20 } })] }],
    });
    expect(validarPlan(p)).toContainEqual(expect.stringMatching(/no corresponde/i));
  });

  it("cierrePara elige el que toca", () => {
    expect(cierrePara("perdida_grasa")).toBe("cardio_zona2");
    expect(cierrePara("hipertrofia")).toBe("recuperacion_activa");
    expect(cierrePara("fuerza")).toBe("recuperacion_activa");
  });

  it("el estiramiento estático pasivo no existe como opción", () => {
    // Su prohibición no se valida: se impide por construcción. Lo que no se
    // puede escribir no se puede prescribir por error.
    const cierres = JSON.stringify(
      validarPlan(plan({
        semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { final: { cierre: "estiramiento_estatico" as never, minutos: 5 } })] }],
      })),
    );
    expect(cierres).toMatch(/cierre es desconocido|falta la fase final/i);
  });
});

// --- Coherencia ------------------------------------------------------------

describe("coherencia del mesociclo", () => {
  it("los días de cada semana cuadran con diasPorSemana", () => {
    const p = plan({ diasPorSemana: 3, semanas: [{ semana: 1, tipo: "carga", dias: [dia(1)] }] });
    expect(validarPlan(p)).toContainEqual(expect.stringMatching(/1 días y el plan dice 3/));
  });

  it("un plan sin semanas no es un plan", () => {
    expect(validarPlan(plan({ semanas: [] }))).toContainEqual(expect.stringMatching(/sin semanas/i));
  });

  it("acepta las tres clases de semana, incluida la supercompensación", () => {
    // Es un tipo aparte y no una semana de carga más: después del deload toca ir
    // a por el récord, y el generador tiene que poder saberlo.
    for (const tipo of ["carga", "descarga", "supercompensacion"] as const) {
      expect(validarPlan(plan({ semanas: [{ semana: 1, tipo, dias: [dia(1)] }] }))).toEqual([]);
    }
  });

  it("denuncia todos los problemas, no solo el primero", () => {
    const p = plan({
      diasPorSemana: 2,
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { central: { ejercicios: [] } })] }],
    });
    // Quien edita un mesociclo de seis semanas no quiere descubrirlos de uno en uno.
    expect(validarPlan(p).length).toBeGreaterThan(1);
  });
});

describe("el ejercicio prescrito", () => {
  const conEjercicio = (e: Partial<EjercicioPlan>) =>
    validarPlan(plan({
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, { central: { ejercicios: [ej("X", e)] } })] }],
    }));

  it("el rango de repeticiones no puede ir al revés", () => {
    // Invertido, la doble progresión nunca alcanza el techo: el atleta se
    // estanca y nada falla.
    expect(conEjercicio({ repMin: 12, repMax: 8 })).toContainEqual(
      expect.stringMatching(/al revés/i),
    );
  });

  it("la última serie no puede ser más suave que las anteriores", () => {
    // En su método la última es la dura. Al revés suele ser un cambio de sitio
    // al teclear, y mirando el plan no se nota.
    expect(conEjercicio({ rpePrimeras: 9, rpeUltima: 7 })).toContainEqual(
      expect.stringMatching(/menos RPE/i),
    );
  });

  it("el RPE vive entre 1 y 10", () => {
    expect(conEjercicio({ rpeUltima: 11 })).toContainEqual(expect.stringMatching(/1–10/));
  });

  it("el RPE es opcional: no todo ejercicio lo lleva", () => {
    expect(conEjercicio({ rpePrimeras: undefined, rpeUltima: undefined })).toEqual([]);
  });
});

// --- Lectura desde la base -------------------------------------------------

describe("leerPlan", () => {
  it("devuelve null ante cualquier cosa que no sea un plan", () => {
    expect(leerPlan(null)).toBeNull();
    expect(leerPlan([])).toBeNull();
    expect(leerPlan("plan")).toBeNull();
    expect(leerPlan({})).toBeNull();
  });

  it("rechaza una versión que no conoce en vez de leerla a medias", () => {
    expect(leerPlan({ ...plan(), version: 2 })).toBeNull();
  });

  it("no devuelve un plan a medias: media pantalla es peor que ninguna", () => {
    expect(leerPlan(plan({ semanas: [{ semana: 1, tipo: "carga", dias: [] }] }))).toBeNull();
  });

  it("devuelve el plan cuando es válido", () => {
    expect(leerPlan(plan())).not.toBeNull();
  });
});

// --- Recuentos -------------------------------------------------------------

describe("recuento de volumen", () => {
  const dosSemanas = plan({
    diasPorSemana: 2,
    semanas: [
      {
        semana: 1,
        tipo: "carga",
        dias: [
          dia(1, { central: { ejercicios: [ej("Sentadilla Goblet", { seriesEfectivas: 4 })] } }),
          dia(2, { central: { ejercicios: [ej("Sentadilla Goblet", { seriesEfectivas: 3 }), ej("Prensa 45°")] } }),
        ],
      },
      {
        semana: 2,
        tipo: "descarga",
        dias: [
          dia(1, { central: { ejercicios: [ej("Sentadilla Goblet", { seriesEfectivas: 2 })] } }),
          dia(2, { central: { ejercicios: [ej("Prensa 45°", { seriesEfectivas: 2 })] } }),
        ],
      },
    ],
  });

  it("cuenta las series efectivas de todo el plan", () => {
    expect(seriesEfectivasDe(dosSemanas, "Sentadilla Goblet")).toBe(9);
  });

  it("cuenta POR SEMANA, que es como razona el volumen Giovanni", () => {
    // Su tope es "series por grupo muscular a la semana", así que un recuento
    // sobre el plan entero no serviría para comprobarlo.
    expect(seriesPorEjercicioEnSemana(dosSemanas.semanas[0])).toEqual({
      "Sentadilla Goblet": 7,
      "Prensa 45°": 3,
    });
    expect(seriesPorEjercicioEnSemana(dosSemanas.semanas[1])).toEqual({
      "Sentadilla Goblet": 2,
      "Prensa 45°": 2,
    });
  });

  it("el calentamiento NO suma al volumen", () => {
    const p = plan({
      semanas: [{ semana: 1, tipo: "carga", dias: [dia(1, {
        central: { ejercicios: [ej("X", { seriesCalentamiento: 5, seriesEfectivas: 2 })] },
      })] }],
    });
    expect(seriesEfectivasDe(p, "X")).toBe(2);
  });

  it("lista los ejercicios sin repetir", () => {
    expect(ejerciciosDelPlan(dosSemanas).sort()).toEqual(["Prensa 45°", "Sentadilla Goblet"]);
  });
});
