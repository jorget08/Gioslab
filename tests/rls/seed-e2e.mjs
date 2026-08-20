/**
 * 1.9 — Comprueba que los datos de prueba sirven de verdad.
 *
 *   npx supabase db reset && npm run test:seed
 *
 * Un seed que crea filas pero cuyas cuentas no pueden entrar es peor que no
 * tenerlo: se descubre al intentar usarlo. Aquí se inicia sesión con cada una
 * por la misma API que la aplicación y se comprueba qué ve cada quien.
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

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(50)} ${real} (esperado ${esperado})`);
}

async function sesion(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error } = await cli.auth.signInWithPassword({ email, password: CLAVE });
  if (error) throw new Error(`no pudo entrar ${email}: ${error.message}`);
  return cli;
}

const contar = async (cli, tabla) => {
  const { count, error } = await cli.from(tabla).select("*", { count: "exact", head: true });
  return error ? `error:${error.code}` : count;
};

async function main() {
  console.log("\n=== Todas las cuentas pueden iniciar sesión ===");
  // Sin fila en auth.identities el usuario existe pero no puede entrar, y el
  // error no explica por qué. Esta comprobación lo detecta.
  for (const correo of [
    "admin@gioslab.test",
    "gimnasio@gioslab.test",
    "ana@gioslab.test",
    "diego@gioslab.test",
  ]) {
    try {
      await sesion(correo);
      verificar(correo, "entra", "entra");
    } catch {
      verificar(correo, "NO entra", "entra");
    }
  }

  console.log("\n=== Cada quien ve lo suyo ===");
  verificar("super_admin ve los 5 atletas", await contar(await sesion("admin@gioslab.test"), "athletes"), 5);
  verificar("el gimnasio ve sus 4", await contar(await sesion("gimnasio@gioslab.test"), "athletes"), 4);
  verificar("Ana ve sus 2", await contar(await sesion("ana@gioslab.test"), "athletes"), 2);

  console.log("\n=== Diego, el entrenador en dos espacios ===");
  const GIMNASIO = "00000000-1111-0000-0000-000000000001";
  const PROPIO = "00000000-1111-0000-0000-000000000002";

  let diego = await sesion("diego@gioslab.test");
  verificar("ve 2 espacios en el selector", await contar(diego, "tenants"), 2);

  // Se fija el punto de partida en vez de asumir el del seed: esta prueba
  // CAMBIA el tenant activo, así que dejarlo al azar la haría fallar en la
  // segunda ejecución. Un test que solo pasa con la base recién creada avisa
  // tarde y mal.
  await diego.rpc("cambiar_tenant", { nuevo_tenant: GIMNASIO });
  diego = await sesion("diego@gioslab.test");
  const { data: enGimnasio } = await diego.from("athletes").select("full_name");
  verificar("en el gimnasio ve 2 atletas", enGimnasio?.length, 2);

  await diego.rpc("cambiar_tenant", { nuevo_tenant: PROPIO });
  diego = await sesion("diego@gioslab.test");
  const { data: propios } = await diego.from("athletes").select("full_name");
  verificar("tras cambiar ve 1 alumna propia", propios?.length, 1);
  verificar("y es la correcta", propios?.[0]?.full_name, "Valentina Hoyos");

  // Se devuelve al estado del seed para no ensuciar la siguiente ejecución.
  await diego.rpc("cambiar_tenant", { nuevo_tenant: GIMNASIO });

  console.log("\n=== El historial permite ver evolución ===");
  const ana = await sesion("ana@gioslab.test");
  const { data: tomas } = await ana
    .from("anthropometric_measurements")
    .select("weight_kg, body_fat_pct, measured_at")
    .eq("athlete_id", "00000000-3333-0000-0000-000000000001")
    .order("measured_at", { ascending: true });

  verificar("María Fernanda tiene 2 tomas", tomas?.length, 2);
  verificar("la primera coincide con el Excel (18.0 %)", Number(tomas?.[0]?.body_fat_pct), 18);
  verificar("y se ve la mejora en la segunda", Number(tomas?.[1]?.body_fat_pct) < 18, true);

  console.log("\n=== Metodología cargada ===");
  verificar("3 reglas activas", await contar(ana, "rules"), 3);
  verificar("5 ejercicios en la biblioteca", await contar(ana, "exercise_library"), 5);

  console.log("\n=== Los datos sensibles siguen protegidos ===");
  const anon = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error: eAnon } = await anon.from("athletes").select("*");
  verificar("un anónimo no ve nada", eAnon?.code, "42501");

  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
