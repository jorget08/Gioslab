/**
 * 1.4 — Verificación de RLS con USUARIOS REALES.
 *
 * Las suites .sql simulan la sesión con `set request.jwt.claims`. Esto no: crea
 * usuarios de verdad en Supabase Auth, inicia sesión con correo y contraseña, y
 * consulta por la API REST con el token que devuelve el login. Es el mismo
 * camino que recorrerá la aplicación.
 *
 *   npx supabase start
 *   npm run test:rls
 *
 * Cubre además el caso multi-tenant: un entrenador que trabaja en un gimnasio y
 * a la vez tiene alumnos propios, y el cambio de contexto entre ambos.
 *
 * Solo contra el entorno local: crea y borra datos.
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

/**
 * Las claves salen de `supabase status`, nunca escritas en el archivo.
 *
 * Aunque las del entorno local son de demostración e idénticas en todas las
 * instalaciones, una cadena con formato `sb_secret_...` en el repositorio
 * dispara la protección de secretos de GitHub — y con razón: nadie que lea el
 * archivo puede distinguir a simple vista una clave de demo de una real.
 */
function credencialesLocales() {
  try {
    const salida = execFileSync("npx", ["--yes", "supabase@latest", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const s = JSON.parse(salida);
    return {
      url: s.API_URL,
      publishable: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
      secret: s.SECRET_KEY ?? s.SERVICE_ROLE_KEY,
    };
  } catch {
    console.error("✗ No hay un Supabase local corriendo. Ejecuta: npx supabase start");
    process.exit(1);
  }
}

const local = credencialesLocales();
const URL = process.env.SUPABASE_URL ?? local.url;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY ?? local.publishable;
const SECRET = process.env.SUPABASE_SECRET_KEY ?? local.secret;

if (URL.includes("supabase.co")) {
  console.error("✗ Esta prueba crea y borra datos. Solo contra el entorno local.");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

const PASS = "prueba-rls-2026";
const TENANT_A = "10000000-0000-0000-0000-0000000000aa";
const TENANT_B = "10000000-0000-0000-0000-0000000000bb";

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(52)} ${real} (esperado ${esperado})`);
}

// ---------------------------------------------------------------------------
// Preparación
// ---------------------------------------------------------------------------

/**
 * Reintenta una operación de Auth.
 *
 * El GoTrue del entorno local devuelve "Processing this request timed out" de
 * vez en cuando, tanto al crear usuarios como al iniciar sesión. No es un fallo
 * del código —contra el proyecto alojado no ocurre— pero un test que falla al
 * azar hace desconfiar de toda la suite, que es justo lo que no puede pasar con
 * las pruebas que protegen datos clínicos.
 */
async function reintentar(fn, veces = 4) {
  let ultimo;
  for (let i = 0; i < veces; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (!/timed out|timeout/i.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw ultimo;
}

/** Envuelve una respuesta {data,error} de Supabase para que el reintento la vea. */
async function conReintento(fn) {
  return reintentar(async () => {
    const r = await fn();
    if (r.error && /timed out|timeout/i.test(r.error.message)) throw new Error(r.error.message);
    return r;
  });
}

async function limpiar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@rls-test.local")) await conReintento(() => admin.auth.admin.deleteUser(u.id));
  }
  await admin.from("athletes").delete().in("tenant_id", [TENANT_A, TENANT_B]);
  await admin.from("memberships").delete().in("tenant_id", [TENANT_A, TENANT_B]);
  await admin.from("tenants").delete().in("id", [TENANT_A, TENANT_B]);
}

/**
 * Crea un usuario y sus membresías.
 * `pertenencias` es una lista de [tenantId, rol]; la primera queda activa.
 */
async function crearUsuario(email, pertenencias, { superAdmin = false } = {}) {
  const { data, error } = await conReintento(() => admin.auth.admin.createUser({ email, password: PASS, email_confirm: true }));
  if (error) throw new Error(`createUser ${email}: ${error.message}`);

  // El perfil ya lo creó el trigger handle_new_user (migración 1.5). Aquí solo
  // se marca el administrador de plataforma, que nunca sale de un registro
  // público.
  if (superAdmin) {
    const { error: e2 } = await admin
      .from("users")
      .update({ is_super_admin: true })
      .eq("id", data.user.id);
    if (e2) throw new Error(`perfil ${email}: ${e2.message}`);
  }

  for (const [tenantId, role] of pertenencias) {
    const { error: e3 } = await admin
      .from("memberships")
      .insert({ user_id: data.user.id, tenant_id: tenantId, role });
    if (e3) throw new Error(`membresía ${email}: ${e3.message}`);
  }

  return data.user.id;
}

/** Inicia sesión de verdad y devuelve un cliente que usa ese token. */
async function sesion(email) {
  const anonimo = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { data, error } = await conReintento(() =>
    anonimo.auth.signInWithPassword({ email, password: PASS }),
  );
  if (error) throw new Error(`login ${email}: ${error.message}`);

  return createClient(URL, PUBLISHABLE, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

const contar = async (cli, tabla) => {
  const { count, error } = await cli.from(tabla).select("*", { count: "exact", head: true });
  return error ? `error:${error.code}` : count;
};

/**
 * Cuenta solo las filas de esta prueba.
 *
 * Contar la tabla entera acoplaba el resultado a que la base estuviera vacía, y
 * dejó de estarlo en cuanto la 1.9 añadió datos de prueba. Una aserción que
 * depende de lo que haya alrededor falla por motivos que no tienen que ver con
 * lo que quiere comprobar.
 */
const contarMios = async (cli, tabla, columna, valores) => {
  const { count, error } = await cli
    .from(tabla)
    .select("*", { count: "exact", head: true })
    .in(columna, valores);
  return error ? `error:${error.code}` : count;
};

/**
 * Devuelve el código de error de Postgres, o 'sin-error' si la consulta pasó.
 * Va sin `head: true` a propósito: una petición HEAD responde con el cuerpo
 * vacío, así que el código del error se pierde por el camino.
 */
const codigoError = async (cli, tabla) => {
  const { error } = await cli.from(tabla).select("*");
  return error?.code ?? "sin-error";
};

// ---------------------------------------------------------------------------

async function main() {
  await limpiar();

  await admin.from("tenants").insert([
    { id: TENANT_A, type: "gym", name: "Gimnasio A" },
    { id: TENANT_B, type: "solo", name: "Entrenador B" },
  ]);

  await crearUsuario("super@rls-test.local", [], { superAdmin: true });
  await crearUsuario("gym@rls-test.local", [[TENANT_A, "gym"]]);
  const trainerA2 = await crearUsuario("t2@rls-test.local", [[TENANT_A, "trainer"]]);
  await crearUsuario("cliente@rls-test.local", [[TENANT_A, "client"]]);

  // El caso que motivó el rediseño: trabaja en el gimnasio A Y tiene alumnos
  // propios en su tenant B. Su tenant activo arranca en A (primera membresía).
  const mixto = await crearUsuario("mixto@rls-test.local", [
    [TENANT_A, "trainer"],
    [TENANT_B, "trainer"],
  ]);

  const { data: atletas, error: eA } = await admin
    .from("athletes")
    .insert([
      { tenant_id: TENANT_A, trainer_id: mixto, full_name: "Alumno del gimnasio", birth_date: "1995-03-10", sex: "masculino" },
      { tenant_id: TENANT_A, trainer_id: trainerA2, full_name: "Atleta de otro entrenador", birth_date: "1998-07-22", sex: "femenino" },
      { tenant_id: TENANT_B, trainer_id: mixto, full_name: "Alumno particular", birth_date: "2000-01-05", sex: "masculino" },
    ])
    .select();
  if (eA) throw new Error(`atletas: ${eA.message}`);

  await admin.from("anthropometric_measurements").insert(
    atletas.map((a) => ({ athlete_id: a.id, tenant_id: a.tenant_id, weight_kg: 80 })),
  );

  // -------------------------------------------------------------------------
  console.log("\n=== Atletas visibles por rol (sesión real) ===");
  verificar("super_admin ve todos",
    await contarMios(await sesion("super@rls-test.local"), "athletes", "tenant_id", [TENANT_A, TENANT_B]), 3);
  verificar("gym A ve los de su gimnasio",     await contar(await sesion("gym@rls-test.local"), "athletes"), 2);
  verificar("trainer ve solo el suyo",         await contar(await sesion("t2@rls-test.local"), "athletes"), 1);
  verificar("CLIENTE no ve ningún atleta",     await contar(await sesion("cliente@rls-test.local"), "athletes"), 0);

  console.log("\n=== Entrenador en DOS tenants (el caso nuevo) ===");
  const cliMixto = await sesion("mixto@rls-test.local");
  verificar("en el gimnasio ve su alumno de ahí", await contar(cliMixto, "athletes"), 1);
  verificar("ve los 2 tenants en el selector",    await contar(cliMixto, "tenants"), 2);

  const { data: nombreEnGym } = await cliMixto.from("athletes").select("full_name").single();
  verificar("y es el correcto", nombreEnGym?.full_name, "Alumno del gimnasio");

  // Cambia de contexto por la función, como hará la interfaz.
  const { error: eSw } = await cliMixto.rpc("cambiar_tenant", { nuevo_tenant: TENANT_B });
  verificar("cambiar_tenant a uno propio funciona", eSw?.message ?? "sin-error", "sin-error");

  const cliMixtoB = await sesion("mixto@rls-test.local");
  const { data: nombreEnSolo } = await cliMixtoB.from("athletes").select("full_name").single();
  verificar("tras cambiar, ve su alumno particular", nombreEnSolo?.full_name, "Alumno particular");
  verificar("y NO ve los del gimnasio",              await contar(cliMixtoB, "athletes"), 1);

  console.log("\n=== Robo de contexto: saltar a un tenant ajeno ===");
  const cliCliente = await sesion("cliente@rls-test.local");
  const { error: eRobo } = await cliCliente.rpc("cambiar_tenant", { nuevo_tenant: TENANT_B });
  verificar("cambiar_tenant a un tenant ajeno falla", eRobo?.code ?? "sin-error", "42501");

  const { error: eDirecto } = await cliCliente
    .from("users").update({ active_tenant_id: TENANT_B }).eq("email", "cliente@rls-test.local");
  verificar("UPDATE directo de active_tenant_id falla", eDirecto?.code ?? "sin-error", "42501");

  console.log("\n=== Datos clínicos ===");
  verificar("cliente no ve mediciones",
    await contarMios(await sesion("cliente@rls-test.local"), "anthropometric_measurements", "tenant_id", [TENANT_A, TENANT_B]), 0);
  verificar("gym A ve las de su gimnasio",
    await contarMios(await sesion("gym@rls-test.local"), "anthropometric_measurements", "tenant_id", [TENANT_A, TENANT_B]), 2);

  console.log("\n=== Metodología (el activo del negocio) ===");
  await admin.from("rules").insert({
    rule_key: "regla-de-prueba-rls", version: 1,
    condition: { femur_class: "Largo" }, actions: { priorizar: ["Prensa"] },
    justification: "Prueba", evidence_level: "LEVEL_B_BIOMECHANICS",
  });
  verificar("trainer puede leer las reglas",
    await contarMios(await sesion("t2@rls-test.local"), "rules", "rule_key", ["regla-de-prueba-rls"]), 1);
  verificar("CLIENTE no puede leer las reglas",
    await contarMios(await sesion("cliente@rls-test.local"), "rules", "rule_key", ["regla-de-prueba-rls"]), 0);

  console.log("\n=== Usuarios ===");
  verificar("cliente solo se ve a sí mismo",
    await contarMios(await sesion("cliente@rls-test.local"), "users", "email",
      ["gym@rls-test.local","t2@rls-test.local","cliente@rls-test.local","mixto@rls-test.local"]), 1);
  verificar("gym A ve a su equipo del tenant A",
    await contarMios(await sesion("gym@rls-test.local"), "users", "email",
      ["gym@rls-test.local","t2@rls-test.local","cliente@rls-test.local","mixto@rls-test.local"]), 4);

  console.log("\n=== Anónimo (sin sesión) ===");
  const anon = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  verificar("anónimo bloqueado en athletes",   await codigoError(anon, "athletes"), "42501");
  verificar("anónimo bloqueado en rules",      await codigoError(anon, "rules"), "42501");
  verificar("anónimo bloqueado en mediciones", await codigoError(anon, "anthropometric_measurements"), "42501");

  await admin.from("rules").delete().eq("rule_key", "regla-de-prueba-rls");
  await limpiar();

  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
