"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { GrupoOpciones } from "@/components/shared/grupo-opciones";
import { Guarda } from "@/components/shared/guarda";
import { Bloque, PasoWizard } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { haceCuanto } from "@/domain/catalogos";
import {
  CLASES_SEGMENTO,
  describirProporcion,
  IMPLICACION_FEMUR,
  IMPLICACION_TORSO,
  interpretarProporcion,
  type ClaseSegmento,
} from "@/domain/segmentos";
import { useSesion } from "@/lib/auth/contexto";
import { guardarBorrador } from "@/lib/borradores";
import { createClient } from "@/lib/supabase/client";

interface Atleta {
  id: string;
  tenant_id: string;
  full_name: string;
}

interface Anterior {
  evaluated_at: string;
  femur_class: string | null;
  torso_class: string | null;
}

function Evaluacion() {
  const params = useSearchParams();
  const router = useRouter();
  const { sesion } = useSesion();
  const atletaId = params.get("id") ?? "";
  const usuarioId = sesion?.userId ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [anterior, setAnterior] = useState<Anterior | null>(null);
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [femur, setFemur] = useState<ClaseSegmento | undefined>();
  const [torso, setTorso] = useState<ClaseSegmento | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("athletes").select("id, tenant_id, full_name").eq("id", atletaId).single(),
      supabase
        .from("biomech_evaluations")
        .select("evaluated_at, femur_class, torso_class")
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("evaluated_at", { ascending: false })
        .limit(1),
    ]).then(([a, e]) => {
      if (!vivo) return;
      setAtleta(a.data);
      const previa = (e.data?.[0] as Anterior) ?? null;
      setAnterior(previa);
      // La estructura ósea no cambia entre evaluaciones. Traer la clasificación
      // anterior ahorra rehacer un juicio que ya se hizo, y el entrenador puede
      // cambiarla si la revisa.
      if (previa?.femur_class) setFemur(previa.femur_class as ClaseSegmento);
      if (previa?.torso_class) setTorso(previa.torso_class as ClaseSegmento);
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  const proporcion = describirProporcion(femur, torso);
  const interpretacion = interpretarProporcion(proporcion);

  /**
   * No guarda: pasa al paso 4.
   *
   * Segmentos y movilidad son UNA evaluación biomecánica y acaban en la misma
   * fila. Como la tabla es de solo inserción (§3.5: una evaluación no se
   * corrige, se anula y se repite), no se puede insertar aquí y completar allá.
   * El borrador es el que transporta lo de este paso hasta el siguiente, que es
   * además lo que hace que sobreviva a que el sistema cierre la app.
   */
  function continuar() {
    if (!atleta || !usuarioId) return;
    setError(null);

    guardarBorrador("biomecanica", usuarioId, atleta.id, {
      femur,
      torso,
      proporcion,
    });

    router.push(`/atletas/movilidad?id=${atleta.id}`);
  }

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!atleta) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No encontramos ese atleta.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/atletas">Volver a la lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PasoWizard
        paso={3}
        total={4}
        titulo={atleta.full_name}
        descripcion={
          anterior
            ? `Segmentos y proporciones · última ${haceCuanto(anterior.evaluated_at)}`
            : "Segmentos y proporciones"
        }
      />

      <Bloque rotulo="Longitudes">
        <GrupoOpciones
          nombre="femur"
          etiqueta="Longitud de fémur"
          ayuda="Clasificación con criterio, no medida con cinta"
          opciones={CLASES_SEGMENTO.map((c) => ({
            valor: c,
            texto: c,
            detalle: IMPLICACION_FEMUR[c],
          }))}
          valor={femur}
          onChange={setFemur}
        />

        <GrupoOpciones
          nombre="torso"
          etiqueta="Longitud de torso"
          opciones={CLASES_SEGMENTO.map((c) => ({
            valor: c,
            texto: c,
            detalle: IMPLICACION_TORSO[c],
          }))}
          valor={torso}
          onChange={setTorso}
        />
      </Bloque>

      {proporcion && (
        <Bloque rotulo="Proporción resultante">
          <div className="space-y-2">
            <p className="text-lg font-medium">{proporcion}</p>

            {interpretacion ? (
              <p className="text-sm text-muted-foreground">
                Tu ficha clasifica esta combinación como{" "}
                <strong className="text-foreground">{interpretacion}</strong>.
              </p>
            ) : (
              // No se rellena el hueco con algo verosímil: ocho de las nueve
              // combinaciones no están definidas en la ficha de Giovanni.
              <p className="text-sm text-muted-foreground">
                Esta combinación todavía no tiene una clasificación definida en el método.
                Se guarda tal cual para que el motor la use cuando exista.
              </p>
            )}
          </div>
        </Bloque>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href="/atletas">Cancelar</Link>
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-[2]"
          onClick={continuar}
          disabled={!femur || !torso}
        >
          Continuar a movilidad
        </Button>
      </div>
    </div>
  );
}

export default function EvaluarPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Evaluacion />
      </Suspense>
    </Guarda>
  );
}
