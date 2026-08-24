"use client";

import { cn } from "@/lib/utils";

/**
 * Selección entre pocas opciones, como botones grandes.
 *
 * No es un `<select>` a propósito (docs/WIZARD-UX.md §7): con tres opciones un
 * desplegable son dos toques y un menú que tapa la pantalla; esto es un toque y
 * se ven todas a la vez. Importa cuando se usa de pie y con una mano.
 *
 * Es un grupo de radios de verdad, no botones: así funciona con teclado y con
 * lector de pantalla sin trabajo extra.
 */
export function GrupoOpciones<T extends string>({
  nombre,
  etiqueta,
  ayuda,
  opciones,
  valor,
  onChange,
  error,
  columnas = false,
}: {
  nombre: string;
  etiqueta: string;
  ayuda?: string;
  opciones: readonly { valor: T; texto: string; detalle?: string }[];
  valor: T | undefined;
  onChange: (v: T) => void;
  error?: string;
  /** Dos por fila. Solo para opciones cortas, tipo Masculino / Femenino. */
  columnas?: boolean;
}) {
  const idError = error ? `${nombre}-error` : undefined;

  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="text-sm font-medium">{etiqueta}</legend>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}

      <div
        className={cn("gap-2", columnas ? "grid grid-cols-2" : "flex flex-col")}
        aria-describedby={idError}
      >
        {opciones.map((o) => {
          const activa = valor === o.valor;
          return (
            <label
              key={o.valor}
              className={cn(
                "flex min-h-11 cursor-pointer select-none items-center justify-between gap-2",
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                "focus-within:ring-2 focus-within:ring-ring/50",
                activa
                  ? "seleccionado"
                  : "border-input hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={nombre}
                value={o.valor}
                checked={activa}
                onChange={() => onChange(o.valor)}
                className="sr-only"
              />
              <span>{o.texto}</span>
              {o.detalle && (
                <span className={cn("text-xs", activa ? "opacity-80" : "text-muted-foreground")}>
                  {o.detalle}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <p id={idError} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
