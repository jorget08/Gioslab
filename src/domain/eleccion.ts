/**
 * Qué ejercicios va cada día (parte de la tarea 5.3).
 *
 * Aparte de `generador.ts` por tamaño y porque es una pregunta distinta: el
 * generador arma el mesociclo, esto elige el ejercicio de cada hueco. Es aquí
 * donde entran las jerarquías J1/J2/J3 de Giovanni (25-sep).
 */

import { perfilCompensatorio, rangoDeEleccion } from "@/domain/jerarquias";
import type { PlantillaDia } from "@/domain/metodo";
import { cabeEnElDia, type Candidato } from "@/domain/volumen";

/**
 * Los ejercicios de un día.
 *
 * Dentro de cada patrón manda su jerarquía (25-sep): J1 libre, J1 guiado, J2,
 * J3. Antes de eso desempataba el orden alfabético, y como casi ninguna regla
 * marca ejercicios prioritarios, el alfabeto elegía la rutina de todo el mundo.
 *
 * Primero uno por cada patrón del día —para que un día de torso no salgan
 * cuatro empujes y ninguna tracción—, y después se rellena hasta su mínimo con
 * lo que quede. Se prefiere lo no usado esta semana: sus planes reales cambian
 * de ejercicio entre el día A y el día B del mismo grupo, y repetir el mismo
 * seis veces es lo que distingue una rutina de una plantilla.
 */
export function elegirDelDia(
  plantilla: PlantillaDia,
  candidatos: Candidato[],
  usados: Set<string>,
  cupo: { min: number; max: number },
  ratio: Record<string, number> | null,
): Candidato[] {
  const delDia = candidatos.filter((c) => cabeEnElDia(c, plantilla));
  const elegidos: Candidato[] = [];

  // El aislamiento acompaña al grupo del día: unas elevaciones laterales en un
  // día de pierna son técnicamente legales y metodológicamente absurdas. Los
  // grupos del día salen de sus ejercicios compuestos, que son los que lo
  // definen.
  const gruposDelDia = new Set(
    delDia.filter((c) => !c.aislamiento).map((c) => c.grupo).filter((g): g is string => !!g),
  );
  const encaja = (c: Candidato) =>
    !c.aislamiento || !c.grupo || gruposDelDia.size === 0 || gruposDelDia.has(c.grupo) ? 0 : 1;

  const peso = (c: Candidato) => ratio?.[c.patron] ?? 0;

  // Su regla 2: si hoy ya hay un J1 de estiramiento de un músculo, se prefiere
  // su J3 de acortamiento; si el J1 es de acortamiento (Hip Thrust), su J2 de
  // estiramiento. Desempata entre iguales, no salta por encima de un J1.
  const compensa = (c: Candidato) =>
    elegidos.some((e) => {
      const falta = e.jerarquia === 1 && e.musculo === c.musculo ? perfilCompensatorio(e.perfil) : null;
      return falta !== null && falta.jerarquia === c.jerarquia && falta.perfil === c.perfil;
    })
      ? 0
      : 1;

  // Dos J1 del mismo músculo en una sesión (Rumano y Rumano desde bloque) es
  // repetir el estímulo y dejar sin sitio al J3 que lo completa.
  const j1Repetido = (c: Candidato) =>
    c.jerarquia === 1 && elegidos.some((e) => e.jerarquia === 1 && e.musculo === c.musculo) ? 1 : 0;

  // El motor manda (prioritario) y después su jerarquía.
  const orden = (a: Candidato, b: Candidato) =>
    Number(b.prioritario) - Number(a.prioritario) ||
    j1Repetido(a) - j1Repetido(b) ||
    rangoDeEleccion(a) - rangoDeEleccion(b) ||
    compensa(a) - compensa(b) ||
    Number(a.aislamiento) - Number(b.aislamiento) ||
    encaja(a) - encaja(b) ||
    peso(b) - peso(a) ||
    a.nombre.localeCompare(b.nombre, "es");

  const yaHoy = new Set<string>();

  const meter = (c: Candidato) => {
    elegidos.push(c);
    yaHoy.add(c.nombre);
    usados.add(c.nombre);
  };

  // Uno por patrón, y solo lo que no se haya usado ya esta semana. El orden de
  // los patrones es el suyo, salvo que el motor haya pedido un reparto:
  // entonces el patrón que él priorizó entra primero y se queda con el hueco si
  // el día se llena.
  const patrones = [...plantilla.patrones].sort((a, b) => (ratio?.[b] ?? 0) - (ratio?.[a] ?? 0));
  for (const p of patrones) {
    if (elegidos.length >= cupo.max) break;
    const elegido = delDia
      .filter((c) => c.patron === p && !yaHoy.has(c.nombre) && !usados.has(c.nombre))
      .sort(orden)[0];
    if (elegido) meter(elegido);
  }

  // Su regla 2 es "obligatoria": cada J1 lleva su compañero —J3 de
  // acortamiento, o J2 de estiramiento si el J1 ya es de acortamiento—. Se
  // busca en TODOS los candidatos y no solo en los patrones del día, porque
  // esos patrones los derivamos nosotros de sus títulos (5.2) y su regla la
  // escribió él. Solo se respeta el músculo, si el día lo acota.
  const compensar = () => {
    for (const j1 of [...elegidos]) {
      if (elegidos.length >= cupo.max) break;
      const falta = j1.jerarquia === 1 ? perfilCompensatorio(j1.perfil) : null;
      if (!falta) continue;
      const yaEsta = elegidos.some(
        (e) => e.musculo === j1.musculo && e.jerarquia === falta.jerarquia && e.perfil === falta.perfil,
      );
      if (yaEsta) continue;
      const companero = candidatos
        .filter(
          (c) =>
            c.musculo === j1.musculo &&
            c.jerarquia === falta.jerarquia &&
            c.perfil === falta.perfil &&
            !yaHoy.has(c.nombre) &&
            (!plantilla.musculos || (c.musculo !== null && plantilla.musculos.includes(c.musculo))),
        )
        .sort(
          (a, b) =>
            Number(usados.has(a.nombre)) - Number(usados.has(b.nombre)) ||
            rangoDeEleccion(a) - rangoDeEleccion(b) ||
            a.nombre.localeCompare(b.nombre, "es"),
        )[0];
      if (companero) meter(companero);
    }
  };
  compensar();

  // Relleno hasta su mínimo. Aquí sí se puede repetir lo de otro día —entrenar
  // el mismo patrón dos veces por semana es el propio reparto suyo— pero
  // primero se agota lo que no se ha usado.
  //
  // Se reordena en cada vuelta y no una sola vez: lo que ya entró cambia el
  // orden —un segundo J1 del mismo músculo pasa a ir detrás—.
  while (elegidos.length < cupo.min && elegidos.length < cupo.max) {
    const resto = delDia.filter((c) => !yaHoy.has(c.nombre)).sort(orden);
    const siguiente = resto.find((c) => !usados.has(c.nombre)) ?? resto[0];
    if (!siguiente) break;
    meter(siguiente);
  }

  // Otra pasada: el relleno puede haber metido un J1 nuevo (el Rumano entra
  // aquí cuando el patrón de cadera ya lo ocupó el Hip Thrust), y ese J1 también
  // lleva su compañero.
  compensar();

  return elegidos;
}
