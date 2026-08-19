-- 1.4b — Un usuario puede pertenecer a VARIOS tenants.
--
-- ===========================================================================
-- POR QUÉ
-- ===========================================================================
--
-- El modelo anterior daba un tenant por usuario. Eso deja fuera el caso real:
-- un entrenador con alumnos propios que ADEMÁS trabaja en un gimnasio que tiene
-- la app contratada. Y también al dueño de gimnasio que además entrena, que
-- necesitaba ser `gym` y `trainer` a la vez.
--
-- La pertenencia pasa a ser una tabla propia, con un rol POR tenant. El usuario
-- tiene un tenant ACTIVO y cambia entre ellos de forma explícita.
--
-- Ninguna de las 13 políticas de RLS cambia: todas pasan por mi_tenant() y
-- mi_rol(), así que basta con redefinir esas dos funciones. Ese fue el motivo de
-- centralizarlas en la 1.1.
--
-- REGLA DE NEGOCIO DECIDIDA: el atleta pertenece al tenant que estaba activo
-- cuando se creó. Si el entrenador deja el gimnasio, el gimnasio conserva sus
-- atletas y el entrenador se lleva solo los personales. Es lo que espera quien
-- paga la licencia y lo más limpio ante la Ley 1581: un único responsable del
-- dato. No hace falta código: athletes.tenant_id ya lo hace.

-- ---------------------------------------------------------------------------
-- A. Nuevas columnas en users
-- ---------------------------------------------------------------------------

alter table public.users
  add column is_super_admin   boolean not null default false,
  add column active_tenant_id uuid references public.tenants (id) on delete set null;

comment on column public.users.is_super_admin is
  'Administrador de la plataforma. Es un eje distinto al rol dentro de un tenant.';
comment on column public.users.active_tenant_id is
  'Tenant en el que el usuario está operando ahora. Solo se cambia con cambiar_tenant().';

-- ---------------------------------------------------------------------------
-- B. memberships
-- ---------------------------------------------------------------------------

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id)   on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  -- super_admin no vive aquí: es de plataforma, no de tenant.
  role       public.user_role not null check (role in ('gym', 'trainer', 'client')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id),

  unique (user_id, tenant_id)
);

comment on table public.memberships is
  'Pertenencia de un usuario a un tenant, con su rol allí. Un usuario puede tener varias.';

create index memberships_user_idx   on public.memberships (user_id);
create index memberships_tenant_idx on public.memberships (tenant_id);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- C. Migrar lo existente
-- ---------------------------------------------------------------------------

insert into public.memberships (user_id, tenant_id, role)
select id, tenant_id, role
from public.users
where tenant_id is not null and role <> 'super_admin';

update public.users set is_super_admin = true where role = 'super_admin';
update public.users set active_tenant_id = tenant_id where tenant_id is not null;

-- ---------------------------------------------------------------------------
-- D. Retirar las columnas viejas
-- ---------------------------------------------------------------------------
-- Hay que quitar antes las políticas que las mencionan.

drop policy if exists users_lectura_tenant  on public.users;
drop policy if exists users_edita_su_perfil on public.users;
drop policy if exists users_admin_total     on public.users;
drop policy if exists tenants_lectura_propia on public.tenants;

alter table public.users drop constraint if exists users_tenant_segun_rol;
alter table public.users drop column tenant_id;
alter table public.users drop column role;

-- ---------------------------------------------------------------------------
-- E. Redefinir las dos funciones
-- ---------------------------------------------------------------------------

create or replace function public.mi_tenant()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select active_tenant_id from public.users where id = auth.uid();
$$;

comment on function public.mi_tenant is
  'Tenant activo del usuario. NULL si no ha elegido ninguno o no hay sesión.';

create or replace function public.mi_rol()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when coalesce((select is_super_admin from public.users where id = auth.uid()), false)
      then 'super_admin'::public.user_role
    else (
      select m.role
      from public.memberships m
      join public.users u on u.id = m.user_id
      where m.user_id = auth.uid()
        and m.tenant_id = u.active_tenant_id
    )
  end;
$$;

comment on function public.mi_rol is
  'Rol del usuario EN SU TENANT ACTIVO. El mismo usuario puede tener otro rol en otro tenant.';

-- ---------------------------------------------------------------------------
-- F. Cambio de contexto
-- ---------------------------------------------------------------------------
--
-- CRÍTICO: esto NO puede ser un UPDATE directo sobre active_tenant_id. Si lo
-- fuera, cualquiera podría apuntar su tenant activo a un gimnasio ajeno y leer
-- sus datos clínicos: mi_tenant() devolvería ese id y todas las políticas lo
-- darían por bueno.
--
-- Por eso el cambio pasa por esta función, que verifica la membresía, y el
-- UPDATE directo sobre la columna queda revocado más abajo.

create or replace function public.cambiar_tenant(nuevo_tenant uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.memberships
    where user_id = auth.uid() and tenant_id = nuevo_tenant
  ) then
    raise exception 'No perteneces a ese tenant'
      using errcode = 'insufficient_privilege';
  end if;

  update public.users set active_tenant_id = nuevo_tenant where id = auth.uid();
end;
$$;

revoke execute on function public.cambiar_tenant(uuid) from public, anon;
grant  execute on function public.cambiar_tenant(uuid) to authenticated;

-- Al recibir la primera membresía, ese tenant queda activo. Sin esto, un
-- entrenador recién invitado entraría a una aplicación vacía sin saber por qué.
create or replace function public.activar_primer_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.users
     set active_tenant_id = new.tenant_id
   where id = new.user_id and active_tenant_id is null;
  return new;
end;
$$;

create trigger memberships_activa_primer_tenant
  after insert on public.memberships
  for each row execute function public.activar_primer_tenant();

-- ---------------------------------------------------------------------------
-- G. Permisos
-- ---------------------------------------------------------------------------
--
-- Se retira el UPDATE general sobre users y se concede solo `full_name`.
-- active_tenant_id e is_super_admin quedan fuera del alcance del cliente:
-- el primero se cambia con cambiar_tenant(), el segundo solo desde el servidor.

revoke update on public.users from authenticated;
grant  update (full_name) on public.users to authenticated;

grant select, insert, update, delete on public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- H. Políticas
-- ---------------------------------------------------------------------------
-- Enumeración positiva en todas: lo que no se nombra, queda fuera (§6).

alter table public.memberships enable row level security;

-- El selector de contexto necesita listar los tenants a los que pertenezco,
-- no solo el activo.
create policy tenants_lectura_propia on public.tenants
  for select to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = tenants.id
    )
  );

create policy tenants_admin_escribe on public.tenants
  for all to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

create policy users_lectura on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.mi_rol() = 'super_admin'
    or (
      public.mi_rol() in ('gym', 'trainer')
      and exists (
        select 1 from public.memberships m
        where m.user_id = users.id and m.tenant_id = public.mi_tenant()
      )
    )
  );

create policy users_edita_su_nombre on public.users
  for update to authenticated
  using      (id = auth.uid())
  with check (id = auth.uid());

create policy users_admin_total on public.users
  for all to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

-- Veo mis propias membresías (para el selector) y, si administro un gimnasio,
-- las de mi tenant activo.
create policy memberships_lectura on public.memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.mi_rol() = 'super_admin'
    or (public.mi_rol() = 'gym' and tenant_id = public.mi_tenant())
  );

-- Quién puede meter gente en un tenant: el super_admin, y el dueño del gimnasio
-- dentro del suyo. Un entrenador no puede auto-inscribirse en ningún lado.
create policy memberships_escritura on public.memberships
  for all to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or (public.mi_rol() = 'gym' and tenant_id = public.mi_tenant())
  )
  with check (
    public.mi_rol() = 'super_admin'
    or (public.mi_rol() = 'gym' and tenant_id = public.mi_tenant())
  );
