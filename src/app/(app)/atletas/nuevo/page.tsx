"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Lesiones } from "@/components/atletas/lesiones";
import { Objetivos } from "@/components/atletas/objetivos";
import { Campo } from "@/components/shared/campo";
import { GrupoOpciones } from "@/components/shared/grupo-opciones";
import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_SEXO,
  NIVELES,
  OBJETIVOS,
  SEXOS,
  VERSION_POLITICA,
} from "@/domain/catalogos";
import { createClient } from "@/lib/supabase/client";
import {
  aplicaModuloCiclo,
  atletaSchema,
  mensajeDeErrorAtleta,
  type AtletaDatos,
  type AtletaInput,
} from "@/lib/validation/atleta";

function FormularioAtleta() {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    // Tres genéricos: lo que entra al formulario, el contexto, y lo que sale ya
    // validado. Sin el tercero, el manejador recibiría el tipo de ENTRADA y
    // habría que castear en cada campo opcional.
  } = useForm<AtletaInput, unknown, AtletaDatos>({
    resolver: zodResolver(atletaSchema),
    defaultValues: {
      objetivos: [],
      lesiones: [],
      consienteSalud: false,
      consienteCiclo: false,
    },
  });

  const sexo = watch("sexo");
  const consienteSalud = watch("consienteSalud");
  const consienteCiclo = watch("consienteCiclo");
  const muestraCiclo = aplicaModuloCiclo(sexo);

  // Si el sexo deja de ser femenino, la autorización del ciclo deja de aplicar.
  // Arrastrar un consentimiento que ya no corresponde es exactamente lo que la
  // Ley 1581 no perdona.
  useEffect(() => {
    if (!muestraCiclo && consienteCiclo) setValue("consienteCiclo", false);
  }, [muestraCiclo, consienteCiclo, setValue]);

  async function onSubmit(datos: AtletaDatos) {
    setErrorGeneral(null);

    // Una sola llamada: la función escribe atleta, consentimientos y lesiones
    // en la misma transacción. Tres INSERT sueltos podrían dejar un atleta
    // guardado sin consentimiento si se cae la señal a mitad.
    const { data, error } = await createClient().rpc("crear_atleta", {
      p_nombre: datos.nombre,
      p_fecha_nacimiento: datos.fechaNacimiento,
      p_sexo: datos.sexo,
      p_objetivo: datos.objetivo || undefined,
      p_nivel: datos.nivel || undefined,
      p_objetivos: datos.objetivos,
      p_notas: datos.notas || undefined,
      p_version_politica: VERSION_POLITICA,
      p_consiente_ciclo: datos.consienteCiclo,
      p_lesiones: datos.lesiones,
    });

    if (error) {
      setErrorGeneral(
        mensajeDeErrorAtleta(error.code, "No pudimos guardar el atleta. Inténtalo de nuevo."),
      );
      return;
    }

    router.replace(`/atletas?nuevo=${data}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo atleta</h1>
        <p className="text-sm text-muted-foreground">Paso 1 de 5 · perfil y anamnesis</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
        <section className="space-y-4">
          <Campo
            etiqueta="Nombre completo"
            autoComplete="off"
            autoCapitalize="words"
            error={errors.nombre?.message}
            {...register("nombre")}
          />

          <Campo
            etiqueta="Fecha de nacimiento"
            type="date"
            ayuda="La edad entra en la fórmula del porcentaje graso"
            error={errors.fechaNacimiento?.message}
            {...register("fechaNacimiento")}
          />

          <Controller
            name="sexo"
            control={control}
            render={({ field }) => (
              <GrupoOpciones
                nombre="sexo"
                etiqueta="Sexo biológico"
                ayuda="Cambia la constante de la fórmula de densidad corporal"
                columnas
                opciones={SEXOS.map((s) => ({ valor: s, texto: ETIQUETA_SEXO[s] }))}
                valor={field.value}
                onChange={field.onChange}
                error={errors.sexo?.message}
              />
            )}
          />
        </section>

        <section className="space-y-4 border-t pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="objetivo">Objetivo principal</Label>
            <select
              id="objetivo"
              className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
              {...register("objetivo")}
            >
              <option value="">Sin definir</option>
              {OBJETIVOS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nivel">Nivel de experiencia</Label>
            <select
              id="nivel"
              className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
              {...register("nivel")}
            >
              <option value="">Sin definir</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <Controller
            name="objetivos"
            control={control}
            render={({ field }) => (
              <Objetivos objetivos={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </section>

        <section className="border-t pt-6">
          <Controller
            name="lesiones"
            control={control}
            render={({ field }) => (
              <Lesiones lesiones={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </section>

        <section className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-medium">Autorización de datos</h3>

          {/* Dos casillas separadas y ninguna premarcada: una casilla marcada de
              antemano no es consentimiento (docs/WIZARD-UX.md §4.1). */}
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-foreground"
              {...register("consienteSalud")}
            />
            <span>
              El atleta autoriza el tratamiento de sus datos de salud: composición corporal,
              lesiones y antecedentes.
            </span>
          </label>

          {errors.consienteSalud && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.consienteSalud.message}
            </p>
          )}

          {muestraCiclo && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-dashed p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-foreground"
                {...register("consienteCiclo")}
              />
              <span>
                Autoriza además el registro de su ciclo menstrual para ajustar el
                entrenamiento.
                <span className="mt-1 block text-xs text-muted-foreground">
                  Opcional. Sin esto la evaluación funciona igual y el módulo no aparece.
                </span>
              </span>
            </label>
          )}
        </section>

        {errorGeneral && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorGeneral}
          </p>
        )}

        <div className="flex gap-2 border-t pt-6">
          <Button asChild variant="outline" className="min-h-11 flex-1">
            <Link href="/atletas">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !consienteSalud}
            className="min-h-11 flex-1"
          >
            {isSubmitting ? "Guardando…" : "Guardar atleta"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NuevoAtletaPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <FormularioAtleta />
    </Guarda>
  );
}
