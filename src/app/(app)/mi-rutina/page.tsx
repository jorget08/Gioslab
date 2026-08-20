import { requerirRol } from "@/lib/auth/sesion";

/**
 * Portal del cliente. Es Fase B; existe ahora para que el rol `client` tenga un
 * destino y la protección por rol sea verificable en ambos sentidos.
 */
export default async function MiRutinaPage() {
  await requerirRol(["client"]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mi rutina</h1>
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        El portal del cliente llega en Fase B. Tu entrenador todavía te comparte la rutina
        en PDF.
      </p>
    </div>
  );
}
