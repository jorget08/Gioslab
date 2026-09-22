"use client";

import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CambiosDelDia } from "@/domain/ediciones";
import type { DiaPlan, EjercicioPlan } from "@/domain/plan";
import { FICHA_CIERRE } from "@/domain/plan";

/**
 * Un día del plan, editable (tarea 5.4).
 *
 * §3.6, literal: «el entrenador siempre decide y puede sobreescribir». Así que
 * aquí se puede cambiar el ejercicio, quitarlo, añadir otro, moverlo de sitio y
 * tocar series, repeticiones, RPE y descanso.
 *
 * DOS DECISIONES DE INTERFAZ QUE VIENEN DE §3.3 (esto se usa de pie, en el
 * gimnasio, con una mano):
 *
 * 1. CADA EJERCICIO SE LEE DE UN VISTAZO Y SE EDITA AL TOCAR. Seis campos
 *    numéricos por ejercicio y seis ejercicios por día son treinta y seis cajas
 *    en una pantalla de 360 px. Plegado, es una línea por ejercicio.
 *
 * 2. LO QUE CAMBIÓ EL ENTRENADOR SE MARCA. No es decoración: es lo que permite
 *    defender el plan delante del atleta y, más adelante, aprender de sus
 *    correcciones.
 */

export interface OpcionEjercicio {
  nombre: string;
  /** Para agrupar el desplegable por patrón y que no sea una lista de 47. */
  patron: string | null;
  /** Nombre del patrón para mostrar. */
  etiquetaPatron: string;
}

interface Props {
  dia: DiaPlan;
  cambios: CambiosDelDia;
  opciones: OpcionEjercicio[];
  /** Posición del día en la semana, para poder moverlo. */
  primerDia: boolean;
  ultimoDia: boolean;
  onMoverDia: (salto: -1 | 1) => void;
  onNumero: (indice: number, campo: keyof EjercicioPlan, valor: number) => void;
  onCambiar: (indice: number, nombre: string) => void;
  onQuitar: (indice: number) => void;
  onMover: (indice: number, salto: -1 | 1) => void;
  onAnadir: (nombre: string) => void;
}

const segundos = (s: number) => (s >= 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s} s`);

export function DiaEditable({
  dia,
  cambios,
  opciones,
  primerDia,
  ultimoDia,
  onMoverDia,
  onNumero,
  onCambiar,
  onQuitar,
  onMover,
  onAnadir,
}: Props) {
  const [anadiendo, setAnadiendo] = useState(false);
  const yaEstan = new Set(dia.central.ejercicios.map((e) => e.ejercicio));

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-semibold tracking-tight">
            Día {dia.dia} · {dia.titulo}
          </h3>
          <p className="text-xs text-muted-foreground">
            {dia.preparacion.minutos} min de preparación · {dia.central.ejercicios.length}{" "}
            {dia.central.ejercicios.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
            {FICHA_CIERRE[dia.final.cierre].nombre}, {dia.final.minutos} min
          </p>
        </div>

        {/* Mover el día entero: el reparto de Giovanni dice qué se entrena cada
            día, no en qué orden le cuadra la semana a este atleta. */}
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" aria-label={`Subir el día ${dia.titulo}`}
            className="size-11" disabled={primerDia} onClick={() => onMoverDia(-1)}>
            <ChevronUp className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" aria-label={`Bajar el día ${dia.titulo}`}
            className="size-11" disabled={ultimoDia} onClick={() => onMoverDia(1)}>
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Lo que vale para la sesión entera: modificadores generales del motor,
          maniobras prohibidas y qué es esta semana. */}
      {dia.notas && dia.notas.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-dashed p-3">
          {dia.notas.map((n) => (
            <li key={n} className="text-xs text-muted-foreground">
              {n}
            </li>
          ))}
        </ul>
      )}

      <ul className="divide-y">
        {dia.central.ejercicios.map((e, i) => (
          <FilaEjercicio
            key={`${e.ejercicio}-${i}`}
            ejercicio={e}
            esNuevo={cambios.anadidos.includes(e.ejercicio)}
            cambiado={cambios.porEjercicio[e.ejercicio] ?? []}
            opciones={opciones.filter((o) => !yaEstan.has(o.nombre) || o.nombre === e.ejercicio)}
            primero={i === 0}
            ultimo={i === dia.central.ejercicios.length - 1}
            onNumero={(campo, valor) => onNumero(i, campo, valor)}
            onCambiar={(nombre) => onCambiar(i, nombre)}
            onQuitar={() => onQuitar(i)}
            onMover={(salto) => onMover(i, salto)}
          />
        ))}
      </ul>

      {cambios.quitados.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Quitaste de este día: <strong>{cambios.quitados.join(", ")}</strong>.
        </p>
      )}

      {anadiendo ? (
        <select
          autoFocus
          className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
          defaultValue=""
          onChange={(ev) => {
            if (ev.target.value) onAnadir(ev.target.value);
            setAnadiendo(false);
          }}
        >
          <option value="" disabled>
            Elige un ejercicio…
          </option>
          {opciones
            .filter((o) => !yaEstan.has(o.nombre))
            .map((o) => (
              <option key={o.nombre} value={o.nombre}>
                {o.nombre} · {o.etiquetaPatron}
              </option>
            ))}
        </select>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={() => setAnadiendo(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Añadir ejercicio
        </Button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function FilaEjercicio({
  ejercicio: e,
  esNuevo,
  cambiado,
  opciones,
  primero,
  ultimo,
  onNumero,
  onCambiar,
  onQuitar,
  onMover,
}: {
  ejercicio: EjercicioPlan;
  esNuevo: boolean;
  cambiado: { campo: string; antes: string; ahora: string }[];
  opciones: OpcionEjercicio[];
  primero: boolean;
  ultimo: boolean;
  onNumero: (campo: keyof EjercicioPlan, valor: number) => void;
  onCambiar: (nombre: string) => void;
  onQuitar: () => void;
  onMover: (salto: -1 | 1) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const tocado = esNuevo || cambiado.length > 0;

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">
            {e.ejercicio}
            {tocado && (
              <span className="ml-2 rounded-full border border-[color:var(--gl-dorado)]/50 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                {esNuevo ? "lo añadiste tú" : "lo cambiaste tú"}
              </span>
            )}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {e.seriesEfectivas} × {e.repMin}–{e.repMax}
            {e.rpePrimeras !== undefined && ` · RPE ${e.rpePrimeras}/${e.rpeUltima}`}
            {" · "}
            {segundos(e.descansoSeg)}
            {e.seriesCalentamiento > 0 && ` · ${e.seriesCalentamiento} de calentamiento`}
          </p>
          {e.notas && <p className="text-xs text-muted-foreground">{e.notas}</p>}
          {e.sustitutos.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Si está ocupada: <strong>{e.sustitutos.join(" o ")}</strong>
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          aria-label={abierto ? `Cerrar ${e.ejercicio}` : `Editar ${e.ejercicio}`}
          aria-expanded={abierto}
          className="size-11 shrink-0"
          onClick={() => setAbierto((v) => !v)}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {cambiado.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {cambiado.map((c) => `${c.campo}: ${c.antes} → ${c.ahora}`).join(" · ")}
        </p>
      )}

      {abierto && (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Ejercicio</span>
            <select
              value={e.ejercicio}
              onChange={(ev) => onCambiar(ev.target.value)}
              className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"
            >
              {/* Los sustitutos primero: son los que el motor ya aprobó para
                  este atleta, y son la respuesta a "la máquina está ocupada". */}
              {e.sustitutos.length > 0 && (
                <optgroup label="Alternativas aprobadas">
                  {e.sustitutos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Todos los que el motor permite">
                {opciones.map((o) => (
                  <option key={o.nombre} value={o.nombre}>
                    {o.nombre} · {o.etiquetaPatron}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Numero etiqueta="Series" valor={e.seriesEfectivas} min={1} max={20}
              onCambio={(v) => onNumero("seriesEfectivas", v)} />
            <Numero etiqueta="Calentamiento" valor={e.seriesCalentamiento} min={0} max={10}
              onCambio={(v) => onNumero("seriesCalentamiento", v)} />
            <Numero etiqueta="Reps mín." valor={e.repMin} min={1} max={100}
              onCambio={(v) => onNumero("repMin", v)} />
            <Numero etiqueta="Reps máx." valor={e.repMax} min={1} max={100}
              onCambio={(v) => onNumero("repMax", v)} />
            <Numero etiqueta="RPE primeras" valor={e.rpePrimeras ?? 0} min={1} max={10} paso={0.5}
              onCambio={(v) => onNumero("rpePrimeras", v)} />
            <Numero etiqueta="RPE última" valor={e.rpeUltima ?? 0} min={1} max={10} paso={0.5}
              onCambio={(v) => onNumero("rpeUltima", v)} />
            <Numero etiqueta="Descanso (s)" valor={e.descansoSeg} min={10} max={600} paso={15}
              onCambio={(v) => onNumero("descansoSeg", v)} />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" aria-label="Subir ejercicio"
              className="min-h-11 flex-1" disabled={primero} onClick={() => onMover(-1)}>
              <ChevronUp className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" aria-label="Bajar ejercicio"
              className="min-h-11 flex-1" disabled={ultimo} onClick={() => onMover(1)}>
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onQuitar}>
              <Trash2 className="size-4" aria-hidden="true" />
              Quitar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function Numero({
  etiqueta,
  valor,
  min,
  max,
  paso = 1,
  onCambio,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambio: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <input
        type="number"
        // Teclado numérico en el gimnasio (§3.3). `decimal` y no `numeric`
        // porque el RPE va de medio en medio.
        inputMode={paso < 1 ? "decimal" : "numeric"}
        value={valor}
        min={min}
        max={max}
        step={paso}
        onChange={(ev) => {
          const v = Number(ev.target.value);
          if (Number.isFinite(v)) onCambio(v);
        }}
        className="min-h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base tabular-nums"
      />
    </label>
  );
}
