# GiosLab — Tareas Fase A (herramienta interna)

Espejo del tablero de monday.com. **Se ejecutan en orden numérico.**
Estados: `[ ]` por hacer · `[~]` en progreso · `[?]` esperando a Giovanni · `[x]` hecho

Estimado total Fase A: ≈331 h de programación enfocada. Van ≈203 h hechas;
quedan ≈128 h, que a 12–15 h/semana son ≈9–11 semanas.
Cada tarea está dimensionada para 1–2 sesiones nocturnas.

> **Reconfigurado el 29-ago.** Se añadió el grupo 5 (generador de rutinas), el
> grupo de PDF se redujo y pasó a 6, y el cierre a 7. El motivo está escrito en
> la cabecera del grupo 5. Fase B dejó de ser una nota al pie: vive en
> `docs/TAREAS-FASE-B.md`.

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

- [x] **2.6 Cálculo de composición corporal (+ golden tests)** (8 h)
  **Desbloqueada el 2-sep: confirmó Yuhasz.** Estuvo tres meses en contradicción
  a tres bandas —su módulo 01 dice Jackson & Pollock, su documento de
  recomendaciones pide Heath-Carter y sus fichas reales calculan con Yuhasz— y
  se resolvió por §3.4: manda el Excel que usa de verdad. Yuhasz sobre 6
  pliegues ya estaba implementado y validado al decimal contra Diego y Daniela
  en la 2.10; solo faltaba su palabra, y llegó. J&P se conserva.
  **El título de la tarjeta decía "Heath-Carter" y era falso**: nunca se
  implementó y ya no se va a implementar. Se renombra en vez de dejar el nombre
  de un método que no usamos.

- [?] **2.7 Cálculo de 1RM estimado y relaciones de palanca** (5 h)
  Fórmula confirmada (Epley), pero necesita telemetría por serie —peso levantado
  y repeticiones— que solo existe con el registro de sesiones. **La desbloquea el
  grupo 9 de Fase B**, que es justo eso: el atleta registrando sus series. No
  cuenta contra el hito 7.4.

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

- [x] **2.15 Perímetros bilaterales y detección de asimetrías** (5 h) · *nuevo, 27-ago*
  Se miden los dos lados de brazo, muslo y pantorrilla, y de la resta sale el
  hecho `asimetrias` que el motor puede mirar. Umbrales suyos: brazo 1,5 cm,
  muslo 2 cm y, **desde el 2-sep, pantorrilla 1,5 cm** — el del brazo, no el del
  muslo. Estuvo sin umbral y sin juzgarse doce días, y la ficha lo decía con esas
  palabras en vez de fingir que estaba bien; el estado "medido pero sin criterio"
  se conserva en el tipo aunque hoy ya no lo use ningún segmento.
  **La columna vieja pasa a ser el lado derecho y se añade el izquierdo**, en vez
  de renombrar las dos: las mediciones ya guardadas se tomaron de un lado que
  nadie anotó, y bautizarlo retroactivamente invertiría la asimetría justo donde
  más caro sale — el sistema mandaría reforzar el lado que ya era el fuerte.
  Falta un lado nunca es "simétrico": es "no lo sé", y así viaja hasta el motor.
  Los dos lados se capturan **en la misma fila** de la pantalla: medir un brazo y
  anotar el otro tres campos más abajo es como se cruzan los lados.
  Dos reglas nuevas avisan de por dónde empezar. **No priorizan ejercicios
  todavía**: la biblioteca no marca cuáles son unilaterales y esa lista es
  criterio de Giovanni, no nuestro — **llegó el 2-sep** (22 ejercicios) y se
  trabaja en la 4.8.
  **Y "ajustar el volumen en esa zona" resultó no ser volumen.** Se le repreguntó
  dos veces: primero dijo que era un porcentaje del peso y luego se corrigió
  —*"fue un error"*— para dejarlo en **3 o 4 repeticiones más en el lado débil
  que en el fuerte**. Eso cabe en la gramática tal como está: es un `modificador`
  sobre un ejercicio PRIORIZADO, que es justo lo que el motor sí sabe hacer.
  **Cae una de las tres razones que justificaban la 3.9**; quedan el tobillo y
  "las sentadillas con precaución", que siguen necesitando modificar sin
  excluir.

- [x] **2.14 Perímetros de extremidades y tronco** (2 h) · *fuera del plan original*
  Brazo relajado y contraído, tórax, muslo y pantorrilla, con su evolución en la
  ficha. Petición suya: con cintura y cadera solo se ve el riesgo abdominal, no
  si alguien ganó músculo.

- [x] **2.13 Registro del ciclo menstrual (FEMTECH)** (4 h) · *fuera del plan original*
  Faltaba la pantalla: la app solo LEÍA los registros. Con consentimiento aparte.

- [x] **2.10 Validación: atletas reales vs. Excels de Giovanni** (4 h)
  Llegaron el 27-ago: Diego Mafla y Daniela Méndez, con ficha y plan entregado.
  Los números coinciden **al decimal** con sus celdas… pero solo tras descubrir
  que su Excel real calcula con **Yuhasz sobre 6 pliegues**, no con el Jackson &
  Pollock 7 que documentó. Golden tests en `tests/unit/composicion-corporal` y
  `casos-reales`. *Criterio de salida del grupo 2: cumplido.*

---

## ⚙️ Grupo 3 — Motor de reglas (el corazón) (58 h)

- [ ] **3.9 Revisión de la gramática: lo que Giovanni pide y no cabe** (8 h) · *nuevo, 1-sep*
  Tres peticiones suyas seguidas han chocado con el mismo muro, así que ya no es
  un caso raro sino un límite del diseño:
  1. *"Las sentadillas con precaución"* (31-ago) — `modificador` solo se cuelga
     de un ejercicio EXCLUIDO o PRIORIZADO, así que no se puede decir "este se
     hace, pero así". Se resolvió con un aviso de sesión, que es más tosco.
  2. *Tabla de tobillo* (1-sep, tarea 3.8) — nueve filas de "modificar
     ejecución/posición" por ejercicio. Hoy no se pueden expresar.
  3. ~~*"Ajustar el volumen en esa zona"* (2.15)~~ — **se cayó el 2-sep.** Al
     repreguntarle resultó que no era volumen: son **3 o 4 repeticiones más en
     el lado débil**, y eso ya cabe como `modificador` sobre un ejercicio
     PRIORIZADO. Queda como aviso de que el diagnóstico también puede fallar por
     exceso: se apuntó como límite de la gramática algo que era una petición mal
     entendida.
  Las dos que quedan piden lo mismo: **acciones dirigidas a un ejercicio sin
  tener que excluirlo**. Hasta que exista, su método entra recortado — y la 3.8,
  que son nueve filas suyas, no entra en absoluto.

- [x] **3.1 Diseño del esquema de reglas en BD** (5 h)
  Gramática fijada en `src/domain/reglas.ts` y documentada en
  `docs/ESQUEMA-REGLAS.md`. Catálogo cerrado de hechos, operadores por tipo y
  acciones sacadas una a una de su matriz. La columna `nivel` codifica el orden
  de ejecución del motor, distinto de `evidence_level`, que desempata dentro de
  cada nivel.

- [x] **3.2 Motor evaluador de reglas** (12 h)
  `src/domain/motor.ts`, función pura sobre hechos + reglas + biblioteca.
  Ejecuta el tubo de cuatro niveles, cruza contraindicaciones, resuelve
  conflictos por evidencia y denuncia empates y datos que faltan. Cada decisión
  arrastra su justificación. `hechos-atleta.ts` es el puente con la base.

- [ ] **3.8 Tabla de acciones por tobillo deficiente** (6 h) · *nuevo, 1-sep*
  **Ya no la bloquea Giovanni: la bloquea la 3.9.** Contestó las tres el 2-sep y
  las tres respuestas apuntan al mismo sitio.
  1. **"Deficiente" es menos de 5 cm** — el tramo severo. Así que su tabla no
     convive con las exclusiones actuales: **las reemplaza**. La sentadilla
     libre profunda y el hack libre dejan de estar bloqueados con menos de 5 cm
     y pasan a permitirse **con talón elevado**. Es un cambio de fondo en la
     regla más protectora del motor, y lo confirmó sabiendo la consecuencia,
     que se le escribió dos veces antes de preguntársela.
  2. **Solo faltaban dos ejercicios, no seis.** Confirmó que cinco de las
     variantes son renombres de las que ya existen —se prescriben con una
     indicación de ejecución, no duplicando la ficha— y que el Step-up Bajo era
     nuevo. La séptima la destapamos nosotros: la **Sentadilla Hack en Máquina**
     tampoco estaba, porque la biblioteca solo tiene el Hack Libre. Los dos
     quedan creados e **inactivos** desde la migración del 2-sep; se encienden
     aquí, y para eso hacen falta **sus contraindicaciones completas**, que es lo
     único que sigue pendiente de él en esta tarjeta: solo dijo la rodilla.
  3. **Hack libre y hack de máquina son ejercicios distintos** y se comportan
     distinto: solo el de máquina se salva subiendo los pies. De paso corrigió al
     revés lo de la rodilla —el libre la contraindica, el de máquina no—, así que
     el Hack Libre vuelve a la lista de descartes por rodilla.
  Lo que la frena es que las tres piden decir *"este se hace, PERO modificado"*,
  y `modificador` solo se cuelga hoy de un ejercicio EXCLUIDO o PRIORIZADO
  (§3.1). Cargarla ahora obligaría a **excluir para poder modificar**, que es lo
  contrario de lo que pidió. **Va detrás de la 3.9.**

- [x] **3.3 Carga de las reglas de los Excels a la BD** (8 h)
  Migración `20260827200000_matriz_giovanni.sql`: **25 reglas** de su matriz del
  25-ago cubriendo los 4 niveles, más los **31 ejercicios que nombran**. Cargar
  las reglas sin sus ejercicios habría sido cargar 25 reglas inertes: el motor
  cruza por nombre. Las contraindicaciones por ejercicio quedan vacías —siguen
  pendientes de él (4.5)— y el seed marca unas de ejemplo solo en local.
  Los Excels dejan de ser la fuente de verdad.

- [x] **3.4 Tests del motor con casos reales** (8 h)
  Diego Mafla y Daniela Méndez, dos atletas suyos reales. Los golden tests leen
  la matriz DE LA MIGRACIÓN, no reglas inventadas: lo que hay que proteger es
  que editar la matriz no le rompa un cliente. Descubrió que sus fichas reales
  usan **Yuhasz sobre 6 pliegues**, no Jackson & Pollock 7 — y que ni siquiera
  miden el pectoral, así que J&P no se podía calcular sobre un atleta suyo.

- [x] **3.5 Editor de reglas para Giovanni** (12 h)
  `/admin/reglas` y `/admin/reglas/regla`. Nada se escribe a mano: el hecho sale
  de un desplegable por nivel, el operador se filtra por el tipo del hecho, el
  valor se adapta y los ejercicios salen de la biblioteca. Mientras escribe, la
  regla se lee **en español** — la misma frase que verá el entrenador en la ficha.
  Solo se ofrecen las acciones que ese nivel ejecuta de verdad (`ACCIONES_POR_NIVEL`).
  **Editar es publicar una versión nueva**, nunca pisar: lo exige el GRANT por
  columna y lo exige la trazabilidad.

- [x] **3.6 Versionado de reglas y registro de cambios** (5 h)
  `/admin/reglas/historial`. Una sola línea de tiempo con las publicaciones y las
  activaciones entremezcladas: separarlas haría imposible entender por qué la
  regla vigente es una versión antigua. El **qué** no lo guarda nadie, se deduce
  comparando versiones (`historial-reglas.ts`) y se compara lo LEGIBLE, no el
  JSON. Volver atrás **repone** la versión vieja, no la copia en una nueva.
  El trigger de `rule_activations` solo cubría `update`, así que una versión que
  nacía activa entraba en vigor sin dejar rastro: corregido.

- [x] **3.7 Salida del motor: ejercicios con justificación visible** (8 h)
  `/atletas/prescripcion`, desde el botón «Qué dice el motor» de la ficha.
  Lo descartado va primero y con TODOS sus motivos; después lo prescribible con
  sus modificadores, los ajustes de sesión y de carga, y el reparto por patrón.
  Si falta un dato, lo dice arriba y enlaza a medir o evaluar: una prescripción
  incompleta no es una prescripción segura. Los empates y las reglas que el
  motor no entiende también se enseñan — son defectos de la matriz, no
  decisiones, y hay que poder verlos para arreglarlos.

---

## 📚 Grupo 4 — Biblioteca de ejercicios (32 h)

- [x] **4.1 CRUD de ejercicios** (6 h)
  Nombre, músculo objetivo, patrón, tipo biomecánico, contraindicaciones.

- [x] **4.2 Carga de fotos/videos** (6 h)
  Bucket `ejercicios` en Storage, galería en la ficha del ejercicio, y en el
  listado la portada. Las fotos se reducen a 1600px y JPEG 0.82 en el navegador
  antes de subirse —una foto de teléfono son 3–8 MB y la descargan todos los
  atletas cada vez—, respetando el EXIF para que las verticales no suban
  acostadas. El video no se transcodifica: tope de 50 MB, que es un clip de
  técnica de 20–30 segundos.
  **El bucket es público a propósito**, no por descuido: en Fase B el atleta abre
  la demostración en mitad de la serie y una URL firmada caducada ahí es una
  pantalla en blanco, además de impedir que el archivo se cachee. Se compensa
  nombrando los archivos con uuid, y aquí no vive ningún dato de un atleta.
  **La galería se guarda sola, fuera del botón Guardar**: subir un archivo ya
  ocurrió, y dejar el registro pendiente de un clic deja huérfano el archivo.
  RLS verificada de punta a punta con `npm run test:medios` — el entrenador ve
  pero no sube ni borra. De ahí salió que `exercise_library` no tiene GRANT de
  DELETE: los ejercicios se archivan, nunca se borran, y ahora hay una prueba
  que lo protege.

- [x] **4.3 Variantes y sustituciones entre ejercicios** (5 h)
  El motor tenía una sola fuente de sustitutos: la acción `sustituir_por` de una
  regla. Pero **la mayoría de las exclusiones no vienen de una regla**, vienen
  del cruce de contraindicaciones, que es un mecanismo y no una fila de `rules`.
  Ahí devolvía la lista vacía. Con la carga del 31-ago dejó de ser teórico.
  Ahora `exercise_variants` es la segunda fuente, independiente de las reglas.
  Tres tipos con semántica que el motor sabe leer, y **la dirección es la mitad
  del significado**: que la Goblet sustituya a la Profunda no autoriza lo
  contrario. Una progresión no se ofrece nunca: si algo se cayó porque duele,
  algo más duro no es la respuesta.
  **La matriz no arranca vacía**: 20 parejas derivadas EN SQL de la acción
  `sustituir_por` de sus propias reglas, para que no puedan divergir de su
  fuente. Dentro de la regla esa sustitución solo vale bajo su condición; en la
  matriz vale siempre, y por eso cubre el caso que ninguna regla cubría.
  Verificado de punta a punta: con lesión de hombro, el Press Militar tras Nuca
  cae por contraindicación y la pantalla ofrece Press en Plano Escapular.
  ⚠️ **En rodilla no ayuda**, y es un dato, no un fallo: sus sustituciones se
  escribieron para restricciones de MOVILIDAD, y todos los sustitutos de los
  dominantes de rodilla están a su vez contraindicados para rodilla. Refuerza la
  pregunta del 31-ago.

- [x] **4.4 Buscador y filtros** (4 h)
  Búsqueda por texto y filtros plegables por patrón, músculo, equipo y
  contraindicación. El de contraindicaciones **excluye**: un entrenador busca lo
  que puede dar a un atleta con la rodilla mal, no la lista de lo prohibido.

- [x] **4.6 Identidad de marca GQ** (3 h) · *fuera del plan original*
  Rojo, dorado y negro muestreados de su logo y sus informes. Media entrega de
  los assets: faltan el logo en archivo y la plantilla de reporte.

- [x] **4.7 Ver un ejercicio sin poder editarlo** (4 h) · *nuevo, 29-ago*
  `/biblioteca/detalle`, abierta a todo el staff. Cierra el hueco que dejaron 4.2
  y 4.3: las fotos, el video y las sustituciones existían pero vivían detrás de
  un formulario guardado a `super_admin`, así que el entrenador veía la miniatura
  y no podía abrirla. Material de técnica que solo ve quien lo subió no sirve.
  **Es el destino de todos, no una pantalla de segunda.** Giovanni también entra
  aquí desde el listado y pulsa «Editar». Un clic más a cambio de que haya un
  solo sitio donde mirar un ejercicio: una ficha que solo usara el entrenador
  sería la que nadie revisa y se quedaría atrás sin que se note.
  Los medios van arriba y a ancho completo, porque es a lo que se entra: se abre
  en mitad de una sesión para ver cómo se ejecuta, no para leer la clasificación.
  Las sustituciones son enlaces, así que se puede seguir la cadena.

- [ ] **4.8 Biblioteca unilateral y trabajo por lado** (6 h) · *nuevo, 2-sep*
  Mandó 22 ejercicios unilaterales con su músculo objetivo, series, repeticiones
  y una justificación por ejercicio. Es lo que le faltaba a la 2.15 para dejar de
  avisar y empezar a prescribir.
  **Y no son 22 ejercicios nuevos.** Se le preguntó si "unilateral" es una ficha
  aparte o la misma ejecutada a un lado, y contestó lo segundo: **la misma
  ejecutada a un lado**. Eso cambia el trabajo entero — 14 de los 22 ya existen
  con otro nombre (su "Prensa Unilateral a 45°" es nuestra "Prensa 45°", su
  "Step-Up Unilateral en Banco" es el "Step-up Bajo" creado ese mismo día) y
  duplicarlos habría llevado la biblioteca de 46 a 68 fichas con las
  contraindicaciones partidas entre las dos copias. Es la cuarta vez que choca la
  granularidad de nombres, y la primera que se pregunta antes de cargar.
  Sale por tanto un **marcador de ejecución unilateral** sobre la ficha que ya
  existe, no fichas nuevas. Los 8 restantes sí son ejercicios que no tenemos
  (predicador, concentrado, cross-body, overhead, single-leg RDL) y entran como
  altas normales, con sus contraindicaciones — que él todavía no ha dado.
  Su lista viene en **RIR** y el resto de su método en RPE; se convierte al
  cargar (`RPE = 10 − RIR`), decidido en la 5.2.

- [x] **4.5 Importación del contenido de Giovanni** (5 h)
  **Cerrada el 31-ago.** Su `Formulario_Ajustes_Motor_Giova.docx` trajo los 21
  que faltaban, y esta vez los 21 nombres coincidieron literalmente: se le mandó
  la tabla con NUESTROS nombres en vez de pedirle una lista suya. Ese fue el
  motivo de pedirlo en ese formato y funcionó.
  **La biblioteca queda 47 de 47, cero sin datos.**
  ⚠️ Destapó que marcó "Rodilla" en todo lo dominante de rodilla, y **un atleta
  con lesión de rodilla se quedaba con 0 de 12**. Preguntado con el número
  delante, y **corregido el 1-sep** (migración `20260901100000`): solo la
  sentadilla libre profunda se retira; el resto se permiten con precaución.
  **Ahora son 6 de 12.** Siguen fuera 7 que su frase no nombra —las dos prensas,
  el hack, el sissy, las zancadas, las extensiones y el curl femoral—;
  repreguntado.
  *Faltan los medios*, que ya tienen dónde entrar desde 4.2.

## 🏗️ Grupo 5 — Generador de rutinas (45 h)

**Grupo nuevo, y no es un capricho de alcance: era un hueco.** El motor dice qué
ejercicios sí y cuáles no, con su justificación. No dice semanas, días, series,
repeticiones, RPE, descansos ni progresión. Sin eso, la tarea "Plantilla PDF:
rutina prescrita" no tenía rutina que imprimir y la app del atleta no tendría
nada que mostrar. Fase A no se podía cerrar tal como estaba escrita.

- [x] **5.1 Esquema del plan de entrenamiento** (4 h)
  `src/domain/plan.ts`. Mesociclo → semanas → días → **tres fases** → ejercicios,
  con la forma que resolvió `gymapp`: calentamiento aparte de las series
  efectivas, rango de repeticiones en vez de una cifra —es sobre lo que opera su
  doble progresión— y RPE distinto para las primeras series y para la última.
  **Sin una sola cifra suya**, y es deliberado: series, repeticiones y RPE son
  método, y el método es dato que se carga, no código (§3.1). Sus números entran
  en 5.2.
  Las **tres fases son obligatorias en el tipo**, no una validación amable: su
  documento del 1-sep dice que el sistema no debe permitir guardar una sesión que
  no las cumpla. Y su prohibición del estiramiento estático tras hipertrofia **no
  se valida: no existe como opción de cierre** — lo que no se puede escribir no
  se puede prescribir por error.
  **`periodization_type` deja de estar pendiente** desde la migración 1.3: sus
  dos documentos lo cierran en `lineal | ondulante | atr`. Eso fija cómo se
  llaman, no a quién le toca cada uno, que sigue abierto en 5.2.
  El CHECK de la base es superficial a propósito —comprueba que sea un plan— y el
  árbol lo valida el dominio, que da mensajes en español. De paso reapareció el
  agujero de la 4.2: una clave ausente da NULL y un CHECK con NULL PASA, así que
  sin `coalesce` un objeto sin versión se colaba como plan válido.

- [ ] **5.2 Método de programación de Giovanni (spec)** (6 h)
  **Ya no está bloqueada.** Contestó las cinco preguntas el 31-ago y el 1-sep:
  tres periodizaciones, reparto de la semana para 3/4/5 días (más dos variantes
  para mujer), series por grupo muscular (10–22 según grupo), repeticiones, RPE
  y descanso por objetivo, doble progresión con incremento del 2,5–5 % al tocar
  el techo del rango, y descarga cada 4ª o 6ª semana al 40–50 % del volumen con
  RPE 5–6, seguida de una semana de supercompensación.
  **Los dos huecos que faltaban se cerraron el 2-sep. Ya no espera nada de él.**
  1. ✅ **Manda el objetivo, no el nivel.** Su anexo asignaba la periodización
     por nivel del atleta y su formulario por objetivo; cuando choquen, el eje
     es `training_goal`. `experience_level` sigue existiendo y seguirá pesando
     en volumen y progresión, pero no elige periodización.
  2. ✅ **Los cinco objetivos del atleta caen en sus tres filas.** Recomposición
     Corporal se programa como **hipertrofia**; Rendimiento Deportivo, como
     **fuerza**. La tabla de repeticiones no crece: es un mapeo de 5 a 3, y vive
     como dato junto al resto del método.
  Queda solo cargarlo como DATO, igual que la matriz de reglas. **Una decisión
  de forma que sale de aquí:** su biblioteca unilateral (2-sep) viene en RIR y
  todo el resto de su método en RPE. Confirmó que se convierta —`RPE = 10 − RIR`,
  así que RIR 1 → RPE 9 y RIR 2 → RPE 8—, y la conversión se hace **al cargar el
  dato, no al mostrarlo**: dos escalas conviviendo en la misma pantalla es como
  se equivoca un entrenador con prisa.

- [ ] **5.3 Generador: de la salida del motor a un programa** (12 h)
  La tarea 3.7 ya calcula el reparto por patrón y los ejercicios prescribibles con
  sus modificadores. Esto lo reparte en días y semanas aplicando 5.2. Función pura
  sobre (salida del motor + método + objetivo del atleta), con sus tests.

- [ ] **5.4 Editor del plan para el entrenador** (10 h)
  §3.6: el sistema es un copiloto. Giovanni tiene que poder cambiar un ejercicio,
  mover un día, tocar series y repeticiones. Lo que él sobreescriba queda marcado
  como decisión suya, distinto de lo que propuso el motor: sin esa distinción no
  se puede aprender de sus correcciones más adelante.

- [ ] **5.5 Sustituciones dentro del plan** (5 h)
  Cada ejercicio del plan viaja con dos alternativas, que salen de 4.3. En el
  gimnasio la máquina está ocupada y el atleta necesita un plan B **que el motor
  ya haya aprobado para él**. Sin esto, sustituye por su cuenta y se salta las
  contraindicaciones.

- [ ] **5.6 Golden tests del generador contra planes reales** (8 h)
  Diego Mafla y Daniela Méndez llegaron el 27-ago **con su plan entregado**, no
  solo con la ficha. Es el mismo trato que con los cálculos (§3.4): si el
  generador no se parece a lo que Giovanni les dio, manda él.

---

## 📄 Grupo 6 — Reportes PDF (20 h)

**Reducido de 29 h a 20 h, y cambió de papel.** El PDF ya no es el producto ni el
canal de entrega: es una exportación para el cliente que todavía no está en la
app, y para que Giovanni tenga algo que enseñar en una reunión. Sigue importando
—es lo que vende— pero deja de justificar dos rondas largas de diseño.

- [ ] **6.1 Elegir e integrar el motor PDF** (4 h)
  React-PDF vs. Gotenberg/WeasyPrint. **No está bloqueada por los assets:** la
  decisión técnica se puede tomar y probar con una plantilla provisional.

- [?] **6.2 Plantilla PDF: ficha del atleta (marca GQ)** (6 h)
  *Requiere:* logo en archivo y plantilla de reporte. Incluye la ronda de ajustes
  con Giovanni, que antes era una tarea aparte.

- [ ] **6.3 Plantilla PDF: rutina prescrita** (6 h)
  Ahora sí tiene de dónde salir: consume el plan del grupo 5.

- [ ] **6.4 Generar, descargar y guardar PDFs** (4 h)
  Botón en ficha y en plan; PDF guardado y asociado al atleta. Ojo §3.3: dentro de
  Capacitor no hay descarga de navegador, así que la ruta nativa se prevé desde ya.

---

## ✅ Grupo 7 — Cierre de Fase A (29 h)

- [ ] **7.1 Pruebas integrales del flujo completo** (8 h)
  Evaluación → motor → **plan generado** → PDF, sin errores, en celular y
  computador. El flujo creció: ahora pasa por el generador.

- [ ] **7.2 Corrección de bugs del piloto interno** (8 h)
  Bolsa de tiempo. Siempre aparece algo.

- [?] **7.3 Migrar clientes de Giovanni + piloto con 2–3 entrenadores** (12 h)
  Adiós Excels. Operación real + feedback estructurado.

- [ ] **7.4 🏁 HITO: Fase A entregada — consolidar vesting** (1 h)
  Acta de entrega con Giovanni.

---

## 📦 Fase B

Ya no es una lista de siete palabras: está desglosada en
**`docs/TAREAS-FASE-B.md`**. Es la app del atleta y todo lo que cuelga de ella
—entreno, control corporal, nutrición, informes con IA, pagos y tiendas— y es
donde GiosLab deja de ser la herramienta interna de Giovanni y pasa a ser el
producto.

No se abre hasta que 7.4 esté firmado.

## 💡 Backlog de ideas

Video con evaluación humana · Autorregulación por RPE · Certificación GQ ·
Visión artificial · Wearables · Multi-idioma.
