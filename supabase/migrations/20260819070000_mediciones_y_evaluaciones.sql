-- 1.2 — Mediciones antropométricas y evaluaciones biomecánicas.
--
-- Ambas son HISTORIAL: cada toma es una fila nueva y ninguna se pisa
-- (CLAUDE.md §3.5). Eso no se deja a la disciplina del código; se impone abajo,
-- en la sección de permisos.

-- ---------------------------------------------------------------------------
-- anthropometric_measurements
-- ---------------------------------------------------------------------------
--
-- Las columnas nombradas son exactamente las que exige el protocolo
-- Heath-Carter: 4 pliegues, 2 diámetros óseos, 2 perímetros, talla y peso.
-- Es un método publicado, no criterio inventado. Lo que Giovanni mida de más
-- entra en `extra_measures` sin necesidad de migración.

create table public.anthropometric_measurements (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id)  on delete restrict,

  measured_at timestamptz not null default now(),
  measured_by uuid references public.users (id),

  -- Los rangos de abajo son anti-error de digitación, no criterios clínicos:
  -- atrapan un 1750 donde iba 175 al llenar el formulario de pie en el gimnasio.
  height_cm   numeric(5,1) check (height_cm between 100 and 260),
  weight_kg   numeric(5,1) check (weight_kg between 20 and 400),

  -- Pliegues cutáneos (mm)
  triceps_mm         numeric(4,1) check (triceps_mm         between 1 and 100),
  subscapular_mm     numeric(4,1) check (subscapular_mm     between 1 and 100),
  supraspinale_mm    numeric(4,1) check (supraspinale_mm    between 1 and 100),
  medial_calf_mm     numeric(4,1) check (medial_calf_mm     between 1 and 100),

  -- Diámetros óseos (cm)
  humerus_breadth_cm numeric(4,1) check (humerus_breadth_cm between 3 and 12),
  femur_breadth_cm   numeric(4,1) check (femur_breadth_cm   between 5 and 15),

  -- Perímetros (cm)
  arm_flexed_cm      numeric(4,1) check (arm_flexed_cm      between 15 and 70),
  calf_cm            numeric(4,1) check (calf_cm            between 20 and 70),

  -- Resultado del cálculo (tarea 2.6). Se guarda el valor calculado en su
  -- momento: si la fórmula se corrige después, el historial no se reescribe solo.
  somatotype_endo numeric(3,1) check (somatotype_endo between 0 and 20),
  somatotype_meso numeric(3,1) check (somatotype_meso between 0 and 20),
  somatotype_ecto numeric(3,1) check (somatotype_ecto between 0 and 20),

  -- Mediciones adicionales del Excel de Giovanni que no exige Heath-Carter.
  extra_measures jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(extra_measures) = 'object'),

  notes       text,

  -- Anulación auditada. Ver la nota de permisos más abajo.
  voided_at     timestamptz,
  voided_by     uuid references public.users (id),
  voided_reason text,

  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),

  constraint anthro_anulacion_con_motivo check (
    (voided_at is null and voided_reason is null)
    or (voided_at is not null and length(btrim(coalesce(voided_reason,''))) > 0)
  )
);

comment on table public.anthropometric_measurements is
  'Historial antropométrico. Una fila por toma. Nunca se edita: se anula con motivo.';

-- La consulta más frecuente es "la última medición de este atleta".
create index anthro_athlete_fecha_idx
  on public.anthropometric_measurements (athlete_id, measured_at desc);

create trigger anthro_hereda_tenant
  before insert or update on public.anthropometric_measurements
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- biomech_evaluations
-- ---------------------------------------------------------------------------
--
-- OJO: las columnas de clasificación son `text` LIBRE a propósito, sin CHECK.
-- Cuatro de los seis puntos pendientes de Giovanni (MODELO-DATOS.md §7) caen
-- justo aquí: los umbrales de fémur Largo/Medio/Corto, la escala de
-- dorsiflexión, el catálogo de patrones y la forma de pattern_classifications.
-- Poner un CHECK ahora sería inventar dominio. Se convierten en enum cuando él
-- responda en la sesión de la 0.5.

create table public.biomech_evaluations (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athletes (id) on delete cascade,
  tenant_id    uuid not null references public.tenants (id)  on delete restrict,

  evaluated_at timestamptz not null default now(),
  evaluated_by uuid references public.users (id),

  -- Medidas de segmentos óseos (cm). Alimentan los ratios de palanca (2.4).
  femur_length_cm   numeric(4,1) check (femur_length_cm   between 20 and 70),
  humerus_length_cm numeric(4,1) check (humerus_length_cm between 15 and 50),
  torso_length_cm   numeric(4,1) check (torso_length_cm   between 30 and 90),

  -- Clasificación derivada de las medidas. PENDIENTE DE GIOVANNI: no sabemos si
  -- el umbral es un valor absoluto o un ratio contra la talla o el torso.
  femur_class        text,

  -- PENDIENTE DE GIOVANNI: ¿categórica, grados, o cm del test de pared?
  ankle_dorsiflexion text,
  hip_mobility       text,
  shoulder_mobility  text,

  -- Eficiente / Compensada / De Riesgo por patrón. PENDIENTE DE GIOVANNI: no
  -- está definido qué patrones se evalúan ni si llevan nota además de categoría.
  pattern_classifications jsonb not null default '{}'::jsonb
                          check (jsonb_typeof(pattern_classifications) = 'object'),

  notes        text,

  voided_at     timestamptz,
  voided_by     uuid references public.users (id),
  voided_reason text,

  created_at   timestamptz not null default now(),
  created_by   uuid references public.users (id),

  constraint biomech_anulacion_con_motivo check (
    (voided_at is null and voided_reason is null)
    or (voided_at is not null and length(btrim(coalesce(voided_reason,''))) > 0)
  )
);

comment on table public.biomech_evaluations is
  'Historial biomecánico. Las columnas de clasificación son text libre hasta que Giovanni defina las escalas (MODELO-DATOS.md §7).';

create index biomech_athlete_fecha_idx
  on public.biomech_evaluations (athlete_id, evaluated_at desc);

create trigger biomech_hereda_tenant
  before insert or update on public.biomech_evaluations
  for each row execute function public.heredar_tenant_del_atleta();

-- ---------------------------------------------------------------------------
-- Permisos: aquí es donde "nunca se sobreescribe" deja de ser una promesa
-- ---------------------------------------------------------------------------
--
-- No se concede UPDATE sobre las columnas de datos, ni DELETE. Un entrenador
-- puede INSERTAR una toma nueva y LEER el historial, y nada más. El valor del
-- producto está en mostrar la evolución del atleta; una medición editable
-- destruye justamente eso.
--
-- Pero los errores de digitación existen y una tabla sin salida es peor. Por eso
-- se concede UPDATE **solo sobre las tres columnas de anulación**: la fila
-- errónea se marca como anulada, con autor y motivo, y sigue en el historial.
-- Es el patrón de una historia clínica: no se borra, se enmienda dejando rastro.
--
-- GRANT a nivel de columna es lo que hace que esto sea imposible de saltar desde
-- la aplicación, en vez de una convención que alguien romperá dentro de un año.

grant select, insert on public.anthropometric_measurements to authenticated;
grant select, insert on public.biomech_evaluations         to authenticated;

grant update (voided_at, voided_by, voided_reason)
  on public.anthropometric_measurements to authenticated;
grant update (voided_at, voided_by, voided_reason)
  on public.biomech_evaluations to authenticated;

-- A anon, nada. Ver 20260819060000_revocar_anon.sql.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Heredan la visibilidad del atleta: si no lo ves, no ves sus mediciones.
-- Como la política de athletes ya filtra por tenant y por entrenador, este
-- EXISTS aplica ambas reglas sin repetirlas.

alter table public.anthropometric_measurements enable row level security;
alter table public.biomech_evaluations         enable row level security;

create policy anthro_aislamiento on public.anthropometric_measurements
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));

create policy biomech_aislamiento on public.biomech_evaluations
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));
