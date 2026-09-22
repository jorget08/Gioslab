/**
 * Qué cambió el entrenador respecto de lo que propuso el motor (tarea 5.4).
 *
 * §3.6: el sistema es un copiloto y el entrenador siempre decide. Pero si sus
 * decisiones se mezclan con las del motor, dentro de tres meses nadie sabe cuál
 * fue de quién — ni para defender el plan delante del atleta, ni para aprender
 * de sus correcciones, que es de donde va a salir la siguiente versión de la
 * matriz.
 *
 * La comparación se hace POR NOMBRE, no por posición. Si se comparara por
 * posición, quitar el primer ejercicio del día haría que todos los demás
 * parecieran cambiados, y un cambio falso repetido cinco veces entrena a
 * cualquiera a ignorar la marca.
 *
 * Cambiar un ejercicio por otro sale como uno quitado y uno añadido, que es
 * literalmente lo que es.
 */

import type { DiaPlan, EjercicioPlan, Plan } from "@/domain/plan";

export interface CambioDeCampo {
  campo: string;
  antes: string;
  ahora: string;
}

export interface CambiosDelDia {
  /** Ejercicios que el entrenador metió y el motor no había propuesto. */
  anadidos: string[];
  /** Los que el motor propuso y el entrenador quitó. */
  quitados: string[];
  /** Por nombre de ejercicio, qué números tocó. */
  porEjercicio: Record<string, CambioDeCampo[]>;
}

const rango = (e: EjercicioPlan) => `${e.repMin}–${e.repMax}`;
const rpe = (e: EjercicioPlan) =>
  e.rpePrimeras === undefined && e.rpeUltima === undefined
    ? "—"
    : `${e.rpePrimeras ?? "—"}/${e.rpeUltima ?? "—"}`;

/** Los números que el entrenador cambió de un ejercicio que sigue en el plan. */
export function cambiosDelEjercicio(
  generado: EjercicioPlan,
  actual: EjercicioPlan,
): CambioDeCampo[] {
  const cambios: CambioDeCampo[] = [];
  const mirar = (campo: string, antes: string | number, ahora: string | number) => {
    if (String(antes) !== String(ahora)) {
      cambios.push({ campo, antes: String(antes), ahora: String(ahora) });
    }
  };

  mirar("series", generado.seriesEfectivas, actual.seriesEfectivas);
  mirar("repeticiones", rango(generado), rango(actual));
  mirar("RPE", rpe(generado), rpe(actual));
  mirar("descanso", `${generado.descansoSeg} s`, `${actual.descansoSeg} s`);
  mirar("calentamiento", generado.seriesCalentamiento, actual.seriesCalentamiento);

  return cambios;
}

export function cambiosDelDia(generado: DiaPlan | undefined, actual: DiaPlan): CambiosDelDia {
  const antes = new Map((generado?.central.ejercicios ?? []).map((e) => [e.ejercicio, e]));
  const ahora = new Map(actual.central.ejercicios.map((e) => [e.ejercicio, e]));

  const porEjercicio: Record<string, CambioDeCampo[]> = {};
  for (const [nombre, e] of ahora) {
    const original = antes.get(nombre);
    if (!original) continue;
    const cambios = cambiosDelEjercicio(original, e);
    if (cambios.length > 0) porEjercicio[nombre] = cambios;
  }

  return {
    anadidos: [...ahora.keys()].filter((n) => !antes.has(n)),
    quitados: [...antes.keys()].filter((n) => !ahora.has(n)),
    porEjercicio,
  };
}

/** ¿Este día lleva alguna decisión del entrenador encima? */
export function diaEditado(cambios: CambiosDelDia): boolean {
  return (
    cambios.anadidos.length > 0 ||
    cambios.quitados.length > 0 ||
    Object.keys(cambios.porEjercicio).length > 0
  );
}

/**
 * Todo lo que tocó, en frases, para la cabecera del plan y para el PDF.
 *
 * Una lista vacía significa que el plan es el que salió del motor, y eso
 * también hay que poder decirlo.
 */
export function resumenDeCambios(generado: Plan | null, actual: Plan): string[] {
  if (!generado) return [];
  const frases: string[] = [];

  for (const semana of actual.semanas) {
    const original = generado.semanas.find((s) => s.semana === semana.semana);
    for (const dia of semana.dias) {
      const cambios = cambiosDelDia(
        original?.dias.find((d) => d.dia === dia.dia),
        dia,
      );
      if (!diaEditado(cambios)) continue;

      const donde = `S${semana.semana} · ${dia.titulo}`;
      for (const n of cambios.quitados) frases.push(`${donde}: quitaste ${n}.`);
      for (const n of cambios.anadidos) frases.push(`${donde}: añadiste ${n}.`);
      for (const [nombre, campos] of Object.entries(cambios.porEjercicio)) {
        frases.push(
          `${donde}: ${nombre}, ${campos
            .map((c) => `${c.campo} ${c.antes} → ${c.ahora}`)
            .join("; ")}.`,
        );
      }
    }
  }

  return frases;
}
