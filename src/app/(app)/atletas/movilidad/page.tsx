"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { CampoROM } from "@/components/movilidad/campo-rom";
import { AvisoBorrador } from "@/components/shared/aviso-borrador";
import { GrupoOpciones } from "@/components/shared/grupo-opciones";
import { Guarda } from "@/components/shared/guarda";
import { Bloque, PasoWizard } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/lib/auth/contexto";
import { descartarBorrador, guardarBorrador, leerBorrador } from "@/lib/borradores";
import {
  EXTENSION_TORACICA,
  fueraDeRango,
  TESTS,
  TOTAL_TESTS,
  type ExtensionToracica,
} from "@/domain/movilidad";
import type { ClaseSegmento } from "@/domain/segmentos";
import { createClient } from "@/lib/supabase/client";

/**
 * Paso 4 — Movilidad articular (tarea 2.5).
 *
 * SOLO MICRO. Es lo que Giovanni aclaró en su MÓDULO 02: el entrenador registra
 * rangos articulares, y Eficiente/Compensada/De Riesgo lo concluye el motor por
 * ejercicio. Antes de su respuesta este paso iba a pedirle al entrenador que
 * clasificara patrones a mano, que era pedirle el trabajo del motor.
 *
 * Este paso CIERRA la evaluación biomecánica: inserta una sola fila con lo del
 * paso 3 (segmentos, que llega en el borrador) más lo de aquí. La tabla es de
 * solo inserción —una evaluación no se corrige, se anula y se repite (§3.5)—,
 * así que no se puede insertar en el paso 3 y completar aquí.
 */

interface Atleta {
  id: string;
  tenant_id: string;
  full_name: string;
}

/** Lo que el paso 3 dejó en el borrador. */
interface BorradorBiomecanica {
  femur?: ClaseSegmento;
  torso?: ClaseSegmento;
  proporcion?: string;
  rom?: Record<string, string>;
  toracica?: ExtensionToracica;
}

type TestNumerico = keyof typeof TESTS;
const NUMERICOS = Object.keys(TESTS) as TestNumerico[];

/** Orden anatómico de recorrido: tobillo → cadera → torso → hombro. */
const CADERA: TestNumerico[] = ["hip_flexion_deg", "hip_internal_rotation_deg"];
const HOMBRO: TestNumerico[] = ["shoulder_flexion_deg", "shoulder_external_rotation_deg"];

function aNumero(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function Movilidad() {
  const params = useSearchParams();
  const router = useRouter();
  const { sesion } = useSesion();
  const atletaId = params.get("id") ?? "";
  const usuarioId = sesion?.userId ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [segmentos, setSegmentos] = useState<BorradorBiomecanica>({});
  const [rom, setRom] = useState<Record<string, string>>({});
  const [toracica, setToracica] = useState<ExtensionToracica | undefined>();
  const [anterior, setAnterior] = useState<Record<string, number | null>>({});
  const [pendiente, setPendiente] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("athletes").select("id, tenant_id, full_name").eq("id", atletaId).single(),
      supabase
        .from("biomech_evaluations")
        .select(
          "ankle_dorsiflexion_cm, hip_flexion_deg, hip_internal_rotation_deg, shoulder_flexion_deg, shoulder_external_rotation_deg",
        )
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("evaluated_at", { ascending: false })
        .limit(1),
    ]).then(([a, e]) => {
      if (!vivo) return;
      setAtleta(a.data);
      // La movilidad SÍ cambia entre evaluaciones —a diferencia del hueso—, así
      // que la anterior se enseña para comparar pero no se copia sola.
      setAnterior((e.data?.[0] as Record<string, number | null>) ?? {});
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  // El borrador trae lo del paso 3. Sin él no hay segmentos que guardar, y se
  // avisa en vez de insertar media evaluación en silencio.
  useEffect(() => {
    if (!atletaId || !usuarioId) return;
    const b = leerBorrador<BorradorBiomecanica>("biomecanica", usuarioId, atletaId);
    if (!b) return;

    setSegmentos(b.datos);
    // Si además ya había movilidad tecleada, se ofrece retomarla.
    if (b.datos.rom || b.datos.toracica) setPendiente(b.guardadoEn);
  }, [atletaId, usuarioId]);

  const persistir = useCallback(
    (nuevoRom: Record<string, string>, nuevaToracica: ExtensionToracica | undefined) => {
      if (!usuarioId || !atletaId) return;
      guardarBorrador("biomecanica", usuarioId, atletaId, {
        ...segmentos,
        rom: nuevoRom,
        toracica: nuevaToracica,
      });
    },
    [segmentos, usuarioId, atletaId],
  );

  function cambiarROM(test: string, valor: string) {
    const siguiente = { ...rom, [test]: valor };
    setRom(siguiente);
    persistir(siguiente, toracica);
  }

  function cambiarToracica(valor: ExtensionToracica) {
    setToracica(valor);
    persistir(rom, valor);
  }

  function restaurar() {
    setRom(segmentos.rom ?? {});
    setToracica(segmentos.toracica);
    setPendiente(null);
  }

  function descartar() {
    setPendiente(null);
    persistir({}, undefined);
  }

  const tomados =
    NUMERICOS.filter((t) => aNumero(rom[t]) !== null).length + (toracica ? 1 : 0);

  // Un valor fuera del CHECK de la tabla se caza aquí, no al guardar: perder el
  // trabajo al final es lo que hace que se abandone la herramienta.
  const hayInvalidos = NUMERICOS.some((t) => {
    const n = aNumero(rom[t]);
    return n !== null && fueraDeRango(t, n) !== null;
  });

  async function guardar() {
    if (!atleta || hayInvalidos) return;
    setGuardando(true);
    setError(null);

    const { error: e } = await createClient().from("biomech_evaluations").insert({
      athlete_id: atleta.id,
      tenant_id: atleta.tenant_id,
      evaluated_at: new Date().toISOString(),
      femur_class: segmentos.femur ?? null,
      torso_class: segmentos.torso ?? null,
      femur_torso_ratio: segmentos.proporcion ?? null,
      ankle_dorsiflexion_cm: aNumero(rom.ankle_dorsiflexion_cm),
      hip_flexion_deg: aNumero(rom.hip_flexion_deg),
      hip_internal_rotation_deg: aNumero(rom.hip_internal_rotation_deg),
      thoracic_extension: toracica ?? null,
      shoulder_flexion_deg: aNumero(rom.shoulder_flexion_deg),
      shoulder_external_rotation_deg: aNumero(rom.shoulder_external_rotation_deg),
    });

    if (e) {
      setError("No pudimos guardar la evaluación. Inténtalo de nuevo.");
      setGuardando(false);
      return;
    }

    descartarBorrador("biomecanica", atleta.id);
    // A la ficha, no a la lista: es el momento en que el entrenador ve para qué
    // sirvió lo que acaba de medir. Devolverlo a la lista dejaba el recorrido
    // sin recompensa.
    router.replace(`/atletas/ficha?id=${atleta.id}`);
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
        paso={4}
        total={4}
        titulo={atleta.full_name}
        descripcion={`Movilidad articular · ${tomados} de ${TOTAL_TESTS} pruebas`}
      />

      {pendiente !== null && (
        <AvisoBorrador guardadoEn={pendiente} onRestaurar={restaurar} onDescartar={descartar} />
      )}

      <Bloque rotulo="Tobillo">
        <CampoROM
          test="ankle_dorsiflexion_cm"
          valor={rom.ankle_dorsiflexion_cm ?? ""}
          onChange={(v) => cambiarROM("ankle_dorsiflexion_cm", v)}
          anterior={anterior.ankle_dorsiflexion_cm}
        />
      </Bloque>

      <Bloque rotulo="Cadera">
        {CADERA.map((t) => (
          <CampoROM
            key={t}
            test={t}
            valor={rom[t] ?? ""}
            onChange={(v) => cambiarROM(t, v)}
            anterior={anterior[t]}
          />
        ))}
      </Bloque>

      <Bloque rotulo="Torso">
        <GrupoOpciones
          nombre="thoracic_extension"
          etiqueta={EXTENSION_TORACICA.etiqueta}
          ayuda={EXTENSION_TORACICA.protocolo}
          opciones={EXTENSION_TORACICA.opciones.map((o) => ({ valor: o, texto: o }))}
          valor={toracica}
          onChange={cambiarToracica}
          columnas
        />
        {toracica === "Cifótica" && (
          <p className="text-xs text-muted-foreground">{EXTENSION_TORACICA.implicacion}.</p>
        )}
      </Bloque>

      <Bloque rotulo="Hombro">
        {HOMBRO.map((t) => (
          <CampoROM
            key={t}
            test={t}
            valor={rom[t] ?? ""}
            onChange={(v) => cambiarROM(t, v)}
            anterior={anterior[t]}
          />
        ))}
      </Bloque>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/atletas/evaluar?id=${atleta.id}`}>Atrás</Link>
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-[2]"
          onClick={guardar}
          disabled={guardando || hayInvalidos}
        >
          {guardando ? "Guardando…" : "Guardar evaluación"}
        </Button>
      </div>

      {/* Se puede guardar sin las seis pruebas: a veces solo se mide el tobillo
          (docs/WIZARD-UX.md §2). Pero conviene decirlo, porque el motor no
          puede concluir nada sobre una articulación que nadie midió. */}
      {tomados < TOTAL_TESTS && (
        <p className="text-center text-xs text-muted-foreground">
          {tomados === 0
            ? "Puedes guardar solo con los segmentos del paso anterior."
            : TOTAL_TESTS - tomados === 1
              ? "Falta una prueba. El motor no aplicará reglas sobre lo que quede sin medir."
              : `Faltan ${TOTAL_TESTS - tomados} pruebas. El motor no aplicará reglas sobre lo que quede sin medir.`}
        </p>
      )}
    </div>
  );
}

export default function MovilidadPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Movilidad />
      </Suspense>
    </Guarda>
  );
}
