"use client";

import { ChevronDown } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Desplegable con flecha propia.
 *
 * Sigue siendo un `<select>` nativo por dentro, y es deliberado: en un móvil el
 * navegador abre la rueda del sistema, que se maneja con el pulgar mucho mejor
 * que cualquier lista que dibujemos nosotros. Además funciona con teclado y con
 * lector de pantalla sin trabajo extra.
 *
 * Lo único que se cambia es el aspecto: se oculta la flecha del navegador
 * —pegada al borde y de un gris que no encaja con ningún tema— y se dibuja una
 * con el espaciado del resto de la interfaz.
 */
export function CampoSelect({
  etiqueta,
  ayuda,
  error,
  id,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & {
  etiqueta: string;
  ayuda?: string;
  error?: string;
}) {
  const idCampo = id ?? props.name;
  const idError = error ? `${idCampo}-error` : undefined;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={idCampo}>{etiqueta}</Label>

      <div className="relative">
        <select
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={[idError, idAyuda].filter(Boolean).join(" ") || undefined}
          className={cn(
            "min-h-11 w-full appearance-none rounded-lg border border-input bg-transparent",
            // pr-10 deja sitio a la flecha propia sin que el texto pase por debajo.
            "px-3 pr-10 text-base transition-colors",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "aria-invalid:border-destructive",
            className,
          )}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {ayuda && !error && (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
