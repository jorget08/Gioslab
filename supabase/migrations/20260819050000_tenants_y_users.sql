-- 1.1 — Multi-tenant: tenants, users y funciones auxiliares de RLS.
-- Ver docs/MODELO-DATOS.md §1.1 y §6.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Un tenant es un gimnasio o un entrenador independiente (plan individual).
create type public.tenant_type as enum ('gym', 'solo');

-- Los 4 roles de CLAUDE.md §1. Decididos, por eso son enum y no text.
create type public.user_role as enum ('super_admin', 'gym', 'trainer', 'client');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Mantiene updated_at. Se engancha como BEFORE UPDATE en toda tabla de negocio.';

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  type        public.tenant_type not null,
  name        text not null check (length(btrim(name)) > 0),
  plan        text not null default 'trial',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.tenants is
  'Unidad de aislamiento. Un gimnasio o un entrenador independiente.';

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- users — perfil espejo de auth.users
-- ---------------------------------------------------------------------------

create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  tenant_id   uuid references public.tenants (id) on delete restrict,
  role        public.user_role not null,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,

  -- super_admin opera la plataforma entera y por eso no pertenece a ningún
  -- tenant. Todos los demás roles obligatoriamente pertenecen a uno: sin esta
  -- restricción, un usuario con tenant_id NULL se saltaría el aislamiento.
  constraint users_tenant_segun_rol check (
    (role = 'super_admin' and tenant_id is null)
    or (role <> 'super_admin' and tenant_id is not null)
  )
);

comment on table public.users is
  'Perfil de aplicación. La identidad y las credenciales viven en auth.users.';

create index users_tenant_id_idx on public.users (tenant_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de RLS
-- ---------------------------------------------------------------------------
--
-- Son SECURITY DEFINER a propósito. Si leyeran public.users como el usuario
-- que llama, la política de users invocaría mi_tenant(), que volvería a leer
-- users, que volvería a invocar la política: recursión infinita y error en
-- cada consulta. SECURITY DEFINER hace que la lectura interna se salte RLS y
-- corta el ciclo.
--
-- search_path fijado para que nadie pueda anteponer un esquema propio con una
-- tabla "users" falsa y hacer que la función devuelva otro tenant.

create or replace function public.mi_tenant()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tenant_id from public.users where id = auth.uid();
$$;

comment on function public.mi_tenant is
  'tenant_id del usuario autenticado. NULL para super_admin y para anónimos.';

create or replace function public.mi_rol()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.users where id = auth.uid();
$$;

comment on function public.mi_rol is
  'Rol del usuario autenticado. NULL si no hay sesión.';

revoke execute on function public.mi_tenant() from public, anon;
revoke execute on function public.mi_rol()    from public, anon;
grant  execute on function public.mi_tenant() to authenticated;
grant  execute on function public.mi_rol()    to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos de tabla
-- ---------------------------------------------------------------------------
--
-- RLS decide QUÉ FILAS ve un rol, pero el GRANT decide si puede tocar la tabla
-- siquiera. Sin esto, cualquier consulta responde "permission denied" aunque la
-- política sea correcta.
--
-- A `anon` no se le concede nada, a propósito: en esta base no hay una sola fila
-- que deba ver alguien sin sesión iniciada.

grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.users   to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Se activa en la misma migración que crea la tabla (MODELO-DATOS.md §6).
-- Las políticas finas se afinan en la tarea 1.4; estas son la base segura.

alter table public.tenants enable row level security;
alter table public.users   enable row level security;

-- tenants: cada quien ve el suyo. Solo super_admin escribe.
create policy tenants_lectura_propia on public.tenants
  for select to authenticated
  using (id = public.mi_tenant() or public.mi_rol() = 'super_admin');

create policy tenants_admin_total on public.tenants
  for all to authenticated
  using (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

-- users: se ve el propio perfil y el de los compañeros del mismo tenant.
create policy users_lectura_tenant on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.mi_rol() = 'super_admin'
    or (tenant_id is not null and tenant_id = public.mi_tenant())
  );

-- Cada usuario edita su propio perfil, pero no puede ascenderse de rol ni
-- mudarse de tenant: esas dos columnas se validan contra su valor actual.
create policy users_edita_su_perfil on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.mi_rol()
    and tenant_id is not distinct from public.mi_tenant()
  );

create policy users_admin_total on public.users
  for all to authenticated
  using (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');
