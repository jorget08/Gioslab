import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Cliente de Supabase para el navegador. Úsalo solo dentro de Client Components
 * (los que llevan "use client").
 *
 * Esta clave es pública por diseño: viaja al navegador y lo único que la contiene
 * es Row Level Security. Por eso la seguridad real del proyecto se juega en las
 * políticas RLS de la tarea 1.4, no en esconder la clave.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
