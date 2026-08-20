import { describe, expect, it } from "vitest";

import { invitacionSchema, rolesQuePuedeInvitar } from "@/lib/validation/invitacion";

describe("rolesQuePuedeInvitar", () => {
  it("el gimnasio reparte entrenadores y clientes, nunca super_admin", () => {
    expect(rolesQuePuedeInvitar("gym")).toEqual(["trainer", "client"]);
  });

  it("el entrenador solo reparte clientes: no se fabrica compañeros", () => {
    expect(rolesQuePuedeInvitar("trainer")).toEqual(["client"]);
  });

  it("el cliente no invita a nadie", () => {
    expect(rolesQuePuedeInvitar("client")).toEqual([]);
  });

  it("sin rol tampoco", () => {
    expect(rolesQuePuedeInvitar(null)).toEqual([]);
    expect(rolesQuePuedeInvitar(undefined)).toEqual([]);
  });

  it("un rol desconocido no reparte nada (falla cerrado)", () => {
    expect(rolesQuePuedeInvitar("auditor")).toEqual([]);
  });

  it("super_admin no se puede repartir por invitación en ningún caso", () => {
    for (const rol of ["super_admin", "gym", "trainer", "client", null]) {
      expect(rolesQuePuedeInvitar(rol)).not.toContain("super_admin");
    }
  });
});

describe("invitacionSchema", () => {
  it("normaliza el correo antes de validarlo", () => {
    const r = invitacionSchema.parse({ email: "  GIO@GiosLab.CO ", rol: "trainer" });
    expect(r.email).toBe("gio@gioslab.co");
  });

  it("rechaza un correo mal formado", () => {
    expect(invitacionSchema.safeParse({ email: "no-es", rol: "trainer" }).success).toBe(false);
  });

  it("rechaza super_admin como rol invitable", () => {
    expect(
      invitacionSchema.safeParse({ email: "a@b.co", rol: "super_admin" }).success,
    ).toBe(false);
  });
});
