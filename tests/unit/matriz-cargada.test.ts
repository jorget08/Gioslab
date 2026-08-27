import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ACCIONES_POR_NIVEL,
  HECHOS,
  describirRegla,
  esHecho,
  validarRegla,
  type ClaveAccion,
  type NivelMotor,
  type Regla,
} from "@/domain/reglas";

/**
 * La matriz que se cargó en la base, comprobada contra la gramática (tarea 3.3).
 *
 * POR QUÉ SE LEE EL SQL. Una regla mal escrita no rompe nada: el motor
 * sencillamente no la aplica, y se queda en la matriz pareciendo metodología
 * viva. Es el fallo más caro de este proyecto porque es silencioso — ya pasó con
 * `sexo` en el nivel equivocado, y con las acciones que su nivel no ejecuta.
 *
 * La migración es la fuente, así que se lee la migración. Comprobarlo contra la
 * base exigiría Supabase levantado; esto corre en cada `npm test`.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20260827200000_matriz_giovanni.sql", import.meta.url),
  "utf8",
);

/** Saca las filas del `values (...)` de reglas. Suficiente para este archivo. */
function reglasDeLaMigracion(): Regla[] {
  const bloque = SQL.slice(SQL.indexOf("from (values"), SQL.indexOf(") as v(rule_key"));

  const filas: Regla[] = [];
  const re =
    /\('([a-z0-9-]+)',\s*([1-4]),\s*'([\s\S]*?)'::jsonb,\s*'([\s\S]*?)'::jsonb,\s*'([\s\S]*?)',\s*'(LEVEL_[A-Z_]+)'\)/g;

  for (const m of bloque.matchAll(re)) {
    filas.push({
      rule_key: m[1],
      version: 1,
      nivel: Number(m[2]),
      condition: JSON.parse(m[3]),
      actions: JSON.parse(m[4]),
      // En SQL una comilla simple se escribe doblada.
      justification: m[5].replace(/''/g, "'"),
      evidence_level: m[6],
    });
  }
  return filas;
}

const REGLAS = reglasDeLaMigracion();

describe("la matriz cargada en la 3.3", () => {
  it("se extrajeron las 25 reglas de la migración", () => {
    // Si el formato del SQL cambia, la expresión regular deja de encontrar
    // filas y TODOS los tests de abajo pasarían sobre una lista vacía. Este es
    // el que impide ese falso verde.
    expect(REGLAS.length).toBe(25);
  });

  it.each(REGLAS.map((r) => [r.rule_key, r] as const))(
    "%s es una regla que el motor entiende",
    (_clave, regla) => {
      expect(validarRegla(regla)).toEqual([]);
    },
  );

  it("cubre los cuatro niveles del motor", () => {
    const niveles = new Set(REGLAS.map((r) => r.nivel));
    expect([...niveles].sort()).toEqual([1, 2, 3, 4]);
  });

  it("ninguna clave se repite", () => {
    const claves = REGLAS.map((r) => r.rule_key);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("toda regla se puede leer en español sin dejar huecos", () => {
    // §3.6: si una regla no se puede describir, el entrenador ve desaparecer un
    // ejercicio sin motivo.
    for (const r of REGLAS) {
      const frase = describirRegla(r);
      expect(frase, r.rule_key).not.toContain("undefined");
      expect(frase, r.rule_key).not.toContain("no hace nada");
    }
  });

  it("cada acción la ejecuta el nivel donde está escrita", () => {
    for (const r of REGLAS) {
      const permitidas = ACCIONES_POR_NIVEL[r.nivel as NivelMotor];
      for (const clave of Object.keys(r.actions) as ClaveAccion[]) {
        expect(permitidas, `${r.rule_key} · ${clave}`).toContain(clave);
      }
    }
  });

  it("todo hecho que mira está en el catálogo", () => {
    for (const r of REGLAS) {
      for (const p of r.condition.todas) {
        expect(esHecho(p.hecho), `${r.rule_key} mira "${p.hecho}"`).toBe(true);
        expect(HECHOS[p.hecho as keyof typeof HECHOS].nivel).toBeLessThanOrEqual(r.nivel);
      }
    }
  });

  it("los ejercicios que nombra existen en la carga de la biblioteca", () => {
    // ESTE es el que importa. El motor cruza por NOMBRE: si una regla dice
    // "Prensa 45" y la biblioteca dice "Prensa 45°", la regla no falla — no
    // hace nada, para siempre, y nadie se entera.
    const biblioteca = new Set(
      [...SQL.matchAll(/^\s*\('([^']+)',\s*'[^']*',\s*'[a-z_]+',/gm)].map((m) => m[1]),
    );
    expect(biblioteca.size).toBeGreaterThan(25);

    for (const r of REGLAS) {
      const nombrados = [
        ...(r.actions.excluir_ejercicios ?? []),
        ...(r.actions.sustituir_por ?? []),
        ...(r.actions.priorizar ?? []),
      ];
      for (const n of nombrados) {
        expect(biblioteca, `${r.rule_key} nombra "${n}"`).toContain(n);
      }
    }
  });

  it("los patrones del reparto son del catálogo cerrado", () => {
    for (const r of REGLAS) {
      if (!r.actions.ratio_patron) continue;
      const suma = Object.values(r.actions.ratio_patron).reduce((a, b) => a + b, 0);
      expect(suma, r.rule_key).toBeCloseTo(1, 5);
    }
  });
});
