import { describe, expect, it } from "vitest";

import {
  conflictoDeRelacion,
  relacionesDe,
  sustitutosDe,
  type Relacion,
} from "@/domain/relaciones";

const eq = (a: string, b: string): Relacion => ({ ejercicio: a, variante: b, tipo: "equivalente" });
const sus = (a: string, b: string): Relacion => ({ ejercicio: a, variante: b, tipo: "sustitucion" });
const prog = (a: string, b: string): Relacion => ({ ejercicio: a, variante: b, tipo: "progresion" });

describe("sustitutosDe", () => {
  it("el equivalente vale en las dos direcciones", () => {
    const r = [eq("Prensa 45°", "Prensa Inclinada de Piernas")];
    expect(sustitutosDe(r, "Prensa 45°")).toEqual(["Prensa Inclinada de Piernas"]);
    expect(sustitutosDe(r, "Prensa Inclinada de Piernas")).toEqual(["Prensa 45°"]);
  });

  it("la sustitución vale en UNA sola dirección", () => {
    // Que la Goblet entre en lugar de la Profunda no autoriza lo contrario:
    // mandar la profunda a quien no puede con la Goblet es darle algo más duro
    // justo cuando algo ya le duele.
    const r = [sus("Sentadilla Libre Profunda", "Sentadilla Goblet")];
    expect(sustitutosDe(r, "Sentadilla Libre Profunda")).toEqual(["Sentadilla Goblet"]);
    expect(sustitutosDe(r, "Sentadilla Goblet")).toEqual([]);
  });

  it("una progresión se lee al revés y nunca se ofrece hacia arriba", () => {
    // A → B progresión significa que B es más exigente. Si B se cae, A sirve.
    // Si A se cae, B no: es justo lo contrario de lo que hace falta.
    const r = [prog("Sentadilla Goblet", "Sentadilla Libre Profunda")];
    expect(sustitutosDe(r, "Sentadilla Libre Profunda")).toEqual(["Sentadilla Goblet"]);
    expect(sustitutosDe(r, "Sentadilla Goblet")).toEqual([]);
  });

  it("los equivalentes van antes que las sustituciones", () => {
    // Un equivalente conserva el estímulo objetivo; una sustitución solo
    // conserva el patrón. Si hay que elegir uno, el orden es la recomendación.
    const r = [
      sus("Sentadilla Libre Profunda", "Prensa 45°"),
      eq("Sentadilla Libre Profunda", "Sentadilla con Safety Bar"),
    ];
    expect(sustitutosDe(r, "Sentadilla Libre Profunda")).toEqual([
      "Sentadilla con Safety Bar",
      "Prensa 45°",
    ]);
  });

  it("no repite un ejercicio que llega por dos caminos", () => {
    const r = [eq("A", "B"), sus("A", "B")];
    expect(sustitutosDe(r, "A")).toEqual(["B"]);
  });

  it("nunca se propone a sí mismo", () => {
    expect(sustitutosDe([eq("A", "A")], "A")).toEqual([]);
  });

  it("sin relaciones no propone nada", () => {
    expect(sustitutosDe([], "A")).toEqual([]);
  });
});

describe("relacionesDe", () => {
  it("enseña la relación desde los dos lados, marcando la dirección", () => {
    // Si al abrir la Goblet no se viera la relación creada desde la Profunda,
    // Giovanni la crearía otra vez desde aquí y quedarían las dos direcciones
    // guardadas: exactamente la contradicción que el motor no puede resolver.
    const r = [sus("Sentadilla Libre Profunda", "Sentadilla Goblet")];
    expect(relacionesDe(r, "Sentadilla Libre Profunda")).toEqual([
      { otro: "Sentadilla Goblet", tipo: "sustitucion", saliente: true },
    ]);
    expect(relacionesDe(r, "Sentadilla Goblet")).toEqual([
      { otro: "Sentadilla Libre Profunda", tipo: "sustitucion", saliente: false },
    ]);
  });

  it("ignora las relaciones que no tocan al ejercicio", () => {
    expect(relacionesDe([sus("A", "B")], "C")).toEqual([]);
  });
});

describe("conflictoDeRelacion", () => {
  it("deja pasar una relación nueva", () => {
    expect(conflictoDeRelacion([sus("A", "B")], sus("A", "C"))).toBeNull();
  });

  it("rechaza relacionarse consigo mismo", () => {
    expect(conflictoDeRelacion([], sus("A", "A"))).toMatch(/consigo mismo/i);
  });

  it("rechaza la misma relación dos veces", () => {
    expect(conflictoDeRelacion([sus("A", "B")], sus("A", "B"))).toMatch(/ya está guardada/i);
  });

  it("rechaza un segundo tipo para la misma pareja", () => {
    // B no puede ser a la vez equivalente y progresión de A.
    expect(conflictoDeRelacion([sus("A", "B")], eq("A", "B"))).toMatch(/se contradicen/i);
  });

  it("rechaza la dirección contraria, que es la contradicción invisible", () => {
    // Ninguna restricción de tabla puede atrapar esto: son dos filas legítimas
    // por separado. Juntas dejan al motor ofreciendo cada una en lugar de la
    // otra para siempre, sin que nada falle.
    expect(conflictoDeRelacion([sus("A", "B")], sus("B", "A"))).toMatch(/se contradicen/i);
  });
});
