-- 1.2b — Alinear la antropometría con el método real de Giovanni.
--
-- ===========================================================================
-- POR QUÉ
-- ===========================================================================
--
-- La migración 20260819070000 se escribió sobre el protocolo Heath-Carter,
-- siguiendo CLAUDE.md §3.4 y la tarea 2.6. Al recibir los Excels resultó que
-- Giovanni NO calcula somatotipo: usa Jackson & Pollock de 7 pliegues para la
-- densidad corporal y la ecuación de Siri para el porcentaje graso.
--
-- CLAUDE.md §3.4 es explícito: si el resultado no coincide con su Excel, el
-- Excel tiene la razón. Así que se retiran los campos de Heath-Carter que no
-- usa y se añaden los suyos.
--
-- Fuente: fuentes-giovanni/Ficha_1.1jorgehernan...xlsx  (NO el "flujograma
-- completo", cuyas fórmulas están rotas — ver docs/ESPECIFICACION-FICHAS.md §5).
--
-- Se puede hacer sin migrar datos porque todavía no hay ninguna medición real
-- cargada. Después del piloto esto costaría mover historiales clínicos.

-- ---------------------------------------------------------------------------
-- A. Fuera lo que no usa (Heath-Carter)
-- ---------------------------------------------------------------------------

alter table public.anthropometric_measurements
  drop column humerus_breadth_cm,   -- diámetro óseo, solo Heath-Carter
  drop column femur_breadth_cm,     -- idem
  drop column arm_flexed_cm,        -- perímetro de brazo flexionado, idem
  drop column calf_cm,              -- perímetro de pantorrilla, idem
  drop column somatotype_endo,
  drop column somatotype_meso,
  drop column somatotype_ecto;

-- El pliegue suprailíaco se llamaba `supraspinale` por el vocabulario
-- Heath-Carter; su ficha lo nombra "Supraespinal / Suprailíaco".
alter table public.anthropometric_measurements
  rename column supraspinale_mm to suprailiac_mm;

-- Era el pliegue de pantorrilla; ahora no hay perímetro homónimo del que
-- distinguirlo.
alter table public.anthropometric_measurements
  rename column medial_calf_mm to calf_mm;

-- ---------------------------------------------------------------------------
-- B. Los pliegues y perímetros que sí usa
-- ---------------------------------------------------------------------------
-- Protocolo ISAK. Rangos anti-digitación, no clínicos.

alter table public.anthropometric_measurements
  add column abdominal_mm numeric(4,1) check (abdominal_mm between 1 and 100),
  add column thigh_mm     numeric(4,1) check (thigh_mm     between 1 and 100),
  add column chest_mm     numeric(4,1) check (chest_mm     between 1 and 100),
  add column waist_cm     numeric(5,1) check (waist_cm between 40 and 200),
  add column hip_cm       numeric(5,1) check (hip_cm   between 40 and 200);

comment on column public.anthropometric_measurements.chest_mm is
  'Pliegue pectoral. Relevante sobre todo en hombres, pero entra en la suma de 7.';

-- ---------------------------------------------------------------------------
-- C. Valores calculados
-- ---------------------------------------------------------------------------
--
-- Se guardan, no se recalculan al vuelo: si mañana se corrige una fórmula, el
-- historial del atleta no debe reescribirse solo (§3.5). El cálculo vive en
-- src/domain/calculations con tests contra este mismo Excel.

alter table public.anthropometric_measurements
  add column bmi              numeric(4,1) check (bmi between 8 and 90),
  add column waist_hip_ratio  numeric(4,3) check (waist_hip_ratio between 0.3 and 2),
  add column sum_6_skinfolds_mm numeric(5,1),
  add column sum_7_skinfolds_mm numeric(5,1),
  add column body_density     numeric(6,5) check (body_density between 0.9 and 1.2),
  add column body_fat_pct     numeric(4,1) check (body_fat_pct between 1 and 70),
  add column fat_mass_kg      numeric(5,1) check (fat_mass_kg between 0 and 300),
  add column lean_mass_kg     numeric(5,1) check (lean_mass_kg between 5 and 300),

  -- Su ficha marca el % graso como "Calculado / Override": permite escribirlo a
  -- mano cuando viene de una báscula de bioimpedancia o un DEXA. Hay que saber
  -- cuál es cuál, o un valor medido y uno estimado acaban comparándose entre sí.
  add column body_fat_pct_source text not null default 'calculado'
    check (body_fat_pct_source in ('calculado', 'manual'));

comment on column public.anthropometric_measurements.body_density is
  'Jackson & Pollock 7 pliegues, distinta por sexo y edad. Ver ESPECIFICACION-FICHAS.md §3.';
comment on column public.anthropometric_measurements.body_fat_pct is
  'Ecuación de Siri sobre la densidad, o valor manual. Ver body_fat_pct_source.';

-- ---------------------------------------------------------------------------
-- D. Biomecánica: las clasificaciones que sí registra
-- ---------------------------------------------------------------------------
--
-- Sus fichas usan desplegables, no medidas con umbral. Se conservan las
-- columnas numéricas de longitud (nullable, hoy sin uso) porque la tarea 2.4
-- habla de ratios de palanca calculados; esa contradicción está anotada como
-- pregunta abierta.
--
-- Siguen siendo `text` libre: dos de sus archivos usan vocabularios distintos
-- para lo mismo y la taxonomía Eficiente/Compensada/De Riesgo del CLAUDE.md no
-- aparece en ninguno. Fijar un CHECK ahora sería elegir por él.

alter table public.biomech_evaluations
  add column torso_class            text,  -- [Corto, Promedio, Largo]
  add column shoulder_overhead      text,  -- [Apto OverHead, Limitado / Inclinado]
  add column hip_internal_rotation  text,
  add column thoracic_extension     text,
  -- Perfil biomecánico de su Ficha_Biomecanica_PATRONES
  add column squat_dominance        text,  -- p.ej. 'Dominante de Rodilla' → Cuádriceps
  add column femur_torso_ratio      text,  -- p.ej. 'Fémur Largo / Torso Corto'
  add column axial_load_tolerance   text,  -- p.ej. 'Sensibilidad Lumbar'
  add column glute_vector           text,  -- p.ej. 'Vector Horizontal'
  add column back_dominance         text;  -- p.ej. 'Vector Vertical (Dorsal)'

comment on column public.biomech_evaluations.femur_class is
  'Opciones de su ficha: [Corto, Promedio, Largo]. Se convierte en enum cuando confirme el vocabulario.';

-- ---------------------------------------------------------------------------
-- E. Perfil del atleta: catálogos que aparecieron en la ficha
-- ---------------------------------------------------------------------------

alter table public.athletes
  add column training_goal    text,  -- [Hipertrofia, Pérdida de Grasa, Recomposición
                                     --  Corporal, Rendimiento Deportivo, Mantenimiento]
  add column experience_level text;  -- [Principiante, Intermedio, Avanzado,
                                     --  Deportista, Culturista / Competidor]

comment on column public.athletes.training_goal is
  'objetivo_atleta en su ficha. Determina el enfoque de prescripción.';

-- ---------------------------------------------------------------------------
-- F. Módulo FEMTECH — ciclo menstrual
-- ---------------------------------------------------------------------------
--
-- DATO DE SALUD REPRODUCTIVA: la categoría más sensible de la Ley 1581. Hereda
-- el aislamiento por tenant como todo lo demás, pero además el flujo de
-- consentimiento (tarea 2.2) debe pedirlo de forma explícita y separada, y
-- permitir usar la plataforma sin activarlo.
--
-- Es un HISTORIAL, no un dato único: la fecha de última menstruación cambia
-- cada mes y la fase se calcula contra la más reciente. Mismo trato que las
-- mediciones: se inserta, no se pisa (§3.5).
--
-- La fase, el multiplicador de volumen y el ajuste biomecánico NO son columnas:
-- dependen de la fecha de hoy, así que son funciones puras en
-- src/domain/calculations con sus tests (§3.4).

create table public.menstrual_cycle_logs (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id)  on delete restrict,

  -- Día 1 del último sangrado.
  last_period_start date not null check (last_period_start > '2000-01-01'),

  cycle_length_days integer not null default 28
                    check (cycle_length_days between 15 and 90),

  uses_hormonal_contraception boolean not null default false,

  notes         text,
  recorded_at   timestamptz not null default now(),

  voided_at     timestamptz,
  voided_by     uuid references public.users (id),
  voided_reason text,

  created_at    timestamptz not null default now(),
  created_by    uuid references public.users (id),

  constraint ciclo_anulacion_con_motivo check (
    (voided_at is null and voided_reason is null)
    or (voided_at is not null and length(btrim(coalesce(voided_reason,''))) > 0)
  )
);

comment on table public.menstrual_cycle_logs is
  'Historial de ciclo menstrual (módulo FEMTECH). Dato de salud reproductiva: consentimiento explícito y separado.';

create index menstrual_cycle_athlete_idx
  on public.menstrual_cycle_logs (athlete_id, last_period_start desc);

create trigger menstrual_cycle_hereda_tenant
  before insert or update on public.menstrual_cycle_logs
  for each row execute function public.heredar_tenant_del_atleta();

-- Mismo patrón de inmutabilidad que las mediciones: insertar y leer; corregir
-- solo anulando con motivo.
grant select, insert on public.menstrual_cycle_logs to authenticated;
grant update (voided_at, voided_by, voided_reason)
  on public.menstrual_cycle_logs to authenticated;

alter table public.menstrual_cycle_logs enable row level security;

create policy menstrual_aislamiento on public.menstrual_cycle_logs
  for all to authenticated
  using      (exists (select 1 from public.athletes a where a.id = athlete_id))
  with check (exists (select 1 from public.athletes a where a.id = athlete_id));
