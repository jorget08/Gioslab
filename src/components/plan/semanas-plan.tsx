"use client";

import { Button } from "@/components/ui/button";
import type { Plan, SemanaPlan } from "@/domain/plan";

/**
 * La barra de semanas del plan.
 *
 * En los modelos con bloques (bloques, ATR) las semanas se agrupan por fase,
 * como en gymapp: Giovanni, 3-nov, "la barra muestra S1, S2, S3… planos,
 * perdiendo la estructura pedagógica de la periodización". Sin bloques sale una
 * sola fila, como antes.
 */
export function SemanasPlan({
  plan,
  semanaVista,
  onVer,
}: {
  plan: Plan;
  semanaVista: number;
  onVer: (semana: number) => void;
}) {
  // Agrupadas en orden: un bloque es un tramo seguido de semanas con el mismo nombre.
  const grupos: { bloque: string | null; semanas: SemanaPlan[] }[] = [];
  for (const s of plan.semanas) {
    const bloque = s.bloque ?? null;
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.bloque === bloque) ultimo.semanas.push(s);
    else grupos.push({ bloque, semanas: [s] });
  }

  // La descarga cierra el mesociclo (9-nov): se rotula sola, sin número de bloque.
  const esDescarga = (g: (typeof grupos)[number]) => g.semanas.every((s) => s.tipo === "descarga");

  return (
    <div className="space-y-3">
      {grupos.map((g, i) => (
        <section key={`${g.bloque}-${i}`} className="space-y-1.5">
          {g.bloque && (
            <p className="text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">
                {esDescarga(g)
                  ? g.bloque
                  : `Bloque ${grupos.filter((x, k) => k <= i && x.bloque && !esDescarga(x)).length}: ${g.bloque}`}
              </strong>{" "}
              · semanas {g.semanas[0].semana}
              {g.semanas.length > 1 ? `–${g.semanas.at(-1)!.semana}` : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {g.semanas.map((s) => (
              <Button
                key={s.semana}
                type="button"
                variant={s.semana === semanaVista ? "default" : "outline"}
                className="min-h-11 flex-1 basis-20"
                onClick={() => onVer(s.semana)}
              >
                <span className="flex flex-col leading-tight">
                  <span>S{s.semana}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {s.tipo === "carga" ? "carga" : s.tipo === "descarga" ? "descarga" : "super."}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
