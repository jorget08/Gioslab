# Wizard de evaluación — especificación de interacción

> Tarea **2.1**. Se decide **antes** de codificar: las tareas 2.2 a 2.5 y 2.8
> implementan lo que está aquí. Si algo cambia, se edita este archivo primero.

---

## 1. Para quién y en qué condiciones

Esto no se llena en un escritorio. Se llena **de pie, en el piso del gimnasio,
con el plicómetro en una mano y el teléfono en la otra**, con el atleta enfrente
esperando y alguien interrumpiendo cada dos minutos.

De ahí salen todas las decisiones de abajo:

| Condición real | Consecuencia de diseño |
|---|---|
| Una sola mano libre | Todo lo tocable ≥ 44 px y en la mitad inferior de la pantalla |
| Se teclea con el pulgar | `inputMode` numérico siempre; cero teclado alfabético en la medición |
| Interrumpen a media evaluación | Guardado automático en cada campo, sin botón de "guardar" |
| Mala señal | Se escribe local y se sincroniza; nunca se pierde lo tecleado |
| Se mira al atleta, no al teléfono | Números grandes, avance automático entre pliegues |
| Se repite la evaluación cada 2–3 meses | Se muestra el valor anterior al lado de cada campo |

**Esa última fila es la que más valor aporta y la más fácil de olvidar.** Ver
"última: 12.0 mm" mientras se mide sirve para dos cosas: detectar un error de
tecleo al instante, y darle contexto al entrenador sin salir de la pantalla.

---

## 2. Estructura

```
  [0] Atleta            → elegir uno existente o crear
       │
  [1] Perfil y anamnesis      ← tarea 2.2
       │
  [2] Antropometría           ← tarea 2.3
       │
  [3] Segmentos y proporciones ← tarea 2.4  ┐ una sola evaluación,
       │                                     │ una sola fila
  [4] Movilidad               ← tarea 2.5  ┘
       │
  [→] Ficha del atleta        ← tarea 2.9
```

El paso 5 "Resumen" del plan original no se construyó: lo sustituye la ficha.
El porqué está en §8.

### Reglas de navegación

- **Se puede saltar cualquier paso salvo el 0 y el 1.** A veces solo se toma la
  antropometría. Obligar a completarlo todo haría que el entrenador abandone y
  vuelva al Excel.
- **Cada paso se guarda al salir, completo o no.** No hay botón "guardar".
- **El cálculo espera a tener sus datos.** El porcentaje graso necesita los 7
  pliegues; con 5 no se muestra un número aproximado, se muestra qué falta.
- Barra de progreso solo cuando el recorrido tiene más de un paso. Anunciar
  "1 / 5" cuando al guardar se vuelve a la lista promete pantallas que no vienen.

---

## 3. Paso 0 — Atleta

Lista de atletas del espacio activo, con buscador, y un botón grande de
**"Nuevo atleta"**.

Cada fila muestra el nombre y **cuándo fue su última evaluación**, porque es el
dato que el entrenador usa para decidir a quién le toca.

```
┌────────────────────────────────┐
│ 🔍 Buscar atleta               │
├────────────────────────────────┤
│ María Fernanda Gómez           │
│ última evaluación: hace 6 meses│
├────────────────────────────────┤
│ Andrés Motta                   │
│ última: hace 3 semanas         │
└────────────────────────────────┘
     [ + Nuevo atleta ]
```

---

## 4. Paso 1 — Perfil y anamnesis

### Campos

| Campo | Control | Obligatorio | Notas |
|---|---|---|---|
| Nombre completo | texto | **sí** | `autocapitalize=words` |
| Fecha de nacimiento | selector de fecha | **sí** | La edad entra en la fórmula de densidad corporal |
| Sexo biológico | Masculino / Femenino | **sí** | Cambia la fórmula. "Femenino" habilita el módulo de ciclo |
| Objetivo principal | desplegable | no | 5 opciones de la ficha de Giovanni |
| Nivel de experiencia | desplegable | no | 5 opciones |
| Lesiones y antecedentes | lista, se añaden una a una | no | Zona, descripción, estado |
| Consentimiento de datos | casilla | **sí** | Ver §4.1 |

**Por qué la fecha de nacimiento es obligatoria y no la edad:** la edad entra
en la fórmula de Jackson & Pollock. Si se guardara el número, envejecería mal y
los cálculos de dentro de dos años saldrían con la edad de hoy.

### 4.1 Consentimiento — Ley 1581

Dos casillas separadas, **ninguna marcada por defecto**:

```
☐ Autorizo el tratamiento de mis datos de salud
  (composición corporal, lesiones, antecedentes)     ← obligatoria

☐ Autorizo además el registro de mi ciclo menstrual
  para ajustar el entrenamiento                       ← opcional, solo si
                                                        el sexo es femenino
```

La segunda es **opcional de verdad**: si no se marca, el módulo de ciclo no
aparece en ningún paso y la evaluación funciona igual. Son datos de salud
reproductiva, la categoría más sensible de la ley.

Se guarda la versión de la política aceptada, no solo la fecha.

---

## 5. Paso 2 — Antropometría

El paso más largo y el que decide si el entrenador adopta la herramienta o no.

### 5.1 Básicos

| Campo | Rango que bloquea | Advertencia si |
|---|---|---|
| Estatura (cm) | 100 – 260 | cambia > 2 cm respecto a la anterior |
| Peso (kg) | 20 – 400 | cambia > 10 % respecto al anterior |

### 5.2 Pliegues (mm) — modo medición

Siete pliegues seguidos: tríceps, subescapular, suprailíaco, abdominal, muslo,
pantorrilla, pectoral.

Tecleados como un formulario normal son siete campos pequeños en una lista, con
el pulgar buscando cada uno mientras se sostiene el plicómetro. En vez de eso,
**una pantalla por pliegue**:

```
┌────────────────────────────────┐
│  ●●●○○○○      Pliegue 4 de 7   │
│                                │
│      Abdominal                 │
│      ─────────────             │
│                                │
│         ┌──────────┐           │
│         │   16.0   │  mm       │
│         └──────────┘           │
│                                │
│      anterior: 16.0 mm         │
│                                │
│   [  Atrás  ]   [ Siguiente ]  │
└────────────────────────────────┘
```

- El campo ya viene enfocado con el teclado decimal abierto.
- **Avance automático** al escribir un valor válido y hacer una pausa: el
  entrenador no tiene que buscar "Siguiente" con la mano ocupada.
- El valor anterior se muestra siempre, y es tocable para copiarlo tal cual —
  útil cuando un pliegue no cambió.
- Se puede salir del modo medición a la lista completa en cualquier momento.

### 5.3 Perímetros

Cintura y cadera (cm, rango 40–200). El ratio cintura/cadera se calcula solo.

### 5.4 Resultado en vivo

En cuanto están los 7 pliegues, la talla, el peso, la fecha de nacimiento y el
sexo, aparece abajo:

```
┌────────────────────────────────┐
│  Suma 7 pliegues     84.0 mm   │
│  Densidad corporal   1.05765   │
│  Grasa corporal      18.0 %  ↓ │
│  Masa magra          51.2 kg   │
│  IMC                 23.0      │
└────────────────────────────────┘
```

La flecha compara con la evaluación anterior. **No se emite juicio** —ni
"bien" ni "alto"—: el sistema es un copiloto y quien interpreta es el
entrenador.

Si falta algún dato, en lugar del número: *"Faltan 2 pliegues para calcular el
porcentaje graso"*.

### 5.5 Porcentaje graso medido, no calculado

Un enlace discreto: **"Tengo un dato de bioimpedancia o DEXA"**. Abre un campo
para escribirlo a mano y marca el origen como `manual`.

Importa porque un valor medido y uno estimado no son comparables entre sí, y
sin distinguirlos la gráfica de evolución mezclaría dos cosas distintas.

---

## 6. Paso 3 — Segmentos y proporciones

> ✅ **Desbloqueado.** Giovanni confirmó que no hay umbral: es un juicio del
> entrenador con tres opciones. Las medidas en cm quedan opcionales.
>
> Este paso **no guarda**: pasa al 4, que inserta la fila con lo de ambos.

| Campo | Control | Opciones |
|---|---|---|
| Longitud de fémur | desplegable | Corto · Promedio · Largo |
| Longitud de torso | desplegable | Corto · Promedio · Largo |
| Proporción fémur/torso | desplegable | *pendiente del catálogo de Giovanni* |
| Medidas en cm | opcional | fémur 20–70, húmero 15–50, torso 30–90 |

---

## 7. Paso 4 — Movilidad

> ✅ **Construido** (tarea 2.5), tras las aclaraciones de Giovanni del 2026-08-22.
> El título ya no dice "y patrones": ver más abajo.

**Se teclea la medida, no se elige la etiqueta.** Es el cambio respecto al plan
original, y tiene dos razones:

- Guardar `Limitada` perdería el dato. Dos atletas con 5.1 cm y 9.9 cm no están
  igual, y si Giovanni mueve un umbral habría que remedir a todo el mundo. Con
  los centímetros guardados, el histórico se reinterpreta solo (§3.5).
- La clasificación aparece **en vivo, al lado del campo**, con el umbral escrito.
  El entrenador ve *por qué* su 8.5 sale Restringido y puede discutirlo antes de
  guardar, en vez de descubrirlo cuando el motor ya excluyó media rutina (§3.6).

| Prueba | Unidad | Óptimo desde | Protocolo |
|---|---|---|---|
| Dorsiflexión de tobillo | cm | 10 | Test de pared |
| Flexión de cadera | ° | 120 | Decúbito supino, sin despegar la lumbar |
| Rotación interna de cadera | ° | 30 | Sentado, rodilla a 90° |
| Extensión torácica | — | `Normal` | Observación de perfil *(único cualitativo)* |
| Flexión de hombro | ° | 180 | Espalda contra la pared |
| Rotación externa de hombro | ° | 90 | Codo al costado a 90° |

Agrupadas por región en el orden en que se recorre al atleta: **tobillo → cadera
→ torso → hombro**.

```
   Dorsiflexión de tobillo                antes 7.5cm
   Test de pared: distancia del dedo gordo al muro…

   ┌──────────────────────┐ ┌──────────────┐
   │ 3.5             cm   │ │   Severa     │
   └──────────────────────┘ └──────────────┘
   Óptimo desde 10 cm; por debajo, limita el rango
   profundo en sentadilla.
```

La dorsiflexión muestra **la severidad** (`Severa` / `Limitada` / `Óptima`) en
vez del binario, porque la ficha define dos bandas restringidas con acciones
distintas y colapsarlas perdería una regla. No se contradicen: ambas son
`Restringido` para el motor.

### Por qué ya no hay bloque de "patrones"

Su **MÓDULO 02** aclaró que `Eficiente / Compensada / De Riesgo` es la **salida
del motor por ejercicio**, no algo que el entrenador clasifique. Pedírselo era
pedirle el trabajo del motor. Ese resultado vive en `engine_runs.output`.

### Este paso cierra la evaluación biomecánica

Los pasos 3 y 4 son **una sola evaluación** y acaban en la misma fila. Como la
tabla es de solo inserción, el paso 3 no guarda: deja lo suyo en el borrador y el
paso 4 inserta todo junto. El borrador es además lo que hace que sobreviva a que
el sistema operativo cierre la app.

Se puede guardar con pruebas sin tomar. La pantalla lo dice, porque el motor no
puede concluir nada sobre una articulación que nadie midió.

---

## 8. Paso 5 — Resumen → **sustituido por la ficha del atleta** (tarea 2.9)

El plan original era una pantalla de revisión antes de guardar:

```
✓ Perfil            completo
✓ Antropometría     7/7 pliegues · 18.0 % graso
⚠ Segmentos         sin registrar
✓ Movilidad         completo

        [ Guardar evaluación ]
```

**No se construyó, y a propósito.** Al implementar los pasos quedó claro que
resolvía un problema que ya no existía:

- Cada flujo **avisa en el momento** de lo que falta y de lo que está fuera de
  rango. Un resumen que repite eso al final llega tarde: el atleta ya se fue.
- Los flujos no son un embudo único. Medir y evaluar se entran por separado
  desde la ficha, así que no hay un "final" común donde poner ese resumen.
- Lo que sí hacía falta era ver **el resultado**, no la lista de lo tecleado. Eso
  es la ficha del atleta, y además sirve cualquier día, no solo al terminar.

Al guardar se vuelve a la ficha, que es donde el entrenador ve para qué sirvió
lo que acaba de medir. **Nunca se sobreescribe una toma anterior** (§3.5): cada
evaluación es una fila nueva.

---

## 8b. Ficha del atleta (tarea 2.9)

La pantalla que le devuelve algo al entrenador después de tanto teclear.

| Bloque | Contenido |
|---|---|
| Cabecera | Edad, sexo, objetivo, nivel + accesos a Medir y Evaluar |
| Composición | Grasa y peso destacados, con su variación; masa magra y grasa, IMC, suma de 7 pliegues, cintura/cadera |
| Biomecánica | Proporción fémur/torso con su interpretación + los 6 tests con su estado |
| Ciclo | Solo si aplica: fase, multiplicador, efecto fisiológico y ajuste |
| Lesiones | Zona, estado y descripción |
| Historial | Todas las mediciones, con cuánto pasó entre cada una |

### La regla que la gobierna: no juzga

Ninguna variación se pinta de verde ni de rojo. Solo flecha, cifra y unidad.

Es tentador pintar "bajó 3 kg" de verde, pero para quien busca ganar masa es un
retroceso. Decidir cuál es cuál es criterio metodológico de Giovanni, y
codificarlo en un color sería inventar dominio (`CLAUDE.md` §6).

**Única excepción:** el ratio cintura/cadera, con aviso por encima de 0.85 en
mujeres, porque ese umbral está escrito en su ficha. Para hombres él no da corte
y la ficha no dice nada, en vez de usar el 0.90 de la literatura general.

### Otros dos detalles

- **`—` y no `0`.** Un cero es un dato; un guion es la ausencia de dato.
  Confundirlos en una ficha clínica no es aceptable.
- **El delta siempre lleva contexto**: "−3.4 % desde 6 meses antes". Perder eso
  en tres semanas o en ocho meses son dos historias distintas.

---

## 9. Validación: dos niveles

Es la decisión de diseño más importante de este documento.

**Nivel 1 — bloquea.** Fuera del rango de la base de datos. Son errores de
tecleo, no valores extremos:

> *1750 no puede ser una estatura en centímetros. ¿Querías escribir 175?*

El mensaje **propone la corrección probable** en vez de solo señalar el error.

**Nivel 2 — advierte, pero deja pasar.** Valores posibles pero raros, o saltos
grandes frente a la evaluación anterior:

> *El peso bajó 12 kg desde marzo. ¿Es correcto?*   [ Sí, es correcto ] [ Corregir ]

Nunca bloquea. Un atleta **puede** perder 12 kg en seis meses, y una herramienta
que no deja registrar la realidad se abandona el primer día.

### Mensajes de error

Escritos para el gimnasio, no para un programador:

| Situación | Mensaje |
|---|---|
| Campo obligatorio vacío | *Falta la fecha de nacimiento. La necesitamos para calcular el porcentaje graso.* |
| Fuera de rango | *1750 no puede ser una estatura en centímetros. ¿Querías escribir 175?* |
| Sin consentimiento | *Sin la autorización de datos no podemos guardar la evaluación.* |
| Sin conexión | *Guardado en este dispositivo. Se subirá cuando vuelva la señal.* |
| Cálculo incompleto | *Faltan 2 pliegues para calcular el porcentaje graso.* |

Cada mensaje dice **qué pasó y qué hacer**. Ninguno dice solo "valor inválido".

---

## 10. Borradores (tarea 2.8)

- Se guarda en el dispositivo **en cada cambio de campo**, sin botón.
- Al volver a abrir la app: *"Tienes una evaluación de María Fernanda a medias,
  empezada hace 2 horas."* con dos botones: **Continuar** o **Descartar**.
- El borrador vive en el dispositivo hasta que se guarda la evaluación
  completa. No viaja al servidor: son datos de salud a medio capturar, y
  guardarlos en el servidor multiplicaría la superficie expuesta sin necesidad.
- Se descarta solo a los 7 días.

---

## 11. Estado de cada paso

| Paso | Estado |
|---|---|
| 0 Atleta | ✅ construido |
| 1 Perfil y anamnesis | ✅ construido |
| 2 Antropometría | ✅ construido — fórmulas verificadas contra el Excel |
| 3 Segmentos | ✅ construido — ocho de las nueve proporciones siguen sin interpretación en su ficha, y se dice en pantalla |
| 4 Movilidad | ✅ construido (2.5) — desbloqueado por el MÓDULO 02 |
| 5 Resumen | ⊘ sustituido por la ficha del atleta (2.9) — ver §8 |

La numeración interna del recorrido de evaluación es **3 → 4**, no 1 → 5: los
pasos 0 a 2 son flujos propios que se entran por separado desde la ficha del
atleta. La barra de progreso solo aparece cuando el recorrido tiene más de un
paso, para no prometer pantallas que no vienen después.
