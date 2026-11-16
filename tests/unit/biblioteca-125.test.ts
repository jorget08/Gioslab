import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { esJerarquia, esPerfil } from "@/domain/jerarquias";
import { esComplementario, esPatron } from "@/domain/patrones";
import { esCadencia } from "@/domain/plan";

/**
 * Su matriz definitiva de 125 (16-nov): jerarquía, perfil y cadencia de cada
 * ejercicio. Lo que se prueba es lo que fallaría EN SILENCIO, como en la de 108.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20261116110000_biblioteca_125.sql", import.meta.url),
  "utf8",
);

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
const REGLAS = tuplas("5. Las reglas", ") as n(rule_key");
// [nombre, musculo, patron, equipo, jerarquia, perfil, guiada, complementario, cadencia, axial, nota, contra]
const FICHAS = [...ACTUALIZADOS.map((t) => t.slice(1)), ...NUEVOS];
const NOMBRES = new Set(FICHAS.map((f) => f[0]));

describe("la biblioteca maestra de 125 (16-nov)", () => {
  it("sus 125 más los 8 que sus reglas usan de sustituto, sin repetidos", () => {
    expect(new Set(ACTUALIZADOS.map((t) => t.length))).toEqual(new Set([13]));
    expect(new Set(NUEVOS.map((t) => t.length))).toEqual(new Set([12]));
    expect(FICHAS).toHaveLength(133);
    expect(NOMBRES.size).toBe(133);
  });

  it("ninguno queda sin jerarquía, y todo es de su catálogo", () => {
    for (const [nombre, , patron, , jerarquia, perfil, , complementario, cadencia] of FICHAS) {
      expect(esJerarquia(Number(jerarquia)), nombre).toBe(true);
      expect(esPatron(patron), nombre).toBe(true);
      expect(esCadencia(cadencia), nombre).toBe(true);
      if (perfil !== "null") expect(esPerfil(perfil), nombre).toBe(true);
      if (complementario !== "null") expect(esComplementario(complementario), nombre).toBe(true);
    }
  });

  it("la hipertensión ya no excluye ningún ejercicio: es un ajuste", () => {
    for (const f of FICHAS) expect(JSON.parse(f[11]), f[0]).not.toContain("Hipertensión / Cardiovascular");
    expect(SQL).toContain("contraindications - 'Hipertensión / Cardiovascular'");
  });

  it("su regla de hipertensión fija 12–15 sin Valsalva y prioriza press que existen", () => {
    const [, acciones] = REGLAS.find(([k]) => k === "hipertension-valsalva")!;
    const a = JSON.parse(acciones);
    expect(a.rango_repeticiones).toEqual({ min: 12, max: 15 });
    expect(a.prohibir_maniobra).toEqual(["Valsalva"]);
    for (const n of a.priorizar) expect(NOMBRES.has(n), n).toBe(true);
  });

  it("las reglas reescritas no nombran ningún nombre viejo", () => {
    const viejos = new Set(ACTUALIZADOS.filter((t) => t[0] !== t[1]).map((t) => t[0]));
    for (const [clave, acciones] of REGLAS) {
      const a = JSON.parse(acciones) as Record<string, string[] | undefined>;
      for (const n of [...(a.priorizar ?? []), ...(a.excluir_ejercicios ?? []), ...(a.sustituir_por ?? [])]) {
        expect(viejos.has(n), `${clave} nombra "${n}"`).toBe(false);
      }
    }
  });
});
