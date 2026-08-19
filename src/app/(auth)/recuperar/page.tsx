"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { mensajeDeError, recuperarSchema, type RecuperarInput } from "@/lib/validation/auth";

export default function RecuperarPage() {
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarInput>({ resolver: zodResolver(recuperarSchema) });

  async function onSubmit(datos: RecuperarInput) {
    setErrorGeneral(null);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(datos.email, {
      redirectTo: `${window.location.origin}/auth/callback?siguiente=/nueva-contrasena`,
    });

    // Solo se muestra error si es de límite de peticiones. Cualquier otro se
    // traga a propósito: si dijéramos "ese correo no existe", cualquiera podría
    // averiguar quién tiene cuenta, y aquí eso es saber quién entrena en un
    // gimnasio. La pantalla siguiente es la misma exista la cuenta o no.
    if (error && error.code?.includes("rate_limit")) {
      setErrorGeneral(mensajeDeError(error.code, "Demasiados intentos."));
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisa tu correo</CardTitle>
          <CardDescription>
            Si existe una cuenta con ese correo, te enviamos un enlace para crear una contraseña
            nueva. Caduca en una hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/login">Volver</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Te enviamos un enlace para crear una nueva.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Campo
            etiqueta="Correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            error={errors.email?.message}
            {...register("email")}
          />

          {errorGeneral && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorGeneral}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
