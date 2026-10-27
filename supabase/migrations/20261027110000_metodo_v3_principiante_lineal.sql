-- ===========================================================================
-- Método v3 — los principiantes se programan en LINEAL (5.2)
-- ===========================================================================
--
-- Giovanni probó el 26-oct con un atleta Principiante con objetivo
-- Hipertrofia y le salió "Ondulante". Lo reportó como fallo, y lo era a
-- medias: el 2-sep dijo que manda el objetivo, y por eso el lineal no se lo
-- llevaba nadie. Se le preguntó (PREGUNTAS-GIOVANNI, "Un principiante, ¿qué
-- periodización lleva?") y su reporte es la respuesta: el principiante va a
-- lineal sea cual sea su objetivo. Su PDF "Planificación de mesociclos"
-- (25-sep) dice lo mismo: "Modelo Lineal Progresivo — PRINCIPIANTE /
-- INTERMEDIO TEMPRANO". "Intermedio temprano" no es un nivel de nuestro
-- catálogo, así que solo entra Principiante.
--
-- NO ES SOLO EL RÓTULO. En septiembre ya pasó al revés con el ATR: el plan
-- decía un modelo y las semanas hacían otro. Por eso entra también su tabla
-- semana a semana del mismo PDF, literal:
--
--   Semana 1   3 × 10-12   RPE 6     carga base
--   Semana 2   3 × 10-12   RPE 6.5   progreso de carga (+2,5 % o +1 rep)
--   Semana 3   3 × 8-10    RPE 7     más carga, menos repeticiones
--   Semana 4   4 × 8       RPE 7.5   más volumen total
--   Semana 5   4 × 6-8     RPE 8     pico del mesociclo
--   Semana 6   2 × 8       RPE 6     descarga activa
--
-- Lo que de su lineal NO entra todavía: el reparto Fullbody A/B/C de 3 días
-- (el reparto sigue siendo el del método) y las 2 series de 12-15 que pone en
-- los aislamientos de brazo. Preguntado.
--
-- Fila nueva con `||`, igual que la v2: el diff es el cambio.

update public.training_methods
   set is_active = false
 where is_active;

insert into public.training_methods (version, source, is_active, method_data)
select
  3,
  'Método v2 + principiante → lineal (26-oct) con la tabla del PDF "Planificación de mesociclos" (25-sep)',
  true,
  method_data || $json$
{
  "periodizacion_por_nivel": {
    "Principiante": "lineal"
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
    }
  }
}
$json$::jsonb
from public.training_methods
where version = 2;

do $$
begin
  if (select count(*) from public.training_methods where is_active and version = 3) <> 1 then
    raise exception 'El método v3 debía quedar como el único activo.';
  end if;
end $$;
