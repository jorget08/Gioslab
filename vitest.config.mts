import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Los tests viven en /tests, no junto al código.
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Mismo alias que tsconfig.json, para que los tests importen igual que la app.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
