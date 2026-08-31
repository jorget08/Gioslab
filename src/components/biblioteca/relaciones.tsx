"use client";

import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Ejercicio } from "@/domain/ejercicios";
import {
  conflictoDeRelacion,
  FICHA_RELACION,
  relacionesDe,
  RELACIONES,
  type Relacion,
  type TipoRelacion,
} from "@/domain/relaciones";
import { createClient } from "@/lib/supabase/client";

/**
 * Matriz de equivalencia de un ejercicio (tarea 4.3).
 *
 * SE GUARDA SOLA, como la galería de 4.2 y por la misma razón: son filas de otra
 * tabla, y colgarlas del botón «Guardar» del formulario obligaría a llevar un
 * diff entre lo que había y lo que hay para saber qué insertar y qué borrar.
 * Añadir y quitar en el acto es más simple y no puede quedar a medias.
 *
 * SE ENSEÑAN LAS RELACIONES EN LOS DOS SENTIDOS. Si desde la Sentadilla Profunda
 * se guardó que la Goblet la sustituye, al abrir la Goblet hay que ver esa misma
 * relación enunciada al revés. Sin eso, Giovanni la volvería a crear desde el
 * otro lado y acabaría con las dos direcciones guardadas, que es exactamente la
 * contradicción que el motor no puede resolver.
 */

export function RelacionesEjercicio({
  ejercicioId,
  nombre,
  biblioteca,
  iniciales,
}: {
  ejercicioId: string;
  nombre: string;
  /** Toda la biblioteca activa, para el desplegable y para resolver ids. */
  biblioteca: readonly Ejercicio[];
  iniciales: Relacion[];
}) {
  const [relaciones, setRelaciones] = useState<Relacion[]>(iniciales);
  const [destino, setDestino] = useState("");
  const [tipo, setTipo] = useState<TipoRelacion>("sustitucion");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const actuales = useRef<Relacion[]>(iniciales);

  const idPorNombre = new Map(biblioteca.map((e) => [e.name, e.id]));
  const vistas = relacionesDe(relaciones, nombre);

  // Ya relacionados: no se vuelven a ofrecer. Una pareja solo admite un tipo,
  // así que ofrecerlos otra vez solo sirve para chocar contra el error.
  const yaRelacionados = new Set(vistas.map((v) => v.otro));
  const candidatos = biblioteca
    .filter((e) => e.name !== nombre && !yaRelacionados.has(e.name))
    .map((e) => e.name);

  async function anadir() {
    if (!destino) return;
    setError(null);

    const nueva: Relacion = { ejercicio: nombre, variante: destino, tipo };
    const choque = conflictoDeRelacion(actuales.current, nueva);
    if (choque) {
      setError(choque);
      return;
    }

    const idDestino = idPorNombre.get(destino);
    if (!idDestino) {
      setError("Ese ejercicio ya no está en la biblioteca.");
      return;
    }

    setOcupado(true);
    const { error: fallo } = await createClient().from("exercise_variants").insert({
      exercise_id: ejercicioId,
      variant_exercise_id: idDestino,
      relation_type: tipo,
    });
    setOcupado(false);

    if (fallo) {
      setError(
        fallo.code === "23505"
          ? "Ya hay una relación entre esos dos ejercicios."
          : "No pudimos guardar la relación.",
      );
      return;
    }

    const siguiente = [...actuales.current, nueva];
    actuales.current = siguiente;
    setRelaciones(siguiente);
    setDestino("");
  }

  async function quitar(v: { otro: string; saliente: boolean }) {
    setError(null);
    // La fila se identifica por su dirección REAL, no por desde dónde se mira:
    // si esta relación se creó desde el otro ejercicio, el origen es aquel.
    const origen = v.saliente ? ejercicioId : idPorNombre.get(v.otro);
    const destinoId = v.saliente ? idPorNombre.get(v.otro) : ejercicioId;
    if (!origen || !destinoId) return;

    setOcupado(true);
    const { error: fallo } = await createClient()
      .from("exercise_variants")
      .delete()
      .eq("exercise_id", origen)
      .eq("variant_exercise_id", destinoId);
    setOcupado(false);

    if (fallo) {
      setError("No pudimos quitar la relación.");
      return;
    }

    const siguiente = actuales.current.filter(
      (r) =>
        !(
          (r.ejercicio === nombre && r.variante === v.otro) ||
          (r.ejercicio === v.otro && r.variante === nombre)
        ),
    );
    actuales.current = siguiente;
    setRelaciones(siguiente);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Es lo que el motor ofrece cuando este ejercicio queda descartado. Sin relaciones,
        una lesión lo quita y el entrenador se queda sin alternativa.
      </p>

      {vistas.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {vistas.map((v) => (
            <li key={`${v.otro}-${v.tipo}`} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="rotulo flex items-center gap-1 text-[0.65rem]">
                  {v.saliente ? FICHA_RELACION[v.tipo].desde : FICHA_RELACION[v.tipo].hacia}
                  <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
                </span>
                <span className="block truncate text-sm">{v.otro}</span>
              </span>
              <button
                type="button"
                onClick={() => quitar(v)}
                disabled={ocupado}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-muted disabled:opacity-40"
                aria-label={`Quitar la relación con ${v.otro}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <div className="space-y-1.5">
          <Label htmlFor="relacion-tipo">Relación</Label>
          <select
            id="relacion-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRelacion)}
            className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {RELACIONES.map((r) => (
              <option key={r} value={r}>
                {FICHA_RELACION[r].nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{FICHA_RELACION[tipo].ayuda}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="relacion-destino">Ejercicio</Label>
          <select
            id="relacion-destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Elige uno…</option>
            {candidatos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={anadir}
          disabled={!destino || ocupado}
        >
          <Plus className="size-4" aria-hidden="true" />
          Añadir relación
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
