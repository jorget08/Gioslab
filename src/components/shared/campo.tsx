"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Input> & {
  etiqueta: string;
  error?: string;
  ayuda?: string;
};

/**
 * Campo de formulario con etiqueta, error y accesibilidad resuelta.
 *
 * Existe para no repetir en cada pantalla el cableado de `aria-invalid` y
 * `aria-describedby`, que es justo lo que se olvida y deja el formulario
 * inutilizable con lector de pantalla.
 *
 * La altura mínima de 44px no es decorativa: es el objetivo táctil que exige
 * CLAUDE.md §3.3 para usar la app de pie en el gimnasio, con una mano.
 */
export function Campo({ etiqueta, error, ayuda, id, className, ...props }: Props) {
  const idCampo = id ?? props.name;
  const idError = error ? `${idCampo}-error` : undefined;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={idCampo}>{etiqueta}</Label>
      <Input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idError, idAyuda].filter(Boolean).join(" ") || undefined}
        className={cn("min-h-11", className)}
        {...props}
      />
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
