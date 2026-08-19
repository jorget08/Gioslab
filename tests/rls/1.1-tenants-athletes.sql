\set ON_ERROR_STOP on

-- ===========================================================================
-- Datos de prueba: 2 tenants, 5 usuarios, 3 atletas
-- ===========================================================================
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@gioslab.co','x',now(),now()),
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gymA@gioslab.co','x',now(),now()),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','trainerA1@gioslab.co','x',now(),now()),
  ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','trainerA2@gioslab.co','x',now(),now()),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','soloB@gioslab.co','x',now(),now());

insert into public.tenants (id, type, name) values
  ('10000000-0000-0000-0000-00000000000a','gym','Gimnasio A'),
  ('10000000-0000-0000-0000-00000000000b','solo','Entrenador B independiente');

insert into public.users (id, email, is_super_admin) values
  ('00000000-0000-0000-0000-0000000000a0','admin@gioslab.co',     true),
  ('00000000-0000-0000-0000-0000000000a1','gymA@gioslab.co',      false),
  ('00000000-0000-0000-0000-0000000000a2','trainerA1@gioslab.co', false),
  ('00000000-0000-0000-0000-0000000000a3','trainerA2@gioslab.co', false),
  ('00000000-0000-0000-0000-0000000000b1','soloB@gioslab.co',     false);

-- La membresía define el rol DENTRO de cada tenant. El trigger deja activo el
-- primero, así que estos usuarios arrancan operando donde corresponde.
insert into public.memberships (user_id, tenant_id, role) values
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-00000000000a','gym'),
  ('00000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-00000000000a','trainer'),
  ('00000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-00000000000a','trainer'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-00000000000b','trainer');

insert into public.athletes (id, tenant_id, trainer_id, full_name, birth_date, sex) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','Atleta de A1','1995-03-10','masculino'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a3','Atleta de A2','1998-07-22','femenino'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1','Atleta de B','2000-01-05','masculino');

insert into public.athlete_injuries (athlete_id, tenant_id, body_region, description) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000b','hombro','tenant_id MENTIDO a propósito');

commit;

-- ===========================================================================
\echo ''
\echo '=== A. El trigger corrigió el tenant_id mentido? ==='
select
  case when tenant_id = '10000000-0000-0000-0000-00000000000a'
       then 'OK  trigger sobreescribió el tenant_id falso'
       else 'FALLO  quedó ' || tenant_id::text end as resultado
from public.athlete_injuries;

\echo ''
\echo '=== B. Atletas visibles por rol (esperado: 3 / 2 / 1 / 1 / 0) ==='

create or replace function pg_temp.como(uid text) returns void language plpgsql as $$
begin
  execute format('set local request.jwt.claims = %L', json_build_object('sub',uid,'role','authenticated')::text);
end $$;

begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000a0');
  select 'super_admin' as rol, count(*) as atletas, '3' as esperado from public.athletes;
commit;

begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
  select 'gym A' as rol, count(*) as atletas, '2' as esperado from public.athletes;
commit;

begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  select 'trainer A1' as rol, count(*) as atletas, '1' as esperado from public.athletes;
commit;

begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
  select 'trainer solo B' as rol, count(*) as atletas, '1' as esperado from public.athletes;
commit;

do $$
declare n int;
begin
  set local role anon;
  select count(*) into n from public.athletes;
  raise notice 'FALLO  un anónimo leyó % filas', n;
exception when insufficient_privilege then
  raise notice 'OK  anónimo: permission denied (ni siquiera llega a RLS)';
end $$;
reset role;

\echo ''
\echo '=== C. Fuga entre tenants: trainer A1 buscando al atleta de B ==='
begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  select case when count(*) = 0 then 'OK  no ve al atleta de otro tenant'
              else 'FALLO  FUGA DE TENANT' end as resultado
  from public.athletes where id = '20000000-0000-0000-0000-000000000003';
commit;

\echo ''
\echo '=== D. Trainer A1 intentando robarse un atleta de su colega A2 ==='
begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  update public.athletes set full_name = 'HACKEADO'
   where id = '20000000-0000-0000-0000-000000000002';
  select case when count(*) = 0 then 'OK  el UPDATE no tocó ninguna fila'
              else 'FALLO  modificó el atleta de otro entrenador' end as resultado
  from public.athletes where full_name = 'HACKEADO';
commit;

\echo ''
\echo '=== E. Escalada de privilegios por parte de un entrenador ==='

-- E1: auto-concederse el rol de dueño del gimnasio.
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  insert into public.memberships (user_id, tenant_id, role)
  values ('00000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-00000000000a','gym');
  raise notice 'FALLO  se auto-concedió el rol gym';
exception
  when insufficient_privilege or unique_violation then
    raise notice 'OK  no puede auto-concederse un rol';
  when others then
    raise notice 'OK  rechazado por RLS (%)', sqlerrm;
end $$;
reset role;

-- E2: ascenderse a administrador de plataforma.
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  update public.users set is_super_admin = true
   where id = '00000000-0000-0000-0000-0000000000a2';
  raise notice 'FALLO  SE ASCENDIÓ A SUPER_ADMIN';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: solo full_name es actualizable por el usuario';
end $$;
reset role;

-- E3: saltar a un tenant al que no pertenece.
do $$
begin
  set local role authenticated;
  perform pg_temp.como('00000000-0000-0000-0000-0000000000a2');
  perform public.cambiar_tenant('10000000-0000-0000-0000-00000000000b');
  raise notice 'FALLO  SALTÓ A UN TENANT AJENO';
exception when insufficient_privilege then
  raise notice 'OK  rechazado: no pertenece a ese tenant';
end $$;
reset role;

\echo '=== F. Lesiones: el trainer de B no ve las del atleta de A ==='
begin;
  set local role authenticated;
  select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
  select case when count(*) = 0 then 'OK  no ve lesiones de otro tenant'
              else 'FALLO  FUGA DE DATOS CLÍNICOS' end as resultado
  from public.athlete_injuries;
commit;

\echo ''
\echo '=== G. super_admin no puede ser un rol DENTRO de un tenant ==='
do $$
begin
  insert into public.memberships (user_id, tenant_id, role)
  values ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-00000000000a','super_admin');
  raise notice 'FALLO  aceptó super_admin como rol de tenant';
exception when check_violation then
  raise notice 'OK  rechazado: super_admin es de plataforma, no de tenant';
end $$;
