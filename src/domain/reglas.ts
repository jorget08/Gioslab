/**
 * Gramática de las reglas del motor (tarea 3.1).
 *
 * La tabla `rules` existe desde la 1.3 con `condition` y `actions` como jsonb
 * libre. Esto fija QUÉ puede decir una condición y QUÉ puede hacer una acción.
 * Sin esa gramática no se puede escribir el motor (3.2), ni cargar la matriz
 * (3.3), ni construirle a Giovanni un editor (3.5).
 *
 * ===========================================================================
 * DOS EJES, NO UNO
 * ===========================================================================
 *
 * Giovanni dio dos jerarquías y no son la misma cosa:
 *
 *   NIVEL 1..4        el ORDEN en que el motor decide. Es un tubo:
 *                     1 filtra por seguridad → 2 modula volumen e intensidad →
 *                     3 asigna vectores → 4 fija el volumen base.
 *
 *   LEVEL_A..D        el DESEMPATE cuando dos reglas del MISMO nivel se
 *                     contradicen. Ver `evidencia.ts`.
 *
 * Un nivel no desempata nada: ordena. Y un nivel de evidencia no ordena nada:
 * desempata. Mezclarlos haría que una regla de composición corporal pudiera
 * anular una de seguridad solo por tener mejor respaldo científico, que es
 * exactamente lo que no debe pasar.
 *
 * ⚠️ Es nuestra lectura, no una confirmación suya: él escribió "en caso de
 * conflicto se aplica la de mayor jerarquía", que suena a desempate. Anotado
 * como pregunta J en PREGUNTAS-GIOVANNI.
 *
 * ===========================================================================
 * POR QUÉ ESTO ES DATO Y NO CÓDIGO
 * ===========================================================================
 *
 * Aquí NO hay ninguna regla biomecánica. Hay un vocabulario: qué hechos se
 * pueden mirar y qué se puede hacer con ellos. Las reglas viven en la tabla,
 * versionadas, y Giovanni las edita sin desplegar nada (CLAUDE.md §3.1). Si
 * algún día aparece un `if (dorsiflexion < 5)` en TypeScript, el diseño se
 * rompió.
 */

import {
  CONDICIONES_SISTEMICAS,
  ZONAS_ANATOMICAS,
  type Contraindicacion,
} from "@/domain/contraindicaciones";
import { esNivelEvidencia, type NivelEvidencia } from "@/domain/evidencia";
import { esPatron, nombrePatron, PATRONES, type Patron } from "@/domain/patrones";

/** El orden del tubo. 1 se evalúa primero y puede vetar lo que venga después. */
export const NIVELES_MOTOR = [1, 2, 3, 4] as const;
export type NivelMotor = (typeof NIVELES_MOTOR)[number];

export const ETIQUETA_NIVEL: Record<NivelMotor, string> = {
  1: "Seguridad, movilidad y contraindicaciones",
  2: "Fisiología, ciclo menstrual y autorregulación",
  3: "Biomecánica focalizada y vectores",
  4: "Composición corporal",
};

// ---------------------------------------------------------------------------
// Hechos: lo único que una condición puede mirar
// ---------------------------------------------------------------------------
//
// Catálogo cerrado a propósito. Es la lista que Giovanni usa para escribir la
// matriz y la que el motor sabe resolver; un hecho fuera de aquí sería una
// regla que nunca dispara y que nadie detecta.

export type TipoHecho = "numero" | "opcion" | "conjunto" | "booleano";

export interface Hecho {
  etiqueta: string;
  tipo: TipoHecho;
  /** De dónde sale el valor. Documenta el puente con la base. */
  origen: string;
  unidad?: string;
  /** Valores admitidos en los hechos de tipo `opcion` y `conjunto`. */
  dominio?: readonly string[];
  nivel: NivelMotor;
}

export const FASES_CICLO = [
  "Folicular Temprana",
  "Folicular Tardía",
  "Lútea Temprana",
  "Lútea Tardía",
  "Anticonceptivo",
] as const;

export const HECHOS = {
  // --- Nivel 1: seguridad -------------------------------------------------
  dorsiflexion_cm: {
    etiqueta: "Dorsiflexión de tobillo",
    tipo: "numero", unidad: "cm", nivel: 1,
    origen: "biomech_evaluations.ankle_dorsiflexion_cm",
  },
  flexion_hombro_grados: {
    etiqueta: "Flexión de hombro",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.shoulder_flexion_deg",
  },
  rotacion_externa_hombro_grados: {
    etiqueta: "Rotación externa de hombro",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.shoulder_external_rotation_deg",
  },
  flexion_cadera_grados: {
    etiqueta: "Flexión de cadera",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.hip_flexion_deg",
  },
  rotacion_interna_cadera_grados: {
    etiqueta: "Rotación interna de cadera",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.hip_internal_rotation_deg",
  },
  thomas_test_grados: {
    etiqueta: "Thomas Test",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.thomas_test_deg (negativo = flexores acortados)",
  },
  slr_grados: {
    etiqueta: "Elevación de pierna recta",
    tipo: "numero", unidad: "°", nivel: 1,
    origen: "biomech_evaluations.slr_deg",
  },
  extension_toracica: {
    etiqueta: "Extensión torácica",
    tipo: "opcion", nivel: 1, dominio: ["Normal", "Cifótica"],
    origen: "biomech_evaluations.thoracic_extension",
  },
  // El nivel de un hecho dice DESDE CUÁNDO está disponible, no quién lo usa.
  // El sexo se conoce al crear el atleta, antes de medir nada, así que cualquier
  // nivel puede mirarlo. Estuvo en el 4 por estar escrito al lado del porcentaje
  // graso, y eso dejaba las reglas de ciclo (nivel 2) sin poder filtrar por sexo.
  sexo: {
    etiqueta: "Sexo biológico",
    tipo: "opcion", nivel: 1, dominio: ["masculino", "femenino"],
    origen: "athletes.sex",
  },
  lesiones: {
    etiqueta: "Zonas lesionadas",
    tipo: "conjunto", nivel: 1, dominio: ZONAS_ANATOMICAS,
    origen: "athlete_injuries.body_region (solo las activas)",
  },
  condiciones: {
    etiqueta: "Condiciones fisiológicas",
    tipo: "conjunto", nivel: 1, dominio: CONDICIONES_SISTEMICAS,
    origen: "athlete_conditions.condition (solo is_active)",
  },

  // --- Nivel 2: fisiología ------------------------------------------------
  fase_ciclo: {
    etiqueta: "Fase del ciclo",
    tipo: "opcion", nivel: 2, dominio: FASES_CICLO,
    origen: "calculado sobre menstrual_cycle_logs (ciclo-menstrual.ts)",
  },
  // Bandera de SEGURIDAD dentro de Folicular Tardía, no una fase. Giovanni la
  // conservó al pasar el ciclo de cinco fases a cuatro: durante el pico sube la
  // laxitud del cruzado anterior y hay que priorizar cadena cinética cerrada.
  pico_ovulatorio: {
    etiqueta: "Pico ovulatorio",
    tipo: "booleano", nivel: 2,
    origen: "calculado sobre menstrual_cycle_logs (picoOvulatorio, días 12-14)",
  },
  usa_anticonceptivos: {
    etiqueta: "Usa anticonceptivos hormonales",
    tipo: "booleano", nivel: 2,
    origen: "menstrual_cycle_logs.uses_hormonal_contraception",
  },

  // --- Nivel 3: vectores y dominancias ------------------------------------
  dominancia_sentadilla: {
    etiqueta: "Dominancia en sentadilla",
    tipo: "opcion", nivel: 3,
    dominio: ["Dominante de Rodilla", "Dominante de Cadera"],
    origen: "biomech_evaluations.squat_dominance",
  },
  vector_gluteo: {
    etiqueta: "Vector de glúteo",
    tipo: "opcion", nivel: 3,
    dominio: ["Vector Horizontal", "Vector Vertical"],
    origen: "biomech_evaluations.glute_vector",
  },
  dominancia_espalda: {
    etiqueta: "Vector de espalda",
    tipo: "opcion", nivel: 3,
    dominio: ["Vector Horizontal (Grosor)", "Vector Vertical (Dorsal)"],
    origen: "biomech_evaluations.back_dominance",
  },
  tolerancia_carga_axial: {
    etiqueta: "Tolerancia a carga axial",
    tipo: "opcion", nivel: 3,
    dominio: ["Tolerancia Normal", "Sensibilidad Lumbar"],
    origen: "biomech_evaluations.axial_load_tolerance",
  },
  proporcion_femur_torso: {
    etiqueta: "Proporción fémur/torso",
    tipo: "opcion", nivel: 3,
    dominio: ["Fémur Largo / Torso Corto", "Proporción Equilibrada", "Fémur Corto / Torso Largo"],
    origen: "biomech_evaluations.femur_torso_ratio",
  },

  // --- Nivel 4: composición corporal --------------------------------------
  porcentaje_graso: {
    etiqueta: "Porcentaje graso",
    tipo: "numero", unidad: "%", nivel: 4,
    origen: "anthropometric_measurements.body_fat_pct (la más reciente)",
  },
} as const satisfies Record<string, Hecho>;

export type ClaveHecho = keyof typeof HECHOS;

export function esHecho(v: string): v is ClaveHecho {
  return Object.prototype.hasOwnProperty.call(HECHOS, v);
}

// ---------------------------------------------------------------------------
// Condiciones
// ---------------------------------------------------------------------------

export const OPERADORES = ["<", "<=", "=", "!=", ">=", ">", "entre", "incluye", "no_incluye"] as const;
export type Operador = (typeof OPERADORES)[number];

/** Qué operadores tienen sentido sobre cada tipo de hecho. */
const OPERADORES_POR_TIPO: Record<TipoHecho, readonly Operador[]> = {
  numero: ["<", "<=", "=", "!=", ">=", ">", "entre"],
  opcion: ["=", "!="],
  conjunto: ["incluye", "no_incluye"],
  booleano: ["="],
};

/**
 * Los operadores que puede elegir quien edita una regla para un hecho dado.
 *
 * El editor ofrece SOLO estos en vez de los nueve y avisar después: un
 * desplegable que no deja equivocarse enseña la gramática mientras se usa, y
 * quien edita la matriz no es programador.
 */
export function operadoresDe(hecho: string): readonly Operador[] {
  if (!esHecho(hecho)) return [];
  return OPERADORES_POR_TIPO[HECHOS[hecho].tipo];
}


export interface Predicado {
  hecho: string;
  op: Operador;
  /** Número para comparaciones, `[min, max)` para `entre`, texto o booleano. */
  valor: number | string | boolean | [number, number];
}

/**
 * Una condición es una lista de predicados que se cumplen TODOS.
 *
 * No hay `alguna` todavía, y es deliberado: en toda la matriz de Giovanni no
 * aparece ni un solo "o". Añadirlo ahora sería inventar una necesidad y
 * complicar el motor y su editor para nadie.
 */
export interface Condicion {
  todas: Predicado[];
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
//
// Salen una a una de su matriz. No hay ninguna de adorno.

export interface Acciones {
  /** Nivel 1. El ejercicio desaparece; no es una preferencia. */
  excluir_ejercicios?: string[];
  excluir_patrones?: string[];
  /** "Sustitución obligatoria" en su matriz: con qué se reemplaza lo excluido. */
  sustituir_por?: string[];
  priorizar?: string[];
  /** Cambia el CÓMO sin quitar el ejercicio: "elevar talones 2.5 cm". */
  modificador?: string;
  /** Nivel 1 y 2: maniobras respiratorias prohibidas, p. ej. Valsalva. */
  prohibir_maniobra?: string[];

  /** Nivel 2. Multiplica el volumen semanal: 0.75 es su deload de lútea tardía. */
  volumen_factor?: number;
  /** Nivel 2. `fijo` clava el RIR; `piso` impide bajar de ahí; `delta` lo mueve. */
  rir?: { fijo?: number; piso?: number; delta?: number };

  /** Nivel 3. Reparto entre patrones; los valores suman 1. */
  ratio_patron?: Record<string, number>;

  /** Nivel 4. Series efectivas por grupo muscular y semana. */
  volumen_series?: { min: number; max: number };
}

export type ClaveAccion = keyof Acciones;

/**
 * Qué acciones EJECUTA cada nivel del motor.
 *
 * No es una preferencia de estilo: es lo que `motor.ts` lee de verdad en cada
 * pasada. Una `volumen_factor` dentro de una regla de nivel 1 no falla — el
 * motor sencillamente nunca la mira, porque el volumen se resuelve en el 2. La
 * regla se queda en la matriz pareciendo viva y sin efecto ninguno, que es la
 * peor forma de estar rota.
 *
 * Está aquí y no en el motor porque es gramática: define qué se puede escribir,
 * no qué se hace con ello. El editor lo usa para ofrecer solo lo que aplica, y
 * `validarRegla` para rechazar lo que no.
 */
export const ACCIONES_POR_NIVEL: Record<NivelMotor, readonly ClaveAccion[]> = {
  1: [
    "excluir_ejercicios",
    "excluir_patrones",
    "sustituir_por",
    "priorizar",
    "modificador",
    "prohibir_maniobra",
    // El RIR entra ya en seguridad porque un suelo es una restricción, no una
    // dosis: la hipertensión prohíbe Valsalva Y prohíbe llegar al fallo, y las
    // dos cosas son el mismo criterio. Los suelos se acumulan quedándose con el
    // más alto, así que sumar el nivel 1 solo puede ser más conservador.
    "rir",
  ],
  2: ["volumen_factor", "rir"],
  3: ["ratio_patron", "priorizar"],
  4: ["volumen_series"],
};

export interface Regla {
  rule_key: string;
  version: number;
  nivel: number;
  condition: Condicion;
  actions: Acciones;
  justification: string;
  evidence_level: string;
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------
//
// Vive aquí y no en un CHECK de Postgres porque son comprobaciones de FORMA
// —que el operador tenga sentido para el tipo de hecho, que el valor esté en el
// dominio— y expresarlas en SQL sobre jsonb sería ilegible y difícil de probar.
// La base solo garantiza que sean objetos; esto garantiza que sean reglas.

export function validarPredicado(p: Predicado): string[] {
  const errores: string[] = [];

  if (!esHecho(p.hecho)) {
    return [`"${p.hecho}" no es un hecho conocido.`];
  }
  const hecho: Hecho = HECHOS[p.hecho];

  if (!OPERADORES_POR_TIPO[hecho.tipo].includes(p.op)) {
    errores.push(
      `El operador "${p.op}" no aplica a ${hecho.etiqueta}: admite ${OPERADORES_POR_TIPO[hecho.tipo].join(", ")}.`,
    );
    return errores;
  }

  if (hecho.tipo === "numero") {
    if (p.op === "entre") {
      const v = p.valor;
      if (!Array.isArray(v) || v.length !== 2 || !v.every((n) => typeof n === "number")) {
        errores.push(`"entre" necesita dos números en ${hecho.etiqueta}.`);
      } else if (v[0] >= v[1]) {
        errores.push(`El rango de ${hecho.etiqueta} está al revés: ${v[0]} no es menor que ${v[1]}.`);
      }
    } else if (typeof p.valor !== "number") {
      errores.push(`${hecho.etiqueta} se compara con un número.`);
    }
  }

  if (hecho.tipo === "booleano" && typeof p.valor !== "boolean") {
    errores.push(`${hecho.etiqueta} solo admite verdadero o falso.`);
  }

  if ((hecho.tipo === "opcion" || hecho.tipo === "conjunto") && hecho.dominio) {
    if (typeof p.valor !== "string" || !hecho.dominio.includes(p.valor)) {
      errores.push(
        `"${String(p.valor)}" no es un valor de ${hecho.etiqueta}. Admite: ${hecho.dominio.join(", ")}.`,
      );
    }
  }

  return errores;
}

export function validarAcciones(a: Acciones): string[] {
  const errores: string[] = [];

  if (Object.keys(a).length === 0) {
    return ["La regla no hace nada: hay que indicar al menos una acción."];
  }

  for (const p of a.excluir_patrones ?? []) {
    if (!esPatron(p)) errores.push(`"${p}" no es un patrón del catálogo.`);
  }

  if (a.volumen_factor !== undefined) {
    // Un factor fuera de 0.5–1.5 no es una modulación, es un error de tecleo:
    // el ajuste más agresivo de su matriz es 0.75.
    if (a.volumen_factor <= 0 || a.volumen_factor > 2) {
      errores.push(`El factor de volumen ${a.volumen_factor} está fuera de lo razonable.`);
    }
  }

  if (a.rir) {
    for (const [clave, v] of Object.entries(a.rir)) {
      if (v !== undefined && (v < -5 || v > 10)) {
        errores.push(`El RIR "${clave}" con valor ${v} está fuera de rango.`);
      }
    }
  }

  if (a.ratio_patron) {
    for (const p of Object.keys(a.ratio_patron)) {
      if (!esPatron(p)) errores.push(`"${p}" no es un patrón del catálogo.`);
    }
    const suma = Object.values(a.ratio_patron).reduce((t, v) => t + v, 0);
    // Se compara con tolerancia: 0.6 + 0.4 no siempre da 1 exacto en binario.
    if (Math.abs(suma - 1) > 0.001) {
      errores.push(`Los ratios por patrón deben sumar 1; suman ${suma.toFixed(2)}.`);
    }
  }

  if (a.volumen_series) {
    const { min, max } = a.volumen_series;
    if (min > max) errores.push(`El rango de series está al revés: ${min} a ${max}.`);
    if (min < 0 || max > 40) errores.push(`El rango de series ${min}–${max} no es plausible.`);
  }

  if (a.sustituir_por?.length && !(a.excluir_ejercicios?.length || a.excluir_patrones?.length)) {
    errores.push("Hay sustitutos pero no se excluye nada: la sustitución no llegaría a aplicarse.");
  }

  return errores;
}

export function validarRegla(r: Regla): string[] {
  const errores: string[] = [];

  if (!r.rule_key?.trim()) errores.push("Falta el identificador de la regla.");
  if (!Number.isInteger(r.version) || r.version < 1) errores.push("La versión debe ser un entero positivo.");
  if (!(NIVELES_MOTOR as readonly number[]).includes(r.nivel)) {
    errores.push(`El nivel ${r.nivel} no existe: son del 1 al 4.`);
  }
  if (!r.justification?.trim()) {
    // §3.6: sin justificación el motor no puede explicar por qué decidió.
    errores.push("Falta la justificación: sin ella no se le puede enseñar al entrenador.");
  }
  if (!esNivelEvidencia(r.evidence_level)) {
    errores.push(`"${r.evidence_level}" no es un nivel de evidencia válido.`);
  }

  const predicados = r.condition?.todas ?? [];
  if (predicados.length === 0) {
    errores.push("La condición está vacía: la regla dispararía siempre.");
  }
  predicados.forEach((p, i) => {
    for (const e of validarPredicado(p)) errores.push(`Condición ${i + 1}: ${e}`);
  });

  // Un hecho de nivel 4 dentro de una regla de nivel 1 significa que alguien se
  // equivocó de sitio: el motor ni siquiera tendría ese dato calculado todavía.
  for (const p of predicados) {
    if (esHecho(p.hecho) && HECHOS[p.hecho].nivel > r.nivel) {
      errores.push(
        `"${HECHOS[p.hecho].etiqueta}" es de nivel ${HECHOS[p.hecho].nivel} y esta regla es de nivel ${r.nivel}.`,
      );
    }
  }

  for (const e of validarAcciones(r.actions ?? {})) errores.push(e);

  // Una acción que su nivel no ejecuta NO falla en el motor: no hace nada. La
  // regla se queda en la matriz pareciendo viva, y eso es peor que un error.
  if ((NIVELES_MOTOR as readonly number[]).includes(r.nivel)) {
    const permitidas = ACCIONES_POR_NIVEL[r.nivel as NivelMotor];

    // El RIR es la excepción fina: `piso` y `delta` se leen en el 1 y en el 2,
    // pero `fijo` solo en el 2, porque clavar el RIR es dosificar y no proteger.
    if (r.nivel === 1 && r.actions?.rir?.fijo !== undefined) {
      errores.push('El RIR fijo solo se ejecuta en el nivel 2; en seguridad usa "piso".');
    }

    for (const clave of Object.keys(r.actions ?? {}) as ClaveAccion[]) {
      if (r.actions[clave] === undefined) continue;
      if (!permitidas.includes(clave)) {
        const donde = NIVELES_MOTOR.filter((n) => ACCIONES_POR_NIVEL[n].includes(clave));
        errores.push(
          `"${clave}" no se ejecuta en el nivel ${r.nivel}; ` +
            (donde.length > 0
              ? `va en ${donde.length === 1 ? "el nivel" : "los niveles"} ${donde.join(" o ")}.`
              : "no la ejecuta ningún nivel."),
        );
      }
    }
  }

  return errores;
}

// ---------------------------------------------------------------------------
// Lectura humana
// ---------------------------------------------------------------------------
//
// El motor tiene que poder explicar qué aplicó y por qué (§3.6), y Giovanni
// tiene que poder releer lo que escribió en su editor (3.5). Las dos cosas
// salen de aquí, así que la regla se lee igual en los dos sitios.

export const TEXTO_OPERADOR: Record<Operador, string> = {
  "<": "es menor que", "<=": "es como mucho", "=": "es", "!=": "no es",
  ">=": "es al menos", ">": "es mayor que", entre: "está entre",
  incluye: "incluye", no_incluye: "no incluye",
};

export function describirPredicado(p: Predicado): string {
  if (!esHecho(p.hecho)) return `${p.hecho} ${p.op} ${String(p.valor)}`;
  const h: Hecho = HECHOS[p.hecho];
  const u = h.unidad ?? "";

  if (p.op === "entre" && Array.isArray(p.valor)) {
    return `${h.etiqueta} está entre ${p.valor[0]}${u} y ${p.valor[1]}${u}`;
  }
  if (typeof p.valor === "boolean") {
    return p.valor ? h.etiqueta : `no ${h.etiqueta.toLowerCase()}`;
  }
  return `${h.etiqueta} ${TEXTO_OPERADOR[p.op]} ${p.valor}${typeof p.valor === "number" ? u : ""}`;
}

export function describirCondicion(c: Condicion): string {
  const partes = (c?.todas ?? []).map(describirPredicado);
  if (partes.length === 0) return "siempre";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

export function describirAcciones(a: Acciones): string[] {
  const frases: string[] = [];

  if (a.excluir_ejercicios?.length) frases.push(`excluye ${a.excluir_ejercicios.join(", ")}`);
  if (a.excluir_patrones?.length) {
    frases.push(`excluye los patrones ${a.excluir_patrones.map(nombrePatron).join(", ")}`);
  }
  if (a.sustituir_por?.length) frases.push(`sustituye por ${a.sustituir_por.join(" o ")}`);
  if (a.priorizar?.length) frases.push(`prioriza ${a.priorizar.join(", ")}`);
  if (a.modificador) frases.push(a.modificador.toLowerCase());
  if (a.prohibir_maniobra?.length) frases.push(`prohíbe ${a.prohibir_maniobra.join(" y ")}`);

  if (a.volumen_factor !== undefined) {
    const pct = Math.round(Math.abs(1 - a.volumen_factor) * 100);
    frases.push(
      a.volumen_factor < 1 ? `reduce el volumen un ${pct}%`
      : a.volumen_factor > 1 ? `aumenta el volumen un ${pct}%`
      : "deja el volumen igual",
    );
  }
  if (a.rir?.fijo !== undefined) frases.push(`fija el RIR en ${a.rir.fijo}`);
  if (a.rir?.piso !== undefined) frases.push(`no baja del RIR ${a.rir.piso}`);
  if (a.rir?.delta !== undefined) {
    frases.push(`${a.rir.delta >= 0 ? "sube" : "baja"} el RIR en ${Math.abs(a.rir.delta)}`);
  }
  if (a.ratio_patron) {
    // Con el nombre y no con la clave: `squat_dominante_rodilla` es identidad
    // interna, y esta frase la lee Giovanni en su editor y el entrenador en la
    // ficha del atleta.
    //
    // Separa con "y", no con "/", porque los nombres de patrón LLEVAN barra
    // ("Dominante / Bisagra de Cadera") y la frase quedaba imposible de leer:
    // no se sabía dónde acababa un patrón y empezaba el siguiente.
    const partes = Object.entries(a.ratio_patron).map(
      ([p, v]) => `${Math.round(v * 100)}% en ${nombrePatron(p)}`,
    );
    const reparto =
      partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
    frases.push(`reparte ${reparto}`);
  }
  if (a.volumen_series) {
    frases.push(`fija ${a.volumen_series.min}–${a.volumen_series.max} series por grupo y semana`);
  }

  return frases;
}

/** Una línea legible: "Si X, entonces Y." Se usa en el editor y en el motor. */
export function describirRegla(r: Regla): string {
  const acciones = describirAcciones(r.actions ?? {});
  const consecuencia = acciones.length > 0 ? acciones.join("; ") : "no hace nada";
  return `Si ${describirCondicion(r.condition)}, entonces ${consecuencia}.`;
}

/** Los hechos de un nivel, para el editor de reglas. */
export function hechosDeNivel(nivel: NivelMotor): ClaveHecho[] {
  return (Object.keys(HECHOS) as ClaveHecho[]).filter((k) => HECHOS[k].nivel === nivel);
}

export { PATRONES, type Patron, type Contraindicacion, type NivelEvidencia };
