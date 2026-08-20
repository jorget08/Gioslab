"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requerirSesion } from "@/lib/auth/sesion";

/**
 * Cambia el tenant activo del usuario.
 *
 * No valida aquí la pertenencia a propósito: lo hace `cambiar_tenant()` en la
 * base, que es `security definer` y comprueba la membresía. Aunque alguien
 * falsifique el formulario con el id de un gimnasio ajeno, Postgres lo rechaza.
 * La comprobación vive donde no se puede rodear.
 */
export async function cambiarTenant(formData: FormData) {
  await requerirSesion();

  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_tenant", { nuevo_tenant: tenantId });

  if (error) {
    // 42501 = no pertenece a ese tenant. No se detalla al cliente.
    console.error("[cambiarTenant]", error.code, error.message);
    return;
  }

  // El rol y los datos visibles dependen del tenant activo: hay que rehacer
  // todo el árbol, no solo la página actual.
  revalidatePath("/", "layout");
}
