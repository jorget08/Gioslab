"use client";

import { AlertTriangle, Activity, Ruler } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Dato, DatoDestacado, SinDatos } from "@/components/ficha/dato";
import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { adaptacionPorCiclo } from "@/domain/calculations/ciclo-menstrual";
import { esCondicionSistemica, REGLA_SISTEMICA } from "@/domain/contraindicaciones";
import { edadEnAnios, ETIQUETA_ESTADO_LESION, ETIQUETA_SEXO } from "@/domain/catalogos";
import {
  fechaCorta,
  intervalo,
  prepararHistorial,
  riesgoCinturaCadera,
  variacion,
} from "@/domain/evolucion";
import { perfilMovilidad, severidadDorsiflexion } from "@/domain/movilidad";
import { interpretarProporcion } from "@/domain/segmentos";
import { createClient } from "@/lib/supabase/client";

/**
 * Ficha del atleta (tarea 2.9).
 *
 * Es la pantalla que justifica el producto. Hasta aquí el entrenador metía
 * datos; esto es lo primero que le devuelve algo a cambio.
 *
 * DOS DECISIONES QUE LA DEFINEN:
 *
 * 1. **Muestra evolución, no fotos sueltas.** "18.0 % de grasa" no dice nada;
 *    "18.0 %, −3.4 % desde hace cinco meses" sí. Es §3.5 llevado a pantalla: el
 *    valor está en el historial, no en el último dato.
 *
 * 2. **No juzga.** Ninguna variación se pinta de verde ni de rojo. Bajar de peso
 *    es un logro o un retroceso según el objetivo, y eso lo decide el
 *    entrenador. El único juicio de la ficha es el ratio cintura/cadera, porque
 *    ese umbral está escrito en la ficha de Giovanni.
 *
 * No recalcula nada: los valores derivados se guardaron al medir. Recalcularlos
 * aquí haría que una ficha antigua se mostrara con las fórmulas de hoy.
 */

interface Atleta {
  id: string;
  full_name: string;
  birth_date: string;
  sex: string;
  training_goal: string | null;
  experience_level: string | null;
  notes: string | null;
}

interface Medicion {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  fat_mass_kg: number | null;
  lean_mass_kg: number | null;
  bmi: number | null;
  waist_hip_ratio: number | null;
  sum_7_skinfolds_mm: number | null;
  chest_cm: number | null;
  arm_relaxed_cm: number | null;
  arm_flexed_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
}

interface Biomecanica {
  evaluated_at: string;
  femur_class: string | null;
  torso_class: string | null;
  femur_torso_ratio: string | null;
  ankle_dorsiflexion_cm: number | null;
  hip_flexion_deg: number | null;
  hip_internal_rotation_deg: number | null;
  thomas_test_deg: number | null;
  slr_deg: number | null;
  thoracic_extension: string | null;
  shoulder_flexion_deg: number | null;
  shoulder_external_rotation_deg: number | null;
}

interface Ciclo {
  last_period_start: string;
  cycle_length_days: number;
  uses_hormonal_contraception: boolean;
}

interface Condicion {
  condition: string;
  notes: string | null;
}

interface Lesion {
  id: string;
  body_region: string;
  description: string | null;
  status: string;
}

const COLUMNAS_MEDICION =
  "id, measured_at, weight_kg, height_cm, body_fat_pct, fat_mass_kg, lean_mass_kg, bmi, waist_hip_ratio, sum_7_skinfolds_mm, chest_cm, arm_relaxed_cm, arm_flexed_cm, thigh_cm, calf_cm";

/** Los que se enseñan en la ficha, en el orden en que se recorre al atleta. */
const PERIMETROS_FICHA = [
  { campo: "chest_cm", etiqueta: "Tórax" },
  { campo: "arm_relaxed_cm", etiqueta: "Brazo relajado" },
  { campo: "arm_flexed_cm", etiqueta: "Brazo contraído" },
  { campo: "thigh_cm", etiqueta: "Muslo" },
  { campo: "calf_cm", etiqueta: "Pantorrilla" },
] as const;

const COLUMNAS_BIOMEC =
  "evaluated_at, femur_class, torso_class, femur_torso_ratio, ankle_dorsiflexion_cm, hip_flexion_deg, hip_internal_rotation_deg, thomas_test_deg, slr_deg, thoracic_extension, shoulder_flexion_deg, shoulder_external_rotation_deg";

function Ficha() {
  const atletaId = useSearchParams().get("id") ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [biomec, setBiomec] = useState<Biomecanica | null>(null);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [lesiones, setLesiones] = useState<Lesion[]>([]);
  const [condiciones, setCondiciones] = useState<Condicion[]>([]);
  const [cargando, setCargando] = useState(Boolean(atletaId));

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("athletes")
        .select("id, full_name, birth_date, sex, training_goal, experience_level, notes")
        .eq("id", atletaId)
        .single(),
      // Las anuladas no cuentan: se anularon porque estaban mal, y arrastrarlas
      // al historial mostraría una evolución que nunca ocurrió (§3.5).
      supabase
        .from("anthropometric_measurements")
        .select(COLUMNAS_MEDICION)
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("measured_at", { ascending: false })
        .limit(12),
      supabase
        .from("biomech_evaluations")
        .select(COLUMNAS_BIOMEC)
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("evaluated_at", { ascending: false })
        .limit(1),
      supabase
        .from("menstrual_cycle_logs")
        .select("last_period_start, cycle_length_days, uses_hormonal_contraception")
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("last_period_start", { ascending: false })
        .limit(1),
      supabase
        .from("athlete_injuries")
        .select("id, body_region, description, status")
        .eq("athlete_id", atletaId),
      supabase
        .from("athlete_conditions")
        .select("condition, notes")
        .eq("athlete_id", atletaId)
        .eq("is_active", true),
    ]).then(([a, m, b, c, l, cond]) => {
      if (!vivo) return;
      setAtleta(a.data as Atleta | null);
      setMediciones((m.data ?? []) as Medicion[]);
      setBiomec((b.data?.[0] as Biomecanica) ?? null);
      setCiclo((c.data?.[0] as Ciclo) ?? null);
      setLesiones((l.data ?? []) as Lesion[]);
      setCondiciones((cond.data ?? []) as Condicion[]);
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

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

  const [ultima, penultima] = mediciones;
  const edad = edadEnAnios(new Date(atleta.birth_date));

  // El contexto del delta. Sin él, "−3.4 %" no se puede interpretar: no es lo
  // mismo perderlo en tres semanas que en ocho meses.
  const desde =
    ultima && penultima
      ? `desde ${intervalo(penultima.measured_at, ultima.measured_at).replace(" después", " antes")}`
      : null;

  const cmp = (campo: keyof Medicion, unidad: string, decimales = 1) =>
    variacion(
      ultima?.[campo] as number | null,
      penultima?.[campo] as number | null,
      unidad,
      decimales,
    );

  const rcc = ultima?.waist_hip_ratio ?? null;
  const enRiesgo = riesgoCinturaCadera(rcc, atleta.sex);

  const movilidad = biomec
    ? perfilMovilidad({
        ankle_dorsiflexion_cm: biomec.ankle_dorsiflexion_cm,
        hip_flexion_deg: biomec.hip_flexion_deg,
        hip_internal_rotation_deg: biomec.hip_internal_rotation_deg,
        thomas_test_deg: biomec.thomas_test_deg,
        slr_deg: biomec.slr_deg,
        thoracic_extension: biomec.thoracic_extension as "Normal" | "Cifótica" | null,
        shoulder_flexion_deg: biomec.shoulder_flexion_deg,
        shoulder_external_rotation_deg: biomec.shoulder_external_rotation_deg,
      })
    : [];

  const adaptacion =
    atleta.sex === "femenino" && ciclo
      ? adaptacionPorCiclo({
          ultimaMenstruacion: new Date(`${ciclo.last_period_start}T12:00:00`),
          duracionCicloDias: ciclo.cycle_length_days,
          usaAnticonceptivos: ciclo.uses_hormonal_contraception,
        })
      : null;

  const historial = prepararHistorial(mediciones, (m) => m.measured_at);
  const interpretacion = interpretarProporcion(biomec?.femur_torso_ratio ?? null);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{atleta.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {[
            `${edad} años`,
            ETIQUETA_SEXO[atleta.sex] ?? atleta.sex,
            atleta.training_goal,
            atleta.experience_level,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/atletas/medir?id=${atleta.id}`}>
            <Ruler className="size-4" aria-hidden="true" />
            Medir
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/atletas/evaluar?id=${atleta.id}`}>
            <Activity className="size-4" aria-hidden="true" />
            Evaluar
          </Link>
        </Button>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Bloque rotulo={ultima ? `Composición · ${fechaCorta(ultima.measured_at)}` : "Composición"}>
        {!ultima ? (
          <SinDatos>
            Todavía no tiene mediciones. La primera toma habilita el porcentaje graso y todo
            lo que se calcula a partir de él.
          </SinDatos>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <DatoDestacado
                rotulo="Grasa corporal"
                valor={ultima.body_fat_pct}
                unidad="%"
                variacion={cmp("body_fat_pct", "%")}
                contexto={desde}
              />
              <DatoDestacado
                rotulo="Peso"
                valor={ultima.weight_kg}
                unidad="kg"
                variacion={cmp("weight_kg", "kg")}
                contexto={desde}
              />
            </div>

            <div className="divide-y">
              <Dato
                rotulo="Masa magra"
                valor={ultima.lean_mass_kg}
                unidad="kg"
                variacion={cmp("lean_mass_kg", "kg")}
              />
              <Dato
                rotulo="Masa grasa"
                valor={ultima.fat_mass_kg}
                unidad="kg"
                variacion={cmp("fat_mass_kg", "kg")}
              />
              <Dato rotulo="IMC" valor={ultima.bmi} variacion={cmp("bmi", "")} />
              <Dato
                rotulo="Suma de 7 pliegues"
                valor={ultima.sum_7_skinfolds_mm}
                unidad="mm"
                variacion={cmp("sum_7_skinfolds_mm", "mm")}
              />
              <Dato
                rotulo="Cintura / cadera"
                valor={rcc}
                variacion={cmp("waist_hip_ratio", "", 3)}
              />
            </div>

            {/* El único juicio de toda la ficha, y solo porque el umbral está
                escrito en la ficha de Giovanni (>0.85 en mujeres). Para hombres
                él no da corte, así que no se dice nada. */}
            {enRiesgo && (
              <p className="flex items-start gap-2 rounded-lg border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-3 text-xs">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-[color:var(--gl-alerta)]"
                  aria-hidden="true"
                />
                <span>
                  Ratio cintura/cadera por encima de 0.85. La ficha lo marca como factor de
                  riesgo en mujeres.
                </span>
              </p>
            )}
          </>
        )}
      </Bloque>

      {/* ---------------------------------------------------------------- */}
      {/* Aparte de la composición y no dentro: la composición dice CUÁNTO
          cambió el cuerpo y esto dice DÓNDE. Es la petición de Giovanni —con
          cintura y cadera no se puede seguir la hipertrofia— y solo aparece si
          hay alguno tomado, porque son opcionales. */}
      {ultima && PERIMETROS_FICHA.some((p) => ultima[p.campo] !== null) && (
        <Bloque rotulo="Perímetros">
          <div className="divide-y">
            {PERIMETROS_FICHA.filter((p) => ultima[p.campo] !== null).map((p) => (
              <Dato
                key={p.campo}
                rotulo={p.etiqueta}
                valor={ultima[p.campo]}
                unidad="cm"
                variacion={cmp(p.campo, "cm")}
              />
            ))}
          </div>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      <Bloque
        rotulo={biomec ? `Biomecánica · ${fechaCorta(biomec.evaluated_at)}` : "Biomecánica"}
      >
        {!biomec ? (
          <SinDatos>
            Sin evaluación biomecánica. Es la que alimenta al motor: sin ella no puede
            seleccionar ni excluir ejercicios.
          </SinDatos>
        ) : (
          <>
            {biomec.femur_torso_ratio && (
              <div>
                <p className="text-lg font-medium">{biomec.femur_torso_ratio}</p>
                {interpretacion && (
                  <p className="text-sm text-muted-foreground">
                    Su ficha clasifica esta combinación como{" "}
                    <strong className="text-foreground">{interpretacion}</strong>.
                  </p>
                )}
              </div>
            )}

            <div className="divide-y">
              {movilidad.map((r) => {
                // La dorsiflexión enseña la severidad, que es lo que dispara
                // cada una de sus dos reglas distintas.
                const etiqueta =
                  r.test === "ankle_dorsiflexion_cm" && biomec.ankle_dorsiflexion_cm !== null
                    ? severidadDorsiflexion(biomec.ankle_dorsiflexion_cm)
                    : r.estado;

                return (
                  <div
                    key={r.test}
                    className="flex min-h-11 items-center justify-between gap-3 py-1"
                  >
                    <span className="text-sm text-muted-foreground">{r.etiqueta}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm tabular-nums">{r.medida ?? "—"}</span>
                      {etiqueta && (
                        <span
                          className={
                            r.estado === "Óptimo"
                              ? "rounded-md border border-[color:var(--gl-ok)]/40 bg-[color:var(--gl-ok-sv)] px-2 py-0.5 text-xs font-medium text-[color:var(--gl-ok)]"
                              : "rounded-md border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] px-2 py-0.5 text-xs font-medium text-[color:var(--gl-alerta)]"
                          }
                        >
                          {etiqueta}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {movilidad.some((r) => r.estado === null) && (
              <p className="text-xs text-muted-foreground">
                Las pruebas sin medir quedan fuera del motor: no puede concluir nada sobre una
                articulación que nadie evaluó.
              </p>
            )}
          </>
        )}
      </Bloque>

      {/* ---------------------------------------------------------------- */}
      {/* Visible para toda atleta, haya registro o no. Antes solo aparecía
          cuando ya existían datos, así que no había forma de descubrir dónde
          se metían: Giovanni buscó dónde apuntar la fecha del periodo y no
          encontró nada. Un bloque que solo existe cuando ya está lleno no
          enseña a nadie a llenarlo. */}
      {atleta.sex === "femenino" && (
        <Bloque rotulo="Ciclo menstrual">
          {adaptacion ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{adaptacion.fase}</p>
                  {adaptacion.fase !== "Anticonceptivo" && (
                    <p className="text-xs text-muted-foreground">
                      Día {adaptacion.diaDelCiclo} · {adaptacion.prescripcion.rango}
                    </p>
                  )}
                </div>
                <span className="text-2xl font-semibold tabular-nums">
                  ×{adaptacion.multiplicadorVolumen}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{adaptacion.prescripcion.efecto}</p>
                <p>{adaptacion.prescripcion.ajuste}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Calculado sobre el último registro, del {fechaCorta(`${ciclo?.last_period_start}T12:00:00`)}.
                Conviene anotar cada mes.
              </p>
            </>
          ) : (
            <SinDatos>
              Sin registro. Anotando el primer día de la última menstruación, el sistema calcula
              la fase y ajusta el volumen de entrenamiento.
            </SinDatos>
          )}

          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href={`/atletas/ciclo?id=${atleta.id}`}>
              {adaptacion ? "Anotar nuevo periodo" : "Registrar el ciclo"}
            </Link>
          </Button>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ---------------------------------------------------------------- */}
      {/* Siempre visible, tenga o no condiciones: es lo que le dice al
          entrenador que esto se puede registrar y que hay que mantenerlo al
          día. Un embarazo empieza después del alta; si el bloque solo
          apareciera cuando ya hay algo, nadie descubriría dónde marcarlo. */}
      <Bloque rotulo="Condiciones fisiológicas">
        {condiciones.length === 0 ? (
          <SinDatos>Ninguna registrada.</SinDatos>
        ) : (
          <ul className="divide-y">
            {condiciones.map((c) => (
              <li key={c.condition} className="py-2">
                <p className="text-sm font-medium">{c.condition}</p>
                <p className="text-xs text-muted-foreground">
                  {esCondicionSistemica(c.condition)
                    ? REGLA_SISTEMICA[c.condition]
                    : "Condición fuera del catálogo actual."}
                </p>
                {c.notes && <p className="mt-0.5 text-xs text-muted-foreground">{c.notes}</p>}
              </li>
            ))}
          </ul>
        )}

        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href={`/atletas/condiciones?id=${atleta.id}`}>
            {condiciones.length === 0 ? "Registrar condiciones" : "Actualizar"}
          </Link>
        </Button>
      </Bloque>

      {/* ---------------------------------------------------------------- */}
      {lesiones.length > 0 && (
        <Bloque rotulo="Lesiones y antecedentes">
          <ul className="divide-y">
            {lesiones.map((l) => (
              <li key={l.id} className="py-2">
                <p className="text-sm font-medium">
                  {l.body_region}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {ETIQUETA_ESTADO_LESION[l.status] ?? l.status}
                  </span>
                </p>
                {l.description && (
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                )}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* ---------------------------------------------------------------- */}
      {historial.length > 1 && (
        <Bloque rotulo={`Historial · ${historial.length} mediciones`}>
          <ul className="divide-y">
            {historial.map((f) => (
              <li key={f.registro.id} className="flex items-baseline justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">{fechaCorta(f.fecha)}</p>
                  {f.desdeLaAnterior && (
                    <p className="text-xs text-muted-foreground">{f.desdeLaAnterior}</p>
                  )}
                </div>
                <p className="shrink-0 text-sm tabular-nums">
                  {f.registro.weight_kg !== null ? `${f.registro.weight_kg} kg` : "—"}
                  <span className="text-muted-foreground">
                    {" · "}
                    {f.registro.body_fat_pct !== null ? `${f.registro.body_fat_pct} %` : "—"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {atleta.notes && (
        <Bloque rotulo="Notas">
          <p className="whitespace-pre-wrap text-sm">{atleta.notes}</p>
        </Bloque>
      )}

      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href="/atletas">Volver a la lista</Link>
      </Button>
    </div>
  );
}

export default function FichaPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Ficha />
      </Suspense>
    </Guarda>
  );
}
