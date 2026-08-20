import { requerirRol } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";

/**
 * Listado de atletas. Provisional: el CRUD real es del grupo 2.
 *
 * La guarda de rol se declara aquí, en la sección, no en el layout: cada área
 * decide quién entra. Detrás, RLS filtra las filas aunque alguien llegue.
 */
export default async function AtletasPage() {
  await requerirRol(["super_admin", "gym", "trainer"]);

  const supabase = await createClient();
  const { data: atletas } = await supabase
    .from("athletes")
    .select("id, full_name, birth_date, sex")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Atletas</h1>

      {!atletas?.length ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Todavía no hay atletas en este espacio de trabajo.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {atletas.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center px-4 py-3 text-sm">
              {a.full_name}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Se muestran solo los atletas de tu espacio activo. El entrenador ve los suyos; el
        gimnasio, los de toda su sede.
      </p>
    </div>
  );
}
