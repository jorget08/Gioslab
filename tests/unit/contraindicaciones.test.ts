import { describe, expect, it } from "vitest";

import { ZONAS_CUERPO } from "@/domain/catalogos";
import {
  CONDICIONES_SISTEMICAS,
  CONTRAINDICACIONES,
  efectoEnElMotor,
  esCondicionSistemica,
  esContraindicacion,
  esZonaAnatomica,
  leerContraindicaciones,
  normalizarZona,
  porFamilia,
  REGLA_SISTEMICA,
  ZONAS_ANATOMICAS,
} from "@/domain/contraindicaciones";

describe("un solo catálogo para los dos lados del cruce", () => {
  it("las lesiones del atleta usan exactamente las mismas zonas", () => {
    // Es LA condición que hace funcionar al motor. Si divergieran, una lesión
    // de rodilla y un ejercicio contraindicado para rodilla no se encontrarían,
    // y el fallo sería silencioso: nadie ve la exclusión que no ocurrió.
    expect(ZONAS_CUERPO).toBe(ZONAS_ANATOMICAS);
  });

  it("incluye las ocho zonas que nombró Giovanni", () => {
    for (const z of [
      "Cervical",
      "Lumbar",
      "Hombro",
      "Codo",
      "Muñeca/Antebrazo",
      "Cadera",
      "Rodilla",
      "Tobillo",
    ]) {
      expect(ZONAS_ANATOMICAS).toContain(z);
    }
  });

  it("y las cuatro condiciones sistémicas, con su regla escrita", () => {
    expect(CONDICIONES_SISTEMICAS).toEqual([
      "Hipertensión / Cardiovascular",
      "Embarazo",
      "Hernia discal / Patología axial",
      "Diástasis abdominal",
    ]);
    for (const c of CONDICIONES_SISTEMICAS) {
      expect(REGLA_SISTEMICA[c].length).toBeGreaterThan(0);
    }
  });

  it("las dos familias no se solapan", () => {
    // Un valor en ambas haría ambiguo el efecto en el motor.
    for (const z of ZONAS_ANATOMICAS) expect(esCondicionSistemica(z)).toBe(false);
    for (const c of CONDICIONES_SISTEMICAS) expect(esZonaAnatomica(c)).toBe(false);
    expect(CONTRAINDICACIONES).toHaveLength(
      ZONAS_ANATOMICAS.length + CONDICIONES_SISTEMICAS.length,
    );
  });
});

describe("efectoEnElMotor", () => {
  it("una zona filtra; una condición filtra Y ajusta la ejecución", () => {
    // La distinción es de Giovanni y es la razón de separar las familias: hay
    // contraindicaciones que no quitan el ejercicio, le cambian el cómo.
    expect(efectoEnElMotor("Rodilla")).toBe("filtra");
    expect(efectoEnElMotor("Hipertensión / Cardiovascular")).toBe("filtra-y-ajusta");
  });
});

describe("reconocimiento", () => {
  it("acepta lo del catálogo y rechaza el resto", () => {
    expect(esContraindicacion("Lumbar")).toBe(true);
    expect(esContraindicacion("Embarazo")).toBe(true);
    // Las etiquetas viejas ya no valen: el catálogo cambió de vocabulario.
    expect(esContraindicacion("Zona lumbar")).toBe(false);
    expect(esContraindicacion("Muñeca")).toBe(false);
    expect(esContraindicacion("problemas de rodilla")).toBe(false);
    expect(esContraindicacion(null)).toBe(false);
  });
});

describe("leerContraindicaciones", () => {
  it("lee las dos familias mezcladas", () => {
    expect(leerContraindicaciones(["Rodilla", "Embarazo"])).toEqual(["Rodilla", "Embarazo"]);
  });

  it("descarta lo que el motor no podría cruzar", () => {
    expect(leerContraindicaciones(["Rodilla", "molestia lumbar", 7, null])).toEqual(["Rodilla"]);
  });

  it("no repite", () => {
    expect(leerContraindicaciones(["Rodilla", "Rodilla"])).toEqual(["Rodilla"]);
  });

  it("aguanta cualquier basura", () => {
    for (const basura of [null, undefined, "Rodilla", {}, 0, ""]) {
      expect(leerContraindicaciones(basura)).toEqual([]);
    }
  });
});

describe("porFamilia", () => {
  it("separa para poder pintarlas distinto", () => {
    const { anatomicas, sistemicas } = porFamilia([
      "Rodilla",
      "Embarazo",
      "Lumbar",
      "Diástasis abdominal",
    ]);
    expect(anatomicas).toEqual(["Rodilla", "Lumbar"]);
    expect(sistemicas).toEqual(["Embarazo", "Diástasis abdominal"]);
  });

  it("con lista vacía devuelve dos vacías", () => {
    expect(porFamilia([])).toEqual({ anatomicas: [], sistemicas: [] });
  });
});

describe("normalizarZona", () => {
  it("rescata las etiquetas escritas antes de que hubiera catálogo", () => {
    // `body_region` nunca tuvo CHECK: el desplegable era una sugerencia, no una
    // restricción, y hay filas con estas formas.
    expect(normalizarZona("zona lumbar")).toBe("Lumbar");
    expect(normalizarZona("Zona cervical")).toBe("Cervical");
    expect(normalizarZona("rodilla derecha")).toBe("Rodilla");
    expect(normalizarZona("Muñeca")).toBe("Muñeca/Antebrazo");
    expect(normalizarZona("antebrazo izquierdo")).toBe("Muñeca/Antebrazo");
  });

  it("no se deja engañar por acentos ni mayúsculas", () => {
    expect(normalizarZona("  MUÑECA  ")).toBe("Muñeca/Antebrazo");
  });

  it("devuelve null en vez de adivinar", () => {
    // Meter una lesión en la articulación equivocada es peor que dejarla sin
    // clasificar: el motor excluiría los ejercicios de otra zona.
    expect(normalizarZona("manguito rotador")).toBeNull();
    expect(normalizarZona("no sé")).toBeNull();
    expect(normalizarZona("")).toBeNull();
    expect(normalizarZona(null)).toBeNull();
  });

  it("no confunde un prefijo corto con una zona", () => {
    // "co" no puede convertirse en "Codo": la coincidencia va del dato hacia la
    // etiqueta, nunca al revés.
    expect(normalizarZona("co")).toBeNull();
    expect(normalizarZona("cad")).toBeNull();
  });

  it("es idempotente sobre las etiquetas ya buenas", () => {
    for (const z of ZONAS_ANATOMICAS) expect(normalizarZona(z)).toBe(z);
  });
});
