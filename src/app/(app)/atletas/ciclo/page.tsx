"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CampoFecha } from "@/components/shared/campo-fecha";
import { GrupoOpciones } from "@/components/shared/grupo-opciones";
import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  adaptacionPorCiclo,
  avisoDuracionCiclo,
  DURACION_CICLO,
} from "@/domain/calculations/ciclo-menstrual";
import { VERSION_POLITICA } from "@/domain/catalogos";
import { fechaCorta } from "@/domain/evolucion";
import { createClient } from "@/lib/supabase/client";

/**
 * Registro del ciclo menstrual — módulo FEMTECH.
 *
 * Faltaba y era un agujero de verdad: la ficha ya sabía enseñar la fase y el
 * ajuste de volumen, la base ya guardaba los registros, pero NO HABÍA DÓNDE
 * ESCRIBIRLOS. Lo único que se veía era lo que traía el seed.
 *
 * SE INSERTA, NO SE EDITA. Cada mes es un registro nuevo y la fase se calcula
 * contra el más reciente (§3.5). Corregir una fecha mal tecleada es anular ese
 * registro, no pisarlo: el histórico del ciclo es parte del seguimiento.
 *
 * CONSENTIMIENTO APARTE. Son datos de salud reproductiva, la categoría más
 * sensible de la Ley 1581, y su autorización es distinta de la general. Si el
 * atleta no la dio, aquí no se guarda nada: se ofrece registrarla primero, con
 * el texto que redactó Giovanni.
 */

interface Atleta {
  id: string;
  tenant_id: string;
  full_name: string;
  sex: string;
}

interface Registro {
  id: string;
  last_period_start: string;
  cycle_length_days: number;
  uses_hormonal_contraception: boolean;
}

/** El texto es de Giovanni (MÓDULO 07). No se reescribe: es lo que se firma. */
const TEXTO_CONSENTIMIENTO =
  "Autorizo expresamente el tratamiento de mis datos de ciclo menstrual exclusivamente para " +
  "la personalización y autorregulación de mi programa de entrenamiento en GiosLab System®.";

const PREFIJO_CONSENTIMIENTO = "ciclo-";

function Ciclo() {
  const params = useSearchParams();
  const router = useRouter();
  const atletaId = params.get("id") ?? "";

  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(Boolean(atletaId));

  const [fum, setFum] = useState("");
  const [duracion, setDuracion] = useState(String(DURACION_CICLO.defecto));
  const [anticonceptivos, setAnticonceptivos] = useState<"no" | "si">();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!atletaId) return;
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("athletes").select("id, tenant_id, full_name, sex").eq("id", atletaId).single(),
      supabase
        .from("menstrual_cycle_logs")
        .select("id, last_period_start, cycle_length_days, uses_hormonal_contraception")
        .eq("athlete_id", atletaId)
        .is("voided_at", null)
        .order("last_period_start", { ascending: false })
        .limit(6),
      supabase
        .from("athlete_consents")
        .select("policy_version, revoked_at")
        .eq("athlete_id", atletaId),
    ]).then(([a, r, c]) => {
      if (!vivo) return;
      setAtleta(a.data as Atleta | null);

      const registros = (r.data ?? []) as Registro[];
      setHistorial(registros);
      // Se arrastra lo del último registro: la duración del ciclo y el uso de
      // anticonceptivos no cambian de un mes a otro, y volver a teclearlos cada
      // vez es la clase de fricción que hace que se deje de registrar.
      if (registros[0]) {
        setDuracion(String(registros[0].cycle_length_days));
        setAnticonceptivos(registros[0].uses_hormonal_contraception ? "si" : "no");
      }

      const consentimientos = (c.data ?? []) as { policy_version: string; revoked_at: string | null }[];
      setAutorizado(
        consentimientos.some(
          (x) => x.policy_version.startsWith(PREFIJO_CONSENTIMIENTO) && !x.revoked_at,
        ),
      );
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [atletaId]);

  async function autorizar() {
    if (!atleta) return;
    setGuardando(true);
    setError(null);

    const supabase = createClient();
    const { data: sesionActual } = await supabase.auth.getUser();
    const autor = sesionActual.user?.id;

    if (!autor) {
      // `granted_by` es NOT NULL a propósito: un consentimiento sin quien lo
      // recogió no demuestra nada ante la Ley 1581.
      setError("Tu sesión caducó. Vuelve a entrar para registrar la autorización.");
      setGuardando(false);
      return;
    }

    const { error: e } = await supabase.from("athlete_consents").insert({
      athlete_id: atleta.id,
      tenant_id: atleta.tenant_id,
      policy_version: `${PREFIJO_CONSENTIMIENTO}${VERSION_POLITICA}`,
      granted_by: autor,
    });

    if (e) {
      setError("No pudimos registrar la autorización. Inténtalo de nuevo.");
      setGuardando(false);
      return;
    }

    setAutorizado(true);
    setGuardando(false);
  }

  const dias = Number(duracion.trim());
  const avisoDuracion = Number.isFinite(dias) && duracion.trim() !== "" ? avisoDuracionCiclo(dias) : null;

  // Resultado en vivo: la misma idea que en la antropometría. Ver la fase antes
  // de guardar es lo que permite cazar una fecha mal tecleada.
  const vista =
    fum && Number.isFinite(dias) && anticonceptivos && avisoDuracion?.nivel !== "bloquea"
      ? adaptacionPorCiclo({
          ultimaMenstruacion: new Date(`${fum}T12:00:00`),
          duracionCicloDias: dias,
          usaAnticonceptivos: anticonceptivos === "si",
        })
      : null;

  const puedeGuardar =
    Boolean(fum) && Boolean(anticonceptivos) && avisoDuracion?.nivel !== "bloquea" && !guardando;

  async function guardar() {
    if (!atleta || !puedeGuardar) return;
    setGuardando(true);
    setError(null);

    const { error: e } = await createClient().from("menstrual_cycle_logs").insert({
      athlete_id: atleta.id,
      tenant_id: atleta.tenant_id,
      last_period_start: fum,
      cycle_length_days: dias,
      uses_hormonal_contraception: anticonceptivos === "si",
    });

    if (e) {
      setError("No pudimos guardar el registro. Inténtalo de nuevo.");
      setGuardando(false);
      return;
    }

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

  const cabecera = (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{atleta.full_name}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">Ciclo menstrual</p>
    </header>
  );

  if (atleta.sex !== "femenino") {
    return (
      <div className="space-y-4">
        {cabecera}
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este módulo solo aplica a atletas de sexo femenino.
        </div>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href={`/atletas/ficha?id=${atleta.id}`}>Volver a la ficha</Link>
        </Button>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="space-y-4">
        {cabecera}

        <Bloque rotulo="Falta la autorización">
          <p className="text-sm text-muted-foreground">
            El ciclo menstrual es un dato de salud reproductiva y necesita una autorización
            propia, distinta de la general de la evaluación. Sin ella no se guarda nada.
          </p>

          <p className="rounded-lg border border-dashed p-3 text-sm">“{TEXTO_CONSENTIMIENTO}”</p>

          <p className="text-xs text-muted-foreground">
            Márcala solo si la atleta lo autoriza de verdad. Queda registrada con la fecha y
            con tu nombre, y se puede revocar después.
          </p>
        </Bloque>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button asChild variant="outline" className="min-h-11 flex-1">
            <Link href={`/atletas/ficha?id=${atleta.id}`}>Cancelar</Link>
          </Button>
          <Button type="button" className="min-h-11 flex-[2]" onClick={autorizar} disabled={guardando}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            {guardando ? "Registrando…" : "La atleta lo autoriza"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cabecera}

      <Bloque rotulo="Nuevo registro">
        <CampoFecha
          etiqueta="Primer día de la última menstruación"
          ayuda="El día 1 del sangrado, no el último"
          nombre="fum"
          valor={fum}
          onChange={setFum}
          desdeAnio={new Date().getFullYear() - 2}
        />

        <div className="space-y-1.5">
          <Label htmlFor="duracion">Duración del ciclo</Label>
          <div className="flex items-center gap-2">
            <input
              id="duracion"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="h-11 w-24 rounded-lg border border-input bg-background px-3 text-lg tabular-nums outline-none focus:ring-2 focus:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
          {avisoDuracion ? (
            <p
              role={avisoDuracion.nivel === "bloquea" ? "alert" : undefined}
              className={
                avisoDuracion.nivel === "bloquea"
                  ? "text-xs font-medium text-destructive"
                  : "text-xs text-[color:var(--gl-alerta)]"
              }
            >
              {avisoDuracion.mensaje}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Lo habitual son 28 días.</p>
          )}
        </div>

        <GrupoOpciones
          nombre="anticonceptivos"
          etiqueta="¿Usa anticonceptivos hormonales?"
          ayuda="Aplanan la fluctuación, así que el volumen deja de ajustarse por fase"
          opciones={[
            { valor: "no", texto: "No" },
            { valor: "si", texto: "Sí" },
          ]}
          valor={anticonceptivos}
          onChange={setAnticonceptivos}
          columnas
        />
      </Bloque>

      {/* Ver la fase ANTES de guardar es lo que caza una fecha mal tecleada:
          un "día 24" cuando la atleta acaba de terminar el periodo canta solo. */}
      {vista && (
        <Bloque rotulo="Con esto, hoy">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-lg font-medium">{vista.fase}</p>
              {vista.fase !== "Anticonceptivo" && (
                <p className="text-xs text-muted-foreground">
                  Día {vista.diaDelCiclo} · {vista.prescripcion.rango}
                </p>
              )}
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              ×{vista.multiplicadorVolumen}
            </span>
          </div>
          <p className="text-sm">{vista.prescripcion.ajuste}</p>
        </Bloque>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href={`/atletas/ficha?id=${atleta.id}`}>Cancelar</Link>
        </Button>
        <Button type="button" className="min-h-11 flex-[2]" onClick={guardar} disabled={!puedeGuardar}>
          {guardando ? "Guardando…" : "Guardar registro"}
        </Button>
      </div>

      {historial.length > 0 && (
        <Bloque rotulo={`Registros anteriores · ${historial.length}`}>
          <ul className="divide-y">
            {historial.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span>{fechaCorta(`${r.last_period_start}T12:00:00`)}</span>
                <span className="text-muted-foreground">
                  {r.cycle_length_days} días
                  {r.uses_hormonal_contraception ? " · con anticonceptivos" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Cada mes se añade un registro nuevo; los anteriores no se pisan.
          </p>
        </Bloque>
      )}
    </div>
  );
}

export default function CicloPage() {
  return (
    <Guarda roles={["super_admin", "gym", "trainer"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Ciclo />
      </Suspense>
    </Guarda>
  );
}
