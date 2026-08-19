import { NextResponse, type NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/proxy";

/**
 * En Next.js 16 esto se llama `proxy`, no `middleware`: el nombre anterior está
 * deprecado (ver node_modules/next/dist/docs → file-conventions/proxy).
 *
 * Hace dos cosas: refrescar la sesión en cada petición y bloquear las rutas
 * privadas. La protección fina por rol es la tarea 1.6; aquí solo se distingue
 * "hay sesión" de "no la hay".
 */

const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/nueva-contrasena", "/auth"];

export async function proxy(request: NextRequest) {
  const { response, user } = await actualizarSesion(request);
  const { pathname } = request.nextUrl;

  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Para devolverlo a donde iba después de entrar.
    url.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión iniciada, las pantallas de acceso no tienen sentido.
  // Se excluye /nueva-contrasena: se llega ahí CON sesión, desde el correo de
  // recuperación, justamente para cambiar la contraseña.
  if (user && esPublica && !pathname.startsWith("/nueva-contrasena") && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
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
