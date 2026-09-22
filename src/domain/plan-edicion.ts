/**
 * Las ediciones que el entrenador puede hacer sobre un plan (tarea 5.4).
 *
 * Están aquí y no dentro de la pantalla por dos motivos: se prueban sin abrir un
 * navegador, y la regla de abajo —qué se propaga a todas las semanas y qué no—
 * es metodología, no interfaz.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA: LA COMPOSICIÓN SE PROPAGA, LOS NÚMEROS NO
 * ---------------------------------------------------------------------------
 *
 * Cambiar, quitar, añadir o mover un ejercicio afecta a TODAS las semanas. Un
 * mesociclo es el mismo entrenamiento repetido con la carga cambiando: si el
 * atleta no puede hacer zancadas, no las puede hacer en la semana 3 tampoco, y
 * obligar al entrenador a repetir el cambio seis veces es garantizar que se le
 * olvide una.
 *
 * Series, repeticiones, RPE y descanso afectan SOLO a la semana que está
 * mirando. Ahí las semanas sí son distintas a propósito: la de descarga lleva
 * el 45 % menos de series y RPE 5–6, y propagar un retoque de la semana 1 la
 * borraría sin avisar.
 */

import { esAislamiento, type Metodo } from "@/domain/metodo";
import type { EjercicioPlan, Objetivo, Plan, SemanaPlan, TipoSemana } from "@/domain/plan";

/** Dónde vive un ejercicio dentro del plan. La semana solo hace falta a veces. */
export interface Sitio {
  dia: number;
  indice: number;
}

const conDias = (
  plan: Plan,
  dia: number,
  fn: (ejercicios: EjercicioPlan[], semana: SemanaPlan) => EjercicioPlan[],
  soloSemana?: number,
): Plan => ({
  ...plan,
  semanas: plan.semanas.map((s) =>
    soloSemana !== undefined && s.semana !== soloSemana
      ? s
      : {
          ...s,
          dias: s.dias.map((d, i) =>
            i !== dia ? d : { ...d, central: { ejercicios: fn(d.central.ejercicios, s) } },
          ),
        },
  ),
});

/** Un número de un ejercicio, solo en la semana que se está mirando. */
export function cambiarNumero(
  plan: Plan,
  sitio: Sitio & { semana: number },
  campo: keyof EjercicioPlan,
  valor: number,
): Plan {
  return conDias(
    plan,
    sitio.dia,
    (ejercicios) =>
      ejercicios.map((e, i) => (i === sitio.indice ? { ...e, [campo]: valor } : e)),
    sitio.semana,
  );
}

/** Otro ejercicio en el mismo hueco, en todas las semanas. */
export function cambiarEjercicio(
  plan: Plan,
  sitio: Sitio,
  nombre: string,
  sustitutos: string[],
): Plan {
  return conDias(plan, sitio.dia, (ejercicios) =>
    ejercicios.map((e, i) => (i === sitio.indice ? { ...e, ejercicio: nombre, sustitutos } : e)),
  );
}

export function quitarEjercicio(plan: Plan, sitio: Sitio): Plan {
  return conDias(plan, sitio.dia, (ejercicios) =>
    ejercicios.filter((_, i) => i !== sitio.indice),
  );
}

export function moverEjercicio(plan: Plan, sitio: Sitio, salto: -1 | 1): Plan {
  return conDias(plan, sitio.dia, (ejercicios) => {
    const destino = sitio.indice + salto;
    if (destino < 0 || destino >= ejercicios.length) return ejercicios;
    const copia = [...ejercicios];
    [copia[sitio.indice], copia[destino]] = [copia[destino], copia[sitio.indice]];
    return copia;
  });
}

/**
 * Un ejercicio nuevo en un día, en todas las semanas.
 *
 * El ejercicio se construye POR SEMANA porque la de descarga no lleva las
 * mismas series ni el mismo RPE: añadir uno ahí con la carga de una semana
 * normal convierte la descarga en una semana de carga con otro nombre.
 */
export function anadirEjercicio(
  plan: Plan,
  dia: number,
  construir: (tipo: TipoSemana) => EjercicioPlan,
): Plan {
  return conDias(plan, dia, (ejercicios, semana) => [...ejercicios, construir(semana.tipo)]);
}

/** Mover un día dentro de la semana. Se propaga: el reparto es el mismo. */
export function moverDia(plan: Plan, dia: number, salto: -1 | 1): Plan {
  const destino = dia + salto;
  if (destino < 0 || destino >= plan.diasPorSemana) return plan;

  return {
    ...plan,
    semanas: plan.semanas.map((s) => {
      const dias = [...s.dias];
      [dias[dia], dias[destino]] = [dias[destino], dias[dia]];
      // `dia` es la posición dentro de la semana, así que se renumera: si no, el
      // plan diría "día 3" en el primer sitio y la app del atleta ordenaría por
      // ese número.
      return { ...s, dias: dias.map((d, i) => ({ ...d, dia: i + 1 })) };
    }),
  };
}

/**
 * Los valores con los que nace un ejercicio añadido a mano.
 *
 * Salen del método, igual que si lo hubiera puesto el generador: el entrenador
 * decide QUÉ ejercicio, no con qué dosis empieza. Si quiere otra, la cambia
 * después y queda marcado como decisión suya.
 */
export function ejercicioDelMetodo(opciones: {
  nombre: string;
  patron: string | null;
  metodo: Metodo;
  objetivo: Objetivo;
  tipo: TipoSemana;
  sustitutos?: string[];
}): EjercicioPlan {
  const { nombre, patron, metodo, objetivo, tipo, sustitutos = [] } = opciones;
  const aislamiento = esAislamiento(patron);
  const p = metodo.parametros[objetivo];
  const base = aislamiento
    ? metodo.seriesPorEjercicio.aislamiento
    : metodo.seriesPorEjercicio.compuesto;

  const descarga = tipo === "descarga";

  return {
    ejercicio: nombre,
    seriesCalentamiento: aislamiento
      ? metodo.seriesPorEjercicio.calentamientoAislamiento
      : metodo.seriesPorEjercicio.calentamientoCompuesto,
    seriesEfectivas: descarga
      ? Math.max(1, Math.round(base * (1 - metodo.descarga.reduccionVolumenPct / 100)))
      : base,
    repMin: p.repMin,
    repMax: p.repMax,
    rpePrimeras: descarga ? metodo.descarga.rpePrimeras : p.rpePrimeras,
    rpeUltima: descarga ? metodo.descarga.rpeUltima : p.rpeUltima,
    descansoSeg: aislamiento ? p.descansoMinSeg : p.descansoMaxSeg,
    sustitutos,
  };
}
