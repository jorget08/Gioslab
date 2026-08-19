/**
 * Verifica que las credenciales de .env.local apuntan a un proyecto Supabase vivo.
 *
 *   npm run db:check
 *
 * No es un test: es una comprobación manual para usar al configurar un entorno
 * nuevo o cuando algo deja de conectar.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("✗ Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

console.log(`→ Proyecto: ${url}`);

const supabase = createClient(url, key);

// getSession() no hace red; sirve para confirmar que el cliente se construye bien.
const { error: authError } = await supabase.auth.getSession();
if (authError) {
  console.error(`✗ Auth respondió con error: ${authError.message}`);
  process.exit(1);
}
console.log("✓ Cliente construido y Auth accesible");

// Golpe real a PostgREST. Con el esquema vacío esperamos un error de "tabla no
// encontrada" (42P01): eso ya demuestra que la URL y la clave son válidas y que
// el proyecto responde. Un 401/403 significaría credenciales malas.
const { error: dbError } = await supabase.from("__conexion__").select("*").limit(1);

if (!dbError) {
  console.log("✓ Postgres respondió");
} else if (dbError.code === "42P01" || /does not exist|not find the table/i.test(dbError.message)) {
  console.log("✓ Postgres respondió (esquema vacío, como se espera antes del grupo 1)");
} else {
  console.error(`✗ Postgres rechazó la consulta: [${dbError.code}] ${dbError.message}`);
  process.exit(1);
}

console.log("\n✓ Conexión a Supabase verificada.");
