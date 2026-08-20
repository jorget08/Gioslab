"use client";

import { Guarda } from "@/components/shared/guarda";
import { useSesion } from "@/lib/auth/contexto";

function Panel() {
  const { sesion } = useSesion();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
      <p className="text-sm text-muted-foreground">Sesión de plataforma: {sesion?.email}</p>
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Aquí irán el editor de reglas (3.5), la biblioteca de ejercicios (grupo 4) y las
        métricas globales.
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
