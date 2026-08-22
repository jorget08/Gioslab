"use client";

import { AlertTriangle } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  estadoROM,
  fueraDeRango,
  severidadDorsiflexion,
  TESTS,
  type EstadoROM,
} from "@/domain/movilidad";
import { cn } from "@/lib/utils";

type TestNumerico = keyof typeof TESTS;

/**
 * Un test de ROM: se teclea la medida y el sistema dice qué significa.
 *
 * La clasificación aparece EN VIVO al lado del campo, no al final. Es §3.6
 * aplicado a la captura: el entrenador ve por qué su 8.5 cm sale Restringido
 * —el umbral está escrito ahí mismo— y puede discutirlo antes de guardar, en
 * lugar de descubrirlo cuando el motor ya excluyó media rutina.
 *
 * Se teclea el número, no se elige la etiqueta. Guardar "Limitada" perdería el
 * dato: dos atletas con 5.1 cm y 9.9 cm no están igual, y si Giovanni mueve el
 * umbral habría que remedir a todo el mundo.
 */
export function CampoROM({
  test,
  valor,
  onChange,
  anterior,
  autoFocus,
}: {
  test: TestNumerico;
  /** Lo tecleado tal cual, como texto: no pelear con el cursor ni con la coma. */
  valor: string;
  onChange: (v: string) => void;
  /** Lo que se midió la vez pasada. La movilidad SÍ cambia, así que es
   *  referencia para comparar, nunca un valor que se copie solo. */
  anterior?: number | null;
  autoFocus?: boolean;
}) {
  const meta = TESTS[test];
  const crudo = valor.trim().replace(",", ".");
  const num = crudo === "" ? null : Number(crudo);
  const valido = num !== null && Number.isFinite(num);

  const error = valido ? fueraDeRango(test, num) : null;
  const estado: EstadoROM | null = error ? null : estadoROM(test, valido ? num : null);

  // La dorsiflexión es el único test con dos grados de restricción, y cada uno
  // dispara una acción distinta en la ficha de Giovanni.
  const severidad =
    test === "ankle_dorsiflexion_cm" && valido && !error ? severidadDorsiflexion(num) : null;

  const idAyuda = `${test}-ayuda`;
  const idEstado = estado || error ? `${test}-estado` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={test} className="text-sm font-medium">
          {meta.etiqueta}
        </Label>
        {anterior !== null && anterior !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground">
            antes {anterior}
            {meta.unidad}
          </span>
        )}
      </div>

      <p id={idAyuda} className="text-xs text-muted-foreground">
        {meta.protocolo}
      </p>

      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <input
            id={test}
            name={test}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={autoFocus}
            // Teclado decimal: la dorsiflexión se mide en cm con un decimal y
            // los grados son enteros, pero un solo teclado evita sorpresas.
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            placeholder="—"
            aria-describedby={[idAyuda, idEstado].filter(Boolean).join(" ") || undefined}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-12 w-full rounded-lg border bg-background px-3 pr-10 text-lg tabular-nums",
              "outline-none focus:ring-2 focus:ring-ring/50",
              error ? "border-destructive" : "border-input",
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {meta.unidad}
          </span>
        </div>

        {/* El veredicto, del ancho fijo para que la columna no baile al teclear. */}
        <div
          className={cn(
            "flex min-w-[7.5rem] items-center justify-center rounded-lg border px-2 text-center text-xs font-medium",
            estado === "Óptimo" && "border-[color:var(--gl-ok)]/40 bg-[color:var(--gl-ok-sv)] text-[color:var(--gl-ok)]",
            estado === "Restringido" &&
              "border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] text-[color:var(--gl-alerta)]",
            !estado && "border-dashed text-muted-foreground",
          )}
        >
          {severidad ?? estado ?? "sin medir"}
        </div>
      </div>

      {error ? (
        <p id={idEstado} role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        estado && (
          <p id={idEstado} className="text-xs text-muted-foreground">
            {meta.implicacion}.
          </p>
        )
      )}
    </div>
  );
}
