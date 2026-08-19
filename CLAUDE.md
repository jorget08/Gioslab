# GiosLab System — Contexto del proyecto

> Este archivo lo lee Claude Code automáticamente al inicio de cada sesión.
> Manténlo actualizado: si cambia una decisión técnica, se edita aquí.

---

## 1. Qué estamos construyendo

**GiosLab System®** es una plataforma SaaS B2B que automatiza la prescripción de
entrenamiento de fuerza a partir de **biomecánica y antropometría individual**.

El diferencial: no es otra app de rutinas prefabricadas. Es un **motor de decisión
metodológico** que selecciona o excluye ejercicios según la estructura corporal real
del atleta (longitud de fémur, dorsiflexión de tobillo, movilidad de cadera/hombro,
somatotipo, clasificación de patrones de movimiento).

Ejemplo de la lógica que implementamos:

```
SI (femur_length == 'Largo' AND ankle_dorsiflexion == 'Limitada')
ENTONCES priorizar('Sentadilla Barra Alta con Tacón', 'Prensa 45°')
         despriorizar('Sentadilla Barra Baja Tradicional')
         justificación: "...", nivel_evidencia: "criterio_profesional"
```

**Formato del producto:** aplicación móvil (App Store y Google Play) + panel web para
entrenadores, gimnasios y administración. Ver sección 2 para la decisión técnica.

**Origen del método:** Giovanni Quiroz (socio metodológico, profesional en ciencias
del deporte) ya presta este servicio manualmente con hojas de Excel a 10–30
entrenadores que le pagan. **Esos Excels son la especificación funcional del motor.**
No estamos inventando la lógica: la estamos traduciendo y sistematizando.

**Estructura societaria:** SAS, 60% Giovanni (metodología, marca, comercial) /
40% Jorge (desarrollo). Vesting por hitos entregados.

### Usuarios y roles (4 niveles)

| Rol | Qué hace |
|---|---|
| `super_admin` | Opera la plataforma: gimnasios, planes, métricas globales |
| `gym` | Administra su cadena de entrenadores, ve trazabilidad |
| `trainer` | Evalúa atletas, genera y ajusta rutinas, exporta PDF |
| `client` | Ve su rutina, registra sesiones y RPE (Fase B) |

Jerarquía de datos: **gym → trainer → athlete**. Un entrenador puede existir sin
gimnasio (plan individual).

---

## 2. Stack técnico (decidido, no re-discutir sin motivo)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/BD:** Supabase (Postgres + Auth + Storage + RLS)
- **Validación:** Zod + React Hook Form
- **Tests:** Vitest (unitarios, sobre todo cálculos y motor de reglas)
- **PDF:** decisión pendiente en tarea 5.1 (React-PDF vs. Gotenberg/WeasyPrint)
- **Despliegue:** Vercel (web) — móvil vía **Capacitor** en Fase B
- **Pagos (Fase B):** Wompi o Mercado Pago (Stripe NO opera para comercios
  colombianos). Vender suscripciones **por la web, nunca dentro de la app iOS**,
  para no ceder 15–30% de comisión a Apple.

**Una sola base de código.** GiosLab **es una aplicación móvil** publicada en App Store
y Google Play, más un panel web para entrenadores y administración. Ambos salen del
mismo código: la app móvil es la web empaquetada con **Capacitor** en un contenedor
nativo (ícono propio, pantalla completa sin barra de navegador, push, cámara,
almacenamiento offline).

**Decisión de arquitectura registrada — no reabrir sin motivo nuevo.** Se evaluó
React Native/Expo con panel web aparte y se descartó: obliga a mantener dos bases de
código (el editor de reglas, el super admin y los PDFs necesitan web de todas formas),
suma 250–400 h y no aporta diferencia perceptible para este tipo de producto
(formularios, listas, tablas, PDFs). Nativo puro solo se justificaría con análisis de
video en tiempo real o wearables en segundo plano, ambos fuera de alcance.

**No proponer React Native, Flutter, ni un segundo proyecto móvil.**

---

## 3. Principios de arquitectura (innegociables)

### 3.1 Las reglas son DATOS, no código
La matriz de condicionales es el activo central del negocio. Vive en la base de
datos como JSON versionado, con su justificación y nivel de evidencia. Giovanni
debe poder editarla desde una interfaz sin tocar código ni pedirme un despliegue.
**Nunca hardcodear una regla biomecánica en un `if` de TypeScript.**

### 3.2 Multi-tenant desde el día uno
Toda tabla de negocio lleva `tenant_id` (o cadena de pertenencia verificable) y
está protegida por **Row Level Security** en Supabase. Cada gimnasio, entrenador y
cliente ve exclusivamente lo suyo. Se prueba con un usuario real por rol; no se
asume que RLS funciona sin verificarlo.

### 3.3 Móvil primero, de verdad
El entrenador llena la evaluación **de pie, en el piso del gimnasio, con una mano,
con mala señal**. Teclado numérico donde corresponda, botones grandes, pasos cortos,
guardado de borradores. Si algo se ve bien en desktop pero es incómodo en un celular
de 360px, está mal hecho.

**Listo para Capacitor desde Fase A.** Aunque el empaquetado móvil ocurre en Fase B,
el código de Fase A se escribe ya pensando en que correrá dentro de una app nativa:

- Respetar áreas seguras (`env(safe-area-inset-*)`) para notch y barra inferior.
- Nada que dependa de `window.open`, ventanas emergentes o descargas del navegador
  sin una alternativa nativa prevista.
- Transiciones entre pantallas propias, no el comportamiento por defecto del navegador.
- Desactivar selección de texto y el resaltado azul al tocar en elementos de interfaz.
- Objetivos táctiles de mínimo 44px; `inputMode` correcto en cada campo numérico.
- Estado y navegación que sobrevivan a que el sistema operativo suspenda la app.

La diferencia entre una app que "se siente nativa" y una que "se siente página web"
está en estos detalles, no en la tecnología elegida.

### 3.4 Los cálculos deben coincidir con los Excels
Somatotipo Heath-Carter, 1RM estimado y ratios de palanca se implementan como
**funciones puras con tests unitarios**, usando casos reales de Giovanni como
"golden tests". Si el resultado no coincide con su Excel, **el Excel tiene la razón**
hasta que él diga lo contrario.

### 3.5 Historial, nunca sobreescritura
Las mediciones antropométricas se versionan por fecha. Jamás se pisa una evaluación
anterior: el valor del producto está en mostrar la evolución del atleta.

### 3.6 Transparencia del motor
Cuando el motor selecciona o excluye un ejercicio, la interfaz muestra **qué regla
aplicó y por qué**. El sistema es un copiloto: el entrenador siempre decide y puede
sobreescribir. Esa transparencia es lo que genera confianza profesional.

### 3.7 Datos sensibles de salud
Capturamos lesiones, antecedentes clínicos y composición corporal: son **datos
sensibles bajo la Ley 1581 de 2012 (Colombia)**. Consentimiento expreso al crear un
atleta, política de tratamiento, y jamás exponer datos de un tenant a otro. Privacidad
por diseño desde el MVP; adaptarla después cuesta mucho más.

---

## 4. Modelo de datos (entidades principales)

```
gyms                (id, name, plan, created_at)
users               (id, email, role, gym_id?, created_at)         -- 4 roles
athletes            (id, trainer_id, gym_id?, name, age, gender, height_cm,
                     weight_kg, activity_level, consent_at)
anthropometric_measurements  (id, athlete_id, measured_at, pliegues..., perímetros...,
                     somatotype_endo/meso/ecto)                    -- versionado
biomech_evaluations (id, athlete_id, evaluated_at, femur_length, humerus_length,
                     torso_length, ankle_dorsiflexion, hip_mobility, shoulder_mobility,
                     pattern_classifications jsonb)                -- Eficiente/Compensada/De Riesgo
exercise_library    (id, name, target_muscle, movement_pattern, biomechanical_type,
                     contraindications, media_urls)
exercise_variants   (exercise_id, variant_exercise_id, relation_type)
rules               (id, version, condition jsonb, actions jsonb, justification,
                     evidence_level, is_active, created_by, created_at)
workout_plans       (id, athlete_id, trainer_id, periodization_type, duration_weeks,
                     plan_data jsonb, generated_pdf_url)
```

Ajustar según lo que salga del diagrama ER (tarea 0.4), pero respetando los
principios de la sección 3.

---

## 5. Plan de trabajo

Las tareas están en **`docs/TAREAS-FASE-A.md`**, numeradas en orden de ejecución
(0.1, 0.2, 1.1, 1.2...). Espejo del tablero de monday.com del proyecto.

**Fase A = herramienta interna** (≈290 h): evaluación + motor + biblioteca + PDF.
Al terminarla, Giovanni abandona los Excels y opera con la plataforma. Es un hito de
vesting, así que **la Fase A debe quedar completa y usable antes de tocar Fase B**.

**Fase B = SaaS completo**: generador de rutinas, portal del cliente, dietas, pagos,
super admin, publicación en tiendas. Se desglosa cuando lleguemos.

**Ritmo real:** trabajo nocturno y de fin de semana, 12–15 h por semana. Optimiza
para sesiones cortas: prefiero cerrar una tarea completa y funcionando que dejar tres
a medias.

---

## 6. Convenciones de trabajo

### Commits
Formato: `tipo(módulo): N.N descripción`
Ejemplos:
```
feat(wizard): 2.3 paso de antropometría con validación
fix(rules): 3.2 corregir evaluación de condiciones anidadas
test(calc): 2.6 golden tests de somatotipo contra Excel
```
Commits pequeños y frecuentes. El historial es la evidencia de mi aporte a la
sociedad, así que importa que sea limpio y trazable.

### Definición de "terminado"
Una tarea está hecha cuando: funciona en móvil (360px) y desktop, tiene tests si
involucra cálculos o reglas, no rompe nada previo, está commiteada, y **el criterio
de terminado escrito en la tarjeta se cumple**.

### Cómo quiero que trabajemos
- **Una tarea a la vez**, en orden numérico. Si detectas que una tarea depende de
  otra que aún no está, avísame antes de improvisar.
- **Antes de escribir código:** explica brevemente el plan (archivos que vas a tocar,
  enfoque). Si el plan tiene un supuesto fuerte, pregúntame en lugar de asumir.
- **Explícame lo que no sea obvio.** Estoy construyendo esto solo y necesito entender
  todo el código porque tendré que mantenerlo yo.
- **No sobre-ingenierías.** MVP, no arquitectura de Google. Si algo se puede resolver
  simple y correcto, va simple.
- **No inventes datos de dominio.** Si falta una regla, un valor de referencia o una
  fórmula, pregunta: la fuente es Giovanni, no tu criterio ni el mío.
- Al terminar una tarea, sugiéreme el mensaje de commit y dime cuál sigue.

### Seguridad y secretos
- `.env.local` **nunca** se commitea. Verificar `.gitignore` desde el primer commit.
- Claves de servicio de Supabase solo en servidor, jamás en el cliente.
- Repositorio privado. Está a mi nombre hasta que exista la SAS; luego se transfiere
  a la sociedad.

### Restricción legal personal
Trabajo tiempo completo en otra empresa. Este proyecto se desarrolla **exclusivamente
fuera de horario laboral y sin equipos, cuentas ni licencias de esa empresa**.

---

## 7. Bloqueos que dependen de Giovanni

Si una tarea necesita algo de esta lista y no está disponible, no la fuerces:
avísame y pasamos a la siguiente tarea desbloqueada.

- Excels con la matriz completa de condicionales (bloquea 0.5 y todo el grupo 3)
- Assets de marca: logo, colores, plantilla de reporte (bloquea grupo 5)
- Listado y medios de la biblioteca de ejercicios (bloquea 4.5)
- Casos reales de atletas para validar cálculos (bloquea 2.10)

---

## 8. Fuera de alcance por ahora

No proponer ni construir, salvo que yo lo pida explícitamente:
análisis de video con IA o visión artificial, integración con wearables,
base de alimentos con macros automáticos, multi-idioma, apps nativas separadas,
microservicios, Kubernetes, o cualquier cosa que no esté en `docs/TAREAS-FASE-A.md`.

Las ideas nuevas se anotan en el backlog de monday.com, no se implementan sobre la
marcha.
