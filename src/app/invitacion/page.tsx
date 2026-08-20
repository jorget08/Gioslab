"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ETIQUETA_ROL } from "@/lib/validation/invitacion";
import { useSesion } from "@/lib/auth/contexto";
import { createClient } from "@/lib/supabase/client";

interface Vista {
  nombre_tenant: string;
  rol: string;
  correo: string;
  valida: boolean;
}

/**
 * Aceptación de una invitación.
 *
 * Es pública a propósito: el invitado tiene que poder ver a qué le invitan antes
 * de decidir si crea una cuenta. `ver_invitacion()` devuelve solo el nombre del
 * espacio, el rol y el correo destinatario — nada de quién más está dentro.
 */
function Invitacion() {
  const params = useSearchParams();
  const router = useRouter();
  const { sesion, cargando, refrescar } = useSesion();

  const token = params.get("token") ?? "";
  // El estado inicial se deriva del token, sin efecto: asignarlo dentro de uno
  // de forma síncrona encadena un render de más.
  const [vista, setVista] = useState<Vista | null | "no-existe">(token ? null : "no-existe");
  const [error, setError] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    createClient()
      .rpc("ver_invitacion", { p_token: token })
      .then(({ data }) => {
        if (vivo) setVista(data?.[0] ?? "no-existe");
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  const aceptar = useCallback(async () => {
    setAceptando(true);
    setError(null);

    const { error: e } = await createClient().rpc("aceptar_invitacion", { p_token: token });

    if (e) {
      setError(
        e.code === "42501"
          ? "Esta invitación es para otro correo. Inicia sesión con la cuenta a la que se envió."
          : "La invitación ya no es válida. Pídele a quien te invitó que genere otra.",
      );
      setAceptando(false);
      return;
    }

    await refrescar();
    router.replace("/");
  }, [token, refrescar, router]);

  if (vista === null || cargando) {
    return <Mensaje titulo="Cargando…" />;
  }

  if (vista === "no-existe" || !vista.valida) {
    return (
      <Mensaje
        titulo="Esta invitación ya no sirve"
        detalle="Puede haber caducado, haberse usado o haber sido revocada. Pídele a quien te invitó que genere una nueva."
      />
    );
  }

  const rolLegible = ETIQUETA_ROL[vista.rol] ?? vista.rol;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Te invitaron a {vista.nombre_tenant}</CardTitle>
        <CardDescription>
          Entrarás como <strong>{rolLegible}</strong>, con la cuenta{" "}
          <strong>{vista.correo}</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!sesion ? (
          <>
            <p className="text-sm text-muted-foreground">
              Inicia sesión o crea tu cuenta con ese mismo correo y vuelve a abrir este
              enlace.
            </p>
            <Button asChild className="min-h-11 w-full">
              <Link href={`/registro?invitacion=${encodeURIComponent(token)}`}>Crear cuenta</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href={`/login?siguiente=${encodeURIComponent(`/invitacion?token=${token}`)}`}>
                Ya tengo cuenta
              </Link>
            </Button>
          </>
        ) : sesion.email.toLowerCase() !== vista.correo.toLowerCase() ? (
          <>
            <p role="alert" className="text-sm font-medium text-destructive">
              Tienes la sesión abierta como {sesion.email}, pero esta invitación es para{" "}
              {vista.correo}.
            </p>
            <p className="text-sm text-muted-foreground">
              Cierra sesión y entra con la cuenta correcta.
            </p>
          </>
        ) : (
          <>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button onClick={aceptar} disabled={aceptando} className="min-h-11 w-full">
              {aceptando ? "Aceptando…" : "Aceptar invitación"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Mensaje({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {detalle && <CardDescription>{detalle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href="/login">Ir al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function InvitacionPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Mensaje titulo="Cargando…" />}>
          <Invitacion />
        </Suspense>
      </div>
    </div>
  );
}
