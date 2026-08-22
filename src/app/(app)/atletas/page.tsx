"use client";

import { ChevronRight, Plus, Ruler, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haceCuanto } from "@/domain/catalogos";
import { createClient } from "@/lib/supabase/client";

interface Fila {
  id: string;
  full_name: string;
  training_goal: string | null;
  ultima_evaluacion: string | null;
}

function Listado() {
  const [atletas, setAtletas] = useState<Fila[] | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    // La vista trae la fecha de la última evaluación ya calculada. Hacerlo en el
    // cliente obligaría a descargar todas las mediciones de todos los atletas
    // para quedarse con una fecha de cada uno.
    createClient()
      .from("athletes_listado")
      .select("id, full_name, training_goal, ultima_evaluacion")
      .is("archived_at", null)
      .order("full_name")
      .then(({ data }) => {
        // Postgres no propaga NOT NULL a través de una vista, así que los tipos
        // generados marcan todo como opcional. Se normaliza aquí, una vez, en
        // vez de arrastrar comprobaciones por toda la pantalla.
        const filas = (data ?? []).flatMap<Fila>((r) =>
          r.id && r.full_name
            ? [{
                id: r.id,
                full_name: r.full_name,
                training_goal: r.training_goal,
                ultima_evaluacion: r.ultima_evaluacion,
              }]
            : [],
        );
        if (vivo) setAtletas(filas);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return atletas ?? [];
    return (atletas ?? []).filter((a) => a.full_name.toLowerCase().includes(q));
  }, [atletas, busqueda]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Atletas</h1>
        <Button asChild className="min-h-11 shrink-0">
          <Link href="/atletas/nuevo">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo
          </Link>
        </Button>
      </div>

      {(atletas?.length ?? 0) > 5 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar atleta"
            aria-label="Buscar atleta"
            className="min-h-11 pl-9"
          />
        </div>
      )}

      {atletas === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando…
        </p>
      ) : visibles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {busqueda
              ? `Ningún atleta coincide con "${busqueda}".`
              : "Todavía no hay atletas en este espacio de trabajo."}
          </p>
          {!busqueda && (
            <Button asChild variant="outline" className="mt-3 min-h-11">
              <Link href="/atletas/nuevo">Crear el primero</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visibles.map((a) => (
            <li key={a.id}>
              <div className="flex min-h-14 items-center gap-2 pr-4">
                {/* El nombre lleva a la ficha y ocupa toda la fila: es el gesto
                    que se hace sin mirar. "Evaluar" queda como acción aparte
                    para no perder el atajo de quien ya sabe a qué viene. */}
                <Link
                  href={`/atletas/ficha?id=${a.id}`}
                  className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2 pl-4"
                >
                  <span className="truncate text-sm font-medium">{a.full_name}</span>
                  {/* Cuándo fue su última evaluación es el dato con el que se
                      decide a quién le toca hoy (docs/WIZARD-UX.md §3). */}
                  <span className="truncate text-xs text-muted-foreground">
                    {haceCuanto(a.ultima_evaluacion)}
                    {a.training_goal ? ` · ${a.training_goal}` : ""}
                  </span>
                </Link>
                {/* Sin esto la fila no anuncia que lleva a algún sitio: el botón
                    de la derecha se lleva toda la atención y la ficha queda
                    escondida detrás de un toque que nadie adivina. */}
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <Button asChild variant="outline" size="sm" className="min-h-11 shrink-0">
                  <Link href={`/atletas/medir?id=${a.id}`} aria-label={`Evaluar a ${a.full_name}`}>
                    <Ruler className="size-4" aria-hidden="true" />
                    Evaluar
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Se muestran los atletas de tu espacio activo. El entrenador ve los suyos; el gimnasio,
        los de toda su sede.
      </p>
    </div>
  );
}

export default function AtletasPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Listado />
    </Guarda>
  );
}
