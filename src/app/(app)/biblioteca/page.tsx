"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  agruparPorPatron,
  resumenEjercicio,
  type Ejercicio,
} from "@/domain/ejercicios";
import { FICHA_PATRON, PATRONES } from "@/domain/patrones";
import { useSesion } from "@/lib/auth/contexto";
import { createClient } from "@/lib/supabase/client";

/**
 * Biblioteca de ejercicios (tarea 4.1).
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
 */

const COLUMNAS =
  "id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, is_active";

function Biblioteca() {
  const { sesion } = useSesion();
  const puedeEditar = sesion?.rol === "super_admin";

  const [ejercicios, setEjercicios] = useState<Ejercicio[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [verArchivados, setVerArchivados] = useState(false);

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

  const archivados = (ejercicios ?? []).filter((e) => !e.is_active).length;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (ejercicios ?? [])
      .filter((e) => (verArchivados ? true : e.is_active))
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          (e.target_muscle ?? "").toLowerCase().includes(q) ||
          (e.equipment ?? "").toLowerCase().includes(q),
      );
  }, [ejercicios, busqueda, verArchivados]);

  const grupos = useMemo(() => agruparPorPatron(visibles, PATRONES), [visibles]);

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

      {(ejercicios?.length ?? 0) > 5 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, músculo o equipo"
            aria-label="Buscar ejercicio"
            className="min-h-11 pl-9"
          />
        </div>
      )}

      {ejercicios === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando…
        </p>
      ) : visibles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {busqueda
              ? `Ningún ejercicio coincide con "${busqueda}".`
              : "La biblioteca está vacía."}
          </p>
          {!busqueda && puedeEditar && (
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
                  const fila = (
                    <>
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

      {archivados > 0 && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full text-muted-foreground"
          onClick={() => setVerArchivados((v) => !v)}
        >
          {verArchivados
            ? "Ocultar archivados"
            : `Ver ${archivados} ${archivados === 1 ? "archivado" : "archivados"}`}
        </Button>
      )}

      {!puedeEditar && (ejercicios?.length ?? 0) > 0 && (
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
