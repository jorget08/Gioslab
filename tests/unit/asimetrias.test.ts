import { describe, expect, it } from "vitest";

import {
  asimetriaDe,
  asimetriasDe,
  segmentosConAsimetria,
  UMBRAL_CM,
  type MedicionBilateral,
} from "@/domain/asimetrias";
import { resolverHechos } from "@/domain/hechos-atleta";

const medicion = (m: MedicionBilateral): MedicionBilateral => m;

describe("asimetriaDe", () => {
  it("calcula la diferencia y señala el lado DÉBIL, no el fuerte", () => {
    // El signo es lo único que importa de verdad: de él cuelga por qué lado
    // empieza el trabajo unilateral. Invertirlo hace reforzar el lado fuerte y
    // agranda justo lo que se quería corregir.
    const a = asimetriaDe(medicion({ thigh_cm: 58, thigh_left_cm: 55 }), "muslo")!;
    expect(a.diferenciaCm).toBe(3);
    expect(a.ladoDebil).toBe("izquierdo");

    const b = asimetriaDe(medicion({ thigh_cm: 55, thigh_left_cm: 58 }), "muslo")!;
    expect(b.diferenciaCm).toBe(3);
    expect(b.ladoDebil).toBe("derecho");
  });

  it("la diferencia es siempre positiva: es magnitud, no dirección", () => {
    const a = asimetriaDe(medicion({ arm_flexed_cm: 34, arm_flexed_left_cm: 38 }), "brazo")!;
    expect(a.diferenciaCm).toBeGreaterThan(0);
  });

  it("falta un lado NO es simétrico: devuelve null", () => {
    // Es la regla que protege a las mediciones anteriores a la 2.15, tomadas de
    // un solo lado. Devolver 0 las convertiría en "perfectamente simétrico" y
    // taparía exactamente lo que hay que detectar.
    expect(asimetriaDe(medicion({ thigh_cm: 58 }), "muslo")).toBeNull();
    expect(asimetriaDe(medicion({ thigh_left_cm: 58 }), "muslo")).toBeNull();
    expect(asimetriaDe(medicion({}), "muslo")).toBeNull();
    expect(asimetriaDe(medicion({ thigh_cm: 58, thigh_left_cm: null }), "muslo")).toBeNull();
  });

  it("acepta los números como texto, que es como llegan de PostgREST", () => {
    const a = asimetriaDe(medicion({ thigh_cm: "58.0", thigh_left_cm: "55.5" }), "muslo")!;
    expect(a.diferenciaCm).toBe(2.5);
  });

  it("redondea a una decimal, que es la precisión con que se guarda", () => {
    // Sin esto la resta saca 1.7999999999999998 y eso acaba en pantalla.
    const a = asimetriaDe(medicion({ calf_cm: 38.7, calf_left_cm: 36.9 }), "pantorrilla")!;
    expect(a.diferenciaCm).toBe(1.8);
  });
});

describe("umbrales", () => {
  it("el brazo son 1,5 cm — su corrección del 1-sep", () => {
    expect(UMBRAL_CM.brazo).toBe(1.5);
    const justo = asimetriaDe(medicion({ arm_flexed_cm: 38, arm_flexed_left_cm: 36.5 }), "brazo")!;
    expect(justo.diferenciaCm).toBe(1.5);
    // "Mayor de", no "mayor o igual": justo en el umbral todavía no hay protocolo.
    expect(justo.superaUmbral).toBe(false);

    const pasa = asimetriaDe(medicion({ arm_flexed_cm: 38, arm_flexed_left_cm: 36.4 }), "brazo")!;
    expect(pasa.superaUmbral).toBe(true);
  });

  it("el muslo son 2 cm", () => {
    expect(UMBRAL_CM.muslo).toBe(2);
    expect(asimetriaDe(medicion({ thigh_cm: 58, thigh_left_cm: 56 }), "muslo")!.superaUmbral).toBe(false);
    expect(asimetriaDe(medicion({ thigh_cm: 58, thigh_left_cm: 55.9 }), "muslo")!.superaUmbral).toBe(true);
  });

  it("la pantorrilla ya tiene umbral: 1,5 cm, como el brazo", () => {
    // Lo cerró el 2-sep. Estuvo en null porque sus dos documentos decían cosas
    // distintas (1 cm en el formulario, 2 cm en Principios) y juzgar mal una
    // pantorrilla activa un protocolo correctivo sobre quien no lo necesita.
    expect(UMBRAL_CM.pantorrilla).toBe(1.5);
    expect(asimetriaDe(medicion({ calf_cm: 38, calf_left_cm: 36.5 }), "pantorrilla")!.superaUmbral).toBe(false);
    expect(asimetriaDe(medicion({ calf_cm: 38, calf_left_cm: 36.4 }), "pantorrilla")!.superaUmbral).toBe(true);
  });

  it("ya no queda ningún segmento sin criterio, pero el estado sigue existiendo", () => {
    // El tipo conserva `null` a propósito: es el estado "medido pero sin
    // criterio suyo", y hará falta el día que añada un cuarto segmento.
    expect(Object.values(UMBRAL_CM).every((u) => u !== null)).toBe(true);
  });
});

describe("asimetriasDe", () => {
  it("devuelve solo las que se pueden calcular", () => {
    const a = asimetriasDe(
      medicion({ arm_flexed_cm: 38, arm_flexed_left_cm: 36, thigh_cm: 58 }),
    );
    expect(a.map((x) => x.segmento)).toEqual(["brazo"]);
  });
});

describe("segmentosConAsimetria: lo que ve el motor", () => {
  it("solo entran los que superan su umbral", () => {
    expect(
      segmentosConAsimetria(
        medicion({
          arm_flexed_cm: 38, arm_flexed_left_cm: 36,   // 2 cm > 1,5 → sí
          thigh_cm: 58, thigh_left_cm: 57,             // 1 cm < 2   → no
        }),
      ),
    ).toEqual(["brazo"]);
  });

  it("la pantorrilla ya entra: tiene umbral desde el 2-sep", () => {
    expect(segmentosConAsimetria(medicion({ calf_cm: 40, calf_left_cm: 32 }))).toEqual(["pantorrilla"]);
  });

  it("un segmento SIN umbral nunca entra, por grande que sea la diferencia", () => {
    // Dispararía una regla con un criterio que Giovanni no ha fijado.
    //
    // Hoy los tres segmentos tienen umbral, así que este caso ya no se alcanza
    // con datos reales. La garantía se prueba igual quitando el umbral a mano:
    // el día que añada un cuarto segmento nacerá en `null` y este es el test
    // que impide que dispare reglas mientras tanto.
    const original = UMBRAL_CM.pantorrilla;
    UMBRAL_CM.pantorrilla = null;
    try {
      expect(segmentosConAsimetria(medicion({ calf_cm: 40, calf_left_cm: 32 }))).toEqual([]);
    } finally {
      UMBRAL_CM.pantorrilla = original;
    }
  });
});

describe("el hecho que llega al motor", () => {
  it("sin medición, el hecho NO existe: no se afirma que no haya asimetría", () => {
    // "Lo que falta, falta". Una lista vacía diría "se midió y está simétrico",
    // que es afirmar algo que nadie comprobó.
    const h = resolverHechos({});
    expect("asimetrias" in h).toBe(false);
  });

  it("con medición y sin asimetría, el hecho existe y va vacío", () => {
    // Aquí la lista vacía SÍ es un dato: se midió y no hay nada que corregir.
    const h = resolverHechos({ medicion: { thigh_cm: 58, thigh_left_cm: 57.5 } });
    expect(h.asimetrias).toEqual([]);
  });

  it("con asimetría, la nombra", () => {
    const h = resolverHechos({ medicion: { arm_flexed_cm: 38, arm_flexed_left_cm: 36 } });
    expect(h.asimetrias).toEqual(["brazo"]);
  });
});
