-- ===========================================================================
-- Contraindicaciones: los 21 que faltaban (tarea 4.5, segunda mitad)
-- ===========================================================================
--
-- Fuente: `Formulario_Ajustes_Motor_Giova.docx`, entregado el 2026-08-31.
-- Es la respuesta a la tabla que se le pidió el 29-ago, y cierra el agujero que
-- dejó la primera mitad: de 47 ejercicios activos, 26 tenían contraindicaciones
-- y 21 estaban con la lista vacía. Un ejercicio sin datos no es un ejercicio
-- seguro — es un ejercicio que el motor no puede descartar.
--
-- LOS 21 NOMBRES COINCIDEN LITERALMENTE con los nuestros, sin la ambigüedad de
-- la primera carga: se le mandó la tabla con NUESTROS nombres y la devolvió
-- rellena, así que aquí no hay ni equivalencias que decidir ni familias que
-- desagregar. Ese fue el motivo de pedirlo en ese formato.
--
-- Normalización a los catálogos cerrados de `domain/contraindicaciones.ts`,
-- igual que en la migración anterior:
--   "Muñeca"            → "Muñeca/Antebrazo"
--   "Hipertensión"      → "Hipertensión / Cardiovascular"
--   "Hernia discal"     → "Hernia discal / Patología axial"
--   "Ninguna"           → lista vacía, que es distinto de "sin datos" solo
--                         porque ahora sabemos que la respuesta es esa.
--
-- ---------------------------------------------------------------------------
-- ⚠️ LO QUE ESTA CARGA DESTAPA, Y HAY QUE MIRAR
-- ---------------------------------------------------------------------------
--
-- Se le advirtió que varios de estos 21 son los SUSTITUTOS SEGUROS y que
-- copiarles las contraindicaciones del ejercicio base rompería la sustitución.
-- Aun así marcó "Rodilla" en las cinco variantes de sentadilla, en las dos
-- prensas, en el hack y en el sissy squat.
--
-- Consecuencia directa: un atleta con lesión de rodilla se queda sin NINGÚN
-- ejercicio dominante de rodilla. Puede ser exactamente lo que él quiere
-- clínicamente, pero no es lo que dijo cuando hablamos de sustitutos, así que
-- se carga tal cual —manda él (§ "no inventes datos de dominio")— y se le
-- pregunta con el recuento delante. Ver PREGUNTAS-GIOVANNI del 31-ago.
--
-- Lo mismo, más suave, en hombro: `Press en Plano Escapular` sí quedó libre de
-- "Hombro" (solo "Codo"), así que ahí la sustitución sigue viva.

update public.exercise_library set contraindications = c.valor
  from (values
    -- Dominantes de rodilla ------------------------------------------------
    ('Sentadilla Libre Profunda',
     '["Lumbar", "Cadera", "Rodilla", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Sentadilla Low Bar',
     '["Cervical", "Lumbar", "Cadera", "Rodilla", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Sentadilla Goblet',
     '["Rodilla", "Tobillo", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Sentadilla con Safety Bar',
     '["Rodilla", "Tobillo", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Sentadilla Heels-Elevated',
     '["Rodilla"]'::jsonb),
    ('Sentadilla Búlgara con Apoyo',
     '["Cadera", "Rodilla", "Tobillo", "Embarazo"]'::jsonb),
    ('Hack Libre',
     '["Lumbar", "Rodilla", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Sissy Squat',
     '["Rodilla"]'::jsonb),
    ('Prensa 45°',
     '["Lumbar", "Cadera", "Rodilla", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Prensa Inclinada de Piernas',
     '["Lumbar", "Cadera", "Rodilla", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Zancadas Caminando',
     '["Cadera", "Rodilla", "Tobillo", "Embarazo"]'::jsonb),

    -- Dominantes de cadera --------------------------------------------------
    -- El convencional no venía en su Excel del 27 y es el de más riesgo lumbar
    -- de toda la lista. Se le señaló y lo confirmó por escrito.
    ('Peso Muerto Convencional',
     '["Lumbar", "Codo", "Muñeca/Antebrazo", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular", "Diástasis abdominal"]'::jsonb),
    -- Sí funciona como sustituto del RDL normal: pierde tobillo, la diástasis
    -- y la hipertensión. Es el único de los "seguros" que quedó de verdad más
    -- limpio que su ejercicio base.
    ('Peso Muerto Rumano desde Bloque',
     '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'::jsonb),
    ('Glute Bridge',            '["Cadera"]'::jsonb),
    ('Patada de Glúteo en Polea', '["Cadera"]'::jsonb),
    ('Abducciones en Polea',    '["Cadera"]'::jsonb),

    -- Empujes ---------------------------------------------------------------
    ('Press Militar tras Nuca',
     '["Cervical", "Hombro", "Codo", "Hipertensión / Cardiovascular", "Hernia discal / Patología axial"]'::jsonb),
    ('Press Overhead con Barra',
     '["Cervical", "Lumbar", "Hombro", "Codo", "Hipertensión / Cardiovascular", "Hernia discal / Patología axial", "Diástasis abdominal"]'::jsonb),
    -- Sin "Hombro": es el sustituto que sigue disponible para un hombro malo.
    ('Press en Plano Escapular',
     '["Codo", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Press Inclinado a 60°',
     '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'::jsonb),
    ('Pullover con Cuerda',
     '["Hombro", "Codo"]'::jsonb)
  ) as c(nombre, valor)
 where public.exercise_library.name = c.nombre;

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------
--
-- Si un nombre cambiara, el UPDATE no fallaría: simplemente no actualizaría
-- nada y el ejercicio se quedaría sin contraindicaciones, que es el estado
-- peligroso. Se comprueba aquí para que el error salga al migrar y no en la
-- pantalla de un entrenador.

do $$
declare faltan text;
begin
  select string_agg(name, ', ' order by name) into faltan
  from public.exercise_library
  where is_active
    and contraindications = '[]'::jsonb
    and name in (
      'Sentadilla Libre Profunda','Sentadilla Low Bar','Sentadilla Goblet',
      'Sentadilla con Safety Bar','Sentadilla Heels-Elevated','Sentadilla Búlgara con Apoyo',
      'Hack Libre','Sissy Squat','Prensa 45°','Prensa Inclinada de Piernas',
      'Zancadas Caminando','Peso Muerto Convencional','Peso Muerto Rumano desde Bloque',
      'Glute Bridge','Patada de Glúteo en Polea','Abducciones en Polea',
      'Press Militar tras Nuca','Press Overhead con Barra','Press en Plano Escapular',
      'Press Inclinado a 60°','Pullover con Cuerda'
    );

  if faltan is not null then
    raise exception 'Estos ejercicios debían quedar con contraindicaciones y siguen vacíos: %', faltan;
  end if;
end $$;
