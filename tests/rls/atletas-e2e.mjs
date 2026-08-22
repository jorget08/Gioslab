/**
 * 2.2 — Alta de atleta, de extremo a extremo.
 *
 *   npx supabase db reset && npm run test:atletas
 *
 * Lo que más importa aquí no es que el alta funcione, sino que NO pueda quedar
 * un atleta guardado sin consentimiento: bajo la Ley 1581 ese registro no
 * debería existir.
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
const admin = createClient(URL_SB, SECRET, { auth: { persistSession: false } });
const CLAVE = "clave-de-prueba";

let fallos = 0;
function verificar(nombre, real, esperado) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(52)} ${real} (esperado ${esperado})`);
}

async function sesion(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error } = await conReintento(() =>
    cli.auth.signInWithPassword({ email, password: CLAVE }),
  );
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return cli;
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
  await admin.from("athletes").delete().like("full_name", "[e2e]%");
}

async function main() {
  await limpiar();
  const ana = await sesion("ana@gioslab.test");

  console.log("\n=== Alta completa ===");
  const { data: id, error } = await ana.rpc("crear_atleta", {
    p_nombre: "[e2e] Camila Ruiz",
    p_fecha_nacimiento: "1998-03-22",
    p_sexo: "femenino",
    p_objetivo: "Pérdida de Grasa",
    p_nivel: "Principiante",
    p_objetivos: ["Volver a correr sin dolor", "Bajar 5 kg"],
    p_version_politica: "v1",
    p_consiente_ciclo: true,
    p_lesiones: [
      { zona: "Rodilla", descripcion: "Condromalacia derecha", estado: "cronica" },
    ],
  });
  verificar("se crea sin error", error?.message ?? "sin-error", "sin-error");

  const { data: a } = await admin
    .from("athletes").select("full_name, sex, training_goal, goals, trainer_id, tenant_id")
    .eq("id", id).single();
  verificar("guarda el nombre", a?.full_name, "[e2e] Camila Ruiz");
  verificar("guarda el objetivo del catálogo", a?.training_goal, "Pérdida de Grasa");
  verificar("conserva el ORDEN de los objetivos", a?.goals?.[0], "Volver a correr sin dolor");

  const { data: cons } = await admin
    .from("athlete_consents").select("policy_version").eq("athlete_id", id);
  const versiones = (cons ?? []).map((c) => c.policy_version).sort();
  verificar("registra 2 consentimientos separados", versiones.length, 2);
  verificar("uno de salud", versiones.includes("salud-v1"), true);
  verificar("y uno de ciclo, aparte", versiones.includes("ciclo-v1"), true);

  const { data: les } = await admin
    .from("athlete_injuries").select("body_region, status, tenant_id").eq("athlete_id", id);
  verificar("guarda la lesión con una zona del catálogo", les?.[0]?.body_region, "Rodilla");
  // El lado del que ya no se puede escapar: la base rechaza cualquier zona
  // fuera del catálogo, y de eso depende que el motor pueda cruzar la lesión
  // contra las contraindicaciones del ejercicio.
  const { error: eZona } = await admin.from("athlete_injuries").insert({
    athlete_id: id, tenant_id: a?.tenant_id, body_region: "manguito rotador",
  });
  verificar("rechaza una zona fuera del catálogo", eZona?.code, "23514");
  verificar("el trigger le puso el tenant", les?.[0]?.tenant_id, a?.tenant_id);

  console.log("\n=== Sin autorización de ciclo NO se registra la segunda ===");
  const { data: id2 } = await ana.rpc("crear_atleta", {
    p_nombre: "[e2e] Sin ciclo",
    p_fecha_nacimiento: "1990-01-01",
    p_sexo: "femenino",
    p_consiente_ciclo: false,
  });
  const { data: cons2 } = await admin
    .from("athlete_consents").select("policy_version").eq("athlete_id", id2);
  verificar("solo el de salud", cons2?.length, 1);
  verificar("y no el de ciclo", cons2?.[0]?.policy_version, "salud-v1");

  console.log("\n=== Atomicidad: si algo falla, NO queda atleta a medias ===");
  const antes = (await admin.from("athletes").select("id", { count: "exact", head: true })).count;
  // Una fecha imposible hace fallar el CHECK de la tabla a mitad de la
  // transacción. El atleta no debe quedar guardado.
  const { error: eMal } = await ana.rpc("crear_atleta", {
    p_nombre: "[e2e] Nunca debe existir",
    p_fecha_nacimiento: "1850-01-01",
    p_sexo: "femenino",
  });
  verificar("la operación falla", Boolean(eMal), true);
  const despues = (await admin.from("athletes").select("id", { count: "exact", head: true })).count;
  verificar("no se creó ningún atleta", despues, antes);

  console.log("\n=== El atleta queda en el tenant y entrenador correctos ===");
  verificar("a nombre de quien lo creó", Boolean(a?.trainer_id), true);

  const diego = await sesion("diego@gioslab.test");
  const { data: veDiego } = await diego
    .from("athletes").select("id").eq("id", id);
  // Diego está en el mismo gimnasio pero el atleta es de Ana.
  verificar("otro entrenador del gimnasio NO lo ve", veDiego?.length, 0);

  console.log("\n=== La vista de listado trae la última evaluación ===");
  const { data: lista } = await ana
    .from("athletes_listado").select("full_name, ultima_evaluacion")
    .eq("full_name", "María Fernanda Gómez").single();
  verificar("María Fernanda tiene fecha", Boolean(lista?.ultima_evaluacion), true);

  const { data: nueva } = await ana
    .from("athletes_listado").select("ultima_evaluacion").eq("id", id).single();
  verificar("la recién creada no tiene", nueva?.ultima_evaluacion, null);

  console.log("\n=== Un anónimo no puede crear atletas ===");
  const anon = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error: eAnon } = await anon.rpc("crear_atleta", {
    p_nombre: "[e2e] Intruso", p_fecha_nacimiento: "1990-01-01", p_sexo: "masculino",
  });
  verificar("rechazado", Boolean(eAnon), true);

  await limpiar();
  console.log(fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
