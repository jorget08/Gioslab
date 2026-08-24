import { z } from "zod";

import { ESTADOS_LESION, NIVELES, OBJETIVOS, SEXOS } from "@/domain/catalogos";

/**
 * Validación del paso 1 del wizard (docs/WIZARD-UX.md §4).
 *
 * Los mensajes explican QUÉ falta y POR QUÉ se necesita. "Campo obligatorio"
 * no le dice nada a alguien de pie en un gimnasio con el atleta esperando.
 */

const HOY = () => new Date();

export const lesionSchema = z.object({
  zona: z.string().trim().min(1, "Indica la zona del cuerpo").max(80),
  descripcion: z.string().trim().max(300).optional(),
  fecha: z.string().optional(),
  estado: z.enum(ESTADOS_LESION),
});

export const atletaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del atleta")
    .max(120, "Máximo 120 caracteres"),

  // Fecha y no edad: la edad entra en la fórmula de densidad corporal, y un
  // número guardado envejecería mal (docs/WIZARD-UX.md §4).
  fechaNacimiento: z
    .string()
    .min(1, "Falta la fecha de nacimiento. La necesitamos para calcular el porcentaje graso.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Esa fecha no es válida")
    .refine((v) => new Date(v) < HOY(), "La fecha de nacimiento no puede estar en el futuro")
    .refine(
      (v) => new Date(v) > new Date("1900-01-01"),
      "Revisa el año: esa fecha es demasiado antigua",
    ),

  sexo: z.enum(SEXOS, { message: "Elige el sexo biológico: cambia la fórmula del cálculo" }),

  // Un <select> con la opción "Sin definir" devuelve "", no undefined, y el enum
  // lo rechazaría: el formulario fallaría justo al no elegir nada, que es el
  // caso normal en un campo opcional.
  //
  // Se resuelve con una unión y no con z.preprocess porque preprocess borra el
  // tipo de entrada (queda en `unknown`) y eso rompe el tipado de la llamada a
  // la base. Así entra `"" | opción | undefined` y sale `opción | undefined`.
  objetivo: z
    .union([z.enum(OBJETIVOS), z.literal("")])
    .optional()
    .transform((v) => v || undefined),
  nivel: z
    .union([z.enum(NIVELES), z.literal("")])
    .optional()
    .transform((v) => v || undefined),

  /** Objetivos jerarquizados: el ORDEN es la prioridad. */
  objetivos: z.array(z.string().trim().min(1).max(160)).max(5).default([]),

  lesiones: z.array(lesionSchema).max(20).default([]),

  notas: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || undefined),

  // Sin esto no se puede guardar. Es el requisito de la Ley 1581, no una
  // preferencia de producto.
  consienteSalud: z
    .boolean()
    .refine((v) => v === true, "Sin la autorización de datos no podemos guardar la evaluación"),

  /** Autorización separada para el ciclo menstrual. Opcional de verdad. */
  consienteCiclo: z.boolean().default(false),
});

export type AtletaInput = z.input<typeof atletaSchema>;
export type AtletaDatos = z.output<typeof atletaSchema>;
export type LesionInput = z.infer<typeof lesionSchema>;

/**
 * ¿Se le puede preguntar por el ciclo menstrual?
 *
 * Solo si el sexo es femenino. Si se cambia a masculino después de haber
 * marcado la casilla, la autorización deja de aplicar y hay que descartarla:
 * arrastrar un consentimiento que ya no corresponde es exactamente lo que la
 * ley no perdona.
 */
export function aplicaModuloCiclo(sexo: string | undefined): boolean {
  return sexo === "femenino";
}

/** Traduce los errores de Postgres al guardar un atleta. */
export function mensajeDeErrorAtleta(codigo: string | undefined, fallback: string): string {
  switch (codigo) {
    // Código propio de crear_atleta. NO es lo mismo que 42501: aquí el permiso
    // está bien y lo que falta es pertenecer a un espacio de trabajo, que lo
    // arregla otra persona invitándote. Decir "no tienes permiso" mandaba a
    // buscar el problema al sitio equivocado.
    case "GL001":
      return "Tu cuenta todavía no pertenece a ningún espacio de trabajo, así que no hay dónde guardar el atleta.";
    case "42501":
      return "No tienes permiso para crear atletas en este espacio de trabajo";
    case "23514":
      return "Alguno de los datos está fuera de rango. Revisa la fecha de nacimiento.";
    case "23505":
      return "Ya existe un atleta con esos datos";
    case "PGRST301":
      return "Tu sesión caducó. Vuelve a entrar.";
    default:
      return fallback;
  }
}
