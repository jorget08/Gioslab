-- ===========================================================================
-- La forma del plan de entrenamiento (tarea 5.1)
-- ===========================================================================
--
-- `plan_data` nació como jsonb libre con un comentario que decía "la forma se
-- fija en Fase B, cuando exista el generador de rutinas". El generador se
-- adelantó a Fase A —era el puente que faltaba entre el motor y todo lo
-- demás— así que la forma se fija ahora.
--
-- ---------------------------------------------------------------------------
-- POR QUÉ EL CHECK ES SUPERFICIAL Y NO PROFUNDO
-- ---------------------------------------------------------------------------
--
-- Un plan es un árbol: semanas → días → tres fases → ejercicios. Validar todo
-- eso en SQL sería una función enorme, imposible de leer y duplicada respecto de
-- `validarPlan` en `domain/plan.ts`, que además da mensajes en español para la
-- persona que está editando.
--
-- Así que el reparto es: la BASE garantiza que lo que hay dentro es un plan y no
-- otra cosa —tiene versión conocida y las claves de primer nivel—, y el DOMINIO
-- valida el árbol. Es el mismo criterio que con `media_urls`, solo que allí la
-- estructura era plana y cabía entera en el CHECK.
--
-- Lo que esto sí impide, que es lo que importa: que una escritura mal hecha deje
-- una fila que parece un plan, no falla al guardarse y revienta al leerse
-- semanas después en la pantalla de un entrenador.

create or replace function public.plan_bien_formado(datos jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    -- El borrador vacío es válido: un plan se crea antes de tener contenido.
    datos = '{}'::jsonb
    or (
      jsonb_typeof(datos) = 'object'
      -- `coalesce` en las tres, y no es cosmético: si la clave falta, `->>`
      -- devuelve NULL, la comparación da NULL, y un CHECK con NULL PASA. O sea
      -- que sin esto un objeto sin `version` se colaría como plan válido, que
      -- es justo el caso que esto persigue. Ya mordió una vez en la 4.2.
      and coalesce(datos->>'version', '') = '1'
      and jsonb_typeof(datos->'semanas') = 'array'
      and coalesce(datos->>'periodizacion', '') in ('lineal', 'ondulante', 'atr')
      and coalesce(datos->>'objetivo', '') in ('fuerza', 'hipertrofia', 'perdida_grasa')
    );
$$;

comment on function public.plan_bien_formado(jsonb) is
  'Valida el primer nivel de workout_plans.plan_data. El árbol lo valida validarPlan() en domain/plan.ts.';

alter table public.workout_plans
  drop constraint if exists workout_plans_plan_bien_formado;

alter table public.workout_plans
  add constraint workout_plans_plan_bien_formado
  check (public.plan_bien_formado(plan_data));

comment on column public.workout_plans.plan_data is
  'Mesociclo completo: {version, periodizacion, objetivo, diasPorSemana, semanas[]}. Cada día lleva SIEMPRE sus tres fases (preparación, central, final). Ver domain/plan.ts.';

-- ---------------------------------------------------------------------------
-- periodization_type deja de estar pendiente
-- ---------------------------------------------------------------------------
--
-- Llevaba desde la migración 1.3 marcado "PENDIENTE DE GIOVANNI: el catálogo de
-- periodizaciones que usa su método". Lo cerró entre su formulario del 31-ago
-- (Ondulante, Lineal Secuencial/Bloques, Recomposición/Priorización) y su anexo
-- ATR del 1-sep (Lineal Progresiva Simple, Ondulante DUP/WUP, ATR/Bloques
-- concentrados). Son los mismos tres modelos nombrados de dos maneras suyas; se
-- guarda la clave corta y las dos redacciones viven en FICHA_PERIODIZACION.
--
-- ⚠️ Esto fija CÓMO SE LLAMAN, no A QUIÉN LE TOCA CADA UNO. Su anexo los asigna
-- por nivel del atleta y su formulario los describe por objetivo; los dos ejes
-- existen en `athletes` y cuál manda sigue preguntado (5.2).

update public.workout_plans set periodization_type = null
 where periodization_type is not null
   and periodization_type not in ('lineal', 'ondulante', 'atr');

alter table public.workout_plans
  drop constraint if exists workout_plans_periodizacion_conocida;

alter table public.workout_plans
  add constraint workout_plans_periodizacion_conocida
  check (periodization_type is null
         or periodization_type in ('lineal', 'ondulante', 'atr'));

comment on column public.workout_plans.periodization_type is
  'lineal | ondulante | atr. Cerrado el 1-sep con su formulario y su anexo ATR; cuál le toca a cada atleta sigue abierto (5.2).';
