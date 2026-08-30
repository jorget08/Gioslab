/**
 * Fotos y video de un ejercicio (tarea 4.2).
 *
 * Viven en `exercise_library.media_urls`, que es un jsonb array. Guardamos la
 * RUTA dentro del bucket, no la URL completa: la URL lleva dentro el dominio del
 * proyecto de Supabase, así que congelarla en la base ata cada fila a un entorno
 * concreto. Con la ruta, la misma fila sirve en local, en dev y en producción.
 *
 * EL ORDEN IMPORTA: el primero es la portada. Por eso es un array y no un
 * conjunto, y por eso "hacer portada" mueve al frente en vez de marcar un campo.
 */

export const TIPOS_MEDIO = ["foto", "video"] as const;
export type TipoMedio = (typeof TIPOS_MEDIO)[number];

export interface Medio {
  tipo: TipoMedio;
  /** Ruta dentro del bucket `ejercicios`, p. ej. `<id>/<uuid>.jpg`. */
  path: string;
}

/** El bucket de Supabase Storage donde vive todo esto. */
export const BUCKET_EJERCICIOS = "ejercicios";

/**
 * Formatos que aceptamos.
 *
 * HEIC está en la lista aunque no lo podamos comprimir: es el formato con el que
 * dispara un iPhone. Safari suele convertirlo a JPEG al elegirlo desde un
 * `<input type="file">`, pero cuando no lo hace, rechazarlo dejaría a Giovanni
 * sin poder subir una foto tomada con su propio teléfono. Se sube tal cual.
 */
export const FORMATOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const FORMATOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Topes de tamaño, en bytes.
 *
 * La foto se comprime antes de subir, así que este tope es sobre el ORIGINAL y
 * solo existe para no reventar el canvas con una imagen absurda.
 *
 * El video no se comprime: transcodificar en el navegador es lento y frágil, y
 * no es lo que pide la tarjeta. 50 MB dan de sobra para un clip de técnica de
 * 20–30 segundos, que es para lo que sirve. Un video más largo que eso no es una
 * demostración, es una clase, y esa va en otro sitio.
 */
export const MAX_FOTO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Lado mayor al que se reduce una foto antes de subirla. */
export const LADO_MAXIMO_FOTO = 1600;

/** Calidad del JPEG resultante. Por debajo de 0.8 se ve el bloque en la piel. */
export const CALIDAD_FOTO = 0.82;

export function esTipoMedio(v: unknown): v is TipoMedio {
  return typeof v === "string" && (TIPOS_MEDIO as readonly string[]).includes(v);
}

/**
 * Lee el jsonb con desconfianza: es una columna libre y puede traer cualquier
 * cosa de una carga anterior o de un seed. Lo que no reconozcamos se descarta en
 * silencio antes de que llegue a la interfaz.
 */
export function leerMedios(crudo: unknown): Medio[] {
  if (!Array.isArray(crudo)) return [];

  const vistas = new Set<string>();
  const salida: Medio[] = [];

  for (const v of crudo) {
    if (typeof v !== "object" || v === null) continue;
    const { tipo, path } = v as { tipo?: unknown; path?: unknown };
    if (!esTipoMedio(tipo)) continue;
    if (typeof path !== "string" || path.trim() === "") continue;
    if (vistas.has(path)) continue;
    vistas.add(path);
    salida.push({ tipo, path });
  }

  return salida;
}

/** ¿Qué es este archivo? `null` si no es nada que aceptemos. */
export function tipoDeArchivo(mime: string): TipoMedio | null {
  if (FORMATOS_FOTO.includes(mime)) return "foto";
  if (FORMATOS_VIDEO.includes(mime)) return "video";
  return null;
}

export function limiteDe(tipo: TipoMedio): number {
  return tipo === "foto" ? MAX_FOTO_BYTES : MAX_VIDEO_BYTES;
}

/** "48,2 MB" — para poder decirle a Giovanni cuánto pesa lo que intentó subir. */
export function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Por qué no se puede subir este archivo, o `null` si sí se puede.
 *
 * Devuelve el mensaje ya escrito para la persona, no un código: el único sitio
 * donde se muestra es la galería, y partirlo en dos añade indirección sin nada
 * a cambio.
 */
export function motivoDeRechazo(mime: string, bytes: number): string | null {
  const tipo = tipoDeArchivo(mime);
  if (!tipo) return "Solo aceptamos imágenes (JPG, PNG, WEBP) y video (MP4, MOV, WEBM).";

  const limite = limiteDe(tipo);
  if (bytes > limite) {
    return tipo === "foto"
      ? `Esa imagen pesa ${pesoLegible(bytes)} y el tope son ${pesoLegible(limite)}.`
      : `Ese video pesa ${pesoLegible(bytes)} y el tope son ${pesoLegible(limite)}. ` +
          "Recórtalo: para enseñar la técnica bastan 20 o 30 segundos.";
  }

  return null;
}

/**
 * Extensión con la que guardar el archivo.
 *
 * No se toma del nombre original: en Android llegan archivos llamados `image`
 * sin extensión, y en iOS a veces `image.jpeg` para un HEIC. Manda el MIME, que
 * es lo que el navegador sí sabe.
 */
export function extensionDe(mime: string): string {
  const mapa: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return mapa[mime] ?? "bin";
}

/**
 * Ruta donde se guarda un archivo nuevo.
 *
 * Se agrupa por ejercicio para que borrar uno sea borrar una carpeta, y el
 * nombre es un uuid porque el bucket es público: con el nombre original,
 * `sentadilla.jpg` sería adivinable desde fuera.
 */
export function rutaNueva(ejercicioId: string, mime: string, uuid: string): string {
  return `${ejercicioId}/${uuid}.${extensionDe(mime)}`;
}

/** Mueve un medio al frente: el primero es la portada. */
export function hacerPortada(medios: readonly Medio[], path: string): Medio[] {
  const elegido = medios.find((m) => m.path === path);
  if (!elegido) return [...medios];
  return [elegido, ...medios.filter((m) => m.path !== path)];
}

export function quitarMedio(medios: readonly Medio[], path: string): Medio[] {
  return medios.filter((m) => m.path !== path);
}

/**
 * La foto que representa al ejercicio en el listado.
 *
 * Se busca la primera FOTO, no el primer medio: un video sin fotograma de
 * portada no se puede pintar como miniatura sin descargarlo entero, y descargar
 * un video por cada fila de la lista es justo lo que no queremos en el celular
 * de alguien con mala señal.
 */
export function portada(medios: readonly Medio[]): Medio | null {
  return medios.find((m) => m.tipo === "foto") ?? null;
}

export function tieneVideo(medios: readonly Medio[]): boolean {
  return medios.some((m) => m.tipo === "video");
}
