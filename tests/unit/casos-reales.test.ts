import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { porcentajeGrasoYuhasz } from "@/domain/calculations/composicion-corporal";
import type { Ejercicio } from "@/domain/ejercicios";
import { evaluar, excluidos, incluidos, type Hechos } from "@/domain/motor";
import { NIVELES_MOTOR, type Regla } from "@/domain/reglas";

/**
 * GOLDEN TESTS DEL MOTOR con atletas reales (tarea 3.4).
 *
 * Entrada conocida → salida esperada. Los dos atletas son personas a las que
 * Giovanni entrena de verdad, y lo esperado sale de los planes en PDF que les
 * entregó el 2026-08-27, no de mi criterio.
 *
 * SE EVALÚA CONTRA LA MATRIZ REAL, la que carga la migración de la 3.3, no
 * contra reglas escritas para el test. Unas reglas inventadas probarían que el
 * motor sabe ejecutar reglas inventadas, que no es lo que hay que proteger. Lo
 * que hay que proteger es que editar la matriz no rompa a un cliente suyo.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20260827200000_matriz_giovanni.sql", import.meta.url),
  "utf8",
);

function matriz(): Regla[] {
  const bloque = SQL.slice(SQL.indexOf("from (values"), SQL.indexOf(") as v(rule_key"));
  const re =
    /\('([a-z0-9-]+)',\s*([1-4]),\s*'([\s\S]*?)'::jsonb,\s*'([\s\S]*?)'::jsonb,\s*'([\s\S]*?)',\s*'(LEVEL_[A-Z_]+)'\)/g;
  return [...bloque.matchAll(re)].map((m) => ({
    rule_key: m[1],
    version: 1,
    nivel: Number(m[2]),
    condition: JSON.parse(m[3]),
    actions: JSON.parse(m[4]),
    justification: m[5].replace(/''/g, "'"),
    evidence_level: m[6],
  }));
}

function biblioteca(): Ejercicio[] {
  const bloque = SQL.slice(
    SQL.indexOf("insert into public.exercise_library"),
    SQL.indexOf("on conflict (name) do nothing"),
  );
  return [...bloque.matchAll(/\('([^']+)',\s*'([^']*)',\s*'([a-z_]+)',\s*'([^']*)'\)/g)].map(
    (m, i) => ({
      id: String(i),
      name: m[1],
      description: null,
      target_muscle: m[2],
      movement_pattern: m[3],
      biomechanical_type: null,
      equipment: m[4],
      // Vacías, como las carga la migración: qué contraindica cada ejercicio
      // sigue pendiente de él (tarea 4.5).
      contraindications: [],
      is_active: true,
    }),
  );
}

const REGLAS = matriz();
const EJERCICIOS = biblioteca();

const correr = (hechos: Hechos) => evaluar({ hechos, reglas: REGLAS, ejercicios: EJERCICIOS });

describe("la matriz y la biblioteca se leyeron de la migración", () => {
  it("hay reglas de los cuatro niveles y ejercicios que nombrar", () => {
    // Sin esto, un cambio de formato en el SQL dejaría las listas vacías y todo
    // lo de abajo pasaría sobre la nada.
    expect(REGLAS.length).toBe(25);
    expect(EJERCICIOS.length).toBeGreaterThan(25);
    for (const n of NIVELES_MOTOR) {
      expect(REGLAS.some((r) => r.nivel === n), `nivel ${n}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe("golden · Diego Mafla (41 años, 80 kg, Σ6 106 mm)", () => {
  // Su ficha real. El % graso NO se escribe a mano: se calcula, para que si la
  // fórmula cambia este test se caiga con ella.
  const PCT = porcentajeGrasoYuhasz(106, "masculino"); // 13.7256

  const r = correr({ sexo: "masculino", porcentaje_graso: PCT, lesiones: [], condiciones: [] });

  it("cae en la banda 'promedio / saludable' de su tabla", () => {
    // 12% ≤ 13.73% ≤ 20% → volumen estándar.
    expect(r.volumenSeries).toEqual({ min: 12, max: 16 });
  });

  it("el plan que le entregó reparte series dentro de esa banda", () => {
    // Del PDF: pectoral 15, dorsal 16, deltoides 14, cuádriceps 14, isquios 12.
    // Los grupos pequeños (brazos y gemelos, 10) van por debajo a propósito, así
    // que se comprueban los grandes, que son los que la regla dosifica.
    for (const series of [15, 16, 14, 14, 12]) {
      expect(series).toBeGreaterThanOrEqual(r.volumenSeries!.min);
      expect(series).toBeLessThanOrEqual(r.volumenSeries!.max);
    }
  });

  it("sin evaluación biomecánica no se le quita ningún ejercicio", () => {
    // Nadie le midió el tobillo ni el hombro. El motor NO da por buena una
    // movilidad que no existe: no excluye, pero deja la evaluación incompleta.
    expect(excluidos(r)).toHaveLength(0);
    expect(r.completo).toBe(false);
    expect(r.sinEvaluar.length).toBeGreaterThan(0);
  });

  it("no se le reclama la fase menstrual", () => {
    // El predicado de sexo hace que las reglas de ciclo se descarten limpiamente
    // en vez de quedar "sin evaluar" pidiendo un dato imposible.
    const faltan = r.sinEvaluar.flatMap((s) => s.faltan);
    expect(faltan).not.toContain("fase_ciclo");
    expect(faltan).not.toContain("pico_ovulatorio");
  });
});

describe("golden · Daniela Méndez (33 años, 79 kg, Σ6 145 mm)", () => {
  const PCT = porcentajeGrasoYuhasz(145, "femenino"); // 26.026

  const r = correr({ sexo: "femenino", porcentaje_graso: PCT, lesiones: [], condiciones: [] });

  it("cae en la banda 'promedio / saludable' de mujer", () => {
    // 20% ≤ 26.03% ≤ 28% → volumen estándar.
    expect(r.volumenSeries).toEqual({ min: 12, max: 16 });
  });

  it("con la toma de su plan v2 (Σ6 155, 27.57%) sigue en la misma banda", () => {
    const v2 = correr({
      sexo: "femenino",
      porcentaje_graso: porcentajeGrasoYuhasz(155, "femenino"),
      lesiones: [],
      condiciones: [],
    });
    expect(v2.volumenSeries).toEqual({ min: 12, max: 16 });
  });

  it("en lútea tardía se le recorta el volumen y sube el RIR", () => {
    const lutea = correr({
      sexo: "femenino",
      porcentaje_graso: PCT,
      fase_ciclo: "Lútea Tardía",
      lesiones: [],
      condiciones: [],
    });
    expect(lutea.volumenFactor).toBe(0.75);
    expect(lutea.rir.delta).toBe(2);
  });

  it("en el pico ovulatorio se prioriza la cadena cinética cerrada", () => {
    const pico = correr({
      sexo: "femenino",
      porcentaje_graso: PCT,
      pico_ovulatorio: true,
      lesiones: [],
      condiciones: [],
    });
    const prioritarios = incluidos(pico).filter((e) => e.prioritario);
    expect(prioritarios.map((e) => e.ejercicio)).toContain("Prensa 45°");
    // El modificador viaja CON los ejercicios que la regla señala, no como
    // ajuste general: "priorizar cadena cinética cerrada" no significa nada
    // suelto, significa algo pegado a la prensa.
    const prensa = prioritarios.find((e) => e.ejercicio === "Prensa 45°")!;
    expect(prensa.modificadores.join(" ")).toContain("laxitud");
  });
});

// ---------------------------------------------------------------------------

describe("las bandas de volumen base no dejan huecos", () => {
  // Su tabla es contigua: < 12, [12, 20], > 20. Un atleta con exactamente 20.0%
  // tiene que caer en alguna. Con `entre` —cerrado abajo y abierto arriba— se
  // quedaba fuera de las tres y sin volumen base, en silencio.
  const bandas = (sexo: "masculino" | "femenino", pct: number) =>
    correr({ sexo, porcentaje_graso: pct, lesiones: [], condiciones: [] }).volumenSeries;

  it.each([5, 11.9, 12, 15, 20, 20.1, 35])("un hombre al %s%% tiene volumen base", (pct) => {
    expect(bandas("masculino", pct)).not.toBeNull();
  });

  it.each([5, 19.9, 20, 24, 28, 28.1, 40])("una mujer al %s%% tiene volumen base", (pct) => {
    expect(bandas("femenino", pct)).not.toBeNull();
  });

  it("y ninguna banda se solapa con otra: nunca hay conflicto", () => {
    for (const pct of [11.9, 12, 15, 20, 20.1, 35]) {
      const r = correr({ sexo: "masculino", porcentaje_graso: pct, lesiones: [], condiciones: [] });
      expect(r.conflictos.filter((c) => c.nivel === 4), `${pct}%`).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------

describe("golden · las reglas de seguridad sobre un atleta medido", () => {
  const MEDIDO: Hechos = {
    sexo: "masculino",
    porcentaje_graso: 13.7,
    dorsiflexion_cm: 4,
    flexion_hombro_grados: 160,
    rotacion_externa_hombro_grados: 60,
    slr_grados: 65,
    thomas_test_grados: -5,
    lesiones: [],
    condiciones: [],
  };

  const r = correr(MEDIDO);

  it("dorsiflexión severa quita la sentadilla libre profunda y el hack libre", () => {
    const fuera = excluidos(r).map((e) => e.ejercicio);
    expect(fuera).toContain("Sentadilla Libre Profunda");
    expect(fuera).toContain("Hack Libre");
  });

  it("y ofrece los sustitutos que él escribió, todos vivos", () => {
    const sent = excluidos(r).find((e) => e.ejercicio === "Sentadilla Libre Profunda")!;
    expect(sent.sustitutos).toContain("Sentadilla Heels-Elevated");
    expect(sent.sustitutos).toContain("Prensa 45°");
    // Un sustituto excluido no es un sustituto.
    const fuera = new Set(excluidos(r).map((e) => e.ejercicio));
    for (const s of sent.sustitutos) expect(fuera.has(s)).toBe(false);
  });

  it("hombro restringido quita el press tras nuca y el overhead", () => {
    const fuera = excluidos(r).map((e) => e.ejercicio);
    expect(fuera).toContain("Press Militar tras Nuca");
    expect(fuera).toContain("Press Overhead con Barra");
  });

  it("SLR corto quita el peso muerto convencional pero deja el rumano", () => {
    const fuera = excluidos(r).map((e) => e.ejercicio);
    expect(fuera).toContain("Peso Muerto Convencional");
    expect(fuera).not.toContain("Peso Muerto Rumano desde Bloque");
  });

  it("el Thomas Test acortado no quita nada: ajusta la sesión", () => {
    // Su matriz distingue "bloquear" de "permitir con adaptación". Perder esa
    // distinción convertiría el copiloto en un censor.
    expect(r.modificadoresGenerales.join(" ")).toContain("Hip Thrust");
    expect(excluidos(r).map((e) => e.ejercicio)).not.toContain("Hip Thrust con Barra");
  });

  it("cada exclusión llega con la regla que la causó y su justificación", () => {
    // §3.6. Sin esto el entrenador ve desaparecer ejercicios sin motivo.
    for (const e of excluidos(r)) {
      expect(e.porQue.length, e.ejercicio).toBeGreaterThan(0);
      for (const p of e.porQue) {
        expect(p.justification.trim(), `${e.ejercicio} · ${p.rule_key}`).not.toBe("");
      }
    }
  });

  it("con la movilidad medida pero sin vectores, la evaluación sigue incompleta", () => {
    // Y eso es lo correcto: nadie le ha clasificado la dominancia ni los
    // vectores, que son nivel 3. El motor lo dice en vez de dar por buena una
    // clasificación que no existe.
    expect(r.completo).toBe(false);
    const faltan = new Set(r.sinEvaluar.flatMap((s) => s.faltan));
    expect(faltan).toContain("dominancia_sentadilla");
    expect(faltan).toContain("vector_gluteo");
  });

  it("con la ficha entera, ya no falta nada", () => {
    const completo = correr({
      ...MEDIDO,
      dominancia_sentadilla: "Dominante de Rodilla",
      vector_gluteo: "Vector Horizontal",
      dominancia_espalda: "Vector Vertical (Dorsal)",
      pico_ovulatorio: false,
    });
    expect(completo.sinEvaluar).toEqual([]);
    expect(completo.completo).toBe(true);
  });
});

describe("golden · hipertensión, la contraindicación sistémica", () => {
  const r = correr({
    sexo: "masculino",
    porcentaje_graso: 22,
    lesiones: [],
    condiciones: ["Hipertensión / Cardiovascular"],
  });

  it("prohíbe Valsalva y pone suelo al RIR, sin quitar ejercicios", () => {
    expect(r.maniobrasProhibidas).toContain("Valsalva");
    expect(r.rir.piso).toBe(2);
    expect(excluidos(r)).toHaveLength(0);
  });
});
