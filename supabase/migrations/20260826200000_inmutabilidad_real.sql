-- ===========================================================================
-- La inmutabilidad por columna nunca estuvo puesta
-- ===========================================================================
--
-- Seis tablas de este esquema declaran qué columnas se pueden actualizar:
--
--   rules                        → is_active
--   invitations                  → revoked_at
--   athlete_conditions           → is_active, notes
--   anthropometric_measurements  → voided_at, voided_by, voided_reason
--   biomech_evaluations          → voided_at, voided_by, voided_reason
--   menstrual_cycle_logs         → voided_at, voided_by, voided_reason
--
-- Todas lo hacen con `grant update (columnas)`, y en ninguna funcionaba.
--
-- POR QUÉ: Supabase deja configurado `alter default privileges ... grant all on
-- tables to anon, authenticated, service_role`. Cada tabla nueva creada por
-- `postgres` nace con UPDATE sobre TODAS sus columnas concedido a
-- `authenticated`. Un `grant update (una_columna)` posterior no restringe nada:
-- SUMA un permiso que ya estaba. Sin un `revoke` previo, la restricción es
-- decorativa.
--
-- Solo `users` lo hacía bien, en 20260819100000_membresias.sql:195, y ese es el
-- patrón que se copia aquí: revocar y volver a conceder.
--
-- QUÉ ESTABA EXPUESTO. La RLS seguía impidiendo ver o tocar datos de otro
-- inquilino, así que no había fuga entre gimnasios. Lo que no existía era la
-- INMUTABILIDAD, y de ella dependen dos promesas del producto:
--
--   §3.5  "Historial, nunca sobreescritura". Un entrenador podía reescribir en
--         el sitio una medición de hace seis meses. El valor del producto es
--         mostrar la evolución del atleta; una evolución editable no vale nada.
--
--   §3.6  Trazabilidad de la matriz. Un plan generado en marzo apunta a la
--         regla que lo justificó. Con la justificación editable, el texto que
--         lee el entrenador cambiaba retroactivamente y la trazabilidad era
--         ficticia. El editor de reglas (3.5) está construido entero sobre esta
--         promesa: por eso editar publica una versión nueva en vez de pisar.
--
-- ⚠️ TRAMPA PARA EL FUTURO: toda tabla nueva nace con UPDATE completo. Si una
-- migración posterior quiere columnas inmutables, tiene que REVOCAR primero.
-- Hay comprobaciones en tests/rls/1.3 que lo verifican por si se olvida.

-- ===========================================================================
-- PRIMERO: TRUNCATE, que la RLS no filtra
-- ===========================================================================
--
-- El mismo `grant all` por defecto concede a `authenticated` DELETE, TRUNCATE,
-- REFERENCES y TRIGGER sobre cada tabla. DELETE lo sigue filtrando la RLS —sin
-- política de borrado no se va ninguna fila— pero **TRUNCATE NO PASA POR LA
-- RLS**: es una operación de tabla, no de filas.
--
-- Comprobado contra la base local: un `authenticated` cualquiera vaciaba
-- `athlete_injuries` entera, de todos los gimnasios. Historial clínico de todos
-- los inquilinos, y son datos sensibles bajo la Ley 1581 (§3.7).
--
-- La aplicación no borra NADA: no hay una sola llamada `.delete()` contra la
-- base en `src/`, y ninguna tabla tiene política de borrado. Así que estos
-- cuatro permisos no le hacen falta a nadie y se van enteros. SELECT, INSERT y
-- UPDATE se quedan como estaban: esos sí los gobierna la RLS.
revoke delete, truncate, references, trigger
  on all tables in schema public from authenticated;

-- Y para las tablas que aún no existen, que si no heredan el mismo agujero.
-- Es la raíz del problema: sin esto, cada tabla nueva vuelve a nacer abierta.
alter default privileges for role postgres in schema public
  revoke delete, truncate, references, trigger on tables from authenticated;

-- --- rules -----------------------------------------------------------------
-- La matriz es el activo central del negocio (CLAUDE.md §3.1). Solo se puede
-- retirar o reponer una versión; su contenido, jamás.
revoke update on public.rules from authenticated;
grant  update (is_active) on public.rules to authenticated;

-- --- invitations -----------------------------------------------------------
-- Se revoca, no se reescribe: cambiar el rol de una invitación ya enviada sería
-- una escalada de privilegios silenciosa.
revoke update on public.invitations from authenticated;
grant  update (revoked_at) on public.invitations to authenticated;

-- --- athlete_conditions ----------------------------------------------------
-- El embarazo empieza y termina; la fila se conserva y solo se marca si aplica
-- ahora. Cambiar `condition` convertiría un registro de hipertensión en otro de
-- diástasis sin dejar rastro.
revoke update on public.athlete_conditions from authenticated;
grant  update (is_active, notes) on public.athlete_conditions to authenticated;

-- --- Mediciones versionadas ------------------------------------------------
-- Una medición equivocada se ANULA y se toma otra; no se corrige encima. Es
-- literalmente §3.5, y hasta ahora no estaba defendido por nada.
revoke update on public.anthropometric_measurements from authenticated;
grant  update (voided_at, voided_by, voided_reason)
  on public.anthropometric_measurements to authenticated;

revoke update on public.biomech_evaluations from authenticated;
grant  update (voided_at, voided_by, voided_reason)
  on public.biomech_evaluations to authenticated;

revoke update on public.menstrual_cycle_logs from authenticated;
grant  update (voided_at, voided_by, voided_reason)
  on public.menstrual_cycle_logs to authenticated;

-- --- engine_runs -----------------------------------------------------------
-- No declara ninguna columna actualizable —solo `select, insert`— porque una
-- ejecución del motor es un hecho ocurrido: la salida que se le enseñó al
-- entrenador aquel día no se reescribe. Hay un test desde la 1.3 que lo afirma
-- y que pasaba por otro motivo, no porque el permiso faltara.
revoke update on public.engine_runs from authenticated;

comment on table public.rules is
  'Matriz de condicionales versionada. `condition`, `actions` y `justification` '
  'son inmutables por GRANT de columna: editar una regla es publicar una '
  'versión nueva y retirar la anterior (tarea 3.5).';
