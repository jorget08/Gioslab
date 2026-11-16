-- ===========================================================================
-- Método v7 — cadencia por jerarquía, ondulante diario, tolerancia de volumen
-- y el reparto femenino de 5 días (5.2, 16-nov)
-- ===========================================================================
--
-- Su "Plan de corrección backend" y su "Estructura femenina de 5 días":
--
-- 1. CADENCIA POR JERARQUÍA. "Eliminar la asignación fija de 3010… J1 3010,
--    J2 3110, J3 2011." La de cada ejercicio (su matriz de 125) manda; esta es
--    la de respaldo.
-- 2. CONCÉNTRICA EXPLOSIVA. "En bloques de Fuerza o ATR (Realización) la
--    concéntrica cambia a X (30X0, 20X0)." Leído como: los bloques
--    Realización (ATR) e Intensificación (Bloques, el de fuerza) y el objetivo
--    fuerza cuando el modelo no tiene bloques. POR CONFIRMAR.
-- 3. TOLERANCIA. "Amplía el margen semanal en ±1 serie… 15 en lugar de 16."
-- 4. ONDULANTE DIARIO. "Alterna Sesión A y Sesión B de la misma semana… Día A
--    6-8 reps pesadas | Día B 10-12 estiramiento… Explosiva 2010 en Día A vs.
--    Excéntrica 4110 en Día B." Las cifras son las de su ejemplo.
-- 5. MUJER, 5 DÍAS. "Inferior - Superior - Inferior - Superior - Inferior":
--    cadera/glúteo, torso integrado, rodilla/cuádriceps, tracción y hombro
--    posterior, cadena posterior y unilateral.
--
-- `repartos` va ENTERO: `||` mezcla por arriba y sin recursión.

update public.training_methods
   set is_active = false
 where is_active;

insert into public.training_methods (version, source, is_active, method_data)
select
  7,
  'Método v6 + cadencia por jerarquía, concéntrica explosiva, ondulante diario A/B, tolerancia ±1 y mujer 5 días I-S-I-S-I (16-nov)',
  true,
  method_data || $json$
{
 "tolerancia_series": 1,
 "cadencia_por_jerarquia": {"1": "3010", "2": "3110", "3": "2011"},
 "cadencia_explosiva": {"bloques": ["Realización", "Intensificación"], "objetivos": ["fuerza"]},
 "ondulante_diario": {"A": {"rep_min": 6, "rep_max": 8, "cadencia": "2010"}, "B": {"rep_min": 10, "rep_max": 12, "cadencia": "4110"}},
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
   {"titulo": "Tren Inferior 1 · Cadera / Glúteo", "musculos": ["Glúteo", "Isquiosurales", "Aductores", "Core"], "patrones": ["hip_hinge_dominante_cadera", "squat_dominante_rodilla", "isolation_accessory"]},
   {"titulo": "Tren Superior 1 · Torso integrado", "musculos": ["Pectoral", "Dorsal", "Deltoides", "Bíceps", "Tríceps", "Antebrazo", "Trapecio", "Core"], "patrones": ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "isolation_accessory"]},
   {"titulo": "Tren Inferior 2 · Rodilla / Cuádriceps", "musculos": ["Cuádriceps", "Gemelos", "Core"], "patrones": ["squat_dominante_rodilla", "isolation_accessory"]},
   {"titulo": "Tren Superior 2 · Tracción y hombro posterior", "musculos": ["Dorsal", "Deltoides", "Trapecio", "Bíceps", "Antebrazo", "Core"], "patrones": ["vertical_pull", "horizontal_pull", "isolation_accessory"]},
   {"titulo": "Tren Inferior 3 · Cadena posterior y unilateral", "musculos": ["Isquiosurales", "Glúteo", "Cuádriceps", "Gemelos", "Aductores", "Core"], "patrones": ["hip_hinge_dominante_cadera", "squat_dominante_rodilla", "isolation_accessory"]}
  ]}
 ]
}
$json$::jsonb
from public.training_methods
where version = 6;

do $$
begin
  if (select count(*) from public.training_methods
       where is_active and version = 7
         and method_data #>> '{cadencia_por_jerarquia,2}' = '3110'
         and method_data #>> '{tolerancia_series}' = '1'
         and method_data #>> '{ondulante_diario,B,cadencia}' = '4110'
         and jsonb_array_length(method_data #> '{modelos,bloques,semanas}') = 13
         and jsonb_array_length(method_data -> 'repartos') = 5) <> 1 then
    raise exception 'El método v7 debía quedar activo con cadencias, ondulante y tolerancia.';
  end if;
end $$;
