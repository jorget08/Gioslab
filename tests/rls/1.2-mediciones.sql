-- Pruebas de la migración 1.2: historial inmutable + aislamiento por tenant.
-- Requiere que 1.1-tenants-athletes.sql se haya ejecutado antes (crea los datos).
--
--   npx supabase db reset
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres -q \
--     < tests/rls/1.1-tenants-athletes.sql
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres -q \
--     < tests/rls/1.2-mediciones.sql

-- OJO: estas suites insertan con identificadores fijos, así que NO son
-- idempotentes. Hay que ejecutar `npx supabase db reset` antes de cada pasada,
-- o la segunda falla por clave duplicada.

\set ON_ERROR_STOP on

\set atleta_a1 '20000000-0000-0000-0000-000000000001'
\set trainer_a1 '00000000-0000-0000-0000-0000000000a2'
\set trainer_b  '00000000-0000-0000-0000-0000000000b1'

create or replace function pg_temp.como(uid text) returns void language plpgsql as $$
begin
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub',uid,'role','authenticated')::text);
end $$;

-- ===========================================================================
\echo ''
\echo '=== A. El entrenador puede registrar dos tomas del mismo atleta ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  insert into public.anthropometric_measurements
    (athlete_id, tenant_id, measured_at, height_cm, weight_kg, triceps_mm)
  values
    (:'atleta_a1','10000000-0000-0000-0000-00000000000a','2026-01-15', 178.0, 82.5, 12.0),
    (:'atleta_a1','10000000-0000-0000-0000-00000000000a','2026-06-15', 178.0, 79.0, 10.5);
  select case when count(*) = 2 then 'OK  dos tomas conviven, no se pisan'
              else 'FALLO  quedaron ' || count(*) end as resultado
  from public.anthropometric_measurements where athlete_id = :'atleta_a1';
commit;

\echo ''
\echo '=== B. La última medición es la reciente, no la primera ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  select case when weight_kg = 79.0 then 'OK  devuelve la toma de junio (79.0 kg)'
              else 'FALLO  devolvió ' || weight_kg end as resultado
  from public.anthropometric_measurements
  where athlete_id = :'atleta_a1'
  order by measured_at desc limit 1;
commit;

\echo ''
\echo '=== C. Editar un peso ya registrado: debe ser IMPOSIBLE ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  update public.anthropometric_measurements set weight_kg = 60.0
   where athlete_id = '20000000-0000-0000-0000-000000000001';
  raise notice 'FALLO  SE SOBREESCRIBIÓ UNA MEDICIÓN';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: no hay GRANT de UPDATE sobre weight_kg';
end $$;
reset role;

\echo ''
\echo '=== D. Borrar una medición: debe ser IMPOSIBLE ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  delete from public.anthropometric_measurements
   where athlete_id = '20000000-0000-0000-0000-000000000001';
  raise notice 'FALLO  SE BORRÓ HISTORIAL CLÍNICO';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: no hay GRANT de DELETE';
end $$;
reset role;

\echo ''
\echo '=== E. Anular con motivo SÍ se permite (la salida para los errores) ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  update public.anthropometric_measurements
     set voided_at = now(),
         voided_by = :'trainer_a1',
         voided_reason = 'Báscula descalibrada'
   where athlete_id = :'atleta_a1' and weight_kg = 82.5;
  select case when count(*) = 1 then 'OK  anulada, con autor y motivo, sigue en el historial'
              else 'FALLO  no se pudo anular' end as resultado
  from public.anthropometric_measurements
  where athlete_id = :'atleta_a1' and voided_at is not null;
commit;

\echo ''
\echo '=== F. Anular SIN motivo: rechazado por el CHECK ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  update public.anthropometric_measurements
     set voided_at = now(), voided_reason = null
   where athlete_id = '20000000-0000-0000-0000-000000000001' and weight_kg = 79.0;
  raise notice 'FALLO  aceptó una anulación sin motivo';
exception when check_violation then
  raise notice 'OK  rechazado: anular exige motivo';
end $$;
reset role;

\echo ''
\echo '=== G. El entrenador del tenant B no ve las mediciones de A ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_b');
  select case when count(*) = 0 then 'OK  no ve mediciones de otro tenant'
              else 'FALLO  FUGA DE DATOS CLÍNICOS: ' || count(*) end as resultado
  from public.anthropometric_measurements;
commit;

\echo ''
\echo '=== H. Anti-digitación: 1750 cm de estatura ==='
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  insert into public.anthropometric_measurements (athlete_id, tenant_id, height_cm)
  values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a', 1750);
  raise notice 'FALLO  aceptó 1750 cm';
exception when check_violation then
  raise notice 'OK  rechazado: 1750 cm fuera de rango';
end $$;
reset role;

\echo ''
\echo '=== I. Evaluación biomecánica: las columnas pendientes aceptan texto libre ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  insert into public.biomech_evaluations
    (athlete_id, tenant_id, femur_length_cm, femur_class, ankle_dorsiflexion,
     pattern_classifications)
  values
    (:'atleta_a1','10000000-0000-0000-0000-00000000000a', 48.5, 'Largo', 'Limitada',
     '{"sentadilla":"Compensada"}'::jsonb);
  select case when femur_class = 'Largo' and pattern_classifications->>'sentadilla' = 'Compensada'
              then 'OK  acepta las escalas provisionales de Giovanni'
              else 'FALLO' end as resultado
  from public.biomech_evaluations where athlete_id = :'atleta_a1';
commit;

\echo ''
\echo '=== J. El trigger corrige un tenant_id falsificado en una medición ==='
begin;
  set local role authenticated;
  select pg_temp.como(:'trainer_a1');
  insert into public.anthropometric_measurements (athlete_id, tenant_id, weight_kg)
  values (:'atleta_a1','10000000-0000-0000-0000-00000000000b', 77.0);
  select case when tenant_id = '10000000-0000-0000-0000-00000000000a'
              then 'OK  trigger sobreescribió el tenant_id falso'
              else 'FALLO  quedó ' || tenant_id::text end as resultado
  from public.anthropometric_measurements where weight_kg = 77.0;
commit;
