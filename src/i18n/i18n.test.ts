import es from "./es.json";
import en from "./en.json";
import i18n, { cambiarIdioma, idiomaInicial } from ".";

type Arbol = { [clave: string]: string | Arbol };

function hojas(arbol: Arbol, prefijo = ""): [string, string][] {
  return Object.entries(arbol).flatMap(([clave, valor]) =>
    typeof valor === "string" ? [[prefijo + clave, valor]] : hojas(valor, `${prefijo}${clave}.`),
  );
}

describe("traducciones", () => {
  it("es.json y en.json tienen exactamente las mismas claves", () => {
    const claves = (a: Arbol) =>
      hojas(a)
        .map(([c]) => c)
        .sort();
    expect(claves(en)).toEqual(claves(es));
  });

  it("ningún texto está vacío", () => {
    for (const [clave, valor] of [...hojas(es), ...hojas(en)]) {
      expect(valor.trim(), clave).not.toBe("");
    }
  });
});

describe("idiomaInicial", () => {
  it("manda el idioma guardado en el dispositivo", () => {
    expect(idiomaInicial(["es-CO"], "en")).toBe("en");
    expect(idiomaInicial(["en-US"], "es")).toBe("es");
  });

  it("sin idioma guardado, o si no es válido, usa el del navegador", () => {
    expect(idiomaInicial(["en-US"], null)).toBe("en");
    expect(idiomaInicial(["en-US"], "fr")).toBe("en");
    expect(idiomaInicial(["es-CO"], "fr")).toBe("es");
  });

  it("usa español por defecto", () => {
    expect(idiomaInicial([])).toBe("es");
    expect(idiomaInicial(["es-CO"])).toBe("es");
    expect(idiomaInicial(["fr-FR", "en-US"])).toBe("es");
  });

  it("usa inglés si es el idioma preferido del navegador", () => {
    expect(idiomaInicial(["en-US", "es-CO"])).toBe("en");
  });
});

describe("cambiarIdioma", () => {
  afterEach(async () => {
    await cambiarIdioma("es");
  });

  it("cambia la interfaz, el lang del documento y lo recuerda en el dispositivo", async () => {
    await cambiarIdioma("en");
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("app-gastos.idioma")).toBe("en");
  });
});
