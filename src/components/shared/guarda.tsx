"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { puedeAcceder, rutaInicial, type Rol } from "@/domain/autorizacion";
import { useSesion } from "@/lib/auth/contexto";

/**
 * Guarda de acceso del lado del cliente.
 *
 * Sustituye a lo que antes hacían el proxy y `requerirRol` en el servidor. Sin
 * servidor no hay forma de redirigir antes de pintar, así que se muestra un
 * estado de carga mientras se resuelve la sesión.
 *
 * IMPORTANTE: esto es NAVEGACIÓN, no seguridad. Quien desactive el JavaScript o
 * manipule el estado llega a la pantalla, y ahí se encuentra con que RLS no le
 * devuelve una sola fila. La barrera real está en Postgres, donde no se puede
 * rodear. Aquí solo se evita enseñar puertas que no llevan a ninguna parte.
 */
export function Guarda({
  roles,
  children,
}: {
  /** Roles admitidos. Si se omite, basta con tener sesión. */
  roles?: readonly Rol[];
  children: React.ReactNode;
}) {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  const permitido = sesion
    ? roles
      ? Boolean(sesion.rol && roles.includes(sesion.rol))
      : true
    : false;

  useEffect(() => {
    if (cargando) return;

    if (!sesion) {
      const destino = window.location.pathname + window.location.search;
      router.replace(`/login?siguiente=${encodeURIComponent(destino)}`);
      return;
    }

    if (!permitido) router.replace("/sin-permiso");
  }, [cargando, sesion, permitido, router]);

  if (cargando || !sesion || !permitido) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground" role="status">
          Cargando…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Envío al sitio que le corresponde a cada rol. Se usa en las pantallas que son
 * un punto de entrada, no un destino.
 */
export function useRedirigirSegunRol() {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (cargando || !sesion) return;
    const destino = rutaInicial(sesion.rol);
    if (!puedeAcceder(sesion.rol, window.location.pathname)) router.replace(destino);
  }, [cargando, sesion, router]);
}
