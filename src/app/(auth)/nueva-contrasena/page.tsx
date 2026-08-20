"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  mensajeDeError,
  nuevaPasswordSchema,
  type NuevaPasswordInput,
} from "@/lib/validation/auth";

/**
 * Se llega aquí desde el enlace del correo de recuperación, que ya dejó una
 * sesión abierta. Por eso el proxy deja pasar esta ruta aun con sesión.
 */
export default function NuevaContrasenaPage() {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [sesionValida, setSesionValida] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NuevaPasswordInput>({ resolver: zodResolver(nuevaPasswordSchema) });

  useEffect(() => {
    // Si el enlace caducó o ya se usó, no hay sesión: mejor decirlo antes de
    // que escriba una contraseña nueva para nada.
    createClient()
      .auth.getUser()
      .then(({ data }) => setSesionValida(Boolean(data.user)));
  }, []);

  async function onSubmit(datos: NuevaPasswordInput) {
    setErrorGeneral(null);
    const { error } = await createClient().auth.updateUser({ password: datos.password });

    if (error) {
      setErrorGeneral(mensajeDeError(error.code, "No pudimos cambiar tu contraseña."));
      return;
    }

    router.replace("/");
  }

  if (sesionValida === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>El enlace ya no sirve</CardTitle>
          <CardDescription>
            Los enlaces de recuperación caducan en una hora y solo se pueden usar una vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-11 w-full">
            <a href="/recuperar">Pedir uno nuevo</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
        <CardDescription>Escríbela dos veces para evitar errores de tecleo.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Campo
            etiqueta="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />

          <Campo
            etiqueta="Repítela"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {errorGeneral && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorGeneral}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || sesionValida === null}
            className="min-h-11 w-full"
          >
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
