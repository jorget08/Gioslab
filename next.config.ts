import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Exportado estático: es lo que Capacitor puede empaquetar en la app nativa.
  // Además actúa de red de seguridad — si alguien introduce un Server Component
  // o una Server Action, el build falla. Ver docs/ARQUITECTURA.md.
  output: "export",
  turbopack: {
    // Sin esto, Turbopack detecta un package-lock.json en el home del usuario y
    // asume que la raíz del workspace está fuera del repositorio.
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
