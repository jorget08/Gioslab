"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { destinoSeguro } from "@/domain/autorizacion";
import { useSesion } from "@/lib/auth/contexto";

/**
 * Aterrizaje de los enlaces que Supabase manda por correo (confirmación de
 * cuenta y recuperación de contraseña).
 *
 * El enlace trae un `code` de un solo uso. Ya no hace falta canjearlo a mano:
 * el cliente de supabase-js lo detecta en la URL y lo canjea solo al arrancar
 * (`detectSessionInUrl`, activo por defecto). Aquí solo se espera el resultado
 * y se redirige.
 */
function Callback() {
  const { sesion, cargando } = useSesion();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    if (!sesion) {
      router.replace("/login?error=enlace_invalido");
      return;
    }
    router.replace(destinoSeguro(params.get("siguiente")));
  }, [cargando, sesion, params, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground" role="status">
        Confirmando…
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
