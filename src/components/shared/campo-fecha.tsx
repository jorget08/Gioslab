"use client";

import { useEffect, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import { aISO, campoCompleto, desdeISO, soloDigitos } from "@/domain/fecha";
import { cn } from "@/lib/utils";

/**
 * Fecha en tres campos: día, mes y año.
 *
 * NO es un `<input type="date">`, y no es solo por estética. El selector de
 * calendario del navegador obliga a retroceder treinta años a golpe de flecha
 * para una fecha de nacimiento; tres campos numéricos se llenan en cinco
 * segundos con el pulgar.
 *
 * Detalles que lo hacen rápido de verdad:
 *  - Teclado numérico en los tres (`inputMode="numeric"`).
 *  - Avance automático al completar cada uno. Un "5" en el mes salta solo,
 *    porque no hay ningún mes que empiece por 5 y tenga dos cifras.
 *  - Borrar con el campo vacío retrocede al anterior, que es lo que espera
 *    cualquiera que se equivoque tecleando.
 *  - El 31 de febrero no se acepta: si se dejara pasar, el navegador lo
 *    "corregiría" a marzo sin avisar.
 */
export function CampoFecha({
  etiqueta,
  ayuda,
  error,
  valor,
  onChange,
  nombre = "fecha",
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Fecha ISO (AAAA-MM-DD) o cadena vacía. */
  valor: string;
  onChange: (iso: string) => void;
  nombre?: string;
}) {
  const inicial = desdeISO(valor);
  const [dia, setDia] = useState(inicial.dia);
  const [mes, setMes] = useState(inicial.mes);
  const [anio, setAnio] = useState(inicial.anio);

  const refMes = useRef<HTMLInputElement>(null);
  const refAnio = useRef<HTMLInputElement>(null);

  // Se avisa hacia arriba con la fecha completa, o con "" mientras no lo esté.
  useEffect(() => {
    onChange(aISO(dia, mes, anio));
    // `onChange` cambia en cada render del padre; incluirlo dispararía el
    // efecto en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia, mes, anio]);

  const idError = error ? `${nombre}-error` : undefined;
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined;

  function retrocederSiVacio(
    e: React.KeyboardEvent<HTMLInputElement>,
    valorActual: string,
    anterior: React.RefObject<HTMLInputElement | null>,
  ) {
    if (e.key === "Backspace" && valorActual === "" && anterior.current) {
      anterior.current.focus();
    }
  }

  const claseCampo = cn(
    "dato min-h-11 rounded-lg border border-input bg-transparent text-center text-base",
    "transition-colors placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
    error && "border-destructive",
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${nombre}-dia`}>{etiqueta}</Label>

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={etiqueta}
        aria-describedby={[idError, idAyuda].filter(Boolean).join(" ") || undefined}
      >
        <input
          id={`${nombre}-dia`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD"
          aria-label="Día"
          value={dia}
          className={cn(claseCampo, "w-14")}
          onChange={(e) => {
            const v = soloDigitos(e.target.value, 2);
            setDia(v);
            if (campoCompleto(v, "dia")) refMes.current?.focus();
          }}
        />
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>

        <input
          ref={refMes}
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM"
          aria-label="Mes"
          value={mes}
          className={cn(claseCampo, "w-14")}
          onChange={(e) => {
            const v = soloDigitos(e.target.value, 2);
            setMes(v);
            if (campoCompleto(v, "mes")) refAnio.current?.focus();
          }}
          onKeyDown={(e) => retrocederSiVacio(e, mes, { current: document.getElementById(`${nombre}-dia`) as HTMLInputElement | null })}
        />
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>

        <input
          ref={refAnio}
          inputMode="numeric"
          autoComplete="off"
          placeholder="AAAA"
          aria-label="Año"
          value={anio}
          className={cn(claseCampo, "w-20")}
          onChange={(e) => setAnio(soloDigitos(e.target.value, 4))}
          onKeyDown={(e) => retrocederSiVacio(e, anio, refMes)}
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
