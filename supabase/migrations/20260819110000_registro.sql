-- 1.5 — Crear el perfil de aplicación cuando alguien se registra.
--
-- Supabase guarda la identidad y las credenciales en auth.users. El perfil de
-- negocio vive en public.users, y hasta ahora se insertaba a mano (las pruebas
-- lo hacían con service_role). Este trigger lo automatiza.
--
-- Cubre además el camino del ENTRENADOR INDEPENDIENTE: al registrarse se le crea
-- su propio tenant `solo` y su membresía como `trainer`, todo dentro de la misma
-- transacción que crea el usuario. Si algo falla, no queda un usuario a medias
-- sin tenant, incapaz de entrar a ninguna parte.
--
-- El camino de INVITACIÓN (un gimnasio suma a un entrenador) es la tarea 1.7:
-- ahí el usuario se crea SIN metadatos de registro, así que este trigger solo le
-- hace el perfil y la membresía la otorga quien lo invita.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre text;
  v_tenant uuid;
begin
  v_nombre := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.users (id, email, full_name)
  values (new.id, new.email, v_nombre);

  -- OJO: raw_user_meta_data viene del cliente en el registro, así que aquí solo
  -- se lee un interruptor. El rol y el tipo de tenant están escritos a mano
  -- abajo. Si se leyeran de los metadatos, cualquiera podría registrarse como
  -- super_admin o colarse en un tenant ajeno.
  if new.raw_user_meta_data ->> 'tipo_registro' = 'independiente' then
    insert into public.tenants (type, name)
    values ('solo', coalesce(v_nombre, new.email))
    returning id into v_tenant;

    insert into public.memberships (user_id, tenant_id, role)
    values (new.id, v_tenant, 'trainer');
    -- activar_primer_tenant() deja ese tenant como activo.
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Crea el perfil al registrarse. Si el registro es independiente, además su tenant solo y su membresía.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
