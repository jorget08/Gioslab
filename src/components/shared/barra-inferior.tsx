"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { estaActiva, type EntradaNav } from "@/lib/navegacion";

/**
 * Navegación inferior, solo en móvil.
 *
 * Va abajo y no arriba porque el entrenador usa esto **de pie, con una mano**
 * (CLAUDE.md §3.3): en un teléfono de 6 pulgadas la parte superior queda fuera
 * del alcance del pulgar. Es la diferencia entre una app que se usa en el piso
 * del gimnasio y una que obliga a agarrarla con las dos manos.
 *
 * El relleno inferior respeta el indicador de inicio del iPhone; sin él, la
 * última pestaña queda debajo de la barra del sistema y no se puede tocar.
 */
export function BarraInferior({ entradas }: { entradas: EntradaNav[] }) {
  const pathname = usePathname();

  if (entradas.length === 0) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl">
        {entradas.map((e) => {
          const activa = estaActiva(e.href, pathname);
          const Icono = e.icono;

          return (
            <li key={e.href} className="flex-1">
              <Link
                href={e.href}
                aria-current={activa ? "page" : undefined}
                // min-h-14 = 56px: por encima del mínimo de 44px, porque aquí se
                // toca a ciegas mientras se mira al atleta.
                className={[
                  "flex min-h-14 select-none flex-col items-center justify-center gap-0.5",
                  "text-xs transition-colors active:bg-muted",
                  activa ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                <Icono
                  className="size-5"
                  strokeWidth={activa ? 2.4 : 1.8}
                  aria-hidden="true"
                />
                <span className={activa ? "font-medium" : undefined}>{e.corta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
