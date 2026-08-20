# Preguntas pendientes para Giovanni

Estado: **actualizado tras leer los tres Excels (2026-08-19).**
Cinco preguntas quedaron resueltas por los archivos; quedan **siete abiertas**, y
tres son nuevas.

Ver el análisis completo en [`ESPECIFICACION-FICHAS.md`](./ESPECIFICACION-FICHAS.md).

---

## ✅ Resueltas por los Excels

| Antes preguntábamos | Respuesta que traen los archivos |
|---|---|
| Umbrales de fémur Largo/Medio/Corto | No hay umbrales: es un desplegable `[Corto, Promedio, Largo]` que elige el entrenador |
| Escala de dorsiflexión | `[Óptima (>10 cm), Limitada (5-10 cm), Severa (<5 cm)]`, test de pared |
| Escalas de las demás movilidades | Hombro `[Apto OverHead, Limitado / Inclinado]`; cadera ≥120°; rotación interna <30°; extensión torácica cifótica |
| Visibilidad entre entrenadores | Resuelta por el modelo de membresías: el atleta pertenece al tenant donde se creó |
| Catálogos de perfil | Objetivo (5 opciones) y nivel de experiencia (5 opciones), ambos en su ficha |

---

## 🔴 URGENTE — no es una pregunta, es un aviso

**El archivo `flujograma completo Automatizada_GiosLab_v2.xlsx` está dando
resultados equivocados.**

Al insertar la sección de screening, las fórmulas quedaron apuntando a filas
anteriores. Con el mismo atleta, `Ficha_1.1` calcula **18.02 %** de grasa y el
flujograma muestra **22.5 %**, que no es un cálculo sino el valor de reserva de la
fórmula. El ratio cintura/cadera y la masa magra salen como `#VALUE!`.

**Si está usando ese archivo con clientes, esos informes están mal.** Conviene
avisarle hoy, independientemente del desarrollo. Nosotros tomamos `Ficha_1.1` como
fuente, que sí está correcta.

---

## Mensaje para enviarle

> Copiar y pegar. Sin jerga técnica.

---

Gio, ya revisé a fondo los tres Excels. Están muy bien documentados —los
identificadores que pusiste para la base de datos nos ahorraron trabajo— y con
ellos ya programé el cálculo de composición corporal: da exactamente tus mismos
números.

Dos cosas antes de las preguntas.

**Una alerta.** El archivo "flujograma completo" tiene las fórmulas desconfiguradas:
se corrieron de fila cuando le agregaste la sección de screening. Con los datos de
la ficha de ejemplo, ese archivo muestra 22.5 % de grasa cuando el cálculo correcto
da 18.02 %. Si lo estás usando con algún cliente, revísalo. El archivo "Ficha 1.1"
sí está bien y es el que estamos siguiendo.

**Una duda de fondo.** En nuestras conversaciones habíamos hablado de somatotipo
Heath-Carter, pero tus fichas no lo calculan: usan Jackson & Pollock con 7 pliegues
y la ecuación de Siri. ¿Dejamos solo tu método, o el somatotipo va aparte en otra
ficha que no me pasaste?

Ahora sí, lo que me falta:

**1. Los pliegues de Jackson & Pollock.** La fórmula original de J&P usa el pliegue
axilar medio y tú usas el de pantorrilla en su lugar, con las mismas constantes.
¿Es a propósito? Lo pregunto porque cambiar un sitio de medición sin cambiar la
fórmula mueve un poco el resultado.

**2. Eficiente / Compensada / De Riesgo.** Esa clasificación no aparece en ninguno
de los tres archivos. Ahí usas "Restringido / Óptimo" para movilidad y perfiles como
"Inclinación Alta" o "Baja Tolerancia" para biomecánica. ¿Cuál es la buena? ¿O son
cosas distintas que conviven?

**3. Nivel de evidencia.** Cada regla debería llevar uno. ¿Cuáles son las opciones y
en qué orden van, de más fuerte a más débil?

**4. Patrones de movimiento.** Necesito la lista cerrada con la que clasificas los
ejercicios: sentadilla, bisagra de cadera, empuje horizontal, tracción vertical…
Dime los tuyos con el nombre exacto, porque es lo que verá el entrenador y lo que
usa el motor para cruzar ejercicios.

**5. Dos nombres para lo mismo.** En un archivo el fémur es `longitud_femur` y en
otro `palanca_femur`; la dorsiflexión es `rom_dorsiflexion_tobillo` en uno y
`mov_dorsiflexion_tobillo` en otro. ¿Son la misma evaluación o son dos distintas
(una completa y una rápida)?

**6. El 1RM estimado.** No está en ningún archivo. ¿Lo usas? ¿Con qué fórmula?

**7. El módulo FEMTECH.** Lo encontré en tu ficha y ya lo programé. ¿Lo usas con
todas tus atletas mujeres o fue una prueba? Lo pregunto porque son datos de salud
reproductiva y hay que pedir un consentimiento aparte, específico para eso.

---

## Respuestas

### 1. Pliegues de Jackson & Pollock (pantorrilla vs axilar media)

<!-- Respuesta aquí -->

**Afecta:** exactitud del % graso. `composicion-corporal.ts` ya replica su versión.

### 2. Taxonomía Eficiente / Compensada / De Riesgo

<!-- Respuesta aquí -->

**Bloquea:** `biomech_evaluations.pattern_classifications`, tarea 2.5.

### 3. Niveles de evidencia

<!-- Respuesta aquí -->

**Bloquea:** `rules.evidence_level`, tarea 3.1.

### 4. Catálogo de patrones de movimiento

<!-- Respuesta aquí -->

**Bloquea:** `exercise_library.movement_pattern`, tarea 4.1.

### 5. Identificadores duplicados

<!-- Respuesta aquí -->

**Bloquea:** fijar el vocabulario antes de convertir las columnas `text` en `enum`.

### 6. 1RM estimado

<!-- Respuesta aquí -->

**Bloquea:** tarea 2.7.

### 7. Alcance de FEMTECH y consentimiento

<!-- Respuesta aquí -->

**Afecta:** flujo de consentimiento de la tarea 2.2.

### 8. ¿Heath-Carter va o no?

<!-- Respuesta aquí -->

**Afecta:** tarea 2.6 y `CLAUDE.md` §3.4, que hoy se contradicen con sus fichas.

---

## Sigue pendiente de él (de `CLAUDE.md` §7)

- **La matriz completa de condicionales.** Los Excels traen **15 reglas en prosa**,
  suficientes para construir el motor y sembrar las primeras, pero no es la matriz
  completa. Sigue bloqueando el cierre del grupo 3.
- Assets de marca: logo, colores, plantilla de reporte — bloquea el grupo 5.
- Listado y medios de la biblioteca de ejercicios — bloquea la 4.5.
- 2–3 atletas reales para validar — bloquea la 2.10. *(La ficha de ejemplo ya sirve
  como primer caso: sus números están replicados en los golden tests.)*
