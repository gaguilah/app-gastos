import { validarNuevaContrasena } from "./contrasena";

describe("validarNuevaContrasena", () => {
  it("pide al menos 8 caracteres", () => {
    expect(validarNuevaContrasena("1234567", "1234567")).toBe("recuperar.error.corta");
  });

  it("las dos contraseñas deben coincidir", () => {
    expect(validarNuevaContrasena("abcdefgh", "abcdefgx")).toBe("recuperar.error.noCoinciden");
  });

  it("acepta una contraseña válida y confirmada", () => {
    expect(validarNuevaContrasena("abcdefgh", "abcdefgh")).toBeNull();
  });
});
