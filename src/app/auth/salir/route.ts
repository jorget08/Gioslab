import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión.
 *
 * Va por POST y no por un enlace: un GET puede dispararse desde una imagen o un
 * prefetch del navegador, y desconectaría al entrenador a mitad de una
 * evaluación sin que él haya hecho nada.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), {
    // 303 fuerza a que el navegador cambie el POST por un GET al seguir la
    // redirección; con 302 algunos reenvían el POST a /login.
    status: 303,
  });
}
