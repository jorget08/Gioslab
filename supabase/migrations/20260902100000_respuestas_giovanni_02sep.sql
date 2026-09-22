-- ===========================================================================
-- Respuestas de Giovanni del 2-sep: rodilla, el hack y los dos nuevos
-- ===========================================================================
--
-- Sesión en directo, dos rondas. La segunda corrigió a la primera, y aquí solo
-- queda el estado final; el recorrido está en PREGUNTAS-GIOVANNI (2 de sep).
--
-- Lo del TOBILLO también lo contestó y NO entra aquí. Sus respuestas piden
-- decir «este se hace, PERO modificado», y `modificador` solo se cuelga hoy de
-- un ejercicio EXCLUIDO o PRIORIZADO (§3.1). Cargarlo ahora obligaría a excluir
-- para poder modificar, que es lo contrario de lo que pidió. Es la 3.9, y la
-- 3.8 va detrás.

-- ---------------------------------------------------------------------------
-- 1. RODILLA — cinco de los siete
-- ---------------------------------------------------------------------------
--
-- El 31-ago dijo «solo se debe quitar la sentadilla libre» y se aplicó la
-- lectura estrecha: solo se tocaron los llamados Sentadilla, y los otros siete
-- se dejaron descartados por no estar nombrados. Repreguntados uno a uno,
-- primero dijo que los siete se podían. Dos se cayeron después:
--
--   · SISSY SQUAT — se le repreguntó aparte porque es el que más carga la
--     rodilla de la biblioteca, y rectificó: se queda fuera. Cambia además el
--     motivo: hasta hoy quedaba fuera por prudencia nuestra ante su silencio;
--     desde hoy es criterio suyo.
--
--   · HACK LIBRE — se le señaló que dejar el hack de máquina más restrictivo
--     que el libre era al revés de lo esperable, y corrigió: «fue equivocación,
--     es al revés». O sea que el que contraindica rodilla es el LIBRE, y el de
--     máquina no. Se mantiene por tanto como estaba, sin tocarlo.
--
-- La prensa era la que chirriaba: es el sustituto que él mismo manda para mala
-- dorsiflexión, y el sistema permitía la goblet y prohibía la prensa.

update public.exercise_library
   set contraindications = (
         select coalesce(jsonb_agg(v), '[]'::jsonb)
           from jsonb_array_elements(contraindications) v
          where v <> '"Rodilla"'::jsonb
       )
 where is_active
   and contraindications ? 'Rodilla'
   and name in (
     'Prensa 45°',
     'Prensa Inclinada de Piernas',
     'Zancadas Caminando',
     'Extensiones de Cuádriceps',
     'Curl Femoral Acostado'
   );

-- ---------------------------------------------------------------------------
-- 2. Dos ejercicios nuevos, y por qué nacen apagados
-- ---------------------------------------------------------------------------
--
-- Su tabla del tobillo nombraba siete variantes. Confirmó que cinco ya las
-- tenemos con otro nombre —se prescriben con una indicación de ejecución, sin
-- duplicar la ficha— y que el «Step-up Bajo» era nuevo. La séptima la
-- destapamos nosotros al cruzar sus respuestas: la Sentadilla Hack en Máquina
-- tampoco estaba, porque la biblioteca solo tiene el Hack Libre. Confirmó que
-- son dos ejercicios distintos y que la creáramos.
--
-- De sus contraindicaciones solo dijo la rodilla, y solo tras corregirse:
-- el Step-up sí, el hack de máquina no.
--
-- NACEN CON `is_active = false` A PROPÓSITO, y no cuesta nada: su único
-- consumidor es la tabla del tobillo (3.8), que está detrás de la 3.9. Encender
-- hoy el hack de máquina con la lista vacía sería peor que no tenerlo: un array
-- vacío no cruza con nada, así que «no contraindica rodilla» se convertiría en
-- «apto para cualquier lesión» y se le ofrecería a alguien con una hernia. Le
-- falta el resto de regiones —el Hack Libre tiene lumbar, tobillo, hernia e
-- hipertensión— y eso no se deduce, se pregunta.
--
-- `equipment` del Step-up queda NULL: un step-up se hace a peso corporal o con
-- mancuernas y no lo dijo. Falta un dato, no se inventa.

insert into public.exercise_library
  (name, target_muscle, movement_pattern, equipment, contraindications, is_active)
values
  ('Sentadilla Hack en Máquina', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina',
   '[]'::jsonb, false),
  ('Step-up Bajo',               'Cuádriceps', 'squat_dominante_rodilla', null,
   '["Rodilla"]'::jsonb, false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------

do $$
declare
  con_rodilla text;
  nuevos      integer;
begin
  -- Tras esto tres ejercicios activos siguen descartando por rodilla: la
  -- sentadilla libre profunda (31-ago), el sissy squat y el hack libre (2-sep).
  select string_agg(name, ', ' order by name) into con_rodilla
    from public.exercise_library
   where is_active and contraindications ? 'Rodilla';

  if con_rodilla is distinct from 'Hack Libre, Sentadilla Libre Profunda, Sissy Squat' then
    raise exception 'Con lesión de rodilla debían quedar fuera el hack libre, la sentadilla libre profunda y el sissy squat, y quedan: %', con_rodilla;
  end if;

  -- Los dos nuevos existen y siguen apagados hasta la 3.8.
  select count(*) into nuevos
    from public.exercise_library
   where name in ('Sentadilla Hack en Máquina', 'Step-up Bajo')
     and not is_active;

  if nuevos <> 2 then
    raise exception 'Los dos ejercicios nuevos debían quedar creados e inactivos, y hay %', nuevos;
  end if;
end $$;
