-- 1.3 (migración 5) — Reglas del motor y su registro de cambios.
--
-- ESTA TABLA ES EL ACTIVO CENTRAL DEL NEGOCIO (CLAUDE.md §3.1).
-- Las reglas son DATOS, no código: viven aquí como JSON versionado, con su
-- justificación y su nivel de evidencia, y Giovanni las edita desde una
-- interfaz (tarea 3.5) sin tocar TypeScript ni pedir un despliegue.

create table public.rules (
  id             uuid primary key default gen_random_uuid(),

  -- Identidad estable de la regla a lo largo de sus versiones.
  -- Ej: 'femur-largo-dorsiflexion-limitada'
  rule_key       text not null check (length(btrim(rule_key)) > 0),
  version        integer not null check (version > 0),

  -- Condición evaluada contra el perfil del atleta, y acciones resultantes
  -- (priorizar / despriorizar / excluir ejercicios). La forma la fija la
  -- tarea 3.1 a partir de los Excels; aquí solo se exige que sean objetos.
  condition      jsonb not null check (jsonb_typeof(condition) = 'object'),
  actions        jsonb not null check (jsonb_typeof(actions)   = 'object'),

  -- Obligatoria: una regla sin justificación no se puede mostrar al entrenador,
  -- y la transparencia es lo que genera confianza profesional (§3.6).
  justification  text not null check (length(btrim(justification)) > 0),

  -- PENDIENTE DE GIOVANNI (MODELO-DATOS.md §7, punto 4): los valores válidos y
  -- su orden. El ejemplo del CLAUDE.md usa 'criterio_profesional'.
  evidence_level text not null,

  is_active      boolean not null default false,

  created_at     timestamptz not null default now(),
  created_by     uuid references public.users (id),

  unique (rule_key, version)
);

comment on table public.rules is
  'Reglas biomecánicas versionadas. Una fila es inmutable: editar = insertar version+1.';

-- Una sola versión activa por regla. Sin esto, el motor podría aplicar dos
-- versiones contradictorias de la misma regla en la misma evaluación.
create unique index rules_una_activa_por_key
  on public.rules (rule_key) where is_active;

create index rules_activas_idx on public.rules (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- rule_activations — quién activó o desactivó qué, y cuándo (tarea 3.6)
-- ---------------------------------------------------------------------------

create table public.rule_activations (
  id         uuid primary key default gen_random_uuid(),
  rule_id    uuid not null references public.rules (id) on delete cascade,
  action     text not null check (action in ('activada', 'desactivada')),
  actor_id   uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index rule_activations_rule_idx on public.rule_activations (rule_id, created_at desc);

-- El registro lo escribe un trigger, no la aplicación. Si dependiera de que el
-- código se acuerde de insertar la fila, el día que alguien active una regla
-- desde el SQL editor el historial quedaría con un hueco silencioso.
create or replace function public.registrar_activacion_de_regla()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active is distinct from old.is_active then
    insert into public.rule_activations (rule_id, action, actor_id)
    values (new.id,
            case when new.is_active then 'activada' else 'desactivada' end,
            auth.uid());
  end if;
  return new;
end;
$$;

create trigger rules_registra_activacion
  after update on public.rules
  for each row execute function public.registrar_activacion_de_regla();

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------
--
-- Mismo patrón que las mediciones de la 1.2: la regla es inmutable, y eso se
-- impone con GRANT a nivel de columna. Se puede INSERTAR una versión nueva y
-- cambiar `is_active`, pero NO reescribir la condición, las acciones ni la
-- justificación de una versión ya publicada.
--
-- Importa porque un plan generado en marzo apunta a la regla que lo justificó.
-- Si esa fila fuera editable, la justificación que ve el entrenador cambiaría
-- retroactivamente y la trazabilidad del producto sería ficticia.

grant select, insert on public.rules to authenticated;
grant update (is_active) on public.rules to authenticated;
grant select on public.rule_activations to authenticated;

alter table public.rules            enable row level security;
alter table public.rule_activations enable row level security;

-- Todos leen las reglas: el entrenador tiene que poder ver qué se le aplicó
-- a su atleta y por qué.
create policy rules_lectura_global on public.rules
  for select to authenticated using (true);

create policy rules_inserta_admin on public.rules
  for insert to authenticated
  with check (public.mi_rol() = 'super_admin');

create policy rules_activa_admin on public.rules
  for update to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

create policy activations_lectura_global on public.rule_activations
  for select to authenticated using (true);
