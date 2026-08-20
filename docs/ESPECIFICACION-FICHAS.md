# Especificación extraída de los Excels de Giovanni

> Traducción de sus hojas de cálculo a especificación de software. Tarea **0.5**,
> parcial: cubre las fichas de evaluación, no la matriz completa de condicionales.
>
> **Fuente:** `fuentes-giovanni/` (fuera de git). Última lectura: **2026-08-19**.

---

## 1. Qué contiene cada archivo

| Archivo | Contenido | Estado |
|---|---|---|
| `Ficha_1.1jorgehernan…v2.xlsx` | Ficha antropométrica completa + FEMTECH | ✅ **Fuente de verdad** |
| `Fichas_Movilidad_y_Biomecanica…xlsx` | 6 tests de ROM + 5 ejes de perfil biomecánico, con reglas | ✅ Válido |
| `flujograma completo…v2.xlsx` | Igual que el primero + screening rápido de 3 min | ⚠️ **Fórmulas rotas, ver §5** |

El tercero **no es un flujograma ni una matriz de reglas**, pese al nombre. Aporta
una cosa que los demás no tienen: el *screening de 3 minutos* con las escalas
completas de movilidad.

---

## 2. Corrección de fondo: no es Heath-Carter

`CLAUDE.md` §3.4 y la tarea 2.6 hablan de somatotipo Heath-Carter. **Sus Excels no
calculan somatotipo en ninguna parte.** El método real es:

```
7 pliegues → suma → densidad (Jackson & Pollock) → % graso (Siri) → masa grasa y magra
```

Por §3.4 —"si el resultado no coincide con su Excel, el Excel tiene la razón"— el
modelo de datos y los cálculos se alinearon con esto en la migración
`20260819120000`. Queda **pendiente de confirmar con Giovanni** si usa Heath-Carter
en alguna ficha que no compartió.

---

## 3. Campos y fórmulas

### 3.1 Datos básicos

| Su ID | Nuestra columna | Tipo | Opciones / fórmula |
|---|---|---|---|
| `nombre_atleta` | `athletes.full_name` | texto | |
| `fecha_nacimiento` | `athletes.birth_date` | fecha | edad = años cumplidos |
| `sexo` | `athletes.sex` | select | `[Masculino, Femenino]` · Femenino activa FEMTECH |
| `estatura_cm` | `…measurements.height_cm` | float | cm |
| `peso_kg` | `…measurements.weight_kg` | float | kg |
| `objetivo_atleta` | `athletes.training_goal` | select | `[Hipertrofia, Pérdida de Grasa, Recomposición Corporal, Rendimiento Deportivo, Mantenimiento]` |
| `nivel_experiencia` | `athletes.experience_level` | select | `[Principiante, Intermedio, Avanzado, Deportista, Culturista / Competidor]` |
| `imc` | `…measurements.bmi` | calculado | `peso / (estatura_m)²` |

`enfoque_prescripcion` se deriva del objetivo (Hipertrofia → *Superávit calórico +
mantenimiento de volumen*, etc.). Es **nutrición**, fuera del alcance de Fase A; se
anota para Fase B.

### 3.2 Perímetros y palancas

| Su ID | Nuestra columna | Notas |
|---|---|---|
| `perim_cintura_cm` | `waist_cm` | a nivel umbilical |
| `perim_cadera_cm` | `hip_cm` | máxima prominencia de glúteos |
| `rcc` | `waist_hip_ratio` | `cintura / cadera` · **riesgo si > 0.85 en mujeres** |
| `longitud_femur` / `palanca_femur` | `femur_class` | `[Corto, Promedio, Largo]` |
| `longitud_torso` | `torso_class` | `[Corto, Promedio, Largo]` |

> **Ojo:** no son medidas en centímetros con un umbral. Son **desplegables** que
> elige el entrenador. La tarea 2.4 habla de "ratios de palanca calculados", lo que
> no encaja con esto — anotado como pregunta abierta.

### 3.3 Pliegues (protocolo ISAK, mm)

`triceps` · `subescapular` · `suprailiaco` · `abdominal` · `muslo` · `pantorrilla` · `pectoral`

- **Suma de 6 (ISAK):** los seis primeros, sin pectoral.
- **Suma de 7:** los siete. Es la que alimenta Jackson & Pollock.

### 3.4 Composición corporal

```
Densidad (Jackson & Pollock, 7 pliegues, S = suma de 7):
  Mujeres: 1.097 − 0.00046971·S + 0.00000056·S² − 0.00012828·edad
  Hombres: 1.112 − 0.00043499·S + 0.00000055·S² − 0.00028826·edad

% graso (Siri):   (4.95 / densidad − 4.5) × 100
Masa grasa (kg):  peso × (% graso / 100)
Masa magra (kg):  peso − masa grasa
```

El % graso admite **entrada manual** (bioimpedancia, DEXA). Por eso existe
`body_fat_pct_source` con `calculado | manual`: un valor medido y uno estimado no
se pueden comparar entre sí sin saber cuál es cuál.

**Implementado en** `src/domain/calculations/composicion-corporal.ts`, con golden
tests en `tests/unit/composicion-corporal.test.ts` que reproducen su caso de
ejemplo (María Fernanda Gómez) hasta el decimal.

### 3.5 Módulo FEMTECH — ciclo menstrual

Entradas: `fum_fecha`, `duracion_ciclo_dias` (por defecto 28), `uso_anticonceptivos`.

```
día del ciclo = MOD(hoy − FUM, duración)

fase:  ≤5  Folicular Temprana
       ≤13 Folicular Tardía
       ≤16 Ovulatoria
       >16 Lútea Tardía
       (anticonceptivos hormonales → "Anticonceptivo", manda sobre todo)

multiplicador de volumen:  Folicular Tardía 1.1× · Lútea Tardía 0.8× · resto 1.0×
ajuste biomecánico:        Ovulatoria → "Priorizar Máquinas (Laxitud)"
```

Ni la fase ni los multiplicadores se guardan: dependen de la fecha de hoy, así que
son funciones puras en `src/domain/calculations/ciclo-menstrual.ts`.

> **Dato de salud reproductiva.** Es la categoría más sensible de la Ley 1581. El
> flujo de consentimiento (tarea 2.2) debe pedirlo **explícita y separadamente**, y
> la plataforma tiene que funcionar sin activarlo.

---

## 4. Reglas de prescripción encontradas

Quince reglas, en prosa, repartidas por las hojas. Son el insumo para sembrar
`rules` en la tarea 3.3.

### Movilidad y rangos (ROM)

| Condición | Acción |
|---|---|
| Dorsiflexión limitada (<10 cm) | Sugerir calzado de elevación o disco en sentadillas. Bloquear variantes de rango profundo. |
| Dorsiflexión severa (<5 cm) | Priorizar Hack Squat y Prensa 45° + trabajo de movilidad de tobillo. |
| Flexión de cadera normal (≥120°) | Sin restricción para bisagras profundas o prensa. |
| Rotación interna de cadera limitada (<30°) | Abrir el stance de sentadilla; limitar rango profundo en Búlgara. |
| Extensión torácica cifótica | Evitar Press Militar con barra sobre la cabeza. Sustituir por Press Inclinado o mancuernas. |
| Flexión de hombro normal (180°) | Habilitado para ejercicios verticales por encima de la cabeza. |
| Hombro limitado / inclinado | Restringir press militar vertical. |
| Rotación externa de hombro normal (90°) | Sin restricción para jalones o tracciones altas. |

### Perfil biomecánico

| Condición | Clasificación | Acción |
|---|---|---|
| Dominante de rodilla | Cuádriceps | Priorizar alto brazo de momento en rodilla: Hack Squat, Sissy, Extensión. |
| Fémur largo / torso corto | Inclinación Alta | Sustituir Sentadilla Trasera por Front Squat, Goblet o Prensa (reduce cizallamiento lumbar). |
| Sensibilidad lumbar | Baja Tolerancia | Restringir Peso Muerto Convencional pesado; usar Hip Thrust, Rumano en polea o Búlgara. |
| Vector horizontal en glúteo | Glúteo Máximo | Priorizar Hip Thrust y Kas Glute Bridge. |
| Vector vertical de espalda | Ancho de Espalda | Priorizar Jalones al Pecho con agarre neutro sobre remos horizontales pesados. |

### Fase del ciclo

| Condición | Acción |
|---|---|
| Ovulatoria | Priorizar máquinas (laxitud ligamentosa). |
| Folicular Tardía / Lútea Tardía | Ajustar volumen ×1.1 / ×0.8. |

---

## 5. Defectos encontrados en los Excels

### 5.1 `flujograma completo` da resultados equivocados

Se insertó la sección de screening y las fórmulas quedaron apuntando a las filas
anteriores. Con **los mismos datos del mismo atleta**:

| Campo | `Ficha_1.1` (correcto) | `flujograma completo` |
|---|---|---|
| % graso | **18.02 %** | **22.5 %** ← valor de reserva, no calculado |
| Ratio cintura/cadera | 0.708 | `#VALUE!` |
| Masa magra | 51.24 kg | `#VALUE!` |
| Día del ciclo | 9 | `#DIV/0!` |

Además, la densidad se calcula con la suma de **6** pliegues aunque la etiqueta
diga 7. **Si está usando ese archivo con clientes, los porcentajes son erróneos.**

### 5.2 La edad se extrae de una cadena de texto

`VALUE(LEFT(E7,2))` toma los dos primeros caracteres de `"30 años"`. Falla por
debajo de 10 años y a partir de 100. Nuestra implementación calcula la edad desde
la fecha de nacimiento.

### 5.3 Los 7 pliegues no son los canónicos de Jackson & Pollock

J&P define: pectoral, **axilar media**, tríceps, subescapular, abdominal,
suprailíaco, muslo. Giovanni sustituye **axilar media por pantorrilla** pero
conserva las constantes originales. Puede ser deliberado; hay que preguntarlo,
porque introduce un sesgo desconocido en el % graso.

---

## 6. Contradicciones con la documentación del proyecto

| `CLAUDE.md` / tareas dicen | Los Excels dicen |
|---|---|
| Somatotipo Heath-Carter (§3.4, tarea 2.6) | Jackson & Pollock + Siri. Sin somatotipo. |
| Ratios de palanca calculados (tarea 2.4) | Desplegables `[Corto, Promedio, Largo]`. |
| Patrones: Eficiente / Compensada / De Riesgo (§4) | `Restringido`/`Óptimo` y perfiles por eje. |
| 1RM estimado Epley/Brzycki (tarea 2.7) | No aparece en ninguna hoja. |
| — | **FEMTECH no está en ninguna documentación del proyecto.** |

Todas están en `PREGUNTAS-GIOVANNI.md` a la espera de su respuesta.
