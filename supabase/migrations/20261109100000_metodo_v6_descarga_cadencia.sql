-- ===========================================================================
-- Método v6 — descarga al final de bloques, Realización del ATR más dura,
-- cadencia por defecto y los músculos nuevos de la biblioteca (5.2)
-- ===========================================================================
--
-- Lo que Giovanni pidió el 9-nov después de probar la v5:
--
-- 1. DESCARGA EN BLOQUES. "Esto está full, solo faltaría la descarga." Una
--    semana más al final, como su propio bloque "Descarga" con mínimo 0: el
--    entrenador la puede quitar desde el mismo selector que acorta los
--    bloques. Así el mesociclo va de 8 a 13 semanas.
--
--      Descarga  S13  2 × 3-6  RPE 6   DERIVADO de su descarga general (−45 %
--                                      de series y RPE 5-6) aplicada sobre la
--                                      Intensificación (3 × 3-6). Por confirmar.
--
-- 2. REALIZACIÓN DEL ATR. "Para una fase de Realización pura enfocada en la
--    expresión de fuerza máxima y peaking, el parámetro de intensidad debe
--    escalar de manera agresiva hacia un RPE de 9 o 9.5."
--
--      Realización  S5  3 × 2  RPE 9     (antes 8)
--                   S6  1 × 1  RPE 9.5   (antes 9)
--
-- 3. CADENCIA. "Los valores de cadencia (ej. 3010)… deben quedar claramente
--    visibles y editables". Va por objetivo en `parametros` y el entrenador la
--    cambia por ejercicio. 3010 en los tres es SU EJEMPLO, no una tabla suya:
--    está pendiente que diga si cambia por objetivo o por bloque.
--
-- 4. ADUCTORES Y ANTEBRAZO. La biblioteca de 108 trae dos grupos que el método
--    no conocía. Sin esto sus ejercicios no caben en ningún día acotado y no
--    cuentan para ningún volumen semanal. Aductores va con Piernas y en los
--    días de pierna que llevan cuádriceps; Antebrazo con Brazo y en los de
--    tren superior.
--
-- `modelos`, `parametros`, `grupo_por_musculo` y `repartos` van ENTEROS: `||`
-- mezcla por arriba y sin recursión.

update public.training_methods
   set is_active = false
 where is_active;

insert into public.training_methods (version, source, is_active, method_data)
select
  6,
  'Método v5 + descarga al final de bloques, Realización del ATR a RPE 9-9,5, cadencia 3010 y aductores/antebrazo (9-nov)',
  true,
  method_data || $json$
{
 "modelos": {
  "atr": {
   "semanas": [
    {"bloque": "Acumulación", "rep_max": 6, "rep_min": 5, "rpe": 8, "series": 5},
    {"bloque": "Acumulación", "rep_max": 6, "rep_min": 5, "rpe": 8, "series": 5},
    {"bloque": "Transformación", "rep_max": 3, "rep_min": 2, "rpe": 9, "series": 5},
    {"bloque": "Transformación", "rep_max": 3, "rep_min": 2, "rpe": 9, "series": 5},
    {"bloque": "Realización", "rep_max": 2, "rep_min": 2, "rpe": 9, "series": 3},
    {"bloque": "Realización", "rep_max": 1, "rep_min": 1, "rpe": 9.5, "series": 1}
   ]
  },
  "bloques": {
   "minimo_por_bloque": {"Acumulación": 3, "Intensificación": 2, "Transmutación": 3, "Descarga": 0},
   "semanas": [
    {"bloque": "Acumulación", "rep_max": 12, "rep_min": 8, "rpe": 7, "series": 3},
    {"bloque": "Acumulación", "rep_max": 12, "rep_min": 8, "rpe": 8, "series": 4},
    {"bloque": "Acumulación", "rep_max": 12, "rep_min": 8, "rpe": 8, "series": 4},
    {"bloque": "Acumulación", "rep_max": 12, "rep_min": 8, "rpe": 8, "series": 4},
    {"bloque": "Transmutación", "rep_max": 8, "rep_min": 4, "rpe": 9, "series": 4},
    {"bloque": "Transmutación", "rep_max": 8, "rep_min": 4, "rpe": 9, "series": 4},
    {"bloque": "Transmutación", "rep_max": 8, "rep_min": 4, "rpe": 9, "series": 4},
    {"bloque": "Transmutación", "rep_max": 8, "rep_min": 4, "rpe": 9, "series": 4},
    {"bloque": "Intensificación", "rep_max": 6, "rep_min": 3, "rpe": 9, "series": 3},
    {"bloque": "Intensificación", "rep_max": 6, "rep_min": 3, "rpe": 9, "series": 3},
    {"bloque": "Intensificación", "rep_max": 6, "rep_min": 3, "rpe": 9, "series": 3},
    {"bloque": "Intensificación", "rep_max": 6, "rep_min": 3, "rpe": 9, "series": 3},
    {"series": 2, "rep_min": 3, "rep_max": 6, "rpe": 6, "bloque": "Descarga", "descarga": true}
   ]
  },
  "lineal": {
   "semanas": [
    {"rep_max": 12, "rep_min": 10, "rpe": 6, "series": 3},
    {"rep_max": 12, "rep_min": 10, "rpe": 6.5, "series": 3},
    {"rep_max": 10, "rep_min": 8, "rpe": 7, "series": 3},
    {"rep_max": 8, "rep_min": 8, "rpe": 7.5, "series": 4},
    {"rep_max": 8, "rep_min": 6, "rpe": 8, "series": 4},
    {"descarga": true, "rep_max": 8, "rep_min": 8, "rpe": 6, "series": 2}
   ]
  }
 },
 "parametros": {
  "fuerza": {"descanso_max_seg": 300, "descanso_min_seg": 180, "rep_max": 6, "rep_min": 3, "rpe_primeras": 8, "rpe_ultima": 9.5, "cadencia": "3010"},
  "hipertrofia": {"descanso_max_seg": 180, "descanso_min_seg": 90, "rep_max": 12, "rep_min": 6, "rpe_primeras": 7.5, "rpe_ultima": 9, "cadencia": "3010"},
  "perdida_grasa": {"descanso_max_seg": 90, "descanso_min_seg": 60, "rep_max": 15, "rep_min": 8, "rpe_primeras": 7, "rpe_ultima": 8.5, "cadencia": "3010"}
 },
 "grupo_por_musculo": {"Bíceps": "Brazo", "Cuádriceps": "Piernas", "Deltoides": "Hombro", "Dorsal": "Espalda", "Gemelos": "Piernas", "Glúteo": "Piernas", "Isquiosurales": "Piernas", "Pectoral": "Pecho", "Trapecio": "Espalda", "Tríceps": "Brazo", "Aductores": "Piernas", "Antebrazo": "Brazo"},
 "repartos": [
  {"dias": 3, "sexo": null, "plantilla": [
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"], "titulo": "Torso"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "titulo": "Pierna"},
   {"patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"], "titulo": "Full Body"}
  ]},
  {"dias": 4, "sexo": null, "plantilla": [
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"], "titulo": "Torso (Empuje/Tracción)"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "titulo": "Pierna (Cuádriceps/Cadera)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "titulo": "Torso (Enfoque Secundario)"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna (Enfoque Secundario)"}
  ]},
  {"dias": 5, "sexo": null, "plantilla": [
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push"], "titulo": "Empuje (Push)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_pull", "vertical_pull"], "titulo": "Tracción (Pull)"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera"], "titulo": "Pierna (Legs)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "titulo": "Torso (Upper)"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna / Rezagos (Lower)"}
  ]},
  {"dias": 4, "sexo": "femenino", "plantilla": [
   {"musculos": ["Cuádriceps", "Aductores", "Glúteo"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna (cuádriceps y glúteo)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "titulo": "Tren superior"},
   {"musculos": ["Isquiosurales", "Glúteo", "Gemelos"], "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna (isquiosurales y glúteo)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"], "titulo": "Torso y core"}
  ]},
  {"dias": 5, "sexo": "femenino", "plantilla": [
   {"musculos": ["Cuádriceps", "Aductores", "Glúteo"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna (cuádriceps y glúteo)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory"], "titulo": "Tren superior"},
   {"musculos": ["Isquiosurales", "Glúteo", "Gemelos"], "patrones": ["hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna (isquiosurales y glúteo)"},
   {"musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "isolation_accessory", "core_anti_flexion_extension"], "titulo": "Tren superior y core"},
   {"musculos": ["Cuádriceps", "Glúteo", "Isquiosurales", "Gemelos", "Aductores", "Core"], "patrones": ["squat_dominante_rodilla", "hip_hinge_dominante_cadera", "isolation_accessory"], "titulo": "Pierna completa"}
  ]}
 ]
}
$json$::jsonb
from public.training_methods
where version = 5;

do $$
begin
  if (select count(*) from public.training_methods
       where is_active and version = 6
         and jsonb_array_length(method_data #> '{modelos,bloques,semanas}') = 13
         and method_data #>> '{modelos,bloques,minimo_por_bloque,Descarga}' = '0'
         and method_data #>> '{modelos,atr,semanas,4,rpe}' = '9'
         and method_data #>> '{modelos,atr,semanas,5,rpe}' = '9.5'
         and method_data #>> '{parametros,fuerza,cadencia}' = '3010'
         and method_data #>> '{grupo_por_musculo,Aductores}' = 'Piernas'
         and method_data #>> '{periodizacion_por_meta,Rendimiento Deportivo}' = 'atr'
         and jsonb_array_length(method_data -> 'repartos') = 5) <> 1 then
    raise exception 'El método v6 debía quedar activo con la descarga, el ATR y la cadencia.';
  end if;
end $$;
