import { z } from "zod";

/** Roles que se pueden repartir por invitación. `super_admin` nunca. */
export const rolInvitable = z.enum(["gym", "trainer", "client"]);

export const invitacionSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Escribe el correo de quien invitas")
    .pipe(z.email("Ese correo no parece válido")),
  rol: rolInvitable,
});

export type InvitacionInput = z.infer<typeof invitacionSchema>;

/**
 * Qué roles puede repartir cada quien. Es el espejo de la comprobación que hace
 * `crear_invitacion()` en Postgres, para no ofrecer en pantalla opciones que la
 * base va a rechazar.
 *
 * La autoridad es la base, no esto: aquí solo se dibuja el formulario.
 */
export function rolesQuePuedeInvitar(rol: string | null | undefined) {
  if (rol === "super_admin") return ["gym", "trainer", "client"] as const;
  if (rol === "gym") return ["trainer", "client"] as const;
  if (rol === "trainer") return ["client"] as const;
  return [] as const;
}

export const ETIQUETA_ROL: Record<string, string> = {
  gym: "Administrador de gimnasio",
  trainer: "Entrenador",
  client: "Cliente / atleta",
};
