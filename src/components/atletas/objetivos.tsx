"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Objetivos jerarquizados.
 *
 * El ORDEN es la prioridad, no un detalle de presentación: cuando dos objetivos
 * se contradicen —ganar masa y perder grasa— el motor tiene que saber cuál pesa
 * más. Por eso se pueden reordenar y el número va visible.
 *
 * Se reordena con botones y no arrastrando: arrastrar en un móvil, de pie y con
 * una mano, falla más de lo que ayuda.
 */
export function Objetivos({
  objetivos,
  onChange,
}: {
  objetivos: string[];
  onChange: (o: string[]) => void;
}) {
  const [texto, setTexto] = useState("");

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= objetivos.length) return;
    const copia = [...objetivos];
    [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
    onChange(copia);
  }

  function agregar() {
    const t = texto.trim();
    if (!t || objetivos.length >= 5) return;
    onChange([...objetivos, t]);
    setTexto("");
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Objetivos por prioridad</h3>
        <p className="text-xs text-muted-foreground">
          El orden importa: el primero manda cuando dos objetivos se contradicen.
        </p>
      </div>

      {objetivos.length > 0 && (
        <ol className="divide-y rounded-lg border">
          {objetivos.map((o, i) => (
            <li key={`${o}-${i}`} className="flex items-center gap-1 px-3 py-2">
              <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-sm">{o}</span>

              <Button
                type="button" variant="ghost" size="icon" className="size-11 shrink-0"
                aria-label={`Subir ${o}`} disabled={i === 0}
                onClick={() => mover(i, i - 1)}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon" className="size-11 shrink-0"
                aria-label={`Bajar ${o}`} disabled={i === objetivos.length - 1}
                onClick={() => mover(i, i + 1)}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon" className="size-11 shrink-0"
                aria-label={`Quitar ${o}`}
                onClick={() => onChange(objetivos.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      )}

      {objetivos.length < 5 && (
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder="Volver a correr sin dolor…"
            aria-label="Nuevo objetivo"
            className="min-h-11"
          />
          <Button
            type="button" variant="outline" className="min-h-11 shrink-0"
            onClick={agregar} disabled={!texto.trim()}
          >
            Añadir
          </Button>
        </div>
      )}
    </div>
  );
}
