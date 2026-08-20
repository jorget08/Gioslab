import { describe, expect, it } from "vitest";

import { leerErrorDeUrl, urlDeLogin } from "@/domain/error-url";

describe("leerErrorDeUrl", () => {
  it("lee el código específico de la query", () => {
    expect(leerErrorDeUrl("?error=access_denied&error_code=otp_expired", "")).toBe("otp_expired");
  });

  it("lee del FRAGMENTO, que es donde Supabase lo manda de verdad", () => {
    // El fragmento no llega al servidor; si solo miráramos la query, un enlace
    // caducado dejaría al usuario sin explicación.
    expect(leerErrorDeUrl("", "#error=access_denied&error_code=otp_expired")).toBe("otp_expired");
  });

  it("prefiere el código específico al genérico", () => {
    // 'otp_expired' permite decir "pide uno nuevo"; 'access_denied' no dice nada.
    expect(leerErrorDeUrl("?error=access_denied&error_code=otp_expired", "")).not.toBe(
      "access_denied",
    );
  });

  it("cae al genérico si no hay específico", () => {
    expect(leerErrorDeUrl("?error=access_denied", "")).toBe("access_denied");
  });

  it("devuelve null cuando no hay error", () => {
    expect(leerErrorDeUrl("?siguiente=/atletas", "")).toBeNull();
    expect(leerErrorDeUrl("", "")).toBeNull();
  });

  it("tolera el prefijo con y sin ? o #", () => {
    expect(leerErrorDeUrl("error=otp_expired", "")).toBe("otp_expired");
    expect(leerErrorDeUrl("", "error=otp_expired")).toBe("otp_expired");
  });

  it("reproduce la URL real que llegó por correo", () => {
    const real =
      "?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    expect(leerErrorDeUrl(real, "")).toBe("otp_expired");
  });
});

describe("urlDeLogin", () => {
  it("conserva a dónde iba el usuario", () => {
    expect(urlDeLogin({ siguiente: "/atletas" })).toBe("/login?siguiente=%2Fatletas");
  });

  it("conserva el error", () => {
    expect(urlDeLogin({ error: "otp_expired" })).toBe("/login?error=otp_expired");
  });

  it("sin nada, va al login pelado", () => {
    expect(urlDeLogin({})).toBe("/login");
    expect(urlDeLogin({ error: null })).toBe("/login");
  });
});
