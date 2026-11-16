-- ===========================================================================
-- Cadencia por defecto y carga axial de cada ejercicio (4.1, 16-nov)
-- ===========================================================================
--
-- Su matriz de 125 trae la cadencia de cada ejercicio ("Cadencia Defecto") y
-- su documento de requerimientos pide un `demanda_axial`: "si es true, bloquea
-- la selección de otro J1 axial en el mismo día". Las dos son dato suyo y él
-- las edita en la ficha. Sin cadencia propia, el generador usa la de su
-- jerarquía (método v7).

alter table public.exercise_library
  add column if not exists default_cadence text check (default_cadence ~ '^[0-9X]{4}$'),
  add column if not exists axial_load boolean not null default false;

comment on column public.exercise_library.default_cadence is
  'Cadencia por defecto (bajada, pausa abajo, subida, pausa arriba; X = explosiva). NULL = la de su jerarquía.';
comment on column public.exercise_library.axial_load is
  'Carga axial pesada. Dos J1 axiales no van en la misma sesión (16-nov).';
