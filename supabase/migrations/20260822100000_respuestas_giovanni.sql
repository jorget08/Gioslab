-- Respuestas de Giovanni (aclaracionestecnicasjorgehernan.pdf, agosto 2026).
--
-- Cierra los cuatro "PENDIENTE DE GIOVANNI" que quedaron abiertos en la 1.2 y
-- la 1.3. Hasta hoy esas columnas eran `text` libre porque poner un CHECK
-- habría sido inventar dominio (CLAUDE.md §"No inventes datos de dominio").
-- Ya no: los catálogos están cerrados y se pueden enforcar en la base.
--
-- El cambio de fondo es el MÓDULO 02 del documento: lo que el entrenador
-- registra y lo que el motor concluye son dos niveles distintos.
--
--   MICRO  (input)   Restringido/Óptimo · Corto/Promedio/Largo
--   MACRO  (output)  Eficiente/Compensada/De Riesgo, por ejercicio
--
-- Estábamos guardando el macro como si fuera input. Se corrige aquí.

-- ---------------------------------------------------------------------------
-- 1. Patrones de movimiento — catálogo cerrado (MÓDULO 04)
-- ---------------------------------------------------------------------------
--
-- Ocho claves, textuales y en inglés como el resto del esquema. El nombre
-- comercial que ve el entrenador ("Dominante de Rodilla") vive en
-- src/domain/patrones.ts: en la base va la clave, que es lo que cruza el motor.

alter table public.exercise_library
  add constraint exercise_patron_catalogo check (
    movement_pattern is null or movement_pattern in (
      'squat_dominante_rodilla',
      'hip_hinge_dominante_cadera',
      'horizontal_push',
      'horizontal_pull',
      'vertical_push',
      'vertical_pull',
      'isolation_accessory',
      'core_anti_flexion_extension'
    )
  );

comment on column public.exercise_library.movement_pattern is
  'Patrón de movimiento. Catálogo cerrado de 8 claves (MÓDULO 04). Es la llave con la que el motor sustituye un ejercicio por otro.';

-- ---------------------------------------------------------------------------
-- 2. Nivel de evidencia — jerarquía de resolución de conflictos (MÓDULO 03)
-- ---------------------------------------------------------------------------
--
-- No es un metadato informativo: es el ORDEN en que el motor resuelve reglas
-- que se contradicen. A > B > C > D. El orden en sí vive en
-- src/domain/evidencia.ts, porque quien compara es el motor y el motor corre en
-- el cliente (docs/ARQUITECTURA.md). Aquí solo se garantiza que el valor sea uno
-- de los cuatro; si no, una regla con un nivel inventado sería incomparable y el
-- motor tendría que adivinar.

alter table public.rules
  add constraint rules_nivel_evidencia check (
    evidence_level in (
      'LEVEL_A_SCIENCE',
      'LEVEL_B_BIOMECHANICS',
      'LEVEL_C_CONSENSUS',
      'LEVEL_D_OVERRIDE'
    )
  );

comment on column public.rules.evidence_level is
  'Jerarquía de prescripción (MÓDULO 03). A > B > C > D: ante dos reglas en conflicto gana la de mayor nivel.';

-- ---------------------------------------------------------------------------
-- 3. biomech_evaluations — micro adentro, macro afuera
-- ---------------------------------------------------------------------------

-- 3.1 Las clasificaciones de palanca ya tienen catálogo cerrado.
alter table public.biomech_evaluations
  add constraint biomech_femur_clase check (
    femur_class is null or femur_class in ('Corto', 'Promedio', 'Largo')
  ),
  add constraint biomech_torso_clase check (
    torso_class is null or torso_class in ('Corto', 'Promedio', 'Largo')
  );

-- 3.2 pattern_classifications se va.
--
-- Guardaba Eficiente/Compensada/De Riesgo como si el entrenador lo escribiera.
-- El MÓDULO 02 aclara que eso es la SALIDA del motor, no una entrada: se
-- deduce de combinar micro (`rom_dorsiflexion` + `longitud_femur`) contra las
-- reglas, y depende de la versión de reglas vigente y del ejercicio concreto.
--
-- Guardarlo aquí tenía dos problemas: le pedía al entrenador un juicio que le
-- corresponde al motor, y congelaba un resultado que cambia cuando Giovanni
-- edita una regla.
--
-- Su sitio ya existe: `engine_runs.output`, creada en la 1.3, que guarda la
-- salida del motor junto con las reglas que dispararon. Ahí el macro queda
-- fechado y explicable, que es lo que pide §3.6; aquí quedaba huérfano.
--
-- Se puede tirar sin migrar datos: ninguna pantalla lo escribió nunca.
alter table public.biomech_evaluations drop column pattern_classifications;

-- 3.3 Movilidad: de texto libre a los seis tests reales.
--
-- `ankle_dorsiflexion`, `hip_mobility` y `shoulder_mobility` eran `text` porque
-- no sabíamos si la escala era categórica, grados o centímetros. La respuesta
-- estaba en su propia ficha de movilidad: son SEIS tests, cada uno con su
-- unidad y su umbral. Guardamos el valor medido, no la interpretación:
--
--   - La interpretación (Restringido/Óptimo) se deriva del umbral, y el umbral
--     puede cambiar cuando él afine el método. Si guardáramos la etiqueta,
--     cambiar un umbral obligaría a reinterpretar el histórico a mano.
--   - El valor medido es un hecho y no caduca (§3.5).
--
-- La derivación está en src/domain/movilidad.ts, con sus tests.

-- Se van las seis columnas de texto que describían movilidad "a ojo".
--
-- `shoulder_overhead` merece una nota aparte: guardaba [Apto OverHead,
-- Limitado / Inclinado], que NO es una medida sino la conclusión de medir la
-- flexión de hombro. Es el mismo error en pequeño que pattern_classifications
-- —guardar la etiqueta en lugar del hecho—, así que se sustituye por los grados.
alter table public.biomech_evaluations
  drop column ankle_dorsiflexion,
  drop column hip_mobility,
  drop column shoulder_mobility,
  drop column hip_internal_rotation,
  drop column shoulder_overhead;

alter table public.biomech_evaluations
  -- Test de pared. Distancia del dedo gordo al muro con la rodilla tocando.
  add column ankle_dorsiflexion_cm numeric(4,1)
      check (ankle_dorsiflexion_cm between 0 and 30),

  add column hip_flexion_deg integer
      check (hip_flexion_deg between 0 and 180),

  add column hip_internal_rotation_deg integer
      check (hip_internal_rotation_deg between 0 and 90),

  add column shoulder_flexion_deg integer
      check (shoulder_flexion_deg between 0 and 180),

  add column shoulder_external_rotation_deg integer
      check (shoulder_external_rotation_deg between 0 and 90);

-- `thoracic_extension` ya existía de la 1.2 como texto libre. Es el único de
-- los seis tests que se observa en vez de medirse, así que se queda como
-- categórica; lo que le faltaba era el catálogo cerrado.
alter table public.biomech_evaluations
  add constraint biomech_extension_toracica check (
    thoracic_extension is null or thoracic_extension in ('Normal', 'Cifótica')
  );

comment on column public.biomech_evaluations.ankle_dorsiflexion_cm is
  'Test de pared, en cm. Umbrales: <5 severa · <10 limitada · >=10 óptima (ESPECIFICACION-FICHAS §4).';

comment on table public.biomech_evaluations is
  'Historial biomecánico. Guarda MICRO (lo medido). El MACRO —Eficiente/Compensada/De Riesgo— lo produce el motor y no vive aquí (MÓDULO 02).';

-- ---------------------------------------------------------------------------
-- 4. Duración del ciclo menstrual
-- ---------------------------------------------------------------------------
--
-- Su módulo de fisiología femenina especifica "editable de 21 a 35". Nuestro
-- CHECK aceptaba 15 a 90, que es demasiado laxo: un 9 tecleado por error pasaba.
--
-- Pero 21-35 tampoco puede ser el límite duro de la base. Un ciclo irregular de
-- 38 días existe, y bloquearlo dejaría a esa atleta sin poder usar el módulo.
-- Se aplica el mismo criterio de dos niveles que ya usamos en las medidas
-- antropométricas (src/domain/medidas.ts):
--
--   BASE (aquí)  21-45  — fuera de esto es un error de digitación
--   INTERFAZ     21-35  — fuera de esto avisa, pero deja continuar
--
-- Anotado en PREGUNTAS-GIOVANNI para que él confirme el límite duro.

alter table public.menstrual_cycle_logs
  drop constraint menstrual_cycle_logs_cycle_length_days_check;

alter table public.menstrual_cycle_logs
  add constraint menstrual_cycle_duracion check (cycle_length_days between 21 and 45);
