"use client";

import { AlertTriangle, Download, Save } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { DiaEditable, type OpcionEjercicio } from "@/components/plan/dia-editable";
import { FormularioGenerar } from "@/components/plan/formulario-generar";
import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { cambiosDelDia, resumenDeCambios } from "@/domain/ediciones";
import { generarPlan } from "@/domain/generador";
import { objetivoDeMeta } from "@/domain/metodo";
import { incluidos } from "@/domain/motor";
import { nombrePatron } from "@/domain/patrones";
import {
  FICHA_OBJETIVO,
  FICHA_PERIODIZACION,
  leerPlan,
  validarPlan,
  type Objetivo,
  type Plan,
} from "@/domain/plan";
import {
  anadirEjercicio,
  cambiarEjercicio,
  cambiarNumero,
  ejercicioDelMetodo,
  moverDia,
  moverEjercicio,
  quitarEjercicio,
} from "@/domain/plan-edicion";
import { sustitutosDe } from "@/domain/relaciones";
import { descargarPlanPDF } from "@/pdf/descargar-plan";
import { cargarMotorDelAtleta, type CargaMotor } from "@/lib/motor-atleta";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

/**
 * El plan del atleta: generarlo, editarlo y guardarlo (tareas 5.3–5.5).
 *
 * Esta pantalla es la mitad que faltaba del copiloto. La 3.7 enseña qué dice el
 * motor; aquí eso se convierte en un mesociclo que el entrenador puede cambiar
 * entero antes de firmarlo.
 *
 * TRES COSAS QUE LA DEFINEN:
 *
 * 1. EL PLAN GENERADO SE GUARDA APARTE Y NO SE TOCA (columna `plan_generado`).
 *    Lo que el entrenador cambie se marca comparando contra él. Sin esa
 *    distinción no se puede aprender de sus correcciones más adelante.
 *
 * 2. GENERAR ES INSERTAR, NO PISAR. Regenerar crea una fila nueva con su fecha.
 *    Un plan es historial (§3.5), y de paso queda el rastro de cuántas veces
 *    hubo que regenerarle el plan a alguien.
 *
 * 3. LOS AVISOS DEL GENERADOR VAN ARRIBA Y EN ÁMBAR. Si no se llega a sus
 *    series semanales porque el motor dejó fuera media biblioteca, eso se lee
 *    ANTES que el plan, no después.
 */

interface FilaPlan {
  id: string;
  plan_data: unknown;
  plan_generado: unknown;
}

function PlanDelAtleta() {
  const atletaId = useSearchParams().get("id") ?? "";

  const [carga, setCarga] = useState<CargaMotor | null>(null);
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [fila, setFila] = useState<FilaPlan | null>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [generado, setGenerado] = useState<Plan | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [errores, setErrores] = useState<string[]>([]);

  const [semanaVista, setSemanaVista] = useState(1);
  const [dias, setDias] = useState(4);
  const [semanas, setSemanas] = useState(5);
  const [objetivo, setObjetivo] = useState<Objetivo | "">("");
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      cargarMotorDelAtleta(supabase, atletaId),
      supabase
        .from("workout_plans")
        .select("id, plan_data, plan_generado")
        .eq("athlete_id", atletaId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]).then(([c, p]) => {
      if (!vivo) return;
      setCarga(c);

      const guardado = (p.data?.[0] ?? null) as FilaPlan | null;
      if (guardado) {
        const actual = leerPlan(guardado.plan_data);
        setFila(guardado);
        setPlan(actual);
        setGenerado(leerPlan(guardado.plan_generado));
        if (actual) {
          setDias(actual.diasPorSemana);
          setSemanas(actual.semanas.length);
          setObjetivo(actual.objetivo);
        }
      } else if (c.metodo && c.atleta) {
        // Precargado con lo que ya sabemos de él: el entrenador solo confirma.
        setObjetivo(objetivoDeMeta(c.metodo, c.atleta.training_goal) ?? "");
      }
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  /** Lo que el motor aprobó, para los desplegables de cambiar y añadir. */
  const opciones: OpcionEjercicio[] = useMemo(() => {
    if (!carga?.resultado) return [];
    return incluidos(carga.resultado)
      .map((d) => ({
        nombre: d.ejercicio,
        patron: carga.patronDe[d.ejercicio] ?? null,
        etiquetaPatron: nombrePatron(carga.patronDe[d.ejercicio] ?? "sin clasificar"),
      }))
      .sort((a, b) => a.etiquetaPatron.localeCompare(b.etiquetaPatron, "es") ||
        a.nombre.localeCompare(b.nombre, "es"));
  }, [carga]);

  const problemas = useMemo(() => (plan ? validarPlan(plan) : []), [plan]);
  const cambios = useMemo(() => resumenDeCambios(generado, plan ?? ({} as Plan)), [generado, plan]);

  async function generar() {
    if (!carga?.metodo || !carga.resultado || !carga.atleta) return;
    setTrabajando(true);
    setAviso(null);

    const salida = generarPlan({
      resultado: carga.resultado,
      metodo: carga.metodo,
      ejercicios: carga.ejercicios,
      relaciones: carga.relaciones,
      atleta: carga.atleta,
      opciones: {
        diasPorSemana: dias,
        semanas,
        objetivo: objetivo === "" ? undefined : objetivo,
      },
    });

    setAvisos(salida.avisos);
    setErrores(salida.errores);
    if (!salida.plan) {
      setTrabajando(false);
      return;
    }

    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    const autor = sesion.user?.id;
    if (!autor) {
      setAviso("Tu sesión caducó. Vuelve a entrar para guardar el plan.");
      setTrabajando(false);
      return;
    }

    const { data, error } = await supabase
      .from("workout_plans")
      .insert({
        athlete_id: carga.atleta.id,
        tenant_id: carga.atleta.tenant_id,
        trainer_id: autor,
        created_by: autor,
        title: `${FICHA_OBJETIVO[salida.plan.objetivo]} · ${salida.plan.semanas.length} semanas`,
        periodization_type: salida.plan.periodizacion,
        duration_weeks: salida.plan.semanas.length,
        // Los dos iguales al nacer. `plan_generado` ya no se vuelve a escribir:
        // es contra lo que se comparan sus cambios.
        // jsonb: los tipos generados piden `Json`. El plan ya pasó por
        // `validarPlan` dentro del generador, que es más estricto que `Json`.
        plan_data: salida.plan as unknown as Json,
        plan_generado: salida.plan as unknown as Json,
        status: "borrador",
      })
      .select("id, plan_data, plan_generado")
      .single();

    if (error || !data) {
      setAviso("No pudimos guardar el plan. Inténtalo de nuevo.");
      setTrabajando(false);
      return;
    }

    setFila(data as unknown as FilaPlan);
    setPlan(salida.plan);
    setGenerado(salida.plan);
    setSemanaVista(1);
    setSucio(false);
    setTrabajando(false);
  }

  async function guardar() {
    if (!plan || !fila) return;
    setTrabajando(true);
    setAviso(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("workout_plans")
      .update({
        plan_data: plan as unknown as Json,
        periodization_type: plan.periodizacion,
        duration_weeks: plan.semanas.length,
      })
      .eq("id", fila.id);

    setAviso(error ? "No pudimos guardar los cambios." : "Cambios guardados.");
    setSucio(Boolean(error));
    setTrabajando(false);
  }

  async function descargar() {
    if (!plan || !carga?.atleta) return;
    setExportando(true);
    setAviso(null);
    try {
      const hoy = new Date();
      await descargarPlanPDF({
        plan,
        atleta: carga.atleta.full_name,
        fecha: new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(hoy),
        fechaIso: hoy.toISOString(),
        // Los avisos viajan con el papel: fuera de la app no hay interfaz que
        // explique por qué un grupo se queda corto de series.
        avisos,
      });
    } catch {
      setAviso("No pudimos generar el PDF. Inténtalo de nuevo.");
    }
    setExportando(false);
  }

  /** Toda edición pasa por aquí: así nadie se olvida de marcar el plan sucio. */
  function editar(siguiente: Plan) {
    setPlan(siguiente);
    setSucio(true);
    setAviso(null);
  }

  const sustitutosDe_ = (nombre: string) =>
    carga
      ? sustitutosDe(carga.relaciones, nombre)
          .filter((s) => opciones.some((o) => o.nombre === s))
          .slice(0, 2)
      : [];

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!carga?.atleta) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No encontramos ese atleta.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/atletas">Volver a la lista</Link>
        </Button>
      </div>
    );
  }

  const semana = plan?.semanas.find((s) => s.semana === semanaVista) ?? plan?.semanas[0];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{carga.atleta.full_name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {plan
            ? `${FICHA_OBJETIVO[plan.objetivo]} · ${FICHA_PERIODIZACION[plan.periodizacion].nombre} · ${plan.semanas.length} semanas`
            : "Todavía no tiene rutina"}
        </p>
      </header>

      {!carga.metodo && (
        <p className="rounded-xl border border-[color:var(--gl-peligro)]/40 p-4 text-sm">
          No hay ningún método de programación activo en la base, así que no se puede generar
          nada. Es la tarea 5.2: sin las cifras de Giovanni no hay rutina que valga.
        </p>
      )}

      {/* --- Generar ---------------------------------------------------- */}
      {carga.metodo && (
        <FormularioGenerar
          metodo={carga.metodo}
          hayPlan={Boolean(plan)}
          dias={dias}
          semanas={semanas}
          objetivo={objetivo}
          trabajando={trabajando}
          onDias={setDias}
          onSemanas={setSemanas}
          onObjetivo={setObjetivo}
          onGenerar={generar}
        />
      )}

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

      {/* Los avisos van ANTES del plan: si no se llega a sus series semanales,
          eso se lee antes de firmar nada, no después. */}
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

      {/* --- El plan ------------------------------------------------------ */}
      {plan && semana && (
        <>
          <div className="flex flex-wrap gap-2">
            {plan.semanas.map((s) => (
              <Button
                key={s.semana}
                type="button"
                variant={s.semana === semanaVista ? "default" : "outline"}
                className="min-h-11 flex-1 basis-20"
                onClick={() => setSemanaVista(s.semana)}
              >
                <span className="flex flex-col leading-tight">
                  <span>S{s.semana}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {s.tipo === "carga" ? "carga" : s.tipo === "descarga" ? "descarga" : "super."}
                  </span>
                </span>
              </Button>
            ))}
          </div>

          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Cambiar, quitar, añadir o mover un ejercicio se aplica a{" "}
            <strong>todas las semanas</strong>: un mesociclo es el mismo entrenamiento con la
            carga cambiando. Series, repeticiones, RPE y descanso cambian{" "}
            <strong>solo en la semana que estás viendo</strong>, porque la de descarga es
            distinta a propósito.
          </p>

          {semana.dias.map((dia, iDia) => (
            <DiaEditable
              key={`${semana.semana}-${iDia}`}
              dia={dia}
              cambios={cambiosDelDia(
                generado?.semanas.find((s) => s.semana === semana.semana)?.dias[iDia],
                dia,
              )}
              opciones={opciones}
              primerDia={iDia === 0}
              ultimoDia={iDia === semana.dias.length - 1}
              onMoverDia={(salto) => editar(moverDia(plan, iDia, salto))}
              onNumero={(indice, campo, valor) =>
                editar(
                  cambiarNumero(plan, { dia: iDia, indice, semana: semana.semana }, campo, valor),
                )
              }
              onCambiar={(indice, nombre) =>
                editar(cambiarEjercicio(plan, { dia: iDia, indice }, nombre, sustitutosDe_(nombre)))
              }
              onQuitar={(indice) => editar(quitarEjercicio(plan, { dia: iDia, indice }))}
              onMover={(indice, salto) => editar(moverEjercicio(plan, { dia: iDia, indice }, salto))}
              onAnadir={(nombre) =>
                carga.metodo &&
                editar(
                  anadirEjercicio(plan, iDia, (tipo) =>
                    ejercicioDelMetodo({
                      nombre,
                      patron: carga.patronDe[nombre] ?? null,
                      metodo: carga.metodo!,
                      objetivo: plan.objetivo,
                      tipo,
                      sustitutos: sustitutosDe_(nombre),
                    }),
                  ),
                )
              }
            />
          ))}

          {problemas.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[color:var(--gl-peligro)]/40 p-4">
              <p className="text-sm font-medium">Esto no se puede guardar todavía</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {problemas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {cambios.length > 0 && (
            <Bloque rotulo={`Tus cambios sobre lo que propuso el motor · ${cambios.length}`}>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {cambios.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Bloque>
          )}

          {aviso && (
            <p role="status" className="text-sm text-muted-foreground">
              {aviso}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11 flex-1"
              disabled={trabajando || problemas.length > 0 || !sucio}
              onClick={guardar}
            >
              <Save className="size-4" aria-hidden="true" />
              {sucio ? "Guardar cambios" : "Sin cambios que guardar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              disabled={exportando}
              onClick={descargar}
            >
              <Download className="size-4" aria-hidden="true" />
              {exportando ? "Generando PDF…" : "Descargar PDF"}
            </Button>
          </div>
        </>
      )}

      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href={`/atletas/prescripcion?id=${carga.atleta.id}`}>Ver qué dice el motor</Link>
      </Button>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <PlanDelAtleta />
      </Suspense>
    </Guarda>
  );
}
