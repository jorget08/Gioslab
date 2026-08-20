"use client";

import { useEffect, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { createClient } from "@/lib/supabase/client";

type Atleta = { id: string; full_name: string };

function Listado() {
  const [atletas, setAtletas] = useState<Atleta[] | null>(null);

  useEffect(() => {
    // RLS decide qué filas vuelven: el entrenador ve los suyos, el gimnasio los
    // de su sede. La consulta es la misma para todos.
    createClient()
      .from("athletes")
      .select("id, full_name")
      .order("created_at", { ascending: false })
      .then(({ data }) => setAtletas(data ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Atletas</h1>

      {atletas === null ? (
        <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
      ) : atletas.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Todavía no hay atletas en este espacio de trabajo.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {atletas.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center px-4 py-3 text-sm">
              {a.full_name}
            </li>
          ))}
        </ul>
      )}
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
