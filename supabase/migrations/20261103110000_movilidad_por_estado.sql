-- ===========================================================================
-- Movilidad por ESTADO: Óptimo o Restringido, sin grados (2.5 / 3.3)
-- ===========================================================================
--
-- Giovanni, 3-nov: "el campo de movilidad exige escribir el valor exacto en
-- grados, y eso ralentiza la evaluación en el gimnasio. Eliminar el campo
-- numérico y reemplazarlo por un control de dos estados: Óptimo (sin
-- restricciones) o Restringido (activa las reglas compensatorias)".
--
-- 1. El entrenador marca el estado de cada test en `rom_estados` (la columna
--    va en la migración anterior, 20261103090000, para poder subirla antes
--    que el código).
--
-- 2. Las seis reglas de movilidad pasan a mirar el ESTADO. Versión nueva y no
--    UPDATE: una regla es inmutable salvo `is_active`. Mismas acciones y misma
--    justificación; cambia solo la condición.
--
--    Ojo con la rotación externa de hombro: la regla decía < 70° y la pantalla
--    marcaba Óptimo solo a 90°. En las evaluaciones viejas el estado sale del
--    umbral de la pantalla (90°), así que entre 70° y 89° ahora restringe. Es
--    la pregunta que ya tiene abierta; con el control nuevo lo decide el
--    entrenador al marcar.

update public.rules
   set is_active = false
 where is_active
   and rule_key in (
     'dorsiflexion-limitada', 'dorsiflexion-severa', 'flexion-hombro-restringida',
     'rotacion-externa-hombro-limitada', 'slr-isquiotibiales-restringido',
     'thomas-test-flexores-acortados'
   );

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select r.rule_key,
       r.version + 1,
       r.nivel,
       n.condicion::jsonb,
       r.actions,
       r.justification,
       r.evidence_level,
       true
  from public.rules r
  join (values
    ('dorsiflexion-limitada',            '{"todas":[{"hecho":"dorsiflexion","op":"=","valor":"Limitada"}]}'),
    ('dorsiflexion-severa',              '{"todas":[{"hecho":"dorsiflexion","op":"=","valor":"Severa"}]}'),
    ('flexion-hombro-restringida',       '{"todas":[{"hecho":"flexion_hombro","op":"=","valor":"Restringido"}]}'),
    ('rotacion-externa-hombro-limitada', '{"todas":[{"hecho":"rotacion_externa_hombro","op":"=","valor":"Restringido"}]}'),
    ('slr-isquiotibiales-restringido',   '{"todas":[{"hecho":"slr","op":"=","valor":"Restringido"}]}'),
    ('thomas-test-flexores-acortados',   '{"todas":[{"hecho":"thomas_test","op":"=","valor":"Restringido"}]}')
  ) as n(rule_key, condicion) on n.rule_key = r.rule_key
 where r.version = (select max(x.version) from public.rules x where x.rule_key = r.rule_key);

do $$
begin
  if (select count(*) from public.rules
       where is_active
         and rule_key in (
           'dorsiflexion-limitada', 'dorsiflexion-severa', 'flexion-hombro-restringida',
           'rotacion-externa-hombro-limitada', 'slr-isquiotibiales-restringido',
           'thomas-test-flexores-acortados')
         and condition::text not like '%grados%'
         and condition::text not like '%_cm"%') <> 6 then
    raise exception 'Las seis reglas de movilidad debían quedar activas mirando el estado.';
  end if;
end $$;
