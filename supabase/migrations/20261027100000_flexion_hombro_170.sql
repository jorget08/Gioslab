-- ===========================================================================
-- Flexión de hombro: la regla pasa de < 175° a < 170°
-- ===========================================================================
--
-- Giovanni reportó el 26-oct que el motor le bloqueaba el press militar a un
-- atleta con el hombro en "Óptimo". Tenía razón y el fallo es nuestro.
--
-- El 26-ago él corrigió el umbral del test a 170° citando a la AAOS —la
-- flexión normal va de 165° a 180° según cada cuerpo— y descartó
-- expresamente los 175° de su propia matriz (PREGUNTAS-GIOVANNI, "B. Flexión
-- de hombro ✅ RESUELTA"). La pantalla de evaluación se actualizó a 170°
-- (`src/domain/movilidad.ts`), pero la regla se cargó el 27-ago con 175° "por
-- ser el lado conservador" y se dejó pendiente de unificar. Nadie la unificó.
--
-- Resultado: de 170° a 174° la pantalla decía Óptimo y el motor decía
-- restringido. Su atleta de prueba del 26-oct tenía 170°.
--
-- Se revisaron los otros cinco tests de movilidad contra sus reglas y ninguno
-- tiene este cruce: dorsiflexión, SLR y Thomas usan el mismo corte que la
-- pantalla, y la rotación externa es al revés (la pantalla es más exigente
-- que la regla), que no bloquea nada de más.
--
-- Versión nueva y no UPDATE: una regla es inmutable salvo `is_active`, y las
-- evaluaciones ya hechas tienen que poder seguir diciendo con qué regla
-- salieron (§3.5).

update public.rules
   set is_active = false
 where rule_key = 'flexion-hombro-restringida'
   and is_active;

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select r.rule_key,
       r.version + 1,
       r.nivel,
       '{"todas":[{"hecho":"flexion_hombro_grados","op":"<","valor":170}]}'::jsonb,
       r.actions,
       'Flexión de hombro restringida (menos de 170°, umbral AAOS confirmado por Giovanni el 26-ago). '
         || 'Se bloquea el press vertical tras nuca y el overhead a 180°.',
       r.evidence_level,
       true
  from public.rules r
 where r.rule_key = 'flexion-hombro-restringida'
   and r.version = (select max(version) from public.rules where rule_key = 'flexion-hombro-restringida');

do $$
declare
  umbral numeric;
begin
  select (condition #>> '{todas,0,valor}')::numeric into umbral
    from public.rules
   where rule_key = 'flexion-hombro-restringida' and is_active;

  if umbral is distinct from 170 then
    raise exception 'La regla activa de flexión de hombro debía quedar en 170 y está en %', umbral;
  end if;
end $$;
