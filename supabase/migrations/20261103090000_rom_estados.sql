-- ===========================================================================
-- biomech_evaluations.rom_estados — el estado de movilidad que marca el
-- entrenador (2.5)
-- ===========================================================================
--
-- Giovanni, 3-nov: quitar los grados y marcar Óptimo o Restringido. Se guarda
-- test → estado. Las columnas de grados se quedan: las evaluaciones viejas son
-- historial (§3.5) y su estado se sigue sacando del umbral. La dorsiflexión
-- conserva tres estados (Óptima, Limitada, Severa) porque sus dos reglas
-- mandan cosas distintas; colapsarlas borraría una.
--
-- Va sola y antes que las reglas (20261103110000): una columna nueva no
-- molesta al código desplegado, y el código nuevo la necesita.

alter table public.biomech_evaluations
  add column if not exists rom_estados jsonb
  check (rom_estados is null or jsonb_typeof(rom_estados) = 'object');

comment on column public.biomech_evaluations.rom_estados is
  'Test de movilidad → estado marcado por el entrenador (Óptimo/Restringido; dorsiflexión Óptima/Limitada/Severa). Desde el 3-nov sustituye a los grados.';
