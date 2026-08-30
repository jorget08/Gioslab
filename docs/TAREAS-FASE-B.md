# GiosLab — Tareas Fase B (el producto)

Espejo del tablero de monday.com. **Se ejecutan en orden numérico.**
Estados: `[ ]` por hacer · `[~]` en progreso · `[?]` esperando a Giovanni · `[x]` hecho

Estimado total Fase B: ≈285 h. A 12–15 h/semana, ≈5–6 meses después de cerrar
Fase A. Sumando las dos fases, el producto completo son ≈610 h.

**No se abre hasta que el hito 7.4 esté firmado.** Fase A es el vesting; abrir
esto antes es cambiar equity garantizado por trabajo especulativo.

---

## 0. De qué va Fase B

En Fase A, GiosLab es la herramienta con la que Giovanni deja los Excels: evalúa,
el motor decide, se genera un plan y sale un PDF. El destinatario final del
trabajo sigue siendo un archivo.

En Fase B el destinatario es **el atleta**, dentro de una app que lleva en el
bolsillo. Entra con su usuario, ve su rutina del día, registra lo que levantó,
controla su cuerpo, registra lo que comió y recibe informes que puede repreguntar.
El PDF pasa a ser una exportación, no el producto.

### La app de referencia

`/Users/antpack/Documents/personal/gymapp` es una app de Expo que Jorge construyó
para su propio entrenamiento y usa a diario. **Tiene el mismo estatus que los
Excels de Giovanni: es especificación funcional, no inspiración.** Hay decisiones
ahí que costaron errores reales y que se conservan literalmente. Se citan en cada
tarea donde apliquen.

Dos mitades, y conviene no confundirlas:

- **El dominio se porta casi tal cual.** `src/data/nutrition.ts`,
  `src/ai/report.ts`, `src/ai/chat.ts`, `src/data/glossary.ts` y
  `src/data/program.ts` son TypeScript puro sin React Native encima.
- **Las pantallas se reescriben.** Son `View`/`StyleSheet`; aquí son React +
  Tailwind. Se copia la UX, no el código.

Que `gymapp` sea Expo **no reabre la decisión de stack** del `CLAUDE.md` §2. Una
sola base de código, Next.js empaquetado con Capacitor.

### Tres decisiones nuevas de arquitectura

**B-a. Lo que el atleta registra es offline primero.** Un atleta anotando series
en el piso del gimnasio es exactamente el caso de `AsyncStorage` de `gymapp`.
Escribir directo a Supabase pierde datos con mala señal. Se decide en 8.2 y de ahí
en adelante manda: entreno, peso, medidas y comidas se escriben local y sincronizan
después. La evaluación del entrenador y el editor de reglas siguen en línea.

**B-b. La IA vive en el servidor, siempre.** En `gymapp` la clave de Gemini está
en el `.env` del dispositivo: correcto para un usuario, inadmisible en un SaaS.
Toda llamada pasa por una ruta de servidor con la clave del lado servidor
(`CLAUDE.md` §6). Y como es coste variable por atleta, lleva límite por plan desde
el primer día, no cuando llegue la factura.

**B-c. La nutrición y las fotos de comida son datos sensibles.** Ley 1581, igual
que las lesiones. Consentimiento aparte para nutrición, y las fotos se borran en
cuanto la IA las procesa — como ya hace `gymapp`.

---

## 📱 Grupo 8 — Cuenta del atleta y cimientos móviles (42 h)

- [ ] **8.1 Alta del atleta como usuario** (6 h)
  El rol `client` y su RLS existen desde 1.6 y `/mi-rutina` es hoy un cartel que
  dice "llega en Fase B". Aquí se conecta de verdad: el entrenador invita, el
  atleta acepta y queda vinculado a su ficha, no a una cuenta suelta.

- [ ] **8.2 Capa de datos offline primero + sincronización** (16 h)
  La decisión B-a hecha código. Escritura local, cola de sincronización,
  resolución de conflictos y un indicador honesto de qué está sincronizado y qué
  no. **Es la tarea de mayor riesgo de toda la fase**: si se hace después, hay que
  reescribir todas las pantallas del atleta.

- [ ] **8.3 Shell de la app del atleta** (8 h)
  Pestañas Entreno / Guía / Comida / Cuerpo / Progreso, calcadas de `gymapp`.
  Estado y navegación que sobrevivan a que el sistema suspenda la app (§3.3).

- [ ] **8.4 Empaquetado con Capacitor, corriendo en dispositivo** (12 h)
  Build de iOS y Android instalada en un teléfono real. **Todavía no son las
  tiendas** (eso es 14.4): es la prueba de que la decisión de §2 se sostiene.
  Aquí se pagan de golpe las deudas de §3.3 que se hayan colado en Fase A.

---

## 🏋️ Grupo 9 — Entreno (40 h)

Desbloquea la tarea 2.7 de Fase A: sin registro de series no hay 1RM estimado.

- [ ] **9.1 Mi rutina: semanas, días y el día de hoy** (8 h)
  Consume el plan del grupo 5. `WeeksScreen`/`WeekScreen` de `gymapp` son el molde.

- [ ] **9.2 Tarjeta de ejercicio** (8 h)
  Video, series × reps, descanso, calentamiento, RPE y técnica de intensidad con
  su explicación. Ver `src/components/ExerciseCard.tsx`.

- [ ] **9.3 Registro de series con última marca** (10 h)
  Peso y repeticiones por serie, y qué levantó la última vez.
  **Regla que no se negocia, y viene de `LogStore.tsx`: el peso solo es comparable
  contra la MISMA variación.** 80 kg en máquina no son 80 kg con mancuernas, y
  mezclarlos convierte el historial en ruido. Por eso el historial se parte en
  `same` y `other`.

- [ ] **9.4 Temporizador de descanso con notificaciones** (6 h)
  Tiene que sonar con la pantalla apagada o el atleta no lo usa. Ver
  `RestTimer.tsx` y `notifications/restNotifications.ts`.

- [ ] **9.5 Cambiar a una sustitución en plena sesión** (4 h)
  La máquina está ocupada. El plan B ya viene aprobado por el motor desde 5.5:
  el atleta elige entre alternativas seguras, no inventa.

- [ ] **9.6 Notas de sesión y cierre del día** (4 h)
  Incluye dolor o molestia reportada, que alimenta las alertas del grupo 13.

---

## ⚖️ Grupo 10 — Control corporal (24 h)

- [ ] **10.1 Peso y media móvil** (6 h)
  Se muestra la tendencia, no el dato crudo: la báscula sube dos kilos por sal y
  un atleta abandona por eso.

- [ ] **10.2 Medidas y perímetros desde la app** (5 h)
  Reusa el catálogo de 2.14, ahora capturado por el atleta.
  `BodyStore.tsx`: la cintura es la que distingue recomposición del estancamiento.

- [ ] **10.3 Gráficos de tendencia** (6 h)
  `LineChart.tsx` de `gymapp` es propio y sin dependencias: se porta.

- [ ] **10.4 Fotos de progreso** (5 h)
  Supabase Storage, privadas por RLS. Datos sensibles: consentimiento explícito.

- [ ] **10.5 Sueño y actividad** (2 h)
  **Las calorías del reloj se guardan pero NO se suman al objetivo** — los
  smartwatches sobreestiman el gasto entre 30% y 90% y comerte de vuelta lo que
  marca el reloj se come el déficit. Sirven para correlacionar, no para sumar.

---

## 🍳 Grupo 11 — Nutrición (42 h)

Ordenado a propósito para que **el entreno siga siendo usable aunque la IA se
retrase**: 11.1 a 11.3 no dependen de ninguna llamada a un modelo.

- [?] **11.1 Método de nutrición de Giovanni (spec)** (6 h)
  **Bloqueada.** El `profile` de `gymapp` está calibrado para una persona con un
  objetivo (recomposición, déficit 22%). Aquí sale del atleta y del plan. Hace
  falta: cómo calcula él las calorías objetivo, proteína por kilo, cómo cambia
  según el objetivo (fuerza, hipertrofia, pérdida de grasa) y qué hace en día de
  competencia. Mismo trato que la matriz: se documenta antes de programarse.

- [ ] **11.2 Objetivos dinámicos por atleta** (8 h)
  Porta `data/nutrition.ts`. Dos ideas suyas que se conservan: el **déficit como
  porcentaje del gasto y no fijo** (en kcal fijas, el recorte pesa cada vez más
  sobre un cuerpo más pequeño y se lleva el músculo justo al final), y que a los
  ~14 días de registro el objetivo pasa de la fórmula de población al **gasto real
  medido con los datos del propio atleta**.

- [ ] **11.3 Registro de comidas por foto y por texto** (10 h)
  Sin fricción: una foto o "2 cucharadas de yogurt griego". Nada de buscar en un
  catálogo. La foto se borra en cuanto se procesa (B-c).

- [ ] **11.4 Resolución de macros con IA, en servidor** (12 h)
  Ruta de servidor, clave del lado servidor, reintentos, y estado visible por
  entrada (`pending` / `resolving` / `estimated` / `resolved`). Límite de llamadas
  por plan desde el primer día.

- [ ] **11.5 Memoria de alimentos por atleta** (6 h)
  **La memoria es lista de referencia, no calculadora.** `FoodStore.tsx` lo
  documenta como cicatriz: cuando dividía los macros devueltos entre la cantidad
  leída del texto, la IA contestó los macros de UN huevo a un texto que decía "4
  huevos" y la memoria guardó un cuarto de huevo — y ese número entró como
  referencia de ahí en adelante. Los macros vienen SIEMPRE de la IA y viajan
  pegados a su `amount`.

---

## 📊 Grupo 12 — Informes con IA y chat (30 h)

- [ ] **12.1 Recolección de datos del periodo** (6 h)
  Días, sesiones, medidas e informes anteriores. `storage/useReportData.ts`.

- [ ] **12.2 Informe semanal y mensual** (12 h)
  Porta `ai/report.ts`. **Dos alcances con resoluciones distintas a propósito:**
  el semanal va comida por comida porque a 7 días el patrón está en los días; el
  mensual resume por semana con una línea diaria, que deja ver patrones de
  calendario ("todos los domingos te disparas") sin ahogarse en detalle.
  Regla del prompt que no se toca: **un dato que falta no es un cero.**

- [ ] **12.3 Chat sobre el informe** (8 h)
  El informe contesta lo que el entrenador consideró importante; el chat contesta
  lo que al atleta le quedó dando vueltas. Por eso la respuesta viaja con los
  **mismos datos crudos** del informe: sin ellos es un consejo de internet.

- [ ] **12.4 Historial de informes y auditoría de acciones** (4 h)
  Cada informe nuevo ve lo que prometió el anterior y comprueba si se cumplió.

---

## 🧑‍🏫 Grupo 13 — El entrenador sobre datos reales (24 h)

Aquí se cierra el círculo: hasta ahora Giovanni prescribía a ciegas y esperaba
al siguiente control. Con el atleta registrando, ve lo que pasa entre sesiones.

- [ ] **13.1 Adherencia por atleta** (8 h)
  Sesiones hechas contra prescritas, series completadas, días de comida
  registrados. Ordenado por quién necesita una llamada hoy.

- [ ] **13.2 Alertas** (8 h)
  Sesiones perdidas, peso estancado, **dolor reportado en 9.6** y cargas que no
  progresan. La de dolor es la que más importa: es la que puede evitar una lesión.

- [ ] **13.3 Informe del entrenador** (8 h)
  Distinto del informe del atleta: aquí se le sugiere a Giovanni **qué ajustar en
  el plan**, con el motor y la matriz de por medio.

---

## 💳 Grupo 14 — Negocio (50 h)

- [ ] **14.1 Planes, límites y facturación** (6 h)
  Incluye el tope de llamadas a IA por plan. Nutrición e informes son el plan
  superior: son los que cuestan dinero por usuario.

- [ ] **14.2 Pasarela de pagos** (16 h)
  Wompi o Mercado Pago. Stripe no opera para comercios colombianos.
  **Se vende por la web, nunca dentro de la app de iOS**, para no ceder 15–30% a
  Apple (`CLAUDE.md` §2).

- [ ] **14.3 Super admin** (12 h)
  Gimnasios, planes, métricas globales, uso de IA y costes.

- [ ] **14.4 Publicación en App Store y Google Play** (16 h)
  Fichas, capturas, política de privacidad, revisión. Apple pregunta por los datos
  de salud y por la compra fuera de la app: las dos respuestas se preparan antes
  de enviar, no durante el rechazo.

---

## 🚀 Grupo 15 — Lanzamiento (33 h)

- [ ] **15.1 Política de tratamiento de datos y consentimientos** (8 h)
  Ley 1581 con el alcance ya completo: lesiones, composición corporal, ciclo
  menstrual, nutrición y fotos. Retención y borrado incluidos.

- [ ] **15.2 Pruebas integrales entrenador ↔ atleta** (10 h)
  Evaluar → motor → plan → app del atleta → registro → informe → ajuste. En
  dispositivo real y con mala señal, que es el escenario de verdad.

- [ ] **15.3 Piloto con atletas reales de Giovanni** (10 h)
  Sus clientes, no ficticios. Feedback estructurado.

- [ ] **15.4 🏁 HITO: GiosLab publicado** (5 h)

---

## 💡 Backlog

Dietas con base de alimentos propia · Video con evaluación humana ·
Autorregulación por RPE · Certificación GQ · Visión artificial · Wearables ·
Multi-idioma.
