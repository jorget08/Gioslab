"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Lesiones } from "@/components/atletas/lesiones";
import { Objetivos } from "@/components/atletas/objetivos";
import { Campo } from "@/components/shared/campo";
import { CampoFecha } from "@/components/shared/campo-fecha";
import { CampoSelect } from "@/components/shared/campo-select";
import { GrupoOpciones } from "@/components/shared/grupo-opciones";
import { Guarda } from "@/components/shared/guarda";
import { Bloque, PasoWizard } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
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
      <PasoWizard paso={1} titulo="Nuevo atleta" descripcion="Perfil y anamnesis" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Bloque rotulo="Quién es">
          <Campo
            etiqueta="Nombre completo"
            autoComplete="off"
            autoCapitalize="words"
            error={errors.nombre?.message}
            {...register("nombre")}
          />

          <Controller
            name="fechaNacimiento"
            control={control}
            render={({ field }) => (
              <CampoFecha
                nombre="nacimiento"
                etiqueta="Fecha de nacimiento"
                ayuda="La edad entra en la fórmula del porcentaje graso"
                valor={field.value ?? ""}
                onChange={field.onChange}
                error={errors.fechaNacimiento?.message}
              />
            )}
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
        </Bloque>

        <Bloque rotulo="Qué busca">
          <CampoSelect etiqueta="Objetivo principal" {...register("objetivo")}>
            <option value="">Sin definir</option>
            {OBJETIVOS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect etiqueta="Nivel de experiencia" {...register("nivel")}>
            <option value="">Sin definir</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </CampoSelect>

          <Controller
            name="objetivos"
            control={control}
            render={({ field }) => (
              <Objetivos objetivos={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </Bloque>

        <Bloque rotulo="Qué le duele">
          <Controller
            name="lesiones"
            control={control}
            render={({ field }) => (
              <Lesiones lesiones={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </Bloque>

        <Bloque rotulo="Autorización de datos">

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
        </Bloque>

        {errorGeneral && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorGeneral}
          </p>
        )}

        <div className="flex gap-2 pt-2">
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
