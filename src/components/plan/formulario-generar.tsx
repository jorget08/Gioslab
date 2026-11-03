"use client";

import { Sparkles } from "lucide-react";

import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { diasDisponibles, objetivoDeMeta, periodizacionPara, type Metodo } from "@/domain/metodo";
import { bloquesDe, type Modelo } from "@/domain/modelos";
import { FICHA_OBJETIVO, FICHA_PERIODIZACION, type Objetivo, type Periodizacion } from "@/domain/plan";

interface AtletaFormulario {
  training_goal: string | null;
  experience_level: string | null;
}

/**
 * El modelo que le tocará al generar, con su tabla si la tiene. La misma
 * cuenta que hace el generador, para que el formulario no prometa otra cosa.
 */
export function modeloDelAtleta(
  metodo: Metodo,
  atleta: AtletaFormulario,
  objetivo: Objetivo | "",
): (Modelo & { periodizacion: Periodizacion }) | null {
  const o = objetivo || objetivoDeMeta(metodo, atleta.training_goal);
  if (!o) return null;
  const periodizacion = periodizacionPara(metodo, o, atleta.experience_level, atleta.training_goal);
  const modelo = metodo.modelos[periodizacion];
  return modelo ? { ...modelo, periodizacion } : null;
}

/**
 * Las tres decisiones antes de generar (tarea 5.4).
 *
 * Solo tres, y con dos ya rellenas: días por semana, cuántas semanas y con qué
 * objetivo. El resto —periodización, series, repeticiones, RPE, descanso,
 * cuándo cae la descarga— sale del método de Giovanni y no se pregunta. Un
 * formulario que pregunta lo que el sistema ya sabe es un sistema que no sabe
 * nada.
 *
 * El objetivo va vacío como "según su meta" y solo hay que tocarlo cuando él no
 * ha dicho cómo se programa esa meta — hoy, "Mantenimiento".
 *
 * En un modelo cuyos bloques se pueden acortar (bloques, 3-nov) las semanas no
 * se escriben: se eligen por bloque y el total sale de la suma.
 */
export function FormularioGenerar({
  metodo,
  atleta,
  hayPlan,
  dias,
  semanas,
  objetivo,
  porBloque,
  trabajando,
  onDias,
  onSemanas,
  onObjetivo,
  onPorBloque,
  onGenerar,
}: {
  metodo: Metodo;
  atleta: AtletaFormulario;
  hayPlan: boolean;
  dias: number;
  semanas: number;
  objetivo: Objetivo | "";
  porBloque: Record<string, number>;
  trabajando: boolean;
  onDias: (v: number) => void;
  onSemanas: (v: number) => void;
  onObjetivo: (v: Objetivo | "") => void;
  onPorBloque: (v: Record<string, number>) => void;
  onGenerar: () => void;
}) {
  const objetivoEfectivo = objetivo || objetivoDeMeta(metodo, atleta.training_goal);
  const periodizacion = objetivoEfectivo
    ? periodizacionPara(metodo, objetivoEfectivo, atleta.experience_level, atleta.training_goal)
    : null;
  const modelo = periodizacion ? metodo.modelos[periodizacion] : undefined;
  const descargas = (modelo?.semanas ?? []).flatMap((s, i) => (s.descarga ? [`${i + 1}ª`] : []));
  // Solo los bloques que se pueden acortar llevan selector; los demás van enteros.
  const bloques = modelo ? bloquesDe(modelo) : [];
  const elegibles = bloques.some((b) => b.minimo < b.semanas);
  const semanasDe = (b: { nombre: string; semanas: number }) => porBloque[b.nombre] ?? b.semanas;

  const elegirBloque = (nombre: string, n: number) => {
    const siguiente = { ...porBloque, [nombre]: n };
    onPorBloque(siguiente);
    onSemanas(bloques.reduce((t, b) => t + (siguiente[b.nombre] ?? b.semanas), 0));
  };

  return (
    <Bloque rotulo={hayPlan ? "Volver a generar" : "Generar la rutina"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Días por semana</span>
          <select
            value={dias}
            onChange={(e) => onDias(Number(e.target.value))}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
          >
            {/* Solo los que él repartió. Ofrecer 6 días sería ofrecer algo que
                el generador no sabe armar. */}
            {diasDisponibles(metodo).map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Semanas</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            value={semanas}
            readOnly={elegibles}
            onChange={(e) => onSemanas(Number(e.target.value))}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base tabular-nums read-only:bg-muted read-only:text-muted-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Objetivo</span>
          <select
            value={objetivo}
            onChange={(e) => onObjetivo(e.target.value as Objetivo | "")}
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
          >
            <option value="">Según su meta</option>
            {(Object.keys(FICHA_OBJETIVO) as Objetivo[]).map((o) => (
              <option key={o} value={o}>
                {FICHA_OBJETIVO[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {elegibles && (
        <div className="grid gap-3 sm:grid-cols-3">
          {bloques.map((b, i) => (
            <label key={b.nombre} className="block space-y-1">
              <span className="text-xs text-muted-foreground">
                Bloque {i + 1} · {b.nombre}
              </span>
              <select
                value={semanasDe(b)}
                disabled={b.minimo === b.semanas}
                onChange={(e) => elegirBloque(b.nombre, Number(e.target.value))}
                className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
              >
                {Array.from({ length: b.semanas - b.minimo + 1 }, (_, k) => b.minimo + k).map((n) => (
                  <option key={n} value={n}>
                    {n} semanas
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {/* Lo que va a pasar, con el modelo que le toca a ESTE atleta. Antes este
          texto hablaba siempre de la descarga del ondulante, también a un
          principiante o a un avanzado que no la llevan. */}
      {periodizacion && (
        <p className="text-xs text-muted-foreground">
          Modelo <strong>{FICHA_PERIODIZACION[periodizacion].nombre}</strong>
          {atleta.training_goal && metodo.periodizacionPorMeta[atleta.training_goal]
            ? ` por su meta (${atleta.training_goal})`
            : atleta.experience_level && metodo.periodizacionPorNivel[atleta.experience_level]
              ? ` por ser ${atleta.experience_level.toLowerCase()}`
              : ""}
          .{" "}
          {modelo
            ? elegibles
              ? `Mesociclo de ${semanas} semanas en ${bloques.length} bloques; cada bloque se puede acortar ` +
                `hasta su mínimo y se le quitan sus últimas semanas.`
              : `Su mesociclo es de ${modelo.semanas.length} semanas con la progresión de Giovanni semana a semana` +
              (descargas.length > 0 ? ` y descarga en la ${descargas.join(" y ")}.` : ".")
            : `La descarga cae en la ${metodo.descarga.cadaSemanas}ª semana y la siguiente es de ` +
              `supercompensación. Un mesociclo de ${metodo.descarga.cadaSemanas + 1} semanas trae las dos.`}
        </p>
      )}

      <Button type="button" className="min-h-11 w-full" disabled={trabajando} onClick={onGenerar}>
        <Sparkles className="size-4" aria-hidden="true" />
        {hayPlan ? "Generar de nuevo" : "Generar rutina"}
      </Button>

      {hayPlan && (
        <p className="text-xs text-muted-foreground">
          Generar de nuevo crea una rutina nueva y deja la anterior en el historial. Lo que hayas
          editado no se pierde: se queda en la de antes.
        </p>
      )}
    </Bloque>
  );
}
