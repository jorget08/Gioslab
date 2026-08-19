import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Cliente de Supabase para el servidor: Server Components, Server Actions y
 * Route Handlers.
 *
 * Se crea uno nuevo en cada petición y **nunca** se guarda en una variable de
 * módulo. Un cliente compartido entre peticiones mezclaría las sesiones de dos
 * usuarios distintos, que en esta plataforma significa filtrar datos clínicos de
 * un atleta a otro tenant.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. Se ignora a
          // propósito: el refresco de sesión lo hará el middleware que se
          // agrega junto con el login (tareas 1.5 y 1.6).
        }
      },
    },
  });
}
