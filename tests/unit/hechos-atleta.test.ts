import { describe, expect, it } from "vitest";

import { resolverHechos } from "@/domain/hechos-atleta";
import { HECHOS, type ClaveHecho } from "@/domain/reglas";

const HOY = new Date(2026, 7, 19); // 19 de agosto de 2026

describe("resolverHechos", () => {
  it("traduce las columnas de la evaluación biomecánica", () => {
    const h = resolverHechos({
      biomecanica: {
        ankle_dorsiflexion_cm: 7.5,
        shoulder_flexion_deg: 175,
        thomas_test_deg: -8,
        slr_deg: 62,
        thoracic_extension: "Cifótica",
      },
    });
    expect(h.dorsiflexion_cm).toBe(7.5);
    expect(h.flexion_hombro_grados).toBe(175);
    expect(h.thomas_test_grados).toBe(-8);
    expect(h.slr_grados).toBe(62);
    expect(h.extension_toracica).toBe("Cifótica");
  });

  it("LO QUE FALTA, FALTA: no se rellena con un valor neutro", () => {
    // Es la misma razón por la que estadoROM devuelve null: dar por buena una
    // movilidad que nadie midió es prescribir a ciegas.
    const h = resolverHechos({ biomecanica: { ankle_dorsiflexion_cm: null } });
    expect("dorsiflexion_cm" in h).toBe(false);
    expect("flexion_hombro_grados" in h).toBe(false);
  });

  it("sin evaluación biomecánica no inventa ningún rango", () => {
    const h = resolverHechos({});
    expect(h.dorsiflexion_cm).toBeUndefined();
    expect(h.flexion_cadera_grados).toBeUndefined();
  });

  it("un cero medido sí viaja", () => {
    // Cero es falsy: si se colara en la comprobación de ausencia, el peor
    // Thomas Test posible pasaría por "sin medir".
    const h = resolverHechos({ biomecanica: { thomas_test_deg: 0 } });
    expect(h.thomas_test_grados).toBe(0);
  });

  it("las lesiones vacías SÍ se ponen: 'no tiene ninguna' es un dato", () => {
    // Si se omitieran, una regla de `no_incluye` quedaría eternamente sin
    // evaluar en un atleta sano y el motor lo daría por incompleto.
    const h = resolverHechos({});
    expect(h.lesiones).toEqual([]);
    expect(h.condiciones).toEqual([]);
  });

  it("arrastra lesiones y condiciones tal cual llegan", () => {
    const h = resolverHechos({ lesiones: ["Rodilla"], condiciones: ["Embarazo"] });
    expect(h.lesiones).toEqual(["Rodilla"]);
    expect(h.condiciones).toEqual(["Embarazo"]);
  });

  it("calcula la fase del ciclo en vez de leerla", () => {
    // Depende de la fecha de hoy, así que guardarla la dejaría obsoleta al día
    // siguiente (§3.4).
    const h = resolverHechos(
      { ciclo: { last_period_start: "2026-08-10", cycle_length_days: 28, uses_hormonal_contraception: false } },
      HOY,
    );
    expect(h.fase_ciclo).toBe("Folicular Tardía");
    expect(h.usa_anticonceptivos).toBe(false);
  });

  it("levanta el pico ovulatorio en los días 12 a 14", () => {
    const h = resolverHechos(
      { ciclo: { last_period_start: "2026-08-10", cycle_length_days: 28, uses_hormonal_contraception: false } },
      new Date(2026, 7, 23),
    );
    expect(h.pico_ovulatorio).toBe(true);
    expect(h.fase_ciclo).toBe("Folicular Tardía");
  });

  it("sin registro de ciclo no hay fase, y eso es correcto", () => {
    // Un hombre no tiene fase que medir. Poner una por defecto haría que el
    // motor le reclamara al entrenador una medición imposible.
    const h = resolverHechos({ atleta: { sex: "masculino" } });
    expect("fase_ciclo" in h).toBe(false);
    expect("pico_ovulatorio" in h).toBe(false);
  });

  it("no confunde la zona horaria: el día 1 es el día 1 en Bogotá", () => {
    const h = resolverHechos(
      { ciclo: { last_period_start: "2026-08-10", cycle_length_days: 28 } },
      new Date(2026, 7, 10, 23, 30),
    );
    expect(h.fase_ciclo).toBe("Folicular Temprana");
  });

  it("toda clave que produce está declarada en el catálogo de hechos", () => {
    // Si aquí apareciera una clave que el motor no conoce, sería un hecho
    // invisible: se resolvería y ninguna regla podría mirarlo.
    const h = resolverHechos({
      atleta: { sex: "femenino" },
      biomecanica: {
        ankle_dorsiflexion_cm: 8, hip_flexion_deg: 130, hip_internal_rotation_deg: 30,
        thomas_test_deg: 5, slr_deg: 80, thoracic_extension: "Normal",
        shoulder_flexion_deg: 175, shoulder_external_rotation_deg: 90,
        squat_dominance: "Dominante de Rodilla", glute_vector: "Vector Horizontal",
        back_dominance: "Vector Vertical (Dorsal)", axial_load_tolerance: "Tolerancia Normal",
        femur_torso_ratio: "Fémur Largo / Torso Corto",
      },
      medicion: { body_fat_pct: 18 },
      ciclo: { last_period_start: "2026-08-10", cycle_length_days: 28 },
    });
    for (const clave of Object.keys(h)) {
      expect(HECHOS[clave as ClaveHecho], clave).toBeDefined();
    }
  });

  it("con la ficha completa resuelve los diecinueve hechos del catálogo", () => {
    const h = resolverHechos({
      atleta: { sex: "femenino" },
      biomecanica: {
        ankle_dorsiflexion_cm: 8, hip_flexion_deg: 130, hip_internal_rotation_deg: 30,
        thomas_test_deg: 5, slr_deg: 80, thoracic_extension: "Normal",
        shoulder_flexion_deg: 175, shoulder_external_rotation_deg: 90,
        squat_dominance: "Dominante de Rodilla", glute_vector: "Vector Horizontal",
        back_dominance: "Vector Vertical (Dorsal)", axial_load_tolerance: "Tolerancia Normal",
        femur_torso_ratio: "Fémur Largo / Torso Corto",
      },
      medicion: { body_fat_pct: 18 },
      ciclo: { last_period_start: "2026-08-10", cycle_length_days: 28 },
    });
    expect(Object.keys(h).length).toBe(Object.keys(HECHOS).length);
  });
});
