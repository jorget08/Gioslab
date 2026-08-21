import { describe, expect, it } from "vitest";

import { aISO, campoCompleto, desdeISO, diasDelMes, esBisiesto, soloDigitos } from "@/domain/fecha";

describe("años bisiestos", () => {
  it.each([[2024, true], [2000, true], [1900, false], [2023, false], [2100, false]])(
    "%i → %s",
    (anio, esperado) => expect(esBisiesto(anio)).toBe(esperado),
  );

  it("febrero tiene 29 días en bisiesto y 28 si no", () => {
    expect(diasDelMes(2, 2024)).toBe(29);
    expect(diasDelMes(2, 2023)).toBe(28);
  });
});

describe("aISO", () => {
  it("arma la fecha con ceros a la izquierda", () => {
    expect(aISO("5", "3", "1996")).toBe("1996-03-05");
  });

  it("acepta la fecha del caso de Giovanni", () => {
    expect(aISO("15", "05", "1996")).toBe("1996-05-15");
  });

  it("devuelve vacío mientras esté incompleta", () => {
    expect(aISO("15", "", "")).toBe("");
    expect(aISO("15", "05", "19")).toBe("");
  });

  it("RECHAZA el 31 de febrero", () => {
    // Si se aceptara, el navegador lo "corregiría" a marzo sin avisar y la
    // fecha de nacimiento quedaría mal sin que nadie lo note.
    expect(aISO("31", "02", "1996")).toBe("");
    expect(aISO("30", "02", "2024")).toBe("");
  });

  it("acepta el 29 de febrero solo en bisiesto", () => {
    expect(aISO("29", "02", "2024")).toBe("2024-02-29");
    expect(aISO("29", "02", "2023")).toBe("");
  });

  it("rechaza el 31 en meses de 30 días", () => {
    expect(aISO("31", "04", "2000")).toBe("");
    expect(aISO("30", "04", "2000")).toBe("2000-04-30");
  });

  it("rechaza meses imposibles", () => {
    expect(aISO("10", "13", "2000")).toBe("");
    expect(aISO("10", "00", "2000")).toBe("");
  });
});

describe("desdeISO", () => {
  it("descompone una fecha válida", () => {
    expect(desdeISO("1996-05-15")).toEqual({ dia: "15", mes: "05", anio: "1996" });
  });

  it("devuelve campos vacíos ante cualquier cosa rara", () => {
    for (const v of [undefined, null, "", "15/05/1996", "1996-5-15"]) {
      expect(desdeISO(v)).toEqual({ dia: "", mes: "", anio: "" });
    }
  });

  it("va y vuelve sin perder nada", () => {
    const { dia, mes, anio } = desdeISO("2001-12-31");
    expect(aISO(dia, mes, anio)).toBe("2001-12-31");
  });
});

describe("soloDigitos", () => {
  it("descarta lo que no sea número", () => {
    expect(soloDigitos("1a2b", 4)).toBe("12");
  });

  it("recorta al máximo del campo", () => {
    expect(soloDigitos("19965", 4)).toBe("1996");
  });
});

describe("campoCompleto — avance automático", () => {
  it("el año necesita las 4 cifras", () => {
    expect(campoCompleto("199", "anio")).toBe(false);
    expect(campoCompleto("1996", "anio")).toBe(true);
  });

  it("dos cifras siempre completan", () => {
    expect(campoCompleto("05", "mes")).toBe(true);
    expect(campoCompleto("15", "dia")).toBe(true);
  });

  it("un mes que no puede crecer avanza con una sola cifra", () => {
    // No hay mes que empiece por 2 y tenga dos cifras: esperar es perder tiempo.
    expect(campoCompleto("2", "mes")).toBe(true);
    expect(campoCompleto("9", "mes")).toBe(true);
  });

  it("pero el 1 espera, porque puede ser 1, 10, 11 o 12", () => {
    expect(campoCompleto("1", "mes")).toBe(false);
  });

  it("los días 4 a 9 avanzan solos; 1, 2 y 3 esperan", () => {
    expect(campoCompleto("4", "dia")).toBe(true);
    expect(campoCompleto("3", "dia")).toBe(false); // puede ser 30 o 31
    expect(campoCompleto("1", "dia")).toBe(false);
  });
});
