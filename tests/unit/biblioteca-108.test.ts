import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { esJerarquia, esPerfil } from "@/domain/jerarquias";
import { esComplementario, esPatron } from "@/domain/patrones";

/**
 * La carga de su biblioteca maestra de 108 (9-nov).
 *
 * Lo que se prueba es lo que fallaría EN SILENCIO: un patrón o un perfil mal
 * escrito no rompe la migración si el CHECK no lo cubre, y una regla que nombra
 * un ejercicio renombrado deja de actuar sin avisar. La base lo vuelve a
 * comprobar al aplicarse (el bloque `do` del final); esto lo caza antes.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20261109110000_biblioteca_108.sql", import.meta.url),
  "utf8",
);

/** Las tuplas de un `(values …)`: una por línea, en el formato que escribe la migración. */
function tuplas(desde: string, hasta: string): string[][] {
  const tramo = SQL.slice(SQL.indexOf(desde), SQL.indexOf(hasta, SQL.indexOf(desde)));
  return [...tramo.matchAll(/^\s{4}\((.*)\),?$/gm)].map((m) =>
    [...m[1].matchAll(/'((?:[^']|'')*)'|(null|true|false)/g)].map((c) =>
      c[1] !== undefined ? c[1].replace(/''/g, "'") : c[2],
    ),
  );
}

const ACTUALIZADOS = tuplas("1. Los que ya estaban", ") as v(viejo");
const NUEVOS = tuplas("2. Los nuevos", ") as v(nombre");
const REGLAS = tuplas("3. Las reglas que los nombran", ") as n(rule_key");

// [viejo?, nombre, musculo, patron, tipo, equipo, jerarquia, perfil, guiada, complementario, nota, contra]
const FICHAS = [...ACTUALIZADOS.map((t) => t.slice(1)), ...NUEVOS];

describe("la biblioteca maestra de 108 (9-nov)", () => {
  it("son 108, sin nombres repetidos", () => {
    expect(ACTUALIZADOS.length + NUEVOS.length).toBe(108);
    // Si el formato de la migración cambia, que esto falle y no lo demás en falso.
    expect(new Set(ACTUALIZADOS.map((t) => t.length))).toEqual(new Set([12]));
    expect(new Set(NUEVOS.map((t) => t.length))).toEqual(new Set([11]));
    expect(new Set(FICHAS.map((f) => f[0])).size).toBe(108);
  });

  it("patrón, perfil, jerarquía y complementario son de sus catálogos", () => {
    for (const [nombre, , patron, , , jerarquia, perfil, , complementario] of FICHAS) {
      expect(esPatron(patron), nombre).toBe(true);
      if (perfil !== "null") expect(esPerfil(perfil), nombre).toBe(true);
      if (jerarquia !== "null") expect(esJerarquia(Number(jerarquia)), nombre).toBe(true);
      if (complementario !== "null") expect(esComplementario(complementario), nombre).toBe(true);
    }
  });

  it("todo lo nuevo sale con contraindicaciones de su familia", () => {
    // Sin ellas, el motor se lo daría a un atleta con una lesión que su matriz excluye.
    for (const f of NUEVOS) expect(JSON.parse(f[10]).length, f[0]).toBeGreaterThan(0);
  });

  it("el core no lleva jerarquía: con J1 abriría la sesión", () => {
    for (const f of FICHAS.filter((x) => x[2] === "core_anti_flexion_extension")) expect(f[5], f[0]).toBe("null");
  });

  it("las reglas reescritas no nombran ningún nombre viejo", () => {
    const viejos = new Set(ACTUALIZADOS.filter((t) => t[0] !== t[1]).map((t) => t[0]));
    expect(REGLAS.length).toBeGreaterThan(0);
    for (const [clave, acciones] of REGLAS) {
      const a = JSON.parse(acciones) as Record<string, unknown>;
      const nombrados = ["priorizar", "excluir_ejercicios", "sustituir_por"].flatMap(
        (k) => (a[k] as string[] | undefined) ?? [],
      );
      for (const n of nombrados) expect(viejos.has(n), `${clave} nombra "${n}"`).toBe(false);
    }
  });
});
