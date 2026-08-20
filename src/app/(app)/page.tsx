"use client";

import { useRedirigirSegunRol } from "@/components/shared/guarda";
import { useSesion } from "@/lib/auth/contexto";

/** Panel. Provisional: la 1.8 lo reemplaza por el shell real. */
export default function Inicio() {
  const { sesion } = useSesion();
  useRedirigirSegunRol();

  if (!sesion) return null;

  // Sin membresías no hay contexto de trabajo. Pasa con un usuario invitado al
  // que aún no le han asignado tenant (tarea 1.7).
  if (!sesion.rol) {
    return (
      <div className="rounded-lg border p-4">
        <h1 className="font-medium">Tu cuenta todavía no tiene espacio de trabajo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Si te invitó un gimnasio, pídele que confirme tu acceso.
        </p>
      </div>
    );
  }

  const activo = sesion.membresias.find((m) => m.tenantId === sesion.tenantActivo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {sesion.nombre ?? sesion.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activo ? `Trabajando en ${activo.nombreTenant}` : "Sin espacio activo"} · rol{" "}
          {sesion.rol}
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-1 text-sm font-medium">Siguiente paso</h2>
        <p className="text-sm text-muted-foreground">
          El wizard de evaluación llega en el grupo 2. Esta pantalla solo confirma que la
          sesión, el rol y el espacio de trabajo están bien enlazados.
        </p>
      </section>
    </div>
  );
}
