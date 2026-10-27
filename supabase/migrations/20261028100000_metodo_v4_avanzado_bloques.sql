-- ===========================================================================
-- Método v4 — el avanzado se programa POR BLOQUES, de 8 a 12 semanas (5.2)
-- ===========================================================================
--
-- Giovanni, 27-oct, probando con un atleta Avanzado que le salió "Ondulante ·
-- 5 semanas": "el avanzado, el modelo es por bloques como el que tú tienes en
-- tu app, y no es de 5 semanas: ese modelo es de 8 hasta 12 semanas, muy
-- parecido a la programación de tu app".
--
-- "Tu app" es gymapp, que CLAUDE.md pone al mismo nivel que sus Excels:
-- especificación funcional, no inspiración. Su programa es de 12 semanas en
-- dos bloques, y de ahí sale la tabla. DERIVADO, para que él la confirme:
--
--   Bloque Base             semana 1      2 series, RPE 6,5 / 7,5  (introducción)
--                           semanas 2-5   3 series, RPE del objetivo
--   Bloque Intensificación  semana 6      2 series, RPE 6,5 / 7,5  (descarga del bloque anterior)
--                           semanas 7-10  3 series, RPE del objetivo
--                           semanas 11-12 4 series, RPE del objetivo
--
-- Lo que se toma de gymapp es la ESTRUCTURA: cada bloque arranca con una
-- semana suave de dos series y el volumen sube hasta cuatro al final. Lo que
-- NO se toma: el fallo en la última serie (RPE 10), que choca con el RPE de su
-- método; ahí manda el objetivo. Tampoco el cambio de ejercicios entre
-- bloques: el plan mantiene los mismos ejercicios todo el mesociclo. Las
-- repeticiones salen del objetivo, igual que en gymapp salen del ejercicio.
--
-- Su PDF de mesociclos describía otro bloques (7 semanas, PPL de 6 días). Su
-- mensaje del 27-oct lo corrige: 8 a 12 semanas, como la app. Se aplica el
-- mensaje, que es posterior.
--
-- Solo "Avanzado": es el nivel que nombró. "Deportista" y "Culturista /
-- Competidor" siguen por su objetivo hasta que lo diga.

alter table public.workout_plans
  drop constraint if exists workout_plans_periodizacion_conocida;

alter table public.workout_plans
  add constraint workout_plans_periodizacion_conocida
  check (periodization_type is null
         or periodization_type in ('lineal', 'ondulante', 'bloques', 'atr'));

comment on column public.workout_plans.periodization_type is
  'lineal | ondulante | bloques | atr. Bloques separado del ATR el 27-oct.';

update public.training_methods
   set is_active = false
 where is_active;

-- `periodizacion_por_nivel` y `modelos` van ENTEROS, con lo de la v3 dentro:
-- `||` mezcla por arriba y sin recursión, así que una clave a medias borraría
-- el principiante y el lineal.
insert into public.training_methods (version, source, is_active, method_data)
select
  4,
  'Método v3 + avanzado → bloques de 12 semanas con la estructura de gymapp (27-oct)',
  true,
  method_data || $json$
{
  "periodizacion_por_nivel": {
    "Principiante": "lineal",
    "Avanzado": "bloques"
  },
  "modelos": {
    "lineal": {
      "semanas": [
        { "series": 3, "rep_min": 10, "rep_max": 12, "rpe": 6 },
        { "series": 3, "rep_min": 10, "rep_max": 12, "rpe": 6.5 },
        { "series": 3, "rep_min": 8,  "rep_max": 10, "rpe": 7 },
        { "series": 4, "rep_min": 8,  "rep_max": 8,  "rpe": 7.5 },
        { "series": 4, "rep_min": 6,  "rep_max": 8,  "rpe": 8 },
        { "series": 2, "rep_min": 8,  "rep_max": 8,  "rpe": 6, "descarga": true }
      ]
    },
    "bloques": {
      "semanas": [
        { "series": 2, "rpe_primeras": 6.5, "rpe_ultima": 7.5, "bloque": "Base" },
        { "series": 3, "bloque": "Base" },
        { "series": 3, "bloque": "Base" },
        { "series": 3, "bloque": "Base" },
        { "series": 3, "bloque": "Base" },
        { "series": 2, "rpe_primeras": 6.5, "rpe_ultima": 7.5, "bloque": "Intensificación", "descarga": true },
        { "series": 3, "bloque": "Intensificación" },
        { "series": 3, "bloque": "Intensificación" },
        { "series": 3, "bloque": "Intensificación" },
        { "series": 3, "bloque": "Intensificación" },
        { "series": 4, "bloque": "Intensificación" },
        { "series": 4, "bloque": "Intensificación" }
      ]
    }
  }
}
$json$::jsonb
from public.training_methods
where version = 3;

do $$
begin
  if (select count(*) from public.training_methods
       where is_active and version = 4
         and method_data #>> '{periodizacion_por_nivel,Principiante}' = 'lineal'
         and method_data #>> '{periodizacion_por_nivel,Avanzado}' = 'bloques'
         and jsonb_array_length(method_data #> '{modelos,lineal,semanas}') = 6
         and jsonb_array_length(method_data #> '{modelos,bloques,semanas}') = 12) <> 1 then
    raise exception 'El método v4 debía quedar activo con lineal y bloques.';
  end if;
end $$;
