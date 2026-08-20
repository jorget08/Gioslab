import { NextResponse, type NextRequest } from "next/server";

import { destinoSeguro, esRutaPublica } from "@/domain/autorizacion";
import { actualizarSesion } from "@/lib/supabase/proxy";

/**
 * En Next.js 16 esto se llama `proxy`, no `middleware` (el nombre anterior está
 * deprecado; ver node_modules/next/dist/docs → file-conventions/proxy).
 *
 * Hace dos cosas: refrescar la sesión en cada petición y separar lo público de
 * lo privado.
 *
 * NO comprueba el rol, y es deliberado. Averiguarlo exige consultar la base, y
 * hacerlo aquí añadiría una consulta a CADA petición, incluidas las de recursos.
 * La comprobación de rol vive en cada sección del servidor (`requerirRol`), que
 * se ejecuta una vez por navegación y no se puede rodear desde el cliente. Y
 * detrás de todo está RLS, que es la barrera real: un rol equivocado no ve datos
 * aunque llegue a la pantalla.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await actualizarSesion(request);
  const { pathname } = request.nextUrl;
  const publica = esRutaPublica(pathname);

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Para devolverlo a donde iba después de entrar.
    url.searchParams.set("siguiente", destinoSeguro(pathname));
    return NextResponse.redirect(url);
  }

  // Con sesión iniciada, las pantallas de acceso no tienen sentido.
  // Se excluye /nueva-contrasena: se llega ahí CON sesión desde el correo de
  // recuperación, justamente para cambiar la contraseña. Y /auth, que es donde
  // se canjean los códigos.
  const excluidas = pathname.startsWith("/nueva-contrasena") || pathname.startsWith("/auth");
  if (user && publica && !excluidas) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo salvo estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
