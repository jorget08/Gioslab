"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Archive, ArchiveRestore } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { CampoSelect } from "@/components/shared/campo-select";
import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CONDICIONES_SISTEMICAS,
  leerContraindicaciones,
  REGLA_SISTEMICA,
  ZONAS_ANATOMICAS,
  type Contraindicacion,
} from "@/domain/contraindicaciones";
import {
  nombreDuplicado,
  normalizarNombre,
  sugerencias,
  type Ejercicio,
} from "@/domain/ejercicios";
import { FICHA_PATRON, PATRONES } from "@/domain/patrones";
import { createClient } from "@/lib/supabase/client";
import { ejercicioSchema, type EjercicioForm, type EjercicioValidado } from "@/lib/validation/ejercicio";

/**
 * Alta y edición de un ejercicio (tarea 4.1).
 *
 * SOLO NOMBRE OBLIGATORIO. Giovanni va a cargar la biblioteca en varias
 * sesiones; exigirle los siete campos para guardar uno haría que abandonara a la
 * mitad. Lo incompleto se ve luego en el listado, agrupado por patrón, que es
 * donde se decide qué falta por completar.
 *
 * NO SE BORRA, SE ARCHIVA. Un ejercicio borrado deja huérfanas las reglas y los
 * planes que lo nombran —y esos son historial, no datos desechables (§3.5)—.
 * Archivar lo saca de la biblioteca sin romper nada de lo que ya se prescribió.
 */

const COLUMNAS =
  "id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, is_active";

function Formulario() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const esNuevo = !id;

  const [cargando, setCargando] = useState(!esNuevo);
  const [otros, setOtros] = useState<Ejercicio[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [archivando, setArchivando] = useState(false);
  const [activo, setActivo] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EjercicioForm, unknown, EjercicioValidado>({
    resolver: zodResolver(ejercicioSchema),
    defaultValues: { contraindicaciones: [], activo: true },
  });

  useEffect(() => {
    let vivo = true;
    createClient()
      .from("exercise_library")
      .select(COLUMNAS)
      .then(({ data }) => {
        if (!vivo) return;
        const todos = (data ?? []) as Ejercicio[];
        setOtros(todos);

        if (esNuevo) return;
        const actual = todos.find((e) => e.id === id);
        if (actual) {
          setActivo(actual.is_active);
          reset({
            nombre: actual.name,
            descripcion: actual.description ?? "",
            musculo: actual.target_muscle ?? "",
            equipo: actual.equipment ?? "",
            tipoBiomecanico: actual.biomechanical_type ?? "",
            patron: (actual.movement_pattern ?? "") as EjercicioForm["patron"],
            contraindicaciones: leerContraindicaciones(actual.contraindications),
            activo: actual.is_active,
          });
        }
        setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [id, esNuevo, reset]);

  // Sugerencias de lo ya escrito: es lo que sustituye a un catálogo que
  // Giovanni no ha fijado. El vocabulario converge sin que decidamos por él.
  const musculos = sugerencias(otros.map((e) => e.target_muscle));
  const equipos = sugerencias(otros.map((e) => e.equipment));
  const tipos = sugerencias(otros.map((e) => e.biomechanical_type));

  // Avisa ANTES de guardar. La base solo protege contra el duplicado exacto:
  // "prensa 45" pasaría su UNIQUE aunque ya exista "Prensa 45°".
  const nombre = watch("nombre") ?? "";
  const duplicado = nombreDuplicado(nombre, otros, id || undefined);

  async function onSubmit(datos: EjercicioValidado) {
    setErrorGeneral(null);

    const fila = {
      name: normalizarNombre(datos.nombre),
      description: datos.descripcion ?? null,
      target_muscle: datos.musculo ?? null,
      equipment: datos.equipo ?? null,
      biomechanical_type: datos.tipoBiomecanico ?? null,
      movement_pattern: datos.patron ?? null,
      contraindications: datos.contraindicaciones,
    };

    const supabase = createClient();
    const { error } = esNuevo
      ? await supabase.from("exercise_library").insert(fila)
      : await supabase.from("exercise_library").update(fila).eq("id", id);

    if (error) {
      setErrorGeneral(
        error.code === "23505"
          ? "Ya existe un ejercicio con ese nombre."
          : "No pudimos guardar el ejercicio. Inténtalo de nuevo.",
      );
      return;
    }

    router.replace("/biblioteca");
  }

  async function alternarArchivo() {
    setArchivando(true);
    setErrorGeneral(null);

    const { error } = await createClient()
      .from("exercise_library")
      .update({ is_active: !activo })
      .eq("id", id);

    if (error) {
      setErrorGeneral("No pudimos cambiar el estado del ejercicio.");
      setArchivando(false);
      return;
    }

    router.replace("/biblioteca");
  }

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {esNuevo ? "Nuevo ejercicio" : "Editar ejercicio"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Solo el nombre es obligatorio. El resto se puede completar después.
        </p>
      </header>

      {!activo && (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Este ejercicio está archivado: no aparece en la biblioteca ni lo propone el motor.
          Las reglas y los planes que ya lo nombran siguen intactos.
        </p>
      )}

      <Bloque rotulo="Identificación">
        <Campo
          etiqueta="Nombre"
          {...register("nombre")}
          error={errors.nombre?.message}
          autoCapitalize="words"
          autoComplete="off"
          placeholder="Sentadilla Barra Alta con Tacón"
        />

        {duplicado && !errors.nombre && (
          <p className="flex items-start gap-1.5 text-xs text-[color:var(--gl-alerta)]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Ya hay un ejercicio con este nombre. Si es una variante, dale un nombre que las
            distinga.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            {...register("descripcion")}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            placeholder="Ejecución, apuntes de técnica, cuándo usarlo…"
          />
          {errors.descripcion && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.descripcion.message}
            </p>
          )}
        </div>
      </Bloque>

      <Bloque rotulo="Clasificación">
        <CampoSelect
          etiqueta="Patrón de movimiento"
          ayuda="Es la llave con la que el motor sustituye un ejercicio por otro"
          {...register("patron")}
          error={errors.patron?.message}
        >
          <option value="">Sin asignar</option>
          {PATRONES.map((p) => (
            <option key={p} value={p}>
              {FICHA_PATRON[p].nombre}
            </option>
          ))}
        </CampoSelect>

        {/* Los tres campos siguientes no tienen catálogo cerrado porque Giovanni
            no lo ha fijado. En vez de inventarlo, se sugiere lo ya escrito: el
            vocabulario converge solo y la ortografía sigue siendo la suya. */}
        <Campo
          etiqueta="Músculo objetivo"
          {...register("musculo")}
          error={errors.musculo?.message}
          list="sugerencias-musculo"
          autoComplete="off"
          placeholder="cuádriceps"
        />
        <datalist id="sugerencias-musculo">
          {musculos.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <Campo
          etiqueta="Equipo"
          {...register("equipo")}
          error={errors.equipo?.message}
          list="sugerencias-equipo"
          autoComplete="off"
          placeholder="barra, prensa, polea…"
        />
        <datalist id="sugerencias-equipo">
          {equipos.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>

        <Campo
          etiqueta="Tipo biomecánico"
          {...register("tipoBiomecanico")}
          error={errors.tipoBiomecanico?.message}
          list="sugerencias-tipo"
          autoComplete="off"
          placeholder="rodilla dominante"
        />
        <datalist id="sugerencias-tipo">
          {tipos.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Bloque>

      {/* Dos familias, y la diferencia no es cosmética (respuesta de Giovanni
          del 2026-08-22): una zona anatómica hace que el motor DESCARTE el
          ejercicio; una condición sistémica hace que además CAMBIE cómo se
          ejecuta —maniobra respiratoria, RIR, posición—. Mezclarlas en una sola
          lista escondería que hacen cosas distintas. */}
      <Controller
        control={control}
        name="contraindicaciones"
        render={({ field }) => {
          const marcadas = (field.value ?? []) as Contraindicacion[];
          const alternar = (c: Contraindicacion) =>
            field.onChange(
              marcadas.includes(c) ? marcadas.filter((x) => x !== c) : [...marcadas, c],
            );

          const casilla = (c: Contraindicacion, detalle?: string) => {
            const activa = marcadas.includes(c);
            return (
              <label
                key={c}
                className={[
                  "flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  "focus-within:ring-2 focus-within:ring-ring/50",
                  activa
                    ? "seleccionado"
                    : "border-input hover:bg-muted",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activa}
                  onChange={() => alternar(c)}
                />
                <span className="min-w-0">
                  <span className="block">{c}</span>
                  {detalle && (
                    <span
                      className={[
                        "block text-xs font-normal",
                        // Sobre el fondo dorado suave el blanco desaparecería en el tema
                      // claro. El propio dorado, algo apagado, se lee en los dos.
                      activa ? "text-[color:var(--gl-dorado)]/85" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {detalle}
                    </span>
                  )}
                </span>
              </label>
            );
          };

          return (
            <>
              <Bloque rotulo="Zonas que desaconsejan el ejercicio">
                <p className="text-xs text-muted-foreground">
                  Mismo catálogo que las lesiones del atleta: es lo que permite cruzarlas
                  exactamente. Si el atleta tiene esa zona marcada, el motor descarta el
                  ejercicio.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ZONAS_ANATOMICAS.map((z) => casilla(z))}
                </div>
              </Bloque>

              <Bloque rotulo="Condiciones fisiológicas">
                <p className="text-xs text-muted-foreground">
                  Estas no solo descartan el ejercicio: también cambian cómo se ejecuta.
                </p>
                <div className="grid gap-2">
                  {CONDICIONES_SISTEMICAS.map((c) => casilla(c, REGLA_SISTEMICA[c]))}
                </div>
              </Bloque>
            </>
          );
        }}
      />

      {errorGeneral && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorGeneral}
        </p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href="/biblioteca">Cancelar</Link>
        </Button>
        <Button type="submit" className="min-h-11 flex-[2]" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {/* Archivar, no borrar: un ejercicio borrado deja huérfanas las reglas y
          los planes que lo nombran, y eso es historial. */}
      {!esNuevo && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full text-muted-foreground"
          onClick={alternarArchivo}
          disabled={archivando}
        >
          {activo ? (
            <>
              <Archive className="size-4" aria-hidden="true" />
              Archivar ejercicio
            </>
          ) : (
            <>
              <ArchiveRestore className="size-4" aria-hidden="true" />
              Devolver a la biblioteca
            </>
          )}
        </Button>
      )}
    </form>
  );
}

/** Solo super_admin: la metodología es el producto (MODELO-DATOS §1.2). */
export default function EjercicioPage() {
  return (
    <Guarda roles={["super_admin"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </Guarda>
  );
}
