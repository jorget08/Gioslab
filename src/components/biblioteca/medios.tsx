"use client";

import { ImagePlus, Loader2, Star, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  FORMATOS_FOTO,
  FORMATOS_VIDEO,
  hacerPortada,
  motivoDeRechazo,
  quitarMedio,
  tipoDeArchivo,
  type Medio,
} from "@/domain/medios";
import { borrarMedio, subirMedio, urlPublica } from "@/lib/medios/almacenamiento";
import { comprimirImagen } from "@/lib/medios/comprimir";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

/**
 * Galería de fotos y video de un ejercicio (tarea 4.2).
 *
 * SE GUARDA SOLA, FUERA DEL BOTÓN «Guardar» DEL FORMULARIO. No es una
 * inconsistencia: subir un archivo es una operación que ya ocurrió: el byte está
 * en el bucket. Dejar el registro de esa subida pendiente de que alguien pulse
 * Guardar significa que cerrar la pestaña por error deja el archivo huérfano y
 * la ficha sin foto. Cada añadido, borrado y cambio de portada escribe
 * `media_urls` en el acto.
 *
 * Y por eso mismo solo aparece al EDITAR, nunca al crear: sin una fila donde
 * escribir, no habría dónde guardar la subida. La alternativa —inventar el id
 * antes de que exista la fila— llena el bucket de archivos de ejercicios que
 * nadie llegó a crear.
 */

const ACEPTA = [...FORMATOS_FOTO, ...FORMATOS_VIDEO].join(",");

export function MediosEjercicio({
  ejercicioId,
  iniciales,
}: {
  ejercicioId: string;
  iniciales: Medio[];
}) {
  const [medios, setMedios] = useState<Medio[]>(iniciales);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // Espejo del estado para poder encadenar varias subidas seguidas sin que la
  // segunda lea un `medios` viejo y pise a la primera.
  const actuales = useRef<Medio[]>(iniciales);

  async function persistir(nuevos: Medio[]): Promise<boolean> {
    actuales.current = nuevos;
    setMedios(nuevos);

    const { error: fallo } = await createClient()
      .from("exercise_library")
      // `Medio` es una interfaz y `Json` exige firma de índice, así que TypeScript
      // no las reconcilia aunque la forma sea idéntica. El cast es el precio;
      // quien garantiza la forma de verdad es el CHECK de la migración.
      .update({ media_urls: nuevos as unknown as Json })
      .eq("id", ejercicioId);

    if (fallo) {
      setError("No pudimos guardar los cambios en la galería.");
      return false;
    }
    return true;
  }

  async function alElegir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setError(null);

    // Uno detrás de otro y no en paralelo: en el gimnasio la subida compite con
    // una señal mala, y tres archivos a la vez hacen que fallen los tres.
    for (const archivo of Array.from(lista)) {
      const motivo = motivoDeRechazo(archivo.type, archivo.size);
      if (motivo) {
        setError(motivo);
        continue;
      }

      const tipo = tipoDeArchivo(archivo.type);
      if (!tipo) continue;

      setSubiendo((n) => n + 1);
      try {
        const listo = tipo === "foto" ? await comprimirImagen(archivo) : archivo;
        const medio = await subirMedio(listo, ejercicioId, tipo);
        await persistir([...actuales.current, medio]);
      } catch {
        setError("No pudimos subir el archivo. Revisa la conexión e inténtalo otra vez.");
      } finally {
        setSubiendo((n) => n - 1);
      }
    }

    // Sin esto, volver a elegir el mismo archivo no dispara `change`.
    if (entrada.current) entrada.current.value = "";
  }

  async function quitar(path: string) {
    setError(null);
    // Primero la fila, después el archivo: ver el comentario de `borrarMedio`.
    if (await persistir(quitarMedio(actuales.current, path))) {
      await borrarMedio(path);
    }
  }

  async function portada(path: string) {
    setError(null);
    await persistir(hacerPortada(actuales.current, path));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        La primera imagen es la portada: es la que se ve en el listado. Las fotos se
        reducen solas antes de subirse.
      </p>

      {medios.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {medios.map((m, i) => (
            <li key={m.path} className="overflow-hidden rounded-lg border bg-muted">
              <div className="relative aspect-square">
                {/* Si el archivo ya no está, se dice: en el editor sí hay que
                    hacer algo al respecto —quitarlo y volver a subirlo—, al
                    contrario que en el listado, donde solo estorbaría. */}
                <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[0.65rem] text-muted-foreground">
                  No se pudo cargar
                </span>
                {m.tipo === "foto" ? (
                  // <img> y no next/image: el proyecto compila con output:"export"
                  // (ARQUITECTURA.md) y ahí el optimizador de Next no existe.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlPublica(m.path)}
                    alt=""
                    className="relative size-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <video
                    src={urlPublica(m.path)}
                    className="relative size-full object-cover"
                    controls
                    playsInline
                    // `metadata`: descarga la carátula pero no el video entero.
                    // Con `auto`, abrir un ejercicio con tres clips se lleva
                    // decenas de megas de los datos de alguien.
                    preload="metadata"
                  />
                )}

                {i === 0 && (
                  <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-white">
                    portada
                  </span>
                )}
              </div>

              <div className="flex divide-x border-t">
                <button
                  type="button"
                  onClick={() => portada(m.path)}
                  disabled={i === 0}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs text-muted-foreground disabled:opacity-40 hover:bg-muted"
                  aria-label={`Usar como portada`}
                >
                  <Star className="size-3.5" aria-hidden="true" />
                  Portada
                </button>
                <button
                  type="button"
                  onClick={() => quitar(m.path)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs text-destructive hover:bg-muted"
                  aria-label="Quitar este archivo"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* El input va DENTRO de la etiqueta, no escondido al lado con un
          `.click()` por JavaScript. Así el objetivo táctil es la etiqueta
          entera —44px— en vez de un input de 1px, funciona con teclado sin
          cablear nada, y el verificador de `scripts/captura.mjs` deja de
          señalarlo como objetivo pequeño, que era un falso positivo. */}
      <Button asChild variant="outline" className="min-h-11 w-full">
        <label className={subiendo > 0 ? "pointer-events-none opacity-60" : "cursor-pointer"}>
          <input
            ref={entrada}
            type="file"
            accept={ACEPTA}
            multiple
            disabled={subiendo > 0}
            className="sr-only"
            onChange={(e) => alElegir(e.target.files)}
          />
          {subiendo > 0 ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Subiendo {subiendo === 1 ? "1 archivo" : `${subiendo} archivos`}…
            </>
          ) : (
            <>
              <ImagePlus className="size-4" aria-hidden="true" />
              Añadir foto o video
            </>
          )}
        </label>
      </Button>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      {medios.length === 0 && subiendo === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Video className="size-3.5 shrink-0" aria-hidden="true" />
          Todavía no tiene material. Un clip corto de la ejecución vale más que la
          descripción.
        </p>
      )}
    </div>
  );
}
