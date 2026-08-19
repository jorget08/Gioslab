-- Pruebas de la migración 1.3: biblioteca global, reglas versionadas y planes.
-- Requiere 1.1-tenants-athletes.sql ejecutado antes.

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
  values ('30000000-0000-0000-0000-000000000001','Sentadilla Barra Alta con Tacón','sentadilla','cuadriceps'),
         ('30000000-0000-0000-0000-000000000002','Prensa 45 grados','sentadilla','cuadriceps'),
         ('30000000-0000-0000-0000-000000000003','Sentadilla Barra Baja','sentadilla','cuadriceps');
  select case when count(*) = 3 then 'OK  super_admin creó 3 ejercicios'
              else 'FALLO' end as resultado from public.exercise_library;
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
              else 'FALLO  vio ' || count(*) end as resultado from public.exercise_library;
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
  insert into public.rules (id, rule_key, version, condition, actions, justification, evidence_level, is_active)
  values
   ('40000000-0000-0000-0000-000000000001','femur-largo-dorsiflexion-limitada',1,
    '{"femur_class":"Largo"}'::jsonb, '{"priorizar":["Prensa 45 grados"]}'::jsonb,
    'Version 1 de prueba','criterio_profesional', true),
   ('40000000-0000-0000-0000-000000000002','femur-largo-dorsiflexion-limitada',2,
    '{"femur_class":"Largo","ankle_dorsiflexion":"Limitada"}'::jsonb,
    '{"priorizar":["Sentadilla Barra Alta con Tacón"]}'::jsonb,
    'Version 2 de prueba','criterio_profesional', false);
  select case when count(*) = 2 then 'OK  conviven 2 versiones de la misma regla'
              else 'FALLO' end as resultado
  from public.rules where rule_key = 'femur-largo-dorsiflexion-limitada';
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

select case when count(*) = 2 then 'OK  el trigger registró 2 cambios sin que nadie los insertara'
            else 'FALLO  registró ' || count(*) end as resultado
from public.rule_activations;

select action, count(*) from public.rule_activations group by action order by action;

\echo ''
\echo '=== G. Una regla sin justificación es rechazada ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  insert into public.rules (rule_key, version, condition, actions, justification, evidence_level)
  values ('regla-muda',1,'{}'::jsonb,'{}'::jsonb,'   ','criterio_profesional');
  raise notice 'FALLO  aceptó una regla sin justificación';
exception when check_violation then
  raise notice 'OK  rechazada: sin justificación no se puede mostrar al entrenador';
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
