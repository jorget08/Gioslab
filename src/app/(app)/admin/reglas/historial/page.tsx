"use client";

import { ArrowLeft, Check, FilePlus2, Power, PowerOff, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import {
  lineaDeTiempo,
  resumirCambios,
  type Activacion,
  type Suceso,
  type VersionRegla,
} from "@/domain/historial-reglas";
import { describirRegla } from "@/domain/reglas";
import { createClient } from "@/lib/supabase/client";

/**
 * El historial de una regla (tarea 3.6): quién cambió qué y cuándo.
 *
 * UNA SOLA LÍNEA DE TIEMPO, no dos listas. Publicar una versión y ponerla en
 * marcha son hechos distintos y separarlos obligaría a leer dos veces con el
 * reloj en la mano. El caso que lo decide es volver atrás: no crea ninguna
 * versión, solo deja un rastro de activación, y en dos listas nadie entendería
 * por qué la regla vigente es de hace tres meses.
 *
 * EL "QUÉ" SE CALCULA, no se guarda. Nadie registra qué cambió entre dos
 * versiones; se deduce comparándolas, y se compara lo LEGIBLE (`historial-
 * reglas.ts`), no el JSON. Si dos versiones se leen igual, no cambiaron para
 * nadie que las use.
 *
 * VOLVER ATRÁS ES ACTIVAR LA VERSIÓN VIEJA, no copiarla en una nueva. La versión
 * antigua ya existe y su contenido es inmutable; duplicarla llenaría la lista de
 * gemelas y haría imposible saber cuál se usó de verdad. El rastro de quién
 * volvió y cuándo lo deja `rule_activations`.
 */

function fechaLarga(iso: string): string {
  const d = new Date(iso);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}, ${hh}:${mm}`;
}

interface Historia {
  versiones: VersionRegla[];
  activaciones: Activacion[];
  error?: string;
}

/**
 * Trae todo lo que hace falta para la línea de tiempo.
 *
 * Los nombres van en una tercera consulta con los ids ya reunidos, en vez de
 * incrustarlos en las dos anteriores: sale una sola consulta para todos los
 * autores en lugar de una por fila, y no depende de cómo PostgREST decida
 * nombrar la relación cuando dos tablas apuntan a `users`.
 */
async function cargarHistorial(clave: string): Promise<Historia> {
  const supabase = createClient();
  const vacio = { versiones: [], activaciones: [] };

  const { data: filas, error } = await supabase
    .from("rules")
    .select(
      "id, rule_key, version, nivel, condition, actions, justification, evidence_level, is_active, created_at, created_by",
    )
    .eq("rule_key", clave)
    .order("version");

  if (error) return { ...vacio, error: error.message };

  const ids = (filas ?? []).map((f) => f.id as string);
  const { data: actos } = ids.length
    ? await supabase
        .from("rule_activations")
        .select("id, rule_id, action, created_at, actor_id")
        .in("rule_id", ids)
    : { data: [] };

  const personas = [
    ...new Set(
      [
        ...(filas ?? []).map((f) => f.created_by),
        ...(actos ?? []).map((a) => a.actor_id),
      ].filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: usuarios } = personas.length
    ? await supabase.from("users").select("id, full_name, email").in("id", personas)
    : { data: [] };

  const nombre = new Map(
    (usuarios ?? []).map((u) => [
      u.id as string,
      ((u.full_name as string | null) ?? (u.email as string)),
    ]),
  );

  return {
    versiones: (filas ?? []).map((f) => ({
      ...(f as unknown as VersionRegla),
      // Si hay `created_by` pero no se resuelve, la cuenta ya no existe o no es
      // visible; eso NO es lo mismo que no haberlo registrado nunca.
      autor: f.created_by
        ? (nombre.get(f.created_by as string) ?? "cuenta eliminada")
        : null,
    })),
    activaciones: (actos ?? []).map((a) => ({
      id: a.id as string,
      rule_id: a.rule_id as string,
      action: a.action as string,
      created_at: a.created_at as string,
      actor: a.actor_id ? (nombre.get(a.actor_id as string) ?? "cuenta eliminada") : null,
    })),
  };
}

function Historial() {
  const clave = useSearchParams().get("key") ?? "";

  const [versiones, setVersiones] = useState<VersionRegla[] | null>(null);
  const [activaciones, setActivaciones] = useState<Activacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState(false);

  async function cargar() {
    const r = await cargarHistorial(clave);
    if (r.error) setError(r.error);
    else {
      setVersiones(r.versiones);
      setActivaciones(r.activaciones);
    }
  }

  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    // `.then` y no `await`: dentro de un efecto, un `setState` síncrono provoca
    // renders en cascada. Con la promesa, el estado se toca en un tic posterior.
    cargarHistorial(clave).then((r) => {
      if (!vivo) return;
      if (r.error) setError(r.error);
      else {
        setVersiones(r.versiones);
        setActivaciones(r.activaciones);
      }
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  const sucesos = useMemo(
    () => (versiones ? lineaDeTiempo(versiones, activaciones) : []),
    [versiones, activaciones],
  );

  async function volverA(v: VersionRegla) {
    setOcupada(true);
    setError(null);
    const supabase = createClient();

    // Retirar antes de reponer: el índice único parcial sobre `rule_key where
    // is_active` rechaza dos versiones vivas de la misma regla.
    const { error: e1 } = await supabase
      .from("rules")
      .update({ is_active: false })
      .eq("rule_key", clave)
      .eq("is_active", true);
    if (e1) {
      setError(`No se pudo retirar la versión vigente: ${e1.message}`);
      setOcupada(false);
      return;
    }

    const { error: e2 } = await supabase.from("rules").update({ is_active: true }).eq("id", v.id);
    if (e2) setError(e2.message);

    await cargar();
    setOcupada(false);
  }

  if (!clave) {
    return <p className="text-sm text-muted-foreground">Falta indicar qué regla.</p>;
  }
  if (error && !versiones) {
    return <p className="text-sm text-[color:var(--gl-peligro)]">{error}</p>;
  }
  if (!versiones) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando el historial…</p>;
  }
  if (versiones.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No existe ninguna regla con esa clave.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/admin/reglas">Volver a las reglas</Link>
        </Button>
      </div>
    );
  }

  const vigente = versiones.find((v) => v.is_active) ?? null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <code>{clave}</code> · {versiones.length}{" "}
          {versiones.length === 1 ? "versión" : "versiones"}
        </p>
      </header>

      <div
        className={[
          "rounded-xl border p-4",
          vigente
            ? "border-[color:var(--gl-dorado)]/40 bg-[color:var(--gl-dorado-sv)]"
            : "border-dashed",
        ].join(" ")}
      >
        <p className="rotulo">{vigente ? `Vigente · v${vigente.version}` : "Ninguna versión activa"}</p>
        <p className="mt-1.5 text-sm">
          {vigente ? describirRegla(vigente) : "La regla no se está aplicando a nadie ahora mismo."}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-[color:var(--gl-peligro)]/40 p-3 text-sm">{error}</p>
      )}

      <Bloque rotulo="Qué ha pasado">
        <ol className="space-y-3">
          {sucesos.map((s, i) => (
            <Fila
              key={i}
              suceso={s}
              esVigente={s.clase === "version" && s.version.is_active}
              ocupada={ocupada}
              onVolver={s.clase === "version" ? () => void volverA(s.version) : undefined}
            />
          ))}
        </ol>
      </Bloque>

      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href="/admin/reglas">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a las reglas
        </Link>
      </Button>
    </div>
  );
}

function Fila({
  suceso: s,
  esVigente,
  ocupada,
  onVolver,
}: {
  suceso: Suceso;
  esVigente: boolean;
  ocupada: boolean;
  onVolver?: () => void;
}) {
  // `null` es "no se registró", no "se borró la cuenta". Distinguirlo importa:
  // las reglas de carga inicial no tienen autor y decir que alguien se fue del
  // sistema sería inventarse un hecho sobre una persona.
  const quien = s.quien ?? "autor no registrado";

  if (s.clase === "activacion") {
    const activada = s.accion === "activada";
    return (
      <li className="flex items-start gap-3">
        {activada ? (
          <Power className="mt-0.5 size-4 shrink-0 text-[color:var(--gl-dorado)]" aria-hidden="true" />
        ) : (
          <PowerOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm">
            {activada ? "Se activó" : "Se retiró"} la <strong>v{s.version}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            {quien} · {fechaLarga(s.cuando)}
          </p>
        </div>
      </li>
    );
  }

  const v = s.version;
  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <FilePlus2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm">
            Se publicó la <strong>v{v.version}</strong>
            {s.cambios.length > 0 && (
              <span className="text-muted-foreground"> · {resumirCambios(s.cambios)}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {quien} · {fechaLarga(s.cuando)}
          </p>
        </div>
        {esVigente && (
          <span className="shrink-0 text-xs text-[color:var(--gl-dorado)]">vigente</span>
        )}
      </div>

      <p className="text-sm">{describirRegla(v)}</p>

      {/* Lo que de verdad interesa de una versión: qué se movió respecto a la
          anterior. La v1 no trae nada porque nace, no cambia. */}
      {s.cambios.length > 0 && (
        <ul className="space-y-1.5 border-l-2 border-[color:var(--gl-dorado)]/30 pl-3">
          {s.cambios.map((c, i) => (
            <li key={i} className="text-xs">
              <span className="rotulo">{c.campo}</span>
              {c.antes !== null && (
                <span className="mt-0.5 block text-muted-foreground line-through">{c.antes}</span>
              )}
              {c.despues !== null && <span className="mt-0.5 block">{c.despues}</span>}
            </li>
          ))}
        </ul>
      )}

      {onVolver && !esVigente && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 w-full"
          disabled={ocupada}
          onClick={onVolver}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Volver a esta versión
        </Button>
      )}
      {esVigente && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3 shrink-0" aria-hidden="true" />
          Es la que se está aplicando.
        </p>
      )}
    </li>
  );
}

export default function HistorialPage() {
  return (
    <Guarda roles={["super_admin"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Historial />
      </Suspense>
    </Guarda>
  );
}
