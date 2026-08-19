import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Punto de aterrizaje de los enlaces que Supabase manda por correo
 * (confirmación de cuenta y recuperación de contraseña).
 *
 * El enlace trae un `code` de un solo uso que aquí se canjea por una sesión.
 * Tiene que ocurrir en el servidor: el intercambio escribe las cookies de
 * sesión, y hacerlo en el cliente dejaría el código expuesto en la URL del
 * historial del navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // A dónde ir después. Solo rutas internas: aceptar una URL completa
  // convertiría este manejador en un redirector abierto, útil para phishing.
  const pedido = searchParams.get("siguiente");
  const siguiente = pedido?.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Caducado o ya usado. No se detalla el motivo en la URL.
    return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
  }

  return NextResponse.redirect(`${origin}${siguiente}`);
}
