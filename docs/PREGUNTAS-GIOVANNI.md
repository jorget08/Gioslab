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
