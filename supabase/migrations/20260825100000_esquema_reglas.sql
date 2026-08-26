-- 3.1 — Esquema de las reglas del motor.
--
-- La tabla `rules` existe desde la 1.3 con `condition` y `actions` como jsonb
-- libre: lo único que se exigía era que fueran objetos. Con la matriz de
-- Giovanni en la mano ya se puede fijar la forma.
--
-- ---------------------------------------------------------------------------
-- EL NIVEL DEL MOTOR ES UNA COLUMNA, NO UN CAMPO DEL JSON
-- ---------------------------------------------------------------------------
--
-- Su matriz organiza las reglas en cuatro niveles que son un ORDEN DE
-- EJECUCIÓN: primero se filtra por seguridad, después se modula el volumen,
-- después se reparten los vectores y al final se fija el volumen base.
--
-- Va en columna porque el motor va a pedir "dame las reglas activas del nivel
-- 1" en cada evaluación, y eso tiene que poder indexarse. Dentro del jsonb
-- sería un filtro sobre datos sin índice en la consulta más caliente del
-- producto.
--
-- OJO: `nivel` y `evidence_level` NO son lo mismo y no se pueden fusionar.
--   nivel           ordena    → el 1 se evalúa antes que el 2
--   evidence_level  desempata → entre dos reglas DEL MISMO nivel que chocan
-- Si se mezclaran, una regla de composición corporal con respaldo científico
-- fuerte podría anular una de seguridad. Justo lo que no debe pasar.

alter table public.rules
  add column nivel smallint not null default 1
    check (nivel between 1 and 4);

-- El default existía solo para poder rellenar las filas ya sembradas, que son
-- todas filtros de seguridad. A partir de aquí el nivel se declara siempre:
-- dejarlo implícito invita a que todo acabe en el nivel 1 por descuido.
alter table public.rules alter column nivel drop default;

comment on column public.rules.nivel is
  'Orden de ejecución del motor (1 seguridad, 2 fisiología, 3 vectores, 4 composición). Distinto de evidence_level, que desempata dentro de un mismo nivel.';

-- El motor pide las reglas activas de un nivel en cada evaluación.
create index rules_nivel_activas_idx on public.rules (nivel) where is_active;

-- ---------------------------------------------------------------------------
-- Forma mínima de la condición y de las acciones
-- ---------------------------------------------------------------------------
--
-- Aquí solo se comprueba el ESQUELETO. Que el operador tenga sentido para el
-- tipo de hecho, que el valor esté en su dominio o que los ratios sumen 1 se
-- valida en src/domain/reglas.ts: expresar eso en SQL sobre jsonb sería
-- ilegible y no se podría probar con casos como se prueba allí.
--
-- Lo que sí se impide en la base es lo que dejaría el motor en un estado
-- absurdo: una regla sin condición dispararía en todas las evaluaciones, y una
-- sin acciones se evaluaría cada vez para no hacer nada.

-- OJO CON EL NULL. `jsonb_typeof(condition -> 'todas')` devuelve NULL cuando la
-- clave no existe, y un CHECK que evalúa a NULL se considera SATISFECHO. Sin el
-- coalesce, la forma vieja `{"femur_class":"Largo"}` pasaba tan campante: la
-- restricción existía y no restringía nada. Lo cazó la suite 1.3.
alter table public.rules
  add constraint rules_condicion_con_predicados check (
    coalesce(jsonb_typeof(condition -> 'todas') = 'array', false)
    and coalesce(jsonb_array_length(condition -> 'todas') > 0, false)
  ),
  -- Comparar contra el objeto vacío y no contar sus claves: Postgres no admite
  -- subconsultas en un CHECK, y `jsonb_object_keys` devuelve un conjunto.
  add constraint rules_acciones_no_vacias check (
    jsonb_typeof(actions) = 'object' and actions <> '{}'::jsonb
  );

comment on column public.rules.condition is
  'Predicados que se cumplen TODOS: {"todas":[{"hecho":…,"op":…,"valor":…}]}. El vocabulario de hechos y operadores está en src/domain/reglas.ts.';

comment on column public.rules.actions is
  'Qué hace la regla: excluir, sustituir, priorizar, modificador, volumen_factor, rir, ratio_patron, volumen_series. Ver src/domain/reglas.ts.';
