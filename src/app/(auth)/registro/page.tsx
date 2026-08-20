"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { mensajeDeError, registroSchema, type RegistroInput } from "@/lib/validation/auth";

function RegistroForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Si viene de un enlace de invitación, NO se le crea un tenant propio: su
  // espacio se lo da la invitación al aceptarla.
  const invitacion = params.get("invitacion");
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [revisaTuCorreo, setRevisaTuCorreo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({ resolver: zodResolver(registroSchema) });

  async function onSubmit(datos: RegistroInput) {
    setErrorGeneral(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        // El trigger handle_new_user lee estos metadatos: crea el perfil y,
        // por 'tipo_registro', el tenant propio del entrenador y su membresía.
        // El rol NO viaja aquí: está escrito a mano en la migración, porque
        // esto lo manda el navegador y sería la vía para pedirse super_admin.
        data: invitacion
          ? { full_name: datos.fullName }
          : { full_name: datos.fullName, tipo_registro: "independiente" },
        emailRedirectTo: invitacion
          ? `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(
              `/invitacion?token=${invitacion}`,
            )}`
          : `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorGeneral(mensajeDeError(error.code, "No pudimos crear tu cuenta. Inténtalo de nuevo."));
      return;
    }

    // Con confirmación de correo activada, todavía no hay sesión.
    if (!data.session) {
      setRevisaTuCorreo(true);
      return;
    }

    router.replace(invitacion ? `/invitacion?token=${invitacion}` : "/");
  }

  if (revisaTuCorreo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace para confirmar tu cuenta. Ábrelo desde este mismo dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          {invitacion
            ? "Crea tu cuenta para aceptar la invitación."
            : "Para entrenadores independientes. Si te invitó un gimnasio, usa su enlace."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Campo
            etiqueta="Nombre completo"
            autoComplete="name"
            autoCapitalize="words"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

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

          <Campo
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />

          <Campo
            etiqueta="Repite la contraseña"
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

          <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center font-medium text-foreground underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegistroPage() {
  // useSearchParams obliga a un Suspense para no romper el prerenderizado.
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  );
}
