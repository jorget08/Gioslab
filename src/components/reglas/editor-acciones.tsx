"use client";

import { PATRONES, nombrePatron } from "@/domain/patrones";
import {
  ACCIONES_POR_NIVEL,
  ETIQUETA_ACCION,
  type Acciones,
  type ClaveAccion,
  type NivelMotor,
} from "@/domain/reglas";

/**
 * El editor de acciones (tarea 3.5).
 *
 * SOLO SE OFRECEN LAS ACCIONES QUE EL NIVEL EJECUTA. Es la decisión que más
 * importa de este archivo: `motor.ts` lee cada acción en una pasada concreta, así
 * que una `volumen_factor` escrita en una regla de nivel 1 no da error — no hace
 * nada. La regla se queda en la matriz pareciendo metodología viva y sin efecto,
 * que es la peor forma de estar rota. Aquí ni siquiera aparece el campo.
 *
 * Los ejercicios salen de la biblioteca y no de un campo de texto. Escribir
 * "Prensa 45" donde la biblioteca dice "Prensa 45°" es exactamente cómo se
 * consigue una regla que nunca dispara y que nadie sabe por qué no dispara.
 */

const CLASE_CAMPO =
  "min-h-11 w-full rounded-lg border bg-background px-3 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Maniobras prohibibles. Cerrado a propósito: es vocabulario, no texto libre. */
const MANIOBRAS = ["Valsalva", "Apnea prolongada", "Fallo muscular"] as const;

export function EditorAcciones({
  nivel,
  acciones,
  ejercicios,
  onCambio,
}: {
  nivel: NivelMotor;
  acciones: Acciones;
  /** Nombres exactos de la biblioteca activa. */
  ejercicios: readonly string[];
  onCambio: (a: Acciones) => void;
}) {
  const disponibles = ACCIONES_POR_NIVEL[nivel];

  /** Quita la clave del objeto en vez de dejarla vacía: `{excluir:[]}` es ruido. */
  function poner<K extends ClaveAccion>(clave: K, valor: Acciones[K] | undefined) {
    const siguiente = { ...acciones };
    const vacio =
      valor === undefined ||
      valor === "" ||
      (Array.isArray(valor) && valor.length === 0) ||
      (typeof valor === "object" && valor !== null && Object.keys(valor).length === 0);
    if (vacio) delete siguiente[clave];
    else siguiente[clave] = valor;
    onCambio(siguiente);
  }

  return (
    <div className="space-y-4">
      {disponibles.includes("excluir_ejercicios") && (
        <Multiple
          rotulo={ETIQUETA_ACCION.excluir_ejercicios}
          ayuda="Desaparecen de la prescripción. No es una preferencia."
          opciones={ejercicios}
          valor={acciones.excluir_ejercicios ?? []}
          onCambio={(v) => poner("excluir_ejercicios", v)}
        />
      )}

      {disponibles.includes("excluir_patrones") && (
        <Multiple
          rotulo={ETIQUETA_ACCION.excluir_patrones}
          ayuda="Excluye todos los ejercicios de ese patrón, incluidos los que se añadan después."
          opciones={[...PATRONES]}
          etiquetaDe={nombrePatron}
          valor={acciones.excluir_patrones ?? []}
          onCambio={(v) => poner("excluir_patrones", v)}
        />
      )}

      {disponibles.includes("sustituir_por") && (
        <Multiple
          rotulo={ETIQUETA_ACCION.sustituir_por}
          ayuda="Con qué se reemplaza lo excluido. El motor descarta los sustitutos que también estén excluidos."
          opciones={ejercicios}
          valor={acciones.sustituir_por ?? []}
          onCambio={(v) => poner("sustituir_por", v)}
        />
      )}

      {disponibles.includes("priorizar") && (
        <Multiple
          rotulo={ETIQUETA_ACCION.priorizar}
          ayuda="Se marcan como preferentes; no excluyen a los demás."
          opciones={ejercicios}
          valor={acciones.priorizar ?? []}
          onCambio={(v) => poner("priorizar", v)}
        />
      )}

      {disponibles.includes("modificador") && (
        <Campo
          rotulo={ETIQUETA_ACCION.modificador}
          ayuda="Cambia el CÓMO sin quitar el ejercicio. Si no señalas ejercicios arriba, vale para toda la sesión."
          resumen={acciones.modificador ? "escrito" : "sin poner"}
          abierto={Boolean(acciones.modificador)}
        >
          <input
            type="text"
            className={CLASE_CAMPO}
            value={acciones.modificador ?? ""}
            placeholder="Elevar talones 2.5 cm"
            onChange={(e) => poner("modificador", e.target.value)}
          />
        </Campo>
      )}

      {disponibles.includes("prohibir_maniobra") && (
        <Multiple
          rotulo={ETIQUETA_ACCION.prohibir_maniobra}
          ayuda="Se acumulan con las de otras reglas: aquí nadie compite."
          opciones={[...MANIOBRAS]}
          valor={acciones.prohibir_maniobra ?? []}
          onCambio={(v) => poner("prohibir_maniobra", v)}
        />
      )}

      {disponibles.includes("volumen_factor") && (
        <Campo
          rotulo={ETIQUETA_ACCION.volumen_factor}
          ayuda="1 lo deja igual, 0.75 lo baja un 25%. Dos reglas NO se multiplican: compiten por evidencia."
          resumen={acciones.volumen_factor === undefined ? "sin poner" : `×${acciones.volumen_factor}`}
          abierto={acciones.volumen_factor !== undefined}
        >
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0.1"
            max="2"
            className={CLASE_CAMPO}
            value={acciones.volumen_factor ?? ""}
            placeholder="0.75"
            onChange={(e) =>
              poner("volumen_factor", e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        </Campo>
      )}

      {disponibles.includes("rir") && (
        <Campo
          rotulo={ETIQUETA_ACCION.rir}
          ayuda={
            nivel === 1
              ? "En seguridad solo el suelo: impide bajar de ese RIR. Se queda siempre el más alto de todas las reglas."
              : "«Fijo» clava el RIR; «suelo» impide bajar de ahí; «ajuste» lo mueve."
          }
          resumen={acciones.rir ? "puesto" : "sin poner"}
          abierto={Boolean(acciones.rir)}
        >
          <div className="grid grid-cols-2 gap-2">
            <Numero
              rotulo="Suelo"
              valor={acciones.rir?.piso}
              onCambio={(v) => poner("rir", limpiar({ ...acciones.rir, piso: v }))}
            />
            {nivel !== 1 && (
              <>
                <Numero
                  rotulo="Fijo"
                  valor={acciones.rir?.fijo}
                  onCambio={(v) => poner("rir", limpiar({ ...acciones.rir, fijo: v }))}
                />
                <Numero
                  rotulo="Ajuste"
                  valor={acciones.rir?.delta}
                  onCambio={(v) => poner("rir", limpiar({ ...acciones.rir, delta: v }))}
                />
              </>
            )}
          </div>
        </Campo>
      )}

      {disponibles.includes("ratio_patron") && (
        <Campo
          rotulo={ETIQUETA_ACCION.ratio_patron}
          ayuda="Porcentaje de trabajo por patrón. Deja en blanco los que no repartas."
          resumen={
            acciones.ratio_patron
              ? `${Object.keys(acciones.ratio_patron).length} patrones`
              : "sin repartir"
          }
          abierto={Boolean(acciones.ratio_patron)}
        >
          <div className="space-y-2">
            {PATRONES.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{nombrePatron(p)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  className={`${CLASE_CAMPO} w-24 shrink-0`}
                  value={
                    acciones.ratio_patron?.[p] === undefined
                      ? ""
                      : Math.round(acciones.ratio_patron[p] * 100)
                  }
                  onChange={(e) => {
                    const resto = { ...acciones.ratio_patron };
                    if (e.target.value === "") delete resto[p];
                    else resto[p] = Number(e.target.value) / 100;
                    poner("ratio_patron", Object.keys(resto).length === 0 ? undefined : resto);
                  }}
                  aria-label={`Porcentaje de ${nombrePatron(p)}`}
                />
                <span className="shrink-0 text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>
        </Campo>
      )}

      {disponibles.includes("volumen_series") && (
        <Campo
          rotulo={ETIQUETA_ACCION.volumen_series}
          ayuda="Series efectivas por grupo muscular y semana."
          resumen={
            acciones.volumen_series
              ? `${acciones.volumen_series.min}–${acciones.volumen_series.max}`
              : "sin poner"
          }
          abierto={Boolean(acciones.volumen_series)}
        >
          <div className="grid grid-cols-2 gap-2">
            <Numero
              rotulo="Mínimo"
              valor={acciones.volumen_series?.min}
              onCambio={(v) =>
                poner(
                  "volumen_series",
                  v === undefined ? undefined : { min: v, max: acciones.volumen_series?.max ?? v },
                )
              }
            />
            <Numero
              rotulo="Máximo"
              valor={acciones.volumen_series?.max}
              onCambio={(v) =>
                poner(
                  "volumen_series",
                  v === undefined ? undefined : { min: acciones.volumen_series?.min ?? v, max: v },
                )
              }
            />
          </div>
        </Campo>
      )}
    </div>
  );
}

/** Quita las claves sin valor para no guardar `{piso: undefined}` como si fuera algo. */
function limpiar(r: { fijo?: number; piso?: number; delta?: number }) {
  const salida: typeof r = {};
  if (r.fijo !== undefined) salida.fijo = r.fijo;
  if (r.piso !== undefined) salida.piso = r.piso;
  if (r.delta !== undefined) salida.delta = r.delta;
  return Object.keys(salida).length === 0 ? undefined : salida;
}

/**
 * Cada acción se pliega, y solo se abre la que ya tiene valor.
 *
 * Sin esto la pantalla eran sesenta casillas casi todas vacías —cuatro listas
 * con la biblioteca entera— y había que recorrerlas para llegar a la que
 * importa. Con cien ejercicios serían cuatrocientas. El resumen cerrado dice si
 * hay algo dentro, que es lo único que hace falta saber de un vistazo.
 *
 * `<details>` nativo y no un acordeón propio: trae solo el teclado, el foco y el
 * lector de pantalla, y sobrevive a que el sistema suspenda la app (§3.3).
 */
function Campo({
  rotulo,
  ayuda,
  resumen,
  abierto,
  children,
}: {
  rotulo: string;
  ayuda: string;
  /** Qué se ve con el bloque cerrado. */
  resumen: string;
  abierto: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={abierto} className="rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3">
        <span className="rotulo min-w-0 flex-1 truncate">{rotulo}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{resumen}</span>
      </summary>
      <div className="space-y-1.5 border-t p-3">
        <p className="text-xs text-muted-foreground">{ayuda}</p>
        {children}
      </div>
    </details>
  );
}

function Numero({
  rotulo,
  valor,
  onCambio,
}: {
  rotulo: string;
  valor: number | undefined;
  onCambio: (v: number | undefined) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      {rotulo}
      <input
        type="number"
        inputMode="numeric"
        className={CLASE_CAMPO}
        value={valor ?? ""}
        onChange={(e) => onCambio(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </label>
  );
}

/**
 * Selección múltiple con casillas, no un `<select multiple>`.
 *
 * En móvil el multiselect nativo es una trampa: hay que mantener pulsado para
 * añadir y un toque normal borra toda la selección anterior. Con casillas cada
 * toque hace lo que parece, que es el mínimo exigible a §3.3.
 */
function Multiple({
  rotulo,
  ayuda,
  opciones,
  valor,
  onCambio,
  etiquetaDe,
}: {
  rotulo: string;
  ayuda: string;
  opciones: readonly string[];
  valor: readonly string[];
  onCambio: (v: string[]) => void;
  etiquetaDe?: (v: string) => string;
}) {
  return (
    <Campo
      rotulo={rotulo}
      ayuda={ayuda}
      resumen={valor.length === 0 ? "ninguno" : `${valor.length} elegido${valor.length === 1 ? "" : "s"}`}
      abierto={valor.length > 0}
    >
      {opciones.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          No hay nada que elegir todavía.
        </p>
      ) : (
        <ul className="space-y-1">
          {opciones.map((o) => {
            const puesto = valor.includes(o);
            return (
              <li key={o}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-[color:var(--gl-dorado)]"
                    checked={puesto}
                    onChange={() =>
                      onCambio(puesto ? valor.filter((x) => x !== o) : [...valor, o])
                    }
                  />
                  <span className="min-w-0">{etiquetaDe ? etiquetaDe(o) : o}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Campo>
  );
}
