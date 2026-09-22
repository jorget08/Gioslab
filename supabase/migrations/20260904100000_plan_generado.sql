-- ===========================================================================
-- El plan tal como lo generó el motor (tarea 5.4)
-- ===========================================================================
--
-- El editor del entrenador necesita distinguir lo que propuso el sistema de lo
-- que decidió él. Su tarjeta lo dice sin rodeos: «lo que él sobreescriba queda
-- marcado como decisión suya, distinto de lo que propuso el motor: sin esa
-- distinción no se puede aprender de sus correcciones más adelante».
--
-- ---------------------------------------------------------------------------
-- POR QUÉ SE GUARDA EL PLAN ENTERO Y NO UNA MARCA POR CAMPO
-- ---------------------------------------------------------------------------
--
-- La alternativa era colgar de cada ejercicio un `editado: ["series","rpe"]`.
-- Se descartó por dos motivos:
--
--   · Una marca dice QUÉ cambió, no DE QUÉ a qué. Y lo que hay que aprender de
--     Giovanni es justo eso: que donde el motor le pone 4 series él pone 3.
--     Con la marca, esa información se pierde en el momento de escribirla.
--   · Ensucia el esquema del plan (5.1), que es también lo que va a leer la app
--     del atleta en Fase B. Un campo de auditoría del entrenador no pinta nada
--     en la pantalla de quien entrena.
--
-- Guardar los dos árboles cuesta unos kilobytes por plan y deja la comparación
-- para quien la mire, hoy en pantalla y mañana para aprender de sus cambios.
--
-- ---------------------------------------------------------------------------
-- Y ES INMUTABLE, COMO LA REGLA QUE JUSTIFICÓ CADA EJERCICIO
-- ---------------------------------------------------------------------------
--
-- Si se pudiera reescribir, bastaría un `update` distraído para que "lo que
-- propuso el motor" fuera en realidad lo que el entrenador dejó. La comparación
-- diría que no tocó nada y la trazabilidad sería ficticia — el mismo argumento
-- por el que `rules` no deja editar una versión publicada.
--
-- Regenerar no es reescribir: es una fila nueva, con su fecha. Eso además deja
-- el historial de cuántas veces hubo que regenerarle el plan a alguien, que es
-- justo el tipo de dato que hoy no tenemos.

alter table public.workout_plans
  add column if not exists plan_generado jsonb;

alter table public.workout_plans
  drop constraint if exists workout_plans_generado_bien_formado;

alter table public.workout_plans
  add constraint workout_plans_generado_bien_formado
  check (plan_generado is null or public.plan_bien_formado(plan_generado));

comment on column public.workout_plans.plan_generado is
  'El plan tal como salió del generador (5.3), antes de que el entrenador lo tocara. Inmutable: se escribe al crear la fila y no se actualiza. La comparación con plan_data es lo que marca sus decisiones.';

-- ---------------------------------------------------------------------------
-- La inmutabilidad, por GRANT de columna
-- ---------------------------------------------------------------------------
--
-- Mismo mecanismo que en `rules` y en las mediciones (migración 20260826200000):
-- se revoca el UPDATE entero y se devuelve columna por columna. Lo que no esté
-- en esta lista no se puede cambiar después de insertar.
--
-- `tenant_id` tampoco vuelve, y no es descuido: lo pone el trigger que hereda
-- del atleta, y moverlo a mano sería mover un plan de inquilino.

revoke update on public.workout_plans from authenticated;
grant  update (title, periodization_type, duration_weeks, plan_data, status,
               generated_pdf_url, engine_run_id)
  on public.workout_plans to authenticated;

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
      from information_schema.column_privileges
     where table_schema = 'public'
       and table_name   = 'workout_plans'
       and column_name  = 'plan_generado'
       and privilege_type = 'UPDATE'
       and grantee = 'authenticated'
  ) then
    raise exception 'plan_generado tenía que quedar inmutable y se puede actualizar';
  end if;
end $$;
