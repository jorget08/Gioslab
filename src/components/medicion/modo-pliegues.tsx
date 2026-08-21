"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useState } from "react";

import { CampoMedidaInput } from "@/components/medicion/campo-medida";
import { Button } from "@/components/ui/button";
import { CAMPOS, PLIEGUES, validarRango, type CampoMedida } from "@/domain/medidas";

/**
 * Medición de los siete pliegues, UNA PANTALLA POR PLIEGUE.
 *
 * En una lista serían siete casillas pequeñas que hay que ir buscando con el
 * pulgar mientras se sostiene el plicómetro con la otra mano. Aquí solo hay un
 * número enorme, el teclado ya abierto y el sitio donde se toma escrito debajo
 * (docs/WIZARD-UX.md §5.2).
 *
 * No avanza solo al teclear: un pliegue puede ser "8" o "8.5", y saltar al
 * escribir el 8 obligaría a volver atrás. Avanza al tocar, o con Enter.
 */
export function ModoPliegues({
  valores,
  onChange,
  anteriores,
  fechaAnterior,
  onCerrar,
}: {
  valores: Partial<Record<CampoMedida, string>>;
  onChange: (campo: CampoMedida, v: string) => void;
  anteriores?: Partial<Record<CampoMedida, number | null>>;
  fechaAnterior?: string | null;
  onCerrar: () => void;
}) {
  const [i, setI] = useState(0);
  const campo = PLIEGUES[i];
  const meta = CAMPOS[campo];
  const valor = valores[campo] ?? "";

  const num = valor.trim() === "" ? null : Number(valor.replace(",", "."));
  const bloqueado = validarRango(campo, Number.isFinite(num) ? num : null)?.nivel === "bloquea";
  const esUltimo = i === PLIEGUES.length - 1;

  function avanzar() {
    if (bloqueado) return;
    if (esUltimo) onCerrar();
    else setI(i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex flex-1 items-center gap-1.5">
          {PLIEGUES.map((p, j) => (
            <span
              key={p}
              className={[
                "h-1 rounded-full transition-all",
                j === i ? "w-6" : "w-3",
                valores[p]?.trim() ? "bg-primary" : j < i ? "bg-muted-foreground/40" : "bg-border",
              ].join(" ")}
            />
          ))}
        </div>
        <span className="rotulo">
          {i + 1} / {PLIEGUES.length}
        </span>
        <Button
          type="button" variant="ghost" size="icon" className="size-11"
          onClick={onCerrar} aria-label="Salir de la medición"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-xs space-y-5">
          <div className="text-center">
            <span className="rotulo">Pliegue</span>
            <h2 className="text-2xl font-semibold tracking-tight">{meta.etiqueta}</h2>
            {meta.sitio && (
              <p className="mt-0.5 text-sm text-muted-foreground">{meta.sitio}</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              avanzar();
            }}
          >
            <CampoMedidaInput
              campo={campo}
              valor={valor}
              onChange={(v) => onChange(campo, v)}
              anterior={anteriores?.[campo]}
              fechaAnterior={fechaAnterior}
              autoFocus
              grande
            />
          </form>
        </div>
      </div>

      <footer
        className="flex gap-2 border-t px-4 py-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          type="button" variant="outline" className="min-h-12 flex-1"
          onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Atrás
        </Button>
        <Button
          type="button" className="min-h-12 flex-[2]"
          onClick={avanzar} disabled={bloqueado}
        >
          {esUltimo ? "Terminar" : "Siguiente"}
          {!esUltimo && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </footer>
    </div>
  );
}
