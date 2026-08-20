import Link from "next/link";

import { SelectorTenant } from "@/components/shared/selector-tenant";
import { Button } from "@/components/ui/button";
import { requerirSesion } from "@/lib/auth/sesion";
import type { Rol } from "@/domain/autorizacion";

/**
 * Área privada. Todo lo que cuelga de aquí exige sesión.
 *
 * El proxy ya redirige a /login, pero esta guarda se repite a propósito: si
 * mañana alguien cambia el `matcher` del proxy, estas páginas no deben quedar
 * abiertas por accidente. La protección por ROL vive en cada sección, no aquí.
 */

const NAV: ReadonlyArray<{ href: string; texto: string; roles: readonly Rol[] }> = [
  { href: "/", texto: "Inicio", roles: ["super_admin", "gym", "trainer"] },
  { href: "/atletas", texto: "Atletas", roles: ["super_admin", "gym", "trainer"] },
  { href: "/mi-rutina", texto: "Mi rutina", roles: ["client"] },
  { href: "/admin", texto: "Administración", roles: ["super_admin"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requerirSesion();

  // Se filtra el menú por rol para no ofrecer puertas que llevan a un 403.
  // Es cortesía, no seguridad: quien la fuerce se topa con la guarda de la
  // sección y, detrás, con RLS.
  const enlaces = NAV.filter((n) => ctx.rol && n.roles.includes(ctx.rol));

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="border-b bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            GiosLab<span className="text-muted-foreground">System</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {ctx.nombre ?? ctx.email}
            </span>
            <form action="/auth/salir" method="post">
              <Button type="submit" variant="outline" size="sm" className="min-h-11">
                Salir
              </Button>
            </form>
          </div>

          {enlaces.length > 0 && (
            <nav aria-label="Principal" className="flex w-full gap-1 overflow-x-auto">
              {enlaces.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-muted"
                >
                  {n.texto}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {ctx.membresias.length > 1 && (
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-2">
            <SelectorTenant membresias={ctx.membresias} tenantActivo={ctx.tenantActivo} />
          </div>
        </div>
      )}

      <main
        className="mx-auto w-full max-w-3xl flex-1 p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
