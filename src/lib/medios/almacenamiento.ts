/**
 * Subida y borrado de medios contra Supabase Storage (tarea 4.2).
 *
 * Quien autoriza es RLS sobre `storage.objects`, no esta capa: aquí solo se
 * esconde el botón. Ver la migración `20260829100000_medios_ejercicios.sql`.
 */

import {
  BUCKET_EJERCICIOS,
  rutaNueva,
  type Medio,
  type TipoMedio,
} from "@/domain/medios";
import { createClient } from "@/lib/supabase/client";

/**
 * URL pública de un medio.
 *
 * El bucket es público a propósito (ver la migración), así que esto es una
 * concatenación local: no hace red y no caduca, que es justo lo que necesita un
 * teléfono con mala señal.
 */
export function urlPublica(path: string): string {
  return createClient().storage.from(BUCKET_EJERCICIOS).getPublicUrl(path).data.publicUrl;
}

export async function subirMedio(
  archivo: File,
  ejercicioId: string,
  tipo: TipoMedio,
): Promise<Medio> {
  const path = rutaNueva(ejercicioId, archivo.type, crypto.randomUUID());

  const { error } = await createClient()
    .storage.from(BUCKET_EJERCICIOS)
    .upload(path, archivo, { contentType: archivo.type, upsert: false });

  if (error) throw error;

  return { tipo, path };
}

/**
 * Borra el archivo. Se llama DESPUÉS de haberlo quitado de `media_urls`.
 *
 * El orden importa: si falla el borrado del archivo queda un huérfano en el
 * bucket, que no molesta a nadie. Al revés —borrar el archivo y fallar al
 * actualizar la fila— deja la ficha apuntando a una foto que ya no existe, y eso
 * sí se ve como una imagen rota en la pantalla de un entrenador.
 */
export async function borrarMedio(path: string): Promise<void> {
  await createClient().storage.from(BUCKET_EJERCICIOS).remove([path]);
}
