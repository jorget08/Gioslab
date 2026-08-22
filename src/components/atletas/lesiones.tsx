"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CampoSelect } from "@/components/shared/campo-select";
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
 *
 * EL FORMULARIO VIENE PLEGADO. La mayoría de los atletas no tiene lesiones que
 * registrar, y tres campos abiertos ocupando media pantalla para algo que casi
 * siempre se deja vacío alarga el paso 1 sin motivo. Se abre solo cuando el
 * entrenador va a anotar algo.
 */
export function Lesiones({
  lesiones,
  onChange,
}: {
  lesiones: LesionInput[];
  onChange: (l: LesionInput[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
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
    // Se deja abierto: quien registra una lesión suele registrar dos.
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Lesiones y antecedentes</h3>
        <p className="text-xs text-muted-foreground">
          {lesiones.length > 0
            ? `${lesiones.length} registrada${lesiones.length === 1 ? "" : "s"}. El motor las usa para excluir ejercicios contraindicados.`
            : "Ninguna registrada. El motor las usa para excluir ejercicios contraindicados."}
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

      {/* Plegado por defecto: la mayoría de los atletas no tiene nada que
          anotar aquí, y tres campos abiertos alargan el paso sin motivo. */}
      {!abierto ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-center"
          onClick={() => setAbierto(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          {lesiones.length > 0 ? "Añadir otra lesión" : "Registrar una lesión"}
        </Button>
      ) : (
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <div className="flex items-center justify-between">
          <span className="rotulo">Nueva lesión</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Cerrar el formulario de lesión"
            onClick={() => setAbierto(false)}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Lista cerrada, no texto libre con sugerencias.
            Giovanni: "el cruce por listas cerradas es la única forma de evitar
            fallos; si dejamos texto libre, el motor pierde precisión". Antes se
            podía escribir "manguito rotador" y ninguna contraindicación de
            ejercicio iba a cruzar nunca con eso. Ahora se marca Hombro y el
            detalle va en la descripción, que es justo el campo de al lado. */}
        <CampoSelect
          id="lesion-zona"
          etiqueta="Zona"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
        >
          <option value="">Elige la zona</option>
          {ZONAS_CUERPO.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </CampoSelect>

        <div className="space-y-1.5">
          <Label htmlFor="lesion-desc">Descripción</Label>
          <Input
            id="lesion-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Manguito rotador, condromalacia…"
            className="min-h-11"
          />
        </div>

        <CampoSelect
          id="lesion-estado"
          etiqueta="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as (typeof ESTADOS_LESION)[number])}
        >
          {ESTADOS_LESION.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO_LESION[e]}
            </option>
          ))}
        </CampoSelect>

        <Button
          type="button"
          className="min-h-11 w-full"
          onClick={agregar}
          disabled={!zona.trim()}
        >
          Añadir lesión
        </Button>
      </div>
      )}
    </div>
  );
}
