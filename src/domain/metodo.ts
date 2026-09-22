/**
 * El método de programación de Giovanni (tarea 5.2).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES ESTO
 * ---------------------------------------------------------------------------
 *
 * El LECTOR de `training_methods.method_data`. Aquí no hay ni una cifra suya:
 * hay el vocabulario con el que se leen las suyas y la desconfianza necesaria
 * para no dar por bueno un método a medias. Sus números están en la migración
 * `20260903100000_metodo_programacion.sql` y los edita él, sin desplegar (§3.1).
 *
 * Es el mismo reparto que con las reglas: `domain/reglas.ts` define la
 * gramática y `rules` guarda la matriz. Si mañana sube las series de espalda a
 * 24, este archivo no cambia.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ SE VALIDA TANTO SI YA HAY UN CHECK EN LA BASE
 * ---------------------------------------------------------------------------
 *
 * El CHECK comprueba que la fila es un método. Que sus tres objetivos tengan
 * parámetros, que los rangos no vayan al revés y que el RPE de la última serie
 * no sea menor que el de las anteriores, no. Y un método con el rango invertido
 * no falla al guardarse: falla al generar el plan de alguien, semanas después.
 */

import {
  OBJETIVOS,
  PERIODIZACIONES,
  type Objetivo,
  type Periodizacion,
} from "@/domain/plan";
import { esPatron, type Patron } from "@/domain/patrones";

// ---------------------------------------------------------------------------
// La forma
// ---------------------------------------------------------------------------

/** Repeticiones, RPE y descanso de un objetivo. Su tabla del 31-ago. */
export interface Parametros {
  repMin: number;
  repMax: number;
  /** Piso de su rango de RPE: las series previas a la última. */
  rpePrimeras: number;
  /** Techo de su rango: la última serie, que en su método es la dura. */
  rpeUltima: number;
  /** Aislamiento. Su plan real: "Monoarticulares 60–75 s". */
  descansoMinSeg: number;
  /** Compuesto. Su plan real: "Multiarticulares 90–120 s". */
  descansoMaxSeg: number;
}

export interface RangoSeries {
  min: number;
  max: number;
}

/**
 * Un día de su reparto semanal.
 *
 * `musculos` solo existe donde él acotó el día por músculo —sus dos variantes
 * de mujer distinguen "cuádriceps y glúteo" de "isquiosurales y glúteo"—. Sin
 * ese campo los dos días de pierna saldrían idénticos.
 */
export interface PlantillaDia {
  titulo: string;
  patrones: Patron[];
  musculos?: string[];
}

export interface Reparto {
  dias: number;
  /** `null` = vale para cualquiera. "femenino" = su variante de mujer. */
  sexo: string | null;
  plantilla: PlantillaDia[];
}

export interface SeriesPorEjercicio {
  compuesto: number;
  aislamiento: number;
  /** Suelo y techo al repartir el volumen semanal entre los ejercicios. */
  minimo: number;
  maximo: number;
  calentamientoCompuesto: number;
  calentamientoAislamiento: number;
}

export interface Progresion {
  tipo: string;
  incrementoMinPct: number;
  incrementoMaxPct: number;
  descripcion: string;
}

export interface Descarga {
  /** Cada cuántas semanas toca descarga. Él dijo "la 4ª o la 6ª". */
  cadaSemanas: number;
  cadaSemanasAlternativa: number;
  /** Cuánto volumen se le quita. Él: 40–50 %. */
  reduccionVolumenPct: number;
  rpePrimeras: number;
  rpeUltima: number;
  supercompensacionDespues: boolean;
}

export interface Fases {
  preparacion: { minutos: number; bloques: string[] };
  cierre: Record<"recuperacion_activa" | "cardio_zona2", { minutos: number }>;
}

export interface Metodo {
  version: 1;
  /**
   * Los cinco objetivos del atleta contra sus tres.
   *
   * `null` es un valor legítimo y significa "él no lo dijo". Hoy le pasa a
   * Mantenimiento. El generador entonces se lo pregunta al entrenador en vez de
   * elegir por parecido: meter un mantenimiento en hipertrofia es prescribir un
   * superávit de volumen a quien pidió sostenerse.
   */
  objetivoPorMeta: Record<string, Objetivo | null>;
  periodizacionPorObjetivo: Record<Objetivo, Periodizacion>;
  parametros: Record<Objetivo, Parametros>;
  seriesSemanales: Record<string, RangoSeries>;
  grupoPorMusculo: Record<string, string>;
  seriesPorEjercicio: SeriesPorEjercicio;
  progresion: Progresion;
  descarga: Descarga;
  fases: Fases;
  repartos: Reparto[];
}

export const VERSION_METODO = 1 as const;

// ---------------------------------------------------------------------------
// Lectura desde la base
// ---------------------------------------------------------------------------

type Crudo = Record<string, unknown>;

const esObjeto = (v: unknown): v is Crudo =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const esObjetivo = (v: unknown): v is Objetivo =>
  typeof v === "string" && (OBJETIVOS as readonly string[]).includes(v);

const esPeriodizacion = (v: unknown): v is Periodizacion =>
  typeof v === "string" && (PERIODIZACIONES as readonly string[]).includes(v);

/**
 * Qué le pasa a este método, en frases para quien lo esté cargando.
 *
 * Devuelve TODOS los problemas por lo mismo que `validarPlan`: quien está
 * subiendo una versión nueva no quiere descubrirlos de uno en uno.
 */
export function validarMetodo(crudo: unknown): string[] {
  const e: string[] = [];
  if (!esObjeto(crudo)) return ["El método no es un objeto."];

  if (crudo.version !== VERSION_METODO) {
    e.push(`Versión de método desconocida: ${String(crudo.version)}.`);
  }

  // --- Objetivos y periodización -------------------------------------------
  if (!esObjeto(crudo.objetivo_por_meta)) {
    e.push("Falta el mapeo de objetivos del atleta (objetivo_por_meta).");
  } else {
    for (const [meta, valor] of Object.entries(crudo.objetivo_por_meta)) {
      // `null` es válido: es "no lo ha dicho". Lo que no vale es un objetivo
      // inventado, que el generador aplicaría sin enterarse.
      if (valor !== null && !esObjetivo(valor)) {
        e.push(`"${meta}" apunta a un objetivo desconocido: "${String(valor)}".`);
      }
    }
  }

  if (!esObjeto(crudo.periodizacion_por_objetivo)) {
    e.push("Falta la periodización por objetivo.");
  } else {
    for (const o of OBJETIVOS) {
      if (!esPeriodizacion(crudo.periodizacion_por_objetivo[o])) {
        e.push(`El objetivo "${o}" no tiene periodización válida.`);
      }
    }
  }

  // --- Parámetros por objetivo ---------------------------------------------
  if (!esObjeto(crudo.parametros)) {
    e.push("Faltan los parámetros por objetivo.");
  } else {
    for (const o of OBJETIVOS) {
      const p = crudo.parametros[o];
      if (!esObjeto(p)) {
        e.push(`El objetivo "${o}" no tiene parámetros.`);
        continue;
      }
      const repMin = num(p.rep_min);
      const repMax = num(p.rep_max);
      const rpe1 = num(p.rpe_primeras);
      const rpe2 = num(p.rpe_ultima);
      const desMin = num(p.descanso_min_seg);
      const desMax = num(p.descanso_max_seg);

      if (repMin === null || repMax === null || repMin < 1 || repMin > repMax) {
        e.push(`"${o}": el rango de repeticiones no es válido.`);
      }
      if (rpe1 === null || rpe2 === null || rpe1 < 1 || rpe2 > 10) {
        e.push(`"${o}": el RPE se sale de 1–10.`);
      } else if (rpe2 < rpe1) {
        // En su método la última serie es la dura. Al revés, el generador
        // produciría planes que `validarPlan` rechaza uno a uno, y el error
        // aparecería lejísimos de su causa.
        e.push(`"${o}": la última serie tiene menos RPE que las anteriores.`);
      }
      if (desMin === null || desMax === null || desMin < 10 || desMin > desMax) {
        e.push(`"${o}": el rango de descanso no es válido.`);
      }
    }
  }

  // --- Volumen --------------------------------------------------------------
  if (!esObjeto(crudo.series_semanales)) {
    e.push("Faltan las series semanales por grupo muscular.");
  } else {
    for (const [grupo, rango] of Object.entries(crudo.series_semanales)) {
      const r = esObjeto(rango) ? rango : null;
      const min = r ? num(r.min) : null;
      const max = r ? num(r.max) : null;
      if (min === null || max === null || min < 1 || min > max) {
        e.push(`El grupo "${grupo}" tiene un rango de series inválido.`);
      }
    }
  }

  if (!esObjeto(crudo.grupo_por_musculo)) {
    e.push("Falta la traducción de músculo a grupo muscular.");
  } else if (esObjeto(crudo.series_semanales)) {
    for (const [musculo, grupo] of Object.entries(crudo.grupo_por_musculo)) {
      if (typeof grupo !== "string" || !(grupo in crudo.series_semanales)) {
        // Un músculo que apunta a un grupo sin rango no cuenta contra ningún
        // tope: su volumen quedaría sin control y en silencio.
        e.push(`El músculo "${musculo}" apunta a un grupo sin series: "${String(grupo)}".`);
      }
    }
  }

  const spe = crudo.series_por_ejercicio;
  if (!esObjeto(spe)) {
    e.push("Faltan las series por ejercicio.");
  } else {
    const min = num(spe.minimo);
    const max = num(spe.maximo);
    if (min === null || max === null || min < 1 || min > max) {
      e.push("El suelo y el techo de series por ejercicio no son válidos.");
    }
    for (const k of ["compuesto", "aislamiento"] as const) {
      const v = num(spe[k]);
      if (v === null || (min !== null && max !== null && (v < min || v > max))) {
        e.push(`Las series de "${k}" se salen del suelo y el techo.`);
      }
    }
  }

  // --- Progresión, descarga y fases ----------------------------------------
  if (!esObjeto(crudo.progresion)) e.push("Falta la progresión.");

  const d = crudo.descarga;
  if (!esObjeto(d)) {
    e.push("Falta la descarga.");
  } else {
    const cada = num(d.cada_semanas);
    const pct = num(d.reduccion_volumen_pct);
    if (cada === null || cada < 2 || cada > 12) {
      e.push("La descarga tiene que caer entre la 2ª y la 12ª semana.");
    }
    if (pct === null || pct <= 0 || pct >= 100) {
      e.push("La reducción de volumen de la descarga no es un porcentaje válido.");
    }
  }

  const f = crudo.fases;
  if (!esObjeto(f) || !esObjeto(f.preparacion) || !esObjeto(f.cierre)) {
    e.push("Faltan las tres fases de la sesión.");
  } else {
    const bloques = (f.preparacion as Crudo).bloques;
    if (!Array.isArray(bloques) || bloques.length === 0) {
      // Las tres fases son obligatorias por especificación suya (§5.1). Un
      // método sin bloques de preparación genera planes que no se pueden
      // guardar.
      e.push("La fase de preparación no tiene bloques.");
    }
    for (const c of ["recuperacion_activa", "cardio_zona2"] as const) {
      if (!esObjeto((f.cierre as Crudo)[c])) e.push(`Falta el cierre "${c}".`);
    }
  }

  // --- Reparto semanal ------------------------------------------------------
  if (!Array.isArray(crudo.repartos) || crudo.repartos.length === 0) {
    e.push("Un método sin reparto de la semana no sirve para generar nada.");
  } else {
    crudo.repartos.forEach((r, i) => {
      if (!esObjeto(r)) {
        e.push(`El reparto ${i + 1} no es un objeto.`);
        return;
      }
      const dias = num(r.dias);
      if (dias === null || dias < 1 || dias > 7) {
        e.push(`El reparto ${i + 1} tiene un número de días inválido.`);
      }
      if (!Array.isArray(r.plantilla) || r.plantilla.length !== dias) {
        e.push(`El reparto de ${String(r.dias)} días no tiene ${String(r.dias)} días.`);
        return;
      }
      r.plantilla.forEach((dia, j) => {
        const donde = `reparto de ${String(r.dias)} días, día ${j + 1}`;
        if (!esObjeto(dia) || typeof dia.titulo !== "string" || !dia.titulo.trim()) {
          e.push(`El ${donde} no tiene título.`);
          return;
        }
        if (!Array.isArray(dia.patrones) || dia.patrones.length === 0) {
          e.push(`El ${donde} no tiene patrones.`);
          return;
        }
        for (const p of dia.patrones) {
          // Un patrón fuera del catálogo no encuentra ejercicios y deja el día
          // vacío sin que nada falle.
          if (typeof p !== "string" || !esPatron(p)) {
            e.push(`El ${donde} nombra un patrón desconocido: "${String(p)}".`);
          }
        }
      });
    });
  }

  return e;
}

/**
 * Lee el método con desconfianza. `null` si no es utilizable.
 *
 * Igual que `leerPlan`: o está entero o no está. Un método a medias generaría
 * planes a medias, y eso se descubre en la pantalla del entrenador.
 */
export function leerMetodo(crudo: unknown): Metodo | null {
  if (validarMetodo(crudo).length > 0) return null;
  const c = crudo as Crudo;

  const parametros = {} as Record<Objetivo, Parametros>;
  for (const o of OBJETIVOS) {
    const p = (c.parametros as Crudo)[o] as Crudo;
    parametros[o] = {
      repMin: p.rep_min as number,
      repMax: p.rep_max as number,
      rpePrimeras: p.rpe_primeras as number,
      rpeUltima: p.rpe_ultima as number,
      descansoMinSeg: p.descanso_min_seg as number,
      descansoMaxSeg: p.descanso_max_seg as number,
    };
  }

  const spe = c.series_por_ejercicio as Crudo;
  const d = c.descarga as Crudo;
  const pr = c.progresion as Crudo;
  const f = c.fases as Crudo;
  const prep = f.preparacion as Crudo;
  const cierre = f.cierre as Crudo;

  return {
    version: VERSION_METODO,
    objetivoPorMeta: c.objetivo_por_meta as Record<string, Objetivo | null>,
    periodizacionPorObjetivo: c.periodizacion_por_objetivo as Record<Objetivo, Periodizacion>,
    parametros,
    seriesSemanales: c.series_semanales as Record<string, RangoSeries>,
    grupoPorMusculo: c.grupo_por_musculo as Record<string, string>,
    seriesPorEjercicio: {
      compuesto: spe.compuesto as number,
      aislamiento: spe.aislamiento as number,
      minimo: spe.minimo as number,
      maximo: spe.maximo as number,
      calentamientoCompuesto: (spe.calentamiento_compuesto as number) ?? 0,
      calentamientoAislamiento: (spe.calentamiento_aislamiento as number) ?? 0,
    },
    progresion: {
      tipo: pr.tipo as string,
      incrementoMinPct: pr.incremento_min_pct as number,
      incrementoMaxPct: pr.incremento_max_pct as number,
      descripcion: (pr.descripcion as string) ?? "",
    },
    descarga: {
      cadaSemanas: d.cada_semanas as number,
      cadaSemanasAlternativa: (d.cada_semanas_alternativa as number) ?? (d.cada_semanas as number),
      reduccionVolumenPct: d.reduccion_volumen_pct as number,
      rpePrimeras: d.rpe_primeras as number,
      rpeUltima: d.rpe_ultima as number,
      supercompensacionDespues: Boolean(d.supercompensacion_despues),
    },
    fases: {
      preparacion: {
        minutos: (prep.minutos as number) ?? 10,
        bloques: prep.bloques as string[],
      },
      cierre: {
        recuperacion_activa: cierre.recuperacion_activa as { minutos: number },
        cardio_zona2: cierre.cardio_zona2 as { minutos: number },
      },
    },
    repartos: (c.repartos as Crudo[]).map((r) => ({
      dias: r.dias as number,
      sexo: (r.sexo as string | null) ?? null,
      plantilla: (r.plantilla as Crudo[]).map((dia) => ({
        titulo: dia.titulo as string,
        patrones: dia.patrones as Patron[],
        musculos: Array.isArray(dia.musculos) ? (dia.musculos as string[]) : undefined,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Su objetivo de programación a partir del del atleta.
 *
 * `null` = él no ha dicho cómo se programa esa meta. Hay que preguntárselo al
 * entrenador, no resolverlo por parecido.
 */
export function objetivoDeMeta(metodo: Metodo, meta: string | null | undefined): Objetivo | null {
  if (!meta) return null;
  return metodo.objetivoPorMeta[meta] ?? null;
}

export function periodizacionPara(metodo: Metodo, objetivo: Objetivo): Periodizacion {
  return metodo.periodizacionPorObjetivo[objetivo];
}

/**
 * El reparto que le toca a alguien que entrena N días.
 *
 * Su variante de mujer manda cuando existe para esos días; si no existe —el
 * reparto de 3 días, que no desdobló— se usa el general. Devolver `null` sería
 * dejar sin plan a una mujer que entrena tres días.
 */
export function repartoPara(metodo: Metodo, dias: number, sexo?: string | null): Reparto | null {
  const deEsosDias = metodo.repartos.filter((r) => r.dias === dias);
  if (deEsosDias.length === 0) return null;
  return deEsosDias.find((r) => r.sexo === sexo) ?? deEsosDias.find((r) => r.sexo === null) ?? null;
}

/** Cuántos días por semana sabe repartir. Lo que se le ofrece al entrenador. */
export function diasDisponibles(metodo: Metodo): number[] {
  return [...new Set(metodo.repartos.map((r) => r.dias))].sort((a, b) => a - b);
}

/** El grupo de su tabla al que pertenece un músculo, o `null` si no lo cubre. */
export function grupoDeMusculo(metodo: Metodo, musculo: string | null | undefined): string | null {
  if (!musculo) return null;
  return metodo.grupoPorMusculo[musculo] ?? null;
}

/**
 * Rango de series semanales de un grupo, o `null` si no tiene.
 *
 * Hoy le pasa al core: su tabla tiene cinco filas y core no es una. Un grupo sin
 * rango se prescribe sin tope declarado, y el generador lo dice en vez de
 * inventarle uno.
 */
export function seriesSemanalesDe(metodo: Metodo, grupo: string | null): RangoSeries | null {
  if (!grupo) return null;
  return metodo.seriesSemanales[grupo] ?? null;
}

/**
 * Los dos patrones de aislamiento, que cobran menos series y menos descanso.
 *
 * Es la misma frontera que usa su anexo (`is_compound_main` contra
 * `is_accessory_isolation`) y la que su plan real respeta sin una excepción.
 */
export function esAislamiento(patron: string | null | undefined): boolean {
  return patron === "isolation_accessory" || patron === "core_anti_flexion_extension";
}
