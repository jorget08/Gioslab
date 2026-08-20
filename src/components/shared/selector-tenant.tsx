import { cambiarTenant } from "@/app/(app)/acciones";
import type { Membresia } from "@/lib/auth/sesion";

/**
 * Selector de espacio de trabajo.
 *
 * Un entrenador puede tener alumnos propios y además trabajar en un gimnasio.
 * Opera en uno a la vez y cambia de contexto explícitamente: mezclar los atletas
 * de un gimnasio con sus clientes particulares en una sola lista es justo la
 * confusión que la Ley 1581 castiga.
 *
 * Con una sola membresía no se muestra nada: sería ruido.
 */
export function SelectorTenant({
  membresias,
  tenantActivo,
}: {
  membresias: Membresia[];
  tenantActivo: string | null;
}) {
  if (membresias.length <= 1) return null;

  return (
    <nav aria-label="Espacio de trabajo" className="flex flex-wrap gap-2">
      {membresias.map((m) => {
        const activo = m.tenantId === tenantActivo;

        return (
          <form key={m.tenantId} action={cambiarTenant}>
            <input type="hidden" name="tenant_id" value={m.tenantId} />
            <button
              type="submit"
              aria-current={activo ? "true" : undefined}
              disabled={activo}
              className={[
                "min-h-11 rounded-lg border px-3 text-sm transition-colors",
                activo
                  ? "border-foreground bg-foreground text-background"
                  : "border-input hover:bg-muted",
              ].join(" ")}
            >
              {m.nombreTenant}
              <span className="ml-1.5 text-xs opacity-70">
                {m.tipoTenant === "gym" ? "gimnasio" : "propio"}
              </span>
            </button>
          </form>
        );
      })}
    </nav>
  );
}
