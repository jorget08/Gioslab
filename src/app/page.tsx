import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

/**
 * Provisional. La 1.8 construye el shell de la aplicación y esta pantalla se
 * reemplaza por el panel real. Por ahora solo demuestra que la sesión, el
 * perfil y la membresía quedaron bien enlazados tras el registro.
 */
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El proxy ya redirige a /login, pero un Server Component no debe confiar en
  // eso: si mañana cambia el matcher, esta página quedaría abierta.
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("users")
    .select("full_name, email, active_tenant_id")
    .eq("id", user.id)
    .single();

  const { data: membresias } = await supabase
    .from("memberships")
    .select("role, tenants(name, type)")
    .eq("user_id", user.id);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {perfil?.full_name ?? perfil?.email}
        </h1>
        <p className="text-sm text-muted-foreground">Sesión iniciada correctamente.</p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Tus espacios de trabajo</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {membresias?.map((m, i) => (
            <li key={i}>
              {m.tenants?.name}{" "}
              <span className="text-xs">
                ({m.tenants?.type === "gym" ? "gimnasio" : "individual"} · {m.role})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <form action="/auth/salir" method="post">
        <Button type="submit" variant="outline" className="min-h-11 w-full">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}
