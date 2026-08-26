# Preguntas pendientes para Giovanni

Estado: **actualizado tras sus aclaraciones técnicas (2026-08-22).**
**Actualizado el 2026-08-25: llegó la matriz completa de condicionales**, que
era el bloqueo de fondo, y con ella las respuestas a las cuatro preguntas de
precisión. El grupo 3 deja de estar bloqueado.

A cambio aparecieron **cuatro contradicciones nuevas** —dos de sus documentos
entre sí y dos con lo ya construido— que hay que resolver antes de programar el
motor. Son las que están abiertas ahora.

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

### A. Heath-Carter ✅ RESUELTA

En su **módulo 01** confirma Jackson & Pollock + Siri, que es lo que hace su
Excel y lo que está programado. Pero en su documento de **recomendaciones**, el
"perfil avanzado" incluye *"somatotipo Heath-Carter"*.

**Jackson & Pollock se queda como obligatoria** para % graso, masa magra y
volumen. **Heath-Carter entra como perfilador morfológico opcional** que no
bloquea nada: si se capturan los diámetros óseos, dibuja la somatocarta; si no,
el flujo sigue igual. No miden lo mismo y ahora está claro.

**Efecto:** la 2.6 deja de bloquear la Fase A y baja de prioridad.

### B. Flexión de hombro ✅ RESUELTA — pero con un número en disputa

Confirmó que 180° estricto genera falsos positivos y dio tres bandas citando a
la AAOS: **≥170° óptimo · 150–169° limitación leve · <150° restricción severa**.

⚠️ **Pero su matriz, del mismo día, dice `< 175° = Restringida`.** Dos números
distintos para el mismo test. Se toma 170 —es el documento que responde a la
pregunta y el único que cita fuente— a la espera de que lo confirme.

### C. Duración del ciclo ✅ RESUELTA — nos da la razón

Aprobó **exactamente** lo que habíamos implementado: 21–45 con aviso fuera de
21–35. Añade que por encima de 35 días (oligomenorrea, SOP, tríada de la atleta)
el ajuste debe ir por RIR/RPE en vez de por calendario hormonal.

**Pendiente de construir:** ese modo por RIR/RPE, que es prescripción y hoy no
existe.

### D. Dorsiflexión ✅ RESUELTA — aprueba lo construido

Aprobó el modelo de tres estados tal cual está: **≥10 óptimo · 5–9.9 limitada ·
<5 severa**, guardando el valor continuo en cm. Confirma además que el test es
el WBLT (Weight-Bearing Lunge Test), que es el protocolo que ya describimos en
pantalla.

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

### H. Cambió la batería de movilidad, ¿sustituye o suma? 🔴

Su matriz introduce dos tests que no teníamos (**Thomas Test** y **SLRT**) y a la
vez **deja fuera dos que salieron de su propia ficha**:

| Test | Implementado | En su matriz nueva |
|---|---|---|
| Rotación externa de hombro | óptimo ≥ 90° | limitada < **70°** |
| Flexión de cadera | óptimo ≥ 120° | **no aparece** |
| Rotación interna de cadera | óptimo ≥ 30° | **no aparece** |
| Thomas Test | — | nuevo |
| SLRT (isquiotibiales) | — | nuevo |

No es lo mismo sustituir que sumar: si sustituye, hay que migrar las
evaluaciones ya hechas y decidir qué pasa con los valores guardados.

### I. Se cayó una regla de seguridad del ciclo 🔴

Su matriz pasa el ciclo de 5 fases a 4: **Ovulatoria desaparece** absorbida por
Folicular Tardía (días 6–14) y entra **Lútea Temprana** (15–22).

El problema es lo que se va con la Ovulatoria: *"mayor laxitud ligamentosa por
relaxina → priorizar variantes en máquina o con apoyo guiado"*. Eso lo escribió
él y **es una regla de protección articular**, no un ajuste de volumen. ¿La
descarta a conciencia o hay que reubicarla dentro de Folicular Tardía?

Cambian además los multiplicadores: Folicular Tardía pasa de ×1.1 a 110–120 %, y
Lútea Tardía de ×0.8 a −25/−30 %.

### J. ¿Las dos jerarquías conviven? 🔴

Ahora hay dos, y definen cómo se programa el motor:

- `LEVEL_A > B > C > D` — la que dio antes, para resolver reglas en conflicto.
- `Nivel 1 → 2 → 3 → 4` — la de la matriz: seguridad, fisiología, vectores,
  composición.

**Nuestra lectura, que es la que se va a programar salvo que diga lo contrario:**
no compiten, son ejes distintos. Los Niveles 1–4 son el ORDEN DE EJECUCIÓN
—primero se filtra por seguridad, después se modula el volumen, después se
asignan vectores— y los LEVEL_A–D resuelven el empate entre dos reglas *dentro*
del mismo nivel. Encajan bien; solo hace falta que lo confirme, porque él escribió
"en caso de conflicto se aplica la de mayor jerarquía", que suena a lo otro.

---

## 📥 Lo que llegó el 2026-08-25 y qué se hace con ello

| Documento | Veredicto |
|---|---|
| **Matriz completa de condicionales** | ✅ **Es lo que faltaba.** Desbloquea 0.5 y todo el grupo 3 |
| **Respuestas técnicas v3** | ✅ Cierra las cuatro preguntas, bien razonadas |
| Requerimiento técnico 1.1 — más perímetros | ✅ Entra: brazo, tórax, muslo y pantorrilla. Hoy solo hay cintura y cadera |
| Requerimiento técnico 1.1 — zonas cardio Z1–Z5 | ⏸ Alcance nuevo, ni está en el tablero. Backlog |
| Flujo autoadaptativo del ciclo | ◐ La mitad ya está (registro por el entrenador). Que la atleta marque su día 1 necesita el portal del cliente → Fase B |
| Dashboard in-app con gráficas y fotos | ⏸ Fase B. El comparador de fotos necesita antes la 4.2 |
| Volumen efectivo, cadencia y TUT | ⏸ Fase B: es el generador de rutinas. La tabla MEV/MAV/MRV es buen material de referencia para cuando llegue |
| respuesta5 contraindicaciones | — Duplicado de lo que ya envió y ya está implementado |

### Descartado, con motivo

- **El endpoint REST** `POST /api/v1/user/menstrual-cycle/update`. No existe esa
  capa: Supabase **es** el backend (docs/ARQUITECTURA.md). La idea es válida y ya
  está construida a medias; el diseño técnico no aplica.
- **Las librerías de gráficas para React Native y Flutter.** No es nuestro stack
  y se descartó a propósito. De su lista solo sirve la de web.

### ⚠️ Y una que contradice el plan

El documento del dashboard dice que *"el PDF queda como recurso secundario"*.
Eso choca con el grupo 5 —29 horas de informes— y con lo que él mismo dijo antes:
"el PDF es lo que vende el producto". **No se cambia sin que lo diga explícitamente.**

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

Giova, la matriz es justo lo que necesitaba. Con eso ya puedo construir el motor,
que era lo único que quedaba grande. Y las cuatro dudas quedaron resueltas: me
sirvió especialmente lo del hombro, porque tenías razón, con 180 exactos me
salían restringidos casi todos.

Dos cosas que aprobaste ya estaban hechas tal cual: el rango de 21 a 45 días del
ciclo y los tres niveles de dorsiflexión. Perfecto, no toco nada ahí.

Antes de programar el motor necesito que me aclares cuatro cosas, porque si me
equivoco en estas hay que rehacerlo entero:

**1. El hombro: ¿170 o 175?** En las respuestas me dices que a partir de 170 es
óptimo. En la matriz dice que por debajo de 175 es restringido. Son dos números
distintos para el mismo test. Yo voy a usar 170, que es el que viene con la
explicación de la AAOS, pero confírmame.

**2. Cambiaste los tests de movilidad, y necesito saber si es a propósito.**
En la matriz aparecen dos nuevos (Thomas Test y elevación de pierna recta) pero
desaparecen dos que estaban en tu ficha de movilidad y que ya tengo programados
y capturando datos: la flexión de cadera y la rotación interna de cadera.
También bajaste la rotación externa de hombro de 90 a 70 grados.

¿Los nuevos reemplazan a los viejos o se suman? Si reemplazan, tengo que decidir
qué hago con las evaluaciones que ya están guardadas.

**3. Se te cayó una regla de seguridad del ciclo.** En la matriz el ciclo pasa de
cinco fases a cuatro: la Ovulatoria desaparece dentro de la Folicular Tardía. El
problema es lo que se va con ella: tú habías escrito que en la ovulación hay más
laxitud ligamentosa por la relaxina y que había que priorizar máquinas para
proteger la articulación. Eso no es un ajuste de volumen, es una regla de
seguridad.

¿La quitamos a propósito o la muevo dentro de la Folicular Tardía?

**4. ¿Cómo conviven las dos jerarquías?** Me diste dos y no sé si son la misma
cosa o dos cosas distintas. Están los cuatro niveles de evidencia (A, B, C, D) y
ahora los cuatro niveles de la matriz (seguridad, fisiología, vectores,
composición).

Mi interpretación —y es como lo voy a programar si no me dices lo contrario— es
que son cosas distintas y se complementan: los niveles 1 a 4 son el ORDEN en que
el motor va decidiendo (primero descarta por seguridad, después ajusta el
volumen, después reparte los vectores), y los niveles A a D son para desempatar
cuando dos reglas del mismo nivel se contradicen. Si lo entendí mal, dímelo antes
de que lo programe.

---

Sobre el resto de documentos:

**Los perímetros los agrego.** Tienes razón en que con cintura y cadera no se
puede seguir la hipertrofia. Voy a añadir brazo, tórax, muslo y pantorrilla.

**Las zonas de cardio, el dashboard con fotos y todo lo de cadencia, TUT y
volumen efectivo** son muy buenos, pero son de la siguiente fase. Ese material
va al backlog para cuando construyamos el generador de rutinas — la tabla de
series por grupo muscular sobre todo, esa está muy bien hecha.

**Lo del ciclo en la app de la atleta** también es de la siguiente fase, porque
la atleta todavía no tiene app propia. Pero la primera mitad —que tú registres la
fecha del periodo en la valoración— ya está funcionando; entra a cualquier atleta
mujer y verás el bloque.

**Una cosa que quiero confirmarte:** en el documento del dashboard dice que el
PDF pasa a ser algo secundario. Eso choca con lo que me dijiste antes, que el PDF
era lo que vendía el producto, y con el plan, donde el PDF es una parte grande.
No lo cambio a menos que me digas que sí, que ahora prefieres la pantalla.

Y sigo esperando dos cosas tuyas para poder avanzar en los informes: **el logo en
archivo** (idealmente en PNG con fondo transparente o SVG) y **la plantilla de
cómo quieres que se vea el reporte**. Los colores ya los saqué de tu logo y del
PDF de entrenamiento, y la app ya está en rojo, dorado y negro.
