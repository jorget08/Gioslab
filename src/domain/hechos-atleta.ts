/**
 * El puente entre la base y el motor.
 *
 * El motor razona sobre HECHOS (`dorsiflexion_cm`, `fase_ciclo`, `lesiones`) y
 * la base guarda COLUMNAS (`ankle_dorsiflexion_cm`, `menstrual_cycle_logs`…).
 * Esto traduce lo segundo en lo primero.
 *
 * Vive aparte y es puro —recibe objetos planos, no consulta nada— por dos
 * motivos: se puede probar sin base, y deja el motor sin una sola línea que
 * sepa de Supabase.
 *
 * LO QUE FALTA, FALTA. Ninguna ausencia se rellena con un valor "neutro". Es la
 * misma razón por la que `estadoROM` devuelve `null` en vez de "Óptimo": dar por
 * buena una movilidad que nadie midió es prescribir a ciegas. El motor sabe
 * distinguir "no cumple" de "no lo sé" y aquí se le da esa materia prima.
 */

import { adaptacionPorCiclo, picoOvulatorio } from "@/domain/calculations/ciclo-menstrual";
import type { Hechos } from "@/domain/motor";

export interface FilaAtleta {
  sex?: string | null;
}

export interface FilaBiomecanica {
  ankle_dorsiflexion_cm?: number | null;
  hip_flexion_deg?: number | null;
  hip_internal_rotation_deg?: number | null;
  thomas_test_deg?: number | null;
  slr_deg?: number | null;
  thoracic_extension?: string | null;
  shoulder_flexion_deg?: number | null;
  shoulder_external_rotation_deg?: number | null;
  squat_dominance?: string | null;
  glute_vector?: string | null;
  back_dominance?: string | null;
  axial_load_tolerance?: string | null;
  femur_torso_ratio?: string | null;
}

export interface FilaMedicion {
  body_fat_pct?: number | null;
}

export interface FilaCiclo {
  last_period_start?: string | null;
  cycle_length_days?: number | null;
  uses_hormonal_contraception?: boolean | null;
}

export interface DatosAtleta {
  atleta?: FilaAtleta | null;
  /** La evaluación biomecánica más reciente no anulada. */
  biomecanica?: FilaBiomecanica | null;
  /** La medición antropométrica más reciente no anulada. */
  medicion?: FilaMedicion | null;
  /** El registro de ciclo más reciente no anulado. */
  ciclo?: FilaCiclo | null;
  /** Zonas de las lesiones ACTIVAS. Una recuperada ya no restringe. */
  lesiones?: readonly string[];
  /** Condiciones fisiológicas activas. */
  condiciones?: readonly string[];
}

/** Copia la clave solo si hay valor: `undefined` significa "no lo sé". */
function poner<K extends keyof Hechos>(h: Hechos, clave: K, valor: Hechos[K] | null | undefined) {
  if (valor !== null && valor !== undefined) h[clave] = valor;
}

export function resolverHechos(datos: DatosAtleta, hoy: Date = new Date()): Hechos {
  const h: Hechos = {};
  const b = datos.biomecanica;

  poner(h, "sexo", datos.atleta?.sex);

  poner(h, "dorsiflexion_cm", b?.ankle_dorsiflexion_cm);
  poner(h, "flexion_cadera_grados", b?.hip_flexion_deg);
  poner(h, "rotacion_interna_cadera_grados", b?.hip_internal_rotation_deg);
  poner(h, "thomas_test_grados", b?.thomas_test_deg);
  poner(h, "slr_grados", b?.slr_deg);
  poner(h, "extension_toracica", b?.thoracic_extension);
  poner(h, "flexion_hombro_grados", b?.shoulder_flexion_deg);
  poner(h, "rotacion_externa_hombro_grados", b?.shoulder_external_rotation_deg);

  poner(h, "dominancia_sentadilla", b?.squat_dominance);
  poner(h, "vector_gluteo", b?.glute_vector);
  poner(h, "dominancia_espalda", b?.back_dominance);
  poner(h, "tolerancia_carga_axial", b?.axial_load_tolerance);
  poner(h, "proporcion_femur_torso", b?.femur_torso_ratio);

  poner(h, "porcentaje_graso", datos.medicion?.body_fat_pct);

  // Lesiones y condiciones SÍ se ponen aunque vengan vacías: "no tiene ninguna"
  // es un dato, y sin él una regla de "no_incluye" quedaría sin evaluar para
  // siempre en un atleta sano.
  h.lesiones = [...(datos.lesiones ?? [])];
  h.condiciones = [...(datos.condiciones ?? [])];

  // El ciclo se calcula, no se lee: la fase depende de la fecha de hoy (§3.4).
  const c = datos.ciclo;
  if (c?.last_period_start && c.cycle_length_days) {
    const registro = {
      // Mediodía para que el cambio de día no dependa de la zona horaria.
      ultimaMenstruacion: new Date(`${c.last_period_start}T12:00:00`),
      duracionCicloDias: c.cycle_length_days,
      usaAnticonceptivos: Boolean(c.uses_hormonal_contraception),
    };
    h.fase_ciclo = adaptacionPorCiclo(registro, hoy).fase;
    h.pico_ovulatorio = picoOvulatorio(registro, hoy);
    h.usa_anticonceptivos = registro.usaAnticonceptivos;
  }

  return h;
}
