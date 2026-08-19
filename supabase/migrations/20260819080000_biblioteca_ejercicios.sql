-- 1.3 (migración 4) — Biblioteca de ejercicios.
--
-- Tabla GLOBAL: sin tenant_id. La cura super_admin (Giovanni) y todos los
-- tenants la leen. La metodología GQ es el producto que se vende; si cada
-- gimnasio la edita, el motor de reglas deja de ser confiable
-- (MODELO-DATOS.md §1.2).

create table public.exercise_library (
  id                 uuid primary key default gen_random_uuid(),

  name               text not null unique check (length(btrim(name)) > 0),
  description        text,

  -- PENDIENTE DE GIOVANNI (MODELO-DATOS.md §7, puntos 3 y 5): el catálogo
  -- cerrado de patrones de movimiento y de tipos biomecánicos. Hasta que exista,
  -- text libre; se convierten en enum en la 3.3.
  target_muscle      text,
  movement_pattern   text,
  biomechanical_type text,
  equipment          text,

  -- El motor cruza esto contra athlete_injuries. La forma exacta la define
  -- Giovanni junto con la matriz de reglas (tarea 0.5).
  contraindications  jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(contraindications) = 'array'),

  -- Fotos y video del ejercicio (tarea 4.2, Supabase Storage).
  media_urls         jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(media_urls) = 'array'),

  is_active          boolean not null default true,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.users (id)
);

comment on table public.exercise_library is
  'Biblioteca global de ejercicios. Sin tenant_id: la cura super_admin, la leen todos.';

create index exercise_library_patron_idx on public.exercise_library (movement_pattern);
create index exercise_library_musculo_idx on public.exercise_library (target_muscle);

create trigger exercise_library_set_updated_at
  before update on public.exercise_library
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exercise_variants — relaciones entre ejercicios
-- ---------------------------------------------------------------------------
--
-- El motor las usa para proponer alternativas cuando excluye un ejercicio
-- (tarea 4.3).

create table public.exercise_variants (
  exercise_id         uuid not null references public.exercise_library (id) on delete cascade,
  variant_exercise_id uuid not null references public.exercise_library (id) on delete cascade,

  -- PENDIENTE DE GIOVANNI: el vocabulario de relaciones (¿variante,
  -- sustitución, progresión, regresión?). text libre por ahora.
  relation_type       text not null,

  notes               text,
  created_at          timestamptz not null default now(),
  created_by          uuid references public.users (id),

  primary key (exercise_id, variant_exercise_id, relation_type),

  -- Un ejercicio no es variante de sí mismo.
  constraint variants_sin_autorreferencia check (exercise_id <> variant_exercise_id)
);

create index exercise_variants_inverso_idx
  on public.exercise_variants (variant_exercise_id);

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------
--
-- El DML se concede a `authenticated` porque super_admin también entra por
-- PostgREST con ese rol; quien restringe la escritura a super_admin es la
-- política de RLS, no el GRANT.

grant select, insert, update, delete on public.exercise_library  to authenticated;
grant select, insert, update, delete on public.exercise_variants to authenticated;

alter table public.exercise_library  enable row level security;
alter table public.exercise_variants enable row level security;

-- Todo usuario con sesión lee la biblioteca completa: es el catálogo común.
create policy exercises_lectura_global on public.exercise_library
  for select to authenticated using (true);

create policy exercises_escribe_admin on public.exercise_library
  for all to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

create policy variants_lectura_global on public.exercise_variants
  for select to authenticated using (true);

create policy variants_escribe_admin on public.exercise_variants
  for all to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');
