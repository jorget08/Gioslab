import { describe, expect, it } from "vitest";

import {
  estadoExtensionToracica,
  estadoROM,
  fueraDeRango,
  perfilMovilidad,
  severidadDorsiflexion,
  TESTS,
  TESTS_MOVILIDAD,
  testsCompletados,
  TOTAL_TESTS,
} from "@/domain/movilidad";

describe("estadoROM", () => {
  it("clasifica la dorsiflexión con el umbral de 10 cm de su ficha", () => {
    expect(estadoROM("ankle_dorsiflexion_cm", 12)).toBe("Óptimo");
    expect(estadoROM("ankle_dorsiflexion_cm", 8)).toBe("Restringido");
  });

  it("el umbral es inclusivo: justo en el valor límite es Óptimo", () => {
    // Importa porque un 10.0 clavado es un caso real de medición, y dejarlo en
    // Restringido cambiaría la prescripción por un decimal.
    expect(estadoROM("ankle_dorsiflexion_cm", 10)).toBe("Óptimo");
    expect(estadoROM("hip_flexion_deg", 120)).toBe("Óptimo");
    expect(estadoROM("hip_internal_rotation_deg", 30)).toBe("Óptimo");
    expect(estadoROM("shoulder_flexion_deg", 170)).toBe("Óptimo");
    expect(estadoROM("shoulder_external_rotation_deg", 90)).toBe("Óptimo");
    expect(estadoROM("slr_deg", 70)).toBe("Óptimo");
    expect(estadoROM("thomas_test_deg", 0)).toBe("Óptimo");
  });

  it("un punto por debajo del umbral ya es Restringido", () => {
    expect(estadoROM("hip_flexion_deg", 119)).toBe("Restringido");
    expect(estadoROM("hip_internal_rotation_deg", 29)).toBe("Restringido");
    expect(estadoROM("shoulder_flexion_deg", 169)).toBe("Restringido");
    expect(estadoROM("slr_deg", 69)).toBe("Restringido");
  });

  it("el hombro corta en 170, no en 180", () => {
    // Giovanni lo corrigió citando a la AAOS: con 180 estricto, 178° salía
    // restringido y bloqueaba trabajo overhead a atletas sanos. Descartó
    // también los 175° que aparecían en su propia matriz.
    expect(estadoROM("shoulder_flexion_deg", 178)).toBe("Óptimo");
    expect(estadoROM("shoulder_flexion_deg", 172)).toBe("Óptimo");
  });

  it("la rotación externa de hombro se queda en 90", () => {
    // Su matriz decía 70, pero aclaró que ese es el mínimo clínico de población
    // sedentaria: en alguien que hace trabajo overhead el estándar es 90.
    expect(estadoROM("shoulder_external_rotation_deg", 75)).toBe("Restringido");
  });

  it("el Thomas Test es el único que admite negativos, y son los que importan", () => {
    // Por debajo de cero el muslo no llega a la horizontal: flexores acortados.
    expect(estadoROM("thomas_test_deg", -10)).toBe("Restringido");
    expect(estadoROM("thomas_test_deg", 5)).toBe("Óptimo");
    expect(fueraDeRango("thomas_test_deg", -20)).toBeNull();
  });

  it("un test sin tomar es null, NO es Óptimo", () => {
    // La distinción es de seguridad: tratar un dato ausente como favorable
    // sería prescribir sentadilla profunda a quien nadie le midió el tobillo.
    expect(estadoROM("ankle_dorsiflexion_cm", null)).toBeNull();
    expect(estadoROM("ankle_dorsiflexion_cm", undefined)).toBeNull();
    expect(estadoROM("ankle_dorsiflexion_cm", NaN)).toBeNull();
  });

  it("un cero medido sí es un dato, y es Restringido", () => {
    // Cero es falsy en JavaScript; si se colara en la comprobación de ausencia,
    // una dorsiflexión nula pasaría por "sin medir".
    expect(estadoROM("ankle_dorsiflexion_cm", 0)).toBe("Restringido");
  });
});

describe("severidadDorsiflexion", () => {
  it("distingue las dos bandas restringidas de su ficha", () => {
    // Cada una dispara una acción distinta: <10 calzado de elevación,
    // <5 Hack Squat y prensa. Colapsarlas perdería una regla suya.
    expect(severidadDorsiflexion(3)).toBe("Severa");
    expect(severidadDorsiflexion(7)).toBe("Limitada");
    expect(severidadDorsiflexion(14)).toBe("Óptima");
  });

  it("respeta los bordes exactos 5 y 10", () => {
    expect(severidadDorsiflexion(4.9)).toBe("Severa");
    expect(severidadDorsiflexion(5)).toBe("Limitada");
    expect(severidadDorsiflexion(9.9)).toBe("Limitada");
    expect(severidadDorsiflexion(10)).toBe("Óptima");
  });

  it("no contradice al estado binario: Severa y Limitada son Restringido", () => {
    for (const cm of [0, 2, 4.9, 5, 7, 9.9]) {
      expect(severidadDorsiflexion(cm)).not.toBe("Óptima");
      expect(estadoROM("ankle_dorsiflexion_cm", cm)).toBe("Restringido");
    }
    for (const cm of [10, 12, 20]) {
      expect(severidadDorsiflexion(cm)).toBe("Óptima");
      expect(estadoROM("ankle_dorsiflexion_cm", cm)).toBe("Óptimo");
    }
  });
});

describe("extensión torácica", () => {
  it("Normal es Óptimo y Cifótica es Restringido", () => {
    expect(estadoExtensionToracica("Normal")).toBe("Óptimo");
    expect(estadoExtensionToracica("Cifótica")).toBe("Restringido");
  });

  it("sin observar es null", () => {
    expect(estadoExtensionToracica(null)).toBeNull();
    expect(estadoExtensionToracica(undefined)).toBeNull();
  });
});

describe("fueraDeRango", () => {
  it("acepta los extremos del CHECK de la tabla", () => {
    expect(fueraDeRango("hip_flexion_deg", 0)).toBeNull();
    expect(fueraDeRango("hip_flexion_deg", 180)).toBeNull();
  });

  it("rechaza lo que la base rechazaría, para no perder el trabajo al guardar", () => {
    expect(fueraDeRango("hip_flexion_deg", 181)).toContain("Flexión de cadera");
    expect(fueraDeRango("hip_internal_rotation_deg", 91)).not.toBeNull();
    expect(fueraDeRango("ankle_dorsiflexion_cm", 31)).not.toBeNull();
    expect(fueraDeRango("ankle_dorsiflexion_cm", -1)).not.toBeNull();
  });

  it("los rangos coinciden con los umbrales: el umbral siempre cabe en el rango", () => {
    for (const [clave, meta] of Object.entries(TESTS)) {
      expect(meta.umbralOptimo).toBeGreaterThanOrEqual(meta.min);
      expect(meta.umbralOptimo).toBeLessThanOrEqual(meta.max);
      expect(fueraDeRango(clave as keyof typeof TESTS, meta.umbralOptimo)).toBeNull();
    }
  });
});

describe("perfilMovilidad", () => {
  it("devuelve los seis tests aunque no se haya tomado ninguno", () => {
    // Ocultar los vacíos escondería que la evaluación está incompleta.
    const perfil = perfilMovilidad({});
    expect(perfil).toHaveLength(TOTAL_TESTS);
    expect(perfil.every((r) => r.estado === null)).toBe(true);
    expect(perfil.every((r) => r.medida === null)).toBe(true);
  });

  it("recorre al atleta en orden anatómico: tobillo, cadera, torso, hombro", () => {
    // Thomas Test y SLR entran entre las de cadera, que es donde se exploran.
    expect(perfilMovilidad({}).map((r) => r.test)).toEqual([
      "ankle_dorsiflexion_cm",
      "hip_flexion_deg",
      "hip_internal_rotation_deg",
      "thomas_test_deg",
      "slr_deg",
      "thoracic_extension",
      "shoulder_flexion_deg",
      "shoulder_external_rotation_deg",
    ]);
  });

  it("el orden del catálogo y el del perfil no pueden divergir", () => {
    // Hay dos sitios que declaran el orden —TESTS_MOVILIDAD y las claves de
    // TESTS— y al añadir el Thomas Test se desincronizaron. Esto lo caza.
    expect(perfilMovilidad({}).map((r) => r.test)).toEqual([...TESTS_MOVILIDAD]);
  });

  it("los dos tests nuevos SE SUMAN: no desaparece ninguno de los anteriores", () => {
    // Su matriz los omitía y se le preguntó. Respuesta: mantener flexión y
    // rotación interna de cadera, "cruciales para el espacio femoroacetabular".
    const claves = perfilMovilidad({}).map((r) => r.test);
    expect(claves).toContain("hip_flexion_deg");
    expect(claves).toContain("hip_internal_rotation_deg");
    expect(claves).toHaveLength(8);
  });

  it("formatea la medida con su unidad", () => {
    const perfil = perfilMovilidad({ ankle_dorsiflexion_cm: 8.5, hip_flexion_deg: 130 });
    expect(perfil[0].medida).toBe("8.5cm");
    expect(perfil[1].medida).toBe("130°");
  });

  it("clasifica una evaluación mixta sin contagiar estados entre tests", () => {
    const perfil = perfilMovilidad({
      ankle_dorsiflexion_cm: 6,
      hip_flexion_deg: 130,
      thoracic_extension: "Cifótica",
    });
    const por = (t: string) => perfil.find((r) => r.test === t)!;
    expect(por("ankle_dorsiflexion_cm").estado).toBe("Restringido");
    expect(por("hip_flexion_deg").estado).toBe("Óptimo");
    expect(por("hip_internal_rotation_deg").estado).toBeNull();
    expect(por("thomas_test_deg").estado).toBeNull();
    expect(por("thoracic_extension").estado).toBe("Restringido");
  });
});

describe("testsCompletados", () => {
  it("cuenta solo los tomados", () => {
    expect(testsCompletados({})).toBe(0);
    expect(testsCompletados({ ankle_dorsiflexion_cm: 9, thoracic_extension: "Normal" })).toBe(2);
  });

  it("cuenta el cero como tomado", () => {
    expect(testsCompletados({ hip_internal_rotation_deg: 0 })).toBe(1);
  });

  it("llega al total con los ocho puestos", () => {
    expect(
      testsCompletados({
        ankle_dorsiflexion_cm: 10,
        hip_flexion_deg: 120,
        hip_internal_rotation_deg: 30,
        thomas_test_deg: 5,
        slr_deg: 80,
        thoracic_extension: "Normal",
        shoulder_flexion_deg: 175,
        shoulder_external_rotation_deg: 90,
      }),
    ).toBe(TOTAL_TESTS);
  });

  it("un Thomas Test en cero cuenta como tomado", () => {
    // Cero es falsy y además es el umbral: si se colara en la comprobación de
    // ausencia, el test peor clasificado pasaría por "sin medir".
    expect(testsCompletados({ thomas_test_deg: 0 })).toBe(1);
  });
});
