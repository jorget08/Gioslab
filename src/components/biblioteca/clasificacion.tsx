import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Campo } from "@/components/shared/campo";
import { CampoSelect } from "@/components/shared/campo-select";
import { FICHA_JERARQUIA, FICHA_PERFIL, JERARQUIAS, PERFILES } from "@/domain/jerarquias";
import { COMPLEMENTARIOS, FICHA_COMPLEMENTARIO, FICHA_PATRON, PATRONES } from "@/domain/patrones";
import type { EjercicioForm } from "@/lib/validation/ejercicio";

/**
 * Lo que el motor lee de un ejercicio para decidir dónde va y en qué orden:
 * patrón, patrón complementario, jerarquía, perfil, guiada, cadencia y carga
 * axial. Aparte de la ficha por tamaño: es el bloque que más crece cada vez que
 * Giovanni añade un criterio.
 */
export function CamposClasificacion({
  register,
  errors,
}: {
  register: UseFormRegister<EjercicioForm>;
  errors: FieldErrors<EjercicioForm>;
}) {
  return (
    <>
      <CampoSelect
        etiqueta="Patrón de movimiento"
        ayuda="Es la llave con la que el motor sustituye un ejercicio por otro"
        {...register("patron")}
        error={errors.patron?.message}
      >
        <option value="">Sin asignar</option>
        {PATRONES.map((p) => (
          <option key={p} value={p}>
            {FICHA_PATRON[p].nombre}
          </option>
        ))}
      </CampoSelect>

      <CampoSelect
        etiqueta="Patrón complementario"
        ayuda="Qué tipo de accesorio es dentro de su patrón (su matriz complementaria)"
        {...register("complementario")}
      >
        <option value="">Ninguno</option>
        {COMPLEMENTARIOS.map((c) => (
          <option key={c} value={c}>{FICHA_COMPLEMENTARIO[c].nombre}</option>
        ))}
      </CampoSelect>

      {/* Su orden de la sesión (25-sep). Sin jerarquía se puede prescribir,
          pero el generador lo pone detrás de lo que sí está clasificado. */}
      <CampoSelect etiqueta="Jerarquía" ayuda="En qué orden va en la sesión" {...register("jerarquia")}>
        <option value="">Sin clasificar</option>
        {JERARQUIAS.map((j) => (
          <option key={j} value={j}>{FICHA_JERARQUIA[j].nombre}</option>
        ))}
      </CampoSelect>
      <CampoSelect etiqueta="Perfil de longitud" ayuda="Dónde trabaja el músculo en el recorrido" {...register("perfil")}>
        <option value="">Sin indicar</option>
        {PERFILES.map((p) => (
          <option key={p} value={p}>{FICHA_PERFIL[p]}</option>
        ))}
      </CampoSelect>
      <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 text-sm">
        <input type="checkbox" className="size-5" {...register("guiada")} />
        Versión guiada: sustituye al libre cuando hay una restricción
      </label>

      {/* Su matriz de 125 (16-nov): la cadencia de cada ejercicio y si es carga
          axial. Vacía, el generador usa la de su jerarquía. */}
      <Campo
        etiqueta="Cadencia por defecto"
        ayuda="Cuatro cifras, como 3010; X es explosiva. Vacía: la de su jerarquía (J1 3010, J2 3110, J3 2011)"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={4}
        {...register("cadencia")}
        error={errors.cadencia?.message}
      />
      <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 text-sm">
        <input type="checkbox" className="size-5" {...register("axial")} />
        Carga axial pesada: no va con otro J1 axial en la misma sesión
      </label>
    </>
  );
}
