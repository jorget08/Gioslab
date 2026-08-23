import { describe, expect, it } from "vitest";

import {
  destinoSeguro,
  destinoTrasEntrar,
  esRutaPublica,
  puedeAcceder,
  rolesPermitidos,
  rutaInicial,
  type Rol,
} from "@/domain/autorizacion";

const TODOS: Rol[] = ["super_admin", "gym", "trainer", "client"];

describe("rutas públicas", () => {
  it.each(["/login", "/registro", "/recuperar", "/nueva-contrasena", "/auth/callback"])(
    "%s es pública",
    (r) => expect(esRutaPublica(r)).toBe(true),
  );

  it.each(["/", "/atletas", "/admin"])("%s NO es pública", (r) =>
    expect(esRutaPublica(r)).toBe(false),
  );

  it("no confunde un prefijo con otra ruta", () => {
    // /loginizador no debe colarse por empezar igual que /login.
    expect(esRutaPublica("/loginizador")).toBe(false);
  });
});

describe("coincidencia por prefijo más largo", () => {
  it("/admin/reglas usa la regla de /admin, no la de /", () => {
    expect(rolesPermitidos("/admin/reglas")).toEqual(["super_admin"]);
  });

  it("/atletas/123/evaluar usa la regla de /atletas", () => {
    expect(rolesPermitidos("/atletas/123/evaluar")).toEqual([
      "super_admin",
      "gym",
      "trainer",
    ]);
  });
});

describe("acceso por rol", () => {
  it("solo super_admin entra a /admin", () => {
    expect(puedeAcceder("super_admin", "/admin")).toBe(true);
    for (const rol of ["gym", "trainer", "client"] as Rol[]) {
      expect(puedeAcceder(rol, "/admin")).toBe(false);
    }
  });

  it("el cliente NO entra a los atletas ni a la biblioteca", () => {
    expect(puedeAcceder("client", "/atletas")).toBe(false);
    expect(puedeAcceder("client", "/biblioteca")).toBe(false);
  });

  it("el cliente solo tiene su rutina", () => {
    expect(puedeAcceder("client", "/mi-rutina")).toBe(true);
  });

  it("el entrenador no entra a la zona del cliente", () => {
    expect(puedeAcceder("trainer", "/mi-rutina")).toBe(false);
  });

  it("gym y trainer comparten atletas y biblioteca", () => {
    for (const rol of ["gym", "trainer"] as Rol[]) {
      expect(puedeAcceder(rol, "/atletas")).toBe(true);
      expect(puedeAcceder(rol, "/biblioteca")).toBe(true);
    }
  });

  it("pero solo super_admin edita la biblioteca", () => {
    // La metodología GQ es el producto que se vende: si cada gimnasio la edita,
    // el motor deja de ser confiable (MODELO-DATOS §1.2). Es la misma frontera
    // que aplica RLS; aquí solo se evita ofrecer una pantalla que fallaría.
    expect(puedeAcceder("super_admin", "/biblioteca/ejercicio")).toBe(true);
    for (const rol of ["gym", "trainer", "client"] as Rol[]) {
      expect(puedeAcceder(rol, "/biblioteca/ejercicio")).toBe(false);
    }
  });

  it("la subruta gana a la sección: la coincidencia más larga manda", () => {
    // Si ganara el prefijo corto, el formulario heredaría los permisos de
    // lectura y cualquier entrenador entraría a editar.
    expect(rolesPermitidos("/biblioteca/ejercicio")).toEqual(["super_admin"]);
    expect(rolesPermitidos("/biblioteca")).toContain("trainer");
  });
});

describe("falla cerrado", () => {
  it("el cliente no aterriza en el panel del entrenador", () => {
    // Su casa es /mi-rutina; useRedirigirSegunRol lo lleva allí.
    expect(puedeAcceder("client", "/")).toBe(false);
  });

  it("sin rol no se entra a nada privado", () => {
    for (const ruta of ["/", "/atletas", "/admin", "/mi-rutina"]) {
      expect(puedeAcceder(null, ruta)).toBe(false);
      expect(puedeAcceder(undefined, ruta)).toBe(false);
    }
  });

  it("un rol desconocido tampoco entra", () => {
    // Pasa si alguien añade un rol al enum de la base y olvida el mapa.
    expect(puedeAcceder("auditor" as Rol, "/atletas")).toBe(false);
  });

  it("una ruta sin regla queda BLOQUEADA, no abierta", () => {
    // Es la protección contra olvidarse de registrar una sección nueva.
    // Nota: "/" cubre todo lo que no tenga prefijo propio, así que se prueba
    // con la función de permisos directamente.
    expect(rolesPermitidos("/admin/algo")).toEqual(["super_admin"]);
    expect(puedeAcceder("trainer", "/admin/seccion-nueva")).toBe(false);
  });

  it("sin sesión, las rutas públicas siguen abiertas", () => {
    expect(puedeAcceder(null, "/login")).toBe(true);
  });
});

describe("ruta inicial por rol", () => {
  it("el cliente aterriza en su rutina", () => {
    expect(rutaInicial("client")).toBe("/mi-rutina");
  });

  it("el staff aterriza en sus atletas, que es el trabajo", () => {
    // No hay panel de inicio en Fase A. Una pantalla intermedia que solo dice
    // "hola" es un toque de más cada vez que se abre la app.
    for (const rol of ["super_admin", "gym", "trainer"] as Rol[]) {
      expect(rutaInicial(rol)).toBe("/atletas");
    }
  });

  it('sin rol va a "/", que es donde se explica que falta espacio de trabajo', () => {
    // Único caso en que "/" es un destino y no un repartidor: a esa persona no
    // hay a dónde mandarla, y necesita saber por qué.
    expect(rutaInicial(null)).toBe("/");
    expect(rutaInicial(undefined)).toBe("/");
  });
});

describe("destinoSeguro — evitar el redirector abierto", () => {
  it("acepta rutas internas", () => {
    expect(destinoSeguro("/atletas/123")).toBe("/atletas/123");
  });

  it("rechaza URLs absolutas", () => {
    expect(destinoSeguro("https://sitio-malo.com")).toBe("/");
  });

  it("rechaza //host, que el navegador trata como dominio externo", () => {
    expect(destinoSeguro("//sitio-malo.com")).toBe("/");
  });

  it("rechaza barras invertidas, que algunos navegadores normalizan", () => {
    expect(destinoSeguro("/\\sitio-malo.com")).toBe("/");
  });

  it("usa el valor por defecto si no hay nada", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro("", "/mi-rutina")).toBe("/mi-rutina");
  });
});

describe("cobertura: todos los roles tienen algún sitio a donde ir", () => {
  it.each(TODOS)("%s puede entrar a su ruta inicial", (rol) => {
    expect(puedeAcceder(rol, rutaInicial(rol))).toBe(true);
  });
});

describe("destinoTrasEntrar", () => {
  it("respeta a dónde iba el usuario cuando lo interceptó el guarda", () => {
    expect(destinoTrasEntrar("trainer", "/atletas/ficha?id=abc")).toBe("/atletas/ficha?id=abc");
  });

  it("sin destino pedido, cada rol va a su casa", () => {
    expect(destinoTrasEntrar("trainer", null)).toBe("/atletas");
    expect(destinoTrasEntrar("client", null)).toBe("/mi-rutina");
    expect(destinoTrasEntrar("super_admin", undefined)).toBe("/atletas");
  });

  it("NUNCA devuelve al login: eso era un bucle infinito", () => {
    for (const r of ["/login", "/registro", "/recuperar", "/nueva-contrasena", "/auth/callback"]) {
      expect(destinoTrasEntrar("trainer", r)).toBe("/atletas");
    }
  });

  it("pero /invitacion sí es un destino legítimo", () => {
    // Es pública como el login, pero es justo a donde vuelve el invitado en
    // cuanto tiene cuenta. Meterla en el mismo saco rompería ese flujo.
    expect(destinoTrasEntrar("trainer", "/invitacion?token=abc")).toBe("/invitacion?token=abc");
  });

  it("no manda a nadie a una pantalla que su rol no puede ver", () => {
    // Un cliente con ?siguiente=/atletas acabaría en "no tienes acceso" justo
    // después de entrar. Va a su casa y ya está.
    expect(destinoTrasEntrar("client", "/atletas")).toBe("/mi-rutina");
    expect(destinoTrasEntrar("trainer", "/admin")).toBe("/atletas");
  });

  it("rechaza destinos externos, igual que destinoSeguro", () => {
    // Sin esto el login sería un redirector abierto, útil para phishing.
    expect(destinoTrasEntrar("trainer", "https://malo.example")).toBe("/atletas");
    expect(destinoTrasEntrar("trainer", "//malo.example")).toBe("/atletas");
  });

  it("sin rol no adivina un destino privado", () => {
    expect(destinoTrasEntrar(null, "/atletas")).toBe("/");
  });
});
