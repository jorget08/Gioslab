import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CONTRAINDICACIONES, esContraindicacion } from "@/domain/contraindicaciones";

/**
 * Las contraindicaciones que se cargaron en la base, contra el catálogo cerrado.
 *
 * POR QUÉ SE LEE EL SQL, igual que en `matriz-cargada`. El fallo que esto
 * persigue es silencioso y caro: si una fila dice "Hipertensión" en vez de
 * "Hipertensión / Cardiovascular", el jsonb la acepta encantado, el CHECK no la
 * mira y el motor sencillamente **nunca cruza esa contraindicación**. El
 * ejercicio queda pareciendo evaluado cuando en realidad es invisible para el
 * cruce, que es peor que no tener el dato: no sale en ningún recuento de huecos.
 *
 * Giovanni escribe "Hipertensión", "Hernia discal" y "Muñeca" a secas, así que
 * cada carga suya pasa por una normalización a mano. Esto es lo que comprueba
 * que la normalización se hizo entera.
 */

const MIGRACIONES = [
  "20260828100000_contraindicaciones.sql",
  "20260831100000_contraindicaciones_21.sql",
] as const;

function sql(nombre: string): string {
  return readFileSync(new URL(`../../supabase/migrations/${nombre}`, import.meta.url), "utf8");
}

/**
 * Filas cargadas, en las DOS formas que usan las migraciones: el `update ...
 * from (values ('Nombre', '[...]'))` de las equivalencias, y el `insert ...
 * values ('Nombre', músculo, patrón, '[...]')` de los ejercicios nuevos.
 *
 * Se leen las dos a propósito. Los 16 ejercicios que llegaron por `insert`
 * arrastran contraindicaciones escritas a mano igual que el resto, así que son
 * igual de propensos al error de normalización que esto persigue; mirar solo
 * una forma dejaría un tercio de las filas sin comprobar.
 */
function filasDe(texto: string): { nombre: string; valores: string[] }[] {
  const filas: { nombre: string; valores: string[] }[] = [];
  // El nombre es el primer literal de la fila y la lista es el último `::jsonb`
  // antes de cerrar; lo de en medio (músculo, patrón, `null`) da igual aquí.
  const re = /\('([^']+)'(?:[^()]*?)'(\[[^\]]*\])'::jsonb\)/g;
  for (const m of texto.matchAll(re)) {
    filas.push({ nombre: m[1], valores: JSON.parse(m[2]) as string[] });
  }
  return filas;
}

const todas = MIGRACIONES.flatMap((m) => filasDe(sql(m)));

/** Los 21 que pidió el 29-ago y devolvió el 31 en `Formulario_Ajustes_Motor_Giova`. */
const LOS_21 = [
  "Sentadilla Libre Profunda",
  "Sentadilla Low Bar",
  "Sentadilla Goblet",
  "Sentadilla con Safety Bar",
  "Sentadilla Heels-Elevated",
  "Sentadilla Búlgara con Apoyo",
  "Hack Libre",
  "Sissy Squat",
  "Prensa 45°",
  "Prensa Inclinada de Piernas",
  "Zancadas Caminando",
  "Peso Muerto Convencional",
  "Peso Muerto Rumano desde Bloque",
  "Glute Bridge",
  "Patada de Glúteo en Polea",
  "Abducciones en Polea",
  "Press Militar tras Nuca",
  "Press Overhead con Barra",
  "Press en Plano Escapular",
  "Press Inclinado a 60°",
  "Pullover con Cuerda",
];

describe("contraindicaciones cargadas", () => {
  it("las migraciones traen filas que se pueden leer", () => {
    // Si el formato del SQL cambia, el regex deja de encontrar nada y todas las
    // demás pruebas pasarían sobre una lista vacía. Este es el guardián.
    expect(todas.length).toBeGreaterThanOrEqual(21 + 20);
  });

  it("todo valor está en el catálogo cerrado", () => {
    const fuera = todas.flatMap((f) =>
      f.valores.filter((v) => !esContraindicacion(v)).map((v) => `${f.nombre}: "${v}"`),
    );
    // El mensaje enseña la fila y el valor: si esto falla a las once de la noche
    // hay que poder arreglarlo sin abrir el SQL a buscar.
    expect(fuera, `valores fuera del catálogo:\n${fuera.join("\n")}`).toEqual([]);
  });

  it("ninguna fila repite una contraindicación", () => {
    const repetidas = todas
      .filter((f) => new Set(f.valores).size !== f.valores.length)
      .map((f) => f.nombre);
    expect(repetidas).toEqual([]);
  });

  it("los 21 que faltaban están todos cargados", () => {
    const cargados = new Set(todas.map((f) => f.nombre));
    const faltan = LOS_21.filter((n) => !cargados.has(n));
    expect(faltan, `sin cargar: ${faltan.join(", ")}`).toEqual([]);
  });

  it("el peso muerto convencional quedó con riesgo lumbar", () => {
    // No estaba en su Excel del 27 y es el de más riesgo lumbar de la lista. Se
    // le señaló y lo confirmó por escrito; esto evita que se pierda en una
    // recarga futura.
    const fila = todas.find((f) => f.nombre === "Peso Muerto Convencional");
    expect(fila?.valores).toContain("Lumbar");
    expect(fila?.valores).toContain("Hernia discal / Patología axial");
  });

  it("el press en plano escapular sigue siendo el sustituto de hombro", () => {
    // Es el único sustituto seguro que sobrevivió a la carga del 31-ago: si
    // alguien le añade "Hombro", un atleta con el hombro mal se queda sin ningún
    // empuje vertical y nadie se dará cuenta hasta que pase.
    const fila = todas.find((f) => f.nombre === "Press en Plano Escapular");
    expect(fila?.valores).not.toContain("Hombro");
  });

  it("el catálogo cerrado no cambió de forma sin avisar", () => {
    // Estas cuatro cadenas están escritas a mano en dos migraciones. Si alguien
    // renombra una en el dominio, el SQL cargado deja de cruzar en silencio.
    expect(CONTRAINDICACIONES).toContain("Hipertensión / Cardiovascular");
    expect(CONTRAINDICACIONES).toContain("Hernia discal / Patología axial");
    expect(CONTRAINDICACIONES).toContain("Muñeca/Antebrazo");
    expect(CONTRAINDICACIONES).toContain("Diástasis abdominal");
  });
});
