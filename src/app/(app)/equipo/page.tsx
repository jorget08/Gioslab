"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { Guarda } from "@/components/shared/guarda";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSesion } from "@/lib/auth/contexto";
import { createClient } from "@/lib/supabase/client";
import {
  ETIQUETA_ROL,
  invitacionSchema,
  rolesQuePuedeInvitar,
  type InvitacionInput,
} from "@/lib/validation/invitacion";

interface Invitacion {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

function estadoDe(i: Invitacion): string {
  if (i.accepted_at) return "Aceptada";
  if (i.revoked_at) return "Revocada";
  if (new Date(i.expires_at) < new Date()) return "Caducada";
  return "Pendiente";
}

function Equipo() {
  const { sesion } = useSesion();
  const [invitaciones, setInvitaciones] = useState<Invitacion[] | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const roles = rolesQuePuedeInvitar(sesion?.rol);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitacionInput>({
    resolver: zodResolver(invitacionSchema),
    defaultValues: { rol: roles[0] },
  });

  // Un contador en vez de una función: recargar es cambiar la dependencia del
  // efecto, no llamar a algo que asigne estado de forma síncrona dentro de él.
  const [recarga, setRecarga] = useState(0);
  const cargar = () => setRecarga((n) => n + 1);

  useEffect(() => {
    let vivo = true;
    createClient()
      .from("invitations")
      .select("id, email, role, expires_at, accepted_at, revoked_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (vivo) setInvitaciones(data ?? []);
      });
    return () => {
      vivo = false;
    };
  }, [recarga]);

  async function onSubmit(datos: InvitacionInput) {
    setErrorGeneral(null);
    setEnlace(null);
    setCopiado(false);

    const { data: token, error } = await createClient().rpc("crear_invitacion", {
      p_email: datos.email,
      p_rol: datos.rol,
    });

    if (error) {
      setErrorGeneral(
        error.code === "23505"
          ? "Ya hay una invitación pendiente para ese correo"
          : "No pudimos crear la invitación",
      );
      return;
    }

    // El token solo se ve UNA vez: la base guarda su hash, no el valor.
    setEnlace(`${window.location.origin}/invitacion?token=${token}`);
    reset({ email: "", rol: datos.rol });
    cargar();
  }

  async function revocar(id: string) {
    await createClient()
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    cargar();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">
          Invita a tu espacio de trabajo actual.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4" noValidate>
        <Campo
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1.5">
          <Label htmlFor="rol">Entra como</Label>
          <select
            id="rol"
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
            {...register("rol")}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL[r]}
              </option>
            ))}
          </select>
        </div>

        {errorGeneral && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorGeneral}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
          {isSubmitting ? "Creando…" : "Crear invitación"}
        </Button>
      </form>

      {enlace && (
        <div className="space-y-2 rounded-lg border border-foreground/30 bg-muted/40 p-4">
          <p className="text-sm font-medium">Enlace listo — cópialo ahora</p>
          <p className="text-xs text-muted-foreground">
            Solo se muestra esta vez: la plataforma guarda el enlace cifrado y no puede
            volver a enseñarlo. Mándaselo por WhatsApp o correo.
          </p>
          <code className="block overflow-x-auto rounded border bg-background p-2 text-xs">
            {enlace}
          </code>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => {
              navigator.clipboard.writeText(enlace);
              setCopiado(true);
            }}
          >
            {copiado ? "Copiado ✓" : "Copiar enlace"}
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Invitaciones</h2>
        {invitaciones === null ? (
          <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
        ) : invitaciones.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Todavía no has invitado a nadie.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {invitaciones.map((i) => {
              const estado = estadoDe(i);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.email}</span>
                  <span className="text-xs text-muted-foreground">{ETIQUETA_ROL[i.role]}</span>
                  <span
                    className={
                      estado === "Pendiente"
                        ? "text-xs font-medium"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {estado}
                  </span>
                  {estado === "Pendiente" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => revocar(i.id)}
                    >
                      Revocar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function EquipoPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Equipo />
    </Guarda>
  );
}
