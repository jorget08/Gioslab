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

import { leerContraindicaciones } from "@/domain/contraindicaciones";
import { esPatron, type Patron } from "@/domain/patrones";

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

// ---------------------------------------------------------------------------
// Buscador y filtros (tarea 4.4)
// ---------------------------------------------------------------------------

export interface FiltrosEjercicio {
  texto: string;
  patrones: readonly string[];
  musculos: readonly string[];
  equipos: readonly string[];
  /**
   * Zonas y condiciones que el atleta TIENE.
   *
   * ⚠️ Este filtro EXCLUYE, no incluye, y es la decisión de diseño del buscador.
   *
   * Un entrenador nunca busca "los ejercicios contraindicados para rodilla":
   * busca los que le puede dar a alguien con la rodilla mal. Si el filtro
   * incluyera, devolvería exactamente la lista de lo que NO debe prescribir, y
   * el primero que la use sin leer la etiqueta le hace daño a un atleta.
   *
   * Es además lo que hará el motor, así que el buscador enseña el mismo
   * razonamiento antes de que el motor exista.
   */
  aptoPara: readonly string[];
  incluirArchivados: boolean;
}

export const SIN_FILTROS: FiltrosEjercicio = {
  texto: "",
  patrones: [],
  musculos: [],
  equipos: [],
  aptoPara: [],
  incluirArchivados: false,
};

/** Cuántos filtros hay puestos. Va en la insignia del botón. */
export function filtrosActivos(f: FiltrosEjercicio): number {
  return (
    f.patrones.length +
    f.musculos.length +
    f.equipos.length +
    f.aptoPara.length +
    (f.incluirArchivados ? 1 : 0)
  );
}

/**
 * Filtra la biblioteca.
 *
 * Dentro de cada grupo se suma (O): elegir dos patrones enseña los dos. Entre
 * grupos se resta (Y): un patrón y un músculo enseñan lo que cumple ambos. Es
 * lo que espera cualquiera que haya usado una tienda en línea, y lo contrario
 * —Y dentro del grupo— dejaría la lista vacía en cuanto se marcan dos cosas.
 */
export function filtrarEjercicios(
  ejercicios: readonly Ejercicio[],
  f: FiltrosEjercicio,
): Ejercicio[] {
  const q = plegar(f.texto);

  return ejercicios.filter((e) => {
    if (!f.incluirArchivados && !e.is_active) return false;

    if (q) {
      const heno = [e.name, e.target_muscle, e.equipment, e.biomechanical_type]
        .filter(Boolean)
        .map((v) => plegar(String(v)))
        .join(" ");
      if (!heno.includes(q)) return false;
    }

    if (f.patrones.length > 0 && !f.patrones.includes(e.movement_pattern ?? "")) return false;
    if (f.musculos.length > 0 && !f.musculos.includes(e.target_muscle ?? "")) return false;
    if (f.equipos.length > 0 && !f.equipos.includes(e.equipment ?? "")) return false;

    if (f.aptoPara.length > 0) {
      const contra = leerContraindicaciones(e.contraindications);
      // Basta UNA coincidencia para descartarlo: si el atleta tiene la rodilla
      // mal, un ejercicio contraindicado para rodilla no se le ofrece aunque
      // cumpla todo lo demás.
      if (contra.some((c) => f.aptoPara.includes(c))) return false;
    }

    return true;
  });
}

/**
 * Los valores que existen de verdad en un campo, para ofrecerlos como filtro.
 *
 * Solo se ofrece lo que hay. Un filtro por "polea" cuando no existe ningún
 * ejercicio de polea solo sirve para llevar a una lista vacía y hacer dudar de
 * si la búsqueda está rota.
 */
export function valoresDisponibles(
  ejercicios: readonly Ejercicio[],
  campo: "target_muscle" | "equipment",
): string[] {
  return sugerencias(ejercicios.map((e) => e[campo]));
}

/** Los patrones presentes, en el orden del catálogo de Giovanni. */
export function patronesDisponibles(
  ejercicios: readonly Ejercicio[],
  orden: readonly Patron[],
): Patron[] {
  const usados = new Set(ejercicios.map((e) => e.movement_pattern));
  return orden.filter((p) => usados.has(p));
}

/** Las contraindicaciones que alguna ficha usa, para no ofrecer filtros vacíos. */
export function contraindicacionesDisponibles(
  ejercicios: readonly Ejercicio[],
  orden: readonly string[],
): string[] {
  const usadas = new Set<string>();
  for (const e of ejercicios) {
    for (const c of leerContraindicaciones(e.contraindications)) usadas.add(c);
  }
  return orden.filter((c) => usadas.has(c));
}
