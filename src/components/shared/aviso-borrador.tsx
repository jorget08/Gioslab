"use client";

import { RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { haceCuantoCorto } from "@/domain/borrador";

/**
 * Aviso de evaluación a medias.
 *
 * Aparece arriba, antes de los campos, porque la decisión de retomar o empezar
 * de cero hay que tomarla ANTES de teclear nada: si el entrenador escribe primero
 * y restaura después, pierde lo que acaba de meter.
 *
 * Las dos acciones son explícitas. Restaurar solo porque sí sería peor: al
 * volver vería datos que no recuerda haber escrito y no sabría si son de este
 * atleta o del anterior.
 */
export function AvisoBorrador({
  guardadoEn,
  onRestaurar,
  onDescartar,
}: {
  guardadoEn: number;
  onRestaurar: () => void;
  onDescartar: () => void;
}) {
  return (
    <div
      role="status"
      className="space-y-3 rounded-xl border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-4"
    >
      <div className="flex items-start gap-2.5">
        <RotateCcw
          className="mt-0.5 size-4 shrink-0 text-[color:var(--gl-alerta)]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Tienes esta evaluación a medias</p>
          <p className="text-xs text-muted-foreground">
            La empezaste {haceCuantoCorto(guardadoEn)} y no llegaste a guardarla.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          onClick={onDescartar}
        >
          <X className="size-4" aria-hidden="true" />
          Empezar de cero
        </Button>
        <Button type="button" className="min-h-11 flex-[2]" onClick={onRestaurar}>
          Continuar donde iba
        </Button>
      </div>
    </div>
  );
}
