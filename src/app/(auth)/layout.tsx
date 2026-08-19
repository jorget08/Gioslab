import Link from "next/link";

/**
 * Contenedor de las pantallas de acceso.
 *
 * Pensado para un celular de 360px sostenido con una mano: contenido centrado,
 * ancho máximo cómodo y respeto de las áreas seguras del notch y la barra
 * inferior, porque esto acabará dentro de una app nativa con Capacitor
 * (CLAUDE.md §3.3).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-8"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <header className="mb-6 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          GiosLab<span className="text-muted-foreground">System</span>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrenamiento prescrito desde tu biomecánica
        </p>
      </header>

      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
