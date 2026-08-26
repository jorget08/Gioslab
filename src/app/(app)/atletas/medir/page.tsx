"use client";

import { Ruler } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AvisoBorrador } from "@/components/shared/aviso-borrador";
import { CampoMedidaInput } from "@/components/medicion/campo-medida";
import { ModoPliegues } from "@/components/medicion/modo-pliegues";
import { Resultado } from "@/components/medicion/resultado";
import { Guarda } from "@/components/shared/guarda";
import { Bloque, PasoWizard } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { calcularComposicion, type Sexo } from "@/domain/calculations/composicion-corporal";
import { edadEnAnios, haceCuanto } from "@/domain/catalogos";
import {
  aNumero,
  CAMPOS,
  faltantesParaCalculo,
  PERIMETROS,
  PLIEGUES,
  validarRango,
  type CampoMedida,
} from "@/domain/medidas";
import { useSesion } from "@/lib/auth/contexto";
import { descartarBorrador, guardarBorrador, leerBorrador } from "@/lib/borradores";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type MedicionInsert = Database["public"]["Tables"]["anthropometric_measurements"]["Insert"];

interface Atleta {
  id: string;
  tenant_id: string;
  full_name: string;
  birth_date: string;
  sex: string;
}

/** La última medición del atleta: es la referencia contra la que se compara. */
interface Anterior {
  measured_at: string;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  [k: string]: unknown;
}

const BASICOS: CampoMedida[] = ["height_cm", "weight_kg"];

function Medicion() {
  const params = useSearchParams();
  const router = useRouter();
  const atletaId = params.get("id") ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [anterior, setAnterior] = useState<Anterior | null>(null);
  const [cargando, setCargando] = useState(Boolean(atletaId));
  const [valores, setValores] = useState<Partial<Record<CampoMedida, string>>>({});
  const [midiendo, setMidiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sesion } = useSesion();
  const usuarioId = sesion?.userId ?? "";
  const [borrador, setBorrador] = useState<{ guardadoEn: number; datos: Record<string, string> } | null>(null);

  useEffect(() => {
    // Se sale sin tocar el estado: asignarlo de forma síncrona dentro de un
    // efecto encadena un render de más. Sin id, `cargando` ya arranca en false.
    if (!atletaId) return;

    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("athletes")
        .select("id, tenant_id, full_name, birth_date, sex")
        .eq("id", atletaId)
        .single(),
      supabase
        .from("anthropometric_measurements")
        .select("*")
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("measured_at", { ascending: false })
        .limit(1),
    ]).then(([a, m]) => {
      if (!vivo) return;
      setAtleta(a.data);
      setAnterior((m.data?.[0] as Anterior) ?? null);
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  // Se busca el borrador al llegar, ANTES de que el entrenador teclee nada: si
  // escribiera primero y restaurara después, perdería lo recién metido.
  useEffect(() => {
    if (!atletaId || !usuarioId) return;
    const b = leerBorrador<Record<string, string>>("medicion", usuarioId, atletaId);
    if (b) setBorrador({ guardadoEn: b.guardadoEn, datos: b.datos });
  }, [atletaId, usuarioId]);

  // Guardado automático en el dispositivo. Sin botón: en el gimnasio interrumpen
  // a mitad y nadie se acuerda de pulsar nada (tarea 2.8).
  useEffect(() => {
    if (!atletaId || !usuarioId || borrador) return;
    const t = setTimeout(() => {
      guardarBorrador("medicion", usuarioId, atletaId, valores as Record<string, unknown>);
    }, 400);
    return () => clearTimeout(t);
  }, [valores, atletaId, usuarioId, borrador]);

  const numeros = useMemo(() => {
    const n: Partial<Record<CampoMedida, number | null>> = {};
    for (const campo of Object.keys(CAMPOS) as CampoMedida[]) {
      n[campo] = aNumero(valores[campo] ?? "");
    }
    return n;
  }, [valores]);

  const hayBloqueo = useMemo(
    () =>
      (Object.keys(CAMPOS) as CampoMedida[]).some(
        (c) => validarRango(c, numeros[c] ?? null)?.nivel === "bloquea",
      ),
    [numeros],
  );

  const faltan = faltantesParaCalculo(numeros);

  // El cálculo espera a tener TODOS sus datos. Con 5 pliegues no se enseña un
  // número aproximado: se enseña qué falta (docs/WIZARD-UX.md §5.4).
  const composicion = useMemo(() => {
    if (!atleta || faltan.length > 0) return null;
    return calcularComposicion({
      pliegues: {
        triceps_mm: numeros.triceps_mm!,
        subscapular_mm: numeros.subscapular_mm!,
        suprailiac_mm: numeros.suprailiac_mm!,
        abdominal_mm: numeros.abdominal_mm!,
        thigh_mm: numeros.thigh_mm!,
        calf_mm: numeros.calf_mm!,
        chest_mm: numeros.chest_mm!,
      },
      pesoKg: numeros.weight_kg!,
      estaturaCm: numeros.height_cm!,
      edadAnios: edadEnAnios(new Date(atleta.birth_date)),
      sexo: atleta.sex as Sexo,
    });
  }, [atleta, numeros, faltan.length]);

  const pliegesLlenos = PLIEGUES.filter((p) => (valores[p] ?? "").trim() !== "").length;

  function poner(campo: CampoMedida, v: string) {
    setValores((prev) => ({ ...prev, [campo]: v }));
  }

  async function guardar() {
    if (!atleta || hayBloqueo) return;
    setGuardando(true);
    setError(null);

    const fila: MedicionInsert = {
      athlete_id: atleta.id,
      // El trigger heredar_tenant_del_atleta lo reescribe con el del atleta, así
      // que un valor manipulado desde aquí no serviría de nada. Se manda el real
      // igualmente: la columna es NOT NULL y mandar algo falso a propósito es
      // pedir que alguien lo lea mal dentro de un año.
      tenant_id: atleta.tenant_id,
      measured_at: new Date().toISOString(),

      height_cm: numeros.height_cm,
      weight_kg: numeros.weight_kg,
      triceps_mm: numeros.triceps_mm,
      subscapular_mm: numeros.subscapular_mm,
      suprailiac_mm: numeros.suprailiac_mm,
      abdominal_mm: numeros.abdominal_mm,
      thigh_mm: numeros.thigh_mm,
      calf_mm: numeros.calf_mm,
      chest_mm: numeros.chest_mm,
      waist_cm: numeros.waist_cm,
      hip_cm: numeros.hip_cm,
      chest_cm: numeros.chest_cm,
      arm_relaxed_cm: numeros.arm_relaxed_cm,
      arm_flexed_cm: numeros.arm_flexed_cm,
      thigh_cm: numeros.thigh_cm,
      calf_cm: numeros.calf_cm,

      ...(composicion && {
        sum_6_skinfolds_mm: composicion.suma6,
        sum_7_skinfolds_mm: composicion.suma7,
        body_density: composicion.densidad,
        body_fat_pct: composicion.porcentajeGraso,
        fat_mass_kg: composicion.masaGrasaKg,
        lean_mass_kg: composicion.masaMagraKg,
        bmi: composicion.imc,
        body_fat_pct_source: "calculado",
      }),

      ...(numeros.waist_cm && numeros.hip_cm
        ? { waist_hip_ratio: Number((numeros.waist_cm / numeros.hip_cm).toFixed(3)) }
        : {}),
    };

    const { error: e } = await createClient().from("anthropometric_measurements").insert(fila);

    if (e) {
      setError(
        e.code === "23514"
          ? "Alguna medida quedó fuera de rango. Revísala antes de guardar."
          : "No pudimos guardar la medición. Inténtalo de nuevo.",
      );
      setGuardando(false);
      return;
    }

    // Ya está en la base: el borrador sobra y dejarlo haría que la próxima vez
    // apareciera el aviso sobre una evaluación que sí se guardó.
    descartarBorrador("medicion", atleta.id);

    // Encadena con el paso 3 en vez de volver a la lista: es un wizard, y
    // obligar a buscar al mismo atleta otra vez rompe el hilo de la evaluación.
    router.replace(`/atletas/evaluar?id=${atleta.id}`);
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

  const anterioresNum = anterior as Partial<Record<CampoMedida, number | null>> | null;
  const cuando = anterior ? haceCuanto(anterior.measured_at) : null;

  return (
    <>
      {midiendo && (
        <ModoPliegues
          valores={valores}
          onChange={poner}
          anteriores={anterioresNum ?? undefined}
          fechaAnterior={cuando}
          onCerrar={() => setMidiendo(false)}
        />
      )}

      <div className="space-y-4">
        <PasoWizard
          paso={2}
          titulo={atleta.full_name}
          descripcion={
            anterior ? `Antropometría · última toma ${cuando}` : "Antropometría · primera toma"
          }
        />

        {borrador && (
          <AvisoBorrador
            guardadoEn={borrador.guardadoEn}
            onRestaurar={() => {
              setValores(borrador.datos as Partial<Record<CampoMedida, string>>);
              setBorrador(null);
            }}
            onDescartar={() => {
              descartarBorrador("medicion", atletaId);
              setBorrador(null);
            }}
          />
        )}

        <Bloque rotulo="Básicos">
          {BASICOS.map((campo) => (
            <CampoMedidaInput
              key={campo}
              campo={campo}
              valor={valores[campo] ?? ""}
              onChange={(v) => poner(campo, v)}
              anterior={anterioresNum?.[campo]}
              fechaAnterior={cuando}
            />
          ))}
        </Bloque>

        <Bloque rotulo="Pliegues cutáneos">
          <div className="flex items-baseline justify-between">
            <p className="text-sm">
              {pliegesLlenos === 0
                ? "Sin registrar"
                : `${pliegesLlenos} de ${PLIEGUES.length} tomados`}
            </p>
            <span className="rotulo">protocolo ISAK</span>
          </div>

          <Button
            type="button"
            variant={pliegesLlenos === 0 ? "default" : "outline"}
            className="min-h-12 w-full"
            onClick={() => setMidiendo(true)}
          >
            <Ruler className="size-4" aria-hidden="true" />
            {pliegesLlenos === 0 ? "Empezar a medir" : "Revisar pliegues"}
          </Button>

          {pliegesLlenos > 0 && (
            <ul className="divide-y rounded-lg border">
              {PLIEGUES.map((p) => (
                <li key={p} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{CAMPOS[p].etiqueta}</span>
                  <span className="dato">
                    {valores[p]?.trim() ? `${valores[p]} mm` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque rotulo="Perímetros">
          {PERIMETROS.map((campo) => (
            <CampoMedidaInput
              key={campo}
              campo={campo}
              valor={valores[campo] ?? ""}
              onChange={(v) => poner(campo, v)}
              anterior={anterioresNum?.[campo]}
              fechaAnterior={cuando}
            />
          ))}
        </Bloque>

        <Resultado composicion={composicion} anterior={anterior} faltan={faltan} />

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
            className="min-h-11 flex-1"
            onClick={guardar}
            disabled={guardando || hayBloqueo || pliegesLlenos === 0}
          >
            {guardando ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </div>

        {hayBloqueo && (
          <p className="text-center text-xs text-destructive">
            Corrige las medidas marcadas en rojo para poder guardar.
          </p>
        )}
      </div>
    </>
  );
}

export default function MedirPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Medicion />
      </Suspense>
    </Guarda>
  );
}
