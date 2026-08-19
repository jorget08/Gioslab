-- 1.3 (migración 6) — Salida del motor y planes de entrenamiento.

-- ---------------------------------------------------------------------------
-- engine_runs — la salida del motor, congelada
-- ---------------------------------------------------------------------------
--
-- CLAUDE.md §3.6 exige mostrar QUÉ REGLA APLICÓ Y POR QUÉ. Si eso se recalcula
-- al vuelo, un plan generado en marzo mostraría la justificación de las reglas
-- vigentes en agosto, que para entonces pueden ser otras.
--
-- Esta tabla guarda las reglas que dispararon y la salida producida, tal como
-- estaban en el momento de generar el plan. Es inmutable: solo INSERT y SELECT.

create table public.engine_runs (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id)  on delete restrict,

  -- Entradas que se usaron. Se guardan por id para poder reconstruir el caso.
  evaluation_id  uuid references public.biomech_evaluations (id) on delete set null,
  measurement_id uuid references public.anthropometric_measurements (id) on delete set null,

  -- Reglas que dispararon, con su justificación copiada. NO es una lista de
  -- ids: si mañana se desactiva una regla, esta fila debe seguir explicando
  -- lo que el entrenador vio ese día.
  rules_fired   jsonb not null default '[]'::jsonb
                check (jsonb_typeof(rules_fired) = 'array'),

  -- Ejercicios seleccionados y excluidos, con el motivo de cada decisión.
  output        jsonb not null default '{}'::jsonb
                check (jsonb_typeof(output) = 'object'),

  created_at    timestamptz not null default now(),
  created_by    uuid references public.users (id)
);

comment on table public.engine_runs is
  'Salida del motor congelada en el momento de generar el plan. Inmutable.';

create index engine_runs_athlete_idx on public.engine_runs (athlete_id, created_at desc);

create trigger engine_runs_hereda_tenant
  before insert or update on public.engine_runs
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- workout_plans
-- ---------------------------------------------------------------------------
--
-- A diferencia de las mediciones y del engine_run, el plan SÍ se edita: el
-- entrenador siempre decide y puede sobreescribir la propuesta del motor
-- (CLAUDE.md §3.6, "el sistema es un copiloto"). Por eso lleva GRANT completo.

create table public.workout_plans (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id)  on delete restrict,
  athlete_id         uuid not null references public.athletes (id) on delete cascade,
  trainer_id         uuid not null references public.users (id)    on delete restrict,

  -- El plan conserva la justificación con la que nació, aunque después se edite.
  engine_run_id      uuid references public.engine_runs (id) on delete set null,

  title              text,

  -- PENDIENTE DE GIOVANNI: el catálogo de periodizaciones que usa su método.
  periodization_type text,
  duration_weeks     integer check (duration_weeks between 1 and 104),

  -- Mesociclo, ejercicios, series, RIR y notas. La forma se fija en Fase B,
  -- cuando exista el generador de rutinas.
  plan_data          jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(plan_data) = 'object'),

  status             text not null default 'borrador'
                     check (status in ('borrador', 'activo', 'finalizado', 'archivado')),

  generated_pdf_url  text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.users (id)
);

create index workout_plans_athlete_idx on public.workout_plans (athlete_id, created_at desc);
create index workout_plans_tenant_idx  on public.workout_plans (tenant_id);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

create trigger workout_plans_hereda_tenant
  before insert or update on public.workout_plans
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------

grant select, insert on public.engine_runs to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;

alter table public.engine_runs    enable row level security;
alter table public.workout_plans  enable row level security;

-- Ambas heredan la visibilidad del atleta: si no lo ves, no ves su plan.
create policy engine_runs_aislamiento on public.engine_runs
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));

create policy workout_plans_aislamiento on public.workout_plans
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));
