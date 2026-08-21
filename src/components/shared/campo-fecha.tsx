"use client";

import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Selector de fecha con calendario propio.
 *
 * No se usa `<input type="date">` porque el calendario que abre el navegador no
 * se puede tematizar: sobre fondo oscuro aparece un panel blanco con un icono
 * gris pegado al borde.
 *
 * El calendario lleva **desplegables de mes y año**. Sin ellos, elegir una fecha
 * de nacimiento obligaría a retroceder treinta años a golpe de flecha, que es el
 * defecto real de cualquier calendario en este campo.
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Fecha ISO → Date local, sin que la zona horaria mueva el día. */
function aFecha(iso: string | undefined): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** Date → ISO, construido a mano: toISOString() pasa por UTC y resta un día. */
function aISO(fecha: Date | undefined): string {
  if (!fecha) return "";
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function enPalabras(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

export function CampoFecha({
  etiqueta,
  ayuda,
  error,
  valor,
  onChange,
  nombre = "fecha",
  /** Año más antiguo seleccionable. */
  desdeAnio = new Date().getFullYear() - 100,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  valor: string;
  onChange: (iso: string) => void;
  nombre?: string;
  desdeAnio?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const fecha = aFecha(valor);
  const hoy = new Date();

  const idError = error ? `${nombre}-error` : undefined;
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>

      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button
            id={nombre}
            type="button"
            variant="outline"
            aria-invalid={error ? true : undefined}
            aria-describedby={[idError, idAyuda].filter(Boolean).join(" ") || undefined}
            className={cn(
              "min-h-11 w-full justify-between px-3 font-normal",
              !fecha && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <span className={fecha ? "dato" : undefined}>
              {fecha ? enPalabras(fecha) : "Elegir fecha"}
            </span>
            <CalendarIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            // Sin esto los días salen en inglés —"Su Mo Tu We"— y la semana
            // empieza en domingo, que no es la convención de aquí.
            locale={es}
            selected={fecha}
            defaultMonth={fecha ?? new Date(hoy.getFullYear() - 25, 0)}
            // Los desplegables de mes y año son lo que hace usable un calendario
            // para una fecha de nacimiento.
            captionLayout="dropdown"
            startMonth={new Date(desdeAnio, 0)}
            endMonth={new Date(hoy.getFullYear(), 11)}
            disabled={{ after: hoy }}
            onSelect={(d) => {
              onChange(aISO(d));
              // Se cierra al elegir: en un móvil, un panel abierto tapa el resto
              // del formulario y hay que buscar dónde tocar para cerrarlo.
              if (d) setAbierto(false);
            }}
          />
        </PopoverContent>
      </Popover>

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
