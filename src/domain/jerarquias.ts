/**
 * Jerarquías J1 / J2 / J3 — documento de Giovanni del 25-sep.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SON, EN UNA FRASE
 * ---------------------------------------------------------------------------
 *
 * Cada ejercicio trabaja su músculo en una zona de su recorrido: estirado,
 * a medio camino o acortado. Su jerarquía dice EN QUÉ ORDEN se hacen:
 *
 *   J1  Estiramiento máximo / alta carga / alta demanda neural. Siempre primero.
 *   J2  Rango medio / multiarticular en máquina / estabilidad guiada.
 *   J3  Acortamiento / aislamiento / pico de contracción. Al final.
 *
 * Su base: Pedrosa et al. 2023, Kassiano et al. 2023 y Wolf et al. — a longitud
 * larga hay más hipertrofia aun igualando volumen. Por eso lo que más tensión
 * necesita va con el sistema nervioso fresco, y el fallo metabólico al final.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES DATO Y QUÉ ES CÓDIGO
 * ---------------------------------------------------------------------------
 *
 * La CLASIFICACIÓN de cada ejercicio es dato: tres columnas de
 * `exercise_library` que él edita desde la biblioteca (§3.1). Aquí está solo el
 * vocabulario y sus tres reglas de orden, que no dependen de ningún ejercicio
 * concreto ni de ninguna medida del atleta:
 *
 *   1. Si el J1 está restringido, se busca el J1 GUIADO antes de bajar a J2.
 *   2. Perfil compensatorio: J1 estiramiento → J3 acortamiento; J1 acortamiento
 *      (Hip Thrust) → J2 estiramiento.
 *   3. Nunca un J3 antes que un J1 en la misma sesión.
 *
 * Lo que NO está todavía —RPE, descanso y % de volumen por jerarquía— choca con
 * los parámetros por objetivo del método y se le preguntó. Hasta que conteste,
 * la jerarquía decide QUÉ y EN QUÉ ORDEN, no CUÁNTO.
 */

export const JERARQUIAS = [1, 2, 3] as const;
export type Jerarquia = (typeof JERARQUIAS)[number];

export const PERFILES = ["estiramiento", "medio", "acortamiento"] as const;
export type Perfil = (typeof PERFILES)[number];

export const FICHA_JERARQUIA: Record<Jerarquia, { nombre: string; detalle: string }> = {
  1: {
    nombre: "J1 · Estiramiento / alta carga",
    detalle: "Tensión mecánica máxima con frescura neural. Siempre va primero.",
  },
  2: {
    nombre: "J2 · Rango medio / guiado",
    detalle: "Acumular volumen sin fatiga lumbar ni central.",
  },
  3: {
    nombre: "J3 · Acortamiento / aislamiento",
    detalle: "Estrés metabólico y fallo sin riesgo sistémico. Va al final.",
  },
};

export const FICHA_PERFIL: Record<Perfil, string> = {
  estiramiento: "Músculo en longitud larga",
  medio: "Rango medio",
  acortamiento: "Músculo acortado, pico de contracción",
};

export function esJerarquia(v: unknown): v is Jerarquia {
  return v === 1 || v === 2 || v === 3;
}

export function esPerfil(v: unknown): v is Perfil {
  return typeof v === "string" && (PERFILES as readonly string[]).includes(v);
}

/** Lo que el generador necesita saber de un ejercicio para ordenarlo. */
export interface Clasificacion {
  jerarquia: Jerarquia | null;
  perfil: Perfil | null;
  guiada: boolean;
  aislamiento: boolean;
}

/**
 * Rango con el que se elige entre ejercicios del mismo patrón. Menor = antes.
 *
 * Dentro de J1, el libre va antes que el guiado: su regla 1 dice que el guiado
 * es el SUSTITUTO cuando el libre está restringido, no la primera opción. Como
 * el motor ya quitó de los candidatos lo restringido, ordenar así ES su
 * algoritmo: si el libre no está, sale el J1 guiado; si tampoco, el J2.
 *
 * Lo que él aún no clasificó va detrás de todo lo clasificado. No es castigo:
 * es que sobre eso no hay criterio suyo, y entre algo con criterio y algo sin
 * él, se elige lo primero.
 */
export function rangoDeEleccion(c: Clasificacion): number {
  if (c.jerarquia === null) return 10;
  return c.jerarquia * 2 + (c.guiada ? 1 : 0);
}

/**
 * Posición dentro de la sesión: J1, J2, J3.
 *
 * Lo no clasificado se coloca por lo que es: un compuesto con los J2 y un
 * aislamiento con los J3. Así nunca acaba un curl sin clasificar delante de la
 * sentadilla.
 */
export function posicionEnSesion(c: Pick<Clasificacion, "jerarquia" | "aislamiento">): number {
  if (c.jerarquia !== null) return c.jerarquia;
  return c.aislamiento ? 3 : 2;
}

/** El perfil que tiene que acompañar a un J1, según su regla 2. */
export function perfilCompensatorio(perfilJ1: Perfil | null): { jerarquia: Jerarquia; perfil: Perfil } | null {
  if (perfilJ1 === "estiramiento") return { jerarquia: 3, perfil: "acortamiento" };
  if (perfilJ1 === "acortamiento") return { jerarquia: 2, perfil: "estiramiento" };
  return null;
}

/**
 * La sesión en el orden de su regla 3: J1, J2, J3.
 *
 * Estable a propósito: entre dos J1 se respeta el orden en que se eligieron,
 * que ya trae la preferencia del motor y la del reparto por patrón.
 */
export function ordenarSesion<T>(
  sesion: readonly T[],
  clasificacion: (t: T) => Pick<Clasificacion, "jerarquia" | "aislamiento">,
): T[] {
  return sesion
    .map((t, i) => ({ t, i, p: posicionEnSesion(clasificacion(t)) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map(({ t }) => t);
}

interface EnSesion {
  nombre: string;
  /** El músculo, no el grupo de volumen: "Piernas" junta tres músculos. */
  musculo: string | null;
  jerarquia: Jerarquia | null;
  perfil: Perfil | null;
}

/**
 * Los J1 de una sesión a los que les falta su compañero de la regla 2.
 *
 * Él lo llamó "obligatorio", pero su propio reparto tiene días que no admiten
 * aislamiento —el primer torso de la semana de 4 días—, y ahí un J3 de pecho
 * no cabe. Lo que no cabe no se fuerza: se devuelve para avisar.
 */
export function compensatoriosQueFaltan(
  sesion: readonly EnSesion[],
): { j1: string; musculo: string; falta: { jerarquia: Jerarquia; perfil: Perfil } }[] {
  const faltan: { j1: string; musculo: string; falta: { jerarquia: Jerarquia; perfil: Perfil } }[] = [];
  for (const e of sesion) {
    if (e.jerarquia !== 1 || !e.musculo) continue;
    const falta = perfilCompensatorio(e.perfil);
    if (!falta) continue;
    const cubierto = sesion.some(
      (o) => o.musculo === e.musculo && o.jerarquia === falta.jerarquia && o.perfil === falta.perfil,
    );
    if (!cubierto) faltan.push({ j1: e.nombre, musculo: e.musculo, falta });
  }
  return faltan;
}

/**
 * ¿Hay un J3 antes que algún J1? Devuelve los nombres que rompen su regla 3.
 *
 * Por SESIÓN, que es como lo escribió: "el sistema debe bloquear rutinas que
 * pongan J3 antes que J1". Su propio plan para Miguel pone un J3 (extensión de
 * cuádriceps) antes de un J2 (curl femoral), así que J3 antes de J2 sí vale.
 */
export function j3AntesDeJ1(
  ejercicios: readonly { ejercicio: string; jerarquia?: number | null }[],
): { j3: string; j1: string }[] {
  const fallos: { j3: string; j1: string }[] = [];
  const j3Vistos: string[] = [];
  for (const e of ejercicios) {
    if (e.jerarquia === 3) j3Vistos.push(e.ejercicio);
    if (e.jerarquia === 1) for (const j3 of j3Vistos) fallos.push({ j3, j1: e.ejercicio });
  }
  return fallos;
}
