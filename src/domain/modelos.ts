/**
 * Modelos de periodización que cambian el plan semana a semana (5.2, v3).
 *
 * Hasta la v2 el modelo era un rótulo: el generador hacía lo mismo para
 * lineal, ondulante y ATR. Giovanni pidió el 26-oct que los principiantes
 * entren en LINEAL, y mandar a alguien a lineal sin cambiarle el plan es el
 * fallo que ya reportó en septiembre con el ATR: el rótulo dice una cosa y las
 * semanas otra.
 *
 * Su PDF "Planificación de mesociclos" (25-sep) trae el lineal semana a semana
 * —series, repeticiones e intensidad de cada una, con la descarga al final—, y
 * eso es lo que se carga aquí. Como el resto del método, la tabla es DATO
 * (`training_methods.method_data.modelos`) y la edita él (§3.1). Aquí solo se
 * lee con desconfianza.
 */

import { PERIODIZACIONES, type Periodizacion } from "@/domain/plan";

/**
 * Una fila de su tabla: lo que se hace esa semana en cada ejercicio.
 *
 * Repeticiones y RPE son opcionales: el lineal los fija semana a semana, pero
 * el de bloques solo mueve las series y deja que el rango y el RPE salgan del
 * objetivo, como en `gymapp`. Lo que la fila no dice, lo dice el objetivo.
 */
export interface SemanaModelo {
  series: number;
  repMin?: number;
  repMax?: number;
  rpePrimeras?: number;
  rpeUltima?: number;
  descarga: boolean;
  /** Nombre del bloque al que pertenece la semana, para la nota del día. */
  bloque?: string;
}

export interface Modelo {
  semanas: SemanaModelo[];
  /**
   * Cuántas semanas puede llegar a tener cada bloque como poco (3-nov). Él:
   * "hay avanzados que necesitan dos o tres semanas de intensificación… poder
   * seleccionar eso". El entrenador acorta un bloque hasta aquí; sin la clave,
   * el bloque no se acorta.
   */
  minimoPorBloque: Record<string, number>;
}

/** Un bloque del modelo, en orden, con cuántas semanas trae y cuántas admite. */
export interface BloqueModelo {
  nombre: string;
  semanas: number;
  minimo: number;
}

type Crudo = Record<string, unknown>;
const esObjeto = (v: unknown): v is Crudo => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const esPeriodizacion = (v: unknown): v is Periodizacion =>
  typeof v === "string" && (PERIODIZACIONES as readonly string[]).includes(v);

/**
 * Problemas de `periodizacion_por_nivel`, `periodizacion_por_meta` y `modelos`. Son OPCIONALES:
 * un método sin ellos es la v2, que sigue siendo válida.
 */
export function validarModelos(crudo: Crudo): string[] {
  const e: string[] = [];

  for (const [clave, que] of [
    ["periodizacion_por_nivel", "nivel"],
    ["periodizacion_por_meta", "meta"],
  ] as const) {
    const mapa = crudo[clave];
    if (mapa === undefined) continue;
    if (!esObjeto(mapa)) e.push(`La periodización por ${que} no es un objeto.`);
    else
      for (const [k, p] of Object.entries(mapa)) {
        if (!esPeriodizacion(p)) e.push(`La ${que} "${k}" apunta a una periodización desconocida.`);
      }
  }

  const modelos = crudo.modelos;
  if (modelos === undefined) return e;
  if (!esObjeto(modelos)) return [...e, "Los modelos no son un objeto."];

  for (const [nombre, m] of Object.entries(modelos)) {
    if (!esPeriodizacion(nombre)) e.push(`Modelo desconocido: "${nombre}".`);
    const semanas = esObjeto(m) ? m.semanas : undefined;
    if (!Array.isArray(semanas) || semanas.length === 0) {
      e.push(`El modelo "${nombre}" no tiene semanas.`);
      continue;
    }
    const porBloque = new Map<string, number>();
    for (const s of semanas) {
      if (esObjeto(s) && typeof s.bloque === "string") porBloque.set(s.bloque, (porBloque.get(s.bloque) ?? 0) + 1);
    }
    const minimos = esObjeto(m) ? m.minimo_por_bloque : undefined;
    if (minimos !== undefined) {
      if (!esObjeto(minimos)) e.push(`El modelo "${nombre}": el mínimo por bloque no es un objeto.`);
      else
        for (const [bloque, minimo] of Object.entries(minimos)) {
          const total = porBloque.get(bloque);
          if (total === undefined) e.push(`El modelo "${nombre}" no tiene ningún bloque "${bloque}".`);
          else if (!Number.isInteger(minimo) || (minimo as number) < 1 || (minimo as number) > total) {
            e.push(`El modelo "${nombre}": el mínimo del bloque "${bloque}" tiene que ir de 1 a ${total}.`);
          }
        }
    }
    semanas.forEach((s, i) => {
      const donde = `Modelo "${nombre}", semana ${i + 1}`;
      const f = esObjeto(s) ? s : {};
      const series = num(f.series);
      if (series === null || !Number.isInteger(series) || series < 1 || series > 20) {
        e.push(`${donde}: series inválidas.`);
      }
      // Las repeticiones van las dos o ninguna: media pareja no es un rango.
      if (f.rep_min !== undefined || f.rep_max !== undefined) {
        const repMin = num(f.rep_min);
        const repMax = num(f.rep_max);
        if (repMin === null || repMax === null || repMin < 1 || repMin > repMax) {
          e.push(`${donde}: el rango de repeticiones no es válido.`);
        }
      }
      for (const k of ["rpe", "rpe_primeras", "rpe_ultima"] as const) {
        if (f[k] === undefined) continue;
        const v = num(f[k]);
        if (v === null || v < 1 || v > 10) e.push(`${donde}: el RPE se sale de 1–10.`);
      }
      const rpe1 = num(f.rpe_primeras);
      const rpe2 = num(f.rpe_ultima);
      if (rpe1 !== null && rpe2 !== null && rpe2 < rpe1) {
        e.push(`${donde}: la última serie tiene menos RPE que las anteriores.`);
      }
    });
  }
  return e;
}

/** Lee lo ya validado. */
export function leerModelos(crudo: Crudo): {
  periodizacionPorNivel: Record<string, Periodizacion>;
  periodizacionPorMeta: Record<string, Periodizacion>;
  modelos: Partial<Record<Periodizacion, Modelo>>;
} {
  const modelos: Partial<Record<Periodizacion, Modelo>> = {};
  for (const [nombre, m] of Object.entries((crudo.modelos as Crudo | undefined) ?? {})) {
    modelos[nombre as Periodizacion] = {
      semanas: ((m as Crudo).semanas as Crudo[]).map((s) => {
        // `rpe` a secas es la forma corta del lineal: un RPE para todas.
        const rpe = num(s.rpe);
        const fila: SemanaModelo = { series: s.series as number, descarga: s.descarga === true };
        if (num(s.rep_min) !== null) fila.repMin = s.rep_min as number;
        if (num(s.rep_max) !== null) fila.repMax = s.rep_max as number;
        const rpe1 = num(s.rpe_primeras) ?? rpe;
        const rpe2 = num(s.rpe_ultima) ?? rpe;
        if (rpe1 !== null) fila.rpePrimeras = rpe1;
        if (rpe2 !== null) fila.rpeUltima = rpe2;
        if (typeof s.bloque === "string") fila.bloque = s.bloque;
        return fila;
      }),
      minimoPorBloque: ((m as Crudo).minimo_por_bloque as Record<string, number> | undefined) ?? {},
    };
  }
  return {
    periodizacionPorNivel: (crudo.periodizacion_por_nivel as Record<string, Periodizacion> | undefined) ?? {},
    periodizacionPorMeta: (crudo.periodizacion_por_meta as Record<string, Periodizacion> | undefined) ?? {},
    modelos,
  };
}

/**
 * La fila que le toca a la semana N. Pasada la última se vuelve a empezar: un
 * plan más largo que su tabla es otro mesociclo igual, no una semana inventada.
 */
export function semanaDelModelo(modelo: Modelo, n: number): SemanaModelo {
  return modelo.semanas[(n - 1) % modelo.semanas.length];
}

/** Los bloques del modelo en su orden. Vacío si sus semanas no los nombran. */
export function bloquesDe(modelo: Modelo): BloqueModelo[] {
  const bloques: BloqueModelo[] = [];
  for (const s of modelo.semanas) {
    if (!s.bloque) continue;
    const b = bloques.find((x) => x.nombre === s.bloque);
    if (b) b.semanas += 1;
    else bloques.push({ nombre: s.bloque, semanas: 1, minimo: 0 });
  }
  for (const b of bloques) b.minimo = modelo.minimoPorBloque[b.nombre] ?? b.semanas;
  return bloques;
}

/**
 * El modelo con los bloques acortados a lo que eligió el entrenador.
 *
 * Se quitan las ÚLTIMAS semanas de cada bloque: lo que se recorta es cuánto
 * dura esa fase, no cómo empieza. Lo que pida por debajo del mínimo o por
 * encima de lo que trae la tabla se lleva a esos topes.
 */
export function recortarModelo(modelo: Modelo, porBloque: Record<string, number>): Modelo {
  const quedan = new Map(
    bloquesDe(modelo).map((b) => [
      b.nombre,
      Math.min(b.semanas, Math.max(b.minimo, Math.round(porBloque[b.nombre] ?? b.semanas))),
    ]),
  );
  const vistas = new Map<string, number>();
  const semanas = modelo.semanas.filter((s) => {
    if (!s.bloque) return true;
    const n = (vistas.get(s.bloque) ?? 0) + 1;
    vistas.set(s.bloque, n);
    return n <= (quedan.get(s.bloque) ?? n);
  });
  return { ...modelo, semanas };
}
