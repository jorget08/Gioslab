# Preguntas pendientes para Giovanni

> Estas seis preguntas bloquean partes concretas del desarrollo. Cinco salen del
> modelo de datos (`MODELO-DATOS.md` §7) y se resuelven en la sesión grabada de la
> tarea **0.5**; la sexta se responde por WhatsApp en dos minutos.
>
> **Las respuestas se escriben aquí abajo**, en el hueco de cada pregunta. Este
> archivo es el insumo directo de las tareas 0.5, 2.4, 2.5 y 3.3.

Estado: **sin responder** · Última actualización: 2026-08-19

---

## Mensaje para enviarle

> Copiar y pegar. Está escrito sin jerga técnica a propósito.

---

Gio, para seguir necesito que me precises seis cosas del método. No es burocracia:
cada una define cómo queda guardado el dato, y cambiarlo después de que haya
atletas cargados cuesta bastante más que definirlo ahora.

**1. Longitud de fémur — ¿cuándo es "Largo"?**

Ya sé que clasificas el fémur en Largo / Medio / Corto. Lo que no sé es cómo sale esa
clasificación. ¿Es una medida absoluta en centímetros (por ejemplo, "más de 48 cm es
largo"), o es una proporción contra la estatura o contra el torso (por ejemplo, "si el
fémur pasa del 26% de la talla")?

Si es proporción, dime contra qué y cuáles son los cortes exactos.
Y lo mismo para húmero y torso, si también los clasificas.

**2. Movilidad — ¿cómo la registras?**

Para dorsiflexión de tobillo, cadera y hombro: ¿el entrenador anota una categoría
(Limitada / Normal / Amplia), un ángulo en grados, o centímetros de un test?

Si es el test de pared para tobillo, dime en centímetros y cuál es el corte.
Si son categorías, dame la lista exacta de opciones tal como quieres que aparezcan.

**3. Patrones de movimiento — la lista completa**

Necesito el listado cerrado de patrones con los que clasificas los ejercicios.
Algo como: sentadilla, bisagra de cadera, empuje horizontal, empuje vertical,
tracción horizontal, tracción vertical, zancada, core…

Dime cuáles usas tú y con qué nombre exacto, porque ese nombre es el que va a ver
el entrenador en la app y el que usa el motor para cruzar ejercicios.

**4. Clasificación por patrón — Eficiente / Compensada / De Riesgo**

Sé que clasificas así, pero me falta:
- ¿Qué patrones evalúas concretamente? (¿todos los de la pregunta 3, o solo algunos?)
- ¿Solo va la categoría, o el entrenador también escribe una observación?
- ¿Hay una cuarta opción, tipo "no evaluado"?

**5. Nivel de evidencia — las opciones**

Cada regla lleva un nivel de evidencia. En lo que hablamos apareció
"criterio profesional". ¿Cuáles son los demás niveles y en qué orden van, de más
fuerte a más débil? Por ejemplo: evidencia sólida → evidencia limitada → criterio
profesional. Dime los tuyos.

**6. Privacidad entre entrenadores del mismo gimnasio**

Esta es de producto, no de método. En un gimnasio con varios entrenadores:
¿cada entrenador ve **solo sus** atletas, o ve **todos los del gimnasio**?

Por ahora lo dejé en la opción más restrictiva —cada uno ve solo los suyos— porque
son datos de salud y prefiero abrir después que descubrir que estaba abierto de más.
Si el dueño del gimnasio debe verlos todos, eso ya funciona así.

---

## Respuestas

### 1. Umbrales de segmentos óseos

<!-- Respuesta aquí -->

**Bloquea:** tarea 2.4 (ratios de palanca), columna `femur_class`.

### 2. Escalas de movilidad

<!-- Respuesta aquí -->

**Bloquea:** tarea 2.5, columnas `ankle_dorsiflexion`, `hip_mobility`, `shoulder_mobility`.

### 3. Catálogo de patrones de movimiento

<!-- Respuesta aquí -->

**Bloquea:** tarea 4.1, columna `exercise_library.movement_pattern`.

### 4. Clasificación por patrón

<!-- Respuesta aquí -->

**Bloquea:** tarea 2.5, columna `biomech_evaluations.pattern_classifications`.

### 5. Niveles de evidencia

<!-- Respuesta aquí -->

**Bloquea:** tarea 3.1, columna `rules.evidence_level`.

### 6. Visibilidad entre entrenadores

<!-- Respuesta aquí -->

**Afecta:** política de RLS de `athletes` (tarea 1.4). Hoy: cada entrenador ve solo los suyos.

---

## Qué hacer cuando responda

Las columnas afectadas están hoy como **texto libre**, a propósito: poner una lista
cerrada antes de tener sus respuestas habría sido inventar dominio. Cuando conteste:

1. Escribir las respuestas arriba.
2. Convertir esas columnas a `enum` en una migración nueva.
3. Actualizar `MODELO-DATOS.md` §7 marcando los puntos resueltos.

---

## Además, sigue pendiente de él

De `CLAUDE.md` §7, sin relación con estas seis preguntas:

- **Los Excels con la matriz completa de condicionales** — bloquea la 0.5 y todo el grupo 3.
  Es el bloqueo más grande del proyecto.
- Assets de marca: logo, colores, plantilla de reporte — bloquea el grupo 5.
- Listado y medios de la biblioteca de ejercicios — bloquea la 4.5.
- 2–3 atletas reales para validar los cálculos contra su Excel — bloquea la 2.10.
