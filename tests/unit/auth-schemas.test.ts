import { describe, expect, it } from "vitest";

import {
  loginSchema,
  mensajeDeError,
  nuevaPasswordSchema,
  recuperarSchema,
  registroSchema,
} from "@/lib/validation/auth";

describe("registroSchema", () => {
  const valido = {
    fullName: "Giovanni Quiroz",
    email: "gio@gioslab.co",
    password: "unaclavelarga",
    confirmPassword: "unaclavelarga",
  };

  it("acepta un registro correcto", () => {
    expect(registroSchema.safeParse(valido).success).toBe(true);
  });

  it("normaliza el correo: recorta espacios y baja a minúsculas", () => {
    const r = registroSchema.parse({ ...valido, email: "  GIO@GiosLab.CO  " });
    expect(r.email).toBe("gio@gioslab.co");
  });

  it("recorta los espacios del nombre", () => {
    expect(registroSchema.parse({ ...valido, fullName: "  Jorge  " }).fullName).toBe("Jorge");
  });

  it("rechaza contraseñas que no coinciden, señalando el campo de confirmación", () => {
    const r = registroSchema.safeParse({ ...valido, confirmPassword: "otracosa" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["confirmPassword"]);
      expect(r.error.issues[0].message).toBe("Las contraseñas no coinciden");
    }
  });

  it("exige mínimo 8 caracteres: da acceso a historiales clínicos", () => {
    const corta = { ...valido, password: "1234567", confirmPassword: "1234567" };
    expect(registroSchema.safeParse(corta).success).toBe(false);
  });

  it("acepta exactamente 8", () => {
    const ocho = { ...valido, password: "12345678", confirmPassword: "12345678" };
    expect(registroSchema.safeParse(ocho).success).toBe(true);
  });

  it("rechaza un nombre vacío o solo espacios", () => {
    expect(registroSchema.safeParse({ ...valido, fullName: "   " }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("no impone longitud mínima a la contraseña", () => {
    // Si la impusiera, alguien con una clave antigua más corta no podría ni
    // intentar entrar. Quien decide es Supabase.
    const r = loginSchema.safeParse({ email: "a@b.co", password: "x" });
    expect(r.success).toBe(true);
  });

  it("rechaza un correo mal formado", () => {
    expect(loginSchema.safeParse({ email: "no-es-correo", password: "x" }).success).toBe(false);
  });
});

describe("recuperarSchema y nuevaPasswordSchema", () => {
  it("recuperar solo pide correo", () => {
    expect(recuperarSchema.safeParse({ email: "gio@gioslab.co" }).success).toBe(true);
  });

  it("la contraseña nueva también exige confirmación", () => {
    expect(
      nuevaPasswordSchema.safeParse({ password: "clavenueva1", confirmPassword: "distinta" })
        .success,
    ).toBe(false);
  });
});

describe("mensajeDeError", () => {
  it("no revela si el correo existe cuando las credenciales fallan", () => {
    const m = mensajeDeError("invalid_credentials", "fallback");
    expect(m).toBe("Correo o contraseña incorrectos");
    // Enumerar cuentas permitiría averiguar quién es cliente de un gimnasio.
    expect(m).not.toMatch(/no (existe|está registrado)/i);
  });

  it("traduce los códigos conocidos al español", () => {
    expect(mensajeDeError("email_exists", "x")).toBe("Ya existe una cuenta con ese correo");
    expect(mensajeDeError("over_request_rate_limit", "x")).toMatch(/Demasiados intentos/);
  });

  it("usa el mensaje de reserva ante un código desconocido", () => {
    expect(mensajeDeError("algo_nuevo", "Error inesperado")).toBe("Error inesperado");
    expect(mensajeDeError(undefined, "Error inesperado")).toBe("Error inesperado");
  });
});

describe("errores que llegan por enlace de correo", () => {
  it("explica un enlace caducado y qué hacer", () => {
    const m = mensajeDeError("otp_expired", "x");
    expect(m).toMatch(/caducó|ya se había usado/);
    expect(m).toMatch(/pide uno nuevo/i);
  });

  it("access_denied también se traduce, no queda en inglés", () => {
    expect(mensajeDeError("access_denied", "x")).not.toBe("x");
  });
});
