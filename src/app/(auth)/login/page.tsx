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
import { destinoSeguro } from "@/domain/autorizacion";
import { loginSchema, mensajeDeError, type LoginInput } from "@/lib/validation/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(datos: LoginInput) {
    setErrorGeneral(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: datos.email,
      password: datos.password,
    });

    if (error) {
      setErrorGeneral(mensajeDeError(error.code, "No pudimos iniciar tu sesión."));
      return;
    }

    // `siguiente` lo pone el proxy al bloquear una ruta privada, para devolver
    // al usuario a donde iba. destinoSeguro rechaza URLs externas: sin eso, el
    // login sería un redirector abierto útil para phishing.
    router.push(destinoSeguro(params.get("siguiente")));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Entra para evaluar y prescribir.</CardDescription>
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

          <Campo
            etiqueta="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {errorGeneral && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorGeneral}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            <Link href="/recuperar" className="underline underline-offset-4">
              Olvidé mi contraseña
            </Link>
          </p>
          <p>
            ¿No tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Crear una
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  // useSearchParams obliga a un Suspense para que la página no salga del
  // prerenderizado estático completo.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
