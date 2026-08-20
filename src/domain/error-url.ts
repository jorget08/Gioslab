/**
 * Lectura de los errores que Supabase devuelve en la URL al volver de un correo.
 *
 * Cuando un enlace de confirmación o recuperación falla, Supabase redirige así:
 *
 *   /?error=access_denied&error_code=otp_expired#error=access_denied&error_code=…
 *
 * Dos detalles que importan:
 *
 * 1. Lo manda en el FRAGMENTO además de en la query, y el fragmento nunca llega
 *    al servidor. Hay que leer los dos.
 * 2. `error_code` es el específico (`otp_expired`) y `error` el genérico
 *    (`access_denied`). Se prefiere el específico, que es el que permite dar un
 *    mensaje útil.
 *
 * Función pura: recibe las cadenas en vez de leer `window`, para poder probarla.
 */
export function leerErrorDeUrl(busqueda: string, fragmento: string): string | null {
  const query = new URLSearchParams(busqueda.replace(/^\?/, ""));
  const hash = new URLSearchParams(fragmento.replace(/^#/, ""));

  return (
    query.get("error_code") ??
    hash.get("error_code") ??
    query.get("error") ??
    hash.get("error") ??
    null
  );
}

/**
 * Construye el destino de /login conservando el error si lo hay.
 *
 * Existe porque antes había DOS componentes redirigiendo a la vez —la guarda de
 * sesión y un recolector de errores— y ganaba el que llegara último, así que el
 * usuario acababa en el login sin ninguna explicación. Ahora redirige solo la
 * guarda, y este es el único sitio que arma esa URL.
 */
export function urlDeLogin(opciones: { siguiente?: string; error?: string | null }): string {
  const params = new URLSearchParams();
  if (opciones.siguiente) params.set("siguiente", opciones.siguiente);
  if (opciones.error) params.set("error", opciones.error);

  const cadena = params.toString();
  return cadena ? `/login?${cadena}` : "/login";
}
