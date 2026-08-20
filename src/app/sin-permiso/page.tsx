"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { rutaInicial } from "@/domain/autorizacion";
import { useSesion } from "@/lib/auth/contexto";

/**
 * 403. Dice qué pasó sin detallar qué hay al otro lado: describir la sección
 * prohibida le enseña el mapa del producto a un curioso.
 */
export default function SinPermisoPage() {
  const { sesion } = useSesion();

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No tienes acceso a esa sección</h1>
      <p className="text-sm text-muted-foreground">
        Tu cuenta no tiene permisos para verla. Si crees que es un error, habla con quien
        administra tu espacio de trabajo.
      </p>
      <Button asChild className="min-h-11 w-full">
        <Link href={rutaInicial(sesion?.rol)}>Volver</Link>
      </Button>
    </div>
  );
}
