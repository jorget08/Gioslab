/**
 * Qué cambió entre dos versiones de una regla (tarea 3.6).
 *
 * "Quién cambió qué y cuándo". El quién y el cuándo los guarda la base
 * —`rules.created_by`, `rule_activations`— pero el QUÉ no lo guarda nadie: hay
 * que deducirlo comparando dos versiones. Aquí.
 *
 * SE COMPARA LO LEGIBLE, NO EL JSON. Un diff de `condition` mostraría llaves y
 * comillas; quien lee esto es Giovanni. Se comparan las frases en español que ya
 * produce la gramática, que además son las mismas que ve el entrenador en la
 * ficha del atleta (§3.6). Si dos versiones se leen igual, no cambiaron para
 * nadie que las use, aunque el JSON difiera en el orden de las claves.
 *
 * Puro y sin base: se prueba con dos objetos.
 */

import { ETIQUETA_EVIDENCIA, esNivelEvidencia } from "@/domain/evidencia";
import {
  ACCIONES_POR_NIVEL,
  ETIQUETA_ACCION,
  ETIQUETA_NIVEL,
  describirAccionesPorClave,
  describirCondicion,
  type ClaveAccion,
  type NivelMotor,
  type Regla,
} from "@/domain/reglas";

export type TipoCambio = "añadido" | "retirado" | "cambiado";

export interface Cambio {
  /** Qué parte de la regla: "Condición", "Justificación", "RIR"… */
  campo: string;
  tipo: TipoCambio;
  /** Cómo se leía antes. `null` si no existía. */
  antes: string | null;
  /** Cómo se lee ahora. `null` si se retiró. */
  despues: string | null;
}

function evidencia(valor: string): string {
  return esNivelEvidencia(valor) ? ETIQUETA_EVIDENCIA[valor] : valor;
}

function nivel(n: number): string {
  return (ACCIONES_POR_NIVEL as Record<number, unknown>)[n] !== undefined
    ? `Nivel ${n} · ${ETIQUETA_NIVEL[n as NivelMotor]}`
    : `Nivel ${n}`;
}

/** Compara un campo simple y anota el cambio solo si lo hubo. */
function simple(campo: string, antes: string, despues: string): Cambio[] {
  if (antes === despues) return [];
  return [{ campo, tipo: "cambiado", antes, despues }];
}

/**
 * Los cambios de `anterior` a `nueva`, en orden de lectura.
 *
 * Devuelve vacío si son indistinguibles para quien las usa. Eso es información:
 * significa que se publicó una versión que no cambia nada.
 */
export function compararReglas(anterior: Regla, nueva: Regla): Cambio[] {
  const cambios: Cambio[] = [
    ...simple("Momento del motor", nivel(anterior.nivel), nivel(nueva.nivel)),
    ...simple(
      "Condición",
      describirCondicion(anterior.condition),
      describirCondicion(nueva.condition),
    ),
  ];

  // Por CLAVE y no por frase: cambiar el volumen de 0.75 a 0.9 es un cambio, no
  // una acción retirada más otra añadida. Esa distinción es justo lo que hace
  // útil el historial.
  const antes = describirAccionesPorClave(anterior.actions ?? {});
  const despues = describirAccionesPorClave(nueva.actions ?? {});

  for (const clave of Object.keys(ETIQUETA_ACCION) as ClaveAccion[]) {
    const a = antes[clave];
    const d = despues[clave];
    if (a === d) continue;
    cambios.push({
      campo: ETIQUETA_ACCION[clave],
      tipo: a === undefined ? "añadido" : d === undefined ? "retirado" : "cambiado",
      antes: a ?? null,
      despues: d ?? null,
    });
  }

  cambios.push(
    ...simple("Justificación", anterior.justification ?? "", nueva.justification ?? ""),
    ...simple("Respaldo", evidencia(anterior.evidence_level), evidencia(nueva.evidence_level)),
  );

  return cambios;
}

/** Una línea de resumen para el listado: "3 cambios" o qué campos se tocaron. */
export function resumirCambios(cambios: readonly Cambio[]): string {
  if (cambios.length === 0) return "sin cambios de contenido";
  if (cambios.length <= 2) return cambios.map((c) => c.campo.toLowerCase()).join(" y ");
  return `${cambios.length} cambios`;
}

// ---------------------------------------------------------------------------
// La línea de tiempo
// ---------------------------------------------------------------------------

export interface VersionRegla extends Regla {
  id: string;
  is_active: boolean;
  created_at: string;
  autor: string | null;
}

export interface Activacion {
  id: string;
  rule_id: string;
  action: string;
  created_at: string;
  actor: string | null;
}

export type Suceso =
  | { clase: "version"; cuando: string; quien: string | null; version: VersionRegla; cambios: Cambio[] }
  | { clase: "activacion"; cuando: string; quien: string | null; accion: string; version: number };

/**
 * Publicaciones y activaciones entremezcladas, de lo más nuevo a lo más viejo.
 *
 * VAN JUNTAS a propósito. Son dos hechos distintos —escribir una versión y
 * ponerla en marcha— y separarlos en dos listas obligaría a leer dos veces con
 * el reloj en la mano para reconstruir qué estuvo vigente y cuándo. Volver a una
 * versión anterior, por ejemplo, no crea ninguna versión: solo deja un rastro de
 * activación, y sin entrelazar no se entendería por qué la regla vigente es de
 * hace tres meses.
 */
export function lineaDeTiempo(
  versiones: readonly VersionRegla[],
  activaciones: readonly Activacion[],
): Suceso[] {
  const ordenadas = [...versiones].sort((a, b) => a.version - b.version);
  const versionDe = new Map(ordenadas.map((v) => [v.id, v.version]));

  const sucesos: Suceso[] = ordenadas.map((v, i) => ({
    clase: "version",
    cuando: v.created_at,
    quien: v.autor,
    version: v,
    // La v1 no cambia nada: nace. Comparar contra un vacío inventado produciría
    // una lista de "añadido" por cada campo que no dice nada de nadie.
    cambios: i === 0 ? [] : compararReglas(ordenadas[i - 1], v),
  }));

  for (const a of activaciones) {
    const v = versionDe.get(a.rule_id);
    if (v === undefined) continue;
    sucesos.push({
      clase: "activacion",
      cuando: a.created_at,
      quien: a.actor,
      accion: a.action,
      version: v,
    });
  }

  // Empate a milisegundo: publicar y activar ocurren en la misma transacción
  // cuando se guarda con "activarla al guardar", y una carga de datos puede
  // escribirlo todo de golpe. Sin desempatar, el orden lo decide el motor de
  // ordenación y la línea de tiempo miente: se ha visto la v1 encima de la v2.
  //
  // Se desempata por lo que sí sabemos que ocurrió antes: número de versión, y
  // la activación después de la versión que activa.
  const orden = (s: Suceso) => (s.clase === "activacion" ? s.version : s.version.version);

  return sucesos.sort((x, y) => {
    const t = Date.parse(y.cuando) - Date.parse(x.cuando);
    if (t !== 0) return t;

    const v = orden(y) - orden(x);
    if (v !== 0) return v;

    return x.clase === "activacion" ? -1 : 1;
  });
}
