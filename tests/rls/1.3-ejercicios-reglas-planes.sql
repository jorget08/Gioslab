-- Pruebas de la migración 1.3: biblioteca global, reglas versionadas y planes.
-- Requiere 1.1-tenants-athletes.sql ejecutado antes.

-- OJO: estas suites insertan con identificadores fijos, así que NO son
-- idempotentes. Hay que ejecutar `npx supabase db reset` antes de cada pasada,
-- o la segunda falla por clave duplicada.

\set ON_ERROR_STOP on

\set admin      '00000000-0000-0000-0000-0000000000a0'
\set trainer_a1 '00000000-0000-0000-0000-0000000000a2'
\set trainer_b  '00000000-0000-0000-0000-0000000000b1'
\set atleta_a1  '20000000-0000-0000-0000-000000000001'
\set tenant_a   '10000000-0000-0000-0000-00000000000a'

create or replace function pg_temp.como(uid text) returns void language plpgsql as $$
begin
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub',uid,'role','authenticated')::text);
end $$;

-- ===========================================================================
\echo ''
\echo '=== A. super_admin crea ejercicios; un entrenador NO puede ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'admin');
  insert into public.exercise_library (id, name, movement_pattern, target_muscle)
  values ('30000000-0000-0000-0000-000000000001','Sentadilla Barra Alta con Tacón','squat_dominante_rodilla','cuadriceps'),
         ('30000000-0000-0000-0000-000000000002','Prensa 45 grados','squat_dominante_rodilla','cuadriceps'),
         ('30000000-0000-0000-0000-000000000003','Sentadilla Barra Baja','squat_dominante_rodilla','cuadriceps');
  -- Se acota a los suyos: la biblioteca ya trae los del seed (tarea 1.9), y
  -- contar la tabla entera ataría esta prueba a que la base esté vacía.
  select case when count(*) = 3 then 'OK  super_admin creó 3 ejercicios'
              else 'FALLO  creó ' || count(*) end as resultado
  from public.exercise_library where id::text like '30000000-%';
commit;

do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  insert into public.exercise_library (name) values ('Ejercicio pirata');
  raise notice 'FALLO  un entrenador modificó la biblioteca de Giovanni';
exception when others then
  raise notice 'OK  entrenador rechazado al escribir en la biblioteca';
end $$;
reset role;

\echo ''
\echo '=== B. La biblioteca es global: el entrenador del tenant B la ve ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_b');
  select case when count(*) = 3 then 'OK  ve los 3 ejercicios (catálogo común)'
              else 'FALLO  vio ' || count(*) end as resultado
  from public.exercise_library where id::text like '30000000-%';
commit;

\echo ''
\echo '=== C. Un ejercicio no puede ser variante de sí mismo ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  insert into public.exercise_variants (exercise_id, variant_exercise_id, relation_type)
  values ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','sustitucion');
  raise notice 'FALLO  aceptó autorreferencia';
exception when check_violation then
  raise notice 'OK  rechazada la autorreferencia';
end $$;
reset role;

\echo ''
\echo '=== D. Dos versiones de una regla, una sola activa ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'admin');
  insert into public.rules (id, rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
  values
   ('40000000-0000-0000-0000-000000000001','dorsiflexion-de-prueba',1,1,
    '{"todas":[{"hecho":"dorsiflexion_cm","op":"<","valor":5}]}'::jsonb,
    '{"priorizar":["Prensa 45 grados"]}'::jsonb,
    'Version 1 de prueba','LEVEL_B_BIOMECHANICS', true),
   ('40000000-0000-0000-0000-000000000002','dorsiflexion-de-prueba',2,1,
    '{"todas":[{"hecho":"dorsiflexion_cm","op":"entre","valor":[5,10]}]}'::jsonb,
    '{"priorizar":["Sentadilla Barra Alta con Tacón"]}'::jsonb,
    'Version 2 de prueba','LEVEL_B_BIOMECHANICS', false);
  select case when count(*) = 2 then 'OK  conviven 2 versiones de la misma regla'
              else 'FALLO' end as resultado
  from public.rules where rule_key = 'dorsiflexion-de-prueba';
commit;

do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  update public.rules set is_active = true
   where id = '40000000-0000-0000-0000-000000000002';
  raise notice 'FALLO  DOS VERSIONES ACTIVAS DE LA MISMA REGLA';
exception when unique_violation then
  raise notice 'OK  rechazado: solo una version activa por rule_key';
end $$;
reset role;

\echo ''
\echo '=== E. Reescribir la justificación de una regla publicada: IMPOSIBLE ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  update public.rules set justification = 'reescrita a posteriori'
   where id = '40000000-0000-0000-0000-000000000001';
  raise notice 'FALLO  SE REESCRIBIÓ LA JUSTIFICACIÓN';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: solo is_active es actualizable';
end $$;
reset role;

\echo ''
\echo '=== F. El registro de cambios lo escribe la BASE, no la aplicación ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'admin');
  update public.rules set is_active = false where id = '40000000-0000-0000-0000-000000000001';
  update public.rules set is_active = true  where id = '40000000-0000-0000-0000-000000000002';
commit;

-- Acotado a las DOS reglas que toca este bloque. Un `count(*)` sobre la tabla
-- entera contaba también lo que hubieran escrito otras suites —`test:reglas`
-- activa y desactiva reglas propias— y el test fallaba por contaminación ajena
-- en vez de por un fallo del trigger, que es lo que aquí se comprueba.
--
-- Se comprueba la SECUENCIA y no el número. Son tres sucesos y cada uno prueba
-- una cosa distinta: la v1 nació activa (trigger de insert, tarea 3.6), luego se
-- retiró y luego entró la v2 (trigger de update). Un total suelto daría igual de
-- verde si el orden fuera imposible.
select case when string_agg(a.action, ' → ' order by a.created_at, r.version)
              = 'activada → desactivada → activada'
            then 'OK  el trigger registró el alta, la retirada y el relevo'
            else 'FALLO  registró ' || coalesce(string_agg(a.action, ' → ' order by a.created_at, r.version), 'nada')
       end as resultado
  from public.rule_activations a
  join public.rules r on r.id = a.rule_id
 where a.rule_id in ('40000000-0000-0000-0000-000000000001',
                     '40000000-0000-0000-0000-000000000002');

\echo ''
\echo '=== G. Una regla sin justificación es rechazada ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  insert into public.rules (rule_key, version, nivel, condition, actions, justification, evidence_level)
  values ('regla-muda',1,1,
    '{"todas":[{"hecho":"dorsiflexion_cm","op":"<","valor":5}]}'::jsonb,
    '{"priorizar":["X"]}'::jsonb,'   ','LEVEL_B_BIOMECHANICS');
  raise notice 'FALLO  aceptó una regla sin justificación';
exception when check_violation then
  raise notice 'OK  rechazada: sin justificación no se puede mostrar al entrenador';
end $$;
reset role;

\echo ''
\echo '=== G.2 La forma de la condición y de las acciones se exige en la base ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  -- La forma vieja, sin `todas`: dispararía en toda evaluación.
  insert into public.rules (rule_key, version, nivel, condition, actions, justification, evidence_level)
  values ('regla-informe',1,1,'{"femur_class":"Largo"}'::jsonb,
    '{"priorizar":["X"]}'::jsonb,'Con justificacion','LEVEL_B_BIOMECHANICS');
  raise notice 'FALLO  aceptó una condición sin predicados';
exception when check_violation then
  raise notice 'OK  rechazada: una condición sin predicados dispararía siempre';
end $$;

do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  insert into public.rules (rule_key, version, nivel, condition, actions, justification, evidence_level)
  values ('regla-inutil',1,1,
    '{"todas":[{"hecho":"dorsiflexion_cm","op":"<","valor":5}]}'::jsonb,
    '{}'::jsonb,'Con justificacion','LEVEL_B_BIOMECHANICS');
  raise notice 'FALLO  aceptó una regla que no hace nada';
exception when check_violation then
  raise notice 'OK  rechazada: una regla sin acciones se evalúa para nada';
end $$;
reset role;

\echo ''
\echo '=== H. engine_run + plan, y aislamiento entre tenants ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  insert into public.engine_runs (id, athlete_id, tenant_id, rules_fired, output)
  values ('50000000-0000-0000-0000-000000000001', :'atleta_a1', :'tenant_a',
          '[{"rule_key":"femur-largo-dorsiflexion-limitada","version":2,"justification":"Version 2 de prueba"}]'::jsonb,
          '{"priorizar":["Sentadilla Barra Alta con Tacón"]}'::jsonb);
  insert into public.workout_plans (athlete_id, tenant_id, trainer_id, engine_run_id, duration_weeks)
  values (:'atleta_a1', :'tenant_a', :'trainer_a1', '50000000-0000-0000-0000-000000000001', 8);
  select 'OK  engine_run y plan creados' as resultado;
commit;

begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_b');
  select case when count(*) = 0 then 'OK  el entrenador de B no ve planes de A'
              else 'FALLO  FUGA: ' || count(*) end as resultado from public.workout_plans;
commit;

\echo ''
\echo '=== I. Un engine_run no se puede editar (la justificación no cambia) ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  update public.engine_runs set output = '{"manipulado":true}'::jsonb
   where id = '50000000-0000-0000-0000-000000000001';
  raise notice 'FALLO  SE MANIPULÓ LA SALIDA DEL MOTOR';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: engine_runs es inmutable';
end $$;
reset role;

\echo ''
\echo '=== J. El plan SÍ se edita: el entrenador es quien decide ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  update public.workout_plans set status = 'activo', title = 'Mesociclo 1';
  select case when status = 'activo' then 'OK  el copiloto no manda: el plan es editable'
              else 'FALLO' end as resultado from public.workout_plans limit 1;
commit;

\echo ''
\echo '=== K. La inmutabilidad por columna existe de verdad ==='
-- Supabase concede `all` sobre cada tabla nueva a `authenticated`, así que un
-- `grant update (columna)` SUMA en vez de restringir. Durante meses estas seis
-- tablas parecían inmutables y no lo eran. Esto compara lo concedido con lo
-- declarado, para que una tabla nueva que se olvide del `revoke` se caiga aquí
-- y no en producción seis meses después.
with esperado(tabla, cols) as (
  values
    ('rules',                       array['is_active']),
    ('invitations',                 array['revoked_at']),
    ('athlete_conditions',          array['is_active','notes']),
    ('anthropometric_measurements', array['voided_at','voided_by','voided_reason']),
    ('biomech_evaluations',         array['voided_at','voided_by','voided_reason']),
    ('menstrual_cycle_logs',        array['voided_at','voided_by','voided_reason']),
    ('engine_runs',                 array[]::text[]),
    ('users',                       array['full_name'])
),
real as (
  select table_name::text as tabla, array_agg(column_name::text order by column_name) as cols
    from information_schema.column_privileges
   where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'UPDATE'
   group by table_name
)
select case
         when coalesce(r.cols, array[]::text[]) = (select array_agg(c order by c) from unnest(e.cols) c)
           or (e.cols = array[]::text[] and r.cols is null)
         then 'OK  ' || e.tabla || ' solo deja tocar lo declarado'
         else 'FALLO  ' || e.tabla || ' deja actualizar: ' || array_to_string(coalesce(r.cols, '{}'), ', ')
       end as resultado
  from esperado e left join real r on r.tabla = e.tabla
 order by e.tabla;
