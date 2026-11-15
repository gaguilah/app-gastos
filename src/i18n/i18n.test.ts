import es from "./es.json";
import en from "./en.json";
import { idiomaInicial } from ".";

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
  it("usa español por defecto", () => {
    expect(idiomaInicial([])).toBe("es");
    expect(idiomaInicial(["es-CO"])).toBe("es");
    expect(idiomaInicial(["fr-FR", "en-US"])).toBe("es");
  });

  it("usa inglés si es el idioma preferido del navegador", () => {
    expect(idiomaInicial(["en-US", "es-CO"])).toBe("en");
  });
});
