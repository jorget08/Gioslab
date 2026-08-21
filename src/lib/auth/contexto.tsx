"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Rol } from "@/domain/autorizacion";
import { limpiarBorradores } from "@/lib/borradores";
import { createClient } from "@/lib/supabase/client";

/**
 * Sesión del lado del cliente.
 *
 * Toda la lectura de datos ocurre en el navegador con supabase-js, y quien
 * decide qué se ve es Row Level Security. No hay Server Components ni Server
 * Actions: el paquete que Capacitor mete en la app nativa es estático y no
 * puede ejecutar código de servidor (ver docs/ARQUITECTURA.md).
 *
 * Esto NO debilita la seguridad. Las 34 políticas de RLS se aplican igual venga
 * la consulta de donde venga; lo que se pierde es poder ocultar la existencia de
 * una pantalla, no el acceso a los datos.
 */

export interface Membresia {
  tenantId: string;
  rol: Rol;
  nombreTenant: string;
  tipoTenant: "gym" | "solo";
}

export interface Sesion {
  userId: string;
  email: string;
  nombre: string | null;
  esSuperAdmin: boolean;
  /** Rol en el tenant ACTIVO. `null` si aún no pertenece a ninguno. */
  rol: Rol | null;
  tenantActivo: string | null;
  membresias: Membresia[];
}

interface Contexto {
  sesion: Sesion | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
  cambiarTenant: (tenantId: string) => Promise<void>;
  salir: () => Promise<void>;
}

const SesionContext = createContext<Contexto | null>(null);

async function leerSesion(): Promise<Sesion | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: filas }] = await Promise.all([
    supabase
      .from("users")
      .select("email, full_name, is_super_admin, active_tenant_id")
      .eq("id", user.id)
      .single(),
    supabase.from("memberships").select("tenant_id, role, tenants(name, type)").eq("user_id", user.id),
  ]);

  if (!perfil) return null;

  const membresias: Membresia[] = (filas ?? []).map((m) => ({
    tenantId: m.tenant_id,
    rol: m.role as Rol,
    nombreTenant: m.tenants?.name ?? "Sin nombre",
    tipoTenant: (m.tenants?.type ?? "solo") as "gym" | "solo",
  }));

  const rolActivo = membresias.find((m) => m.tenantId === perfil.active_tenant_id)?.rol ?? null;

  return {
    userId: user.id,
    email: perfil.email,
    nombre: perfil.full_name,
    esSuperAdmin: perfil.is_super_admin,
    // super_admin es de plataforma: manda sobre el rol del tenant activo.
    rol: perfil.is_super_admin ? "super_admin" : rolActivo,
    tenantActivo: perfil.active_tenant_id,
    membresias,
  };
}

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    setSesion(await leerSesion());
  }, []);

  useEffect(() => {
    let vivo = true;

    // La carga inicial cubre además el aterrizaje desde un correo: el cliente
    // canjea el `code` de la URL automáticamente antes de resolver getUser().
    leerSesion().then((s) => {
      if (!vivo) return;
      setSesion(s);
      setCargando(false);
    });

    // Mantiene la sesión al día si caduca, se refresca o el usuario sale en otra
    // pestaña. Sin esto, la app seguiría mostrando datos de una sesión muerta.
    const { data } = createClient().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        limpiarBorradores();
        setSesion(null);
        return;
      }
      if (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED" || evento === "USER_UPDATED") {
        leerSesion().then((s) => vivo && setSesion(s));
      }
    });

    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const cambiarTenant = useCallback(
    async (tenantId: string) => {
      // La pertenencia la valida cambiar_tenant() en Postgres, que es
      // `security definer`. Aunque este código corra en el navegador y alguien
      // lo manipule, no puede saltar a un tenant ajeno.
      const { error } = await createClient().rpc("cambiar_tenant", { nuevo_tenant: tenantId });
      if (error) {
        console.error("[cambiarTenant]", error.code, error.message);
        return;
      }
      await refrescar();
    },
    [refrescar],
  );

  const salir = useCallback(async () => {
    await createClient().auth.signOut();
    // Sin esto, en el móvil compartido del gimnasio quedarían las evaluaciones a
    // medias del entrenador anterior —con sus pliegues y su peso— esperando a
    // que las abra cualquiera.
    limpiarBorradores();
    setSesion(null);
  }, []);

  const valor = useMemo<Contexto>(
    () => ({ sesion, cargando, refrescar, cambiarTenant, salir }),
    [sesion, cargando, refrescar, cambiarTenant, salir],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Contexto {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <ProveedorSesion>");
  return ctx;
}
