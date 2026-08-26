"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/lib/auth/contexto";

function Panel() {
  const { sesion } = useSesion();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
      <p className="text-sm text-muted-foreground">Sesión de plataforma: {sesion?.email}</p>
      <Button asChild className="min-h-11 w-full">
        <Link href="/admin/reglas">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Reglas
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        La matriz de condicionales: crear, versionar y activar reglas sin tocar código.
      </p>

      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Aquí irán las métricas globales y la administración de gimnasios y planes.
      </p>
    </div>
  );
}

/** Solo super_admin. Es la única sección que no depende del tenant activo. */
export default function AdminPage() {
  return (
    <Guarda roles={["super_admin"]}>
      <Panel />
    </Guarda>
  );
}
