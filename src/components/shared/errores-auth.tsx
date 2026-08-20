"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recoge los errores que Supabase devuelve en la URL al volver de un correo.
 *
 * Cuando un enlace de confirmación o de recuperación falla, Supabase redirige
 * a la aplicación con algo así:
 *
 *   /?error=access_denied&error_code=otp_expired#error=access_denied&...
 *
 * El detalle importante es que **lo manda en el fragmento además de en la
 * query**, y el fragmento nunca llega al servidor. Sin esto, el usuario
 * aterrizaba en una pantalla que lo rebotaba a /login sin explicar nada: el
 * enlace "no funciona" y no hay forma de saber por qué.
 *
 * Se monta en el layout raíz porque el error puede caer en cualquier ruta.
 */
export function ErroresAuth() {
  const router = useRouter();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const codigo =
      query.get("error_code") ??
      hash.get("error_code") ??
      query.get("error") ??
      hash.get("error");

    if (!codigo) return;

    // Se limpia la URL para que recargar no repita el mensaje, y se lleva el
    // código a la pantalla de acceso, que es donde puede hacer algo con él.
    window.history.replaceState(null, "", window.location.pathname);
    router.replace(`/login?error=${encodeURIComponent(codigo)}`);
  }, [router]);

  return null;
}
