"use client";

import { AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { ETIQUETA_EVIDENCIA, esNivelEvidencia } from "@/domain/evidencia";
import {
  ETIQUETA_NIVEL,
  NIVELES_MOTOR,
  describirRegla,
  validarRegla,
  type NivelMotor,
  type Regla,
} from "@/domain/reglas";
import { createClient } from "@/lib/supabase/client";

/**
 * La matriz, vista desde dentro (tarea 3.5).
 *
 * La matriz de condicionales es el activo central del negocio (§3.1) y Giovanni
 * tiene que poder tocarla sin pedirme un despliegue. Esto es la puerta.
 *
 * SE LISTA POR NIVEL, no por fecha ni alfabéticamente, porque el nivel es el
 * orden en que el motor las ejecuta: verlas agrupadas así es ver el tubo por el
 * que pasa cada atleta. Una regla suelta no dice nada; su sitio en la secuencia,
 * sí.
 *
 * Cada una se lee en español, no en JSON. Es la misma frase que el entrenador ve
 * en la ficha del atleta cuando pregunta por qué desapareció un ejercicio, así
 * que Giovanni edita mirando exactamente lo que su cliente va a leer.
 */

/** Una sola definición de la consulta: la usan el primer pintado y cada recarga. */
function consultarReglas() {
  return createClient()
    .from("rules")
    .select(
      "id, rule_key, version, nivel, condition, actions, justification, evidence_level, is_active, created_at",
    )
    .order("nivel")
    .order("rule_key")
    .order("version", { ascending: false });
}

interface FilaRegla extends Regla {
  id: string;
  is_active: boolean;
  created_at: string;
}

function Listado() {
  const [reglas, setReglas] = useState<FilaRegla[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  async function cargar() {
    const { data, error: e } = await consultarReglas();
    if (e) {
      setError(e.message);
      return;
    }
    setReglas((data ?? []) as unknown as FilaRegla[]);
  }

  useEffect(() => {
    let vivo = true;
    consultarReglas().then(({ data, error: e }) => {
      if (!vivo) return;
      if (e) setError(e.message);
      else setReglas((data ?? []) as unknown as FilaRegla[]);
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function alternar(r: FilaRegla) {
    setOcupada(r.id);
    setError(null);
    const supabase = createClient();

    // ACTIVAR primero exige DESACTIVAR la versión que esté activa: hay un índice
    // único parcial sobre `rule_key where is_active`, así que la base rechaza
    // dos versiones vivas de la misma regla. Se hace en este orden a propósito;
    // al revés, el índice aborta la primera sentencia y la regla se queda como
    // estaba, que es el estado seguro pero deja al usuario sin entender nada.
    if (!r.is_active) {
      const viva = (reglas ?? []).find((x) => x.rule_key === r.rule_key && x.is_active);
      if (viva) {
        const { error: e } = await supabase
          .from("rules")
          .update({ is_active: false })
          .eq("id", viva.id);
        if (e) {
          setError(`No se pudo desactivar la versión ${viva.version}: ${e.message}`);
          setOcupada(null);
          return;
        }
      }
    }

    const { error: e } = await supabase
      .from("rules")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);

    if (e) setError(e.message);
    await cargar();
    setOcupada(null);
  }

  if (error && !reglas) {
    return <p className="text-sm text-[color:var(--gl-peligro)]">{error}</p>;
  }
  if (!reglas) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando la matriz…</p>;
  }

  const activas = reglas.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reglas</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {activas} {activas === 1 ? "activa" : "activas"} de {reglas.length}{" "}
          {reglas.length === 1 ? "versión" : "versiones"}
        </p>
      </header>

      <Button asChild className="min-h-11 w-full">
        <Link href="/admin/reglas/regla">
          <Plus className="size-4" aria-hidden="true" />
          Nueva regla
        </Link>
      </Button>

      {error && (
        <p className="rounded-lg border border-[color:var(--gl-peligro)]/40 p-3 text-sm">{error}</p>
      )}

      {reglas.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay ninguna regla. La primera que crees ya se aplica a los atletas.
        </div>
      )}

      {NIVELES_MOTOR.map((n) => {
        const delNivel = reglas.filter((r) => r.nivel === n);
        if (delNivel.length === 0) return null;
        return (
          <Bloque key={n} rotulo={`Nivel ${n} · ${ETIQUETA_NIVEL[n as NivelMotor]}`}>
            <ul className="space-y-3">
              {delNivel.map((r) => (
                <Fila
                  key={r.id}
                  regla={r}
                  ocupada={ocupada === r.id}
                  onAlternar={() => void alternar(r)}
                />
              ))}
            </ul>
          </Bloque>
        );
      })}
    </div>
  );
}

function Fila({
  regla,
  ocupada,
  onAlternar,
}: {
  regla: FilaRegla;
  ocupada: boolean;
  onAlternar: () => void;
}) {
  // Una regla guardada puede haber dejado de ser válida: la gramática crece y el
  // catálogo de hechos cambia. Si no se dijera, seguiría en la lista pareciendo
  // metodología viva mientras el motor la ignora.
  const errores = validarRegla(regla);

  return (
    <li
      className={[
        "space-y-2 rounded-lg border p-3",
        regla.is_active ? "border-[color:var(--gl-dorado)]/40" : "opacity-70",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <code className="text-xs text-muted-foreground">{regla.rule_key}</code>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">v{regla.version}</span>
      </div>

      <p className="text-sm">{describirRegla(regla)}</p>

      <p className="text-xs text-muted-foreground">{regla.justification}</p>

      {errores.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-[color:var(--gl-alerta)]">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          El motor no la entiende: {errores[0]}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="rotulo">
          {esNivelEvidencia(regla.evidence_level)
            ? ETIQUETA_EVIDENCIA[regla.evidence_level]
            : regla.evidence_level}
        </span>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm" className="min-h-11">
            {/* Editar es publicar una versión nueva, no pisar esta: la base solo
                deja cambiar `is_active`, y con razón — un plan de marzo apunta a
                la regla que lo justificó. */}
            <Link href={`/admin/reglas/regla?key=${encodeURIComponent(regla.rule_key)}&desde=${regla.id}`}>
              Nueva versión
            </Link>
          </Button>
          <Button
            type="button"
            variant={regla.is_active ? "secondary" : "default"}
            size="sm"
            className="min-h-11"
            disabled={ocupada}
            onClick={onAlternar}
          >
            {ocupada ? "…" : regla.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function ReglasPage() {
  return (
    <Guarda roles={["super_admin"]}>
      <Listado />
    </Guarda>
  );
}
