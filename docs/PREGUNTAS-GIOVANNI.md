# Preguntas pendientes para Giovanni

Estado: **actualizado tras sus aclaraciones técnicas (2026-08-22).**
Respondió las siete. Quedan **cuatro preguntas nuevas**, todas de precisión, y
un bloqueo de fondo que sigue igual: la matriz completa de condicionales.

Fuentes: `fuentes-giovanni/aclaracionestecnicasjorgehernan.pdf`,
`Modulo_Fisiologia_Femenina_GiosLab(1).pdf`,
`Recomendaciones_ e ideas MVP_GiosLab_System.pdf`.

---

## ✅ Respondidas — y ya aplicadas en el código

| Pregunta | Respuesta | Dónde quedó |
|---|---|---|
| 1. Pliegues J&P vs ISAK | Deliberado: usa el estándar **ISAK de 7 pliegues** (con pantorrilla, sin axilar media). Nuestra implementación ya coincidía | `composicion-corporal.ts`, sin cambios |
| 2. Eficiente / Compensada / De Riesgo | **Dos niveles distintos.** Micro = lo que el entrenador registra (`Restringido/Óptimo`, `Corto/Promedio/Largo`). Macro = lo que el motor concluye **por ejercicio** | `movilidad.ts`; se eliminó `pattern_classifications`, su sitio es `engine_runs.output` |
| 3. Niveles de evidencia | `LEVEL_A_SCIENCE` > `LEVEL_B_BIOMECHANICS` > `LEVEL_C_CONSENSUS` > `LEVEL_D_OVERRIDE`. **No es un metadato: es el orden de resolución de conflictos del motor** | `evidencia.ts` + CHECK en `rules` |
| 4. Catálogo de patrones | Ocho claves cerradas, con nombre comercial y ejemplos | `patrones.ts` + CHECK en `exercise_library` |
| 5. Nombres duplicados | Son el mismo campo; `palanca_femur` y `mov_dorsiflexion_tobillo` eran borradores | Ver nota de nomenclatura abajo |
| 6. 1RM estimado | **Epley**: `peso_levantado_kg * (1 + reps/30)` | Fórmula lista para la 2.7; los datos de entrada son de Fase B |
| 7. FEMTECH | Confirmado como núcleo del producto, con el texto exacto del consentimiento | Ya implementado; se afinó el rango de duración del ciclo |

### Nota de nomenclatura — decidido por nosotros

Pidió unificar en `longitud_femur` y `rom_dorsiflexion_tobillo`, en español.
**Las columnas se quedan en inglés** (`femur_class`, `ankle_dorsiflexion_cm`),
como el resto del esquema, porque lo que compara el motor y lo que se ve en
pantalla son los **valores** —y esos sí usan su vocabulario exacto: `Largo`,
`Restringido`, `Cifótica`—. Renombrar doce columnas tocaría migraciones, tipos y
cinco pantallas sin cambiar nada de comportamiento, y dejaría el esquema mitad
en un idioma y mitad en otro.

| Él escribe | Columna en la base |
|---|---|
| `longitud_femur` | `biomech_evaluations.femur_class` |
| `rom_dorsiflexion_tobillo` | `biomech_evaluations.ankle_dorsiflexion_cm` |
| `pliegue_triceps` … | `anthropometric_measurements.triceps_mm` … |
| `femtech_data_consent` | `athlete_consents` (consentimiento separado, 2.2) |

---

## 🟡 Preguntas nuevas — todas de precisión

### A. ¿Heath-Carter va o no? *(se contradice a sí mismo)*

En su **módulo 01** confirma Jackson & Pollock + Siri, que es lo que hace su
Excel y lo que está programado. Pero en su documento de **recomendaciones**, el
"perfil avanzado" incluye *"somatotipo Heath-Carter"*.

No son lo mismo ni son intercambiables. **Afecta:** tarea 2.6 y `CLAUDE.md` §3.4.

### B. Flexión de hombro: ¿180° exactos?

Su ficha dice *"Flexión de hombro normal (180°)"*. Programado literal: 179° sale
`Restringido`. ¿Hay tolerancia (175°, 170°) o el criterio es estricto?

**Afecta:** cuánta gente sale restringida en el paso 4.

### C. Duración del ciclo fuera de 21–35 días

Su módulo dice "editable de 21 a 35". Pero un ciclo irregular de 38 días existe,
y bloquearlo dejaría a esa atleta sin el módulo. Implementado en dos niveles:
la base acepta **21–45** y la interfaz **avisa** fuera de 21–35 sin impedir
guardar. ¿Le sirve, o prefiere el corte duro en 35?

### D. Dorsiflexión: dos bandas restringidas

Su ficha define dos grados con acciones distintas (`<10 cm` → calzado de
elevación; `<5 cm` → Hack Squat y prensa), pero el vocabulario micro que fijó es
binario `Restringido/Óptimo`. Se conservan **las dos cosas**: el estado binario
para el motor y la severidad (`Severa`/`Limitada`/`Óptima`) para no perder una de
sus reglas. ¿Correcto?

---

## 💡 Sus cinco recomendaciones — qué hacemos con cada una

| Recomendación | Veredicto | Por qué |
|---|---|---|
| **② Matriz de sustitución** | ✅ La estructura ya existe | `exercise_variants` está desde la 1.3. Falta el contenido. **El filtro por equipamiento del gimnasio sí es alcance nuevo** (tabla por tenant) → Fase B |
| **③ Prompt de apreciación visual** | ⚠️ Sí a la necesidad, no a la forma | Un texto libre que "el algoritmo parsea" rompe §3.6: el motor deja de poder explicar qué regla aplicó. **La necesidad ya está cubierta por campos que existen**: `squat_dominance`, `glute_vector`, `back_dominance` |
| **① Onboarding express** | ⚠️ Problema real, solución sobredimensionada | No es "ajuste de UI": son dos flujos y dos conjuntos de reglas. **Ya está medio resuelto**: el wizard permite saltar pasos y guardar incompleto. Basta con hacerlo explícito |
| **④ Marca blanca en el PDF** | ⏸ Después de la 5.2 | El grupo 5 no puede empezar sin sus assets de marca. Personalizar una plantilla que no existe es hacerla dos veces |
| **⑤ Checklist de disposición** | ⏸ Fase 2 | Coincide con él |

---

## 🔴 Sigue bloqueado por él (`CLAUDE.md` §7)

- **La matriz completa de condicionales.** Dio la *forma* de la regla (`IF micro
  THEN macro`) y un ejemplo, más 15 reglas en prosa en los Excels. **No es la
  matriz.** Sigue bloqueando el cierre del grupo 3.
- **Listado y medios de la biblioteca de ejercicios** — bloquea la 4.5. Ahora hay
  catálogo de patrones, así que puede entregarlo ya clasificado.
- **Assets de marca** (logo, colores, plantilla de reporte) — bloquea el grupo 5.
- **2–3 atletas reales** para validar — bloquea la 2.10.

---

## Mensaje para enviarle

> Copiar y pegar. Sin jerga técnica.

---

Gio, gracias — con esto se destrabó casi todo. Ya está programado: los ocho
patrones de movimiento, los cuatro niveles de evidencia (y el motor ya sabe que
ante dos reglas que se contradicen manda la de nivel más alto), y la pantalla de
movilidad con las seis pruebas.

Lo de Micro y Macro fue la respuesta más útil de todas. Yo tenía mal el diseño:
estaba guardando "Eficiente / Compensada / De Riesgo" como algo que el entrenador
escribía a mano. Con tu aclaración quedó donde va — el entrenador mide rangos y el
motor concluye. Ya lo corregí.

Me quedan cuatro dudas cortas:

**1. ¿Heath-Carter va o no?** En tus aclaraciones técnicas confirmas Jackson &
Pollock, que es lo que programé y lo que hace tu Excel. Pero en el documento de
recomendaciones, el perfil avanzado dice "somatotipo Heath-Carter". No son lo
mismo. ¿Cuál dejamos?

**2. Flexión de hombro.** Tu ficha dice "normal (180°)". Lo programé literal,
así que alguien con 178° sale como restringido. ¿Es así de estricto o hay margen?

**3. Duración del ciclo.** Dijiste editable de 21 a 35 días. Lo dejé así, pero
permitiendo guardar fuera de ese rango con un aviso, porque una atleta con ciclo
irregular de 38 días existe y no quería dejarla fuera del módulo. ¿Te parece?

**4. Dorsiflexión.** Tu ficha tiene dos niveles de restricción con acciones
distintas (<10 cm y <5 cm), pero el vocabulario que fijaste es Restringido/Óptimo.
Dejé los dos: el sistema guarda los centímetros exactos y muestra "Severa" o
"Limitada", que es lo que dispara cada una de tus reglas. ¿Bien así?

Sobre tus recomendaciones: la **matriz de sustitución** me parece la mejor de las
cinco y ya está medio construida — la estructura existe desde el mes pasado, lo
que falta es que me digas qué sustituye a qué. Lo del **filtro por equipos
disponibles** sí es más trabajo del que parece, porque hay que saber qué máquinas
tiene cada gimnasio; lo dejaría para después.

En el **prompt de apreciación visual** te propongo un cambio: en vez de un campo
de texto libre, usar casillas concretas (dominancia de rodilla o cadera, vector de
glúteo, vector de espalda). Ya están en el sistema desde tu ficha de patrones. La
razón es que si el entrenador escribe texto libre y el sistema lo interpreta, deja
de poder explicar por qué decidió lo que decidió — y esa transparencia es lo que
hace que un entrenador confíe en la herramienta.

Y lo que más me sirve ahora mismo: **la matriz completa de condicionales.** Con la
forma que me diste ya puedo construir el motor, pero necesito tus reglas para
llenarlo.
