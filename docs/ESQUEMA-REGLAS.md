# Esquema de reglas del motor

> Tarea **3.1**. Fija QUÉ puede decir una regla. El motor (3.2), la carga de la
> matriz (3.3) y el editor de Giovanni (3.5) se construyen sobre esto.
>
> La implementación vive en `src/domain/reglas.ts` y esta tabla sale de allí: si
> divergen, manda el código.

---

## 1. Dos ejes que no se mezclan

Giovanni dio dos jerarquías. **No son la misma cosa.**

| | Qué hace | Ejemplo |
|---|---|---|
| **Nivel 1–4** | **Ordena.** Es el tubo por el que pasa cada evaluación | El nivel 1 se evalúa antes que el 2 |
| **LEVEL_A–D** | **Desempata.** Entre dos reglas *del mismo nivel* que se contradicen | Ciencia gana a criterio del entrenador |

Un nivel no desempata nada y un nivel de evidencia no ordena nada. Fusionarlos
permitiría que una regla de composición corporal con respaldo científico fuerte
anulara una de seguridad, que es justo lo que no puede pasar.

### El tubo

```
1  Seguridad, movilidad y contraindicaciones   → FILTRA qué ejercicios quedan
2  Fisiología, ciclo y autorregulación          → MODULA volumen e intensidad
3  Biomecánica focalizada y vectores            → REPARTE entre patrones
4  Composición corporal                         → FIJA el volumen base semanal
```

Una regla **solo puede mirar hechos de su nivel o de uno anterior**. Si una regla
de nivel 1 preguntara por el porcentaje graso, el motor todavía no lo habría
calculado. El validador lo rechaza.

---

## 2. Anatomía de una regla

```json
{
  "rule_key": "dorsiflexion-severa",
  "version": 1,
  "nivel": 1,
  "condition": { "todas": [ { "hecho": "dorsiflexion_cm", "op": "<", "valor": 5 } ] },
  "actions": {
    "excluir_ejercicios": ["Sentadilla libre profunda"],
    "sustituir_por": ["Sentadilla Heels-Elevated", "Prensa 45°"]
  },
  "justification": "Por debajo de 5 cm se dispara el valgo dinámico de rodilla.",
  "evidence_level": "LEVEL_B_BIOMECHANICS",
  "is_active": true
}
```

`justification` es **obligatoria**. Sin ella el motor no puede explicarle al
entrenador por qué decidió lo que decidió (`CLAUDE.md` §3.6), y una decisión que
no se explica no se puede discutir.

---

## 3. Hechos: lo único que una condición puede mirar

Catálogo cerrado. Un hecho fuera de esta lista es una regla que nunca dispara y
que nadie detecta.

| Nivel | Clave | Qué es | Tipo | Valores |
|---|---|---|---|---|
| 1 | `dorsiflexion_cm` | Dorsiflexión de tobillo | numero | número en cm |
| 1 | `flexion_hombro_grados` | Flexión de hombro | numero | número en ° |
| 1 | `rotacion_externa_hombro_grados` | Rotación externa de hombro | numero | número en ° |
| 1 | `flexion_cadera_grados` | Flexión de cadera | numero | número en ° |
| 1 | `rotacion_interna_cadera_grados` | Rotación interna de cadera | numero | número en ° |
| 1 | `extension_toracica` | Extensión torácica | opcion | Normal · Cifótica |
| 1 | `lesiones` | Zonas lesionadas | conjunto | Cervical · Dorsal · Lumbar · Hombro · Codo · Muñeca/Antebrazo · Cadera · Rodilla · Tobillo · Pie |
| 1 | `condiciones` | Condiciones fisiológicas | conjunto | Hipertensión / Cardiovascular · Embarazo · Hernia discal / Patología axial · Diástasis abdominal |
| 2 | `fase_ciclo` | Fase del ciclo | opcion | Folicular Temprana · Folicular Tardía · Lútea Temprana · Lútea Tardía · Anticonceptivo |
| 2 | `usa_anticonceptivos` | Usa anticonceptivos hormonales | booleano | verdadero / falso |
| 3 | `dominancia_sentadilla` | Dominancia en sentadilla | opcion | Dominante de Rodilla · Dominante de Cadera |
| 3 | `vector_gluteo` | Vector de glúteo | opcion | Vector Horizontal · Vector Vertical |
| 3 | `dominancia_espalda` | Vector de espalda | opcion | Vector Horizontal (Grosor) · Vector Vertical (Dorsal) |
| 3 | `tolerancia_carga_axial` | Tolerancia a carga axial | opcion | Tolerancia Normal · Sensibilidad Lumbar |
| 3 | `proporcion_femur_torso` | Proporción fémur/torso | opcion | Fémur Largo / Torso Corto · Proporción Equilibrada · Fémur Corto / Torso Largo |
| 4 | `porcentaje_graso` | Porcentaje graso | numero | número en % |
| 4 | `sexo` | Sexo biológico | opcion | masculino · femenino |

---

## 4. Operadores

| Tipo de hecho | Operadores admitidos |
|---|---|
| `numero` | `<` `<=` `=` `!=` `>=` `>` `entre` |
| `opcion` | `=` `!=` |
| `conjunto` | `incluye` `no_incluye` |
| `booleano` | `=` |

`entre` recibe dos números: `"valor": [5, 10]` se lee **5 ≤ x < 10**.

**No hay `alguna` (OR), y es deliberado:** en toda la matriz de Giovanni no
aparece un solo "o". Añadirlo ahora complicaría el motor y su editor para nadie.

---

## 5. Acciones

| Acción | Nivel | Qué hace |
|---|---|---|
| `excluir_ejercicios` | 1 | El ejercicio desaparece. No es una preferencia |
| `excluir_patrones` | 1 | Igual, por patrón de movimiento |
| `sustituir_por` | 1 | Con qué se reemplaza lo excluido |
| `priorizar` | 1–3 | Sube en la selección sin excluir nada |
| `modificador` | 1 | Cambia el CÓMO sin quitar el ejercicio: *"elevar talones 2.5 cm"* |
| `prohibir_maniobra` | 1–2 | Maniobras respiratorias, p. ej. Valsalva |
| `volumen_factor` | 2 | Multiplica el volumen semanal. `0.75` es su deload |
| `rir` | 2 | `fijo` clava, `piso` impide bajar, `delta` mueve |
| `ratio_patron` | 3 | Reparto entre patrones. Los valores suman 1 |
| `volumen_series` | 4 | Series efectivas por grupo muscular y semana |

Una regla con `sustituir_por` pero sin nada que excluir es una **regla muerta**:
parece que protege y no hace nada. El validador la rechaza.

---

## 6. Ejemplos, sacados de su matriz

```json
// Nivel 1 — no excluye, adapta
{ "condition": { "todas": [{ "hecho": "dorsiflexion_cm", "op": "entre", "valor": [5, 10] }] },
  "actions": { "modificador": "Elevar talones 2.5 cm" } }

// Nivel 1 — contraindicación sistémica: cambia el cómo, no el qué
{ "condition": { "todas": [{ "hecho": "condiciones", "op": "incluye",
                             "valor": "Hipertensión / Cardiovascular" }] },
  "actions": { "prohibir_maniobra": ["Valsalva"], "rir": { "piso": 2 } } }

// Nivel 2 — el deload de lútea tardía
{ "condition": { "todas": [{ "hecho": "fase_ciclo", "op": "=", "valor": "Lútea Tardía" }] },
  "actions": { "volumen_factor": 0.75, "rir": { "delta": 2 } } }

// Nivel 4 — dos predicados: los umbrales cambian por sexo
{ "condition": { "todas": [{ "hecho": "sexo", "op": "=", "valor": "femenino" },
                           { "hecho": "porcentaje_graso", "op": "<", "valor": 20 }] },
  "actions": { "volumen_series": { "min": 16, "max": 22 } } }
```

---

## 7. Qué valida quién

**La base** solo garantiza el esqueleto: que `condition.todas` sea un array no
vacío y que `actions` no sea `{}`. Una regla sin condición dispararía siempre;
una sin acciones se evaluaría en cada evaluación para no hacer nada.

**El dominio** (`validarRegla`) valida lo demás: que el hecho exista, que el
operador tenga sentido para su tipo, que el valor esté en su dominio, que los
ratios sumen 1, que no se mire un nivel posterior. Eso en SQL sobre `jsonb`
sería ilegible y no se podría probar con casos.

**El validador acumula todos los errores** en vez de parar en el primero: quien
edita una regla quiere ver de una vez todo lo que está mal.

---

## 8. Cómo lo ejecuta el motor (tarea 3.2)

`src/domain/motor.ts` interpreta esta gramática. Cuatro decisiones lo definen:

**Tres valores, no dos.** Un predicado sobre un hecho que no tenemos no es
falso: es *indecidible*. Si fuera falso, `dorsiflexión < 5` no dispararía en
quien no tiene el tobillo medido y se le prescribiría sentadilla profunda. El
motor lo separa y lo denuncia en `sinEvaluar`, y marca la prescripción como
incompleta.

Dentro de una condición, un `no-cumple` manda sobre un `sin-dato`: si la regla
ya no aplica por otro motivo, no tiene sentido reclamar una medición.

**La seguridad se acumula, las magnitudes compiten.** Dos reglas que prohíben
maniobras distintas prohíben las dos; dos suelos de RIR dejan el más alto. Pero
dos factores de volumen **no se multiplican** —0.75 × 0.9 dejaría el volumen en
0.67, mucho más agresivo de lo que dice ninguna— así que compiten y gana la de
mayor evidencia.

**Los empates se denuncian.** Dos reglas del mismo nivel de evidencia que se
contradicen son un defecto de la matriz. El motor elige una para poder seguir,
pero lo deja escrito con `empate: true`.

**Todo lleva su porqué.** Cada exclusión arrastra la regla que la causó y su
justificación (§3.6). Un ejercicio puede caerse por más de un motivo y se
enseñan todos: si solo se viera uno, el entrenador creería que basta con
corregir eso.

### El cruce de contraindicaciones

Es lo único que el motor hace sin una fila de `rules`, y no es una excepción de
verdad: Giovanni lo especificó como mecanismo —*"cruzamiento directo con base de
datos de ejercicios"*—, no como regla. Los datos que cruza salen enteros de la
base. Se explica solo, con una entrada sintética, para que el entrenador no vea
desaparecer un ejercicio sin motivo.

### Un detalle que ahorra vergüenzas

Una regla de fase del ciclo **necesita el predicado de sexo**. Sin él queda "sin
evaluar" en un atleta hombre —no hay ciclo que mirar— y el motor le reclamaría
al entrenador que midiera la fase menstrual de un varón. El pseudocódigo de
Giovanni ya lo trae; la regla del seed no, y se descubrió al probar el motor
contra datos reales.

---

## 9. Lo que falta confirmar con Giovanni

Tres cosas de la matriz afectan a este esquema y están abiertas en
`PREGUNTAS-GIOVANNI.md`:

- **Pregunta J** — que los dos ejes conviven como está descrito aquí. Es la
  lectura que se ha programado.
- **Pregunta H** — su matriz cambia la batería de movilidad. `flexion_cadera_grados`
  y `rotacion_interna_cadera_grados` siguen en el catálogo porque hay datos
  capturados; faltan por añadir el Thomas Test y el SLRT.
- **Pregunta I** — el ciclo pasó a cuatro fases. `Ovulatoria` ya no existe en
  `fase_ciclo`, pero el cálculo de `ciclo-menstrual.ts` todavía la produce: hay
  que migrarlo cuando confirme qué pasa con su regla de laxitud ligamentosa.
