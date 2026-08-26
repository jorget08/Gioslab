-- Thomas Test y SLR — respuesta de Giovanni del 2026-08-26.
--
-- Su matriz introducía dos tests nuevos y a la vez dejaba fuera dos que salieron
-- de su propia ficha, así que se le preguntó si sustituían o sumaban.
--
-- Respuesta: **SE SUMAN**. Textual: "Mantener flexión de cadera y rotación
-- interna de cadera (cruciales para valorar el espacio femoroacetabular).
-- Integrar Thomas Test y elevación de pierna recta. No borres ni migres datos
-- guardados."
--
-- Por eso esta migración solo AÑADE. Ninguna evaluación existente se toca, y no
-- hace falta decidir qué hacer con los valores ya capturados.
--
-- También aclaró la rotación externa de hombro: se queda en 90° y no en 70°.
-- Los 70° son el mínimo clínico de población sedentaria; en alguien que hace
-- empujes y tracciones por encima de la cabeza el estándar es 90. No hay
-- migración para eso: el umbral vive en src/domain/movilidad.ts.

alter table public.biomech_evaluations
  -- Thomas Test: mide la extensión de cadera con la contralateral flexionada.
  -- NEGATIVO significa flexores acortados, que es justo el caso que dispara
  -- regla en su matriz ("θ < 0° → Restringida"). Por eso el rango baja de cero.
  add column thomas_test_deg integer
      check (thomas_test_deg between -40 and 40),

  -- SLR (Straight Leg Raise): elevación de pierna recta, acortamiento de
  -- isquiotibiales. Su umbral es 70°.
  add column slr_deg integer
      check (slr_deg between 0 and 130);

comment on column public.biomech_evaluations.thomas_test_deg is
  'Thomas Test en grados. Negativo = flexores de cadera acortados, que es el caso que restringe (matriz de Giovanni, Nivel 1).';

comment on column public.biomech_evaluations.slr_deg is
  'Elevación de pierna recta en grados. Por debajo de 70° indica acortamiento de isquiotibiales y bloquea el peso muerto desde el suelo.';
