import { describe, expect, it } from "vitest";

import { CONTRAINDICACIONES } from "@/domain/contraindicaciones";
import {
  agruparPorPatron,
  contraindicacionesDisponibles,
  filtrarEjercicios,
  filtrosActivos,
  nombreDuplicado,
  patronesDisponibles,
  SIN_FILTROS,
  valoresDisponibles,
  normalizarNombre,
  resumenEjercicio,
  sugerencias,
  type Ejercicio,
} from "@/domain/ejercicios";
import { PATRONES } from "@/domain/patrones";

const ej = (p: Partial<Ejercicio> & { id: string; name: string }): Ejercicio => ({
  description: null,
  target_muscle: null,
  movement_pattern: null,
  biomechanical_type: null,
  equipment: null,
  contraindications: [],
  is_active: true,
  ...p,
});

describe("normalizarNombre", () => {
  it("colapsa los espacios, que es lo que crea duplicados invisibles", () => {
    // `name` es UNIQUE: sin esto, "Prensa  45°" y "Prensa 45°" son dos
    // ejercicios distintos y el motor que busque uno no encuentra el otro.
    expect(normalizarNombre("  Prensa   45°  ")).toBe("Prensa 45°");
    expect(normalizarNombre("Press\tde\nBanca")).toBe("Press de Banca");
  });

  it("no toca un nombre ya limpio", () => {
    expect(normalizarNombre("Sentadilla Búlgara")).toBe("Sentadilla Búlgara");
  });
});

describe("nombreDuplicado", () => {
  const existentes = [
    { id: "1", name: "Prensa 45°" },
    { id: "2", name: "Sentadilla Búlgara" },
  ];

  it("detecta el duplicado exacto", () => {
    expect(nombreDuplicado("Prensa 45°", existentes)).toBe(true);
  });

  it("no se deja engañar por mayúsculas, acentos ni espacios de más", () => {
    expect(nombreDuplicado("  sentadilla   bulgara ", existentes)).toBe(true);
    expect(nombreDuplicado("SENTADILLA BÚLGARA", existentes)).toBe(true);
  });

  it("un nombre nuevo no es duplicado", () => {
    expect(nombreDuplicado("Hip Thrust", existentes)).toBe(false);
  });

  it("al editar, no se considera duplicado de sí mismo", () => {
    // Sin esto, guardar un ejercicio sin cambiarle el nombre daría error.
    expect(nombreDuplicado("Prensa 45°", existentes, "1")).toBe(false);
    expect(nombreDuplicado("Prensa 45°", existentes, "2")).toBe(true);
  });

  it("un nombre vacío no dispara el aviso", () => {
    // De eso se encarga la validación de obligatorio, con mejor mensaje.
    expect(nombreDuplicado("   ", existentes)).toBe(false);
  });
});

describe("sugerencias", () => {
  it("deduplica sin distinguir mayúsculas ni acentos", () => {
    expect(sugerencias(["Cuádriceps", "cuadriceps", "CUÁDRICEPS"])).toEqual(["Cuádriceps"]);
  });

  it("conserva la grafía que él escribió, no la nuestra", () => {
    // La ortografía correcta del dominio es la suya. Normalizarla sería
    // decidir por él en un campo que precisamente no ha fijado.
    expect(sugerencias(["cuadriceps", "Cuádriceps"])).toEqual(["cuadriceps"]);
  });

  it("ordena alfabéticamente en español", () => {
    expect(sugerencias(["Pectoral", "Dorsal", "Ñandú"])).toEqual(["Dorsal", "Ñandú", "Pectoral"]);
  });

  it("ignora vacíos y nulos", () => {
    expect(sugerencias([null, undefined, "", "   ", "Glúteo"])).toEqual(["Glúteo"]);
  });

  it("sin valores devuelve lista vacía", () => {
    expect(sugerencias([])).toEqual([]);
  });
});

describe("resumenEjercicio", () => {
  it("junta músculo, equipo y contraindicaciones de las dos familias", () => {
    expect(
      resumenEjercicio(
        ej({
          id: "1",
          name: "Prensa 45°",
          target_muscle: "cuádriceps",
          equipment: "prensa",
          contraindications: ["Rodilla", "Hipertensión / Cardiovascular"],
        }),
      ),
    ).toBe("cuádriceps · prensa · 2 contraindicaciones");
  });

  it("concuerda el singular", () => {
    expect(
      resumenEjercicio(ej({ id: "1", name: "X", contraindications: ["Rodilla"] })),
    ).toBe("1 contraindicación");
  });

  it("sin datos no deja separadores sueltos", () => {
    expect(resumenEjercicio(ej({ id: "1", name: "X" }))).toBe("");
  });
});

describe("agruparPorPatron", () => {
  it("agrupa en el orden del catálogo de Giovanni, no alfabético", () => {
    // Es el eje con el que él piensa y con el que el motor sustituye.
    const grupos = agruparPorPatron(
      [
        ej({ id: "1", name: "Jalón al Pecho", movement_pattern: "vertical_pull" }),
        ej({ id: "2", name: "Prensa", movement_pattern: "squat_dominante_rodilla" }),
      ],
      PATRONES,
    );
    expect(grupos.map((g) => g.patron)).toEqual(["squat_dominante_rodilla", "vertical_pull"]);
  });

  it("no deja grupos vacíos", () => {
    const grupos = agruparPorPatron(
      [ej({ id: "1", name: "Prensa", movement_pattern: "squat_dominante_rodilla" })],
      PATRONES,
    );
    expect(grupos).toHaveLength(1);
  });

  it("ordena alfabéticamente dentro de cada patrón", () => {
    const grupos = agruparPorPatron(
      [
        ej({ id: "1", name: "Zancadas", movement_pattern: "squat_dominante_rodilla" }),
        ej({ id: "2", name: "Prensa", movement_pattern: "squat_dominante_rodilla" }),
      ],
      PATRONES,
    );
    expect(grupos[0].ejercicios.map((e) => e.name)).toEqual(["Prensa", "Zancadas"]);
  });

  it("manda al final, juntos, los que el motor no puede sustituir", () => {
    // Sin patrón el motor no tiene con qué cruzarlos: esconderlos entre los
    // demás dejaría el agujero invisible.
    const grupos = agruparPorPatron(
      [
        ej({ id: "1", name: "Sin clasificar" }),
        ej({ id: "2", name: "Inventado", movement_pattern: "patron_que_no_existe" }),
        ej({ id: "3", name: "Prensa", movement_pattern: "squat_dominante_rodilla" }),
      ],
      PATRONES,
    );
    expect(grupos.at(-1)?.patron).toBeNull();
    expect(grupos.at(-1)?.ejercicios.map((e) => e.name)).toEqual(["Inventado", "Sin clasificar"]);
  });

  it("sin ejercicios devuelve lista vacía", () => {
    expect(agruparPorPatron([], PATRONES)).toEqual([]);
  });

  it("no muta el arreglo original", () => {
    const original = [
      ej({ id: "1", name: "Zancadas", movement_pattern: "squat_dominante_rodilla" }),
      ej({ id: "2", name: "Prensa", movement_pattern: "squat_dominante_rodilla" }),
    ];
    agruparPorPatron(original, PATRONES);
    expect(original.map((e) => e.name)).toEqual(["Zancadas", "Prensa"]);
  });
});

describe("filtrarEjercicios", () => {
  const biblioteca = [
    ej({ id: "1", name: "Prensa 45°", movement_pattern: "squat_dominante_rodilla",
         target_muscle: "cuádriceps", equipment: "prensa",
         contraindications: ["Rodilla"] }),
    ej({ id: "2", name: "Sentadilla Trasera", movement_pattern: "squat_dominante_rodilla",
         target_muscle: "cuádriceps", equipment: "barra",
         contraindications: ["Lumbar", "Rodilla", "Hernia discal / Patología axial"] }),
    ej({ id: "3", name: "Jalón al Pecho", movement_pattern: "vertical_pull",
         target_muscle: "dorsal", equipment: "polea" }),
    ej({ id: "4", name: "Press Militar", movement_pattern: "vertical_push",
         target_muscle: "deltoides", equipment: "barra",
         contraindications: ["Hombro"] }),
    ej({ id: "5", name: "Curl Retirado", target_muscle: "bíceps", equipment: "mancuerna",
         is_active: false }),
  ];
  const nombres = (r: Ejercicio[]) => r.map((e) => e.name);

  it("sin filtros devuelve todo lo activo", () => {
    expect(nombres(filtrarEjercicios(biblioteca, SIN_FILTROS))).toEqual([
      "Prensa 45°", "Sentadilla Trasera", "Jalón al Pecho", "Press Militar",
    ]);
  });

  it("los archivados solo salen si se piden", () => {
    const r = filtrarEjercicios(biblioteca, { ...SIN_FILTROS, incluirArchivados: true });
    expect(nombres(r)).toContain("Curl Retirado");
  });

  it("busca por nombre, músculo y equipo, sin acentos ni mayúsculas", () => {
    expect(nombres(filtrarEjercicios(biblioteca, { ...SIN_FILTROS, texto: "JALON" })))
      .toEqual(["Jalón al Pecho"]);
    expect(nombres(filtrarEjercicios(biblioteca, { ...SIN_FILTROS, texto: "cuadriceps" })))
      .toEqual(["Prensa 45°", "Sentadilla Trasera"]);
    expect(nombres(filtrarEjercicios(biblioteca, { ...SIN_FILTROS, texto: "polea" })))
      .toEqual(["Jalón al Pecho"]);
  });

  it("dentro de un grupo SUMA: dos patrones enseñan los dos", () => {
    // Si restara, marcar dos casillas dejaría la lista vacía siempre.
    const r = filtrarEjercicios(biblioteca, {
      ...SIN_FILTROS, patrones: ["vertical_pull", "vertical_push"],
    });
    expect(nombres(r)).toEqual(["Jalón al Pecho", "Press Militar"]);
  });

  it("entre grupos RESTA: patrón y equipo tienen que cumplirse a la vez", () => {
    const r = filtrarEjercicios(biblioteca, {
      ...SIN_FILTROS, patrones: ["squat_dominante_rodilla"], equipos: ["barra"],
    });
    expect(nombres(r)).toEqual(["Sentadilla Trasera"]);
  });

  it("EXCLUYE lo contraindicado, no lo busca", () => {
    // La decisión de diseño del buscador. Un entrenador con un atleta de
    // rodilla mala quiere lo que SÍ puede darle; devolverle la lista de lo
    // prohibido es invitarle a prescribirla.
    const r = filtrarEjercicios(biblioteca, { ...SIN_FILTROS, aptoPara: ["Rodilla"] });
    expect(nombres(r)).toEqual(["Jalón al Pecho", "Press Militar"]);
  });

  it("basta una coincidencia para descartar, aunque cumpla el resto", () => {
    const r = filtrarEjercicios(biblioteca, {
      ...SIN_FILTROS, patrones: ["squat_dominante_rodilla"], aptoPara: ["Lumbar"],
    });
    expect(nombres(r)).toEqual(["Prensa 45°"]);
  });

  it("descarta también por condición sistémica", () => {
    const r = filtrarEjercicios(biblioteca, {
      ...SIN_FILTROS, aptoPara: ["Hernia discal / Patología axial"],
    });
    expect(nombres(r)).not.toContain("Sentadilla Trasera");
  });

  it("un ejercicio sin contraindicaciones nunca se descarta por ese filtro", () => {
    const r = filtrarEjercicios(biblioteca, {
      ...SIN_FILTROS, aptoPara: ["Rodilla", "Hombro", "Lumbar"],
    });
    expect(nombres(r)).toEqual(["Jalón al Pecho"]);
  });

  it("no muta la biblioteca", () => {
    const antes = biblioteca.map((e) => e.name);
    filtrarEjercicios(biblioteca, { ...SIN_FILTROS, texto: "prensa" });
    expect(biblioteca.map((e) => e.name)).toEqual(antes);
  });
});

describe("filtrosActivos", () => {
  it("cuenta lo puesto, para la insignia del botón", () => {
    expect(filtrosActivos(SIN_FILTROS)).toBe(0);
    expect(filtrosActivos({ ...SIN_FILTROS, texto: "algo" })).toBe(0);
    expect(filtrosActivos({ ...SIN_FILTROS, patrones: ["a", "b"], aptoPara: ["Rodilla"] })).toBe(3);
    expect(filtrosActivos({ ...SIN_FILTROS, incluirArchivados: true })).toBe(1);
  });
});

describe("opciones disponibles", () => {
  const biblioteca = [
    ej({ id: "1", name: "A", movement_pattern: "vertical_pull", target_muscle: "dorsal",
         equipment: "polea", contraindications: ["Hombro"] }),
    ej({ id: "2", name: "B", movement_pattern: "vertical_pull", target_muscle: "Dorsal",
         equipment: "barra" }),
  ];

  it("solo ofrece lo que existe de verdad", () => {
    // Un filtro que lleva siempre a una lista vacía hace dudar de si la
    // búsqueda está rota.
    expect(patronesDisponibles(biblioteca, PATRONES)).toEqual(["vertical_pull"]);
    expect(valoresDisponibles(biblioteca, "equipment")).toEqual(["barra", "polea"]);
    expect(contraindicacionesDisponibles(biblioteca, CONTRAINDICACIONES)).toEqual(["Hombro"]);
  });

  it("no duplica por mayúsculas", () => {
    expect(valoresDisponibles(biblioteca, "target_muscle")).toEqual(["dorsal"]);
  });

  it("con la biblioteca vacía no ofrece nada", () => {
    expect(patronesDisponibles([], PATRONES)).toEqual([]);
    expect(contraindicacionesDisponibles([], CONTRAINDICACIONES)).toEqual([]);
  });
});
