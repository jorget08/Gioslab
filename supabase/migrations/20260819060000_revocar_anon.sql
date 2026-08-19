-- 1.1 — Retirar a `anon` todo permiso sobre el esquema public.
--
-- POR QUÉ EXISTE ESTA MIGRACIÓN
--
-- Supabase concede por defecto permisos de tabla al rol `anon` sobre el esquema
-- public. Con RLS activo y políticas declaradas `to authenticated`, un anónimo
-- ya obtiene cero filas: ninguna política le aplica. Los datos NO estaban
-- expuestos.
--
-- Aun así se revoca, por tres motivos:
--
-- 1. Defensa en capas. Hoy la única barrera es "ninguna política coincide". Si
--    alguien escribe una política sin `to authenticated` —fácil de olvidar—, esa
--    barrera desaparece sin previo aviso. Sin GRANT no hay nada que olvidar.
-- 2. El entorno local (supabase start) NO concede esos permisos a `anon`, y el
--    remoto sí. Esa diferencia significa que las pruebas de RLS locales no
--    reflejan producción, que es la peor clase de falso positivo.
-- 3. Son datos sensibles de salud bajo la Ley 1581 (CLAUDE.md §3.7). En esta
--    base no hay una sola fila que deba ver alguien sin sesión iniciada.

revoke all on table public.tenants          from anon;
revoke all on table public.users            from anon;
revoke all on table public.athletes         from anon;
revoke all on table public.athlete_consents from anon;
revoke all on table public.athlete_injuries from anon;

-- Y que las tablas futuras tampoco nazcan con permisos para `anon`: de lo
-- contrario habría que acordarse de revocar en cada migración del grupo 1, y
-- olvidarlo una sola vez basta.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
