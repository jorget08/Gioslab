"use client";

import { ChevronRight, Dumbbell, Play, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltrosBiblioteca } from "@/components/biblioteca/filtros";
import { CONTRAINDICACIONES } from "@/domain/contraindicaciones";
import {
  agruparPorPatron,
  contraindicacionesDisponibles,
  filtrarEjercicios,
  patronesDisponibles,
  resumenEjercicio,
  SIN_FILTROS,
  valoresDisponibles,
  type Ejercicio,
  type FiltrosEjercicio,
} from "@/domain/ejercicios";
import { leerMedios, portada, tieneVideo } from "@/domain/medios";
import { FICHA_PATRON, PATRONES } from "@/domain/patrones";
import { urlPublica } from "@/lib/medios/almacenamiento";
import { useSesion } from "@/lib/auth/contexto";
import { createClient } from "@/lib/supabase/client";

/**
 * Biblioteca de ejercicios (tareas 4.1 y 4.4).
 *
 * LA LEE TODO EL STAFF, LA ESCRIBE SOLO GIOVANNI. Quien lo impone es RLS
 * (`exercises_escribe_admin`), no esta pantalla: aquí solo se esconden botones
 * que de todas formas fallarían. Un entrenador necesita saber qué ejercicios
 * existen; editarlos convertiría la metodología en algo distinto en cada
 * gimnasio (MODELO-DATOS §1.2).
 *
 * AGRUPADA POR PATRÓN, no alfabética. Es el eje con el que él piensa y con el
 * que el motor sustituye un ejercicio por otro: la pregunta al abrir esto es
 * "qué tengo para empuje vertical", no "qué empieza por P".
 *
 * EL FILTRO DE CONTRAINDICACIONES EXCLUYE, no busca. Un entrenador no quiere la
 * lista de lo que está contraindicado para una rodilla: quiere lo que SÍ le
 * puede dar a ese atleta. Ver el comentario de `FiltrosEjercicio.aptoPara`.
 */

const COLUMNAS =
  "id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, media_urls, is_active";

function Biblioteca() {
  const { sesion } = useSesion();
  const puedeEditar = sesion?.rol === "super_admin";

  const [ejercicios, setEjercicios] = useState<Ejercicio[] | null>(null);
  const [filtros, setFiltros] = useState<FiltrosEjercicio>(SIN_FILTROS);
  const [panelAbierto, setPanelAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    createClient()
      .from("exercise_library")
      .select(COLUMNAS)
      .order("name")
      .then(({ data }) => {
        if (vivo) setEjercicios((data ?? []) as Ejercicio[]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const todos = useMemo(() => ejercicios ?? [], [ejercicios]);
  const archivados = todos.filter((e) => !e.is_active).length;

  const visibles = useMemo(() => filtrarEjercicios(todos, filtros), [todos, filtros]);
  const grupos = useMemo(() => agruparPorPatron(visibles, PATRONES), [visibles]);

  // Las opciones salen de la biblioteca ACTIVA, no de lo ya filtrado: si
  // dependieran del resultado, marcar un filtro haría desaparecer los demás y
  // no habría forma de cambiar de idea sin limpiarlo todo.
  const base = useMemo(
    () => (filtros.incluirArchivados ? todos : todos.filter((e) => e.is_active)),
    [todos, filtros.incluirArchivados],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        {puedeEditar && (
          <Button asChild className="min-h-11 shrink-0">
            <Link href="/biblioteca/ejercicio">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo
            </Link>
          </Button>
        )}
      </div>

      {todos.length > 0 && (
        <>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={filtros.texto}
              onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
              placeholder="Buscar por nombre, músculo o equipo"
              aria-label="Buscar ejercicio"
              className="min-h-11 pl-9"
            />
          </div>

          <FiltrosBiblioteca
            filtros={filtros}
            onChange={setFiltros}
            abierto={panelAbierto}
            onAbrir={setPanelAbierto}
            patrones={patronesDisponibles(base, PATRONES)}
            musculos={valoresDisponibles(base, "target_muscle")}
            equipos={valoresDisponibles(base, "equipment")}
            contraindicaciones={contraindicacionesDisponibles(base, CONTRAINDICACIONES)}
            hayArchivados={archivados > 0}
            resultados={visibles.length}
          />
        </>
      )}

      {ejercicios === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando…
        </p>
      ) : visibles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {todos.length === 0
              ? "La biblioteca está vacía."
              : "Ningún ejercicio cumple lo que buscas."}
          </p>
          {todos.length === 0 && puedeEditar && (
            <Button asChild variant="outline" className="mt-3 min-h-11">
              <Link href="/biblioteca/ejercicio">Crear el primero</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.patron ?? "sin-patron"} className="space-y-2">
              {/* El contador va al otro extremo, no pegado al título: con el
                  rótulo en mayúsculas y espaciado, un número al lado se lee
                  como parte del nombre del patrón. */}
              <h2 className="rotulo flex items-baseline justify-between gap-3">
                <span>{g.patron ? FICHA_PATRON[g.patron].nombre : "Sin patrón asignado"}</span>
                <span className="font-normal tabular-nums text-muted-foreground">
                  {g.ejercicios.length}
                </span>
              </h2>

              {/* Sin patrón, el motor no puede sustituirlos por nada. Decirlo
                  aquí es lo que hace que el hueco se cierre. */}
              {g.patron === null && (
                <p className="text-xs text-muted-foreground">
                  El motor no puede proponerlos como alternativa hasta que tengan patrón.
                </p>
              )}

              <ul className="divide-y rounded-lg border">
                {g.ejercicios.map((e) => {
                  const resumen = resumenEjercicio(e);
                  const medios = leerMedios(e.media_urls);
                  const cubierta = portada(medios);

                  const fila = (
                    <>
                      {/* Miniatura. El hueco se reserva aunque no haya foto: si
                          apareciera y desapareciera por filas, el nombre de cada
                          ejercicio empezaría en una sangría distinta y la lista
                          se volvería ilegible de un vistazo. */}
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {/* El icono va SIEMPRE debajo, no en el `else`: si el
                            archivo ya no está en el bucket, la foto se oculta
                            sola y queda el icono en vez de un cuadro vacío. Un
                            hueco negro se lee como un fallo de la aplicación. */}
                        <Dumbbell
                          className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50"
                          aria-hidden="true"
                        />
                        {cubierta && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urlPublica(cubierta.path)}
                            alt=""
                            className="relative size-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        {tieneVideo(medios) && (
                          <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 p-0.5">
                            <Play className="size-2.5 text-white" aria-hidden="true" />
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{e.name}</span>
                          {!e.is_active && (
                            <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                              archivado
                            </span>
                          )}
                        </span>
                        {resumen && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {resumen}
                          </span>
                        )}
                      </span>
                      {puedeEditar && (
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  );

                  return (
                    <li key={e.id}>
                      {/* Al entrenador no se le ofrece un enlace que lleva a un
                          formulario que no puede guardar. */}
                      {puedeEditar ? (
                        <Link
                          href={`/biblioteca/ejercicio?id=${e.id}`}
                          className="flex min-h-14 items-center gap-2 px-4 py-2"
                        >
                          {fila}
                        </Link>
                      ) : (
                        <div className="flex min-h-14 items-center gap-2 px-4 py-2">{fila}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!puedeEditar && todos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          La biblioteca es común a toda la plataforma y la mantiene GiosLab. Si falta un
          ejercicio o algo está mal clasificado, avísanos.
        </p>
      )}
    </div>
  );
}

export default function BibliotecaPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Biblioteca />
    </Guarda>
  );
}
