"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import {
  CONDICIONES_SISTEMICAS,
  esCondicionSistemica,
  REGLA_SISTEMICA,
  type CondicionSistemica,
} from "@/domain/contraindicaciones";
import { createClient } from "@/lib/supabase/client";

/**
 * Condiciones fisiológicas del atleta.
 *
 * Es la otra mitad del cruce de contraindicaciones. Un ejercicio ya podía
 * marcarse como contraindicado para embarazo; esto es donde se registra que una
 * atleta lo está.
 *
 * PANTALLA APARTE Y NO PARTE DEL ALTA, a propósito: el embarazo empieza después
 * de crear al atleta, y la diástasis se resuelve meses más tarde. Capturarlas
 * solo al principio garantizaría que estén desactualizadas justo cuando
 * importan.
 *
 * La regla de cada condición se enseña al lado de la casilla. Quien marca
 * "hipertensión" tiene que ver que eso NO va a quitar la sentadilla, va a
 * cambiar cómo se ejecuta: es la diferencia entre las dos familias y sin
 * explicarla la casilla parece un simple filtro más.
 */

interface Atleta {
  id: string;
  tenant_id: string;
  full_name: string;
}

interface Fila {
  condition: string;
  is_active: boolean;
}

function Condiciones() {
  const params = useSearchParams();
  const router = useRouter();
  const atletaId = params.get("id") ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [marcadas, setMarcadas] = useState<Set<CondicionSistemica>>(new Set());
  const [originales, setOriginales] = useState<Map<string, boolean>>(new Map());
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("athletes").select("id, tenant_id, full_name").eq("id", atletaId).single(),
      supabase.from("athlete_conditions").select("condition, is_active").eq("athlete_id", atletaId),
    ]).then(([a, c]) => {
      if (!vivo) return;
      setAtleta(a.data as Atleta | null);

      const filas = (c.data ?? []) as Fila[];
      setOriginales(new Map(filas.map((f) => [f.condition, f.is_active])));
      setMarcadas(
        new Set(
          filas
            .filter((f) => f.is_active && esCondicionSistemica(f.condition))
            .map((f) => f.condition as CondicionSistemica),
        ),
      );
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  function alternar(c: CondicionSistemica) {
    setMarcadas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(c)) siguiente.delete(c);
      else siguiente.add(c);
      return siguiente;
    });
  }

  async function guardar() {
    if (!atleta) return;
    setGuardando(true);
    setError(null);

    const supabase = createClient();

    // Insertar las nuevas y actualizar las que ya existían. No se borra nada:
    // una condición que dejó de aplicar es historial, no basura (§3.5). Por eso
    // hay UNIQUE (athlete_id, condition) y aquí solo se alterna `is_active`.
    const nuevas = [...marcadas].filter((c) => !originales.has(c));
    const cambios = [...originales.keys()].filter((c) => {
      const activa = marcadas.has(c as CondicionSistemica);
      return originales.get(c) !== activa;
    });

    const errores: string[] = [];

    if (nuevas.length > 0) {
      const { error: e } = await supabase.from("athlete_conditions").insert(
        nuevas.map((condition) => ({
          athlete_id: atleta.id,
          tenant_id: atleta.tenant_id,
          condition,
        })),
      );
      if (e) errores.push(e.message);
    }

    for (const condition of cambios) {
      const { error: e } = await supabase
        .from("athlete_conditions")
        .update({ is_active: marcadas.has(condition as CondicionSistemica) })
        .eq("athlete_id", atleta.id)
        .eq("condition", condition);
      if (e) errores.push(e.message);
    }

    if (errores.length > 0) {
      setError("No pudimos guardar los cambios. Inténtalo de nuevo.");
      setGuardando(false);
      return;
    }

    router.replace(`/atletas/ficha?id=${atleta.id}`);
  }

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!atleta) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No encontramos ese atleta.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/atletas">Volver a la lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{atleta.full_name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Condiciones fisiológicas</p>
      </header>

      <Bloque rotulo="Qué aplica hoy">
        <p className="text-xs text-muted-foreground">
          Marca solo lo que aplique en este momento. Estas condiciones no siempre quitan un
          ejercicio: a veces lo dejan y cambian cómo se ejecuta.
        </p>

        <div className="grid gap-2">
          {CONDICIONES_SISTEMICAS.map((c) => {
            const activa = marcadas.has(c);
            return (
              <label
                key={c}
                className={[
                  "flex min-h-11 cursor-pointer select-none items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
                  "focus-within:ring-2 focus-within:ring-ring/50",
                  activa
                    ? "seleccionado"
                    : "border-input hover:bg-muted",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activa}
                  onChange={() => alternar(c)}
                />
                <span className="min-w-0">
                  <span className="block">{c}</span>
                  <span
                    className={[
                      "mt-0.5 block text-xs font-normal",
                      // Sobre el fondo dorado suave el blanco desaparecería en el tema
                      // claro. El propio dorado, algo apagado, se lee en los dos.
                      activa ? "text-[color:var(--gl-dorado)]/85" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {REGLA_SISTEMICA[c]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Bloque>

      <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Son datos de salud. Se guardan bajo el mismo consentimiento que la evaluación y solo
          los ve quien entrena a este atleta.
        </span>
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/atletas/ficha?id=${atleta.id}`}>Cancelar</Link>
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-[2]"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export default function CondicionesPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Condiciones />
      </Suspense>
    </Guarda>
  );
}
