import { describe, expect, it } from "vitest";

import {
  fechaCorta,
  intervalo,
  prepararHistorial,
  riesgoCinturaCadera,
  variacion,
} from "@/domain/evolucion";

describe("variacion", () => {
  it("describe una bajada con signo y unidad", () => {
    const v = variacion(18.0, 21.4, "%");
    expect(v?.direccion).toBe("baja");
    expect(v?.delta).toBe(-3.4);
    expect(v?.texto).toBe("−3.4 %");
  });

  it("describe una subida", () => {
    const v = variacion(53.2, 51.2, "kg");
    expect(v?.direccion).toBe("sube");
    expect(v?.texto).toBe("+2.0 kg");
  });

  it("no anuncia cambio cuando el delta redondeado es cero", () => {
    // 0.04 kg no es un cambio: mostrar "+0.0 kg" sería una flecha sobre algo
    // que no se movió, y eso hace desconfiar del resto de la pantalla.
    const v = variacion(80.04, 80.0, "kg");
    expect(v?.direccion).toBe("igual");
    expect(v?.texto).toBe("sin cambio");
  });

  it("calcula el cambio relativo", () => {
    expect(variacion(110, 100, "kg")?.porcentaje).toBe(10);
    expect(variacion(90, 100, "kg")?.porcentaje).toBe(-10);
  });

  it("no divide por cero cuando el valor anterior era 0", () => {
    const v = variacion(5, 0, "kg");
    expect(v?.porcentaje).toBeNull();
    expect(v?.direccion).toBe("sube");
  });

  it("sin punto de comparación no inventa una evolución", () => {
    expect(variacion(18.0, null, "%")).toBeNull();
    expect(variacion(null, 21.4, "%")).toBeNull();
    expect(variacion(undefined, undefined)).toBeNull();
    expect(variacion(NaN, 10)).toBeNull();
  });

  it("respeta los decimales pedidos", () => {
    // La densidad corporal se mueve en la cuarta cifra decimal.
    expect(variacion(1.0576, 1.0521, "", 4)?.texto).toBe("+0.0055");
  });

  it("no juzga: un mismo cambio se describe igual suba o baje", () => {
    // Bajar de peso es un logro para quien busca perder grasa y un problema
    // para quien busca ganar masa. Decidirlo es criterio de Giovanni.
    const sube = variacion(82, 80, "kg");
    const baja = variacion(78, 80, "kg");
    expect(sube?.texto).toBe("+2.0 kg");
    expect(baja?.texto).toBe("−2.0 kg");
  });
});

describe("riesgoCinturaCadera", () => {
  it("marca riesgo en mujeres por encima de 0.85, que es el umbral de su ficha", () => {
    expect(riesgoCinturaCadera(0.86, "femenino")).toBe(true);
    expect(riesgoCinturaCadera(0.84, "femenino")).toBe(false);
  });

  it("0.85 exacto no es riesgo: su ficha dice 'mayor que'", () => {
    expect(riesgoCinturaCadera(0.85, "femenino")).toBe(false);
  });

  it("en hombres devuelve null en vez de inventar un umbral", () => {
    // La literatura general usa 0.90, pero él no lo ha validado. Rellenar el
    // hueco con algo verosímil es justo lo que el CLAUDE.md prohíbe.
    expect(riesgoCinturaCadera(0.95, "masculino")).toBeNull();
  });

  it("sin dato no dice nada", () => {
    expect(riesgoCinturaCadera(null, "femenino")).toBeNull();
    expect(riesgoCinturaCadera(0.9, null)).toBeNull();
  });
});

describe("intervalo", () => {
  it("cuenta días, meses y años", () => {
    expect(intervalo("2026-03-01", "2026-03-01")).toBe("el mismo día");
    expect(intervalo("2026-03-01", "2026-03-02")).toBe("1 día después");
    expect(intervalo("2026-03-01", "2026-03-15")).toBe("14 días después");
    expect(intervalo("2026-01-15", "2026-06-15")).toBe("5 meses después");
    expect(intervalo("2025-01-15", "2026-01-15")).toBe("1 año después");
    expect(intervalo("2024-01-15", "2026-04-15")).toBe("2 años y 3 m después");
  });

  it("da igual el orden de los argumentos", () => {
    expect(intervalo("2026-06-15", "2026-01-15")).toBe(intervalo("2026-01-15", "2026-06-15"));
  });
});

describe("fechaCorta", () => {
  it("es compacta, sin las preposiciones que mete el formato local", () => {
    // es-CO devuelve "15 de mar de 2026": en un rótulo en mayúsculas ese
    // "de … de" ocupa media línea sin aportar nada.
    expect(fechaCorta("2026-03-15T15:00:00Z")).toBe("15 mar 2026");
  });

  it("no se corre de día por la zona horaria de Bogotá", () => {
    // Una medición guardada a las 20:00 de Bogotá es 01:00 UTC del día
    // siguiente. Sin fijar la zona, el historial mostraría el día equivocado.
    expect(fechaCorta("2026-03-16T01:00:00Z")).toBe("15 mar 2026");
  });

  it("no rellena el día con cero a la izquierda", () => {
    expect(fechaCorta("2026-08-09T15:00:00Z")).toBe("9 ago 2026");
  });

  it("acierta el mes en los dos extremos del año", () => {
    expect(fechaCorta("2026-01-01T15:00:00Z")).toBe("1 ene 2026");
    expect(fechaCorta("2026-12-31T15:00:00Z")).toBe("31 dic 2026");
  });
});

describe("prepararHistorial", () => {
  const m = (fecha: string, peso: number) => ({ fecha, peso });

  it("ordena de más reciente a más antigua sea cual sea el orden de entrada", () => {
    const filas = prepararHistorial(
      [m("2026-01-10", 82), m("2026-06-10", 78), m("2026-03-10", 80)],
      (r) => r.fecha,
    );
    expect(filas.map((f) => f.registro.peso)).toEqual([78, 80, 82]);
  });

  it("cada entrada sabe cuánto pasó desde la anterior en el tiempo", () => {
    const filas = prepararHistorial([m("2026-01-10", 82), m("2026-03-10", 80)], (r) => r.fecha);
    expect(filas[0].desdeLaAnterior).toBe("2 meses después");
    // La más antigua no tiene anterior: no se le inventa una.
    expect(filas[1].desdeLaAnterior).toBeNull();
  });

  it("con una sola entrada no hay comparación", () => {
    const filas = prepararHistorial([m("2026-01-10", 82)], (r) => r.fecha);
    expect(filas).toHaveLength(1);
    expect(filas[0].desdeLaAnterior).toBeNull();
  });

  it("con el historial vacío devuelve vacío", () => {
    expect(prepararHistorial([], (r: { fecha: string }) => r.fecha)).toEqual([]);
  });

  it("no muta el arreglo original", () => {
    const original = [m("2026-01-10", 82), m("2026-06-10", 78)];
    prepararHistorial(original, (r) => r.fecha);
    expect(original.map((r) => r.peso)).toEqual([82, 78]);
  });
});
