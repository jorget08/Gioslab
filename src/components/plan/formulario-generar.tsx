"use client";

import { Sparkles } from "lucide-react";

import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { diasDisponibles, type Metodo } from "@/domain/metodo";
import { FICHA_OBJETIVO, type Objetivo } from "@/domain/plan";

/**
 * Las tres decisiones antes de generar (tarea 5.4).
 *
 * Solo tres, y con dos ya rellenas: días por semana, cuántas semanas y con qué
 * objetivo. El resto —periodización, series, repeticiones, RPE, descanso,
 * cuándo cae la descarga— sale del método de Giovanni y no se pregunta. Un
 * formulario que pregunta lo que el sistema ya sabe es un sistema que no sabe
 * nada.
 *
 * El objetivo va vacío como "según su meta" y solo hay que tocarlo cuando él no
 * ha dicho cómo se programa esa meta — hoy, "Mantenimiento".
 */
export function FormularioGenerar({
  metodo,
  hayPlan,
  dias,
  semanas,
  objetivo,
  trabajando,
  onDias,
  onSemanas,
  onObjetivo,
  onGenerar,
}: {
  metodo: Metodo;
  hayPlan: boolean;
  dias: number;
  semanas: number;
  objetivo: Objetivo | "";
  trabajando: boolean;
  onDias: (v: number) => void;
  onSemanas: (v: number) => void;
  onObjetivo: (v: Objetivo | "") => void;
  onGenerar: () => void;
}) {
  return (
    <Bloque rotulo={hayPlan ? "Volver a generar" : "Generar la rutina"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Días por semana</span>
          <select
            value={dias}
            onChange={(e) => onDias(Number(e.target.value))}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {/* Solo los que él repartió. Ofrecer 6 días sería ofrecer algo que
                el generador no sabe armar. */}
            {diasDisponibles(metodo).map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Semanas</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            value={semanas}
            onChange={(e) => onSemanas(Number(e.target.value))}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base tabular-nums"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Objetivo</span>
          <select
            value={objetivo}
            onChange={(e) => onObjetivo(e.target.value as Objetivo | "")}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
          >
            <option value="">Según su meta</option>
            {(Object.keys(FICHA_OBJETIVO) as Objetivo[]).map((o) => (
              <option key={o} value={o}>
                {FICHA_OBJETIVO[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        La descarga cae en la {metodo.descarga.cadaSemanas}ª semana y la siguiente es de
        supercompensación, que es como programa Giovanni. Un mesociclo de{" "}
        {metodo.descarga.cadaSemanas + 1} semanas trae las dos.
      </p>

      <Button type="button" className="min-h-11 w-full" disabled={trabajando} onClick={onGenerar}>
        <Sparkles className="size-4" aria-hidden="true" />
        {hayPlan ? "Generar de nuevo" : "Generar rutina"}
      </Button>

      {hayPlan && (
        <p className="text-xs text-muted-foreground">
          Generar de nuevo crea una rutina nueva y deja la anterior en el historial. Lo que hayas
          editado no se pierde: se queda en la de antes.
        </p>
      )}
    </Bloque>
  );
}
