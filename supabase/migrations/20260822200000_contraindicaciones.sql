-- Contraindicaciones en dos familias — respuesta de Giovanni del 2026-08-22.
--
-- "El cruce por listas cerradas es la única forma de evitar fallos. Si dejamos
-- texto libre, el motor pierde precisión." Confirmó la propuesta de usar zonas
-- anatómicas y añadió una segunda familia que no habíamos previsto:
--
--   ANATÓMICA   articulación o zona lesionada  → el motor FILTRA el ejercicio
--   SISTÉMICA   condición fisiológica          → filtra Y AJUSTA la ejecución
--                                                (Valsalva, RIR, posición)
--
-- ---------------------------------------------------------------------------
-- EL AGUJERO QUE DESTAPÓ ESTA RESPUESTA
-- ---------------------------------------------------------------------------
--
-- `athlete_injuries.body_region` nunca tuvo CHECK. El formulario ofrecía un
-- desplegable, pero la base aceptaba cualquier texto, y el propio seed guardaba
-- 'rodilla derecha' y 'zona lumbar' —ninguno del catálogo—.
--
-- O sea que el cruce que da valor a todo esto no estaba blindado en el sitio
-- donde importa. Un desplegable en el cliente no es una restricción: es una
-- sugerencia. La restricción vive en la base o no existe.

-- ---------------------------------------------------------------------------
-- 1. Catálogos como funciones, para no repetir la lista en cuatro sitios
-- ---------------------------------------------------------------------------
--
-- `immutable` es lo que permite usarlas dentro de un CHECK: Postgres exige que
-- la condición dé siempre el mismo resultado para la misma fila.

create or replace function public.zonas_anatomicas()
returns jsonb language sql immutable parallel safe as $$
  select '["Cervical","Dorsal","Lumbar","Hombro","Codo",
           "Muñeca/Antebrazo","Cadera","Rodilla","Tobillo","Pie"]'::jsonb;
$$;

create or replace function public.condiciones_sistemicas()
returns jsonb language sql immutable parallel safe as $$
  select '["Hipertensión / Cardiovascular","Embarazo",
           "Hernia discal / Patología axial","Diástasis abdominal"]'::jsonb;
$$;

comment on function public.zonas_anatomicas is
  'Catálogo cerrado de zonas del cuerpo. Lo comparten las lesiones del atleta y las contraindicaciones del ejercicio: es lo que hace que el cruce sea exacto.';

-- ---------------------------------------------------------------------------
-- 2. Lesiones del atleta: se rescata lo rescatable y se cierra la puerta
-- ---------------------------------------------------------------------------
--
-- Las etiquetas cambian de forma ("zona lumbar" → "Lumbar", "Muñeca" →
-- "Muñeca/Antebrazo") para hablar el vocabulario que él fijó. Lo que ya está
-- guardado se migra por prefijo: "rodilla derecha" es una lesión de Rodilla.

update public.athlete_injuries
   set body_region = case
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^(zona |region |columna )?cervical'   then 'Cervical'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^(zona |region |columna )?dorsal'     then 'Dorsal'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^(zona |region |columna )?lumbar'     then 'Lumbar'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^hombro'                              then 'Hombro'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^codo'                                then 'Codo'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^(muneca|antebrazo)'                  then 'Muñeca/Antebrazo'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^cadera'                              then 'Cadera'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^rodilla'                             then 'Rodilla'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^tobillo'                             then 'Tobillo'
     when btrim(translate(lower(body_region), 'áéíóúñü', 'aeiounu')) ~ '^pie'                                 then 'Pie'
     else body_region
   end
 where body_region is not null;

-- `not valid` a propósito: lo que quede fuera del catálogo son filas escritas
-- cuando no había catálogo, y tirar la migración por ellas sería castigar al
-- usuario por un descuido nuestro. Se bloquea toda escritura NUEVA, que es lo
-- que impedía que el agujero se siguiera ensanchando. Cuando los datos estén
-- limpios se valida con `alter table ... validate constraint`.
alter table public.athlete_injuries
  add constraint lesiones_zona_catalogo
  check (jsonb_exists(public.zonas_anatomicas(), body_region)) not valid;

comment on column public.athlete_injuries.body_region is
  'Zona anatómica del catálogo cerrado. Es la llave con la que el motor cruza la lesión contra las contraindicaciones del ejercicio.';

-- ---------------------------------------------------------------------------
-- 3. Contraindicaciones del ejercicio: las dos familias en la misma columna
-- ---------------------------------------------------------------------------
--
-- Una sola columna y no dos porque para el motor son lo mismo en el momento de
-- cruzar —"¿tiene el atleta algo de esta lista?"— y solo divergen DESPUÉS, al
-- decidir si excluye el ejercicio o le cambia la ejecución. Esa diferencia la
-- sabe el catálogo, no hace falta duplicar la columna para expresarla.
--
-- `<@` es contención de jsonb: todo elemento del array tiene que estar en el
-- catálogo. Una lista vacía cumple, que es lo correcto para un ejercicio sin
-- contraindicaciones.

alter table public.exercise_library
  add constraint exercise_contraindicaciones_catalogo check (
    contraindications <@ (public.zonas_anatomicas() || public.condiciones_sistemicas())
  );

comment on column public.exercise_library.contraindications is
  'Lista cerrada. Zonas anatómicas (el motor filtra) y condiciones sistémicas (el motor filtra y ajusta la ejecución). Ver src/domain/contraindicaciones.ts.';
