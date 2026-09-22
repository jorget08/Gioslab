/**
 * El reparto del volumen semanal (parte de la tarea 5.3).
 *
 * Su método razona en series POR GRUPO MUSCULAR Y SEMANA —«de 10 a 22 según el
 * grupo»— y un plan se escribe en series POR EJERCICIO. Todo este archivo es esa
 * conversión, que resultó tener dos mitades distintas:
 *
 *   · Faltan SERIES  → se suben o se bajan, dentro del suelo y el techo por
 *     ejercicio (`ajustarVolumen`).
 *   · Faltan EJERCICIOS → con un solo curl en la semana no se llega a sus 8
 *     series de brazo ni poniéndole el techo de 5, así que hay que meter otro
 *     (`completarVolumen`).
 *
 * Confundir las dos es el fallo que tuvo la primera versión: subía series a un
 * grupo que necesitaba otro ejercicio, se quedaba corta y avisaba de algo que sí
 * tenía arreglo.
 *
 * Vive aparte de `generador.ts` porque juntos pasaban de 500 líneas y porque son
 * dos cosas: uno decide QUÉ ejercicios y el otro CUÁNTAS series.
 */

import { seriesSemanalesDe, type Metodo, type PlantillaDia } from "@/domain/metodo";
import type { Resultado } from "@/domain/motor";

/** Un ejercicio aprobado por el motor, con lo que hace falta para colocarlo. */
export interface Candidato {
  nombre: string;
  patron: string;
  musculo: string | null;
  grupo: string | null;
  aislamiento: boolean;
  prioritario: boolean;
  modificadores: string[];
  sustitutos: string[];
}

/** Un candidato ya colocado en un día, con sus series antes de ajustar. */
export interface Colocado {
  candidato: Candidato;
  series: number;
}

/** ¿Este ejercicio puede ir en este día de su reparto? */
export function cabeEnElDia(c: Candidato, plantilla: PlantillaDia): boolean {
  return (
    (plantilla.patrones as readonly string[]).includes(c.patron) &&
    (!plantilla.musculos || (c.musculo !== null && plantilla.musculos.includes(c.musculo)))
  );
}

/**
 * El rango semanal que le toca a un grupo, con el motor por delante.
 *
 * Su `volumen_series` (nivel 4) sustituye al rango del método y su
 * `volumen_factor` (nivel 2) escala lo que quede: el método es la dosis por
 * defecto, el motor es lo que ESE atleta tolera.
 */
function rangoDelGrupo(
  grupo: string,
  metodo: Metodo,
  resultado: Resultado,
): { min: number; max: number } | null {
  const base = resultado.volumenSeries ?? seriesSemanalesDe(metodo, grupo);
  if (!base) return null;
  const f = resultado.volumenFactor;
  return {
    min: Math.max(1, Math.round(base.min * f)),
    max: Math.max(1, Math.round(base.max * f)),
  };
}

/** Los grupos que hoy tiene el plan y cuántos ejercicios lleva cada uno. */
function ejerciciosPorGrupo(semana: Colocado[][]): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const c of semana.flat()) {
    if (c.candidato.grupo) cuenta.set(c.candidato.grupo, (cuenta.get(c.candidato.grupo) ?? 0) + 1);
  }
  return cuenta;
}

/**
 * Añade ejercicios cuando un grupo no llega a su mínimo ni con el techo puesto.
 *
 * Su tabla pide 8 series de brazo a la semana y el techo por ejercicio es 5:
 * con un solo curl en toda la semana no se llega, por mucho que se suban las
 * series. Lo que falta no son series, son ejercicios, y eso no lo arregla
 * `ajustarVolumen`.
 *
 * Se añade al día que YA entrena ese grupo —el aislamiento de brazo va donde
 * está el torso— y, si ninguno lo entrena, al más vacío.
 */
export function completarVolumen(
  semana: Colocado[][],
  plantillas: PlantillaDia[],
  candidatos: Candidato[],
  metodo: Metodo,
  resultado: Resultado,
): void {
  const { maximo } = metodo.seriesPorEjercicio;
  const seriesBase = (c: Candidato) =>
    c.aislamiento ? metodo.seriesPorEjercicio.aislamiento : metodo.seriesPorEjercicio.compuesto;

  let guardia = 30;
  while (guardia-- > 0) {
    const cuenta = ejerciciosPorGrupo(semana);
    const enPlan = new Set(semana.flat().map((c) => c.candidato.nombre));

    // Un grupo al que no le da ni multiplicando por el techo de series.
    const faltos = [...cuenta.keys()]
      .filter((g) => {
        const rango = rangoDelGrupo(g, metodo, resultado);
        return rango !== null && (cuenta.get(g) ?? 0) * maximo < rango.min;
      })
      .sort((a, b) => a.localeCompare(b, "es"));

    let anadido = false;
    for (const grupo of faltos) {
      const opciones = candidatos
        .filter((c) => c.grupo === grupo && !enPlan.has(c.nombre))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

      for (const cand of opciones) {
        const dias = semana
          .map((dia, i) => ({ dia, i }))
          .filter(
            ({ dia, i }) =>
              cabeEnElDia(cand, plantillas[i]) && dia.length < metodo.ejerciciosPorDia.max,
          )
          .sort(
            (a, b) =>
              Number(b.dia.some((c) => c.candidato.grupo === grupo)) -
                Number(a.dia.some((c) => c.candidato.grupo === grupo)) ||
              a.dia.length - b.dia.length ||
              a.i - b.i,
          );

        if (dias.length > 0) {
          dias[0].dia.push({ candidato: cand, series: seriesBase(cand) });
          anadido = true;
          break;
        }
      }
      if (anadido) break;
    }
    if (!anadido) return;
  }
}

/**
 * Ajusta las series para caer dentro de su rango semanal por grupo muscular.
 *
 * Su método razona en series POR GRUPO Y SEMANA (10–22 según grupo); un plan se
 * escribe en series POR EJERCICIO. Aquí se reparte la diferencia: se sube al que
 * menos tiene y se baja al que más, dentro del suelo y el techo por ejercicio.
 *
 * Cuando no se llega —porque el motor dejó fuera media biblioteca— NO se fuerza:
 * se avisa con el número exacto. Es la diferencia entre un plan que cumple su
 * método y uno que lo aparenta.
 */
export function ajustarVolumen(
  semana: Colocado[][],
  metodo: Metodo,
  resultado: Resultado,
  avisos: string[],
): void {
  const { minimo, maximo } = metodo.seriesPorEjercicio;
  const todos = semana.flat();
  const grupos = [...new Set(todos.map((c) => c.candidato.grupo).filter((g): g is string => !!g))];

  for (const grupo of grupos.sort((a, b) => a.localeCompare(b, "es"))) {
    const rango = rangoDelGrupo(grupo, metodo, resultado);
    if (!rango) continue;

    const delGrupo = todos.filter((c) => c.candidato.grupo === grupo);
    const total = () => delGrupo.reduce((s, c) => s + c.series, 0);

    let guardia = 200;
    while (total() > rango.max && guardia-- > 0) {
      const candidato = delGrupo
        .filter((c) => c.series > minimo)
        .sort((a, b) => b.series - a.series)[0];
      if (!candidato) break;
      candidato.series -= 1;
    }
    while (total() < rango.min && guardia-- > 0) {
      const candidato = delGrupo
        .filter((c) => c.series < maximo)
        .sort((a, b) => a.series - b.series)[0];
      if (!candidato) break;
      candidato.series += 1;
    }

    const hecho = total();
    if (hecho < rango.min) {
      avisos.push(
        `${grupo}: quedan ${hecho} series a la semana y su método pide ${rango.min}. ` +
          "Faltan ejercicios aprobados de ese grupo, no es un ajuste que se pueda apretar más.",
      );
    } else if (hecho > rango.max) {
      avisos.push(
        `${grupo}: quedan ${hecho} series a la semana y su método tope está en ${rango.max}.`,
      );
    }
  }
}
