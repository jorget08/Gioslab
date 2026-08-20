import { redirect } from "next/navigation";
import { cache } from "react";

import { puedeAcceder, type Rol } from "@/domain/autorizacion";
import { createClient } from "@/lib/supabase/server";

/**
 * Contexto de sesión para el servidor.
 *
 * Es la única fuente de "quién es y qué puede" en Server Components y Server
 * Actions. RLS sigue siendo la barrera real —un rol equivocado no ve datos
 * aunque llegue a la página—, pero enseñarle una pantalla que no le corresponde
 * y que aparezca vacía es una mala experiencia y filtra la estructura del
 * producto.
 */

export interface Membresia {
  tenantId: string;
  rol: Rol;
  nombreTenant: string;
  tipoTenant: "gym" | "solo";
}

export interface ContextoSesion {
  userId: string;
  email: string;
  nombre: string | null;
  esSuperAdmin: boolean;
  /** Rol en el tenant ACTIVO. `null` si todavía no pertenece a ninguno. */
  rol: Rol | null;
  tenantActivo: string | null;
  membresias: Membresia[];
}

/**
 * `cache` de React deduplica esta consulta dentro de un mismo render: el layout,
 * la página y sus hijos la piden y solo se ejecuta una vez por petición.
 */
export const obtenerContexto = cache(async (): Promise<ContextoSesion | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("users")
    .select("email, full_name, is_super_admin, active_tenant_id")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  const { data: filas } = await supabase
    .from("memberships")
    .select("tenant_id, role, tenants(name, type)")
    .eq("user_id", user.id);

  const membresias: Membresia[] = (filas ?? []).map((m) => ({
    tenantId: m.tenant_id,
    rol: m.role as Rol,
    nombreTenant: m.tenants?.name ?? "Sin nombre",
    tipoTenant: (m.tenants?.type ?? "solo") as "gym" | "solo",
  }));

  const rolEnTenantActivo =
    membresias.find((m) => m.tenantId === perfil.active_tenant_id)?.rol ?? null;

  return {
    userId: user.id,
    email: perfil.email,
    nombre: perfil.full_name,
    esSuperAdmin: perfil.is_super_admin,
    // super_admin es de plataforma: manda sobre el rol del tenant activo.
    rol: perfil.is_super_admin ? "super_admin" : rolEnTenantActivo,
    tenantActivo: perfil.active_tenant_id,
    membresias,
  };
});

/** Exige sesión. Sin ella, a /login. */
export async function requerirSesion(): Promise<ContextoSesion> {
  const ctx = await obtenerContexto();
  if (!ctx) redirect("/login");
  return ctx;
}

/**
 * Exige uno de los roles indicados. Se enumera POSITIVAMENTE (ver §1.4): un rol
 * que no esté en la lista queda fuera, y sin rol tampoco se pasa.
 */
export async function requerirRol(roles: readonly Rol[]): Promise<ContextoSesion> {
  const ctx = await requerirSesion();
  if (!ctx.rol || !roles.includes(ctx.rol)) redirect("/sin-permiso");
  return ctx;
}

/** Exige permiso para una ruta concreta, según el mapa de `domain/autorizacion`. */
export async function requerirAcceso(pathname: string): Promise<ContextoSesion> {
  const ctx = await requerirSesion();
  if (!puedeAcceder(ctx.rol, pathname)) redirect("/sin-permiso");
  return ctx;
}
