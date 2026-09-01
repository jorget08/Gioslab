-- ===========================================================================
-- Perímetros bilaterales y asimetrías (tarea 2.15)
-- ===========================================================================
--
-- Giovanni aprobó medir los dos lados de brazo, muslo y pantorrilla, y pidió que
-- el motor "prescriba unilaterales empezando por el lado débil y ajuste el
-- volumen en esa zona".
--
-- ---------------------------------------------------------------------------
-- POR QUÉ SE AÑADE UN LADO EN VEZ DE RENOMBRAR LOS DOS
-- ---------------------------------------------------------------------------
--
-- Lo limpio en abstracto sería `arm_flexed_right_cm` / `arm_flexed_left_cm` y
-- borrar la columna vieja. No se hace, por §3.5: las mediciones ya guardadas se
-- tomaron de UN lado que nadie anotó. Renombrar esa columna a "derecho" sería
-- inventar el dato retroactivamente, y encima en el sitio donde más caro sale —
-- una asimetría es una resta, así que un lado mal etiquetado la invierte y el
-- sistema mandaría reforzar la pierna fuerte.
--
-- Así que la columna existente pasa a ser el lado DERECHO de aquí en adelante, y
-- la nueva es el izquierdo. Las filas anteriores a esta migración se quedan sin
-- izquierdo, que es exactamente lo que son: mediciones sin asimetría calculable.
-- El dominio las trata como "no lo sé", nunca como "sin asimetría".
--
-- Solo se desdoblan los TRES que él nombró. El brazo relajado y el tórax siguen
-- siendo únicos: el relajado sirve para seguir masa, no para comparar lados, y
-- el tórax no tiene dos.

alter table public.anthropometric_measurements
  add column if not exists arm_flexed_left_cm numeric(5,1) check (arm_flexed_left_cm between 15 and 70),
  add column if not exists thigh_left_cm      numeric(5,1) check (thigh_left_cm      between 25 and 110),
  add column if not exists calf_left_cm       numeric(5,1) check (calf_left_cm       between 15 and 80);

comment on column public.anthropometric_measurements.arm_flexed_cm is
  'Perímetro de brazo contraído, lado DERECHO (desde la migración 2.15). Con arm_relaxed_cm permite seguir la masa contráctil; no confundir con ningún pliegue.';
comment on column public.anthropometric_measurements.arm_flexed_left_cm is
  'Brazo contraído, lado izquierdo. Su ausencia significa "no medido", nunca "simétrico".';

comment on column public.anthropometric_measurements.thigh_cm is
  'Perímetro de muslo, lado DERECHO (desde la migración 2.15).';
comment on column public.anthropometric_measurements.thigh_left_cm is
  'Muslo, lado izquierdo. Su ausencia significa "no medido", nunca "simétrico".';

comment on column public.anthropometric_measurements.calf_cm is
  'Contorno de pantorrilla, lado DERECHO (desde la migración 2.15). Distinto de calf_mm, que es el pliegue ISAK.';
comment on column public.anthropometric_measurements.calf_left_cm is
  'Pantorrilla, lado izquierdo. Su ausencia significa "no medido", nunca "simétrico".';
