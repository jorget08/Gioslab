"use client";

import Link from "next/link";

import { Guarda } from "@/components/shared/guarda";
import { SelectorTenant } from "@/components/shared/selector-tenant";
import { Button } from "@/components/ui/button";
import type { Rol } from "@/domain/autorizacion";
import { useSesion } from "@/lib/auth/contexto";

const NAV: ReadonlyArray<{ href: string; texto: string; roles: readonly Rol[] }> = [
  { href: "/", texto: "Inicio", roles: ["super_admin", "gym", "trainer"] },
  { href: "/atletas", texto: "Atletas", roles: ["super_admin", "gym", "trainer"] },
  { href: "/mi-rutina", texto: "Mi rutina", roles: ["client"] },
  { href: "/admin", texto: "Administración", roles: ["super_admin"] },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { sesion, salir } = useSesion();

  // Se filtra el menú por rol para no ofrecer puertas que llevan a un 403.
  // Es cortesía, no seguridad: detrás de cada una está RLS.
  const enlaces = NAV.filter((n) => sesion?.rol && n.roles.includes(sesion.rol));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            GiosLab<span className="text-muted-foreground">System</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {sesion?.nombre ?? sesion?.email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => salir()}
            >
              Salir
            </Button>
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

      {sesion && sesion.membresias.length > 1 && (
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-2">
            <SelectorTenant membresias={sesion.membresias} tenantActivo={sesion.tenantActivo} />
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guarda>
      <Shell>{children}</Shell>
    </Guarda>
  );
}
