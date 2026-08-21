"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Label } from "@/components/ui/label";
import { CAMPOS, revisarCampo, type CampoMedida } from "@/domain/medidas";
import { cn } from "@/lib/utils";

/**
 * Un campo de medición, con su valor anterior y sus avisos.
 *
 * Lo que lo hace útil de pie en el gimnasio:
 *  - Teclado decimal siempre (`inputMode="decimal"`).
 *  - El valor de la evaluación anterior a la vista, y tocable para copiarlo:
 *    caza un error de tecleo al instante y ahorra trabajo cuando no cambió.
 *  - Dos niveles de aviso. El rojo impide guardar; el ámbar solo pregunta.
 */
export function CampoMedidaInput({
  campo,
  valor,
  onChange,
  anterior,
  fechaAnterior,
  autoFocus,
  grande = false,
}: {
  campo: CampoMedida;
  /** Lo tecleado, tal cual. Se guarda como texto para no pelear con el cursor. */
  valor: string;
  onChange: (v: string) => void;
  anterior?: number | null;
  fechaAnterior?: string | null;
  autoFocus?: boolean;
  /** Cifra protagonista, para el modo de medición pliegue a pliegue. */
  grande?: boolean;
}) {
  const meta = CAMPOS[campo];
  const num = valor.trim() === "" ? null : Number(valor.replace(",", "."));
  const aviso = revisarCampo(campo, Number.isFinite(num) ? num : null, anterior, fechaAnterior);

  const bloquea = aviso?.nivel === "bloquea";
  const idAviso = aviso ? `${campo}-aviso` : undefined;

  return (
    <div className="space-y-1.5">
      {!grande && (
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={campo}>{meta.etiqueta}</Label>
          <span className="rotulo">{meta.unidad}</span>
        </div>
      )}

      <div className="relative">
        <input
          id={campo}
          name={campo}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={bloquea ? true : undefined}
          aria-describedby={idAviso}
          placeholder="—"
          className={cn(
            "dato w-full rounded-lg border bg-transparent transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            grande
              ? "min-h-20 px-4 text-center text-4xl font-semibold"
              : "min-h-11 px-3 pr-12 text-right text-base",
            bloquea
              ? "border-destructive"
              : aviso
                ? "border-[color:var(--gl-alerta)]"
                : "border-input focus-visible:border-ring",
          )}
        />
        {grande && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
            {meta.unidad}
          </span>
        )}
        {!grande && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {meta.unidad}
          </span>
        )}
      </div>

      {/* El valor anterior, siempre visible y copiable de un toque.
          Sin la coletilla "tocar para copiar": repetida en cada campo es ruido,
          y el icono de deshacer ya sugiere qué hace. */}
      {anterior !== null && anterior !== undefined && (
        <button
          type="button"
          onClick={() => onChange(String(anterior))}
          aria-label={`Copiar el valor anterior de ${meta.etiqueta.toLowerCase()}: ${anterior} ${meta.unidad}`}
          className={cn(
            "flex min-h-11 items-center gap-1.5 rounded-md text-xs text-muted-foreground",
            "transition-colors hover:text-foreground",
            grande ? "mx-auto" : "ml-auto",
          )}
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          <span className="dato">
            {anterior} {meta.unidad}
          </span>
        </button>
      )}

      {aviso && (
        <p
          id={idAviso}
          role={bloquea ? "alert" : "status"}
          className={cn(
            "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium",
            bloquea
              ? "bg-destructive/10 text-destructive"
              : "bg-[color:var(--gl-alerta-sv)] text-[color:var(--gl-alerta)]",
          )}
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{aviso.mensaje}</span>
        </p>
      )}
    </div>
  );
}
