import type { SupabaseClient } from "@supabase/supabase-js";

import type { Ejercicio } from "@/domain/ejercicios";
import { resolverHechos } from "@/domain/hechos-atleta";
import { leerMetodo, type Metodo } from "@/domain/metodo";
import { evaluar, type Resultado } from "@/domain/motor";
import { validarRegla, type Regla } from "@/domain/reglas";
import { esTipoRelacion, type Relacion } from "@/domain/relaciones";
import type { Database } from "@/types/database.types";

/**
 * Todo lo que hace falta para correr el motor sobre un atleta.
 *
 * Estaba escrito dentro de la pantalla de prescripción (3.7). Cuando el
 * generador (5.3) necesitó exactamente lo mismo, copiarlo habría dejado dos
 * listas de columnas que se olvidan de crecer a la vez — y la que se olvida
 * calla: el motor recibe un hecho menos, no falla, y prescribe de más.
 *
 * Por eso vive aquí una sola vez, con las mismas cautelas que tenía:
 *   · Las lesiones RECUPERADAS no restringen. Seguir excluyendo por ellas deja
 *     al atleta con media biblioteca vetada para siempre.
 *   · Solo se resuelven relaciones entre ejercicios ACTIVOS: ofrecer como
 *     alternativa uno archivado manda al entrenador a la nada.
 *   · Una regla que el motor no entiende NO se aplica, y se devuelve en
 *     `ilegibles` en vez de desaparecer. Giovanni la ve en la matriz y la cree
 *     viva; el silencio es el fallo más caro de este proyecto.
 */

export interface AtletaDelMotor {
  id: string;
  tenant_id: string;
  full_name: string;
  sex: string;
  training_goal: string | null;
  experience_level: string | null;
}

export interface CargaMotor {
  atleta: AtletaDelMotor | null;
  resultado: Resultado | null;
  ejercicios: Ejercicio[];
  relaciones: Relacion[];
  /** Nombre → patrón, para las pantallas que agrupan sin volver a la base. */
  patronDe: Record<string, string | null>;
  /** Reglas que el motor no sabe interpretar, con su primer error. */
  ilegibles: string[];
  /** El método activo (5.2). `null` si no hay ninguno cargado. */
  metodo: Metodo | null;
}

/**
 * Vale para el cliente del navegador y para el de servidor: los dos son
 * `SupabaseClient<Database>`, y esta carga se usa desde la pantalla del plan y
 * desde la ruta que genera el PDF.
 */
type Cliente = SupabaseClient<Database>;

export async function cargarMotorDelAtleta(
  supabase: Cliente,
  atletaId: string,
): Promise<CargaMotor> {
  const [a, bio, med, cic, les, con, reg, ejs, rel, met] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, tenant_id, full_name, sex, training_goal, experience_level")
      .eq("id", atletaId)
      .single(),
    supabase
      .from("biomech_evaluations")
      .select("*")
      .eq("athlete_id", atletaId)
      .is("voided_at", null)
      .order("evaluated_at", { ascending: false })
      .limit(1),
    // Los perímetros bilaterales viajan con la medición porque de ellos sale el
    // hecho `asimetrias` (2.15). Sin ellos el motor los ve vacíos y concluye que
    // no hay asimetría, que es peor que no saberlo.
    supabase
      .from("anthropometric_measurements")
      .select(
        "body_fat_pct, arm_flexed_cm, arm_flexed_left_cm, thigh_cm, thigh_left_cm, calf_cm, calf_left_cm",
      )
      .eq("athlete_id", atletaId)
      .is("voided_at", null)
      .order("measured_at", { ascending: false })
      .limit(1),
    supabase
      .from("menstrual_cycle_logs")
      .select("last_period_start, cycle_length_days, uses_hormonal_contraception")
      .eq("athlete_id", atletaId)
      .is("voided_at", null)
      .order("last_period_start", { ascending: false })
      .limit(1),
    supabase.from("athlete_injuries").select("body_region, status").eq("athlete_id", atletaId),
    supabase
      .from("athlete_conditions")
      .select("condition")
      .eq("athlete_id", atletaId)
      .eq("is_active", true),
    supabase
      .from("rules")
      .select("rule_key, version, nivel, condition, actions, justification, evidence_level")
      .eq("is_active", true),
    supabase
      .from("exercise_library")
      .select(
        "id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, is_active",
      )
      .eq("is_active", true),
    supabase.from("exercise_variants").select("exercise_id, variant_exercise_id, relation_type"),
    supabase.from("training_methods").select("method_data").eq("is_active", true).maybeSingle(),
  ]);

  const atleta = (a.data ?? null) as AtletaDelMotor | null;
  const ejercicios = (ejs.data ?? []) as Ejercicio[];

  const nombrePorId = new Map(ejercicios.map((e) => [e.id, e.name]));
  const relaciones: Relacion[] = [];
  for (const v of (rel.data ?? []) as {
    exercise_id: string;
    variant_exercise_id: string;
    relation_type: string;
  }[]) {
    const ejercicio = nombrePorId.get(v.exercise_id);
    const variante = nombrePorId.get(v.variant_exercise_id);
    if (ejercicio && variante && esTipoRelacion(v.relation_type)) {
      relaciones.push({ ejercicio, variante, tipo: v.relation_type });
    }
  }

  const crudas = (reg.data ?? []) as unknown as Regla[];
  const ilegibles: string[] = [];
  const reglas = crudas.filter((r) => {
    const errores = validarRegla(r);
    if (errores.length > 0) ilegibles.push(`${r.rule_key}: ${errores[0]}`);
    return errores.length === 0;
  });

  const hechos = resolverHechos({
    atleta: atleta ?? undefined,
    biomecanica: bio.data?.[0],
    medicion: med.data?.[0],
    ciclo: cic.data?.[0],
    lesiones: ((les.data ?? []) as { body_region: string; status: string }[])
      .filter((l) => l.status !== "recuperada")
      .map((l) => l.body_region),
    condiciones: ((con.data ?? []) as { condition: string }[]).map((c) => c.condition),
  });

  return {
    atleta,
    resultado: atleta ? evaluar({ hechos, reglas, ejercicios, relaciones }) : null,
    ejercicios,
    relaciones,
    patronDe: Object.fromEntries(ejercicios.map((e) => [e.name, e.movement_pattern])),
    ilegibles,
    metodo: leerMetodo((met.data as { method_data?: unknown } | null)?.method_data ?? null),
  };
}
