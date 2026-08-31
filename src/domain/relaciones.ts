/**
 * Relaciones entre ejercicios (tarea 4.3).
 *
 * ---------------------------------------------------------------------------
 * QUÉ PROBLEMA RESUELVE, Y POR QUÉ AHORA
 * ---------------------------------------------------------------------------
 *
 * Hoy el motor solo sabe ofrecer un sustituto cuando la REGLA lo dice: la
 * acción `sustituir_por` de la matriz. Eso cubre lo que Giovanni escribió a
 * mano, y nada más.
 *
 * Pero la mayor parte de las exclusiones no vienen de una regla: vienen del
 * CRUCE de contraindicaciones, que es un mecanismo y no una fila de `rules`.
 * Ahí el motor devuelve la lista de sustitutos vacía. Con la carga del 31-ago
 * eso dejó de ser teórico: un atleta con lesión de rodilla pierde los 12
 * dominantes de rodilla y el entrenador no recibe ni una alternativa.
 *
 * Esta matriz es la segunda fuente de sustitutos, independiente de las reglas.
 * Es lo que Giovanni pidió como "matriz de equivalencia biomecánica […]
 * manteniendo el mismo estímulo objetivo" (Recomendaciones MVP, módulo 2), y lo
 * clasificó de valor "muy alto" para la Fase 1.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO BASTA EL PATRÓN
 * ---------------------------------------------------------------------------
 *
 * El patrón de movimiento ya agrupa ejercicios intercambiables *a grandes
 * rasgos*, y es con lo que se ha sustituido hasta ahora. Pero es demasiado
 * grueso: `Sentadilla Libre Profunda` y `Sissy Squat` comparten
 * `squat_dominante_rodilla` y no son intercambiables para nadie. Ofrecer uno en
 * lugar del otro por el mero hecho de compartir patrón es la clase de
 * sugerencia que hace que un entrenador deje de fiarse del sistema.
 *
 * La relación curada dice lo que el patrón no puede: que estos dos SÍ.
 */

/**
 * Vocabulario de relaciones.
 *
 * ⚠️ PROVISIONAL. La migración original dejó `relation_type` como texto libre
 * con un "PENDIENTE DE GIOVANNI: ¿variante, sustitución, progresión,
 * regresión?". Sigue sin cerrarlo, así que se fija el conjunto MÍNIMO que el
 * motor sabe interpretar, en vez de dejar texto libre que ignoraría en silencio.
 *
 * Los tres nombres son SUYOS, no míos: "equivalencia biomecánica" es como llama
 * a la matriz en Recomendaciones MVP, y `sustituir_por` es la acción que ya usa
 * su matriz de reglas. El seed ya guardaba 'sustitucion' con ese sentido. Si él
 * añade vocabulario, se amplía aquí y en el CHECK de la migración a la vez.
 */
export const RELACIONES = ["equivalente", "sustitucion", "progresion"] as const;
export type TipoRelacion = (typeof RELACIONES)[number];

export function esTipoRelacion(v: unknown): v is TipoRelacion {
  return typeof v === "string" && (RELACIONES as readonly string[]).includes(v);
}

/**
 * Una relación, leída siempre como «de `ejercicio` hacia `variante`».
 *
 * La dirección NO es decorativa, es la mitad del significado: que la Goblet sea
 * sustituta de la Sentadilla Profunda permite ofrecerla cuando la profunda
 * se cae, pero no al revés. Si alguien no puede hacer la Goblet, mandarle la
 * profunda sería mandarle algo más duro justo cuando algo ya le duele.
 */
export interface Relacion {
  ejercicio: string;
  variante: string;
  tipo: TipoRelacion;
}

/** Cómo se lee cada relación en pantalla, desde el ejercicio que se está viendo. */
export const FICHA_RELACION: Record<
  TipoRelacion,
  { nombre: string; desde: string; hacia: string; ayuda: string }
> = {
  equivalente: {
    nombre: "Equivalente",
    desde: "Equivale a",
    hacia: "Equivale a",
    ayuda: "Mismo estímulo objetivo. Se pueden cambiar el uno por el otro en cualquier dirección.",
  },
  sustitucion: {
    nombre: "Sustitución",
    desde: "Se puede reemplazar por",
    hacia: "Entra en lugar de",
    ayuda: "Reemplaza a este cuando queda descartado. Solo en esa dirección.",
  },
  progresion: {
    nombre: "Progresión",
    desde: "Versión más exigente",
    hacia: "Es la versión accesible de",
    ayuda: "Más exigente. El motor NUNCA la ofrece como alternativa de seguridad.",
  },
};

/**
 * Qué puede entrar en lugar de `ejercicio`, en orden de preferencia.
 *
 * Las cuatro lecturas, que son la traducción literal de la dirección:
 *
 *   (A, B, equivalente) → B reemplaza a A, y A reemplaza a B.
 *   (A, B, sustitucion) → B reemplaza a A. Solo en esa dirección.
 *   (A, B, progresion)  → B es más exigente que A: A reemplaza a B.
 *
 * Los equivalentes van primero porque conservan el estímulo; las sustituciones
 * después. Nunca se ofrece una progresión: si un ejercicio se cayó porque algo
 * le duele, algo más duro no es la respuesta.
 */
export function sustitutosDe(
  relaciones: readonly Relacion[],
  ejercicio: string,
): string[] {
  const equivalentes: string[] = [];
  const accesibles: string[] = [];

  for (const r of relaciones) {
    if (r.tipo === "equivalente") {
      if (r.ejercicio === ejercicio) equivalentes.push(r.variante);
      else if (r.variante === ejercicio) equivalentes.push(r.ejercicio);
    } else if (r.tipo === "sustitucion") {
      if (r.ejercicio === ejercicio) accesibles.push(r.variante);
    } else if (r.tipo === "progresion") {
      // Una progresión leída al revés es una alternativa válida: si B es más
      // exigente que A, entonces A sirve cuando B se cae.
      if (r.variante === ejercicio) accesibles.push(r.ejercicio);
    }
  }

  // Un ejercicio no se sustituye a sí mismo aunque alguien lo haya guardado así.
  return [...new Set([...equivalentes, ...accesibles])].filter((n) => n !== ejercicio);
}

/** Toda relación que toca a un ejercicio, para pintarla en su ficha. */
export interface RelacionVista {
  /** El OTRO ejercicio. */
  otro: string;
  tipo: TipoRelacion;
  /** `true` si la fila se guardó desde este ejercicio; decide cómo se enuncia. */
  saliente: boolean;
}

export function relacionesDe(
  relaciones: readonly Relacion[],
  ejercicio: string,
): RelacionVista[] {
  const vistas: RelacionVista[] = [];
  for (const r of relaciones) {
    if (r.ejercicio === ejercicio) vistas.push({ otro: r.variante, tipo: r.tipo, saliente: true });
    else if (r.variante === ejercicio)
      vistas.push({ otro: r.ejercicio, tipo: r.tipo, saliente: false });
  }
  return vistas.sort(
    (a, b) => RELACIONES.indexOf(a.tipo) - RELACIONES.indexOf(b.tipo) || a.otro.localeCompare(b.otro, "es"),
  );
}

/**
 * Por qué no se puede guardar esta relación, o `null` si sí se puede.
 *
 * El caso que persigue no lo puede atrapar la base: dos filas legítimas por
 * separado que juntas se contradicen. Guardar «la Goblet sustituye a la Profunda»
 * y también «la Profunda sustituye a la Goblet» deja al motor
 * ofreciendo cada una en lugar de la otra para siempre, sin que nada falle.
 */
export function conflictoDeRelacion(
  relaciones: readonly Relacion[],
  nueva: Relacion,
): string | null {
  if (nueva.ejercicio === nueva.variante) {
    return "Un ejercicio no puede relacionarse consigo mismo.";
  }

  for (const r of relaciones) {
    const mismoPar =
      (r.ejercicio === nueva.ejercicio && r.variante === nueva.variante) ||
      (r.ejercicio === nueva.variante && r.variante === nueva.ejercicio);
    if (!mismoPar) continue;

    if (r.tipo === nueva.tipo && r.ejercicio === nueva.ejercicio) {
      return "Esa relación ya está guardada.";
    }
    return (
      `Ya hay una relación entre estos dos ejercicios ` +
      `(${FICHA_RELACION[r.tipo].nombre.toLowerCase()}). Quítala antes de poner otra: ` +
      `dos relaciones distintas para la misma pareja se contradicen.`
    );
  }

  return null;
}
