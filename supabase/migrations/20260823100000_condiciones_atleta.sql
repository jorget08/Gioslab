-- Condiciones sistémicas del atleta — cierra el cruce de contraindicaciones.
--
-- Desde la migración anterior un ejercicio puede marcarse como contraindicado
-- para embarazo o hipertensión, pero NO había dónde registrar que una atleta
-- está embarazada. El motor tenía media tijera: sabía qué contraindica cada
-- ejercicio y no sabía qué tiene cada persona.
--
-- ---------------------------------------------------------------------------
-- POR QUÉ UNA TABLA APARTE Y NO DENTRO DE athlete_injuries
-- ---------------------------------------------------------------------------
--
-- Se evaluó reutilizarla. Se descartó por dos motivos:
--
--  1. Su columna se llama `body_region` y es NOT NULL. El embarazo no es una
--     región del cuerpo. Guardarlo ahí obligaría a que la columna mintiera o a
--     hacerla nullable con un CHECK de "una u otra", que es peor.
--  2. Se capturan distinto. Una lesión se añade de una en una con su zona, su
--     descripción y su estado; las condiciones son cuatro casillas que se
--     marcan o se desmarcan. Meterlas en el mismo formulario las confundiría.
--
-- El motor las une al consultar, que es una línea, y a cambio cada tabla dice
-- la verdad sobre lo que guarda.

create table public.athlete_conditions (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id)  on delete restrict,

  -- Mismo catálogo cerrado que usa exercise_library.contraindications. Esa
  -- identidad es lo que convierte el cruce en una comparación exacta.
  condition  text not null
             check (jsonb_exists(public.condiciones_sistemicas(), condition)),

  -- El embarazo empieza y termina; la hipertensión no. En vez de inventar un
  -- ciclo de estados, se marca si aplica AHORA. La fila se conserva aunque deje
  -- de aplicar: es historial, y §3.5 dice que el historial no se borra.
  is_active  boolean not null default true,

  notes      text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id),

  -- Una fila por condición y atleta. Sin esto, marcar y desmarcar dos veces
  -- dejaría filas duplicadas y el motor no sabría cuál mirar.
  unique (athlete_id, condition)
);

comment on table public.athlete_conditions is
  'Condiciones fisiológicas del atleta (embarazo, hipertensión…). El motor las cruza contra exercise_library.contraindications: filtran el ejercicio Y ajustan su ejecución.';

create index athlete_conditions_athlete_idx
  on public.athlete_conditions (athlete_id) where is_active;

create trigger athlete_conditions_set_updated_at
  before update on public.athlete_conditions
  for each row execute function public.set_updated_at();

create trigger athlete_conditions_hereda_tenant
  before insert or update on public.athlete_conditions
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------
--
-- Se concede UPDATE solo sobre lo que cambia con el tiempo. `condition` y
-- `athlete_id` no se editan: cambiarlos convertiría el registro de una persona
-- en el de otra condición o de otro atleta sin dejar rastro.

grant select, insert on public.athlete_conditions to authenticated;
grant update (is_active, notes) on public.athlete_conditions to authenticated;

alter table public.athlete_conditions enable row level security;

-- Misma forma que athlete_injuries: si el atleta se ve, su condición se ve. La
-- visibilidad del atleta ya la resuelve su propia política, así que no se
-- repite aquí la regla de tenant y quedan las dos imposibles de desincronizar.
create policy conditions_aislamiento on public.athlete_conditions
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));
