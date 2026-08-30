import { describe, expect, it } from "vitest";

import {
  extensionDe,
  hacerPortada,
  leerMedios,
  MAX_FOTO_BYTES,
  MAX_VIDEO_BYTES,
  motivoDeRechazo,
  pesoLegible,
  portada,
  quitarMedio,
  rutaNueva,
  tieneVideo,
  tipoDeArchivo,
  type Medio,
} from "@/domain/medios";
import { medidaDestino } from "@/lib/medios/comprimir";

const foto = (path: string): Medio => ({ tipo: "foto", path });
const video = (path: string): Medio => ({ tipo: "video", path });

describe("leerMedios", () => {
  it("devuelve vacío para cualquier cosa que no sea un array", () => {
    expect(leerMedios(null)).toEqual([]);
    expect(leerMedios(undefined)).toEqual([]);
    expect(leerMedios("foto.jpg")).toEqual([]);
    expect(leerMedios({ tipo: "foto", path: "a.jpg" })).toEqual([]);
  });

  it("descarta elementos mal formados en vez de reventar", () => {
    // Es una columna jsonb libre: puede traer restos de un seed o de una carga
    // anterior, y eso no puede tumbar la pantalla del entrenador.
    const crudo = [
      { tipo: "foto", path: "a.jpg" },
      { tipo: "sonido", path: "b.mp3" },
      { tipo: "foto" },
      { tipo: "foto", path: "   " },
      "c.jpg",
      null,
      { tipo: "video", path: "d.mp4" },
    ];
    expect(leerMedios(crudo)).toEqual([foto("a.jpg"), video("d.mp4")]);
  });

  it("deduplica por ruta conservando el primero", () => {
    expect(leerMedios([foto("a.jpg"), video("a.jpg"), foto("b.jpg")])).toEqual([
      foto("a.jpg"),
      foto("b.jpg"),
    ]);
  });

  it("respeta el orden, porque el primero es la portada", () => {
    expect(leerMedios([foto("b.jpg"), foto("a.jpg")])).toEqual([foto("b.jpg"), foto("a.jpg")]);
  });
});

describe("tipoDeArchivo", () => {
  it("clasifica los formatos que aceptamos", () => {
    expect(tipoDeArchivo("image/jpeg")).toBe("foto");
    expect(tipoDeArchivo("image/heic")).toBe("foto");
    expect(tipoDeArchivo("video/quicktime")).toBe("video");
  });

  it("rechaza lo que no reconoce", () => {
    expect(tipoDeArchivo("application/pdf")).toBeNull();
    expect(tipoDeArchivo("")).toBeNull();
  });
});

describe("motivoDeRechazo", () => {
  it("acepta lo que está en formato y dentro del tope", () => {
    expect(motivoDeRechazo("image/jpeg", 3 * 1024 * 1024)).toBeNull();
    expect(motivoDeRechazo("video/mp4", 10 * 1024 * 1024)).toBeNull();
  });

  it("explica el formato no soportado", () => {
    expect(motivoDeRechazo("application/pdf", 100)).toMatch(/imágenes/i);
  });

  it("aplica un tope distinto a foto y a video", () => {
    // Un video de 30 MB pasa; una foto de 30 MB no. Si compartieran tope, o el
    // canvas se ahoga con imágenes absurdas o no cabe un clip de técnica.
    const treintaMB = 30 * 1024 * 1024;
    expect(motivoDeRechazo("video/mp4", treintaMB)).toBeNull();
    expect(motivoDeRechazo("image/jpeg", treintaMB)).toMatch(/tope/i);
  });

  it("dice cuánto pesa y cuál es el tope, no solo que falló", () => {
    const mensaje = motivoDeRechazo("video/mp4", MAX_VIDEO_BYTES + 1);
    expect(mensaje).toContain("50,0 MB");
  });

  it("acepta justo el tope y rechaza un byte más", () => {
    expect(motivoDeRechazo("image/jpeg", MAX_FOTO_BYTES)).toBeNull();
    expect(motivoDeRechazo("image/jpeg", MAX_FOTO_BYTES + 1)).not.toBeNull();
  });
});

describe("pesoLegible", () => {
  it("usa la unidad que se lee de un vistazo", () => {
    expect(pesoLegible(512)).toBe("512 B");
    expect(pesoLegible(2048)).toBe("2 KB");
    expect(pesoLegible(3 * 1024 * 1024)).toBe("3,0 MB");
  });
});

describe("rutaNueva", () => {
  it("agrupa por ejercicio y nombra con el uuid, no con el nombre original", () => {
    // El bucket es público: con el nombre original la URL sería adivinable.
    expect(rutaNueva("ej-1", "image/jpeg", "uuid-1")).toBe("ej-1/uuid-1.jpg");
  });

  it("toma la extensión del MIME y no del nombre del archivo", () => {
    // Android manda archivos llamados "image", sin extensión.
    expect(extensionDe("video/quicktime")).toBe("mov");
    expect(extensionDe("image/heic")).toBe("heic");
    expect(extensionDe("cualquier/cosa")).toBe("bin");
  });
});

describe("orden de la galería", () => {
  const galeria = [foto("a.jpg"), video("b.mp4"), foto("c.jpg")];

  it("hacer portada mueve al frente sin perder al resto", () => {
    expect(hacerPortada(galeria, "c.jpg")).toEqual([foto("c.jpg"), foto("a.jpg"), video("b.mp4")]);
  });

  it("hacer portada de algo que no está no cambia nada", () => {
    expect(hacerPortada(galeria, "x.jpg")).toEqual(galeria);
  });

  it("quitar deja el resto en el mismo orden", () => {
    expect(quitarMedio(galeria, "b.mp4")).toEqual([foto("a.jpg"), foto("c.jpg")]);
  });

  it("no muta el array original", () => {
    hacerPortada(galeria, "c.jpg");
    quitarMedio(galeria, "a.jpg");
    expect(galeria).toEqual([foto("a.jpg"), video("b.mp4"), foto("c.jpg")]);
  });
});

describe("portada del listado", () => {
  it("es la primera FOTO, aunque haya un video antes", () => {
    // Un video no se puede pintar como miniatura sin descargarlo: en una lista
    // de 47 ejercicios, eso son decenas de megas del plan de datos de alguien.
    expect(portada([video("b.mp4"), foto("a.jpg")])).toEqual(foto("a.jpg"));
  });

  it("es nula si solo hay video", () => {
    expect(portada([video("b.mp4")])).toBeNull();
    expect(portada([])).toBeNull();
  });

  it("tieneVideo delata el material que la miniatura no enseña", () => {
    expect(tieneVideo([video("b.mp4")])).toBe(true);
    expect(tieneVideo([foto("a.jpg")])).toBe(false);
  });
});

describe("medidaDestino", () => {
  it("no agranda una imagen que ya es pequeña", () => {
    expect(medidaDestino(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 });
  });

  it("reduce por el lado mayor manteniendo la proporción", () => {
    expect(medidaDestino(4000, 3000, 1600)).toEqual({ ancho: 1600, alto: 1200 });
    expect(medidaDestino(3000, 4000, 1600)).toEqual({ ancho: 1200, alto: 1600 });
  });

  it("nunca devuelve un lado en cero", () => {
    // Un panorama muy alargado redondearía el lado corto a 0, y `drawImage`
    // lanza con un canvas de ancho cero.
    const { ancho, alto } = medidaDestino(10000, 3, 1600);
    expect(ancho).toBeGreaterThan(0);
    expect(alto).toBeGreaterThan(0);
  });
});
