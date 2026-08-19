-- 1.4 — Endurecer RLS por rol.
--
-- ===========================================================================
-- POR QUÉ EXISTE ESTA MIGRACIÓN: dos condiciones NEGATIVAS que fallaban abierto
-- ===========================================================================
--
-- La política de `athletes` de la migración 1.1 decía:
--
--     mi_rol() <> 'trainer' or trainer_id = auth.uid()
--
-- La intención era "el entrenador solo ve los suyos". Pero para el rol `client`
-- la primera mitad es VERDADERA, así que un cliente veía TODOS los atletas de su
-- gimnasio, con sus lesiones y su composición corporal.
--
-- El error no fue de distracción, fue estructural: una condición negativa
-- concede acceso a todo rol que no esté nombrado. Cada rol nuevo entra por la
-- puerta de atrás en silencio, y en la 1.6 y en Fase B habrá más.
--
-- La corrección es enumerar POSITIVAMENTE quién sí puede. Un rol que no aparece
-- en la lista queda fuera por defecto. Con datos de salud y la Ley 1581 encima,
-- la única postura defendible es que el silencio signifique "no".
--
-- Las tablas hijas (consentimientos, lesiones, mediciones, evaluaciones,
-- engine_runs y planes) resuelven su visibilidad con EXISTS sobre `athletes`,
-- así que quedan corregidas sin tocarlas. Ese era justamente el objetivo del
-- diseño uniforme de MODELO-DATOS.md §1.1.

-- ---------------------------------------------------------------------------
-- A. service_role
-- ---------------------------------------------------------------------------
--
-- Las migraciones anteriores solo concedieron a `authenticated`. El proyecto
-- alojado le daba permisos a service_role por privilegios por defecto, pero el
-- entorno local NO: la misma discrepancia que ya nos mordió con `anon`.
--
-- service_role es la clave de servidor. La usan las seeds (1.9), las
-- invitaciones (1.7) y cualquier operación administrativa. Se concede explícito
-- para que local y remoto se comporten igual.

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions        in schema public to service_role;

alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;

-- ---------------------------------------------------------------------------
-- B. athletes — enumeración positiva
-- ---------------------------------------------------------------------------

drop policy if exists athletes_aislamiento on public.athletes;

create policy athletes_aislamiento on public.athletes
  for all to authenticated
  using (
    public.mi_rol() = 'super_admin'
    or (
      tenant_id = public.mi_tenant()
      and (
        public.mi_rol() = 'gym'
        or (public.mi_rol() = 'trainer' and trainer_id = auth.uid())
      )
    )
  )
  with check (
    public.mi_rol() = 'super_admin'
    or (
      tenant_id = public.mi_tenant()
      and (
        public.mi_rol() = 'gym'
        or (public.mi_rol() = 'trainer' and trainer_id = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- C. users — un cliente solo se ve a sí mismo
-- ---------------------------------------------------------------------------
--
-- Antes, cualquiera con tenant veía a todos sus compañeros. Para un cliente eso
-- significaba el listado de correos de los entrenadores del gimnasio.

drop policy if exists users_lectura_tenant on public.users;

create policy users_lectura_tenant on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.mi_rol() = 'super_admin'
    or (
      public.mi_rol() in ('gym', 'trainer')
      and tenant_id is not null
      and tenant_id = public.mi_tenant()
    )
  );

-- ---------------------------------------------------------------------------
-- D. Metodología — no la lee un cliente
-- ---------------------------------------------------------------------------
--
-- `using (true)` dejaba que cualquier cuenta con sesión se descargara la matriz
-- de reglas completa, que es el activo central del negocio (CLAUDE.md §3.1).
-- Basta una cuenta de cliente para copiar el método entero.
--
-- El entrenador sí necesita leerlas: la transparencia sobre qué regla aplicó es
-- lo que genera confianza profesional (§3.6). En Fase B, el cliente verá la
-- justificación de SU rutina a través de engine_runs, que ya está acotado a su
-- atleta. Nunca el catálogo completo.

drop policy if exists rules_lectura_global on public.rules;
drop policy if exists activations_lectura_global on public.rule_activations;
drop policy if exists exercises_lectura_global on public.exercise_library;
drop policy if exists variants_lectura_global on public.exercise_variants;

create policy rules_lectura_staff on public.rules
  for select to authenticated
  using (public.mi_rol() in ('super_admin', 'gym', 'trainer'));

create policy activations_lectura_staff on public.rule_activations
  for select to authenticated
  using (public.mi_rol() in ('super_admin', 'gym', 'trainer'));

-- La biblioteca de ejercicios se restringe igual. En Fase A no existe interfaz
-- de cliente, así que abrirla ahora sería conceder un acceso que nadie usa.
-- Fase B la abrirá de forma deliberada, con una migración que se pueda revisar.
create policy exercises_lectura_staff on public.exercise_library
  for select to authenticated
  using (public.mi_rol() in ('super_admin', 'gym', 'trainer'));

create policy variants_lectura_staff on public.exercise_variants
  for select to authenticated
  using (public.mi_rol() in ('super_admin', 'gym', 'trainer'));

-- ---------------------------------------------------------------------------
-- E. Nota sobre el rol `client`
-- ---------------------------------------------------------------------------
--
-- En Fase A, un `client` solo puede leer su propio perfil y su tenant. No ve
-- atletas, mediciones, reglas, ejercicios ni planes. Es correcto: el portal del
-- cliente es Fase B y todavía no existe el vínculo cliente ↔ atleta.
--
-- Cuando se construya, hará falta una columna `athletes.client_user_id` y
-- extender esta política. Hasta entonces, el rol existe y no puede hacer nada,
-- que es la postura segura.
