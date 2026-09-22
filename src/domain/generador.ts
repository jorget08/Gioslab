/**
 * El generador de rutinas (tarea 5.3).
 *
 * ---------------------------------------------------------------------------
 * EL PUENTE QUE FALTABA
 * ---------------------------------------------------------------------------
 *
 * El motor (3.2) dice QUÉ ejercicios y con qué ajustes. El método (5.2) dice
 * CÓMO se programa: cuántos días, qué va cada día, cuántas series, en qué rango
 * y con qué descanso. Esto los junta y saca un `Plan` de la forma de la 5.1.
 *
 * Es una FUNCIÓN PURA: mismas entradas, mismo plan, sin fechas ni azar. No es
 * un capricho — la 5.6 compara su salida contra los planes que Giovanni ya
 * entregó, y eso solo se puede hacer si el resultado es reproducible. También
 * es lo que permite que el entrenador regenere y vea exactamente lo mismo.
 *
 * ---------------------------------------------------------------------------
 * TRES REGLAS DE LA CASA
 * ---------------------------------------------------------------------------
 *
 * 1. AQUÍ NO HAY NINGÚN NÚMERO SUYO. Series, repeticiones, RPE, descanso y
 *    reparto salen del `Metodo`. Lo que hay aquí es aritmética. Si mañana sube
 *    las series de espalda a 24, este archivo no cambia.
 *
 * 2. LO QUE NO SE PUEDE HACER SE DICE, NO SE MAQUILLA. Si no se llega a su
 *    mínimo de series porque el motor dejó fuera media biblioteca, sale en
 *    `avisos` con el número exacto. Un plan que finge cumplir su método es peor
 *    que uno que avisa de que no llega.
 *
 * 3. EL MOTOR MANDA SOBRE EL MÉTODO. Su `volumen_series` sustituye al rango del
 *    grupo, su `volumen_factor` lo escala y su `rir` recorta el RPE. El método
 *    es la dosis por defecto; el motor es lo que ese atleta concreto tolera.
 */

import type { Ejercicio } from "@/domain/ejercicios";
import {
  esAislamiento,
  grupoDeMusculo,
  objetivoDeMeta,
  periodizacionPara,
  repartoPara,
  diasDisponibles,
  type Metodo,
  type PlantillaDia,
} from "@/domain/metodo";
import { incluidos, type DecisionEjercicio, type Resultado } from "@/domain/motor";
import {
  cierrePara,
  validarPlan,
  VERSION_PLAN,
  type DiaPlan,
  type EjercicioPlan,
  type Objetivo,
  type Periodizacion,
  type Plan,
  type SemanaPlan,
  type TipoSemana,
} from "@/domain/plan";
import { sustitutosDe, type Relacion } from "@/domain/relaciones";
import {
  ajustarVolumen,
  cabeEnElDia,
  completarVolumen,
  type Candidato,
  type Colocado,
} from "@/domain/volumen";

// ---------------------------------------------------------------------------
// Entrada y salida
// ---------------------------------------------------------------------------

export interface AtletaGenerador {
  sexo?: string | null;
  training_goal?: string | null;
  experience_level?: string | null;
}

export interface OpcionesGenerador {
  diasPorSemana: number;
  semanas: number;
  /**
   * Obligatorio cuando su meta no traduce a ninguno de los tres de Giovanni.
   * Hoy le pasa a "Mantenimiento", que dejó sin contestar.
   */
  objetivo?: Objetivo;
  /** El entrenador puede forzarla: §3.6, el sistema es un copiloto. */
  periodizacion?: Periodizacion;
  /** Él dijo "la 4ª o la 6ª semana". Por defecto, la que traiga el método. */
  cadenciaDescarga?: number;
}

export interface EntradaGenerador {
  resultado: Resultado;
  metodo: Metodo;
  /** La biblioteca, para saber patrón y músculo de cada ejercicio aprobado. */
  ejercicios: Ejercicio[];
  /** La matriz de equivalencia (4.3), de donde salen los sustitutos (5.5). */
  relaciones: Relacion[];
  atleta: AtletaGenerador;
  opciones: OpcionesGenerador;
}

export interface SalidaGenerador {
  /** `null` cuando no se puede armar. Medio plan no se devuelve. */
  plan: Plan | null;
  /** Lo que el entrenador tiene que saber antes de firmarlo. */
  avisos: string[];
  /** Por qué no hay plan. */
  errores: string[];
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

/**
 * El RPE que toca, después de que el motor diga la suya.
 *
 * `RPE = 10 − RIR` es conversión suya (2-sep). `fijo` clava, `delta` mueve y
 * `piso` pone un techo al RPE: un suelo de RIR 3 significa que no se puede
 * pasar de RPE 7, y eso viene de una regla de seguridad, así que recorta
 * siempre — nunca al revés.
 */
function rpeConElMotor(
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

/**
 * Los ejercicios de un día, en el orden en que se prescriben.
 *
 * Primero uno por cada patrón del día —para que un día de torso no salgan
 * cuatro empujes y ninguna tracción—, y después se rellena hasta su mínimo con
 * lo que quede. Se prefiere lo no usado esta semana: sus planes reales cambian
 * de ejercicio entre el día A y el día B del mismo grupo, y repetir el mismo
 * seis veces es lo que distingue una rutina de una plantilla.
 */
function elegirDelDia(
  plantilla: PlantillaDia,
  candidatos: Candidato[],
  usados: Set<string>,
  cupo: { min: number; max: number },
  ratio: Record<string, number> | null,
): Candidato[] {
  const delDia = candidatos.filter((c) => cabeEnElDia(c, plantilla));

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
  const orden = (a: Candidato, b: Candidato) =>
    Number(b.prioritario) - Number(a.prioritario) ||
    Number(a.aislamiento) - Number(b.aislamiento) ||
    encaja(a) - encaja(b) ||
    peso(b) - peso(a) ||
    a.nombre.localeCompare(b.nombre, "es");

  const elegidos: Candidato[] = [];
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

  // Relleno hasta su mínimo. Aquí sí se puede repetir lo de otro día —entrenar
  // el mismo patrón dos veces por semana es el propio reparto suyo— pero
  // primero se agota lo que no se ha usado.
  const resto = delDia.filter((c) => !yaHoy.has(c.nombre)).sort(orden);
  for (const c of [...resto.filter((x) => !usados.has(x.nombre)), ...resto]) {
    if (elegidos.length >= cupo.min || elegidos.length >= cupo.max) break;
    if (yaHoy.has(c.nombre)) continue;
    meter(c);
  }

  return elegidos;
}

// ---------------------------------------------------------------------------
// El generador
// ---------------------------------------------------------------------------

export function generarPlan(entrada: EntradaGenerador): SalidaGenerador {
  const { resultado, metodo, ejercicios, relaciones, atleta, opciones } = entrada;
  const avisos: string[] = [];
  const errores: string[] = [];
  const sinPlan = (): SalidaGenerador => ({ plan: null, avisos, errores });

  // --- Lo que hay que saber antes de empezar ---------------------------------

  const objetivo = opciones.objetivo ?? objetivoDeMeta(metodo, atleta.training_goal);
  if (!objetivo) {
    errores.push(
      `Giovanni no ha dicho cómo se programa "${atleta.training_goal ?? "sin objetivo"}". ` +
        "Elige tú con qué objetivo generar: fuerza, hipertrofia o pérdida de grasa.",
    );
    return sinPlan();
  }

  const reparto = repartoPara(metodo, opciones.diasPorSemana, atleta.sexo);
  if (!reparto) {
    errores.push(
      `Su método no reparte semanas de ${opciones.diasPorSemana} días. ` +
        `Los que tiene: ${diasDisponibles(metodo).join(", ")}.`,
    );
    return sinPlan();
  }

  if (!Number.isInteger(opciones.semanas) || opciones.semanas < 1 || opciones.semanas > 52) {
    errores.push("El mesociclo tiene que ir de 1 a 52 semanas.");
    return sinPlan();
  }

  // Una prescripción incompleta no es una prescripción segura (3.7), y un plan
  // hereda eso entero: se generó sin saberlo todo.
  if (!resultado.completo) {
    avisos.push(
      `La evaluación está incompleta: ${resultado.sinEvaluar.length} ` +
        `${resultado.sinEvaluar.length === 1 ? "regla no se pudo comprobar" : "reglas no se pudieron comprobar"}. ` +
        "Este plan puede cambiar cuando se completen las mediciones.",
    );
  }

  // --- Candidatos ------------------------------------------------------------

  const fichaDe = new Map(ejercicios.map((e) => [e.name, e]));
  const aprobados = incluidos(resultado);
  const nombresAprobados = new Set(aprobados.map((d) => d.ejercicio));
  const sinPatron: string[] = [];
  const sinGrupo = new Set<string>();

  const candidatos: Candidato[] = [];
  for (const d of aprobados) {
    const ficha = fichaDe.get(d.ejercicio);
    if (!ficha) continue;
    if (!ficha.movement_pattern) {
      // Sin patrón no hay día donde ponerlo. Se dice: si no, desaparece de la
      // biblioteca sin que nadie sepa por qué.
      sinPatron.push(d.ejercicio);
      continue;
    }
    const grupo = grupoDeMusculo(metodo, ficha.target_muscle);

    candidatos.push({
      nombre: d.ejercicio,
      patron: ficha.movement_pattern,
      musculo: ficha.target_muscle,
      grupo,
      aislamiento: esAislamiento(ficha.movement_pattern),
      prioritario: d.prioritario,
      modificadores: d.modificadores,
      // 5.5: las alternativas salen de la matriz de equivalencia y se congelan
      // al generar. Solo las que el motor aprobó para ESTE atleta: ofrecer una
      // excluida es mandarlo a un ejercicio que le está prohibido.
      sustitutos: sustitutosDe(relaciones, d.ejercicio)
        .filter((s) => nombresAprobados.has(s))
        .slice(0, 2),
    });
  }

  if (sinPatron.length > 0) {
    avisos.push(
      `Sin patrón de movimiento y por eso fuera del plan: ${sinPatron.join(", ")}. ` +
        "Se clasifican en la biblioteca.",
    );
  }
  // --- La semana base --------------------------------------------------------

  const usados = new Set<string>();
  const semanaBase: Colocado[][] = [];

  for (const plantilla of reparto.plantilla) {
    const elegidos = elegirDelDia(
      plantilla,
      candidatos,
      usados,
      metodo.ejerciciosPorDia,
      resultado.ratioPatron,
    );
    if (elegidos.length === 0) {
      errores.push(
        `El día "${plantilla.titulo}" se queda sin un solo ejercicio aprobado. ` +
          "Con lo que el motor deja fuera, esta semana no se puede repartir así.",
      );
    }
    semanaBase.push(
      elegidos.map((c) => ({
        candidato: c,
        series: c.aislamiento
          ? metodo.seriesPorEjercicio.aislamiento
          : metodo.seriesPorEjercicio.compuesto,
      })),
    );
  }
  if (errores.length > 0) return sinPlan();

  // Primero los ejercicios que faltan y solo después las series: subir series a
  // un grupo que necesita otro ejercicio no llega nunca a su mínimo.
  completarVolumen(semanaBase, reparto.plantilla, candidatos, metodo, resultado);
  ajustarVolumen(semanaBase, metodo, resultado, avisos);

  // El aviso se da sobre lo que ENTRA en el plan, no sobre todo lo aprobado:
  // avisar del core cuando ningún día lo entrena es ruido, y el ruido se lee
  // como "todo normal".
  for (const c of semanaBase.flat()) {
    if (!c.candidato.grupo && c.candidato.musculo) sinGrupo.add(c.candidato.musculo);
  }
  for (const m of [...sinGrupo].sort((a, b) => a.localeCompare(b, "es"))) {
    avisos.push(
      `"${m}" no está en su tabla de volumen semanal, así que esos ejercicios ` +
        "se prescriben sin tope de series declarado.",
    );
  }

  // --- De la semana base al mesociclo ---------------------------------------

  const parametros = metodo.parametros[objetivo];
  const rpeCarga = rpeConElMotor(
    { primeras: parametros.rpePrimeras, ultima: parametros.rpeUltima },
    resultado.rir,
  );
  if (rpeCarga.ultima !== parametros.rpeUltima) {
    avisos.push(
      `El motor bajó la intensidad: RPE ${rpeCarga.primeras}/${rpeCarga.ultima} en vez de ` +
        `${parametros.rpePrimeras}/${parametros.rpeUltima}.`,
    );
  }

  const cierre = cierrePara(objetivo);
  const cadencia = opciones.cadenciaDescarga ?? metodo.descarga.cadaSemanas;
  const esDescarga = (n: number) => n > 0 && n % cadencia === 0;

  const notasDeSesion = [
    ...resultado.modificadoresGenerales,
    ...resultado.maniobrasProhibidas.map((m) => `Maniobra prohibida: ${m}.`),
  ];

  const semanas: SemanaPlan[] = [];
  for (let n = 1; n <= opciones.semanas; n++) {
    const tipo: TipoSemana = esDescarga(n)
      ? "descarga"
      : esDescarga(n - 1) && metodo.descarga.supercompensacionDespues
        ? "supercompensacion"
        : "carga";

    const notasSemana =
      tipo === "descarga"
        ? [
            `Semana de descarga: −${metodo.descarga.reduccionVolumenPct} % de series y ` +
              `RPE ${metodo.descarga.rpePrimeras}–${metodo.descarga.rpeUltima}, con los mismos ejercicios.`,
          ]
        : tipo === "supercompensacion"
          ? ["Semana de supercompensación: se vuelve a la carga buscando superar los registros previos."]
          : [];

    const dias: DiaPlan[] = semanaBase.map((delDia, i) => {
      const plantilla = reparto.plantilla[i];
      const ejerciciosDia: EjercicioPlan[] = delDia.map((c) => {
        const series =
          tipo === "descarga"
            ? Math.max(1, Math.round(c.series * (1 - metodo.descarga.reduccionVolumenPct / 100)))
            : c.series;

        return {
          ejercicio: c.candidato.nombre,
          seriesCalentamiento: c.candidato.aislamiento
            ? metodo.seriesPorEjercicio.calentamientoAislamiento
            : metodo.seriesPorEjercicio.calentamientoCompuesto,
          seriesEfectivas: series,
          repMin: parametros.repMin,
          repMax: parametros.repMax,
          rpePrimeras: tipo === "descarga" ? metodo.descarga.rpePrimeras : rpeCarga.primeras,
          rpeUltima: tipo === "descarga" ? metodo.descarga.rpeUltima : rpeCarga.ultima,
          descansoSeg: c.candidato.aislamiento
            ? parametros.descansoMinSeg
            : parametros.descansoMaxSeg,
          sustitutos: c.candidato.sustitutos,
          notas:
            c.candidato.modificadores.length > 0
              ? c.candidato.modificadores.join(" · ")
              : undefined,
        };
      });

      const notas = [...notasSemana, ...notasDeSesion];
      return {
        dia: i + 1,
        titulo: plantilla.titulo,
        preparacion: {
          minutos: metodo.fases.preparacion.minutos,
          bloques: metodo.fases.preparacion.bloques,
        },
        central: { ejercicios: ejerciciosDia },
        final: { cierre, minutos: metodo.fases.cierre[cierre].minutos },
        ...(notas.length > 0 ? { notas } : {}),
      };
    });

    semanas.push({ semana: n, tipo, dias });
  }

  const plan: Plan = {
    version: VERSION_PLAN,
    periodizacion: opciones.periodizacion ?? periodizacionPara(metodo, objetivo),
    objetivo,
    diasPorSemana: opciones.diasPorSemana,
    semanas,
  };

  // Lo que sale de aquí tiene que poder guardarse. Si no valida es un defecto
  // nuestro, y es mejor verlo en el sitio que descubrirlo al pulsar "guardar".
  const problemas = validarPlan(plan);
  if (problemas.length > 0) {
    errores.push(...problemas);
    return sinPlan();
  }

  return { plan, avisos, errores };
}

/** Las decisiones del motor que este plan usó. Lo mira el editor (5.4). */
export function decisionesDelPlan(resultado: Resultado, plan: Plan): DecisionEjercicio[] {
  const enPlan = new Set(
    plan.semanas.flatMap((s) => s.dias.flatMap((d) => d.central.ejercicios.map((e) => e.ejercicio))),
  );
  return resultado.ejercicios.filter((d) => enPlan.has(d.ejercicio));
}
