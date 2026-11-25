import { claveErrorDatos, clavesErrorServidor } from "./errores";
import i18n from "@/i18n";

describe("claveErrorDatos", () => {
  it("una clave conocida de una función SQL da su texto propio", () => {
    expect(claveErrorDatos({ code: "P0001", message: "categoria.sistema" })).toBe(
      "errores.servidor.categoria_sistema",
    );
    expect(claveErrorDatos({ code: "P0002", message: "lugar.no_existe" })).toBe(
      "errores.servidor.lugar_no_existe",
    );
  });

  it("un nombre normalizado repetido da el mensaje de nombre repetido", () => {
    expect(claveErrorDatos({ code: "23505", message: "duplicate key" })).toBe(
      "errores.nombreRepetido",
    );
  });

  it("sin red", () => {
    expect(claveErrorDatos(new TypeError("Failed to fetch"))).toBe("errores.sinRed");
  });

  it("un texto desconocido del servidor nunca se muestra crudo", () => {
    expect(claveErrorDatos({ code: "P0001", message: "otra cosa" })).toBe("errores.desconocido");
    expect(claveErrorDatos({ code: "XX000", message: "boom" })).toBe("errores.desconocido");
    expect(claveErrorDatos("raro")).toBe("errores.desconocido");
  });
});

describe("las claves de error de datos existen en los dos idiomas", () => {
  it.each([
    ...clavesErrorServidor,
    "errores.sinRed",
    "errores.desconocido",
    "errores.nombreRepetido",
    "errores.datoInvalido",
    "errores.numeroTarjeta",
    "errores.sinPermiso",
  ])("%s", (clave) => {
    expect(i18n.exists(clave, { lng: "es" })).toBe(true);
    expect(i18n.exists(clave, { lng: "en" })).toBe(true);
  });
});
