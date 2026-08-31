-- ===========================================================================
-- Relaciones entre ejercicios (tarea 4.3)
-- ===========================================================================
--
-- La tabla `exercise_variants` existe desde la migración 1.3 con `relation_type`
-- como texto libre y un "PENDIENTE DE GIOVANNI: ¿variante, sustitución,
-- progresión, regresión?". Sigue sin cerrarlo, y ya no se puede esperar: el
-- motor tiene que INTERPRETAR el tipo para decidir si una relación sirve como
-- alternativa de seguridad, y con texto libre lo que no entienda lo ignoraría
-- en silencio — el fallo más caro de este proyecto.
--
-- Se fija el conjunto mínimo que el motor sabe leer. Si él añade vocabulario, se
-- amplía aquí y en `domain/relaciones.ts` a la vez.
--
-- ---------------------------------------------------------------------------
-- LA DIRECCIÓN ES LA MITAD DEL SIGNIFICADO
-- ---------------------------------------------------------------------------
--
-- Cada fila se lee «de `exercise_id` hacia `variant_exercise_id`»:
--
--   equivalente → mismo estímulo. Vale en las dos direcciones.
--   regresion   → el destino es MÁS ACCESIBLE. Sustituye al origen, no al revés.
--   progresion  → el destino es MÁS EXIGENTE. Nunca es alternativa de seguridad.
--
-- Que la Goblet sustituya a la Sentadilla Profunda permite ofrecerla cuando la
-- profunda se cae. Al revés no: mandar la profunda a quien no puede con la
-- Goblet es mandarle algo más duro justo cuando algo ya le duele.
--
-- Los tres nombres son de Giovanni: "equivalencia biomecánica" es como llama a
-- esta matriz, y `sustituir_por` es la acción que ya usa su matriz de reglas.

alter table public.exercise_variants
  drop constraint if exists exercise_variants_tipo_conocido;

alter table public.exercise_variants
  add constraint exercise_variants_tipo_conocido
  check (relation_type in ('equivalente', 'sustitucion', 'progresion'));

-- ---------------------------------------------------------------------------
-- Una pareja, un tipo
-- ---------------------------------------------------------------------------
--
-- La clave primaria incluye `relation_type`, así que hoy la misma pareja podría
-- guardarse como regresión Y como progresión a la vez: el destino sería más
-- fácil y más difícil que el origen al mismo tiempo. No falla nada, y el motor
-- lo ofrecería igual. Se cierra con un índice.
--
-- La contradicción cruzada —A regresión de B *y* B regresión de A, en dos filas
-- con distinto origen— no se puede expresar como restricción de tabla; la
-- atrapa `conflictoDeRelacion` en el editor.

create unique index if not exists exercise_variants_una_por_pareja
  on public.exercise_variants (exercise_id, variant_exercise_id);

comment on column public.exercise_variants.relation_type is
  'equivalente | sustitucion | progresion. Se lee de exercise_id hacia variant_exercise_id: en una sustitución, el destino es el que entra.';

comment on table public.exercise_variants is
  'Matriz de equivalencia biomecánica (4.3). Segunda fuente de sustitutos del motor, independiente de las reglas: las exclusiones por contraindicación no pasan por `rules` y sin esto no ofrecen alternativa.';

-- ---------------------------------------------------------------------------
-- Carga inicial: lo que sus propias reglas ya declaran
-- ---------------------------------------------------------------------------
--
-- La matriz no arranca vacía. Cinco reglas de su matriz del 25-ago ya llevan
-- `sustituir_por`, o sea que Giovanni YA dijo qué dar cuando cada uno de esos
-- ejercicios se cae. Eso es exactamente el contenido de esta tabla, solo que
-- atrapado dentro de una condición.
--
-- Se DERIVA en SQL en vez de transcribirse a mano, para que no pueda divergir
-- de su fuente: si mañana él edita una regla, esta migración sigue contando lo
-- que decían el día que se cargó, y una futura no tendrá que adivinar de dónde
-- salió cada fila.
--
-- LA DIFERENCIA CON LA REGLA, que es el motivo de la tarea: dentro de la regla,
-- «Prensa 45° sustituye a la Sentadilla Profunda» solo vale cuando se cumple SU
-- condición —dorsiflexión severa—. Aquí vale siempre, y por eso cubre el caso
-- que ninguna regla cubre: cuando el ejercicio se cae por el CRUCE DE
-- CONTRAINDICACIONES, que no pasa por `rules`.
--
-- 20 parejas, comprobadas antes de cargar: ninguna aparece en las dos
-- direcciones y todos los nombres resuelven contra la biblioteca.

insert into public.exercise_variants (exercise_id, variant_exercise_id, relation_type, notes)
select distinct o.id, s.id, 'sustitucion',
       'Derivada de la acción sustituir_por de sus reglas (migración 4.3).'
  from public.rules r
  cross join lateral jsonb_array_elements_text(r.actions->'excluir_ejercicios') as ex(nombre)
  cross join lateral jsonb_array_elements_text(r.actions->'sustituir_por')      as su(nombre)
  join public.exercise_library o on o.name = ex.nombre
  join public.exercise_library s on s.name = su.nombre
 where r.is_active
   and r.actions ? 'sustituir_por'
   and o.id <> s.id
on conflict do nothing;

-- Red de seguridad: si los nombres de las reglas dejaran de casar con la
-- biblioteca, el insert no fallaría — cargaría menos filas y nadie se enteraría.
do $$
declare cuantas integer;
begin
  select count(*) into cuantas from public.exercise_variants
   where relation_type = 'sustitucion';

  if cuantas < 20 then
    raise exception 'Se esperaban al menos 20 sustituciones derivadas de las reglas y hay %', cuantas;
  end if;
end $$;
