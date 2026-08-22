import { describe, expect, it } from "vitest";

import {
  compararEvidencia,
  esNivelEvidencia,
  mandaSobre,
  NIVELES_EVIDENCIA,
  ordenarPorEvidencia,
  resolverConflicto,
  type NivelEvidencia,
} from "@/domain/evidencia";

const regla = (id: string, evidence_level: NivelEvidencia) => ({ id, evidence_level });

describe("jerarquía de evidencia", () => {
  it("mantiene el orden exacto que especificó Giovanni: A > B > C > D", () => {
    const [a, b, c, d] = NIVELES_EVIDENCIA;
    expect(mandaSobre(a, b)).toBe(true);
    expect(mandaSobre(b, c)).toBe(true);
    expect(mandaSobre(c, d)).toBe(true);
    // Y la transitividad, que es lo que hace que el orden sea total.
    expect(mandaSobre(a, d)).toBe(true);
  });

  it("no considera que un nivel se gane a sí mismo", () => {
    for (const n of NIVELES_EVIDENCIA) {
      expect(mandaSobre(n, n)).toBe(false);
      expect(compararEvidencia(n, n)).toBe(0);
    }
  });

  it("es antisimétrico: si a gana a b, b no gana a a", () => {
    for (const a of NIVELES_EVIDENCIA) {
      for (const b of NIVELES_EVIDENCIA) {
        if (mandaSobre(a, b)) expect(mandaSobre(b, a)).toBe(false);
      }
    }
  });

  it("reconoce los cuatro niveles y rechaza el resto", () => {
    expect(esNivelEvidencia("LEVEL_A_SCIENCE")).toBe(true);
    // El valor que usaba el ejemplo del CLAUDE.md antes de su respuesta.
    expect(esNivelEvidencia("criterio_profesional")).toBe(false);
    expect(esNivelEvidencia("")).toBe(false);
  });
});

describe("ordenarPorEvidencia", () => {
  it("pone primero la de mayor peso", () => {
    const orden = ordenarPorEvidencia([
      regla("consenso", "LEVEL_C_CONSENSUS"),
      regla("ciencia", "LEVEL_A_SCIENCE"),
      regla("override", "LEVEL_D_OVERRIDE"),
      regla("biomec", "LEVEL_B_BIOMECHANICS"),
    ]);
    expect(orden.map((r) => r.id)).toEqual(["ciencia", "biomec", "consenso", "override"]);
  });

  it("es estable: dos reglas del mismo nivel conservan su orden de entrada", () => {
    const orden = ordenarPorEvidencia([
      regla("primera", "LEVEL_B_BIOMECHANICS"),
      regla("segunda", "LEVEL_B_BIOMECHANICS"),
      regla("tercera", "LEVEL_B_BIOMECHANICS"),
    ]);
    expect(orden.map((r) => r.id)).toEqual(["primera", "segunda", "tercera"]);
  });

  it("no muta el arreglo original", () => {
    const original = [regla("c", "LEVEL_C_CONSENSUS"), regla("a", "LEVEL_A_SCIENCE")];
    ordenarPorEvidencia(original);
    expect(original.map((r) => r.id)).toEqual(["c", "a"]);
  });
});

describe("resolverConflicto", () => {
  it("la evidencia científica le gana al criterio del entrenador", () => {
    const r = resolverConflicto([
      regla("override", "LEVEL_D_OVERRIDE"),
      regla("ciencia", "LEVEL_A_SCIENCE"),
    ]);
    expect(r?.ganadora.id).toBe("ciencia");
    expect(r?.empatadas).toHaveLength(1);
  });

  it("delata el empate en vez de escoger en silencio", () => {
    // Dos reglas del mismo nivel que se contradicen son un defecto de la
    // matriz. El motor tiene que poder decirlo, no taparlo.
    const r = resolverConflicto([
      regla("prioriza", "LEVEL_B_BIOMECHANICS"),
      regla("excluye", "LEVEL_B_BIOMECHANICS"),
      regla("irrelevante", "LEVEL_D_OVERRIDE"),
    ]);
    expect(r?.empatadas.map((x) => x.id)).toEqual(["prioriza", "excluye"]);
  });

  it("devuelve null sin reglas, en vez de inventar una ganadora", () => {
    expect(resolverConflicto([])).toBeNull();
  });

  it("con una sola regla, esa gana y no hay empate", () => {
    const r = resolverConflicto([regla("unica", "LEVEL_C_CONSENSUS")]);
    expect(r?.ganadora.id).toBe("unica");
    expect(r?.empatadas).toHaveLength(1);
  });
});
