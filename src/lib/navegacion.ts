import { Dumbbell, Home, Settings, UserPlus, Users } from "lucide-react";

import type { Rol } from "@/domain/autorizacion";

/**
 * Navegación principal.
 *
 * Los `roles` de cada entrada deben coincidir con el mapa de permisos de
 * `domain/autorizacion`. Hay un test que lo comprueba: si alguien añade una
 * sección al menú y olvida registrarla en los permisos —o al revés— falla.
 * Un menú que ofrece puertas cerradas es de las cosas que más desconciertan.
 *
 * El orden importa: en móvil son las pestañas de la barra inferior, y la más
 * usada debe quedar donde llega el pulgar.
 */
export interface EntradaNav {
  href: string;
  etiqueta: string;
  /** Versión corta para la barra inferior, donde no cabe todo. */
  corta: string;
  icono: typeof Home;
  roles: readonly Rol[];
}

export const NAVEGACION: readonly EntradaNav[] = [
  {
    href: "/",
    etiqueta: "Inicio",
    corta: "Inicio",
    icono: Home,
    roles: ["super_admin", "gym", "trainer"],
  },
  {
    href: "/atletas",
    etiqueta: "Atletas",
    corta: "Atletas",
    icono: Users,
    roles: ["super_admin", "gym", "trainer"],
  },
  {
    href: "/equipo",
    etiqueta: "Equipo",
    corta: "Equipo",
    icono: UserPlus,
    roles: ["super_admin", "gym", "trainer"],
  },
  {
    href: "/mi-rutina",
    etiqueta: "Mi rutina",
    corta: "Rutina",
    icono: Dumbbell,
    roles: ["client"],
  },
  {
    href: "/admin",
    etiqueta: "Administración",
    corta: "Admin",
    icono: Settings,
    roles: ["super_admin"],
  },
] as const;

/** Entradas visibles para un rol. Sin rol no se muestra ninguna. */
export function navegacionDe(rol: Rol | null | undefined): EntradaNav[] {
  if (!rol) return [];
  return NAVEGACION.filter((n) => n.roles.includes(rol));
}

/**
 * ¿Está activa esta entrada?
 *
 * "/" solo coincide exactamente; si no, quedaría marcada en todas las
 * pantallas por ser prefijo de cualquier ruta.
 */
export function estaActiva(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
