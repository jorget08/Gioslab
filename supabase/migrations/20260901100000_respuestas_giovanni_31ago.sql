-- ===========================================================================
-- Respuestas de Giovanni del 31-ago: rodilla, asimetría y fondos
-- ===========================================================================
--
-- Contesta las tres preguntas que dejó abiertas la carga de los 21
-- (PREGUNTAS-GIOVANNI, 31 de agosto).

-- ---------------------------------------------------------------------------
-- 1. RODILLA — opción (b): solo se quita la sentadilla libre
-- ---------------------------------------------------------------------------
--
-- Sus palabras: «solo se debe quitar la sentadilla libre, el resto de
-- sentadillas sí se pueden hacer, con cuidado».
--
-- ⚠️ SE APLICA LA LECTURA LITERAL Y ESTRECHA, y es deliberado. Él habló de
-- "las sentadillas", así que solo se tocan los ejercicios que se llaman
-- Sentadilla. Quedan como estaban el Hack Libre, las dos prensas, el Sissy
-- Squat, las Zancadas, las Extensiones de Cuádriceps y el Curl Femoral: no los
-- nombró.
--
-- La asimetría de las dos lecturas manda: equivocarse de menos deja al atleta
-- con opciones de sobra que no usará; equivocarse de más le pone un Sissy Squat
-- —el ejercicio que más carga la rodilla de toda la biblioteca— encima de una
-- lesión. Ante la duda, la lectura que no puede hacer daño. Repreguntado.

update public.exercise_library
   set contraindications = (
         select coalesce(jsonb_agg(v), '[]'::jsonb)
           from jsonb_array_elements(contraindications) v
          where v <> '"Rodilla"'::jsonb
       )
 where is_active
   and contraindications ? 'Rodilla'
   and name like 'Sentadilla%'
   and name <> 'Sentadilla Libre Profunda';

-- ---------------------------------------------------------------------------
-- «Con cuidado» no era un adorno, y no cabía en el modelo
-- ---------------------------------------------------------------------------
--
-- Una contraindicación es binaria: el ejercicio se da o no se da. Él pidió un
-- estado intermedio —se da, pero con precaución— y quitarle la contraindicación
-- sin más se lleva por delante la mitad de su respuesta: el atleta acabaría con
-- una sentadilla profunda sin una sola advertencia.
--
-- El sitio donde eso SÍ cabe ya existe: `modificador`, que el propio motor
-- define como "cambia el CÓMO sin quitarlo". Va como regla porque las reglas son
-- datos (§3.1) y porque así Giovanni la puede editar sin tocar código.
--
-- El texto son sus palabras, no un criterio clínico nuestro. Si quiere afinarlo
-- —rango, carga, tempo— lo edita en /admin/reglas.

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select 'rodilla-sentadillas-con-precaucion',
       coalesce((select max(r.version) from public.rules r
                  where r.rule_key = 'rodilla-sentadillas-con-precaucion'), 0) + 1,
       1,
       '{"todas":[{"hecho":"lesiones","op":"incluye","valor":"Rodilla"}]}'::jsonb,
       '{"modificador":"Lesión de rodilla: las sentadillas se permiten CON PRECAUCIÓN. La sentadilla libre profunda queda excluida."}'::jsonb,
       'Con lesión de rodilla solo se retira la sentadilla libre profunda; el resto de sentadillas se pueden hacer con cuidado.',
       'LEVEL_C_CONSENSUS',
       true
 where not exists (
   select 1 from public.rules
    where rule_key = 'rodilla-sentadillas-con-precaucion' and is_active
 );

-- ---------------------------------------------------------------------------
-- 3. FONDOS — son dos ejercicios, no uno
-- ---------------------------------------------------------------------------
--
-- Pidió los dos patrones porque «el horizontal se enfoca más en el pectoral
-- mayor y el vertical tiene mayor incidencia el tríceps». Un ejercicio solo
-- admite un patrón, y el patrón es la llave con la que el motor sustituye, así
-- que la salida es partirlo — que es lo que él ya hace con las sentadillas.
-- Confirmó los dos nombres.
--
-- El original se ARCHIVA, no se borra (§3.5 y tarea 4.1). Hoy no lo referencia
-- ninguna regla, variante ni plan —se comprobó—, pero un ejercicio borrado deja
-- huérfano cualquier plan futuro que lo nombre.

insert into public.exercise_library
  (name, target_muscle, movement_pattern, equipment, contraindications, description)
select v.nombre, v.musculo, v.patron, e.equipment, e.contraindications, v.descripcion
  from public.exercise_library e
  cross join (values
    ('Fondos en Paralelas (énfasis pectoral)', 'Pectoral', 'horizontal_push',
     'Torso inclinado hacia delante y codos algo abiertos: carga el pectoral mayor.'),
    ('Fondos en Paralelas (énfasis tríceps)',  'Tríceps',  'vertical_push',
     'Torso vertical y codos pegados: la carga se desplaza al tríceps.')
  ) as v(nombre, musculo, patron, descripcion)
 where e.name = 'Fondos en Paralelas (Dips)'
on conflict (name) do nothing;

update public.exercise_library
   set is_active = false
 where name = 'Fondos en Paralelas (Dips)';

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------

do $$
declare
  quedan   integer;
  fondos   integer;
begin
  select count(*) into quedan
    from public.exercise_library
   where is_active and contraindications ? 'Rodilla' and name like 'Sentadilla%';

  -- Solo la libre profunda debe seguir descartando por rodilla.
  if quedan <> 1 then
    raise exception 'Debería quedar 1 sentadilla contraindicada para rodilla y quedan %', quedan;
  end if;

  select count(*) into fondos
    from public.exercise_library
   where is_active and name like 'Fondos en Paralelas (énfasis%';

  if fondos <> 2 then
    raise exception 'Deberían existir los 2 fondos por énfasis y hay %', fondos;
  end if;
end $$;
