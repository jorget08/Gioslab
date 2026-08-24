"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { SelectorTenant } from "@/components/shared/selector-tenant";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/lib/auth/contexto";
import { ADMINISTRACION, estaActiva, type EntradaNav } from "@/lib/navegacion";

/**
 * Barra superior.
 *
 * En móvil es solo identidad y salida: la navegación vive abajo, al alcance del
 * pulgar. En escritorio se despliega el menú horizontal, donde sí hay sitio y el
 * ratón llega a todas partes.
 *
 * El relleno superior respeta el notch. Sin `viewport-fit=cover` en el layout
 * raíz, `env(safe-area-inset-top)` devuelve 0 y el título queda bajo la muesca.
 */
export function BarraSuperior({ entradas }: { entradas: EntradaNav[] }) {
  const pathname = usePathname();
  const { sesion, salir } = useSesion();

  return (
    <header
      className="sticky top-0 z-30 select-none border-b bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-11 shrink-0 items-center font-semibold tracking-tight">
          GiosLab<span className="text-[color:var(--gl-dorado)]">System</span>
        </Link>

        <nav aria-label="Secciones" className="ml-4 hidden gap-1 md:flex">
          {entradas.map((e) => {
            const activa = estaActiva(e.href, pathname);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={activa ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors",
                  activa
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                {e.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline">
            {sesion?.nombre ?? sesion?.email}
          </span>

          {/* Administración no es una pestaña: lo del día a día va abajo, al
              alcance del pulgar, y la configuración arriba, donde cuesta llegar
              a propósito. Ver el comentario en lib/navegacion. */}
          {sesion?.rol && ADMINISTRACION.roles.includes(sesion.rol) && (
            <Button
              asChild
              variant={estaActiva(ADMINISTRACION.href, pathname) ? "secondary" : "ghost"}
              size="icon"
              className="size-11"
            >
              <Link
                href={ADMINISTRACION.href}
                aria-label={ADMINISTRACION.etiqueta}
                aria-current={estaActiva(ADMINISTRACION.href, pathname) ? "page" : undefined}
              >
                <ADMINISTRACION.icono className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => salir()}
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {sesion && sesion.membresias.length > 1 && (
        <div className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 py-2">
            <SelectorTenant membresias={sesion.membresias} tenantActivo={sesion.tenantActivo} />
          </div>
        </div>
      )}
    </header>
  );
}
