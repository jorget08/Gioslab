"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ETIQUETA_ESTADO_LESION, ESTADOS_LESION, ZONAS_CUERPO } from "@/domain/catalogos";
import type { LesionInput } from "@/lib/validation/atleta";

/**
 * Registro de lesiones y antecedentes.
 *
 * El motor de reglas cruza estas lesiones con las contraindicaciones de cada
 * ejercicio, así que no puede ser un campo de texto libre: hay que poder
 * consultarlas. Pero la zona SÍ admite escribir a mano, porque el vocabulario
 * definitivo lo tiene que dar Giovanni y mientras tanto es preferible que el
 * entrenador escriba "manguito rotador" a que no pueda registrar la lesión.
 */
export function Lesiones({
  lesiones,
  onChange,
}: {
  lesiones: LesionInput[];
  onChange: (l: LesionInput[]) => void;
}) {
  const [zona, setZona] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS_LESION)[number]>("activa");

  function agregar() {
    const z = zona.trim();
    if (!z) return;
    onChange([...lesiones, { zona: z, descripcion: descripcion.trim() || undefined, estado }]);
    setZona("");
    setDescripcion("");
    setEstado("activa");
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Lesiones y antecedentes</h3>
        <p className="text-xs text-muted-foreground">
          El motor las usa para excluir ejercicios contraindicados.
        </p>
      </div>

      {lesiones.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {lesiones.map((l, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.zona}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ETIQUETA_ESTADO_LESION[l.estado]}
                  {l.descripcion ? ` · ${l.descripcion}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Quitar la lesión de ${l.zona}`}
                onClick={() => onChange(lesiones.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <div className="space-y-1.5">
          <Label htmlFor="lesion-zona">Zona</Label>
          <Input
            id="lesion-zona"
            list="zonas-cuerpo"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="Rodilla, hombro, zona lumbar…"
            className="min-h-11"
          />
          {/* Sugiere las zonas frecuentes sin impedir escribir otra. */}
          <datalist id="zonas-cuerpo">
            {ZONAS_CUERPO.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lesion-desc">Descripción</Label>
          <Input
            id="lesion-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
            className="min-h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lesion-estado">Estado</Label>
          <select
            id="lesion-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as (typeof ESTADOS_LESION)[number])}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            {ESTADOS_LESION.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_LESION[e]}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={agregar}
          disabled={!zona.trim()}
        >
          Añadir lesión
        </Button>
      </div>
    </div>
  );
}
