import { describe, expect, it } from "vitest";

import { clasificacionDe, type Ejercicio } from "@/domain/ejercicios";
import {
  compensatoriosQueFaltan,
  j3AntesDeJ1,
  ordenarSesion,
  rangoDeEleccion,
  type Clasificacion,
} from "@/domain/jerarquias";

/**
 * Jerarquías J1/J2/J3 (documento de Giovanni del 25-sep).
 *
 * Sus tres reglas lógicas, una por bloque: el J1 guiado antes que bajar a J2,
 * el perfil compensatorio y nunca un J3 antes que un J1.
 */

const c = (p: Partial<Clasificacion>): Clasificacion => ({
  jerarquia: null,
  perfil: null,
  guiada: false,
  aislamiento: false,
  ...p,
});

describe("regla 1: si el J1 está restringido, primero el J1 guiado", () => {
  it("J1 libre < J1 guiado < J2 < J3 < sin clasificar", () => {
    const rangos = [
      c({ jerarquia: 1 }),
      c({ jerarquia: 1, guiada: true }),
      c({ jerarquia: 2 }),
      c({ jerarquia: 2, guiada: true }),
      c({ jerarquia: 3 }),
      c({}),
    ].map(rangoDeEleccion);
    expect([...rangos].sort((a, b) => a - b)).toEqual(rangos);
    expect(new Set(rangos).size).toBe(rangos.length);
  });
});

describe("regla 2: perfil compensatorio", () => {
  const sesion = (...e: Parameters<typeof compensatoriosQueFaltan>[0]) => compensatoriosQueFaltan(e);

  it("J1 de estiramiento sin J3 de acortamiento del mismo músculo → falta", () => {
    expect(
      sesion({ nombre: "Peso Muerto Rumano", musculo: "Isquiosurales", jerarquia: 1, perfil: "estiramiento" }),
    ).toEqual([
      { j1: "Peso Muerto Rumano", musculo: "Isquiosurales", falta: { jerarquia: 3, perfil: "acortamiento" } },
    ]);
  });

  it("con su J3 de acortamiento, completo", () => {
    expect(
      sesion(
        { nombre: "Peso Muerto Rumano", musculo: "Isquiosurales", jerarquia: 1, perfil: "estiramiento" },
        { nombre: "Curl Femoral Acostado", musculo: "Isquiosurales", jerarquia: 3, perfil: "acortamiento" },
      ),
    ).toEqual([]);
  });

  it("un J3 de OTRO músculo no compensa", () => {
    expect(
      sesion(
        { nombre: "Peso Muerto Rumano", musculo: "Isquiosurales", jerarquia: 1, perfil: "estiramiento" },
        { nombre: "Extensiones de Cuádriceps", musculo: "Cuádriceps", jerarquia: 3, perfil: "acortamiento" },
      ),
    ).toHaveLength(1);
  });

  it("Hip Thrust (J1 de acortamiento) pide un J2 de estiramiento", () => {
    expect(
      sesion({ nombre: "Hip Thrust con Barra", musculo: "Glúteo", jerarquia: 1, perfil: "acortamiento" })[0]
        .falta,
    ).toEqual({ jerarquia: 2, perfil: "estiramiento" });
  });

  it("un J1 sin perfil declarado no exige nada: no se inventa", () => {
    expect(sesion({ nombre: "Press Militar", musculo: "Deltoides", jerarquia: 1, perfil: null })).toEqual([]);
  });
});

describe("regla 3: nunca un J3 antes que un J1", () => {
  it("lo detecta", () => {
    expect(
      j3AntesDeJ1([
        { ejercicio: "Pec Deck", jerarquia: 3 },
        { ejercicio: "Press Inclinado", jerarquia: 1 },
      ]),
    ).toEqual([{ j3: "Pec Deck", j1: "Press Inclinado" }]);
  });

  it("un J3 antes de un J2 sí vale: lo hace su propio plan de Miguel", () => {
    // Martes de Miguel: Prensa (J1), RDL (J1), Extensión (J3), Curl Sentado (J2).
    expect(
      j3AntesDeJ1([
        { ejercicio: "Prensa 45°", jerarquia: 1 },
        { ejercicio: "Peso Muerto Rumano desde Bloque", jerarquia: 1 },
        { ejercicio: "Extensiones de Cuádriceps", jerarquia: 3 },
        { ejercicio: "Curl Femoral Sentado", jerarquia: 2 },
      ]),
    ).toEqual([]);
  });

  it("lo que no tiene jerarquía no cuenta", () => {
    expect(j3AntesDeJ1([{ ejercicio: "Plancha" }, { ejercicio: "Sentadilla", jerarquia: 1 }])).toEqual([]);
  });

  it("ordenarSesion deja J1, J2, J3 y coloca lo no clasificado por lo que es", () => {
    const orden = ordenarSesion(
      [
        { n: "curl sin clasificar", jerarquia: null, aislamiento: true },
        { n: "J3", jerarquia: 3 as const, aislamiento: true },
        { n: "compuesto sin clasificar", jerarquia: null, aislamiento: false },
        { n: "J1 b", jerarquia: 1 as const, aislamiento: false },
        { n: "J2", jerarquia: 2 as const, aislamiento: false },
        { n: "J1 a", jerarquia: 1 as const, aislamiento: false },
      ],
      (x) => x,
    ).map((x) => x.n);
    // Estable: entre los dos J1 se respeta el orden de llegada.
    expect(orden).toEqual(["J1 b", "J1 a", "compuesto sin clasificar", "J2", "curl sin clasificar", "J3"]);
  });
});

describe("clasificacionDe lee la base con desconfianza", () => {
  const ficha = (p: Partial<Ejercicio>): Ejercicio => ({
    id: "x",
    name: "x",
    description: null,
    target_muscle: null,
    movement_pattern: "horizontal_push",
    biomechanical_type: null,
    equipment: null,
    contraindications: [],
    is_active: true,
    ...p,
  });

  it("valores válidos pasan", () => {
    expect(clasificacionDe(ficha({ hierarchy_level: 1, length_profile: "estiramiento", is_guided: true }))).toEqual({
      jerarquia: 1,
      perfil: "estiramiento",
      guiada: true,
      aislamiento: false,
    });
  });

  it("un 4 o un perfil mal escrito cuentan como sin clasificar", () => {
    const r = clasificacionDe(ficha({ hierarchy_level: 4, length_profile: "Estirado", is_guided: null }));
    expect(r.jerarquia).toBeNull();
    expect(r.perfil).toBeNull();
    expect(r.guiada).toBe(false);
  });
});
