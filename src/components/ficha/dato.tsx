"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { Variacion } from "@/domain/evolucion";
import { cn } from "@/lib/utils";

/**
 * Piezas de la ficha del atleta.
 *
 * DECISIÓN DE DISEÑO: la variación NO se colorea de verde ni de rojo.
 *
 * Es tentador pintar "bajó 3 kg" de verde, pero eso es una opinión: para quien
 * busca ganar masa es un retroceso. La flecha dice la dirección, el número dice
 * la magnitud, y quién decide si eso es bueno es el entrenador. El único color
 * de juicio en toda la ficha es el del ratio cintura/cadera, porque ese umbral
 * sí está escrito en la ficha de Giovanni.
 */

export function Delta({ v, className }: { v: Variacion | null; className?: string }) {
  if (!v) return null;

  const Icono = v.direccion === "sube" ? ArrowUp : v.direccion === "baja" ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        // `whitespace-nowrap`: sin esto el navegador parte "−2.1 %" entre la
        // cifra y la unidad, y el delta se lee en tres líneas.
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground",
        className,
      )}
    >
      <Icono className="size-3 shrink-0" aria-hidden="true" />
      {v.texto}
    </span>
  );
}

/** Una cifra con su rótulo y, si hay con qué compararla, su variación. */
export function Dato({
  rotulo,
  valor,
  unidad,
  variacion,
  aviso,
}: {
  rotulo: string;
  valor: number | string | null | undefined;
  unidad?: string;
  variacion?: Variacion | null;
  /** Único sitio donde la ficha se permite juzgar. Ver el comentario de arriba. */
  aviso?: string;
}) {
  const vacio = valor === null || valor === undefined || valor === "";

  return (
    <div className="flex min-h-11 items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className="flex items-baseline gap-2 text-right">
        {vacio ? (
          // Un guion y no un cero: "0 %" es un dato, "—" es la ausencia de dato,
          // y confundirlos en una ficha clínica no es aceptable.
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <>
            {variacion && <Delta v={variacion} />}
            <span className="text-sm font-medium tabular-nums">
              {valor}
              {unidad ? <span className="text-muted-foreground"> {unidad}</span> : null}
            </span>
          </>
        )}
      </span>
      {aviso && (
        <span className="sr-only">{aviso}</span>
      )}
    </div>
  );
}

/** La cifra protagonista de un bloque: grande, con su variación debajo. */
export function DatoDestacado({
  rotulo,
  valor,
  unidad,
  variacion,
  contexto,
}: {
  rotulo: string;
  valor: number | string | null | undefined;
  unidad?: string;
  variacion?: Variacion | null;
  /** "desde 5 meses antes". Sin esto, un delta no se puede interpretar. */
  contexto?: string | null;
}) {
  const vacio = valor === null || valor === undefined || valor === "";

  return (
    <div className="space-y-0.5">
      <p className="rotulo">{rotulo}</p>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">
        {vacio ? <span className="text-muted-foreground">—</span> : valor}
        {!vacio && unidad ? (
          <span className="ml-1 text-lg font-normal text-muted-foreground">{unidad}</span>
        ) : null}
      </p>
      {variacion && (
        <p className="text-xs leading-snug text-muted-foreground">
          <Delta v={variacion} />
          {/* El contexto va en el mismo párrafo y sí puede partirse: "desde 6
              meses antes" cabe en dos líneas sin molestar; el delta, no. */}
          {contexto && <span className="ml-1.5">{contexto}</span>}
        </p>
      )}
    </div>
  );
}

/**
 * Bloque vacío con la acción que lo llenaría.
 *
 * Una ficha sin mediciones no es un error: es un atleta recién creado. Decirlo
 * así, con el botón al lado, evita que parezca que algo se rompió.
 */
export function SinDatos({ children }: { children: React.ReactNode }) {
  return <div className="py-2 text-sm text-muted-foreground">{children}</div>;
}
