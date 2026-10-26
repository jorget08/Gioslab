-- ===========================================================================
-- Jerarquías J1/J2/J3 y los ejercicios de sus PDFs del 25-sep (5.3)
-- ===========================================================================
--
-- Giovanni reportó que a todo el mundo le salía la misma rutina. La causa era
-- nuestra: dentro de cada patrón, el generador desempataba por orden
-- alfabético, y como casi ninguna regla marca ejercicios prioritarios, el
-- alfabeto elegía la rutina. Su respuesta es el criterio que faltaba: la
-- jerarquía J1 (estiramiento / alta carga) → J2 (rango medio / guiado) → J3
-- (acortamiento / aislamiento), con su tabla por grupo muscular y su PDF
-- "Motor jerárquico COMPLETO con gestión de restricciones de movilidad".
--
-- Tres columnas y no una: su regla 1 necesita saber cuál es la versión GUIADA
-- de un J1 (el sustituto cuando el libre está restringido) y su regla 2 el
-- PERFIL de longitud (J1 de estiramiento → J3 de acortamiento; Hip Thrust, que
-- es J1 de acortamiento, pide un J2 de estiramiento). La jerarquía sola no
-- distingue esos casos.
--
-- Son datos y los edita él desde la biblioteca (§3.1). El generador solo los
-- lee: `src/domain/jerarquias.ts`.

alter table public.exercise_library
  add column hierarchy_level smallint check (hierarchy_level in (1, 2, 3)),
  add column length_profile  text     check (length_profile in ('estiramiento', 'medio', 'acortamiento')),
  add column is_guided       boolean  not null default false;

comment on column public.exercise_library.hierarchy_level is
  'Jerarquía de Giovanni (25-sep): 1 estiramiento/alta carga, 2 rango medio/guiado, 3 acortamiento/aislamiento. NULL = sin clasificar.';
comment on column public.exercise_library.length_profile is
  'Zona del recorrido en que trabaja el músculo. La usa su regla del perfil compensatorio.';
comment on column public.exercise_library.is_guided is
  'Versión guiada (máquina, Multipower, respaldo): el sustituto de un J1 libre cuando está restringido.';

-- ---------------------------------------------------------------------------
-- 1. Los que ya teníamos — DERIVADO de su tabla, para que él lo confirme
-- ---------------------------------------------------------------------------
--
-- Su tabla nombra ejercicios a su manera ("Press Plano en Máquina articulada o
-- con Mancuernas"), no por las fichas de la biblioteca. La traducción es
-- nuestra y por eso va marcada. Los criterios que aplicamos, para que se
-- puedan discutir uno a uno:
--
--   · `is_guided` = lo que él pone en la columna "Sustitución guiada" de su
--     PDF de restricciones. Prensa 45° y el hack de máquina van como guiados
--     porque son su sustitución para la sentadilla libre.
--   · Press Overhead con Barra es J1, pero sin perfil: su texto no dice que el
--     press militar trabaje en estiramiento, y la regla 2 no se le aplica a
--     algo que él no clasificó. Además él lo condiciona: "solo si el objetivo
--     es fuerza global". Preguntado.
--   · Se quedan SIN clasificar los que su tabla no nombra: Press Inclinado a
--     60° (su J1 es a 30–45°), Glute Bridge (el suyo es "Puente con Barra" y
--     el nuestro es a peso corporal), las variantes de sentadilla que no cita
--     (low bar, frontal, goblet, safety bar, heels-elevated, hack libre, sissy,
--     prensa inclinada, step-up), el peso muerto convencional, los press de
--     hombro que no cita, los fondos, encogimientos, gemelos de pie y core.
--     Sin clasificar NO es excluido: se pueden prescribir, solo que detrás de
--     lo que él sí ordenó.

update public.exercise_library e
   set hierarchy_level = v.j,
       length_profile  = v.perfil,
       is_guided       = v.guiada
  from (values
    -- Pecho
    ('Press de Banca Plano (Bench Press)',    2, 'medio',        false),
    ('Aperturas / Cruce de Poleas',           3, 'acortamiento', false),
    -- Cuádriceps
    ('Sentadilla Libre Profunda',             1, 'estiramiento', false),
    ('Prensa 45°',                            1, 'estiramiento', true),
    ('Sentadilla Hack en Máquina',            1, 'estiramiento', true),
    ('Sentadilla Búlgara con Apoyo',          2, 'medio',        false),
    ('Zancadas Caminando',                    2, 'medio',        false),
    ('Extensiones de Cuádriceps',             3, 'acortamiento', false),
    -- Isquiosurales
    ('Peso Muerto Rumano',                    1, 'estiramiento', false),
    ('Peso Muerto Rumano desde Bloque',       1, 'estiramiento', false),
    ('Curl Femoral Acostado',                 3, 'acortamiento', false),
    -- Glúteo
    ('Hip Thrust con Barra',                  1, 'acortamiento', false),
    ('Patada de Glúteo en Polea',             3, 'acortamiento', false),
    ('Abducciones en Polea',                  3, 'acortamiento', false),
    -- Espalda
    ('Dominadas',                             1, 'estiramiento', false),
    ('Jalón al Pecho en Polea',               1, 'estiramiento', false),
    ('Remo con Barra',                        2, 'medio',        false),
    ('Remo Girona',                           2, 'medio',        false),
    ('Remo Unilateral con Mancuerna',         2, 'medio',        true),
    ('Pullover con Cuerda',                   3, 'acortamiento', false),
    -- Deltoides
    ('Press Overhead con Barra',              1, null,           false),
    ('Elevaciones Laterales',                 2, 'medio',        false),
    ('Pájaro / Rear Delt Fly',                3, 'acortamiento', false),
    ('Face Pull',                             3, 'acortamiento', false),
    -- Bíceps
    ('Curl de Biceps con Barra',              2, 'medio',        false),
    ('Curl Martillo',                         2, 'medio',        false),
    -- Tríceps: nuestro "Press Francés" es el tumbado, su "Press Francés Plano".
    ('Press Francés',                         2, 'medio',        false),
    ('Extensión de Tríceps Polea (Pushdown)', 3, 'acortamiento', false)
  ) as v(nombre, j, perfil, guiada)
 where e.name = v.nombre;

-- ---------------------------------------------------------------------------
-- 2. Los que nombran sus PDFs y no teníamos
-- ---------------------------------------------------------------------------
--
-- De tres documentos: su tabla de jerarquías (y el PDF de restricciones que la
-- acompaña), el plan DUP que le hizo al doctor Miguel y su "Planificación de
-- mesociclos".
--
-- NACEN CON `is_active = false`, por lo mismo que el hack de máquina el 2-sep:
-- ninguno trae contraindicaciones, y una lista vacía no cruza con nada, así
-- que "no sabemos" se convertiría en "apto para cualquier lesión". Él completa
-- las contraindicaciones en la biblioteca y los enciende. Hasta entonces el
-- generador no los ve.
--
-- NO SE DUPLICA lo que es el mismo ejercicio con otra indicación de ejecución
-- —el criterio que él confirmó el 2-sep con la tabla del tobillo—. Quedan
-- fuera por eso: Press Plano Mancuernas "Agarre Neutro", Jalón "Neutro
-- Inclinado 30°", Remo Sentado en Polea Baja (= nuestro Remo Girona), Prensa
-- "con Cuña", Prensa Unilateral "a Rango Medio", Sentadilla "con Pausa", Press
-- Banca "con Parada", Peso Muerto "en Déficit", Dominadas "Lastradas", Jalón
-- "Ancho" o "Neutro", Remo Polea "Agarre Ancho", Curl con Barra Z, Peso Muerto
-- Rumano "con Mancuernas", Plancha Frontal "Inclinada en Banco". Y los que ya
-- estaban con otro nombre: Sentadilla Trasera (= Libre Profunda), Press Militar
-- de Pie con Barra (= Overhead), Curl Femoral Tumbado (= Acostado), Extensión
-- de Tríceps en Polea Alta o con Barra V (= Pushdown), Gemelos en Máquina (=
-- Calf Raise), Zancadas Búlgaras (= Búlgara con Apoyo).
--
-- Tres decisiones nuestras, marcadas para él:
--   · Press Landmine va como J1 GUIADO: en el plan de Miguel lo usa como
--     "sustituto del press militar". Como libre le ganaría al press militar por
--     orden alfabético y le saldría a todo el mundo.
--   · Box Squat en Multipower: J1 guiado sin perfil. Lo pone de J1 en el plan
--     de Miguel, pero con el cajón a 90° no es un trabajo en estiramiento.
--   · Lo del AMRAP metabólico (remoergómetro, battle ropes, slam ball,
--     bicicleta, trineo) entra SIN PATRÓN: ninguno de los ocho le corresponde,
--     y el bloque metabólico donde irán todavía no existe (paso 4).

insert into public.exercise_library
  (name, target_muscle, movement_pattern, equipment, hierarchy_level, length_profile, is_guided,
   contraindications, is_active)
select v.nombre, v.musculo, v.patron, v.equipo, v.j, v.perfil, v.guiada, '[]'::jsonb, false
  from (values
    -- Pecho
    ('Press Inclinado con Mancuernas',            'Pectoral',      'horizontal_push',             'Mancuerna',     1, 'estiramiento', false),
    ('Press Inclinado con Barra',                 'Pectoral',      'horizontal_push',             'Barra',         1, 'estiramiento', false),
    ('Press Inclinado en Multipower',             'Pectoral',      'horizontal_push',             'Multipower',    1, 'estiramiento', true),
    ('Press Inclinado en Máquina Articulada',     'Pectoral',      'horizontal_push',             'Máquina',       1, 'estiramiento', true),
    ('Press Plano con Mancuernas',                'Pectoral',      'horizontal_push',             'Mancuerna',     2, 'medio',        false),
    ('Press Plano en Máquina Articulada',         'Pectoral',      'horizontal_push',             'Máquina',       2, 'medio',        true),
    ('Press Plano en Multipower',                 'Pectoral',      'horizontal_push',             'Multipower',    2, 'medio',        true),
    ('Pec Deck',                                  'Pectoral',      'isolation_accessory',         'Máquina',       3, 'acortamiento', false),
    ('Board Press',                               'Pectoral',      'horizontal_push',             'Barra',         null, null,        false),
    ('Spoto Press',                               'Pectoral',      'horizontal_push',             'Barra',         null, null,        false),
    -- Cuádriceps
    ('Prensa 45° Unilateral',                     'Cuádriceps',    'squat_dominante_rodilla',     'Máquina',       1, 'estiramiento', true),
    ('Box Squat en Multipower',                   'Cuádriceps',    'squat_dominante_rodilla',     'Multipower',    1, null,           true),
    -- Isquiosurales
    ('Buenos Días',                               'Isquiosurales', 'hip_hinge_dominante_cadera',  'Barra',         1, 'estiramiento', false),
    ('Hip Extension en Máquina 45°',              'Isquiosurales', 'hip_hinge_dominante_cadera',  'Máquina',       1, 'estiramiento', true),
    ('Pull Through en Polea',                     'Isquiosurales', 'hip_hinge_dominante_cadera',  'Polea',         1, 'estiramiento', true),
    ('Extensión de Cadera en Polea',              'Isquiosurales', 'hip_hinge_dominante_cadera',  'Polea',         1, 'estiramiento', true),
    ('Curl Femoral Sentado',                      'Isquiosurales', 'isolation_accessory',         'Máquina',       2, 'medio',        false),
    ('Curl Femoral de Pie',                       'Isquiosurales', 'isolation_accessory',         'Máquina',       3, 'acortamiento', false),
    ('Peso Muerto desde Bloques',                 'Isquiosurales', 'hip_hinge_dominante_cadera',  'Barra',         null, null,        false),
    ('Peso Muerto con Kettlebell',                'Isquiosurales', 'hip_hinge_dominante_cadera',  'Kettlebell',    null, null,        false),
    -- Glúteo
    ('Hip Thrust en Máquina',                     'Glúteo',        'hip_hinge_dominante_cadera',  'Máquina',       1, 'acortamiento', true),
    ('Puente de Glúteo en Multipower',            'Glúteo',        'hip_hinge_dominante_cadera',  'Multipower',    1, 'acortamiento', true),
    ('Sentadilla Sumo',                           'Glúteo',        'squat_dominante_rodilla',     null,            2, 'estiramiento', false),
    ('Peso Muerto Sumo',                          'Glúteo',        'hip_hinge_dominante_cadera',  'Barra',         2, 'estiramiento', false),
    ('Abducción en Máquina',                      'Glúteo',        'isolation_accessory',         'Máquina',       3, 'acortamiento', false),
    -- Espalda
    ('Jalón en Máquina Articulada',               'Dorsal',        'vertical_pull',               'Máquina',       1, 'estiramiento', true),
    ('Remo con Pecho Apoyado',                    'Dorsal',        'horizontal_pull',             null,            2, 'medio',        true),
    ('Remo Unilateral en Máquina',                'Dorsal',        'horizontal_pull',             'Máquina',       3, 'acortamiento', false),
    ('Remo Pendlay',                              'Dorsal',        'horizontal_pull',             'Barra',         null, null,        false),
    -- Deltoides
    ('Press Militar con Mancuernas',              'Deltoides',     'vertical_push',               'Mancuerna',     1, null,           false),
    ('Press Militar en Máquina con Respaldo',     'Deltoides',     'vertical_push',               'Máquina',       1, null,           true),
    ('Press Militar en Multipower con Respaldo',  'Deltoides',     'vertical_push',               'Multipower',    1, null,           true),
    ('Press Landmine',                            'Deltoides',     'vertical_push',               'Barra',         1, null,           true),
    ('Elevación Lateral en Polea',                'Deltoides',     'isolation_accessory',         'Polea',         2, 'medio',        false),
    ('Rear Delt en Pec Deck',                     'Deltoides',     'isolation_accessory',         'Máquina',       3, 'acortamiento', false),
    -- Bíceps
    ('Curl Inclinado con Mancuernas',             'Bíceps',        'isolation_accessory',         'Mancuerna',     1, 'estiramiento', false),
    ('Curl en Polea Baja con Banco Inclinado',    'Bíceps',        'isolation_accessory',         'Polea',         1, 'estiramiento', true),
    ('Curl de Bíceps con Mancuernas',             'Bíceps',        'isolation_accessory',         'Mancuerna',     2, 'medio',        false),
    ('Curl Predicador',                           'Bíceps',        'isolation_accessory',         null,            3, 'acortamiento', false),
    ('Curl Araña',                                'Bíceps',        'isolation_accessory',         null,            3, 'acortamiento', false),
    ('Curl Concentrado',                          'Bíceps',        'isolation_accessory',         'Mancuerna',     3, 'acortamiento', false),
    -- Tríceps
    ('Extensión de Tríceps sobre la Cabeza con Mancuerna', 'Tríceps', 'isolation_accessory',      'Mancuerna',     1, 'estiramiento', false),
    ('Extensión de Tríceps sobre la Cabeza en Polea',      'Tríceps', 'isolation_accessory',      'Polea',         1, 'estiramiento', true),
    ('French Press en Máquina',                   'Tríceps',       'isolation_accessory',         'Máquina',       1, 'estiramiento', true),
    ('Fondos en Banco',                           'Tríceps',       'vertical_push',               'Peso corporal', 2, 'medio',        false),
    ('Press Cerrado',                             'Tríceps',       'horizontal_push',             'Barra',         2, 'medio',        false),
    ('Press Cerrado en Máquina',                  'Tríceps',       'horizontal_push',             'Máquina',       2, 'medio',        true),
    ('Patada de Tríceps',                         'Tríceps',       'isolation_accessory',         'Mancuerna',     3, 'acortamiento', false),
    -- Gemelos: J3 en el plan de Miguel ("rodilla en 90° aísla el sóleo").
    ('Elevación de Talones Sentado',              'Gemelos',       'isolation_accessory',         'Máquina',       3, 'acortamiento', false),
    -- Core
    ('Plancha Lateral',                           'Core',          'core_anti_flexion_extension', 'Peso corporal', null, null,        false),
    -- Bloque metabólico (AMRAP) del plan de Miguel — sin patrón, ver arriba.
    ('Remoergómetro',                             null,            null,                          'Máquina',       null, null,        false),
    ('Cuerdas de Batida (Battle Ropes)',          null,            null,                          'Cuerdas',       null, null,        false),
    ('Slam Ball',                                 null,            null,                          'Balón medicinal', null, null,      false),
    ('Bicicleta Recostada',                       null,            null,                          'Máquina',       null, null,        false),
    ('Air Bike',                                  null,            null,                          'Máquina',       null, null,        false),
    ('Empuje de Trineo (Sled Push)',              null,            null,                          'Trineo',        null, null,        false)
  ) as v(nombre, musculo, patron, equipo, j, perfil, guiada)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------

do $$
declare
  sin_ficha text;
begin
  -- Las 28 traducciones de la parte 1 encontraron su ficha. Si una no, es que
  -- alguien renombró un ejercicio y su clasificación se perdería en silencio.
  -- No se comprueba que los nuevos sigan apagados: si él ya creó alguno a mano
  -- desde la biblioteca, `on conflict do nothing` respeta el suyo tal cual.
  select string_agg(n, ', ') into sin_ficha
    from unnest(array[
      'Press de Banca Plano (Bench Press)', 'Aperturas / Cruce de Poleas',
      'Sentadilla Libre Profunda', 'Prensa 45°', 'Sentadilla Hack en Máquina',
      'Sentadilla Búlgara con Apoyo', 'Zancadas Caminando', 'Extensiones de Cuádriceps',
      'Peso Muerto Rumano', 'Peso Muerto Rumano desde Bloque', 'Curl Femoral Acostado',
      'Hip Thrust con Barra', 'Patada de Glúteo en Polea', 'Abducciones en Polea',
      'Dominadas', 'Jalón al Pecho en Polea', 'Remo con Barra', 'Remo Girona',
      'Remo Unilateral con Mancuerna', 'Pullover con Cuerda', 'Press Overhead con Barra',
      'Elevaciones Laterales', 'Pájaro / Rear Delt Fly', 'Face Pull',
      'Curl de Biceps con Barra', 'Curl Martillo', 'Press Francés',
      'Extensión de Tríceps Polea (Pushdown)'
    ]) as n
   where not exists (
     select 1 from public.exercise_library e where e.name = n and e.hierarchy_level is not null
   );

  if sin_ficha is not null then
    raise exception 'Estas clasificaciones no encontraron su ejercicio: %', sin_ficha;
  end if;
end $$;
