import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { cambiosDelDia, diaEditado, resumenDeCambios } from "@/domain/ediciones";
import { leerMetodo, type Metodo } from "@/domain/metodo";
import { validarPlan, type DiaPlan, type EjercicioPlan, type Plan } from "@/domain/plan";
import {
  anadirEjercicio,
  cambiarEjercicio,
  cambiarNumero,
  ejercicioDelMetodo,
  moverDia,
  moverEjercicio,
  quitarEjercicio,
} from "@/domain/plan-edicion";

/**
 * Las ediciones del entrenador (tarea 5.4).
 *
 * Lo que de verdad se prueba aquí es la regla que no se ve en pantalla: la
 * composición se propaga a todas las semanas y los números no. Equivocarse en
 * eso no rompe nada — deja una semana de descarga con la carga de una normal, y
 * eso no se nota hasta que el atleta llega reventado a la siguiente.
 */

const SQL = readFileSync(
  new URL("../../supabase/migrations/20260903100000_metodo_programacion.sql", import.meta.url),
  "utf8",
);
const METODO: Metodo = leerMetodo(
  JSON.parse(SQL.slice(SQL.indexOf("$json$") + 6, SQL.lastIndexOf("$json$"))),
)!;

const ej = (nombre: string, p: Partial<EjercicioPlan> = {}): EjercicioPlan => ({
  ejercicio: nombre,
  seriesCalentamiento: 2,
  seriesEfectivas: 4,
  repMin: 6,
  repMax: 12,
  rpePrimeras: 7.5,
  rpeUltima: 9,
  descansoSeg: 180,
  sustitutos: [],
  ...p,
});

const dia = (n: number, titulo: string, ejercicios: EjercicioPlan[]): DiaPlan => ({
  dia: n,
  titulo,
  preparacion: { minutos: 10, bloques: ["Movilidad"] },
  central: { ejercicios },
  final: { cierre: "recuperacion_activa", minutos: 10 },
});

const plan = (): Plan => ({
  version: 1,
  periodizacion: "ondulante",
  objetivo: "hipertrofia",
  diasPorSemana: 2,
  semanas: [
    {
      semana: 1,
      tipo: "carga",
      dias: [
        dia(1, "Torso", [ej("Press de Banca"), ej("Remo con Barra")]),
        dia(2, "Pierna", [ej("Sentadilla Goblet"), ej("Hip Thrust")]),
      ],
    },
    {
      semana: 2,
      tipo: "descarga",
      dias: [
        dia(1, "Torso", [ej("Press de Banca", { seriesEfectivas: 2, rpePrimeras: 5, rpeUltima: 6 }),
          ej("Remo con Barra", { seriesEfectivas: 2, rpePrimeras: 5, rpeUltima: 6 })]),
        dia(2, "Pierna", [ej("Sentadilla Goblet", { seriesEfectivas: 2 }), ej("Hip Thrust", { seriesEfectivas: 2 })]),
      ],
    },
  ],
});

const nombresDe = (p: Plan, semana: number, dia: number) =>
  p.semanas[semana].dias[dia].central.ejercicios.map((e) => e.ejercicio);

describe("la composición se propaga a todas las semanas", () => {
  it("cambiar un ejercicio lo cambia en las dos", () => {
    // Si el atleta no puede hacer zancadas, tampoco puede en la semana 3.
    const p = cambiarEjercicio(plan(), { dia: 1, indice: 0 }, "Prensa 45°", ["Hack en Máquina"]);
    expect(nombresDe(p, 0, 1)[0]).toBe("Prensa 45°");
    expect(nombresDe(p, 1, 1)[0]).toBe("Prensa 45°");
    expect(p.semanas[1].dias[1].central.ejercicios[0].sustitutos).toEqual(["Hack en Máquina"]);
  });

  it("quitar y mover también", () => {
    const quitado = quitarEjercicio(plan(), { dia: 0, indice: 0 });
    expect(nombresDe(quitado, 0, 0)).toEqual(["Remo con Barra"]);
    expect(nombresDe(quitado, 1, 0)).toEqual(["Remo con Barra"]);

    const movido = moverEjercicio(plan(), { dia: 0, indice: 0 }, 1);
    expect(nombresDe(movido, 0, 0)).toEqual(["Remo con Barra", "Press de Banca"]);
    expect(nombresDe(movido, 1, 0)).toEqual(["Remo con Barra", "Press de Banca"]);
  });

  it("mover un ejercicio fuera de los bordes no hace nada", () => {
    expect(moverEjercicio(plan(), { dia: 0, indice: 0 }, -1)).toEqual(plan());
    expect(moverEjercicio(plan(), { dia: 0, indice: 1 }, 1)).toEqual(plan());
  });

  it("mover un día renumera los días", () => {
    // `dia` es la posición, y la app del atleta ordenará por ese número.
    const p = moverDia(plan(), 0, 1);
    expect(p.semanas[0].dias.map((d) => [d.dia, d.titulo])).toEqual([
      [1, "Pierna"],
      [2, "Torso"],
    ]);
    expect(p.semanas[1].dias[0].titulo).toBe("Pierna");
    expect(validarPlan(p)).toEqual([]);
  });
});

describe("los números cambian solo en la semana que se está mirando", () => {
  it("subir series en la semana 1 no toca la de descarga", () => {
    // Propagar aquí borraría la descarga sin avisar, y eso no se nota hasta que
    // el atleta llega reventado a la semana siguiente.
    const p = cambiarNumero(plan(), { dia: 0, indice: 0, semana: 1 }, "seriesEfectivas", 5);
    expect(p.semanas[0].dias[0].central.ejercicios[0].seriesEfectivas).toBe(5);
    expect(p.semanas[1].dias[0].central.ejercicios[0].seriesEfectivas).toBe(2);
  });
});

describe("añadir un ejercicio", () => {
  it("nace con las cifras del método, y con las de descarga en la semana de descarga", () => {
    const p = anadirEjercicio(plan(), 0, (tipo) =>
      ejercicioDelMetodo({
        nombre: "Curl de Bíceps",
        patron: "isolation_accessory",
        metodo: METODO,
        objetivo: "hipertrofia",
        tipo,
      }),
    );

    const enCarga = p.semanas[0].dias[0].central.ejercicios.at(-1)!;
    const enDescarga = p.semanas[1].dias[0].central.ejercicios.at(-1)!;

    // Aislamiento: 3 series, descanso abajo de su rango, sin calentamiento.
    expect(enCarga.seriesEfectivas).toBe(3);
    expect(enCarga.descansoSeg).toBe(90);
    expect(enCarga.seriesCalentamiento).toBe(0);
    expect([enCarga.rpePrimeras, enCarga.rpeUltima]).toEqual([7.5, 9]);

    // En descarga: −45 % de series y su RPE 5–6.
    expect(enDescarga.seriesEfectivas).toBe(2);
    expect([enDescarga.rpePrimeras, enDescarga.rpeUltima]).toEqual([5, 6]);

    expect(validarPlan(p)).toEqual([]);
  });

  it("un compuesto nace con 4 series y el descanso largo", () => {
    const e = ejercicioDelMetodo({
      nombre: "Peso Muerto Rumano",
      patron: "hip_hinge_dominante_cadera",
      metodo: METODO,
      objetivo: "fuerza",
      tipo: "carga",
    });
    expect(e.seriesEfectivas).toBe(4);
    expect(e.descansoSeg).toBe(300);
    expect([e.repMin, e.repMax]).toEqual([3, 6]);
  });
});

describe("qué marcó el entrenador", () => {
  it("un plan sin tocar no tiene cambios", () => {
    const p = plan();
    expect(resumenDeCambios(p, p)).toEqual([]);
    expect(diaEditado(cambiosDelDia(p.semanas[0].dias[0], p.semanas[0].dias[0]))).toBe(false);
  });

  it("cambiar un ejercicio sale como uno quitado y uno añadido", () => {
    const editado = cambiarEjercicio(plan(), { dia: 0, indice: 0 }, "Press Inclinado", []);
    const cambios = cambiosDelDia(plan().semanas[0].dias[0], editado.semanas[0].dias[0]);
    expect(cambios.quitados).toEqual(["Press de Banca"]);
    expect(cambios.anadidos).toEqual(["Press Inclinado"]);
  });

  it("los números cambiados se cuentan con el antes y el después", () => {
    const editado = cambiarNumero(plan(), { dia: 0, indice: 0, semana: 1 }, "seriesEfectivas", 6);
    const frases = resumenDeCambios(plan(), editado);
    expect(frases).toHaveLength(1);
    expect(frases[0]).toContain("Press de Banca");
    expect(frases[0]).toContain("series 4 → 6");
    expect(frases[0]).toContain("S1");
  });

  it("la comparación es por nombre, no por posición", () => {
    // Quitar el primero haría que todos los demás parecieran cambiados si se
    // comparara por posición, y un cambio falso repetido entrena a ignorar la
    // marca.
    const editado = quitarEjercicio(plan(), { dia: 0, indice: 0 });
    const cambios = cambiosDelDia(plan().semanas[0].dias[0], editado.semanas[0].dias[0]);
    expect(cambios.quitados).toEqual(["Press de Banca"]);
    expect(cambios.porEjercicio).toEqual({});
  });
});
