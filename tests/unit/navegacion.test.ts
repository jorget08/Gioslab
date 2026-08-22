import { describe, expect, it } from "vitest";

import { puedeAcceder, rolesPermitidos, type Rol } from "@/domain/autorizacion";
import { ADMINISTRACION, estaActiva, NAVEGACION, navegacionDe } from "@/lib/navegacion";

const TODOS: Rol[] = ["super_admin", "gym", "trainer", "client"];

describe("el menú no ofrece puertas cerradas", () => {
  it.each(NAVEGACION.map((n) => [n.href, n.etiqueta] as const))(
    "%s está registrada en el mapa de permisos",
    (href) => {
      expect(rolesPermitidos(href)).not.toBeNull();
    },
  );

  it("cada entrada solo se muestra a roles que SÍ pueden entrar", () => {
    // Es la prueba que importa: si alguien añade una sección al menú y olvida
    // registrarla en los permisos, el usuario ve un enlace que lo manda a un 403.
    for (const entrada of NAVEGACION) {
      for (const rol of entrada.roles) {
        expect(
          puedeAcceder(rol, entrada.href),
          `${rol} ve "${entrada.etiqueta}" pero no puede entrar a ${entrada.href}`,
        ).toBe(true);
      }
    }
  });

  it("y ningún rol excluido ve una entrada a la que sí podría entrar", () => {
    // El caso contrario: una sección accesible que nadie encuentra en el menú.
    for (const entrada of NAVEGACION) {
      const excluidos = TODOS.filter((r) => !entrada.roles.includes(r));
      for (const rol of excluidos) {
        expect(
          puedeAcceder(rol, entrada.href),
          `${rol} puede entrar a ${entrada.href} pero no lo ve en el menú`,
        ).toBe(false);
      }
    }
  });
});

describe("navegacionDe", () => {
  it("el cliente solo ve su rutina", () => {
    const n = navegacionDe("client");
    expect(n.map((x) => x.href)).toEqual(["/mi-rutina"]);
  });

  it("el entrenador ve inicio, atletas, equipo y biblioteca", () => {
    expect(navegacionDe("trainer").map((x) => x.href)).toEqual([
      "/",
      "/atletas",
      "/equipo",
      "/biblioteca",
    ]);
  });

  it("todo el staff ve la biblioteca, aunque solo super_admin pueda editarla", () => {
    // Leerla y escribirla son cosas distintas: el entrenador necesita saber qué
    // ejercicios existen. Quien restringe la escritura es RLS, no el menú.
    for (const rol of ["super_admin", "gym", "trainer"] as const) {
      expect(navegacionDe(rol).map((x) => x.href)).toContain("/biblioteca");
    }
  });

  it("administración no ocupa una pestaña: vive en la barra superior", () => {
    expect(NAVEGACION.map((x) => x.href)).not.toContain("/admin");
  });

  it("sin rol no ve nada", () => {
    expect(navegacionDe(null)).toEqual([]);
    expect(navegacionDe(undefined)).toEqual([]);
  });

  it("nadie ve más de 4 pestañas: en móvil no caben", () => {
    for (const rol of TODOS) {
      expect(navegacionDe(rol).length).toBeLessThanOrEqual(4);
    }
  });
});

describe("Administración, fuera de las pestañas", () => {
  it("está registrada en el mapa de permisos", () => {
    expect(rolesPermitidos(ADMINISTRACION.href)).not.toBeNull();
  });

  it("solo la ve quien puede entrar, y la ven todos los que pueden", () => {
    // La misma paridad que se exige al menú principal: sacarla de las pestañas
    // no puede servir de excusa para dejar de comprobarla.
    for (const rol of TODOS) {
      expect(
        ADMINISTRACION.roles.includes(rol),
        `desajuste para ${rol} en ${ADMINISTRACION.href}`,
      ).toBe(puedeAcceder(rol, ADMINISTRACION.href));
    }
  });
});

describe("estaActiva", () => {
  it('"/" solo se marca en la raíz', () => {
    expect(estaActiva("/", "/")).toBe(true);
    // Si no, quedaría activa en todas las pantallas por ser prefijo de todo.
    expect(estaActiva("/", "/atletas")).toBe(false);
  });

  it("una sección se marca también en sus subrutas", () => {
    expect(estaActiva("/atletas", "/atletas")).toBe(true);
    expect(estaActiva("/atletas", "/atletas/123")).toBe(true);
  });

  it("no confunde secciones con prefijo común", () => {
    expect(estaActiva("/atletas", "/atletas-archivados")).toBe(false);
  });
});
