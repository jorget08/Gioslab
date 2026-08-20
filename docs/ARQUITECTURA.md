# Arquitectura: dónde vive el backend

> Decisión tomada el **2026-08-19**, antes de construir el wizard del grupo 2.
> No reabrir sin motivo nuevo.

---

## La decisión

**Supabase es el backend. Next.js es solo la interfaz.**

```
┌──────────────────────────────┐
│  Next.js (interfaz)          │   Un solo cliente: la web ES la app móvil,
│  · React, formularios, rutas │   empaquetada con Capacitor (CLAUDE.md §2)
│  · supabase-js desde el      │
│    navegador                 │
└──────────────┬───────────────┘
               │ HTTPS
┌──────────────▼───────────────┐
│  Supabase (backend)          │   34 políticas RLS · 17 triggers · 8 funciones
│  · Postgres + RLS            │   Aquí vive TODA la lógica que protege datos
│  · Auth · Storage            │
│  · Edge Functions (cuando    │
│    haga falta servidor)      │
└──────────────────────────────┘

src/domain/  ← cálculos y motor de reglas, SIN framework.
               Corre en navegador, en móvil o en una Edge Function.
               ESLint impide que importe React, Next o Supabase.
```

## Por qué, y no un backend aparte

Un servicio propio duplicaría lo que RLS ya hace, sería otro despliegue que
asegurar y mantener con 12–15 h semanales de un solo desarrollador, y `CLAUDE.md`
§8 excluye microservicios explícitamente.

Cuando aparezca trabajo que **exija** servidor —generar el PDF, enviar correos de
invitación, importar la biblioteca por CSV— van a **Supabase Edge Functions**: es
código de servidor desplegable y accesible desde cualquier cliente, sin operar un
servicio extra.

## Por qué no Server Components ni Server Actions

**Capacitor empaqueta archivos estáticos en un contenedor nativo. Los Server
Components necesitan un servidor Node corriendo. Son incompatibles.**

Las dos alternativas se descartaron:

- **Que Capacitor apunte a la URL de Vercel.** La app dejaría de funcionar sin
  señal, y `CLAUDE.md` §3.3 pone *"con mala señal"* como condición de diseño.
  Además Apple rechaza con frecuencia apps que son solo un navegador envuelto
  (guideline 4.2), y el modo sin conexión del backlog quedaría descartado.
- **Decidirlo en Fase B.** Serían 58 h de wizard escritas con el patrón
  equivocado.

`next.config.ts` fija `output: "export"`, así que **el build falla si alguien
introduce código de servidor**. La restricción se comprueba sola, no depende de
acordarse.

## Qué cambia esto en la seguridad

**Nada.** Las 34 políticas de RLS se aplican igual venga la consulta de donde
venga: no distinguen si el `select` sale de un servidor o de un navegador. La
clave pública viaja al cliente por diseño y lo único que protege los datos es RLS
— por eso se probó tan a fondo en la 1.4, con un usuario real por rol.

Lo que sí cambia es **dónde se comprueban los permisos de navegación**:

| | Antes | Ahora |
|---|---|---|
| ¿Hay sesión? | `proxy.ts` en el servidor | `<Guarda>` en el cliente |
| ¿Este rol puede entrar? | `requerirRol()` en el servidor | `<Guarda roles={[...]}>` |
| ¿Qué filas ve? | **RLS** | **RLS** (sin cambios) |

> La guarda del cliente es **navegación, no seguridad**. Quien desactive el
> JavaScript llega a la pantalla — y se encuentra con que no hay ni una fila.
> La barrera real sigue en Postgres, donde no se puede rodear.

## Consecuencias que hay que tener presentes

**Rutas dinámicas.** El exportado estático no puede pre-generar `/atletas/[id]`
sin conocer los ids en tiempo de compilación. Para el detalle de un atleta se usa
un parámetro de consulta (`/atletas?id=…`) o una ruta comodín que lea el id en
tiempo de ejecución. **A tener en cuenta al diseñar el wizard.**

**No hay pruebas HTTP de la protección de rutas.** Antes se verificaba con
peticiones y códigos de estado. Ahora la guarda corre en el navegador, así que
haría falta un navegador de verdad (Playwright) para probarla. Mientras tanto la
cobertura es:

- El mapa de permisos: 35 tests unitarios en `domain/autorizacion`
- El acceso a datos: 21 comprobaciones de RLS con usuarios reales (`npm run test:rls`)

Lo segundo es lo que importa. Vale la pena añadir Playwright cuando el wizard
exista y haya flujos largos que probar.

**Sin renderizado en servidor** no hay SEO ni primer pintado con datos. Da igual:
es una aplicación privada tras autenticación, no un sitio público.
