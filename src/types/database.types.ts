/**
 * Tipos generados desde el esquema de Supabase. NO editar a mano.
 *
 * Se regeneran con:
 *   npm run db:types
 *
 * Ahora mismo el esquema está vacío: las tablas llegan con las migraciones del
 * grupo 1. Después de cada migración hay que regenerar este archivo, o
 * TypeScript seguirá creyendo que la base no tiene tablas.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
