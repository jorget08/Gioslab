"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { destinoTrasEntrar, puedeAcceder, rutaInicial, type Rol } from "@/domain/autorizacion";
import { leerErrorDeUrl, urlDeLogin } from "@/domain/error-url";
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
      // Si venimos de un enlace de correo fallido, el motivo viaja en la URL y
      // hay que llevárselo al login: si no, el usuario acaba ahí sin saber por
      // qué "el enlace no funciona".
      const error = leerErrorDeUrl(window.location.search, window.location.hash);
      const destino = window.location.pathname + window.location.search;
      router.replace(
        urlDeLogin({ siguiente: error ? undefined : destino, error }),
      );
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
 * Sale del formulario de acceso EN CUANTO la sesión existe de verdad.
 *
 * Arregla el rebote del login: se pulsaba Entrar, la página volvía al login y
 * había que pulsar otra vez.
 *
 * La causa era una carrera. `signInWithPassword` resuelve en cuanto Supabase
 * guarda la sesión, pero el evento `SIGNED_IN` que actualiza este contexto
 * llega DESPUÉS. Si el formulario navegaba ahí mismo, el `Guarda` del destino
 * miraba un contexto que todavía decía "no hay sesión" y devolvía al login. Al
 * segundo intento ya estaba puesta y por eso entraba.
 *
 * La solución no es esperar un rato —eso solo hace la carrera más difícil de
 * perder—, sino invertir quién manda: aquí no se navega tras el submit, se
 * navega cuando la sesión aparece. Si nunca aparece, no se navega, que es lo
 * correcto.
 */
export function useIrAlEntrar(pedido?: string | null) {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (cargando || !sesion) return;
    router.replace(destinoTrasEntrar(sesion.rol, pedido));
  }, [cargando, sesion, pedido, router]);
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
