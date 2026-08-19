import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados por `supabase start`. Están en .gitignore, pero ESLint los
    // revisaba igual y ensuciaba la salida con 182 errores ajenos.
    "supabase/.temp/**",
  ]),
  {
    // CLAUDE.md §3.1 y §3.4: el dominio (cálculos y motor de reglas) son funciones
    // puras y testeables. No pueden depender de React, Next ni Supabase, o los
    // golden tests dejan de ser puros y el núcleo del negocio queda atado a la UI.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*", "@/lib/supabase/*", "next", "next/*", "react", "react-dom"],
              message:
                "src/domain/ debe ser puro: sin React, Next ni Supabase. Mueve esta lógica a src/lib/ o src/components/.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
