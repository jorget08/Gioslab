# Preguntas pendientes para Giovanni

Estado: **actualizado tras sus aclaraciones técnicas (2026-08-22).**
**Actualizado el 2026-08-26.** Llegó la matriz completa de condicionales, que era
el bloqueo de fondo, y después las respuestas a las cuatro contradicciones que
abría. Con eso el motor tiene **luz verde**: él mismo confirmó que la
interpretación de las dos jerarquías es correcta.

Todo lo suyo está aplicado. Quedan **tres preguntas abiertas**, todas menores
—F, K y la contradicción entre sus dos documentos del 26— y ninguna bloquea.

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

### B. Flexión de hombro ✅ RESUELTA — 170°, disputa cerrada

Confirmó que 180° estricto genera falsos positivos y dio tres bandas citando a
la AAOS: **≥170° óptimo · 150–169° limitación leve · <150° restricción severa**.

Su matriz decía 175 y se le preguntó cuál valía. Confirmó **170** y descartó los
175 de su propio documento. Implementado.

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

### K. Los perímetros no detectan asimetrías

Justifica pedirlos con dos motivos: seguir la hipertrofia real e **identificar
asimetrías**. Lo primero ya funciona; lo segundo no puede funcionar con los
campos que pidió, porque **no son bilaterales**: se mide "el brazo", no el
izquierdo y el derecho.

Para detectar una asimetría harían falta los dos lados de brazo, muslo y
pantorrilla — seis campos en vez de tres. No se añadió por cuenta propia porque
duplica el trabajo de medición en el gimnasio y eso lo decide él.

### H. Batería de movilidad ✅ RESUELTA — se SUMAN

*"Los tests nuevos SE SUMAN, no reemplazan. Mantener flexión de cadera y
rotación interna de cadera, cruciales para valorar el espacio femoroacetabular.
No borres ni migres datos guardados."*

Ya están los ocho tests. **Cero migración de datos**, que era el riesgo.

Corrigió además dos umbrales:

| | Antes | Ahora | Motivo |
|---|---|---|---|
| Flexión de hombro | 180° | **170°** | AAOS: lo normal va de 165° a 180°. Con 180 estricto, 178° salía restringido |
| Rotación externa de hombro | 90° | **90°** (sin cambio) | Los 70° de su matriz son el mínimo de población sedentaria, no de quien hace trabajo overhead |

### I. Regla de la ovulación ✅ RESUELTA — no se cayó

*"No se cayó, se convierte en un submódulo de seguridad dentro de la Folicular
Tardía."* Confirmó el fondo: durante el pico sube la laxitud del ligamento
cruzado anterior.

Implementado como **bandera y no como fase**, que es la distinción que importa:
la fase gestiona volumen metabólico y esto es seguridad articular. Días 12–14
levantan `picoOvulatorio` sin dejar de ser Folicular Tardía, y eso dispara la
prioridad a cadena cinética cerrada.

Los multiplicadores también se afinaron con su matriz: Folicular Tardía pasa de
×1.1 a **×1.15** y Lútea Tardía de ×0.8 a **×0.75**.

### J. Las dos jerarquías ✅ RESUELTA — luz verde

*"Tu interpretación es 100% CORRECTA. Es exactamente así como debe construirse
la arquitectura del motor."* Los Niveles 1–4 son el orden de ejecución y los
LEVEL_A–D el desempate dentro de cada nivel. El esquema de la 3.1 se queda como
está.

---

## 🔴 Contradicción NUEVA entre sus dos documentos del 2026-08-26

Mandó dos PDF el mismo día que dicen lo contrario en el punto que más importa.

| | `Aclaracion_Onboarding_Gradual` | `Sugerencia_Desarrollo` (Modo Express) |
|---|---|---|
| Nombre | *"NO nombrar la función como Modo Genérico o Modo Rápido"* | *"Modo Express"* |
| Datos que faltan | El software **restringe** ejercicios de alto riesgo | **"Asume valores por defecto de movilidad en rango Estándar/Neutro"** |

**La segunda es peligrosa y va contra todo lo construido.** Dar por buena una
movilidad que nadie midió es exactamente lo que el sistema evita desde la 2.5:
`estadoROM` devuelve `null` y no `Óptimo` para un test sin tomar, porque tratar
un dato ausente como favorable sería prescribir sentadilla profunda a alguien a
quien nadie le miró el tobillo.

**Se sigue la Aclaración**, que además es la que él mismo escribe como posición
considerada y la que corrige el nombre. Del Modo Express se conserva una cosa
que sí es buena: el **Módulo 2, "sin plicómetro"**, para clientes a distancia.
Eso ya está medio construido —la tabla distingue `body_fat_pct_source` entre
`calculado` y `manual` desde la 1.2— y solo falta la casilla en la interfaz.

**Lo que entra de ahí y es barato:** marcar el perfil como *"Evaluación
pendiente"* mientras falten datos biomecánicos. Es derivable de lo que ya hay y
le dice al entrenador qué le falta. El plan de inicio en sí es el generador de
rutinas, o sea Fase B.

---

## 📥 Lo que llegó el 2026-08-25 y qué se hace con ello

| Documento | Veredicto |
|---|---|
| **Matriz completa de condicionales** | ✅ **Es lo que faltaba.** Desbloquea 0.5 y todo el grupo 3 |
| **Respuestas técnicas v3** | ✅ Cierra las cuatro preguntas, bien razonadas |
| Requerimiento técnico 1.1 — más perímetros | ✅ **Hecho.** Brazo relajado y contraído, tórax, muslo y pantorrilla, con su evolución en la ficha. Ver pregunta K |
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

## 🔴 Contradicción del 2026-08-27: ¿Yuhasz o Jackson & Pollock?

Mandó las fichas y los planes de **Diego Mafla** y **Daniela Méndez**, dos atletas
suyos reales. Al cotejarlas apareció que **no calcula el porcentaje graso como lo
documentó**.

| | Fórmula | Pliegues |
|---|---|---|
| Ficha "para el desarrollador" (19-ago) | Jackson & Pollock 7 + Siri | 7, con pectoral |
| **Fichas reales de sus clientes** | **Yuhasz** | **6, sin pectoral** |

La fórmula está literal en la celda E11 de la ficha de Daniela:

```excel
IF(B5="H",(Σ6*0.1051)+2.585, IF(B5="M",(Σ6*0.1548)+3.58,"Defina Género"))
```

Y cuadra al decimal con los tres casos: Diego 106 → **13.7256%**; Daniela 145 →
**26.026%**; su plan v2, 155 → **27.57%**. Son los números que sus clientes tienen
impresos en la mano.

**Se implementó Yuhasz** por `CLAUDE.md` §3.4 —manda el Excel que usa, no el que
documentó— y por un motivo práctico que decide solo: **sus fichas reales no miden
el pliegue pectoral**, así que Jackson & Pollock no es que dé otro número, es que
no se puede calcular sobre un atleta suyo. J&P se conserva y se puede pedir.

**Lo que tiene que confirmar:** si Yuhasz es el método definitivo, o si quiere
volver a J&P y entonces empezar a medir el séptimo pliegue.

---

### K. Los perímetros — RESPONDIDA por la práctica

Sus fichas reales miden Brazo relajado, Brazo contraído, Cintura, Cadera, Muslo y
Pantorrilla. **No son bilaterales.** Es exactamente lo que se le preguntó: con eso
no se pueden detectar asimetrías, que era uno de los dos motivos que dio para
pedirlos. Sigue en pie si quiere duplicar los seis campos.

---

### Nuevo: el umbral de flexión de hombro

Su matriz (25-ago) dispara la regla a **< 175°**, pero el 26-ago corrigió el
umbral óptimo del test a **170°** citando a la AAOS. Se cargó 175 —es lo que dice
la matriz y disparar antes es el lado conservador— pero conviene que lo unifique.

---

## 🔴 Sigue bloqueado por él (`CLAUDE.md` §7)

- ~~La matriz completa de condicionales~~ ✅ **la había entregado el 25-ago y yo la
  juzgué corta.** Releída entera tiene 25 reglas con condición, acción y
  sustitución: 9 de nivel 1, 5 de nivel 2, 6 de nivel 3 y 6 de nivel 4. Cargada
  en la 3.3. Lo que sí falta de ella son las **contraindicaciones por ejercicio**,
  que su propia matriz da por hechas ("cruzamiento directo con base de datos de
  ejercicios") pero no entrega — eso es la 4.5.
- **Listado y medios de la biblioteca de ejercicios** — bloquea la 4.5. La
  pantalla para cargarlos ya existe (4.1) y agrupa por sus ocho patrones, así
  que puede entregar el listado ya clasificado y entra directo.
- **Assets de marca**: ✅ los **colores** llegaron el 2026-08-23 y ya están
  aplicados —se muestrearon de su logo y de sus informes, no se aproximaron—.
  Siguen faltando el **logo en archivo** (hoy la app usa solo el logotipo
  tipográfico) y la **plantilla de reporte**, que es lo que bloquea el grupo 5.
- ~~2–3 atletas reales para validar~~ ✅ **llegaron el 2026-08-27** (Diego Mafla y
  Daniela Méndez). Desbloquearon la 2.10 y la 3.4.

---

## Mensaje para enviarle — 2026-08-28

> Copiar y pegar. Sin jerga técnica.
> (Los anteriores, del 25 y el 27 de agosto, ya fueron enviados y respondidos.)

---

Giova, perfecto lo del Yuhasz y lo del hombro. Los dos quedan como están, no hay
que tocar nada. Y el argumento del pliegue pectoral me convenció: tiene sentido
que un dato que varía según quién mida no alimente al motor.

Lo de los perímetros bilaterales queda anotado, lo programo enseguida.

**Tu Excel de contraindicaciones ya está cargado y el motor lo está usando.**
Ahora, si registro un atleta con lesión de rodilla, el sistema le quita solo la
sentadilla frontal, las extensiones de cuádriceps y el curl femoral, y le explica
por qué. Antes no le quitaba nada.

Pero me faltan 21 ejercicios, y te explico por qué.

**Nombraste los ejercicios de dos formas distintas, y las dos son correctas.**
En la matriz de reglas los nombras por variante, porque las reglas las
distinguen: toda la regla de dorsiflexión existe para separar la sentadilla libre
profunda de la que va con talón elevado. En el Excel los nombras por familia:
"Sentadilla Trasera", "Prensa de Piernas", "Zancadas / Búlgaras".

De 31 nombres solo coincidían 4. Los demás los emparejé donde era evidente que
era el mismo ejercicio escrito distinto, y añadí los 16 que no teníamos (press de
banca, fondos, face pull, curls, planchas). Pero quedan 21 donde **no quiero
adivinar yo**, y por una razón concreta:

**Varios de esos 21 son justamente los sustitutos seguros.** La sentadilla
Goblet, la Safety Bar, la de talón elevado, el press en plano escapular, el peso
muerto rumano desde bloque. Si yo les copio las contraindicaciones del ejercicio
del que son sustituto, el motor los va a excluir también — y el entrenador se
queda sin nada que ofrecer. Rompería justo lo que hace útil al sistema.

Ahora mismo pasa esto, y es un ejemplo real: a una atleta con lesión de rodilla
el sistema le quita tres ejercicios correctamente, **pero le sigue permitiendo la
sentadilla libre profunda, la low bar, el hack libre y el sissy squat**, porque
esos cuatro están sin datos.

**Lo que necesito: esta misma tabla, con los 21 que faltan.** Mismo formato que
usaste, y si alguno no tiene ninguna contraindicación escribe "Ninguna".

| Ejercicio | Zonas contraindicadas | Condiciones contraindicadas |
|---|---|---|
| Sentadilla Libre Profunda |  |  |
| Sentadilla Low Bar |  |  |
| Sentadilla Goblet |  |  |
| Sentadilla con Safety Bar |  |  |
| Sentadilla Heels-Elevated |  |  |
| Sentadilla Búlgara con Apoyo |  |  |
| Hack Libre |  |  |
| Sissy Squat |  |  |
| Prensa 45° |  |  |
| Prensa Inclinada de Piernas |  |  |
| Zancadas Caminando |  |  |
| Peso Muerto Convencional |  |  |
| Peso Muerto Rumano desde Bloque |  |  |
| Glute Bridge |  |  |
| Patada de Glúteo en Polea |  |  |
| Abducciones en Polea |  |  |
| Press Militar tras Nuca |  |  |
| Press Overhead con Barra |  |  |
| Press en Plano Escapular |  |  |
| Press Inclinado a 60° |  |  |
| Pullover con Cuerda |  |  |

Zonas: Cervical, Dorsal, Lumbar, Hombro, Codo, Muñeca, Cadera, Rodilla, Tobillo,
Pie. Condiciones: Hipertensión, Embarazo, Hernia discal, Diástasis abdominal.

Dos cosas que noté de paso:

- **El peso muerto convencional no estaba en tu Excel**, y es el de más riesgo
  lumbar de toda la lista. Igual se te pasó.
- **Los fondos en paralelas los dejé sin clasificar de patrón**, porque se pueden
  contar como empuje horizontal o vertical según el énfasis. Dime cuál prefieres.

**Y una pregunta nueva, de lo de las asimetrías.** Dijiste que el motor debería
prescribir unilaterales empezando por la pierna débil y ajustar el volumen en esa
zona. Para programarlo necesito el umbral: pusiste 2 cm como ejemplo, pero ¿a
partir de cuántos centímetros de diferencia se considera asimetría que hay que
corregir? ¿Es el mismo número para brazo, muslo y pantorrilla, o cada uno tiene
el suyo?

---

Sigo esperando el **logo en archivo** y una **plantilla de reporte** tuya. Son lo
único que bloquea los PDF, que es lo siguiente grande.

---

## 29 de agosto — cómo programas tú

Giovanni, cerramos el motor. Ya decide qué ejercicios sí y cuáles no para cada
atleta, con la justificación a la vista. Y las fotos y los videos de la
biblioteca ya tienen dónde entrar: cuando me los mandes, los subo.

Pero al ir a armar la rutina me topé con algo que no había visto: **el motor te
dice qué ejercicios, no te dice el entrenamiento.** Sabe que a Daniela no le
puede dar sentadilla libre profunda y sí prensa. No sabe si entrena tres días o
cinco, qué va cada día, cuántas series, en qué rango de repeticiones, ni cuánto
le sube la semana siguiente.

Eso lo tienes tú en la cabeza y en los planes que ya entregas. Necesito bajarlo
igual que bajamos la matriz de reglas: lo escribes una vez y de ahí en adelante
lo hace el sistema, y tú corriges lo que quieras encima.

**Voy a usar los planes de Diego y Daniela como prueba.** Si lo que arme el
sistema no se parece a lo que tú les diste, el que está mal es el sistema.

---

### Las cinco cosas que necesito

Contéstame como te sea más cómodo: escrito, en audio, o rellenando esto.

**1. ¿Qué tipos de programación manejas?**
Los nombres que tú les das. Hay un campo esperándolos desde el primer día.

| Cómo lo llamas | Para qué atleta / momento lo usas |
|---|---|
|  |  |
|  |  |

**2. ¿Cómo repartes la semana?**
Qué va cada día, según cuántos días entrene la persona.

| Días por semana | Día 1 | Día 2 | Día 3 | Día 4 | Día 5 |
|---|---|---|---|---|---|
| 3 |  |  |  | — | — |
| 4 |  |  |  |  | — |
| 5 |  |  |  |  |  |

**3. ¿Cuántas series por grupo muscular a la semana?**
Un mínimo y un máximo me sirven, no necesito el número exacto.

| Grupo | Mínimo | Máximo |
|---|---|---|
| Pecho |  |  |
| Espalda |  |  |
| Piernas |  |  |
| Hombro |  |  |
| Brazo |  |  |

**4. ¿Qué repeticiones y qué RPE según el objetivo?**

| Objetivo | Repeticiones | RPE / RIR | Descanso |
|---|---|---|---|
| Fuerza |  |  |  |
| Hipertrofia |  |  |  |
| Pérdida de grasa |  |  |  |

**5. ¿Cómo progresa de una semana a otra?**
¿Sube peso, sube repeticiones, sube series? ¿Cada cuántas semanas descarga, y
qué le quitas en esa semana?

---

### Y una cosa más, de a dónde va esto

Después de esta fase, tus atletas van a tener **su propia app**. Entran con su
usuario, ven la rutina del día, anotan lo que levantaron, se pesan, se toman las
medidas y reciben un informe que pueden repreguntar. Como varios de tus planes
incluyen nutrición, ahí también van a poder registrar lo que comen.

Para esa parte, cuando lleguemos, voy a necesitar **cómo calculas tú las
calorías y la proteína**, y cómo cambian según el objetivo. No corre prisa —
avísame cuando quieras que lo hablemos.

---

Sigo esperando también, de lo anterior:

- **Las 21 filas de contraindicaciones** que te pedí el 27. Sin ellas, a un
  atleta con la rodilla mal el sistema le sigue permitiendo la sentadilla libre
  profunda, la low bar, el hack libre y el sissy squat.
- **El logo en archivo y una plantilla de reporte tuya.** Es lo único que bloquea
  los PDF.
- **Las fotos y los videos de los ejercicios**, que ya tienen dónde ir.

---

## 31 de agosto — cargado todo, y tres cosas que chocan

Giovanni, llegó todo y está cargado. **La biblioteca queda completa: 47 de 47
ejercicios con contraindicaciones, ninguno sin datos.** Los 21 nombres
coincidieron uno a uno, así que esta vez no tuve que interpretar nada.

Lo del método de programación es exactamente lo que necesitaba. Con eso ya puedo
construir el generador de rutinas, que es lo siguiente grande.

Pero al cargarlo salieron tres cosas que no quiero decidir yo.

### 1. Un atleta con la rodilla mal se queda sin nada de pierna

Te aviso con el número exacto porque es el que me preocupaba cuando te pedí
estos 21.

Marcaste "Rodilla" en las cinco sentadillas, en las dos prensas, en el hack y en
el sissy squat. Contando los 12 ejercicios dominantes de rodilla que hay en la
biblioteca, **a un atleta con lesión de rodilla el motor le deja 0.** Cero. No le
puede ofrecer ni la Goblet, ni la Safety Bar, ni la de talón elevado.

En hombro no pasa: dejaste el Press en Plano Escapular sin "Hombro", así que ahí
la sustitución sigue funcionando y el motor tiene qué ofrecer. Por eso creo que
lo de rodilla puede ser un descuido y no una decisión.

**Dime cuál de las dos es:**

- **(a) Es correcto:** con la rodilla lesionada no se hace nada dominante de
  rodilla, punto. Entonces lo dejo así, y el motor le dirá al entrenador "no hay
  ejercicio de rodilla disponible" en vez de inventarse uno.
- **(b) Hay excepciones:** algunas de esas variantes sí se pueden dar con
  molestia de rodilla, con cuidado. Entonces dime cuáles quitar de la lista.
  Mi sospecha es Goblet, Safety Bar y talón elevado, pero **no lo voy a decidir
  yo**.

**Un dato más que salió al construir la matriz de sustitución.** Ya cargué las 20
sustituciones que tus propias reglas declaran, así que ahora, cuando el sistema
descarta un ejercicio, ofrece con qué reemplazarlo. Funciona: a alguien con el
hombro mal le quita el press tras nuca y le ofrece el press en plano escapular.

**Pero en rodilla no ofrece nada, y no es un fallo del sistema.** Es que todos
los sustitutos posibles de los ejercicios de rodilla están, según tu tabla,
también contraindicados para rodilla. Tus sustituciones las escribiste pensando
en restricciones de movilidad (dorsiflexión, hombro), no en lesiones.

Así que si la respuesta a lo de arriba es **(a) es correcto**, entonces necesito
una tercera cosa: **dime qué le doy a esa persona en lugar de pierna.** ¿Trabajo
de cadera —hip thrust, glute bridge—? ¿Nada de tren inferior? El sistema puede
decir "no hay opción segura", pero es mejor que diga qué sí.

### 2. El umbral de asimetría del brazo no cuadra entre tus dos documentos

En el formulario pusiste que en **brazo** el protocolo se activa por encima de
**1 cm o 5%**. En `Principios_Entrenamiento_GIOSLAB` pusiste **≥1,5 cm en
brazos**.

En pierna sí coinciden los dos en 2 cm, así que esa parte la doy por buena.

¿Cuál vale para brazo, 1 cm o 1,5 cm? Lo pregunto porque un umbral demasiado
bajo le activa un protocolo correctivo a gente que no lo necesita — un
centímetro de diferencia entre brazos lo tiene casi todo el mundo.

Y para pantorrilla escribiste "1.cm": entiendo 1,0 cm. Confírmame.

### 3. Los fondos: me pediste los dos patrones y solo cabe uno

Dijiste que quieres fondos como empuje horizontal *y* vertical, porque el
horizontal carga más pectoral y el vertical más tríceps. Tiene todo el sentido
metodológico, pero el patrón es la llave con la que el motor sustituye un
ejercicio por otro, y hoy cada ejercicio tiene uno solo.

La forma limpia de resolverlo es la que tú ya usas en la matriz: **partirlo en
dos ejercicios**, como hiciste con las sentadillas. Algo así:

- *Fondos en Paralelas (énfasis pectoral)* → empuje horizontal, torso inclinado
- *Fondos en Paralelas (énfasis tríceps)* → empuje vertical, torso vertical

¿Te sirven esos dos nombres, o los llamas de otra forma? En cuanto me digas, los
separo.

---

### Lo que sigue de tu lado

- **Las fotos y los videos de los ejercicios.** Ya tienen dónde ir: se suben
  desde la ficha del ejercicio y se ven en la biblioteca.
- **El logo en archivo y una plantilla de reporte.** Es lo único que bloquea
  los PDF.

Lo de la nutrición lo dejo para cuando lleguemos, sin prisa.

---

## 1 de septiembre — aplicadas tus tres respuestas

Todo entró y está funcionando. Te cuento qué cambió y la única cosa que me quedó
sin resolver.

### La rodilla: de 0 ejercicios a 6

Quité "Rodilla" de todas las sentadillas menos la libre profunda, como dijiste.
Un atleta con la rodilla lesionada pasa de no tener **nada** de pierna a poder
hacer seis: Goblet, Safety Bar, talón elevado, frontal, búlgara y low bar.

**Y tu "con cuidado" no lo tiré.** Una contraindicación es sí o no, así que
quitarla sin más habría dejado al atleta con una sentadilla y ninguna
advertencia. Lo metí como un aviso que ahora sale en su prescripción: *"Lesión de
rodilla: las sentadillas se permiten CON PRECAUCIÓN. La sentadilla libre profunda
queda excluida."* Está en `/admin/reglas` por si quieres afinar el texto —
concretar rango, carga o tempo.

**Lo que me falta, y es la única pregunta que te dejo hoy.** Dijiste "las
sentadillas", así que solo toqué las que se llaman sentadilla. Estos siete siguen
descartados porque no los nombraste:

| Ejercicio | ¿Se puede con rodilla lesionada? |
|---|---|
| Prensa 45° |  |
| Prensa Inclinada de Piernas |  |
| Hack Libre |  |
| Sissy Squat |  |
| Zancadas Caminando |  |
| Extensiones de Cuádriceps |  |
| Curl Femoral Acostado |  |

Preferí quedarme corto antes que pasarme: equivocarme de menos le deja opciones
sin usar, equivocarme de más le pone un sissy squat encima de una rodilla mala.

**Pero la prensa me chirría.** Es el ejercicio de pierna más amable con la
rodilla que hay, y es el que TÚ mandas como sustituto cuando alguien tiene mala
dorsiflexión. Ahora mismo el sistema permite la sentadilla goblet y prohíbe la
prensa, que es justo al revés de lo que haría cualquiera. Si me dices que sí, la
habilito.

### Asimetrías: cerrado

Me quedo con 1 cm o 5% para el brazo. Con eso ya puedo programarlo:

- Brazo: protocolo por encima de **1 cm o 5 %**
- Muslo: por encima de **2 cm**
- Pantorrilla: por encima de **1 cm o 5 %**

### Fondos: ya son dos

*Fondos en Paralelas (énfasis pectoral)* como empuje horizontal, y *Fondos en
Paralelas (énfasis tríceps)* como empuje vertical. El antiguo quedó archivado,
no borrado, para no romper nada que lo nombrara.

---

Sigo esperando **las fotos y los videos** de los ejercicios, y **el logo con una
plantilla de reporte**, que es lo único que bloquea los PDF.

---

## 1 de septiembre (tarde) — la tabla del tobillo

Giovanni, dos cosas.

**Lo de la asimetría, hecho.** Me quedo con **1,5 cm en brazo, sin porcentaje**.
De paso eso simplifica el sistema: sin el criterio de porcentaje no hace falta
arrastrar el perímetro de referencia, la asimetría sale de la resta directa.

Solo confírmame una cosa: **¿el 1,5 cm es solo del brazo, o vale para los tres?**
Lo pregunto porque el muslo lo tenías en 2 cm y la pantorrilla en 1 cm, y no sé
si los repensaste también.

---

**Y ahora la tabla que mandaste. No la he cargado todavía, y te explico por qué.**

Primero, para que estemos alineados: Jorge me la pasó pensando que te habías
equivocado y que era de rodilla. Yo creo que **no te equivocaste: es de tobillo**,
y está bien así. Lo digo porque las nueve notas justifican por tobillo —"reducir
el ángulo en el tobillo", "cero exigencia de tobillo", "nula tensión en el
tobillo"— y elevar talones o subir los pies en la prensa son exactamente las
compensaciones de una dorsiflexión corta. Donde mencionas la rodilla es la
consecuencia, no la causa. Corrígeme si me equivoco.

**Dicho eso, la tabla es un salto de calidad.** Hoy el sistema, ante un tobillo
malo, solo sabe *quitar* ejercicios. Tu tabla no quita ninguno de los nueve:
modifica, reposiciona o mantiene. Eso es mucho mejor para el entrenador. Pero
tengo tres dudas y prefiero preguntarlas a inventármelas.

### 1. ¿A cuántos centímetros equivale "Deficiente"?

Es la que me bloquea de verdad. El motor no entiende "Deficiente": decide con los
centímetros de dorsiflexión, y hoy tiene dos tramos que definiste tú:

- **Menos de 5 cm** → severa: bloquea la sentadilla libre profunda y el hack.
- **Entre 5 y 10 cm** → limitada: la permite con cuña de talón.

Tu tabla nueva no bloquea nada. Entonces:

- Si **"Deficiente" es menos de 5 cm**, tu tabla *reemplaza* esas exclusiones y
  el sistema pasa a permitir la sentadilla libre con talones elevados.
- Si **"Deficiente" es el tramo de 5 a 10**, conviven y no hay que tocar nada de
  lo que bloquea.

No lo puedo adivinar: si me equivoco, le dejo una sentadilla profunda a alguien
con 3 cm de dorsiflexión.

### 2. Seis de las variantes que nombras no existen todavía

| Variante que nombras | ¿Es un ejercicio nuevo, o es otro nombre de uno que ya tengo? |
|---|---|
| Sentadilla Goblet con Talones Elevados |  |
| Sentadilla Hack (Pies en Apoyo Alto) |  |
| Prensa de Piernas (Posición Alta de Pies) |  |
| Step-up Bajo |  |
| Hip Thrust en Banco / Máquina |  *(¿es el Hip Thrust con Barra que ya tengo?)* |
| Sillón de Extensión de Cuádriceps |  *(¿son las Extensiones de Cuádriceps?)* |
| Curl Femoral en Máquina |  *(¿es el Curl Femoral Acostado?)* |

Te lo pregunto porque es la tercera vez que nos pasa lo de los nombres, y las dos
anteriores me costaron trabajo repetido. Si son el mismo ejercicio con una
indicación de ejecución distinta, mejor no duplicarlos: el sistema puede decir
"Extensiones de Cuádriceps, siéntate más atrás" sin crear un ejercicio nuevo.

### 3. "Hack en Máquina" no es el que tengo bloqueado

Tu tabla habla de la **Sentadilla Hack en Máquina**. La regla que tienes vigente
bloquea el **Hack Libre**, que es otro ejercicio. ¿Los dos se comportan igual con
un tobillo malo, o solo el de máquina se salva subiendo los pies?

---

Sigo esperando **las fotos y videos** de los ejercicios y **el logo con una
plantilla de reporte**. Y la tabla de los siete de rodilla que te mandé esta
mañana — la prensa sobre todo.

---

## 2 de septiembre — contestó las nueve, y el tobillo queda cerrado de su lado

Sesión en directo. Se le pasaron las preguntas abiertas y contestó todas menos
tres, que aplazó él mismo.

### ✅ Tobillo — las tres, y las tres cambian cosas

**1. "Deficiente" es menos de 5 cm.** El tramo severo. Con eso su tabla de 9
filas **no convive con las exclusiones actuales: las reemplaza.**

**2. Los dos que hoy bloquea el tramo severo pasan a permitirse con talón
elevado** — la Sentadilla Libre Profunda y el Hack Libre. Se le preguntó
casilla por casilla y con la consecuencia escrita delante, porque es la regla
más protectora del motor y la diferencia es prescribir o no una sentadilla
profunda a alguien con 3 cm.

**3. Hack libre y hack de máquina son distintos.** Solo el de máquina se salva
subiendo los pies; el libre se queda como está.

**Y de los nombres, no eran seis los que faltaban: eran dos.** Confirmó que
cinco son renombres de ejercicios que ya existen —se prescriben con una
indicación de ejecución, sin duplicar la ficha, que es justo lo que se le
propuso— y que el **Step-up Bajo** era nuevo. La séptima la encontramos
nosotros al cruzar su respuesta 2 con la 3: la **Sentadilla Hack en Máquina**
tampoco estaba en la biblioteca. Dijo que la creáramos.

> **Nada de esto se ha cargado como regla todavía, y no es por él.** Las tres
> respuestas piden decir *"este se hace, PERO modificado"*, y la gramática hoy
> solo cuelga `modificador` de un ejercicio excluido o priorizado. Cargarlo
> ahora obligaría a excluir para poder modificar. Va detrás de la **3.9**.

### ✅ Rodilla — los siete, menos el sissy squat

Dijo que los siete se podían. Se le repreguntó **solo el Sissy Squat** —el
ejercicio que más carga la rodilla de la biblioteca, flexión profunda en el
punto de mayor cizalla— y rectificó: ese se queda fuera.

Aplicado: **Prensa 45°, Prensa Inclinada, Hack Libre, Zancadas Caminando,
Extensiones de Cuádriceps y Curl Femoral Acostado** dejan de descartarse por
lesión de rodilla. Con eso la prensa deja de estar prohibida mientras la goblet
se permitía, que era lo que chirriaba.

Cambia además el **motivo** por el que el sissy squat queda fuera: hasta hoy era
prudencia nuestra ante un silencio suyo; desde hoy es criterio suyo por escrito.

### ✅ Somatotipo — Yuhasz, confirmado

Cierra la contradicción a tres bandas de sus documentos. Ya estaba implementado
y validado al decimal contra Diego y Daniela (2.10). **Desbloquea la 2.6.**

### ✅ Periodización — manda el objetivo

Cuando su anexo (por nivel) y su formulario (por objetivo) chocan, el eje es
`training_goal`. Dato para la 5.2.

### ⏳ Aplazadas por él

- **Sus tres objetivos contra los cuatro del atleta** (Recomposición Corporal y
  Rendimiento Deportivo). *"Va a pasarme la info más tarde."* Es lo único que
  falta para cargar el método de programación entero.
- **El umbral de asimetría de pantorrilla y qué ejercicios son unilaterales.**
- **Cuánto es "ajustar el volumen en esa zona".** Aclaró que es **un porcentaje
  del peso**, no series extra —lo cual cambia lo que hay que construir: es
  carga dirigida, no volumen— pero no supo decir cuánto. Queda para después.

### 📷 El logo: mandó la pieza, no el archivo

Llegó la promocional: 518×382 px, con el fondo de montañas, el eslogan
incrustado y el texto quemado en la imagen. Para redes está bien; para la app no
sirve —a ese tamaño el escudo GQ se pixela en cualquier encabezado y no se puede
poner sobre fondo claro ni oscuro.

**Lo que hace falta es el escudo GQ solo, en SVG o PNG con transparencia, en
grande** —o el archivo original del diseñador (`.ai`, `.svg`, `.psd`)—. Con eso
entra en la app, en el PDF y en el ícono de la app móvil. **Sigue bloqueado el
grupo 6**, junto con la plantilla de reporte y los medios de los ejercicios.

---

## 2 de septiembre (segunda ronda) — y lo que corrigió de la primera

Se le repreguntó lo que había quedado a medias. Dos de sus respuestas de la
primera ronda cambiaron, y conviene que quede escrito cuáles.

### ✅ Los objetivos: mapeo de 5 a 3, cerrado

Había dicho *"se programan igual que los otros 3"*, que no decía **a cuál**. Con
la tabla delante señaló:

| Objetivo del atleta | Se programa como |
|---|---|
| **Recomposición Corporal** | Hipertrofia |
| **Rendimiento Deportivo** | Fuerza |

**Con esto la 5.2 deja de esperar nada suyo.** Es la que estaba delante de todo
el generador de rutinas.

### 🔄 Corrigió el hack: era al revés

En la primera ronda dijo que los dos ejercicios nuevos contraindicaban rodilla.
Al señalarle que eso dejaba el **hack de máquina más restrictivo que el libre**
—al revés de lo esperable, y con el libre recién liberado esa misma mañana—
contestó: *"fue equivocación, es al revés"*.

Estado final: **Hack Libre sí contraindica rodilla** (vuelve a la lista) y el
**Hack en Máquina no**. De los siete que se le preguntaron por la mañana, entran
cinco, no seis: se caen el sissy squat y el hack libre.

> Vale la pena anotarlo porque es el mismo patrón de la mañana: la pregunta que
> destapó el error no fue "¿estás seguro?", fue enseñarle **la consecuencia**
> —un ejercicio de máquina más restrictivo que su versión libre—. Las tres
> correcciones del día salieron así.

### 🔄 Y corrigió lo del volumen: no era volumen

Por la mañana dijo que "ajustar el volumen en esa zona" era **un porcentaje del
peso**. Al volver: *"fue un error, lo que hace es que con la parte débil se
hacen 3 o 4 repeticiones más que en el lado fuerte"*.

**Eso ya cabe en la gramática actual**: es un `modificador` sobre un ejercicio
PRIORIZADO, y el motor sabe hacerlo. Se cae una de las tres razones que
justificaban la 3.9 — y de paso deja una lección: se había apuntado como límite
del diseño algo que era una petición mal entendida. El diagnóstico también falla
por exceso.

### ✅ Pantorrilla: 1,5 cm

El del brazo, no el del muslo. Cierra los tres umbrales de la 2.15 y la
pantorrilla pasa a juzgarse por primera vez.

### ✅ Hombro: se queda en 175°

Confirmó el umbral de su matriz. No hay nada que cambiar.

### 📚 La biblioteca unilateral — 22 ejercicios, y la decisión que la ordena

Mandó los 22 con músculo objetivo, series, repeticiones, RIR y una
justificación por ejercicio. Dos preguntas la ordenaron antes de tocar nada:

**1. ¿Unilateral es una ficha aparte o la misma ejecutada a un lado?**
→ *"Son el mismo ejercicio pero ejecutada a un lado."*

Es la respuesta que evita el desastre. **14 de los 22 ya existían con otro
nombre** —su "Prensa Unilateral a 45°" es nuestra "Prensa 45°", su "Step-Up
Unilateral en Banco" es el "Step-up Bajo" creado esa misma mañana— y cargarlos
como fichas nuevas habría llevado la biblioteca de 46 a 68 con las
contraindicaciones partidas entre las dos copias de cada ejercicio. Sale un
**marcador de ejecución unilateral**, no fichas nuevas. Los 8 restantes sí son
altas de verdad. Tarea **4.8**.

**2. Su lista viene en RIR y todo su método en RPE.** → *"conviértelo"*.
`RPE = 10 − RIR`, y se convierte **al cargar el dato, no al mostrarlo**.

### 📦 Material: lo aparca él

Dijo que el logo, la plantilla de reporte y los medios *"no son primordiales ni
bloqueantes por ahora"*. Se acepta, con una salvedad que no es opinión: **la
plantilla de reporte sigue siendo lo único que falta para el grupo 6**. Se puede
construir el PDF con una maqueta provisional y cambiar los assets después —
cuesta poco— pero entonces el grupo 6 no se puede dar por terminado hasta que
llegue la plantilla. Queda dicho para que no sorprenda en el hito 7.4.

### ⏳ Lo único que sigue pendiente de él

- **Las contraindicaciones completas** de la Sentadilla Hack en Máquina y el
  Step-up Bajo. Solo dijo la rodilla; falta el resto de regiones (el Hack Libre
  tiene lumbar, tobillo, hernia e hipertensión). Los dos ejercicios están
  creados pero **inactivos** hasta que lleguen.
- **Con qué se hace el Step-up Bajo**: peso corporal o mancuernas. `equipment`
  quedó NULL.
- **Las contraindicaciones de los 8 unilaterales nuevos** (4.8).
