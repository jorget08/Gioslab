-- ===========================================================================
-- Reglas de asimetría (tarea 2.15)
-- ===========================================================================
--
-- Giovanni: «que el motor prescriba unilaterales empezando por el lado débil y
-- ajuste el volumen en esa zona».
--
-- Se entrega la primera mitad —el aviso de por dónde empezar— y NO la segunda,
-- por dos motivos distintos que conviene no mezclar:
--
-- 1. QUÉ EJERCICIO ES "UNILATERAL" no está en ninguna parte. La biblioteca no
--    tiene esa marca y decidirla es criterio suyo, no nuestro: priorizar
--    Zancadas ante una asimetría de BRAZO sería absurdo, así que la lista tiene
--    que ir por segmento y la tiene que dar él. Por eso estas reglas avisan pero
--    no priorizan todavía.
--
-- 2. "AJUSTAR EL VOLUMEN EN ESA ZONA" NO CABE EN LA GRAMÁTICA. Las dos acciones
--    de volumen que existen —`volumen_factor` (nivel 2) y `volumen_series`
--    (nivel 4)— son GLOBALES: multiplican o fijan series para todo el plan, no
--    para un grupo muscular. Escribirlo como si cupiera dejaría una regla que
--    parece viva y hace otra cosa. Es trabajo de 3.1, anotado allí.
--
-- El `modificador` sí cabe, y es exactamente lo que el motor define como
-- "cambia el CÓMO sin quitarlo".
--
-- La pantorrilla no lleva regla: su umbral sigue sin fijar (`UMBRAL_CM` la deja
-- en null), así que el hecho nunca la nombraría y la regla no dispararía jamás.

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select v.rule_key,
       coalesce((select max(r.version) from public.rules r where r.rule_key = v.rule_key), 0) + 1,
       v.nivel, v.condition, v.actions, v.justification, v.evidence_level, true
from (values

('asimetria-brazo', 1,
 '{"todas":[{"hecho":"asimetrias","op":"incluye","valor":"brazo"}]}'::jsonb,
 '{"modificador":"Asimetría de brazo por encima de 1,5 cm: el trabajo de brazo empieza SIEMPRE por el lado débil, y el lado fuerte no pasa de las repeticiones que haya hecho el débil."}'::jsonb,
 'Asimetría de brazo mayor de 1,5 cm entre lados. Se empieza por el lado débil y se iguala el trabajo.',
 'LEVEL_B_BIOMECHANICS'),

('asimetria-muslo', 1,
 '{"todas":[{"hecho":"asimetrias","op":"incluye","valor":"muslo"}]}'::jsonb,
 '{"modificador":"Asimetría de muslo por encima de 2 cm: el trabajo de pierna empieza SIEMPRE por el lado débil, y el lado fuerte no pasa de las repeticiones que haya hecho el débil."}'::jsonb,
 'Asimetría de muslo mayor de 2 cm entre lados. Se empieza por el lado débil y se iguala el trabajo.',
 'LEVEL_B_BIOMECHANICS')

) as v(rule_key, nivel, condition, actions, justification, evidence_level)
where not exists (
  select 1 from public.rules r where r.rule_key = v.rule_key and r.is_active
);

comment on column public.anthropometric_measurements.arm_flexed_left_cm is
  'Brazo contraído, lado izquierdo. Su ausencia significa "no medido", nunca "simétrico". Alimenta el hecho `asimetrias` del motor.';
