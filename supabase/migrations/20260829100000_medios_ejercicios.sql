-- 4.2 — Fotos y video de los ejercicios (Supabase Storage).
--
-- BUCKET PÚBLICO, Y ES UNA DECISIÓN, NO UN DESCUIDO.
--
-- La alternativa son URLs firmadas, que caducan. En Fase B el atleta abre la
-- demostración de un ejercicio en mitad de la serie, con el teléfono en el
-- bolsillo del gimnasio y mala señal: una URL caducada ahí es una pantalla en
-- blanco, y además impide que el navegador y Capacitor cacheen el archivo entre
-- sesiones. Con bucket público la foto se cachea una vez y se ve siempre.
--
-- Lo que se paga a cambio es que quien tenga la URL la puede abrir sin sesión.
-- Por eso el nombre del archivo es un uuid (ver `rutaNueva` en domain/medios.ts):
-- no es adivinable. Y por eso aquí NO va nada de un atleta —esto es la
-- biblioteca global de ejercicios, que es catálogo, no dato de salud—. Las fotos
-- de progreso del atleta (tarea 10.4) son otra historia y van a bucket privado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ejercicios',
  'ejercicios',
  true,
  -- 50 MB. Es el tope duro del servidor; el cliente avisa antes y con un
  -- mensaje que se entiende, pero no se puede confiar en el cliente.
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------
--
-- Mismo reparto que `exercise_library`: la lee todo el mundo, la escribe solo
-- Giovanni. La metodología GQ es el producto (MODELO-DATOS §1.2), y una foto de
-- ejecución es metodología igual que el nombre del ejercicio.

drop policy if exists ejercicios_lectura on storage.objects;
create policy ejercicios_lectura on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ejercicios');

drop policy if exists ejercicios_sube_admin on storage.objects;
create policy ejercicios_sube_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ejercicios' and public.mi_rol() = 'super_admin');

drop policy if exists ejercicios_reemplaza_admin on storage.objects;
create policy ejercicios_reemplaza_admin on storage.objects
  for update to authenticated
  using      (bucket_id = 'ejercicios' and public.mi_rol() = 'super_admin')
  with check (bucket_id = 'ejercicios' and public.mi_rol() = 'super_admin');

drop policy if exists ejercicios_borra_admin on storage.objects;
create policy ejercicios_borra_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'ejercicios' and public.mi_rol() = 'super_admin');

-- ---------------------------------------------------------------------------
-- Forma de media_urls
-- ---------------------------------------------------------------------------
--
-- La columna ya existía como array libre. Ahora que la escribe la interfaz, se
-- fija la forma: cada elemento es {"tipo": "foto"|"video", "path": "..."}.
-- Sin esto, un elemento mal formado no revienta al escribirse sino al leerse,
-- que es dos semanas después y en la pantalla de otra persona.

alter table public.exercise_library
  drop constraint if exists exercise_library_medios_bien_formados;

-- Va en una función porque un CHECK no admite subconsultas, y recorrer un array
-- jsonb obliga a una. `immutable` es lo que permite usarla desde el CHECK.
create or replace function public.medios_bien_formados(medios jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(medios) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(medios) as m
       where jsonb_typeof(m) <> 'object'
          -- `coalesce` y no `m->>'tipo' not in (...)` a secas: sin la clave,
          -- la comparación da NULL, que no es TRUE, y el elemento malo pasaría.
          or coalesce(m->>'tipo', '') not in ('foto', 'video')
          or coalesce(btrim(m->>'path'), '') = ''
     );
$$;

comment on function public.medios_bien_formados(jsonb) is
  'Valida la forma de exercise_library.media_urls: [{tipo, path}].';

alter table public.exercise_library
  add constraint exercise_library_medios_bien_formados
  check (public.medios_bien_formados(media_urls));

comment on column public.exercise_library.media_urls is
  'Fotos y video del ejercicio: [{tipo, path}]. path es la ruta dentro del bucket "ejercicios", no una URL. El primer elemento es la portada.';
