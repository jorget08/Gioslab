/**
 * 1.7 — Invitaciones, de extremo a extremo con usuarios reales.
 *
 *   npx supabase start && npm run test:invitaciones
 *
 * Prueba el camino feliz y, sobre todo, las vías de abuso: reenviar el enlace a
 * otra persona, aceptar dos veces, adivinar tokens y auto-ascenderse.
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
    return { url: s.API_URL, publishable: s.PUBLISHABLE_KEY, secret: s.SECRET_KEY };
  } catch {
    console.error("✗ No hay un Supabase local. Ejecuta: npx supabase start");
    process.exit(1);
  }
}

const { url: URL_SB, publishable: PUB, secret: SECRET } = local();
if (URL_SB.includes("supabase.co")) {
  console.error("✗ Solo contra el entorno local.");
  process.exit(1);
}

const admin = createClient(URL_SB, SECRET, { auth: { persistSession: false } });
const PASS = "unaclavelarga";
const T_GYM = "10000000-0000-0000-0000-0000000000e1";

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(48)} ${real} (esperado ${esperado})`);
}

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
    if (u.email?.endsWith("@inv-test.local")) {
      await conReintento(() => admin.auth.admin.deleteUser(u.id));
    }
  }
  await admin.from("invitations").delete().eq("tenant_id", T_GYM);
  await admin.from("memberships").delete().eq("tenant_id", T_GYM);
  await admin.from("tenants").delete().eq("id", T_GYM);
}

async function crearUsuario(email, membresias = []) {
  const { data, error } = await conReintento(() => admin.auth.admin.createUser({ email, password: PASS, email_confirm: true }));
  if (error) throw new Error(`${email}: ${error.message}`);
  for (const [tenant_id, role] of membresias) {
    await admin.from("memberships").insert({ user_id: data.user.id, tenant_id, role });
  }
  return data.user.id;
}

async function sesion(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error } = await conReintento(() =>
    cli.auth.signInWithPassword({ email, password: PASS }),
  );
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return cli;
}

async function main() {
  await limpiar();
  await admin.from("tenants").insert({ id: T_GYM, type: "gym", name: "Gimnasio Invita" });

  await crearUsuario("dueno@inv-test.local", [[T_GYM, "gym"]]);
  await crearUsuario("entrenador@inv-test.local", [[T_GYM, "trainer"]]);
  await crearUsuario("invitado@inv-test.local");     // sin membresías todavía
  await crearUsuario("intruso@inv-test.local");      // intentará colarse

  const gym = await sesion("dueno@inv-test.local");

  console.log("\n=== Crear invitación ===");
  const { data: token, error: eCrear } = await gym.rpc("crear_invitacion", {
    p_email: "invitado@inv-test.local", p_rol: "trainer",
  });
  verificar("el gimnasio puede invitar", eCrear?.message ?? "sin-error", "sin-error");
  verificar("devuelve un token de 64 caracteres", token?.length, 64);

  const { data: fila } = await admin
    .from("invitations").select("token_hash, email").eq("tenant_id", T_GYM).single();
  verificar("la tabla NO guarda el token en claro", fila?.token_hash === token, false);
  verificar("el correo se normaliza a minúsculas", fila?.email, "invitado@inv-test.local");

  console.log("\n=== Vías de abuso ===");

  // El enlace reenviado a otra persona.
  const intruso = await sesion("intruso@inv-test.local");
  const { error: eIntruso } = await intruso.rpc("aceptar_invitacion", { p_token: token });
  verificar("otro correo NO puede aceptar", eIntruso?.code, "42501");

  const { count: colado } = await admin
    .from("memberships").select("*", { count: "exact", head: true }).eq("tenant_id", T_GYM);
  verificar("y no se le creó membresía", colado, 2);

  // Token inventado.
  const invitado = await sesion("invitado@inv-test.local");
  const { error: eFalso } = await invitado.rpc("aceptar_invitacion", { p_token: "f".repeat(64) });
  verificar("un token inventado se rechaza", eFalso?.code, "22023");

  // Un entrenador no puede fabricarse compañeros.
  const entrenador = await sesion("entrenador@inv-test.local");
  const { error: eRol } = await entrenador.rpc("crear_invitacion", {
    p_email: "otro@inv-test.local", p_rol: "trainer",
  });
  verificar("un entrenador NO invita entrenadores", eRol?.code, "42501");

  const { data: tokCliente, error: eCli } = await entrenador.rpc("crear_invitacion", {
    p_email: "cliente@inv-test.local", p_rol: "client",
  });
  verificar("pero sí puede invitar clientes", eCli?.message ?? "sin-error", "sin-error");
  verificar("y recibe su token", tokCliente?.length, 64);

  console.log("\n=== Ver la invitación antes de aceptar ===");
  const anon = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { data: vista } = await anon.rpc("ver_invitacion", { p_token: token });
  verificar("sin sesión se ve a qué gimnasio", vista?.[0]?.nombre_tenant, "Gimnasio Invita");
  verificar("y con qué rol", vista?.[0]?.rol, "trainer");
  verificar("marcada como válida", vista?.[0]?.valida, true);

  console.log("\n=== Aceptación ===");
  const { data: tenantId, error: eAcep } = await invitado.rpc("aceptar_invitacion", {
    p_token: token,
  });
  verificar("el destinatario acepta", eAcep?.message ?? "sin-error", "sin-error");
  verificar("y entra al tenant correcto", tenantId, T_GYM);

  const { data: mem } = await admin
    .from("memberships").select("role").eq("tenant_id", T_GYM).eq("user_id",
      (await admin.auth.admin.listUsers({ perPage: 200 })).data.users
        .find((u) => u.email === "invitado@inv-test.local").id);
  verificar("con el rol de la invitación", mem?.[0]?.role, "trainer");

  const { error: eRepetir } = await invitado.rpc("aceptar_invitacion", { p_token: token });
  verificar("no se puede aceptar dos veces", eRepetir?.code, "22023");

  console.log("\n=== Caducidad y revocación ===");
  const { data: tokCorto } = await gym.rpc("crear_invitacion", {
    p_email: "caduca@inv-test.local", p_rol: "client", p_dias_validez: 1,
  });
  await admin.from("invitations")
    .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq("email", "caduca@inv-test.local");
  await crearUsuario("caduca@inv-test.local");
  const caducado = await sesion("caduca@inv-test.local");
  const { error: eCad } = await caducado.rpc("aceptar_invitacion", { p_token: tokCorto });
  verificar("una invitación caducada se rechaza", eCad?.code, "22023");

  const { error: eRev } = await gym.from("invitations")
    .update({ revoked_at: new Date().toISOString() }).eq("email", "cliente@inv-test.local");
  verificar("el gimnasio puede revocar", eRev?.message ?? "sin-error", "sin-error");

  await crearUsuario("cliente@inv-test.local");
  const cliente = await sesion("cliente@inv-test.local");
  const { error: eRevAcep } = await cliente.rpc("aceptar_invitacion", { p_token: tokCliente });
  verificar("una revocada ya no se acepta", eRevAcep?.code, "22023");

  console.log("\n=== Aislamiento del listado ===");
  const { count: veGym } = await gym
    .from("invitations").select("*", { count: "exact", head: true });
  verificar("el gimnasio ve las de su tenant", veGym, 3);

  const { count: veIntruso } = await intruso
    .from("invitations").select("*", { count: "exact", head: true });
  verificar("alguien de fuera no ve ninguna", veIntruso, 0);

  await limpiar();
  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
