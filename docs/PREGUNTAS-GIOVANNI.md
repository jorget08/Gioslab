# Preguntas pendientes para Giovanni

Estado: **actualizado tras sus aclaraciones técnicas (2026-08-22).**
Respondió las siete originales, y el 2026-08-22 respondió además la de
contraindicaciones ampliando el modelo con una familia que no habíamos previsto.
Quedan **seis abiertas** y un bloqueo de fondo: la matriz completa de
condicionales.

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

## 🟡 Preguntas nuevas

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

### E. Contraindicaciones ✅ RESUELTA — y amplió el modelo

Confirmó el cruce por lista cerrada *("si dejamos texto libre, el motor pierde
precisión")* y añadió **una segunda familia que no habíamos previsto**:

| Familia | Ejemplos | Qué hace el motor |
|---|---|---|
| **Anatómica** | Hombro, Lumbar, Rodilla, Tobillo, Cadera, Codo, Muñeca/Antebrazo, Cervical | **Filtra**: descarta el ejercicio |
| **Sistémica** | Hipertensión/Cardiovascular, Embarazo, Hernia discal, Diástasis abdominal | **Filtra Y ajusta la ejecución**: maniobra respiratoria, RIR, posición |

Lo segundo es lo importante para el grupo 3: una contraindicación sistémica no
siempre quita el ejercicio, a veces lo deja y cambia el cómo. Un motor que solo
supiera incluir o excluir no podría expresar *"sí, pero sin Valsalva"*.

**Sus reglas, textuales, para sembrar `rules` en la 3.3:**

- Hipertensión → bloquear Valsalva, fallo extremo e isométricos muy largos
- Embarazo → bloquear decúbito prono tras el primer trimestre, impacto y presión
  intraabdominal extrema
- Hernia discal → bloquear cargas axiales con compresión directa sobre columna
- Diástasis → bloquear flexiones de tronco; priorizar core anti-extensión

**Pendiente menor:** su lista anatómica trae 8 etiquetas; conservamos `Dorsal` y
`Pie`, que ya estaban en el catálogo de lesiones. Quitarlos dejaría una fascitis
plantar o una molestia dorsal sin forma de registrarse ni de cruzarse. Sobrarle
una etiqueta al motor no cuesta nada; faltarle, sí. ¿Las quitamos?

### F. `biomechanical_type`: ¿sigue haciendo falta?

Antes de su MÓDULO 04 teníamos dos campos solapados. Ahora que el patrón de
movimiento tiene catálogo cerrado, `biomechanical_type` guarda cosas como
"rodilla dominante" o "cadera dominante", que es casi lo mismo que
`squat_dominante_rodilla` y `hip_hinge_dominante_cadera`.

Se dejó el campo, pero **está sin catálogo y probablemente sobra**. Si aporta
algo que el patrón no cubre, hace falta su lista; si no, se elimina.

### G. Condiciones sistémicas del atleta ✅ RESUELTA por nosotros

Era el hueco que dejó su respuesta: se podía marcar un ejercicio como
contraindicado para embarazo, pero no había dónde registrar que una atleta lo
está. Ya existe `athlete_conditions`, editable desde la ficha del atleta.

**Pantalla aparte y no parte del alta**, a propósito: el embarazo empieza después
de crear al atleta y la diástasis se resuelve meses más tarde. Capturarlas solo
al principio garantizaría que estén desactualizadas justo cuando importan.

Queda una pregunta menor para él: **¿el entrenador puede registrar estas
condiciones, o deberían venir de un parte médico?** Hoy las marca el entrenador
con lo que le cuenta el atleta. Es lo mismo que ya hace con las lesiones, pero
la hipertensión es un diagnóstico, no una molestia.

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
- **Listado y medios de la biblioteca de ejercicios** — bloquea la 4.5. La
  pantalla para cargarlos ya existe (4.1) y agrupa por sus ocho patrones, así
  que puede entregar el listado ya clasificado y entra directo.
- **Assets de marca**: ✅ los **colores** llegaron el 2026-08-23 y ya están
  aplicados —se muestrearon de su logo y de sus informes, no se aproximaron—.
  Siguen faltando el **logo en archivo** (hoy la app usa solo el logotipo
  tipográfico) y la **plantilla de reporte**, que es lo que bloquea el grupo 5.
- **2–3 atletas reales** para validar — bloquea la 2.10.

---

## Mensaje para enviarle

> Copiar y pegar. Sin jerga técnica.

---

Giova, gracias los archivos se destrabó casi todo. Ya está programado: los ocho
patrones de movimiento, los cuatro niveles de evidencia (y el motor ya sabe que
ante dos reglas que se contradicen manda la de nivel más alto), y la pantalla de
movilidad con las seis pruebas.

Lo de Micro y Macro fue la respuesta más útil de todas. Yo tenía mal el diseño:
estaba guardando "Eficiente / Compensada / De Riesgo" como algo que el entrenador
escribía a mano. Con tu aclaración quedó donde va — el entrenador mide rangos y el
motor concluye. Ya lo corregí.

Me quedan unas dudas cortas:

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

Aparte de eso, ya está lista la **pantalla de la biblioteca de ejercicios**:
puedes crear, editar y clasificar cada ejercicio por su patrón, y se ven
agrupados por los ocho que definiste. Dos cosas de ahí:

**5. Contraindicaciones.** Las puse como una lista de zonas del cuerpo —hombro,
lumbar, rodilla, tobillo…— usando exactamente las mismas que se registran en las
lesiones del atleta. Lo hice así para que el sistema pueda cruzarlas: si un
atleta tiene la rodilla marcada y un ejercicio está contraindicado para rodilla,
el motor lo detecta solo. Si escribiéramos texto libre no habría forma de
cruzarlo con certeza. ¿Te sirve así, o hay contraindicaciones que no son una
zona del cuerpo, tipo hipertensión o embarazo?

**6. "Tipo biomecánico".** En tus fichas viejas había un campo con valores como
"rodilla dominante" o "cadera dominante". Ahora que definiste los ocho patrones,
eso quedó casi repetido. Lo dejé por si acaso, pero está vacío de criterio: ¿lo
quitamos, o guarda algo que el patrón no cubre?

Y lo que más me sirve ahora mismo: **la matriz completa de condicionales.** Con la
forma que me diste ya puedo construir el motor, pero necesito tus reglas para
llenarlo.
