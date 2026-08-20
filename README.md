# GiosLab System®

Plataforma SaaS B2B que automatiza la prescripción de entrenamiento de fuerza a partir
de **biomecánica y antropometría individual**.

No es un catálogo de rutinas prefabricadas: es un motor de decisión metodológico que
selecciona o excluye ejercicios según la estructura corporal real del atleta (longitud
de fémur, dorsiflexión de tobillo, movilidad de cadera y hombro, somatotipo,
clasificación de patrones de movimiento) y **siempre muestra qué regla aplicó y por qué**.

Repositorio privado. El contexto completo del proyecto está en
[`CLAUDE.md`](./CLAUDE.md); el plan de trabajo, en
[`docs/TAREAS-FASE-A.md`](./docs/TAREAS-FASE-A.md).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 |
| Componentes | shadcn/ui *(pendiente — tarea 1.8)* |
| Backend / BD | Supabase (Postgres + Auth + Storage + RLS) |
| Validación | Zod + React Hook Form *(pendiente)* |
| Tests | Vitest |
| Despliegue | Vercel (web) · Capacitor (móvil, Fase B) |

**El backend es Supabase; Next.js es solo la interfaz.** Todo el acceso a datos
ocurre desde el navegador con `supabase-js`, y quien decide qué se ve es Row Level
Security. No se usan Server Components ni Server Actions: el paquete que Capacitor
mete en la app nativa es estático y no puede ejecutar código de servidor.
Ver [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md).

Una sola base de código: la app móvil es esta misma web empaquetada con Capacitor.
**No se agregan React Native, Flutter ni un segundo proyecto móvil.**

---

## Puesta en marcha

Requiere Node.js 20 o superior (probado en v22).

```bash
npm install
npm run dev
```

La app queda en <http://localhost:3000>.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm test` | Vitest, una pasada |
| `npm run test:watch` | Vitest en modo watch |
| `npm run db:check` | Comprueba que `.env.local` conecta con Supabase |
| `npm run db:types` | Regenera `src/types/database.types.ts` desde el esquema |
| `npm run test:rls` | RLS con usuarios reales (requiere `supabase start`) |
| `npm run test:registro` | Registro de extremo a extremo (requiere `supabase start`) |
| `npm run test:invitaciones` | Invitaciones de extremo a extremo |
| `npm run captura /login 360` | Captura una pantalla emulando un móvil real |
| `npm run test:seed` | Comprueba que los datos de prueba sirven |

### Datos de prueba

`npx supabase db reset` carga `supabase/seed.sql`: un gimnasio, un entrenador
independiente, 5 atletas con mediciones y evaluaciones, y las primeras reglas
sacadas de las fichas de Giovanni. Para el proyecto remoto, pegar ese archivo en
el SQL Editor de Supabase.

Todas las cuentas usan la contraseña `clave-de-prueba`:

| Correo | Rol |
|---|---|
| `admin@gioslab.test` | super_admin |
| `gimnasio@gioslab.test` | dueño del gimnasio |
| `ana@gioslab.test` | entrenadora del gimnasio |
| `diego@gioslab.test` | entrenador en el gimnasio **y** con alumnos propios |

Diego es el que permite probar el selector de espacio de trabajo sin montar nada.

> `npm run typecheck` necesita los tipos de rutas que Next.js genera en `.next/types/`.
> En un clon recién hecho, corre `npm run build` (o `npm run dev`) una vez antes.
> `npm run build` ya verifica TypeScript por su cuenta.

### Variables de entorno

```bash
cp .env.example .env.local
```

Los valores salen de Supabase → *Project Settings* → *API*:

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon / publishable) |

Con eso, `npm run db:check` confirma que la conexión funciona.

`.env.local` **nunca** se commitea; `.env.example` sí, y va sin valores.
La clave de servicio (`service_role` / secret) **se salta RLS por completo**: no va
en ningún archivo con prefijo `NEXT_PUBLIC_` ni se usa desde el navegador.

---

## Estructura

```
src/
├── app/                  Rutas (App Router)
│   ├── (auth)/           Login, registro, recuperar contraseña      → 1.5
│   └── (app)/            Área autenticada, shell móvil              → 1.8
├── components/
│   ├── ui/               Primitivas de shadcn/ui                    → 1.8
│   └── shared/           Componentes propios reutilizables
├── domain/               ⭐ Núcleo de negocio — puro, sin framework
│   ├── calculations/     Somatotipo, 1RM, ratios de palanca         → 2.6, 2.7
│   ├── rules-engine/     Motor evaluador de reglas                  → 3.2
│   └── types/            Tipos del dominio
├── lib/
│   ├── supabase/         Clientes de browser y de servidor          → 0.2
│   └── validation/       Esquemas Zod
└── types/                Tipos generados por Supabase               → 0.2

tests/unit/               Tests unitarios y golden tests
supabase/migrations/      Migraciones SQL                            → 1.1+
scripts/                  Utilidades de línea de comandos
docs/                     Plan de tareas y documentación
```

### Por qué `src/domain/` está aparte

Los cálculos antropométricos y el motor de reglas son el activo central del negocio.
Se escriben como **funciones puras con tests unitarios**, y por eso no pueden importar
React, Next ni el cliente de Supabase: si lo hicieran, los tests dejarían de ser puros
y el núcleo quedaría atado a la UI.

Esa frontera está **verificada por ESLint** (`no-restricted-imports` sobre
`src/domain/**`), no confiada a la disciplina. Correr `npm run lint` la hace fallar si
alguien la cruza.

Dos principios más que gobiernan este directorio:

- **Las reglas biomecánicas son datos, no código.** Viven en la base de datos como JSON
  versionado, con su justificación y nivel de evidencia. Nunca se escribe una regla
  biomecánica dentro de un `if` de TypeScript.
- **Los cálculos deben coincidir con los Excels de Giovanni.** Si el resultado difiere,
  el Excel tiene la razón hasta que él diga lo contrario.

---

## Convenciones

**Commits:** `tipo(módulo): N.N descripción` — donde `N.N` es el número de tarea de
`docs/TAREAS-FASE-A.md`.

```
feat(wizard): 2.3 paso de antropometría con validación
fix(rules): 3.2 corregir evaluación de condiciones anidadas
test(calc): 2.6 golden tests de somatotipo contra Excel
```

**Definición de terminado:** funciona en móvil (360px) y en escritorio, tiene tests si
involucra cálculos o reglas, no rompe nada previo, está commiteado, y cumple el criterio
escrito en la tarjeta.

**Móvil primero, de verdad:** el entrenador llena la evaluación de pie en el piso del
gimnasio, con una mano y con mala señal. Teclado numérico donde corresponda, objetivos
táctiles de mínimo 44px, áreas seguras respetadas, pasos cortos y borradores guardados.

Para comprobarlo: `npm run captura /login 360`. Emula un móvil de verdad y reporta
desborde horizontal, objetivos táctiles por debajo de 44px y si la app está mostrando un
error. `--window-size` de Chrome **no** sirve: macOS impone un ancho mínimo de ventana y
el layout se calcula a ~500px aunque la imagen salga a 360.

---

## Datos sensibles

La plataforma captura lesiones, antecedentes clínicos y composición corporal: son datos
sensibles bajo la **Ley 1581 de 2012 (Colombia)**. Consentimiento expreso al crear un
atleta, aislamiento estricto entre tenants vía Row Level Security, y claves de servicio
de Supabase solo en servidor. Privacidad por diseño desde el MVP.

---

© GiosLab System® — repositorio privado.
