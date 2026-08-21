"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import type { ComposicionCorporal } from "@/domain/calculations/composicion-corporal";
import { cn } from "@/lib/utils";

/**
 * Resultado en vivo de la composición corporal.
 *
 * NO EMITE JUICIO. Dice 18.0 % y que bajó; no dice "bien", "alto" ni "objetivo
 * alcanzado". El sistema es un copiloto y quien interpreta es el entrenador
 * (CLAUDE.md §3.6). Un semáforo de colores aquí sería el sistema opinando sobre
 * el cuerpo de una persona.
 *
 * La flecha compara con la evaluación anterior, sin adjetivos: una bajada de
 * grasa y una bajada de masa magra significan cosas opuestas, y solo el
 * entrenador sabe cuál buscaba.
 */
export function Resultado({
  composicion,
  anterior,
  faltan,
}: {
  composicion: ComposicionCorporal | null;
  anterior?: { body_fat_pct: number | null; lean_mass_kg: number | null } | null;
  faltan: string[];
}) {
  if (!composicion) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {faltan.length > 0
            ? `Faltan ${faltan.join(" y ")} para calcular el porcentaje graso.`
            : "Completa las medidas para ver el resultado."}
        </p>
      </div>
    );
  }

  const filas = [
    { etiqueta: "Suma 7 pliegues", valor: composicion.suma7, unidad: "mm" },
    { etiqueta: "Densidad corporal", valor: composicion.densidad, unidad: "" },
    {
      etiqueta: "Grasa corporal",
      valor: composicion.porcentajeGraso,
      unidad: "%",
      previo: anterior?.body_fat_pct,
      destacado: true,
    },
    { etiqueta: "Masa grasa", valor: composicion.masaGrasaKg, unidad: "kg" },
    {
      etiqueta: "Masa magra",
      valor: composicion.masaMagraKg,
      unidad: "kg",
      previo: anterior?.lean_mass_kg,
    },
    { etiqueta: "IMC", valor: composicion.imc, unidad: "" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-2">
        <span className="rotulo">Resultado</span>
      </div>

      <dl className="divide-y">
        {filas.map((f) => {
          const previo = f.previo ?? null;
          const delta = previo !== null ? Number((f.valor - previo).toFixed(1)) : null;

          return (
            <div
              key={f.etiqueta}
              className={cn(
                "flex items-baseline justify-between gap-3 px-4",
                f.destacado ? "py-3" : "py-2",
              )}
            >
              <dt className={cn("text-sm", f.destacado ? "font-medium" : "text-muted-foreground")}>
                {f.etiqueta}
              </dt>
              <dd className="flex items-baseline gap-2">
                <span
                  className={cn("dato", f.destacado ? "text-xl font-semibold text-primary" : "text-sm")}
                >
                  {f.valor}
                  {f.unidad && <span className="ml-0.5 text-xs opacity-70">{f.unidad}</span>}
                </span>

                {delta !== null && delta !== 0 && (
                  <span className="dato flex items-center gap-0.5 text-xs text-muted-foreground">
                    {delta < 0 ? (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    )}
                    {Math.abs(delta)}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        Jackson &amp; Pollock 7 pliegues · ecuación de Siri
      </p>
    </div>
  );
}
