-- ===========================================================================
-- Contraindicaciones por ejercicio (tarea 4.5, primera mitad)
-- ===========================================================================
--
-- Fuente: `Matriz_Contraindicaciones_Ejercicios.xlsx`, entregado el 2026-08-27.
-- Es lo que faltaba para que funcione el "cruzamiento directo con base de datos
-- de ejercicios" que su propia matriz da por hecho: hasta ahora los 31
-- ejercicios estaban con la lista vacía y una lesión de rodilla no descartaba
-- nada.
--
-- ---------------------------------------------------------------------------
-- EL CHOQUE DE NOMBRES, Y POR QUÉ ESTO SOLO CARGA UNA PARTE
-- ---------------------------------------------------------------------------
--
-- Su Excel y su matriz nombran los ejercicios con granularidad distinta, y las
-- dos son suyas:
--
--   · La MATRIZ nombra variantes, porque las reglas las distinguen. Todo el
--     sentido de la regla de dorsiflexión es separar "Sentadilla Libre
--     Profunda" de "Sentadilla Heels-Elevated".
--   · El EXCEL nombra familias: "Sentadilla Trasera", "Prensa de Piernas",
--     "Zancadas / Búlgaras".
--
-- De 31 nombres, solo 4 coincidían literalmente. Así que se cargan tres cosas
-- distintas y se deja fuera la cuarta:
--
--   1. EQUIVALENCIAS DE NOMBRE (10). Mismo movimiento, otra redacción:
--      "Extensión de Cuádriceps (Leg Extension)" es "Extensiones de
--      Cuádriceps". Decidir esto es juicio de nomenclatura, no clínico.
--   2. EJERCICIOS NUEVOS (16). No existían en la biblioteca —press de banca,
--      fondos, face pull, curls, planchas— y vienen con sus contraindicaciones.
--   3. LAS FAMILIAS (5) NO SE CARGAN. Son las que agrupan varias variantes
--      nuestras, y ahí no se puede heredar sin arriesgar.
--
-- ⚠️ POR QUÉ NO SE HEREDA DE LA FAMILIA A LA VARIANTE. Varias de nuestras
-- variantes son precisamente los SUSTITUTOS SEGUROS: Goblet, Safety Bar,
-- Heels-Elevated, Press en Plano Escapular, RDL desde bloque. Si heredaran las
-- contraindicaciones del ejercicio base, el motor los excluiría también y el
-- entrenador se quedaría sin nada que ofrecer — se rompería justo la lógica que
-- hace útil al motor. Los 21 que faltan están pedidos a Giovanni uno a uno
-- (ver PREGUNTAS-GIOVANNI).
--
-- Los valores se normalizaron a los catálogos cerrados: "Muñeca" →
-- "Muñeca/Antebrazo", "Hipertensión" → "Hipertensión / Cardiovascular",
-- "Hernia discal" → "Hernia discal / Patología axial", "Ninguna" → lista vacía.

-- ---------------------------------------------------------------------------
-- 1. Equivalencias de nombre: se aplican sobre ejercicios que ya existen
-- ---------------------------------------------------------------------------

update public.exercise_library set contraindications = c.valor
  from (values
    ('Sentadilla Frontal', '["Dorsal", "Lumbar", "Muñeca/Antebrazo", "Rodilla", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),  -- su fila: Sentadilla Frontal (Front Squat),
    ('Peso Muerto Rumano', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'::jsonb),  -- su fila: Peso Muerto Rumano (RDL),
    ('Remo con Barra', '["Lumbar", "Dorsal", "Cadera", "Hernia discal / Patología axial", "Diástasis abdominal"]'::jsonb),  -- su fila: Remo con Barra (Pendlay/Bent-over),
    ('Dominadas', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hernia discal / Patología axial"]'::jsonb),  -- su fila: Dominadas (Pull-ups),
    ('Extensiones de Cuádriceps', '["Rodilla"]'::jsonb),  -- su fila: Extensión de Cuádriceps (Leg Extension),
    ('Curl Femoral Acostado', '["Rodilla", "Lumbar"]'::jsonb),  -- su fila: Curl Femoral Tumbado/Sentado,
    ('Jalón al Pecho en Polea', '["Hombro", "Codo"]'::jsonb),  -- su fila: Jalón al Pecho (Lat Pulldown),
    ('Remo Girona', '["Lumbar", "Codo", "Hernia discal / Patología axial"]'::jsonb),  -- su fila: Remo Gironda / Polea Baja,
    ('Remo Unilateral con Mancuerna', '["Codo"]'::jsonb),  -- su fila: Remo con Mancuerna Apoyado,
    ('Hip Thrust con Barra', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'::jsonb)  -- su fila: Hip Thrust
  ) as c(nombre, valor)
 where public.exercise_library.name = c.nombre;

-- ---------------------------------------------------------------------------
-- 2. Ejercicios nuevos que trae su Excel
-- ---------------------------------------------------------------------------
--
-- `movement_pattern` solo se asigna cuando sus propios ejemplos de patrón lo
-- dejan sin duda. Los fondos quedan sin patrón a propósito: se pueden clasificar
-- como empuje horizontal o vertical según el énfasis, y eso lo decide él.

insert into public.exercise_library (name, target_muscle, movement_pattern, contraindications)
values
  ('Press de Banca Plano (Bench Press)', 'Pectoral', 'horizontal_push', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'::jsonb),
  ('Press Arnold', 'Deltoides', 'vertical_push', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'::jsonb),
  ('Fondos en Paralelas (Dips)', 'Tríceps', null, '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'::jsonb),
  ('Aperturas / Cruce de Poleas', 'Pectoral', 'isolation_accessory', '["Hombro"]'::jsonb),
  ('Face Pull', 'Deltoides', 'isolation_accessory', '["Hombro", "Cervical"]'::jsonb),
  ('Elevaciones Laterales', 'Deltoides', 'isolation_accessory', '["Hombro"]'::jsonb),
  ('Pájaro / Rear Delt Fly', 'Deltoides', 'isolation_accessory', '["Dorsal", "Hombro"]'::jsonb),
  ('Curl de Biceps con Barra', 'Bíceps', 'isolation_accessory', '["Codo", "Muñeca/Antebrazo"]'::jsonb),
  ('Curl Martillo', 'Bíceps', 'isolation_accessory', '["Codo", "Muñeca/Antebrazo"]'::jsonb),
  ('Extensión de Tríceps Polea (Pushdown)', 'Tríceps', 'isolation_accessory', '["Codo"]'::jsonb),
  ('Press Francés', 'Tríceps', 'isolation_accessory', '["Codo"]'::jsonb),
  ('Encogimientos de Hombros (Shrugs)', 'Trapecio', 'isolation_accessory', '["Cervical", "Hombro", "Hipertensión / Cardiovascular"]'::jsonb),
  ('Elevación de Talones (Calf Raise)', 'Gemelos', 'isolation_accessory', '["Tobillo", "Pie"]'::jsonb),
  ('Rueda Abdominal (Ab Wheel)', 'Core', 'core_anti_flexion_extension', '["Lumbar", "Hombro", "Hernia discal / Patología axial", "Diástasis abdominal", "Embarazo"]'::jsonb),
  ('Plancha Abdominal (Plank)', 'Core', 'core_anti_flexion_extension', '["Lumbar", "Hombro", "Diástasis abdominal", "Embarazo"]'::jsonb),
  ('Crunch Abdominal', 'Core', 'core_anti_flexion_extension', '["Cervical", "Lumbar", "Hernia discal / Patología axial", "Diástasis abdominal"]'::jsonb)
on conflict (name) do nothing;
