-- 1.7 — Invitaciones: un gimnasio suma entrenadores, un entrenador suma clientes.
--
-- ===========================================================================
-- DISEÑO
-- ===========================================================================
--
-- El token se genera y se guarda HASHEADO. La base nunca almacena el valor que
-- viaja en el enlace: si alguien se llevara un volcado de la tabla, no podría
-- aceptar ninguna invitación. Es el mismo trato que se le da a una contraseña.
--
-- Aceptar exige que el correo de la cuenta COINCIDA con el de la invitación. Sin
-- eso, reenviar el enlace a un tercero le daría acceso al gimnasio: bastaría con
-- que lo abriera cualquiera con una cuenta.
--
-- El rol y el tenant salen de la fila que creó quien invita, nunca de lo que
-- mande el navegador al aceptar. Misma lección que el registro de la 1.5.

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  -- Se normaliza a minúsculas al crear, para que la comparación al aceptar no
  -- falle por como el gimnasio haya tecleado el correo.
  email       text not null check (position('@' in email) > 1),

  role        public.user_role not null check (role in ('gym', 'trainer', 'client')),

  -- SHA-256 del token. El valor original solo existe en el enlace.
  token_hash  text not null unique,

  invited_by  uuid references public.users (id) on delete set null,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.users (id) on delete set null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),

  constraint invitacion_no_aceptada_y_revocada check (
    accepted_at is null or revoked_at is null
  )
);

comment on table public.invitations is
  'Invitaciones a un tenant. El token viaja solo en el enlace; aquí se guarda su hash.';

create index invitations_tenant_idx on public.invitations (tenant_id, created_at desc);

-- Una sola invitación viva por correo y tenant: evita que reenviar el formulario
-- deje tres enlaces válidos para la misma persona.
create unique index invitations_una_viva_por_correo
  on public.invitations (tenant_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Crear invitación
-- ---------------------------------------------------------------------------
--
-- Devuelve el token EN CLARO una única vez. Quien invita lo recibe, arma el
-- enlace y se lo hace llegar al invitado. No vuelve a estar disponible: la
-- tabla solo guarda el hash.

create or replace function public.crear_invitacion(
  p_email text,
  p_rol   public.user_role,
  p_dias_validez integer default 7
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant uuid := public.mi_tenant();
  v_rol    public.user_role := public.mi_rol();
  v_email  text := lower(btrim(p_email));
  v_token  text;
begin
  if v_tenant is null then
    raise exception 'No tienes un espacio de trabajo activo'
      using errcode = 'insufficient_privilege';
  end if;

  -- Quién puede invitar a quién. Enumeración positiva (§1.4): lo que no está
  -- escrito aquí, no se permite.
  if not (
    v_rol = 'super_admin'
    or (v_rol = 'gym' and p_rol in ('trainer', 'client'))
    or (v_rol = 'trainer' and p_rol = 'client')
  ) then
    raise exception 'Tu rol no puede invitar con ese permiso'
      using errcode = 'insufficient_privilege';
  end if;

  if p_dias_validez < 1 or p_dias_validez > 30 then
    raise exception 'La validez debe estar entre 1 y 30 días'
      using errcode = 'check_violation';
  end if;

  -- 32 bytes de aleatoriedad criptográfica: no se adivina por fuerza bruta.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
  values (
    v_tenant,
    v_email,
    p_rol,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(),
    now() + make_interval(days => p_dias_validez)
  );

  return v_token;
end;
$$;

comment on function public.crear_invitacion is
  'Crea una invitación y devuelve el token en claro UNA sola vez. La tabla guarda el hash.';

-- ---------------------------------------------------------------------------
-- Aceptar invitación
-- ---------------------------------------------------------------------------

create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_inv    public.invitations;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para aceptar la invitación'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_inv
  from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Un solo mensaje para "no existe", "caducada" y "ya usada": distinguirlos
  -- permitiría sondear qué tokens son válidos.
  if v_inv.id is null
     or v_inv.accepted_at is not null
     or v_inv.revoked_at is not null
     or v_inv.expires_at < now() then
    raise exception 'La invitación no es válida o ya caducó'
      using errcode = 'invalid_parameter_value';
  end if;

  select lower(email) into v_email from public.users where id = auth.uid();

  -- El correo debe coincidir. Sin esto, reenviar el enlace a un tercero le
  -- daría acceso al gimnasio.
  if v_email is distinct from v_inv.email then
    raise exception 'Esta invitación es para otro correo'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.memberships (user_id, tenant_id, role, created_by)
  values (auth.uid(), v_inv.tenant_id, v_inv.role, v_inv.invited_by)
  on conflict (user_id, tenant_id) do nothing;

  update public.invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv.id;

  return v_inv.tenant_id;
end;
$$;

comment on function public.aceptar_invitacion is
  'Canjea un token por una membresía. Exige que el correo de la cuenta coincida.';

-- ---------------------------------------------------------------------------
-- Consultar una invitación antes de aceptarla
-- ---------------------------------------------------------------------------
--
-- Para poder decirle al invitado "te invitan al Gimnasio X como entrenador"
-- antes de que se registre. Devuelve lo mínimo: nada de quién más está dentro.

create or replace function public.ver_invitacion(p_token text)
returns table (nombre_tenant text, rol public.user_role, correo text, valida boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    t.name,
    i.role,
    i.email,
    (i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
  from public.invitations i
  join public.tenants t on t.id = i.tenant_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
--
-- `ver_invitacion` es la única accesible sin sesión: el invitado tiene que poder
-- leer a qué le invitan antes de crear su cuenta. Devuelve solo el nombre del
-- gimnasio, el rol y el correo destinatario, y exige conocer el token.

revoke execute on function public.crear_invitacion(text, public.user_role, integer) from public, anon;
revoke execute on function public.aceptar_invitacion(text) from public, anon;
revoke execute on function public.ver_invitacion(text) from public;

grant execute on function public.crear_invitacion(text, public.user_role, integer) to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;
grant execute on function public.ver_invitacion(text) to anon, authenticated;

-- La tabla se lee para el listado de pendientes y se actualiza para revocar.
-- Crear pasa por la función, nunca por un INSERT directo: así el token siempre
-- se genera en la base y nunca lo elige el cliente.
grant select on public.invitations to authenticated;
grant update (revoked_at) on public.invitations to authenticated;

alter table public.invitations enable row level security;

create policy invitaciones_lectura on public.invitations
  for select to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or (public.mi_rol() in ('gym', 'trainer') and tenant_id = public.mi_tenant())
  );

create policy invitaciones_revocar on public.invitations
  for update to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or (public.mi_rol() = 'gym' and tenant_id = public.mi_tenant())
    or (public.mi_rol() = 'trainer' and tenant_id = public.mi_tenant() and invited_by = auth.uid())
  )
  with check (
    public.mi_rol() = 'super_admin'
    or (public.mi_rol() = 'gym' and tenant_id = public.mi_tenant())
    or (public.mi_rol() = 'trainer' and tenant_id = public.mi_tenant() and invited_by = auth.uid())
  );
