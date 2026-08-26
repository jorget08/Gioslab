"use client";

import { AlertTriangle, Ban, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import type { Ejercicio } from "@/domain/ejercicios";
import { resolverHechos } from "@/domain/hechos-atleta";
import {
  evaluar,
  excluidos as descartados,
  hechosQueFaltan,
  incluidos as disponibles,
  type Resultado,
} from "@/domain/motor";
import { FICHA_PATRON, esPatron } from "@/domain/patrones";
import { ETIQUETA_NIVEL, HECHOS, validarRegla, type Regla } from "@/domain/reglas";
import { createClient } from "@/lib/supabase/client";

/**
 * Salida del motor (tarea 3.7).
 *
 * "Cuando el motor selecciona o excluye un ejercicio, la interfaz muestra qué
 * regla aplicó y por qué. El sistema es un copiloto: el entrenador siempre
 * decide" (CLAUDE.md §3.6).
 *
 * DOS DECISIONES QUE LA DEFINEN:
 *
 * 1. LO DESCARTADO VA PRIMERO Y CON SU MOTIVO. Es contraintuitivo —lo útil
 *    parece la lista de lo que sí se puede— pero es la mitad que genera
 *    confianza profesional. Un entrenador no adopta una herramienta que le quita
 *    la sentadilla sin decirle por qué; la discute, y para discutirla necesita
 *    leer el argumento.
 *
 * 2. LO QUE FALTA SE ANUNCIA ARRIBA. Si el motor no pudo evaluar una regla por
 *    falta de datos, esto NO es una prescripción terminada. Enseñarla igual, en
 *    silencio, la haría parecer segura cuando solo está desinformada.
 *
 * Aquí no se genera ninguna rutina: eso es el grupo de Fase B. Esto es el
 * análisis, que es lo que el entrenador usa para decidir.
 */

interface Atleta {
  id: string;
  full_name: string;
  sex: string;
}

function Prescripcion() {
  const atletaId = useSearchParams().get("id") ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [patronDe, setPatronDe] = useState<Record<string, string | null>>({});
  const [ilegibles, setIlegibles] = useState<string[]>([]);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("athletes").select("id, full_name, sex").eq("id", atletaId).single(),
      supabase.from("biomech_evaluations").select("*").eq("athlete_id", atletaId)
        .is("voided_at", null).order("evaluated_at", { ascending: false }).limit(1),
      supabase.from("anthropometric_measurements").select("body_fat_pct").eq("athlete_id", atletaId)
        .is("voided_at", null).order("measured_at", { ascending: false }).limit(1),
      supabase.from("menstrual_cycle_logs")
        .select("last_period_start, cycle_length_days, uses_hormonal_contraception")
        .eq("athlete_id", atletaId).is("voided_at", null)
        .order("last_period_start", { ascending: false }).limit(1),
      supabase.from("athlete_injuries").select("body_region, status").eq("athlete_id", atletaId),
      supabase.from("athlete_conditions").select("condition").eq("athlete_id", atletaId).eq("is_active", true),
      supabase.from("rules")
        .select("rule_key, version, nivel, condition, actions, justification, evidence_level")
        .eq("is_active", true),
      supabase.from("exercise_library")
        .select("id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, is_active")
        .eq("is_active", true),
    ]).then(([a, bio, med, cic, les, con, reg, ejs]) => {
      if (!vivo) return;
      setAtleta(a.data as Atleta | null);

      const ejercicios = (ejs.data ?? []) as Ejercicio[];
      setPatronDe(Object.fromEntries(ejercicios.map((e) => [e.name, e.movement_pattern])));

      const hechos = resolverHechos({
        atleta: a.data ?? undefined,
        biomecanica: bio.data?.[0],
        medicion: med.data?.[0],
        ciclo: cic.data?.[0],
        // Una lesión recuperada ya no restringe: seguir excluyendo por ella
        // dejaría al atleta con media biblioteca vetada para siempre.
        lesiones: (les.data ?? [])
          .filter((l) => l.status !== "recuperada")
          .map((l) => l.body_region),
        condiciones: (con.data ?? []).map((c) => c.condition),
      });

      // La fila de la base es JSON sin tipar. El CHECK de la migración garantiza
      // la FORMA (`condition.todas` es un array, `actions` no está vacío) pero no
      // la GRAMÁTICA: nada impide guardar un hecho que el motor no conoce. Así
      // que se valida aquí, y lo que no pasa se cuenta en pantalla en vez de
      // desaparecer: una regla que el motor ignora en silencio es peor que una
      // regla que falta, porque Giovanni la ve en la matriz y la cree viva.
      const crudas = (reg.data ?? []) as unknown as Regla[];
      const rotas: string[] = [];
      const reglas = crudas.filter((r) => {
        const errores = validarRegla(r);
        if (errores.length > 0) rotas.push(`${r.rule_key}: ${errores[0]}`);
        return errores.length === 0;
      });
      setIlegibles(rotas);

      setResultado(evaluar({ hechos, reglas, ejercicios }));
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  const faltan = useMemo(() => (resultado ? hechosQueFaltan(resultado) : []), [resultado]);

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Analizando…</p>;
  }

  if (!atleta || !resultado) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No encontramos ese atleta.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/atletas">Volver a la lista</Link>
        </Button>
      </div>
    );
  }

  const quedan = disponibles(resultado);
  const fuera = descartados(resultado);
  const hayCarga =
    resultado.volumenFactor !== 1 ||
    resultado.volumenSeries !== null ||
    resultado.rir.piso !== undefined ||
    resultado.rir.delta !== undefined ||
    resultado.rir.fijo !== undefined ||
    resultado.maniobrasProhibidas.length > 0;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{atleta.full_name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Qué dice el motor · {resultado.aplicadas.length}{" "}
          {resultado.aplicadas.length === 1 ? "regla aplicada" : "reglas aplicadas"}
        </p>
      </header>

      {/* Arriba del todo y en ámbar: si falta un dato, esto NO es una
          prescripción terminada, y quien la lea tiene que saberlo antes de
          leer nada más. */}
      {!resultado.completo && (
        <div className="space-y-3 rounded-xl border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-4">
          <p className="flex items-start gap-2 text-sm font-medium">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-[color:var(--gl-alerta)]"
              aria-hidden="true"
            />
            Evaluación incompleta
          </p>
          <p className="text-xs text-muted-foreground">
            Hay {resultado.sinEvaluar.length}{" "}
            {resultado.sinEvaluar.length === 1 ? "regla que no se pudo" : "reglas que no se pudieron"}{" "}
            comprobar. El motor no da por buena una medición que no existe, así que estos
            ejercicios pueden cambiar cuando se complete.
          </p>
          <ul className="space-y-1 text-xs">
            {faltan.map((h) => (
              <li key={h} className="flex items-baseline gap-2">
                <span className="font-medium">{HECHOS[h].etiqueta}</span>
                <span className="text-muted-foreground">
                  · nivel {HECHOS[h].nivel}, {ETIQUETA_NIVEL[HECHOS[h].nivel].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href={`/atletas/medir?id=${atleta.id}`}>Medir</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href={`/atletas/evaluar?id=${atleta.id}`}>Evaluar</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Una regla que el motor no entiende no se aplica. Si eso no se dijera,
          seguiría en la matriz pareciendo metodología viva. */}
      {ilegibles.length > 0 && (
        <Bloque rotulo={`Reglas que el motor no entiende · ${ilegibles.length}`}>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {ilegibles.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Estas no se aplicaron. Hay que corregirlas en la matriz para que cuenten.
          </p>
        </Bloque>
      )}

      {/* Los empates no son una decisión del motor, son un defecto de la matriz.
          Se enseñan para que Giovanni pueda arreglarla. */}
      {resultado.conflictos.length > 0 && (
        <Bloque rotulo="Reglas en conflicto">
          <ul className="space-y-3">
            {resultado.conflictos.map((c, i) => (
              <li key={i} className="space-y-1 text-sm">
                <p className="font-medium">
                  {c.empate ? "Empate sobre " : "Conflicto sobre "}
                  {c.sobre}
                </p>
                <p className="text-xs text-muted-foreground">
                  Se aplicó <strong className="text-foreground">{c.ganadora.rule_key}</strong>
                  {c.empate
                    ? ". Las dos van igual de respaldadas, así que esto hay que resolverlo en la matriz."
                    : ` por tener más respaldo que ${c.descartadas.map((d) => d.rule_key).join(", ")}.`}
                </p>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Lo descartado va PRIMERO. Es lo contraintuitivo y lo que genera
          confianza: un entrenador no adopta una herramienta que le quita la
          sentadilla sin decirle por qué. */}
      {fuera.length > 0 && (
        <Bloque rotulo={`No prescribir · ${fuera.length}`}>
          <ul className="space-y-3">
            {fuera.map((e) => (
              <li
                key={e.ejercicio}
                className="space-y-2 rounded-lg border border-[color:var(--gl-peligro)]/35 bg-[color:var(--gl-acento-sv)] p-3"
              >
                <p className="flex items-start gap-2 text-sm font-medium">
                  <Ban
                    className="mt-0.5 size-4 shrink-0 text-[color:var(--gl-peligro)]"
                    aria-hidden="true"
                  />
                  {e.ejercicio}
                </p>

                {/* Todos los motivos, no solo el primero: si se viera uno, el
                    entrenador creería que basta con corregir eso. */}
                <ul className="space-y-1.5">
                  {e.porQue.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {p.justification}
                      <span className="mt-0.5 block opacity-70">{p.descripcion}</span>
                    </li>
                  ))}
                </ul>

                {e.sustitutos.length > 0 && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">En su lugar: </span>
                    <strong>{e.sustitutos.join(" o ")}</strong>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      <Bloque rotulo={`Se pueden prescribir · ${quedan.length}`}>
        {quedan.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún ejercicio de la biblioteca sobrevive a las restricciones de este atleta.
            Conviene revisarlas: probablemente falte cargar alternativas.
          </p>
        ) : (
          <ul className="divide-y">
            {quedan.map((e) => {
              const patron = patronDe[e.ejercicio];
              return (
                <li key={e.ejercicio} className="space-y-1 py-2">
                  <p className="flex items-center gap-2 text-sm">
                    {e.prioritario && (
                      <Sparkles
                        className="size-3.5 shrink-0 text-[color:var(--gl-dorado)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className={e.prioritario ? "font-medium" : undefined}>
                      {e.ejercicio}
                    </span>
                    {patron && esPatron(patron) && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {FICHA_PATRON[patron].nombre}
                      </span>
                    )}
                  </p>

                  {e.modificadores.map((m, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-[color:var(--gl-alerta)]"
                    >
                      <Wrench className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      {m}
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>

      {/* Estos valen para toda la sesión, no para un ejercicio. Por eso van una
          sola vez y no repetidos bajo cada uno. */}
      {resultado.modificadoresGenerales.length > 0 && (
        <Bloque rotulo="Ajustes de la sesión">
          <ul className="space-y-2">
            {resultado.modificadoresGenerales.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm">
                <Wrench
                  className="mt-0.5 size-3.5 shrink-0 text-[color:var(--gl-dorado)]"
                  aria-hidden="true"
                />
                {m}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      {hayCarga && (
        <Bloque rotulo="Ajustes de carga">
          <div className="divide-y">
            {resultado.volumenFactor !== 1 && (
              <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">Volumen semanal</span>
                <strong className="tabular-nums">
                  ×{resultado.volumenFactor}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({resultado.volumenFactor < 1 ? "−" : "+"}
                    {Math.round(Math.abs(1 - resultado.volumenFactor) * 100)}%)
                  </span>
                </strong>
              </div>
            )}
            {resultado.volumenSeries && (
              <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">Series por grupo y semana</span>
                <strong className="tabular-nums">
                  {resultado.volumenSeries.min}–{resultado.volumenSeries.max}
                </strong>
              </div>
            )}
            {resultado.rir.fijo !== undefined && (
              <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">RIR objetivo</span>
                <strong className="tabular-nums">{resultado.rir.fijo}</strong>
              </div>
            )}
            {resultado.rir.piso !== undefined && (
              <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">RIR mínimo</span>
                <strong className="tabular-nums">≥ {resultado.rir.piso}</strong>
              </div>
            )}
            {resultado.rir.delta !== undefined && (
              <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">Ajuste de RIR</span>
                <strong className="tabular-nums">
                  {resultado.rir.delta >= 0 ? "+" : ""}
                  {resultado.rir.delta}
                </strong>
              </div>
            )}
          </div>

          {resultado.maniobrasProhibidas.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-[color:var(--gl-peligro)]/35 p-3 text-xs">
              <ShieldAlert
                className="mt-0.5 size-3.5 shrink-0 text-[color:var(--gl-peligro)]"
                aria-hidden="true"
              />
              <span>
                No usar: <strong>{resultado.maniobrasProhibidas.join(", ")}</strong>
              </span>
            </p>
          )}
        </Bloque>
      )}

      {resultado.ratioPatron && (
        <Bloque rotulo="Reparto entre patrones">
          <ul className="divide-y">
            {Object.entries(resultado.ratioPatron).map(([p, v]) => (
              <li key={p} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {esPatron(p) ? FICHA_PATRON[p].nombre : p}
                </span>
                <strong className="tabular-nums">{Math.round(v * 100)}%</strong>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* El copiloto no manda (§3.6). Decirlo en pantalla y no solo en la
          documentación es parte del trato con el entrenador. */}
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        Esto es un análisis, no una rutina. El motor señala qué desaconseja la biomecánica de
        este atleta y por qué; quien prescribe eres tú, y puedes ignorarlo con criterio.
      </p>

      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href={`/atletas/ficha?id=${atleta.id}`}>Volver a la ficha</Link>
      </Button>
    </div>
  );
}

export default function PrescripcionPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Analizando…</p>}>
        <Prescripcion />
      </Suspense>
    </Guarda>
  );
}
