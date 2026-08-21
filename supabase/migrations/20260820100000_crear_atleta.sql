-- 2.2 — Alta de atleta con su consentimiento, en una sola transacción.
--
-- ===========================================================================
-- POR QUÉ UNA FUNCIÓN Y NO TRES INSERT DESDE EL CLIENTE
-- ===========================================================================
--
-- Dar de alta un atleta escribe en tres tablas: athletes, athlete_consents y
-- athlete_injuries. Desde el navegador son tres llamadas separadas, y si la
-- segunda falla —se cae la señal en mitad del gimnasio, que es lo normal—
-- queda un atleta guardado SIN consentimiento registrado.
--
-- Bajo la Ley 1581 ese registro no debería existir: se estarían tratando datos
-- de salud sin autorización demostrable. Aquí las tres escrituras ocurren en la
-- misma transacción: o entran todas o no entra ninguna.
--
-- La función NO es security definer: corre con los permisos de quien llama, así
-- que RLS sigue aplicando igual. Lo único que aporta es atomicidad.

create or replace function public.crear_atleta(
  p_nombre            text,
  p_fecha_nacimiento  date,
  p_sexo              text,
  p_objetivo          text default null,
  p_nivel             text default null,
  p_objetivos         jsonb default '[]'::jsonb,
  p_notas             text default null,
  p_version_politica  text default 'v1',
  p_consiente_ciclo   boolean default false,
  p_lesiones          jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_atleta  uuid;
  v_tenant  uuid := public.mi_tenant();
  v_lesion  jsonb;
begin
  if v_tenant is null then
    raise exception 'No tienes un espacio de trabajo activo'
      using errcode = 'insufficient_privilege';
  end if;

  -- El atleta queda a nombre de quien lo crea. Si más adelante un gimnasio
  -- necesita asignarlo a otro entrenador, será una operación aparte y
  -- explícita, no un parámetro que el navegador pueda mandar a su antojo.
  insert into public.athletes (
    tenant_id, trainer_id, full_name, birth_date, sex,
    training_goal, experience_level, goals, notes, created_by
  ) values (
    v_tenant, auth.uid(), btrim(p_nombre), p_fecha_nacimiento, p_sexo,
    nullif(btrim(coalesce(p_objetivo, '')), ''),
    nullif(btrim(coalesce(p_nivel, '')), ''),
    coalesce(p_objetivos, '[]'::jsonb),
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning id into v_atleta;

  -- Consentimiento de datos de salud. Obligatorio: sin esta fila no hay alta.
  insert into public.athlete_consents (athlete_id, tenant_id, policy_version, granted_by)
  values (v_atleta, v_tenant, 'salud-' || p_version_politica, auth.uid());

  -- Consentimiento del ciclo menstrual: fila SEPARADA y solo si se otorgó.
  -- Es una autorización distinta sobre datos de salud reproductiva, y tiene que
  -- poder revocarse sin tumbar la principal.
  if p_consiente_ciclo then
    insert into public.athlete_consents (athlete_id, tenant_id, policy_version, granted_by)
    values (v_atleta, v_tenant, 'ciclo-' || p_version_politica, auth.uid());
  end if;

  for v_lesion in select * from jsonb_array_elements(coalesce(p_lesiones, '[]'::jsonb))
  loop
    insert into public.athlete_injuries (
      athlete_id, tenant_id, body_region, description, occurred_on, status, created_by
    ) values (
      v_atleta, v_tenant,
      btrim(v_lesion ->> 'zona'),
      nullif(btrim(coalesce(v_lesion ->> 'descripcion', '')), ''),
      (v_lesion ->> 'fecha')::date,
      coalesce(v_lesion ->> 'estado', 'activa'),
      auth.uid()
    );
  end loop;

  return v_atleta;
end;
$$;

comment on function public.crear_atleta is
  'Alta de atleta + consentimientos + lesiones en una transacción. Sin consentimiento no hay atleta (Ley 1581).';

revoke execute on function public.crear_atleta(
  text, date, text, text, text, jsonb, text, text, boolean, jsonb) from public, anon;
grant execute on function public.crear_atleta(
  text, date, text, text, text, jsonb, text, text, boolean, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Vista de listado
-- ---------------------------------------------------------------------------
--
-- La lista de atletas necesita la fecha de la última evaluación, que es el dato
-- con el que el entrenador decide a quién le toca (docs/WIZARD-UX.md §3).
-- Calcularlo en el cliente obligaría a traer TODAS las mediciones de todos los
-- atletas para quedarse con una fecha por cada uno.
--
-- `security_invoker` hace que la vista respete el RLS de quien consulta, en vez
-- de las del dueño de la vista. Sin eso, una vista es una puerta trasera que
-- salta el aislamiento entre gimnasios.

create or replace view public.athletes_listado
with (security_invoker = true) as
select
  a.id,
  a.tenant_id,
  a.trainer_id,
  a.full_name,
  a.birth_date,
  a.sex,
  a.training_goal,
  a.experience_level,
  a.archived_at,
  greatest(
    (select max(m.measured_at) from public.anthropometric_measurements m
      where m.athlete_id = a.id and m.voided_at is null),
    (select max(e.evaluated_at) from public.biomech_evaluations e
      where e.athlete_id = a.id and e.voided_at is null)
  ) as ultima_evaluacion
from public.athletes a;

comment on view public.athletes_listado is
  'Atletas con la fecha de su última evaluación. security_invoker: respeta el RLS de quien consulta.';

grant select on public.athletes_listado to authenticated;
