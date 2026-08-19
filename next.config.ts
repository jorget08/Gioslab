import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: {
    // Sin esto, Turbopack detecta un package-lock.json en el home del usuario y
    // asume que la raíz del workspace está fuera del repositorio.
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
