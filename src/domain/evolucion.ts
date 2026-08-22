/**
 * Evolución entre dos evaluaciones — la ficha del atleta (tarea 2.9).
 *
 * "El valor del producto está en mostrar la evolución del atleta" (CLAUDE.md
 * §3.5). Un número suelto —18.02 % de grasa— no dice nada; comparado con el
 * 21.4 % de hace cuatro meses, sí.
 *
 * ⚠️ AQUÍ NO SE JUZGA. Se muestra qué cambió, cuánto y en qué dirección, sin
 * pintar de verde lo "bueno" ni de rojo lo "malo". Bajar de peso es un logro
 * para quien busca perder grasa y un problema para quien busca ganar masa, y
 * decidir cuál es cuál es criterio metodológico de Giovanni, no nuestro
 * (CLAUDE.md §6, "no inventes datos de dominio").
 *
 * La única interpretación que damos es la que está escrita en su ficha: el
 * ratio cintura/cadera. Ver `riesgoCinturaCadera`.
 */

export type Direccion = "sube" | "baja" | "igual";

export interface Variacion {
  /** Diferencia con signo: negativa si bajó. */
  delta: number;
  direccion: Direccion;
  /** Cambio relativo, para saber si un delta es grande o anecdótico. */
  porcentaje: number | null;
  /** Ya formateado con signo y unidad: "−3.4 %", "+1.2 kg". */
  texto: string;
}

/** Redondeo estable, sin los sustos binarios de toFixed. */
const redondear = (v: number, d: number): number =>
  Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;

/**
 * Compara un valor con el de la evaluación anterior.
 *
 * `null` cuando falta alguno de los dos: sin punto de comparación no hay
 * evolución que mostrar, y un "+0" inventado sería peor que no enseñar nada.
 */
export function variacion(
  actual: number | null | undefined,
  anterior: number | null | undefined,
  unidad = "",
  decimales = 1,
): Variacion | null {
  if (actual === null || actual === undefined || Number.isNaN(actual)) return null;
  if (anterior === null || anterior === undefined || Number.isNaN(anterior)) return null;

  const delta = redondear(actual - anterior, decimales);

  // Se compara el delta YA REDONDEADO. Si no, una diferencia de 0.04 kg se
  // anunciaría como "+0.0 kg", que es una flecha de cambio sobre algo que no
  // cambió: ruido que hace desconfiar del resto de la pantalla.
  const direccion: Direccion = delta > 0 ? "sube" : delta < 0 ? "baja" : "igual";

  // El signo menos tipográfico (−, U+2212) y no el guion: alineado con las
  // cifras tabulares y sin el riesgo de que se lea como un separador.
  const signo = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const magnitud = Math.abs(delta).toFixed(decimales);
  const sufijo = unidad ? ` ${unidad}` : "";

  return {
    delta,
    direccion,
    porcentaje: anterior === 0 ? null : redondear(((actual - anterior) / anterior) * 100, 1),
    texto: direccion === "igual" ? `sin cambio` : `${signo}${magnitud}${sufijo}`,
  };
}

/**
 * Riesgo por ratio cintura/cadera.
 *
 * ÚNICO umbral interpretativo del proyecto, y está en su ficha: riesgo por
 * encima de 0.85 **en mujeres**.
 *
 * Para hombres su ficha no da corte, así que devolvemos `null` en lugar del
 * 0.90 que aparece en la literatura general: rellenar el hueco con un valor
 * verosímil que él no ha validado sería exactamente lo que el CLAUDE.md
 * prohíbe. Cuando lo confirme, se añade aquí y en un test.
 */
export function riesgoCinturaCadera(
  rcc: number | null | undefined,
  sexo: string | null | undefined,
): boolean | null {
  if (rcc === null || rcc === undefined || Number.isNaN(rcc)) return null;
  if (sexo !== "femenino") return null;
  return rcc > 0.85;
}

/**
 * Cuánto tiempo pasó entre dos evaluaciones.
 *
 * Da contexto al delta: perder dos kilos en tres semanas y perderlos en ocho
 * meses son dos historias distintas.
 */
export function intervalo(desdeISO: string, hastaISO: string): string {
  const a = new Date(desdeISO);
  const b = new Date(hastaISO);
  const dias = Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);

  if (dias === 0) return "el mismo día";
  if (dias === 1) return "1 día después";
  if (dias < 31) return `${dias} días después`;

  const meses = Math.round(dias / 30.44);
  if (meses <= 1) return "1 mes después";
  if (meses < 12) return `${meses} meses después`;

  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const base = anios === 1 ? "1 año" : `${anios} años`;
  return resto === 0 ? `${base} después` : `${base} y ${resto} m después`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Fecha corta para rótulos e historial: "15 mar 2026".
 *
 * Se arma a mano en vez de con `toLocaleDateString`, que en es-CO devuelve
 * "15 de mar de 2026": dos preposiciones que no aportan nada y que en un rótulo
 * en mayúsculas ocupan media línea.
 *
 * La zona horaria se fija a Bogotá porque una medición guardada a las 8 de la
 * noche es la 1 de la madrugada del día siguiente en UTC, y el historial
 * mostraría el día equivocado.
 */
export function fechaCorta(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

  const [anio, mes, dia] = partes.split("-");
  return `${Number(dia)} ${MESES[Number(mes) - 1]} ${anio}`;
}

export interface FilaHistorial<T> {
  fecha: string;
  registro: T;
  /** Respecto a la entrada inmediatamente anterior en el tiempo. */
  desdeLaAnterior: string | null;
}

/**
 * Prepara un historial para pintarlo: más reciente arriba, y cada entrada
 * sabiendo cuánto pasó desde la anterior.
 *
 * Recibe los registros en cualquier orden y los ordena aquí, porque de qué
 * consulta vengan no debería cambiar lo que se ve.
 */
export function prepararHistorial<T>(
  registros: readonly T[],
  fechaDe: (r: T) => string,
): FilaHistorial<T>[] {
  const orden = [...registros].sort(
    (a, b) => new Date(fechaDe(b)).getTime() - new Date(fechaDe(a)).getTime(),
  );

  return orden.map((registro, i) => {
    const previa = orden[i + 1]; // el siguiente en la lista es el anterior en el tiempo
    return {
      fecha: fechaDe(registro),
      registro,
      desdeLaAnterior: previa ? intervalo(fechaDe(previa), fechaDe(registro)) : null,
    };
  });
}
