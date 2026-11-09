-- ===========================================================================
-- Patrón complementario de cada ejercicio (4.1, 9-nov)
-- ===========================================================================
--
-- Giovanni mandó su "Matriz Complementaria de Patrones de Movimiento": diez
-- subcategorías (Dominante Unilateral de Rodilla, Flexión de Rodilla
-- Monoarticular, Puente de Cadera, Flexión / Extensión de Codo…) que van
-- DENTRO de los patrones básicos, no en su lugar: "conservamos intactos los 7
-- patrones básicos". El básico sigue siendo la llave del reparto y de la
-- sustitución. Catálogo cerrado, como el básico: `src/domain/patrones.ts`.

alter table public.exercise_library
  add column if not exists complementary_pattern text check (complementary_pattern in (
    'dominante_unilateral_rodilla', 'flexion_rodilla', 'extension_rodilla',
    'abduccion_aduccion_cadera', 'puente_cadera', 'flexoextension_codo',
    'elevacion_hombro', 'abduccion_horizontal_hombro', 'plantiflexion',
    'core_anti_extension_rotacion'
  ));

comment on column public.exercise_library.complementary_pattern is
  'Subcategoría de su matriz complementaria (9-nov) dentro del patrón básico. NULL = ninguna.';
