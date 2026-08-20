"use client";

import { usePathname } from "next/navigation";

import { BarraInferior } from "@/components/shared/barra-inferior";
import { BarraSuperior } from "@/components/shared/barra-superior";
import { Guarda } from "@/components/shared/guarda";
import { useSesion } from "@/lib/auth/contexto";
import { navegacionDe } from "@/lib/navegacion";

/**
 * Shell del área privada.
 *
 * Móvil: barra superior mínima + pestañas abajo, al alcance del pulgar.
 * Escritorio: menú horizontal arriba y sin barra inferior.
 *
 * El `key` del <main> con la ruta reinicia la animación en cada navegación:
 * es la transición propia que pide CLAUDE.md §3.3, en vez del salto seco del
 * navegador. Se desactiva sola si el sistema pide menos movimiento.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const { sesion } = useSesion();
  const pathname = usePathname();
  const entradas = navegacionDe(sesion?.rol);

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior entradas={entradas} />

      <main
        key={pathname}
        className="transicion-pantalla mx-auto w-full max-w-3xl flex-1 px-4 py-4"
        style={{
          // Deja sitio para la barra inferior en móvil; en escritorio no existe,
          // pero el relleno de más es inofensivo.
          paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>

      <BarraInferior entradas={entradas} />
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
