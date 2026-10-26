-- ===========================================================================
-- Método v2 — la pérdida de grasa no se programa con ATR (5.2)
-- ===========================================================================
--
-- Giovanni probó el generador el 22-sep con un atleta de pérdida de grasa y le
-- salió "ATR / Bloques concentrados" en el encabezado. Tiene razón y el error
-- es nuestro: la v1 mapeaba `perdida_grasa` a `atr`.
--
-- Lo peor es que ya nos lo habíamos dicho solos. `FICHA_PERIODIZACION.atr` en
-- src/domain/plan.ts describe ese modelo como "Rendimiento y fisicoculturismo",
-- y aun así el mapeo mandaba ahí a quien quiere bajar grasa. El catálogo y el
-- método se contradecían desde el 3-sep y nada lo atrapó, porque ningún test
-- miraba `periodizacion_por_objetivo`. Ahora sí lo mira (tests/unit/metodo).
--
-- SU ARGUMENTO, que es el que manda (§3.4): el ATR de Issurin/Verkhoshansky se
-- diseñó para picos de rendimiento en atletas de elite. En déficit calórico, un
-- bloque concentrado de fatiga —la fase de Transformación— empuja cortisol y
-- proteólisis, que es justo lo contrario de lo que busca quien está definiendo.
-- Y no hay fecha de competencia que supercompensar. Su tabla del 22-sep:
--
--   Pérdida de grasa / Definición → Ondulante (DUP) / Lineal modificada
--   Hipertrofia muscular          → Bloques de acumulación semanal / DUP
--   Fuerza máxima / Powerlifting  → ATR / Bloques concentrados / Peaking
--   Readaptación / Salud          → Lineal básica / Control motor
--
-- DE ESA TABLA AQUÍ SE APLICA UNA SOLA FILA. Por qué:
--
--   · `perdida_grasa` → `ondulante`. Traducción literal: él escribe "Ondulante
--     (DUP)" y nuestro catálogo llama a ese modelo "Ondulante (DUP/WUP)".
--
--   · `hipertrofia` se queda en `ondulante`. Su fila dice "Bloques de
--     acumulación semanal / DUP" y DUP es el que ya estaba. Sin cambio.
--
--   · `fuerza` → `atr` NO se aplica todavía, aunque su tabla lo pida. No es
--     desacuerdo: es orden. El generador no sabe hacer las fases del ATR
--     —src/domain/generador.ts reparte carga/descarga/supercompensación, que
--     son las del ondulante, sea cual sea el modelo— y él mismo avisó el 23-sep
--     de que nunca nos mandó las fases de cada modelo. Mandar la fuerza al ATR
--     hoy cambiaría el rótulo del plan sin cambiar el plan, que es exactamente
--     el fallo que él acaba de reportar, movido de objetivo. Entra cuando
--     lleguen sus fases, en la misma versión.
--
--   · "Readaptación / Salud" no tiene dónde entrar: nuestros objetivos son tres
--     y esa meta no es ninguno. Preguntado.
--
-- ---------------------------------------------------------------------------
-- POR QUÉ UNA FILA NUEVA Y NO UN UPDATE
-- ---------------------------------------------------------------------------
--
-- Porque la 5.2 lo dejó escrito: una fila es inmutable y editar es insertar
-- version+1. Un plan generado la semana pasada tiene que poder seguir diciendo
-- con qué números salió, aunque hoy sepamos que uno estaba mal.
--
-- Y por qué `||` y no copiar las 190 líneas del JSON: el método va a cambiar
-- muchas veces —es suyo y él lo edita— y si cada retoque duplica el documento
-- entero, en seis versiones nadie puede ver qué cambió. Con la mezcla, el
-- diff ES el cambio. `||` en jsonb mezcla por arriba y sin recursión, así que
-- reemplaza `periodizacion_por_objetivo` completo; por eso van los tres
-- objetivos y no solo el que se corrige.

-- Primero se apaga la v1: el índice `training_methods_uno_activo` no admite dos
-- activas ni un instante.
update public.training_methods
   set is_active = false
 where is_active;

insert into public.training_methods (version, source, is_active, method_data)
select
  2,
  'Método v1 (31-ago/2-sep) + tabla objetivo→modelo de periodización de Giovanni (22-sep)',
  true,
  method_data || $json$
{
  "periodizacion_por_objetivo": {
    "fuerza": "ondulante",
    "hipertrofia": "ondulante",
    "perdida_grasa": "ondulante"
  }
}
$json$::jsonb
from public.training_methods
where version = 1;
