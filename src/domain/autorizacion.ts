/**
 * Qué rol puede entrar a qué ruta.
 *
 * Lógica pura, sin React ni Supabase, para poder probarla exhaustivamente. Es el
 * mismo mapa que consultan el proxy y los layouts del servidor.
 *
 * REGLA APRENDIDA EN LA 1.4: aquí se enumera POSITIVAMENTE quién puede entrar.
 * Nada de "todos menos X". Una condición negativa deja pasar a cualquier rol que
 * se añada después, y en Fase B habrá más.
 */

export type Rol = "super_admin" | "gym" | "trainer" | "client";

/** Rutas accesibles sin sesión iniciada. */
export const RUTAS_PUBLICAS = [
  "/login",
  "/registro",
  "/recuperar",
  "/nueva-contrasena",
  "/auth",
  // El invitado tiene que poder ver a qué le invitan antes de tener cuenta.
  "/invitacion",
] as const;

/**
 * Prefijo de ruta → roles admitidos.
 *
 * El orden importa: se elige la coincidencia MÁS LARGA, para que `/admin/reglas`
 * no herede los permisos de `/`.
 */
const PERMISOS: ReadonlyArray<readonly [string, readonly Rol[]]> = [
  ["/admin", ["super_admin"]],
  // Leer la biblioteca y editarla son cosas distintas: el entrenador necesita
  // saber qué ejercicios existen, pero la metodología la cura Giovanni
  // (MODELO-DATOS §1.2). Es la misma frontera que aplica RLS.
  ["/biblioteca", ["super_admin", "gym", "trainer"]],
  ["/biblioteca/ejercicio", ["super_admin"]],
  ["/atletas", ["super_admin", "gym", "trainer"]],
  ["/equipo", ["super_admin", "gym", "trainer"]],
  ["/mi-rutina", ["client"]],
  // El cliente NO tiene sitio en "/": su casa es /mi-rutina. Dejarlo aquí hacía
  // que aterrizara en el panel del entrenador y se quedara ahí.
  ["/", ["super_admin", "gym", "trainer"]],
] as const;

export function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Roles admitidos en una ruta, o `null` si no hay regla que la cubra. */
export function rolesPermitidos(pathname: string): readonly Rol[] | null {
  let mejor: { largo: number; roles: readonly Rol[] } | null = null;

  for (const [prefijo, roles] of PERMISOS) {
    const coincide = prefijo === "/" ? true : pathname === prefijo || pathname.startsWith(`${prefijo}/`);
    if (coincide && (mejor === null || prefijo.length > mejor.largo)) {
      mejor = { largo: prefijo.length, roles };
    }
  }

  return mejor?.roles ?? null;
}

/**
 * ¿Puede este rol entrar aquí?
 *
 * Falla CERRADO en los tres casos dudosos: sin rol, con un rol desconocido, o en
 * una ruta que ningún permiso cubre. Una ruta nueva que alguien olvide registrar
 * queda bloqueada, no abierta.
 */
export function puedeAcceder(rol: Rol | null | undefined, pathname: string): boolean {
  if (esRutaPublica(pathname)) return true;
  if (!rol) return false;

  const permitidos = rolesPermitidos(pathname);
  if (permitidos === null) return false;

  return permitidos.includes(rol);
}

/** A dónde mandar a cada rol tras iniciar sesión. */
export function rutaInicial(rol: Rol | null | undefined): string {
  return rol === "client" ? "/mi-rutina" : "/";
}

/**
 * Valida un destino de redirección.
 *
 * Solo rutas internas: aceptar una URL completa convertiría el login en un
 * redirector abierto, útil para phishing. Se rechaza también `//host`, que el
 * navegador interpreta como dominio externo.
 */
export function destinoSeguro(pedido: string | null | undefined, porDefecto = "/"): string {
  if (!pedido) return porDefecto;
  if (!pedido.startsWith("/")) return porDefecto;
  if (pedido.startsWith("//")) return porDefecto;
  if (pedido.includes("\\")) return porDefecto;
  return pedido;
}
