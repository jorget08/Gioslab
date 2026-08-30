/**
 * 4.2 — La galería de ejercicios, por la misma puerta que la aplicación.
 *
 *   npx supabase start && npm run test:medios
 *
 * Aquí no se prueba el componente: se prueba el bucket. La pantalla esconde el
 * botón a quien no es Giovanni, pero eso es navegación, no seguridad — quien
 * llame a la API de Storage directamente tiene que rebotar igual (§3.2: no se
 * asume que RLS funciona sin verificarlo).
 *
 * Cuatro cosas que el componente da por hechas:
 *
 *  1. Un super_admin sube, reemplaza y borra.
 *  2. Un entrenador NO sube ni borra, aunque SÍ lee: necesita ver la técnica.
 *  3. El bucket es público de lectura a propósito (ver la migración), así que la
 *     URL pública tiene que servir el archivo SIN sesión. De eso depende que la
 *     foto se cachee en el teléfono del atleta en Fase B.
 *  4. `media_urls` solo admite la forma {tipo, path}. Es lo que impide que una
 *     escritura mal hecha reviente la lista del entrenador dos semanas después.
 *  5. Un ejercicio NO se borra, ni siquiera siendo Giovanni. Se archiva. Lo
 *     impone la ausencia del GRANT de DELETE, y esta prueba nació justamente de
 *     dar por hecho lo contrario: la limpieza no limpiaba nada y dejaba una
 *     ficha con una foto rota en la biblioteca.
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function local() {
  try {
    const s = JSON.parse(
      execFileSync("npx", ["--yes", "supabase@latest", "status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
    return { url: s.API_URL, publishable: s.PUBLISHABLE_KEY };
  } catch {
    console.error("✗ No hay un Supabase local. Ejecuta: npx supabase start");
    process.exit(1);
  }
}

const { url: URL_SB, publishable: PUB } = local();
const CLAVE = "clave-de-prueba";
const BUCKET = "ejercicios";

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(52)} ${real} (esperado ${esperado})`);
}

async function sesion(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error } = await cli.auth.signInWithPassword({ email, password: CLAVE });
  if (error) throw new Error(`no pudo entrar ${email}: ${error.message}`);
  return cli;
}

/** Un PNG de 1x1 real: Storage valida el MIME contra el contenido. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const archivo = () => new Blob([PNG_1X1], { type: "image/png" });

const sello = Date.now();
const ruta = (n) => `e2e-${sello}/${n}.png`;

async function main() {
  const admin = await sesion("admin@gioslab.test");
  const entrenador = await sesion("diego@gioslab.test");
  const anonimo = createClient(URL_SB, PUB, { auth: { persistSession: false } });

  console.log("\n=== Solo Giovanni escribe en el bucket ===");

  const sube = await admin.storage.from(BUCKET).upload(ruta("admin"), archivo(), {
    contentType: "image/png",
  });
  verificar("el super_admin sube", sube.error ? `error:${sube.error.message}` : "ok", "ok");

  const subeEntrenador = await entrenador.storage
    .from(BUCKET)
    .upload(ruta("entrenador"), archivo(), { contentType: "image/png" });
  verificar(
    "el entrenador NO sube",
    subeEntrenador.error ? "rechazado" : "PASÓ",
    "rechazado",
  );

  const borraEntrenador = await entrenador.storage.from(BUCKET).remove([ruta("admin")]);
  // Storage responde 200 con la lista de lo borrado; si RLS lo frena, la lista
  // viene vacía. Un `error ? ...` a secas daría la prueba por buena sin que se
  // hubiera impedido nada.
  verificar(
    "el entrenador NO borra",
    borraEntrenador.data?.length ? "BORRÓ" : "rechazado",
    "rechazado",
  );

  console.log("\n=== La lectura es de todos, y sin sesión ===");

  const ve = await entrenador.storage.from(BUCKET).download(ruta("admin"));
  verificar("el entrenador ve la foto", ve.error ? "no la ve" : "ok", "ok");

  // El bucket es público a propósito: de esto depende que la foto se cachee en
  // el teléfono del atleta y no dependa de una URL que caduca.
  const publica = anonimo.storage.from(BUCKET).getPublicUrl(ruta("admin")).data.publicUrl;
  const sinSesion = await fetch(publica);
  verificar("la URL pública sirve sin sesión", sinSesion.status, 200);

  console.log("\n=== media_urls solo admite {tipo, path} ===");

  const alta = await admin
    .from("exercise_library")
    .insert({ name: `__e2e_medios_${sello}__` })
    .select("id")
    .single();
  verificar("crea el ejercicio de prueba", alta.error ? `error:${alta.error.code}` : "ok", "ok");
  const id = alta.data?.id;

  const bien = await admin
    .from("exercise_library")
    .update({ media_urls: [{ tipo: "foto", path: ruta("admin") }] })
    .eq("id", id);
  verificar("acepta la forma correcta", bien.error ? `error:${bien.error.code}` : "ok", "ok");

  // `23514` es la violación de CHECK. Se exige el código exacto para que un
  // error de red no se cuele como si la validación existiera.
  const mal = await admin
    .from("exercise_library")
    .update({ media_urls: [{ tipo: "sonido", path: "x.mp3" }] })
    .eq("id", id);
  verificar("rechaza un tipo inventado", mal.error?.code ?? "PASÓ", "23514");

  const sinPath = await admin
    .from("exercise_library")
    .update({ media_urls: [{ tipo: "foto" }] })
    .eq("id", id);
  verificar("rechaza un medio sin ruta", sinPath.error?.code ?? "PASÓ", "23514");

  console.log("\n=== Un ejercicio se archiva, no se borra ===");

  // §3.5 y la tarea 4.1: borrarlo dejaría huérfanas las reglas y los planes que
  // lo nombran, y eso es historial. Quien lo impide es la falta del GRANT de
  // DELETE, no la interfaz.
  const borrar = await admin.from("exercise_library").delete().eq("id", id);
  verificar("ni el super_admin puede borrar un ejercicio", borrar.error?.code ?? "PASÓ", "42501");

  console.log("\n=== Limpieza ===");

  // Se deja sin medios ANTES de archivar: si no, queda una ficha apuntando a un
  // archivo que este mismo script está a punto de borrar del bucket.
  const vaciar = await admin
    .from("exercise_library")
    .update({ media_urls: [], is_active: false, name: `__e2e_archivado_${sello}__` })
    .eq("id", id);
  verificar("archiva el ejercicio de prueba", vaciar.error ? `error:${vaciar.error.code}` : "ok", "ok");

  const limpio = await admin.storage.from(BUCKET).remove([ruta("admin")]);
  verificar("el super_admin borra lo suyo del bucket", limpio.data?.length ? "ok" : "no borró", "ok");

  console.log(fallos === 0 ? "\n✓ Todo en orden\n" : `\n✗ ${fallos} fallo(s)\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
