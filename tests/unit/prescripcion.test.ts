import { describe, expect, it } from "vitest";

import { elegirDelDia } from "@/domain/eleccion";
import {
  esExplosiva,
  leerPrescripcion,
  prescribir,
  sesionesOndulantes,
  validarPrescripcion,
  type Prescripcion,
} from "@/domain/prescripcion";
import { validarAcciones } from "@/domain/reglas";
import type { Candidato } from "@/domain/volumen";

/**
 * Su "Plan de corrección backend" del 16-nov: cadencia por jerarquía,
 * concéntrica explosiva, ondulante diario y carga axial.
 */

const P: Prescripcion = leerPrescripcion({
  tolerancia_series: 1,
  cadencia_por_jerarquia: { "1": "3010", "2": "3110", "3": "2011" },
  cadencia_explosiva: { bloques: ["Realización"], objetivos: ["fuerza"] },
  ondulante_diario: {
    A: { rep_min: 6, rep_max: 8, cadencia: "2010" },
    B: { rep_min: 10, rep_max: 12, cadencia: "4110" },
  },
});

const base = {
  p: P,
  repMin: 8,
  repMax: 12,
  cadenciaObjetivo: "3010",
  cadenciaPropia: null,
  jerarquia: null,
  aislamiento: false,
  explosiva: false,
  sesion: null,
  rangoMotor: null,
} as const;

describe("cadencia por jerarquía (16-nov)", () => {
  it("la del ejercicio manda; sin ella, la de su J; sin J, la del objetivo", () => {
    expect(prescribir({ ...base, cadenciaPropia: "2010", jerarquia: 1 }).cadencia).toBe("2010");
    expect(prescribir({ ...base, jerarquia: 2 }).cadencia).toBe("3110");
    expect(prescribir({ ...base, jerarquia: 3, aislamiento: true }).cadencia).toBe("2011");
    expect(prescribir(base).cadencia).toBe("3010");
  });

  it("la concéntrica explosiva cambia la tercera cifra, y no al aislamiento", () => {
    expect(prescribir({ ...base, jerarquia: 1, explosiva: true }).cadencia).toBe("30X0");
    expect(prescribir({ ...base, jerarquia: 3, aislamiento: true, explosiva: true }).cadencia).toBe("2011");
  });

  it("explosiva: con bloque manda el bloque; sin él, el objetivo", () => {
    expect(esExplosiva(P, "Realización", "hipertrofia")).toBe(true);
    expect(esExplosiva(P, "Acumulación", "fuerza")).toBe(false);
    expect(esExplosiva(P, undefined, "fuerza")).toBe(true);
    expect(esExplosiva(P, undefined, "hipertrofia")).toBe(false);
  });

  it("una cadencia mal escrita en el método se rechaza", () => {
    expect(validarPrescripcion({ cadencia_por_jerarquia: { "2": "31-0" } })).toContain(
      "La cadencia de J2 son cuatro cifras, como 3010.",
    );
    expect(validarPrescripcion({ tolerancia_series: 9 })).toContain("La tolerancia de series tiene que ir de 0 a 4.");
  });
});

describe("ondulante diario A/B (16-nov)", () => {
  const torso = { patrones: ["horizontal_push", "vertical_pull"] };
  const pierna = { patrones: ["squat_dominante_rodilla", "isolation_accessory"] };
  const full = { patrones: ["squat_dominante_rodilla", "horizontal_push"] };

  it("alterna dentro de cada segmento, no por posición en la semana", () => {
    expect(sesionesOndulantes([torso, pierna, torso, pierna])).toEqual(["A", "A", "B", "B"]);
    expect(sesionesOndulantes([pierna, torso, pierna, torso, pierna])).toEqual(["A", "A", "B", "B", "A"]);
  });

  it("lo que sale una sola vez no ondula", () => {
    expect(sesionesOndulantes([torso, pierna, full])).toEqual([null, null, null]);
  });

  it("la sesión fija repeticiones y la cadencia de lo multiarticular", () => {
    const A = P.ondulanteDiario!.A;
    expect(prescribir({ ...base, jerarquia: 1, sesion: A })).toEqual({ repMin: 6, repMax: 8, cadencia: "2010" });
    expect(prescribir({ ...base, jerarquia: 3, aislamiento: true, sesion: A }).cadencia).toBe("2011");
  });
});

describe("hipertensión: 12–15 repeticiones en vez de excluir (16-nov)", () => {
  it("el rango del motor manda sobre la sesión y el modelo", () => {
    const r = prescribir({ ...base, jerarquia: 1, sesion: P.ondulanteDiario!.A, rangoMotor: { min: 12, max: 15 } });
    expect([r.repMin, r.repMax]).toEqual([12, 15]);
  });

  it("la acción valida su rango", () => {
    expect(validarAcciones({ rango_repeticiones: { min: 12, max: 15 } })).toEqual([]);
    expect(validarAcciones({ rango_repeticiones: { min: 15, max: 12 } })).toContain(
      "El rango de repeticiones no es válido.",
    );
  });
});

describe("carga axial: dos J1 axiales no van en la misma sesión (16-nov)", () => {
  const cand = (nombre: string, patron: string, musculo: string, axial: boolean): Candidato => ({
    nombre, patron, musculo, grupo: null, aislamiento: false, prioritario: false, modificadores: [],
    sustitutos: [], jerarquia: 1, perfil: "medio", guiada: false, cadencia: null, axial,
  });

  it("la sentadilla libre deja fuera al peso muerto, no a la prensa", () => {
    const elegidos = elegirDelDia(
      { titulo: "Pierna", patrones: ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"] },
      [
        cand("Sentadilla Barra Trasera", "squat_dominante_rodilla", "Cuádriceps", true),
        cand("Peso Muerto Tradicional", "hip_hinge_dominante_cadera", "Isquiosurales", true),
        cand("Hip Thrust con Barra", "hip_hinge_dominante_cadera", "Glúteo", false),
      ],
      new Set(),
      { min: 3, max: 3 },
      null,
    ).map((c) => c.nombre);
    expect(elegidos).toContain("Sentadilla Barra Trasera");
    expect(elegidos).not.toContain("Peso Muerto Tradicional");
    expect(elegidos).toContain("Hip Thrust con Barra");
  });
});
