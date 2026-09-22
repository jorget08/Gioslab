import { describe, expect, it } from "vitest";

import { renderToBuffer } from "@react-pdf/renderer";

import { nombreArchivo, PlanPDF } from "@/pdf/plan-pdf";
import type { DiaPlan, EjercicioPlan, Plan } from "@/domain/plan";

/**
 * El PDF de la rutina (tareas 6.1, 6.3 y 6.4).
 *
 * Esto no comprueba que el papel esté bonito: comprueba que SE GENERA. Un
 * motor de PDF falla en cosas que el typecheck no ve —un estilo que no admite,
 * una fuente sin el glifo de una tilde— y eso reventaría en la ruta, delante de
 * Giovanni, con un plan de seis semanas por descargar.
 */

const ej = (nombre: string, p: Partial<EjercicioPlan> = {}): EjercicioPlan => ({
  ejercicio: nombre,
  seriesCalentamiento: 2,
  seriesEfectivas: 4,
  repMin: 6,
  repMax: 12,
  rpePrimeras: 7.5,
  rpeUltima: 9,
  descansoSeg: 180,
  sustitutos: ["Prensa 45°"],
  notas: "3–4 repeticiones más en el lado débil",
  ...p,
});

const dia = (n: number, titulo: string): DiaPlan => ({
  dia: n,
  titulo,
  preparacion: { minutos: 10, bloques: ["Movilidad articular dinámica"] },
  central: { ejercicios: [ej("Sentadilla Goblet"), ej("Hip Thrust", { notas: undefined })] },
  final: { cierre: "cardio_zona2", minutos: 20 },
  notas: ["Maniobra prohibida: Valsalva."],
});

const PLAN: Plan = {
  version: 1,
  periodizacion: "atr",
  objetivo: "perdida_grasa",
  diasPorSemana: 2,
  semanas: [
    { semana: 1, tipo: "carga", dias: [dia(1, "Pierna (Cuádriceps/Cadera)"), dia(2, "Torso")] },
    { semana: 2, tipo: "descarga", dias: [dia(1, "Pierna (Cuádriceps/Cadera)"), dia(2, "Torso")] },
  ],
};

describe("el PDF de la rutina", () => {
  it("se genera de verdad", async () => {
    // En el navegador se usa `pdf().toBlob()`; aquí se renderiza a bytes, que
    // es lo mismo pasando por el mismo componente.
    const pdf = await renderToBuffer(
      <PlanPDF
        plan={PLAN}
        atleta="Daniela Méndez"
        fecha="22 de septiembre de 2026"
        avisos={["Brazo: quedan 5 series a la semana y su método pide 8."]}
      />,
    );

    // La firma de un PDF son sus cinco primeros bytes.
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  }, 30_000);
});

describe("nombreArchivo", () => {
  it("se ordena solo y no lleva tildes ni espacios", () => {
    expect(nombreArchivo("Daniela Méndez", "2026-09-22T14:03:00Z")).toBe(
      "plan-daniela-mendez-2026-09-22.pdf",
    );
  });

  it("un nombre que se queda en nada no deja el archivo sin nombre", () => {
    expect(nombreArchivo("···", "2026-09-22T00:00:00Z")).toBe("plan-atleta-2026-09-22.pdf");
  });
});
