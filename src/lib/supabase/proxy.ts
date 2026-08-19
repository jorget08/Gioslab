import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Refresca la sesión en cada petición y escribe las cookies renovadas en la
 * respuesta.
 *
 * Hace falta porque los Server Components no pueden escribir cookies: cuando el
 * token caduca, ahí no hay forma de guardar el nuevo. Sin esto, el entrenador se
 * queda desconectado a mitad de una evaluación.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Sin estas cabeceras, una CDN podría cachear una respuesta que trae
        // Set-Cookie de sesión y servírsela a otra persona.
        for (const [clave, valor] of Object.entries(headers)) {
          response.headers.set(clave, valor);
        }
      },
    },
  });

  // Esta llamada es la que dispara el refresco. Va antes de generar la
  // respuesta: si el token se renovara después, la cookie nueva no se podría
  // escribir y la siguiente petición volvería a refrescar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
