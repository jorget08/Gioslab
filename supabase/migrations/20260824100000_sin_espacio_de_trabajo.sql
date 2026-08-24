-- Distinguir "no tienes espacio de trabajo" de "no tienes permiso".
--
-- Giovanni intentó dar de alta un atleta, rellenó el formulario entero y al
-- guardar le salió "No tienes permiso para crear atletas en este espacio de
-- trabajo". El mensaje era falso por partida doble: sí tiene permiso —es
-- super_admin, la política de `athletes` le deja todo— y el problema no era de
-- permisos sino de que su cuenta no pertenece a ningún espacio, así que
-- `mi_tenant()` devolvía NULL.
--
-- Un mensaje que manda a buscar el problema al sitio equivocado cuesta más que
-- no decir nada. La causa era que `crear_atleta` levantaba la excepción con
-- `insufficient_privilege` (42501), el mismo código que usa RLS cuando de
-- verdad deniega, así que el cliente no podía diferenciarlas.
--
-- Se le da un código propio. Se prefiere un SQLSTATE a comparar el texto del
-- mensaje: el texto está en español y se puede reescribir sin darse cuenta de
-- que algo dependía de él.

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
    -- Código propio: NO es 42501. Quien llama necesita poder distinguir "te
    -- falta un espacio de trabajo" —que lo arregla un administrador
    -- invitándote— de "no tienes permiso", que es otra conversación.
    raise exception 'No tienes un espacio de trabajo activo'
      using errcode = 'GL001';
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
  'Alta de atleta + consentimientos + lesiones en una transacción. Sin consentimiento no hay atleta (Ley 1581). Levanta GL001 si quien llama no tiene espacio de trabajo activo.';

revoke execute on function public.crear_atleta(
  text, date, text, text, text, jsonb, text, text, boolean, jsonb) from public, anon;
grant execute on function public.crear_atleta(
  text, date, text, text, text, jsonb, text, text, boolean, jsonb) to authenticated;
