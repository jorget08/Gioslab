"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { rutaInicial } from "@/domain/autorizacion";
import { useSesion } from "@/lib/auth/contexto";

/**
 * Puerta de entrada. No es una pantalla: reparte.
 *
 * Aquí vivía un panel provisional que decía "el wizard de evaluación llega en
 * el grupo 2". Ya llegó, así que lo primero que veía alguien al entrar era una
 * promesa vencida sobre lo que ya estaba construido.
 *
 * En Fase A no hay contenido de panel que merezca una pestaña propia —métricas
 * y actividad son Fase B—, así que en vez de rellenarla con algo inventado se
 * manda a cada quien a su trabajo: el entrenador a sus atletas, el cliente a su
 * rutina. La pestaña "Inicio" desapareció por lo mismo: una pestaña que solo
 * reenvía a otra es ruido.
 *
 * Lo único que SÍ se queda aquí es el caso sin espacio de trabajo, porque no
 * hay ningún sitio a donde mandar a esa persona y necesita saber por qué.
 */
export default function Entrada() {
  const { sesion, cargando } = useSesion();
  const router = useRouter();

  const rol = sesion?.rol ?? null;

  useEffect(() => {
    // Sin rol no se redirige: abajo se le explica qué le falta. Mandarlo a
    // /atletas solo le enseñaría una lista vacía sin decirle por qué.
    if (cargando || !sesion || !rol) return;
    router.replace(rutaInicial(rol));
  }, [cargando, sesion, rol, router]);

  if (!sesion || rol) {
    // Mientras redirige. Es un instante, pero dejarlo en blanco parece un fallo.
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando…
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h1 className="font-medium">Tu cuenta todavía no tiene espacio de trabajo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Si te invitó un gimnasio, pídele que confirme tu acceso. En cuanto lo haga verás aquí
        a tus atletas.
      </p>
    </div>
  );
}
