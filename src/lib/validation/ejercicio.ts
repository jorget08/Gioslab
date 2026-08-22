import { z } from "zod";

import { CONTRAINDICACIONES } from "@/domain/ejercicios";
import { PATRONES } from "@/domain/patrones";

/**
 * Validación del formulario de ejercicio (tarea 4.1).
 *
 * Solo el nombre es obligatorio, y es deliberado: Giovanni va a cargar la
 * biblioteca en varias sesiones, y obligarle a completar los siete campos para
 * poder guardar uno haría que abandonara a la mitad. Lo que falta se ve después
 * en el listado, agrupado, que es donde se decide qué completar.
 *
 * El patrón es el único campo con catálogo cerrado. Los otros tres textos
 * —músculo, equipo, tipo biomecánico— siguen abiertos porque él no los ha
 * fijado; la interfaz sugiere lo ya escrito en vez de inventarles un enum.
 */
export const ejercicioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del ejercicio")
    .max(120, "Máximo 120 caracteres"),

  descripcion: z
    .string()
    .trim()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .transform((v) => v || undefined),

  musculo: z.string().trim().max(80).optional().transform((v) => v || undefined),
  equipo: z.string().trim().max(80).optional().transform((v) => v || undefined),
  tipoBiomecanico: z.string().trim().max(80).optional().transform((v) => v || undefined),

  // Misma unión que en el esquema del atleta: un <select> sin elegir devuelve
  // "", y un enum a secas lo rechazaría justo en el caso normal de un campo
  // opcional. `z.preprocess` resolvería esto pero borra el tipo de entrada y
  // rompe el tipado de la llamada a la base.
  patron: z
    .union([z.enum(PATRONES), z.literal("")])
    .optional()
    .transform((v) => v || undefined),

  contraindicaciones: z.array(z.enum(CONTRAINDICACIONES)).default([]),

  activo: z.boolean().default(true),
});

export type EjercicioForm = z.input<typeof ejercicioSchema>;
export type EjercicioValidado = z.output<typeof ejercicioSchema>;
