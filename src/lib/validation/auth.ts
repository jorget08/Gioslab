import { z } from "zod";

/**
 * Esquemas de los formularios de autenticación.
 *
 * Los mensajes están en español y redactados para que el entrenador entienda qué
 * corregir, no para describir la regla técnica. Se validan en el cliente para dar
 * respuesta inmediata, pero quien manda es Supabase: estas reglas son comodidad,
 * no seguridad.
 */

/**
 * El orden importa: primero se normaliza y después se valida.
 * Al revés, "  Gio@GiosLab.co  " se rechaza por formato inválido antes de que
 * nadie le quite los espacios — y el usuario no ve nada raro en lo que escribió.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escribe tu correo")
  .pipe(z.email("Ese correo no parece válido"));

/**
 * Mínimo 8 caracteres. Supabase rechaza menos de 6 por defecto; subimos a 8
 * porque esto da acceso a historiales clínicos. No exigimos símbolos ni
 * mayúsculas: las reglas de composición empujan a la gente a "Password1!" y a
 * apuntarla en un papel, que es peor que una frase larga.
 */
const password = z.string().min(8, "Mínimo 8 caracteres");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const registroSchema = z
  .object({
    // Mismo motivo que el correo: recortar antes de medir, o un nombre de solo
    // espacios pasaría el mínimo y llegaría vacío a la base.
    fullName: z
      .string()
      .trim()
      .min(1, "Escribe tu nombre")
      .max(120, "Máximo 120 caracteres"),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const recuperarSchema = z.object({ email });

export const nuevaPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type RecuperarInput = z.infer<typeof recuperarSchema>;
export type NuevaPasswordInput = z.infer<typeof nuevaPasswordSchema>;

/**
 * Traduce los errores de Supabase Auth, que llegan en inglés y con jerga.
 *
 * Importante: ante credenciales incorrectas NO se revela si el correo existe.
 * Decir "ese correo no está registrado" permite averiguar quién tiene cuenta,
 * y aquí eso significa averiguar quién es cliente de un gimnasio.
 */
export function mensajeDeError(codigo: string | undefined, fallback: string): string {
  switch (codigo) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos";
    case "email_not_confirmed":
      return "Todavía no has confirmado tu correo. Revisa tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo";
    case "weak_password":
      return "Esa contraseña es demasiado débil";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un minuto y vuelve a probar.";
    case "same_password":
      return "La contraseña nueva debe ser distinta de la anterior";
    default:
      return fallback;
  }
}
