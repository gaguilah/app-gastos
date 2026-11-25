import { destinoTrasLogin, esRutaPublica, RUTAS_PUBLICAS } from "./rutas";

describe("rutas públicas", () => {
  it("solo login, recuperar y nueva contraseña son públicas", () => {
    expect(RUTAS_PUBLICAS).toEqual(["/login", "/recuperar", "/nueva-contrasena"]);
    for (const ruta of RUTAS_PUBLICAS) expect(esRutaPublica(ruta)).toBe(true);
  });

  it("cualquier otra ruta es protegida", () => {
    for (const ruta of [
      "/",
      "/gastos",
      "/ajustes",
      "/mas",
      "/no-existe",
      "/login/otra",
      "/registro",
    ])
      expect(esRutaPublica(ruta)).toBe(false);
  });
});

describe("destinoTrasLogin", () => {
  it("vuelve a la ruta pedida, con su búsqueda", () => {
    expect(destinoTrasLogin("/bolsas?x=1")).toBe("/bolsas?x=1");
  });

  it("sin ruta pedida va a Inicio", () => {
    expect(destinoTrasLogin(null)).toBe("/");
    expect(destinoTrasLogin("")).toBe("/");
  });

  it("nunca sale del sitio", () => {
    for (const desde of [
      "https://otro.sitio",
      "//otro.sitio/x",
      "/\\otro.sitio",
      "javascript:alert(1)",
      "bolsas",
      // El navegador borra tabuladores y saltos de línea: "/\t/otro.sitio" sería "//otro.sitio".
      "/\t/otro.sitio",
      "/\n/otro.sitio",
      "/\r\n/otro.sitio",
    ])
      expect(destinoTrasLogin(desde)).toBe("/");
  });

  it("no vuelve a una pantalla pública", () => {
    expect(destinoTrasLogin("/login")).toBe("/");
    expect(destinoTrasLogin("/nueva-contrasena")).toBe("/");
  });
});
