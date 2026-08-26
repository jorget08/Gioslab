# GiosLab — Tareas Fase A (herramienta interna)

Espejo del tablero de monday.com. **Se ejecutan en orden numérico.**
Estados: `[ ]` por hacer · `[~]` en progreso · `[?]` esperando a Giovanni · `[x]` hecho

Estimado total Fase A: ≈290 h de programación enfocada (≈5–7 meses a 12–15 h/semana).
Cada tarea está dimensionada para 1–2 sesiones nocturnas.

---

## 🧱 Grupo 0 — Preparación técnica (23 h)

- [x] **0.1 Crear repo privado + proyecto Next.js con Tailwind** (3 h)
  Repo privado en GitHub, Next.js con TypeScript y Tailwind, README, estructura de
  carpetas, `.gitignore` correcto. *Terminado:* la app corre en local.

- [x] **0.2 Crear proyecto Supabase (dev) y conectarlo** (2 h)
  Postgres + Auth + Storage. Variables de entorno, cliente conectado desde la app.

- [x] **0.3 Configurar despliegue automático (Vercel, entorno dev)** (2 h)
  Cada push a `main` despliega. *Terminado:* URL de pruebas para mostrarle avances a
  Giovanni desde el celular.

- [x] **0.4 Diseñar el modelo de datos completo (diagrama ER)** (4 h)
  Diagrama completo antes de escribir migraciones: gyms → trainers → athletes,
  evaluaciones versionadas, ejercicios, reglas, planes. Ahorra retrabajos.

- [x] **0.5 Documentar la matriz de reglas desde los Excels (spec v1)** (12 h)
  Traducir cada condicional a: condición → acción → justificación → nivel de evidencia.
  Insumo directo del grupo 3. *Requiere:* Excels + sesión grabada con Giovanni.

---

## 🗄️ Grupo 1 — Base de datos y autenticación (43 h)

- [x] **1.1 Migraciones: gyms, trainers, athletes (multi-tenant)** (4 h)
  Con `tenant_id` y campos de auditoría (`created_at`, `updated_at`, `created_by`).

- [x] **1.2 Migraciones: evaluaciones y mediciones con historial** (4 h)
  Versionadas por fecha. Nunca sobreescribir una medición anterior.

- [x] **1.3 Migraciones: biblioteca de ejercicios, reglas y planes** (4 h)
  `exercise_library`, `rules` (JSON versionado), `workout_plans`.

- [x] **1.4 Seguridad RLS por rol y tenant** (6 h)
  Row Level Security en Supabase. Probar con un usuario real por cada rol.
  Crítico: datos sensibles de salud (Ley 1581).

- [x] **1.5 Registro, login y recuperación de contraseña** (5 h)
  Supabase Auth + correos + formularios validados con Zod.

- [x] **1.6 Roles y protección de rutas (4 roles)** (6 h)
  `super_admin`, `gym`, `trainer`, `client`. Middleware que bloquea rutas y acciones.

- [x] **1.7 Invitaciones por correo (gym → entrenador → cliente)** (6 h)
  Token por correo, aceptación y vinculación al tenant correcto.

- [x] **1.8 Layout base de la app (móvil primero)** (6 h)
  Navegación, menú y shell responsive. Prueba de fuego: usarlo en el celular.
  Aplicar desde aquí las reglas de "listo para Capacitor" del `CLAUDE.md` §3.3:
  áreas seguras, objetivos táctiles de 44px, sin selección de texto en la interfaz,
  transiciones propias.

- [x] **1.9 Datos de prueba (seeds)** (2 h)
  1 gimnasio, 2 entrenadores, 5 atletas ficticios.

---

## 🧙 Grupo 2 — Wizard de evaluación (58 h)

- [x] **2.1 Boceto UX del wizard (pasos y validaciones)** (4 h)
  Papel o Figma. Pasos, campos obligatorios, validaciones y mensajes de error
  definidos **antes** de codificar.

- [x] **2.2 Paso 1: perfil y anamnesis** (6 h)
  Datos personales, historial, lesiones previas, objetivos jerarquizados,
  consentimiento de datos.

- [x] **2.3 Paso 2: antropometría** (8 h)
  Talla, peso, pliegues, perímetros, diámetros. Teclado numérico, flujo rápido:
  se llena de pie en el gimnasio.

- [x] **2.4 Paso 3: segmentos óseos y proporciones** (4 h)
  Fémur, húmero, torso + cálculo automático de ratios de palanca.

- [x] **2.5 Paso 4: movilidad** (6 h)
  Seis tests de ROM con derivación en vivo de `Restringido/Óptimo`. **Sin bloque
  de patrones:** Giovanni aclaró que Eficiente/Compensada/De Riesgo es salida del
  motor por ejercicio, no algo que clasifique el entrenador (MÓDULO 02). Este
  paso cierra la evaluación biomecánica: inserta la fila con lo del paso 3.

- [?] **2.6 Cálculo de somatotipo Heath-Carter (+ golden tests)** (8 h)
  **Bloqueada por contradicción.** Su módulo 01 confirma Jackson & Pollock —ya
  implementado y verificado al decimal contra su Excel— pero su documento de
  recomendaciones vuelve a pedir Heath-Carter. Pregunta A de PREGUNTAS-GIOVANNI.

- [?] **2.7 Cálculo de 1RM estimado y relaciones de palanca** (5 h)
  Fórmula confirmada (Epley), pero necesita telemetría por serie —peso levantado
  y repeticiones— que solo existe con el registro de sesiones, en Fase B.

- [x] **2.8 Guardado de borradores del wizard** (5 h)
  Retomar una evaluación a medias sin perder datos. La realidad del gimnasio son
  las interrupciones.

- [x] **2.9 Ficha del atleta: resultados + historial** (8 h)
  Vista completa: resultados, somatotipo, clasificaciones, comparación entre fechas.

- [x] **2.11 Contraindicaciones en dos familias** (4 h) · *fuera del plan original*
  Anatómicas y sistémicas, catálogo cerrado en las dos puntas del cruce. Salió de
  la respuesta de Giovanni y destapó que `body_region` no tenía CHECK.

- [x] **2.12 Condiciones fisiológicas del atleta** (3 h) · *fuera del plan original*
  Embarazo, hipertensión, hernia, diástasis. Cierra el cruce: sin esto el motor
  sabía qué contraindica cada ejercicio pero no qué tiene cada persona.

- [x] **2.13 Registro del ciclo menstrual (FEMTECH)** (4 h) · *fuera del plan original*
  Faltaba la pantalla: la app solo LEÍA los registros. Con consentimiento aparte.

- [?] **2.10 Validación: atletas reales vs. Excels de Giovanni** (4 h)
  Giovanni carga 2–3 atletas reales; los resultados deben coincidir.
  *Criterio de salida del grupo 2.*

---

## ⚙️ Grupo 3 — Motor de reglas (el corazón) (58 h)

- [x] **3.1 Diseño del esquema de reglas en BD** (5 h)
  Gramática fijada en `src/domain/reglas.ts` y documentada en
  `docs/ESQUEMA-REGLAS.md`. Catálogo cerrado de hechos, operadores por tipo y
  acciones sacadas una a una de su matriz. La columna `nivel` codifica el orden
  de ejecución del motor, distinto de `evidence_level`, que desempata dentro de
  cada nivel.

- [ ] **3.2 Motor evaluador de reglas** (12 h)
  Evalúa condiciones sobre el perfil del atleta y produce selecciones/exclusiones.
  El núcleo del producto: tomarse el tiempo, hacerlo bien.

- [ ] **3.3 Carga de las reglas de los Excels a la BD** (8 h)
  Migrar la spec de la tarea 0.5. Al terminar, los Excels quedan oficialmente
  reemplazados como fuente de verdad.

- [ ] **3.4 Tests del motor con casos reales** (8 h)
  Batería de casos de Giovanni: entrada conocida → salida esperada.
  Protege contra regresiones al editar reglas.

- [ ] **3.5 Editor de reglas para Giovanni** (12 h)
  Listar, crear, editar, activar/desactivar sin tocar código.
  El usuario es Giovanni, no un programador: interfaz simple.

- [ ] **3.6 Versionado de reglas y registro de cambios** (5 h)
  Quién cambió qué y cuándo; poder volver a una versión anterior.

- [ ] **3.7 Salida del motor: ejercicios con justificación visible** (8 h)
  Mostrar **qué regla aplicó y por qué**. La transparencia genera confianza.

---

## 📚 Grupo 4 — Biblioteca de ejercicios (26 h)

- [x] **4.1 CRUD de ejercicios** (6 h)
  Nombre, músculo objetivo, patrón, tipo biomecánico, contraindicaciones.

- [ ] **4.2 Carga de fotos/videos** (6 h)
  Supabase Storage, compresión de imágenes, límite de tamaño para video.

- [ ] **4.3 Variantes y sustituciones entre ejercicios** (5 h)
  Relaciones que el motor usa para proponer alternativas.

- [x] **4.4 Buscador y filtros** (4 h)
  Búsqueda por texto y filtros plegables por patrón, músculo, equipo y
  contraindicación. El de contraindicaciones **excluye**: un entrenador busca lo
  que puede dar a un atleta con la rodilla mal, no la lista de lo prohibido.

- [x] **4.6 Identidad de marca GQ** (3 h) · *fuera del plan original*
  Rojo, dorado y negro muestreados de su logo y sus informes. Media entrega de
  los assets: faltan el logo en archivo y la plantilla de reporte.

- [?] **4.5 Importación masiva del contenido de Giovanni** (5 h)
  CSV. *Requiere:* listado v1 y medios de Giovanni.

---

## 📄 Grupo 5 — Reportes PDF (29 h)

- [ ] **5.1 Elegir e integrar el motor PDF** (4 h)
  React-PDF vs. Gotenberg/WeasyPrint según calidad tipográfica requerida.

- [?] **5.2 Plantilla PDF: ficha del atleta (marca GQ)** (8 h)
  *Requiere:* assets de marca.

- [ ] **5.3 Plantilla PDF: rutina prescrita** (8 h)
  Mesociclo, ejercicios, series, RIR y notas, en formato imprimible.

- [ ] **5.4 Generar, descargar y guardar PDFs** (5 h)
  Botón en ficha y en plan; PDF guardado y asociado al atleta.

- [?] **5.5 Ronda de ajustes de diseño con Giovanni** (4 h)
  Iterar hasta que él diga: "esto lo muestro orgulloso a un cliente".
  **El PDF es lo que vende el producto.**

---

## ✅ Grupo 6 — Cierre de Fase A (29 h)

- [ ] **6.1 Pruebas integrales del flujo completo** (8 h)
  Evaluación → motor → ejercicios → PDF, sin errores, en celular y computador.

- [ ] **6.2 Corrección de bugs del piloto interno** (8 h)
  Bolsa de tiempo. Siempre aparece algo.

- [?] **6.3 Migrar clientes de Giovanni + piloto con 2–3 entrenadores** (12 h)
  Adiós Excels. Operación real + feedback estructurado.

- [ ] **6.4 🏁 HITO: Fase A entregada — consolidar vesting** (1 h)
  Acta de entrega con Giovanni.

---

## 📦 Fase B (se desglosa al cerrar Fase A)

Generador y editor de rutinas · Portal/app del cliente · Dietas versión simple ·
Pasarela de pagos · Super admin · Empaquetado móvil y tiendas · QA final y lanzamiento.

## 💡 Backlog de ideas

Módulo completo de dietas · Video con evaluación humana · Autorregulación por RPE ·
Certificación GQ · Visión artificial · Wearables · Multi-idioma · Modo offline.
