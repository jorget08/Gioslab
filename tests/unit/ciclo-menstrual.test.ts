import { describe, expect, it } from "vitest";

import {
  adaptacionPorCiclo,
  avisoDuracionCiclo,
  picoOvulatorio,
  diaDelCiclo,
  faseMenstrual,
  multiplicadorVolumen,
  PRESCRIPCION_FASE,
  type RegistroCiclo,
} from "@/domain/calculations/ciclo-menstrual";

/**
 * GOLDEN TESTS del módulo FEMTECH.
 *
 * Caso del Excel: FUM 10/08/2026, ciclo de 28 días, sin anticonceptivos. Con la
 * fecha en que se generó la hoja (19/08/2026) da día 9 y "Folicular Tardía".
 *
 * ⚠️ Los MULTIPLICADORES ya no son los del Excel. Su matriz de condicionales
 * (2026-08-25) los afinó —1.15 en vez de 1.1, y 0.75 en vez de 0.8— y es
 * posterior, así que manda. El día y la fase sí siguen coincidiendo con la hoja.
 */
const BASE: RegistroCiclo = {
  ultimaMenstruacion: new Date(2026, 7, 10), // 10 de agosto de 2026
  duracionCicloDias: 28,
  usaAnticonceptivos: false,
};

const HOY = new Date(2026, 7, 19); // 19 de agosto de 2026

describe("caso del Excel", () => {
  it("día del ciclo = 9 (celda E48)", () => {
    expect(diaDelCiclo(BASE, HOY)).toBe(9);
  });

  it("fase = Folicular Tardía (celda E49)", () => {
    expect(faseMenstrual(BASE, HOY)).toBe("Folicular Tardía");
  });

  it("multiplicador de volumen = 1.15 (afinado en su matriz)", () => {
    expect(adaptacionPorCiclo(BASE, HOY).multiplicadorVolumen).toBe(1.15);
  });

  it("ajuste biomecánico = Estándar por Palancas (celda E51)", () => {
    expect(adaptacionPorCiclo(BASE, HOY).ajusteBiomecanico).toBe("Estándar por Palancas");
  });
});

describe("cortes entre fases", () => {
  const enDia = (d: number) =>
    faseMenstrual(BASE, new Date(2026, 7, 10 + d));

  it("días 0 a 5: Folicular Temprana", () => {
    expect(enDia(0)).toBe("Folicular Temprana");
    expect(enDia(5)).toBe("Folicular Temprana");
  });

  it("días 6 a 14: Folicular Tardía, que ahora absorbe la ovulación", () => {
    expect(enDia(6)).toBe("Folicular Tardía");
    expect(enDia(14)).toBe("Folicular Tardía");
  });

  it("días 15 a 22: Lútea Temprana", () => {
    // Fase nueva de su matriz; antes esos días caían en Lútea Tardía.
    expect(enDia(15)).toBe("Lútea Temprana");
    expect(enDia(22)).toBe("Lútea Temprana");
  });

  it("día 23 en adelante: Lútea Tardía", () => {
    expect(enDia(23)).toBe("Lútea Tardía");
    expect(enDia(27)).toBe("Lútea Tardía");
  });
});

describe("pico ovulatorio: bandera, no fase", () => {
  const enDia = (d: number) => new Date(2026, 7, 10 + d);

  it("se levanta los días 12 a 14 sin dejar de ser Folicular Tardía", () => {
    // Es la distinción que pidió Giovanni: la fase gestiona volumen metabólico
    // y esto es seguridad articular. Si fuera una fase, una cosa taparía la otra.
    for (const d of [12, 13, 14]) {
      expect(picoOvulatorio(BASE, enDia(d)), `día ${d}`).toBe(true);
      expect(faseMenstrual(BASE, enDia(d)), `día ${d}`).toBe("Folicular Tardía");
    }
  });

  it("baja fuera de esos días", () => {
    for (const d of [11, 15, 5, 25]) {
      expect(picoOvulatorio(BASE, enDia(d)), `día ${d}`).toBe(false);
    }
  });

  it("dispara el ajuste de máquinas por laxitud ligamentosa", () => {
    // La regla que casi se pierde al pasar de cinco fases a cuatro.
    expect(adaptacionPorCiclo(BASE, enDia(13)).ajusteBiomecanico).toBe(
      "Priorizar Máquinas (Laxitud)",
    );
    expect(adaptacionPorCiclo(BASE, enDia(9)).ajusteBiomecanico).toBe("Estándar por Palancas");
  });

  it("no se levanta con anticonceptivos: no hay pico que proteger", () => {
    expect(picoOvulatorio({ ...BASE, usaAnticonceptivos: true }, enDia(13))).toBe(false);
  });

  it("el volumen NO cambia por el pico: solo cambia la selección", () => {
    // Sube 1.15 por ser Folicular Tardía, no por el pico.
    expect(adaptacionPorCiclo(BASE, enDia(13)).multiplicadorVolumen).toBe(1.15);
  });
});

describe("multiplicador por fase", () => {
  it("Folicular Tardía sube el volumen un 15 %", () => {
    expect(multiplicadorVolumen("Folicular Tardía")).toBe(1.15);
  });

  it("Lútea Tardía lo baja un 25 %", () => {
    expect(multiplicadorVolumen("Lútea Tardía")).toBe(0.75);
  });

  it("las demás fases no lo tocan", () => {
    expect(multiplicadorVolumen("Folicular Temprana")).toBe(1);
    expect(multiplicadorVolumen("Lútea Temprana")).toBe(1);
    expect(multiplicadorVolumen("Anticonceptivo")).toBe(1);
  });
});

describe("anticonceptivos hormonales", () => {
  const conAnticonceptivos = { ...BASE, usaAnticonceptivos: true };

  it("mandan sobre el día del ciclo", () => {
    expect(faseMenstrual(conAnticonceptivos, HOY)).toBe("Anticonceptivo");
  });

  it("y desactivan el ajuste de volumen", () => {
    expect(adaptacionPorCiclo(conAnticonceptivos, HOY).multiplicadorVolumen).toBe(1);
  });
});

describe("casos límite", () => {
  it("el ciclo se repite: día 28 vuelve a ser día 0", () => {
    expect(diaDelCiclo(BASE, new Date(2026, 7, 10 + 28))).toBe(0);
  });

  it("respeta una duración distinta de 28 días", () => {
    const ciclo35 = { ...BASE, duracionCicloDias: 35 };
    expect(diaDelCiclo(ciclo35, new Date(2026, 7, 10 + 30))).toBe(30);
  });

  it("una FUM en el futuro no produce un día negativo", () => {
    // Pasa si alguien teclea mal la fecha. Debe degradar, no romper.
    const futura = { ...BASE, ultimaMenstruacion: new Date(2026, 7, 25) };
    const d = diaDelCiclo(futura, HOY);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(28);
  });

  it("la hora del día no cambia el resultado", () => {
    // Una evaluación a las 7 p.m. en Bogotá no debe caer en el día siguiente.
    const manana = new Date(2026, 7, 19, 7, 0);
    const noche = new Date(2026, 7, 19, 23, 30);
    expect(diaDelCiclo(BASE, manana)).toBe(diaDelCiclo(BASE, noche));
  });
});

describe("prescripción por fase", () => {
  it("cada fase tiene efecto fisiológico y ajuste, no solo un multiplicador", () => {
    // El número por sí solo no le dice nada al entrenador: "×0.75" no explica
    // por qué su atleta rinde menos esta semana (CLAUDE.md §3.6).
    for (const fase of Object.keys(PRESCRIPCION_FASE) as (keyof typeof PRESCRIPCION_FASE)[]) {
      expect(PRESCRIPCION_FASE[fase].efecto.length).toBeGreaterThan(0);
      expect(PRESCRIPCION_FASE[fase].ajuste.length).toBeGreaterThan(0);
      expect(PRESCRIPCION_FASE[fase].rango.length).toBeGreaterThan(0);
    }
  });

  it("adaptacionPorCiclo entrega la prescripción de la fase que calculó", () => {
    const enFolicularTardia = adaptacionPorCiclo(BASE, new Date(2026, 7, 19));
    expect(enFolicularTardia.fase).toBe("Folicular Tardía");
    expect(enFolicularTardia.prescripcion).toBe(PRESCRIPCION_FASE["Folicular Tardía"]);
    expect(enFolicularTardia.prescripcion.ajuste).toContain("RIR 1-0");
  });

  it("con anticonceptivos la prescripción explica por qué no hay ajuste", () => {
    const conAnti = adaptacionPorCiclo({ ...BASE, usaAnticonceptivos: true });
    expect(conAnti.multiplicadorVolumen).toBe(1);
    expect(conAnti.prescripcion.ajuste).toContain("sin ajuste por fase");
  });
});

describe("avisoDuracionCiclo", () => {
  it("no dice nada dentro del rango habitual que especificó Giovanni", () => {
    expect(avisoDuracionCiclo(28)).toBeNull();
    expect(avisoDuracionCiclo(21)).toBeNull();
    expect(avisoDuracionCiclo(35)).toBeNull();
  });

  it("advierte pero deja continuar en un ciclo irregular", () => {
    // Un ciclo de 38 días existe. Bloquearlo dejaría a esa atleta sin el módulo.
    const aviso = avisoDuracionCiclo(38);
    expect(aviso?.nivel).toBe("advierte");
  });

  it("bloquea lo que la base rechazaría", () => {
    expect(avisoDuracionCiclo(9)?.nivel).toBe("bloquea");
    expect(avisoDuracionCiclo(46)?.nivel).toBe("bloquea");
  });
});
