-- 1.1 — Atletas, consentimientos y lesiones.
-- Ver docs/MODELO-DATOS.md §1.3 y §6.

-- ---------------------------------------------------------------------------
-- athletes
-- ---------------------------------------------------------------------------

create table public.athletes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete restrict,
  trainer_id     uuid not null references public.users (id)   on delete restrict,

  full_name      text not null check (length(btrim(full_name)) > 0),

  -- Fecha, no edad: la edad cambia sola y un número guardado queda mintiendo.
  birth_date     date not null check (birth_date > '1900-01-01' and birth_date < current_date),

  -- text + check y no enum: las fórmulas antropométricas distinguen sexo, pero
  -- si Giovanni necesita otras categorías, un check se altera y un enum no.
  sex            text not null check (sex in ('masculino', 'femenino')),

  activity_level text,

  -- Objetivos jerarquizados (tarea 2.2). El orden del array es la prioridad.
  goals          jsonb not null default '[]'::jsonb check (jsonb_typeof(goals) = 'array'),

  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.users (id),
  archived_at    timestamptz
);

comment on table public.athletes is
  'Atleta evaluado. Talla y peso NO viven aquí: son mediciones versionadas (migración 3).';

create index athletes_tenant_id_idx  on public.athletes (tenant_id);
create index athletes_trainer_id_idx on public.athletes (trainer_id);

create trigger athletes_set_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Propagación de tenant_id
-- ---------------------------------------------------------------------------
--
-- Las tablas que cuelgan de athletes podrían deducir su tenant con un JOIN,
-- pero entonces su política de RLS sería distinta a la de las demás y se
-- pierde justo lo que buscamos: que todas se lean igual (MODELO-DATOS.md §3).
-- La columna se duplica a propósito y este trigger impide que se desincronice:
-- el valor que mande el cliente se ignora y se reemplaza por el del atleta.

create or replace function public.heredar_tenant_del_atleta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.athletes where id = new.athlete_id;

  if v_tenant is null then
    raise exception 'El atleta % no existe', new.athlete_id
      using errcode = 'foreign_key_violation';
  end if;

  new.tenant_id := v_tenant;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- athlete_consents — Ley 1581 de 2012
-- ---------------------------------------------------------------------------
--
-- Tabla propia y no una columna athletes.consent_at, porque hay que poder
-- demostrar QUÉ versión de la política se aceptó y registrar revocaciones.
-- Una fecha suelta no es consentimiento demostrable (CLAUDE.md §3.7).

create table public.athlete_consents (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athletes (id) on delete cascade,
  tenant_id      uuid not null references public.tenants (id)  on delete restrict,

  policy_version text not null,
  granted_at     timestamptz not null default now(),
  granted_by     uuid not null references public.users (id),
  revoked_at     timestamptz,

  -- Cómo se recogió: en persona, formulario firmado, etc.
  method         text,

  created_at     timestamptz not null default now(),

  constraint consents_revocacion_posterior check (
    revoked_at is null or revoked_at >= granted_at
  )
);

comment on table public.athlete_consents is
  'Consentimiento informado por versión de política. Nunca se borra ni se edita: se revoca.';

create index athlete_consents_athlete_id_idx on public.athlete_consents (athlete_id);

-- Un solo consentimiento vigente por atleta y versión de política.
create unique index athlete_consents_vigente_unico
  on public.athlete_consents (athlete_id, policy_version)
  where revoked_at is null;

create trigger athlete_consents_hereda_tenant
  before insert or update on public.athlete_consents
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- athlete_injuries
-- ---------------------------------------------------------------------------
--
-- Tabla y no jsonb: el motor de reglas tiene que cruzar lesiones contra las
-- contraindicaciones de cada ejercicio, así que hay que poder consultarlas.

create table public.athlete_injuries (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id)  on delete restrict,

  -- Vocabulario provisional. La lista definitiva de regiones corporales sale
  -- de Giovanni (MODELO-DATOS.md §7).
  body_region text not null,
  description text,
  occurred_on date,
  status      text not null default 'activa'
              check (status in ('activa', 'recuperada', 'cronica')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.users (id)
);

create index athlete_injuries_athlete_id_idx on public.athlete_injuries (athlete_id);

create trigger athlete_injuries_set_updated_at
  before update on public.athlete_injuries
  for each row execute function public.set_updated_at();

create trigger athlete_injuries_hereda_tenant
  before insert or update on public.athlete_injuries
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- Permisos de tabla
-- ---------------------------------------------------------------------------
-- Ver la nota de la migración anterior. Nada para `anon`.

grant select, insert, update, delete on public.athletes         to authenticated;
grant select, insert, update, delete on public.athlete_consents to authenticated;
grant select, insert, update, delete on public.athlete_injuries to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Regla base idéntica en las tres tablas: tenant_id = mi_tenant().
--
-- Sobre esa base, el entrenador ve SOLO sus atletas. Es la opción conservadora
-- mientras Giovanni responde si un entrenador debe ver los de sus colegas del
-- mismo gimnasio (MODELO-DATOS.md §7, punto 6). Ampliar el acceso después es
-- editar una política; haberlo abierto de más y descubrirlo luego es un
-- incidente con datos clínicos.

alter table public.athletes         enable row level security;
alter table public.athlete_consents enable row level security;
alter table public.athlete_injuries enable row level security;

create policy athletes_aislamiento on public.athletes
  for all to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or (
      tenant_id = public.mi_tenant()
      and (public.mi_rol() <> 'trainer' or trainer_id = auth.uid())
    )
  )
  with check (
    public.mi_rol() = 'super_admin'
    or (
      tenant_id = public.mi_tenant()
      and (public.mi_rol() <> 'trainer' or trainer_id = auth.uid())
    )
  );

-- Las hijas heredan la visibilidad del atleta: si no lo ves, no ves sus datos.
create policy consents_aislamiento on public.athlete_consents
  for all to authenticated
  using (
    exists (select 1 from public.athletes a where a.id = athlete_id)
  )
  with check (
    exists (select 1 from public.athletes a where a.id = athlete_id)
  );

create policy injuries_aislamiento on public.athlete_injuries
  for all to authenticated
  using (
    exists (select 1 from public.athletes a where a.id = athlete_id)
  )
  with check (
    exists (select 1 from public.athletes a where a.id = athlete_id)
  );
