import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  diasDisponibles,
  esAislamiento,
  grupoDeMusculo,
  leerMetodo,
  objetivoDeMeta,
  periodizacionPara,
  repartoPara,
  seriesSemanalesDe,
  validarMetodo,
} from "@/domain/metodo";

/**
 * El método de Giovanni y su lector (tarea 5.2).
 *
 * POR QUÉ SE LEE EL SQL. Es el mismo motivo que en `matriz-cargada.test.ts`: un
 * método mal cargado no rompe nada al guardarse. El CHECK de la base solo mira
 * el primer nivel, así que un rango invertido o un patrón inexistente se
 * descubrirían en la pantalla del entrenador, con un plan raro delante y sin
 * pista de dónde viene. La migración es la fuente, así que se lee la migración.
 *
 * Los casos de fallo parten de una copia del método bueno con UNA cosa rota,
 * que es como llegan los errores de verdad.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20260903100000_metodo_programacion.sql", import.meta.url),
  "utf8",
);

/** Lo justo para manejar el JSON crudo en los tests, sin `any`. */
interface DiaJson {
  titulo: string;
  patrones: string[];
  musculos?: string[];
}
interface MetodoJson {
  version: number;
  objetivo_por_meta: Record<string, string | null>;
  periodizacion_por_objetivo: Record<string, string>;
  parametros: Record<string, Record<string, number>>;
  series_semanales: Record<string, { min: number; max: number }>;
  grupo_por_musculo: Record<string, string>;
  series_por_ejercicio: Record<string, number>;
  progresion: Record<string, number | string>;
  descarga: Record<string, number | boolean>;
  fases: { preparacion: { minutos: number; bloques: string[] }; cierre: Record<string, unknown> };
  repartos: { dias: number; sexo: string | null; plantilla: DiaJson[] }[];
}

const BUENO: MetodoJson = JSON.parse(
  SQL.slice(SQL.indexOf("$json$") + 6, SQL.lastIndexOf("$json$")),
);

/** Copia profunda del método bueno con un retoque. */
function con(cambio: (m: MetodoJson) => void): unknown {
  const copia = JSON.parse(JSON.stringify(BUENO)) as MetodoJson;
  cambio(copia);
  return copia;
}

/** Para los casos que borran una clave entera. */
const sinClave = (clave: string): unknown =>
  con((m) => delete (m as unknown as Record<string, unknown>)[clave]);

describe("las cifras que cargó la 5.2 son las suyas", () => {
  // Si alguna de estas cambia sin que él lo haya dicho, este archivo es el que
  // lo tiene que parar. Todas salen de su formulario del 31-ago salvo donde se
  // indica otra fuente.

  it("se extrajo el método de la migración", () => {
    // Si el formato del SQL cambia, el `slice` deja de encontrar el bloque y
    // TODOS los tests de abajo pasarían sobre nada.
    expect(Object.keys(BUENO)).toContain("repartos");
  });

  it("series por grupo muscular y semana", () => {
    expect(BUENO.series_semanales).toEqual({
      Pecho: { min: 10, max: 20 },
      Espalda: { min: 12, max: 22 },
      Piernas: { min: 12, max: 22 },
      Hombro: { min: 10, max: 20 },
      Brazo: { min: 8, max: 16 },
    });
  });

  it("repeticiones, RPE y descanso por objetivo", () => {
    expect(BUENO.parametros.fuerza).toMatchObject({ rep_min: 3, rep_max: 6 });
    expect(BUENO.parametros.hipertrofia).toMatchObject({ rep_min: 6, rep_max: 12 });
    expect(BUENO.parametros.perdida_grasa).toMatchObject({ rep_min: 8, rep_max: 15 });
    expect(BUENO.parametros.fuerza.descanso_min_seg).toBe(180);
    expect(BUENO.parametros.perdida_grasa.descanso_max_seg).toBe(90);
  });

  it("doble progresión del 2,5 al 5 % y descarga en la 4ª semana", () => {
    expect(BUENO.progresion.incremento_min_pct).toBe(2.5);
    expect(BUENO.progresion.incremento_max_pct).toBe(5);
    expect(BUENO.descarga.cada_semanas).toBe(4);
    expect(BUENO.descarga.cada_semanas_alternativa).toBe(6);
    // 40–50 % de reducción y RPE 5–6, y después supercompensación: "se retorna
    // a la carga con intención de superar los registros previos".
    expect(BUENO.descarga.reduccion_volumen_pct).toBe(45);
    expect(BUENO.descarga.supercompensacion_despues).toBe(true);
  });

  it("series por ejercicio, del plan que entregó a Diego", () => {
    // Multiarticulares 4 series, aislamiento 3, sin una excepción en cinco días.
    expect(BUENO.series_por_ejercicio.compuesto).toBe(4);
    expect(BUENO.series_por_ejercicio.aislamiento).toBe(3);
  });

  it("los títulos de la semana son suyos, palabra por palabra", () => {
    const titulos = (dias: number, sexo: string | null) =>
      BUENO.repartos
        .find((r) => r.dias === dias && r.sexo === sexo)!
        .plantilla.map((d) => d.titulo);

    expect(titulos(3, null)).toEqual(["Torso", "Pierna", "Full Body"]);
    expect(titulos(5, null)).toEqual([
      "Empuje (Push)",
      "Tracción (Pull)",
      "Pierna (Legs)",
      "Torso (Upper)",
      "Pierna / Rezagos (Lower)",
    ]);
    expect(titulos(4, "femenino")[3]).toBe("Torso y core");
  });

  it("el core solo aparece donde él lo nombra", () => {
    // Decisión de la lectura: no se cuela en los días de torso "porque siempre
    // se mete". Está en el full body y en sus dos días "y core".
    const conCore = BUENO.repartos.flatMap((r) =>
      r.plantilla
        .filter((d) => d.patrones.includes("core_anti_flexion_extension"))
        .map((d) => d.titulo),
    );
    expect(conCore).toEqual(["Full Body", "Torso y core", "Tren superior y core"]);
  });
});

describe("validarMetodo", () => {
  it("el método cargado pasa entero", () => {
    expect(validarMetodo(BUENO)).toEqual([]);
  });

  it("una versión desconocida lo tumba", () => {
    expect(validarMetodo(con((m) => (m.version = 2))).join(" ")).toContain("Versión de método");
  });

  it("un rango de repeticiones al revés no pasa", () => {
    // Al revés, la doble progresión nunca alcanza el techo: el atleta se queda
    // estancado y nada falla.
    const e = validarMetodo(con((m) => (m.parametros.fuerza.rep_min = 12)));
    expect(e.join(" ")).toContain("repeticiones");
  });

  it("la última serie con menos RPE que las anteriores no pasa", () => {
    // Es el mismo error que atrapa `validarPlan`, cazado un nivel antes: aquí
    // saldría en TODOS los planes que se generen con este método.
    const e = validarMetodo(con((m) => (m.parametros.hipertrofia.rpe_ultima = 6)));
    expect(e.join(" ")).toContain("menos RPE");
  });

  it("un objetivo suyo sin parámetros no pasa", () => {
    const e = validarMetodo(con((m) => delete m.parametros.perdida_grasa));
    expect(e.join(" ")).toContain("perdida_grasa");
  });

  it("una meta del atleta apuntando a un objetivo inventado no pasa", () => {
    const e = validarMetodo(con((m) => (m.objetivo_por_meta["Mantenimiento"] = "definicion")));
    expect(e.join(" ")).toContain("objetivo desconocido");
  });

  it("pero una meta en null SÍ pasa: es 'no lo ha dicho'", () => {
    expect(validarMetodo(con((m) => (m.objetivo_por_meta["Hipertrofia (Masa Muscular)"] = null))))
      .toEqual([]);
  });

  it("un músculo que apunta a un grupo sin rango no pasa", () => {
    // Ese músculo no contaría contra ningún tope de volumen, y en silencio.
    const e = validarMetodo(con((m) => (m.grupo_por_musculo["Pectoral"] = "Torso")));
    expect(e.join(" ")).toContain("grupo sin series");
  });

  it("un patrón fuera del catálogo no pasa", () => {
    // Un patrón que no existe no encuentra ejercicios: el día saldría vacío.
    const e = validarMetodo(con((m) => (m.repartos[0].plantilla[0].patrones = ["empuje"])));
    expect(e.join(" ")).toContain("patrón desconocido");
  });

  it("un reparto con menos días de los que dice no pasa", () => {
    const e = validarMetodo(con((m) => m.repartos[1].plantilla.pop()));
    expect(e.join(" ")).toContain("4 días");
  });

  it("la preparación sin bloques no pasa: las tres fases son obligatorias", () => {
    const e = validarMetodo(con((m) => (m.fases.preparacion.bloques = [])));
    expect(e.join(" ")).toContain("preparación");
  });

  it("lo que no es un objeto se rechaza sin reventar", () => {
    expect(validarMetodo(null).length).toBe(1);
    expect(validarMetodo("método")).toEqual(["El método no es un objeto."]);
    expect(validarMetodo([BUENO]).length).toBe(1);
  });
});

describe("leerMetodo", () => {
  it("devuelve null en vez de un método a medias", () => {
    // Igual que `leerPlan`: o está entero o no está. Medio método genera medio
    // plan, y eso se descubre en la pantalla del entrenador.
    expect(leerMetodo(sinClave("descarga"))).toBeNull();
    expect(leerMetodo({})).toBeNull();
  });

  it("traduce las claves de la base al vocabulario del dominio", () => {
    const m = leerMetodo(BUENO)!;
    expect(m.parametros.fuerza.repMin).toBe(3);
    expect(m.parametros.fuerza.descansoMaxSeg).toBe(300);
    expect(m.seriesPorEjercicio.calentamientoCompuesto).toBe(2);
    expect(m.descarga.cadaSemanas).toBe(4);
    expect(m.fases.preparacion.bloques).toHaveLength(2);
  });
});

describe("consultas sobre el método", () => {
  const metodo = leerMetodo(BUENO)!;

  it("traduce las cinco metas del atleta a sus tres objetivos", () => {
    expect(objetivoDeMeta(metodo, "Hipertrofia (Masa Muscular)")).toBe("hipertrofia");
    expect(objetivoDeMeta(metodo, "Pérdida de Grasa")).toBe("perdida_grasa");
    expect(objetivoDeMeta(metodo, "Recomposición Corporal")).toBe("hipertrofia");
    expect(objetivoDeMeta(metodo, "Rendimiento Deportivo")).toBe("fuerza");
  });

  it("Mantenimiento devuelve null, y eso no es un fallo", () => {
    // No lo contestó. El generador se lo pregunta al entrenador en vez de
    // meterlo en hipertrofia por parecido.
    expect(objetivoDeMeta(metodo, "Mantenimiento")).toBeNull();
    expect(objetivoDeMeta(metodo, null)).toBeNull();
    expect(objetivoDeMeta(metodo, "Otra cosa")).toBeNull();
  });

  it("la periodización sale del objetivo, que es lo que dijo el 2-sep", () => {
    expect(periodizacionPara(metodo, "hipertrofia")).toBe("ondulante");
    expect(periodizacionPara(metodo, "fuerza")).toBe("ondulante");
    expect(periodizacionPara(metodo, "perdida_grasa")).toBe("atr");
  });

  it("la variante de mujer manda cuando existe", () => {
    expect(repartoPara(metodo, 4, "femenino")!.plantilla[0].titulo)
      .toBe("Pierna (cuádriceps y glúteo)");
    expect(repartoPara(metodo, 4, "masculino")!.plantilla[0].titulo)
      .toBe("Torso (Empuje/Tracción)");
  });

  it("una mujer que entrena 3 días entra por el reparto general", () => {
    // No desdobló el de 3 días. Devolver null la dejaría sin plan.
    expect(repartoPara(metodo, 3, "femenino")!.plantilla).toHaveLength(3);
  });

  it("los días que no repartió no se inventan", () => {
    expect(repartoPara(metodo, 6, null)).toBeNull();
    expect(diasDisponibles(metodo)).toEqual([3, 4, 5]);
  });

  it("los músculos de la biblioteca caen en sus cinco grupos", () => {
    expect(grupoDeMusculo(metodo, "Pectoral")).toBe("Pecho");
    expect(grupoDeMusculo(metodo, "Gemelos")).toBe("Piernas");
    expect(grupoDeMusculo(metodo, "Tríceps")).toBe("Brazo");
  });

  it("el core no cae en ninguno, y por eso no tiene tope", () => {
    // Su tabla de volumen tiene cinco filas y core no es una. Inventarle un
    // rango sería prescribir volumen con un criterio que no es suyo.
    expect(grupoDeMusculo(metodo, "Core")).toBeNull();
    expect(seriesSemanalesDe(metodo, null)).toBeNull();
    expect(seriesSemanalesDe(metodo, "Core")).toBeNull();
  });

  it("los rangos de volumen son los suyos", () => {
    expect(seriesSemanalesDe(metodo, "Espalda")).toEqual({ min: 12, max: 22 });
    expect(seriesSemanalesDe(metodo, "Brazo")).toEqual({ min: 8, max: 16 });
  });

  it("aislamiento y core cobran menos series y menos descanso que lo compuesto", () => {
    expect(esAislamiento("isolation_accessory")).toBe(true);
    expect(esAislamiento("core_anti_flexion_extension")).toBe(true);
    expect(esAislamiento("squat_dominante_rodilla")).toBe(false);
    expect(esAislamiento(null)).toBe(false);
  });
});
