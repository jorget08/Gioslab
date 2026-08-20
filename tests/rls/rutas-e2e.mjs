/**
 * 1.6 — Protección de rutas por rol, contra el servidor real.
 *
 *   npx supabase start
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run dev
 *   npm run test:rutas
 *
 * Los tests unitarios de `domain/autorizacion` prueban el mapa de permisos. Esto
 * prueba lo otro: que el servidor de verdad lo aplica. Inicia sesión con un
 * usuario por rol, guarda sus cookies y pide cada ruta.
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const APP = process.env.APP_URL ?? "http://localhost:3100";

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
const admin = createClient(URL_SB, SECRET, { auth: { persistSession: false } });

const PASS = "unaclavelarga";
const T_GYM = "10000000-0000-0000-0000-0000000000c1";
const T_SOLO = "10000000-0000-0000-0000-0000000000c2";

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(46)} ${real} (esperado ${esperado})`);
}

async function limpiar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@rutas-test.local")) await admin.auth.admin.deleteUser(u.id);
  }
  await admin.from("memberships").delete().in("tenant_id", [T_GYM, T_SOLO]);
  await admin.from("tenants").delete().in("id", [T_GYM, T_SOLO]);
}

async function crear(email, membresias, superAdmin = false) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASS, email_confirm: true,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  if (superAdmin) await admin.from("users").update({ is_super_admin: true }).eq("id", data.user.id);
  for (const [tenant_id, role] of membresias) {
    await admin.from("memberships").insert({ user_id: data.user.id, tenant_id, role });
  }
  return data.user.id;
}

/** Inicia sesión y devuelve la cabecera Cookie que usaría el navegador. */
async function cookiesDe(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { data, error } = await cli.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`login ${email}: ${error.message}`);

  // El cliente de Supabase para navegador guarda la sesión en una cookie con
  // este nombre; se replica a mano para hablar con el servidor de Next.
  const ref = new globalThis.URL(URL_SB).hostname.split(".")[0] || "localhost";
  const valor = encodeURIComponent(JSON.stringify(data.session));
  return `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}; sb-localhost-auth-token=${valor}`;
}

async function pedir(ruta, cookie) {
  const r = await fetch(`${APP}${ruta}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const destino = r.headers.get("location");
  return { status: r.status, destino: destino ? new globalThis.URL(destino, APP).pathname : null };
}

async function main() {
  try {
    await fetch(`${APP}/login`, { redirect: "manual" });
  } catch {
    console.error(`✗ No hay app en ${APP}. Levántala con PORT=3100 npm run dev`);
    process.exit(1);
  }

  await limpiar();
  await admin.from("tenants").insert([
    { id: T_GYM, type: "gym", name: "Gimnasio Rutas" },
    { id: T_SOLO, type: "solo", name: "Solo Rutas" },
  ]);

  await crear("super@rutas-test.local", [], true);
  await crear("gym@rutas-test.local", [[T_GYM, "gym"]]);
  await crear("trainer@rutas-test.local", [[T_GYM, "trainer"]]);
  await crear("client@rutas-test.local", [[T_GYM, "client"]]);

  console.log("\n=== Sin sesión: todo lo privado manda a /login ===");
  for (const ruta of ["/", "/atletas", "/admin", "/mi-rutina"]) {
    const { destino } = await pedir(ruta, null);
    verificar(`${ruta} redirige`, destino, "/login");
  }
  verificar("/login sigue accesible", (await pedir("/login", null)).status, 200);

  const casos = [
    ["super@rutas-test.local", "super_admin", { "/": 200, "/atletas": 200, "/admin": 200, "/mi-rutina": "/sin-permiso" }],
    ["gym@rutas-test.local", "gym", { "/": 200, "/atletas": 200, "/admin": "/sin-permiso", "/mi-rutina": "/sin-permiso" }],
    ["trainer@rutas-test.local", "trainer", { "/": 200, "/atletas": 200, "/admin": "/sin-permiso", "/mi-rutina": "/sin-permiso" }],
    ["client@rutas-test.local", "client", { "/": "/mi-rutina", "/atletas": "/sin-permiso", "/admin": "/sin-permiso", "/mi-rutina": 200 }],
  ];

  for (const [email, rol, esperados] of casos) {
    console.log(`\n=== Rol ${rol} ===`);
    const cookie = await cookiesDe(email);
    for (const [ruta, esperado] of Object.entries(esperados)) {
      const { status, destino } = await pedir(ruta, cookie);
      const real = typeof esperado === "number" ? status : destino;
      verificar(`${ruta}`, real, esperado);
    }
  }

  await limpiar();
  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
