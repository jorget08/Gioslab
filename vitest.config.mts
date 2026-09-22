import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Los tests viven en /tests, no junto al código. `.tsx` entró con el PDF de
    // la 6.3: ese se prueba montando el componente, no llamando a una función.
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    // Mismo alias que tsconfig.json, para que los tests importen igual que la app.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
