-- ===========================================================================
-- El registro de activaciones se saltaba las publicaciones (tarea 3.6)
-- ===========================================================================
--
-- `rules_registra_activacion` es `after update`. Así que una versión insertada
-- ya activa —que es exactamente lo que hace el editor cuando se marca
-- "activarla al guardar"— entraba en vigor SIN dejar una sola fila en
-- `rule_activations`.
--
-- El comentario original de esa función dice por qué existe: que el historial no
-- dependa de que la aplicación se acuerde de escribirlo. La intención era buena
-- y el trigger le faltaba la mitad del caso.
--
-- POR QUÉ IMPORTA. `rule_activations` es lo que responde "¿qué regla estaba
-- vigente el día que se generó este plan?". Con el alta sin registrar, la
-- respuesta era incompleta justo para las versiones que nacieron activas, que
-- son la mayoría. La versión publicada tiene su `created_at`, sí, pero eso dice
-- cuándo se ESCRIBIÓ, no cuándo empezó a aplicarse a los atletas; normalmente
-- coinciden, y cuando no coinciden es precisamente cuando hay que saberlo.
--
-- Se separa en un trigger propio en vez de ampliar el de update: la condición no
-- es la misma —aquí no hay `old`— y meterlas juntas obliga a un `if TG_OP` que
-- oscurece las dos.

create or replace function public.registrar_publicacion_de_regla()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active then
    insert into public.rule_activations (rule_id, action, actor_id)
    values (new.id, 'activada', auth.uid());
  end if;
  return new;
end;
$$;

create trigger rules_registra_publicacion
  after insert on public.rules
  for each row execute function public.registrar_publicacion_de_regla();

comment on function public.registrar_publicacion_de_regla() is
  'Una versión que nace activa también entra en vigor, y el registro tiene que '
  'poder responder qué regla se aplicaba en una fecha dada (tarea 3.6).';
