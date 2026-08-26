/**
 * Motor de inferencia (tarea 3.2). El corazón del producto.
 *
 * Recibe los hechos de un atleta, las reglas activas y la biblioteca, y decide
 * qué ejercicios quedan, con qué volumen y con qué ajustes de ejecución.
 *
 * ===========================================================================
 * NO DECIDE NADA POR SU CUENTA
 * ===========================================================================
 *
 * Aquí no hay una sola regla biomecánica. Hay un intérprete: sabe evaluar
 * predicados y aplicar acciones, pero qué predicado y qué acción sale de la
 * tabla `rules`, que edita Giovanni (CLAUDE.md §3.1). Un `if (dorsiflexion < 5)`
 * en este archivo sería el fin del diseño.
 *
 * La única excepción es el CRUCE de contraindicaciones, y no es una excepción de
 * verdad: él lo especificó como mecanismo —"cruzamiento directo con base de
 * datos de ejercicios"—, no como regla. Los datos que cruza siguen viniendo
 * enteros de la base.
 *
 * ===========================================================================
 * CUATRO DECISIONES DE DISEÑO
 * ===========================================================================
 *
 * 1. EL TUBO. Nivel 1 filtra, 2 modula carga, 3 reparte vectores, 4 fija el
 *    volumen base. Es su Execution Pipeline y el orden importa: lo que el
 *    nivel 1 descarta ya no existe para los demás.
 *
 * 2. TRES VALORES, NO DOS. Un predicado sobre un hecho que no tenemos no es
 *    falso: es INDECIDIBLE. Si fuera falso, "dorsiflexión < 5" no dispararía en
 *    quien no tiene el tobillo medido y le prescribiríamos sentadilla profunda
 *    tan tranquilos. El motor lo separa y lo denuncia en `sinEvaluar`.
 *
 * 3. LA SEGURIDAD SE ACUMULA, LAS MAGNITUDES COMPITEN. Dos reglas que prohíben
 *    maniobras distintas prohíben las dos; dos que excluyen ejercicios excluyen
 *    los dos; dos suelos de RIR dejan el más alto. Pero dos factores de volumen
 *    distintos NO se multiplican: eso compondría recortes que nadie autorizó.
 *    Ahí compiten y gana la de mayor evidencia.
 *
 * 4. LOS EMPATES SE DENUNCIAN. Dos reglas del mismo nivel de evidencia que se
 *    contradicen son un defecto de la matriz. El motor elige una para poder
 *    seguir, pero lo deja escrito en `conflictos` con `empate: true`.
 */

import { leerContraindicaciones, type Contraindicacion } from "@/domain/contraindicaciones";
import { esNivelEvidencia, mandaSobre, type NivelEvidencia } from "@/domain/evidencia";
import type { Ejercicio } from "@/domain/ejercicios";
import {
  describirRegla,
  esHecho,
  HECHOS,
  NIVELES_MOTOR,
  type Acciones,
  type ClaveHecho,
  type NivelMotor,
  type Predicado,
  type Regla,
} from "@/domain/reglas";

// ---------------------------------------------------------------------------
// Entrada y salida
// ---------------------------------------------------------------------------

/** Lo que sabemos del atleta. Lo que falte, falta: no se rellena con nada. */
export type ValorHecho = number | string | boolean | readonly string[];
export type Hechos = Partial<Record<ClaveHecho, ValorHecho | null | undefined>>;

export interface ReglaAplicada {
  rule_key: string;
  nivel: NivelMotor;
  evidence_level: NivelEvidencia;
  /** Lo que se le enseña al entrenador cuando pregunta por qué (§3.6). */
  justification: string;
  descripcion: string;
}

export interface Conflicto {
  nivel: NivelMotor;
  /** Sobre qué chocaron: "el volumen", "Sentadilla Trasera", "el reparto…". */
  sobre: string;
  ganadora: ReglaAplicada;
  descartadas: ReglaAplicada[];
  /** Mismo nivel de evidencia. Es un defecto de la matriz, no una decisión. */
  empate: boolean;
}

export interface ReglaSinEvaluar {
  rule_key: string;
  nivel: NivelMotor;
  faltan: ClaveHecho[];
}

export interface DecisionEjercicio {
  ejercicio: string;
  incluido: boolean;
  /** Reglas que lo tocaron, para explicar la decisión. */
  porQue: ReglaAplicada[];
  /** Alternativas propuestas cuando se excluyó, ya filtradas. */
  sustitutos: string[];
  /** Cambia el CÓMO sin quitarlo: "elevar talones 2.5 cm". */
  modificadores: string[];
  prioritario: boolean;
}

export interface Resultado {
  ejercicios: DecisionEjercicio[];
  /** Multiplicador del volumen semanal. 1 si nada lo tocó. */
  volumenFactor: number;
  /** Series efectivas por grupo muscular y semana, del nivel 4. */
  volumenSeries: { min: number; max: number } | null;
  rir: { fijo?: number; piso?: number; delta?: number };
  maniobrasProhibidas: string[];
  ratioPatron: Record<string, number> | null;
  aplicadas: ReglaAplicada[];
  conflictos: Conflicto[];
  /** Reglas que no se pudieron evaluar por falta de datos. */
  sinEvaluar: ReglaSinEvaluar[];
  /**
   * `false` si alguna regla quedó sin evaluar. Una prescripción incompleta no
   * es una prescripción segura, y quien la lea tiene que saberlo.
   */
  completo: boolean;
}

// ---------------------------------------------------------------------------
// Evaluación de condiciones — lógica de tres valores
// ---------------------------------------------------------------------------

export type Veredicto = "cumple" | "no-cumple" | "sin-dato";

export function evaluarPredicado(p: Predicado, hechos: Hechos): Veredicto {
  if (!esHecho(p.hecho)) return "sin-dato";

  const valor = hechos[p.hecho];
  // `false` y `0` SON datos. Solo null/undefined significan ausencia; usar un
  // `!valor` aquí convertiría "no usa anticonceptivos" en "no lo sabemos".
  if (valor === null || valor === undefined) return "sin-dato";

  const si = (b: boolean): Veredicto => (b ? "cumple" : "no-cumple");

  switch (p.op) {
    case "incluye":
    case "no_incluye": {
      if (!Array.isArray(valor)) return "sin-dato";
      const dentro = (valor as readonly string[]).includes(String(p.valor));
      return si(p.op === "incluye" ? dentro : !dentro);
    }
    case "entre": {
      if (typeof valor !== "number" || !Array.isArray(p.valor)) return "sin-dato";
      const [min, max] = p.valor as [number, number];
      // Cerrado por abajo y abierto por arriba: "entre 5 y 10" es 5 ≤ x < 10.
      // Así dos bandas contiguas —5-10 y 10-15— no se solapan en el 10.
      return si(valor >= min && valor < max);
    }
    case "=":
      return si(valor === p.valor);
    case "!=":
      return si(valor !== p.valor);
    default: {
      if (typeof valor !== "number" || typeof p.valor !== "number") return "sin-dato";
      if (p.op === "<") return si(valor < p.valor);
      if (p.op === "<=") return si(valor <= p.valor);
      if (p.op === ">") return si(valor > p.valor);
      return si(valor >= p.valor);
    }
  }
}

/**
 * Una condición se cumple si TODOS sus predicados se cumplen.
 *
 * Un "no-cumple" manda sobre un "sin-dato": si la regla ya no aplica por otro
 * motivo, da igual que falte un dato. Al revés no: con un solo predicado
 * indecidible la regla entera queda indecidible, no descartada.
 */
export function evaluarCondicion(
  predicados: readonly Predicado[],
  hechos: Hechos,
): { veredicto: Veredicto; faltan: ClaveHecho[] } {
  const faltan: ClaveHecho[] = [];
  let algunoSinDato = false;

  for (const p of predicados) {
    const v = evaluarPredicado(p, hechos);
    if (v === "no-cumple") return { veredicto: "no-cumple", faltan: [] };
    if (v === "sin-dato") {
      algunoSinDato = true;
      if (esHecho(p.hecho)) faltan.push(p.hecho);
    }
  }

  return { veredicto: algunoSinDato ? "sin-dato" : "cumple", faltan };
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

const aAplicada = (r: Regla): ReglaAplicada => ({
  rule_key: r.rule_key,
  nivel: r.nivel as NivelMotor,
  evidence_level: (esNivelEvidencia(r.evidence_level)
    ? r.evidence_level
    : "LEVEL_D_OVERRIDE") as NivelEvidencia,
  justification: r.justification,
  descripcion: describirRegla(r),
});

/**
 * Resuelve una competencia entre reglas que proponen valores distintos.
 *
 * Gana la de mayor evidencia. Si las dos van igual de respaldadas, se toma la
 * primera para poder seguir, pero se marca `empate`: eso es un defecto de la
 * matriz que Giovanni tiene que arreglar, y taparlo sería peor.
 */
function competir<T>(
  candidatas: readonly { regla: Regla; valor: T }[],
  nivel: NivelMotor,
  sobre: string,
): { valor: T; conflicto: Conflicto | null } {
  const [primera, ...resto] = candidatas;
  if (resto.length === 0) return { valor: primera.valor, conflicto: null };

  let ganadora = primera;
  for (const c of resto) {
    if (
      mandaSobre(
        aAplicada(c.regla).evidence_level,
        aAplicada(ganadora.regla).evidence_level,
      )
    ) {
      ganadora = c;
    }
  }

  const descartadas = candidatas.filter((c) => c !== ganadora);
  const empate = descartadas.some(
    (c) => aAplicada(c.regla).evidence_level === aAplicada(ganadora.regla).evidence_level,
  );

  return {
    valor: ganadora.valor,
    conflicto: {
      nivel,
      sobre,
      ganadora: aAplicada(ganadora.regla),
      descartadas: descartadas.map((c) => aAplicada(c.regla)),
      empate,
    },
  };
}

const nombresDe = (a: Acciones, clave: "excluir_ejercicios" | "priorizar" | "sustituir_por") =>
  a[clave] ?? [];

// ---------------------------------------------------------------------------
// El motor
// ---------------------------------------------------------------------------

export interface EntradaMotor {
  hechos: Hechos;
  /** Solo las activas. Filtrarlas es responsabilidad de quien consulta. */
  reglas: readonly Regla[];
  ejercicios: readonly Ejercicio[];
}

export function evaluar({ hechos, reglas, ejercicios }: EntradaMotor): Resultado {
  const aplicadas: ReglaAplicada[] = [];
  const conflictos: Conflicto[] = [];
  const sinEvaluar: ReglaSinEvaluar[] = [];

  // Qué reglas disparan, nivel por nivel. Se recorre el tubo en orden porque es
  // su arquitectura, aunque la selección de reglas no dependa del orden: lo que
  // depende es cómo se leen los resultados aguas abajo.
  const porNivel = new Map<NivelMotor, Regla[]>();
  for (const n of NIVELES_MOTOR) porNivel.set(n, []);

  for (const r of reglas) {
    const { veredicto, faltan } = evaluarCondicion(r.condition?.todas ?? [], hechos);
    if (veredicto === "sin-dato") {
      sinEvaluar.push({ rule_key: r.rule_key, nivel: r.nivel as NivelMotor, faltan });
      continue;
    }
    if (veredicto === "no-cumple") continue;

    const nivel = (NIVELES_MOTOR as readonly number[]).includes(r.nivel)
      ? (r.nivel as NivelMotor)
      : 1;
    porNivel.get(nivel)!.push(r);
    aplicadas.push(aAplicada(r));
  }

  const del = (n: NivelMotor) => porNivel.get(n) ?? [];

  // --- NIVEL 1 · seguridad --------------------------------------------------
  //
  // Se acumula: cada exclusión y cada maniobra prohibida suma. Aquí no compite
  // nadie porque no hay magnitudes en juego, solo puertas que se cierran.

  const excluidos = new Map<string, ReglaAplicada[]>();
  const prioritarios = new Map<string, ReglaAplicada[]>();
  const modificadores = new Map<string, string[]>();
  const sustitutosPropuestos = new Map<string, string[]>();
  const maniobras = new Set<string>();

  const anotar = (m: Map<string, ReglaAplicada[]>, clave: string, r: Regla) => {
    if (!m.has(clave)) m.set(clave, []);
    m.get(clave)!.push(aAplicada(r));
  };

  for (const r of del(1)) {
    const a = r.actions ?? {};
    for (const e of nombresDe(a, "excluir_ejercicios")) anotar(excluidos, e, r);
    for (const e of nombresDe(a, "priorizar")) anotar(prioritarios, e, r);
    for (const m of a.prohibir_maniobra ?? []) maniobras.add(m);

    // Los patrones excluidos se resuelven contra la biblioteca: la regla habla
    // de patrones y el entrenador ve ejercicios.
    for (const patron of a.excluir_patrones ?? []) {
      for (const ej of ejercicios.filter((x) => x.movement_pattern === patron)) {
        anotar(excluidos, ej.name, r);
      }
    }

    if (a.modificador) {
      // Un modificador sin ejercicio concreto aplica a lo que la regla tocó; si
      // no tocó ninguno, es un ajuste general de la sesión.
      const destinos = [...nombresDe(a, "excluir_ejercicios"), ...nombresDe(a, "priorizar")];
      const claves = destinos.length > 0 ? destinos : ["*"];
      for (const c of claves) {
        if (!modificadores.has(c)) modificadores.set(c, []);
        modificadores.get(c)!.push(a.modificador);
      }
    }

    for (const e of nombresDe(a, "excluir_ejercicios")) {
      sustitutosPropuestos.set(e, [
        ...(sustitutosPropuestos.get(e) ?? []),
        ...nombresDe(a, "sustituir_por"),
      ]);
    }
  }

  // El CRUCE de contraindicaciones. Mecanismo, no regla: él lo especificó como
  // "cruzamiento directo con base de datos". Lo que cruza sale entero de la
  // base —qué tiene el atleta y qué contraindica cada ejercicio— y por eso no
  // hay aquí ningún criterio clínico escrito a mano.
  const tiene = new Set<string>([
    ...((hechos.lesiones as readonly string[] | undefined) ?? []),
    ...((hechos.condiciones as readonly string[] | undefined) ?? []),
  ]);

  const chocaPor = new Map<string, Contraindicacion[]>();
  if (tiene.size > 0) {
    for (const ej of ejercicios) {
      const choque = leerContraindicaciones(ej.contraindications).filter((c) => tiene.has(c));
      if (choque.length > 0) chocaPor.set(ej.name, choque);
    }
  }

  // --- NIVEL 2 · fisiología -------------------------------------------------

  const factores = del(2)
    .filter((r) => r.actions?.volumen_factor !== undefined)
    .map((r) => ({ regla: r, valor: r.actions.volumen_factor! }));

  let volumenFactor = 1;
  if (factores.length > 0) {
    const { valor, conflicto } = competir(factores, 2, "el volumen semanal");
    volumenFactor = valor;
    if (conflicto) conflictos.push(conflicto);
  }

  // El RIR se combina en vez de competir, salvo el valor fijo: un suelo y un
  // desplazamiento son restricciones que conviven, y quedarse con el suelo más
  // alto es siempre lo conservador.
  const rir: { fijo?: number; piso?: number; delta?: number } = {};
  const fijos = del(2)
    .filter((r) => r.actions?.rir?.fijo !== undefined)
    .map((r) => ({ regla: r, valor: r.actions.rir!.fijo! }));
  if (fijos.length > 0) {
    const { valor, conflicto } = competir(fijos, 2, "el RIR objetivo");
    rir.fijo = valor;
    if (conflicto) conflictos.push(conflicto);
  }
  for (const n of [1, 2] as NivelMotor[]) {
    for (const r of del(n)) {
      const s = r.actions?.rir;
      if (s?.piso !== undefined) rir.piso = Math.max(rir.piso ?? s.piso, s.piso);
      if (s?.delta !== undefined) rir.delta = (rir.delta ?? 0) + s.delta;
    }
  }

  // --- NIVEL 3 · vectores ---------------------------------------------------

  const ratios = del(3)
    .filter((r) => r.actions?.ratio_patron)
    .map((r) => ({ regla: r, valor: r.actions.ratio_patron! }));

  let ratioPatron: Record<string, number> | null = null;
  if (ratios.length > 0) {
    const { valor, conflicto } = competir(ratios, 3, "el reparto entre patrones");
    ratioPatron = valor;
    if (conflicto) conflictos.push(conflicto);
  }

  for (const r of del(3)) {
    for (const e of nombresDe(r.actions ?? {}, "priorizar")) anotar(prioritarios, e, r);
  }

  // --- NIVEL 4 · composición ------------------------------------------------

  const series = del(4)
    .filter((r) => r.actions?.volumen_series)
    .map((r) => ({ regla: r, valor: r.actions.volumen_series! }));

  let volumenSeries: { min: number; max: number } | null = null;
  if (series.length > 0) {
    const { valor, conflicto } = competir(series, 4, "el volumen base semanal");
    volumenSeries = valor;
    if (conflicto) conflictos.push(conflicto);
  }

  // --- Decisión por ejercicio -----------------------------------------------

  const decisiones: DecisionEjercicio[] = ejercicios.map((ej) => {
    const porRegla = excluidos.get(ej.name) ?? [];
    const choque = chocaPor.get(ej.name) ?? [];
    const incluido = porRegla.length === 0 && choque.length === 0;

    const porQue = [...porRegla, ...(prioritarios.get(ej.name) ?? [])];
    if (choque.length > 0) {
      // El cruce no viene de una fila de `rules`, así que se explica solo. Sin
      // esto el entrenador vería desaparecer un ejercicio sin motivo visible.
      porQue.push({
        rule_key: "cruce-contraindicaciones",
        nivel: 1,
        evidence_level: "LEVEL_A_SCIENCE",
        justification: `El atleta tiene ${choque.join(", ")} y este ejercicio está contraindicado para ${choque.length === 1 ? "esa zona o condición" : "esas zonas o condiciones"}.`,
        descripcion: `Contraindicado por ${choque.join(", ")}.`,
      });
    }

    return {
      ejercicio: ej.name,
      incluido,
      porQue,
      // Un sustituto que también está excluido no es un sustituto: ofrecerlo
      // mandaría al entrenador a otro ejercicio prohibido.
      sustitutos: incluido
        ? []
        : [...new Set(sustitutosPropuestos.get(ej.name) ?? [])].filter(
            (s) => !excluidos.has(s) && !chocaPor.has(s),
          ),
      modificadores: [
        ...new Set([...(modificadores.get(ej.name) ?? []), ...(modificadores.get("*") ?? [])]),
      ],
      prioritario: incluido && (prioritarios.get(ej.name) ?? []).length > 0,
    };
  });

  return {
    ejercicios: decisiones,
    volumenFactor,
    volumenSeries,
    rir,
    maniobrasProhibidas: [...maniobras],
    ratioPatron,
    aplicadas,
    conflictos,
    sinEvaluar,
    completo: sinEvaluar.length === 0,
  };
}

/** Los que sobreviven, que es lo que el entrenador quiere ver primero. */
export function incluidos(r: Resultado): DecisionEjercicio[] {
  return r.ejercicios.filter((e) => e.incluido);
}

/** Los que se cayeron, con su motivo. Es la mitad que genera confianza (§3.6). */
export function excluidos(r: Resultado): DecisionEjercicio[] {
  return r.ejercicios.filter((e) => !e.incluido);
}

/** Qué hechos le faltan al atleta para que la prescripción esté completa. */
export function hechosQueFaltan(r: Resultado): ClaveHecho[] {
  const todos = r.sinEvaluar.flatMap((s) => s.faltan);
  return [...new Set(todos)].sort((a, b) => HECHOS[a].nivel - HECHOS[b].nivel);
}
