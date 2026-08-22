import { describe, expect, it } from "vitest";

import { esPatron, FICHA_PATRON, nombrePatron, opcionesPatron, PATRONES } from "@/domain/patrones";

describe("catálogo de patrones", () => {
  it("tiene exactamente las ocho claves de su MÓDULO 04", () => {
    expect(PATRONES).toEqual([
      "squat_dominante_rodilla",
      "hip_hinge_dominante_cadera",
      "horizontal_push",
      "horizontal_pull",
      "vertical_push",
      "vertical_pull",
      "isolation_accessory",
      "core_anti_flexion_extension",
    ]);
  });

  it("cada clave tiene nombre comercial y al menos dos ejemplos", () => {
    // Los ejemplos no son decoración: son lo que evita que el entrenador
    // clasifique un Hip Thrust como dominante de rodilla.
    for (const p of PATRONES) {
      expect(FICHA_PATRON[p].nombre.length).toBeGreaterThan(0);
      expect(FICHA_PATRON[p].ejemplos.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("no repite nombres comerciales", () => {
    const nombres = PATRONES.map((p) => FICHA_PATRON[p].nombre);
    expect(new Set(nombres).size).toBe(PATRONES.length);
  });

  it("rechaza claves que no están en el catálogo", () => {
    expect(esPatron("squat_dominante_rodilla")).toBe(true);
    expect(esPatron("sentadilla")).toBe(false);
    expect(esPatron("Squat_Dominante_Rodilla")).toBe(false);
    expect(esPatron("")).toBe(false);
  });

  it("ante una clave desconocida devuelve la clave cruda, no la esconde", () => {
    // Un "Desconocido" taparía un ejercicio mal clasificado en la base.
    expect(nombrePatron("patron_inventado")).toBe("patron_inventado");
    expect(nombrePatron("vertical_pull")).toBe("Tracción Vertical");
  });

  it("las opciones salen en el orden del catálogo", () => {
    const opciones = opcionesPatron();
    expect(opciones.map((o) => o.valor)).toEqual([...PATRONES]);
    expect(opciones[0].texto).toBe("Dominante de Rodilla");
    expect(opciones[0].detalle).toContain("Prensa");
  });
});
