import { requerirRol } from "@/lib/auth/sesion";

/**
 * Administración de plataforma. Provisional: el super admin real es Fase B y el
 * editor de reglas es la tarea 3.5.
 *
 * Solo super_admin. Es la única sección que no depende del tenant activo.
 */
export default async function AdminPage() {
  const ctx = await requerirRol(["super_admin"]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
      <p className="text-sm text-muted-foreground">
        Sesión de plataforma: {ctx.email}
      </p>
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Aquí irán el editor de reglas (3.5), la biblioteca de ejercicios (grupo 4) y las
        métricas globales.
      </p>
    </div>
  );
}
