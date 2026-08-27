-- ===========================================================================
-- La matriz de Giovanni, cargada como datos (tarea 3.3)
-- ===========================================================================
--
-- Fuente: `GiosLab_Matriz_Completa_Condicionales_(1).pdf`, 2026-08-25, más los
-- dos planes reales entregados el 2026-08-27 (Diego Mafla y Daniela Méndez).
-- Al terminar esto, los Excels dejan de ser la fuente de verdad: lo es la tabla.
--
-- SE CARGAN TAMBIÉN LOS EJERCICIOS QUE LA MATRIZ NOMBRA. No es un extra: el
-- motor cruza `excluir_ejercicios` y `sustituir_por` por NOMBRE contra
-- `exercise_library`. Una regla que nombra un ejercicio inexistente no falla —
-- no hace nada— y se queda en la matriz pareciendo metodología viva. Cargar las
-- reglas sin sus ejercicios habría sido cargar 22 reglas inertes.
--
-- LO QUE AQUÍ NO SE INVENTA:
--
--  · `contraindications` queda vacío en todos. Su matriz dice "cruzamiento
--    directo con base de datos de ejercicios" pero NO entrega qué contraindica
--    cada uno; eso es la 4.5 y sigue pendiente de él. Un array vacío es honesto:
--    dice "no lo sabemos". Rellenarlo a ojo sería inventar criterio clínico.
--
--  · `movement_pattern` solo se asigna cuando sus propios ejemplos de patrón
--    (domain/patrones.ts, salidos de su MÓDULO 04) lo dejan sin ambigüedad.
--
--  · Las justificaciones son SUS palabras de la matriz —el grado y la acción—,
--    no una explicación fisiológica escrita por mí. Son cortas a propósito: el
--    editor de reglas (3.5) existe justo para que él las enriquezca sin
--    pedirme un despliegue.
--
-- ⚠️ DOS COSAS QUE ÉL TIENE QUE CONFIRMAR, anotadas en PREGUNTAS-GIOVANNI:
--   1. La regla de hombro dispara a < 175° según la matriz del 25-ago, pero el
--      26-ago corrigió el umbral óptimo del test a 170° citando a la AAOS. Se
--      deja 175 porque es lo que dice la matriz y porque disparar antes es el
--      lado conservador.
--   2. Los nombres de ejercicio están normalizados de su prosa ("Búlgara con
--      apoyo" → "Sentadilla Búlgara con Apoyo"). La lista definitiva es la 4.5.

-- ---------------------------------------------------------------------------
-- 1. Ejercicios nombrados por la matriz
-- ---------------------------------------------------------------------------

insert into public.exercise_library (name, target_muscle, movement_pattern, equipment)
values
  -- Dominante de rodilla
  ('Sentadilla Libre Profunda',        'Cuádriceps',   'squat_dominante_rodilla',   'Barra'),
  ('Sentadilla Low Bar',               'Cuádriceps',   'squat_dominante_rodilla',   'Barra'),
  ('Sentadilla Frontal',               'Cuádriceps',   'squat_dominante_rodilla',   'Barra'),
  ('Sentadilla Goblet',                'Cuádriceps',   'squat_dominante_rodilla',   'Mancuerna'),
  ('Sentadilla con Safety Bar',        'Cuádriceps',   'squat_dominante_rodilla',   'Safety Bar'),
  ('Sentadilla Heels-Elevated',        'Cuádriceps',   'squat_dominante_rodilla',   'Barra'),
  ('Sentadilla Búlgara con Apoyo',     'Cuádriceps',   'squat_dominante_rodilla',   'Mancuerna'),
  ('Hack Libre',                       'Cuádriceps',   'squat_dominante_rodilla',   'Barra'),
  ('Sissy Squat',                      'Cuádriceps',   'squat_dominante_rodilla',   'Peso corporal'),
  ('Prensa 45°',                       'Cuádriceps',   'squat_dominante_rodilla',   'Máquina'),
  ('Prensa Inclinada de Piernas',      'Cuádriceps',   'squat_dominante_rodilla',   'Máquina'),
  ('Zancadas Caminando',               'Cuádriceps',   'squat_dominante_rodilla',   'Mancuerna'),

  -- Bisagra de cadera
  ('Peso Muerto Convencional',         'Isquiosurales','hip_hinge_dominante_cadera','Barra'),
  ('Peso Muerto Rumano',               'Isquiosurales','hip_hinge_dominante_cadera','Barra'),
  ('Peso Muerto Rumano desde Bloque',  'Isquiosurales','hip_hinge_dominante_cadera','Barra'),
  ('Hip Thrust con Barra',             'Glúteo',       'hip_hinge_dominante_cadera','Barra'),
  ('Glute Bridge',                     'Glúteo',       'hip_hinge_dominante_cadera','Peso corporal'),

  -- Empujes
  ('Press Militar tras Nuca',          'Deltoides',    'vertical_push',             'Barra'),
  ('Press Overhead con Barra',         'Deltoides',    'vertical_push',             'Barra'),
  ('Press en Plano Escapular',         'Deltoides',    'vertical_push',             'Mancuerna'),
  ('Press Inclinado a 60°',            'Pectoral',     'horizontal_push',           'Mancuerna'),

  -- Tracciones
  ('Jalón al Pecho en Polea',          'Dorsal',       'vertical_pull',             'Polea'),
  ('Dominadas',                        'Dorsal',       'vertical_pull',             'Peso corporal'),
  ('Remo con Barra',                   'Dorsal',       'horizontal_pull',           'Barra'),
  ('Remo Girona',                      'Dorsal',       'horizontal_pull',           'Barra'),
  ('Remo Unilateral con Mancuerna',    'Dorsal',       'horizontal_pull',           'Mancuerna'),

  -- Aislamiento
  ('Extensiones de Cuádriceps',        'Cuádriceps',   'isolation_accessory',       'Máquina'),
  ('Curl Femoral Acostado',            'Isquiosurales','isolation_accessory',       'Máquina'),
  ('Patada de Glúteo en Polea',        'Glúteo',       'isolation_accessory',       'Polea'),
  ('Abducciones en Polea',             'Glúteo',       'isolation_accessory',       'Polea'),
  ('Pullover con Cuerda',              'Dorsal',       'isolation_accessory',       'Polea')
on conflict (name) do nothing;

-- Los de demostración salen de circulación: si conviven con los reales, el
-- entrenador ve la biblioteca duplicada y el motor puede excluir "[demo]
-- Prensa 45°" dejando viva "Prensa 45°". No se borran —son historial y el
-- seed local los repone— solo dejan de estar activos.
update public.exercise_library set is_active = false where name like '[demo]%';

-- ---------------------------------------------------------------------------
-- 2. Las reglas
-- ---------------------------------------------------------------------------
--
-- Las de demostración que cargó el seed se retiran antes: `dorsiflexion-severa`
-- y `dorsiflexion-limitada` tienen la misma clave que las reales y apuntan a
-- ejercicios "[demo]". Dejarlas activas sería tener dos criterios vivos para lo
-- mismo, que es justo lo que impide el índice único por `rule_key`.
update public.rules set is_active = false
 where rule_key in ('dorsiflexion-severa', 'dorsiflexion-limitada', 'hipertension-valsalva',
                    'ciclo-lutea-tardia', 'dominancia-rodilla', 'volumen-base-mujer-magra',
                    'dorsiflexion-de-prueba')
   and is_active;

-- Se insertan como versión 2 cuando la clave ya existía, para no chocar con
-- `unique (rule_key, version)` y para que el historial (3.6) enseñe el relevo.
insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select v.rule_key,
       coalesce((select max(r.version) from public.rules r where r.rule_key = v.rule_key), 0) + 1,
       v.nivel, v.condition, v.actions, v.justification, v.evidence_level, true
from (values

-- === NIVEL 1 · Seguridad, movilidad y contraindicaciones =====================

('dorsiflexion-severa', 1,
 '{"todas":[{"hecho":"dorsiflexion_cm","op":"<","valor":5}]}'::jsonb,
 '{"excluir_ejercicios":["Sentadilla Libre Profunda","Hack Libre"],
   "sustituir_por":["Sentadilla Heels-Elevated","Prensa 45°","Sentadilla Búlgara con Apoyo"]}'::jsonb,
 'Dorsiflexión severa (menos de 5 cm). Se bloquea la sentadilla libre profunda y el hack libre.',
 'LEVEL_B_BIOMECHANICS'),

-- No excluye: adapta. Es la distinción que él pidió explícitamente entre
-- "bloquear" y "permitir con adaptación biomecánica".
('dorsiflexion-limitada', 1,
 '{"todas":[{"hecho":"dorsiflexion_cm","op":"entre","valor":[5,10]}]}'::jsonb,
 '{"modificador":"Añadir cuñas de talón de 2 a 3 cm o usar calzado de halterofilia"}'::jsonb,
 'Dorsiflexión limitada (entre 5 y 10 cm). Se permite la sentadilla con adaptación biomecánica.',
 'LEVEL_B_BIOMECHANICS'),

('flexion-hombro-restringida', 1,
 '{"todas":[{"hecho":"flexion_hombro_grados","op":"<","valor":175}]}'::jsonb,
 '{"excluir_ejercicios":["Press Militar tras Nuca","Press Overhead con Barra"],
   "sustituir_por":["Press Inclinado a 60°","Press en Plano Escapular"]}'::jsonb,
 'Flexión de hombro restringida (menos de 175°). Se bloquea el press vertical tras nuca y el overhead a 180°.',
 'LEVEL_B_BIOMECHANICS'),

-- Su acción es "limitar el ROM del Hip Thrust", no excluirlo. La gramática de
-- hoy solo sabe dirigir un modificador a lo que la regla excluye o prioriza, así
-- que el ejercicio va NOMBRADO en el texto y se lee como ajuste de la sesión.
-- Anotado como límite a revisar; perder la indicación habría sido peor.
('thomas-test-flexores-acortados', 1,
 '{"todas":[{"hecho":"thomas_test_grados","op":"<","valor":0}]}'::jsonb,
 '{"modificador":"Limitar el ROM del Hip Thrust en acortamiento máximo e inyectar protocolo de movilidad dinámica antes del bloque"}'::jsonb,
 'Thomas Test negativo: flexores de cadera acortados.',
 'LEVEL_B_BIOMECHANICS'),

('rotacion-externa-hombro-limitada', 1,
 '{"todas":[{"hecho":"rotacion_externa_hombro_grados","op":"<","valor":70}]}'::jsonb,
 '{"excluir_ejercicios":["Sentadilla Low Bar"],
   "sustituir_por":["Sentadilla Goblet","Sentadilla con Safety Bar","Sentadilla Frontal"]}'::jsonb,
 'Rotación externa de hombro limitada (menos de 70°). Se bloquea la sentadilla low bar tras nuca.',
 'LEVEL_B_BIOMECHANICS'),

('slr-isquiotibiales-restringido', 1,
 '{"todas":[{"hecho":"slr_grados","op":"<","valor":70}]}'::jsonb,
 '{"excluir_ejercicios":["Peso Muerto Convencional"],
   "sustituir_por":["Peso Muerto Rumano desde Bloque"]}'::jsonb,
 'Elevación de pierna recta restringida (menos de 70°). Se bloquea el peso muerto convencional desde el suelo.',
 'LEVEL_A_SCIENCE'),

('hipertension-valsalva', 1,
 '{"todas":[{"hecho":"condiciones","op":"incluye","valor":"Hipertensión / Cardiovascular"}]}'::jsonb,
 '{"prohibir_maniobra":["Valsalva"],"rir":{"piso":2}}'::jsonb,
 'Hipertensión o riesgo cardiovascular: se bloquea la maniobra de Valsalva y los isométricos extensos, con RIR ≥ 2 y respiración continua.',
 'LEVEL_A_SCIENCE'),

-- Su matriz habla de "decúbito prono, cargas axiales y riesgo de impacto", que
-- son familias de movimiento y no ejercicios sueltos. Se traduce a los patrones
-- de carga axial que sí existen en su catálogo, y el resto va como indicación.
('embarazo-post-primer-trimestre', 1,
 '{"todas":[{"hecho":"condiciones","op":"incluye","valor":"Embarazo"}]}'::jsonb,
 '{"excluir_ejercicios":["Sentadilla Libre Profunda","Sentadilla Low Bar","Peso Muerto Convencional","Glute Bridge"],
   "sustituir_por":["Prensa 45°","Sentadilla Búlgara con Apoyo"],
   "modificador":"Priorizar posiciones sentadas o inclinadas y apoyo unilateral controlado; evitar decúbito prono, cargas axiales y riesgo de impacto"}'::jsonb,
 'Embarazo a partir del primer trimestre: se bloquea el decúbito prono, las cargas axiales y el riesgo de impacto.',
 'LEVEL_A_SCIENCE'),

-- === NIVEL 2 · Fisiología, ciclo menstrual y autorregulación =================
--
-- El predicado de sexo NO es decorativo: sin él la regla queda "sin evaluar" en
-- un atleta hombre y el motor le reclamaría al entrenador la fase menstrual de
-- un varón. Está así en su propio pseudocódigo.

('ciclo-folicular-temprana', 2,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"fase_ciclo","op":"=","valor":"Folicular Temprana"}]}'::jsonb,
 '{"volumen_factor":1,"rir":{"piso":2}}'::jsonb,
 'Menstruación y estrógeno bajo: 100% del volumen base, RIR 2-3, evitando el fallo absoluto.',
 'LEVEL_A_SCIENCE'),

('ciclo-folicular-tardia', 2,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"fase_ciclo","op":"=","valor":"Folicular Tardía"}]}'::jsonb,
 '{"volumen_factor":1.15,"rir":{"fijo":0}}'::jsonb,
 'Pico de estrógeno y máxima fuerza: 110-120% del volumen base y pico de intensidad.',
 'LEVEL_A_SCIENCE'),

('ciclo-lutea-temprana', 2,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"fase_ciclo","op":"=","valor":"Lútea Temprana"}]}'::jsonb,
 '{"volumen_factor":1,"rir":{"piso":1}}'::jsonb,
 'Progesterona elevada: 100% del volumen base, trabajo de mantenimiento activo.',
 'LEVEL_A_SCIENCE'),

('ciclo-lutea-tardia', 2,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"fase_ciclo","op":"=","valor":"Lútea Tardía"}]}'::jsonb,
 '{"volumen_factor":0.75,"rir":{"delta":2}}'::jsonb,
 'Caída hormonal y alta fatiga: deload del 25-30% del volumen y RIR 3-4, evitando el fallo muscular.',
 'LEVEL_A_SCIENCE'),

-- NIVEL 1 y no 2: es una bandera de SEGURIDAD dentro de la folicular tardía, no
-- una fase. Durante el pico sube la laxitud del cruzado anterior y hay que
-- priorizar cadena cinética cerrada. Eso es seguridad —el nivel que filtra
-- ejercicios— y no dosificación de volumen, que es el 2.
('pico-ovulatorio-laxitud', 1,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"pico_ovulatorio","op":"=","valor":true}]}'::jsonb,
 '{"priorizar":["Prensa 45°","Prensa Inclinada de Piernas","Extensiones de Cuádriceps"],
   "modificador":"Priorizar máquinas y cadena cinética cerrada: mayor laxitud ligamentaria en el pico ovulatorio"}'::jsonb,
 'Pico ovulatorio: aumenta la laxitud ligamentaria, se priorizan máquinas sobre peso libre.',
 'LEVEL_A_SCIENCE'),

-- === NIVEL 3 · Biomecánica focalizada y vectores =============================
-- Compensan la dominancia, no la refuerzan: el ratio va SIEMPRE en favor del
-- patrón contrario al dominante.

('dominancia-rodilla', 3,
 '{"todas":[{"hecho":"dominancia_sentadilla","op":"=","valor":"Dominante de Rodilla"}]}'::jsonb,
 '{"ratio_patron":{"hip_hinge_dominante_cadera":0.6,"squat_dominante_rodilla":0.4},
   "priorizar":["Peso Muerto Rumano","Hip Thrust con Barra"]}'::jsonb,
 'Dominancia estructural de rodilla: ratio 60-40 en favor de ejercicios de cadera.',
 'LEVEL_C_CONSENSUS'),

('dominancia-cadera', 3,
 '{"todas":[{"hecho":"dominancia_sentadilla","op":"=","valor":"Dominante de Cadera"}]}'::jsonb,
 '{"ratio_patron":{"squat_dominante_rodilla":0.6,"hip_hinge_dominante_cadera":0.4},
   "priorizar":["Hack Libre","Sissy Squat","Extensiones de Cuádriceps"]}'::jsonb,
 'Dominancia estructural de cadera: ratio 60-40 en favor del plano sagital.',
 'LEVEL_C_CONSENSUS'),

('vector-gluteo-anteroposterior', 3,
 '{"todas":[{"hecho":"vector_gluteo","op":"=","valor":"Vector Horizontal"}]}'::jsonb,
 '{"priorizar":["Hip Thrust con Barra","Glute Bridge","Patada de Glúteo en Polea"]}'::jsonb,
 'Vector glúteo anteroposterior (acortamiento): se inyecta con prioridad hip thrust, glute bridge y kicking en polea.',
 'LEVEL_B_BIOMECHANICS'),

('vector-gluteo-vertical-lateral', 3,
 '{"todas":[{"hecho":"vector_gluteo","op":"=","valor":"Vector Vertical"}]}'::jsonb,
 '{"priorizar":["Sentadilla Búlgara con Apoyo","Zancadas Caminando","Abducciones en Polea"]}'::jsonb,
 'Vector glúteo vertical o lateral (alargamiento): se inyecta con prioridad búlgara, zancadas pasantes y abducciones en polea.',
 'LEVEL_B_BIOMECHANICS'),

('vector-espalda-anchura', 3,
 '{"todas":[{"hecho":"dominancia_espalda","op":"=","valor":"Vector Vertical (Dorsal)"}]}'::jsonb,
 '{"priorizar":["Jalón al Pecho en Polea","Dominadas","Pullover con Cuerda"]}'::jsonb,
 'Vector de espalda en anchura (plano frontal): jalones en polea, dominadas y pullover con cuerda.',
 'LEVEL_B_BIOMECHANICS'),

('vector-espalda-densidad', 3,
 '{"todas":[{"hecho":"dominancia_espalda","op":"=","valor":"Vector Horizontal (Grosor)"}]}'::jsonb,
 '{"priorizar":["Remo con Barra","Remo Girona","Remo Unilateral con Mancuerna"]}'::jsonb,
 'Vector de espalda en densidad (plano sagital): remos con barra, remo girona y remos unilaterales.',
 'LEVEL_B_BIOMECHANICS'),

-- === NIVEL 4 · Composición corporal ==========================================
-- Sus tres bandas de %graso, con umbral distinto por sexo. Por eso `sexo` es un
-- hecho y por eso tiene que estar disponible desde el nivel 1.
--
-- La banda del medio va con `>=` y `<=`, NO con `entre`. Su tabla dice
-- "12% ≤ %Grasa ≤ 20%": cerrada por los dos lados. Nuestro `entre` es cerrado
-- abajo y abierto arriba, así que un atleta con exactamente 20.0% no habría
-- caído en ninguna de las tres bandas y se habría quedado sin volumen base,
-- en silencio.

('volumen-base-hombre-magro', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"masculino"},
            {"hecho":"porcentaje_graso","op":"<","valor":12}]}'::jsonb,
 '{"volumen_series":{"min":16,"max":22}}'::jsonb,
 'Magro / atleta: alta capacidad de recuperación, 16 a 22 series efectivas por grupo muscular y semana.',
 'LEVEL_C_CONSENSUS'),

('volumen-base-hombre-promedio', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"masculino"},
            {"hecho":"porcentaje_graso","op":">=","valor":12},
            {"hecho":"porcentaje_graso","op":"<=","valor":20}]}'::jsonb,
 '{"volumen_series":{"min":12,"max":16}}'::jsonb,
 'Promedio / saludable: volumen estándar, 12 a 16 series efectivas por grupo muscular y semana.',
 'LEVEL_C_CONSENSUS'),

('volumen-base-hombre-elevado', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"masculino"},
            {"hecho":"porcentaje_graso","op":">","valor":20}]}'::jsonb,
 '{"volumen_series":{"min":10,"max":12}}'::jsonb,
 'Porcentaje elevado: enfoque en preservación de masa magra, 10 a 12 series con densidad controlada.',
 'LEVEL_C_CONSENSUS'),

('volumen-base-mujer-magra', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"porcentaje_graso","op":"<","valor":20}]}'::jsonb,
 '{"volumen_series":{"min":16,"max":22}}'::jsonb,
 'Magra / atleta: alta capacidad de recuperación, 16 a 22 series efectivas por grupo muscular y semana.',
 'LEVEL_C_CONSENSUS'),

('volumen-base-mujer-promedio', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"porcentaje_graso","op":">=","valor":20},
            {"hecho":"porcentaje_graso","op":"<=","valor":28}]}'::jsonb,
 '{"volumen_series":{"min":12,"max":16}}'::jsonb,
 'Promedio / saludable: volumen estándar, 12 a 16 series efectivas por grupo muscular y semana.',
 'LEVEL_C_CONSENSUS'),

('volumen-base-mujer-elevado', 4,
 '{"todas":[{"hecho":"sexo","op":"=","valor":"femenino"},
            {"hecho":"porcentaje_graso","op":">","valor":28}]}'::jsonb,
 '{"volumen_series":{"min":10,"max":12}}'::jsonb,
 'Porcentaje elevado: enfoque en preservación de masa magra, 10 a 12 series con densidad controlada.',
 'LEVEL_C_CONSENSUS')

) as v(rule_key, nivel, condition, actions, justification, evidence_level);

comment on table public.exercise_library is
  'Biblioteca de ejercicios. Los nombrados por la matriz se cargaron en la 3.3; '
  'sus contraindicaciones y medios siguen pendientes de Giovanni (tarea 4.5).';
