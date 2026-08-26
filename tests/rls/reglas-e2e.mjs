/**
 * 3.5 — El editor de reglas, por la misma puerta que la aplicación.
 *
 *   npx supabase db reset && npm run test:reglas
 *
 * Aquí no se prueba el formulario: se prueba lo que hay DEBAJO, que es donde
 * está el riesgo. La matriz es el activo central del negocio (§3.1) y la única
 * barrera real es la RLS, así que hay que verla decir que no.
 *
 * Tres cosas que el editor da por hechas y que si fueran falsas lo romperían en
 * silencio:
 *
 *  1. Un super_admin puede insertar y activar. Si no, el botón guarda nada.
 *  2. Un entrenador NO puede, ni insertar ni activar. La pantalla no le aparece,
 *     pero eso es navegación, no seguridad: quien llame a la API directamente
 *     tiene que rebotar igual.
 *  3. `condition` y `actions` son inmutables. El editor está construido sobre
 *     esa promesa —por eso editar publica una versión nueva— y si el GRANT por
 *     columna desapareciera, la trazabilidad se volvería ficticia sin avisar.
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
  console.log(`  ${ok ? "OK  " : "FALLO"} ${nombre.padEnd(52)} ${real} (esperado ${esperado})`);
}

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

async function sesion(email) {
  const cli = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error } = await reintentar(async () => {
    const r = await cli.auth.signInWithPassword({ email, password: CLAVE });
    if (r.error && /timed out|timeout/i.test(r.error.message)) throw new Error(r.error.message);
    return r;
  });
  if (error) throw new Error(`no pudo entrar ${email}: ${error.message}`);
  return cli;
}

/** La misma regla que escribiría el editor. Clave irrepetible por ejecución. */
const CLAVE_REGLA = `e2e-editor-${Date.now()}`;
const regla = (version, extra = {}) => ({
  rule_key: CLAVE_REGLA,
  version,
  nivel: 1,
  condition: { todas: [{ hecho: "dorsiflexion_cm", op: "<", valor: 5 }] },
  actions: { excluir_ejercicios: ["Sentadilla Barra Baja"] },
  justification: "Regla de prueba del editor. Si la ves en producción, algo se coló.",
  evidence_level: "LEVEL_C_CONSENSUS",
  is_active: false,
  ...extra,
});

async function main() {
  const admin = await sesion("admin@gioslab.test");
  const entrenador = await sesion("diego@gioslab.test");

  console.log("\n=== El super_admin puede escribir la matriz ===");

  const alta = await admin.from("rules").insert(regla(1)).select("id").single();
  verificar("inserta la v1", alta.error ? `error:${alta.error.code}` : "ok", "ok");
  const idV1 = alta.data?.id;

  const activa = await admin.from("rules").update({ is_active: true }).eq("id", idV1);
  verificar("la activa", activa.error ? `error:${activa.error.code}` : "ok", "ok");

  console.log("\n=== Editar es publicar, no pisar ===");

  // El GRANT es `update (is_active)`: cualquier otra columna tiene que rebotar.
  // Es la promesa sobre la que está construido el editor entero.
  // Se exige el código exacto: `42501` es "sin privilegio", que es lo que
  // devuelve el GRANT por columna. Con un `error ? "rechazado"` genérico, un
  // fallo de red o una columna mal escrita también habrían dado por buena la
  // prueba sin que la inmutabilidad existiera.
  const pisar = await admin
    .from("rules")
    .update({ justification: "reescrita a mano" })
    .eq("id", idV1);
  verificar("no puede reescribir la justificación", pisar.error?.code ?? "PASÓ", "42501");

  const pisarCond = await admin
    .from("rules")
    .update({ condition: { todas: [] } })
    .eq("id", idV1);
  verificar("no puede reescribir la condición", pisarCond.error?.code ?? "PASÓ", "42501");

  // Dos versiones vivas de la misma regla harían que el motor aplicara dos
  // criterios contradictorios en la misma evaluación. Lo impide un índice único
  // parcial, y por eso el editor desactiva antes de insertar.
  const dosVivas = await admin.from("rules").insert(regla(2, { is_active: true }));
  verificar(
    "no admite dos versiones activas a la vez",
    dosVivas.error?.code === "23505" ? "rechazado" : `PASÓ (${dosVivas.error?.code ?? "sin error"})`,
    "rechazado",
  );

  // El orden que usa el editor: retirar la viva y luego publicar.
  await admin.from("rules").update({ is_active: false }).eq("rule_key", CLAVE_REGLA).eq("is_active", true);
  const v2 = await admin.from("rules").insert(regla(2, { is_active: true })).select("id").single();
  verificar("publica la v2 tras retirar la v1", v2.error ? `error:${v2.error.code}` : "ok", "ok");

  const historial = await admin
    .from("rules")
    .select("version, is_active")
    .eq("rule_key", CLAVE_REGLA)
    .order("version");
  verificar("la v1 sigue existiendo", historial.data?.length ?? 0, 2);
  verificar("y solo la v2 está activa", historial.data?.filter((r) => r.is_active).length ?? 0, 1);

  console.log("\n=== El entrenador no toca la matriz ===");

  // La pantalla no le aparece, pero eso es navegación. Esto es la barrera.
  const intento = await entrenador.from("rules").insert(regla(99));
  verificar("no puede insertar", intento.error ? "rechazado" : "PASÓ", "rechazado");

  // Contra la v2, que es la que ESTÁ ACTIVA. Probarlo contra la v1 —ya retirada
  // arriba— daba un falso positivo: "sigue desactivada" habría sido cierto
  // aunque el entrenador tuviera permiso de sobra.
  await entrenador.from("rules").update({ is_active: false }).eq("id", v2.data?.id);
  // RLS en UPDATE no da error cuando no hay filas escribibles: filtra en
  // silencio. Por eso se mide el EFECTO y no el código de error.
  const trasIntento = await admin.from("rules").select("is_active").eq("id", v2.data?.id).single();
  verificar("no puede desactivar la que está viva", trasIntento.data?.is_active, true);

  console.log("\n=== Todos los roles LEEN la matriz ===");
  // El entrenador tiene que poder ver qué regla se le aplicó a su atleta (§3.6).
  const lee = await entrenador.from("rules").select("rule_key").eq("rule_key", CLAVE_REGLA);
  verificar("el entrenador la lee", lee.data?.length ?? 0, 2);

  // Limpieza: esto corre contra la base local, pero dejar basura hace que la
  // siguiente pasada mienta en los conteos.
  await admin.from("rules").update({ is_active: false }).eq("rule_key", CLAVE_REGLA);

  console.log(
    fallos === 0 ? "\n✓ Todas las comprobaciones pasaron.\n" : `\n✗ ${fallos} fallo(s).\n`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n✗ Error: ${e.message}\n`);
  process.exit(1);
});
