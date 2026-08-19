/**
 * 1.5 — Registro de extremo a extremo, por la misma API que usa la aplicación.
 *
 *   npx supabase start && npm run test:registro
 *
 * Comprueba que al registrarse un entrenador independiente quedan creados, en
 * una sola transacción, su perfil, su tenant propio y su membresía; y que los
 * metadatos que manda el navegador no sirven para pedirse privilegios.
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function credencialesLocales() {
  try {
    const s = JSON.parse(
      execFileSync("npx", ["--yes", "supabase@latest", "status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
    return { url: s.API_URL, publishable: s.PUBLISHABLE_KEY, secret: s.SECRET_KEY };
  } catch {
    console.error("✗ No hay un Supabase local corriendo. Ejecuta: npx supabase start");
    process.exit(1);
  }
}

const { url: URL, publishable: PUBLISHABLE, secret: SECRET } = credencialesLocales();
if (URL.includes("supabase.co")) {
  console.error("✗ Solo contra el entorno local.");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const anon = () => createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(50)} ${real} (esperado ${esperado})`);
}

async function limpiar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@registro-test.local")) await admin.auth.admin.deleteUser(u.id);
  }
  await admin.from("tenants").delete().like("name", "%Prueba Registro%");
}

async function main() {
  await limpiar();

  console.log("\n=== Registro de entrenador independiente ===");

  const email = `nuevo@registro-test.local`;
  const { data: alta, error: eAlta } = await anon().auth.signUp({
    email,
    password: "unaclavelarga",
    options: { data: { full_name: "Prueba Registro Uno", tipo_registro: "independiente" } },
  });
  verificar("signUp sin error", eAlta?.message ?? "sin-error", "sin-error");

  const uid = alta.user.id;

  const { data: perfil } = await admin
    .from("users").select("full_name, email, is_super_admin, active_tenant_id").eq("id", uid).single();
  verificar("se creó el perfil", perfil?.full_name, "Prueba Registro Uno");
  verificar("NO es super_admin", perfil?.is_super_admin, false);
  verificar("tiene tenant activo", Boolean(perfil?.active_tenant_id), true);

  const { data: tenant } = await admin
    .from("tenants").select("name, type").eq("id", perfil.active_tenant_id).single();
  verificar("su tenant es de tipo solo", tenant?.type, "solo");
  verificar("y lleva su nombre", tenant?.name, "Prueba Registro Uno");

  const { data: membresias } = await admin.from("memberships").select("role").eq("user_id", uid);
  verificar("tiene una membresía", membresias?.length, 1);
  verificar("con rol trainer", membresias?.[0]?.role, "trainer");

  console.log("\n=== Los metadatos del navegador no dan privilegios ===");

  const { data: alta2 } = await anon().auth.signUp({
    email: "vivo@registro-test.local",
    password: "unaclavelarga",
    options: {
      data: {
        full_name: "Prueba Registro Dos",
        tipo_registro: "independiente",
        // Un atacante mandando esto en el registro:
        role: "super_admin",
        is_super_admin: true,
        tenant_id: "00000000-0000-0000-0000-000000000000",
      },
    },
  });

  const { data: perfil2 } = await admin
    .from("users").select("is_super_admin").eq("id", alta2.user.id).single();
  verificar("is_super_admin sigue en false", perfil2?.is_super_admin, false);

  const { data: mem2 } = await admin
    .from("memberships").select("role").eq("user_id", alta2.user.id);
  verificar("el rol sigue siendo trainer", mem2?.[0]?.role, "trainer");

  console.log("\n=== Login y aislamiento entre los dos registros ===");

  const cli = anon();
  const { error: eLogin } = await cli.auth.signInWithPassword({ email, password: "unaclavelarga" });
  verificar("inicia sesión", eLogin?.message ?? "sin-error", "sin-error");

  const { count: tenantsVisibles } = await cli
    .from("tenants").select("*", { count: "exact", head: true });
  verificar("solo ve su propio tenant", tenantsVisibles, 1);

  const { error: eMal } = await anon().auth.signInWithPassword({
    email, password: "contrasena-incorrecta",
  });
  verificar("contraseña incorrecta rechazada", eMal?.code, "invalid_credentials");

  console.log("\n=== Sin metadatos no se crea tenant (camino de invitación, 1.7) ===");

  const { data: invitado } = await admin.auth.admin.createUser({
    email: "invitado@registro-test.local", password: "unaclavelarga", email_confirm: true,
  });
  const { data: memInv } = await admin
    .from("memberships").select("role").eq("user_id", invitado.user.id);
  verificar("el invitado no recibe tenant propio", memInv?.length, 0);

  const { data: perfilInv } = await admin
    .from("users").select("email").eq("id", invitado.user.id).single();
  verificar("pero sí tiene perfil", perfilInv?.email, "invitado@registro-test.local");

  await limpiar();
  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
