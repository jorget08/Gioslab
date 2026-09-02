/**
 * La forma de un plan de entrenamiento (tarea 5.1).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES ESTO Y QUÉ NO ES
 * ---------------------------------------------------------------------------
 *
 * Esto es el ESQUEMA: qué campos tiene un plan y qué combinaciones son válidas.
 * NO es el generador (5.3) ni el método de Giovanni (5.2). Aquí no hay una sola
 * cifra suya —ni series, ni repeticiones, ni RPE— a propósito: sus números son
 * método, y el método es dato que se carga, no código que se escribe (§3.1).
 * Lo único que se fija aquí es la forma que ese dato tiene que rellenar.
 *
 * `workout_plans.plan_data` era un jsonb libre. Un jsonb libre no falla al
 * escribirse: falla al leerse, semanas después y en la pantalla de otro.
 *
 * ---------------------------------------------------------------------------
 * DE DÓNDE SALE CADA COSA
 * ---------------------------------------------------------------------------
 *
 * · La estructura semana → día → ejercicio, y los campos por ejercicio, salen de
 *   `gymapp/src/data/program.ts`, que es una app en uso diario: series de
 *   calentamiento aparte de las efectivas, rango de repeticiones en vez de un
 *   número, RPE distinto para las primeras series y para la última, y dos
 *   sustitutos por ejercicio. Cada uno de esos campos existe porque hizo falta.
 *
 * · Las TRES FASES de sesión salen de `recomendaciones para jh` (1-sep), y su
 *   documento es tajante: «El sistema no debe permitir guardar ni iniciar una
 *   sesión si no se cumple esta estructura». Por eso son obligatorias en el
 *   tipo, no opcionales con una validación amable.
 *
 * · La periodización sale de su formulario del 31-ago y de su anexo ATR.
 */

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

/**
 * Modelos de periodización.
 *
 * `workout_plans.periodization_type` llevaba desde la primera migración un
 * "PENDIENTE DE GIOVANNI"; sus dos documentos del 31-ago y el 1-sep lo cierran.
 * Cada uno los nombra a su manera y las dos formas se conservan en la ficha,
 * porque las dos son suyas.
 *
 * ⚠️ LO QUE ESTO **NO** DECIDE: cuál le toca a cada atleta. Su anexo los asigna
 * por NIVEL (principiante/intermedio/avanzado) y su formulario los describe por
 * OBJETIVO (recomposición, corrección de rezagos). Los dos ejes existen en
 * `athletes` —`experience_level` y `training_goal`— y cuál manda cuando chocan
 * es pregunta abierta de 5.2. Aquí solo se nombra el catálogo.
 */
export const PERIODIZACIONES = ["lineal", "ondulante", "atr"] as const;
export type Periodizacion = (typeof PERIODIZACIONES)[number];

export const FICHA_PERIODIZACION: Record<
  Periodizacion,
  { nombre: string; comoLaLlama: string; cuando: string }
> = {
  lineal: {
    nombre: "Lineal",
    comoLaLlama: "Lineal Secuencial / Bloques · Lineal Progresiva Simple",
    cuando: "Principiantes o fases iniciales de acondicionamiento.",
  },
  ondulante: {
    nombre: "Ondulante",
    comoLaLlama: "Ondulante (DUP/WUP)",
    cuando: "Intermedios y avanzados. La carga y las repeticiones fluctúan por sesión o por semana.",
  },
  atr: {
    nombre: "ATR / Bloques concentrados",
    comoLaLlama: "ATR · Recomposición / Priorización / Especialización",
    cuando: "Rendimiento y fisicoculturismo. Acumulación, Transformación y Realización.",
  },
};

/**
 * Objetivo que gobierna repeticiones, RPE y descanso.
 *
 * Son los tres de su tabla del 31-ago. `athletes.training_goal` tiene CUATRO
 * valores —añade "Recomposición Corporal" y "Rendimiento Deportivo"— y traducir
 * esos dos a uno de estos tres es criterio suyo, no nuestro. Es trabajo de 5.3 y
 * está preguntado.
 */
export const OBJETIVOS = ["fuerza", "hipertrofia", "perdida_grasa"] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export const FICHA_OBJETIVO: Record<Objetivo, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Hipertrofia",
  perdida_grasa: "Pérdida de grasa",
};

/**
 * Qué es cada semana dentro del mesociclo.
 *
 * La supercompensación es suya y es un tipo aparte, no una semana de carga más:
 * «después del deload se retorna a la carga con intención de superar los
 * registros previos». Si fuera una semana normal, el generador no sabría que ahí
 * toca ir a por el récord.
 */
export const TIPOS_SEMANA = ["carga", "descarga", "supercompensacion"] as const;
export type TipoSemana = (typeof TIPOS_SEMANA)[number];

/**
 * Cómo termina la sesión, según el objetivo.
 *
 * Catálogo CERRADO, y ahí está media prohibición suya. Su documento prohíbe
 * expresamente el estiramiento estático pasivo al terminar una sesión de
 * hipertrofia. En vez de dejarlo entrar y validarlo después, sencillamente no
 * existe como opción: lo que no se puede escribir no se puede prescribir por
 * error.
 */
export const CIERRES = ["recuperacion_activa", "cardio_zona2"] as const;
export type Cierre = (typeof CIERRES)[number];

export const FICHA_CIERRE: Record<Cierre, { nombre: string; detalle: string; objetivo: Objetivo[] }> = {
  recuperacion_activa: {
    nombre: "Recuperación activa",
    detalle: "Cardio ligero en Zona 1 (menos del 50% de la FC máxima) más respiración diafragmática.",
    objetivo: ["hipertrofia", "fuerza"],
  },
  cardio_zona2: {
    nombre: "Cardio en Zona 2",
    detalle: "Trabajo continuo al 60–70% de la FC máxima, inmediatamente después de la fase central.",
    objetivo: ["perdida_grasa"],
  },
};

// ---------------------------------------------------------------------------
// Las piezas
// ---------------------------------------------------------------------------

/**
 * Un ejercicio prescrito.
 *
 * Se guarda el NOMBRE y no el id de la biblioteca, igual que hacen las reglas:
 * un plan es historial (§3.5) y tiene que seguir explicándose aunque el
 * ejercicio se archive después.
 */
export interface EjercicioPlan {
  ejercicio: string;
  /** Series de aproximación. No cuentan para el volumen semanal. */
  seriesCalentamiento: number;
  seriesEfectivas: number;
  /** Rango, no cifra: es sobre lo que opera la doble progresión de Giovanni. */
  repMin: number;
  repMax: number;
  /** RPE de las series de trabajo previas a la última. */
  rpePrimeras?: number;
  /** RPE de la última. En su método casi siempre es mayor que el anterior. */
  rpeUltima?: number;
  descansoSeg: number;
  /** Técnica de intensidad: drop set, myo-reps, rest-pause… */
  tecnica?: string;
  /**
   * Alternativas ya aprobadas para ESTE atleta, congeladas al generar.
   *
   * Copia y no referencia, por lo mismo que `engine_runs.rules_fired`: si mañana
   * cambia la matriz de sustitución, este plan tiene que seguir ofreciendo lo
   * que ofrecía el día que se entregó.
   */
  sustitutos: string[];
  notas?: string;
}

/** Fase 1. Tiempo fijo y sin carga externa: es su especificación literal. */
export interface Preparacion {
  minutos: number;
  /** Movilidad articular y estiramiento activo del grupo que toca. */
  bloques: string[];
}

/** Fase 2. Donde vive el estímulo. */
export interface Central {
  ejercicios: EjercicioPlan[];
}

/** Fase 3. La que cambia según el objetivo. */
export interface Final {
  cierre: Cierre;
  minutos: number;
}

export interface DiaPlan {
  dia: number;
  /** "Torso (Empuje/Tracción)", "Pierna (Cuádriceps/Cadera)"… */
  titulo: string;
  preparacion: Preparacion;
  central: Central;
  final: Final;
}

export interface SemanaPlan {
  semana: number;
  tipo: TipoSemana;
  dias: DiaPlan[];
}

export interface Plan {
  /** Sube cuando la forma cambie de manera incompatible. */
  version: 1;
  periodizacion: Periodizacion;
  objetivo: Objetivo;
  diasPorSemana: number;
  semanas: SemanaPlan[];
}

export const VERSION_PLAN = 1 as const;

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const esEntero = (n: unknown, min: number, max: number): boolean =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

/**
 * Qué le pasa a este plan, en frases para la persona que lo está armando.
 *
 * Devuelve TODOS los problemas, no el primero: quien edita un mesociclo de seis
 * semanas no quiere descubrirlos de uno en uno.
 */
export function validarPlan(plan: Plan): string[] {
  const errores: string[] = [];

  if (plan.version !== VERSION_PLAN) {
    errores.push(`Versión de plan desconocida: ${String(plan.version)}.`);
  }
  if (!PERIODIZACIONES.includes(plan.periodizacion)) {
    errores.push(`Periodización desconocida: "${String(plan.periodizacion)}".`);
  }
  if (!OBJETIVOS.includes(plan.objetivo)) {
    errores.push(`Objetivo desconocido: "${String(plan.objetivo)}".`);
  }
  if (!esEntero(plan.diasPorSemana, 1, 7)) {
    errores.push("Los días por semana tienen que ir de 1 a 7.");
  }
  if (!Array.isArray(plan.semanas) || plan.semanas.length === 0) {
    errores.push("Un plan sin semanas no es un plan.");
    return errores;
  }

  plan.semanas.forEach((s, i) => {
    const donde = `Semana ${s.semana ?? i + 1}`;

    if (!esEntero(s.semana, 1, 104)) errores.push(`${donde}: número de semana inválido.`);
    if (!TIPOS_SEMANA.includes(s.tipo)) errores.push(`${donde}: tipo de semana desconocido.`);

    if (!Array.isArray(s.dias) || s.dias.length === 0) {
      errores.push(`${donde}: no tiene días.`);
      return;
    }
    if (s.dias.length !== plan.diasPorSemana) {
      errores.push(
        `${donde}: tiene ${s.dias.length} días y el plan dice ${plan.diasPorSemana}.`,
      );
    }

    s.dias.forEach((d) => {
      const dd = `${donde}, día ${d.dia}`;

      // Las tres fases son obligatorias por especificación suya, no por gusto:
      // "el sistema no debe permitir guardar ni iniciar una sesión si no se
      // cumple esta estructura".
      if (!d.preparacion || !Array.isArray(d.preparacion.bloques) || d.preparacion.bloques.length === 0) {
        errores.push(`${dd}: falta la fase de preparación.`);
      }
      if (!d.final || !CIERRES.includes(d.final.cierre)) {
        errores.push(`${dd}: falta la fase final o su cierre es desconocido.`);
      } else if (!FICHA_CIERRE[d.final.cierre].objetivo.includes(plan.objetivo)) {
        // No es un capricho: el cierre en Zona 2 existe para aprovechar el
        // glucógeno agotado, y ponerlo en un plan de fuerza se come la
        // recuperación sin aportar nada.
        errores.push(
          `${dd}: el cierre "${FICHA_CIERRE[d.final.cierre].nombre}" no corresponde a un plan de ${FICHA_OBJETIVO[plan.objetivo]}.`,
        );
      }
      if (!d.central || !Array.isArray(d.central.ejercicios) || d.central.ejercicios.length === 0) {
        errores.push(`${dd}: la fase central no tiene ejercicios.`);
        return;
      }

      d.central.ejercicios.forEach((e) => {
        const ee = `${dd}, "${e.ejercicio}"`;
        if (!e.ejercicio?.trim()) errores.push(`${dd}: hay un ejercicio sin nombre.`);
        if (!esEntero(e.seriesEfectivas, 1, 20)) {
          errores.push(`${ee}: las series efectivas tienen que ir de 1 a 20.`);
        }
        if (!esEntero(e.repMin, 1, 100) || !esEntero(e.repMax, 1, 100)) {
          errores.push(`${ee}: el rango de repeticiones no es válido.`);
        } else if (e.repMin > e.repMax) {
          // Invertido, la doble progresión nunca alcanzaría el techo y el
          // atleta se quedaría estancado sin que nada fallara.
          errores.push(`${ee}: el rango va al revés (${e.repMin}–${e.repMax}).`);
        }
        if (e.rpePrimeras !== undefined && (e.rpePrimeras < 1 || e.rpePrimeras > 10)) {
          errores.push(`${ee}: el RPE de las primeras series se sale de 1–10.`);
        }
        if (e.rpeUltima !== undefined && (e.rpeUltima < 1 || e.rpeUltima > 10)) {
          errores.push(`${ee}: el RPE de la última serie se sale de 1–10.`);
        }
        if (
          e.rpePrimeras !== undefined &&
          e.rpeUltima !== undefined &&
          e.rpeUltima < e.rpePrimeras
        ) {
          // En su método la última serie es la dura. Al revés suele ser un
          // cambio de sitio al teclear, y nadie lo notaría mirando el plan.
          errores.push(`${ee}: la última serie tiene menos RPE que las anteriores.`);
        }
      });
    });
  });

  return errores;
}

/** ¿Se puede guardar? Envoltorio legible para las pantallas. */
export function planValido(plan: Plan): boolean {
  return validarPlan(plan).length === 0;
}

// ---------------------------------------------------------------------------
// Lectura desde la base
// ---------------------------------------------------------------------------

/**
 * Lee `plan_data` con desconfianza.
 *
 * Devuelve `null` si no es un plan reconocible, en vez de un plan a medias: una
 * pantalla con medio mesociclo es peor que una que dice que no hay nada.
 */
export function leerPlan(crudo: unknown): Plan | null {
  if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) return null;
  const p = crudo as Plan;
  if (p.version !== VERSION_PLAN) return null;
  return validarPlan(p).length === 0 ? p : null;
}

// ---------------------------------------------------------------------------
// Consultas sobre un plan
// ---------------------------------------------------------------------------

/** Series efectivas de un ejercicio en todo el plan. El calentamiento no suma. */
export function seriesEfectivasDe(plan: Plan, ejercicio: string): number {
  let total = 0;
  for (const s of plan.semanas) {
    for (const d of s.dias) {
      for (const e of d.central.ejercicios) {
        if (e.ejercicio === ejercicio) total += e.seriesEfectivas;
      }
    }
  }
  return total;
}

/**
 * Series efectivas por ejercicio en UNA semana.
 *
 * Es la unidad en la que Giovanni razona el volumen —«series por grupo muscular
 * a la semana, de 10 a 22»— así que el recuento tiene que salir por semana y no
 * por plan. Agrupar por grupo muscular hace falta la biblioteca, y eso lo hace
 * quien la tenga: aquí solo se cuenta por ejercicio.
 */
export function seriesPorEjercicioEnSemana(semana: SemanaPlan): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const d of semana.dias) {
    for (const e of d.central.ejercicios) {
      cuenta[e.ejercicio] = (cuenta[e.ejercicio] ?? 0) + e.seriesEfectivas;
    }
  }
  return cuenta;
}

/** Todos los ejercicios que el plan nombra, sin repetir. */
export function ejerciciosDelPlan(plan: Plan): string[] {
  const vistos = new Set<string>();
  for (const s of plan.semanas) {
    for (const d of s.dias) {
      for (const e of d.central.ejercicios) vistos.add(e.ejercicio);
    }
  }
  return [...vistos];
}

/** Qué cierre le toca a un objetivo. Lo usa el generador para no equivocarse. */
export function cierrePara(objetivo: Objetivo): Cierre {
  return objetivo === "perdida_grasa" ? "cardio_zona2" : "recuperacion_activa";
}
