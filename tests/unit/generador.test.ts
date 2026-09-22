import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Ejercicio } from "@/domain/ejercicios";
import { generarPlan, type EntradaGenerador } from "@/domain/generador";
import { leerMetodo, type Metodo } from "@/domain/metodo";
import type { DecisionEjercicio, Resultado } from "@/domain/motor";
import { seriesPorEjercicioEnSemana, validarPlan, type Plan } from "@/domain/plan";
import type { Relacion } from "@/domain/relaciones";

/**
 * El generador (tarea 5.3).
 *
 * Se prueba contra el MÉTODO REAL, leído de su migración, y no contra un método
 * de juguete: la mitad de lo que puede salir mal aquí es que sus cifras y esta
 * aritmética no encajen —que no se llegue a sus series semanales, que el RPE
 * salga al revés—, y con un método inventado eso no se ve.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20260903100000_metodo_programacion.sql", import.meta.url),
  "utf8",
);
const METODO: Metodo = leerMetodo(
  JSON.parse(SQL.slice(SQL.indexOf("$json$") + 6, SQL.lastIndexOf("$json$"))),
)!;

// --- Andamiaje -------------------------------------------------------------

let siguienteId = 0;
const ejercicio = (name: string, movement_pattern: string, target_muscle: string): Ejercicio => ({
  id: `e${++siguienteId}`,
  name,
  description: null,
  target_muscle,
  movement_pattern,
  biomechanical_type: null,
  equipment: null,
  contraindications: [],
  is_active: true,
});

const BIBLIOTECA: Ejercicio[] = [
  ejercicio("Press de Banca Plano", "horizontal_push", "Pectoral"),
  ejercicio("Press Inclinado a 60°", "horizontal_push", "Pectoral"),
  ejercicio("Press Militar", "vertical_push", "Deltoides"),
  ejercicio("Press Militar Sentado", "vertical_push", "Deltoides"),
  ejercicio("Remo con Barra", "horizontal_pull", "Dorsal"),
  ejercicio("Remo en Polea", "horizontal_pull", "Dorsal"),
  ejercicio("Jalón al Pecho", "vertical_pull", "Dorsal"),
  ejercicio("Dominadas", "vertical_pull", "Dorsal"),
  ejercicio("Sentadilla Goblet", "squat_dominante_rodilla", "Cuádriceps"),
  ejercicio("Prensa 45°", "squat_dominante_rodilla", "Cuádriceps"),
  ejercicio("Hip Thrust", "hip_hinge_dominante_cadera", "Glúteo"),
  ejercicio("Peso Muerto Rumano", "hip_hinge_dominante_cadera", "Isquiosurales"),
  ejercicio("Curl de Bíceps", "isolation_accessory", "Bíceps"),
  ejercicio("Extensiones de Tríceps", "isolation_accessory", "Tríceps"),
  ejercicio("Elevaciones Laterales", "isolation_accessory", "Deltoides"),
  ejercicio("Elevación de Talones", "isolation_accessory", "Gemelos"),
  ejercicio("Plancha", "core_anti_flexion_extension", "Core"),
];

const decision = (nombre: string, p: Partial<DecisionEjercicio> = {}): DecisionEjercicio => ({
  ejercicio: nombre,
  incluido: true,
  porQue: [],
  sustitutos: [],
  modificadores: [],
  prioritario: false,
  ...p,
});

const resultado = (p: Partial<Resultado> = {}): Resultado => ({
  ejercicios: BIBLIOTECA.map((e) => decision(e.name)),
  modificadoresGenerales: [],
  volumenFactor: 1,
  volumenSeries: null,
  rir: {},
  maniobrasProhibidas: [],
  ratioPatron: null,
  aplicadas: [],
  conflictos: [],
  sinEvaluar: [],
  completo: true,
  ...p,
});

const entrada = (p: Partial<EntradaGenerador> = {}): EntradaGenerador => ({
  resultado: resultado(),
  metodo: METODO,
  ejercicios: BIBLIOTECA,
  relaciones: [],
  atleta: { sexo: "masculino", training_goal: "Hipertrofia (Masa Muscular)" },
  opciones: { diasPorSemana: 4, semanas: 5 },
  ...p,
});

/** Todos los ejercicios prescritos de una semana, aplanados. */
const delPlan = (plan: Plan, semana = 0) =>
  plan.semanas[semana].dias.flatMap((d) => d.central.ejercicios);

// --- Lo que sale -----------------------------------------------------------

describe("el plan que sale", () => {
  const { plan, avisos, errores } = generarPlan(entrada());

  it("se genera y es un plan válido", () => {
    expect(errores).toEqual([]);
    expect(plan).not.toBeNull();
    expect(validarPlan(plan!)).toEqual([]);
  });

  it("tiene las semanas y los días pedidos", () => {
    expect(plan!.semanas).toHaveLength(5);
    expect(plan!.semanas[0].dias).toHaveLength(4);
    expect(plan!.diasPorSemana).toBe(4);
  });

  it("los títulos de los días son los suyos", () => {
    expect(plan!.semanas[0].dias.map((d) => d.titulo)).toEqual([
      "Torso (Empuje/Tracción)",
      "Pierna (Cuádriceps/Cadera)",
      "Torso (Enfoque Secundario)",
      "Pierna (Enfoque Secundario)",
    ]);
  });

  it("cada día trae las tres fases", () => {
    for (const d of plan!.semanas[0].dias) {
      expect(d.preparacion.bloques.length).toBeGreaterThan(0);
      expect(d.central.ejercicios.length).toBeGreaterThan(0);
      expect(d.final.cierre).toBe("recuperacion_activa");
    }
  });

  it("el objetivo y la periodización salen de su método", () => {
    // Hipertrofia → ondulante, que es lo que dijo el 2-sep: manda el objetivo.
    expect(plan!.objetivo).toBe("hipertrofia");
    expect(plan!.periodizacion).toBe("ondulante");
  });

  it("las repeticiones, el RPE y el descanso son los suyos", () => {
    const press = delPlan(plan!).find((e) => e.ejercicio === "Press de Banca Plano")!;
    expect([press.repMin, press.repMax]).toEqual([6, 12]);
    expect([press.rpePrimeras, press.rpeUltima]).toEqual([7.5, 9]);
    // Compuesto: arriba de su rango de descanso. Aislamiento: abajo.
    expect(press.descansoSeg).toBe(180);
    const curl = delPlan(plan!).find((e) => e.ejercicio === "Curl de Bíceps");
    if (curl) expect(curl.descansoSeg).toBe(90);
  });

  it("agota la biblioteca aprobada antes de repetir nada", () => {
    // Sus planes reales cambian de ejercicio entre el día A y el día B del
    // mismo grupo. Repetir solo se permite cuando ya no queda nada sin usar que
    // quepa en ese día — y entonces es su propio reparto, que entrena el mismo
    // patrón dos veces por semana.
    const nombres = delPlan(plan!).map((e) => e.ejercicio);
    const sinDia = ["Plancha"]; // el reparto de 4 días no tiene día de core
    for (const e of BIBLIOTECA) {
      if (sinDia.includes(e.name)) continue;
      expect(nombres, `falta ${e.name}`).toContain(e.name);
    }
  });

  it("ningún día repite un ejercicio dentro del mismo día", () => {
    for (const d of plan!.semanas[0].dias) {
      const nombres = d.central.ejercicios.map((e) => e.ejercicio);
      expect(new Set(nombres).size, d.titulo).toBe(nombres.length);
    }
  });

  it("el aislamiento acompaña al grupo del día", () => {
    // Unas elevaciones laterales en el día de pierna son técnicamente legales y
    // metodológicamente absurdas.
    const diaPierna = plan!.semanas[0].dias[1].central.ejercicios.map((e) => e.ejercicio);
    expect(diaPierna).not.toContain("Elevaciones Laterales");
  });

  it("un día de torso no sale con cuatro empujes y ninguna tracción", () => {
    const patronDe = new Map(BIBLIOTECA.map((e) => [e.name, e.movement_pattern]));
    const dia1 = plan!.semanas[0].dias[0].central.ejercicios.map((e) => patronDe.get(e.ejercicio));
    expect(new Set(dia1).size).toBe(dia1.length);
  });

  it("es determinista: dos llamadas dan el mismo plan", () => {
    // La 5.6 compara su salida con los planes que él ya entregó, y eso solo se
    // puede hacer si el resultado es reproducible.
    expect(generarPlan(entrada()).plan).toEqual(generarPlan(entrada()).plan);
  });

  it("no avisa de nada raro con la biblioteca completa", () => {
    expect(avisos).toEqual([]);
  });
});

// --- Volumen ---------------------------------------------------------------

describe("el volumen semanal es el suyo", () => {
  it("cada grupo cae dentro de su rango de series", () => {
    const { plan } = generarPlan(entrada());
    const porEjercicio = seriesPorEjercicioEnSemana(plan!.semanas[0]);
    const grupoDe = (n: string) =>
      METODO.grupoPorMusculo[BIBLIOTECA.find((e) => e.name === n)!.target_muscle!];

    const porGrupo: Record<string, number> = {};
    for (const [nombre, series] of Object.entries(porEjercicio)) {
      const g = grupoDe(nombre);
      if (g) porGrupo[g] = (porGrupo[g] ?? 0) + series;
    }

    for (const [grupo, series] of Object.entries(porGrupo)) {
      const rango = METODO.seriesSemanales[grupo];
      expect(series, `${grupo}: ${series} series`).toBeGreaterThanOrEqual(rango.min);
      expect(series, `${grupo}: ${series} series`).toBeLessThanOrEqual(rango.max);
    }
  });

  it("cuando no se llega a su mínimo, se dice con el número exacto", () => {
    // Un atleta al que el motor le deja un solo ejercicio de pecho no puede
    // llegar a sus 10 series: 5 es el techo por ejercicio. Fingir que cumple
    // sería peor que avisar.
    const solo = BIBLIOTECA.filter((e) => e.name !== "Press Inclinado a 60°");
    const { plan, avisos } = generarPlan(
      entrada({
        ejercicios: solo,
        resultado: resultado({ ejercicios: solo.map((e) => decision(e.name)) }),
      }),
    );
    expect(plan).not.toBeNull();
    expect(avisos.join(" ")).toContain("Pecho: quedan 5 series");
  });

  it("el factor de volumen del motor escala su rango", () => {
    // 0.75 es su deload de fase lútea tardía: el rango de pecho pasa de 10–20 a
    // 8–15, y el plan tiene que caber ahí.
    const { plan } = generarPlan(entrada({ resultado: resultado({ volumenFactor: 0.75 }) }));
    const porEjercicio = seriesPorEjercicioEnSemana(plan!.semanas[0]);
    const pecho =
      (porEjercicio["Press de Banca Plano"] ?? 0) + (porEjercicio["Press Inclinado a 60°"] ?? 0);
    expect(pecho).toBeLessThanOrEqual(15);
    expect(pecho).toBeGreaterThanOrEqual(8);
  });

  it("el volumen_series del motor sustituye al rango del método", () => {
    // Nivel 4: si una regla suya fija el volumen, manda sobre la tabla general.
    const { plan } = generarPlan(
      entrada({ resultado: resultado({ volumenSeries: { min: 6, max: 8 } }) }),
    );
    const porEjercicio = seriesPorEjercicioEnSemana(plan!.semanas[0]);
    const espalda = ["Remo con Barra", "Remo en Polea", "Jalón al Pecho", "Dominadas"]
      .map((n) => porEjercicio[n] ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(espalda).toBeLessThanOrEqual(8);
  });

  it("el core se prescribe sin tope, y se dice", () => {
    // Su tabla de volumen tiene cinco filas y core no es una.
    const { avisos } = generarPlan(entrada({ opciones: { diasPorSemana: 3, semanas: 4 } }));
    expect(avisos.join(" ")).toContain("Core");
    expect(avisos.join(" ")).toContain("sin tope");
  });
});

// --- Lo que manda el motor -------------------------------------------------

describe("el motor manda sobre el método", () => {
  it("lo que excluyó no entra en el plan", () => {
    const sinSentadillas = resultado({
      ejercicios: BIBLIOTECA.map((e) =>
        decision(e.name, { incluido: !e.name.startsWith("Sentadilla") }),
      ),
    });
    const { plan } = generarPlan(entrada({ resultado: sinSentadillas }));
    expect(delPlan(plan!).map((e) => e.ejercicio)).not.toContain("Sentadilla Goblet");
  });

  it("un suelo de RIR recorta el RPE", () => {
    // RIR 3 de suelo es RPE 7 de techo: por debajo del 7,5–9 de hipertrofia.
    const { plan, avisos } = generarPlan(entrada({ resultado: resultado({ rir: { piso: 3 } }) }));
    const uno = delPlan(plan!)[0];
    expect(uno.rpeUltima).toBe(7);
    expect(uno.rpePrimeras).toBeLessThanOrEqual(7);
    expect(avisos.join(" ")).toContain("bajó la intensidad");
  });

  it("sus modificadores viajan con el ejercicio", () => {
    const conMod = resultado({
      ejercicios: BIBLIOTECA.map((e) =>
        decision(e.name, {
          modificadores: e.name === "Hip Thrust" ? ["3–4 repeticiones más en el lado débil"] : [],
        }),
      ),
    });
    const { plan } = generarPlan(entrada({ resultado: conMod }));
    const hip = delPlan(plan!).find((e) => e.ejercicio === "Hip Thrust")!;
    expect(hip.notas).toContain("lado débil");
  });

  it("lo que vale para la sesión entera va en el día, no bajo cada ejercicio", () => {
    // "Elevar talones" bajo un Press Militar es absurdo, y repetido seis veces
    // desacredita a las seis.
    const { plan } = generarPlan(
      entrada({
        resultado: resultado({
          modificadoresGenerales: ["Elevar talones 2,5 cm"],
          maniobrasProhibidas: ["Valsalva"],
        }),
      }),
    );
    const dia = plan!.semanas[0].dias[0];
    expect(dia.notas).toContain("Elevar talones 2,5 cm");
    expect(dia.notas!.join(" ")).toContain("Valsalva");
    expect(dia.central.ejercicios.every((e) => !e.notas)).toBe(true);
  });

  it("una evaluación incompleta se hereda como aviso", () => {
    const { avisos } = generarPlan(
      entrada({
        resultado: resultado({
          completo: false,
          sinEvaluar: [{ rule_key: "x", nivel: 1, faltan: ["dorsiflexion_cm"] }],
        }),
      }),
    );
    expect(avisos.join(" ")).toContain("evaluación está incompleta");
  });

  it("los sustitutos salen de la matriz y solo los que el motor aprobó", () => {
    const relaciones: Relacion[] = [
      { ejercicio: "Sentadilla Goblet", variante: "Prensa 45°", tipo: "sustitucion" },
      { ejercicio: "Sentadilla Goblet", variante: "Hack Libre", tipo: "sustitucion" },
    ];
    const { plan } = generarPlan(entrada({ relaciones }));
    const sentadilla = delPlan(plan!).find((e) => e.ejercicio === "Sentadilla Goblet")!;
    // El Hack Libre ni siquiera está en la biblioteca aprobada: ofrecerlo sería
    // mandar al entrenador a un ejercicio que el motor no ha mirado.
    expect(sentadilla.sustitutos).toEqual(["Prensa 45°"]);
  });
});

// --- Semanas ---------------------------------------------------------------

describe("el mesociclo", () => {
  const { plan } = generarPlan(entrada({ opciones: { diasPorSemana: 4, semanas: 6 } }));

  it("la 4ª semana es descarga y la 5ª supercompensación", () => {
    expect(plan!.semanas.map((s) => s.tipo)).toEqual([
      "carga",
      "carga",
      "carga",
      "descarga",
      "supercompensacion",
      "carga",
    ]);
  });

  it("la descarga baja las series y el RPE, con los mismos ejercicios", () => {
    const carga = delPlan(plan!, 0);
    const descarga = delPlan(plan!, 3);
    expect(descarga.map((e) => e.ejercicio)).toEqual(carga.map((e) => e.ejercicio));
    expect(descarga[0].seriesEfectivas).toBeLessThan(carga[0].seriesEfectivas);
    expect([descarga[0].rpePrimeras, descarga[0].rpeUltima]).toEqual([5, 6]);
  });

  it("la supercompensación vuelve a la carga", () => {
    expect(delPlan(plan!, 4)[0].seriesEfectivas).toBe(delPlan(plan!, 0)[0].seriesEfectivas);
    expect(plan!.semanas[4].dias[0].notas!.join(" ")).toContain("superar los registros");
  });

  it("la cadencia se puede mover a la 6ª, que es su otra opción", () => {
    const { plan: otro } = generarPlan(
      entrada({ opciones: { diasPorSemana: 4, semanas: 6, cadenciaDescarga: 6 } }),
    );
    expect(otro!.semanas.map((s) => s.tipo)).toEqual([
      "carga",
      "carga",
      "carga",
      "carga",
      "carga",
      "descarga",
    ]);
  });
});

// --- Cuándo NO hay plan ----------------------------------------------------

describe("cuándo se niega a generar", () => {
  it("Mantenimiento no se programa por parecido: se pregunta", () => {
    const { plan, errores } = generarPlan(
      entrada({ atleta: { sexo: "masculino", training_goal: "Mantenimiento" } }),
    );
    expect(plan).toBeNull();
    expect(errores.join(" ")).toContain("Mantenimiento");
    expect(errores.join(" ")).toContain("Elige tú");
  });

  it("…y con el objetivo puesto a mano, genera", () => {
    const { plan } = generarPlan(
      entrada({
        atleta: { sexo: "masculino", training_goal: "Mantenimiento" },
        opciones: { diasPorSemana: 4, semanas: 4, objetivo: "fuerza" },
      }),
    );
    expect(plan!.objetivo).toBe("fuerza");
    expect(plan!.semanas[0].dias[0].central.ejercicios[0].repMin).toBe(3);
  });

  it("los días que él no repartió no se improvisan", () => {
    const { plan, errores } = generarPlan(entrada({ opciones: { diasPorSemana: 6, semanas: 4 } }));
    expect(plan).toBeNull();
    expect(errores.join(" ")).toContain("3, 4, 5");
  });

  it("un día sin un solo ejercicio aprobado no se rellena con nada", () => {
    // Sin ejercicios de pierna, el día "Pierna (Cuádriceps/Cadera)" queda vacío.
    // Un plan con un día vacío no se puede ni guardar.
    const sinPierna = BIBLIOTECA.filter(
      (e) => !["squat_dominante_rodilla", "hip_hinge_dominante_cadera"].includes(e.movement_pattern!),
    );
    const { plan, errores } = generarPlan(
      entrada({
        ejercicios: sinPierna,
        resultado: resultado({ ejercicios: sinPierna.map((e) => decision(e.name)) }),
      }),
    );
    expect(plan).toBeNull();
    expect(errores.join(" ")).toContain("Pierna (Cuádriceps/Cadera)");
  });

  it("un ejercicio sin patrón clasificado se queda fuera, y se dice", () => {
    const sinClasificar = [
      ...BIBLIOTECA,
      { ...ejercicio("Ejercicio Raro", "", "Pectoral"), movement_pattern: null },
    ];
    const { plan, avisos } = generarPlan(
      entrada({
        ejercicios: sinClasificar,
        resultado: resultado({ ejercicios: sinClasificar.map((e) => decision(e.name)) }),
      }),
    );
    expect(delPlan(plan!).map((e) => e.ejercicio)).not.toContain("Ejercicio Raro");
    expect(avisos.join(" ")).toContain("Sin patrón de movimiento");
  });
});

// --- Mujer -----------------------------------------------------------------

describe("sus variantes de mujer", () => {
  it("una mujer de 4 días entra por su reparto, no por el general", () => {
    const { plan } = generarPlan(
      entrada({ atleta: { sexo: "femenino", training_goal: "Pérdida de Grasa" } }),
    );
    expect(plan!.semanas[0].dias.map((d) => d.titulo)).toEqual([
      "Pierna (cuádriceps y glúteo)",
      "Tren superior",
      "Pierna (isquiosurales y glúteo)",
      "Torso y core",
    ]);
  });

  it("sus dos días de pierna no salen iguales", () => {
    // El día de cuádriceps y el de isquiosurales se separan por músculo, que es
    // como los separó él. Sin eso, los dos saldrían con los mismos ejercicios.
    const { plan } = generarPlan(
      entrada({ atleta: { sexo: "femenino", training_goal: "Pérdida de Grasa" } }),
    );
    const cuadriceps = plan!.semanas[0].dias[0].central.ejercicios.map((e) => e.ejercicio);
    const isquios = plan!.semanas[0].dias[2].central.ejercicios.map((e) => e.ejercicio);
    expect(cuadriceps).toContain("Sentadilla Goblet");
    expect(isquios).toContain("Peso Muerto Rumano");
    expect(isquios).not.toContain("Sentadilla Goblet");
  });

  it("y el cierre cambia con el objetivo: pérdida de grasa cierra en zona 2", () => {
    const { plan } = generarPlan(
      entrada({ atleta: { sexo: "femenino", training_goal: "Pérdida de Grasa" } }),
    );
    expect(plan!.semanas[0].dias[0].final.cierre).toBe("cardio_zona2");
    expect(plan!.semanas[0].dias[0].final.minutos).toBe(20);
  });
});
