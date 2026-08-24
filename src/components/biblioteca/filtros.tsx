"use client";

import { ChevronDown, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { esCondicionSistemica } from "@/domain/contraindicaciones";
import { filtrosActivos, type FiltrosEjercicio } from "@/domain/ejercicios";
import { FICHA_PATRON, esPatron } from "@/domain/patrones";
import { cn } from "@/lib/utils";

/**
 * Filtros de la biblioteca (tarea 4.4).
 *
 * PLEGADOS POR DEFECTO. Son cuatro grupos de fichas; desplegados de entrada
 * empujarían la lista fuera de la pantalla en un móvil de 360px, y lo que el
 * entrenador viene a ver son los ejercicios, no los controles. La insignia del
 * botón dice cuántos hay puestos, que es lo único que hace falta saber cuando
 * están escondidos.
 *
 * Se usan fichas y no desplegables porque casi todos admiten varias opciones a
 * la vez, y un `<select multiple>` en un móvil es de lo peor que existe.
 */

function Ficha({
  activa,
  onClick,
  children,
  tono = "normal",
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** `proteccion` para el grupo que excluye; ver el comentario de abajo. */
  tono?: "normal" | "proteccion";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        "min-h-11 select-none rounded-full border px-3 text-sm transition-colors",
        activa
          ? tono === "proteccion"
            ? "border-[color:var(--gl-peligro)] bg-[color:var(--gl-acento-sv)] font-medium text-[color:var(--gl-peligro)]"
            : "seleccionado"
          : "border-input hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Grupo({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="rotulo">{titulo}</p>
      {ayuda && <p className="-mt-1 text-xs text-muted-foreground">{ayuda}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FiltrosBiblioteca({
  filtros,
  onChange,
  abierto,
  onAbrir,
  patrones,
  musculos,
  equipos,
  contraindicaciones,
  hayArchivados,
  resultados,
}: {
  filtros: FiltrosEjercicio;
  onChange: (f: FiltrosEjercicio) => void;
  abierto: boolean;
  onAbrir: (v: boolean) => void;
  patrones: readonly string[];
  musculos: readonly string[];
  equipos: readonly string[];
  contraindicaciones: readonly string[];
  hayArchivados: boolean;
  resultados: number;
}) {
  const activos = filtrosActivos(filtros);

  const alternar = (clave: "patrones" | "musculos" | "equipos" | "aptoPara", valor: string) => {
    const actuales = filtros[clave];
    onChange({
      ...filtros,
      [clave]: actuales.includes(valor)
        ? actuales.filter((v) => v !== valor)
        : [...actuales, valor],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1 justify-between"
          onClick={() => onAbrir(!abierto)}
          aria-expanded={abierto}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {activos > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {activos}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform", abierto && "rotate-180")}
            aria-hidden="true"
          />
        </Button>

        {activos > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 shrink-0 text-muted-foreground"
            onClick={() =>
              onChange({
                ...filtros,
                patrones: [],
                musculos: [],
                equipos: [],
                aptoPara: [],
                incluirArchivados: false,
              })
            }
          >
            <X className="size-4" aria-hidden="true" />
            Limpiar
          </Button>
        )}
      </div>

      {abierto && (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          {/* El grupo que más valor aporta, y el único que EXCLUYE en vez de
              incluir. Va primero y con su explicación: si alguien lo lee al
              revés, la lista que se lleva es justo la que no debe prescribir.
              Se perfila en rojo y no en dorado: el dorado ya significa
              "elegido" en el resto de la interfaz, y esto marca algo que hay
              que evitar. Perfilado y no relleno, para no competir con el
              botón principal de la pantalla. */}
          {contraindicaciones.length > 0 && (
            <Grupo
              titulo="Apto para un atleta con"
              ayuda="Esconde lo contraindicado. Es lo que después hará el motor."
            >
              {contraindicaciones.map((c) => (
                <Ficha
                  key={c}
                  tono="proteccion"
                  activa={filtros.aptoPara.includes(c)}
                  onClick={() => alternar("aptoPara", c)}
                >
                  <span className="flex items-center gap-1.5">
                    {filtros.aptoPara.includes(c) && (
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                    )}
                    {esCondicionSistemica(c) ? c.split(" / ")[0] : c}
                  </span>
                </Ficha>
              ))}
            </Grupo>
          )}

          {patrones.length > 0 && (
            <Grupo titulo="Patrón">
              {patrones.map((p) => (
                <Ficha
                  key={p}
                  activa={filtros.patrones.includes(p)}
                  onClick={() => alternar("patrones", p)}
                >
                  {esPatron(p) ? FICHA_PATRON[p].nombre : p}
                </Ficha>
              ))}
            </Grupo>
          )}

          {musculos.length > 0 && (
            <Grupo titulo="Músculo">
              {musculos.map((m) => (
                <Ficha
                  key={m}
                  activa={filtros.musculos.includes(m)}
                  onClick={() => alternar("musculos", m)}
                >
                  {m}
                </Ficha>
              ))}
            </Grupo>
          )}

          {equipos.length > 0 && (
            <Grupo titulo="Equipo">
              {equipos.map((e) => (
                <Ficha
                  key={e}
                  activa={filtros.equipos.includes(e)}
                  onClick={() => alternar("equipos", e)}
                >
                  {e}
                </Ficha>
              ))}
            </Grupo>
          )}

          {hayArchivados && (
            <Grupo titulo="Archivados">
              <Ficha
                activa={filtros.incluirArchivados}
                onClick={() =>
                  onChange({ ...filtros, incluirArchivados: !filtros.incluirArchivados })
                }
              >
                Incluir archivados
              </Ficha>
            </Grupo>
          )}

          <p className="border-t pt-3 text-xs text-muted-foreground">
            {resultados === 0
              ? "Ningún ejercicio cumple estos filtros."
              : `${resultados} ${resultados === 1 ? "ejercicio" : "ejercicios"}.`}
          </p>
        </div>
      )}
    </div>
  );
}
