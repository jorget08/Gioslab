-- ===========================================================================
-- Método v5 — bloques en tres fases, ATR para rendimiento deportivo y días
-- de pierna sin tren superior (5.2)
-- ===========================================================================
--
-- Lo que Giovanni pidió el 3-nov después de probar la v4:
--
-- 1. BLOQUES EN TRES FASES. "Bloque 1: Acumulación S1-S4, Bloque 2:
--    Transmutación S5-S8, Bloque 3: Intensificación S9-S12". La v4 tenía dos
--    (Base e Intensificación) sacados de gymapp. Las cifras de Acumulación y
--    Transmutación son las de su PDF "Planificación de mesociclos" (Bloques
--    Modificados): 8-12 repeticiones a RPE 8, y 4-8 a RPE 9.
--
--      Acumulación      S1     3 × 8-12  RPE 7   (semana de entrada, como gymapp)
--                       S2-4   4 × 8-12  RPE 8   (PDF)
--      Transmutación    S5-8   4 × 4-8   RPE 9   (PDF)
--      Intensificación  S9-12  3 × 3-6   RPE 9   DERIVADO: el PDF no la define
--                                               (su tercer bloque era un taper)
--
--    Y "la duración de los bloques… dependiendo del atleta… poder
--    seleccionar eso": `minimo_por_bloque` deja que el entrenador acorte cada
--    bloque. Con 3 + 3 + 2 de mínimo el mesociclo va de 8 a 12 semanas, que es
--    lo que dijo el 27-oct. Al acortar se quitan las últimas semanas del bloque.
--
-- 2. ATR PARA RENDIMIENTO DEPORTIVO. Consultó con sus especialistas: "ese
--    esquema que tengo en el PDF es para cualquier deporte, porque la parte
--    específica la hace el entrenador… aplícalo a nivel general". Va por META
--    (`periodizacion_por_meta`), no por objetivo: el objetivo de esa meta es
--    "fuerza", y atar el ATR a "fuerza" se lo daría a quien no hace deporte.
--    La tabla es su ATR Restringido, 2 + 2 + 2:
--
--      Acumulación      S1-2   5 × 5-6   RPE 8   (SQ 5×6, BP 6×6, DL 5×5)
--      Transformación   S3-4   5 × 2-3   RPE 9   (SQ 5×3 @ 9, BP 5×3 @ 9,5, DL 4×2 @ 9,5)
--      Realización      S5     3 × 2     RPE 8
--                       S6     1 × 1     RPE 9   toma de marcas; el RPE es DERIVADO
--
-- 3. DÍAS DE PIERNA SOLO PIERNA Y CORE. "El algoritmo continúa insertando
--    accesorios del tren superior (Elevaciones Laterales, Curl Martillo) en
--    los días de pierna… que se mantengan estrictamente exclusivos de su
--    patrón y de core… evitando la mezcla de segmentos en todos los modelos".
--    Esos días tenían `isolation_accessory` sin acotar por músculo, así que
--    cualquier aislamiento cabía. Se acotan como ya lo estaban sus días de
--    mujer. Y al revés también: acotada la pierna, el ajuste de volumen
--    empezó a meter extensiones de cuádriceps y patadas de glúteo en los días
--    de torso (ya pasaba en sus "Tren superior" de mujer), así que los días de
--    torso se acotan a tren superior y core. El Full Body no se toca. Si entra
--    un músculo nuevo en la biblioteca, hay que añadirlo aquí.
--
-- `repartos` y `modelos` van ENTEROS: `||` mezcla por arriba y sin recursión.

update public.training_methods
   set is_active = false
 where is_active;

insert into public.training_methods (version, source, is_active, method_data)
select
  5,
  'Método v4 + bloques en 3 fases con duración elegible, ATR para rendimiento deportivo y pierna sin tren superior (3-nov)',
  true,
  method_data || $json$
{
  "periodizacion_por_meta": {
    "Rendimiento Deportivo": "atr"
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
      "minimo_por_bloque": { "Acumulación": 3, "Transmutación": 3, "Intensificación": 2 },
      "semanas": [
        { "series": 3, "rep_min": 8, "rep_max": 12, "rpe": 7, "bloque": "Acumulación" },
        { "series": 4, "rep_min": 8, "rep_max": 12, "rpe": 8, "bloque": "Acumulación" },
        { "series": 4, "rep_min": 8, "rep_max": 12, "rpe": 8, "bloque": "Acumulación" },
        { "series": 4, "rep_min": 8, "rep_max": 12, "rpe": 8, "bloque": "Acumulación" },
        { "series": 4, "rep_min": 4, "rep_max": 8,  "rpe": 9, "bloque": "Transmutación" },
        { "series": 4, "rep_min": 4, "rep_max": 8,  "rpe": 9, "bloque": "Transmutación" },
        { "series": 4, "rep_min": 4, "rep_max": 8,  "rpe": 9, "bloque": "Transmutación" },
        { "series": 4, "rep_min": 4, "rep_max": 8,  "rpe": 9, "bloque": "Transmutación" },
        { "series": 3, "rep_min": 3, "rep_max": 6,  "rpe": 9, "bloque": "Intensificación" },
        { "series": 3, "rep_min": 3, "rep_max": 6,  "rpe": 9, "bloque": "Intensificación" },
        { "series": 3, "rep_min": 3, "rep_max": 6,  "rpe": 9, "bloque": "Intensificación" },
        { "series": 3, "rep_min": 3, "rep_max": 6,  "rpe": 9, "bloque": "Intensificación" }
      ]
    },
    "atr": {
      "semanas": [
        { "series": 5, "rep_min": 5, "rep_max": 6, "rpe": 8, "bloque": "Acumulación" },
        { "series": 5, "rep_min": 5, "rep_max": 6, "rpe": 8, "bloque": "Acumulación" },
        { "series": 5, "rep_min": 2, "rep_max": 3, "rpe": 9, "bloque": "Transformación" },
        { "series": 5, "rep_min": 2, "rep_max": 3, "rpe": 9, "bloque": "Transformación" },
        { "series": 3, "rep_min": 2, "rep_max": 2, "rpe": 8, "bloque": "Realización" },
        { "series": 1, "rep_min": 1, "rep_max": 1, "rpe": 9, "bloque": "Realización" }
      ]
    }
  },
  "repartos": [
    {
      "dias": 3,
      "sexo": null,
      "plantilla": [
        {"titulo": "Torso", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]},
        {"titulo": "Full Body", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"]}
      ]
    },
    {
      "dias": 4,
      "sexo": null,
      "plantilla": [
        {"titulo": "Torso (Empuje/Tracción)", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna (Cuádriceps/Cadera)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]},
        {"titulo": "Torso (Enfoque Secundario)", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna (Enfoque Secundario)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]}
      ]
    },
    {
      "dias": 5,
      "sexo": null,
      "plantilla": [
        {"titulo": "Empuje (Push)", "patrones": ["horizontal_push", "vertical_push"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Tracción (Pull)", "patrones": ["horizontal_pull", "vertical_pull"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna (Legs)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]},
        {"titulo": "Torso (Upper)", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna / Rezagos (Lower)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]}
      ]
    },
    {
      "dias": 4,
      "sexo": "femenino",
      "plantilla": [
        {"titulo": "Pierna (cuádriceps y glúteo)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Cuádriceps", "Glúteo"]},
        {"titulo": "Tren superior", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna (isquiosurales y glúteo)", "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Isquiosurales", "Glúteo", "Gemelos"]},
        {"titulo": "Torso y core", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]}
      ]
    },
    {
      "dias": 5,
      "sexo": "femenino",
      "plantilla": [
        {"titulo": "Pierna (cuádriceps y glúteo)", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Cuádriceps", "Glúteo"]},
        {"titulo": "Tren superior", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna (isquiosurales y glúteo)", "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Isquiosurales", "Glúteo", "Gemelos"]},
        {"titulo": "Tren superior y core", "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"], "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Trapecio", "Core"]},
        {"titulo": "Pierna completa", "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Core"]}
      ]
    }
  ]
}
$json$::jsonb
from public.training_methods
where version = 4;

do $$
begin
  if (select count(*) from public.training_methods
       where is_active and version = 5
         and method_data #>> '{periodizacion_por_meta,Rendimiento Deportivo}' = 'atr'
         and method_data #>> '{periodizacion_por_nivel,Avanzado}' = 'bloques'
         and jsonb_array_length(method_data #> '{modelos,bloques,semanas}') = 12
         and jsonb_array_length(method_data #> '{modelos,atr,semanas}') = 6
         and jsonb_array_length(method_data #> '{modelos,lineal,semanas}') = 6
         and jsonb_array_length(method_data -> 'repartos') = 5) <> 1 then
    raise exception 'El método v5 debía quedar activo con bloques, ATR y lineal.';
  end if;
end $$;
