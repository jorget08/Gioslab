"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { EditorAcciones } from "@/components/reglas/editor-acciones";
import { EditorCondicion } from "@/components/reglas/editor-condicion";
import { Guarda } from "@/components/shared/guarda";
import { Bloque } from "@/components/shared/paso-wizard";
import { Button } from "@/components/ui/button";
import {
  DESCRIPCION_EVIDENCIA,
  ETIQUETA_EVIDENCIA,
  NIVELES_EVIDENCIA,
  esNivelEvidencia,
  type NivelEvidencia,
} from "@/domain/evidencia";
import {
  ACCIONES_POR_NIVEL,
  ETIQUETA_NIVEL,
  NIVELES_MOTOR,
  describirRegla,
  validarRegla,
  type Acciones,
  type Condicion,
  type NivelMotor,
  type Regla,
} from "@/domain/reglas";
import { useSesion } from "@/lib/auth/contexto";
import type { Json } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";

/**
 * Escribir una regla sin escribir código (tarea 3.5).
 *
 * EDITAR ES PUBLICAR UNA VERSIÓN NUEVA, nunca pisar la anterior. No es una
 * preferencia: la base solo concede `update (is_active)` sobre `rules`, así que
 * la condición y la justificación son inmutables una vez guardadas. Y está bien
 * que lo sean — un plan generado en marzo apunta a la regla que lo justificó, y
 * si esa fila fuera editable la justificación que lee el entrenador cambiaría
 * retroactivamente y la trazabilidad sería ficticia.
 *
 * Arriba, mientras se escribe, la regla se lee EN ESPAÑOL. Es la misma frase que
 * el entrenador verá en la ficha del atleta cuando pregunte por qué desapareció
 * un ejercicio (§3.6), así que Giovanni redacta mirando exactamente lo que va a
 * leer su cliente. Ese espejo es lo que convierte un formulario en un editor.
 */

const CLASE_CAMPO =
  "min-h-11 w-full rounded-lg border bg-background px-3 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** `Fémur Largo` → `femur-largo`. La clave es identidad, no texto de pantalla. */
function aClave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function Editor() {
  const params = useSearchParams();
  const router = useRouter();
  const { sesion } = useSesion();

  const claveOrigen = params.get("key");
  const desdeId = params.get("desde");
  const esVersionNueva = Boolean(claveOrigen);

  // La clave se DERIVA de la justificación mientras nadie la escriba a mano. Se
  // calcula al renderizar y no en un efecto: guardarla en estado para copiarla
  // de otro estado es duplicar la verdad y arriesgarse a que se desincronicen.
  const [claveManual, setClaveManual] = useState<string | null>(
    claveOrigen ? aClave(claveOrigen) : null,
  );
  const [nivel, setNivel] = useState<NivelMotor>(1);
  const [condicion, setCondicion] = useState<Condicion>({ todas: [] });
  const [acciones, setAcciones] = useState<Acciones>({});
  const [justificacion, setJustificacion] = useState("");
  const [evidencia, setEvidencia] = useState<NivelEvidencia>("LEVEL_B_BIOMECHANICS");
  const [activar, setActivar] = useState(true);

  const [ejercicios, setEjercicios] = useState<string[]>([]);
  const [version, setVersion] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("exercise_library").select("name").eq("is_active", true).order("name"),
      claveOrigen
        ? supabase
            .from("rules")
            .select("rule_key, version, nivel, condition, actions, justification, evidence_level")
            .eq("rule_key", claveOrigen)
            .order("version", { ascending: false })
        : Promise.resolve({ data: null, error: null }),
    ]).then(([ejs, previas]) => {
      if (!vivo) return;
      setEjercicios((ejs.data ?? []).map((e) => e.name as string));

      const filas = (previas.data ?? []) as unknown as (Regla & { id?: string })[];
      if (filas.length > 0) {
        // La versión que se copia es la que pidió el listado; si no vino, la más
        // alta. La NUEVA versión es siempre max+1, aunque se parta de una vieja:
        // `unique (rule_key, version)` no perdona y el número es cronología, no
        // linaje.
        const base = filas.find((f) => f.id === desdeId) ?? filas[0];
        setClaveManual(base.rule_key);
        setNivel(base.nivel as NivelMotor);
        setCondicion(base.condition ?? { todas: [] });
        setAcciones(base.actions ?? {});
        setJustificacion(base.justification ?? "");
        if (esNivelEvidencia(base.evidence_level)) setEvidencia(base.evidence_level);
        setVersion(Math.max(...filas.map((f) => f.version)) + 1);
      }
      setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [claveOrigen, desdeId]);

  const ruleKey = claveManual ?? aClave(justificacion);

  const borrador: Regla = useMemo(
    () => ({
      rule_key: ruleKey,
      version,
      nivel,
      condition: condicion,
      actions: acciones,
      justification: justificacion,
      evidence_level: evidencia,
    }),
    [ruleKey, version, nivel, condicion, acciones, justificacion, evidencia],
  );

  const errores = validarRegla(borrador);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const supabase = createClient();

    // Se desactiva la viva ANTES de insertar: hay un índice único parcial sobre
    // `rule_key where is_active` y la base rechazaría la segunda activa.
    if (activar) {
      const { error: e } = await supabase
        .from("rules")
        .update({ is_active: false })
        .eq("rule_key", ruleKey)
        .eq("is_active", true);
      if (e) {
        setError(`No se pudo retirar la versión anterior: ${e.message}`);
        setGuardando(false);
        return;
      }
    }

    const { error: e } = await supabase.from("rules").insert({
      rule_key: ruleKey,
      version,
      nivel,
      // `condition` y `actions` son jsonb: los tipos generados piden `Json`, y
      // `Condicion`/`Acciones` no llevan índice de string. La forma ya la
      // garantiza `validarRegla` justo arriba, que es más estricto que `Json`.
      condition: condicion as unknown as Json,
      actions: acciones as unknown as Json,
      justification: justificacion,
      evidence_level: evidencia,
      is_active: activar,
      created_by: sesion?.userId ?? null,
    });

    if (e) {
      setError(
        e.code === "23505"
          ? `Ya existe una versión ${version} de "${ruleKey}". Recarga la pantalla para tomar el número siguiente.`
          : e.message,
      );
      setGuardando(false);
      return;
    }

    router.push("/admin/reglas");
  }

  if (cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const sobran = Object.keys(acciones).filter(
    (k) => !ACCIONES_POR_NIVEL[nivel].includes(k as keyof Acciones),
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {esVersionNueva ? "Nueva versión" : "Nueva regla"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {esVersionNueva
            ? `${ruleKey} · quedará como v${version}`
            : "La regla entra en la matriz y se aplica a todos los atletas."}
        </p>
      </header>

      {/* El espejo. Va arriba y no al final a propósito: es lo que se consulta
          mientras se escribe, no lo que se revisa al terminar. */}
      <div className="rounded-xl border border-[color:var(--gl-dorado)]/40 bg-[color:var(--gl-dorado-sv)] p-4">
        <p className="rotulo">Así se lee</p>
        <p className="mt-1.5 text-sm">{describirRegla(borrador)}</p>
      </div>

      <Bloque rotulo="Cuándo se aplica">
        <label className="space-y-1.5">
          <span className="rotulo">Momento del motor</span>
          <select
            className={CLASE_CAMPO}
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value) as NivelMotor)}
          >
            {NIVELES_MOTOR.map((n) => (
              <option key={n} value={n}>
                Nivel {n} · {ETIQUETA_NIVEL[n]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          El nivel es el ORDEN en que el motor ejecuta la regla, y decide qué acciones puede
          tener. No es su importancia: eso lo fija el respaldo, más abajo.
        </p>

        <EditorCondicion condicion={condicion} onCambio={setCondicion} />
      </Bloque>

      <Bloque rotulo="Qué hace">
        {sobran.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-[color:var(--gl-alerta)]">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            {sobran.join(", ")} venía de otro nivel y el nivel {nivel} no la ejecuta. Quítala o
            cambia el nivel; si se guarda así, no hará nada.
          </p>
        )}
        <EditorAcciones
          nivel={nivel}
          acciones={acciones}
          ejercicios={ejercicios}
          onCambio={setAcciones}
        />
      </Bloque>

      <Bloque rotulo="Por qué">
        <label className="space-y-1.5">
          <span className="rotulo">Justificación</span>
          <textarea
            className={`${CLASE_CAMPO} min-h-24 py-2`}
            value={justificacion}
            placeholder="Por debajo de 5 cm el valgo dinámico de rodilla se dispara por compensación cinemática."
            onChange={(e) => setJustificacion(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Esto es lo que lee el entrenador cuando pregunta por qué desapareció un ejercicio. Es
          obligatoria: sin ella el motor decide sin poder explicarse.
        </p>

        <label className="space-y-1.5">
          <span className="rotulo">Respaldo</span>
          <select
            className={CLASE_CAMPO}
            value={evidencia}
            onChange={(e) => setEvidencia(e.target.value as NivelEvidencia)}
          >
            {NIVELES_EVIDENCIA.map((n) => (
              <option key={n} value={n}>
                {ETIQUETA_EVIDENCIA[n]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">{DESCRIPCION_EVIDENCIA[evidencia]}</p>
        <p className="text-xs text-muted-foreground">
          Cuando dos reglas se contradicen sobre lo mismo, gana la de más respaldo. Si empatan,
          el motor lo denuncia en vez de elegir.
        </p>
      </Bloque>

      <Bloque rotulo="Identidad">
        <label className="space-y-1.5">
          <span className="rotulo">Clave</span>
          <input
            type="text"
            className={CLASE_CAMPO}
            value={ruleKey}
            readOnly={esVersionNueva}
            onChange={(e) => setClaveManual(aClave(e.target.value))}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {esVersionNueva
            ? "No cambia entre versiones: es lo que las identifica como la misma regla a lo largo del tiempo."
            : "Se propone sola desde la justificación. Identifica la regla entre todas sus versiones futuras."}
        </p>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 shrink-0 accent-[color:var(--gl-dorado)]"
            checked={activar}
            onChange={(e) => setActivar(e.target.checked)}
          />
          Activarla al guardar
        </label>
        <p className="text-xs text-muted-foreground">
          {activar
            ? esVersionNueva
              ? `Se retira la versión activa de "${ruleKey}" y entra esta. Solo puede haber una viva a la vez.`
              : "Empieza a aplicarse de inmediato a todos los atletas."
            : "Se guarda sin aplicarse. Se puede activar después desde el listado."}
        </p>
      </Bloque>

      {errores.length > 0 && (
        <div className="space-y-1 rounded-xl border border-[color:var(--gl-alerta)]/40 bg-[color:var(--gl-alerta-sv)] p-4">
          <p className="rotulo">Falta algo</p>
          <ul className="space-y-1 text-xs">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[color:var(--gl-peligro)]/40 p-3 text-sm">{error}</p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <Link href="/admin/reglas">Cancelar</Link>
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={errores.length > 0 || guardando}
          onClick={() => void guardar()}
        >
          {guardando ? "Guardando…" : esVersionNueva ? `Publicar v${version}` : "Crear regla"}
        </Button>
      </div>
    </div>
  );
}

export default function ReglaPage() {
  return (
    <Guarda roles={["super_admin"]}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Editor />
      </Suspense>
    </Guarda>
  );
}
