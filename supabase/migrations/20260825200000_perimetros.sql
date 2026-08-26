-- Perímetros de extremidades y tronco — petición de Giovanni (2026-08-25).
--
-- "Actualmente el sistema solo solicita mediciones de cintura y cadera. La
-- evaluación del progreso muscular exige registrar la evolución del perímetro
-- en extremidades y en el tren superior e inferior, no únicamente el área
-- abdominal."
--
-- Tiene razón y es barato: cintura y cadera sirven para el ratio de riesgo, no
-- para ver si un brazo creció. Sin estas columnas la ficha puede enseñar que
-- alguien ganó dos kilos de masa magra pero no DÓNDE.
--
-- ---------------------------------------------------------------------------
-- CONVENCIÓN DE SUFIJOS
-- ---------------------------------------------------------------------------
--
-- La tabla ya distingue por unidad y se mantiene:
--   `_mm`  pliegue cutáneo   (thigh_mm, calf_mm)
--   `_cm`  perímetro         (waist_cm, hip_cm, y estos)
--
-- Por eso `calf_mm` y `calf_cm` conviven sin ambigüedad: uno es el pliegue de
-- pantorrilla del protocolo ISAK y el otro su contorno.

alter table public.anthropometric_measurements
  -- Relajado y contraído por separado: la diferencia entre ambos es la que
  -- habla de masa contráctil, y promediarlos la perdería.
  add column arm_relaxed_cm numeric(5,1) check (arm_relaxed_cm between 15 and 70),
  add column arm_flexed_cm  numeric(5,1) check (arm_flexed_cm  between 15 and 70),
  add column chest_cm       numeric(5,1) check (chest_cm       between 50 and 200),
  add column thigh_cm       numeric(5,1) check (thigh_cm       between 25 and 110),
  add column calf_cm        numeric(5,1) check (calf_cm        between 15 and 80);

comment on column public.anthropometric_measurements.arm_flexed_cm is
  'Perímetro de brazo contraído. Con arm_relaxed_cm permite seguir la masa contráctil; no confundir con ningún pliegue.';

comment on column public.anthropometric_measurements.calf_cm is
  'Contorno de pantorrilla. Distinto de calf_mm, que es el pliegue del protocolo ISAK.';
