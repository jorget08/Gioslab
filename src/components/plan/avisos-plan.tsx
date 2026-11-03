import { AlertTriangle } from "lucide-react";

import { FICHA_PERIODIZACION, type Periodizacion } from "@/domain/plan";

/**
 * Lo que la pantalla del plan tiene que decir antes del plan. Aparte de la
 * página porque ella sola pasaba de 500 líneas.
 */

/**
 * El plan guardado ya no es el que saldría hoy. Dos causas con dos mensajes:
 * le toca OTRO MODELO (cambió su nivel o su meta, o el método reasignó el
 * modelo), o el método y las reglas cambiaron después de generarlo.
 */
export function AvisoPlanViejo({
  modeloPlan,
  modeloHoy,
  desactualizado,
}: {
  /** El modelo del plan guardado, solo si NO es el que le toca hoy. */
  modeloPlan: Periodizacion | null;
  modeloHoy: Periodizacion | null;
  desactualizado: boolean;
}) {
  const caja =
    "rounded-xl border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-4 text-sm";
  if (modeloPlan && modeloHoy) {
    return (
      <p className={caja}>
        Esta es la rutina guardada, en <strong>{FICHA_PERIODIZACION[modeloPlan].nombre}</strong>.
        Con su nivel y su meta de hoy le toca <strong>{FICHA_PERIODIZACION[modeloHoy].nombre}</strong>:
        dale a <strong>Generar de nuevo</strong> para pasarla a ese modelo.
      </p>
    );
  }
  if (desactualizado) {
    return (
      <p className={caja}>
        Este plan se generó antes de la última actualización del método o de las reglas de
        Giovanni, así que no las tiene. Dale a <strong>Generar de nuevo</strong> para aplicarlas.
      </p>
    );
  }
  return null;
}

/**
 * Errores y avisos del generador. Los avisos van ANTES del plan: si no se
 * llega a sus series semanales, eso se lee antes de firmar nada, no después.
 */
export function AvisosGenerador({ errores, avisos }: { errores: string[]; avisos: string[] }) {
  return (
    <>
      {errores.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[color:var(--gl-peligro)]/40 p-4">
          <p className="text-sm font-medium">No se pudo generar</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle
              className="size-4 shrink-0 text-[color:var(--gl-alerta)]"
              aria-hidden="true"
            />
            Lo que no cuadra con su método
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
