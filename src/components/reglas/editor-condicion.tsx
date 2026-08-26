"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ETIQUETA_NIVEL,
  HECHOS,
  NIVELES_MOTOR,
  TEXTO_OPERADOR,
  esHecho,
  hechosDeNivel,
  operadoresDe,
  type Condicion,
  type Hecho,
  type Predicado,
} from "@/domain/reglas";

/**
 * El constructor de condiciones (tarea 3.5).
 *
 * NADA SE ESCRIBE A MANO, y esa es toda la idea. El hecho sale de un desplegable
 * agrupado por nivel; el operador se filtra según el tipo del hecho, así que no
 * se puede pedir "Fase del ciclo es mayor que"; y el valor se adapta al hecho:
 * número con su unidad, desplegable si el dominio es cerrado, sí/no si es
 * booleano, dos casillas si es un rango.
 *
 * Se podría dejar escribir y validar después. Sería peor: un desplegable que no
 * deja equivocarse ENSEÑA la gramática mientras se usa, y quien edita la matriz
 * es Giovanni, que no programa. `validarRegla` sigue detrás como red, pero aquí
 * el objetivo es que casi nunca tenga que saltar.
 */

/** Valor inicial coherente con el tipo, para no dejar el predicado a medias. */
function valorPorDefecto(hecho: string): Predicado["valor"] {
  if (!esHecho(hecho)) return 0;
  const h: Hecho = HECHOS[hecho];
  if (h.tipo === "booleano") return true;
  if (h.dominio) return h.dominio[0];
  return 0;
}

function nuevoPredicado(hecho: string): Predicado {
  const ops = operadoresDe(hecho);
  return { hecho, op: ops[0] ?? "=", valor: valorPorDefecto(hecho) };
}

const CLASE_CAMPO =
  "min-h-11 w-full rounded-lg border bg-background px-3 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditorCondicion({
  condicion,
  onCambio,
}: {
  condicion: Condicion;
  onCambio: (c: Condicion) => void;
}) {
  const todas = condicion.todas ?? [];

  const reemplazar = (i: number, p: Predicado) =>
    onCambio({ todas: todas.map((x, j) => (j === i ? p : x)) });

  const quitar = (i: number) => onCambio({ todas: todas.filter((_, j) => j !== i) });

  function cambiarHecho(i: number, hecho: string) {
    // Se rehace el predicado entero, no solo el hecho. Conservar el operador o
    // el valor anterior deja combinaciones imposibles —"Fase del ciclo es menor
    // que 7"— que luego hay que explicar con un error.
    reemplazar(i, nuevoPredicado(hecho));
  }

  function cambiarOperador(i: number, op: string) {
    const p = todas[i];
    const ops = operadoresDe(p.hecho);
    if (!ops.includes(op as Predicado["op"])) return;

    // "entre" necesita un par; salir de "entre" necesita dejar de serlo.
    const eraRango = Array.isArray(p.valor);
    const esRango = op === "entre";
    const valor: Predicado["valor"] = esRango
      ? eraRango
        ? p.valor
        : [typeof p.valor === "number" ? p.valor : 0, typeof p.valor === "number" ? p.valor + 1 : 1]
      : eraRango
        ? (p.valor as [number, number])[0]
        : p.valor;

    reemplazar(i, { ...p, op: op as Predicado["op"], valor });
  }

  return (
    <div className="space-y-3">
      {todas.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Sin condiciones, la regla se aplicaría a todos los atletas siempre. Añade al menos una.
        </p>
      )}

      <ul className="space-y-3">
        {todas.map((p, i) => (
          <li key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="rotulo">{i === 0 ? "Si" : "Y además"}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto size-11"
                onClick={() => quitar(i)}
                aria-label={`Quitar la condición ${i + 1}`}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <select
              className={CLASE_CAMPO}
              value={p.hecho}
              onChange={(e) => cambiarHecho(i, e.target.value)}
              aria-label="Qué se mira"
            >
              {NIVELES_MOTOR.map((n) => (
                <optgroup key={n} label={`Nivel ${n} · ${ETIQUETA_NIVEL[n]}`}>
                  {hechosDeNivel(n).map((clave) => (
                    <option key={clave} value={clave}>
                      {HECHOS[clave].etiqueta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              className={CLASE_CAMPO}
              value={p.op}
              onChange={(e) => cambiarOperador(i, e.target.value)}
              aria-label="Cómo se compara"
            >
              {operadoresDe(p.hecho).map((op) => (
                <option key={op} value={op}>
                  {TEXTO_OPERADOR[op]}
                </option>
              ))}
            </select>

            <CampoValor predicado={p} onCambio={(valor) => reemplazar(i, { ...p, valor })} />
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        onClick={() => onCambio({ todas: [...todas, nuevoPredicado("dorsiflexion_cm")] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        Añadir condición
      </Button>
    </div>
  );
}

/** El valor cambia de forma según el hecho. Un input de texto valdría para todo y por eso sería peor. */
function CampoValor({
  predicado: p,
  onCambio,
}: {
  predicado: Predicado;
  onCambio: (v: Predicado["valor"]) => void;
}) {
  if (!esHecho(p.hecho)) return null;
  const h: Hecho = HECHOS[p.hecho];

  if (p.op === "entre") {
    const [min, max] = Array.isArray(p.valor) ? p.valor : [0, 1];
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={CLASE_CAMPO}
          value={min}
          onChange={(e) => onCambio([Number(e.target.value), max])}
          aria-label="Desde"
        />
        <span className="shrink-0 text-xs text-muted-foreground">y</span>
        <input
          type="number"
          inputMode="decimal"
          className={CLASE_CAMPO}
          value={max}
          onChange={(e) => onCambio([min, Number(e.target.value)])}
          aria-label="Hasta"
        />
        {h.unidad && <span className="shrink-0 text-xs text-muted-foreground">{h.unidad}</span>}
      </div>
    );
  }

  if (h.tipo === "booleano") {
    return (
      <select
        className={CLASE_CAMPO}
        value={p.valor === true ? "si" : "no"}
        onChange={(e) => onCambio(e.target.value === "si")}
        aria-label="Valor"
      >
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    );
  }

  if (h.dominio) {
    return (
      <select
        className={CLASE_CAMPO}
        value={String(p.valor)}
        onChange={(e) => onCambio(e.target.value)}
        aria-label="Valor"
      >
        {h.dominio.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        className={CLASE_CAMPO}
        value={typeof p.valor === "number" ? p.valor : 0}
        onChange={(e) => onCambio(Number(e.target.value))}
        aria-label="Valor"
      />
      {h.unidad && <span className="shrink-0 text-xs text-muted-foreground">{h.unidad}</span>}
    </div>
  );
}
