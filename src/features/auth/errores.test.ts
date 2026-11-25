import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { claveErrorLogin } from "./errores";
import i18n from "@/i18n";

describe("claveErrorLogin", () => {
  it("credenciales incorrectas dan un solo mensaje, sin decir cuál falló", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    expect(claveErrorLogin(error)).toBe("login.error.credenciales");
  });

  it("sin red", () => {
    expect(claveErrorLogin(new AuthRetryableFetchError("Failed to fetch", 0))).toBe(
      "login.error.sinRed",
    );
    expect(claveErrorLogin(new TypeError("Failed to fetch"))).toBe("login.error.sinRed");
  });

  it("límite de intentos de Supabase", () => {
    const error = new AuthApiError("Rate limit", 429, "over_request_rate_limit");
    expect(claveErrorLogin(error)).toBe("login.error.demasiadosIntentos");
  });

  it("cualquier otro error da un mensaje genérico, nunca el texto crudo", () => {
    expect(claveErrorLogin(new AuthApiError("boom", 500, "unexpected_failure"))).toBe(
      "login.error.desconocido",
    );
    expect(claveErrorLogin("raro")).toBe("login.error.desconocido");
  });
});

describe("las claves de error existen en los dos idiomas", () => {
  it.each([
    "login.error.credenciales",
    "login.error.sinRed",
    "login.error.demasiadosIntentos",
    "login.error.desconocido",
    "recuperar.error.corta",
    "recuperar.error.noCoinciden",
  ])("%s", (clave) => {
    expect(i18n.exists(clave, { lng: "es" })).toBe(true);
    expect(i18n.exists(clave, { lng: "en" })).toBe(true);
  });
});
