/**
 * Biblioteca de ejercicios (tarea 4.1).
 *
 * QUIÉN LA EDITA: solo `super_admin`, o sea Giovanni. Lo impone RLS, no la
 * interfaz. La metodología GQ **es** el producto que se vende: si cada gimnasio
 * pudiera editarla, el motor dejaría de ser confiable (MODELO-DATOS §1.2). El
 * resto del staff la lee.
 *
 * TRES CAMPOS SIGUEN SIN CATÁLOGO CERRADO —`target_muscle`, `equipment` y
 * `biomechanical_type`— porque él no los ha fijado. La salida no es inventarlos
 * ni dejarlos como texto suelto, sino **sugerir lo ya escrito**: ver
 * `sugerencias`. Así el vocabulario converge solo, sin que nadie decida por él.
 */

import { ZONAS_CUERPO } from "@/domain/catalogos";
import { esPatron, type Patron } from "@/domain/patrones";

/**
 * Contraindicaciones = zonas del cuerpo, EL MISMO catálogo que las lesiones.
 *
 * Es la decisión que hace que el motor funcione. `athlete_injuries.body_region`
 * usa `ZONAS_CUERPO`; si aquí escribiéramos texto libre ("problemas de rodilla"),
 * el cruce entre la lesión de un atleta y la contraindicación de un ejercicio
 * tendría que adivinar, y una prescripción que adivina no es auditable (§3.6).
 *
 * Compartiendo catálogo, el cruce es una comparación exacta.
 *
 * ⚠️ Decisión nuestra, no de Giovanni: su ficha no define la forma de este campo.
 * Anotada en PREGUNTAS-GIOVANNI para que la confirme.
 */
export const CONTRAINDICACIONES = ZONAS_CUERPO;
export type Contraindicacion = (typeof CONTRAINDICACIONES)[number];

export function esContraindicacion(valor: unknown): valor is Contraindicacion {
  return typeof valor === "string" && (CONTRAINDICACIONES as readonly string[]).includes(valor);
}

/**
 * Lee las contraindicaciones guardadas sin fiarse de su forma.
 *
 * La columna es `jsonb` y aceptó texto libre durante toda la Fase A, así que
 * puede traer cualquier cosa. Lo que no esté en el catálogo se descarta en vez
 * de pintarse: una contraindicación que el motor no va a poder cruzar, mostrada
 * como si fuera a protegerte, es peor que no mostrar nada.
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

/**
 * Normaliza el nombre antes de guardarlo.
 *
 * `exercise_library.name` es UNIQUE, así que esto no es cosmético: sin colapsar
 * los espacios, "Prensa  45°" y "Prensa 45°" conviven como dos ejercicios
 * distintos, y el motor que busque uno no encontrará el otro.
 */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ");
}

/**
 * ¿Ya existe un ejercicio con este nombre?
 *
 * Se compara sin distinguir mayúsculas ni acentos, porque quien teclea "prensa
 * 45" buscando saber si ya está no espera que "Prensa 45°" cuente como otro.
 * La base solo protege contra el duplicado exacto; esto avisa antes.
 */
const plegar = (s: string): string =>
  normalizarNombre(s)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    // El rango de marcas diacríticas combinantes, escrito con escapes y no con
    // los caracteres literales: en el editor son invisibles y cualquiera los
    // borraría sin darse cuenta.
    .replace(/[\u0300-\u036f]/g, "");

export function nombreDuplicado(
  nombre: string,
  existentes: readonly { id: string; name: string }[],
  idActual?: string,
): boolean {
  const objetivo = plegar(nombre);
  if (!objetivo) return false;
  return existentes.some((e) => e.id !== idActual && plegar(e.name) === objetivo);
}

/**
 * Valores ya usados en un campo, para ofrecerlos como sugerencia.
 *
 * Es lo que sustituye a un catálogo que Giovanni no ha fijado. Al teclear
 * "cuád…" aparece "cuádriceps" porque ya lo escribió antes, así que el
 * vocabulario se estabiliza solo y sin que nosotros elijamos por él.
 *
 * Se pliega para deduplicar pero se devuelve la grafía tal cual se escribió: la
 * ortografía correcta es la suya, no la nuestra.
 */
export function sugerencias(valores: readonly (string | null | undefined)[]): string[] {
  const vistas = new Map<string, string>();
  for (const v of valores) {
    if (!v) continue;
    const limpio = normalizarNombre(v);
    if (!limpio) continue;
    const clave = plegar(limpio);
    if (!vistas.has(clave)) vistas.set(clave, limpio);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export interface Ejercicio {
  id: string;
  name: string;
  description: string | null;
  target_muscle: string | null;
  movement_pattern: string | null;
  biomechanical_type: string | null;
  equipment: string | null;
  contraindications: unknown;
  is_active: boolean;
}

/** Línea de apoyo en el listado: músculo, equipo y cuántas contraindicaciones. */
export function resumenEjercicio(e: Ejercicio): string {
  const contra = leerContraindicaciones(e.contraindications).length;
  return [
    e.target_muscle,
    e.equipment,
    // El plural pierde la tilde: "contraindicaciones", no "contraindicaciónes".
    contra > 0 ? `${contra} ${contra === 1 ? "contraindicación" : "contraindicaciones"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface GrupoPatron {
  patron: Patron | null;
  ejercicios: Ejercicio[];
}

/**
 * Agrupa por patrón de movimiento, en el orden del catálogo de Giovanni.
 *
 * Se agrupa por patrón y no alfabéticamente porque es el eje con el que él
 * piensa y con el que el motor sustituye: al abrir la biblioteca, la pregunta
 * es "qué tengo para empuje vertical", no "qué empieza por P".
 *
 * Los que aún no tienen patrón van al final, juntos y visibles: son
 * exactamente los que el motor no puede sustituir todavía.
 */
export function agruparPorPatron(
  ejercicios: readonly Ejercicio[],
  orden: readonly Patron[],
): GrupoPatron[] {
  const grupos: GrupoPatron[] = orden.map((patron) => ({ patron, ejercicios: [] }));
  const sinPatron: Ejercicio[] = [];

  for (const e of ejercicios) {
    const grupo =
      e.movement_pattern && esPatron(e.movement_pattern)
        ? grupos.find((g) => g.patron === e.movement_pattern)
        : undefined;
    if (grupo) grupo.ejercicios.push(e);
    else sinPatron.push(e);
  }

  for (const g of grupos) {
    g.ejercicios.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  sinPatron.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const conContenido = grupos.filter((g) => g.ejercicios.length > 0);
  return sinPatron.length > 0
    ? [...conContenido, { patron: null, ejercicios: sinPatron }]
    : conContenido;
}
