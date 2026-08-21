import { describe, expect, it } from "vitest";

import { edadEnAnios, haceCuanto } from "@/domain/catalogos";
import { aplicaModuloCiclo, atletaSchema, lesionSchema } from "@/lib/validation/atleta";

const BASE = {
  nombre: "María Fernanda Gómez",
  fechaNacimiento: "1996-05-15",
  sexo: "femenino" as const,
  objetivos: [],
  lesiones: [],
  consienteSalud: true,
  consienteCiclo: false,
};

describe("atletaSchema", () => {
  it("acepta un alta correcta", () => {
    expect(atletaSchema.safeParse(BASE).success).toBe(true);
  });

  it("recorta el nombre antes de medirlo", () => {
    const r = atletaSchema.safeParse({ ...BASE, nombre: "   " });
    expect(r.success).toBe(false);
  });

  it("SIN consentimiento de salud no se puede guardar", () => {
    // Es el requisito de la Ley 1581, no una preferencia de producto.
    const r = atletaSchema.safeParse({ ...BASE, consienteSalud: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toMatch(/autorización/i);
    }
  });

  it("el consentimiento del ciclo NO es obligatorio", () => {
    expect(atletaSchema.safeParse({ ...BASE, consienteCiclo: false }).success).toBe(true);
    expect(atletaSchema.safeParse({ ...BASE, consienteCiclo: true }).success).toBe(true);
  });

  it("explica para qué se pide la fecha de nacimiento", () => {
    const r = atletaSchema.safeParse({ ...BASE, fechaNacimiento: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      // Un "campo obligatorio" no le dice nada a alguien de pie en un gimnasio.
      expect(r.error.issues[0].message).toMatch(/porcentaje graso/i);
    }
  });

  it("rechaza una fecha de nacimiento futura", () => {
    expect(atletaSchema.safeParse({ ...BASE, fechaNacimiento: "2099-01-01" }).success).toBe(false);
  });

  it("rechaza un año imposible", () => {
    expect(atletaSchema.safeParse({ ...BASE, fechaNacimiento: "1823-04-02" }).success).toBe(false);
  });

  it("el sexo es obligatorio y explica por qué", () => {
    const r = atletaSchema.safeParse({ ...BASE, sexo: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/fórmula/i);
  });

  it("solo admite los objetivos del catálogo de Giovanni", () => {
    expect(atletaSchema.safeParse({ ...BASE, objetivo: "Ponerse mamado" }).success).toBe(false);
    expect(
      atletaSchema.safeParse({ ...BASE, objetivo: "Hipertrofia (Masa Muscular)" }).success,
    ).toBe(true);
  });

  it('acepta "" en los opcionales: es lo que devuelve un select vacío', () => {
    // Sin esto, no elegir objetivo —el caso normal— rompía el formulario.
    const r = atletaSchema.safeParse({ ...BASE, objetivo: "", nivel: "", notas: "  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.objetivo).toBeUndefined();
      expect(r.data.nivel).toBeUndefined();
      expect(r.data.notas).toBeUndefined();
    }
  });

  it("los objetivos jerarquizados conservan el orden", () => {
    const r = atletaSchema.parse({ ...BASE, objetivos: ["Volver a correr", "Ganar fuerza"] });
    // El orden ES la prioridad; reordenarlos cambiaría el significado.
    expect(r.objetivos).toEqual(["Volver a correr", "Ganar fuerza"]);
  });
});

describe("lesionSchema", () => {
  it("exige la zona del cuerpo", () => {
    expect(lesionSchema.safeParse({ zona: "", estado: "activa" }).success).toBe(false);
  });

  it("acepta texto libre en la zona", () => {
    // El vocabulario de Giovanni no está definido: es preferible que escriba
    // "manguito rotador" a que no pueda registrar la lesión.
    expect(lesionSchema.safeParse({ zona: "Manguito rotador", estado: "cronica" }).success).toBe(
      true,
    );
  });

  it("solo admite los tres estados de la base", () => {
    expect(lesionSchema.safeParse({ zona: "Rodilla", estado: "inventado" }).success).toBe(false);
  });
});

describe("aplicaModuloCiclo", () => {
  it("solo para sexo femenino", () => {
    expect(aplicaModuloCiclo("femenino")).toBe(true);
    expect(aplicaModuloCiclo("masculino")).toBe(false);
    expect(aplicaModuloCiclo(undefined)).toBe(false);
  });
});

describe("edadEnAnios", () => {
  it("no cuenta el cumpleaños que aún no llegó", () => {
    // Nacida el 15 de mayo; al 1 de marzo todavía tiene 29.
    expect(edadEnAnios(new Date(1996, 4, 15), new Date(2026, 2, 1))).toBe(29);
  });

  it("cuenta el año el mismo día del cumpleaños", () => {
    expect(edadEnAnios(new Date(1996, 4, 15), new Date(2026, 4, 15))).toBe(30);
  });

  it("coincide con el caso del Excel de Giovanni", () => {
    // Su ficha calcula 30 años para el 19/08/2026.
    expect(edadEnAnios(new Date(1996, 4, 15), new Date(2026, 7, 19))).toBe(30);
  });
});

describe("haceCuanto", () => {
  const hoy = new Date(2026, 7, 20);

  it("distingue a quién nunca se ha evaluado", () => {
    expect(haceCuanto(null, hoy)).toBe("sin evaluaciones");
  });

  it.each([
    [new Date(2026, 7, 20), "hoy"],
    [new Date(2026, 7, 19), "ayer"],
    [new Date(2026, 7, 17), "hace 3 días"],
    [new Date(2026, 7, 6), "hace 2 semanas"],
    [new Date(2026, 1, 20), "hace 6 meses"],
    [new Date(2024, 7, 20), "hace 2 años"],
  ])("%s → %s", (fecha, esperado) => {
    expect(haceCuanto(fecha, hoy)).toBe(esperado);
  });

  it("usa singular cuando corresponde", () => {
    expect(haceCuanto(new Date(2026, 7, 13), hoy)).toBe("hace 1 semana");
    expect(haceCuanto(new Date(2026, 6, 20), hoy)).toBe("hace 1 mes");
  });
});
