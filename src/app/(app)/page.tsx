import { redirect } from "next/navigation";

import { requerirSesion } from "@/lib/auth/sesion";
import { rutaInicial } from "@/domain/autorizacion";

/**
 * Panel. Provisional: la 1.8 lo reemplaza por el shell real.
 */
export default async function Inicio() {
  const ctx = await requerirSesion();

  // El cliente no tiene panel de entrenador: su sitio es su rutina.
  if (ctx.rol === "client") redirect(rutaInicial(ctx.rol));

  // Sin membresías no hay contexto de trabajo. Pasa con un usuario invitado al
  // que aún no le han asignado tenant (tarea 1.7).
  if (!ctx.rol) {
    return (
      <div className="rounded-lg border p-4">
        <h1 className="font-medium">Tu cuenta todavía no tiene espacio de trabajo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Si te invitó un gimnasio, pídele que confirme tu acceso.
        </p>
      </div>
    );
  }

  const activo = ctx.membresias.find((m) => m.tenantId === ctx.tenantActivo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {ctx.nombre ?? ctx.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activo ? `Trabajando en ${activo.nombreTenant}` : "Sin espacio activo"} · rol{" "}
          {ctx.rol}
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-1 text-sm font-medium">Siguiente paso</h2>
        <p className="text-sm text-muted-foreground">
          El wizard de evaluación llega en el grupo 2. Por ahora esta pantalla solo confirma
          que la sesión, el rol y el espacio de trabajo están bien enlazados.
        </p>
      </section>
    </div>
  );
}
