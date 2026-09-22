-- ===========================================================================
-- El método de programación de Giovanni, como DATO (tarea 5.2)
-- ===========================================================================
--
-- La 5.1 fijó la FORMA de un plan sin una sola cifra suya. Esto es lo otro: sus
-- cifras, y solo sus cifras. Series por grupo muscular, repeticiones, RPE,
-- descanso, reparto de la semana, progresión y descarga.
--
-- ---------------------------------------------------------------------------
-- POR QUÉ ESTO ES UNA TABLA Y NO UN ARCHIVO .ts
-- ---------------------------------------------------------------------------
--
-- Por lo mismo que `rules` (§3.1). Sus números no son configuración nuestra:
-- son su método, que es el activo del negocio y que él va a querer cambiar
-- —subir las series de espalda, mover la descarga de la 4ª a la 6ª semana—
-- sin pedirme un despliegue. Escrito en TypeScript, cada retoque suyo es una
-- release mía; escrito aquí, es una fila nueva.
--
-- Mismo trato que la matriz de reglas, y por los mismos motivos:
--   · VERSIONADO. Una fila es inmutable y editar es insertar version+1. Un plan
--     generado en marzo tiene que poder seguir explicando con qué números se
--     generó, aunque en junio él los haya cambiado.
--   · UNA SOLA ACTIVA. Dos métodos activos a la vez es un generador que da dos
--     resultados distintos para el mismo atleta según qué fila lea primero.
--   · SOLO LO LEE EL STAFF. Es el método completo: con una cuenta de cliente se
--     copiaría entero.
--
-- ---------------------------------------------------------------------------
-- QUÉ ES SUYO Y QUÉ ES LECTURA NUESTRA — IMPORTA
-- ---------------------------------------------------------------------------
--
-- Casi todo el contenido de abajo está copiado literal de sus documentos. Hay
-- CUATRO cosas que no dijo con esas palabras y que se derivan; van marcadas una
-- por una con «DERIVADO» y están anotadas en docs/PREGUNTAS-GIOVANNI.md para
-- que las confirme. No se esconden dentro del código porque el día que conteste
-- hay que saber exactamente qué se toca.
--
-- Fuentes: Formulario_Ajustes_Motor_Giova.docx (31-ago),
-- recomendaciones para jh(1).pdf (1-sep), Anexo_Tecnico_..._ATR_v2.pdf,
-- plandiegomafla.pdf (plan real entregado), y sus respuestas del 2-sep.

create table public.training_methods (
  id          uuid primary key default gen_random_uuid(),

  version     integer not null check (version > 0),
  method_data jsonb   not null,

  -- De dónde salió esta versión. No es decorativo: dentro de un año, saber que
  -- las series de espalda vienen de su formulario del 31-ago y no de una
  -- conversación de pasillo es la diferencia entre poder discutirlas y no.
  source      text    not null check (length(btrim(source)) > 0),

  is_active   boolean not null default false,

  created_at  timestamptz not null default now(),
  created_by  uuid references public.users (id),

  unique (version)
);

comment on table public.training_methods is
  'Método de programación de Giovanni (5.2), versionado e inmutable. La forma la valida leerMetodo() en src/domain/metodo.ts.';

comment on column public.training_methods.method_data is
  'Sus cifras: reparto semanal, series por grupo, reps/RPE/descanso por objetivo, progresión y descarga. Vocabulario en src/domain/metodo.ts.';

-- Un solo método activo. Sin esto el generador daría planes distintos para el
-- mismo atleta según qué fila leyera primero, y nadie lo notaría.
create unique index training_methods_uno_activo
  on public.training_methods (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- Forma mínima, igual que con las reglas y con el plan
-- ---------------------------------------------------------------------------
--
-- La base comprueba que esto es un método y no otra cosa; el árbol entero lo
-- valida `leerMetodo` en el dominio, que además da mensajes en español.
--
-- Y otra vez el `coalesce`: si la clave falta, `->>` da NULL, la comparación da
-- NULL y el CHECK PASA. Ya mordió en la 4.2 y en la 5.1.

create or replace function public.metodo_bien_formado(datos jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(datos) = 'object'
    and coalesce(datos->>'version', '') = '1'
    and jsonb_typeof(datos->'parametros') = 'object'
    and jsonb_typeof(datos->'series_semanales') = 'object'
    and jsonb_typeof(datos->'repartos') = 'array'
    and jsonb_array_length(datos->'repartos') > 0;
$$;

comment on function public.metodo_bien_formado(jsonb) is
  'Valida el primer nivel de training_methods.method_data. El resto lo valida leerMetodo() en src/domain/metodo.ts.';

alter table public.training_methods
  add constraint training_methods_bien_formado
  check (public.metodo_bien_formado(method_data));

-- ---------------------------------------------------------------------------
-- Permisos y RLS — calcados de `rules`
-- ---------------------------------------------------------------------------
--
-- Se puede insertar una versión nueva y activarla o retirarla. Reescribir una
-- versión publicada, no: un plan de marzo apunta al método que lo generó.

grant select, insert on public.training_methods to authenticated;
grant update (is_active) on public.training_methods to authenticated;

alter table public.training_methods enable row level security;

create policy metodos_lectura_staff on public.training_methods
  for select to authenticated
  using (public.mi_rol() in ('super_admin', 'gym', 'trainer'));

create policy metodos_inserta_admin on public.training_methods
  for insert to authenticated
  with check (public.mi_rol() = 'super_admin');

create policy metodos_activa_admin on public.training_methods
  for update to authenticated
  using      (public.mi_rol() = 'super_admin')
  with check (public.mi_rol() = 'super_admin');

-- ===========================================================================
-- Versión 1 — lo que dijo, y las cuatro cosas que no dijo
-- ===========================================================================

--
-- El bloque de abajo es JSON literal y no `jsonb_build_object`, por una razón
-- concreta: así `tests/unit/metodo.test.ts` lo lee de esta migración y
-- lo pasa por `leerMetodo`, igual que la 3.3 comprueba la matriz de reglas
-- leyendo su propio SQL. Un método mal escrito no rompe nada al guardarse —lo
-- descubre el entrenador cuando el generador le saca un plan raro— y ese es
-- justo el fallo que hay que atrapar en `npm test`.
--
-- Como el JSON no admite comentarios, lo que iría dentro va aquí, por clave:
--
-- `objetivo_por_meta` — el mapeo de 5 a 3 lo cerró él el 2-sep con la tabla
--   delante. MANTENIMIENTO se queda en `null` a propósito: no lo contestó ni por
--   la mañana ni en la segunda ronda. `null` significa "que elija el
--   entrenador", y el generador se lo pregunta en vez de meterlo en hipertrofia
--   por parecido.
--
-- `periodizacion_por_objetivo` — 2-sep: cuando su anexo (por nivel) y su
--   formulario (por objetivo) chocan, manda el objetivo. Su fila LINEAL se
--   describe solo por nivel ("principiantes"), así que bajo esa regla no la
--   elige nadie: queda para que el entrenador la ponga a mano en el editor.
--   DERIVADO (1).
--
-- `parametros` — su tabla del 31-ago, literal. Del rango de RPE ("8 – 9.5") se
--   toma el piso para las series previas y el techo para la última, que es como
--   está escrito su método: la última serie es la dura. DERIVADO (2). El
--   descanso viene en rango y el plan lleva un número; su plan de Diego lo
--   resuelve —"Multiarticulares 90–120 s, Monoarticulares 60–75 s"—, o sea
--   compuesto arriba del rango y aislamiento abajo. DERIVADO (3).
--
-- `series_semanales` — su tabla del 31-ago, literal. CORE NO ESTÁ, y no es un
--   olvido nuestro: su tabla tiene cinco filas y core no es una. Un grupo sin
--   rango no se inventa; el generador lo prescribe sin tope y lo dice.
--
-- `grupo_por_musculo` — `exercise_library.target_muscle` es texto libre y sus
--   cinco grupos son más gruesos. La traducción es mecánica —Pectoral es
--   Pecho— pero va como dato para que un músculo nuevo se enganche sin tocar
--   código. Lo que no esté aquí no cuenta contra ningún tope, y se avisa.
--
-- `series_por_ejercicio` — su formulario da series POR GRUPO Y SEMANA (10–22);
--   un plan necesita series POR EJERCICIO. El puente lo da el plan que le
--   entregó a Diego: los multiarticulares llevan 4 series y los de aislamiento
--   3, sin una sola excepción en los cinco días. Es §3.4 aplicado al generador.
--   El calentamiento por ejercicio SÍ es nuestro: su plan empieza directo en las
--   series efectivas. DERIVADO (4).
--
-- `ejercicios_por_dia` — también de su plan real: los cinco días de Diego llevan
--   4, 5, 5, 6 y 6 ejercicios. Sin un suelo, un día con pocos patrones —"Pierna"
--   son dos— saldría con dos ejercicios y no llegaría ni de lejos a sus 12–22
--   series de pierna; sin un techo, el full body de 3 días saldría con ocho.
--
-- `progresion` y `descarga` — su respuesta 5, literal. "Cada 4ª o 6ª semana": se
--   carga la 4ª y la otra queda como alternativa que el entrenador elige.
--
-- `fases` — recomendaciones para jh, literal (8–10 min de preparación, 5–10 de
--   recuperación activa, 15–30 de zona 2; se cargan 10, 10 y 20).
--
-- `repartos` — su tabla del 31-ago. Los TÍTULOS son suyos palabra por palabra;
--   los PATRONES de cada día no: él escribió "Torso (Empuje/Tracción)", no ocho
--   claves del catálogo. La traducción es casi mecánica porque sus títulos
--   nombran los patrones, pero es lectura nuestra igual. DERIVADO (1, el
--   grande). Dos decisiones dentro de esa lectura, para que se puedan discutir:
--     · CORE solo entra donde él lo nombra —full body y sus dos días "y core"—.
--       No se cuela en los días de torso "porque siempre se mete".
--     · `musculos` acota además del patrón, y solo existe donde él lo acotó: sus
--       variantes de mujer distinguen "cuádriceps y glúteo" de "isquiosurales y
--       glúteo", y sin ese campo los dos días de pierna saldrían iguales.
--   La variante de mujer de 3 días no la dio: una mujer que entrena tres días
--   entra por el reparto general, que es lo que hay.

insert into public.training_methods (version, source, is_active, method_data)
values (
  1,
  'Formulario_Ajustes_Motor_Giova.docx (31-ago) · recomendaciones para jh (1-sep) · Anexo ATR v2.1 · plandiegomafla.pdf · respuestas del 2-sep',
  true,
  $json$
{
  "version": 1,

  "objetivo_por_meta": {
    "Hipertrofia (Masa Muscular)": "hipertrofia",
    "Pérdida de Grasa": "perdida_grasa",
    "Recomposición Corporal": "hipertrofia",
    "Rendimiento Deportivo": "fuerza",
    "Mantenimiento": null
  },

  "periodizacion_por_objetivo": {
    "fuerza": "ondulante",
    "hipertrofia": "ondulante",
    "perdida_grasa": "atr"
  },

  "parametros": {
    "fuerza": {
      "rep_min": 3, "rep_max": 6,
      "rpe_primeras": 8, "rpe_ultima": 9.5,
      "descanso_min_seg": 180, "descanso_max_seg": 300
    },
    "hipertrofia": {
      "rep_min": 6, "rep_max": 12,
      "rpe_primeras": 7.5, "rpe_ultima": 9,
      "descanso_min_seg": 90, "descanso_max_seg": 180
    },
    "perdida_grasa": {
      "rep_min": 8, "rep_max": 15,
      "rpe_primeras": 7, "rpe_ultima": 8.5,
      "descanso_min_seg": 60, "descanso_max_seg": 90
    }
  },

  "series_semanales": {
    "Pecho":   { "min": 10, "max": 20 },
    "Espalda": { "min": 12, "max": 22 },
    "Piernas": { "min": 12, "max": 22 },
    "Hombro":  { "min": 10, "max": 20 },
    "Brazo":   { "min": 8,  "max": 16 }
  },

  "grupo_por_musculo": {
    "Pectoral": "Pecho",
    "Dorsal": "Espalda",
    "Trapecio": "Espalda",
    "Cuádriceps": "Piernas",
    "Isquiosurales": "Piernas",
    "Glúteo": "Piernas",
    "Gemelos": "Piernas",
    "Deltoides": "Hombro",
    "Bíceps": "Brazo",
    "Tríceps": "Brazo"
  },

  "series_por_ejercicio": {
    "compuesto": 4,
    "aislamiento": 3,
    "minimo": 2,
    "maximo": 5,
    "calentamiento_compuesto": 2,
    "calentamiento_aislamiento": 0
  },

  "ejercicios_por_dia": { "min": 4, "max": 6 },

  "progresion": {
    "tipo": "doble_variable",
    "incremento_min_pct": 2.5,
    "incremento_max_pct": 5,
    "descripcion": "Al completar todas las series en el techo del rango, subir la carga entre 2,5 % y 5 % y reiniciar en el piso del rango."
  },

  "descarga": {
    "cada_semanas": 4,
    "cada_semanas_alternativa": 6,
    "reduccion_volumen_pct": 45,
    "rpe_primeras": 5,
    "rpe_ultima": 6,
    "supercompensacion_despues": true
  },

  "fases": {
    "preparacion": {
      "minutos": 10,
      "bloques": [
        "Movilidad articular dinámica del grupo muscular principal",
        "Estiramiento activo dinámico, sin sostener la posición"
      ]
    },
    "cierre": {
      "recuperacion_activa": { "minutos": 10 },
      "cardio_zona2": { "minutos": 20 }
    }
  },

  "repartos": [
    {
      "dias": 3,
      "sexo": null,
      "plantilla": [
        { "titulo": "Torso",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"] },
        { "titulo": "Pierna",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"] },
        { "titulo": "Full Body",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull",
                       "isolation_accessory", "core_anti_flexion_extension"] }
      ]
    },
    {
      "dias": 4,
      "sexo": null,
      "plantilla": [
        { "titulo": "Torso (Empuje/Tracción)",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"] },
        { "titulo": "Pierna (Cuádriceps/Cadera)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"] },
        { "titulo": "Torso (Enfoque Secundario)",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory"] },
        { "titulo": "Pierna (Enfoque Secundario)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "isolation_accessory"] }
      ]
    },
    {
      "dias": 5,
      "sexo": null,
      "plantilla": [
        { "titulo": "Empuje (Push)",
          "patrones": ["horizontal_push", "vertical_push"] },
        { "titulo": "Tracción (Pull)",
          "patrones": ["horizontal_pull", "vertical_pull"] },
        { "titulo": "Pierna (Legs)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"] },
        { "titulo": "Torso (Upper)",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory"] },
        { "titulo": "Pierna / Rezagos (Lower)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "isolation_accessory"] }
      ]
    },
    {
      "dias": 4,
      "sexo": "femenino",
      "plantilla": [
        { "titulo": "Pierna (cuádriceps y glúteo)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "isolation_accessory"],
          "musculos": ["Cuádriceps", "Glúteo"] },
        { "titulo": "Tren superior",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory"] },
        { "titulo": "Pierna (isquiosurales y glúteo)",
          "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"],
          "musculos": ["Isquiosurales", "Glúteo", "Gemelos"] },
        { "titulo": "Torso y core",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory", "core_anti_flexion_extension"] }
      ]
    },
    {
      "dias": 5,
      "sexo": "femenino",
      "plantilla": [
        { "titulo": "Pierna (cuádriceps y glúteo)",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "isolation_accessory"],
          "musculos": ["Cuádriceps", "Glúteo"] },
        { "titulo": "Tren superior",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory"] },
        { "titulo": "Pierna (isquiosurales y glúteo)",
          "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"],
          "musculos": ["Isquiosurales", "Glúteo", "Gemelos"] },
        { "titulo": "Tren superior y core",
          "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
                       "isolation_accessory", "core_anti_flexion_extension"] },
        { "titulo": "Pierna completa",
          "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera",
                       "isolation_accessory"] }
      ]
    }
  ]
}
$json$::jsonb
);

-- ---------------------------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------------------------

do $$
declare
  activos  integer;
  repartos integer;
begin
  select count(*) into activos from public.training_methods where is_active;
  if activos <> 1 then
    raise exception 'Debía quedar exactamente un método activo, y hay %', activos;
  end if;

  select jsonb_array_length(method_data->'repartos') into repartos
    from public.training_methods where is_active;
  if repartos <> 5 then
    raise exception 'Sus repartos son cinco (3, 4 y 5 días, más 4 y 5 de mujer), y hay %', repartos;
  end if;
end $$;
