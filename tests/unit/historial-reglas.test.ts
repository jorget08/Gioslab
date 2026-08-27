import { describe, expect, it } from "vitest";

import { compararReglas, lineaDeTiempo, resumirCambios } from "@/domain/historial-reglas";
import type { VersionRegla } from "@/domain/historial-reglas";
import type { Regla } from "@/domain/reglas";

const base: Regla = {
  rule_key: "dorsiflexion-limitada",
  version: 1,
  nivel: 1,
  condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
  actions: { modificador: "Elevar talones 2.5 cm" },
  justification: "Por debajo de 10 cm se altera la cinemática.",
  evidence_level: "LEVEL_B_BIOMECHANICS",
};

const con = (extra: Partial<Regla>): Regla => ({ ...base, ...extra });

describe("compararReglas", () => {
  it("dos versiones idénticas no producen ningún cambio", () => {
    expect(compararReglas(base, con({ version: 2 }))).toEqual([]);
  });

  it("el mismo JSON escrito en otro orden tampoco cambia nada", () => {
    // Se compara lo LEGIBLE, no las claves del objeto. Si el orden en que se
    // guardó contara, cada versión parecería distinta sin serlo para nadie.
    const otra = con({
      version: 2,
      actions: { modificador: "Elevar talones 2.5 cm" },
      condition: { todas: [{ hecho: "dorsiflexion_cm", op: "entre", valor: [5, 10] }] },
    });
    expect(compararReglas(base, otra)).toEqual([]);
  });

  it("cambiar el valor de una acción es UN cambio, no una baja y un alta", () => {
    // Es la razón de comparar por clave. Con frases sueltas, subir el volumen de
    // 0.75 a 0.9 se leería como "se quitó una acción y se puso otra".
    const v1 = con({ nivel: 2, actions: { volumen_factor: 0.75 } });
    const v2 = con({ nivel: 2, version: 2, actions: { volumen_factor: 0.9 } });
    const cambios = compararReglas(v1, v2);
    expect(cambios).toHaveLength(1);
    expect(cambios[0].campo).toBe("Ajustar el volumen semanal");
    expect(cambios[0].tipo).toBe("cambiado");
    expect(cambios[0].antes).toContain("25%");
    expect(cambios[0].despues).toContain("10%");
  });

  it("distingue añadir, retirar y cambiar", () => {
    const v1 = con({ actions: { modificador: "Elevar talones", priorizar: ["Prensa 45°"] } });
    const v2 = con({
      version: 2,
      actions: { modificador: "Elevar talones 3 cm", excluir_ejercicios: ["Sentadilla"] },
    });
    const cambios = compararReglas(v1, v2);
    const por = Object.fromEntries(cambios.map((c) => [c.campo, c.tipo]));
    expect(por["Excluir estos ejercicios"]).toBe("añadido");
    expect(por["Priorizar"]).toBe("retirado");
    expect(por["Modificar la ejecución"]).toBe("cambiado");
  });

  it("las tres formas del RIR son una sola acción", () => {
    // Si se separaran, el historial diría que se retiró "RIR suelo" y se añadió
    // "RIR fijo" cuando en realidad se editó un único campo guardado.
    const v1 = con({ nivel: 2, actions: { rir: { piso: 2 } } });
    const v2 = con({ nivel: 2, version: 2, actions: { rir: { piso: 3 } } });
    const cambios = compararReglas(v1, v2);
    expect(cambios).toHaveLength(1);
    expect(cambios[0].campo).toBe("RIR");
  });

  it("recoge el cambio de nivel, de justificación y de respaldo", () => {
    const v2 = con({
      version: 2,
      nivel: 3,
      justification: "Otra cosa.",
      evidence_level: "LEVEL_A_SCIENCE",
    });
    const campos = compararReglas(base, v2).map((c) => c.campo);
    expect(campos).toContain("Momento del motor");
    expect(campos).toContain("Justificación");
    expect(campos).toContain("Respaldo");
  });

  it("el respaldo se lee con su nombre, no con la clave técnica", () => {
    const v2 = con({ version: 2, evidence_level: "LEVEL_A_SCIENCE" });
    const c = compararReglas(base, v2).find((x) => x.campo === "Respaldo")!;
    expect(c.antes).toBe("Biomecánica");
    expect(c.despues).toBe("Evidencia científica");
  });
});

describe("resumirCambios", () => {
  it("dice claramente cuando una versión no cambia nada", () => {
    expect(resumirCambios([])).toBe("sin cambios de contenido");
  });

  it("con pocos cambios los nombra en vez de contarlos", () => {
    const cambios = compararReglas(base, con({ version: 2, justification: "Otra." }));
    expect(resumirCambios(cambios)).toBe("justificación");
  });
});

// ---------------------------------------------------------------------------

const version = (n: number, extra: Partial<VersionRegla> = {}): VersionRegla => ({
  ...base,
  version: n,
  id: `v${n}`,
  is_active: false,
  created_at: `2026-08-0${n}T10:00:00Z`,
  autor: "Giovanni",
  ...extra,
});

describe("lineaDeTiempo", () => {
  it("entremezcla publicaciones y activaciones, de lo nuevo a lo viejo", () => {
    const sucesos = lineaDeTiempo(
      [version(1), version(2)],
      [
        { id: "a1", rule_id: "v1", action: "activada", created_at: "2026-08-01T10:00:00Z", actor: "Giovanni" },
        { id: "a2", rule_id: "v2", action: "activada", created_at: "2026-08-02T10:00:00Z", actor: "Giovanni" },
      ],
    );
    expect(sucesos).toHaveLength(4);
    expect(sucesos[0]).toMatchObject({ clase: "activacion", version: 2 });
    expect(sucesos.at(-1)).toMatchObject({ clase: "version" });
  });

  it("la activación va justo después de su versión cuando comparten instante", () => {
    // Guardar con "activarla al guardar" escribe las dos en la misma
    // transacción. Si se ordenaran al azar, la línea diría que se activó antes
    // de existir.
    const sucesos = lineaDeTiempo(
      [version(1)],
      [{ id: "a1", rule_id: "v1", action: "activada", created_at: "2026-08-01T10:00:00Z", actor: null }],
    );
    expect(sucesos[0].clase).toBe("activacion");
    expect(sucesos[1].clase).toBe("version");
  });

  it("la primera versión no arrastra una lista de cambios inventada", () => {
    // Nace, no cambia. Compararla contra un vacío daría un "añadido" por campo.
    const sucesos = lineaDeTiempo([version(1)], []);
    expect(sucesos[0]).toMatchObject({ clase: "version", cambios: [] });
  });

  it("compara cada versión con la ANTERIOR, no con la vigente", () => {
    const v2 = version(2, { justification: "Motivo nuevo." });
    const sucesos = lineaDeTiempo([version(1), v2], []);
    const publicacion = sucesos.find((s) => s.clase === "version" && s.version.version === 2);
    expect(publicacion).toMatchObject({ cambios: [{ campo: "Justificación" }] });
  });

  it("volver a una versión anterior deja rastro aunque no cree ninguna versión", () => {
    // Es el caso que obliga a entrelazar: sin la activación, la línea no
    // explicaría por qué la regla vigente es la v1 habiendo una v2.
    const sucesos = lineaDeTiempo(
      [version(1, { is_active: true }), version(2)],
      [
        { id: "a1", rule_id: "v2", action: "desactivada", created_at: "2026-08-05T10:00:00Z", actor: "Giovanni" },
        { id: "a2", rule_id: "v1", action: "activada", created_at: "2026-08-05T10:00:01Z", actor: "Giovanni" },
      ],
    );
    expect(sucesos[0]).toMatchObject({ clase: "activacion", accion: "activada", version: 1 });
    expect(sucesos[1]).toMatchObject({ clase: "activacion", accion: "desactivada", version: 2 });
  });

  it("con el mismo instante, la versión más nueva va primero", () => {
    // Una carga de datos escribe todas las versiones de golpe y el reloj no las
    // distingue. Sin desempatar por número, la lista enseñaba la v1 encima de la
    // v2 y la línea de tiempo mentía.
    const mismo = "2026-08-26T15:29:00Z";
    const sucesos = lineaDeTiempo(
      [
        version(1, { created_at: mismo }),
        version(2, { created_at: mismo, is_active: true }),
      ],
      [
        { id: "a1", rule_id: "v1", action: "desactivada", created_at: mismo, actor: null },
        { id: "a2", rule_id: "v2", action: "activada", created_at: mismo, actor: null },
      ],
    );
    expect(sucesos.map((s) => (s.clase === "activacion" ? `a${s.version}` : `v${s.version.version}`)))
      .toEqual(["a2", "v2", "a1", "v1"]);
  });

  it("ignora activaciones de versiones que no le pertenecen", () => {
    const sucesos = lineaDeTiempo(
      [version(1)],
      [{ id: "x", rule_id: "de-otra-regla", action: "activada", created_at: "2026-08-09T10:00:00Z", actor: null }],
    );
    expect(sucesos).toHaveLength(1);
    expect(sucesos[0].clase).toBe("version");
  });
});
