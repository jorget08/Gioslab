/**
 * Contraindicaciones — dos familias, respuesta de Giovanni del 2026-08-22.
 *
 * Yo propuse una sola lista de zonas del cuerpo. Su respuesta la aceptó y añadió
 * una segunda familia que yo no había visto, y que cambia el diseño del motor:
 *
 *   ANATÓMICA   una articulación o zona lesionada.
 *               → el motor FILTRA el ejercicio.
 *
 *   SISTÉMICA   una condición fisiológica (hipertensión, embarazo…).
 *               → el motor filtra el ejercicio Y AJUSTA CÓMO SE EJECUTA:
 *                 maniobra respiratoria, RIR, posición corporal.
 *
 * Esa segunda parte es lo importante. Una contraindicación sistémica no siempre
 * quita el ejercicio: a veces lo deja y cambia la ejecución. Un modelo que solo
 * supiera incluir o excluir no podría expresar "sí, pero sin Valsalva".
 *
 * CERO TEXTO LIBRE, palabras suyas. Es lo que permite que el cruce entre lo que
 * tiene el atleta y lo que contraindica el ejercicio sea una comparación exacta
 * y no una adivinanza (§3.6: el motor tiene que poder explicar qué aplicó).
 */

/**
 * Zonas anatómicas.
 *
 * Ocho son literalmente las suyas. `Dorsal` y `Pie` los conservamos nosotros:
 * ya estaban en el catálogo de lesiones del atleta, y quitarlos dejaría una
 * fascitis plantar o una molestia dorsal sin forma de registrarse ni de
 * cruzarse. Sobrarle una etiqueta al motor no cuesta nada; faltarle, sí.
 * Anotado en PREGUNTAS-GIOVANNI para que confirme.
 *
 * En orden de cabeza a pies, que es como se recorre a alguien explorándolo.
 */
export const ZONAS_ANATOMICAS = [
  "Cervical",
  "Dorsal",
  "Lumbar",
  "Hombro",
  "Codo",
  "Muñeca/Antebrazo",
  "Cadera",
  "Rodilla",
  "Tobillo",
  "Pie",
] as const;

export type ZonaAnatomica = (typeof ZONAS_ANATOMICAS)[number];

export const CONDICIONES_SISTEMICAS = [
  "Hipertensión / Cardiovascular",
  "Embarazo",
  "Hernia discal / Patología axial",
  "Diástasis abdominal",
] as const;

export type CondicionSistemica = (typeof CONDICIONES_SISTEMICAS)[number];

export type Contraindicacion = ZonaAnatomica | CondicionSistemica;

export const CONTRAINDICACIONES: readonly Contraindicacion[] = [
  ...ZONAS_ANATOMICAS,
  ...CONDICIONES_SISTEMICAS,
];

/**
 * Qué implica cada condición sistémica, en las palabras de Giovanni.
 *
 * ⚠️ ESTO NO ES LA REGLA, ES SU ENUNCIADO. Se muestra en pantalla para que
 * quien clasifica un ejercicio sepa qué está marcando. La regla ejecutable vive
 * en la tabla `rules`, versionada y editable por él, porque las reglas son
 * datos y no código (CLAUDE.md §3.1). Si algún día el motor lee este texto para
 * decidir algo, el diseño se rompió.
 */
export const REGLA_SISTEMICA: Record<CondicionSistemica, string> = {
  "Hipertensión / Cardiovascular":
    "Bloquea la maniobra de Valsalva, las series al fallo extremo y los isométricos de muy larga duración.",
  Embarazo:
    "Bloquea el decúbito prono a partir del primer trimestre, el riesgo de impacto y la presión intraabdominal extrema.",
  "Hernia discal / Patología axial":
    "Bloquea las cargas axiales con compresión directa sobre la columna, como la sentadilla libre pesada.",
  "Diástasis abdominal":
    "Bloquea las flexiones de tronco tradicionales y prioriza estabilidad de core anti-extensión.",
};

export function esZonaAnatomica(v: unknown): v is ZonaAnatomica {
  return typeof v === "string" && (ZONAS_ANATOMICAS as readonly string[]).includes(v);
}

export function esCondicionSistemica(v: unknown): v is CondicionSistemica {
  return typeof v === "string" && (CONDICIONES_SISTEMICAS as readonly string[]).includes(v);
}

export function esContraindicacion(v: unknown): v is Contraindicacion {
  return esZonaAnatomica(v) || esCondicionSistemica(v);
}

/**
 * Cómo actúa el motor ante cada familia.
 *
 * Se expone como dato y no como un `if` repartido por la interfaz porque es la
 * diferencia que hay que explicarle al entrenador cuando pregunte por qué un
 * ejercicio desapareció y otro solo cambió de ejecución.
 */
export function efectoEnElMotor(c: Contraindicacion): "filtra" | "filtra-y-ajusta" {
  return esCondicionSistemica(c) ? "filtra-y-ajusta" : "filtra";
}

/**
 * Lee una lista guardada sin fiarse de su forma.
 *
 * La columna es `jsonb` y durante toda la Fase A aceptó cualquier cosa. Lo que
 * no esté en catálogo se descarta: pintar una contraindicación que el motor no
 * va a poder cruzar, como si fuera a proteger a alguien, es peor que no pintar
 * nada.
 */
export function leerContraindicaciones(crudo: unknown): Contraindicacion[] {
  if (!Array.isArray(crudo)) return [];
  const vistas = new Set<string>();
  const salida: Contraindicacion[] = [];
  for (const v of crudo) {
    if (esContraindicacion(v) && !vistas.has(v)) {
      vistas.add(v);
      salida.push(v);
    }
  }
  return salida;
}

/** Separadas por familia, para pintarlas en dos grupos. */
export function porFamilia(lista: readonly Contraindicacion[]): {
  anatomicas: ZonaAnatomica[];
  sistemicas: CondicionSistemica[];
} {
  return {
    anatomicas: lista.filter(esZonaAnatomica),
    sistemicas: lista.filter(esCondicionSistemica),
  };
}

/**
 * Normaliza una zona escrita antes de que el catálogo existiera.
 *
 * `athlete_injuries.body_region` nunca tuvo CHECK: el formulario ofrecía un
 * desplegable, pero la base aceptaba cualquier texto y hay filas con "zona
 * lumbar" o "rodilla derecha". Esto recupera las que se pueden salvar.
 *
 * Devuelve `null` cuando no hay una correspondencia clara. No se adivina: meter
 * una lesión en la articulación equivocada es peor que dejarla sin clasificar.
 */
export function normalizarZona(crudo: string | null | undefined): ZonaAnatomica | null {
  if (!crudo) return null;

  const plano = crudo
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // "zona lumbar" → "lumbar"; "columna cervical" → "cervical"
    .replace(/^(zona|region|columna)\s+/, "");

  if (!plano) return null;

  for (const zona of ZONAS_ANATOMICAS) {
    const clave = zona
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // La etiqueta completa primero: si no, "muñeca/antebrazo" —que YA es la
    // forma buena— no coincidiría con ninguna de sus partes y volver a pasar el
    // normalizador sobre datos limpios los anularía.
    if (plano === clave) return zona;

    // Después cada parte por separado, para "Muñeca" y "antebrazo izquierdo".
    for (const parte of clave.split("/")) {
      // Prefijo, para que "rodilla derecha" caiga en "Rodilla". Al revés no:
      // que el texto sea prefijo de la etiqueta convertiría "co" en "Codo".
      if (plano === parte || plano.startsWith(`${parte} `)) return zona;
    }
  }

  return null;
}
