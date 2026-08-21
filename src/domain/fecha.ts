/**
 * Conversión entre tres campos sueltos (día, mes, año) y la fecha ISO que
 * guarda la base.
 *
 * Existe porque un selector de calendario es lo peor posible para una fecha de
 * NACIMIENTO: obliga a retroceder treinta años a golpe de flecha. Tres campos
 * numéricos con teclado de números se llenan en cinco segundos y con una mano.
 *
 * Funciones puras: aquí es donde viven los errores sutiles de fechas, así que
 * se prueban aparte de la interfaz.
 */

const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasDelMes(mes: number, anio: number): number {
  if (mes < 1 || mes > 12) return 0;
  if (mes === 2 && esBisiesto(anio)) return 29;
  return DIAS_POR_MES[mes - 1];
}

/**
 * Arma la fecha ISO (AAAA-MM-DD) o devuelve "" si todavía no está completa o
 * no es válida.
 *
 * Se valida el día contra el mes REAL: el 31 de febrero no existe, y aceptarlo
 * dejaría que el navegador lo "corrija" a marzo sin avisar a nadie.
 */
export function aISO(dia: string, mes: string, anio: string): string {
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(anio);

  if (!dia || !mes || !anio) return "";
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(a)) return "";
  if (anio.length !== 4) return "";
  if (m < 1 || m > 12) return "";
  if (d < 1 || d > diasDelMes(m, a)) return "";

  return `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Descompone una fecha ISO en los tres campos. */
export function desdeISO(iso: string | undefined | null): {
  dia: string;
  mes: string;
  anio: string;
} {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { dia: "", mes: "", anio: "" };
  const [a, m, d] = iso.split("-");
  return { dia: d, mes: m, anio: a };
}

/** Solo dígitos, recortado a `max`. Lo que se teclea nunca se pelea con el campo. */
export function soloDigitos(valor: string, max: number): string {
  return valor.replace(/\D/g, "").slice(0, max);
}

/**
 * ¿Este campo ya está completo y hay que saltar al siguiente?
 *
 * El día y el mes saltan con 2 dígitos, pero también con uno solo si ya no
 * puede crecer: al escribir "5" en el mes, no hay ningún mes que empiece por 5
 * y tenga dos cifras, así que esperar un segundo dígito es hacer perder tiempo.
 */
export function campoCompleto(valor: string, tipo: "dia" | "mes" | "anio"): boolean {
  if (tipo === "anio") return valor.length === 4;
  if (valor.length === 2) return true;
  if (valor.length !== 1) return false;

  const n = Number(valor);
  if (tipo === "mes") return n >= 2; // 2..9 no admiten segunda cifra
  return n >= 4; // días: 4..9 no admiten segunda cifra
}
