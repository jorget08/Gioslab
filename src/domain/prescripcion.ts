/**
 * Cómo se prescribe cada ejercicio dentro de su semana (método v7, 16-nov).
 *
 * Aparte de `metodo.ts` y `generador.ts` por tamaño, y porque son cuatro
 * piezas que Giovanni mandó juntas en su "Plan de corrección backend":
 *
 *   1. CADENCIA POR JERARQUÍA. "Eliminar la asignación fija de 3010… J1 3010
 *      o 2010, J2 3110, J3 2011". La de cada ejercicio (su matriz de 125) manda;
 *      sin ella, la de su jerarquía; sin jerarquía, la del objetivo.
 *   2. CONCÉNTRICA EXPLOSIVA. "En bloques de Fuerza o ATR (Realización), la
 *      concéntrica debe cambiar automáticamente a X". Solo en lo que no es
 *      aislamiento: un curl explosivo no es lo que pide.
 *   3. TOLERANCIA DE VOLUMEN. "Amplía el margen semanal en ±1 serie para que
 *      no arroje alerta si quedan 15 en lugar de 16."
 *   4. ONDULANTE DIARIO. "Alterna entre Sesión A y Sesión B de la misma
 *      semana… Día A 6-8 reps pesadas | Día B 10-12 estiramiento… 2010 vs
 *      4110". Las cifras son las de su ejemplo, y son DATO: él las cambia.
 *
 * Todo es opcional en el método: sin estas claves el plan sale como en la v6.
 */

import type { Jerarquia } from "@/domain/jerarquias";
import type { Resultado } from "@/domain/motor";
import { esCadencia, type Objetivo } from "@/domain/plan";

export interface SesionOndulante {
  repMin: number;
  repMax: number;
  cadencia: string;
}

export interface Prescripcion {
  toleranciaSeries: number;
  cadenciaPorJerarquia: Partial<Record<Jerarquia, string>>;
  explosiva: { bloques: string[]; objetivos: string[] };
  ondulanteDiario: { A: SesionOndulante; B: SesionOndulante } | null;
}

type Crudo = Record<string, unknown>;
const esObjeto = (v: unknown): v is Crudo => typeof v === "object" && v !== null && !Array.isArray(v);
const textos = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

export function validarPrescripcion(crudo: Crudo): string[] {
  const e: string[] = [];
  const t = crudo.tolerancia_series;
  if (t !== undefined && (!Number.isInteger(t) || (t as number) < 0 || (t as number) > 4)) {
    e.push("La tolerancia de series tiene que ir de 0 a 4.");
  }
  const cpj = crudo.cadencia_por_jerarquia;
  if (cpj !== undefined) {
    if (!esObjeto(cpj)) e.push("La cadencia por jerarquía no es un objeto.");
    else
      for (const [j, c] of Object.entries(cpj)) {
        if (!["1", "2", "3"].includes(j)) e.push(`Cadencia para una jerarquía que no existe: "${j}".`);
        if (!esCadencia(c)) e.push(`La cadencia de J${j} son cuatro cifras, como 3010.`);
      }
  }
  const x = crudo.cadencia_explosiva;
  if (x !== undefined && (!esObjeto(x) || !textos(x.bloques ?? []) || !textos(x.objetivos ?? []))) {
    e.push("La cadencia explosiva lleva listas de bloques y de objetivos.");
  }
  const o = crudo.ondulante_diario;
  if (o !== undefined) {
    for (const s of ["A", "B"] as const) {
      const f = esObjeto(o) ? o[s] : undefined;
      if (
        !esObjeto(f) ||
        !Number.isInteger(f.rep_min) ||
        !Number.isInteger(f.rep_max) ||
        (f.rep_min as number) < 1 ||
        (f.rep_min as number) > (f.rep_max as number) ||
        !esCadencia(f.cadencia)
      ) {
        e.push(`El ondulante diario: la sesión ${s} necesita su rango de repeticiones y su cadencia.`);
      }
    }
  }
  return e;
}

/** Lee lo ya validado. */
export function leerPrescripcion(crudo: Crudo): Prescripcion {
  const cpj = (crudo.cadencia_por_jerarquia as Record<string, string> | undefined) ?? {};
  const x = (crudo.cadencia_explosiva as Crudo | undefined) ?? {};
  const o = crudo.ondulante_diario as Record<"A" | "B", Crudo> | undefined;
  const sesion = (f: Crudo): SesionOndulante => ({
    repMin: f.rep_min as number,
    repMax: f.rep_max as number,
    cadencia: f.cadencia as string,
  });
  return {
    toleranciaSeries: (crudo.tolerancia_series as number | undefined) ?? 0,
    cadenciaPorJerarquia: Object.fromEntries(Object.entries(cpj).map(([j, c]) => [Number(j), c])),
    explosiva: {
      bloques: (x.bloques as string[] | undefined) ?? [],
      objetivos: (x.objetivos as string[] | undefined) ?? [],
    },
    ondulanteDiario: o ? { A: sesion(o.A), B: sesion(o.B) } : null,
  };
}

/** ¿Esta semana va con concéntrica explosiva? Con bloque manda el bloque; sin él, el objetivo. */
export function esExplosiva(p: Prescripcion, bloque: string | undefined, objetivo: Objetivo): boolean {
  return bloque ? p.explosiva.bloques.includes(bloque) : p.explosiva.objetivos.includes(objetivo);
}

/**
 * Qué sesión del ondulante diario es cada día: A, B, o ninguna.
 *
 * Se alterna dentro de cada SEGMENTO —la primera pierna de la semana es A, la
 * segunda B—, no por posición en la semana: en un Torso/Pierna/Torso/Pierna,
 * alternar por posición daría A a los dos torsos. Un segmento que solo sale una
 * vez (el Full Body de 3 días) no tiene con qué ondular y se queda como está.
 */
export function sesionesOndulantes(plantillas: { patrones: string[] }[]): ("A" | "B" | null)[] {
  const PIERNA = ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"];
  const TORSO = ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"];
  const segmento = (p: { patrones: string[] }) => {
    const pierna = p.patrones.some((x) => PIERNA.includes(x));
    const torso = p.patrones.some((x) => TORSO.includes(x));
    return pierna === torso ? null : pierna ? "pierna" : "torso";
  };
  const segmentos = plantillas.map(segmento);
  const vistos = new Map<string, number>();
  return segmentos.map((s) => {
    if (!s || segmentos.filter((x) => x === s).length < 2) return null;
    const n = vistos.get(s) ?? 0;
    vistos.set(s, n + 1);
    return n % 2 === 0 ? "A" : "B";
  });
}

/**
 * Repeticiones y cadencia de un ejercicio, de lo general a lo particular:
 * objetivo o tabla del modelo → sesión A/B del ondulante → lo que manda el
 * motor (la hipertensión fija 12–15). El motor va el último porque es
 * seguridad: manda sobre el método (regla 3 del generador).
 */
export function prescribir(args: {
  p: Prescripcion;
  repMin: number;
  repMax: number;
  cadenciaObjetivo?: string;
  cadenciaPropia: string | null;
  jerarquia: Jerarquia | null;
  aislamiento: boolean;
  explosiva: boolean;
  sesion: SesionOndulante | null;
  rangoMotor: Resultado["rangoRepeticiones"];
}): { repMin: number; repMax: number; cadencia?: string } {
  const { p, jerarquia, aislamiento } = args;
  const compuesto = !aislamiento && jerarquia !== 3;
  let cadencia =
    args.cadenciaPropia ?? (jerarquia ? p.cadenciaPorJerarquia[jerarquia] : undefined) ?? args.cadenciaObjetivo;
  let { repMin, repMax } = args;

  if (args.sesion) {
    repMin = args.sesion.repMin;
    repMax = args.sesion.repMax;
    if (compuesto) cadencia = args.sesion.cadencia;
  }
  if (cadencia && args.explosiva && compuesto) cadencia = `${cadencia.slice(0, 2)}X${cadencia.slice(3)}`;
  if (args.rangoMotor) {
    repMin = args.rangoMotor.min;
    repMax = args.rangoMotor.max;
  }
  return { repMin, repMax, ...(cadencia ? { cadencia } : {}) };
}

/**
 * El RPE que toca, después de que el motor diga la suya.
 *
 * `RPE = 10 − RIR` es conversión suya (2-sep). `fijo` clava, `delta` mueve y
 * `piso` pone un techo al RPE: un suelo de RIR 3 significa que no se puede
 * pasar de RPE 7, y eso viene de una regla de seguridad, así que recorta
 * siempre — nunca al revés.
 */
export function rpeConElMotor(
  base: { primeras: number; ultima: number },
  rir: Resultado["rir"],
): { primeras: number; ultima: number } {
  let primeras = base.primeras;
  let ultima = base.ultima;

  if (rir.fijo !== undefined) {
    primeras = 10 - rir.fijo;
    ultima = 10 - rir.fijo;
  }
  if (rir.delta !== undefined) {
    primeras -= rir.delta;
    ultima -= rir.delta;
  }
  if (rir.piso !== undefined) {
    const techo = 10 - rir.piso;
    primeras = Math.min(primeras, techo);
    ultima = Math.min(ultima, techo);
  }

  const acotar = (n: number) => Math.max(1, Math.min(10, Math.round(n * 2) / 2));
  primeras = acotar(primeras);
  ultima = acotar(ultima);
  // Si el recorte pisa el orden, mandan las dos iguales antes que una última
  // serie más suave que las anteriores, que `validarPlan` rechaza.
  if (ultima < primeras) primeras = ultima;

  return { primeras, ultima };
}
