"use client";

import { Archive, ArrowRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import {
  leerContraindicaciones,
  porFamilia,
  REGLA_SISTEMICA,
} from "@/domain/contraindicaciones";
import { resumenEjercicio, type Ejercicio } from "@/domain/ejercicios";
import { leerMedios, type Medio } from "@/domain/medios";
import { esPatron, FICHA_PATRON } from "@/domain/patrones";
import {
  esTipoRelacion,
  FICHA_RELACION,
  relacionesDe,
  type Relacion,
} from "@/domain/relaciones";
import { useSesion } from "@/lib/auth/contexto";
import { urlPublica } from "@/lib/medios/almacenamiento";
import { createClient } from "@/lib/supabase/client";

/**
 * Ficha de un ejercicio, de solo lectura (tarea 4.7).
 *
 * POR QUÉ EXISTE. La 4.2 dio a Giovanni dónde subir fotos y video, y la 4.3 dio
 * al motor con qué sustituir. Pero las dos pantallas donde eso se ve estaban
 * guardadas a `super_admin`, así que el entrenador veía una miniatura en el
 * listado y no podía abrirla. Material de técnica que solo ve quien lo subió no
 * sirve para nada.
 *
 * ES EL DESTINO DE TODOS, tanto del entrenador como de Giovanni. Antes él
 * entraba directo al formulario desde el listado; ahora entra aquí y pulsa
 * «Editar». Un clic más a cambio de que exista un solo sitio donde mirar un
 * ejercicio: si la ficha viviera solo para el entrenador, sería la pantalla que
 * nadie revisa y se quedaría atrás sin que se note.
 */

const COLUMNAS =
  "id, name, description, target_muscle, movement_pattern, biomechanical_type, equipment, contraindications, media_urls, is_active";

function Detalle() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { sesion } = useSesion();
  const puedeEditar = sesion?.rol === "super_admin";

  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  /** Nombre → id, para poder saltar a la ficha de un sustituto. */
  const [idsPorNombre, setIdsPorNombre] = useState<Map<string, string>>(new Map());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("exercise_library").select(COLUMNAS),
      supabase.from("exercise_variants").select("exercise_id, variant_exercise_id, relation_type"),
    ]).then(([ejs, rel]) => {
      if (!vivo) return;
      const todos = (ejs.data ?? []) as Ejercicio[];
      const actual = todos.find((e) => e.id === id) ?? null;

      setEjercicio(actual);
      setMedios(leerMedios(actual?.media_urls));

      // Se resuelven contra la biblioteca ACTIVA: ofrecer como alternativa un
      // ejercicio archivado mandaría al entrenador a algo que ya no existe.
      const activos = todos.filter((e) => e.is_active);
      const nombre = new Map(activos.map((e) => [e.id, e.name]));
      setIdsPorNombre(new Map(activos.map((e) => [e.name, e.id])));
      setRelaciones(
        (rel.data ?? []).flatMap((v) => {
          const ejercicio = nombre.get(v.exercise_id);
          const variante = nombre.get(v.variant_exercise_id);
          return ejercicio && variante && esTipoRelacion(v.relation_type)
            ? [{ ejercicio, variante, tipo: v.relation_type }]
            : [];
        }),
      );
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [id]);

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!ejercicio) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Ese ejercicio no está en la biblioteca.
        </p>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href="/biblioteca">Volver a la biblioteca</Link>
        </Button>
      </div>
    );
  }

  const contra = leerContraindicaciones(ejercicio.contraindications);
  const { anatomicas, sistemicas } = porFamilia(contra);
  const vistas = relacionesDe(relaciones, ejercicio.name);
  const patron = ejercicio.movement_pattern;
  const resumen = resumenEjercicio(ejercicio);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{ejercicio.name}</h1>
        {patron && esPatron(patron) && (
          <p className="rotulo">{FICHA_PATRON[patron].nombre}</p>
        )}
        {resumen && <p className="text-sm text-muted-foreground">{resumen}</p>}
      </header>

      {!ejercicio.is_active && (
        <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <Archive className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Archivado: el motor no lo propone. Las reglas y los planes que ya lo nombran
          siguen intactos.
        </p>
      )}

      {/* Los medios van ARRIBA y a ancho completo. Es a lo que se entra: el
          entrenador abre esta pantalla en mitad de una sesión para ver cómo se
          ejecuta, no para leer la clasificación. */}
      {medios.length > 0 && (
        <div className="space-y-2">
          {medios.map((m) => (
            <div key={m.path} className="overflow-hidden rounded-xl border bg-muted">
              {m.tipo === "foto" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlPublica(m.path)}
                  alt={`${ejercicio.name}, ejecución`}
                  className="w-full"
                  loading="lazy"
                />
              ) : (
                <video
                  src={urlPublica(m.path)}
                  className="w-full"
                  controls
                  playsInline
                  // `metadata` y no `auto`: en el gimnasio se abre con datos
                  // móviles y no se descarga el clip entero hasta que lo pidan.
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {ejercicio.description && (
        <Bloque rotulo="Ejecución">
          <p className="whitespace-pre-line text-sm">{ejercicio.description}</p>
        </Bloque>
      )}

      {/* Las dos familias separadas, igual que en el editor: una zona descarta
          el ejercicio, una condición además cambia CÓMO se ejecuta. */}
      {contra.length > 0 && (
        <Bloque rotulo="Contraindicado si el atleta tiene">
          {anatomicas.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {anatomicas.map((z) => (
                <li key={z} className="rounded-md border px-2 py-1 text-xs">
                  {z}
                </li>
              ))}
            </ul>
          )}
          {sistemicas.length > 0 && (
            <ul className="space-y-2">
              {sistemicas.map((c) => (
                <li key={c} className="text-sm">
                  {c}
                  <span className="block text-xs text-muted-foreground">
                    {REGLA_SISTEMICA[c]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      )}

      {vistas.length > 0 && (
        <Bloque rotulo="Sustituciones">
          <p className="text-xs text-muted-foreground">
            Lo que el motor ofrece si este ejercicio queda descartado para un atleta.
          </p>
          <ul className="divide-y rounded-lg border">
            {vistas.map((v) => (
              /* La FILA ENTERA es el enlace, no solo el nombre. Seguir la cadena
                 de sustituciones es para lo que se abre esto, y un enlace de la
                 altura de una línea de texto son 20px: por debajo del mínimo
                 táctil de 44 que exige §3.3 para usarlo de pie en el gimnasio. */
              <li key={`${v.otro}-${v.tipo}`}>
                <Link
                  href={`/biblioteca/detalle?id=${idsPorNombre.get(v.otro) ?? ""}`}
                  className="flex min-h-14 items-center gap-2 px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="rotulo flex items-center gap-1 text-[0.65rem]">
                      {v.saliente ? FICHA_RELACION[v.tipo].desde : FICHA_RELACION[v.tipo].hacia}
                    </span>
                    <span className="block truncate text-sm">{v.otro}</span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href="/biblioteca">Volver</Link>
        </Button>
        {puedeEditar && (
          <Button asChild className="min-h-11 flex-1">
            <Link href={`/biblioteca/ejercicio?id=${ejercicio.id}`}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Lo lee todo el staff: es el catálogo común (MODELO-DATOS §1.2). */
export default function DetalleEjercicioPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Detalle />
      </Suspense>
    </Guarda>
  );
}
