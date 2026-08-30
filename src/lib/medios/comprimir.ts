/**
 * Compresión de imágenes en el navegador, antes de subirlas (tarea 4.2).
 *
 * POR QUÉ EN EL CLIENTE: una foto de un teléfono actual pesa entre 3 y 8 MB.
 * Subirla tal cual desde el gimnasio con mala señal tarda, y después la
 * descargan todos los atletas cada vez que abren el ejercicio. Reducirla a
 * ~1600px y JPEG 0.82 la deja en 200–400 KB sin que se note en pantalla.
 *
 * NUNCA FALLA HACIA ARRIBA: si el navegador no sabe decodificar el formato
 * —HEIC es el caso real— se devuelve el archivo original. Perder la compresión
 * es un problema de ancho de banda; rechazar la foto es un problema de que
 * Giovanni no puede trabajar.
 */

import { CALIDAD_FOTO, LADO_MAXIMO_FOTO } from "@/domain/medios";

/** Alto y ancho de destino, manteniendo la proporción. */
export function medidaDestino(
  ancho: number,
  alto: number,
  ladoMaximo: number,
): { ancho: number; alto: number } {
  const lado = Math.max(ancho, alto);
  if (lado <= ladoMaximo) return { ancho, alto };
  const factor = ladoMaximo / lado;
  // Redondeando hacia arriba: un 0 de ancho o alto hace que `drawImage` lance.
  return { ancho: Math.max(1, Math.round(ancho * factor)), alto: Math.max(1, Math.round(alto * factor)) };
}

export async function comprimirImagen(
  archivo: File,
  ladoMaximo = LADO_MAXIMO_FOTO,
  calidad = CALIDAD_FOTO,
): Promise<File> {
  try {
    // `imageOrientation: "from-image"` aplica el EXIF. Sin esto, toda foto
    // tomada en vertical con un teléfono se sube acostada: el sensor graba
    // apaisado y la rotación vive solo en los metadatos, que el canvas ignora.
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const { ancho, alto } = medidaDestino(bitmap.width, bitmap.height, ladoMaximo);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;

    // Sin fondo blanco, un PNG con transparencia queda con el alfa en negro al
    // pasarlo a JPEG, que no tiene canal alfa.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      lienzo.toBlob(resolve, "image/jpeg", calidad),
    );
    if (!blob) return archivo;

    // Si comprimir no ganó nada —una foto ya pequeña y muy optimizada— nos
    // quedamos con la original en vez de recodificarla y perder calidad gratis.
    if (blob.size >= archivo.size) return archivo;

    return new File([blob], "foto.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}
