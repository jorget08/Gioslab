/**
 * Movilidad articular — los seis tests de ROM (paso 4 del wizard, tarea 2.5).
 *
 * TRES CAPAS, y conviene tenerlas claras porque es donde estaba la confusión
 * que Giovanni resolvió en el MÓDULO 02 de sus aclaraciones:
 *
 *   1. MEDIDA      lo que el entrenador toma con cinta o goniómetro (9.5 cm, 115°)
 *   2. MICRO       Restringido / Óptimo, derivado del umbral
 *   3. MACRO       Eficiente / Compensada / De Riesgo, POR EJERCICIO
 *
 * Este archivo cubre 1 y 2. El macro es salida del motor de reglas (grupo 3) y
 * no se guarda en la evaluación: depende del ejercicio concreto y de la versión
 * de reglas vigente.
 *
 * Hasta el 3-nov se guardaba la MEDIDA y la etiqueta se derivaba del umbral.
 * Giovanni pidió quitar los grados: "escribir el valor exacto ralentiza la
 * evaluación en el gimnasio; un control de dos estados, Óptimo o Restringido".
 * Desde entonces el entrenador ELIGE el estado (`rom_estados`) y la medida
 * queda solo en las evaluaciones viejas, donde el estado sale del umbral como
 * antes. La dorsiflexión conserva sus tres estados porque sus dos reglas
 * (Limitada y Severa) mandan cosas distintas.
 *
 * Umbrales: ficha de movilidad de Giovanni (docs/ESPECIFICACION-FICHAS.md §4).
 * No hay ninguno inventado; los que faltan están anotados como tales.
 */

export const TESTS_MOVILIDAD = [
  "ankle_dorsiflexion_cm",
  "hip_flexion_deg",
  "hip_internal_rotation_deg",
  "thomas_test_deg",
  "slr_deg",
  "thoracic_extension",
  "shoulder_flexion_deg",
  "shoulder_external_rotation_deg",
] as const;

export type TestMovilidad = (typeof TESTS_MOVILIDAD)[number];

/** El vocabulario micro que él fijó. Dos estados, no tres. */
export type EstadoROM = "Óptimo" | "Restringido";

export interface MetaTest {
  etiqueta: string;
  /** Cómo se toma. El entrenador no debería tener que recordar el protocolo. */
  protocolo: string;
  unidad: "cm" | "°" | null;
  /** Rango duro, idéntico al CHECK de la tabla. */
  min: number;
  max: number;
  /** Desde este valor (inclusive) el test es Óptimo. */
  umbralOptimo: number;
  /**
   * El umbral y su consecuencia, en una frase.
   *
   * Se redacta siempre igual —"Óptimo desde X; por debajo, …"— porque aparece
   * bajo el resultado sea cual sea. Escribirla desde el caso restringido
   * ("Por debajo de 30°…") sonaba a reproche bajo un Óptimo, y desde el caso
   * favorable ("Desde 120° no hay restricción") sonaba a contradicción bajo un
   * Restringido.
   */
  implicacion: string;
}

export type TestNumerico = Exclude<TestMovilidad, "thoracic_extension">;

export const TESTS: Record<TestNumerico, MetaTest> = {
  ankle_dorsiflexion_cm: {
    etiqueta: "Dorsiflexión de tobillo",
    protocolo: "Test de pared: distancia del dedo gordo al muro con la rodilla tocando",
    unidad: "cm",
    min: 0,
    max: 30,
    umbralOptimo: 10,
    implicacion: "Óptimo desde 10 cm; por debajo, limita el rango profundo en sentadilla",
  },
  hip_flexion_deg: {
    etiqueta: "Flexión de cadera",
    protocolo: "Decúbito supino, rodilla flexionada, sin despegar la lumbar",
    unidad: "°",
    min: 0,
    max: 180,
    umbralOptimo: 120,
    implicacion: "Óptimo desde 120°; por debajo, restringe bisagras profundas y prensa",
  },
  hip_internal_rotation_deg: {
    etiqueta: "Rotación interna de cadera",
    protocolo: "Sentado, rodilla a 90°, llevar el pie hacia afuera",
    unidad: "°",
    min: 0,
    max: 90,
    umbralOptimo: 30,
    implicacion: "Óptimo desde 30°; por debajo, hay que abrir el stance de sentadilla",
  },
  // Thomas Test y SLR se SUMAN a los anteriores, no los sustituyen: se le
  // preguntó expresamente y mantuvo la flexión y la rotación interna de cadera,
  // "cruciales para valorar el espacio femoroacetabular".
  thomas_test_deg: {
    etiqueta: "Thomas Test",
    protocolo: "Tumbado al borde de la camilla, rodilla contraria al pecho; se mide la pierna que cuelga",
    unidad: "°",
    // El único test que admite negativos, y son los que importan: por debajo de
    // cero el muslo no llega a la horizontal, o sea flexores acortados.
    min: -40,
    max: 40,
    umbralOptimo: 0,
    implicacion: "Óptimo desde 0°; en negativo hay acortamiento de flexores de cadera",
  },
  slr_deg: {
    etiqueta: "Elevación de pierna recta",
    protocolo: "Decúbito supino, pierna extendida, se eleva hasta la primera resistencia",
    unidad: "°",
    min: 0,
    max: 130,
    umbralOptimo: 70,
    implicacion: "Óptimo desde 70°; por debajo, bloquea el peso muerto desde el suelo",
  },
  shoulder_flexion_deg: {
    etiqueta: "Flexión de hombro",
    protocolo: "Espalda contra la pared, brazo extendido por encima de la cabeza",
    unidad: "°",
    min: 0,
    max: 180,
    // 170 y no 180. Giovanni lo corrigió citando a la AAOS: la flexión
    // normotípica va de 165° a 180° según la báscula escapular y la cifosis de
    // cada uno, así que tratar 178° como restringido generaba falsos positivos
    // y bloqueaba trabajo overhead sin motivo. También descartó los 175° de su
    // propia matriz.
    umbralOptimo: 170,
    implicacion: "Óptimo desde 170°; por debajo, restringe el trabajo por encima de la cabeza",
  },
  shoulder_external_rotation_deg: {
    etiqueta: "Rotación externa de hombro",
    protocolo: "Codo pegado al costado a 90°, llevar el antebrazo hacia afuera",
    unidad: "°",
    min: 0,
    max: 90,
    umbralOptimo: 90,
    implicacion: "Óptimo a 90°; por debajo, restringe jalones y tracciones altas",
  },
};

/** El único test cualitativo: se observa de perfil, no se mide. */
export const EXTENSION_TORACICA = {
  etiqueta: "Extensión torácica",
  protocolo: "Observación de perfil en bipedestación",
  opciones: ["Normal", "Cifótica"] as const,
  implicacion: "Una curva cifótica desaconseja el press militar con barra",
};

export type ExtensionToracica = (typeof EXTENSION_TORACICA.opciones)[number];

/**
 * Severidad de la dorsiflexión.
 *
 * Es el único test donde el micro binario se queda corto: su ficha define DOS
 * bandas restringidas con acciones DISTINTAS —"<10 cm: calzado de elevación" y
 * "<5 cm: Hack Squat y Prensa + trabajo de movilidad"—, así que colapsarlas en
 * un solo "Restringido" perdería una regla suya.
 *
 * Se conserva la granularidad aquí, y el estado binario sigue existiendo para
 * el motor. No se contradicen: "Severa" y "Limitada" son ambas "Restringido".
 */
export type SeveridadDorsiflexion = "Severa" | "Limitada" | "Óptima";

export function severidadDorsiflexion(cm: number): SeveridadDorsiflexion {
  if (cm < 5) return "Severa";
  if (cm < 10) return "Limitada";
  return "Óptima";
}

/**
 * Deriva el estado micro de un test numérico.
 *
 * `null` cuando no hay medida: un test sin tomar no es "Óptimo". Esa distinción
 * importa porque el motor no puede tratar un dato ausente como si fuera un dato
 * favorable — sería prescribir sentadilla profunda a alguien a quien nadie le
 * midió el tobillo.
 */
export function estadoROM(
  test: Exclude<TestMovilidad, "thoracic_extension">,
  valor: number | null | undefined,
): EstadoROM | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  return valor >= TESTS[test].umbralOptimo ? "Óptimo" : "Restringido";
}

export function estadoExtensionToracica(
  valor: ExtensionToracica | null | undefined,
): EstadoROM | null {
  if (!valor) return null;
  return valor === "Normal" ? "Óptimo" : "Restringido";
}

/** Lo que el entrenador puede marcar en cada test (3-nov). */
export const OPCIONES_DORSIFLEXION = ["Óptima", "Limitada", "Severa"] as const;
export const OPCIONES_ROM = ["Óptimo", "Restringido"] as const;

export function opcionesDe(test: TestNumerico): readonly string[] {
  return test === "ankle_dorsiflexion_cm" ? OPCIONES_DORSIFLEXION : OPCIONES_ROM;
}

/**
 * El estado de un test tal como se presenta y como lo mira el motor: de la
 * medida si la hay (evaluaciones de antes del 3-nov) y si no, el que marcó el
 * entrenador. En la dorsiflexión es la severidad, no el binario.
 */
export function estadoElegido(
  test: TestNumerico,
  medida: number | null | undefined,
  /** Viene de un jsonb: se lee con desconfianza. */
  estados: unknown,
): string | null {
  if (medida !== null && medida !== undefined && !Number.isNaN(medida)) {
    return test === "ankle_dorsiflexion_cm" ? severidadDorsiflexion(medida) : estadoROM(test, medida);
  }
  const marcado =
    typeof estados === "object" && estados !== null && !Array.isArray(estados)
      ? (estados as Record<string, unknown>)[test]
      : undefined;
  return typeof marcado === "string" && opcionesDe(test).includes(marcado) ? marcado : null;
}

/** "Óptima" y "Óptimo" son Óptimo; "Limitada" y "Severa", Restringido. */
const binario = (estado: string | null): EstadoROM | null =>
  estado === null ? null : estado.startsWith("Óptim") ? "Óptimo" : "Restringido";

/** Rango duro, el mismo del CHECK. Evita que el guardado falle al final. */
export function fueraDeRango(
  test: Exclude<TestMovilidad, "thoracic_extension">,
  valor: number,
): string | null {
  const meta = TESTS[test];
  if (valor < meta.min || valor > meta.max) {
    return `${meta.etiqueta} debe estar entre ${meta.min} y ${meta.max}${meta.unidad ?? ""}.`;
  }
  return null;
}

export interface MedidasMovilidad {
  ankle_dorsiflexion_cm?: number | null;
  hip_flexion_deg?: number | null;
  hip_internal_rotation_deg?: number | null;
  thomas_test_deg?: number | null;
  slr_deg?: number | null;
  thoracic_extension?: ExtensionToracica | null;
  shoulder_flexion_deg?: number | null;
  shoulder_external_rotation_deg?: number | null;
  /** Lo que marcó el entrenador, test → estado. Ver `estadoElegido`. */
  rom_estados?: unknown;
}

export interface ResultadoTest {
  test: TestMovilidad;
  etiqueta: string;
  estado: EstadoROM | null;
  /** Lo medido, ya formateado para pantalla. `null` si no se tomó. */
  medida: string | null;
  implicacion: string;
}

/**
 * El perfil micro completo, listo para pintar.
 *
 * Devuelve TODOS los tests, incluidos los que no se tomaron, con estado `null`.
 * Ocultar los vacíos escondería que la evaluación está incompleta, que es
 * justo lo que el entrenador necesita ver antes de guardar.
 */
export function perfilMovilidad(m: MedidasMovilidad): ResultadoTest[] {
  const numericos = (
    Object.keys(TESTS) as Exclude<TestMovilidad, "thoracic_extension">[]
  ).map<ResultadoTest>((t) => {
    const valor = m[t];
    const meta = TESTS[t];
    return {
      test: t,
      etiqueta: meta.etiqueta,
      estado: binario(estadoElegido(t, valor, m.rom_estados)),
      medida: valor === null || valor === undefined ? null : `${valor}${meta.unidad}`,
      implicacion: meta.implicacion,
    };
  });

  const toracica: ResultadoTest = {
    test: "thoracic_extension",
    etiqueta: EXTENSION_TORACICA.etiqueta,
    estado: estadoExtensionToracica(m.thoracic_extension),
    medida: m.thoracic_extension ?? null,
    implicacion: EXTENSION_TORACICA.implicacion,
  };

  // Orden anatómico: tobillo → cadera → torso → hombro. Se parte por nombre y
  // no por índice porque al añadir tests el corte fijo se descolocaba.
  const esHombro = (t: string) =>
    t === "shoulder_flexion_deg" || t === "shoulder_external_rotation_deg";
  return [
    ...numericos.filter((r) => !esHombro(r.test)),
    toracica,
    ...numericos.filter((r) => esHombro(r.test)),
  ];
}

/** Cuántos tests se tomaron, para el aviso de evaluación incompleta. */
export function testsCompletados(m: MedidasMovilidad): number {
  return perfilMovilidad(m).filter((r) => r.estado !== null).length;
}

export const TOTAL_TESTS = TESTS_MOVILIDAD.length;
