/**
 * Arranca la app contra el Supabase LOCAL de Docker.
 *
 *   npm run dev:local
 *
 * POR QUÉ EXISTE
 *
 * `.env.local` apunta al proyecto remoto, que es lo correcto para el día a día.
 * Pero los datos de prueba de `supabase/seed.sql` —ana@gioslab.test y compañía—
 * solo se cargan en el entorno local. Arrancar con `npm run dev` y tratar de
 * entrar con esas cuentas devuelve "correo o contraseña incorrectos", y el
 * mensaje no da ninguna pista de que se está hablando con la base equivocada.
 *
 * Este comando lee las credenciales de `supabase status` y las pasa por
 * variables de entorno, que tienen prioridad sobre .env.local. Así no hay que
 * editar ningún archivo ni acordarse de revertirlo después.
 */
import { execFileSync, spawn } from "node:child_process";

const PUERTO = process.env.PORT ?? "3000";

let estado;
try {
  estado = JSON.parse(
    execFileSync("npx", ["--yes", "supabase@latest", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
} catch {
  console.error(
    "\n✗ No hay un Supabase local corriendo.\n" +
      "  Arráncalo con:  npx supabase start\n" +
      "  Y carga los datos de prueba con:  npx supabase db reset\n",
  );
  process.exit(1);
}

const url = estado.API_URL;
const clave = estado.PUBLISHABLE_KEY ?? estado.ANON_KEY;

console.log(`\n▸ Base de datos:  ${url}  (local, NO el proyecto remoto)`);
console.log(`▸ Aplicación:     http://localhost:${PUERTO}`);
console.log(`▸ Cuentas de prueba, contraseña "clave-de-prueba":`);
console.log(`    ana@gioslab.test        entrenadora, 2 atletas`);
console.log(`    diego@gioslab.test      en dos espacios de trabajo`);
console.log(`    gimnasio@gioslab.test   dueña del gimnasio`);
console.log(`    admin@gioslab.test      super_admin\n`);

const hijo = spawn("node_modules/.bin/next", ["dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    // Las variables de entorno ganan sobre .env.local, así que no hace falta
    // tocar el archivo ni acordarse de dejarlo como estaba.
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clave,
    PORT: PUERTO,
  },
});

hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
