/**
 * Variables de entorno de Supabase, leídas y validadas en un solo lugar.
 *
 * Next.js reemplaza `process.env.NEXT_PUBLIC_*` por su valor literal al compilar,
 * así que hay que escribir la expresión completa en el código. Leerlas de forma
 * dinámica (`process.env[nombre]`) devuelve `undefined` en el navegador.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. ` +
        `Cópiala desde Supabase → Project Settings → API a tu archivo .env.local ` +
        `(usa .env.example como plantilla).`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
