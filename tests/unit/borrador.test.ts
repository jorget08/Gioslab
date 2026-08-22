import { describe, expect, it } from "vitest";

import {
  analizarBorrador,
  borradorUtilizable,
  CADUCIDAD_MS,
  claveBorrador,
  crearBorrador,
  esClaveBorrador,
  haceCuantoCorto,
  tieneAlgoQueGuardar,
  VERSION_BORRADOR,
} from "@/domain/borrador";

const AHORA = 1_700_000_000_000;
const USUARIO = "usuario-1";

describe("claves", () => {
  it("separa por tipo y atleta", () => {
    expect(claveBorrador("medicion", "abc")).toBe("gioslab:borrador:medicion:abc");
    expect(claveBorrador("biomecanica", "abc")).not.toBe(claveBorrador("medicion", "abc"));
  });

  it("reconoce las suyas y solo las suyas", () => {
    expect(esClaveBorrador("gioslab:borrador:medicion:abc")).toBe(true);
    // Al cerrar sesión se borran todas: no debe llevarse por delante nada ajeno.
    expect(esClaveBorrador("sb-localhost-auth-token")).toBe(false);
    expect(esClaveBorrador("otra-cosa")).toBe(false);
  });
});

describe("borradorUtilizable", () => {
  const base = crearBorrador(USUARIO, "atleta-1", { peso: "62" }, AHORA);

  it("acepta uno reciente del mismo usuario", () => {
    expect(borradorUtilizable(base, USUARIO, AHORA + 60_000)).toBe(true);
  });

  it("rechaza el de OTRO usuario", () => {
    // En el móvil del gimnasio lo abre otra persona: ofrecerle la evaluación a
    // medias de un compañero es una fuga de datos clínicos.
    expect(borradorUtilizable(base, "usuario-2", AHORA)).toBe(false);
  });

  it("rechaza uno caducado", () => {
    expect(borradorUtilizable(base, USUARIO, AHORA + CADUCIDAD_MS + 1)).toBe(false);
  });

  it("acepta justo en el límite", () => {
    expect(borradorUtilizable(base, USUARIO, AHORA + CADUCIDAD_MS)).toBe(true);
  });

  it("rechaza uno de otra versión de los campos", () => {
    // Restaurar campos que ya no existen metería basura en el formulario.
    const viejo = { ...base, version: VERSION_BORRADOR - 1 };
    expect(borradorUtilizable(viejo, USUARIO, AHORA)).toBe(false);
  });

  it("sin borrador, no hay nada que ofrecer", () => {
    expect(borradorUtilizable(null, USUARIO, AHORA)).toBe(false);
  });
});

describe("analizarBorrador", () => {
  it("lee uno bien formado", () => {
    const b = crearBorrador(USUARIO, "a1", { peso: "62" }, AHORA);
    expect(analizarBorrador(JSON.stringify(b))).toEqual(b);
  });

  it("un JSON corrupto no tumba la pantalla", () => {
    expect(analizarBorrador("{no es json")).toBeNull();
  });

  it("rechaza algo con la forma equivocada", () => {
    expect(analizarBorrador('{"cualquier":"cosa"}')).toBeNull();
    expect(analizarBorrador('{"version":"uno"}')).toBeNull();
  });

  it("sin nada guardado devuelve nulo", () => {
    expect(analizarBorrador(null)).toBeNull();
  });
});

describe("tieneAlgoQueGuardar", () => {
  it("un formulario vacío no genera borrador", () => {
    // Si no, al volver saldría "tienes algo a medias" sobre una pantalla en
    // blanco, que desconcierta más de lo que ayuda.
    expect(tieneAlgoQueGuardar({ peso: "", talla: "   ", nota: undefined })).toBe(false);
  });

  it("un solo campo con algo ya cuenta", () => {
    expect(tieneAlgoQueGuardar({ peso: "62", talla: "" })).toBe(true);
  });

  it("un cero es un valor, no un vacío", () => {
    expect(tieneAlgoQueGuardar({ n: 0 })).toBe(true);
  });
});

describe("haceCuantoCorto", () => {
  it.each([
    [30_000, "hace un momento"],
    [60_000, "hace 1 minuto"],
    [20 * 60_000, "hace 20 minutos"],
    [60 * 60_000, "hace 1 hora"],
    [5 * 60 * 60_000, "hace 5 horas"],
    [26 * 60 * 60_000, "ayer"],
    [3 * 24 * 60 * 60_000, "hace 3 días"],
  ])("%i ms → %s", (transcurrido, esperado) => {
    expect(haceCuantoCorto(AHORA, AHORA + transcurrido)).toBe(esperado);
  });
});
